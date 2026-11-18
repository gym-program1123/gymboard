// Logs -> history, e1RM, PRs, volume, streak. DOM-free.
import { buildSession, weekOf, weekList, sessionDate, isoDay } from "./program.js";

export const logKey = (programId, week, sessionId) => `${programId}|${week}|${sessionId}`;

/** Epley with reps-in-reserve: e1RM = kg × (1 + (reps + RIR)/30), RIR = 10 − RPE. Only 1-12 rep sets with weight. */
export function e1rm(kg, reps, rpe) {
  kg = Number(kg); reps = Number(reps);
  if (!(kg > 0) || !(reps >= 1) || reps > 12) return null;
  const rir = rpe ? Math.max(0, Math.min(4, 10 - Number(rpe))) : 0;
  if (reps === 1 && !rir) return kg;
  return kg * (1 + (reps + rir) / 30);
}
const mid = r => (r ? (r.min + r.max) / 2 : null);

/** Status of a session log: "done" | "partial" | "todo" */
export function sessionStatus(log, built) {
  if (!log) return "todo";
  if (log.finishedAt) return "done";
  const total = built ? built.exercises.reduce((n, e) => n + e.sets.length, 0) : 0;
  const done = Object.values(log.sets || {}).reduce((n, arr) => n + arr.filter(x => x && x.done).length, 0);
  if (total && done >= total) return "done";
  return done ? "partial" : "todo";
}

/** When a logged session happened: finish time, else last ticked set, else planned date. */
export function logDate(log) {
  if (log.finishedAt) return log.finishedAt.slice(0, 10);
  const ts = Object.values(log.sets || {}).flat().filter(x => x && x.done && x.at).map(x => x.at).sort();
  return ts.length ? ts[ts.length - 1].slice(0, 10) : null;
}

/**
 * Every logged entry of an exercise (by key), newest first.
 * [{programId, week, sessionId, sessionName, date, sets:[{kg,reps,rpe}], best, unit, per}]
 */
export function exerciseHistory(state, key) {
  const out = [];
  for (const [k, log] of Object.entries(state.logs)) {
    const arr = log.sets?.[key]; if (!arr) continue;
    const done = arr.filter(x => x && x.done);
    if (!done.length) continue;
    const [programId, week, sessionId] = k.split("|");
    const program = state.programs.find(p => p.id === programId);
    const built = program && buildSession(program, sessionId, +week);
    const ex = built?.exercises.find(e => e.key === key);
    const tRpe = mid(ex?.rpe);
    const unit = ex?.sets[0]?.unit || "reps";
    const sets = done.map(x => ({ kg: x.kg, reps: x.reps, rpe: x.rpe }));
    const bests = unit === "reps" ? sets.map(x => e1rm(x.kg, x.reps, x.rpe || tRpe)).filter(Boolean) : [];
    out.push({ programId, week: +week, sessionId, sessionName: built?.session.name || sessionId,
      date: logDate(log) || (program && built ? isoDay(sessionDate(program, +week, built.session) || new Date()) : ""),
      sets, unit, per: ex?.per || "", name: ex?.exercise || key,
      best: bests.length ? Math.max(...bests) : null,
      top: Math.max(0, ...sets.map(x => Number(x.kg) || 0)) });
  }
  return out.sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.week - a.week);
}

/** "8,8,8,11 @ 57.5 kg" or "8@55 · 8@57.5 · …" */
export function summarizeSets(sets, unit = "reps") {
  if (!sets.length) return "";
  const u = unit === "s" ? " s" : unit === "m" ? " m" : "";
  const kgs = sets.map(s => (s.kg === "" || s.kg == null ? null : Number(s.kg)));
  const reps = sets.map(s => (s.reps === "" || s.reps == null ? "–" : s.reps)).join(",") + u;
  if (kgs.every(k => k === null || k === 0)) return reps;
  if (kgs.every(k => k === kgs[0])) return `${reps} @ ${fmtKg(kgs[0])} kg`;
  return sets.map(s => `${s.reps}${u}@${s.kg === "" || s.kg == null ? "BW" : fmtKg(s.kg)}`).join(" · ");
}
export const fmtKg = k => (Math.round(Number(k) * 10) / 10).toString();

/** All exercise keys that appear in logs, with name. */
export function loggedExercises(state) {
  const keys = new Set();
  for (const log of Object.values(state.logs)) for (const [k, arr] of Object.entries(log.sets || {})) if (arr.some(x => x && x.done)) keys.add(k);
  return [...keys];
}

/** PRs + e1RM trend per exercise that has weighted rep sets. */
export function liftSummaries(state) {
  const out = [];
  for (const key of loggedExercises(state)) {
    const h = exerciseHistory(state, key);
    const pts = h.filter(x => x.best).slice().reverse();
    const heaviest = h.reduce((b, x) => (x.top > (b?.top || 0) ? x : b), null);
    const bestE = h.reduce((b, x) => (x.best && x.best > (b?.best || 0) ? x : b), null);
    out.push({ key, name: h[0]?.name || key, sessions: h.length, points: pts.map(x => ({ date: x.date, week: x.week, value: x.best })),
      current: pts.length ? pts[pts.length - 1].best : null, heaviest, bestE, last: h[0] });
  }
  return out.sort((a, b) => (b.points.length - a.points.length) || (b.current || 0) - (a.current || 0));
}

/** Per program week: hard sets, tonnage, sessions done / required. */
export function weeklyStats(state, program) {
  const weeks = weekList(program);
  return weeks.map(week => {
    let sets = 0, tonnage = 0, done = 0, required = 0, optionalDone = 0;
    for (const s of program.sessions) {
      const built = buildSession(program, s.id, week);
      if (!built.exercises.length) continue;
      const log = state.logs[logKey(program.id, week, s.id)];
      const st = sessionStatus(log, built);
      if (!s.optional) required++;
      if (st === "done") { if (s.optional) optionalDone++; else done++; }
      for (const ex of built.exercises) {
        const arr = log?.sets?.[ex.key] || [];
        for (const x of arr) {
          if (!x || !x.done) continue;
          sets++;
          if (ex.sets[0]?.unit === "reps" && Number(x.kg) > 0 && Number(x.reps) > 0) tonnage += Number(x.kg) * Number(x.reps) * (ex.per === "hand" ? 2 : 1);
        }
      }
    }
    return { week, sets, tonnage: Math.round(tonnage), done, required, optionalDone, complete: required > 0 && done >= required };
  });
}

/** Consecutive complete weeks ending at the current week (current week counts only once complete). */
export function streak(state, program, today = new Date()) {
  const ws = weeklyStats(state, program);
  const cur = weekOf(program, today);
  let n = 0;
  for (let i = ws.length - 1; i >= 0; i--) {
    const w = ws[i];
    if (w.week > cur) continue;
    if (w.complete) n++;
    else if (w.week === cur) continue;
    else break;
  }
  return n;
}
