# QWEN SURVIVORS — Progress Tracker

## Format contract (v2 compact, 2026-09-05; rework per user directive · compressed pass 2026-09-06 session 27b)

Rules for every future edit — this file is loaded at every session start; its size is the recurring cost.

1. **One home per fact.** Completed work is recorded in **exactly one place**: a ≤2-line checklist line (what landed + gate counts). Implementation narrative → the Session Log entry for that session (and after ~3 sessions, delete the narrative from the checklist line — this file is not an archive). Decisions/pitfalls/rationale → `docs/DECISIONS.md`. Verbatim user messages → `docs/USER-INPUT-LOG.md`. Nothing durable lives only in Resume Notes.
2. **Resume Notes = live state only:** ≤25 lines, rewritten (not appended) every session. History in it is a bug — move it to the owning home first.
3. **Session Log = append-only (D78), newest first,** each entry **≤10 lines**, written once, never rewritten. A session that needs more room writes it in its own commit message, not here.
4. **Status ≤6 bullets:** one-line active phase · gates baseline · git/Pages state · server state. Pointers to the Decisions table, never re-explanations.
5. **Decisions are data (D78-safe):** decisions 1–99 keep their numbers forever (open phases reference them); full texts AND the row index live in `docs/DECISIONS.md` only — the old PROGRESS row table was retired there 2026-09-06; this file carries no decision rows. Revisions: new number + `(revises N)`.
6. **Environment caveats → `docs/ENV.md`** — one line, never re-narrated here.
8. **Review-only findings are recorded ONCE** (user directive 2026-09-05, after a token cliff lost session 13's unrecorded 12.7 numbers): the finding goes straight into the checklist step line or a new decision row — never held only in chat. Disposable sims live in gitignored `unsloth-tmp/`.
7. Target: **this file ≤150 lines.** If it grows past that, compress on sight (never by deleting a durable fact without moving it first).
9. **Overflow home (2026-09-06 compression pass):** narrative compressed OUT of this file moves verbatim to `docs/ARCHIVE.md` — never delete a durable fact outright. Snapshot semantics: steps still open remain authoritative in this file only.

## Status — 2026-09-07


- **Active: none — Phase 25 + Phase 27 COMMITTED & PUBLISHED to Pages (user ask, session 29, 2026-09-07).** Feature queue next: **17 → 18 → 14 → 21 → 2.9** (leftovers: 11.13 NAS-side, 22.8 device repro).
- **Gates (green on the Phase-27 tree, session 28):** `node tools/check.mjs` **34/34** · `node tools/test-logic.mjs` **694/694** · `node tools/test-boot.mjs` **PASS boot-sim runs=4** — `[10.4-bench]` radial=0.0, drawImage 784.4.
- **Git:** Phases 25+27 committed on `overnight-2026-08-22`, ff-merged → `main` + pushed = Pages build updated (hashes in Session Log / Resume Notes below).
- **Server:** DOWN (port 47893 not listening, re-checked session 27); recipe in `docs/ENV.md`.

## Master Checklist

Completed phases = one line each; full step detail lives verbatim in `docs/ARCHIVE.md`.

- [x] **Phases 0–8** (2026-08-20) — scaffold/docs · core engine (fixed 60 Hz loop, input, config, math/bus) · procedural art + world/minimap · entities/gameplay (7 enemy types + Wraith, burn/blight, half-res lighting) · UI/HUD · Web Audio (lazy ctx, mute persist) · integration/launch (`serve.mjs` 47893) · boot-sim hardening · publish (repo `03eeac2`, Pages live)
- [x] **Phase 9** (2026-08-21) — 7-request pass: vision ×3 (`lighting.playerR` 510) · knockback→33% · 5 synergies + `cardOffers` · `core/meta.js` + Soulshards + Upgrades · minimap +25% · full dash i-frames · Twin pistols / Sunder bombs / Pyre Lance

### Phase 10 — Post-playtest polish (done 2026-08; 10.9 absorbed into Phase 25)
- [x] 10.1–10.8 dash indicator `--cd` · exact-effect card text (`cardEffectText`) · SVG mute icon · viewport culling + in-place compaction with **permanent `[10.4-bench]`** counters · spawn band outside view edge · music remake (66 BPM eldritch D-dim7) · empty-pool auto-skip LEVELUP (softlock fix) · gem pickup SFX
- [ ] 10.9 Game-wide optimization pass — **absorbed into Phase 25** (D-approved 2026-09-04)

### Phase 11 — Multiplayer & co-op (11.1–11.12 DONE 2026-08-22/23; 11.13 impl = NAS-side, D64)
- [x] 11.1–11.12 zero-dep WS room in `serve.mjs` · host-authoritative sync (`sync.js` SNAP_V, clients interp; meta never synced D53) · difficulty +(33%×added players) incl. boss · leash 700 + co-op light = leashR · first-pick weapon/synergy exclusivity, cap 5−(N−1) (D42) · 4 characters + ghost fallback + Soulshard shop + greyed-taken select (D56–D62) · starting-weapon pre-ownership closure (11.6b, solo-invariant) · corner seat panels (seat 0 TL = solo invariance) · per-char `--char*` theming · co-op minimap ~66% + PAUSE (D72) · N players = N bosses · solo-invariance guard · final gate: 3P pumped to VICTORY + host-only pause-on-blur + mobile parity
- [ ] 11.13 Web play **implementation** — transport DECIDED = Tailscale on DS124 NAS running unmodified `serve.mjs` (D64; research + sources: `docs/RESEARCH_FINDINGS.md`). NAS-side steps need the user's NAS access
- Deferred (NOT approved — do not build without asking, D51): first-clear shard bonus · per-level shard multipliers · per-level victory lines · pufferfish skin · keyboard 1/2/3 select · boss intro moment

### Phase 12 — Roster 7→10 weapons, 5→10 synergies (COMPLETE 2026-09-05)
- [x] 12.1–12.8 Pyre Lance verification (closed via 16.3) · Bow #8 · Snowball Launcher #9 (lob-burst AoE, slow stacks→freeze; `applyPlayerSnap` derived-offset fix) · Ring of Chain Lightning #10 (shock stacks→stun + greedy-nearest chain) · status pipeline complete (slow/freeze/shock/stun, 5 s per-stack TTL D43) · 5 new synergies live (flamingArrows · heartPiercer · blueFlame L5-freeze · stormVolley 4th-volley both-rounds · heartMagnet), SNAP_V 4→5 / 34 slots · card-pool Monte-Carlo review (D80: pair-gated synergies ~unreachable at cap-5) · per-synergy boot E2Es on isolated g2

### Phase 13 — Multi-level expansion (COMPLETE 2026-08-22; spec PLAN §3.9)
- [x] 13.1–13.13 `js/world/levels.js` single-source level defs (`generateWorld(seed, levelKey)`, m01 goldens) · Higan (m02, ×1.25, Oni + Ryū) · Drowned City (m03 1.5× area, ×1.56 chained, Great White) · unlock chain = 3 cumulative wins chained (LS `qsurv.wins.v1`) · level select + locked-card progress/denied blip · zoom 0.80/1.0 + Pause Settings (D48) · per-level scores/flavor tints/unlock banner/audio (muffle lowpass)

### Phase 14 — In-run Soulshards counter + unified co-op earnings (queued after 21)
- [ ] 14.1 In-run counter: live projected award `floor(score/400)` (+25 victory) — no economy change (O1=A); state-gated visible-during-runs-only; change-detected DOM
- [ ] 14.2 Unified co-op earnings: one run-level total from host sim, every client accrues in full locally (D54 supersedes D53 earnings clause; meta stays player-specific)
- [ ] 14.3 Gates: test-logic pure helpers + boot solo/co-op E2E

### Phase 15 — Level-up offer coverage DEFECT (COMPLETE 2026-09-05; user playtest 2026-08-22)
- [x] **Phase 15 COMPLETE 2026-09-05 (D81)** — offer-coverage defect: root cause = cap-fill hard-stop DOMINANT (at cap 5, P(new-weapon offer)=0%; 81% of a run's level-up steps happen at cap) + 3-of-N dilution below cap; fix SHIPPED = **uniform sample-without-replacement** (`drawOffers` partial Fisher-Yates in `player.js`; `CFG.offer={slots:3}`) — offer-in-run spread 60–86% (Pyre Lance 34–40% never-offered) → 61–66% equal; acquisition 41–47% = irreducible cap-5-of-10 ceiling. Detail: `docs/ARCHIVE.md`

### Phase 16 — Playtest defects (COMPLETE 2026-08-22)
- [x] 16.1–16.4 m01 snow regression repro-first then arc restored as v1.0.0 · spawn origin feet→mid-torso (`spawnOriginFrac` 0.55; latent fix: blades/garlic were NEVER drawn) · Pyre Lance reach exactly 1.33× (speed 2× + life trim, LEAD 0.5), seeded A/B bit-exact · gates + co-op invariance (no projectile key on wire)

### Phase 17 — Selectable run durations & boss schedule (spec PLAN §3.10, D65; queued after 15)
Durations 5(default)/10/15/20/ENDLESS; bosses at 4:00/9:00/14:00/19:00 + every 5:00 endless.
- [ ] 17.1 O resolutions (user confirm: 20-min 19:00, ENDLESS slots-vs-cadence, co-op N-bosses/event, ENDLESS victory/high-score) + `CFG.run.durations` + spawner tail past 5:00
- [ ] 17.2 Menu duration select (≥72 px, per-level persistence, default = current behavior)
- [ ] 17.3 Run machinery: victory at duration; boss events per schedule; ENDLESS count-up HUD
- [ ] 17.4 Gates: table asserts (5→[240], 10→[240,540], …) + boot E2E (10-min two bosses; ENDLESS past 5:00 no victory; 5:00 default bit-identical)

### Phase 18 — Level-up actions SKIP / BANISH / RE-ROLL (spec PLAN §3.11, D67; research `RESEARCH_FINDINGS.md` §7; queued after 17)
Screen actions (NOT items/cards/level-able); unlocked + upgraded in the meta store, max 5 uses/run each.
- [ ] 18.1 O resolutions: skip-XP ratio · banish granularity/owned-freeze · reroll exclusion (VS semantics) · Soulshard cost curve
- [ ] 18.2 Meta store: 3 entries × (unlock + levels 1→4 = uses 1→5), persisted, no data loss
- [ ] 18.3 In-run per-player counters (host-auth; co-op snapshot fields) + level-up screen buttons with live counts, hidden until unlocked
- [ ] 18.4 Mechanics: SKIP · RE-ROLL (discarded set excluded from redraw only) · BANISH (picker-scoped run-long offer exclusion, mirrors `exclude` plumbing); interplay with 10.7 empty-pool + 15.3 pool fix
- [ ] 18.5 Gates incl. co-op per-picker isolation E2E + solo invariance (unlocked-0 = today's screen)

### Phase 19 — In-run HUD: equipment icons + fuel bar (COMPLETE 2026-09-06, PUBLISHED `eb00702`+`6b9eeda`; spec PLAN §3.12, D68)
- [x] 19.1–19.4 equip row under XP bar (weapon chips + live level numbers, signature-gated `syncEquip`, no rebuild on change) · fuel bar ABOVE→**beneath the player** (world-space; D68 revises D24; logic untouched) · co-op `.seat-equip` 24 px chips inside seat panels, no overlap · boot E2E incl. fillRect-below-feet assert — check 33/33 · logic 682/682 · boot runs=4

### Phase 20 — Passive-start rule (COMPLETE 2026-09-05, D66)
- [x] 20.1–20.3 verification-only phase: `reset()` never granted passives (meta bonuses ride separate `metaHp/metaDmg/metaSpeed`) · co-op untouched (ghost auto-pick = weapon only; snap slots empty at start) · per-char logic asserts (+5) + boot E2Es (run-2-start / fresh-g2 empty dicts / first-passive-via-real-level-up `passivePickDone`) — logic 661/661

### Phase 21 — Extended roster: 9 weapons + 2 run items + 5 characters (PLAN §3.13 VERBATIM, D69; queued after 14)
Tank Cannon · laser beam · Wolf summon · Rolling Boulder · Web-slingers · Gatling · Baseball Bat · Frog Tongue · Cannonball; Mirror Shield · Ice Skates; Werewolf · Stone Golem · Baseball Player · Giant Toad · Wild West Gunslinger. All via D60 data-driven modularity + Decision 21 status pattern.
- [ ] 21.1 O resolutions (user confirm): per-weapon stats · item slot rules · character archetypes/stats/unlock costs · Cannonball×leash · boulder auto-kill size class
- [ ] 21.2 Weapons 1–9 (mechanics briefs in PLAN §3.13) + snapshot keys + boot exercise each
- [ ] 21.3 Items: Mirror Shield / Ice Skates — item-slot class def first (O 21.1)
- [ ] 21.4 Characters ×5 (D62 pattern; each requires its weapon from 21.2 first)
- [ ] 21.5 Roster sync: pool/icons audit, cap review, README 10→19 weapons / 2 items / 4→9 chars + ghost
- [ ] 21.6 Gates: all new content exercised; roster-count asserts rebased

### Phase 22 — Playtest defects r2 + r3 (user reports 2026-08-28 / 2026-09-04)
- [x] 22.1–22.7 weapon visibility+damage audit (all 8 observed live; garlic/blades report = Pages staleness, D73) · gem `escapeFromSpots` radial projection + per-step nudge (`CFG.gems.escapePad`) · M03 hearts → coral · flame damage radius = **flat 150** all levels (visible-stream aligned) · death slow-mo beat REMOVED per user verdict (never reintroduce a DYING transient) · synergy surfacing fix (×8 draw weight; superseded by D81 uniform draw in Phase 15) — 2026-09-04, pushed `e502417`
- [ ] 22.8 Mobile "View zoom" non-functional (user report, Pages build): feature verified present+correct in-tree and in published main; real defect found = lighting half-res canvas stretches under the zoom transform. **Needs device repro** (no phone in this environment)

### Phase 23 — Projectile feel & Sunder Bombs rework (COMPLETE 2026-09-04; PLAN §3.14; tuning rule: change only what the user names)
- [x] 23.1–23.4 Bow charge-up wind-up + cadence ordering pistols < wand < bow at every level · Sunder Bombs radius ×1.5 / damage ×2 / centre-radial knockback / blast visual from true damage radius · over-heal synergy REPLACING Phoenix Heart in place (full-HP hearts → over-health to 200% max, ~1%/s decay, HUD bonus segment) · gates + boot E2Es for all three

### Phase 25 — Performance & optimization pass (CLOSED session 27, 2026-09-06; absorbs 10.9; **UNCOMMITTED**)
- [x] 25.1–25.6 profile-first (`unsloth-tmp/perf-probe.mjs`, fixed seed): culprit = lighting **38–48 `createRadialGradient`/frame** → baked glow/black-hole sprites, flicker via alpha (→ radial **0.0 in every window**) · star twinkle banded into `CFG.world.starBands=4` strips (fillRect ~25→**13.8**) · no-ops with evidence: pickup cull ALREADY at HEAD ('326 unculled' suspect was wrong) · snow stays ARC (swap trades ops flat; r:snow 0.026 ms/f) · acceptance bench on mobile settings: drawImage t30 460 → t295 **942 plateau** once capped loads saturate (baseline 420→902), heap non-running-away · gates 33/33 · 694/694 · boot runs=4. Detail: `docs/ARCHIVE.md`. **Commit pending user ask (rule 7)**

### Phase 26 — Card & icon overhaul + character redesign (COMPLETE + PUBLISHED 2026-09-06 `854c4a1`; PLAN §3.17)
- [x] 26.1–26.4 `PLATE` category color language (weapon teal / passive amber / synergy violet) + all 22 icons rebuilt at 72×72 · card DOM/CSS: kind accents, framed plaque, level pips, staggered deal-in (reduced-motion respected), FUSED violet badge · 5 player sheets redesigned (hooded mage / pauldroned warden / feather-hood ranger / longcoat swash / sheet ghost) with footprints/shadowR byte-stable + `idle[2]/run[4]` contract kept · +12 logic asserts, boot footprint asserts

### Phase 27 — Playable character sheets: full from-scratch reimagining (user directive 2026-09-07; supersedes the 26.3 sheet designs; PLAN §3.18)
- [x] 27.1 New `js/art/heroes.js` — all 5 sheets designed from scratch off the D62 archetypes (Moonscribe mage / Oathbound warden / Greenwalker ranger / Ember Duelist swashbuckler / ragged-sheet ghost); footprints + shadowR byte-stable · **`characters.js` does NOT delegate** — its 5 sheet builders (~324 lines) + `player` key + roster exports DELETED (nothing read them; game.js/hud.js import heroes.js directly), module is enemy skins only (D82)
- [x] 27.2 Real 4-frame run cycle from the existing `(dy, legL, legR)` signature — scissored legs + secondary motion (coat/scarf/plume/hem/bow/weapons) driven off swing phase `s = legL/4`, no pipeline change
- [x] 27.3 `tools/sprite-preview.mjs` — Canvas2D→SVG shim: ASCII contact sheet to stdout (ink % / content bbox / feetY / clip-overflow flags, colored + silhouette) + zoomed HTML (`unsloth-tmp/hero-preview.html`); per-char via argv
- [x] 27.4 Gates green **34/34 · 694/694 · boot PASS runs=4** (bench drawImage 784.4 radial 0.0 — no regression) + new asserts: sheets retired from `buildCharacters` · no shared frame canvases per sheet · detail floor (radial glows ≥1 + strokes ≥3 via instrumented rebuild, `sheetDetail()`) · PLAN §3.18 + README + PROGRESS synced

### Phase 24 — Visual overhaul, 2.5D isometric (COMPLETE + PUBLISHED `7c4f01c`; PLAN §3.16)
- [x] 24.1–24.9 `formShade()` single top-left key light on every opaque body (chars / enemies / bosses / blade + axe; additive energy sprites deliberately unshaded) · projectile-variant seam (`v` tag at fire sites, `(Var&&Var[v])||Img` lookup, base byte-identical) + 7 distinct synergy projectile skins · `decorShadow` contact shadows under standing decor · death-wisp hue variety · **deferred (user-approved): HUD/menu/CSS chrome restyle**

## Resume Notes — session 28, 2026-09-07 (live state only; rewritten each session per Format contract)

**Where we are (session 29):** **Phases 25 + 27 COMMITTED & PUBLISHED.** User ask executed: gates re-run green on the dirty tree, two commits on `overnight-2026-08-22` (Phase 25 perf · Phase 27 character sheets), ff-merged → `main`, pushed → Pages build updated. Tree CLEAN.

**NEXT (exact):** feature queue **Phase 17** (selectable run durations & boss schedule — PLAN §3.10, D65; O-resolutions on checklist 17.1 need user confirm) → 18 → 14 → 21 → 2.9.

**Gates (green, session 28):** check.mjs **34/34** · test-logic **694/694** · boot `PASS boot-sim runs=4` · `[10.4-bench]` drawImage 784.4 radial=0.0. Node NOT on PATH — use `"/c/Program Files/nodejs/node.exe"`.

**Git state:** `overnight-2026-08-22` = `main` = origin at session-29 publish commit (see Status bullet + Session Log). Tree CLEAN.

**Probe seams:** probes import game modules directly in Node with ctx stubs; fixed seed env; `[10.4-bench]` counters permanent in test-boot (`DEBUG_BOOT=1`). Sprite art check: `node tools/sprite-preview.mjs [char]` → stdout ASCII + `unsloth-tmp/hero-preview.html`. Latest probe capture: `unsloth-tmp/probe-mobile-session27.txt` (disposable).

**Pitfalls still hot:** regrid every tick in isolated probes · `_nearest` steals aim → probe player parked at x=500 · pooled enemy status zeroed on spawn · capture card `{key}` before `click()` · `Math.random=()=>0` = spread MINIMUM (pin 0.5) · rm/powershell blocked — python glob+os.remove for scratch cleanup · verify prior-session claims against `git status` + mtimes, never prose · boot ctx stub counts only arc/ellipse/fill/stroke/drawImage/radial — a detail-floor assert must rebuild the builder via `sheetDetail()`, linear gradients are invisible to it.

**Perf guardrails (binding):** no `create*Gradient`/array-literal/string-concat inside any `draw()` body — bake at build; entities/projectiles/particles stay pre-rendered offscreen canvases via `drawImage`; new counts bounded by `CFG.perf`, thresholds in config.

## Decisions (binding)

Full texts + one-line row index for **D1–D82** live in `docs/DECISIONS.md` (append-only numbering, revisions carry new numbers; Format contract §5). Open phases cite: D64 (11.13) · D65 (17) · D67 (18) · D54 (14) · D69 (21).

## Session Log (append-only, newest first; entries before session 24 archived verbatim to `docs/ARCHIVE.md`)

- **2026-09-07 (session 29) — Phases 25+27 PUBLISHED to Pages (user ask):** re-ran all three gates on the dirty tree first (34/34 · 694/694 · boot PASS runs=4, bench drawImage 824.6 radial 0.0), then two commits on `overnight-2026-08-22` — Phase 25 (lighting baked-sprite/star-bands/world + config) and Phase 27 (`js/art/heroes.js` NEW sheets, `characters.js` legacy builders deleted, game/hud/player/test-boot/sprite-preview + docs incl. new `docs/ARCHIVE.md`) — ff-merge → `main`, push → origin; Pages build now serves Phases 25+27.

- **2026-09-07 (session 28) — Phase 27 CLOSED (character-sheet reimagining):** resumed mid-phase; heroes.js + sprite-preview.mjs already written pre-cliff. Finished: trimmed last mage staff/flame overhang · deleted ~324 lines of legacy sheet builders + the `player` key + roster exports from `characters.js` (D82 — grep proved no readers; game.js/hud.js already import heroes.js) · new boot asserts (`!characters.player`, per-sheet canvas-uniqueness, detail floor via `sheetDetail()` instrumented rebuild — caught ranger at 0 radial glows → added acorn charm) · PLAN §3.18 written · README Phase 27 line · Status/checklist/Resume Notes synced. Gates **34/34 · 694/694 · boot PASS runs=4** (bench drawImage 784.4 radial 0.0); preview contact sheets: no clip overflow, feetY stable per char. Commit still pending user ask (rule 7). NEXT = commit ask → feature queue 17 → 18 → 14 → 21 → 2.9.
- **2026-09-06 (session 27b) — Format-contract compression pass (user-requested):** PROGRESS.md 438 → ~145 lines (§7 target). Created `docs/ARCHIVE.md` as overflow home (contract §9, new): completed-phase checklist detail (Phases 0–13, 15–16, 19–26) + Session Log entries before session 24 + the old Decisions row table, all moved VERBATIM. Decision full texts already lived in DECISIONS.md (D1–D81 complete), so the table was retired there-by-pointer; checklist completed phases → one line each with commit hashes; open phases (10.9/11.13/14/17/18/21/22.8) kept verbatim. Zero product-code changes; gates unchanged.

- **2026-09-06 (session 27) — Phase 25 CLOSED (25.6 acceptance):** resumed post-token-cliff; docs turned out CURRENT (mtimes proved session 26 wrote docs last) — fixed three stale remnants first: PROGRESS footer gate count/queue line · ENV.md baseline 661→694 · unticked 25.4a/25.4d. Acceptance on the dirty tree: gates **33/33 · 694/694 · boot PASS runs=4** + full-window `perf-probe.mjs --mobile` fixed seed — radial **0.0 all windows**, fillRect late 13.8, drawImage plateaus 942 after capped loads saturate (baseline 420→902), heap non-running-away. README Phase 25 roadmap line → DONE; checklist 25.6 ticked with the table. Commit still pending user ask (rule 7). NEXT = feature queue 17 → 18 → 14 → 21 → 2.9.

- **2026-09-06 (session 26b) — 25.4 CLOSED:** budget calls resolved with code evidence, not prose: **(c) pickup cull was ALREADY at HEAD** — `pickups.js` draw() bounds-checks every gem/heart vs view+cullPad passed from game.js L1014–1017; probe confirms r:pickups ≈41 calls/frame late with 320 gems alive (offscreen skipped) → session-24's '326 unculled' suspect was wrong, nothing to implement. **(b) snow left as ARC** — swap is −90 arc+fill for +90 drawImage, net flat, and late drawImage already 942 > ~850 band; r:snow = 0.026 ms/f, not a bottleneck. Checklist 25.4/25.4b-c ticked. REMAINING = 25.6 acceptance (flat bench table on mobile settings + gates + README sync).

- **2026-09-06 (session 26) — Phase 25 / 25.4 validation (docs-first per rule 9):** resumed post-token-cliff; session 25 had written its log line but left Status/checklist/Resume Notes stale. Fixed those first, correcting two session-25 errors: the `particles.js` import-merge "fix" never existed (file clean at HEAD, absent from diff) and its dirty-file list was wrong. Then ran everything 25 skipped: gates **33/33 · 694/694 · boot PASS runs=4** (bench radial=0.0 drawImage=857.0) + full `perf-probe.mjs` re-baseline on the dirty tree (t295–300: drawImage 942.2, fillRect 13.8, radial 0.0 — 25.4a/25.4d effects confirmed live). NEXT = decide/implement 25.4c pickup cull (recommended), optionally 25.4b snow sprite; then 25.6 acceptance.

- **2026-09-06 (session 25) — Phase 25 / 25.4 recovery (docs-first per rule 9):** token cliff hit mid-25.4 with code edits live but PROGRESS stale. Recovery via `git diff` (no gate re-run this turn): (a) lighting gradient→baked-sprite rewrite + (d) star-twinkle banding COMPLETE in tree; snow (b) and pickup-cull (c) untouched; ~~fixed accidental import-line merge in `particles.js`~~ (FALSE — no such change ever existed; corrected session 26); `starBands:4` added to `CFG.world`. Status/checklist 25.4/Resume Notes updated to reflect partial 25.4. Gates NOT yet run on the dirty tree — done by session 26.

- **2026-09-06 (session 24) — Phase 25 profile-first pass (25.1–25.3 measurement DONE, no game-code changes):** probes `unsloth-tmp/perf-probe.mjs` + `perf-probe2.mjs` (fixed seed, 5 s windows, full-length m01 run; mobile-flag rerun byte-identical — DPR never reaches game code). Baseline drawImage/frame: t30 420 → t150 658 → t240 890 → t295 902. Culprits ranked late-game (t≈245): lighting 38–48 `createRadialGradient`/frame + full-view half-res fill (playerR 510 ≈ whole view); r:snow 90 arc+fill; r:pickups up to 326 drawImage unculled; r:world ~380 tiles + per-star twinkle. Innocent: escapeFromSpots, Pyre Lance `_flames` (peak 0 — fuel-limited), `Lighting.resize`, particles, combat draw. Findings written straight into checklist lines 25.1–25.3 (rule 8). NEXT = 25.4 fixes descending measured cost.
## Environment & Known Caveats

See `docs/ENV.md` (moved out of this file 2026-09-05 per Format contract §6 — read it before running anything non-gate: node path, two-working-copies flag, push caveats, artifact list, unverified-browser note).

## How to Resume a Session

1. Read `AGENTS.md` → this file (Status → Master Checklist active phases → **Resume Notes**) → `docs/ENV.md`. Architecture: `docs/PLAN.md` §3–§4; decisions + pitfalls: `docs/DECISIONS.md`; user's own words: `docs/USER-INPUT-LOG.md`. The code is the API record — read the module before changing it.
2. Work **NEXT** from Resume Notes (currently: 25.6 acceptance → close Phase 25; then feature queue 17 → 18 → 14 → 21 → 2.9; leftovers 11.13 NAS-side, 22.8 device repro). New scope → Master Checklist first.
3. Validate with **all three gates** before any tick: `"/c/Program Files/nodejs/node.exe" tools/check.mjs` (33 modules) · `tools/test-logic.mjs` (**694**) · `tools/test-boot.mjs` (`PASS boot-sim runs=4`).
4. On completion: tick + date + ≤2-line note in the checklist, ≤10-line Session Log entry, rewrite Resume Notes (≤25 lines), update Status — *before* declaring done (Format contract §1–§4).
