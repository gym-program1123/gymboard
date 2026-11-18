// App state in localStorage. Every mutation saves immediately.
import { mondayOf } from "./program.js";
import { logKey } from "./stats.js";

const KEY = "gymboard.v1";
const fresh = () => ({ version: 1, programs: [], activeId: null, logs: {}, settings: { sound: true, vibrate: true }, timer: null });

let state = load();
const listeners = new Set();

function load() {
  try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && s.version === 1) return { ...fresh(), ...s }; } catch {}
  return fresh();
}
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); return true; }
  catch (e) { console.error(e); window.dispatchEvent(new CustomEvent("gb:toast", { detail: "Couldn't save: storage is full or blocked." })); return false; }
}
export const getState = () => state;
export const onChange = fn => listeners.add(fn);
const changed = () => { save(); listeners.forEach(f => f(state)); };

export const activeProgram = () => state.programs.find(p => p.id === state.activeId) || null;

export function addProgram(program, { replaceId } = {}) {
  if (!program.start) program.start = mondayOf(new Date());
  if (replaceId) {
    program.id = replaceId;
    state.programs = state.programs.map(p => (p.id === replaceId ? program : p));
  } else {
    program.id = "p" + Date.now().toString(36);
    state.programs.push(program);
  }
  program.importedAt = new Date().toISOString();
  state.activeId = program.id;
  changed();
  return program;
}
export function setActive(id) { state.activeId = id; changed(); }
export function deleteProgram(id) {
  state.programs = state.programs.filter(p => p.id !== id);
  for (const k of Object.keys(state.logs)) if (k.startsWith(id + "|")) delete state.logs[k];
  if (state.activeId === id) state.activeId = state.programs[0]?.id || null;
  changed();
}
export function setStart(id, iso) { const p = state.programs.find(x => x.id === id); if (p) { p.start = iso; changed(); } }
export function setSetting(k, v) { state.settings[k] = v; changed(); }

export function getLog(pid, week, sid) { return state.logs[logKey(pid, week, sid)] || null; }
function ensureLog(pid, week, sid) {
  const k = logKey(pid, week, sid);
  return (state.logs[k] ||= { sets: {}, startedAt: new Date().toISOString() });
}
/** Update one set; pass partial {kg, reps, rpe, done}. Saves without notifying listeners (avoids re-render while typing). */
export function updateSet(pid, week, sid, exKey, i, patch) {
  const log = ensureLog(pid, week, sid);
  const arr = (log.sets[exKey] ||= []);
  arr[i] = { ...(arr[i] || {}), ...patch };
  if (patch.done) arr[i].at = new Date().toISOString();
  save();
  return arr[i];
}
export function finishSession(pid, week, sid, finished = true) {
  const log = ensureLog(pid, week, sid);
  if (finished) log.finishedAt = new Date().toISOString(); else delete log.finishedAt;
  changed();
}
export function resetSession(pid, week, sid) { delete state.logs[logKey(pid, week, sid)]; changed(); }

export function setTimer(t) { state.timer = t; save(); }

export function exportJSON() { return JSON.stringify({ ...state, timer: null, exportedAt: new Date().toISOString() }, null, 1); }
export function importJSON(text) {
  const s = JSON.parse(text);
  if (!s || s.version !== 1 || !Array.isArray(s.programs) || typeof s.logs !== "object") throw new Error("This isn't a Gymboard backup file.");
  state = { ...fresh(), ...s, timer: null };
  changed();
}
export function resetAll() { state = fresh(); changed(); }
