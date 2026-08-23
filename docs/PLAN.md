# QWEN SURVIVORS — Project Plan / Roadmap

**Type:** Vampire-Survivors-style top-down survival arena, 2D canvas with 2.5D visual illusion.
**Stack:** Vanilla ES6 modules + Canvas 2D + Web Audio API. **No build step. No external assets. No dependencies.** All art, terrain, characters, SFX and music are procedurally generated at runtime.

> **LIVING DOCUMENTS:** this file is the *plan*. `docs/PROGRESS.md` is the *living* progress tracker — it MUST be updated before any task is considered complete. See `AGENTS.md` for session rules.

---

## 1. Vision & Pillars

A 5-minute survival run in a procedurally generated "Evernight Wood": dusk sky, snow-capped mountains, dense pine forests, a ruined village, a frozen lake, monoliths and campfires. The player auto-attacks swarming enemies, collects XP, levels up from card choices, dashes with i-frames, and tries to survive until dawn. Phase 11 extends this to real-time co-op (up to 4 players, LAN, synced game state) — see §3.8. Phase 13 widens the world to **three unlockable arenas** — Map 01 Evernight Wood (existing), Map 02 **Higan** (traditional Japanese spring), Map 03 **The Drowned City** (1.5×-area underwater Atlantis) — each with its own palette, landmarks, themed enemy roster and boss, chosen from a level select on the main menu — see §3.9.

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
js/world/generate.js  — seeded world layout: landmarks, forests, village, lake, decor, colliders, decals (level-aware layout hook per level — Phase 13)
js/world/levels.js    — per-level defs, pure data (Phase 13): world size, seed, palette tokens, landmark layout hook, per-slot enemy skin+stats, spawner weights, boss, foreground particle kind, audio variation token, unlock rules
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

- **Weapons (pick/upgrade via level-up cards, 5 levels each):** Moonbolt Wand (auto-fire bolts at nearest enemy), Wraith Garlic (aura tick), Spectral Axe (boomerang arc), Aegis Blades (orbiters), Twin Fangs (twin pistols — each shot fires 2 rounds at the 2 nearest enemies), Sunder Bombs (cartoon bombs — lob arc, fuse pause, AOE; fuse shortens per level), Pyre Lance (flamethrower — flow-y flame-sprite trail, tick + burn DoT, limited fuel + lengthy recharge; **Phase 12 tune: faster max-velocity/distance ramp, emission origin raised feet → ~chest/abdomen, total stream length +25%**), **Bow & Arrow** (fast single-target arrows), **Snowball Launcher** (lobbed snowball, small impact AoE, accumulating slow stacks — **5 s per-stack expiry**; 3 stacks → brief freeze), **Ring of Chain Lightning** (accumulating shock stacks — **5 s per-stack expiry**; 3 stacks → brief stun + branching electricity burst, moderate AoE; weapon levels increase chain/jump count). Explicit stat tables in `config.js`. **Roster modularity (2026-08-22, binding):** weapon + synergy rosters are data-driven — a future new weapon/synergy = config stat-table row(s) + card-text entry + art icon/builder only; NO pipeline/combat/sync code changes. **Extended roster backlog (user spec 2026-08-22):** 9 more weapons, 2 run-equipable items, 5 more playable characters — documented VERBATIM in §3.13 (landing = Phase 21; per-item specifics deferred by the user, to be decided at implementation time).
- **Passives:** speed, max-HP, damage %, pickup magnet, regen (max levels in config). **Players start runs with NO passives (2026-08-22, binding — Phase 20, D66):** passives are acquired only through level-up picks (also removes the co-op passives/items overlap concern — see §3.8).
- **Synergies (fused cards):** **5-level cards (same stage count as standard weapons)**, offered once every `requires` entry (weapon or passive) is at max level — **pair-specific gating: a synergy enters the offer pool the moment ITS OWN 2 sources max; never gated on all of the player's weapons being maxed** — Blight Hex (wand+garlic), Tempest Blades (axe+blades), Inferno Rounds (pistols+flame), Napalm Detonation (bombs+flame), Phoenix Heart (hp+regen passives), **Flaming Arrows** (bow+flame — arrows apply burn), **Heart-Piercer** (bow+max-HP passive — greater damage + pierce through enemies; pierce count scales with the synergy's own level), **Blue Flame** (snowball+flame — freezes enemies in place AND applies fire DoT), **Storm Volley** (working name; pistols+lightning ring — significant added-damage lightning strike on **every 4th shot**, strike scales with level; proposed: strike chains per the ring's jump count, chained enemies gain shock stacks). Stored in `player.synergies` — does NOT count toward `maxWeapons` (unchanged with 5-level synergies).
- **Meta progression (between runs):** persistent Soulshards (`floor(score/400)` + victory bonus) spent in the Upgrades screen on 5 upgrade tracks (max HP / damage / speed / XP / dash cooldown × 5 levels), localStorage `qsurv.meta.v1` (module `js/core/meta.js`). **In-run (Phase 14, D54):** live run-only HUD Soulshards counter (single unified display; counter = live projected award `floor(score/400)` +25 victory — no economy change) + unified co-op earnings — all active participants in a run receive the same run total; each local LS accrues it in full (§3.8).
- **Enemies (Map 01 roster — per-level rosters: §3.9):** Rat, Bat (flying, sine weave), Goblin, Wolf, Brute, Cultist (ranged orb), Wraith Boss (4:00). Time-scaled spawn interval/count/cap/type weights (pure functions in `spawner.js`). Spawn placement: just outside the current view edge (small pad — Phase 10 tuning).
- **Economy:** kill → XP gems (+heart chance); gem magnet radius; level curve linear; level-up pauses game and offers 3 cards (keyboard 1-3 / tap); **every card's text states the EXACT effect of selecting it** (per-level deltas, audited against the stat tables — Phase 10); **auto-skips when the card pool is empty** (no softlock — Phase 10).
- **Victory:** survive 5:00 → "DAWN BREAKS" bonus. **Defeat:** HP 0 → slow-mo death → game over + high scores.

### 3.5 Collision

Uniform-grid spatial hash (`js/utils/grid.js` HashGrid; cell 96 px) over enemies — same class backs the World collider grid (cell 256 px). Circle push-out for player/enemies vs static colliders (trees, huts, boulders, lake ellipses via unit-space push-out). Projectile/orb/garlic hits via grid queries + per-target hit cooldowns.

### 3.6 Audio (all synthesized)

Lazy `AudioContext` (created/resumed on first user gesture — required for mobile). Buses: SFX / music / ambience → compressor → master. SFX = osc + filtered noise + envelope recipes per event (incl. EXP-gem pickup — Phase 10), distance-attenuated, stereo-panned by world X. Music = **spooky/eldritch procedural loop** (Phase 10 remake of the original 92 BPM D-minor loop): slow drone foundation, dissonant color, sparse pulse; seamless infinite loop via 0.12 s lookahead scheduler. Ambience = looped wind (filtered noise + LFO) + scheduled ambient wolf howls (vibrato saw + breath noise, panned).

### 3.7 High scores & persistence

`localStorage` key `qsurv.hiscores.v1` — top 10 `{score, time, kills, level, date}` (Phase 13: one list per level — `v1` = Map 01). Mute in `qsurv.mute`. Meta progression in `qsurv.meta.v1` — `{shards, upgrades}` (Soulshards + between-run upgrade levels). **Run-duration selection (Phase 17, 2026-08-22)** persists per level key (13.9 `scoreKeyFor` pattern; default 5:00); **level-up action uses (Phase 18)** are per-player unlock/upgrade levels in the meta store (Soulshard economy, meta.js pattern) — run-only USE counters are in-run state, never persisted.

### 3.8 Multiplayer & co-op (Phase 11 — spec 2026-08-21; 11.1–11.10 implemented (2026-08-22/23); 11.11–11.13 pending — see `docs/PROGRESS.md`)

**Transport:** zero-dep WebSocket upgrade in `tools/serve.mjs` — port **47893 only**, bind 0.0.0.0, LAN-reachable (existing rules); no new ports, no npm deps, no external services/CDNs. One room = one run; 1–4 clients; join/leave semantics defined in the protocol.

**Sync model (host-authoritative):** the host client runs the existing 60 Hz fixed-step sim as today; non-host clients send inputs; the host broadcasts a state snapshot per step — per player: position, HP, XP/level, owned weapons/cards + levels, dash state — plus shared run state (time, score/kills, alive enemies, pickups). World seed is shared, so every client generates the identical procedural world. Clients render interpolated snapshots.

**Co-op rules (user spec, 2026-08-21):**
- **Difficulty scaling (req 2; A1):** × (1 + 33% × added players) per run player count (max 3 added, 4 total — ×1.33 at 2P, ×1.66 at 3P, ~×2.0 at 4P) on: enemy **HP**, **damage to players**, **spawn count/on-screen** (batch size, spawn interval, alive cap). Config scalars + pure helper. Other common per-player dials available as future tuning (NOT enabled by A1): enemy speed, attack/fire rate, boss stat ramp, XP gem yield (economy).
- **Leash (req 3; A2):** all players held within the shared **expanded co-op vision radius** of each other — every player sees every other (keeps swarming consistent, no solo aggro). Radius = new config value, expanded from the solo 510 (exact px TBD).
- **Weapon + synergy exclusivity (req 4; A3; extended 2026-08-22):** the first player to pick a weapon **or synergy** owns it for the rest of the run; every other player's offers exclude it AND its upgrades — the owner is the only player who can see it. Starting weapons are **pre-owned** (granted, never "picked" → no owner registered); co-op character uniqueness (D56) guarantees two players never hold the same starting weapon.
- **Player-scoped level-ups (A3 — critical):** every card pick (weapon/passive/synergy) affects **only the picking player** — card effects, upgrades, and synergies are NEVER shared across players (D56); each player must pick their own. Passives are NOT locked (each player may pick and hold their own copy); synergy availability follows each player's own weapon max levels, and a picked synergy is exclusive to its picker (above).
- **Co-op equip cap (item 3 + follow-up):** each player's max equipable **standard** weapons = base `maxWeapons` (**5**, raised from 4) − (N−1): 1P=5, 2P=4, 3P=3, **4P=2 — each player can still own 1 weapon pair → paired synergy still achievable at 4P**. **Synergy weapons do NOT count toward the cap** (existing rule), so a player can hold their full 5-level synergy alongside their standard weapon slots.
- **Characters (req 5; A6; RESPEC'd 2026-08-22 — binding):** 4 playable characters + a hidden **ghost** fallback. Each character: unique color-code/palette (quick visual tracking), unique theme/visual style/silhouette (procedural, `art/characters.js`), **its OWN base stats — clearly detailed/visible in the character select screen** — and a unique default starting weapon (one per character; config table). **Archetypes (binding):** glass-cannon mage/sorcerer/wizard · tanky-with-(lower-medium)-base-damage · fast-moving balanced-stats ranger · roguish-swashbuckler-with-(upper-medium)-base-damage → **mapping RESOLVED 2026-08-22: Mage = original/default sprite (starter) · Warden = new larger heavy-armor sprite (> original player size, < brute-enemy size; SLOWEST move speed of the 4) · Ranger = new fast sprite · Swashbuckler = new agile sprite** (exact stat values still O, proposed in 11.6.1). **Co-op: every player MUST select a UNIQUE character (no two players the same)** — characters already selected by other players appear **greyed-out** in the select screen; character select is ALSO available in solo. **Unlock progression (binding; RESOLVED 2026-08-22):** Soulshard-cost character shop (same Soulshard economy as Upgrades — distinct mechanism from the map 3×-victory unlocks, D46): **Mage = default (unlocked, original sprite)** · **Ranger = 1500** · **Warden = 3500** · **Swashbuckler = 7500** — locked cards show cost + visible requirement; spend persisted (meta.js pattern). **Ghost (binding; appearance RESOLVED 2026-08-22):** in a co-op lobby where ALL seated players have ONLY the starter character unlocked, every player is assigned a **sheet-ghost** character (traditional "sheet" ghost appearance — NOT faceless: each player's ghost is a UNIQUE color, Pacman-ghost style) — NO default weapon, baseline average stats across-the-board — and on entering the run each player is presented **2 UNIQUE weapon cards (NEVER duplicated across players)** to choose their starting weapon from; **each ghost's color dictates that player's color-coded in-run UI elements** (same palette→UI theming channel as 11.8 character palettes). **Modularity (binding):** character roster is data-driven (config table + one art builder each); a future new character = config entry + art builder + (optional) unlock rule — NO gameplay/sync code changes.
- **Boss clones (Q7 resolved 2026-08-21; per-level boss per Phase 13):** **N players = N bosses of the current level** (M01 Wraith / M02 Oni / M03 Great White Shark; 1P=1 … 4P=4); boss stats (HP/damage) get the same +33%/player ramp as other enemies.
- **Meta progression is PLAYER-SPECIFIC (2026-08-21):** Soulshards + between-run Upgrades (`qsurv.meta.v1`) are each player's own (their own device/localStorage) — **never carried over to, shared with, or applied to other players during co-op sessions**; each client applies its own local meta to its own character at run start, and run shard earnings are **unified per run (Phase 14, D54):** all active participants receive the **same** amount — host sim computes one run-level total, each client accrues it in full to its own local LS. Sync implication (host-authoritative): the host simulates every player, so each client uploads its meta-derived **stat profile** in the join handshake — sim input for THAT player only, never a shared resource; no meta state appears in per-step snapshots or is broadcast.

**Co-op-only UI (req 6; solo run unchanged):**
- Minimap → bottom-center of the window at ~66% of its single-player size; the PAUSE button repositioned near the minimap (mute stays in the Pause-menu Settings — 13.8/D48; user rescope 2026-08-23, D72).
- HP bar fill + dash icon/button/cooldown indicator colored per the player's selected character palette.
- Player panels (health bar, character level, dash cooldown, all other character-specific UI) placed in the screen corners by player count: 1P = TL; 2P = TL + TR; 3P = TL + TR + BL; 4P = all four corners (corner → player assignment = **join order** — A5).

**Open items (Phase 11):**
- **Q7 (boss clones) — resolved 2026-08-21:** N players = N bosses of the current level (1P=1 … 4P=4; per-level boss per Phase 13); boss stats get the same +33%/player ramp. **No open spec questions remain.**
- **11.13 web play (A4; Q4-followup):** LAN play confirmed. Internet play **cannot** go through the GitHub Pages page — Pages is static hosting (no Node/WebSocket room possible there). **Binding research protocol (2026-08-21, non-negotiable):** (1) BEFORE any web search/research: verify **today's real-world actual date** — standalone step, CANNOT be batched with the research steps; (2) then research the most current, evidence-based, data/outcomes-driven, **sources-cited** best practices for **self-hosted, fully game-state synchronized** web-game multiplayer / multiplayer servers; (3) **100% cost-free solutions only** (no paid SaaS/hosts/CDN); (4) cite sources (title + URL) in the docs update. Candidate directions: self-hosted relay (VPS/tunnel running the same zero-dep room — keeps all rules) vs WebRTC P2P (needs external signaling → conflicts with no-external-services unless free signaling is found). Decide after LAN co-op is green.

### 3.9 Multi-level expansion + level select + mobile view zoom (Phase 13 — **COMPLETE 2026-08-22, 13.1–13.13**; A1–A8 answered 2026-08-21)

**Level model (binding structure):** new pure-data module `js/world/levels.js` — one def per level: key/name, world W/H, menu backdrop seed, palette tokens (sky/ground/lighting/foreground), `generateWorld(seed, levelKey)` layout hook (the existing layout becomes the Map 01 hook — identical output), per-slot enemy roster (skin + stat table), spawner weights, boss slot def + boss time (stays 240 s), foreground particle kind, audio variation token. **Slot-based roster:** the 6 roles (small chaser / fast flyer / medium chaser / fast chaser / large brute / ranged) + boss keep their mechanics (fly/weave/ranged/boss flags) across all levels; each level re-skins + re-stats per slot — AI/spawner/combat/test surface unchanged. All tuning in `config.js` + `levels.js` (no scattered magic numbers).

**Per-level difficulty (A4, binding):** chained ~×1.25 per level step on enemy HP, damage to players, spawn batch/interval/alive cap (same levers as Phase 11 A1): M01 = 1.0 · M02 ≈ 1.25× M01 · M03 ≈ 1.56× M01 (per-level scalar in the level def).

**Map 01 — Evernight Wood** (existing): 4200×3200, dusk + snow, current roster.

**Map 02 — Higan** (traditional Japan; **same scale 4200×3200**, user spec):
- Visuals: cherry-blossom trees replace pines; **falling sakura petals replace snow for this map only** (per-level foreground particle); traditional architecture — torii gates, pagoda, wooden shrine buildings, stone lanterns (warm lights), bamboo grove, koi pond, stone paths; a single Mt.-Fuji-esque snow-capped horizon silhouette (+ stratus cloud band); torii-ring + shrine landmark (monolith-ring equivalent); dusk-pink sky + full moon.
- Roster (user spec, binding): brute slot → **Oni** (replaces the golem); boss → **Ryū, a traditional Japanese dragon** (serpentine; same chase/windup/charge skeleton; segmented tail — A5). Other slots (**approved A1, 2026-08-21**): small chaser → **tanuki** · fast flyer → **hō-ōi will-o'-the-wisp** · medium chaser → **shikome** (oni attendant) · fast chaser → **kitsune** (fox) · ranged → **miko** (cursed shrine maiden; ofuda talisman orb).

**Map 03 — The Drowned City** (underwater; **1.5× area of Maps 01/02 ≈ 5145×3920** — √1.5 ≈ 1.225 linear, aspect preserved; user spec, revised A3):
- Visuals: deep-water gradient (no sky) + subtle god-ray light shafts (parallax); **foreground particles = small RISING bubbles** (replaces Map 01's falling snow / Map 02's falling petals — drift upward, not down); kelp/seaweed forests (tall, gentle sway), coral + glowing anemones (bioluminescent light holes), Atlantis city — circular colonnade of broken columns around a central dome/spire, trident statue, sunken shipwreck; bubble columns from vents.
- Roster (user spec, binding): bat slot → **goldfish** · goblin slot → **mer-people (merman + mermaid skins)** · wolf slot → **stingray** · ranged slot → **electric eel** · brute slot → **orca** · boss → **large Great White Shark** (same charge skeleton; belly-flash on windup). Small-chaser slot: **crab** (approved A2).

**Unlocks (user spec, binding):** both new maps locked by default; Map 02 unlocks after **3 cumulative Map 01 victories**, Map 03 after **3 cumulative Map 02 victories** (cumulative — NOT consecutive; victory = survive the full run, death does not count). Persist in localStorage (meta.js pattern; pure helper, Node-testable); no reset condition.

**Level select (user spec, binding):** inline on the main menu — 3 level cards (radio behavior) + Start begins the selected level; **locked levels remain visible but non-selectable**, each clearly showing the remaining unlock condition + progress (e.g. "2/3 victories"); touch targets ≥72 px + safe areas (mobile parity rule).

**Mobile view zoom + Pause-menu Settings (user spec, binding; A6):** mobile (touch) browsers zoom out the game view during runs to show more screen area — implemented as a larger camera view rect, **default factor 0.80** → 1/0.80² ≈ 1.56 area (+56%); config scalar; menu backdrop gets the same factor for consistency; HUD DOM + minimap stay 1×; gated by the existing touch detection (Decision 13). **New Settings section inside the Pause menu** with two toggles — **view zoom** (0.80 ↔ 1.0, all devices; default 0.80 touch / 1.0 desktop; persisted in LS) and **mute/unmute** — the mute entry **REPLACES the existing HUD `#btn-mute` button (NOT in addition to it)**; the `M` key shortcut + `qsurv.mute` persistence are unchanged (Decision 8); Settings rows ≥72 px (mobile parity).

**Per-level audio (approved A5):** keep the 10.6 track skeleton; per-level variation tokens (Map 02: taiko pulse in boss phase, distant temple bell, wind-chime color; Map 03: muffled deep drone, bubble blips, rare long whale song) + per-level seam test (10.6 method).

**Per-level high scores (approved A5):** top-10 score lists are per-level — one LS key per level, the existing `qsurv.hiscores.v1` = Map 01 (no data loss); the High Scores screen shows the selected level's list; game over ranks within the run's level.

**Phase 11 interplay (A7 order: Phase 13 builds before Phase 11):** co-op room handshake carries the level key from the start (11.1/11.2); boss-clone rule is per-level (11.10: N players = N bosses of the current level).

**A5-approved embellishments (2026-08-21):** per-level high scores (see above) · per-level audio/music (see above) · per-level gem/heart tints (Map 02 gold-pink, Map 03 cyan) · per-level menu backdrop preview (menu backdrop live-renders the selected level — `generateWorld` is pure, cheap) · segmented dragon tail (4–6 pre-rendered segments along a position history) · koi in the pond (Map 02) + slow-sinuous decorative fish schools (Map 03) · unlock banner at the threshold moment ("NEW MAP UNLOCKED: HIGAN") + unlock-progress line on game-over/victory screens · soft "denied" blip + card shake on tapping a locked level · eel zap = jagged lightning sprite (vs orb) + shark belly-flash on windup (art details of approved skins).

**Deferred (NOT approved — do not implement without asking):** first-clear Soulshard bonus per map · per-level shard multipliers (×1 / ×1.25 / ×1.5) · per-level victory lines · pufferfish alt skin (inflate-on-hit) · keyboard 1/2/3 level selection (menu state only) · per-level boss intro moment (banner + petal gust / taiko boom).

### 3.10 Selectable run durations & boss schedule (Phase 17 — spec'd 2026-08-22; user spec as-is)

- **Selectable run durations:** **5 mins (default) · 10 · 15 · 20 (max set-time) · "ENDLESS"** (play "forever" until the player dies). Selection UI on the main menu beside the level select (touch ≥72 px + safe areas; exact layout O at 17); **5:00 default = current behavior → solo invariance for default runs**; per-level persistence (§3.7).
- **Boss events (user spec, binding):** a boss event occurs at **4:00, 9:00, 14:00, 19:00** during a run, and **every 5 minutes during ENDLESS runs**. User-confirmed example: a 15-minute run experiences exactly **3 boss events** (4:00, 9:00, 14:00); "the same pattern applies to all of the listed potentially selectable run durations."
- **O (decide at Phase 17, documented as-is for now):** (a) 20-min run — the 19:00 boss fires per the timestamp list (confirm: "fires if T < run end" read); (b) ENDLESS cadence — fixed slots (4/9/14/19) AND the 5-min cadence (5:00, 10:00, …) both apply, or the 5-min cadence replaces the slots; (c) co-op: N players = N bosses per event (D35 pattern — confirm); (d) per-level boss: each event spawns the CURRENT level's boss (Phase 13 — confirm); (e) ENDLESS: no victory/"DAWN BREAKS" (death-only end) + high-score inclusion (per-level list? victory bonus N/A) O.
- **Mechanical impact (planning only):** boss trigger moves from hard-coded 240 s to a per-duration boss-time table (data in `config.js` — tuning rule); spawner difficulty tail beyond 5:00 must be defined (current curve is 5-min-shaped; O: ramp cap/hold); victory = survive to the selected duration.

### 3.11 Level-up screen actions: SKIP / BANISH / RE-ROLL (Phase 18 — spec'd 2026-08-22; research: `RESEARCH_FINDINGS.md` §7)

- **User spec (binding, as-is):** "SKIP", "BANISH", and "RE-ROLL" options on the level-up screen, each **initially unlocked via the meta-progression store in the Main Menu**, then **upgraded within that store to grant additional uses during runs (maximum 5 uses per run *each*)**. **Explicitly NOT** equippable items, **NOT** selectable cards during level-ups, and **CANNOT be leveled-up** mid-run/during level-up screens.
- **Functionality (VS-model insight, §7.3 mapping; final semantics O at 18):** **SKIP** = pass on the current offer (level still granted; VS grants partial XP toward the next level — user ~66%, wiki 20%/use — our ratio O; candidate: no-XP free pass) · **RE-ROLL** = discard the current card set, draw a fresh one (VS: discarded cards excluded from the redraw only, remain in pool) · **BANISH** = remove a card from level-up offers for the rest of the run (VS: owned items freeze — no further level-ups; our owned-item behavior O).
- **Co-op (D32 pattern):** player-scoped use counters (host-authoritative; per-step snapshot fields); a banished key is excluded from the BANNING picker's offers only (mirrors 11.5/11.6b `exclude` plumbing); solo invariance guard as usual.
- **O (at 18):** exact skip-XP ratio; banish granularity (weapon / passive / synergy keys?); reroll pool-exclusion semantics; Soulshard cost curve (unlock + upgrades 1→4); UI layout (3 buttons + live use counts, ≥72 px, exact-effect tooltips per the 10.2 rule); interplay with 10.7 empty-pool auto-skip and the 15.3 offer-pool fix.

### 3.12 In-run HUD: equipment icons + Pyre Lance fuel bar (Phase 19 — spec'd 2026-08-22)

- **Equipment row (user spec, as-is):** display currently equipped **weapon and item icons beneath the character XP bar**; a **number next to each weapon's icon = the weapon's current level**, shown **at all times throughout the run**.
- **Pyre Lance fuel (user spec, as-is):** the ammo/fuel indicator moves **beneath the player character** (currently appears above — revises D24's "fuel bar above player").
- **Planning notes (O at 19):** "item" = run-equipable item icons (item roster §3.13 — items don't exist in the roster yet, so the row renders weapon icons first); passive-icon inclusion (user said "weapon and item" — passives O); cap-5 row layout + wrap rule + mobile ≥72 px/safe-area; co-op corner panels (11.7) — equip row placement per-seat O; fuel bar: same bar, relocated (world-space under the player) — verify readability vs ground tiles + co-op.

### 3.13 Extended roster backlog — weapons / run items / playable characters (Phase 21 — spec'd 2026-08-22; VERBATIM user spec, specifics deferred by user: "Additional specifics can/will be determined/decided upon at a later time - document as-is for now")

**Additional Weapon Ideas (9 — landing = Phase 21; all via the D60 data-driven modularity rule; all Phase 11 co-op rules apply unchanged):**

1. **Tank Cannon** — "straight-line explosive shell weapon with big-damage but small AoE; pierces through 1st targeted enemy it hits then terminates with small AoE explosive blast upon contact with a 2nd enemy."
2. **Continuous laser beam** — "medium-range continuous beam; damages all enemies that contact the continuous beam; has a long cool-down between shots."
3. **Wolf "summon"/companion (counts as a weapon slot)** — "**MUST** stay within 3 character-spans distance from the player character that summoned it (*selected it in the level-up cards*) at all times; autonomously dashes/pounces on the nearest enemy; cannot pounce more frequently than once every 2 seconds; high single-target damage; causes DoT "bleed" effect for 3 seconds on pounced enemy."
4. **Rolling Boulder** — "spherical boulder (limitation: can only roll in cardinal directions) - long cool-down between releases; automatic instant kill on the smallest sized enemies when they're hit by the boulder; rolls in a straight line and damages all enemies hit, but does less and less damage to each subsequent enemy hit after the first; max enemies hit before projectile terminates: 6; has a "crumble" effect upon projectile termination; no more than 1 boulder on-screen at a time (even if the cooldown has ended, if the previously released boulder projectile is still present on-screen then must wait until it terminates before the next boulder can be released)."
5. **Web-slingers** — "(*Spider-man influenced*) shoot strands of web which burst into a small AoE web and briefly hold in-place enemies hit by the burst of web."
6. **Gatling Gun** — "*very* high rate-of-fire but *very* low damage per bullet weapon with moderate "reload" time (3 second long reload); fires 40 bullets per reload."
7. **Baseball Bat** — "very close-range (melee) weapon; very brief pause between swings; has very high knock-back effect on enemies; has a 1-in-500 chance to perform a "Homerun" hit which 1-hit-KO's any single enemy other than level bosses; "Homerun" hit causes aesthetic-/visual-only (no damage) firework to pop up and burst over the player character's head."
8. **Frog Tongue** — "lashes out at enemies, latching onto them and dragging them close to the player character; imparts a very small DoT "poison" effect; enemies killed by the initial damage from getting hit by the tongue are eaten/consumed by the player character and this restores an amount of HP determined by the size/max health of the consumed enemy."
9. **Cannonball** — "the player's character quickly tucks into a ball-esque shape, then is propelled very rapidly at the nearest enemy. The player's character's position becomes wherever they impacted the enemy. Can only "fire" once every 10 seconds. Each level of upgrade to the Cannonball attack enables the player's character to bounce/ricochet to an additional nearby enemy, doing very slightly less and less damage to each subsequent enemy hit after the first; max enemies hit before projectile terminates: 6. The player's character is invulnerable during the Cannonball attack/animation(s)."

**Additional Run-Equip-able Item Ideas (2 — the item slot class the Phase 19 HUD row anticipates):**

1. **Mirror Shield** — "(ricochets enemy projectiles back at them - maximum blocked/ricocheted projectiles = 3-projectiles-every-5-seconds."
2. **Ice Skates** — "player's movement becomes "slippery" similar to older games like the original DOOM and others where the player continues to "slide"/move a short distance after releasing the movement direction key(s). Positive effect of the Ice Skates: Increased player character movement speed (and increased inertia/sliding of the player character based on the level of the Ice Skates). If/when the player's character slides into an enemy while the Ice Skates are equipped, both the enemy and the player take a small amount of damage proportionate to the current level of the Ice Skates - maximum impact damage for the player and enemy = 6 HP (at max-level Ice Skates)."

**Additional Playable Character Ideas (5 — extend the D28/D62 character roster + D58-style Soulshard unlock shop; data-driven per D60):**

1. **Werewolf** — default weapon: Wolf summon (Weapon #3)
2. **Stone Golem** — default weapon: Rolling Boulder (Weapon #4)
3. **Baseball Player** — default weapon: Baseball Bat (Weapon #7)
4. **Giant Toad** — default weapon: Frog Tongue (Weapon #8)
5. **Wild West Gunslinger** — default weapon: Twin Fangs (existing weapon)

**Planning constraints (not user spec — planning notes):** every new weapon needs the full existing treatment (config stat table + icon in `buildIcons()` + exact-effect card text per 10.2 + co-op snapshot key table + boot-sim exercise) — the D60 modularity rule means no pipeline/sync code changes; **O at 21:** stat values for all 9 weapons, item equip-cap/stacking rules (do items occupy weapon slots? user said "run-equipable" — O), character stat archetypes + unlock costs, weapon→character pairing confirmations (Werewolf/Wolf etc. pair with the NEW weapons → those weapons must land with or before their character), Cannonball player-propulsion vs co-op leash (11.4) interplay.

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
| Phase 13 art volume (13 new enemy skins + 2 landmark sets + 3 palettes, all procedural) | Pre-rendered per-level sprite packs (existing "no per-frame path art" invariant); new art stays pure/Node-safe (check.mjs); per-level decor budgets in level defs |
| Map 03 1.5×-area world (≈5145×3920) — decor counts + culling cost on mobile | Viewport culling + cullPad already exist; per-level decor budgets; boot-sim worst-case at 1.5× area (13.12) |
| Per-level audio variation (scheduler complexity) | Keep the 0.12 s lookahead scheduler; per-level variation = per-level recipes/transpose, seam-tested in Node (10.6 method) |
| Level select × co-op (Phase 11) | Level key in the room handshake (fold into 11.1); solo level select unaffected by co-op |
| Selectable run durations + boss schedule (Phase 17) — multi-boss runs + ENDLESS | Boss-time table per duration in config (data-driven); spawner tail past 5:00 defined before 17 lands (O: ramp cap/hold); co-op N-bosses-per-event per D35; victory = survive to selected duration (5:00 default → invariance) |
| Level-up SKIP/BANISH/RE-ROLL (Phase 18) — new per-player run state + level-up UI actions in co-op | Player-scoped counters (D32) host-authoritative in per-step snapshots (dash-state channel); banish exclusion reuses 11.5/11.6b `exclude` plumbing per picker; buttons never enter `cardOffers` pool/cap logic; solo invariance guard |
| Extended roster (Phase 21) — 9 weapons + 2 items + 5 characters expanding combat surface | D60 data-driven modularity (config rows + card text + icon only — no pipeline/combat/sync code changes); one-item-at-a-time sub-steps with gates each; co-op snapshot key table grows per new key (11.2 pattern); new DoT/CC statuses (bleed/poison/hold) tick via the Decision 21 pattern |

## 6. Definition of Done

All phases accepted; PROGRESS.md fully ticked; game playable end-to-end on desktop (keyboard+mouse) and mobile (touch) via the served URL; zero runtime console errors in the paths we can execute; no assets downloaded; no ports other than 47893 used.
