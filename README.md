# Gymboard

Your training program, ready for the gym. Upload a program CSV and you get:

- **Today**: this week's session for today, one tap to start.
- **Session**: all exercises stacked top to bottom, with supersets grouped. Every set is pre-filled with the target or last time's weight; tap ✓ when you've done it.
- **Rest timer**: starts on ✓ (after the last exercise of a superset), with ±15 s, beep and vibrate.
- **Last time**: shown next to each exercise; tap a name for its full history and e1RM chart.
- **Progress**: estimated 1RM per lift, PRs, weekly volume and a week streak (optional sessions don't count against it).
- **Easier weeks**: every exercise drops its last set automatically.
- Works offline, installs to your home screen, and keeps the screen awake during a session. Your data stays in your browser.

No accounts, no server, no build step: just static files.

## Run it on your laptop
```bash
cd gymboard
python3 -m http.server 8080
```
Then open <http://localhost:8080>. Opening `index.html` directly from disk won't work, because browsers block modules on `file://`.

## Put it on your phone (free hosting)
Offline mode and "Add to Home Screen" need https. Pick one host:

**Netlify Drop (no account setup or git needed)**
1. Go to <https://app.netlify.com/drop>.
2. Drag the whole `gymboard` folder onto the page.
3. Open the URL it gives you on your phone.

**GitHub Pages**
1. Create a repository and push this folder to it.
2. In the repository, go to Settings → Pages → Deploy from branch → `main` / root.
3. Open `https://<your-user>.github.io/<repo>/` on your phone.

Then, on your phone:
- **iPhone:** Safari → Share → *Add to Home Screen*.
- **Android:** Chrome → menu → *Install app*.

> Data lives in the browser on each device. Use **Settings → Download backup** now and then, and **Restore backup** to move your logs to another device.

## Updating your program
Edit the CSV and upload it again (Settings → Upload CSV). If the `# program:` name matches, the program is updated in place and your logs are kept.

When you change app files on the host, bump `VERSION` in `sw.js` so phones fetch the new version.

## CSV format
UTF-8, comma- or semicolon-separated (Excel exports both). Start from `templates/program-template.csv`; `examples/hybrid-plan.csv` is a full 12-week example.

### Settings lines (optional, before the header)
```
# program: Hybrid plan
# start: 2026-11-16          ← Monday of week 1
# phase: 1 | Re-entry | Start light, find your working weights
# phase: 2-7 | Build
# phase: 8-12 | Strength
# deload: 7, 12              ← easier weeks: one set less on every exercise
```

### Columns (one row = one exercise in one session, for a range of weeks)
| Column | Required | Examples | Meaning |
|---|---|---|---|
| Session | ✓ | `Gym A: Upper body` | Rows with the same name form one session. End the name with `(optional)` for an optional session. |
| Day | | `Mon` | Planned weekday |
| Group | | `A` | Adjacent rows with the same letter = superset (A1, A2) |
| Exercise | ✓ | `Bench press` | Same name = same history across sessions |
| Weeks | | `2-7`, `8-12`, `4`, `1,3,5` | Weeks this row applies to. If blank, every week (a repeating program). |
| Sets | ✓¹ | `3` | Number of sets |
| Reps | | `8`, `8-12`, `8,8,8,8+`, `30-40s`, `30m` | `+` = AMRAP, `s` = seconds, `m` = metres. A comma list = reps per set. Blank = work to the RPE. |
| Kg | | `60`, `55-60`, `BW` | Target weight. If blank, the app uses your last logged weight. |
| RPE | | `8`, `8-9` | Target effort |
| Rest | | `90`, `1:30` | Rest in seconds. Default: 120, or 60 in a superset. |
| Per | | `hand`, `side`, `leg`, `arm` | Weight per hand / reps per side |
| Notes | | `3 s up, 3 s down` | Tempo, cues, swaps |

¹ Not needed when Reps is a comma list.

When an exercise changes between phases, give it one row per phase (for example Bench press `2-7` with `3 × 8 + AMRAP`, and `8-12` with `5,5,5,5+`).

## Estimated 1RM
`e1RM = kg × (1 + (reps + RIR) / 30)`, where `RIR = 10 − RPE`. It uses the RPE you logged, else the target RPE. Only sets of 1–12 reps with a weight count.

## Development
```bash
npm test
```
This runs the parser and stats tests (Node 20+, no dependencies). The code is plain ES modules: `js/csv.js` (format), `js/program.js` (weeks/sessions), `js/stats.js` (history/e1RM), `js/views/*` (screens).
