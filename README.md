# QWEN SURVIVORS

A Vampire-Survivors-style survival game. 100% HTML/CSS/JavaScript — every sprite, landscape, sound effect and musical note is **procedurally generated at runtime**. No assets, no dependencies, no build step.

## Play

Desktop:

- **Move:** `WASD` / Arrow keys — or click-drag anywhere on the canvas (mouse joystick)
- **Dash (i-frames):** `Shift` / `Space` / `K` / right-click
- **Pause:** `Esc` / `P` · **Mute:** `M` (or Pause menu → **Settings**)
- Level-up: `1`/`2`/`3` or click a card

Mobile / touch:

- **Move:** touch & drag anywhere on the screen (floating joystick appears where you touch)
- **Dash:** big button, bottom-right
- **Pause:** top-right — **Settings** in the pause menu: view zoom + mute

Survive the **Evernight Wood** for **5:00**. Auto-attack, grab XP gems, level up, dodge, and face the Wraith at 4:00. Two more arenas unlock over time — **Higan** (a traditional Japanese spring map) and **The Drowned City** (a 1.5×-area underwater Atlantis) — each arena is ~25% harder than the previous; choose your arena from the level select on the main menu (Phase 13).

**Between runs:** every run awards Soulshards (score ÷ 400, +25 for a win) — spend them on the **Upgrades** screen for max HP, damage, speed, XP gain, and dash cooldown (the in-run HUD Soulshards counter + unified co-op earnings land in Phase 14). **Level-ups:** 9 weapons (Moonbolt Wand, Wraith Garlic, Spectral Axe, Aegis Blades, Twin Fangs, Sunder Bombs, Pyre Lance, Bow & Arrow, Snowball Launcher) + 5 passives + 5 **synergy** cards — two maxed sources (weapons/passives) unlock a 5-level fused card (levels like a standard weapon) (e.g. Wand + Garlic → Blight Hex burn DoT, Pistols + Flame → Inferno Rounds). Phase 12 expands this to 10 weapons + 10 synergies — including **Heart of Oak × Lodestone** (hearts gain magnet pull), scoped in by the user 2026-09-05 (see Roadmap).

## Levels

Three arenas, chained victory-only unlocks (win a level **3×**, cumulative — tracked in `qsurv.wins.v1`), each ~25% harder than the previous:

| Level | Scale | Unlocks after | Roster |
| --- | --- | --- | --- |
| **Evernight Wood** | 4200×3200 | — (always open) | rat, bat, goblin, wolf, brute, cultist · boss **THE WRAITH** (4:00) |
| **Higan** | 4200×3200 | 3× Evernight Wood | tanuki, hō-ōi, shikome, kitsune, miko, oni · boss **RYŪ** (4:00) |
| **The Drowned City** | 5145×3920 (1.5× area) | 3× Higan | crab, goldfish, merfolk, stingray, eel, orca · boss **THE GREAT WHITE** (4:00) |

Each level also gets its own identity: gem/heart tints, music flavor (M02 temple bell/wind-chime/taiko; M03 muffled deep + bubbles + whale song), foreground (snow / sakura petals / rising bubbles), menu backdrop, and its own high-score list. Pick your arena on the main-menu level select; locked levels show their remaining wins and can't be started until met.

## Run

```bash
node tools/serve.mjs
# → http://<your-LAN-IP>:47893   (binds 0.0.0.0 so other devices on the network can play)
```

Open in any modern browser. Audio starts after your first tap/click/keypress (browser policy).

## Project docs

- `docs/PLAN.md` — full phased plan/roadmap
- `docs/PROGRESS.md` — **living** progress tracker (updated every task)
- `AGENTS.md` — session rules for AI agents working in this repo

## Roadmap

- **Phase 22 — playtest defects round 2 + round 3 (user reports 2026-08-28 / 2026-09-04, queued before 12.3):** weapon sprite/damage visibility audit (garlic + aegis blades reported invisible in the published build), XP gems dropped in non-traversable spots (ice-pond middle etc.) pushed out to the spot's edge, M03 gem/heart color-contrast fix, **Pyre Lance damage radius aligned to its visible flame stream (DONE 2026-09-04 — flat 150)**, death→Game Over slow-mo beat **removed** (DONE 2026-09-04), and the synergy-gating surfacing fix (weighted draw so a just-completed pair surfaces immediately — DONE 2026-09-04). Tasks: `docs/PROGRESS.md` (Phase 22).

- **Phase 23 — projectile feel & Sunder Bombs rework (DONE 2026-09-04):** Bow & Arrow gains a charge-up wind-up (drawn-string telegraph) and a longer interval; Moonbolt Wand interval nudged up so cadences order **pistols < wand < bow**; Sunder Bombs blast radius ×1.5 with strong centre-origin knockback, base damage ×2, and the blast visual rescaled to actually match the damage radius; Phoenix Heart replaced in place by the **over-heal synergy** (hearts at full HP push past max up to 200% of current max HP, decaying ~1%/s, shown as a bonus segment on the HP bar). Tasks: `docs/PROGRESS.md` (Phase 23) · spec: `docs/PLAN.md` §3.14.

- **Phase 24 — visual upgrade / improvement pass (NEXT session — DEDICATED FULL SESSION, visual rework/overhaul ONLY, nothing else, per user 2026-09-05; spec pending):** full art/VFX improvement pass, including giving every synergized weapon a distinct visual identity (today blight/inferno/napalm change only stats + DoT, with no visible difference on the projectile). Tasks: `docs/PROGRESS.md` (Phase 24) · spec: `docs/PLAN.md` §3.14(6).

- **Phase 25 — comprehensive performance & optimization pass (DEDICATED FULL SESSION per user 2026-09-04; runs ahead of 10.9 and absorbs it):** framerate drops sharply the longer a run lasts, worst on mobile. Starts by profiling a long run at fixed intervals (existing bench harness) rather than guessing — enemy/gem/heart/particle loads are already capped, so this needs measurement first. Tasks: `docs/PROGRESS.md` (Phase 25) · spec: `docs/PLAN.md` §3.15(3).

- **Phase 14 — in-run Soulshards counter + unified co-op earnings (spec'd 2026-08-21, not started):** live Soulshards counter in the HUD during runs (visible in-run only, single unified display); in co-op, all active players in a run earn the same Soulshard amount; counter = live projected award (score ÷ 400, +25 victory) — no economy change. Tasks: `docs/PROGRESS.md` (Phase 14).
- **Phase 11 — multiplayer (spec'd 2026-08-21, characters respec'd 2026-08-22; 11.1–11.12 done (2026-08-22/23), next 11.13):** real-time co-op for up to 4 players with synced game state, per-run weapon + synergy exclusivity (first picker owns a weapon/synergy + its upgrades for the run), 4 playable characters — each with its own stats/theme/silhouette + unique default weapon (Wand/Garlic/Aegis Blades/Pyre Lance) — unlocked via the meta Soulshard shop (Mage default; Ranger 1500 / Warden 3500 / Swashbuckler 7500 — distinct from map unlocks), **unique character per player in co-op** (taken characters greyed-out), plus a faceless **ghost** fallback for all-starter lobbies (each such player picks from 2 unique starting-weapon offers), enemy difficulty scaling (+33% per added player), final boss clones per player, and a co-op-only HUD layout (corner player panels, repositioned bottom-center minimap). Done: zero-dep WS room on 47893, host-authoritative sync (client no-sim + interpolation), difficulty scaling, player leash, per-player level-ups + exclusivity, character select/unlocks/ghost flow/sync, per-char HUD theming, co-op minimap ~66% + PAUSE beside it (11.9), N players = N bosses (11.10), solo invariance guard — a 1P run carries no co-op overhead (11.11), final co-op gate: 3P run E2E through victory + pause-on-blur (host-only) + co-op mobile parity (11.12). Remaining: 11.13 internet transport (decided: Tailscale on the DS124 NAS — `docs/RESEARCH_FINDINGS.md`). Spec: `docs/PLAN.md` §3.8 · tasks: `docs/PROGRESS.md` (Phase 11).
- **Phase 13 — multi-level expansion + level select (spec'd 2026-08-21, A1–A8 answered, DONE 2026-08-22 — see **Levels** above):** two new unlockable arenas — **Higan** (traditional Japanese spring map, same scale as Map 01: cherry-blossom trees with falling petals (map-only), torii/pagodas/shrines, a Mt.-Fuji-esque peak, tanuki/will-o'-the-wisp/shikome/kitsune/miko enemies, Oni brute + segmented Japanese-dragon boss) and **The Drowned City** (1.5×-area underwater Atlantis: kelp forests, a glowing sunken city with fish schools, crab/goldfish/merfolk/stingrays/eels/orcas + a Great White Shark boss, small rising bubbles instead of snow/petals) — each arena ~25% harder than the previous; selected from the main menu, locked until you win the previous map 3 times (cumulative), with the locked levels' remaining requirements shown on their cards; per-level high scores, per-level music, gem tints, and a live per-level menu backdrop. Plus a zoomed-out game view on mobile (0.80 default ≈ 56% more area) + a new Pause-menu Settings (zoom + mute, replacing the old mute button). Spec: `docs/PLAN.md` §3.9 · tasks: `docs/PROGRESS.md` (Phase 13).
- **Phase 12 — weapon expansion (spec'd 2026-08-21; 12.1 DONE 2026-08-23 — post-16.3 Pyre Lance verification, no code; 12.2 DONE 2026-08-23 — Bow & Arrow #8; 12.3 DONE 2026-09-04 — Snowball Launcher #9: lobbed AoE snowball with stacking slow → brief freeze; 12.4 DONE 2026-09-04 — Ring of Chain Lightning #10: stacking shock → stun + branching chain burst, jumps scale with weapon level):** remaining = 4 new synergies (Flaming Arrows, Heart-Piercer, Blue Flame, Storm Volley) + roster sync + gates. Tasks: `docs/PROGRESS.md` (Phase 12).

## Dev checks

```bash
node tools/check.mjs        # import every module in Node (syntax + top-level)
node tools/test-logic.mjs   # pure-logic assertions: RNG/math, spawner curves, XP curve, grid, cards/passives/synergies/meta, score ranking, MUSIC
node tools/test-boot.mjs    # boot + full-run sim in Node (menu→start→death→Upgrades buy→start→boss→victory)
```
