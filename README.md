# QWEN SURVIVORS

A Vampire-Survivors-style survival game. 100% HTML/CSS/JavaScript — every sprite, landscape, sound effect and musical note is **procedurally generated at runtime**. No assets, no dependencies, no build step.

## Play

Desktop:

- **Move:** `WASD` / Arrow keys — or click-drag anywhere on the canvas (mouse joystick)
- **Dash (i-frames):** `Shift` / `Space` / `K` / right-click
- **Pause:** `Esc` / `P` · **Mute:** `M`
- Level-up: `1`/`2`/`3` or click a card

Mobile / touch:

- **Move:** touch & drag anywhere on the screen (floating joystick appears where you touch)
- **Dash:** big button, bottom-right
- **Pause / mute:** top-right

Survive the Evernight Wood for **5:00**. Auto-attack, grab XP gems, level up, dodge, and face the Wraith at 4:00.

**Between runs:** every run awards Soulshards (score ÷ 400, +25 for a win) — spend them on the **Upgrades** screen for max HP, damage, speed, XP gain, and dash cooldown. **Level-ups:** 7 weapons (Moonbolt Wand, Wraith Garlic, Spectral Axe, Aegis Blades, Twin Fangs, Sunder Bombs, Pyre Lance) + 5 passives + 5 **synergy** cards — two weapons at max level unlock a fused card (e.g. Wand + Garlic → Blight Hex burn DoT, Pistols + Flame → Inferno Rounds).

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

## Dev checks

```bash
node tools/check.mjs        # import every module in Node (syntax + top-level)
node tools/test-logic.mjs   # pure-logic assertions: RNG/math, spawner curves, XP curve, grid, cards/passives/synergies/meta, score ranking, MUSIC
node tools/test-boot.mjs    # boot + full-run sim in Node (menu→start→death→Upgrades buy→start→boss→victory)
```
