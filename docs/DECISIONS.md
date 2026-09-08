# DECISIONS.md — Full Decision Texts

Companion to the PROGRESS.md Decisions table (Format contract §5): table rows are ≤20 words + pointer; full texts live here. Append-only numbering — decisions 1–99 keep their numbers forever. Revisions = new number + `(revises N)`.

Entries below are reconstructed from PROGRESS.md table rows + Session Log evidence (session 16, 2026-09-05). Decisions whose full text equals the table row are listed as one-liners; decisions with substantive history get their context recorded once, here.

## Foundation (D1–D26, phases 0–10)

- **D1** Vanilla ESM, zero deps, zero build step.
- **D2** Bounded world 4200×3200 + minimap.
- **D3** All audio = Web Audio synthesis; no asset files (rule 2 origin).
- **D4** Port 47893 only, bind 0.0.0.0.
- **D5** Touch steer = pointer-drag floating stick; `K` dash alias.
- **D6** Lighting = radial gradients over cached half-res canvas, stateless flicker.
- **D7** Screens = per-frame `game.state` poll; bus for transients only.
- **D8** Mute owned by `hud.js` (LS `qsurv.mute`); audio re-reads, never writes.
- **D9** `#touch-ui` behind `body.touch`; desktop dash = Shift/Space/K/right-click.
- **D10** Exactly 2 audio modules; `sfx.js` owns lazy ctx + shared graph.
- **D11** `startRun()` sets `input.gesture` (menu tap unlocks mobile audio).
- **D12** `serve.mjs` listens unconditionally (no import.meta gate).
- **D13** Touch detect = coarse ‖ ontouchstart → `body.touch`; DPR caps 2/1.5.
- **D14** Game canvas `alpha:false`; minimap raw 1× (no DPR).
- **D15** Third gate `tools/test-boot.mjs`: stubbed-DOM full-run sim in Node.
- **D16** test-boot one-shot paths self-verify (final assert on every flag).
- **D17** ctx stub validates arc/ellipse args + radii, negative-tested (born from the `ellipse()` 6-arg boot crash, 21 call sites fixed).
- **D18** Spawner batch floor 1→2 (idle player must take damage).
- **D19** Synergies = third card kind, own namespace, not in `maxWeapons`. (Level rule superseded by D40.)
- **D20** Meta = pure `core/meta.js`, LS `qsurv.meta.v1`; shards `floor(score/400)`+25.
- **D21** DoT via `dpsTick` — never `damageEnemy` (no white flicker). Canonical pattern for all status effects.
- **D22** New-weapon SFX via bus events from `combat.pulse`, tight GAPS.
- **D23** Bomb = parabolic lob → fuse pause → AOE.
- **D24** Flamethrower fuel model: fuel s, lengthy recharge, bar, per-enemy hit CD. (Fuel-bar *placement* revised by D68: beneath the player.)
- **D25** Optimization pass LAST — now absorbed by Phase 25.
- **D26** Empty card pool → auto-skip LEVELUP (level still granted); landed as 10.7.

## Co-op & characters (D27–D36, D53–D64, Phase 11)

- **D27** Co-op = zero-dep WS in `serve.mjs`; host-authoritative; Pages can't host WS.
- **D28** 4 characters + hidden ghost: unique palette/silhouette/stats/starting weapon (respec'd 2026-08-22 alongside D56–D61).
- **D29** Weapon+synergy exclusivity per run, first-pick-wins; passives never locked. Closed by 11.6b (synergy keys register in `weaponOwner`; starting weapons pre-owned for remotes; `_ownerExclusion` guards `!pl.synergies[k]`).
- **D30** Difficulty +33% per added player on HP/dmg/spawn (max 4 total).
- **D31** Leash = shared expanded co-op vision radius (`CFG.coop.leashR` 700), every player sees all.
- **D32** Level-up picks player-scoped; passives never locked; synergy follows own max.
- **D33** Corner→player assignment = join order (TL/TR/BL/BR).
- **D34** Starting weapons Wand/Garlic/Blades/Lance pre-owned; ghost = 2 unique offers.
- **D35** N players = N bosses (Q7), same +33%/player ramp; `bossCount(n)` in coop.js.
- **D36** Web-play research protocol: verify real-world date FIRST standalone; sources cited; 100% free only.
- **D53** Meta player-specific, never in sync; join handshake uploads stat profile (`joinProfile`). (Earnings clause revised by D54.)
- **D54** Unified co-op shard earnings (all active players receive the same amount, each local LS accrues it); Soulshards counter = live projected award `floor(score/400)` (+25 on victory), no economy change. (Revises D53 clause.)
- **D56** No sharing in co-op: unique chars per seat (seat-order unique), own cards, greyed-taken select.
- **D57** Per-char stats visible in select; solo uses per-char stats too. Solo invariance = no co-op overhead (11.11 read).
- **D58** Char shop: Mage default · Ranger 1500 · Warden 3500 · Swashbuckler 7500 Soulshards.
- **D59** Ghost fallback when all-starter lobby: faceless sheet + per-seat Pac-Man tint, baseline 100/×1.0/265, NO starting weapon, 2 unique starting-weapon offers per seat, never duplicated.
- **D60** Roster modularity: new chars/weapons/synergies = config + icon builder only (data-driven; the pattern Phase 21 must use).
- **D61** Select-UI research brief (sources cited), default full-screen closing on confirm. Landed as 11.6.2.
- **D62** Character roster resolved: Mage = original sprite (starter); Warden = new larger heavy-armor sprite, SLOWEST of the 4; Ranger/Swashbuckler new sprites; ghost = sheet-ghost with per-player unique Pac-Man color → in-run UI colors. Final stats: mage 60hp/×1.35/275sp · warden 150/×0.85/230sp · ranger 110/×1.0/320sp · swash 90/×1.15/300sp · ghost 100/×1.0/265sp (user-approved with 3 revisions).
- **D63** User-input documentation, capture-before-reason v4: non-denylisted substantive user message → FIRST tool call = log append to `docs/USER-INPUT-LOG.md` (verbatim, timestamped, classified); denylist match (exact-text, banner-tolerant) → never document; AGENTS.md anchor removed 2026-09-05.
- **D64** 11.13 transport = Tailscale on the user's DS124 NAS running unmodified `serve.mjs`, zero code change; players join the tailnet (research: `RESEARCH_FINDINGS.md`).

## Phase 12 roster & economy (D37–D43, D80)

- **D37** Roster → 10 weapons + 10 synergies; all Phase 11 rules apply unchanged.
- **D38** New synergies: Flaming Arrows · Heart-Piercer · Blue Flame · Storm Volley (+ heartMagnet via 12.6). Effects in `CFG.synergies`; per-synergy E2Es = 12.8.
- **D39** New statuses tick via D21 pattern (`dpsTick`, never `damageEnemy`).
- **D40** Synergy cards = 5 levels like standard weapons, scale with own level (supersedes D19 single-level).
- **D41** Synergy gating pair-specific: pool opens when the synergy's own `requires` sources max — NEVER all weapons.
- **D42** Co-op weapon cap 5−(N−1); base `maxWeapons` 5; synergies never count toward cap. Table: 1P=5, 2P=4, 3P=3, 4P=2.
- **D43** Slow/shock stacks 5 s per-stack TTL (config scalar).
- **D80** Pair-gated synergies ~unreachable at cap-5 (12.7 Monte-Carlo, 400 runs: weapons all reachable 39–48% first-pick; pair-gated synergies eligible only ≥L21, never picked 91–100%; passive-required ones 0%). **Fix decision deferred to Phase 15** — one fix owns both weapon reachability (Pyre Lance defect) and synergy reachability.

## Phase 13 multi-level (D44–D52, D55)

- **D44** Slot-based enemy roster: roles keep mechanics, levels re-skin/re-stat (`buildCharacters(levelKey)`).
- **D45** Map sizes: M02 = M01 (4200×3200); M03 1.5× area ≈ 5145×3920.
- **D46** Unlocks cumulative wins, victory-only, 3× each chained.
- **D47** Level select on main menu, locked visible + progress pips, ≥72 px.
- **D48** Zoom = camera-view factor, default 0.80 touch / 1.0 desktop (LS `qsurv.zoom.v1`); HUD/minimap stay 1×; Pause-menu Settings row replaces HUD mute button.
- **D49** M03 foreground = rising bubbles (`Snow` kind `'bubble'`).
- **D50** Per-level difficulty chained ×1.25 per step (m02 ×1.25, m03 ×1.56).
- **D51** A5 flavor approved (per-level high scores/audio/gem tints/backdrop preview/dragon tail/koi+fish schools/unlock banner/denied blip); deferred: first-clear bonus, shard multipliers, victory lines, pufferfish, keyboard select, boss intro.
- **D52** Phase order A7: 13 → 11 → 12 → last gates → 2.9 (further revised by later queue line in Resume Notes).
- **D55** Level def = single source of truth (`js/world/levels.js`); `World.generate` one seam into CFG.world.

## Phase 14–25 (D54 above, D65–D79)

- **D65** Run durations 5(default)/10/15/20/ENDLESS + boss schedule 4:00/9:00/14:00/19:00 + every 5:00 endless (spec PLAN §3.10).
- **D66** Players start runs with NO passives (weapons unchanged per D34; meta bonuses ride separate `metaHp/metaDmg/metaSpeed`). Verified + asserted in Phase 20.
- **D67** SKIP/BANISH/RE-ROLL = level-up-screen ACTIONS (not cards/items), unlocked+upgraded in meta store, max 5 uses/run each; skip → ~66% next-level XP (user) / 20% per Reroll-Banish use (wiki); reroll excludes discarded set from redraw only; banish = rest-of-run picker-scoped offer exclusion (spec PLAN §3.11, research `RESEARCH_FINDINGS.md` §7).
- **D68** Equipment icons under XP bar with per-weapon level numbers live all run; Pyre Lance fuel bar moves ABOVE → **beneath the player** (world-space; revises D24 placement).
- **D69** Extended roster backlog VERBATIM in PLAN §3.13: 9 weapons + 2 run items + 5 characters.
- **D70** Phase 16 defects: m01 snow regression (reproduce-first caught 13.4 `a8c332b`) · projectile origin feet→mid-torso (`spawnOriginFrac` 0.55; latent fix: blades/garlic never drawn) · flame reach exactly 1.33× / ≥2× flow / LEAD 0.5.
- **D71** Queue revision 2026-08-22 (superseded by README/Status queue line).
- **D72** 11.9 rescope: co-op minimap 66% size + PAUSE button only near it; mute NOT moved (already in Pause-menu Settings).
- **D73** Phase 22 defects r2 + lesson: user's test channel = published Pages build → always check publication state before auditing code.
- **D74** Card-text `fmtS`: `toFixed(2)` + strip ONE trailing zero → the formatter output IS the spec ("0.6" is correct).
- **D75** Status fixtures never init optional fields → assert `!e.burnT`, never `=== 0`.
- **D76** Blue Flame L5 freeze = `combat.freezeDur` 0.8 by design (the card must deliver it).
- **D77** Test spies on `_weapons` must pin `p.weapons` exactly (start-weapon trap: spy sees the char's starting weapon otherwise).
- **D78** Session Log append-only, newest first, written once never rewritten; PROGRESS Format contract v2 (2026-09-05).
- **D79** Storm Volley cadence counted per VOLLEY; the 4th volley carries the strike on both twin rounds.
- **D82** Phase 27 (2026-09-07): playable sheets move to `js/art/heroes.js`; `characters.js` keeps NO sheet code — the 5 legacy builders, the `player` key and roster exports DELETED, not delegating shims (grep proved no readers; boot asserts `!characters.player`). Supersedes the 26.3 sheet designs per user directive.
- **D83** Phase 17 O-resolutions (2026-09-07, adopted under the user's blanket go, documented as-is): (a) a boss event fires when its timestamp is **strictly < run end** — the 20-min run faces the 19:00 boss; the user's 15-min = exactly 3 events holds. (b) The named slots ARE one cadence: **every 5:00 from 4:00** (`CFG.run.bossAt` first + `bossEvery` 300 — data in config per tuning rule); ENDLESS streams the same cadence forever (24:00, 29:00, …). (c) Co-op: N players = N bosses **per event** (11.10 `bossCount` reused per wave). (d) Each event spawns the CURRENT level's boss (`L.boss` per-level since Phase 13). (e) ENDLESS: no victory/“DAWN BREAKS” — death-only end; score still accrues (`timeScorePerSec`) and lands in the per-level high-score list; victory bonus + win-recording N/A (`victory=false` path, unlocks unaffected). Default d5 run stays bit-identical (solo invariance; boot runs=4 unchanged).
- **D84** Phase 18 O-resolutions (2026-09-07, user binding): (a) **SKIP grants 66%** of the NEXT level's XP requirement (VS-fidelity, user's own number). (b) **Economy slow-down: all 5 existing meta-upgrade cost curves → [50,100,200,400,1000]** (user: current Soulshard economy too generous/fast). (c) **BANISH = VS-fidelity freeze**: banishing an OWNED card freezes it at its current rank for the rest of the run (no further upgrade offers); banish is by card key, per-picker, run-long offer exclusion. (d) **RE-ROLL = VS shape**: discarded set excluded from THAT redraw only (re-offerable on later rerolls of the same level-up). (e) **10 uses cap (supersedes D67's 5)**: each action locked by default (level 0); meta shop sells 10 levels — level 1 = unlock = 1 use/run, each further level +1, **max 10 uses/run/action**; tiers **[300,600,900,1200,1500,1800,2100,2400,2700,3000]**. (f) User playtest claim "1P starts at passive Lv1" — code + Phase-20 asserts prove zero passives at start (`reset()` sets `passives={}`); likely misread of the NEW-offer card's "Lv 1/5" grant label. Verified, no code change.
- **D81** Level-up offer draw = **UNIFORM sample-without-replacement** over the legal card pool (Phase 15). Every eligible card has EQUAL odds of appearing; no category is weighted (user directive 2026-09-05: "all weapons/items near-equal odds, not weighted any particular way"). `drawOffers` = partial Fisher-Yates (randomize only the first `CFG.offer.slots` positions) in `js/entities/player.js`; `CFG.offer = { slots: 3 }`. Rationale: the pre-fix weight-by-duplication coupled each card's odds to OTHER cards' counts, so passives/upgrades crowded the scarce pre-cap window unevenly per seed and specific weapons starved (Pyre Lance 34–40% never-offered). A flat draw makes each card's odds depend only on total pool size, which grows evenly as the roster expands → equal odds persist regardless of how many weapons/items exist (Phase 21 +9 weapons safe). Accepted ceiling: acquisition caps at ~cap/roster (~5/10 ≈ 45%) — within one run you can own at most `maxWeapons`; "reachable" = no systematic starvation, equal across weapons. Rejected alternatives: guaranteed-new-slot floor and synergyWeight=8 (both favor a category → violate equal-odds directive). Supersedes SYNERGY_DRAW_WEIGHT=8 (D/22.7) and the interim `newWeaponFloor`.

## Pitfalls index (test-harness traps — details live in Resume Notes while hot)

`pickCard` nulls `game.cards` at queue drain (capture key before click) · isolated probes must regrid every tick · `Math.random=()=>0` yields spread MINIMUM (pin 0.5) · pooled enemy status fields zeroed on spawn · `_nearest` steals aim · bow charge-up needs several fire passes · probe enemies aimed at center (mid-torso origin, D70).
