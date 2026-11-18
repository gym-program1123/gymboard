import { h, icon } from "./dom.js";
import { renderToday } from "./views/today.js";
import { renderSession } from "./views/session.js";
import { renderProgram } from "./views/program.js";
import { renderExercise } from "./views/exercise.js";
import { renderProgress } from "./views/progress.js";
import { renderSettings } from "./views/settings.js";
import { initTimer } from "./timer.js";

const app = document.getElementById("app");
// views append optional parts as `cond ? el : null`; skip the nulls
app.append = (...nodes) => Element.prototype.append.apply(app, nodes.filter(n => n !== null && n !== undefined && n !== false));
const routes = [
  [/^\/today$/, renderToday, "today"],
  [/^\/s\/(-?\d+)\/([\w-]+)$/, renderSession, "today"],
  [/^\/program$/, renderProgram, "program"],
  [/^\/ex\/(.+)$/, renderExercise, "progress"],
  [/^\/progress$/, renderProgress, "progress"],
  [/^\/settings$/, renderSettings, "settings"],
];

// --- screen wake lock (session screen only) ---
let lock = null, wantLock = false;
async function acquireLock() { try { if (wantLock && "wakeLock" in navigator && document.visibilityState === "visible") lock = await navigator.wakeLock.request("screen"); } catch {} }
function releaseLock() { wantLock = false; lock?.release().catch(() => {}); lock = null; }
document.addEventListener("visibilitychange", acquireLock);

let lastPath = null;
function render() {
  const raw = location.hash.slice(1) || "/today";
  const [path, qs] = raw.split("?");
  const route = routes.find(([re]) => re.test(path));
  if (!route) { location.hash = "#/today"; return; }
  const [re, view, tab] = route;
  releaseLock();
  const scroll = path === lastPath ? window.scrollY : 0;
  app.replaceChildren();
  const ctx = { rerender: render, wakeLock: () => { wantLock = true; acquireLock(); } };
  view(app, ctx, ...path.match(re).slice(1), new URLSearchParams(qs || ""));
  document.querySelectorAll(".tabbar a").forEach(a => a.classList.toggle("active", a.dataset.tab === tab));
  window.scrollTo(0, scroll); lastPath = path;
  const h1 = app.querySelector("h1"); document.title = h1 ? `${h1.textContent} · Gymboard` : "Gymboard";
}

// --- toast ---
const toastEl = document.getElementById("toast"); let toastT;
window.addEventListener("gb:toast", e => { toastEl.textContent = e.detail; toastEl.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove("show"), 2600); });

// --- tab bar icons ---
document.querySelectorAll(".tabbar a").forEach(a => a.prepend(icon(a.dataset.tab, 24)));

window.addEventListener("hashchange", render);
initTimer();
render();

if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
