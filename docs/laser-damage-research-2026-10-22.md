# Continuous Laser — damage & feedback investigation (2026-10-22, Task 30.2)

User report: *"It seems as though damage may not be triggering/ticking upon contact between any
point along the continuous laser's beam(s). It appears to sweep over enemies with no noticeable
damage occuring to the passed-over enemies."*

Evidence harness: `unsloth-tmp/laser-probe.mjs` (Node, real `Combat`/`Player`, stub grid). No web
research was needed for this task — every claim below is a measurement from this session or a line
of this repo's code. Read-only citations: `docs/DECISIONS.md` **D21** (DoT via `dpsTick`, never
`damageEnemy` — no white flicker) and **D99** (orbit at constant angular velocity; L3 = 2nd beam
opposite, L5 = 3rd; every level-up raises orbit speed and lowers downtime).

## Findings

1. **The beam's damage math is correct — damage lands at every point along it.** L1 (`dps 34`,
   `len 240`, `w 12`), one foe parked on the ray, 60 ticks = exactly 1.0 s:
   `@30 px → 34.000`, `@120 px → 34.000`, `@230 px → 34.000` HP/s, and `+6 px past (r + w)` →
   `0.000`. The point-to-segment test in `Combat._beams` needed no fix.
2. **Real defect found (29.7 orbit rework): the orbit angle was added twice.** The fire site
   (`js/entities/player.js:489`) passes the **absolute** reached angle as `off`
   (`this._laserAng + i·TAU/count`), while `Combat._beams`/`Combat.draw` computed
   `ang = owner._laserAng + b.off` — i.e. `2×orbit + step`. Measured pre-fix, with the owner's
   orbit at 0.380 rad, the damaging beam pointed at **0.761 rad**; a foe sitting exactly on the ray
   the orbit (and the card text) implies took **0.000** damage. Consequences: the beam started at the
   wrong angle, swept at **twice** the configured `rot` (the card promises e.g. 57°/s at L1), and
   therefore spent **half** the dwell on any foe it passed.
3. **Why the report reads as "no damage": dwell, not a missing hit-test.** A sweeping beam damages
   a foe only while `perp ≤ r + w`; contact frames per crossing ≈ `2·(w + r) / (R · rot · dt)`.
   Measured one clean crossing at L1 (`dps 34`, foe `r 13`):
   - R=150 px: **11 frames / 6.23 HP** as-shipped (2× rot) → **21 frames / 11.90 HP** fixed.
   - R=230 px (near the tip): **7 frames / 3.97 HP** → **13 frames / 7.37 HP** fixed.
   A few HP with zero visual feedback on a foe with hundreds of HP is exactly "sweeps over, nothing
   happens". The fix removes the accidental 2× speed, restoring the spec'd sweep and doubling dwell.
4. **The other half of the report is the no-feedback design, not a bug.** By **D21** the sear runs
   through `dpsTick`, which deliberately sets no hit-flash and no knockback (probe confirms
   `flash=0`, `vx=vy=0` throughout). With no numbers and no flicker, correct damage is invisible.
   User ruling for this task (verbatim): *"Spark VFX approved; no flashing effects."*
5. **No per-frame `radial` assertion exists in the harness.** `tools/test-boot.mjs` prints an
   ops/frame bench line (`… radial=0.0`) and its ctx stub *counts* `createRadialGradient`; nothing
   asserts it. The guardrail still holds after this change (sparks blit a pre-baked sprite; the
   bake's gradient runs at build time) — measured `radial=0.0` on this session's boot run.
6. **Dead config keys:** `CFG.combat.laserSpeed: 720` and `CFG.combat.laserTick: 0.1` were read by
   no code (grep over `**/*.js`: only their definition site). `laserTick` also *implied* a 0.1 s
   damage tick, which the implementation never had (damage is per-frame). Removed with the finding
   noted here; the orbit rate is `CFG.weapons.laser.levels[*].rot`.

## Fix (smallest diffs, in the allowed set)

- `js/entities/combat.js` — `fireBeam` records `a0 = owner._laserAng` at fire time; new
  `beamAngle(b) = b.off + (b.owner._laserAng - b.a0)` is now the **single source of truth** used by
  both the damage sweep and the drawn beam, so they can never disagree again. `off`'s stored meaning
  is unchanged, so the existing 29.7 orbit/geometry assertions stay valid. (The owner keeps
  `_laserAng` wrapped to TAU, so the delta can jump ±TAU at the wrap; only `cos`/`sin` consume it.)
- Scorch sparks, **contact feedback only**: `this.scorchFx` (cosmetic list, same lifecycle shape as
  the 29.10 `reflectFx` / 29.12 explosion entries) is appended at the contact point from `_beams`,
  throttled per foe by `_scorchCd` — the existing per-foe cooldown-Map idiom
  (`_orbCd`/`_axeCd`/`_flameCd`) — and expired in `update`. `draw` blits the baked sprite
  additively, popping small and flaring out, rotated per-spark by a stored seed (one sprite, no two
  pops alike). No `create*Gradient`, no string building, no array literals in the draw path.
- `js/art/items.js` — `scorchSparkSprite()`: 24 px hot fleck burst (white-amber core, five unequal
  rays, three flung micro-sparks) tinted toward the beam's pink identity. Imported into the
  existing lazy `buildCombatFx` cache, so no `game.js` wiring was needed.
- `js/config.js` (rule 5) — `CFG.combat.scorchTick 0.1`, `scorchLife 0.22`, `scorchSize 16`;
  `CFG.perf.scorchCap 48` (drop-when-full, the `particleCap` idiom).
- `js/entities/particles.js` — **untouched, deliberately.** `Combat` holds no `Particles` handle and
  `game.js`'s `onFx` switch is the only bridge (frozen to the five existing kinds); adding a kind
  there was out of the writable set. The in-combat cosmetic-list + baked-sprite idiom is what
  29.10/29.12 already established for exactly this case, so extending it avoids a near-twin second
  emitter.
- Mechanics untouched: dps, `dur`, `w`, `count`, `cd` all unchanged; no `E_FLAG_FLASH`, no alpha
  change on the foe anywhere in the diff.

## Measured after the fix

- Beam angle == the reached orbit angle (`Δ = 0.000` at fire, t+0.5 s, t+1.0 s) and sweep rate ==
  `CFG…rot` exactly (`1.000 rad/s` measured for `rot = 1.0`).
- Scorch sparks: one foe held on the beam for 1.2 s → **11** sparks (≈1 per `scorchTick`; not 72),
  max 3 concurrent; 120 foes on one beam → capped at exactly **48**; all sparks gone 0.5 s after the
  beam dies; the foe's dps integral is bit-identical to a no-feedback run (`40.233 = 34×71 ticks`),
  `flash=0`, no knockback.
- Gates (this session): `tools/check.mjs` **34/34** · `tools/test-logic.mjs` **1166/1166**
  (was 1144; +22 pinned in the 30.2 block) · `tools/test-boot.mjs` **PASS boot-sim runs=4**,
  bench `radial=0.0`.

## Open items / levers for the owner

1. Sweep legibility is now governed by `rot` and `w` in `CFG.weapons.laser.levels`, not by dps: a
   correct-rate L1 still only dwells ~13 frames near the tip. If passes still feel weak, the honest
   tuning knobs are beam width (up) and orbit speed (down) — and the card text must follow `rot`.
2. `unsloth-tmp/laser-probe.mjs` is scratch (gitignored): re-run it if the laser is retuned; its
   sections A–E are the regression numbers quoted above.
3. No in-browser visual QA of the spark was performed this session (bake is unit-verified and the
   blit path is exercised by the boot battery's `P21 draw pass`). Worth a look in-game via
   `node tools/serve.mjs` → http://<LAN-IP>:47893 before shipping the feel.
