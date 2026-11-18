import { h, icon, fmtDate, fmtSecs, toast } from "../dom.js";
import { buildSession, sessionDate, targetText, phaseOf } from "../program.js";
import { activeProgram, getState, getLog, updateSet, finishSession, resetSession } from "../store.js";
import { exerciseHistory, summarizeSets, logKey, fmtKg } from "../stats.js";
import { startRest, primeAudio } from "../timer.js";
import { deloadBanner } from "./common.js";

const RPES = ["", "6", "6.5", "7", "7.5", "8", "8.5", "9", "9.5", "10"];
const unitLabel = u => (u === "s" ? "sec" : u === "m" ? "m" : "reps");
const perLabel = p => (p ? `per ${p}` : "");

export function renderSession(root, ctx, week, sid) {
  const program = activeProgram();
  if (!program) { location.hash = "#/today"; return; }
  week = Number(week);
  const built = buildSession(program, sid, week);
  if (!built) { root.append(h("p.muted", "Session not found.")); return; }
  const pid = program.id, key = logKey(pid, week, sid);
  const date = sessionDate(program, week, built.session);
  const phase = phaseOf(program, week);
  const log = () => getLog(pid, week, sid);
  const exs = built.exercises;
  const totalSets = exs.reduce((n, e) => n + e.sets.length, 0);

  // ---------- header ----------
  const progressFill = h("div.progress-fill");
  const progressText = h("span");
  root.append(
    h("header.session-head",
      h("a.icon-btn", { href: "#/today", "aria-label": "Back" }, icon("back")),
      h("div.session-title",
        h("h1", built.session.name),
        h("div.sub", [`Week ${week}`, phase?.name, date ? fmtDate(date) : null].filter(Boolean).join(" · ")))),
    h("div.progress", h("div.progress-bar", progressFill), progressText),
    built.deload ? deloadBanner() : null,
    phase?.note ? h("div.phase-note", phase.note) : null);

  // ---------- exercises ----------
  const allRows = []; // for progress counting
  const list = h("div.exercises");
  let groupBox = null;
  exs.forEach((ex, ei) => {
    const card = exerciseCard(ex, ei);
    if (ex.label) {
      if (!groupBox || groupBox.dataset.group !== ex.groupId) {
        groupBox = h("section.superset", { "data-group": ex.groupId }, h("div.superset-label", `Superset ${ex.group}`, h("span", " · alternate, rest after the last one")));
        list.append(groupBox);
      }
      groupBox.append(card);
    } else { groupBox = null; list.append(card); }
  });
  root.append(list);

  // ---------- finish ----------
  const finishBox = h("div.finish");
  root.append(finishBox);
  renderFinish();
  updateProgress();

  ctx.wakeLock();

  function exerciseCard(ex, ei) {
    const hist = exerciseHistory(getState(), ex.key).filter(x => logKey(x.programId, x.week, x.sessionId) !== key);
    const last = hist[0];
    const unit = ex.sets[0]?.unit || "reps";
    const kgTarget = ex.kg ? (ex.kg.bw ? "Bodyweight" : `${ex.kg.text} kg`) : null;
    const meta = [targetText(ex), kgTarget, ex.rpe ? `RPE ${ex.rpe.text}` : null, `Rest ${fmtSecs(ex.rest)}`].filter(Boolean);

    const card = h("article.ex-card", { id: `ex-${ei}` },
      h("div.ex-head",
        ex.label ? h("span.chip", ex.label) : null,
        h("a.ex-name", { href: `#/ex/${encodeURIComponent(ex.key)}` }, ex.exercise),
        ex.per ? h("span.badge", perLabel(ex.per)) : null),
      h("div.ex-meta", meta.map((m, i) => h("span", m))),
      h("div.ex-last", last ? [h("span.muted", "Last: "), summarizeSets(last.sets, last.unit), h("span.muted", ` · ${fmtDate(last.date, { day: "numeric", month: "short" })}`)] : h("span.muted", "No previous log")),
      ex.notes ? h("details.ex-notes", h("summary", icon("info", 16), " Notes"), h("p", ex.notes)) : null);

    const table = h("div.sets", h("div.set-row.set-head", h("span", "Set"), h("span", "kg"), h("span", unitLabel(unit)), h("span", "RPE"), h("span", "")));
    ex.sets.forEach((target, i) => {
      const saved = log()?.sets?.[ex.key]?.[i];
      const lastSet = last ? (last.sets[i] || last.sets[last.sets.length - 1]) : null;
      const kgVal = saved?.kg ?? (lastSet && lastSet.kg !== "" && lastSet.kg != null ? lastSet.kg : (ex.kg && !ex.kg.bw ? ex.kg.min : ""));
      const repsVal = saved?.reps ?? (target.min ?? (lastSet ? lastSet.reps : ""));
      const kg = h("input.num", { type: "text", inputMode: "decimal", value: kgVal === null ? "" : kgVal, placeholder: ex.kg?.bw ? "BW" : "–", "aria-label": `Set ${i + 1} kg` });
      const reps = h("input.num", { type: "text", inputMode: "numeric", value: repsVal ?? "", placeholder: target.text || "–", "aria-label": `Set ${i + 1} ${unitLabel(unit)}` });
      const rpe = h("select.rpe", { "aria-label": `Set ${i + 1} RPE` }, RPES.map(v => h("option", { value: v, selected: String(saved?.rpe ?? "") === v }, v || "–")));
      const check = h("button.check", { type: "button", "aria-label": `Set ${i + 1} done`, "aria-pressed": String(!!saved?.done) }, icon("check", 22));
      const row = h("div.set-row" + (saved?.done ? ".done" : ""),
        h("span.set-n", target.amrap ? `${i + 1}+` : String(i + 1), target.amrap ? h("small", "AMRAP") : target.text && ex.sets.some(s => s.min !== target.min || s.max !== target.max) ? h("small", target.text) : null),
        kg, reps, rpe, check);
      const val = el => { const v = el.value.trim().replace(",", "."); return v === "" ? "" : Number(v); };
      const sanitize = el => { if (el.value && isNaN(Number(el.value.replace(",", ".")))) { el.value = ""; } };
      [kg, reps].forEach(el => {
        el.addEventListener("focus", () => el.select());
        el.addEventListener("change", () => { sanitize(el); updateSet(pid, week, sid, ex.key, i, { kg: val(kg), reps: val(reps) }); });
      });
      rpe.addEventListener("change", () => updateSet(pid, week, sid, ex.key, i, { rpe: rpe.value ? Number(rpe.value) : "" }));
      check.addEventListener("click", () => {
        primeAudio();
        const wasDone = row.classList.contains("done");
        sanitize(kg); sanitize(reps);
        updateSet(pid, week, sid, ex.key, i, { kg: val(kg), reps: val(reps), rpe: rpe.value ? Number(rpe.value) : "", done: !wasDone });
        row.classList.toggle("done", !wasDone); check.setAttribute("aria-pressed", String(!wasDone));
        if (!wasDone) {
          if (navigator.vibrate && getState().settings.vibrate) navigator.vibrate(15);
          // carry the weight forward into the next unticked set of this exercise if you changed it
          if (val(kg) !== "") allRows.filter(r => r.ex === ex && r.i > i && !r.row.classList.contains("done")).forEach(r => { r.kg.value = kg.value; });
          const n = nextUp(ex, ei, i);
          if (ex.groupLast) { if (n) startRest(ex.rest, n); }
          else toast(`Next: ${n}`);
        }
        updateProgress(); renderFinish();
      });
      allRows.push({ ex, i, row, kg });
      table.append(row);
    });
    card.append(table);
    return card;
  }

  /** Label of what's next after ticking set i of exercise ei. */
  function nextUp(ex, ei, i) {
    const isDone = (e, j) => allRows.find(r => r.ex === e && r.i === j)?.row.classList.contains("done");
    if (ex.label) { // superset: go round the group
      const members = exs.filter(e => e.groupId === ex.groupId);
      const order = []; const maxSets = Math.max(...members.map(m => m.sets.length));
      for (let j = 0; j < maxSets; j++) for (const m of members) if (j < m.sets.length) order.push([m, j]);
      const k = order.findIndex(([m, j]) => m === ex && j === i);
      const nx = [...order.slice(k + 1), ...order.slice(0, k)].find(([m, j]) => !isDone(m, j));
      if (nx) return `${nx[0].label} ${nx[0].exercise} · set ${nx[1] + 1}`;
    } else {
      const j = ex.sets.findIndex((_, j) => !isDone(ex, j));
      if (j >= 0) return `${ex.exercise} · set ${j + 1}`;
    }
    const after = exs.slice(ei + 1).find(e => e.sets.some((_, j) => !isDone(e, j))) || exs.find(e => e.sets.some((_, j) => !isDone(e, j)));
    return after ? `${after.label ? after.label + " " : ""}${after.exercise}` : null;
  }

  function doneCount() { return allRows.filter(r => r.row.classList.contains("done")).length; }
  function updateProgress() {
    const d = doneCount();
    progressFill.style.transform = `scaleX(${totalSets ? d / totalSets : 0})`;
    progressText.textContent = `${d}/${totalSets} sets`;
  }
  function renderFinish() {
    const l = log(); const d = doneCount();
    finishBox.replaceChildren();
    if (l?.finishedAt) {
      finishBox.append(h("div.finished", icon("check", 20), ` Finished ${fmtDate(l.finishedAt, { weekday: "short", day: "numeric", month: "short" })}`),
        h("button.btn.block", { type: "button", onclick: () => { finishSession(pid, week, sid, false); renderFinish(); } }, "Reopen session"));
    } else {
      finishBox.append(h("button.btn.block" + (d === totalSets ? ".primary" : ""), { type: "button", onclick: () => {
        if (d < totalSets && !confirm(`${totalSets - d} sets aren't ticked. Finish anyway?`)) return;
        finishSession(pid, week, sid, true); toast("Session saved. Good work!"); location.hash = "#/today";
      } }, d === totalSets ? "Finish session" : `Finish session (${d}/${totalSets})`));
    }
    if (l) finishBox.append(h("button.btn.link", { type: "button", onclick: () => { if (confirm("Clear everything logged in this session?")) { resetSession(pid, week, sid); ctx.rerender(); } } }, "Clear this session's log"));
  }
}
