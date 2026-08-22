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

**Between runs:** every run awards Soulshards (score ÷ 400, +25 for a win), tracked live by the **in-run HUD counter** (co-op: all players in the run earn the same amount — Phase 14) — spend them on the **Upgrades** screen for max HP, damage, speed, XP gain, and dash cooldown. **Level-ups:** 10 weapons (Moonbolt Wand, Wraith Garlic, Spectral Axe, Aegis Blades, Twin Fangs, Sunder Bombs, Pyre Lance, **Bow & Arrow, Snowball Launcher, Ring of Chain Lightning** — Phase 12) + 5 passives + 9 **synergy** cards — two maxed sources (weapons/passives) unlock a 5-level fused card (levels like a standard weapon) (e.g. Wand + Garlic → Blight Hex burn DoT, Pistols + Flame → Inferno Rounds; Phase 12 adds Flaming Arrows, Heart-Piercer, Blue Flame, Storm Volley).

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

- **Phase 14 — in-run Soulshards counter + unified co-op earnings (spec'd 2026-08-21, not started):** live Soulshards counter in the HUD during runs (visible in-run only, single unified display); in co-op, all active players in a run earn the same Soulshard amount; counter = live projected award (score ÷ 400, +25 victory) — no economy change. Tasks: `docs/PROGRESS.md` (Phase 14).
- **Phase 11 — multiplayer (spec'd 2026-08-21, not started):** real-time co-op for up to 4 players with synced game state, per-run weapon exclusivity (first picker owns a weapon for the run), 4 selectable characters (unique colors, themes, default weapons: Wand/Garlic/Aegis Blades/Pyre Lance), enemy difficulty scaling (+33% per added player), final boss clones per player, and a co-op-only HUD layout (corner player panels, repositioned bottom-center minimap). Spec + open questions: `docs/PLAN.md` §3.8 · tasks: `docs/PROGRESS.md` (Phase 11).
- **Phase 13 — multi-level expansion + level select (spec'd 2026-08-21, A1–A8 answered, not started):** two new unlockable arenas — **Higan** (traditional Japanese spring map, same scale as Map 01: cherry-blossom trees with falling petals (map-only), torii/pagodas/shrines, a Mt.-Fuji-esque peak, tanuki/will-o'-the-wisp/shikome/kitsune/miko enemies, Oni brute + segmented Japanese-dragon boss) and **The Drowned City** (1.5×-area underwater Atlantis: kelp forests, a glowing sunken city with fish schools, crab/goldfish/merfolk/stingrays/eels/orcas + a Great White Shark boss, small rising bubbles instead of snow/petals) — each arena ~25% harder than the previous; selected from the main menu, locked until you win the previous map 3 times (cumulative), with the locked levels' remaining requirements shown on their cards; per-level high scores, per-level music, gem tints, and a live per-level menu backdrop. Plus a zoomed-out game view on mobile (0.80 default ≈ 56% more area) + a new Pause-menu Settings (zoom + mute, replacing the old mute button). Spec: `docs/PLAN.md` §3.9 · tasks: `docs/PROGRESS.md` (Phase 13).
- **Phase 12 — weapon expansion (spec'd 2026-08-21, not started):** Pyre Lance tune (faster/farther flame stream, emission origin raised to chest height) + 3 new weapons — **Bow & Arrow**, **Snowball Launcher** (stacking slow → freeze), **Ring of Chain Lightning** (stacking shock → stun + chain burst) — and 4 new synergies (Flaming Arrows, Heart-Piercer, Blue Flame, Storm Volley). Tasks: `docs/PROGRESS.md` (Phase 12).

## Dev checks

```bash
node tools/check.mjs        # import every module in Node (syntax + top-level)
node tools/test-logic.mjs   # pure-logic assertions: RNG/math, spawner curves, XP curve, grid, cards/passives/synergies/meta, score ranking, MUSIC
node tools/test-boot.mjs    # boot + full-run sim in Node (menu→start→death→Upgrades buy→start→boss→victory)
```
