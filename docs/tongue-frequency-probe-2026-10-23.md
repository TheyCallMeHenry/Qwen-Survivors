# Frog Tongue frequency probe — 31.3 (agent T) — 2026-10-23

Task: verify the user's hypothesis ("the tongue doesn't fire often because enemies aren't in range")
with evidence from the real modules, and answer the drag-limits question from code.
Zero game-file changes BY THIS AGENT (rule 18: tuning below is PROPOSAL ONLY). Baseline note: the
working tree at run time already held the uncommitted 31.1/31.2 edits (loop/config/player/main/test-logic,
agents D+C); the probe measured that live tree. Spec: user notes
`docs/user-playtest-notes/2026-10-22_Qwen-Survivors_Playtesting-Notes.md` L82–84.

## VERDICT (summary)

**The user's range hypothesis is REFUTED. The real limiter is the weapon's own cooldown.**
A headless battery (90 full-Game runs, 6 seeds × 3 movement modes × tongue L1–L5, first 180 s each):

- An eligible enemy is within the 660 px tongue reach **95.8–98.4 % of every run** (idle 98.4,
  orbit 98.4, adversarial kiting 95.8 median; worst single run 91.7 %). The "no enemy" case is only
  the first ~2.9 s of the run (before `spawner.firstSpawn` + first travel).
- **attempts == fires in every single run** (90/90, diff 0). Every tick where cooldown is ready AND a
  live foe is in range actually produced a `fireTongue` call → **no hidden gate exists** beyond those
  two conditions (none found: no target-eligibility filter, no one-tongue-outstanding cap, no
  animation busy-state — see Code facts).
- Observed fire rate = **97.8–98.2 % of the pure-cooldown maximum** (60/cd s). The tongue already
  fires essentially as often as its cooldown permits: **26.7/min at L1 → 36.7/min at L5**
  (theoretical max 27.3 → 37.5).
- Cadence is NOT irregular: 82/90 runs had zero gaps >1.5×cd; the 8 exceptions were all kite-mode
  runs with 1–2 brief stalls (max gap 5.0 s). "Felt inconsistent" is not a firing-pattern defect.
- What the user actually experiences is FACT by arithmetic: L1 = one lash every **2.2 s** — the
  slowest single-target cadence in the roster (wand 0.64 s, bat 0.34 s, bow 0.68 s), and its
  level-up ladder cuts cd only 2.2→1.6 s (−27 %), weaker than peers (axe −43 %, snowball −38 %).
  INFERENCES: (a) this cd curve, not range, explains "not triggering very often"; (b) "got a bit
  better after level-ups" matches the +37 % fires/min L1→L5 measured here; (c) a player comparing it
  against concurrently-owned faster weapons would perceive it as idle most of the run — the sim
  shows it IS idle 97.4 % of ticks, by design of cd.

## Method (reproducible)

- Probe: `unsloth-tmp/tongue-freq-probe.mjs` (gitignored). Full output: `unsloth-tmp/tongue-probe-out.jsonl`.
- Commands: `"/c/Program Files/nodejs/node.exe" unsloth-tmp/tongue-freq-probe.mjs` (full battery,
  ~127 s wall) · append a seed number for a single-seed pass. (No browser, no server, no gates needed —
  zero game-file changes; `git status --short` at session start showed only user-owned untracked material.)
- Real modules under test: the FULL `Game` (test-boot / agent-C stub pattern — DOM/ctx stubs, `game.update`
  pumped at exactly 1/60), the REAL spawner (`game._spawns` → `entities/spawner.js`), REAL `Player._weapons`
  fire path (`js/entities/player.js` L607–619), REAL `Combat.fireTongue` + `_tonguePull`.
- Pins: `Math.random = mulberry32(seed)` BEFORE `startRun` (startRun consumes it for the world seed —
  boot pitfall honored). Seeds 1–6. Fixed `CFG.combat.tongueRange = 660` read live from config.
- Tongue levels 1–5 set DIRECTLY (`p.weapons = { tongue: N }`, fresh run each) — NOT via applyCard;
  stated deviation, equivalent at the fire site (both land in `W.tongue.levels[N-1]`).
- `p.gainXp = () => 0` (test-boot's own pattern) so no LEVELUP menu truncates the 180 s window.
  Verified irrelevant to spawning: `game._spawns` reads ONLY `this.t` + level tables — never player XP level.
- Player invulnerable (`hp/maxHp = 1e9`) to keep the window exact; default fresh character (mage sheet:
  speed 275, dmg ×1.35). Three movement modes: **idle** (never touches axes), **orbit** (constant
  repositioning, ~248 px/s), **kite** (always flee at full speed directly away from the nearest live foe —
  adversarial to the range hypothesis).
- Instrumentation per tick, pre-update: `cdReady` (`_tongueCd ≤ DT`, matching the decrement-then-check
  order in `_weapons`), nearest-live-enemy distance with `_nearest`'s own filter (skip `e.dead` only),
  histogram buckets; fires counted by an instance wrapper around `combat.fireTongue` that also flags any
  fire whose target was >660 px at the instant of firing (**farFires = 0 in all 90 runs** → my gate
  mirror is correct).
- Sanity (rule 12): probe exits 1 if no run ever fires; battery printed
  `# SANITY OK: total fires across battery = 8450`; per-seed first fire at t≈2.88 s every run.

## Results — medians over 6 seeds (spread = min,max across seeds)

| Mode | Level | fires/min (spread) | attempts/min | in-range % (spread) | cd-saturation % |
|---|---|---|---|---|---|
| idle | 1 | 26.67 (26.67,26.67) | 26.67 | 98.4 (98.3,98.4) | 97.8 |
| idle | 2 | 28.67 (28.67,28.67) | 28.67 | 98.4 (98.3,98.4) | 97.9 |
| idle | 3 | 31.0 (31,31) | 31.0 | 98.4 (98.3,98.4) | 98.2 |
| idle | 4 | 33.67 (33.67,33.67) | 33.67 | 98.4 (98.3,98.4) | 98.2 |
| idle | 5 | 36.67 (36.67,36.67) | 36.67 | 98.4 (98.3,98.4) | 97.8 |
| kite | 1 | 26.67 (26.33,26.67) | 26.67 | 97.4 (93.9,97.7) | 97.8 |
| kite | 5 | 36.67 (36,36.67) | 36.67 | 95.8 (94.3,96.9) | 97.8 |
| orbit | 1–5 | identical to idle | = fires | 98.4 (97.3,98.4) | 97.8–98.2 |

(full L1–L5 rows for orbit/kite in `tongue-probe-out.jsonl` MED lines; all 90 runs attempts==fires)

Nearest-eligible-enemy distance histogram (% of ticks, seed 1; consistent across seeds/modes):

| distance px | idle L1 | kite L1 |
|---|---|---|
| 0–100 | 94.4 | 79.5 |
| 100–660 | 3.9 | 14.4 |
| ≤660 total | **98.3** | **93.9** |
| 660–900 | 0.1 | 4.5 |
| >900 incl. none | 1.6 (= first 2.9 s) | 1.6 |

Why range can't gate: `spawnPoint` places every foe just outside the view edge — camera is player-
centred (1280×800 → edge ≈ 640 px + `spawnPad ≤ 15`) — so fresh spawns materialize essentially INSIDE
the 660 reach; chasers converge in seconds. Only screen-corner diagonal spawns briefly exceed 660.

Inter-fire gaps: max gap over 180 s was exactly ≈cd in 82/90 runs; kite outliers max 3.1–5.0 s
(1–2 stalls per that run). longGaps(>1.5×cd) total across battery: 11, all in kite mode.

## Code facts (targets of the probe's hypotheses)

- Fire gate (`player.js _weapons`, L607–619): `if (this._tongueCd <= 0) { const e = this._nearest(enemies, CFG.combat.tongueRange); if (e) { fireTongue(...); this._tongueCd = S.cd * this.cdMul; } }`
  → ONLY two conditions: cooldown expired + nearest live enemy ≤ 660 px.
- Eligibility filter (`_nearest`, L654+): skips `e.dead` ONLY. No boss/fly/ranged/size filter, no
  "already has a tongue out" cap, no animation gate (`_tongueFx` is a 0.18 s visual timer; it never
  blocks firing). Cooldown counts down even off-range, so an off-range stall never compounds.
- `Combat.fireTongue` (L317–332): damage → if that killed a NON-BOSS: heal `min(15, 2 + 0.06×maxHp) × gutFeastMul`
  and RETURN (dead foes are not dragged) → else poison channel + `e.drag = {owner, t: 0.4}` +
  `e.holdT = 0.4` (AI pinned, like freeze/web hold). `_tonguePull` (L756–775): linear
  distance÷remaining-time schedule, lands the foe exactly on the owner at t=0; NO max-distance or
  travel-speed cap (a 650 px latch drags fully home — also pinned by the 30.3 test-logic battery).
  No CFG gate on which enemy may be dragged exists anywhere (`grep` of weight/mass in js/ = zero fields).
- In-run boss observation (supplementary, 3 seeds, L3, 290 s): wraith wakes at 240 s; it was within
  660 px **99.2–100 %** of its alive time (min distance 117–128 px) yet the tongue picked it **0 times**
  in 3/3 runs — `_nearest` always found a swarm minion closer. FACT (measured); INFERRENCE: users will
  essentially never see the tongue drag a boss in a normal crowded run, though nothing excludes it.

## Drag limits — the answer to the user's question (from code + verified by real-module matrix)

All 9 enemy types were spawned 500 px from a player using the REAL `Enemies`/`Combat`/`Player`
modules; results identical for every type: latch armed (`e.drag` + `e.holdT`), pull landed the foe
on the player (min distance 0 px), AI pinned during the 0.4 s pull, resumes right after.

| Enemy | Dragged by tongue? | Eaten (heal) if killed by the lash? |
|---|---|---|
| Rat, Bat (flying), Goblin, Wolf | YES — pulled fully home regardless of speed/size | YES — heals 2 + 6 % of its max HP (capped 15) |
| Brute (big tank) | YES | YES (heal hits the 15 cap) |
| Cultist (ranged shooter) | YES — its keeping-distance behaviour is overridden; its shots are suppressed during the 0.4 s pull | YES |
| Wraith / Ryu / Shark (bosses) | YES — bosses are NOT immune; the pull drags even a boss onto you | **NO — the ONLY boss exclusion: bosses are never eaten, so no heal from them** |

There is NO weight/size/boss/ranged gate on the drag itself; the only size/HP-dependent rule is the
eat-heal (non-boss only; `tongueHealK 0.06`, `tongueHealCap 15`, Gut Feast ×1.25–2.5). On a grab the
foe just stops its own AI (freeze-like hold) and walks a straight line to you in 0.4 s. If the initial
damage kills the foe, no drag happens (nothing to drag) and the heal rule above applies.
(Noted for docs hygiene: the in-game hold tell draws a "pale silk X" over dragged foes — same visual
as Web-slingers; users may read tongue-drags as webs. Not a defect.)

## PROPOSALS (not applied — rule 18; all live in `js/config.js`, rule 5)

The data shows the deficiency is the cooldown curve, not reach. Options, with measured expected effects
(fires = 60/cd × 97.8 %, verified):

- **A (recommended): retune the cd ladder to peer cadence — `tongue.levels[].cd: 2.2,2.05,1.9,1.75,1.6`
  → `1.6,1.45,1.3,1.15,1.0`** (same 5-step linear shape, matches the snowball curve). L1 fires 37.5/min
  (+41 % vs today), L5 60/min (+63 % vs today); level-ups stay visibly rewarding. Side effect: eat-heal
  throughput scales up to ~+63 % → toad sustain buffs; dmg/s also rises (lash cadence × same per-hit dmg)
  — needs the user's balance sign-off.
- B: keep L1 (2.2 s), steepen growth: `2.2, 1.9, 1.6, 1.3, 1.0` → "starts slow, becomes a chain" —
  directly targets the user's "got a bit better… still inconsistent" arc; max +125 % at L5.
- C (no numbers): leave cd, shorten `tonguePullDur` or the 0.18 s fx — rejected: neither affects
  frequency (measured: fires never wait for the animation).
- Do NOT touch `tongueRange` (660): in-range time is already 95.8–98.4 %; more reach buys <5 % more
  firing ceiling — the 30.3 2.75× change already solved any real range issue.

Recommendation: A (or B if the user wants progression to carry the fantasy). Either changes card stat
lines automatically (WEAPON_STATS derives from CFG) and needs test-logic asserts re-verified (they
derive from CFG — no pin edits expected).

## Could NOT be measured

- Co-op / multi-player runs (tongue vs pack leash dynamics).
- Levels m02/m03 spawn tables (probe used m01, the default new-player level).
- A real human's movement (dash weaving, menu-pause rhythms) — substituted by idle/orbit/kite; kite is
  the adversarial upper bound on the range hypothesis.
- Whether the user actually held other, faster weapons during the same runs (offer history not recorded
  in the notes) — relevant only to the perception inference above.
- Whether boss-grabs happen in dense-late situations with no closer minion — 0/3 observed, but the
  matrix proves it is possible when the boss IS the nearest live enemy.
- The cultist's shot suppression during a hold was not forced (single-foe window shorter than its
  1.0–2.5 s shot cd); the suppression itself is a code fact (`enemies.js _ai` locked branch L129–130).

## Reproduce

```sh
"/c/Program Files/nodejs/node.exe" unsloth-tmp/tongue-freq-probe.mjs            # full battery (~127 s)
"/c/Program Files/nodejs/node.exe" unsloth-tmp/tongue-freq-probe.mjs 1         # one seed + matrix
```
