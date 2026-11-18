import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseProgram } from "../js/csv.js";
import { e1rm, exerciseHistory, summarizeSets, weeklyStats, streak, logKey, liftSummaries } from "../js/stats.js";

const { program } = parseProgram(readFileSync(new URL("../examples/hybrid-plan.csv", import.meta.url), "utf8"));
program.id = "p1";
const set = (kg, reps, at = "2026-11-16T18:00:00Z") => ({ kg, reps, done: true, at });

test("e1RM: Epley with RIR from RPE", () => {
  assert.equal(e1rm(100, 1), 100);
  assert.ok(Math.abs(e1rm(100, 5) - 116.667) < 0.01);
  assert.ok(Math.abs(e1rm(100, 5, 8) - 123.333) < 0.01); // RIR 2 -> 7 reps
  assert.equal(e1rm(0, 5), null); assert.equal(e1rm(100, 15), null);
});

test("history, summary and weekly stats", () => {
  const A = program.sessions[0].id;
  const state = { programs: [program], logs: {
    [logKey("p1", 1, A)]: { sets: { "bench press": [set(55, 8), set(55, 8), set(55, 8), set(55, 11)] } },
    [logKey("p1", 2, A)]: { sets: { "bench press": [set(57.5, 8, "2026-11-23T18:00:00Z")] } },
  } };
  const h = exerciseHistory(state, "bench press");
  assert.equal(h.length, 2);
  assert.equal(h[0].week, 2);
  assert.equal(summarizeSets(h[1].sets), "8,8,8,11 @ 55 kg");
  assert.equal(summarizeSets([{ kg: 55, reps: 8 }, { kg: 57.5, reps: 8 }]), "8@55 · 8@57.5");
  const w1 = weeklyStats(state, program)[0];
  assert.equal(w1.sets, 4);
  assert.equal(w1.tonnage, 55 * 35);
  const bench = liftSummaries(state)[0];
  assert.equal(bench.points.length, 2);
  assert.ok(Number.isFinite(bench.current) && bench.current > 57.5); // regression: was NaN
});

test("streak counts weeks with all required sessions; optional Gym D not needed", () => {
  const logs = {};
  for (const w of [1, 2]) for (const s of program.sessions) if (!s.optional) logs[logKey("p1", w, s.id)] = { finishedAt: "2026-11-20T10:00:00Z", sets: {} };
  const state = { programs: [program], logs };
  assert.equal(streak(state, program, new Date(2026, 11, 2)), 2); // week 3, in progress
  delete logs[logKey("p1", 1, program.sessions[0].id)];
  assert.equal(streak(state, program, new Date(2026, 11, 2)), 1);
});
