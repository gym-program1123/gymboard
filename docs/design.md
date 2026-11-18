# Gymboard: design

Status: **approved** 2026-11-18 (with the changes below).

## What it is
A mobile-first web app, in the spirit of Boostcamp. You upload a program CSV and the app turns it into a gym-ready schedule. In the gym you open it, it shows today's session, and you work down the exercises, ticking off and logging each set.

## Who and where
- One user: you.
- Main use: phone in the gym, between sets, often one-handed. Secondary use: laptop, to load programs and look at progress.

## Goals
1. Open the app and get to today's session in at most 1 tap.
2. Log a set in 1 tap when you hit the target, and in a few taps when you didn't.
3. Always see what you did last time next to today's target.
4. Works offline once loaded; your data stays on your device.

## Non-goals (for now)
- Accounts, cloud sync, sharing. A JSON backup/restore moves data between devices instead.
- Runs / cardio (the Runs tab of the current sheet).
- Uploading xlsx (CSV first; xlsx in the same column layout comes later).
- An exercise library with videos.

## Screens
1. **Today** (home): the current week and phase, for example "Week 3 of 12 · Build". It shows a card for today's session (based on the weekday) and below it the rest of this week's sessions with their status (done / partly done / to do). A deload week shows a banner.
2. **Session**: all exercises stacked vertically, in CSV order. Supersets (Group A, B, …) are drawn as one card with a coloured side bar labelled A1/A2. Each exercise card contains:
   - the name, target ("3 × 8-12 · RPE 8 · 90 s rest"), and per-hand/per-side marker
   - "Last time: 8,8,8,10 @ 57.5 kg"
   - one row per set: `set # | kg input | reps input | ✓`. The inputs are pre-filled with the target (or last weight), so if you hit it you only tap ✓. AMRAP sets are marked `8+`.
   - notes (tempo, swaps) collapsed under an ⓘ
   - an "Edit" action for an optional actual RPE per set
3. **Rest timer**: ticking a set starts a countdown from that exercise's Rest value. It shows as a sticky bar at the bottom (−15 s / +15 s / skip) and vibrates and beeps at 0. Within a superset the timer only starts after the last exercise in the group.
4. **Program**: the whole block as weeks → sessions, so you can look ahead or log a missed day.
5. **Exercise history**: tap an exercise name to see every logged session for it, plus its e1RM chart.
6. **Dashboard** (my call):
   - estimated 1RM per main lift, with a trend line
   - PRs: heaviest weight and best e1RM per exercise
   - weekly volume: hard sets and tonnage per week
   - consistency: sessions done per week, and a streak
7. **Settings / data**: load a CSV (it validates and points to the exact row and column of any error), choose the active program, set the start date, back up / restore JSON, and reset.

### Session screen sketch (phone)
```
┌──────────────────────────────┐
│ ← Gym A · Upper body   Wk 1  │
│ Re-entry · Mon 16 Nov        │
├──────────────────────────────┤
│ Bench press                  │
│ 4 sets · 8,8,8,8+ · RPE 8    │
│ Last: —   Target 55-60 kg    │
│  1   [ 55 ] kg  [ 8 ]   ( ✓ )│
│  2   [ 55 ] kg  [ 8 ]   ( ✓ )│
│  3   [ 55 ] kg  [ 8 ]   ( ✓ )│
│  4+  [ 55 ] kg  [ 8 ]   ( ✓ )│
├──────────────────────────────┤
│▌A1 Incline DB press  / hand  │
│▌A2 Lateral raise     / hand  │
│▌ …                           │
├──────────────────────────────┤
│  Rest 1:42   −15  +15  Skip  │  ← sticky
└──────────────────────────────┘
```

## CSV format (v1)
UTF-8, comma-separated, one header row. Lines starting with `#` before the header hold program settings, and all of them are optional.

### Settings lines
| Line | Meaning |
|---|---|
| `# program: Hybrid plan` | Program name |
| `# start: 2026-11-16` | Date week 1 starts. If missing, the app asks for it. |
| `# phase: 2-7 \| Build \| optional note` | Names a range of weeks; the note is shown in that phase |
| `# deload: 6, 11` | Easier weeks: banner, and every exercise loses its last set (minimum 1 set) |

### Columns
One row = one exercise in one session for a range of weeks. Row order = exercise order.

| Column | Required | Examples | Meaning |
|---|---|---|---|
| Session | yes | `Gym A: Upper body` | Rows with the same Session form one session. A name ending in `(optional)` marks an optional session: it's offered, but skipping it doesn't break the streak. |
| Day | no | `Mon` | Weekday it's planned on, used to pick "today" |
| Group | no | `A` | Same letter + adjacent rows = superset (A1, A2 …) |
| Exercise | yes | `Bench press` | Name; also the key for history and e1RM |
| Weeks | no | `1-7`, `8-12`, `4`, `1,3,5` | Weeks this row applies to. If blank, every week (a repeating program). |
| Sets | if Reps isn't a list | `3` | Number of sets |
| Reps | no | `8`, `8-12`, `8,8,8,8+`, `30-40s`, `30m` | Reps per set. A comma list sets each set separately (and implies Sets). `+` = AMRAP. `s` = seconds, `m` = metres. Blank = work to the RPE. |
| Kg | no | `60`, `55-60`, `BW` | Target weight. A range shows as a range and pre-fills the low end. If blank, the app pre-fills your last logged weight. |
| RPE | no | `8`, `8-9` | Target effort |
| Rest | no | `90` | Rest in seconds. If blank: 120 for the first exercises, 60 for groups. |
| Per | no | `hand`, `side`, `leg`, `arm` | Shown as "/ hand" etc.; kg is per hand, reps per side |
| Notes | no | `3 s up, 3 s down` | Free text |

An exercise that changes between phases simply gets one row per phase (for example Bench press `1-7` and `8-12`). Exercises that only run in some weeks (box jumps from week 4, trap-bar deadlift weeks 8-12) only appear in those weeks.

Files:
- `templates/program-template.csv`: a short blank example
- `examples/hybrid-plan.csv`: your current plan (Gym A–D), converted

## Logging and maths
- Each set is logged as {kg, reps, done, optional RPE} and stored per program, week, session, exercise and set.
- **e1RM** uses Epley with RPE: `e1RM = kg × (1 + (reps + RIR) / 30)`, where `RIR = 10 − RPE`.
  - It uses the logged RPE if there is one, else the target RPE, else assumes RIR 0.
  - Only sets of 1–12 reps with a weight count, so timed, distance and bodyweight sets don't.
- **Hard sets** = completed sets. **Tonnage** = kg × reps, doubled for `Per: hand`.

## Tech (my call)
- Plain HTML, CSS and JavaScript (ES modules), with no framework and no build step.
- CSV parsing is hand-written, since this format is small. Charts are hand-drawn SVG, so the app has no dependencies.
- Data lives in the browser (localStorage), with JSON backup and restore.
- It's a PWA: a manifest plus a service worker, so it can be installed on the home screen and works offline. It also keeps the screen awake during a session (Wake Lock) where supported.
- Look: a clean card style in the spirit of Boostcamp, with its own colours and no copied branding. It follows the phone's light/dark setting and uses large tap targets (≥ 48 px) and big tabular numbers.
- Hosting: a static folder. The README covers GitHub Pages and Netlify Drop.

## Testing
- Parser unit tests (Node's built-in test runner) on the example and template CSVs, plus broken files.
- Playwright run at iPhone width and laptop width: load the CSV, open today, log sets, timer, dashboard. Screenshots go in the report.

## Decisions from the review
1. The RPE and rest values I filled in are right.
2. Weeks follow the dates in the xlsx: week 1 starts Mon 16 Nov 2026 and week 12 starts Mon 1 Feb 2027.
   - Week 1, Re-entry: the current week, with one session left (Friday). It uses the Build scheme at start weights.
   - Weeks 2-7: Build
   - Weeks 8-12: Strength
   - Easier weeks: 7 and 12
   - The app shows phase names ("Build", "Strength"), never labels like "wk 2-7 targets".
3. Zercher squat: weeks 1-2 are 3 × 8; from week 3 on it's 3 × 8 plus an AMRAP last set.
4. In easier weeks every exercise drops one set. For a list like `8,8,8,8+` the last set (the AMRAP) is dropped.
5. Gym D is optional and doesn't count against the streak.
6. Sessions can be done on another day than planned (for example Friday). "Today" shows the planned session for the weekday and, if it's done or there is none, the first open session of the week.
