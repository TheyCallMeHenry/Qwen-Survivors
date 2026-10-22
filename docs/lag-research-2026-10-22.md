# 29.1 Early-run lag — real-browser profile (2026-10-22)

Task: user reports heavy lag even early in a run, equipment-independent. Node sim already proven
clean; per Phase-25 discipline, evidence first. All numbers below captured this session on
2026-10-22 via `node tools/serve.mjs` (port 47893) + the `agent-browser` CLI (Chromium) driving a
real early run. Profiler + raw per-window results: `unsloth-tmp/prof291.js`, `unsloth-tmp/t-*.txt`,
`unsloth-tmp/s-*.txt`, `unsloth-tmp/prof-*.txt`, `unsloth-tmp/t2-base.txt`, `unsloth-tmp/gpu-phone-fixed.txt`.

## Method

In-page instrumentation (no game-code changes for measurement): rAF inter-frame interval recorder;
prototype wrappers on `Game.update/render`, `World.drawBackground`, `Lighting.draw`, `Snow.draw`,
`Particles.draw`, `Combat.draw` (JS ms + call counts); a `CanvasRenderingContext2D`
drawImage/fillRect wrapper summing **destination pixel area per pass** (fill-cost proxy). Pass
counters reset per recording window (first battery of an earlier session was discarded — counters
leaked across windows; numbers here come only from clean windows). Ablations = runtime no-op of a
pass or CFG toggle (`starBands`, `tile`), never code edits.

Two regimes measured:
1. **Real GPU** (ANGLE, NVIDIA RTX 5070 — verified via `WEBGL_debug_renderer_info`) — what a strong machine does.
2. **Software raster** (`--disable-gpu`; Skia on CPU, WebGL absent) — a weak-device proxy: same
   canvas ops, no fill-rate headroom. Absolute times do not transfer to a phone GPU; **per-pass
   fill area and cost ranking** do.

## Measurements

### Real GPU — no config reproduces the lag on a desktop dGPU

| Scenario | Canvas backing | Frame interval med/p95/max (ms) |
|---|---|---|
| 1264×569 @dpr1 | 0.72 MP | 16.7 / 16.8 / 17.1 |
| 1920×1080 @dpr1 | 2.07 MP | 16.7 / 16.8 / 16.9 |
| Phone 402×874 @dpr3→cap2 | 804×1748 = 1.41 MP | 16.7 / 16.8 / 16.9 |
| 1920×1080 @dpr2 (retina) | 3840×2160 = 8.3 MP | 16.7 / 16.8 / 16.9 |

All solid 60 fps. So the pipeline only lags on devices whose GPU/CPU can't afford its fill load —
consistent with the report (lag on the user's phone/desktop-integrated, not on this box).

### Software raster @1920×1080 — per-pass cost attribution (clean battery)

Baseline (frame interval med 33.4 ms = 30 fps; main-thread JS 9.0 ms/frame, of which update 0.12,
HUD+sfx+music ≈0.2 → **draw-path dominates**):

| Pass | JS ms/frame | Destination MPx/frame | Blits/frame | share |
|---|---|---|---|---|
| background | 6.88 | **20.07** | 453 | 78% of draw JS |
| lighting | 1.59 | 5.89 | ~40 | 18% |
| vignette+minimap+entities+sprites (render − passes) | ~0.3 | 2.4 | ~120 | 3% |
| snow | 0.02 | ~0 | 90 sprites | ~0 |
| particles, combat | ~0 | ~0 | — | ~0 |

Total fill ≈ **28.4 MPx/frame at 1080p ≈ 14 full-screen equivalents** — constant from t=0,
identical regardless of equipment (it is sky/stars/tiles/lighting, not entities). That matches
"heavy even early, equipment-independent".

Sub-layer ablations (t-battery):
- `CFG.world.starBands 4→0`: background 6.88→0.69 ms; background fill 20.07→11.77 MPx (−8.3 =
  exactly 4 × full-viewport). **The 4 star-band blits = ~90% of drawBackground's cost, ~70% of all
  draw JS.** Root: each band is a full `vw×vh` transparent canvas composited every frame for 1–3 px
  dots that only exist above the horizon.
- Lighting off: frame med 33.4→16.8 (only ablation that flipped the SW frame rate; lighting's
  half-res darkness + full-res blit + large additive glows sit right at the frame-budget edge).
- Snow / vignette / minimap / particles off: no frame-time change. Tile-size 256→1024: minor.

## Root cause (named)

Early-run lag = **constant full-screen overdraw, dominated by the star-band pass** (4 full-viewport
alpha blits/frame in `World.drawBackground`), on top of an already ~14-screen fill budget. Strong
dGPUs hide it; fill-rate-limited devices (phones, integrated GPUs) miss frames from the first
second. Ruled out this session: Node-side sim, HUD/sfx/music JS (≈0.2 ms), snow/vignette/minimap/
particles/combat cost, entity count (equipment-independent per user + constant-cost passes measured).

## Fix shipped (world.js — pixel-identical)

Crop star bands to the star field: bake/draw `vw × starBandH(horizon, maxR)` instead of
`vw × vh` (`starBandH` = `ceil(horizon*0.9 + maxR)`; stars are placed at `s.y*horizon*0.9`,
so nothing is clipped; the band blit call already uses implicit size, so the crop cuts fill too).

Verified in the same browser battery:
- SW raster 1920×1080: background 6.88→0.65 ms, background fill 20.07→14.42 MPx; total draw JS
  8.78→2.76 ms/frame (−68%); total fill 28.4→23.0 MPx (−19%).
- Phone 402×874@2 real-GPU: still 60 fps; total fill 14.3→10.2 MPx (−29%).
- Visual identity: `unsloth-tmp/after-stars.png` — star field unchanged, no seams.

## ?fps=1 readout (for the user's device)

`Loop.frames` counts rAF ticks (display rate incl. hit-stop frames); `main.js` shows a fixed DOM
overlay when the URL has `?fps=1`: `NN.N fps · WxHpx` (also reveals the actual backing size/DPR on
the device). URL-gated, DOM-only, render pipeline untouched. Note: a CFG entry would live in
`config.js`, outside this task's write scope — the URL param is the gate.

## Open / next diagnostics

1. **Ask the user to run with `?fps=1` on the lagging device.** If it reports ~60 here but low
   there, the gap is purely device fill rate; the readout's WxH shows whether DPR capping is the
   biggest knob (`CFG.perf.dprCap*` — already 1.5 mobile / 2 desktop).
2. Next-largest reducible fill after the fix: lighting glow pass (~1.9–3.9 MPx: player glow is
   2×`CFG.lighting.playerR`×1.15 wide additive). If device still lags: draw glows into the half-res
   darkness buffer (or cap glow radius by device class) in `js/systems/lighting.js` — visual change,
   needs user sign-off.
3. SW-mode frame-rate did not improve past ablations (compositor-bound in software mode); treat
   fill-area + raster-ms deltas as the transferable metric, and device `?fps=1` as the ground truth.

## Gates (this session, after fix)

`check.mjs` **34/34** · `test-logic.mjs` **1039/1039** (9 new: band-crop invariant at 4 viewport
heights + bake/draw audits + Loop.frames counting incl. hit-stop + URL-gate audit) · `test-boot.mjs`
**PASS boot-sim runs=4** (first try; bench unchanged: update 0.259 ms/step, drawImage 801.4).

No external sources were load-bearing for this document; every claim above is from commands captured
this session (access/measure date 2026-10-22).
