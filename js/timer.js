// Rest timer: sticky bar, survives reloads (end time stored), beeps + vibrates at zero.
import { getState, setTimer } from "./store.js";
import { fmtSecs } from "./dom.js";

let audio = null, tick = null, alerted = false;
const bar = () => document.getElementById("timer");

/** Call from a user gesture (tap) so audio is allowed on iOS. */
export function primeAudio() {
  try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); if (audio.state === "suspended") audio.resume(); } catch {}
}
function beep() {
  if (!getState().settings.sound || !audio) return;
  [0, 0.25, 0.5].forEach((t, i) => {
    const o = audio.createOscillator(), g = audio.createGain();
    o.frequency.value = i === 2 ? 1320 : 880; o.type = "sine";
    g.gain.setValueAtTime(0.0001, audio.currentTime + t);
    g.gain.exponentialRampToValueAtTime(0.4, audio.currentTime + t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + t + 0.18);
    o.connect(g).connect(audio.destination); o.start(audio.currentTime + t); o.stop(audio.currentTime + t + 0.2);
  });
}
export function startRest(seconds, label) {
  primeAudio();
  alerted = false;
  setTimer({ endsAt: Date.now() + seconds * 1000, total: seconds, label });
  render();
}
export function adjust(delta) {
  const t = getState().timer; if (!t) return;
  t.endsAt = Math.max(Date.now(), t.endsAt + delta * 1000); t.total = Math.max(1, t.total + delta);
  alerted = false; setTimer(t); render();
}
export function stop() { setTimer(null); render(); }

export function render() {
  const el = bar(); if (!el) return;
  const t = getState().timer;
  clearInterval(tick);
  if (!t) { el.hidden = true; document.body.classList.remove("has-timer"); return; }
  el.hidden = false; document.body.classList.add("has-timer");
  const update = () => {
    const left = Math.ceil((t.endsAt - Date.now()) / 1000);
    el.querySelector(".timer-time").textContent = left > 0 ? fmtSecs(left) : "Go!";
    el.querySelector(".timer-label").textContent = left > 0 ? `Rest · next: ${t.label}` : `Rest done · ${t.label}`;
    el.querySelector(".timer-fill").style.transform = `scaleX(${Math.max(0, Math.min(1, left / t.total))})`;
    el.classList.toggle("done", left <= 0);
    if (left <= 0 && !alerted) {
      alerted = true; beep();
      if (getState().settings.vibrate && navigator.vibrate) navigator.vibrate([250, 120, 250]);
    }
    if (left <= -20) stop();
  };
  update(); tick = setInterval(update, 250);
}
export function initTimer() {
  const el = bar();
  el.querySelector("[data-act=minus]").onclick = () => adjust(-15);
  el.querySelector("[data-act=plus]").onclick = () => adjust(15);
  el.querySelector("[data-act=skip]").onclick = () => stop();
  render();
}
