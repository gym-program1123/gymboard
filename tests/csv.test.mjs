import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCSV, parseProgram, parseWeeks, parseRepToken } from "../js/csv.js";
import { buildSession, weekOf, sessionDate, targetText, isoDay } from "../js/program.js";

const example = readFileSync(new URL("../examples/hybrid-plan.csv", import.meta.url), "utf8");
const template = readFileSync(new URL("../templates/program-template.csv", import.meta.url), "utf8");

test("CSV parser handles quotes, commas in quotes, CRLF", () => {
  const rows = parseCSV('a,"b,c","d ""q"""\r\n1,2,3\r\n');
  assert.deepEqual(rows.map(r => r.cells), [["a", "b,c", 'd "q"'], ["1", "2", "3"]]);
});

test("semicolon-delimited files (Dutch/EU Excel) work", () => {
  const { program, errors } = parseProgram("Session;Exercise;Sets;Reps\nA;Squat;3;5\n");
  assert.equal(errors.length, 0);
  assert.equal(program.sessions[0].rows[0].sets.length, 3);
});

test("weeks and reps tokens", () => {
  assert.deepEqual(parseWeeks("2-4, 8"), [2, 3, 4, 8]);
  assert.equal(parseWeeks(""), null);
  assert.throws(() => parseWeeks("7-2"));
  assert.deepEqual(parseRepToken("8+"), { text: "8+", min: 8, max: 8, amrap: true, unit: "reps" });
  assert.equal(parseRepToken("30-40s").unit, "s");
  assert.equal(parseRepToken("30m").unit, "m");
  assert.throws(() => parseRepToken("8x"));
});

test("example plan parses into 4 sessions, 12 weeks, phases and deloads", () => {
  const { program, errors } = parseProgram(example);
  assert.deepEqual(errors, []);
  assert.equal(program.name, "Hybrid plan");
  assert.equal(program.start, "2026-11-16");
  assert.deepEqual([program.firstWeek, program.lastWeek], [1, 12]);
  assert.deepEqual(program.deload, [7, 12]);
  assert.deepEqual(program.sessions.map(s => [s.name, s.day, s.optional]), [
    ["Gym A: Upper body", 1, false], ["Gym B: Legs and plyos", 2, false],
    ["Gym C: Upper body + single-leg", 4, false], ["Gym D: Arms, shoulders, abs", 3, true]]);
});

test("week dates match the xlsx (wk 1 Mon 16 Nov, wk 12 Mon 1 Feb, Gym C wk 3 Thu 3 Dec)", () => {
  const { program } = parseProgram(example);
  assert.equal(weekOf(program, new Date(2026, 10, 20)), 1); // Fri 20 Nov
  assert.equal(weekOf(program, new Date(2027, 1, 1)), 12);
  const c = program.sessions.find(s => s.name.startsWith("Gym C"));
  assert.equal(isoDay(sessionDate(program, 3, c)), "2026-12-03");
});

test("exercises only appear in their weeks; deload drops the last set", () => {
  const { program } = parseProgram(example);
  const b = id => buildSession(program, program.sessions[1].id, id);
  const names = w => b(w).exercises.map(e => e.exercise);
  assert.ok(!names(3).includes("Box jump, step down"));
  assert.ok(names(4).includes("Box jump, step down"));
  assert.ok(names(7).includes("Romanian deadlift") && !names(7).includes("Trap-bar deadlift"));
  assert.ok(names(8).includes("Trap-bar deadlift") && !names(8).includes("Romanian deadlift"));
  const z = w => b(w).exercises.find(e => e.exercise === "Zercher squat");
  assert.equal(targetText(z(2)), "3 × 8");
  assert.equal(z(3).sets.map(s => s.text).join(","), "8,8,8,8+");
  assert.equal(z(7).sets.map(s => s.text).join(","), "8,8,8"); // deload: AMRAP dropped
  assert.equal(z(8).sets.map(s => s.text).join(","), "5,5,5,5+");
  assert.equal(b(12).exercises.find(e => e.exercise === "Trap-bar deadlift").sets.length, 2);
});

test("supersets get A1/A2 labels and only the last member starts rest", () => {
  const { program } = parseProgram(example);
  const a = buildSession(program, program.sessions[0].id, 2).exercises;
  const inc = a.find(e => e.exercise.startsWith("Incline")), lat = a.find(e => e.exercise === "Lateral raise");
  assert.deepEqual([inc.label, inc.groupLast, lat.label, lat.groupLast], ["A1", false, "A2", true]);
  assert.equal(a.find(e => e.exercise === "Bench press").label, "");
});

test("template parses", () => {
  const { program, errors } = parseProgram(template);
  assert.deepEqual(errors, []);
  assert.equal(program.lastWeek, 4);
});

test("useful errors with line and column", () => {
  const { program, errors } = parseProgram("Session,Exercise,Sets,Reps,Kg\nA,Squat,3,5,heavy\nA,,3,5,60\nA,Bench,,8,60\n");
  assert.equal(program, null);
  assert.deepEqual(errors.map(e => [e.line, e.column]), [[2, "Kg"], [3, "Exercise"], [4, "Sets"]]);
  assert.match(parseProgram("Foo,Bar\n1,2\n").errors[0].message, /Missing required column "Session"/);
});

test("repeating program: no Weeks column", () => {
  const { program } = parseProgram("Session,Day,Exercise,Sets,Reps\nPush,Mon,Bench,3,5\n");
  assert.equal(program.lastWeek, null);
  assert.equal(buildSession(program, "push", 42).exercises.length, 1);
});
