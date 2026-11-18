import { h, icon, fmtDate } from "../dom.js";
import { getState } from "../store.js";
import { exerciseHistory, summarizeSets, fmtKg } from "../stats.js";
import { lineChart } from "../charts.js";

export function renderExercise(root, ctx, key) {
  key = decodeURIComponent(key);
  const hist = exerciseHistory(getState(), key);
  const name = hist[0]?.name || findName(key);
  root.append(h("header.session-head",
    h("button.icon-btn", { type: "button", "aria-label": "Back", onclick: () => history.back() }, icon("back")),
    h("div.session-title", h("h1", name), h("div.sub", `${hist.length} logged ${hist.length === 1 ? "session" : "sessions"}`))));
  if (!hist.length) { root.append(h("p.muted.pad", "Nothing logged yet. Tick off a set and it shows up here.")); return; }

  const pts = hist.filter(x => x.best).reverse();
  const best = pts.reduce((m, x) => Math.max(m, x.best), 0);
  const heavy = hist.reduce((m, x) => Math.max(m, x.top), 0);
  root.append(h("div.tiles",
    tile("Est. 1RM", best ? `${fmtKg(best)}` : "–", best ? "kg" : ""),
    tile("Heaviest", heavy ? fmtKg(heavy) : "–", heavy ? "kg" : ""),
    tile("Sessions", String(hist.length), "")));
  if (pts.length >= 2) {
    root.append(h("section.card", h("h3.card-title", "Estimated 1RM"),
      lineChart(pts.map(x => ({ x: `W${x.week}`, value: x.best, tip: `Week ${x.week} · ${fmtDate(x.date, { day: "numeric", month: "short" })}` })), { ariaLabel: `Estimated 1RM trend for ${name}` }),
      h("p.fine", "Estimated from your best set each session: kg × (1 + (reps + reps in reserve) / 30).")));
  }
  root.append(h("h3.section-title", "History"), h("div.list",
    hist.map(x => h("div.row.static",
      h("div.row-day", `W${x.week}`),
      h("div.row-main", h("div.row-title", summarizeSets(x.sets, x.unit)), h("div.row-sub", `${x.sessionName} · ${fmtDate(x.date)}`)),
      x.best ? h("span.row-val", `${fmtKg(x.best)}`, h("small", " e1RM")) : null))));
}
const tile = (label, value, unit) => h("div.tile", h("div.tile-label", label), h("div.tile-value", value, unit ? h("small", " " + unit) : null));
function findName(key) {
  for (const p of getState().programs) for (const s of p.sessions) for (const r of s.rows) if (r.key === key) return r.exercise;
  return key;
}
