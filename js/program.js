// Program helpers: dates, weeks, phases, building a session for a given week. DOM-free.
import { exKey } from "./csv.js";

const DAY = 864e5;
export const toDayNum = d => { // local calendar day -> integer
  if (typeof d === "string") { const [y, m, dd] = d.split("-").map(Number); return Date.UTC(y, m - 1, dd) / DAY; }
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY;
};
export const dayNumToDate = n => { const d = new Date(n * DAY); return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };
export const isoDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function mondayOf(date) { const n = toDayNum(date); const dow = dayNumToDate(n).getDay(); return isoDay(dayNumToDate(n - ((dow + 6) % 7))); }

/** Week number that `date` falls in (can be < firstWeek before the start, > lastWeek after). */
export function weekOf(program, date = new Date()) {
  return Math.floor((toDayNum(date) - toDayNum(program.start)) / 7) + 1;
}
export function weekStartDate(program, week) { return dayNumToDate(toDayNum(program.start) + (week - 1) * 7); }
export function sessionDate(program, week, session) {
  const ws = weekStartDate(program, week);
  if (session.day === null || session.day === undefined) return null;
  return dayNumToDate(toDayNum(ws) + ((session.day - ws.getDay() + 7) % 7));
}
export function phaseOf(program, week) { return program.phases.find(p => p.weeks.includes(week)) || null; }
export const isDeload = (program, week) => program.deload.includes(week);
export function weekList(program) {
  const last = program.lastWeek ?? Math.max(weekOf(program) + 1, program.firstWeek + 3);
  const out = []; for (let w = program.firstWeek; w <= last; w++) out.push(w); return out;
}

/**
 * Exercises of a session in a given week: rows active that week, deload applied,
 * superset labels (A1, A2) assigned to adjacent rows sharing a Group.
 */
export function buildSession(program, sessionId, week) {
  const s = program.sessions.find(x => x.id === sessionId);
  if (!s) return null;
  const deload = isDeload(program, week);
  const rows = s.rows.filter(r => !r.weeks || r.weeks.includes(week));
  const exercises = rows.map(r => {
    let sets = r.sets.map(x => ({ ...x }));
    if (deload && sets.length > 1) sets = sets.slice(0, -1); // easier week: drop the last set
    return { ...r, key: r.key || exKey(r.exercise), sets };
  });
  // superset labels: a run of adjacent rows with the same Group letter = superset (A1, A2 …)
  let i = 0;
  while (i < exercises.length) {
    let j = i;
    while (j + 1 < exercises.length && exercises[i].group && exercises[j + 1].group === exercises[i].group) j++;
    const run = exercises.slice(i, j + 1);
    run.forEach((e, k) => {
      e.label = run.length > 1 ? `${e.group}${k + 1}` : "";
      e.groupId = run.length > 1 ? `${e.group}@${i}` : null;
      e.groupLast = k === run.length - 1;
    });
    i = j + 1;
  }
  return { session: s, week, deload, phase: phaseOf(program, week), exercises };
}

/** Target text, e.g. "4 sets · 8,8,8,8+" or "3 × 8-12" */
export function targetText(ex) {
  const sets = ex.sets; const n = sets.length;
  const unit = sets[0]?.unit === "s" ? " s" : sets[0]?.unit === "m" ? " m" : "";
  const same = sets.every(s => s.text === sets[0].text);
  if (!sets[0]?.text) return `${n} ${n === 1 ? "set" : "sets"}`;
  if (same) return `${n} × ${sets[0].text}${unit}`;
  return `${n} sets · ${sets.map(s => s.text).join(", ")}${unit}`;
}
