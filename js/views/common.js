import { h, icon, fmtDate } from "../dom.js";
import { buildSession, sessionDate, weekStartDate, phaseOf, isDeload, toDayNum } from "../program.js";
import { getLog } from "../store.js";
import { sessionStatus } from "../stats.js";

export const STATUS_LABEL = { done: "Done", partial: "In progress", todo: "To do" };

/** Sessions of a week (with exercises), in date order. */
export function weekSessions(program, week) {
  return program.sessions
    .map((s, i) => {
      const built = buildSession(program, s.id, week);
      const date = sessionDate(program, week, s);
      const status = sessionStatus(getLog(program.id, week, s.id), built);
      return { s, i, built, date, status };
    })
    .filter(x => x.built.exercises.length)
    .sort((a, b) => (a.date ? toDayNum(a.date) : 1e9) - (b.date ? toDayNum(b.date) : 1e9) || a.i - b.i);
}

export function sessionRow(program, week, x, { showDate = true } = {}) {
  return h("a.row", { href: `#/s/${week}/${x.s.id}` },
    h("div.row-day", x.date ? fmtDate(x.date, { weekday: "short" }) : "—"),
    h("div.row-main",
      h("div.row-title", x.s.name, x.s.optional ? h("span.badge", "Optional") : null),
      h("div.row-sub", `${x.built.exercises.length} exercises${showDate && x.date ? " · " + fmtDate(x.date, { day: "numeric", month: "short" }) : ""}`)),
    h(`span.pill.${x.status}`, STATUS_LABEL[x.status]),
    icon("chevron", 18));
}

export function weekLabel(program, week) {
  const ph = phaseOf(program, week);
  const start = weekStartDate(program, week), end = new Date(start); end.setDate(end.getDate() + 6);
  return { phase: ph, deload: isDeload(program, week),
    range: `${fmtDate(start, { day: "numeric", month: "short" })} – ${fmtDate(end, { day: "numeric", month: "short" })}` };
}

export function deloadBanner() {
  return h("div.banner", h("strong", "Easier week"), " One set less on every exercise. Recover, keep the technique crisp.");
}

export function emptyProgram() {
  return h("section.empty",
    h("div.empty-mark", icon("upload", 34)),
    h("h2", "Load your training program"),
    h("p", "Upload a program CSV and Gymboard turns it into your gym schedule: today's session, every set ready to tick off."),
    h("a.btn.primary.block", { href: "#/settings" }, "Load a CSV"),
    h("a.btn.block", { href: "#/settings?example=1" }, "Try the example plan"));
}
