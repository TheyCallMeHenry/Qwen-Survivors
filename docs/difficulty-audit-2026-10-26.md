# Difficulty audit — 2026-10-26 (Phase 32.3; read-only analysis, home of the findings)

Why this file exists: the diagnosis and the eight candidate levers existed only in chat. Per Format contract §8 a finding is recorded once, in a file, never held in a transcript. Decision text = `docs/DECISIONS.md` **D105**; landed one-liners = PROGRESS Phase 32 rows; the code is the implementation record.

## Diagnosis (measured from this repo's config + code, 2026-10-26, read-only pass)

The user's report was "the game seems too easy". The audit's answer, in numbers:

- **Spawn pressure is flat after ~5 minutes.** The spawn interval bottoms out at 0.35 s around t≈287 s, batch size caps at 6 by t≈220 s, and the alive-enemy cap (then 200) was only reached near t≈1680 s. So minutes 5→20 of a 10–20 min run were a steady state, not a rising threat.
- **Contact damage is globally capped by invulnerability windows.** Every contact hit routes through `combat.damagePlayer`, which early-returns while `player.iframes > 0` and re-arms `hurtIframes` (0.7 s). A horde can therefore land at most ~1.4 hits per second **total**, regardless of density — swarms never burst-kill. Consequence: raw enemy HP and enemy count are WEAK difficulty levers; per-hit damage, composition, and density-vs-attention are the strong ones.
- **Enemy stats are otherwise static in a run** — base values multiplied only by the per-level `diff` (m01 1.0 / m02 1.25 / m03 1.56) and the co-op factor at spawn. No time ramp existed.
- **Sustain and kiting trivialize late runs.** Hearts at 4.5%/kill (8% when low) at 20 HP each, on thousands of kills; XP linear in level, so full build + max Coffee (−60% all weapon cooldowns) lands by roughly minute 6; player speed (base 265, all characters ≥195, plus dash) outruns the fastest foe (wolf ≤205).

Design conclusion adopted: **raise the cost of standing still and the price of mistakes, never the frequency of instant death.** The i-frame valve and telegraphed boss wind-ups stay untouched — they are what makes the genre fair.

## The eight levers (status as of 2026-10-26)

Landed in Phase 32 (D105). Values are the shipped ones.

| # | Lever | Landed as | Fun-safety rationale |
|---|---|---|---|
| 1 | Front-load mobile/ranged foes | wolf gate 120s→80s, cultist 90s→60s, all three levels; brutes left at 150s | tests positioning before the player is over-geared; every foe stays avoidable |
| 3 | Density instead of lethality | alive cap 200→280, ramp 1-per-12s→1-per-9s | the thing that actually flattened out; no new spike-deaths; no perf budget conflict found |
| 5 | Heart economy | drop chance 0.045→0.03, heal 20→15, ×0.5 after 10 min; low-HP panic valve exempt | removes free long-run sustain while keeping the recovery option |
| 7 | Dash as a finite escape | base cooldown 1.75→2.2 s; meta upgrade −8%→−6% per level | removes dodge-forever without touching invulnerability |
| 8 | Elite modifier | non-boss roll 5% at 3:00 → 15% at 15:00, held after; ×1.5 HP, ×1.3 contact damage, ×1.25 speed, ×3 XP and score; gold diamond pip tell | the ceiling lever: pressure is opt-in, elites are a targeting puzzle with a payoff |
| 2 (32.1) | Enemy base HP ×1.2 | all types, bosses included | lengthens kill-time; the audit explicitly warns this alone is weak |
| (32.2) | 5 distinct items equipped per run | `CFG.run.maxItems`, mirroring the 5-weapon rule; upgrades and synergy cards exempt | forces build commitment instead of accumulating every bonus |

**Held back (deliberately not picked; exact proposals preserved so no re-analysis is owed):**

- **Lever 2 — boss pacing:** `run.bossAt` 240→180 and `run.bossEvery` 300→240. Data-only, low risk; bosses are telegraphed and avoidable, so more of them are DPS/positioning gates rather than spike-deaths. Note it interacts with the selectable durations and the co-op N-boss rule.
- **Lever 4 — time-ramp enemy contact damage:** non-boss `dmg` ×(1 + 0.0004·t) (≈+48% at 20 min) applied at spawn, i-frames untouched. The strongest fair lever for the flat late game; pair it with Lever 5. Risk: on m03 the per-level `diff` already multiplies ×1.56 — cap the product and playtest that map first.
- **Lever 6 — superlinear late XP:** add a quadratic term past roughly level 25 to `CFG.xpNeed` so a full build + Coffee no longer lands by minute 6. Preserves agency (still leveling), but changes the level-up cadence feel and re-touches the offer-cadence tests.

## What to do with the user's playtest verdict

- **Still too easy:** escalate in order 4 → 6 → 2 (each is isolated; 4 and 5 work as a pair — sustained damage against reduced free sustain).
- **Too hard / unfair:** revert in order 3 → 5 → 1 (cap, then hearts, then gates). Never revert the i-frame behaviour or the elite reward multipliers first — they are the fairness and the fun.
- **Elites:** if the gold pip is not legible on a phone, re-tune the tell before touching the numbers; if elites feel unfair rather than demanding, lower their share ramp (config `enemies.elite.frac`) before their multipliers.
- Device truth is only ever established by the user's own phone via the published build (no real-browser run here); `?fps=1` plus the video-review method in `docs/fps-test-video-2-review-2026-10-24.md` is the tool for separating "hard" from "slow".
