// Tiny DOM helper: h("div.card", {onclick}, child, "text", [children])
export function h(tag, attrs, ...children) {
  const [name, ...cls] = tag.split(".");
  const el = name === "svg" || attrs?.svg ? document.createElementNS("http://www.w3.org/2000/svg", name) : document.createElement(name || "div");
  if (cls.length) el.setAttribute("class", cls.join(" "));
  if (attrs && (typeof attrs !== "object" || attrs instanceof Node || Array.isArray(attrs))) { children.unshift(attrs); attrs = null; }
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === "svg" || v === undefined || v === null || v === false) continue;
    if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "class") el.setAttribute("class", [el.getAttribute("class"), v].filter(Boolean).join(" "));
    else if (k === "html") el.innerHTML = v;
    else if (k in el && !(el instanceof SVGElement) && k !== "list") el[k] = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  const add = c => { if (c === null || c === undefined || c === false) return; if (Array.isArray(c)) c.forEach(add); else el.append(c instanceof Node ? c : document.createTextNode(String(c))); };
  children.forEach(add);
  return el;
}
export const icon = (name, size = 22) => {
  const paths = {
    today: '<path d="M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/><path d="m9 14 2 2 4-4"/>',
    program: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    progress: '<path d="M4 19V5M4 19h16M8 15l4-5 3 3 5-6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    back: '<path d="M15 5l-7 7 7 7"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',
    download: '<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M10 2h4"/>',
    flame: '<path d="M12 21c4 0 7-2.7 7-6.5 0-4-3.5-6-4.5-10-2 1.5-3 3.5-3 5.5-1-1-1.5-2-1.5-3C7 8.5 5 11.5 5 14.5 5 18.3 8 21 12 21Z"/>',
  };
  const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  s.setAttribute("viewBox", "0 0 24 24"); s.setAttribute("width", size); s.setAttribute("height", size);
  s.setAttribute("fill", "none"); s.setAttribute("stroke", "currentColor"); s.setAttribute("stroke-width", "2");
  s.setAttribute("stroke-linecap", "round"); s.setAttribute("stroke-linejoin", "round"); s.setAttribute("aria-hidden", "true");
  s.innerHTML = paths[name] || ""; return s;
};
export const fmtDate = (d, opts = { weekday: "short", day: "numeric", month: "short" }) =>
  (typeof d === "string" ? new Date(d.length === 10 ? d + "T12:00:00" : d) : d).toLocaleDateString("en-GB", opts);
export const fmtSecs = s => `${Math.floor(s / 60)}:${String(Math.max(0, Math.floor(s % 60))).padStart(2, "0")}`;
export function toast(msg) { window.dispatchEvent(new CustomEvent("gb:toast", { detail: msg })); }
