import { h, fmtDate } from "../dom.js";
import { weekOf, toDayNum } from "../program.js";
import { activeProgram } from "../store.js";
import { weekSessions, sessionRow, weekLabel, deloadBanner, emptyProgram, STATUS_LABEL } from "./common.js";

export function renderToday(root) {
  const program = activeProgram();
  if (!program) { root.append(emptyProgram()); return; }
  const now = new Date();
  let week = weekOf(program, now), note = null;
  if (week < program.firstWeek) { note = `Starts ${fmtDate(program.start, { weekday: "long", day: "numeric", month: "long" })}. Here's a preview of week ${program.firstWeek}.`; week = program.firstWeek; }
  else if (program.lastWeek && week > program.lastWeek) { note = "Program finished. Nice work. Look back at your progress, or load the next block in Settings."; week = program.lastWeek; }

  const wl = weekLabel(program, week);
  const list = weekSessions(program, week);
  const today = toDayNum(now);
  const pick = list.find(x => x.date && toDayNum(x.date) === today && x.status !== "done")
    || list.find(x => !x.s.optional && x.status !== "done")
    || list.find(x => x.status !== "done");

  root.append(
    h("header.page-head",
      h("div.eyebrow", program.name),
      h("h1", `Week ${week}`, program.lastWeek ? h("span.of", ` of ${program.lastWeek}`) : null),
      h("div.sub", [wl.phase?.name, wl.range].filter(Boolean).join(" · ")),
      wl.phase?.note ? h("div.phase-note", wl.phase.note) : null),
    note ? h("div.banner.info", note) : null,
    wl.deload ? deloadBanner() : null);

  if (pick) {
    const planned = pick.date && toDayNum(pick.date) === today;
    const total = pick.built.exercises.reduce((n, e) => n + e.sets.length, 0);
    root.append(h("a.hero-card", { href: `#/s/${week}/${pick.s.id}` },
      h("div.hero-top", h("span.eyebrow", planned ? "Today" : pick.date && toDayNum(pick.date) < today ? `Planned ${fmtDate(pick.date)} · still open` : "Up next"), pick.s.optional ? h("span.badge", "Optional") : null),
      h("h2", pick.s.name),
      h("div.hero-meta", `${pick.built.exercises.length} exercises · ${total} sets`),
      h("ol.hero-list", pick.built.exercises.slice(0, 5).map(e => h("li", e.label ? h("b", e.label + " ") : null, e.exercise))),
      pick.built.exercises.length > 5 ? h("div.hero-more", `+ ${pick.built.exercises.length - 5} more`) : null,
      h("span.btn.primary.block", pick.status === "partial" ? "Continue session" : "Start session")));
  } else if (list.length) {
    root.append(h("div.hero-card.done", h("span.eyebrow", "This week"), h("h2", "All sessions done"), h("div.hero-meta", "Rest up. Next week opens on Monday.")));
  }

  root.append(h("h3.section-title", "This week"), h("div.list", list.map(x => sessionRow(program, week, x))));
}
