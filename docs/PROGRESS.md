# QWEN SURVIVORS — Progress Tracker

> **RULE:** a task/step/phase is NOT complete until its box is ticked here with a date + one-line note — update *before* declaring done. Plan: `docs/PLAN.md` · Session rules: `AGENTS.md`.
> **Keep this file lean — it is loaded every session:** Status + Master Checklist + *active* resume notes only. One line per session in the log. No API dumps, no line refs, no kept-for-reference step blocks — the code is the implementation record.

## Status — 2026-08-21

- **Active: Phase 13** (multi-level) — **13.1 + 13.2 + 13.3 DONE 2026-08-21** (framework + Higan art + M02 roster: Higan slot skins tanuki/hō-ōi/shikome/kitsune/oni/miko + segmented-tail Ryū boss, ×1.25 stat tables, m02 weights/boss wired, name-driven boss banners, real m02 run in test-boot). Next: **13.4 M03 "The Drowned City" art** (5145×3920; kelp/Athens city/coral/god-rays/rising bubbles/fish schools; m03 palette final values). **Phase 11 — multiplayer/co-op** spec'd + Q1–Q7 answered, docs only, queued after Phase 13; open: **11.13 web-play research** (binding protocol + 100%-free, PLAN §3.8). **Phase 12 — flame tune + 3 new weapons / 4 new synergies** spec'd, queued after Phase 11. **Phase 10:** 10.1–10.8 done; **10.9 optimization pass** runs **LAST**. Order per A7: **13 → 11 → 12 → 14 → 10.9 (LAST, D25) → 2.9**. Deferred (NOT building): first-clear bonus, shard multipliers, per-level victory line, pufferfish, keyboard 1/2/3 select, boss intro moment.
- **Gates (all three green before any tick):** `node tools/check.mjs` **30/30** · `node tools/test-logic.mjs` **255/255** · `node tools/test-boot.mjs` **`PASS boot-sim` (runs=3)**.
- **Overall:** Phases 0–9 done (published) + 10.1–10.8 + 13.1–13.3 done; next **Phase 13 (13.4 M03 art)** → **Phase 11 multiplayer** → **Phase 12 weapons** → **10.9 optimization (LAST, D25)** → **2.9 user browser sign-off** (re-verify post-co-op) → project DONE. Blocking: none.
- **Published:** public repo `TheyCallMeHenry/Qwen-Survivors` (initial commit `03eeac2` + `667364f` Phase 8 docs) · Pages **https://theycallmehenry.github.io/Qwen-Survivors/** (the share link; repo must stay public — flip back: `gh repo edit --visibility private`).
- **Git:** tree clean — 13.3 Map 02 roster committed + pushed 2026-08-21 (13.3 = `6f6c274`). Pages auto-deploys from main within a few minutes. Commit only if the user asks (AGENTS rule 7).
- **Server:** detached node on **47893** (log `server.log`; dies on reboot). Check before starting another: `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:47893/` → 200 = already up.

## Master Checklist

### Phase 0 — Scaffold & Docs (all 2026-08-20)
- [x] 0.1 Directory tree (PLAN §3.1)
- [x] 0.2 `package.json` (type:module, check/test/serve scripts)
- [x] 0.3 `docs/PLAN.md`
- [x] 0.4 `docs/PROGRESS.md`
- [x] 0.5 `README.md`
- [x] 0.6 `AGENTS.md`

### Phase 1 — Core engine (all 2026-08-20)
- [x] 1.1 `index.html` (canvas, HUD, touch UI, 7 screens)
- [x] 1.2 `css/main.css` (safe areas, touch sizing)
- [x] 1.3 `js/config.js` (all tuning)
- [x] 1.4 `utils/math.js` + `utils/bus.js`
- [x] 1.5 `core/loop.js` (fixed 60 Hz, timescale, hit-stop)
- [x] 1.6 `core/input.js` (keys, drag/touch sticks, dash/pause/mute, card keys)
- [x] 1.7 `check.mjs` green on Phase 1 files

### Phase 2 — Procedural art & world (all 2026-08-20)
- [x] 2.1 `art/base.js` (canvas/sprite helpers)
- [x] 2.2 `art/sky.js` (clouds/stars/moon/ridges)
- [x] 2.3 `art/terrain.js` (tiles, decals, props, mountains, lakes, vignette)
- [x] 2.4 `art/characters.js` (player + 7 enemies, pre-rendered frames)
- [x] 2.5 `art/items.js` (world sprites + card icons)
- [x] 2.6 `world/generate.js` (pure seeded layout)
- [x] 2.7 `world/world.js` (background pipeline + light data)
- [x] 2.8 `world/minimap.js` (264×202 base + live layer)
- [ ] 2.9 Browser sign-off (art/world/lighting/minimap visuals) — **after Phase 10**

### Phase 3 — Entities & gameplay (all 2026-08-20)
- [x] 3.1 `entities/player.js` (movement, dash i-frames, weapons, cards, meta stats)
- [x] 3.2 `entities/enemies.js` (7 types, AI, wraith boss, burn/blight status)
- [x] 3.3 `entities/spawner.js` (pure curves)
- [x] 3.4 `entities/combat.js` (bolts/axes/orbiters/garlic + bullets/bombs/flames, DoT)
- [x] 3.5 `entities/pickups.js` (gems/hearts, magnet)
- [x] 3.6 `entities/particles.js` (pooled + snow)
- [x] 3.7 `systems/camera.js`
- [x] 3.8 `systems/lighting.js` (half-res darkness + glow)
- [x] 3.9 `core/game.js` (6-state machine, scoring, runs)
- [x] 3.10 `test-logic.mjs` green

### Phase 4 — UI/HUD (all 2026-08-20)
- [x] 4.1 `ui/hud.js` (bars, text-on-change, dash ring, mute)
- [x] 4.2 `ui/screens.js` (6 screens + Upgrades, cards, scores)
- [x] 4.3 CSS final (touch ≥72 px, safe areas, pulse)
- [x] 4.4 `index.html` wiring verified

### Phase 5 — Audio (all 2026-08-20)
- [x] 5.1 `audio/sfx.js` (lazy ctx on gesture, bus graph, recipes, mute)
- [x] 5.2 `audio/music.js` (loop + wind + howls) — track replaced by 10.6
- [x] 5.3 Gesture unlock + mute persistence verified

### Phase 6 — Integration & launch (all 2026-08-20)
- [x] 6.1 `js/main.js` bootstrap (Node-safe top level)
- [x] 6.2 `tools/serve.mjs` (47893, 0.0.0.0, MIME map, traversal-safe)
- [x] 6.3 `check.mjs` 28/28 clean
- [x] 6.4 `test-logic.mjs` 95 green
- [x] 6.5 HTTP 200/MIME/404 verified
- [x] 6.6 Mobile audit pass
- [x] 6.7 Handoff + PLAN sync

### Phase 7 — Pre-sign-off hardening (all 2026-08-20)
- [x] 7.1 boot-sim: card pick via keys 1–3
- [x] 7.2 boot-sim: all weapons exercised + wand-off kill window
- [x] 7.3 boot-sim: heart pickup heal
- [x] 7.4 boot-sim: score persistence + quit flow
- [x] 7.5 boot-sim: touch stick steering + dash button
- [x] 7.6 All three gates green

### Phase 8 — Publish & share (all 2026-08-20)
- [x] 8.1 Public repo + initial commit `03eeac2` (gates green on pushed tree)
- [x] 8.2 GitHub Pages live, HTTP 200 verified

### Phase 9 — 7-request feature pass (all 2026-08-21)
- [x] 9.1 Vision ×3 (`lighting.playerR` 170→510)
- [x] 9.2 Hit knockback → 33% (230→76)
- [x] 9.3a Synergies: 5 fused cards gated on `requires`-all-max; `cardOffers` 4-arg
- [x] 9.3b Meta: `core/meta.js` + Soulshards + Upgrades screen + `buyMeta`
- [x] 9.4 Minimap +25% (CSS-only)
- [x] 9.5 Full i-frames through dash (boot-sim E2E)
- [x] 9.6a Twin pistols (2 bullets at nearest 2)
- [x] 9.6b Sunder bombs (lob → fuse → AOE)
- [x] 9.6c Pyre Lance (flame trail + burn DoT + fuel/recharge)
- [x] 9.7 Gates 29/29 · 117/117 · PASS + README updated

### Phase 10 — Post-playtest polish & optimization (10.1–10.8 done; 10.9 runs LAST per D25/A7)
- [x] 10.1 Dash indicator in ALL environments — 2026-08-21 `#btn-dash-hud`, shared `--cd`, clickable
- [x] 10.2 Exact-effect card descriptions — 2026-08-21 pure `cardEffectText` + mandatory card line + `meta-effect` rows; +90 logic checks
- [x] 10.3 `#btn-mute` speaker icon — 2026-08-21 inline SVG, slash off-state, aria-label
- [x] 10.4 Multi-hit perf — 2026-08-21 viewport culling + in-place compaction (drawOne −29%); bench + section timers permanent in test-boot
- [x] 10.5 Spawn points nearer view edge — 2026-08-21 band placement just outside the view edge (`spawnPad` 15 px / fallback 30 px, config) + input `clearTransient` now clears dash/pause/mute/card edges (stale edge auto-started a run from menu) + harness keep-alive iframes + pump-until-victory
- [x] 10.6 Music remake (eldritch, seamless indefinite loop) — 2026-08-21 66 BPM D-dim7 loop: sub-root crawl + detuned-saw drone + sparse heartbeat + lone beat-pair color tones over dark delay + run-gated noise texture (tuning in `CFG.audio`); seam proven in Node (12-loop fake-clock pump: exact BAR lattice + exact voice counts)
- [x] 10.7 All-cards-owned softlock → auto-skip empty LEVELUP — 2026-08-21 offers computed first at BOTH entry sites (`_startLevelUp` + `pickCard` mid-queue re-draw); empty pool grants levels silently, stays PLAYING; boot-sim E2E: multi-queue entry + mid-queue exhaustion (lone phoenix pick via real pipeline)
- [x] 10.8 Gem pickup SFX — 2026-08-21 `gem` recipe (bright sine blip 1318→1976 Hz, 0.09 s decay, GAPS 0.05) + `gem` bus emit where XP is consumed; boot-sim forced-collect E2E
- [ ] 10.9 Game-wide optimization pass (LAST)

### Phase 11 — Multiplayer & co-op run (spec'd 2026-08-21; Q1–Q6 answered same day; begins after Phase 13 per A7; answer PLAN §3.8 Q7 first)

- [ ] 11.1 Co-op transport: zero-dep WebSocket upgrade in `tools/serve.mjs` (port 47893 only, 0.0.0.0, LAN); 1 room = 1 run; 1–4 clients; join/leave/full/closed semantics (req 1)
- [ ] 11.2 Host-authoritative sync: host runs the 60 Hz sim; clients send inputs; host broadcasts state per step (positions, HP/XP/level, weapon/card picks + levels, dash, kills/score); shared world seed; client interpolation; **meta NEVER in the sync — player-specific (D53): join-handshake uploads each player's own meta-derived stat profile (sim input only)**; pure protocol in `js/net` (Node-testable) (req 1)
- [ ] 11.3 Difficulty scaling: enemy **HP, damage to players, spawn count/on-screen** (batch size, interval, alive cap) × (1 + 33% × added players) — ×1.33 at 2P, ×1.66 at 3P, ~×2.0 at 4P; **Wraith boss stats (HP/damage) get the same ramp**; config scalars + pure helper (A1 + Q7)
- [ ] 11.4 Player leash: all players held within the shared **expanded co-op vision radius** of each other (every player sees every other; config value, expanded from solo 510) — swarming stays consistent, no single player aggro-ing/killing a disproportionate share (A2)
- [ ] 11.5 Level-up scoping + weapon exclusivity: first picker owns a weapon + its upgrades for the run; other offers exclude it; **all picks (weapons/passives/synergies) affect only the picker** — passives NOT locked (anyone may pick), synergy availability follows per-player weapon max (A3); **base `maxWeapons` raised 4→5** (solo impact: solo runs get 5 standard weapon slots); **max equipable STANDARD weapons per player = 5 − (N−1)** (1P=5, 2P=4, 3P=3, 4P=2 — at 4P each player can still own 1 weapon pair → paired synergy achievable), **synergy weapons NEVER count toward the cap** (item 3); test-logic maxWeapons expectations 4→5
- [ ] 11.6 Characters: 4 selectable — unique palette (visual tracking), theme/visual style/silhouette; default starting weapons: **Moonbolt Wand, Wraith Garlic, Aegis Blades, Pyre Lance** (config table + `art/characters.js`) (A6)
- [ ] 11.7 Co-op HUD corners: per-player panels (HP bar, level, dash cooldown, all character-specific UI) — 1P=TL, 2P=TL+TR, 3P=TL+TR+BL, 4P=all four; visible count = current player count; **assignment = join order** (A5)
- [ ] 11.8 Co-op theming: HP bar fill + dash icon/button/cooldown indicator colored per selected character's palette (req 6b, 6d)
- [ ] 11.9 Co-op minimap + buttons: minimap bottom-center at ~66% of single-player size; pause + mute repositioned near the minimap (req 6a)
- [ ] 11.10 Boss count: **N players = N bosses of the current level** (M01 Wraith / M02 Oni / M03 Great White Shark; 1P=1, 2P=2, 3P=3, 4P=4); boss stats get the same +33%/player ramp as other enemies (Q7 resolved 2026-08-21; per-level boss per Phase 13)
- [ ] 11.11 Solo invariance: 1-player run identical to the Phase 10 build (TL-only panel, default minimap/buttons, 1 Wraith, no co-op overhead) (guards req 6)
- [ ] 11.12 Gates: check.mjs (new modules import-clean) · test-logic (scaling/leash/lock/characters/boss-count/sync protocol) · test-boot (multi-client co-op E2E: join → run with locks + scaling → victory) + co-op mobile parity (touch ≥72 px, corner layout on small screens, pause-on-blur)
- [ ] 11.13 Web play (internet) — research + implementation after 11.12 (A4; §3.8). **Binding research protocol (non-negotiable):** (1) BEFORE any web search/research: verify **today's real-world actual date** — standalone step, CANNOT be batched with the research steps; (2) then research the most current, evidence-based, data/outcomes-driven, **sources-cited** best practices for **self-hosted, fully game-state synchronized** web-game multiplayer / multiplayer servers; (3) **100% cost-free solutions only**; (4) cite sources (title + URL) in the docs update

### Phase 12 — Flame tune + 3 new weapons & 4 new synergies (spec'd 2026-08-21; begins after Phase 11)

Roster: 7 → **10 weapons**, 5 → **9 synergies**. All Phase 11 co-op rules (weapon exclusivity 11.5, difficulty scaling 11.3, characters 11.6) apply to the new weapons unchanged. New statuses tick via the Decision 21 pattern (never `damageEnemy` — no white flicker); every new icon must exist in `buildIcons()`; exact-effect descriptions per the 10.2 rule.

- [ ] 12.1 Pyre Lance (flamethrower) tune: flame stream reaches **max velocity/distance more quickly** (faster ramp); emission origin moved **UP from the feet to ~chest/abdomen**; total stream length **+25%** — config scalars
- [ ] 12.2 **Bow & Arrow** (weapon #8): fast single-target arrows at nearest enemy; levels 1–5 table + icon + exact-effect descriptions
- [ ] 12.3 **Snowball Launcher** (weapon #9; icon: frozen rocket launcher): lobbed snowball with **small AoE on impact** on the targeted enemy; applies **accumulating slow** stacks; **3 stacks → brief freeze**
- [ ] 12.4 **Ring of Chain Lightning** (weapon #10; icon: jeweled finger ring w/ lightning bolt visible within the gem): applies **accumulating shock** stacks; **3 stacks → brief stun + branching electricity burst to surrounding enemies (moderate AoE)**; weapon levels increase the number of enemies the lightning **jumps/chains** to
- [ ] 12.5 Status pipeline (pure helpers): slow stacks → freeze (brief movement lock); shock stacks → stun + chain burst; **blue flame** = frozen-in-place + fire DoT simultaneously; **slow/shock stack TTL = 5 s per stack** (independent per-stack expiry; config scalar — expected playtest tuning) — all tick via the Decision 21 pattern
- [ ] 12.6 New synergies (**5 levels — same stage count as standard weapons**, offered the moment their own 2 sources max — pair-specific, NO global all-weapons lock): **Flaming Arrows** (Bow + Pyre Lance — arrows apply burn), **Heart-Piercer** (Bow + max-HP passive — greater damage + pierce through enemies to hit beyond the initial target; pierce count scales with the **synergy's own level**), **Blue Flame** (Snowball + Pyre Lance — freezes enemies in place AND does the fire DoT), **Storm Volley** (working name; Twin Fangs + Ring of Chain Lightning — lightning strike for significant added damage on **every 4th shot**, strike scales with level + proposed logical extras: strike chains per the ring's jump count, chained enemies gain 1 shock stack)
- [ ] 12.7 Roster sync: 10 weapons in card pool + icons in `buildIcons()`; `maxWeapons`/card-pool review at 10 weapons, base 5 (config); README weapon list 7→10 + synergies 5→9
- [ ] 12.8 Gates: check.mjs · test-logic (new weapon curves, slow/shock stacking, freeze/stun durations, 4 new synergy gates) · test-boot (ALL **10** weapons exercised + new-synergy E2Es) — extends the 11.12 multi-client sim if Phase 11 is already green

### Phase 13 — Multi-level expansion: 3 maps + level select + mobile view zoom (spec'd 2026-08-21; A1–A8 answered 2026-08-21; begins after 10.7/10.8 — then Phase 11 per A7)

Spec: PLAN §3.9. **Slot-based roster:** 6 enemy roles + boss keep their mechanics; each level re-skins + re-stats per slot. **Per-level difficulty chained ×1.25** (M01 1.0 / M02 ≈1.25 / M03 ≈1.56 — enemy HP, damage to players, spawn batch/interval/alive cap; A4). Binding: M02 same scale (4200×3200) + **Oni** (brute) + **Ryū dragon** (boss) + **sakura petals (map-only)** + approved skins **tanuki/hō-ōi/shikome/kitsune/miko** (A1) · M03 **1.5× area ≈ 5145×3920** (A3) + goldfish/merfolk/stingray/eel/orca/shark + **crab** small chaser (A2) + **small rising bubbles** foreground · unlocks = cumulative wins, 3× each, victory-only · level select on main menu, locked levels visible + non-selectable + requirement + progress · zoom default **0.80** + **Pause-menu Settings** (zoom + mute; mute **replaces** HUD `#btn-mute`) (A6) · A5 flavor approved (PLAN §3.9).

- [x] 13.1 Level framework: `js/world/levels.js` (pure defs: size/seed/palette/layout hook/weights/boss/particles/audio token/**per-level difficulty scalar (A4)**) + `generateWorld(seed, levelKey)` (Map 01 output identical) + per-level minimap + **per-level menu backdrop preview (A5)** (2026-08-21 — levels.js pure defs + m01 layout moved verbatim; per-level weights/boss/diff into spawner (D55); m01 bit-identical, golden pinned in test-logic)
- [x] 13.2 Map 02 "Higan" art: cherry trees, **sakura petals (Map 02 only — replace falling snow)**, torii/pagoda/shrine/stone-lantern/bamboo/koi pond (A5)/stone paths, Fuji silhouette, dusk-pink palette + full moon, torii-ring landmark (2026-08-21 — layoutM02 + full procedural art pack; palette-driven sky/ground/lighting/foreground wired; m01 bit-identical, golden holds)
- [x] 13.3 Map 02 roster: **Oni** (brute) + **Ryū dragon** (boss; segmented tail A5) — user spec + approved skins **tanuki / hō-ōi / shikome / kitsune / miko** (A1) + per-level stat tables (×1.25 difficulty, A4) + weights (2026-08-21 — `buildCharacters('m02')` Higan skin set (same footprints) + ryu in default set · `enemies.diff` ×1.25 hp/dmg at spawn (A4) · m02 weights (m01 role curve) + boss `ryu`@240 `name:'RYŪ'` + name-driven AWAKENS/FALLS banners (m01 text unchanged) · real m02 run 3 in test-boot: skins/×1.25/Ryū spawn + banner/victory)
- [ ] 13.4 Map 03 "The Drowned City" art (**5145×3920**, 1.5× area — A3): kelp forests, Atlantis city (colonnade/dome/trident statue/shipwreck), coral + bioluminescent anemones, god-rays, **small rising bubbles as foreground particles (replace snow/petals — drift upward)**, decorative fish schools (A5), deep-blue palette + vent bubbles
- [ ] 13.5 Map 03 roster: **crab** (small chaser — A2), **goldfish** (bat), **mer-people** (goblin; merman + mermaid skins), **stingray** (wolf), **electric eel** (cultist; lightning zap sprite), **orca** (brute), **Great White Shark** (boss; belly-flash windup) + stat tables (×1.56 vs M01, A4) + weights
- [ ] 13.6 Unlock persistence: cumulative wins, victory-only (deaths don't count) — Map 02 = 3× M1, Map 03 = 3× M2 — meta.js LS pattern, pure helpers + test-logic
- [ ] 13.7 Level select on main menu: 3 cards (radio) + Start begins selection; locked visible + non-selectable + requirement + X/3 progress; **denied blip + card shake** on locked tap (A5); ≥72 px touch + safe areas; persist last selection
- [ ] 13.8 Mobile view zoom + **Pause-menu Settings** (A6): camera-view factor **default 0.80** touch (≈56% area) / 1.0 desktop, toggle 0.80 ↔ 1.0 all devices, persisted; new Settings section in the Pause menu (zoom + mute toggles, ≥72 px rows); mute entry **replaces** the HUD `#btn-mute` button (M key + `qsurv.mute` LS unchanged, D8); HUD DOM + minimap stay 1×
- [ ] 13.9 **Per-level high scores (A5):** one LS list per level (existing `qsurv.hiscores.v1` = M01 — no data loss); scores screen shows the selected level's list; game over ranks within the run's level
- [ ] 13.10 Per-level flavor (A5): **gem/heart tints** (M02 gold-pink / M03 cyan) + **unlock banner** at threshold ("NEW MAP UNLOCKED") + unlock-progress lines on game-over/victory (per-level victory lines — deferred, D51)
- [ ] 13.11 Per-level audio (approved A5): M02 temple bell/wind-chime/taiko boss pulse; M03 muffled deep + bubble blips + whale song — seam-tested (10.6 method)
- [ ] 13.12 Gates: check.mjs (new modules) · test-logic (level defs/unlocks/stat tables) · test-boot (M02 + M03 runs: unlock flow, boss, victory; Settings mute/zoom E2E) + mobile parity (zoom + level cards + Settings touch)
- [ ] 13.13 README: levels section (names, scale, unlocks, rosters) + roadmap line
- **Phase 11 cross-ref (A7: 13 before 11):** co-op room handshake carries the level key from the start (11.1/11.2); boss count per-level (11.10: N players = N bosses of the current level)
- **Deferred (NOT approved — do not build without asking, D51):** first-clear Soulshard bonus · per-level shard multipliers · per-level victory lines · pufferfish skin · keyboard 1/2/3 select · per-level boss intro moment

### Phase 14 — In-run Soulshards counter + unified co-op earnings (spec'd 2026-08-21; queued after Phase 12, before 10.9 (LAST))

- [ ] 14.1 In-run Soulshards counter (in-GUI currency counter): live-updating Soulshards display, visible **during runs only** (state-gated, hidden off-run); change-detected DOM per the `hud.js` pattern; safe-area aware; **source = live projected award `floor(score/400)` (+25 on victory) — no economy change (O1 resolved: A, 2026-08-21)**.
- [ ] 14.2 Unified co-op earnings: all active players in a run receive the **same** Soulshard amount — one unified counter (no per-player counters); host sim computes one run-level total (formula = implementation detail, defined with the 11.2 protocol); each client accrues it in full to its own local LS (revises D53 earnings clause; meta stats/upgrades stay player-specific — D54).
- [ ] 14.3 Gates: test-logic (pure helper for projected award / unified total) · test-boot (solo: counter updates live in-run; co-op E2E: all clients receive identical totals — extends the 11.12 multi-client sim)

## Resume Notes — next: Phase 13 — 13.4 M03 art (start here)

**13.4 M03 "The Drowned City" art (scope = checklist 13.4 line):** layoutM03 **5145×3920** (1.5× area, A3) — kelp forests, Atlantis city (colonnade/dome/trident statue/shipwreck), coral + bioluminescent anemones, god-rays, decorative fish schools (A5) · **small rising bubbles = foreground particles drifting upward (replace snow/petals, D49)** · m03 deep-blue palette **final values** + vent bubbles · palette-driven sky/ground/lighting per the 13.2 pattern · m01 + m02 goldens must hold.

Phase 10 done except **10.9 (runs LAST — after 13/11/12 per D25/A7 — so it measures the final state)**. Phase 13: **13.1–13.3 DONE 2026-08-21** (framework + Higan art + M02 roster; m03 `layout`/`weights`/`boss` still null — land with 13.4–13.5; m03 palette final values land 13.4). Next: **13.4 M03 art** (PLAN §3.9; deferred items D51 — do not build). **Phase 14 (in-run Soulshards counter + unified co-op earnings)** spec'd + **O1 resolved (A: live projected award `floor(score/400)` +25 victory, no economy change)** — queued after 12, before 10.9 (placement approved 2026-08-21).

**10.9 Game-wide optimization pass (LAST)** — (a) opt-in update-vs-render + per-stage timers (no shipping cost); (b) worst-case load: all weapons max + synergies + end-run `aliveCap` + Wraith boss; (c) audit: viewport culling (decor culls via `world.cullPad` — verify enemies/projectiles/flames/particles too), pooling (projectiles/bombs/flames arrays, per-frame allocations), DOM text writes (already change-detected — verify), canvas state churn, lighting cost; (d) fix top offenders; (e) tick note MUST include before/after numbers. **Deferred from 10.4:** sprite-ify lighting `createRadialGradient` holes/glow (~24–36/frame), flame `lighter` pass (~130 drawImages/frame — dominant ops noise), cull `combat.draw`/`drawOrbs`. 2.9 user sign-off doubles as the framerate acceptance test. Post-10.5 bench baseline (measure 10.9 against THIS): render ~0.148 ms/frame · drawImage ~804/frame (10.4 was 0.118/678 — spawn band puts more enemies in viewport).

**Pitfalls (active):**
- m02+ decor convention: `put(o,k,s,w,h)` w/h MUST equal the sprite canvas size (draw is unscaled, offset uses w*s); every decor key must exist in `terrain.sprites` (boot `decor.every(d=>d.img)` is the only guard); new m02 tiles use their own rng streams (`mulberry32(4242+i*97)`) — never disturb m01's `mulberry32(4242)` first stream in `buildTerrain` (golden + bit-identity).
- Profile before perf fixes — the user's multi-hit guess was unverified (actual root: no viewport culling, 10.4); before/after numbers are the contract.
- `cardOffers(weapons, passives, synergies, rng)` is 4-arg — a 3-arg call shifts `rng` and crashes.
- `applyMeta` does NOT recompute stats — caller: `applyMeta(p, meta); recomputeStats(p); p.hp = p.maxHp;`.
- DoT ticks via `combat.dpsTick` (no flash/knockback; deaths still route through `onKill`) — never `damageEnemy` (white-flickers burning foes every frame).
- Every CFG `icon` name must exist in `buildIcons()` — card DOM draws `icons[def.icon]` unguarded (crash class).
- New canvas API with strict arg requirements → extend the `test-boot` `makeCtx` stub (it validates `arc`/`ellipse` arg counts + radii; everything else is a silent no-op) or the gate passes while the browser throws (Decision 17).
- New one-shot test-boot paths must self-verify: final assert on every one-shot flag (Decision 16).
- Gem SFX still inaudible after 10.8? Raise the recipe peak (within the compressor), don't add layers — GAPS already bounds burst volume.
- Music loop seam is the classic failure — verify pattern math + lookahead wrap in Node, not by ear.

## Decisions (binding)

| # | Decision | Rationale |
| --- | --- | --- |
| 1 | Vanilla ESM, zero deps, zero build | Requirement: HTML/CSS/JS only, modules where it helps |
| 2 | Bounded world 4200×3200 + minimap | Finite landmarks + minimap need a bounded map |
| 3 | All audio = Web Audio synthesis | No asset files allowed |
| 4 | Port 47893 only, bind 0.0.0.0 | Reachable outside the sandbox; obscure-port rule |
| 5 | Touch steer = pointer-drag anywhere on canvas (floating stick); `K` dash alias | UX decision; README matches implementation |
| 6 | Lighting = per-light radial gradients over cached half-res canvas; flicker phase = hash of light pos (stateless) | `destination-out` holes per light; cheap at ~15 lights |
| 7 | Screens = per-frame `game.state` poll; bus = transients only | `toMenu()` emits nothing; polling covers auto-pause |
| 8 | Mute owned by `hud.js` (LS `qsurv.mute`, toggled on 'mute'); audio re-reads, never writes LS | Single toggle point (key M + button funnel through Game) |
| 9 | `#touch-ui` gated behind `body.touch` (dash button touch-only; desktop dash = Shift/Space/K/right-click) | Phase 1 hint design |
| 10 | Audio = exactly 2 modules; `sfx.js` owns the lazy `AudioContext` + shared graph | Single graph source; music/amb reuse the SFX noise buffer |
| 11 | `startRun()` sets `input.gesture` | Menu Start is a DOM tap; canvas-only pointer listeners miss it → audio would stay locked on mobile |
| 12 | `serve.mjs` listens unconditionally | argv[1]-vs-`import.meta.url` gate silently no-opped under Git Bash |
| 13 | Touch detect = `pointer: coarse` ‖ `ontouchstart` → `body.touch` + DPR caps (2/1.5) | One detection point drives CSS gating + DPR |
| 14 | Game canvas `alpha:false`; minimap ctx raw 1× (no DPR) | Canvas fully repainted every frame; DPR would break the 264×202 1:1 minimap mapping |
| 15 | Third gate `tools/test-boot.mjs`: Node, stubbed DOM + browser-strict canvas, real `Loop`, full menu→death→Upgrades→victory→menu sim | Import + logic gates passed while boot was dead in the browser |
| 16 | test-boot one-shot paths self-verify (final assert on every flag) | A sub-test that never fired must fail the gate |
| 17 | test-boot ctx stub validates `arc`/`ellipse` arg counts (`ellipse` exactly 7) + radii, negative-tested | 21-site `ellipse()` 6-arg crash passed all gates until the stub enforced it |
| 18 | Spawner batch floor 1→2 | Camped player took zero early damage — run winnable with no input |
| 19 | Synergies = third card kind, single-level, gated on `requires`-all-max, own namespace (NOT counted in `maxWeapons`); `cardOffers` 4-arg | User spec: fused card only once both sources maxed |
| 20 | Meta = pure `core/meta.js`, LS `qsurv.meta.v1`, shards = `floor(score/400)` + 25 victory; `applyMeta` sets multipliers only | Node-testable; recompute split avoids a meta↔player import cycle |
| 21 | Burn/blight DoT via `dpsTick` (no flash/knockback; deaths through `onKill`) | `damageEnemy` would white-flicker burning foes every frame |
| 22 | New-weapon SFX on bus events `pistol`/`boom`/`fire` via `combat.pulse`, tight GAPS | Flamethrower fires ~60×/s; combat stays decoupled from audio |
| 23 | Bomb = 0.55 s parabolic lob → `fuse` pause → AOE (fuse shortens per level) | User spec |
| 24 | Flamethrower fuel model: `fuel` s of fire, lengthy `recharge`, fuel bar above player, per-enemy hit cooldown | User spec: flow-y trail, limited fuel |
| 25 | 10.9 optimization pass slotted LAST | Measure/fix the final feature state; 10.4's harness + root causes feed it |
| 26 | Empty card pool → auto-skip LEVELUP (level still granted) | User-reported softlock; filler cards would violate the exact-description rule |
| 27 | Co-op transport = zero-dep WebSocket upgrade in `tools/serve.mjs` (port 47893 only, 0.0.0.0, LAN); host-authoritative: host runs the 60 Hz sim, clients send inputs, host broadcasts state per step, shared world seed; **web play (internet) = research task 11.13** (Pages is static — cannot host WS rooms; A4) | Port rule (47893 only) + zero-deps rule; the local server already exists and is LAN-reachable |
| 28 | 4 selectable characters, each unique palette/theme/silhouette + unique default starting weapon (config table; `art/characters.js`) | User spec (req 5) |
| 29 | Weapon exclusivity = per-run, first-pick-wins, one owner per weapon (weapon + its upgrades); passives/synergies unaffected (pending Q3) | User spec (req 4) |
| 30 | Difficulty ramp = **+33% per added player** (max 3 added, 4 total; ~×2.0 at 4P) on **enemy HP, damage to players, spawn count/on-screen** (batch/interval/alive cap) | User spec (req 2; A1) |
| 31 | Leash = shared **expanded co-op vision radius** — every player held within that radius of every other (all players see all players); new config value (expanded from solo 510) | User spec (req 3; A2) |
| 32 | Level-up picks are **player-scoped**: each pick affects only the picker (no shared buffs); passives NOT locked (anyone may pick); synergy availability follows per-player weapon max | User spec (A3) |
| 33 | Corner → player assignment = **join order** (1st→TL, 2nd→TR, 3rd→BL, 4th→BR) | User spec (req 6c; A5) |
| 34 | Character default starting weapons: **Moonbolt Wand, Wraith Garlic, Aegis Blades, Pyre Lance** (one per character) | User spec (req 5; A6) |
| 35 | Final boss count = **N Wraiths for N players** (1P=1 … 4P=4); Wraith stats get the same +33%/player ramp as other enemies | User spec (Q7 resolved 2026-08-21) |
| 36 | 11.13 web-play research protocol: verify real-world date BEFORE web research (standalone, non-batchable, non-negotiable step); sources-cited, evidence-based best practices for self-hosted, fully game-state-synced web-game multiplayer; **100% cost-free solutions only** | User spec (2026-08-21) |
| 37 | Roster = **10 weapons** (add Bow & Arrow, Snowball Launcher, Ring of Chain Lightning) + **9 synergies**; all Phase 11 co-op rules apply to the new weapons unchanged | User spec (2026-08-21) |
| 38 | 4 new synergies: **Flaming Arrows** (Bow+Flame), **Heart-Piercer** (Bow+max-HP passive: greater damage + pierce, pierce scales with Bow level), **Blue Flame** (Snowball+Flame: freeze + burn DoT), **Storm Volley** (working name; Pistols+Lightning Ring: strike every 4th shot + proposed chain/shock extras) — single-level, `requires`-all-max per Decision 19 | User spec + invited proposals (2026-08-21) |
| 39 | New statuses (slow→freeze stacks, shock→stun+chain-burst stacks, blue flame = frozen+burning) tick via the Decision 21 pattern (never `damageEnemy` — no white flicker) | Combat pipeline invariant |
| 40 | Synergy cards = **5 levels** (same stage count as standard weapons), remain in the offer pool until their own max, per-level effect scaling (Heart-Piercer pierce, Storm Volley strike scale with the synergy's own level) — supersedes Decision 19's "single-level" | User spec (2026-08-21) |
| 41 | Synergy offer-pool gating = **pair-specific**: a synergy becomes eligible the moment ITS OWN `requires` sources (2 weapons, or weapon+passive) reach max — NEVER gated on all of the player's weapons being maxed | User spec + confirmation (2026-08-21) |
| 42 | Co-op equip cap: each player's max equipable standard weapons = **5 − (N−1)** (1P=5, 2P=4, 3P=3, 4P=2); base `maxWeapons` raised 4→5 so a 4P player can still own 1 weapon pair → paired synergy achievable; **synergy weapons NEVER count toward the cap** | User spec (item 3 + follow-up, 2026-08-21) |
| 43 | Slow/shock status stacks have **5 s per-stack TTL** (independent per-stack expiry; config scalar, expected playtest tuning) | User spec (item 4, 2026-08-21) |
| 44 | **Slot-based enemy roster across levels:** the 6 roles (small chaser/fast flyer/medium chaser/fast chaser/large brute/ranged) + boss keep their mechanics; each level re-skins + re-stats per slot. User-spec skins — Map 02: Oni (brute), Ryū dragon (boss); Map 03: goldfish (flyer), mer-people (medium chaser), stingray (fast chaser), electric eel (ranged), orca (brute), Great White Shark (boss). **Approved (A1/A2):** Map 02 remaining slots = tanuki/hō-ōi/shikome/kitsune/miko; Map 03 small chaser = crab | User spec (2026-08-21); keeps AI/spawner/test surface stable |
| 45 | Level scales: Map 02 = 4200×3200 (same as Map 01), Map 03 = **1.5× area ≈ 5145×3920** (√1.5 ≈ 1.225 linear, aspect preserved) — config scalars (revised A3) | User spec (2026-08-21) |
| 46 | Unlocks: cumulative wins, victory-only (deaths don't count), no reset — Map 02 = 3× Map 01, Map 03 = 3× Map 02; persisted in LS (meta.js pattern) | User spec (2026-08-21) |
| 47 | Level select inline on main menu; locked levels visible + non-selectable + show requirement + X/3 progress; ≥72 px touch targets | User spec (2026-08-21; mobile parity rule) |
| 48 | Mobile view zoom = camera-view factor (default **0.80** → 1/0.80² ≈ 1.56 area; config scalar; menu backdrop too); HUD DOM + minimap stay 1×; gated by existing touch detection (D13); **new Pause-menu Settings section: zoom toggle (0.80 ↔ 1.0, all devices, persisted) + mute toggle — mute REPLACES the HUD `#btn-mute` button (M key + `qsurv.mute` LS unchanged, D8)** (revised A6) | User spec (2026-08-21) |
| 49 | Map 03 foreground particles = small RISING bubbles (replace falling snow/petals; drift upward) | User spec (2026-08-21) |
| 50 | Per-level difficulty chained **×1.25 per level step** (M02 ≈ 1.25× M01, M03 ≈ 1.56× M01) on enemy HP, damage to players, spawn batch/interval/alive cap (same levers as Phase 11 A1) | User spec (A4, 2026-08-21) |
| 51 | A5-approved Phase 13 flavor: per-level high scores (one LS key per level, `v1` = M01), per-level audio/music, per-level gem/heart tints, per-level menu backdrop preview, segmented dragon tail, koi pond (M02) + fish schools (M03), unlock banner, denied blip + card shake, eel lightning sprite, shark belly-flash. **NOT approved (deferred — do not build without asking):** first-clear Soulshard bonus, per-level shard multipliers, per-level victory lines, pufferfish skin, keyboard 1/2/3 select, per-level boss intro moment | User spec (A5, 2026-08-21) |
| 53 | Meta progression (Soulshards + Upgrades, `qsurv.meta.v1`) is **player-specific**: never carried over to, shared with, or applied to other players during co-op sessions; each client applies its own local meta to its own character; run shard earnings are **unified per run — all active participants earn the same amount** (D54); each client still accrues only to its own local LS; host sim receives each player's meta-derived stat profile at join (handshake) for accurate simulation — sim input only, no meta in per-step snapshots | User spec (2026-08-21; earnings clause revised 2026-08-21) |
| 54 | **In-run Soulshards counter + unified co-op earnings:** one unified, live HUD Soulshards counter visible **during runs only** (no per-player counters); all active players in a run receive the **same** Soulshard amount — host sim computes one run-level total and each client accrues it in full to its own local LS (supersedes D53's shard-earnings clause; meta stats/upgrades stay player-specific); counter source = live projected award `floor(score/400)` (+25 on victory) — no economy change (O1=A) | User spec (2026-08-21; O1 resolved 2026-08-21) |
| 52 | Phase order (A7): **10.7/10.8 → Phase 13 → Phase 11 → Phase 12 → 10.9 (LAST, D25) → 2.9** — level framework lands before co-op's shared-world sync (no retrofitting the level key into shipped networking); co-op before weapons (12.8 already extends the 11.12 multi-client sim 7→10 weapons) | Best-practices judgment (A7, 2026-08-21) |
| 55 | **Per-level plumbing (13.1):** level def = source of truth for w/h/margin/weights/boss/diff; `World.generate(seed, levelKey)` syncs level bounds into `CFG.world` (single seam — entity hot paths keep reading `CFG.world`); spawner fns take a `level` param (default m01) scaling batch×diff, interval÷diff, aliveCap×diff; m01 output bit-identical (golden counts 276/335/328 pinned in test-logic, seed 20260820); m02/m03 `layout`/`weights`/`boss` = null until 13.2–13.5 | Best-practices judgment (2026-08-21) |

## Session Log (one line per session, newest first)
- **2026-08-21 — 13.3 Map 02 roster (code + gates):** `buildCharacters('m02')` Higan skins tanuki/hō-ōi/shikome/kitsune/oni/miko (same footprints) + segmented-tail Ryū in default set · `enemies.diff` ×1.25 hp/dmg at spawn (A4) · m02 `weights` (m01 role curve) + boss `ryu`@240 `name:'RYŪ'` + name-driven AWAKENS/FALLS banners (m01 text byte-identical) · test-logic 13.3 block (stat scaling / banner names / weights) · test-boot real M02 run 3 (keep-alive + banner capture: skins, ×1.25 stats, Ryū spawn + 'RYŪ AWAKENS', victory) · gates 30/30 · 255/255 · boot PASS (runs=3).
- **2026-08-21 — 13.2 Map 02 "Higan" art (code + gates):** layoutM02 in levels.js (torii-ring landmark + shrine village + pagoda + koi pond + bamboo + lanterns + stone paths + m02 lights) · m02 art pack in terrain.js (cherry/cherryBig/bamboo/torii/shrine/pagoda/lantern/stone-slab/koi+koiPond + m02 tiles/decals on own rng streams) · m02 sky in sky.js (Fuji silhouette + stratus + full moon) · per-level sky cache + palette-driven sky/ground/lighting base (world.js/lighting.js/game.js) · kind-aware foreground petals (particles.js + CFG.perf.petalColor) · tests: test-logic m02 block (golden 274/324/331 seed 20260822) + test-boot M02 menu-backdrop E2E + m01 snow regression · gates 30/30 · 243/243 · boot PASS (m01 golden 276/335/328 intact).

- **2026-08-21 — 13.1 level framework (code + gates):** new `js/world/levels.js` (pure defs: size/diff/menuSeed/foreground/audio/unlock/palette + m01 layout moved verbatim) · `generateWorld(seed, levelKey)` dispatch · per-level spawner weights/boss/diff scaling (D55) · per-level bounds seam in `World.generate` · per-level minimap base + menu-backdrop level hook (last-level preview) · gates 30/30 · 231/231 · boot PASS.
- **2026-08-21 — Phase 14 O1 resolved + placement approved (docs only, no code):** counter source = **A** — live projected award `floor(score/400)` (+25 on victory), no economy change; queue slot approved (after Phase 12, before 10.9 LAST). D54 amended + 14.1 + README + resume notes synced.
- **2026-08-21 — Phase 14 spec'd (docs only, no code):** in-run real-time Soulshards HUD counter (run-only display, single unified view) + unified co-op earnings (all active players in a run receive the same amount; each local LS accrues it in full) → checklist 14.1–14.3 + D54 (revises D53 earnings clause) + PLAN §3.4/§3.8 + README; O1 open: counter source = live projected award vs collectible soul gems.
- **2026-08-21 — 10.7 softlock + 10.8 gem SFX (code + gates):** 10.7 offers computed first at both LEVELUP entry sites — empty pool grants levels silently, stays PLAYING (boot-sim E2E rides the bench all-max roster: multi-queue entry + mid-queue exhaustion, auto-pick gated per `synActive` pattern); 10.8 `gem` sfx recipe (bright blip, GAPS 0.05) + `gem` bus emit at the XP-consume site (boot-sim forced collect fires the event); gates 29/29 · 219/219 · boot PASS.
- **2026-08-21 — session resume (post-compact, docs verified, no code, no other changes):** Phase 13 doc state confirmed in sync (PLAN §3.9 + §3.8/§3.7/§3.1/§5, checklist 13.1–13.13 unchecked, D44–53, README); gates at last-run baselines 29/29 · 219/219 · boot PASS; awaiting user start for 10.7.
- **2026-08-21 — Phase 11 clarification (docs only, no code):** meta progression (Soulshards + Upgrades) is **player-specific** — never carried over to/shared with/applied to other players during co-op; each client applies its own local meta to its own character; shard earnings accrue locally only; host sim gets each player's meta-derived stat profile at join (handshake, sim input only) → D53 + PLAN §3.8 co-op rules + 11.2.
- **2026-08-21 — Phase 13 decisions A1–A8 (docs only, no code):** Map 02 skins approved + M03 small chaser = **crab** (A1/A2); M03 scale → **1.5× area ≈ 5145×3920** (A3); per-level difficulty chained **×1.25** (A4); A5 flavor approved (per-level high scores/audio/gem tints/backdrop preview/dragon tail/koi + fish schools/unlock banner/denied blip) — first-clear bonus, shard multipliers, victory lines, pufferfish, keyboard select, boss intro **deferred**; zoom default **0.80** + new **Pause-menu Settings** (zoom + mute; mute **replaces** HUD `#btn-mute`) (A6); order **10.7/10.8 → 13 → 11 → 12 → 10.9 (last) → 2.9** (A7); map names tentatively approved (A8). Decisions 44–52 revised/added; PLAN §3.8/§3.9 + README synced.
- **2026-08-21 — Phase 13 spec'd (docs only, no code):** 3-map expansion — Map 02 "Higan" (traditional Japan, 4200×3200: sakura petals map-only, Oni brute, Ryū dragon boss) + Map 03 "The Drowned City" (underwater, 8400×6400: goldfish/merfolk/stingray/eel/orca + Great White Shark boss, small rising bubbles foreground) — cumulative-win unlocks (3×, victory-only), main-menu level select with locked-visible-progress, mobile view zoom ≈25% → PLAN §3.9 + checklist 13.1–13.12 + decisions 44–49; candidate embellishments pending user decision.
- **2026-08-21 — 10.6 music remake:** 66 BPM eldritch track in D-dim7 {D, F, Ab, B} (sub-root crawl + detuned-saw drone layer + sparse heartbeat + one lone beat-pair color tone per bar over a dark delay + run-gated filtered-noise texture; wind/howl ambience unchanged, all tuning in `CFG.audio`); seamless-seam proof in test-logic: fake-`AudioContext` clock pumped 12 loops + margin — exact BAR lattice (no gap/double/drift) + exact per-voice counts (213→219 checks; old MUSIC data checks replaced).
- **2026-08-21 — 10.5 spawn distance:** `spawnPoint` → thin band just outside the view edge (4 sides, `spawnPad` 15 px / 8 retries / clamped fallback `spawnFallback` 30 px — all config); root-caused the boot-sim go-menu flake: input edge (dash/card) set on the last PLAYING frame survived `_gameOver`/`toMenu` (both call `clearTransient`, which only cleared keys+sticks) → `_menuUpdate` auto-started a run; fix: `clearTransient` now clears all four edge channels (also correct on blur/tab-switch); harness: run-1 keep-alive iframes (mirrors run-2) + run-2 `pumpUntil` victory (clock freezes in LEVELUP — fixed pumps break); boot-sim 17/17 consecutive PASS.
- **2026-08-21 — Phase 11/12 spec refinement 4 (docs only, no code):** base `maxWeapons` **4→5** (solo runs now get 5 standard weapon slots) → co-op cap table **1P=5, 2P=4, 3P=3, 4P=2**, so a 4P player can still own 1 weapon pair → paired synergy achievable (synergies never count toward the cap); decision 42 revised; 11.5 updated incl. test-logic expectations 4→5.
- **2026-08-21 — Phase 11/12 spec refinement 3 (docs only, no code):** synergies → **5 levels** like standard weapons (supersedes D19 single-level; stay in pool until own max; per-level effect scaling) + pair-specific gating confirmed (offer pool opens the moment the synergy's own 2 sources max — NOT all weapons) + co-op equip cap **4−(N−1)** per player with synergies excluded (base `maxWeapons=4` verified in code) + slow/shock stacks **5 s per-stack TTL** (playtest-tunable); decisions 40–43; PLAN §3.4/§3.8 + README updated.
- **2026-08-21 — Phase 12 spec'd (docs only, no code):** Pyre Lance tune (faster max-velocity ramp, emission origin feet→chest/abdomen, stream +25%) + 3 new weapons (Bow & Arrow, Snowball Launcher — slow stacks→freeze, Ring of Chain Lightning — shock stacks→stun+chain burst) + 4 new synergies (Flaming Arrows, Heart-Piercer, Blue Flame, Storm Volley w/ proposed chain/shock extras) → Phase 12 checklist 12.1–12.8; roster 7→10 weapons, 5→9 synergies; decisions 37–39; README weapon list + roadmap updated.
- **2026-08-21 — Phase 11 spec refinement 2 (docs only, no code):** Q7 resolved (N players = N Wraiths; Wraith stats get the same +33%/player ramp) + 11.13 research protocol made binding (verify real-world date BEFORE web research — standalone, non-batchable, non-negotiable; sources-cited, evidence-based, data/outcomes-driven best practices for self-hosted, fully game-state-synced web-game multiplayer servers; 100% cost-free only); decisions 35 updated + 36 added.
- **2026-08-21 — Phase 11 spec refinement (docs only, no code):** Q1–Q6 answered (A1: 33%/player on HP/damage/spawn-count; A2: leash = shared expanded vision radius; A3: picks player-scoped, passives NOT locked; A4: LAN + web play — Pages can't host WS → 11.13 research; A5: join-order corners; A6: Wand/Garlic/Aegis Blades/Pyre Lance starters) + new boss-clone request → **Q7** (one-per-player vs 1+N); checklist renumbered (11.10 boss, 11.11 solo-invariance, 11.12 gates, 11.13 web play); decisions 27 updated + 30 revised + 31–35 added.
- **2026-08-21 — Phase 11 multiplayer scope doc'd (docs only, no code):** 6 user requests (real-time multiplayer, difficulty scaling per added player, player leash, per-run weapon exclusivity, 4 characters, co-op HUD) → Phase 11 checklist 11.1–11.11 + decisions 27–30; PLAN.md §1/§2/§3.1/§3.8/§5 updated (non-goals now permit the LAN WebSocket room); open questions Q1–Q6 (ramp magnitude, leash radius, passive lock, LAN scope, corner assignment, starter weapons) await user answers; README roadmap line.
- **2026-08-21 — Doc review + state verification (docs only, no code changes):** all three gates re-run green (29/29 · 207/207 · PASS boot-sim); git state documented in Status (Phase 9 + 10.1–10.4 uncommitted since `667364f`); pending items re-verified against code; `isolate-*-v8.log` (2.6 MB V8 crash dump from a crashed node process) catalogued as a safe-to-delete artifact.
- **2026-08-21 — 10.4 multi-hit perf:** permanent worst-case bench in test-boot (`[10.4-bench]`; `DEBUG_BOOT=1` → `[10.4-sec]` section timers, ctx draw-op counters) → root causes: no viewport culling + death-frame list/grid churn (NOT the per-hit floater/`_dot`/flame-scan suspects); fixes: cull rect (`world.cullPad`) through pickups/shadows/Y-sort/particles + `_ai` dead-skip + in-place compaction. Before/after: `r:drawOne` 75.9→53.8 calls/render frame (−29%), `u:enemies` 0.069→0.057 ms/frame (−17%).
- **2026-08-21 — 10.3 mute speaker icon:** inline SVG (speaker + 3 waves; slash + `--danger` off-state, `aria-label` Mute/Unmute); also fixed a latent seed-dependent touch-stick flake (no-op `collidersNear` for the 1 s steer window — the dash test pushes the player into a seed-placed hut).
- **2026-08-21 — 10.2 exact-effect card descs:** pure `cardEffectText(kind,key,level)` (player.js); mandatory `p.card-effect` line first in every card + `p.meta-effect` on Upgrades rows; phoenix desc fixed ('…heal 10 HP every 8 kills.'); +90 logic checks (117→207).
- **2026-08-21 — 10.1 dash indicator (all envs):** `#btn-dash-hud` in `#hud-buttons` (desktop had NO indicator); same change-detected `--cd` as `#btn-dash`; clickable (`queueDash`); boot-sim asserts both `--cd` match mid-dash.
- **2026-08-21 — Phase 9 COMPLETE:** boot-sim extended (meta/Upgrades buy → maxHp 120, all 7 weapons, burn DoT, dash i-frames start+mid, synergy blight draw E2E); README updated; gates 29/29 · 117/117 · PASS.
- **2026-08-20 — Phase 10 scope doc'd (9 user requests, docs only) + Phase 9 re-verified against code (docs only; 2 resume-note errors fixed: synergy test pool, auto-pick vs synergy E2E).**
- **2026-08-20 — Phase 9 implemented:** config scalars + 3 weapon tables + `CFG.synergies`/`CFG.meta`; new `core/meta.js`; player/combat/enemies (synergy namespace, 3 weapons, DoT pipeline, 4-arg `cardOffers`).
- **2026-08-20 — Published:** public repo + Pages live (user asked private; a private repo's Pages is login-walled → public won the "share it" goal; flip-back in Status).
- **2026-08-20 — Playtest fix: `ellipse()` 6-arg boot crash** — 21 call sites gained the missing `rotation` arg; ctx stub hardened (Decision 17), negative-tested.
- **2026-08-20 — Phase 7:** boot-sim coverage (key card pick, all weapons + wand-off window, heart heal, scores/quit, touch stick + dash) — one-shots self-verify (Decision 16).
- **2026-08-20 — Playtest fix: "Start Game does nothing"** — terrain.js boot crash (1 ReferenceError + 6 TDZ self-shadow renames); new gate `test-boot.mjs` (Decision 15); spawner batch floor 1→2 (Decision 18).
- **2026-08-20 — Phase 6 COMPLETE:** `main.js` bootstrap + `tools/serve.mjs`; in-process HTTP driver caught 2 real serve bugs (traversal check, path join); serve listens unconditionally (Decision 12).
- **2026-08-20 — Phase 5 COMPLETE:** `sfx.js` (lazy ctx on gesture, bus graph, 9 recipes) + `music.js` (92 BPM D-minor loop + wind + howls — track to be replaced by 10.6); gesture hook in `startRun` (Decision 11).
- **2026-08-20 — Phase 4 COMPLETE:** `hud.js` + `screens.js` (state-poll screens, Decision 7; mute ownership Decision 8); CSS touch targets ≥72 px.
- **2026-08-20 — Phase 3 COMPLETE:** entities (player/enemies/spawner/combat/pickups/particles) + camera + lighting + game state machine (23 modules, 83 checks).
- **2026-08-20 — Phase 2 COMPLETE:** art/world/minimap modules (13 modules import-clean).
- **2026-08-20 — Full codebase review (docs only):** contracts verified; README steer/dash wording fixed; PLAN dash speed 680→690 (config is the tuning truth).

## Environment & Known Caveats

- **Shell:** Git Bash (sh) on Windows, node v24.11.0. Terminal tool: no shell substitutions (`$VAR`, backticks).
- **No Node `fetch`** in throwaway drivers (undici keep-alive → libuv teardown assert on Windows) → use `node:http` + `keepAlive:false`.
- **No argv[1]-vs-`import.meta.url` gates** in `.mjs` entrypoints (MSYS path normalization).
- **Detached server recipe:** `powershell.exe -NoProfile -Command "Start-Process -FilePath node -ArgumentList 'tools/serve.mjs' -WorkingDirectory 'D:\Apps\Qwen-Survivors' -RedirectStandardOutput 'D:\Apps\Qwen-Survivors\server.log' -RedirectStandardError 'D:\Apps\Qwen-Survivors\server-err.log' -WindowStyle Hidden"` · Stop: `netstat -ano | findstr 47893` → kill the node PID.
- **LAN IP is dynamic** (last observed 192.168.1.101) — serve.mjs prints current URLs; other local IPs are virtual adapters (WSL/ADB/VPN).
- **Runtime artifacts (safe to delete):** `server.log`, `server-err.log`, `prof-out.txt`, `isolate-*-v8.log` (V8 isolate crash dump — node process died, e.g. killed server/test; header names the node.exe build).
- **NOT verified in-sandbox:** the entire in-browser experience (render path, audio output, touch feel) — that is task 2.9. The test-boot canvas stub is browser-strict only for `arc`/`ellipse`/gradients; every other canvas method is a silent no-op.

## How to Resume a Session

1. Read `AGENTS.md`, then this file: Status → Resume Notes (active work). Architecture: `docs/PLAN.md` §3–§4. The code is the API record — read the module before changing it.
2. **Active: Phase 13 multi-level** (PLAN §3.9; A1–A8 answered; 13.1–13.3 done — begins **13.4 M03 art**; deferred items in D51 — do not build) → **Phase 11 multiplayer** (spec complete; room handshake carries the level key; 11.13 web-play research follows the binding protocol in PLAN §3.8) → **Phase 12 weapons** (flame tune + 3 new weapons + 4 new synergies) → **Phase 14 in-run shard counter** (14.1–14.3) → **10.9 optimization (LAST)** → **2.9** user browser sign-off (re-verify post-co-op) → tick 2.9 → project DONE. New scope → add to the Master Checklist first.
3. Validate with **all three gates** before any tick: `node tools/check.mjs` (baseline 30 modules) · `node tools/test-logic.mjs` (baseline 255 checks) · `node tools/test-boot.mjs` (baseline `PASS boot-sim`; flow: menu → run 1 death → meta/Upgrades buy → run 2 via `btn-start` (maxHp 120) → all 7 weapons + burn DoT + dash i-frames + synergy blight E2E → boss 4:00 → victory 5:00 → menu → M02 backdrop + m02 real run 3 (Ryū); `DEBUG_BOOT=1` → `[10.4-sec]` timers).
4. On every completion: tick + date + one-liner in the Master Checklist, update Status + this Session Log line — *before* declaring done.
