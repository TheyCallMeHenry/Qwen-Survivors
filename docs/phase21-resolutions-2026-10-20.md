# Phase 21 — 21.1 O-resolutions proposal (2026-10-20, session 38)

Status: **PROPOSAL — pending user go (rule 18).** No code edited yet. Approve as-is, or name changes; then 21.2–21.6 implement from these tables verbatim. Every number below is my recommendation, grounded this session in: config.js (existing stat ladders L88–316, characters L47–53, enemies L332–342), player.js card pipeline, combat.js primitives, sync.js 37-slot layout (SNAP_V 6), coop.js `leashClamp` (L222, host-side, runs after `_playingUpdate`'s player updates), and test pins (test-logic L164/1305/1310/1323/2458; test-boot footprint pin L204–210, g2 E2Es).

D91 honored throughout: 9 starter weapons pairwise distinct AND distinct from current starters (wand/garlic/bow/pistols): **wolf, boulder, bat, tongue, gatling** — zero collisions. Zero starting passives (D66) untouched.

## A. Resolved open calls (mechanics design) — USER-APPROVED 2026-10-20 (session 38, two amendments folded in)

1. **Starter re-tool (user ruling, amends doc rev-1):** **Gunslinger → Twin Fangs** (spec original), **Swashbuckler → Sunder Bombs** (was Twin Fangs per D93 — user chose to re-tool the other side). D91 distinctness over 9 order chars: wand/garlic/bow/**bombs**/pistols/wolf/boulder/bat/tongue ✓. Gatling keeps no starter (acquisition pool only). Werewolf→Wolf, Golem→Boulder, Baseball→Bat, Toad→Tongue: confirmed per spec.
2. **Items = new entries in the PASSIVE pool (user ruling: "same type as existing heart, magnet, etc.").** `CFG.passives.shield` / `.skates`, max 5 levels each, amber passive plate, existing first-picker-wins exclusion covers them (D91 passives locked). No new card kind, no items dict — `player.passives.shield/skates` + level-table behavior lookups (`levels` array on the def; `_passiveEffect` + `recomputeStats` special-case the two). Passive snap slots 5→7.
3. **Cannonball × co-op leash:** rely on the existing host-side `leashClamp` — the impulse resolves inside `player.update` and `_coopLeash` runs after it in `_playingUpdate` (host-authoritative), so an over-leash impact is pulled back with zero new wire code. Solo: no clamp (today's invariant). Accepted risk: impact point can be leash-adjusted post-hit in co-op — cosmetic edge case, no desync (positions always ride SNAP_V).
4. **Boulder auto-kill size class:** `r ≤ 12` non-boss = **rat + bat** (r 11/11; goblin/cultist 13 excluded). One config knob `CFG.combat.boulderSquishR: 12`.
5. **Wolf companion co-op:** host-simulated (host runs all entity sim); per-owner state (max 4 owners) streams in a snapshot tail → **SNAP_V 6→7** anyway (items + 19 weapon slots also re-layout it). Companion is unkillable (spec silent; simplest truthful model), leashed at `CFG.combat.companionLeash: 192` px (≈3 character spans of ~64 px sheet width), pounce cd hard-fixed 2.0 s (spec MUST).
6. **Weapon cap stays 5** (`maxWeapons`, co-op 5−(N−1) D42 unchanged). Note honestly: at 19 weapons the equal-odds acquisition rate per weapon drops (~26% of pool); raising the cap is a balance change with co-op-slot ripples — recommend NOT now.
7. **D60 truth caveat:** "no pipeline/sync code changes" held for weapons that reuse existing projectile primitives. All 9 new weapons need a new combat primitive (shell/beam/companion/boulder/web/gatling-mag/melee-arc/tongue-pull/player-ball) — same data-driven spirit (config table + card text + icon + fire-site branch), but honest scope: new mechanics code in combat.js/player.js + SNAP_V 7.
8. **Tank-defense call (logged 2026-10-20):** ship **Mirror Shield exactly as spec'd**; no dedicated shield weapon this phase (not in the VERBATIM backlog); Warden starter unchanged (Blades swap stays unmade). A dedicated tank weapon = a future spec'd phase, not Phase 21.

## B. New weapons — 5-level tables (key = CFG.weapons key, icon key same)

All fire from `_spawnY()` mid-torso (16.2); ranges via `_nearest` unless noted. `dmg` values pre-`dmgMul`.

1. **Tank Cannon `cannon`** — shell flies straight at nearest; on 1st enemy: full dmg, pierces through; on 2nd: dmg + terminates in AoE blast (blast dmg = `dmg × CFG.combat.shellBlastK 0.5` in `blastR`). `{ cd, dmg, blastR }`
   L1 {2.6, 90, 70} · L2 {2.4, 115, 76} · L3 {2.2, 145, 82} · L4 {2.0, 180, 88} · L5 {1.8, 225, 95}
2. **Continuous Laser `laser`** — sustains beam along aim for `dur` then idles `cd`; hits ALL enemies within `w` px of the segment (len `px`, medium-range); dps ticks via D21 `dpsTick`. `{ cd, dur, dps, len, w }`
   L1 {5.0, 1.2, 34, 240, 12} · L2 {4.6, 1.3, 42, 250, 12} · L3 {4.2, 1.4, 52, 260, 14} · L4 {3.8, 1.5, 64, 270, 14} · L5 {3.4, 1.6, 78, 285, 16}
3. **Wolf Companion `wolf`** — spawns companion (reuses `characters.js` wolf sheet verbatim); stays ≤192 px of owner, autonomous pounce on nearest enemy, ≥2.0 s between pounces (fixed), high single-target dmg + **bleed** DoT (new enemy field pair `bleedT/bleedDps`, D21 pattern). Levels grow dmg/bleed only. `{ dmg, bleed, bleedDur }`
   L1 {30, 8, 3.0} · L2 {38, 10, 3.0} · L3 {48, 13, 3.0} · L4 {60, 16, 3.2} · L5 {75, 20, 3.5}
4. **Rolling Boulder `boulder`** — cardinal-only (dominant axis of nearest at release); one on screen (spec MUST); each hit ×0.75^hitCount (`CFG.combat.boulderDecay`); max 6 hits then crumble particles; squish-kill `r ≤ 12` non-boss. `{ cd, dmg }` (+fixed knobs decay/maxHits/squishR in CFG.combat)
   L1 {7.0, 70} · L2 {6.5, 90} · L3 {6.0, 110} · L4 {5.5, 130} · L5 {5.0, 155}
5. **Web-slingers `webs`** — strand projectile, bursts AoE radius `r` on target; **hold** status (new `holdT`, freeze-like movement stop) `s`. `{ cd, dmg, r, hold }`
   L1 {1.6, 18, 90, 0.7} · L2 {1.5, 24, 96, 0.8} · L3 {1.4, 31, 102, 0.9} · L4 {1.3, 39, 110, 1.0} · L5 {1.2, 48, 118, 1.2}
6. **Gatling Gun `gatling`** — magazine: 40 rounds at `shotCd`, then `reload` 3.0 s (both spec-fixed); spread shrinks, dmg grows; aims nearest each shot. `{ shotCd, dmg, spread }` (burst/reload fixed knobs in def)
   L1 {0.075, 4, 0.16} · L2 {0.075, 5, 0.14} · L3 {0.070, 6, 0.12} · L4 {0.065, 7, 0.11} · L5 {0.060, 9, 0.10}
7. **Baseball Bat `bat`** — melee arc forward (range ~62 px, arc ~100°), near-instant cadence, very high knockback (×`kbK` on enemy kb impulse); Homerun: 1-in-`homerun` (500 fixed, CFG knob) 1-hit-KO non-boss + firework particle burst over player head (visual-only, no damage). `{ cd, dmg, kbK, arcDeg }`
   L1 {0.40, 26, 3.0, 100} · L2 {0.36, 31, 3.0, 100} · L3 {0.33, 36, 3.5, 105} · L4 {0.29, 41, 3.5, 105} · L5 {0.26, 48, 4.0, 110}
8. **Frog Tongue `tongue`** — lash (range 240): on hit deal dmg, apply **poison** DoT (new `poisonT/poisonDps`, D21), drag target to player over 0.4 s; if the initial tongue damage kills (non-boss), player eats it: heal `min(15, 2 + 0.06 × maxHp)` (size/max-HP-determined, spec). `{ cd, dmg, poison, poisonDur }`
   L1 {2.2, 34, 4, 3.0} · L2 {2.05, 44, 5, 3.0} · L3 {1.9, 56, 6, 3.2} · L4 {1.75, 70, 8, 3.4} · L5 {1.6, 86, 10, 3.5}
9. **Cannonball `ball`** — player tucks into ball, propels at nearest at 620 px/s, invulnerable whole dash (i-frames), position ends at impact; bounces `hits−1` additional nearby enemies, each ×0.9^ (fixed decay); max 6 hits (spec); cd **10.0 s fixed at every level** (spec). `{ dmg, hits }`
   L1 {60, 2} · L2 {72, 3} · L3 {85, 4} · L4 {97, 5} · L5 {110, 6}

## C. Items-as-passives — 5-level tables (keys added to CFG.passives; `levels` array instead of scalar `val`)

1. **Mirror Shield `shield`** — passive-radius item: enemy orbs (`enemies.orbs`) entering `r` are reflected (velocity reversed, now ally-side: combat checks reflected orbs against enemies); charge bank **3 per window** (3 spec-fixed; window shrinks with level). `{ r, window }`
   L1 {130, 5.0} · L2 {145, 4.5} · L3 {160, 4.0} · L4 {175, 3.5} · L5 {190, 3.0}
2. **Ice Skates `skates`** — +`spd` movement multiplier; on input-release, deceleration ×`glideK` (DOOM-style slide; accel while steering unchanged); while sliding (no input, speed >200) brushing an enemy deals `slideDmg` to BOTH (spec, cap 6 at max) with a per-enemy 0.5 s re-hit lock. `{ spd, glideK, slideDmg }`
   L1 {0.05, 0.35, 2} · L2 {0.075, 0.30, 3} · L3 {0.10, 0.25, 4} · L4 {0.125, 0.20, 5} · L5 {0.15, 0.15, 6}

## D. Characters — 5 new (CFG.characters entries, order appended after swash; ghost stays last/out as today)

Unlock ladder extends D58 (1500/3500/7500):

| key | name | weapon | cost | hp | dmg | speed | accent | archetype |
|---|---|---|---|---|---|---|---|---|
| baseball | Baseball Player | bat | 5000 | 120 | ×1.10 | 285 | #f06543 | bruiser: high knockback control |
| werewolf | Werewolf | wolf | 7500 | 110 | ×1.05 | 305 | #c084fc | fast striker w/ autonomous pack |
| golem | Stone Golem | boulder | 10000 | 190 | ×0.90 | 195 | #9aa7b8 | slowest juggernaut (warden+1 tier) |
| toad | Giant Toad | tongue | 12500 | 140 | ×0.95 | 240 | #7ed957 | sustain tank — eats foes to heal |
| gunslinger | Wild West Gunslinger | pistols | 15000 | 85 | ×1.20 | 295 | #d9a066 | glass-cannon duelists' twin sides |

Each = one CFG row + one `xFrame`/sheet builder in heroes.js (`mkSheet` contract, new footprints; existing-5 footprint pin stays untouched) + new footprint rows in test-boot. Shop/select UI is data-driven (`CFG.characters.order`), no screens.js work beyond the pin rebases.

## E. New synergies — 5 (5-level each, same gating pattern: both `requires` at max)

| key | name | requires | levels |
|---|---|---|---|
| heShell | Shells of Perdition | cannon+flame | blasts ignite: { dps 12→30, dur 2.5→3.5 } |
| staticPelt | Static Pelt | wolf+ringLightning | pounce adds 1 shock stack + chain burst { jumps 2→6 } |
| homerKing | Homerun King | bat+bow | Homerun odds 1-in-{250→50} |
| gutFeast | Gut Feast | tongue+hp (passive) | eat-heal ×{1.25→2.5} |
| avalanche | Avalanche | boulder+snowball | boulder hits add {1→2} slow stacks, +{0→30} dmg |

D80 caveat (restated): pair-gated synergies are already ~unreachable at cap-5; 19 weapons makes them rarer. These five are thematic bait, not economy. If you want reachability fixed, that's a separate design call (e.g. requires-at-L3) — not folded in here.

## F. Wire/HUD/pool integration (implementation surface for 21.2–21.6)

- **sync.js:** SNAP_V 6→7; layout = [0..8] core · [9..27] 19 weapons · [28..34] 7 passives · [35..49] 15 synergies · [50..52] actLeft · [53..68] 4× companion tail (x, y, state, anim — 4 slots/owner). `unpackState` plen recomputed from the key tables. Wire-compat note: new+old clients can't mix (same-tree LAN — acceptable, single serve.mjs deployment).
- **player.js:** `items` dict + per-weapon CD fields; `_weapons()` branches ×9; skates physics in `update`; cannonball player-state ball mode in `update` (input locked, i-frames, collider pass still runs); `cardOffers` 4th pool (items, cap 2, D91 exclude/banished honored); `applyCard` item branch; `WEAPON_FIELDS` ×9 + `ITEM_EFFECT` + 5 `SYNERGY_EFFECT` rows; `recomputeStats` skates spd into `speedMul`.
- **combat.js:** new primitives `fireShell / laserTick / companionStep / fireBoulder / fireWeb / (gatling state in player) / batSwing / fireTongue / ballDash`; bleed/poison/hold fields + expiry in enemies.js pooled reset; Mirror Shield step over `enemies.orbs`; Homerun + fireworks via particles; D21 dot channels only.
- **game.js:** `pickCard`/`_remoteLevelUps` register level-1 item-passive picks in `itemOwner` (passive path already does this per D91); `_applyChar`/`_coopStartRun` pre-own the 5 new starters; `_coopStartRun` companion ownership; equip-row lookups unchanged (passives already in the lookup).
- **icons:** 16 new `buildIcons()` keys (9 weapons, 2 item-passives on the amber passive plate, 5 synergies); test-logic icon-name invariant auto-covers CFG names.
- **test rebase (known pins):** test-logic L1305 order.length 4→9 (chars, ghost aside) · L1306 cost asserts +5 · D91 distinct-starter L1310 auto-covers 9 · L164 5-level guard auto-covers 19 weapons + new item-levels guard (+) · icon invariant L479 auto · boot footprint pin L204–210 keeps existing 5 + new 5 rows · per-weapon + per-synergy boot E2Es (g2 pattern) ×14 new · D91 exclusion block covers item kind (+) · 11.6b pre-ownership ×5 new chars.
- **README:** L22 "10 weapons … 10 synergy cards" → 19 weapons / 2 items / 15 synergies; L67 chars 4→9 + new cost ladder.

## G. Slice plan (strictly serial, rule 19; gates after every slice)

1. Config tables + knobs (B/C/D/E verbatim) + `maxItems`.
2. Combat primitives + status fields (bleed/poison/hold) + companion entity.
3. Player fire-sites + items physics (skates) + cannonball ball-state.
4. Sync SNAP_V 7 + itemOwner/companion ownership + HUD lookups.
5. Icons ×16 + PLATE.item + card text tables + cardOffers/applyCard item pool.
6. heroes.js ×5 sheets + character CFG rows (D-section) + shop/select verify.
7. Tests: rebases + new per-content E2Es; three gates (check/test-logic/boot) green at each slice boundary.
8. Docs sync (PLAN §3.13 completion notes, DECISIONS D94+, README, PROGRESS) + 21.x checkboxes.
