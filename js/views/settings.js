import { h, icon, fmtDate, toast } from "../dom.js";
import { parseProgram } from "../csv.js";
import { getState, activeProgram, addProgram, setActive, deleteProgram, setStart, setSetting, exportJSON, importJSON, resetAll } from "../store.js";

export function renderSettings(root, ctx, query) {
  const state = getState();
  const program = activeProgram();
  const report = h("div.report");

  async function loadText(text, fileName) {
    const { program: p, errors, warnings } = parseProgram(text, fileName);
    report.replaceChildren();
    if (errors.length) {
      report.append(h("div.banner.error", h("strong", `Couldn't load ${fileName || "the file"}.`), ` Fix ${errors.length === 1 ? "this" : "these"} and upload again:`),
        h("ul.issues", errors.map(e => h("li", h("b", `Row ${e.line}${e.column ? ` · ${e.column}` : ""}: `), e.message))));
      return;
    }
    const existing = state.programs.find(x => x.name === p.name);
    let replaceId = null;
    if (existing) {
      if (confirm(`"${p.name}" is already loaded. Update it with this file and keep your logs?\n\nCancel = add it as a separate program.`)) replaceId = existing.id;
      else p.name += " (new)";
    }
    addProgram(p, { replaceId });
    toast(`Loaded "${p.name}"${warnings.length ? ` · ${warnings.length} note${warnings.length > 1 ? "s" : ""}` : ""}`);
    if (warnings.length) {
      ctx.rerender();
      document.querySelector(".report")?.append(h("div.banner.info", h("strong", "Loaded, with notes:")), h("ul.issues", warnings.map(w => h("li", h("b", `Row ${w.line}${w.column ? ` · ${w.column}` : ""}: `), w.message))));
    } else location.hash = "#/today";
  }
  async function loadExample() {
    try { const r = await fetch("examples/hybrid-plan.csv"); if (!r.ok) throw 0; await loadText(await r.text(), "hybrid-plan.csv"); }
    catch { toast("Couldn't load the example (are you offline?)"); }
  }

  const file = h("input", { type: "file", accept: ".csv,text/csv", hidden: true, onchange: async e => { const f = e.target.files[0]; if (f) await loadText(await f.text(), f.name); e.target.value = ""; } });
  const restore = h("input", { type: "file", accept: ".json,application/json", hidden: true, onchange: async e => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    if (!confirm("Restoring replaces everything on this device with the backup. Continue?")) return;
    try { importJSON(await f.text()); toast("Backup restored"); location.hash = "#/today"; } catch (err) { toast(err.message || "That file couldn't be read."); }
  } });

  root.append(h("header.page-head", h("div.eyebrow", "Settings"), h("h1", "Programs & data")));

  // active program
  if (program) {
    root.append(h("section.card",
      h("div.eyebrow", "Active program"), h("h2.card-h", program.name),
      h("p.card-sub", `${program.sessions.length} sessions · ${program.lastWeek ? `weeks ${program.firstWeek}-${program.lastWeek}` : "repeating"} · loaded ${fmtDate(program.importedAt, { day: "numeric", month: "short" })}`),
      h("label.field", h("span", "Week 1 starts on"),
        h("input", { type: "date", value: program.start, onchange: e => { if (e.target.value) { setStart(program.id, e.target.value); toast("Start date saved"); } } })),
      h("p.fine", "Week numbers and dates are counted from this date.")));
  }
  const others = state.programs.filter(p => p.id !== state.activeId);
  if (others.length) {
    root.append(h("h3.section-title", "Other programs"), h("div.list", others.map(p => h("div.row.static",
      h("div.row-main", h("div.row-title", p.name), h("div.row-sub", `${p.sessions.length} sessions`)),
      h("button.btn.small", { type: "button", onclick: () => { setActive(p.id); toast(`Switched to ${p.name}`); location.hash = "#/today"; } }, "Use"),
      h("button.btn.small.danger", { type: "button", onclick: () => { if (confirm(`Delete "${p.name}" and all its logs?`)) { deleteProgram(p.id); ctx.rerender(); } } }, "Delete")))));
  }

  root.append(h("section.card",
    h("h3.card-title", program ? "Load or update a program" : "Load a program"),
    h("p.card-sub", "Upload a CSV in the Gymboard format. Uploading a file with the same program name updates it and keeps your logs."),
    h("button.btn.primary.block", { type: "button", onclick: () => file.click() }, icon("upload", 18), " Upload CSV"),
    h("button.btn.block", { type: "button", onclick: loadExample }, "Load example plan (Hybrid plan)"),
    h("a.btn.link", { href: "templates/program-template.csv", download: "program-template.csv" }, icon("download", 16), " Download blank template"),
    file, report));

  root.append(h("section.card",
    h("h3.card-title", "In the gym"),
    toggle("Beep when rest is over", "sound"),
    toggle("Vibrate", "vibrate")));

  root.append(h("section.card",
    h("h3.card-title", "Backup"),
    h("p.card-sub", "Your logs live only in this browser. Download a backup now and then, or to move to another device."),
    h("button.btn.block", { type: "button", onclick: () => {
      const blob = new Blob([exportJSON()], { type: "application/json" });
      const a = h("a", { href: URL.createObjectURL(blob), download: `gymboard-backup-${new Date().toISOString().slice(0, 10)}.json` });
      document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    } }, icon("download", 18), " Download backup"),
    h("button.btn.block", { type: "button", onclick: () => restore.click() }, icon("upload", 18), " Restore backup"),
    restore,
    program ? h("button.btn.link.danger", { type: "button", onclick: () => { if (confirm(`Delete "${program.name}" and all its logs?`)) { deleteProgram(program.id); ctx.rerender(); } } }, "Delete active program") : null,
    h("button.btn.link.danger", { type: "button", onclick: () => { if (confirm("Erase all programs and logs on this device?")) { resetAll(); location.hash = "#/today"; } } }, "Erase everything")));

  root.append(h("p.fine.center", "Gymboard · data stays on this device"));

  if (query.get("example") && !program) loadExample();

  function toggle(label, key) {
    return h("label.switch", h("span", label), h("input", { type: "checkbox", checked: !!state.settings[key], onchange: e => setSetting(key, e.target.checked) }), h("i"));
  }
}
