# Findings & Thoughts

## Requirements (from user)
- Like Boostcamp: program -> session -> exercises, log as you go
- Upload standardised CSV (xlsx later)
- Used on phone in the gym (primary) and laptop
- All exercises of a session stacked vertically
- Tick off sets, log actual weight/reps, rest timer, history/progress
- Delivered as local files; I design the CSV format

## Brainstorm notes
- Gym context = one hand, sweaty, glancing between sets -> big tap targets (>=48px), high contrast, dark theme default, minimal typing (steppers / prefilled with target values, tap to confirm).
- "Today" should be one tap away: open app -> next unfinished session.
- Show last time's numbers next to each exercise (Boostcamp's most useful bit).
- Screen should not sleep mid-session -> Wake Lock API where supported.
- Rest timer: auto-start on set tick, vibrate + sound at zero, visible as sticky bar.
- Data stays in browser storage (localStorage/IndexedDB) -> needs JSON export/import for backup and phone<->laptop moves.

## Template research (davila7/claude-code-templates)
- skills/development/brainstorming: one question at a time, lay out 2-3 approaches, design doc, approval before build.
- skills/productivity/planning-with-files: task_plan.md / findings.md / progress.md, checkbox phases. <- "documenting thoughts and checking off".
- skills/web-development/progressive-web-app: manifest + service worker + offline fallback checklist.
- skills/creative-design/frontend-design + mobile-design: distinct visual identity, thumb-zone/touch rules.

## Open concerns
- "Just local files" vs phone use: a phone can't easily open a local HTML file, and service workers (offline/install) need https or localhost. Likely need a free static host (GitHub Pages / Netlify drop) - to confirm with user.

## Analysis of user's current plan (Gym_log_-_hybrid_plan.xlsx, tabs Gym A-D only)
- 4 sessions: A upper (Mon), B legs+plyos (Tue), C upper+single-leg (Thu), D arms/shoulders/abs (Wed, optional).
- 12 weeks, started Mon 16 Nov 2026 (today 18 Nov = week 1). Phases: wk 1 Re-entry, wk 2-7 Build (wk 7 easier), wk 8-12 Strength (wk 12 easier).
- Targets are free text per phase. Patterns the CSV format must express:
  - straight sets: "3 x 8-12"; rep ranges
  - AMRAP last set: "3 x 8, then 1 x 8+"
  - RIR-style: "4 sets, 1-2 reps short of failure" (no rep number)
  - time / distance: "30-40 s per side", "30 m per side"
  - per side / hand / leg / arm
  - exercises that only exist in some weeks: "From wk 4", "(weeks 1-7)", "(weeks 8-12)"
  - supersets: "A1 ·", "A2 ·" prefixes
  - tempo and swap notes ("3 s up and 3 s down", "swap: DB floor press if wrist complains")
- Start kg is free text: ranges "55-60", "per hand", "Bodyweight", "Light", "40-50 cm box".
- Logging today: reps per set as "8,8,8,11" + one kg per week. The app should log per set (more precise), but show the same compact "8,8,8,11 @ 60" summary.
- No RPE and no rest times in the sheet -> I'll propose values; user can edit.
- Week 1 has no own target: uses Start kg and the wk 2-7 scheme.

## Interpretations (to confirm in design review)
- Zercher "AMRAP from wk 3" -> wk 1-2 = 3 x 8, wk 3-7 = 3 x 8 + 1 x 8+.
- Strength-phase kg left blank in the CSV -> app suggests from last logged weight.
- "easier" weeks 7 and 12 -> shown as a deload banner; no automatic changes to numbers.

## Calls I made (user sent the plan instead of answering approach/host/dashboard)
- Plain HTML/CSS/JS, no build step, libraries vendored locally.
- Host-agnostic, README covers GitHub Pages and Netlify Drop.
- Dashboard: e1RM trend, PRs, weekly volume (sets/tonnage), consistency/streak.
