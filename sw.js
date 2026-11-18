// Offline support: app shell is precached; same-origin GETs are served cache-first and refreshed in the background.
const VERSION = "gymboard-v1";
const SHELL = [
  "./", "index.html", "css/app.css", "manifest.webmanifest",
  "js/app.js", "js/dom.js", "js/csv.js", "js/program.js", "js/stats.js", "js/store.js", "js/timer.js", "js/charts.js",
  "js/views/common.js", "js/views/today.js", "js/views/session.js", "js/views/program.js", "js/views/exercise.js", "js/views/progress.js", "js/views/settings.js",
  "icons/icon.svg", "icons/icon-192.png", "icons/apple-touch-icon.png",
  "examples/hybrid-plan.csv", "templates/program-template.csv",
];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    if (res) return res;
    if (req.mode === "navigate") return (await cache.match("index.html")) || Response.error();
    return Response.error();
  }));
});
