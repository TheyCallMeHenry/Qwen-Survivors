# RESEARCH_FINDINGS.md — durable research record

**Purpose:** read-on-demand research records (NOT loaded into PROGRESS.md status — keep it that way):
- **§1–§6: task 11.13 (web/internet play)** — most effective, robust, optimized approach for this game's real-time multiplayer, per the binding protocol (PLAN.md §3.8 / Decision 36).
- **§7: level-up screen SKIP / REROLL / BANISH (Vampire Survivors model)** — research for the new meta-progression level-up actions (PLAN §3.11; Phase 18; user spec 2026-08-22).

**Protocol compliance:** Real-world date verified FIRST via terminal `date` before any web research: **Sat, Aug 22, 2026** (unix 1787442171). All sources below fetched that day; doc "Last updated" dates 2026-07-07 → 2026-08-12. Constraint honored: **100% cost-free solutions only**.

**Research question (PLAN §3.8):** internet play candidates = self-hosted relay (VPS/tunnel running the same zero-dep room — keeps all rules) vs WebRTC P2P (needs external signaling → conflicts with no-external-services unless free signaling found). Pages is static → cannot host WS rooms (known, A4).

---

## 1. Current implementation (local evidence, read 2026-08-22)

- **Transport:** zero-dep RFC 6455 WebSocket upgrade + frame codec in `tools/serve.mjs` — port **47893 only**, bind 0.0.0.0, LAN. One room = one run; 1–4 clients; join/leave/full/host-leave-close semantics. 64 KB frame cap.
- **Sync model (11.2):** host-authoritative. Host runs the 60 Hz sim and owns all players (remotes from D53 profiles); clients send inputs, host broadcasts per-step `state` via the room (relay only); shared world seed via `runstart`; **client no-sim + arrival-time interpolation** (`CFG.coop.interpLag`).
- **Wire format (`js/net/sync.js`, SNAP_V=1):** `stateMsg(step, time, score, kills, players, enemies, pickups)`; `playerSnap` 26 slots (x,y,hp,maxHp,xp,level,dashT,dashCd,flip + 7 weapons + 5 passives + 5 synergies); `enemySnap` 8 slots `[sid, typeIdx, x, y, hp, maxHp, frame, flags]`; `pickupSnaps` `[kind, poolSlot, x, y]` (stable pool IDs); coords r1 (0.1 px), time r2.
- **Input cadence (CRITICAL for free-tier math):** `js/net/conn.js` `sendInput(mx, my, dash)`; called **every update frame** from `game.js` `_clientUpdate()` (~L808-816) — i.e. ~60 Hz per client, NOT on-change.
- **Gates at time of writing:** 11.1–11.6.3 done; 11.6.4 co-op sync/E2E is next per resume notes.

---

## 2. Sources (title + URL, all fetched 2026-08-22)

1. Cloudflare — Workers *Limits* (updated Jul 28, 2026): https://developers.cloudflare.com/workers/platform/limits/
2. Cloudflare — Workers *Pricing* (updated Jul 7, 2026): https://developers.cloudflare.com/workers/platform/pricing/
3. Cloudflare — *Durable Objects* overview (updated Jul 15, 2026): https://developers.cloudflare.com/durable-objects/
4. Cloudflare — *Realtime* (SFU/RealtimeKit/TURN) (updated Jul 28, 2026): https://developers.cloudflare.com/realtime/
5. MDN — *WebRTC API* (last modified Jul 13, 2026): https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
6. Tailscale — *Pricing / Plans* (fetched live 2026-08-22): https://tailscale.com/pricing
7. Oracle — *Cloud Free Tier* (fetched 2026-08-22): https://www.oracle.com/cloud/free/
8. Wikipedia — *Netcode* (last edited Aug 12, 2026): https://en.wikipedia.org/wiki/Netcode

## 3. Key data points (evidence)

### Cloudflare Workers Free plan (sources 1, 2)
- 100,000 requests/day; **10 ms CPU per invocation**; 128 MB memory; 3 MB worker size (gzipped); 100 workers/account.
- **Duration: unlimited** for HTTP-triggered invocations while the client stays connected; Durable Objects have **unlimited wall time** while a WebSocket is connected.
- **No egress/bandwidth charges** (Workers plan: "no additional charges for data transfer (egress) or throughput").
- WebSocket connection to a Worker = 1 billed request (the `Upgrade`); WS messages routed through a plain Worker do NOT count as requests.

### Durable Objects on Free (sources 2, 3) — the viable free relay primitive
- DO available on **Free** plan (SQLite storage backend only on free; KV backend = paid accounts only). "Available on Free and Paid plans" — multiplayer games are an explicit use case.
- Free DO allotments: **100,000 requests/day** (counts HTTP requests, RPC sessions, **incoming WebSocket messages**, alarms); **13,000 GB-s duration/day**.
- Billing rules: **outgoing WS messages free**; incoming WS messages counted at **20:1 ratio** (100 incoming = 5 requests); one request per WS connection create; protocol pings free.
- **WebSocket Hibernation**: held-but-idle sockets do NOT incur duration charges; hibernation recommended for any held-connection design.
- Math: 13,000 GB-s/day at 128 MB allocation ≈ 28 DO-active-hours/day headroom. 100k requests/day at 20:1 ≈ **~2M incoming WS messages/day** budget.

### Cloudflare Realtime / SFU / TURN (source 4)
- Media-centric (video/voice routing). Pricing: **$0.05/GB egress, first 1,000 GB free/month**; TURN free only when used with Realtime SFU.
- Verdict: wrong tool for a 4-client, small-payload game room; only relevant if we adopted a WebRTC media/data mesh (we do not).

### WebRTC (source 5)
- P2P `RTCDataChannel` can carry game state without an intermediary — but **signaling still requires a reachable server** (off-rule for us unless self-hosted), browser incompatibilities remain (adapter.js shim recommended), and NAT traversal needs ICE/STUN/**TURN** for reliability.
- 4-player mesh = 6 pairwise channels, all must NAT-traverse simultaneously; failure surface grows per link.

### Tailscale (source 6) — strongest zero-code option
- **Personal plan: $0, free forever, up to 6 users, unlimited devices** (raised from 3 users; FAQ: "new Personal plan now allows 6 users"). Use cases explicitly include "playing games with friends."
- → 4-player co-op (4 users) fits free. All players install Tailscale + join one tailnet; the EXISTING LAN setup then just works (serve.mjs room reachable over the tailnet). Zero game-code change, zero new service, WireGuard-encrypted, DERP relay fallback for hard NATs.
- **UNVERIFIED (flagged):** Funnel (HTTPS-expose a local port without client install) appears in the plan comparison table but its checkmarks/URL scheme did not render in the fetch — verify on tailscale.com before promising "no-install" play.

### Oracle Cloud Always Free (source 7)
- Always-Free (unlimited time) Arm Ampere A1 Compute + storage + load balancer — a genuinely free VPS to run the **unmodified** `tools/serve.mjs` room.
- Caveats: card verification at signup; one account per person; "accounts left idle 30+ days may be deemed abandoned"; free-tier capacity constrained in some regions.

### Netcode / sync models (source 8)
- **Delay-based** (input delay to sync simulations): variable-delay feel, freezes when buffer overflows — classic P2P fighting approach.
- **Rollback**: predict + rewind; requires **full determinism + state rewind**; "troublesome" when a client slows (one-sided rollback); expensive to implement (GGPO, MIT, fighting-game standard; notable non-fighting users: Spelunky 2, Stormgate).
- **Lockstep (RTS-classic)**: "assumes the simulation will run exactly the same on all clients; if one client falls out of step for any reason, the desynchronization may compound and be unrecoverable."
- Tick rate: industry range 20–128 tps (CoD/Apex 20, Fortnite/BF5-console 30, CS:GO/OW 64, Valorant 128). Lower tick = less CPU/bandwidth, slightly more sync latency. Bandwidth is managed by prioritizing vital updates + reducing update frequency/precision per object.
- **TCP (what WebSocket uses)**: head-of-line blocking + retransmit pauses are the known downside for fast action; **UDP** avoids it but forces reimplementation of reliability — industry accepts TCP/WS for small, stable-population sessions (this is what essentially all browser games do).

---

## 4. Assessment vs our architecture

1. **Our model (host-authoritative 60 Hz sim + per-step full snapshots + client no-sim/interp) is the correct standard for this genre.** Survivor-like 1–4P co-op is not a lockstep/rollback genre: lockstep fails our non-deterministic JS float sim (unrecoverable desync); rollback needs full determinism + rewind we don't have and don't need. Host-authoritative also centralizes anti-cheat/consistency for free. The only "hype" adjacent to this space (rollback libraries, SFU products) targets competitive 1v1 netcode or media — not us.
2. **The bottleneck for internet play is reachability, not netcode.** LAN room already works; we only need a free, robust path to make the *same room* publicly reachable, or a free relay that forwards our exact packets.
3. **Free-tier math for our actual traffic (computed 2026-08-22):**
   - Worst case today: 3 remote clients × ~60 input msg/s = ~180 incoming msg/s ≈ **15.5M incoming WS messages/day** → ~8× over the CF-DO free budget (~2M incoming/day at 20:1). State broadcasts are host→clients = *outgoing* = free.
   - **Fix if CF-DO is chosen:** coalesce client inputs to 10–20 Hz or on-change (axes change smoothly; 20 Hz input is imperceptible for this game). 3 × 20/s ≈ 5.2M/day ≈ ~2.6× over → combine with on-change suppression (dash is a discrete event) → comfortably under budget. Input latency cost: ≤50 ms at 20 Hz, absorbed by existing interp lag.
   - Runtime: room DO active while a run lives; hibernated sockets cost nothing. 28 active-hours/day free headroom ≫ any co-op session.
4. **Option ranking (all 100% free):**
   - **A. Tailscale Personal (free, ≤6 users)** — zero game-code change, zero new service, encrypted, DERP fallback. Cost: every player installs a client + joins the tailnet (one-time, ~5 min). Best fit for "friends co-op"; keeps the zero-dep room verbatim.
   - **B. Cloudflare Durable Objects room (Workers free)** — no client installs; players just open a URL. Cost: port `serve.mjs` room logic (~few KB of pure JS, no deps) into a Worker + DO; **and** coalesce inputs (item 3) to fit free request budget. DO free = SQLite-backend objects; in-memory state is fine (room state is transient).
   - **C. Free VPS (Oracle Always Free) running unmodified `serve.mjs`** — zero code change, zero SaaS dependency (fully self-hosted, arguably the purest rule-fit). Cost: user-managed VPS + card-verified account + idle-suspension hygiene; single point of availability.
   - **D. WebRTC P2P mesh — REJECT:** signaling conflict with no-external-services, 6-link NAT failure surface, TURN for reliability, adapter.js drift; buys nothing over A/B/C for 4 players.
   - Recommended sequence: **A first** (ship internet play same session, zero risk), **B as the "no install" upgrade** (with input coalescing), C as the dependency-free fallback.
5. **Hype/marketing-claim notes (per protocol):** Cloudflare's "Realtime" branding targets media/video — its game relevance is only the DO relay primitive, which is commodity WebSockets; Tailscale's "zero trust platform" framing is corporate — the game-relevant fact is *free ≤6-user WireGuard mesh + free forever*; "100,000 req/day free" is a hard documented limit, not a soft cap. No paid SaaS recommended anywhere.

## 5. Addendum 2026-08-22 — home-NAS (DS124) hosting (web-verified)

**Question:** can the user's Synology DS124 host the room for players on other networks? **Answer: YES** — it is the always-on variant of **Option A (Tailscale)**: the NAS runs unmodified `serve.mjs` (page + room relay on 47893); the 60 Hz sim still runs in the host player's browser (NAS = relay only, exactly today's LAN flow). Zero game-code change. Strictly better than Option A-on-host-PC: always-on, stable address.

Verified facts (fetched 2026-08-22):
- **DS124 official spec** (Synology spec sheet, updated 2026-06-04: https://global.download.synology.com/download/Document/Hardware/ProductSpec/DiskStation/24-year/DS124/enu/Product_Spec_DS124_enu.pdf): **Realtek RTD1619B, 4-core 64-bit (ARM) @ 1.7 GHz, 1 GB DDR4 non-ECC, 1 bay, 1 GbE**. → **No Docker/Container Manager** (x86-only) — Node must come from the Package Center, not a container. 1 GB is ample (relay + small Node process; the sim is never on the NAS).
- **Tailscale on Synology is officially supported** (https://tailscale.com/docs/integrations/synology): Package Center app (~quarterly updates) or manual `.spk` for latest. Doc caveat: `--accept-routes` unsupported — irrelevant here (every device joins the tailnet directly).
- **Node.js is an official DSM Package Center package** (v18/v20 pages: https://www.synology.com/en-us/dsm/packages/Node.js_v20, DSM 7.x). Page is JS-rendered → could not confirm remotely that a build exists for the DS124's `rtd1619B` arch: **single on-device pre-check** (Package Center will show exactly what the DS124 can install).
- **DSM 7 DDNS** (Control Panel > External Access > DDNS; https://kb.synology.com/en-us/DSM/help/DSM/AdminCenter/connection_ddns?version=7): providers incl. Synology DDNS, No-IP, ChangeIP, DNSPod, FreeDNS, Google, OVH, PeanutHull, STRATO, selfHOST.de + **custom query URL** (e.g. DuckDNS). Only relevant for the port-forward alternative; requires a **public IP** (CGNAT blocks it — Tailscale covers both cases).
- Security: on the tailnet path the room is WireGuard-encrypted end-to-end; a port-forwarded path exposes the unencrypted room on one public port (fine for friends, note it).

**Ranking update:** Option A becomes **A1: Tailscale on host's PC** (zero setup) and **A2: Tailscale on always-on home NAS (DS124)** — A2 recommended as the standing 11.13 transport once 11.12 is green; pre-checks: Node.js package on DS124 + Tailscale install + boot-start task. B (CF-DO) and C (free VPS) unchanged as no-install/dependency-free paths.

## 6. Open items (carry into 11.13 implementation)
- Verify Tailscale **Funnel** inclusion on Personal plan (no-install exposure) before offering it to players.
- If option B: confirm DO free-plan WebSocket Hibernation behaves with long-lived room sockets in a spike before committing; implement input coalescing in `CoopConn` (send axes at ≤20 Hz + dash on-change) and re-run 11.2 E2E + solo-invariance gate.
- If A2 (DS124) chosen: on-device pre-checks — Node.js package offered for `rtd1619B` in Package Center; Tailscale app install + tailnet join; DSM Task Scheduler boot task for `node tools/serve.mjs`; (optional) public-IP/CGNAT check only if port-forward path is wanted instead.
- Keep 11.13 deliverable = docs update (PLAN §3.8) + chosen transport task line; implementation after 11.12 per checklist order.

---

## 7. Level-up screen: SKIP / REROLL / BANISH (Vampire Survivors) — research 2026-08-22

**Trigger:** user request (2026-08-22) — “Perform web research into how similar 'bullet-heaven'-style games incorporate these SKIP, BANISH, and RE-ROLL features for additional insight/context into their functionalities” (full verbatim spec: `USER-INPUT-LOG.md` entry “Batch design input…” item 5; correction entry “VS DOES have skip/reroll/banish…”). **User correction honored:** these are NOT level-up card choices in VS — they are added features on the level-up screen. Date: 2026-08-22 (session date; no separate terminal verification needed — this research is not under the D36 binding protocol).

### 7.1 Sources (title + URL, fetched 2026-08-22)

1. *Skip — Vampire Survivors Wiki*: https://vampire.survivors.wiki/w/Skip
2. *Banish — Vampire Survivors Wiki*: https://vampire.survivors.wiki/w/Banish
3. *Reroll — Vampire Survivors Wiki*: https://vampire.survivors.wiki/w/Reroll
4. *How Banish Works in Vampire Survivors — Explained (Prima Games)*: https://primagames.com/tips/how-banish-works-in-vampire-survivors-explained
5. Steam discussion — “Extra skips/Banish/re-roll”: https://steamcommunity.com/app/1794680/discussions/0/3473981814937594925/ (Golden Eggs stack on top of PowerUp ranks)
6. Reddit r/VampireSurvivors — “when do you use Skip?”: https://www.reddit.com/r/VampireSurvivors/comments/11i7nsz/ (player heuristic: spend Banish → Skip → Reroll in that order when faced with unwanted offers)
7. User-provided (log entry, 2026-08-22): skip grants **~66% EXP towards the next level-up**; reroll rerolls the card options; banish removes a card from that run's options.

### 7.2 VS model (evidence from sources 1–3)

- **All three are player STATS (a “PowerUp” family), not cards/items** — the level-up screen shows three buttons (Skip / Reroll / Banish), each spending 1 use of that stat. No upper limit on the stat itself; uses are granted by: PowerUp ranks, character base values, Golden Eggs (permanent +0.1–0.2 per character), Arcana (XX Silent Old Sanctuary = +3 of each).
- **Skip** (source 1): “allows you to skip level up choices and get Experience instead” — the level-up is consumed (the level IS granted), and the player receives experience toward the next level instead of a card choice. User-reported ratio (source 7): **~66% of the next level's XP**. Wiki tip (source 1): spend Reroll/Banish BEFORE Skip because each use “provide[s] 20% of the experience to the next level” — using them later (when the next level costs more XP) is more efficient.
- **Reroll** (source 3): “allows you to get different choices when leveling up” — the current 3-card set is discarded and a fresh set is drawn. **Discarded items cannot appear in the new set, but are NOT removed from the pool** — later rerolls in the same level-up can offer them again.
- **Banish** (source 2): “allows you to remove an item from level up choices, for the rest of the run” — a banished item is never offered again as a level-up choice in that run. A banished item the player ALREADY OWNS stays at its current rank and “can no longer be offered upon level ups or upgraded by Treasure Chests” (Limit-Break upgrades excepted). **Pool-shrink strategy** (wiki tip): banishing common items you don't plan to pick raises the odds of being offered the item you want.
- **PowerUp scaling (sources 1–3):** each PowerUp = 5 ranks × **+2 uses per rank** (max +10); ranks cost currency (Reroll initial cost 1,000; Skip/Banish 100) + per-rank achievement unlocks. So a fully-upgraded player has up to 10 of each + character bases + Golden Eggs — VS deliberately leaves totals open-ended; **our spec caps at 5 uses/run/feature (user decision — binding, D68).**

### 7.3 Mapping to our design (our deltas from VS — all user spec, binding)

| Aspect | VS | Ours (user spec 2026-08-22) |
| --- | --- | --- |
| Where the feature lives | Level-up screen buttons (stats) | Level-up screen buttons (meta-progression unlocks) |
| How you get uses | PowerUp ranks + achievements + character bases + Golden Eggs | **Meta-progression store in the Main Menu** (Soulshard economy): one-time unlock per feature, then upgrades = +uses, **max 5 uses/run/feature** |
| Equippable / selectable / level-up cards? | No (stats only) | **NO — explicitly NOT equippable items, NOT selectable cards, NOT level-able mid-run** (user emphasis) |
| Skip semantics | Skip choice → gain XP instead (~66% next level per user; 20% per Reroll/Banish use per wiki tip) | O — ratio TBD at Phase 18 (candidates: no-XP “free pass” vs partial-XP) |
| Reroll semantics | Redraw 3; discarded set excluded from redraw only | O — same shape; confirm pool-exclusion behavior at 18 |
| Banish semantics | Item removed from level-up offers for rest of run; owned items frozen (no further upgrades) | O — our analog: item removed from the picker's offer pool for the rest of the run (per-picker, co-op-safe); owned-item freeze = O at 18 |
| Co-op | n/a (VS is solo) | **Player-scoped (D32 pattern):** each player has their own uses (host sim tracks per-picker counters); a banished key is excluded from the BANNING picker's offers only (mirrors 11.5/11.6b `weaponOwner`/`exclude` plumbing) |

**Implementation notes (for Phase 18, not binding until spec'd there):** the three buttons are level-up-screen actions, not cards → they never enter `cardOffers` pool/cap/exclusion logic as offers; uses are per-player run state (host-authoritative in co-op → per-step snapshot fields, same channel as dash state); UI = 3 action buttons on the level-up screen (≥72 px, change-detected use-count labels), hidden/locked-state per meta unlock; exact card-text rule (10.2) extends to the button tooltips (state the exact effect of each use).
