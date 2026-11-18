# Task Plan: Gym schedule web app (Boostcamp-style, CSV-driven)

## Goal
A mobile-first web app where I upload a standardised CSV training program and get a clean, gym-ready schedule: one session per screen, exercises stacked vertically, with set tick-off, weight/rep logging, rest timer and progress history.

## Current Phase
Phase 5 (done)

## Phases

### Phase 1: Requirements & Discovery (brainstorming)
- [x] Initial brainstorm of features (see findings.md)
- [x] Round 1 questions: features, hosting, CSV format, templates
- [x] Pick process templates from davila7/claude-code-templates
- [x] Round 2 questions: hosting, weights, structure, style
- [x] Choose approach (my call: plain HTML/CSS/JS, see findings)
- [x] Analyse user's current xlsx plan (findings.md)
- **Status:** complete

### Phase 2: Design doc & CSV spec
- [x] Write docs/design.md (screens, data model, CSV spec)
- [x] Write template CSV + filled example program
- [x] Convert user's plan to the CSV format (examples/hybrid-plan.csv, 57 rows)
- [x] User approves design (decisions in docs/design.md)
- [x] Example plan weeks match xlsx dates (1-12, start 16 Nov)
- **Status:** complete

### Phase 3: Implementation
- [x] Project scaffold + PWA shell (manifest, service worker, offline)
- [x] CSV parser + validation with friendly error messages
- [x] Program overview (weeks -> days)
- [x] Session view (stacked exercises, set rows)
- [x] Tick off sets + log actual weight/reps (persisted locally)
- [x] Rest timer
- [x] History / progress view
- [x] Export/import of logs (backup, move between devices)
- [x] Deload rule (drop last set) + optional sessions
- [x] Settings: load CSV, load example, start date, programs
- **Status:** complete

### Phase 4: Testing & Verification
- [x] Parser unit tests (valid, malformed, edge cases)
- [x] Playwright check at phone width (iPhone) and laptop width
- [x] Offline check
- **Status:** complete

### Phase 5: Delivery
- [x] README with how to run/host + CSV format guide
- [x] Hand off files to user
- **Status:** complete

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Features: tick sets, log weight/reps, rest timer, history | User picked all four |
| Delivered as local files | User choice; no backend |
| I design the CSV format | User choice |
| Process: brainstorming -> design doc -> planning-with-files | Most applicable templates in davila7/claude-code-templates |
| Free static host (GitHub Pages / Netlify) | Phone needs https URL for offline + install; still no backend |
| CSV has target kg + target RPE columns | User request |
| Dashboard shows estimated 1RM per lift from logged sets | User request ("a possible 1RM") |
| Week column optional; missing = repeating week | User: both should work |
| Visual style close to Boostcamp, own identity | User choice; no copied branding |
| Weeks follow the xlsx dates: wk 1 = 16 Nov (Re-entry), 2-7 Build, 8-12 Strength | User: xlsx dates are correct; phase names instead of 'wk 2-7' labels |
| Deload = drop last set of each exercise | User choice |
| Optional session via "(optional)" in name | User: Gym D optional, no streak penalty |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `node --test tests/` fails on Node 22 (dir arg) | 1 | Use glob `tests/*.test.mjs` |
| "nullnull" rendered on Today/Session | 1 | app root `append` skips null/false |
| Dashboard e1RM showed NaN | 1 | `current` read `.value` from history entry; now `.best`; regression test added |
| Changed weight only carried to next set | 1 | Carry to all remaining unticked sets |
| Chart axis text squashed on phone | 1 | Charts redraw at real pixel width (ResizeObserver) |
| Toast covered the session title | 1 | Toast moved to bottom, above timer/tab bar |
