// Hand-drawn SVG charts. Single series -> accent colour, no legend; hover/tap tooltip on every mark.
import { h } from "./dom.js";

const NS = "http://www.w3.org/2000/svg";
/** Draw at the container's real width and redraw when it changes. */
function responsive(draw, ariaLabel = "") {
  const wrap = h("div.chart", { role: "img", "aria-label": ariaLabel });
  let last = 0;
  const paint = () => { const w = Math.round(wrap.clientWidth) || 340; if (w === last) return; last = w; wrap.replaceChildren(draw(w)); };
  if ("ResizeObserver" in window) new ResizeObserver(paint).observe(wrap);
  requestAnimationFrame(paint);
  return wrap;
}
const s = (tag, attrs = {}) => { const el = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v); return el; };
function niceTicks(min, max, n = 4) {
  if (min === max) { min -= 5; max += 5; }
  const step0 = (max - min) / n, mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(x => x >= step0);
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const out = []; for (let v = lo; v <= hi + 1e-9; v += step) out.push(+v.toFixed(6)); return out;
}

/** Line chart. points: [{x:label, value, tip}] */
export function lineChart(points, opts = {}) { return responsive(W => lineChartAt(points, opts, W), opts.ariaLabel); }
function lineChartAt(points, { height = 180, unit = "kg" } = {}, W) {
  const wrap = document.createDocumentFragment();
  const H = height, L = 40, R = 14, T = 12, B = 26;
  const vals = points.map(p => p.value);
  const ticks = niceTicks(Math.min(...vals), Math.max(...vals));
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];
  const X = i => L + (points.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (points.length - 1));
  const Y = v => T + (H - T - B) * (1 - (v - y0) / (y1 - y0 || 1));
  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: "chart-svg" });
  for (const t of ticks) {
    svg.append(s("line", { x1: L, x2: W - R, y1: Y(t), y2: Y(t), class: "grid" }));
    const lab = s("text", { x: L - 6, y: Y(t) + 4, "text-anchor": "end", class: "axis" }); lab.textContent = t; svg.append(lab);
  }
  const every = Math.ceil(points.length / 6);
  points.forEach((p, i) => { if (i % every === 0 || i === points.length - 1) { const t = s("text", { x: X(i), y: H - 6, "text-anchor": "middle", class: "axis" }); t.textContent = p.x; svg.append(t); } });
  svg.append(s("path", { d: points.map((p, i) => `${i ? "L" : "M"}${X(i)},${Y(p.value)}`).join(""), class: "line" }));
  const cross = s("line", { y1: T, y2: H - B, class: "crosshair", visibility: "hidden" });
  svg.append(cross);
  const dots = points.map((p, i) => { const c = s("circle", { cx: X(i), cy: Y(p.value), r: 4.5, class: "dot" }); svg.append(c); return c; });
  const tip = h("div.tip", { hidden: true });
  const show = i => {
    const p = points[i];
    cross.setAttribute("x1", X(i)); cross.setAttribute("x2", X(i)); cross.setAttribute("visibility", "visible");
    dots.forEach((d, j) => d.classList.toggle("on", j === i));
    tip.hidden = false; tip.replaceChildren(h("strong", `${Math.round(p.value * 10) / 10} ${unit}`), h("span", p.tip || p.x));
    const pct = X(i) / W; tip.style.left = `${pct * 100}%`; tip.style.transform = `translateX(${pct > 0.7 ? "-100%" : pct < 0.3 ? "0" : "-50%"})`;
  };
  const hide = () => { cross.setAttribute("visibility", "hidden"); tip.hidden = true; dots.forEach(d => d.classList.remove("on")); };
  svg.addEventListener("pointermove", e => {
    const r = svg.getBoundingClientRect(); const x = ((e.clientX - r.left) / r.width) * W;
    let best = 0; points.forEach((_, i) => { if (Math.abs(X(i) - x) < Math.abs(X(best) - x)) best = i; }); show(best);
  });
  svg.addEventListener("pointerleave", hide);
  wrap.append(svg, tip);
  return wrap;
}

/** Bar chart. bars: [{x, value, tip, highlight}] */
export function barChart(bars, opts = {}) { return responsive(W => barChartAt(bars, opts, W), opts.ariaLabel); }
function barChartAt(bars, { height = 160 } = {}, W) {
  const wrap = document.createDocumentFragment();
  const H = height, L = 32, R = 8, T = 10, B = 24;
  const max = Math.max(1, ...bars.map(b => b.value));
  const ticks = niceTicks(0, max, 3); const top = ticks[ticks.length - 1];
  const bw = (W - L - R) / bars.length, gap = Math.min(10, bw * 0.3);
  const Y = v => T + (H - T - B) * (1 - v / top);
  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, class: "chart-svg" });
  for (const t of ticks) { svg.append(s("line", { x1: L, x2: W - R, y1: Y(t), y2: Y(t), class: "grid" })); const lab = s("text", { x: L - 6, y: Y(t) + 4, "text-anchor": "end", class: "axis" }); lab.textContent = t; svg.append(lab); }
  const tip = h("div.tip", { hidden: true });
  bars.forEach((b, i) => {
    const x = L + i * bw + gap / 2, w = bw - gap, y = Y(b.value), hgt = H - B - y;
    if (b.value > 0) {
      const r = Math.min(4, w / 2, hgt);
      svg.append(s("path", { d: `M${x},${H - B}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${H - B}Z`, class: "bar" + (b.highlight ? " hl" : "") }));
    }
    const t = s("text", { x: x + w / 2, y: H - 6, "text-anchor": "middle", class: "axis" + (b.highlight ? " strong" : "") }); t.textContent = b.x; svg.append(t);
    const hit = s("rect", { x: L + i * bw, y: T, width: bw, height: H - T - B, class: "hit" });
    const show = () => { tip.hidden = false; tip.replaceChildren(h("strong", b.tipTitle || `${b.value}`), h("span", b.tip || "")); const pct = (x + w / 2) / W; tip.style.left = `${pct * 100}%`; tip.style.transform = `translateX(${pct > 0.7 ? "-100%" : pct < 0.3 ? "0" : "-50%"})`; };
    hit.addEventListener("pointerenter", show); hit.addEventListener("pointerdown", show);
    svg.append(hit);
  });
  svg.addEventListener("pointerleave", () => (tip.hidden = true));
  wrap.append(svg, tip);
  return wrap;
}

export function sparkline(values, { w = 96, h: H = 32 } = {}) {
  const svg = s("svg", { viewBox: `0 0 ${w} ${H}`, width: w, height: H, class: "spark", "aria-hidden": "true" });
  if (values.length < 2) return svg;
  const min = Math.min(...values), max = Math.max(...values);
  const X = i => 2 + (i * (w - 4)) / (values.length - 1), Y = v => H - 3 - ((H - 6) * (v - min)) / (max - min || 1);
  svg.append(s("path", { d: values.map((v, i) => `${i ? "L" : "M"}${X(i)},${Y(v)}`).join(""), class: "line" }));
  svg.append(s("circle", { cx: X(values.length - 1), cy: Y(values[values.length - 1]), r: 3, class: "dot on" }));
  return svg;
}
