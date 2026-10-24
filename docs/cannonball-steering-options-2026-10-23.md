# Cannonball input steering — options report (31.2, agent C) — 2026-10-23

**User ruling owed.** The user's note (docs/user-playtest-notes/2026-10-22_…-Notes.md, "2026-10-26 NEW NOTES", Cannonball bullet 2): movement inputs during the ball animation should make the **next bounce target the nearest enemy in the general direction of the held/most-recently-held direction — within a ~30° cone from the player** — and bullet 3: *"If you can think of a more optimal means of implementing this feature/functionality you must explain it to me and await my verdict before proceeding with any related implementation."*

Per that clause this document compares the options **before** any related implementation was made. Status now: **option (a) implemented exactly as specified** (config knob `CFG.combat.ballSteerCone`, degrees, full-cone angle; fallback = existing nearest behavior) while the user's verdict on the cone width/approach is pending — switching (a)↔(b) is a single config number, no code change.

## What "input direction" means in this code (shared by every option)

`js/core/input.js` already unifies keyboard (`axes()`) and touch stick (pointer sticks) into one movement vector; `player.update` sets `aimAng` from it every tick, including during ball-state (movement itself is ignored by design — the ball propels itself). Steering therefore needs **no new input plumbing**: the cone direction = the same held-or-most-recent movement vector (`_lastInputAng`, kept until replaced; null before any input ever → fallback). The retarget point is the ball's position at each bounce — matches "the NEXT bounce" in the spec; targets are re-picked once per bounce, never per frame.

## (a) Literal ~30° cone (implemented)

Pick the nearest reachable enemy whose bearing is within `ballSteerCone/2` (15°) of the input direction; if the cone holds none, fall back to plain nearest (current behavior).

- **Pros:** exactly the user's contract; deterministic and testable (pins: cone-enemy wins even when farther; empty cone → nearest; no input → nearest); zero ambiguity for card text/HUD explanation; the fallback keeps old behavior as the default case.
- **Cons:** hard decision cliff — a foe 16° off-axis is ignored while one 14° off is chased; with the arc's real spacing (~260 px search) a 15° half-angle is a narrow slice: inputs held slightly off the intended foe may look unresponsive.

## (b) Wider / soft-fallback cone (45–60°)

Identical code; `ballSteerCone` = 45–60.

- **Pros:** far more forgiving of where input and geometry land; keeps the "steer the ricochet" contract; the cone still does something a plain nearest can't (prefer direction over distance inside the slice).
- **Cons:** at 60°+ the cone often contains several foes, so it silently becomes "nearest within a sector" — less directional precision than the user asked for. Precision is tunable, so the only real cost is picking the number by feel.

## (c) Score-weighted selection (nearest, bonus toward input direction)

Pick `argmin(distance − weight·alignment)` (or multiply distance by `(1 − w·cosΔ)`).

- **Pros:** no cliff; gentle pull toward the input; one continuous knob.
- **Cons:** not the feature the user described — no cone exists, so "the general direction" becomes invisible in practice for a far off-axis foe vs a near on-axis one; two competing tunables (weight vs distances); pins are ranges, not decisions; harder to explain and to defend in playtest. **Rejected as primary.**

## Edge cases (handled the same in every option)

- **Player is the mover during ball-state:** movement input never moves the player (existing D96 design); it only sets the cone direction (plus the 31.2 dash-cancel). A defect seen during work — carried movement velocity drifted the ball off the impact-point rule (positions are snapped to each impact); the ball now zeroes velocity at launch so the input signal steers targeting only.
- **Touch stick vs keys:** identical — both arrive through `axes()`. A tapped/clicked stick sets the direction and keeps it ("most recently held"), matching the spec; direction never times out (deliberate: "most recent").
- **No input ever:** fallback to nearest = today's behavior (pinned).
- **Interaction with the defect fix:** candidates whose straight line is blocked by a static collider are skipped entirely (the post-menu "bounces into nothing" stall); a cone target behind a wall loses to a clear foe outside the cone.

## Recommendation

Keep **(a) exactly as the user specified** at 30° — it is implemented and pinned. If the 2026-10-26 playtest says the ball "won't take my steering", raise `ballSteerCone` toward (b) — one config number, no code change. **(c)** is not recommended as primary because the user's mental model is a cone and a weighted score can silently contradict it; it is worth revisiting only if cone edges prove frustrating in play.

**Awaiting the user's verdict** on: cone width (30 as spec'd vs 45–60), and whether (a) remains the approach at all. Implementation currently stands at option (a) = 30° full angle.
