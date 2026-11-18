import { h, icon, fmtDate } from "../dom.js";
import { weekOf } from "../program.js";
import { activeProgram, getState } from "../store.js";
import { liftSummaries, weeklyStats, streak, fmtKg } from "../stats.js";
import { barChart, sparkline } from "../charts.js";
import { emptyProgram } from "./common.js";

export function renderProgress(root) {
  const program = activeProgram();
  if (!program) { root.append(emptyProgram()); return; }
  const state = getState();
  const weeks = weeklyStats(state, program);
  const cur = weekOf(program);
  const thisWeek = weeks.find(w => w.week === cur);
  const totalDone = weeks.reduce((n, w) => n + w.done + w.optionalDone, 0);
  const lifts = liftSummaries(state).filter(l => l.points.length);

  root.append(h("header.page-head", h("div.eyebrow", "Progress"), h("h1", "Dashboard")));
  root.append(h("div.tiles",
    tile("Streak", String(streak(state, program)), "wk", icon("flame", 16)),
    tile("This week", thisWeek ? `${thisWeek.done}/${thisWeek.required}` : "–", thisWeek?.optionalDone ? `+${thisWeek.optionalDone}` : ""),
    tile("Sessions", String(totalDone), "")));
  if (!totalDone && !lifts.length) {
    root.append(h("p.muted.pad", "Your numbers show up here once you've logged a few sets.")); return;
  }

  if (lifts.length) {
    root.append(h("h3.section-title", "Estimated 1RM"), h("div.list",
      lifts.map(l => {
        const first = l.points[0].value, now = l.current, diff = now - first;
        return h("a.row.lift", { href: `#/ex/${encodeURIComponent(l.key)}` },
          h("div.row-main", h("div.row-title", l.name), h("div.row-sub", l.points.length > 1 ? `${diff >= 0 ? "+" : "−"}${fmtKg(Math.abs(diff))} kg since week ${l.points[0].week}` : `Week ${l.points[0].week}`)),
          sparkline(l.points.map(p => p.value)),
          h("span.row-val", fmtKg(now), h("small", " kg")));
      })));
  }

  const shown = weeks.filter(w => w.week <= Math.max(cur, weeks[0].week));
  root.append(h("section.card", h("h3.card-title", "Weekly volume"), h("p.card-sub", "Completed sets per week"),
    barChart(shown.map(w => ({ x: String(w.week), value: w.sets, highlight: w.week === cur,
      tipTitle: `Week ${w.week}: ${w.sets} sets`, tip: `${w.tonnage.toLocaleString("en-GB")} kg moved · ${w.done}/${w.required} sessions${w.optionalDone ? ` +${w.optionalDone} optional` : ""}` })),
      { ariaLabel: "Completed sets per week" })));

  const prs = liftSummaries(state).filter(l => l.heaviest?.top || l.bestE);
  if (prs.length) {
    root.append(h("h3.section-title", "Personal records"),
      h("div.table-wrap", h("table.pr",
        h("thead", h("tr", h("th", "Exercise"), h("th.num", "Heaviest"), h("th.num", "Best e1RM"))),
        h("tbody", prs.map(l => h("tr",
          h("td", h("a", { href: `#/ex/${encodeURIComponent(l.key)}` }, l.name)),
          h("td.num", l.heaviest?.top ? `${fmtKg(l.heaviest.top)} kg` : "–", l.heaviest?.top ? h("small", fmtDate(l.heaviest.date, { day: "numeric", month: "short" })) : null),
          h("td.num", l.bestE ? `${fmtKg(l.bestE.best)} kg` : "–", l.bestE ? h("small", fmtDate(l.bestE.date, { day: "numeric", month: "short" })) : null)))))));
  }
}
const tile = (label, value, unit, ic) => h("div.tile", h("div.tile-label", ic || null, label), h("div.tile-value", value, unit ? h("small", " " + unit) : null));
