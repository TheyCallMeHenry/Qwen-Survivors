# QWEN SURVIVORS — Project Plan / Roadmap

**Type:** Vampire-Survivors-style top-down survival arena, 2D canvas with 2.5D visual illusion.
**Stack:** Vanilla ES6 modules + Canvas 2D + Web Audio API. **No build step. No external assets. No dependencies.** All art, terrain, characters, SFX and music are procedurally generated at runtime.

> **LIVING DOCUMENTS:** this file is the *plan*. `docs/PROGRESS.md` is the *living* progress tracker — it MUST be updated before any task is considered complete. See `AGENTS.md` for session rules.

---

## 1. Vision & Pillars

A 5-minute survival run in a procedurally generated "Evernight Wood": dusk sky, snow-capped mountains, dense pine forests, a ruined village, a frozen lake, monoliths and campfires. The player auto-attacks swarming enemies, collects XP, levels up from card choices, dashes with i-frames, and tries to survive until dawn.

Pillars:
1. **Feel** — snappy, responsive movement (high accel, low drift), dash with real i-frames, hit-stop, screen shake, particles.
2. **2.5D illusion** — Y-depth sorting, cast shadows, directional moonlight rim-lighting, parallax sky/mountains, volumetric-ish light/darkness pass, bobbing pickups, drifting clouds and snow.
3. **Zero assets** — every sprite, tile, SFX and musical note is generated from code (seeded RNG for world layouts).
4. **Mobile-first parity** — touch joystick + dash button ≥ 72px targets, safe-area insets, DPR-aware scaling, pause-on-blur, audio unlock on first gesture.
5. **Performance** — pre-rendered sprites (drawImage only), object pools, spatial hash grid, viewport culling, half-res lighting canvas.

## 2. Non-Goals

No build tooling, no npm deps, no network calls, no save files beyond `localStorage` (high scores, mute, seed history), no multi-locale i18n, no multiplayer.

## 3. Architecture

### 3.1 Module map (all ESM, side-effect-free top levels)

```
index.html            — canvas layers, HUD DOM, screens, touch UI, <script type="module">
css/main.css          — layout, HUD, screens, touch controls, responsive + safe-area rules
js/main.js            — bootstrap: canvas, world gen, state machine start
js/config.js          — all tuning constants (single source of truth)
js/utils/math.js      — RNG (mulberry32), vec/clamp/lerp/damp, angles
js/utils/bus.js       — tiny event emitter (UI ↔ game decoupling)
js/utils/grid.js      — uniform spatial hash (pure/Node-safe; World collider grid + enemy queries)
js/core/loop.js       — fixed-step update (60 Hz) + variable render, timescale, hit-stop
js/core/input.js      — keyboard + pointer/touch → unified axes, dash, pause, floating joystick
js/core/game.js       — state machine (MENU/PLAYING/LEVELUP/PAUSED/DYING/GAMEOVER), scoring, run setup
js/art/base.js        — offscreen canvas helpers, gradient/shade/shadow/glow primitives
js/art/sky.js         — sky gradient, stars, moon, cloud sprites, distant ridge silhouettes
js/art/terrain.js     — grass tiles, ground decals, pines, boulders, stumps, huts, lake, monoliths, campfires
js/art/characters.js  — player + 7 enemy type sprites (multi-frame, flash variants, shadows)
js/art/items.js       — gems, hearts, projectiles, weapon/passive card icons
js/world/generate.js  — seeded world layout: landmarks, forests, village, lake, decor, colliders, decals
js/world/world.js     — world state + draw: sky/parallax, ground, decals, lighting pass, vignette
js/world/minimap.js   — pre-rendered map base + live dots/camera rect
js/systems/camera.js  — smoothed follow, look-ahead, trauma shake
js/systems/lighting.js— darkness canvas w/ punched light holes + additive glow pass
js/entities/player.js — movement physics, dash/i-frames, weapon logic, damage
js/entities/enemies.js— enemy types, AI (chase/separate/steer), cultist shots, boss
js/entities/spawner.js— time-based wave scaling (pure functions, unit-tested)
js/entities/combat.js — projectiles, garlic aura, orbiters, damage/knockback/kill pipeline
js/entities/pickups.js— gem/heart pools, magnet, collection
js/entities/particles.js — pooled particles (sparks, souls, snow, embers, trails, texts)
js/ui/hud.js          — HP/XP bars, timer, score, minimap frame, mute/pause buttons
js/ui/screens.js      — menu, high scores, pause, level-up cards, game over, banners
js/audio/sfx.js       — Web Audio synthesized SFX (lazy AudioContext, panning, distance)
js/audio/music.js     — procedural music loop + wind ambience + ambient wolf howls
tools/serve.mjs       — zero-dependency Node static server (obscure port, 0.0.0.0)
tools/check.mjs       — imports every js module in Node (syntax + top-level validation)
tools/test-logic.mjs  — Node assertions for pure logic (RNG, spawner curves, XP curve, grid)
tools/test-boot.mjs   — Node boot + full-run simulation (stubbed DOM w/ browser-strict canvas checks — `arc`/`ellipse` arg counts + non-negative radii, gradients throw; all other canvas methods no-op — real Loop; death + victory runs)
```

### 3.2 Frame pipeline (render order)

1. Sky (screen space, parallax 0.02–0.22): gradient → stars → moon → cloud bands → ridge silhouettes.
2. World pass (camera transform): ground tiles → soft tint patches → ground decals → lakes → pickups (bobbing).
3. Y-sorted list: player + enemies + standing decor (trees/huts/rocks/monoliths/campfires) by base-Y.
4. Projectiles → particles → floating damage text.
5. Lighting: half-res darkness canvas, `destination-out` radial holes per light, drawn over world; additive glow sprites on top.
6. Foreground: drifting snow (parallax 1.25) + pre-rendered vignette.
7. Minimap canvas (separate element): pre-rendered base + live dots + camera frustum.
8. HUD DOM (transform-based bars; text only on change).

### 3.3 Movement feel model

`vel += (targetVel − vel) · (1 − e^(−λ·dt))`, λ≈14 → ~90% convergence in 170 ms: fast to start, fast to stop ("not slippery"). Dash: 0.18 s at 690 px/s, i-frames = dash + 0.06 s, cooldown 1.75 s, ghost trail + whoosh + camera nudge.

### 3.4 Combat model

- **Weapons (pick/upgrade via level-up cards):** Moonbolt Wand (auto-fire bolts at nearest enemy), Wraith Garlic (aura tick), Spectral Axe (boomerang arc), Aegis Blades (orbiters). Each 5 levels with explicit stat tables in `config.js`.
- **Passives:** speed, max-HP, damage %, pickup magnet, regen (max levels in config).
- **Enemies:** Rat, Bat (flying, sine weave), Goblin, Wolf, Brute, Cultist (ranged orb), Wraith Boss (4:00). Time-scaled spawn interval/count/cap/type weights (pure functions in `spawner.js`).
- **Economy:** kill → XP gems (+heart chance); gem magnet radius; level curve linear; level-up pauses game and offers 3 cards (keyboard 1-3 / tap).
- **Victory:** survive 5:00 → "DAWN BREAKS" bonus. **Defeat:** HP 0 → slow-mo death → game over + high scores.

### 3.5 Collision

Uniform-grid spatial hash (`js/utils/grid.js` HashGrid; cell 96 px) over enemies — same class backs the World collider grid (cell 256 px). Circle push-out for player/enemies vs static colliders (trees, huts, boulders, lake ellipses via unit-space push-out). Projectile/orb/garlic hits via grid queries + per-target hit cooldowns.

### 3.6 Audio (all synthesized)

Lazy `AudioContext` (created/resumed on first user gesture — required for mobile). Buses: SFX / music / ambience → compressor → master. SFX = osc + filtered noise + envelope recipes per event, distance-attenuated, stereo-panned by world X. Music = 92 BPM D-minor: sub-bass pattern, detuned-saw pads through slow LFO lowpass, sparse delay-fed plucks; scheduler with 0.12 s lookahead. Ambience = looped wind (filtered noise + LFO) + scheduled ambient wolf howls (vibrato saw + breath noise, panned).

### 3.7 High scores

`localStorage` key `qsurv.hiscores.v1` — top 10 `{score, time, kills, level, date}`. Mute in `qsurv.mute`.

## 4. Phases & Tasks

### Phase 0 — Scaffold & Docs *(done first, always)*
- [x] Directory tree per §3.1
- [x] `package.json` (`"type":"module"`, scripts: check/test/serve)
- [x] `docs/PLAN.md` (this file)
- [x] `docs/PROGRESS.md` (living tracker, task granularity = this list)
- [x] `README.md`, `AGENTS.md`
- **Accept:** all docs exist; PROGRESS.md has a row per task below.

### Phase 1 — Core engine
- [x] `index.html` skeleton (canvases, HUD, screens, viewport meta, module entry)
- [x] `css/main.css` skeleton (reset, layout, HUD, touch UI, safe areas)
- [x] `config.js`, `utils/math.js`, `utils/bus.js` (+ `utils/grid.js` added in Phase 3)
- [x] `core/loop.js` (fixed step, timescale, hit-stop)
- [x] `core/input.js` (keys, mouse-drag & touch floating joystick, dash, pause, mute, touch action handling)
- **Accept:** loop runs a clock; input produces axes/dash events in a node-free browser; `tools/check.mjs` passes.

### Phase 2 — Procedural art & world
- [x] `art/base.js` primitives
- [x] `art/sky.js`, `art/terrain.js`, `art/characters.js`, `art/items.js`
- [x] `world/generate.js` (seeded layout + colliders + decals)
- [x] `world/world.js` (full draw pipeline incl. lighting pass)
- [x] `world/minimap.js`
- **Accept:** a generated world renders (menu idle camera drift); all sprites pre-rendered; minimap base matches world layout.

### Phase 3 — Entities & gameplay
- [x] `entities/player.js` (physics, dash/i-frames, weapons, damage)
- [x] `entities/enemies.js`, `spawner.js` (pure curves), `combat.js`, `pickups.js`, `particles.js`
- [x] `systems/camera.js`, `systems/lighting.js`
- [x] `core/game.js` state machine + scoring + victory/death
- **Accept:** full playable loop: spawn → fight → XP → cards → boss → victory/death; `tools/test-logic.mjs` green.

### Phase 4 — UI/HUD
- [x] `ui/hud.js` (bars, timer, score, minimap frame)
- [x] `ui/screens.js` (menu w/ Start/High Scores/Quit, scores, pause, level-up cards, game over, banners)
- [x] Final `css/main.css` (responsive clamp() sizing, safe-area insets, touch sizes ≥72 px, animations)
- [x] Full `index.html` wiring
- **Accept:** every screen reachable & dismissible by mouse, keyboard AND touch; Quit attempts `window.close()` with fallback notice.

### Phase 5 — Audio
- [x] `audio/sfx.js` (all event SFX + howl synth)
- [x] `audio/music.js` (music loop + wind + howl scheduler, mute, pause)
- **Accept:** gesture unlock works; mute persists; no audio before first gesture (no autoplay warnings).

### Phase 6 — Integration, validation, launch
- [x] `main.js` bootstrap + menu idle world
- [x] `tools/serve.mjs` (obscure port **47893**, bind 0.0.0.0, correct MIME)
- [x] `tools/check.mjs` all modules import clean in Node
- [x] `tools/test-logic.mjs` assertions green
- [x] Serve + HTTP 200 + correct content-type verification
- [x] Mobile audit pass (targets, insets, DPR cap, blur-pause, orientation/resize)
- [x] PROGRESS.md final state + handoff summary
- **Accept:** game served at LAN-reachable URL; all checklists in PROGRESS.md ticked.

## 5. Risk Register

| Risk | Mitigation |
| --- | --- |
| Canvas perf on mobile | DPR cap (≤1.5 coarse), pooled particles, culling, half-res lighting, pre-rendered sprites only |
| Audio autoplay blocked | Lazy context on first gesture; all calls no-op until running |
| Module MIME on serve | Custom server with explicit MIME map (`text/javascript` for .js) |
| Sandbox → user browser reachability | Bind 0.0.0.0, expose LAN IP URL; obscure port 47893 |
| Scope creep / drift | Phases above; PROGRESS.md enforced; config centralizes tuning |
| Unverified visuals (no browser in sandbox) | Node import checks + logic tests + curl MIME checks; user playtest pass listed in PROGRESS.md |

## 6. Definition of Done

All phases accepted; PROGRESS.md fully ticked; game playable end-to-end on desktop (keyboard+mouse) and mobile (touch) via the served URL; zero runtime console errors in the paths we can execute; no assets downloaded; no ports other than 47893 used.
