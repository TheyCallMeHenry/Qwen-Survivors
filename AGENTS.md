# AGENTS.md — QWEN SURVivors project rules

Applies to every agent session in this repo. Overrides personal defaults where stricter.

## Non-negotiables

1. **`docs/PROGRESS.md` is the law.** A task/step/phase is NOT complete until its checkbox is ticked in `docs/PROGRESS.md` with a date + one-line note. Update it *before* declaring anything done. Zero exceptions.
2. **No external assets, ever.** All art/audio stays procedural in `js/art` and `js/audio`. No image files, no audio files, no CDN, no npm dependencies, no build step.
3. **ES6 modules** for all `js/` code. Top level of every module must be side-effect-free (imports + definitions only) so `tools/check.mjs` can import it in Node.
4. **Ports:** only **47893** (tools/serve.mjs). Never 8000 or other common ports.
5. **Tuning lives in `js/config.js`.** Don't scatter magic numbers; add to config.
6. **Mobile parity is a requirement**, not polish: touch targets ≥ 72 px, safe-area insets, pause-on-blur, gesture audio unlock.
7. **No git commits unless the user explicitly asks.**

## Commands

- Syntax/import validation: `node tools/check.mjs`
- Logic tests: `node tools/test-logic.mjs`
- Boot + full-run simulation (third gate): `node tools/test-boot.mjs`
- Serve (user-facing): `node tools/serve.mjs` → http://<LAN-IP>:47893

## Architecture quick map

See `docs/PLAN.md` §3 (module map + frame pipeline). Key invariants:

- Render order: sky/parallax → ground → pickups → Y-sorted (entities+decor) → projectiles → particles → lighting → foreground snow/vignette → HUD.
- Fixed 60 Hz update step; render every rAF; `timescale` + hit-stop in `core/loop.js`.
- Entities drawn via pre-rendered offscreen canvases only (no per-frame path art).
- Lighting = half-res darkness canvas, `destination-out` holes, additive glow pass.
- Enemy query structure = spatial hash grid in `entities/combat.js`/`enemies.js`.

## Style

- Small files, one responsibility. No frameworks. `const`/`let` only, arrow fns, template strings.
- Comments only for non-obvious intent. Match existing style per file.
- Canvas math in CSS pixels; DPR applied once at canvas setup.
