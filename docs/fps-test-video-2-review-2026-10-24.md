# FPS-test video 2 review — honest-overlay build — 2026-10-24

File reviewed (user-owned, untouched): `docs/videos/2026-10-23 1449 Qwen-Survivors FPS Test 2.mp4`.
**Filename date note (fact):** the name prefix says 2026-10-23 14:49, but the file mtime is **2026-10-24 07:09** — the real recording session (matches the on-screen phone clock 11:43→11:51 on 10-24 per the recorder UTC metadata). 2026-10-24 verified as today's date before this review. All findings concern the **published `669fee7`+record-sync build with the `?fps=1` v2 three-line overlay** (the phone visited `theycallmehenry.github.io/Qwen-Survivors/` with `?fps=1` — overlay present in every frame).

Method + prior baseline: per `docs/fps-test-video-review-2026-10-23.md` §C0 (full coverage, in-image labels) and `docs/fps-counter-microstutter-research-2026-10-23.md` §E3 (what v2 emits: per-1 s windows, identity `wall = advanced + intended + lost + idle + accDrift`).

## 1. Metadata (FACT — `video_info` + `ffmpeg -i`)

- 465.059 s, 1080×2340, H.264, **48,021 frames, variable frame rate, avg 103.26 fps** (90k timebase; Samsung Android-16 screen recorder, `com.android.version: 16`).
- Per-frame dt clusters: ~8 ms (25.7k frames = 120 Hz stretches), ~9–10 ms (12k), ~17 ms (3.5k = 60 Hz stretches) → the device display ran **adaptive 60–120 Hz** and the recorder tracked it (INFERENCE from the dt clusters + overlay rAF counts, both consistent).
- Game canvas shown by the overlay: **617×1053 px** (phone, CSS viewport × capped DPR 1.5 — `CFG.perf.dprCapMobile`; device model unverifiable from the recording).
- vs video 1: 442.4 s, 960×1032, 30.0 fps CFR, desktop canvas 958×916 → **different device class**; absolute cross-video comparisons are device confounded (§7).

## 2. What the video contains (FACT)

One continuous **ENDLESS** run (count-up game clock 0:00→5:02 visible; no durations/victory screen): recording starts on the main menu (Start Game tapped ≈ t 0.5–1.5, run live by t=4.007 at clock ≈0:03), 18 level-up menus sampled-hit across the run, and the recording ends **inside the 19th level-up menu at 465.06 s** (Twin Fangs Lv5 / Celerity Boots / Moonbolt Wand Lv5 cards up; last overlay update at t≈464.6). Score ≈48k, gems ≈120, level ≈49 at the end. No manual PAUSE detected. No game-over screen.

## 3. Method (reproducible)

1. Tooling as in video 1: `unsloth-tmp/ff/` + `npm i ffmpeg-static` (install survived from the prior session; binary 6.1.1-essentials).
2. **Full coverage, exact PTS:** `ffmpeg -i IN -vf "select='isnan(prev_selected_t)+gte(t-prev_selected_t,4)',crop=1080:250:0:233,scale=1620:375,drawtext=text='CELL PTS %{pts\:hms}':x=4:y=6:…,tile=1x3" -fps_mode passthrough unsloth-tmp/vid2frames/sheet-%02d.png` → 117 frames / 39 contact sheets. VFR (103 fps avg) makes the video-1 `mod(n,120)` step invalid → time-based select; **the true frame PTS is burned into every cell** (label above the overlay band = browser-chrome strip, cannot cover any readout line).
3. **All 117 cells viewed and transcribed** (three overlay lines + clock + state): scratch `unsloth-tmp/vid2frames/overlay_fixed.tsv`. First pass revealed **a label↔cell misattribution from t≈104 onward** (cells were being bound to the previous sheet's tail label); regenerated with the top-strip labels, re-verified, and repaired the table (+4.0 s uniform shift + the one omitted row at 104.0) before any arithmetic. The corrected tail assignment (last cell = PTS 464.596 = the `0.467x / int 0.53` overlay frozen on screen in the recording's final frames) independently confirms the repair.
4. **Independent clock channel:** `read_values` (region 455,280,230,85; every 4 s, two calls) auto-read the count-up HUD clock at 115 timepoints — the game clock across the whole run (values ±1–2 s; digits render *under* the overlay text).
5. **Numeric frame-diff pass** (video-1 §2 method, corrected syntax for ffmpeg 6: `tblend=all_mode=difference,signalstats,metadata=mode=print:key=lavfi.signalstats.YAVG`): full frame (48,020 YAVG values) and game-field-cropped re-run (`crop=580:600:60:700`). Parser + stats scripts: `unsloth-tmp/vid2frames/parse.mjs`, `stats2.mjs`.

## 4. Timeline + full-coverage table (FACT = per-cell reads; grid = 117 one-second overlay windows every 4.0 s, 25% wall coverage)

Ratio column = overlay `sim/wall`; decomposition = its own `adv / intended / lost / idle` per window; **all 117 windows: `lost 0s`, |idle| ≤ 0.02 s**. Stable playing stretches are condensed (never skipping a state boundary); p50/p95/p99 per-window in the TSV.

| t | state | frames/s | p50/p95/p99 ms | ratio | adv / intended (mean, range) |
|---|---|---|---|---|---|
| 0.0 | main menu | 60 | 16.6/16.7/16.8 | 1.000x | 1.00 / 0.00 |
| 4.0–36.0 | P×9 | 62–140 | 8.4–16.6/16.6–16.7/≤33.3 | avg 0.968 | 0.97 (0.90–1.02) / 0.04 |
| 40.0 | LEVELUP | 60 | 8.4/16.7/16.8 | **1.000x** | 1.00 / 0.00 (menu ⇒ loop still steps, see §8) |
| 44.0–76.1 | P×9 | 87–115 | ≤16.7/≤16.7/≤16.8 | avg 0.947 | 0.95 / 0.05 |
| 80.1, 92.2, 96.2 | LEVELUP×3 | 70–94 | ≤16.7 | 0.90/0.90/1.00x | straddled-menu windows |
| 84.1–88.1 | P×2 | 85,99 | ≤16.7 | 0.87–0.92 | dense kills → int 0.09–0.13 |
| 100.2–108.0 | P×3 | 108–118 | ≤16.7 | avg 0.794 | 0.79 / 0.21 |
| 112.0 | LEVELUP | 60 | 8.4/16.7/16.8 | 1.000x | 1.00 / 0.00 |
| 116.0–120.0 | P×2 | 101,110 | ≤16.7 | 0.85–0.92 | / 0.09–0.15 |
| 124.0, 128.0 | LEVELUP×2 | 68–89 | ≤16.8 | 0.95/1.00x | menu windows |
| 132.0 | P | 97 | ≤16.7 | 0.883 | / 0.10 |
| 136.0 | LEVELUP | 76 | ≤16.7 | 1.001x | 1.00 / 0.00 |
| 140.0 | P | 112 | ≤16.7 | 0.883 | / 0.10 |
| 144.0 | LEVELUP | 64 | 8.4/16.7/16.8 | 1.000x | 1.00 / 0.00 |
| 148.0–152.0 | P×2 | 96,99 | ≤16.7 | 0.82–0.90 | / 0.10–0.20 |
| 156.0 | LEVELUP | 92 | ≤16.7 | 0.951x | menu straddle |
| 160.0–164.0 | P×2 | 99,102 | ≤16.7 | 0.85–0.87 | / 0.14–0.15 |
| 168.0 | LEVELUP | 104 | ≤16.7 | 0.900x | menu straddle |
| 172.0–240.0 | P×18 | 60–115 | ≤16.8 | avg 0.865 | 0.87 (0.73–1.02) / 0.13 |
| 244.0 | LEVELUP | 88 | ≤16.7 | 0.950x | menu straddle |
| 248.0–256.0 | P×3 | 74–94 | ≤16.7 | avg 0.851 | / 0.14 |
| 260.0 | LEVELUP | 111 | ≤16.7 | 0.749x | menu straddle |
| 264.0–296.0 | P×9 | 61–105 | ≤16.8 | avg 0.796 | / 0.20 (int to 0.38) |
| 300.0 | LEVELUP | 108 | ≤16.7 | 0.900x | menu straddle |
| 304.0–340.0 | P×10 | 74–117 | ≤16.7 | avg 0.780 | / 0.22 (int to 0.34) |
| 344.0, 348.0 | LEVELUP×2 | 85,86 | ≤16.7 | 0.88/0.75x | menu |
| 352.0–384.0 | P×9 | 60–117 | ≤16.7 | avg 0.727 | / 0.27 (int to 0.42) |
| 388.0 | LEVELUP | 111 | ≤16.7 | 0.715x | menu straddle |
| 392.0 | P | 103 | ≤16.7 | 0.717 | / 0.28 |
| 396.0 | LEVELUP | 59 | ≤16.7 | 0.750x | menu |
| 400.0–436.0 | P×10 | 49–114 | p95 to 33.4, p99 to 58.2 | avg 0.702 | / 0.30 (int to 0.48); jank tail 408–420 |
| 440.0 | LEVELUP | 82 | ≤16.8 | 0.563x | menu straddle (int 0.44 in-window before open) |
| 444.0 | P | 100 | ≤16.8 | 0.800 | / 0.20 |
| 448.0 | LEVELUP | 60 | p99 24.9 | 0.799x | menu; LoAF max 60 ms this window |
| 452.0–456.0 | LEVELUP×2 | 89–107 | p99 to 24.9 | 0.58–0.60x | final menu sequence |
| 460.0 | P | 100 | ≤16.7 | 0.549 | / 0.46 |
| 464.0 | P | 60 | ≤16.7 | **0.467** | 0.47 / **0.53** (heaviest hit-stop; recorded as the run ends in a menu) |

## 5. HEADLINE — the split (this is what video 1 left unmeasured)

**Overlay decomposition (FACT over the 117 sampled windows; per playing second):**
- 94 sampled playing seconds: Σadvanced = 77.8 s, Σintended = 16.4 s, **Σlost-to-overload = 0.00 s (every single window)**, Σidle = −0.14 s (max +0.02 — pure window-boundary rounding, no display stall).
- Of the playing-time sim deficit, **≈100% is intended (hit-stop/timescale)**: 16.4 s measured "intended" vs 16.2 s total deficit (the 100.9% overshoot = unshown `accDrift` + display rounding — call it ≥100% intended, 0% lost).
- Per-playing-second means: advanced 0.827, intended 0.174. Intended density **rises with kill density late run**: phase mean int 0.072 (0–120 s) → 0.208 (240–360) → 0.303 (360–465), max 0.53 s in the final sampled window. Advanced falls in step: 0.93 → 0.87 → 0.79 → 0.70.

**Run-level reconstruction (INFERENCE: grid sampling is unbiased for time share; 23/117 windows are menu-classified):**
- Menu/pause wall ≈ 19.7% × 465 s ≈ **91 s**; playing wall ≈ **374 s**.
- Game clock consumed (read_values, FACT): 0:00→5:02 = **302 s** by t=464.
- **True playing ratio ≈ 302/374 ≈ 0.81×** (vs 0.73× on video 1's desktop — see §7). Raw sim/wall overall 302/465 ≈ 0.65.
- Total wall deficit = 465 − 302 = 163 s ≈ **91 s menus/pause (clock by design stopped for choices) + ≈65 s hit-stop (design) + 0 s overload + ≈6 s sampling noise**. (FACT components: clock + zero lost; split of menu vs playing is the grid-share inference.)

**Cross-check (clock/frame-diff vs overlay-decomposition): they AGREE end-to-end.** Overlay predicts 302 s of game clock from sampled playing windows: 0.827×374 = 309 s vs measured 302 → within 2%. Locally the channels disagree up to ~±0.13 on individual 60–70 s spans (the clock channel reads digits rendered *under* the overlay text, ±1–2 s per sample; cleanest no-menu span t=4–36 measures 0.875 vs overlay-sample 0.968 — within that noise floor). Direction and magnitude of the headline (ratio ~0.8, loss = hit-stop, none = overload) are confirmed by both. The frame-diff numeric pass (§6) adds: **zero screen-static runs ≥ 0.5 s anywhere in the video** — i.e. no unexplained multi-frame game stalls beyond hit-stop granularity at 103 fps capture resolution.

## 6. Numeric tblend/signalstats pass (FACT, but weak channel on this recording)

- Full-frame YAVG pass (48,020 frames): only 111 held-runs ≥ 2 frames, 10.8 s total, all < 0.5 s; **no ≥0.5 s run exists** — menus never appear static because the DOM level-up cards + status-bar REC pill + 1 Hz overlay text animate through the noise floor; a field-crop re-run (580×600 px game area, no DOM) still found 0 static ≥0.5 s (the level-up cards are translucent and the menu DOM glows animate; recorder H.264 re-encode noise on truly static frames sits at YAVG ≈ 0.001–0.02, above any safe eps). Micro-holds (0.01–0.05 s, matching 0.05 s hit-stop granularity at this capture rate): 286 runs / 5.0 s — a heavy undercount of the true hit-stop population (~1.3k implied by §5) for exactly that noise reason.
- Lesson recorded: with a >60 fps VFR phone recorder + DOM elements on screen, the frame-diff pass can *bound* (no ≥0.5 s unexplained stall) but not *count* hit-stops. The v2 overlay is the finer instrument (its own p99/LoAF run at the device's true cadence).

## 7. Frame-time + LoAF (device truth, FACT from overlay readings)

- Typical window: p95 = 16.7, p99 = 16.7–16.8 ms; p50 (where the line was on-screen) = 8.4 ms in 120 Hz phases, 16.6 in 60 Hz phases; overlay rAF frames/s 49–140 (mean 94). Median across sampled windows: p95 16.7, p99 16.7.
- Worst windows: t≈408 (49 f/s, p95 33.4, p99 **58.2**, **LoAF max 61 ms**), 412 (p99 41.6), 416 (p99 49.9), 420 (p99 25.0), 448/456 (p99 24.9, **LoAF max 60 ms**). Even there `lost = 0` (all frame times under the 100 ms clamp). LoAF line nonzero in only ~3 of 117 windows; the per-window *counts* were clipped off the device viewport (line width > screen) — unverifiable.
- Interpretation (INFERENCE): a CPU-side spike around the heaviest late-run moment (t≈408, the window before the 440 level-up: densest kills, biggest particle load) reaches ~60 ms frames — visible tail, but costless to sim time.

## 8. Is the sim clock honest now? YES (FACT within ±2%)

- Per-window identity closes: adv + int + idle + lost ≈ wall ≈ 1.0 s in all 117 windows (the ±0.01–0.06 windows are interval-timer jitter: `wall` can reach 1.02–1.06 — several windows show `adv 1.02s` with ratio <1).
- During PLAYING, overlay `advanced` ≈ in-game clock progress (0.827 sampled vs 0.808 clock-derived; end-to-end 309 vs 302). The old v1 blindness is gone.
- **Readout-semantics caveat (FACT, open item — rule 15):** during LEVELUP/PAUSED the loop keeps running with `timescale=1`, and `advanced` counts those steps — menu windows display `sim/wall 1x — adv 1s` (e.g. t=40/112/128/144 windows show 1.000x with cards on screen). The v2 ratio is loop-sim truth, not game-clock truth, during menus; a reader (or future automated gate) can mistake a menu window for full-speed gameplay. Suggested (NOT implemented, rule 18): a 4th decomposition term "menu" or gating `advanced` on state.

## 9. vs video 1 (comparison; caveat: different devices)

| metric | video 1 (desktop, 30 fps CFR capture) | video 2 (this phone, ~103 fps VFR) |
|---|---|---|
| raw clock/wall | 0.67 | 0.65 |
| menu/pause wall | ≈40 s / 442 (9%) | ≈91 s / 465 (20%) — more level-ups at cap, longer deliberation |
| playing ratio | ≈0.73 | ≈0.81 |
| "lost" to overload | ≈100 s of unexplained micro-freezes (inference at the time) | **0 s (measured)** |
| counter | v1 pill ~60.0 flat | v2 decomposed; identity closes; honest during PLAYING |

The 0.73→0.81 number is **not a measured build improvement** (different hardware, different run composition, ENDLESS vs 5:00 late-run). What IS established: on this phone the video-1 mystery ("~100 s of genuine in-gameplay frame freezing") has an explained mechanism on the current build — designed hit-stop (measured 65 s/run here, density rising late) plus menu time; the 30 fps recorder had turned 60 Hz cadence into "duplicate frames" and the rest was hit-stop. No overload loss is left to explain.

## 10. Could NOT verify

- p50/p95/p99 and LoAF counts in windows where the overlay line exceeds the viewport width (device-side clipping — the line's left ~30 px are off-screen; readout CSS gap: `white-space:pre` lines can exceed the phone viewport).
- The exact clock channel at sub-4 s resolution; the 75% of wall time not covered by the 1 s sampled windows (uniform-sample inference only); device model/refresh ceiling; hit-stop event count; run-start time ±2 s.
- Whether the t≈408 jank has a script cause (LoAF top-script was not surfaced by the v2 readout — §E4 planned it, shipped readout only shows count/max).

## 11. Recommendation (data-driven; rule 18 — nothing changed)

1. **The felt-lag question is answered:** on this device the lag is 100% designed (menus + hit-stop), 0% overload. The only lever that changes *game speed* is the **hit-stop budget** (`CFG.combat.hitStopKill 0.05` re-armed per kill — late-run it costs up to ~30–50% of playing seconds). This is exactly the deferred user decision from the research doc's last section; the numbers to decide it now exist. If late run should feel faster: cap hit-stop re-arm density (e.g. max re-arms/s or decay during dense waves) — a feel change needing user sign-off.
2. Menu time (≈91 s of 465) is the biggest wall cost — also by design; no perf action.
3. Performance watch-list only: the single ~60 ms tail at t≈408 (LoAF 61 ms) — if it ever produces `lost > 0`, the lighting glow pass remains the known suspect (29.1 note), no action now.
4. Readout follow-up (optional): distinguish menu-steps in the v2 overlay (§8 caveat), surface LoAF top-scripts as planned in §E4.

Scratch kept (gitignored): `unsloth-tmp/vid2frames/` (39 labeled contact sheets `sheet-*.png`, full 117-row `overlay_fixed.tsv`, `yavg*.txt`, parsers/stats).
