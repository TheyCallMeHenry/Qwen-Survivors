# FPS Test Video Review — 2026-10-23

Analysis of `docs/videos/2026-10-23 1449 Qwen-Survivors FPS Test.mp4` (file left untouched; all
scratch under gitignored `unsloth-tmp/`). Review date: 2026-10-23.

## User question
Play "felt laggy at times" even though the on-screen counter showed 60 fps.
- **H1** the counter is imprecise / does not capture real-time frame rate.
- **H2** the real issue is micro-stutter (uneven frame timing), not low average FPS.

## 1. Recording metadata (fact — `ffmpeg -i`)
- Container: mp4, H.264 Main, yuv420p, AAC stereo 48k.
- **Duration 00:07:22.37 (442.37 s).**
- **Capture frame rate 30 fps** (`30 fps, 30 tbr, 30k tbn`).
- Recorded frame size **960x1032** (includes browser toolbar + bookmarks bar).
- The game's own canvas, per the in-game overlay, is **958x916 px**.
- creation_time 2026-10-23T18:41:57Z (= 14:41 local), matches the reported recording.

> Critical caveat: a 30 fps capture cannot directly resolve a 60 fps render. It can only show
> frames that are *duplicated / held* for ≥ one 33.3 ms capture slot. So this analysis measures
> "≥1 frame period with no visible change", i.e. real ≥~130 ms content-holds and up — NOT the
> game's true instantaneous frame time.

## 2. Method (exact, reproducible)
Tooling: no system ffmpeg. Installed self-contained `ffmpeg-static` into gitignored scratch
(`unsloth-tmp/ff/`), binary at `unsloth-tmp/ff/node_modules/ffmpeg-static/ffmpeg.exe`. Repo-root
`package.json` was momentarily modified by the install and was reverted (`git checkout --`); the
reinstall was forced local with a scratch `package.json`. No repo files or `package.json` changed.

Per-frame difference signal (numeric, no eyeballing):
```
ffmpeg -hide_banner -loglevel error -i <vid> \
  -vf "tblend=all_mode=difference,signalstats,metadata=print:file=diffs.txt" -f null -
```
YAVG of the frame-difference image ≈ 0 when a frame is (near) identical to the previous one.
Parsed with `unsloth-tmp/vidframes/analyze.mjs` + `hist.mjs`. A frame is counted "held" when
YAVG < 0.5 (real gameplay motion sits at YAVG 1–3; 5th pct = 0.007, median = 1.16, so 0.5 cleanly
separates static from moving).

Overlay readings: cropped the top-centre green pill
(`crop=380:48:345:120`, upscaled) at 9 timestamps and read them visually.

## 3. Quantitative stutter evidence (fact from the numeric pass)
- Total frames analysed: **13270** (= 442.37 s × 30 fps).
- **30.6% of sampled moments (4064 frames) were a duplicate/near-identical of the previous frame.**
- Frozen-frame runs (consecutive held frames), by duration:
  | run length | count | total frozen seconds |
  |---|---|---|
  | 0.1–0.2 s (≈3–6 identical frames) | **1973** | 68.3 |
  | 0.2–0.5 s | 7 | 2.2 |
  | 0.5–1.0 s | 40 | 28.3 |
  | 1.0–2.0 s | 14 | 20.7 |
  | ≥2.0 s | 3 | 16.0 |
  - **≈1973 micro-stalls of 130–200 ms scattered across the ENTIRE timeline** (128–404 such events in
    every 60 s window). This is a textbook stutter signature.
  - The 3 long holds (start ≈ **61.1 s / 3.4 s**, **334.8 s / 4.9 s**, **340.9 s / 7.7 s**) are dim /
    near-static scenes (late game); `ov_336` and `ov_341` crops were byte-identical, confirming a static hold.

## 4. Independent cross-check: the game's own clock lagged real time (fact)

> **SUPERSEDED by the FULL-COVERAGE CORRECTION below** — the aggregate numbers here (0.67–0.77×,
> ≈437 s) were correct only as a raw average; their interpretation is wrong (sustained level-up /
> pause screens with a frozen clock were missed, and the rows t=62.5 and t=341.0 were sampled
> *inside* frozen menu screens, not gameplay).
The on-screen countdown is a 300 s (5:00) game timer that ticks down. Reading it at the sampled
timestamps shows it advanced **far slower than the video wall clock**:

| video t | overlay | game timer | game seconds elapsed | wall seconds | game/wall |
|---|---|---|---|---|---|
| 3.0 | 60.1 fps | 4:53 | 7 | — | — |
| 34.9 | 59.9 fps | 4:29 | 24 | 31.9 | 0.75 |
| 46.5 | 60 fps | 4:20 | 33 | 43.5 | 0.76 |
| 62.5 | 60 fps | 4:08 | 45 | 59.5 | 0.76 |
| 89.0 | 60 fps | 3:47 | 66 | 86.0 | 0.77 |
| 250.0 | 60 fps | 1:44 | 189 | 247 | 0.77 |
| 341.0 | 60 fps | 0:51 | 242 | 338 | 0.72 |
| 430.0 | 59.4 fps | 0:07 | 286 | 427 | 0.67 |

The full 300 s in-game countdown took ≈437 s of video. ~~**The simulation ran at ≈0.67–0.77× real
time (effective ≈ 40–46 fps), while the counter insisted 60.**~~ — superseded: the sim clock runs
1:1 while actually rendering; the loss decomposes into menu/pause stops (~40 s) + gameplay
frame-freezes (~100 s). See correction below. This cannot be a mere recorder
artifact: a dropped/re-duplicated capture frame does not stop the *game's own countdown*, which is
part of the captured image — so the game genuinely stalled.

## 5. Overlay readings (fact)
At all 9 sampled timestamps the overlay read **59.4 – 60.1 fps · 958x916px** (9 samples superseded
by the 111-sample reading in the correction: range 59.1–60.9, same conclusion). It never dipped below
59.4 even inside the densest micro-stall clusters (t≈35, 46) or the longest holds (t≈62, 341).
(Calm windows like t=250 read the same 60 as busy ones — the number is essentially constant.)

## 6. Verdict (conclusions stand; magnitudes superseded — see correction)
- **H1 — SUPPORTED (high confidence, fact+inference).** The counter is a 1-second rAF average that
  pins to ~60 and is blind to the real problem: at every sampled point it read ~60 while the
  game's own clock lagged real time by ~23–33%. A 1 s average saturating at the 60 cap cannot
  reveal sub-second pacing gaps. (Fact: counter value vs timer lag. Inference: mechanism = the
  setInterval 1 s average as documented in js/core/loop.js + js/main.js.)
- **H2 — SUPPORTED (high confidence, fact).** Micro-stutter is the felt cause: ~1973 discrete
  ≥130 ms content-holds distributed throughout the whole run, plus 40 half-second and ~14
  one-second-plus hitches. That matches "felt laggy at times" exactly, despite ~60 average.
- H1 and H2 are not competing here — they are the **same problem seen two ways**: real stalls (H2)
  that the averaging counter fails to report (H1).

## 7. What a screen recording CANNOT establish (caveats)
- True instantaneous frame times below ~33 ms (the 30 fps capture ceiling): sub-33 ms judder and
  the real 60 Hz vs 30 Hz distinction are invisible to this file.
- Clean separation of "game stalled" vs "recorder/compositor re-duplicated a frame". The
  timer-lag cross-check (§4) strongly indicates real game stalls, but a single recording cannot
  fully exclude capture-pipeline duplication for the *shortest* 130 ms holds.
- Cause of the stalls (GC, enemy-count spikes, a particular system) — only that they are
  ~everywhere and worsen slightly toward late game (game/wall ratio drifts 0.77 → 0.67).

## 8. Suggested follow-up (not done here)
Log per-frame `performance.now()` deltas in the loop and surface 95th-percentile frame time / a
"jank" counter in the overlay, instead of a 1 s rAF average — that would directly measure H2 and
stop the overlay from masking it (H1).

---

# FULL-COVERAGE CORRECTION (2026-10-23, supersedes sampled findings)

Re-review at the user's request: the user (having watched the whole video) reported **sustained
pause/level-up screens** the 9-point sampling had missed, which stop the in-game countdown by
legitimate design. This section covers the ENTIRE video. Original §1–8 kept as the record of the
flawed pass; their superseded numbers are marked inline above. Scratch: `unsloth-tmp/vidframes2/`.

## C0. Method (full coverage)
- Extracted one HUD band (top-centre timer + score + gems + the green fps pill) every 4 s:
  **111 frames**, exact frame-index selection (`select=not(mod(n,120))` at 30 fps CFR), rendered
  as 37 self-labelled 3-cell contact sheets (`sh_NN.png`, each cell stamped `t=NN.Ns`) so no
  reading can be misattributed. **Every one of the 111 frames was read**; the timer, score, gem
  count and pill value were transcribed for each (see C2 table).
- Re-ran the numeric frame-difference pass (§2 method): reproduced §3 exactly (4063 held frames;
  1973 runs of 0.1–0.2 s; 7 / 40 / 14 / 3 longer) — that analysis is independent of pausing and
  stands numerically.
- Full-frame state checks (`fs_*.png`) at every numeric static run ≥ 1 s (17 windows) plus
  recording start (t=0, t=1.0) and end (t=441.6). Timer-freeze detection and the visual state
  were cross-checked against each other at all boundaries (two-signal rule).
- Tooling note: the earlier `fps=1/4` filter pass misattributed frames (the extraction itself was
  fine; multi-image review responses were also shuffled). All corrected numbers below come from
  exact-frame extraction + single/labeled-image reads only.

## C1. What the video actually contains
**One continuous run**, from ~5 s into a fresh run (recording starts on the PAUSED menu) to the
run's normal end. No restarts: score/gems/levels increase monotonically the whole time
(`?fps=1`, 958x916 window). At t≈441.3 the countdown hits 0:00 and the **“DAWN BREAKS”**
results screen appears: **Score 56150 · Time 5:01 · Kills 1727 · Level 55** (fact, read at
frame n=13250). The game's own summary confirms the sim clock itself is accurate (5:01 of game
time) — the recording is 442.4 s and the game clock consumed **296 s** (4:56 → 0:00) inside it.

## C2. Segmented timeline (every clock-stop boundary; all values read this session)
Clock = countdown remaining at the 4 s grid; “frozen” = clock identical across grid points.

| video t | clock | state / segment |
|---|---|---|
| 0.0 | 4:56 | **PAUSED menu** (recording starts paused; resumed by t≈1, clock running 1:1: 4:52@4, 4:48@8) |
| 8.3–9.9 | 4:48→4:46 | **LEVEL-UP menu #1** (1.6 s hold; Continuous Laser/Aegis Blades/Rolling Boulder) |
| 10–12 | 4:46 frozen | menu close + resumes (4:42@16) |
| 18.6–20.5 | 4:41→4:40 | **LEVEL-UP #2** (Bow&Arrow/Frog Tongue/Moonbolt W·L2) |
| 20–33 | running | 4:40→4:31, ~0.75–0.85 ratio during play |
| 33.9–35.8 | 4:29 | **LEVEL-UP #3** (Spectral Axe/Twin Fangs/Celerity Boots) |
| 36–45 | 4:29→4:20 | playing |
| 45.7–47.6 | 4:20 | **LEVEL-UP #4** (Heart of Oak/Snowball Launcher/Web-slingers) |
| 48–61 | 4:20→4:08 | playing (note: §4's t=62.5 sample sat in the next window) |
| 61.0–64.4 | 4:08 frozen | **LEVEL-UP #5**, 3.4 s hold (Wolfpack/Fyre Lance/Bow&Arrow) — §3 “long hold @61.1” is a MENU, not late-game dimness |
| 64.4–76 | 4:08→3:57 | playing |
| 76.1–77.5 | 3:57 | **LEVEL-UP #6** (Mirror Shield/Ice Skates/Moonbolt W·L3) |
| 77.5–117.7 | 3:57→3:25 | playing; ratio 0.75–1.0 |
| 117.7–118.9 | 3:25 | **LEVEL-UP #7** (Coffee/Ice Skates/Twin Fangs) |
| 118.9–149.0 | 3:25→3:02 | playing; ratio ~0.9–1.0 |
| 149.0–150.5 | 3:02 | **LEVEL-UP #8** |
| 150.5–233.7 | 2:59→1:57 | playing |
| 233.7–234.9 | 1:57 | **LEVEL-UP #9** |
| 234.9–272.5 | 1:57→1:28 | playing |
| 272.5–274.3 | 1:28 | **LEVEL-UP #10** |
| 274.3–290.5 | 1:28→1:18 | playing |
| 290.5–291.8 | 1:18 | **LEVEL-UP #11** |
| 291.8–334.8 | 1:18→0:51 | playing (ratio drifts down to ~0.5 late) |
| **334.8–≈349.5** | **0:51 frozen** | **PAUSED menu (manual pause!)** — §3 “long holds @334.8 and @340.9” are ONE ~15 s pause menu (Resume/Restart/Main-Menu/Mute, verified at t=341); §4's t=341.0 row was sampled inside it |
| 349.5–377.8 | 0:50→0:36 | playing; ratio ~0.55–0.75 |
| 377.8–379.0 | 0:36 | **LEVEL-UP #12** |
| 379.0–414.3 | 0:36→0:16 | playing; ratio ~0.5–0.75 |
| 414.3–416.2 | 0:16 | **LEVEL-UP #13** |
| 416.2–441.3 | 0:16→0:00 | playing; ratio ~0.6 |
| 441.3–442.4 | 0:00 | “DAWN BREAKS” end screen |

Full 111-point grid transcription available in `unsloth-tmp/vidframes2/sh_00..36.png`.

## C3. Corrected speed decomposition (fact)
- Wall time: **442.37 s**. Game clock consumed: **296 s** (recording began ~5 s into the run; the
  run's own summary says 5:01 — consistent).
- Clock-stopped menu/pause wall time (17 verified windows + the ≤1 s pause at recording start):
  **≈ 40 s** (numeric ≥1 s holds sum to 36.7 s; extended for open/close ramps → ~40 s).
- Playing wall time: **≈ 402 s**; game clock advanced 296 s in it → **while playing the game ran
  at ≈ 0.73–0.74× real time** (≈ ±0.03; per-minute playing ratio declines from ~0.9–1.0 at
  t<150 to ~0.55–0.65 at t>350).
- While the game is *frame-continuous* the clock is 1:1 (verified: 4:56→4:48 in exactly 8 s at
  t=0–8; 4:48→4:46 with only the 1.6 s menu between t=8–12). **All clock loss is frame-freeze
  time**: the 1959 non-menu held-frame runs sum to **95.2 s**, plus ~10 s of sub-threshold
  (<0.1 s) freezes — closing the 106 s gap between playing wall time and game clock.

## C4. What survives the previous doc's numbers (fact)
- 30.6% duplicate frames, 1973 × 0.1–0.2 s holds, 40 × 0.5–1 s, 7 × 0.2–0.5 s: **re-derived
  byte-identically** — unaffected by the pause discovery.
- Of the flagged ≥1 s “near-static holds” (17 total incl. the 3 long holds): **all 17 are
  menu/pause/end screens** (13 level-up menus, one manual PAUSE split across three runs, end
  screen). So: 3/3 long holds = screens, not unexplained late-game dimness; **0 of the 1973
  micro-stalls are menus** (they sit in continuous gameplay; 59 micro-runs land inside menu
  windows and were re-attributed).
- §4's per-sample table is void as “gameplay ratio” evidence (two rows sampled frozen menus; the
  rest spanned menus without knowing it). The aggregate 0.67× is coincidentally the correct
  raw game-clock/wall ratio but must now be read as (0.73 playing × 91% menu-excluded).
- §5 (pill ~constant) survives and is strengthened: 111 readings below.

## C5. Full fps-pill distribution (111 samples, fact)
Min **59.1** (t=356, right after the big pause), max **60.9** (t=112 and t=364 — the counter can
exceed 60). Bins: 59.1–59.5 ×6 · 59.6–59.9 ×20 · 60.0–60.4 ×82 · 60.5–60.9 ×3. It **never dips
below 59.1**, including across the densest stall clusters and while the game sat in menus for 15 s.
Dips do not correlate with play vs pause (menus actually hold a steady 60.0). H1 confirmed:
the overlay measures rAF cadence, not simulation progress.

## C6. Corrected verdict
- **H1 (counter imprecise) — CONFIRMED, strengthened** (fact: 111/111 pill readings ≈60 while the
  game clock lost 33% of wall time, and the pill reads a flat 60.0 through a 15 s frozen screen).
- **H2 (micro-stutter) — CONFIRMED, with the picture decomposed.** The user's correction is
  real but partial: sustained pauses/menus exist (~40 s, incl. one ~15 s manual pause and thirteen
  level-up menus) and explain ~27% of the clock lag; the remaining ~73% is genuine in-gameplay
  frame-freezing (≈1917 sub-0.3 s holds totalling ~95 s, spread evenly ~180–400 per 60 s window,
  denser late). “Felt laggy at times” = the micro-freezes; the sampled ratio looked like uniform
  slow-motion only because the sampling averaged menus and stalls together.
- Per `docs/fps-counter-microstutter-research-2026-10-23.md` A4/C3 (inference, not settled by
  this video): some of the micro-freezes may be *designed* hit-stop (`hitStopKill = 0.05 s`,
  re-armed per kill; 1727 kills + hurts ≈ the 100 s of lost play-time). In-game measurements
  (frame-time log + sim-time vs wall-time counter) are still required to separate designed
  dilation from real jank.
- Follow-up §8 stands unchanged.
