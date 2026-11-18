import { h } from "../dom.js";
import { weekOf, weekList } from "../program.js";
import { activeProgram } from "../store.js";
import { weekSessions, sessionRow, weekLabel, emptyProgram } from "./common.js";

export function renderProgram(root) {
  const program = activeProgram();
  if (!program) { root.append(emptyProgram()); return; }
  const cur = weekOf(program);
  root.append(h("header.page-head", h("div.eyebrow", "Program"), h("h1", program.name),
    h("div.sub", `${program.lastWeek ? `${program.lastWeek - program.firstWeek + 1} weeks` : "Repeating week"} · ${program.sessions.length} sessions`)));
  for (const week of weekList(program)) {
    const wl = weekLabel(program, week);
    const list = weekSessions(program, week);
    const done = list.filter(x => x.status === "done").length;
    root.append(h("details.week" + (week === cur ? ".current" : ""), { open: week === cur || (cur < program.firstWeek && week === program.firstWeek) },
      h("summary",
        h("div.week-title", `Week ${week}`, week === cur ? h("span.badge.accent", "Now") : null, wl.deload ? h("span.badge", "Easier") : null),
        h("div.week-sub", [wl.phase?.name, wl.range].filter(Boolean).join(" · ")),
        h("span.week-count", `${done}/${list.length}`)),
      h("div.list", list.map(x => sessionRow(program, week, x)))));
  }
}
