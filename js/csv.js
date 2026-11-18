// CSV -> program. No DOM here, so it runs in Node tests too.

export const COLUMNS = ["Session","Day","Group","Exercise","Weeks","Sets","Reps","Kg","RPE","Rest","Per","Notes"];
const DAYS = { mon:1, tue:2, wed:3, thu:4, fri:5, sat:6, sun:0 };
const DAY_NAMES = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
export { DAY_NAMES };

/** RFC 4180-ish CSV parser. Returns array of {cells, line}. Handles quotes, "" escapes, CRLF, ; or , delimiters. */
export function parseCSV(text, delimiter) {
  text = text.replace(/^﻿/, "");
  if (!delimiter) {
    const firstData = text.split(/\r?\n/).find(l => l.trim() && !l.startsWith("#")) || "";
    delimiter = (firstData.split(";").length > firstData.split(",").length) ? ";" : ",";
  }
  const rows = []; let cells = []; let cell = ""; let q = false; let line = 1; let rowLine = 1;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else { if (c === "\n") line++; cell += c; }
    } else if (c === '"') q = true;
    else if (c === delimiter) { cells.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      cells.push(cell); rows.push({ cells, line: rowLine }); cells = []; cell = ""; line++; rowLine = line;
    } else cell += c;
  }
  if (cell !== "" || cells.length) { cells.push(cell); rows.push({ cells, line: rowLine }); }
  return rows;
}

const slug = s => s.toLowerCase().normalize("NFKD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "");
export const exKey = name => name.trim().toLowerCase().replace(/\s+/g, " ");

/** "1-7", "4", "1,3,5", "2-4, 8" -> sorted array of ints. "" -> null (every week). */
export function parseWeeks(s) {
  s = (s || "").trim();
  if (!s) return null;
  const out = new Set();
  for (const part of s.split(/[,;]/)) {
    const m = part.trim().match(/^(\d+)\s*(?:-\s*(\d+))?$/);
    if (!m) throw new Error(`"${s}" isn't a week range. Use e.g. 1-7, 4 or 1,3,5.`);
    const a = +m[1], b = m[2] ? +m[2] : a;
    if (b < a) throw new Error(`"${part.trim()}" goes backwards.`);
    for (let w = a; w <= b; w++) out.add(w);
  }
  return [...out].sort((x, y) => x - y);
}

/** One reps token: "8", "8-12", "8+", "30-40s", "30m", "" */
export function parseRepToken(t) {
  t = (t || "").trim().toLowerCase().replace(/\s+/g, "");
  if (!t) return { text: "", min: null, max: null, amrap: false, unit: "reps" };
  const m = t.match(/^(\d+(?:\.\d+)?)(?:-(\d+(?:\.\d+)?))?(\+)?(s|sec|m)?$/);
  if (!m) throw new Error(`"${t}" isn't a valid reps value. Use e.g. 8, 8-12, 8+, 30s or 40m.`);
  const unit = m[4] ? (m[4] === "m" ? "m" : "s") : "reps";
  const min = +m[1], max = m[2] ? +m[2] : min;
  return { text: (m[2] ? `${min}-${max}` : `${min}`) + (m[3] ? "+" : ""), min, max, amrap: !!m[3], unit };
}

/** "60", "55-60", "BW", "", "32.5" */
export function parseRange(s, what) {
  s = (s || "").trim().replace(",", ".");
  if (!s) return null;
  if (/^(bw|bodyweight)$/i.test(s)) return { text: "BW", bw: true, min: null, max: null };
  const m = s.match(/^(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?$/);
  if (!m) throw new Error(`"${s}" isn't a valid ${what}. Use a number, a range like 55-60${what === "Kg" ? " or BW" : ""}.`);
  const min = +m[1], max = m[2] ? +m[2] : min;
  return { text: m[2] ? `${min}-${max}` : `${min}`, bw: false, min, max };
}

/**
 * Parse program CSV text.
 * Returns { program, errors: [{line, column, message}], warnings: [...] }.
 * program is null if there are errors.
 */
export function parseProgram(text, fileName = "") {
  const errors = [], warnings = [];
  const meta = { name: "", start: "", phases: [], deload: [] };
  const all = parseCSV(text);
  let headerIdx = -1;
  for (let i = 0; i < all.length; i++) {
    const { cells, line } = all[i];
    const first = (cells[0] || "").trim();
    if (first.startsWith("#")) {
      const raw = cells.join(",").replace(/,+$/, "").replace(/^#\s*/, "");
      const m = raw.match(/^(\w+)\s*:\s*(.*)$/);
      if (!m) continue; // plain comment
      const [, k, v] = m; const key = k.toLowerCase();
      try {
        if (key === "program") meta.name = v.trim();
        else if (key === "start") {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(v.trim()) || isNaN(Date.parse(v.trim()))) throw new Error(`Start date "${v.trim()}" must look like 2026-11-16.`);
          meta.start = v.trim();
        } else if (key === "phase") {
          const [w, name, ...note] = v.split("|").map(x => x.trim());
          const weeks = parseWeeks(w);
          if (!weeks || !name) throw new Error(`Phase needs "weeks | name", e.g. "# phase: 2-7 | Build".`);
          meta.phases.push({ weeks, name, note: note.join(" | ") });
        } else if (key === "deload") meta.deload = parseWeeks(v) || [];
      } catch (e) { errors.push({ line, column: "#" + key, message: e.message }); }
      continue;
    }
    if (cells.every(c => !c.trim())) continue;
    headerIdx = i; break;
  }
  if (headerIdx < 0) { errors.push({ line: 1, column: "", message: "No header row found. The first row (after # lines) must contain the column names." }); return { program: null, errors, warnings }; }

  const header = all[headerIdx].cells.map(h => h.trim().toLowerCase());
  const col = {};
  COLUMNS.forEach(c => { const i = header.indexOf(c.toLowerCase()); if (i >= 0) col[c] = i; });
  for (const req of ["Session", "Exercise"]) if (!(req in col)) errors.push({ line: all[headerIdx].line, column: req, message: `Missing required column "${req}".` });
  header.forEach((h, i) => { if (h && !COLUMNS.some(c => c.toLowerCase() === h)) warnings.push({ line: all[headerIdx].line, column: h, message: `Unknown column "${h}" is ignored.` }); });
  if (errors.length) return { program: null, errors, warnings };

  const sessions = []; const byName = new Map();
  for (const { cells, line } of all.slice(headerIdx + 1)) {
    if (cells.every(c => !c.trim())) continue;
    if ((cells[0] || "").trim().startsWith("#")) continue;
    const get = c => (col[c] !== undefined ? (cells[col[c]] || "").trim() : "");
    const sessionName = get("Session"), exercise = get("Exercise");
    const err = (column, message) => errors.push({ line, column, message });
    if (!sessionName) { err("Session", "Session is empty."); continue; }
    if (!exercise) { err("Exercise", "Exercise is empty."); continue; }

    let session = byName.get(sessionName);
    if (!session) {
      session = { id: slug(sessionName) || `s${sessions.length + 1}`, name: sessionName.replace(/\s*\(optional\)\s*$/i, ""),
        optional: /\(optional\)\s*$/i.test(sessionName), day: null, rows: [] };
      byName.set(sessionName, session); sessions.push(session);
    }
    const dayTxt = get("Day");
    if (dayTxt) {
      const d = DAYS[dayTxt.slice(0, 3).toLowerCase()];
      if (d === undefined) err("Day", `"${dayTxt}" isn't a weekday. Use Mon, Tue, Wed …`);
      else if (session.day !== null && session.day !== d) warnings.push({ line, column: "Day", message: `"${sessionName}" has more than one Day; using ${DAY_NAMES[session.day]}.` });
      else session.day = d;
    }

    const row = { exercise, key: exKey(exercise), group: get("Group").toUpperCase(), line,
      per: get("Per").toLowerCase(), notes: get("Notes") };
    try { row.weeks = parseWeeks(get("Weeks")); } catch (e) { err("Weeks", e.message); continue; }
    try {
      const repsTxt = get("Reps"); const setsTxt = get("Sets");
      const tokens = repsTxt ? repsTxt.split(/[,;]/) : [""];
      let sets = setsTxt ? Number(setsTxt) : null;
      if (setsTxt && (!Number.isInteger(sets) || sets < 1 || sets > 20)) throw Object.assign(new Error(`Sets "${setsTxt}" must be a whole number from 1 to 20.`), { column: "Sets" });
      let list;
      if (tokens.length > 1) {
        list = tokens.map(parseRepToken);
        if (sets && sets !== list.length) warnings.push({ line, column: "Sets", message: `Sets says ${sets} but Reps lists ${list.length} sets; using ${list.length}.` });
      } else {
        if (!sets) throw Object.assign(new Error("Fill in Sets, or list the reps per set in Reps (e.g. 8,8,8,8+)."), { column: "Sets" });
        const tok = parseRepToken(tokens[0]);
        list = Array.from({ length: sets }, () => ({ ...tok }));
      }
      row.sets = list;
    } catch (e) { err(e.column || "Reps", e.message); continue; }
    try { row.kg = parseRange(get("Kg"), "Kg"); } catch (e) { err("Kg", e.message); continue; }
    try { row.rpe = parseRange(get("RPE"), "RPE"); if (row.rpe && (row.rpe.bw || row.rpe.max > 10)) throw new Error(`RPE "${get("RPE")}" must be between 1 and 10.`); }
    catch (e) { err("RPE", e.message); continue; }
    const restTxt = get("Rest");
    if (restTxt) {
      const r = parseRestSeconds(restTxt);
      if (r === null) { err("Rest", `Rest "${restTxt}" must be seconds (90) or m:ss (1:30).`); continue; }
      row.rest = r;
    } else row.rest = null;
    session.rows.push(row);
  }
  if (!sessions.length && !errors.length) errors.push({ line: all[headerIdx].line, column: "", message: "The file has a header but no exercises." });
  if (errors.length) return { program: null, errors, warnings };

  // default rest: grouped exercises 60, else 120
  for (const s of sessions) for (const r of s.rows) if (r.rest === null) r.rest = r.group ? 60 : 120;

  const weekNums = [...sessions.flatMap(s => s.rows.flatMap(r => r.weeks || [])), ...meta.phases.flatMap(p => p.weeks), ...meta.deload];
  const program = {
    name: meta.name || fileName.replace(/\.csv$/i, "") || "My program",
    start: meta.start || null,
    phases: meta.phases, deload: meta.deload,
    firstWeek: weekNums.length ? Math.min(...weekNums) : 1,
    lastWeek: weekNums.length ? Math.max(...weekNums) : null, // null = repeating program
    sessions,
  };
  if (!program.start) warnings.push({ line: 1, column: "#start", message: "No start date in the file; set it in Settings (defaults to this week's Monday)." });
  return { program, errors, warnings };
}

export function parseRestSeconds(t) {
  t = t.trim().toLowerCase();
  let m;
  if ((m = t.match(/^(\d+)\s*(s|sec)?$/))) return +m[1];
  if ((m = t.match(/^(\d+):(\d{2})$/))) return +m[1] * 60 + +m[2];
  if ((m = t.match(/^(\d+(?:\.\d+)?)\s*(m|min)$/))) return Math.round(+m[1] * 60);
  return null;
}
