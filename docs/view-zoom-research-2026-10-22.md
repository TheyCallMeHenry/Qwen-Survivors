# View-zoom — root cause + implementation plan (29.2 / 22.8; research-first per user directive; accessed 2026-10-22)

## Root cause (proven by code read this session, `js/core/game.js`)

Zoom is a camera-view factor: `_applyZoom()` grows the camera view rect to `canvas/zoom` and `render()` centers that rect on the canvas — but **no scale is ever applied** (`grep "scale(" js/core/game.js` → zero hits). World-space draws compose to `screen = cw/2 + (world − view.x)` regardless of zoom, so the canvas always shows the SAME `cw×ch` world window; the enlarged view's extra margin is drawn off-canvas and clipped. Result: "Full view" and "Zoomed out" are pixel-identical in the visible area — exactly the user's 2026-10-22 report. Collateral: the zoomed-out default (0.80 on touch) also widens the entity/decor/pickup CULL rect by 1/0.8² ≈ 1.56×, so mobile pays ~56% more cull/draw work for zero visible benefit.

Why gates missed it: the 13.8 boot E2E asserts the VIEW RECT sizes (`view 1600×1000`), not visible pixels — Node stub-DOM has no rasterization (ENV standing caveat: browser-only behavior is otherwise unverified here). The 22.8 lighting-canvas-stretch theory was a red herring for "not functioning at all".

## Fix (smallest correct diff, matches existing transform pattern)

In `render()` replace the centering translate + inner world translate composition with the standard camera transform (inference until browser-verified):

- outer: `ctx.translate(cw/2, ch/2); ctx.scale(zoom, zoom)` — world unit → canvas px ratio becomes exactly `zoom`.
- inner: `ctx.translate(-view.x, -view.y)` — camera center lands at canvas center.
- Check: world point at view edge (`view.x ± vw/2`) maps to canvas edge exactly (vw·zoom = cw). ✓

Everything between the saves (background, world space, snow/lighting/vignette handling) keeps its current composition; vignette + minimap stay 1× (outside the transform) per D48. Lighting half-res buffer sized to the view now genuinely covers the canvas because the scale maps vw→cw (fixes the 22.8 stretch concern as a side effect).

## Verification plan (device-proof this time)

1. test-boot: assert the composed transform maps known world points to expected canvas points (ctx stub can validate `scale`/`translate` composition — extend the stub to record transforms).
2. REAL browser via Playwright (skill installed; used for Phase 28): load `serve.mjs` page, fixed seed, run ~5 s, screenshot at zoom 1.0 vs 0.80 — more world must be visibly in frame at 0.80. Screenshots are the human-verifiable proof the Node harness can never give.

## Perf budget note (Phase 25 discipline)

At 0.80 the cull+draw counts legitimately rise ~1.56× (that IS the feature). `CFG.perf` caps are count-based (aliveCap/particleCap), not area-based — post-fix bench must show `[10.4-bench]` render stays within budget at zoom 0.80 (currently the bench runs at zoom 1.0; add a zoomed bench row — this also closes the logged "P21-heavy/zoomed bench row" gap).

## 22.8 verdict

Device repro no longer needed: the defect is proven in-tree (code above), device-independent. 22.8 closes when the fix + browser screenshot land.
