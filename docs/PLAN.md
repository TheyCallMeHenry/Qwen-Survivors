# QWEN SURVIVORS — Project Plan / Roadmap

**Type:** Vampire-Survivors-style top-down survival arena, 2D canvas with 2.5D visual illusion.
**Stack:** Vanilla ES6 modules + Canvas 2D + Web Audio API. **No build step. No external assets. No dependencies.** All art, terrain, characters, SFX and music are procedurally generated at runtime.

> **LIVING DOCUMENTS:** this file is the *plan*. `docs/PROGRESS.md` is the *living* progress tracker — it MUST be updated before any task is considered complete. See `AGENTS.md` for session rules.

---

## 1. Vision & Pillars

A 5-minute survival run in a procedurally generated "Evernight Wood": dusk sky, snow-capped mountains, dense pine forests, a ruined village, a frozen lake, monoliths and campfires. The player auto-attacks swarming enemies, collects XP, levels up from card choices, dashes with i-frames, and tries to survive until dawn. Phase 11 extends this to real-time co-op (up to 4 players, LAN, synced game state) — see §3.8.

Pillars:
1. **Feel** — snappy, responsive movement (high accel, low drift), dash with real i-frames, hit-stop, screen shake, particles.
2. **2.5D illusion** — Y-depth sorting, cast shadows, directional moonlight rim-lighting, parallax sky/mountains, volumetric-ish light/darkness pass, bobbing pickups, drifting clouds and snow.
3. **Zero assets** — every sprite, tile, SFX and musical note is generated from code (seeded RNG for world layouts).
4. **Mobile-first parity** — touch joystick + dash button ≥ 72px targets, safe-area insets, DPR-aware scaling, pause-on-blur, audio unlock on first gesture.
5. **Performance** — pre-rendered sprites (drawImage only), object pools, spatial hash grid, viewport culling, half-res lighting canvas.

## 2. Non-Goals

No build tooling, no npm deps, no external services or CDNs — the only network is the LAN co-op WebSocket room served by `tools/serve.mjs` on port 47893 (Phase 11), no save files beyond `localStorage` (high scores, mute, seed history), no multi-locale i18n.

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
js/core/meta.js       — persistent Soulshards + between-run upgrades (pure/Node-safe, localStorage `qsurv.meta.v1`)
js/core/game.js       — state machine (MENU/PLAYING/LEVELUP/PAUSED/DYING/GAMEOVER), scoring, run setup
js/net/coop.js        — co-op sync protocol + room state (pure/Node-safe; WebSocket plumbing in serve.mjs) — Phase 11
js/art/base.js        — offscreen canvas helpers, gradient/shade/shadow/glow primitives
js/art/sky.js         — sky gradient, stars, moon, cloud sprites, distant ridge silhouettes
js/art/terrain.js     — grass tiles, ground decals, pines, boulders, stumps, huts, lake, monoliths, campfires
js/art/characters.js  — player (4 selectable characters — Phase 11) + 7 enemy type sprites (multi-frame, flash variants, shadows)
js/art/items.js       — gems, hearts, projectiles, weapon/passive card icons
js/world/generate.js  — seeded world layout: landmarks, forests, village, lake, decor, colliders, decals
js/world/world.js     — world state + draw: sky/parallax, ground, decals, lighting pass, vignette
js/world/minimap.js   — pre-rendered map base + live dots/camera rect
js/systems/camera.js  — smoothed follow, look-ahead, trauma shake
js/systems/lighting.js— darkness canvas w/ punched light holes + additive glow pass
js/entities/player.js — movement physics, dash/i-frames, weapon logic, damage
js/entities/enemies.js— enemy types, AI (chase/separate/steer), cultist shots, boss
js/entities/spawner.js— time-based wave scaling + spawn placement just outside the view edge (pure functions, unit-tested)
js/entities/combat.js — projectiles, garlic aura, orbiters, damage/knockback/kill pipeline
js/entities/pickups.js— gem/heart pools, magnet, collection
js/entities/particles.js — pooled particles (sparks, souls, snow, embers, trails, texts)
js/ui/hud.js          — HP/XP bars, timer, score, minimap frame, mute/pause buttons, dash ready/cooldown indicator (all environments)
js/ui/screens.js      — menu, high scores, pause, level-up cards, game over, banners
js/audio/sfx.js       — Web Audio synthesized SFX (lazy AudioContext, panning, distance)
js/audio/music.js     — procedural eldritch music loop (seamless, indefinite) + wind ambience + ambient wolf howls
tools/serve.mjs       — zero-dependency Node static server (obscure port, 0.0.0.0) + co-op WebSocket upgrade (Phase 11)
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

- **Weapons (pick/upgrade via level-up cards, 5 levels each):** Moonbolt Wand (auto-fire bolts at nearest enemy), Wraith Garlic (aura tick), Spectral Axe (boomerang arc), Aegis Blades (orbiters), Twin Fangs (twin pistols — each shot fires 2 rounds at the 2 nearest enemies), Sunder Bombs (cartoon bombs — lob arc, fuse pause, AOE; fuse shortens per level), Pyre Lance (flamethrower — flow-y flame-sprite trail, tick + burn DoT, limited fuel + lengthy recharge; **Phase 12 tune: faster max-velocity/distance ramp, emission origin raised feet → ~chest/abdomen, total stream length +25%**), **Bow & Arrow** (fast single-target arrows), **Snowball Launcher** (lobbed snowball, small impact AoE, accumulating slow stacks — **5 s per-stack expiry**; 3 stacks → brief freeze), **Ring of Chain Lightning** (accumulating shock stacks — **5 s per-stack expiry**; 3 stacks → brief stun + branching electricity burst, moderate AoE; weapon levels increase chain/jump count). Explicit stat tables in `config.js`.
- **Passives:** speed, max-HP, damage %, pickup magnet, regen (max levels in config).
- **Synergies (fused cards):** **5-level cards (same stage count as standard weapons)**, offered once every `requires` entry (weapon or passive) is at max level — **pair-specific gating: a synergy enters the offer pool the moment ITS OWN 2 sources max; never gated on all of the player's weapons being maxed** — Blight Hex (wand+garlic), Tempest Blades (axe+blades), Inferno Rounds (pistols+flame), Napalm Detonation (bombs+flame), Phoenix Heart (hp+regen passives), **Flaming Arrows** (bow+flame — arrows apply burn), **Heart-Piercer** (bow+max-HP passive — greater damage + pierce through enemies; pierce count scales with the synergy's own level), **Blue Flame** (snowball+flame — freezes enemies in place AND applies fire DoT), **Storm Volley** (working name; pistols+lightning ring — significant added-damage lightning strike on **every 4th shot**, strike scales with level; proposed: strike chains per the ring's jump count, chained enemies gain shock stacks). Stored in `player.synergies` — does NOT count toward `maxWeapons` (unchanged with 5-level synergies).
- **Meta progression (between runs):** persistent Soulshards (`floor(score/400)` + victory bonus) spent in the Upgrades screen on 5 upgrade tracks (max HP / damage / speed / XP / dash cooldown × 5 levels), localStorage `qsurv.meta.v1` (module `js/core/meta.js`).
- **Enemies:** Rat, Bat (flying, sine weave), Goblin, Wolf, Brute, Cultist (ranged orb), Wraith Boss (4:00). Time-scaled spawn interval/count/cap/type weights (pure functions in `spawner.js`). Spawn placement: just outside the current view edge (small pad — Phase 10 tuning).
- **Economy:** kill → XP gems (+heart chance); gem magnet radius; level curve linear; level-up pauses game and offers 3 cards (keyboard 1-3 / tap); **every card's text states the EXACT effect of selecting it** (per-level deltas, audited against the stat tables — Phase 10); **auto-skips when the card pool is empty** (no softlock — Phase 10).
- **Victory:** survive 5:00 → "DAWN BREAKS" bonus. **Defeat:** HP 0 → slow-mo death → game over + high scores.

### 3.5 Collision

Uniform-grid spatial hash (`js/utils/grid.js` HashGrid; cell 96 px) over enemies — same class backs the World collider grid (cell 256 px). Circle push-out for player/enemies vs static colliders (trees, huts, boulders, lake ellipses via unit-space push-out). Projectile/orb/garlic hits via grid queries + per-target hit cooldowns.

### 3.6 Audio (all synthesized)

Lazy `AudioContext` (created/resumed on first user gesture — required for mobile). Buses: SFX / music / ambience → compressor → master. SFX = osc + filtered noise + envelope recipes per event (incl. EXP-gem pickup — Phase 10), distance-attenuated, stereo-panned by world X. Music = **spooky/eldritch procedural loop** (Phase 10 remake of the original 92 BPM D-minor loop): slow drone foundation, dissonant color, sparse pulse; seamless infinite loop via 0.12 s lookahead scheduler. Ambience = looped wind (filtered noise + LFO) + scheduled ambient wolf howls (vibrato saw + breath noise, panned).

### 3.7 High scores & persistence

`localStorage` key `qsurv.hiscores.v1` — top 10 `{score, time, kills, level, date}`. Mute in `qsurv.mute`. Meta progression in `qsurv.meta.v1` — `{shards, upgrades}` (Soulshards + between-run upgrade levels).

### 3.8 Multiplayer & co-op (Phase 11 — spec 2026-08-21; design notes, NOT yet implemented)

**Transport:** zero-dep WebSocket upgrade in `tools/serve.mjs` — port **47893 only**, bind 0.0.0.0, LAN-reachable (existing rules); no new ports, no npm deps, no external services/CDNs. One room = one run; 1–4 clients; join/leave semantics defined in the protocol.

**Sync model (host-authoritative):** the host client runs the existing 60 Hz fixed-step sim as today; non-host clients send inputs; the host broadcasts a state snapshot per step — per player: position, HP, XP/level, owned weapons/cards + levels, dash state — plus shared run state (time, score/kills, alive enemies, pickups). World seed is shared, so every client generates the identical procedural world. Clients render interpolated snapshots.

**Co-op rules (user spec, 2026-08-21):**
- **Difficulty scaling (req 2; A1):** × (1 + 33% × added players) per run player count (max 3 added, 4 total — ×1.33 at 2P, ×1.66 at 3P, ~×2.0 at 4P) on: enemy **HP**, **damage to players**, **spawn count/on-screen** (batch size, spawn interval, alive cap). Config scalars + pure helper. Other common per-player dials available as future tuning (NOT enabled by A1): enemy speed, attack/fire rate, boss stat ramp, XP gem yield (economy).
- **Leash (req 3; A2):** all players held within the shared **expanded co-op vision radius** of each other — every player sees every other (keeps swarming consistent, no solo aggro). Radius = new config value, expanded from the solo 510 (exact px TBD).
- **Weapon exclusivity (req 4; A3):** the first player to pick a weapon owns it for the rest of the run; every other player's level-up offers exclude that weapon and its upgrades.
- **Player-scoped level-ups (A3 — critical):** every card pick (weapon/passive/synergy) affects **only the picking player** — an upgrade is never shared; each player must pick their own. Passives are NOT locked (any player may pick them); synergy availability follows each player's own weapon max levels.
- **Co-op equip cap (item 3 + follow-up):** each player's max equipable **standard** weapons = base `maxWeapons` (**5**, raised from 4) − (N−1): 1P=5, 2P=4, 3P=3, **4P=2 — each player can still own 1 weapon pair → paired synergy still achievable at 4P**. **Synergy weapons do NOT count toward the cap** (existing rule), so a player can hold their full 5-level synergy alongside their standard weapon slots.
- **Characters (req 5; A6):** 4 selectable characters; each uniquely color-coded (quick visual tracking), with a unique theme/visual style/silhouette (procedural, `art/characters.js`) and a unique default starting weapon — **Moonbolt Wand, Wraith Garlic, Aegis Blades, Pyre Lance** (one per character; config table).
- **Boss clones (Q7 resolved 2026-08-21):** **N players = N Wraiths** (1P=1, 2P=2, 3P=3, 4P=4); Wraith stats (HP/damage) get the same +33%/player ramp as other enemies.

**Co-op-only UI (req 6; solo run unchanged):**
- Minimap → bottom-center of the window at ~66% of its single-player size; pause + mute buttons repositioned near the minimap.
- HP bar fill + dash icon/button/cooldown indicator colored per the player's selected character palette.
- Player panels (health bar, character level, dash cooldown, all other character-specific UI) placed in the screen corners by player count: 1P = TL; 2P = TL + TR; 3P = TL + TR + BL; 4P = all four corners (corner → player assignment = **join order** — A5).

**Open items (Phase 11):**
- **Q7 (boss clones) — resolved 2026-08-21:** N players = N Wraiths (1P=1 … 4P=4); Wraith stats get the same +33%/player ramp. **No open spec questions remain.**
- **11.13 web play (A4; Q4-followup):** LAN play confirmed. Internet play **cannot** go through the GitHub Pages page — Pages is static hosting (no Node/WebSocket room possible there). **Binding research protocol (2026-08-21, non-negotiable):** (1) BEFORE any web search/research: verify **today's real-world actual date** — standalone step, CANNOT be batched with the research steps; (2) then research the most current, evidence-based, data/outcomes-driven, **sources-cited** best practices for **self-hosted, fully game-state synchronized** web-game multiplayer / multiplayer servers; (3) **100% cost-free solutions only** (no paid SaaS/hosts/CDN); (4) cite sources (title + URL) in the docs update. Candidate directions: self-hosted relay (VPS/tunnel running the same zero-dep room — keeps all rules) vs WebRTC P2P (needs external signaling → conflicts with no-external-services unless free signaling is found). Decide after LAN co-op is green.

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
| Multi-hit framerate drop (upgraded weapons striking swarms simultaneously — user-reported) | 10.4 profile-first root-cause pass + 10.9 game-wide optimization pass (worst-case load, culling/pooling/allocation audit) |
| Unverified visuals (no browser in sandbox) | Node import checks + logic tests + curl MIME checks; user playtest pass listed in PROGRESS.md |
| Co-op sync with zero deps + one port (47893) | Zero-dep WebSocket upgrade in `serve.mjs`; host-authoritative sim on the existing 60 Hz loop; per-step state snapshots; shared world seed → identical procedural world on all clients |
| Co-op regressing the solo experience (HUD/minimap layout, perf) | 11.10 solo-invariance gate: 1-player run must match the Phase 10 build; boot sim keeps the solo flow + adds a multi-client co-op flow |
| 4 corner panels + touch co-op on small screens (mobile parity) | Corner count = player count (1P = TL only); co-op pause/mute ≥72 px beside the repositioned minimap; pause-on-blur in co-op (leave/closed-room semantics) |
| Internet 'web play' (A4) | GitHub Pages = static, cannot host WS rooms → 11.13 research under the binding protocol (date verification BEFORE research; sources-cited, self-hosted fully-synced best practices; **100% cost-free only**) |
| 3 new weapons + 4 synergies + new status types (slow/freeze/shock/blue-flame) expanding combat | Follow existing patterns: Decision 21 tick (no white flicker), single-level `requires`-all-max synergies (19), exact-effect descriptions (10.2), `buildIcons()` icon audit; boot-sim exercises ALL 10 weapons + new-synergy E2Es (12.8) |

## 6. Definition of Done

All phases accepted; PROGRESS.md fully ticked; game playable end-to-end on desktop (keyboard+mouse) and mobile (touch) via the served URL; zero runtime console errors in the paths we can execute; no assets downloaded; no ports other than 47893 used.
