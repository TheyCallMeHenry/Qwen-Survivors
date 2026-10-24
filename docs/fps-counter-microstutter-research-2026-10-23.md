# FPS-counter & micro-stutter research — 2026-10-23

Purpose: explain why a rAF-tick-counting FPS counter can read 60 while the game runs slow/feels
laggy (sub-topic A), and what 2025–2026 practice says about *causes* and *measurement* of
micro-stutter in browser canvas games (sub-topic B). Companion to this session's evidence:
`docs/fps-test-video-review-2026-10-23.md` (overlay read 59.4–60.1 fps at 9 samples; the game's
own 300 s countdown needed ~437 s real; ~1973 content-holds of 130–200 ms).

Method: Brave web search (primary; 8 queries, one in flight at a time) + `gh api` used **only** to
read the creation-dates/titles of cited GitHub items and `curl -sI` to size-check one doc page.
No game run, no code changed. Access date for every source: **2026-10-23**. Recency labels:
"(>90 d)" = older than 90 days → weighted lower; "(undated)" = no date obtained.

---

## A. Why "60 fps" can coexist with a slow, laggy game

**A1 — The counter measures rAF *callback cadence*, which tracks the display, not the work.**
FACT (spec/docs): "The frequency of calls to the callback function will generally match the display
refresh rate" — *Window: requestAnimationFrame()*, MDN, https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
(>90 d, stable API doc). Consequence: on a 60 Hz panel the tick count saturates at ~60; it is a
property of the *display pipeline*, not of how much simulation or presentation happened.
FACT: on 120/144 Hz displays rAF fires correspondingly faster (~6.9 ms/callback), so a tick counter
reports the panel, not the game — *Frame Rate Fingerprinting*, botbrowser, https://botbrowser.io/en/blog/fps-control/
(recent, undated page); MDN same statement as above.

**A2 — A rAF callback does NOT prove a frame was presented.**
FACT (engineering statement in a browser-game trace investigation): "A normal requestAnimationFrame
callback does not prove the frame was presented" — *Find the cause of the desktop INP stall*, tkakkie/ribbitto
issue #1452, https://github.com/tkakkie/ribbitto/issues/1452 (2026-10-19, `gh`-verified).
FACT (mechanism): "If the main thread misses the deadline, the display repeats the previous frame" —
*The definitive guide to requestAnimationFrame()*, flaviocopes, https://flaviocopes.com/requestanimationframe/
(undated, >90 d).
INFERENCE (from A1+A2): a tick count can stay at the refresh-rate ceiling while the *presented*
content repeats, and conversely a genuinely skipped callback lowers the count. Which of the two the
count reflects depends on *where* the stall is (main thread → callbacks skipped; presentation/
compositor side → callbacks keep ticking, images repeat). See D1 — this distinction is exactly what
our recording cannot separate without in-page instrumentation.

**A3 — A fixed-timestep loop counts ticks while deliberately *dropping simulated time*.**
FACT (this repo, read this session): `js/core/loop.js` — `this.frames++` per rAF tick; `dt` is
clamped to `CFG.loop.maxFrameDt` (0.1 s) and the catch-up loop is capped at `CFG.loop.maxSteps`
(5), after which `this.acc = 0` discards the debt (`js/config.js` L72-76: `loop: { maxFrameDt: 0.1,
maxSteps: 5 }`). So ticks keep counting at display rate while simulated time is *intentionally*
thrown away under overload.
FACT (canonical prior art, foundational): the accumulator + capped catch-up is "Fix Your Timestep",
and uncapped catch-up is the "spiral of death" — Glenn Fiedler, *Fix Your Timestep!*, https://gafferongames.com/post/fix_your_timestep/
(>90 d).
FACT: "Neither guard makes the simulation keep real time when the machine can't. They make it fall
behind in slow motion instead of locking up completely." — *The Game Loop & Time*, Mighty Professional,
https://mightyprofessionalgaming.com/tutorials/game-loop-from-scratch (undated); same behaviour
described in *Taming Time in Game Engines*, https://andreleite.com/posts/2025/game-loop/fixed-timestep-game-loop/
(2025, >90 d) and *Fixed Timestep Game Loops in the Browser*, https://simplified.media/guides/fixed-timestep-loops
(undated).
→ This is the cleanest explanation of the video's 0.67–0.77× sim/wall ratio (superseded by full-coverage review: see fps-test-video-review-2026-10-23.md): the loop was hitting
its guardrails and silently discarding simulated time, while rAF kept ticking at ~60.

**A4 — Time-scale / hit-stop features are the same mechanism on purpose.**
FACT (this repo): `Loop.hitStop(s)` sets `ts = 0` for `s` seconds of *wall* time — simulation
freezes, `frames++` continues. `CFG.combat.hitStopKill = 0.05`, `hitStopBoss = 0.18`,
`hitStopHurt = 0.07` (`js/config.js` L577-587), re-armed on every kill (`Game._onKill`) and every
player hit (`Game._onHurt`).
INFERENCE (quantitative, matches the video): 50 ms per kill, and `hitStop()` takes the max rather
than the sum, so back-to-back kills re-arm it → chained 50 ms blocks become visible static frames of
100–200 ms+. ≈133 s of frozen picture over a 442 s recording ≈ 2650 kill/hurt re-arms — entirely
plausible for a late-game survivor run, and it predicts exactly what the review saw: holds
*everywhere*, slightly denser late (the review's game/wall drift 0.77→0.67 tracks a rising kill
rate). **So a meaningful share of the "micro-stutter" may be designed hit-stop, not jank** — a 30 fps
recording cannot tell them apart (both are static frames).

**A5 — Averaging over 1 s hides everything that matters.**
FACT (this repo, read this session): the overlay is `Math.round(((n - last) * 10000) / (t - lastT)) / 10`
with `n = loop.frames`, inside a `setInterval(..., 1000)` — `js/main.js` L64-74. It divides *tick
count* by *measured wall time*, so it is not a naive "assume 1000 ms" counter: it would fall below 60
if rAF callbacks were actually being skipped for a whole second.
FACT (why it still misses jank): any sub-second stall shorter than the window is smoothed; and a
"steady 60" reading is explicitly *cadence*, not headroom — "The meter measures cadence, not headroom:
a steady 60 means you're keeping pace, not that you have time to spare." — *Measuring Performance in
FrontEnd using FPS*, Latish Sehgal, https://latish.dev/blog/2026-05-27/measuring-performance-in-frontend-using-fps/
(2026-05-27, >90 d).
FACT (display-lock corollary): the same article notes background tabs are rAF-throttled, so a low
reading there is expected, not real jank.

**A6 — "60 fps" vs "16.7 ms frame time" vs "pacing" are three different measurements.**
FACT: frame pacing = consistency of the interval between presented frames; poor pacing reads as
stutter "even when the average FPS looks high" — *What is Frame Pacing?*, PCB Store glossary,
https://pcbstore.com.bd/glossary/frame-pacing (undated); industry framing: *80 FPS but Still
Stuttering? Why Frame Time, Not Frame Rate…*, https://www.switchbladegaming.com/game-settings/frame-pacing-stutter-fix/
(undated) and *Frame Pacing in Cloud Gaming*, https://cloudloadout.com/frame-pacing-in-cloud-gaming/
(undated).
FACT (rendered ≠ displayed, vendor docs as reported): rendered frame rate, displayed frame rate and
input latency "are different measurements, not interchangeable badges of performance" —
*Frame Generation FPS Explained*, WindowsForum (news summary of Intel docs),
https://windowsforum.com/news/frame-generation-fps-explained-rendered-vs-displayed-frames-and-input-latency-on-pc.447169/
(undated; vendor-derived → treat as claim).
FACT (pipeline latency is multi-frame, so an on-screen number is never "current"): *Frame Pacing: Why
a Fast-Changing Number on Screen Is Never the Current One*, Rampage Dev,
https://rampagedev.com/frame-pacing-why-a-fast-changing-number-on-screen-is-never-the-current-one/ (undated).

---

## B. Micro-stutter in 2025–2026: causes and measurement

**B1 — LoAF (Long Animation Frames API) — current status.**
FACT (most complete current statement, `gh`-verified date 2026-09-05): *Long Animation Frames API*,
web-platform-tests/interop issue #1372, https://github.com/web-platform-tests/interop/issues/1372 —
spec published as a **W3C First Public Working Draft on 2026-04-28**, still developed as an Editor's
Draft (the draft header itself reads "Editor's Draft, 3 September 2026" —
https://w3c.github.io/long-animation-frames/); **Chrome, Chrome for Android and Edge ship it since
version 123**; **Firefox and Safari do not support it**, both with positive-but-unimplemented
standards positions.
FACT (API surface + entry fields, official docs): observe with
`new PerformanceObserver(...).observe({type:'long-animation-frame', buffered:true})`; usable fields
include `duration`, `blockingDuration`, `renderStart`, `styleAndLayoutStart`, `firstUIEventTimestamp`,
`scripts[]`; the docs' worked example filters `blockingDuration > 100` because it sits under the 200 ms
"good" INP threshold — *Long Animation Frames API*, developer.chrome.com,
https://developer.chrome.com/docs/web-platform/long-animation-frames (size-checked: 269 KB HTML, page
not fetched whole; quoted from the search result).
FACT (usage guidance + fixed threshold): the LoAF threshold is **fixed at 50 ms**; MDN advises
reporting at a higher threshold first and lowering it as the site improves — *Long animation frame
timing*, MDN, https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/Long_animation_frame_timing
(current doc); interface: `PerformanceLongAnimationFrameTiming`, MDN,
https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongAnimationFrameTiming.
FACT (feature-detect): `PerformanceObserver.supportedEntryTypes` (same MDN page).
FACT (ecosystem): Sentry's JS SDK consumes LoAF; DebugBear/SpeedCurve/RUMvision write about it
(interop #1372, above). Background: origin trial Chrome 116 → GA Chrome 123 — *What are Long
Animation Frames?*, Request Metrics, https://requestmetrics.com/web-performance/long-animation-frame-loaf/ (undated).
FACT (in-flight spec growth, 2026-10-05 `gh`-verified): new `styleDuration` / `forcedStyleDuration`
fields are proposed with "chrome milestone: 157 (dev)" — *Long Animation Frames style and layout
duration*, getsentry/browser-updates-radar #39, https://github.com/getsentry/browser-updates-radar/issues/39
(mirrored as GoogleChrome/modern-web-guidance-src #1615). **Proposed, not shipping — treat as
forward-looking.**
INFERENCE (limitation, from the above): LoAF is a **main-thread/render-start** instrument tied to a
≥50 ms frame. Our 130–200 ms holds would surface as LoAF entries *only if the delay is main-thread
work*; a GPU/compositor-side raster stall (the likely mechanism for a fill-rate-limited phone, per
`docs/lag-research-2026-10-22.md`) plausibly yields **no LoAF entry at all** → absence of LoAFs is
not evidence of smoothness. Supported indirectly by a code review of a browser-game readout that
refused to blame GPU when LoAF data was unavailable — *perf(client): ?perf=1 frame readout that
tells CPU from GPU*, shuxueshuxue/sketch-rts PR #392, https://github.com/shuxueshuxue/sketch-rts/pull/392
(2026-10-16, `gh`-verified).
FACT (known gap being worked on): LoAF only reports frames >50 ms with post-hoc aggregate script
attribution, so sub-50 ms budget breaches have no in-production call-stack tool — that is the stated
motivation for a new proposal, *Jankiness API: Low-threshold task timing with point-in-time call
stacks*, WICG/proposals #312, https://github.com/WICG/proposals/issues/312 (2026-10-20, `gh`-verified),
and the Google explainer *Task Interrupt Timing API*, https://github.com/explainers-by-googlers/task-interrupt-timing
(undated explainer; states "LoAF is tied to a 50ms frame rendering threshold").

**B2 — DevTools: what is actually usable and what it can't tell you.**
FACT (official reference): the Performance panel's Frames section shows per-frame duration and colour-
codes frames ("Idle frame (white). No changes. Frame (green). Rendered as expected and in time."), and
there is a separate real-time FPS meter — *Performance features reference*, Chrome DevTools docs,
https://developer.chrome.com/docs/devtools/performance/reference (live doc, undated).
FACT (third-party 2026 walkthrough, consistent): "Red bars in the FPS row mean dropped frames the
user saw as jank." — *Chrome DevTools Performance Audit: 2026 Walkthrough*, Crosscheck,
https://crosscheck.cloud/blogs/chrome-devtools-performance-auditing/ (2026, undated day).
FACT (DevTools does not surface LoAF entries directly; the panel is the substitute): *Fixing Long
Animation Frames*, Request Metrics, https://requestmetrics.com/web-performance/fixing-long-animation-frame-loaf/
(undated).
FACT (agent-tooling gap being filed in 2026): DevTools MCP traces showed no hotspots on a compute-heavy
canvas UI and the request was to "include long animation frame (LoAF / requestAnimationFrame) timing
when present so agents can spot janky frames on canvas/WebGL workloads" — ChromeDevTools/chrome-devtools-mcp
#3224, https://github.com/ChromeDevTools/chrome-devtools-mcp/issues/3224 (undated by me).
→ Practical reading: DevTools is for **manual, one-off attribution on a dev machine**; it can't be the
in-product diagnostic the user runs on their phone.

**B3 — Causes actually reported for browser-game jank in 2026.**
FACT (main-thread blocking cascades to the compositor): "Long JS Task (50ms) → Main Thread blocked
from Layout/Paint → Commit phase delayed → Compositor waits idle … Even compositor-only animations
jank"; and at 120 Hz the whole 8.33 ms budget includes ~1–2 ms of commit — *The Complete Browser
Rendering Guide for 2026*, Abdallah Zakzouk, https://abdallahzakzouk.com/blog/browser-rendering-performance-guide
(2026, undated day). Same 16.7 ms budget framing: *Debugging Janky CSS Animations with DevTools*,
OpenReplay, https://blog.openreplay.com/debug-janky-css-animations-devtools/ (undated).
FACT (GC is a real but *not default* culprit): "V8 pauses JavaScript execution to reclaim memory, and
if your allocation rate is high enough, those pauses happen frequently" — *JavaScript GC: Pauses,
Allocation Rate, Frontend Jank*, renderlog, https://renderlog.in/blog/javascript-garbage-collection-frontend/
(undated); and in a 2026 browser-game profile the opposite held: "The profile shows 40–48% (program)
(native browser work), 37–45% idle and **0.1–0.2% garbage collection**" → for that game the cost was
GPU/compositing, not GC — *Cut the game's per-frame GPU and compositing cost…*, liminal-hq/lieutenant-fizz
#216, https://github.com/liminal-hq/lieutenant-fizz/issues/216 (2026-10-14, `gh`-verified).
INFERENCE: cause-hunting must be profiled per case; do not assume GC (and this repo's own
`docs/lag-research-2026-10-22.md` measured fill-rate/overdraw, i.e. the same non-GC class).
FACT (canvas/raster-side): re-running a whole view tree per frame makes pan stutter while idle CPU is
also high — therealjackiewelles/Mping #80, https://github.com/therealjackiewelles/Mping/issues/80
(undated); engine-level: Chrome's move to Skia Graphite explicitly targets the old single-threaded
Ganesh/OpenGL path "making it easy to overload the main thread causing increased jank and latency" —
*Introducing Skia Graphite*, blog.google/Chromium, https://blog.google/chromium/introducing-skia-graphite-chromes/
(undated by me; treat as vendor statement).
FACT (hit-stop / frame-skip and step-capping as a *deliberate* source of visible holds): see A3/A4 —
capped catch-up is standard practice, and 2026 projects name the resulting "slow motion" as the thing
they measure (B4).

**B4 — Prior art for the ground-truth metric: simulated time vs wall clock.**
FACT (strongest 2026 match; browser game, `gh`-verified 2026-10-19): the loop was changed to separate
real elapsed time from the simulation input and to count only executed steps; "Time lost to the delta
cap and to the frameStepCap accumulator drop shows up as **simulatedMs < wallMs**, which is exactly the
slow motion this is meant to expose." — *Measure host simulation pace and stop the test browser starving
games*, vucinatim/air-jam PR #128, https://github.com/vucinatim/air-jam/pull/128.
FACT (companion pattern, 2026-10-16 `gh`-verified): instrument the cap as a first-class counter —
"Tick-drop telemetry (`ticksDroppedByCap` and frame p95 in `perf_sample`)", and its explicit note that
the step cap "loses wall-clock sync only, never ticks: when the cap bites, … the remainder [is]
dropped … (slow motion, no divergence)" — bjor2/steampunk-miner #480,
https://github.com/bjor2/steampunk-miner/issues/480.
FACT (same pattern as a goal statement, 2026-10-15 `gh`-verified): "Make dropped simulation time a
first-class performance metric … Quantify simulation/wall-clock divergence" — Gradient-Ascenders/Specimen
#196, https://github.com/Gradient-Ascenders/Specimen/issues/196.
FACT (keep the distribution, not a counter): "a counter tells you '42 slow frames happened' but not how
severe they were — a 34 ms frame and a 500 ms freeze would both count as +1. The distribution preserves
the actual values" — getsentry/sentry-unreal #1281, https://github.com/getsentry/sentry-unreal/issues/1281
(2026-03-11, `gh`-verified); sampling-based fleet view: Sentry blog,
https://sentry-blog.sentry.dev/unreal-engine-performance-metrics/ (undated).
FACT (tail metrics are unstable with too few samples — relevant to how we report p95): "Medians and
averages over ~2100 frames are stable. Tail metrics are not" — inada-s/flycast #545,
https://github.com/inada-s/flycast/issues/545 (undated by me).
FACT (unreal-engine write-up on hitch hunting): *The Great Hitch Hunt*, Epic Community tutorial,
https://dev.epicgames.com/community/learning/tutorials/6XW8/unreal-engine-the-great-hitch-hunt-tracking-down-every-frame-drop
(undated; engine-side, not web).

**B5 — "Jank" in Web Vitals / INP: is it relevant here?**
FACT (definition): INP measures click/tap/keypress → next paint, at p75; three phases (input delay,
processing, presentation); attribution is built by finding the LoAF that overlaps the interaction —
*Understanding INP* / *Measuring INP*, Google codelabs,
https://codelabs.developers.google.com/understanding-inp and
https://codelabs.developers.google.com/measuring-inp; metric reference: corewebvitals.io,
https://www.corewebvitals.io/core-web-vitals/interaction-to-next-paint (2026-ish, undated day).
FACT: the web-vitals library pairs an "FPS: the main thread frames-per-second of the page" panel with a
jank-visualising timer (Understanding INP codelab, above) → Google's own tooling measures main-thread
FPS, i.e. rAF cadence, alongside input latency.
INFERENCE (relevance verdict): Web-Vitals "jank" is **input-scoped**, so it is the wrong instrument for
continuous-run smoothness (there is no discrete interaction to anchor). It *is* the right instrument for
this project's touch controls (virtual joystick, dash button, level-up card taps on Android) — i.e. INP
answers "did the tap respond", never "was the run smooth".
FACT (2026 consensus that INP is the hard one): *Core Web Vitals 2026: Fix Interaction to Next Paint*,
SitePoint, https://www.sitepoint.com/core-web-vitals-2026-fix-interaction-to-next-paint/;
*INP: A Practical Guide for 2026*, https://parachutedesign.ca/blog/interaction-to-next-paint-inp/ (both
undated day).

**B6 — Presentation-truth APIs that could count *presented* frames instead of ticks.**
FACT: `requestVideoFrameCallback()` metadata carries `presentedFrames`, "the number of frames submitted
for composition so far … This can be used to detect whether frames were missed between callback
instances" — MDN, https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback
(live doc). It is bound to the actual **video** frame rate and is explicitly best-effort about vsync
timing — *Perform efficient per-video-frame operations*, web.dev,
https://web.dev/articles/requestvideoframecallback-rvfc (undated); spec: WICG,
https://wicg.github.io/video-rvfc/; support table: caniuse,
https://caniuse.com/mdn-api_htmlvideoelement_requestvideoframecallback (live).
→ Only usable for `<video>` elements, not for our canvas; noted so nobody re-proposes it as a canvas
frame counter.
FACT (a browser-side refresh-rate hint API exists in this space): "A browser shows only what is drawn
during a `requestAnimationFrame` callback, but the web hints let the scheduler start a frame as late as
its commit deadline allowed" — frameclock_web integration note, forest-rs/frameclock PR #7,
https://github.com/forest-rs/frameclock/pull/7 (undated by me).
UNVERIFIED: the status of Chrome's older "Frame Timing API" (`performance.frameTiming`). Chrome Platform
Status has a page for it (https://chromestatus.com/feature/5558926443544576) and MDN documents
`PerformanceFrameTiming` (mirror: http://udn.realityripple.com/docs/Web/API/Frame_Timing_API/Using_the_Frame_Timing_API),
but the `chromestatus.com/api/v0` response did not expose shipping milestones, so I could not confirm
whether/where it ships today. Do not build on it.
FACT (measuring above the vsync ceiling): render via rAF but read the frame budget from
`requestIdleCallback().timeRemaining()` — *Calculating FPS past requestAnimationFrame limit*,
clicktorelease, https://www.clicktorelease.com/blog/calculating-fps-with-requestIdleCallback/ (>90 d).
Note: `requestIdleCallback` is absent in Safari and is throttled/absent in many webviews — UNVERIFIED
for current Chromium-on-Android behaviour; treat as a dev-machine trick.
INFERENCE (library landscape): no maintained, purpose-built **web** frame-pacing library appeared in
2026 searches; the ecosystem pattern is (a) roll a ~30-line histogram + LoAF observer in the game
(stats.js is the generic prior art — https://tessl.io/registry/tessl/npm-stats-js/1.0.0, registry page),
or (b) for native PC use CapFrameX / RTSS-class tools, which are not applicable to a browser page
(https://github.com/CXWorld/CapFrameX; https://unstore.io/discover/best-apps-for-frame-pacing-measurement-desktop/).
Repo rule 2 (no npm deps, no build step) points to (a) anyway.

---

## C. Counter-research (arguments against the leading conclusion)

1. **"Tick counting is a legitimate frame-rate measure."** FACT (2026 blog, the pro-side): "if you count
   how many times your callback fires in a one-second window, that count is your frame rate" —
   latish.dev (2026-05-27, above). Its own caveats are the same ones this repo hit: it measures cadence,
   not headroom, and it is display-capped. So: adequate for "is rAF running at the refresh rate", not
   for "is the game advancing or presenting".
2. **"rAF counting does detect dropped frames."** FACT (spec/mechanism): callbacks run once per frame and
   if the deadline is missed the *display repeats the previous frame* (MDN; flaviocopes, A2) — i.e. a
   main-thread stall normally *skips callbacks and lowers the count*. Our overlay reading a flat 60 while
   the sim lagged therefore argues the loss was **not** (only) rAF-callback skipping; the tick cadence was
   genuinely ~60 and time was lost *inside* the loop (hit-stop and/or cap-bites, A3/A4). This is the
   single most decision-relevant consequence of the counter-research.
3. **"An in-game clock is a bad speed proxy."** FACT (by design, this repo): hit-stop and `timescale`
   intentionally freeze or scale simulation — the game's own countdown advances slower than real time
   *on purpose* whenever enemies die (A4). Corroborated by 2026 prior art naming cap-bites as "slow
   motion, no divergence" (steampunk-miner #480). So the video's 0.67–0.77× ratio is **not** by itself
   evidence of jank: it must be decomposed into intended dilation vs unintended loss before it can
   convict anything.
4. **"Screen-recording jank analysis over-reads."** FACT (capture-side prior art): an explicit project
   statement that recording-based telemetry "measures submission cadence, not visible frames, CPU encode
   or GPU time" and that visible-frame timing is unfinished work — brookesdjb/Madeira #42,
   https://github.com/brookesdjb/Madeira/issues/42 (undated by me); encoder/capture timestamping can
   itself produce judder — FisiFla/replayed #80, https://github.com/FisiFla/replayed/issues/80; and an
   OBS forum thread argues recorded pacing differences often come from the recording pipeline
   (https://obsproject.com/forum/threads/the-framerate-judder-frame-pacing-or-call-it-what-you-will-is-unreal.166366/,
   undated). Tooling to check whether a clip is truly CFR and where its longest stalls are exists and
   is free: appsmypass/truefps, https://github.com/appsmypass/truefps — directly applicable to our own
   MP4 methodology (see D1).
   Where sources disagree with our §4 cross-check: none of them disputes that a **game-rendered** timer
   lags only if the game itself lagged; they dispute attributing *frame-level* holds to the game. Our
   conclusion stands only for the aggregate sim deficit, not for the individual 130 ms holds.
5. **LoAF as an incomplete instrument** — see B1 (Chromium-only; ≥50 ms frame threshold; no mid-execution
   call stacks; new fields only *proposed* for Chrome 157-dev; plausible blind spot for GPU-side stalls).
   No source in this pass claimed LoAF measures presentation/GPU time.

---

## D. What I could not verify

1. **Chrome Frame Timing API status** — see B6 (chromestatus API response did not expose milestone data;
   MDN mirror exists). Building anything on it: blocked until verified.
2. **Whether a GPU/compositor-side stall produces zero LoAF entries.** Consistent with all docs read
   (LoAF is described in terms of main-thread/render phases) but no source states it as a negative case.
   Would test locally: force a raster-heavy frame on a real device with a LoAF observer attached and see
   whether entries appear (not run this session — game was not run, per task constraints).
3. **Dates for several cited pages** (flaviocopes, Request Metrics, PCB Store, Switchblade, Cloud Loadout,
   corewebvitals.io, SitePoint, parachutedesign, androidpolice, superchargebrowser, Madeira, flycast,
   Mping, WICG explainer, frameclock, clicktorelease). Weighted lower; used only for definitions/
   mechanisms that the dated primary sources independently support.
4. **Whether `requestIdleCallback` is available/appropriate on current Chrome-for-Android** (B6).
5. **The user's device refresh rate / whether rAF was capped at 60 by the panel** — A1 means the 60
   reading is consistent with a 60 Hz panel, but no capture-side evidence was gathered.
6. **The actual split of this run's sim-time loss between hit-stop and cap-bites** — requires in-page
   counters that do not exist yet (E). The arithmetic in A4 is an order-of-magnitude inference.
7. **Whether Chrome 157 really ships `styleDuration`/`forcedStyleDuration`** — only a proposal entry
   seen (B1).
8. **No 2026 web-specific frame-pacing library was found** — the negative is bounded: searches covered
   library/metric phrasing in English only; absence of a result is not absence of a project.

---

## E. Implications for this project

**E1 — Diagnosis, stated honestly.** The `?fps=1` overlay reports *rAF callback cadence* (A1), which is
display-locked and cannot show sim-time loss. Our loop *intentionally discards simulated time* under
overload (`maxFrameDt` 0.1 / `maxSteps` 5 + `acc = 0`, A3) and *deliberately freezes it* on hits
(`hitStopKill` 0.05 s, A4). Therefore the video's 0.67–0.77× ratio and much of its "micro-stutter" are
consistent with **designed** behaviour plus at least some unintended overload, and the recording cannot
separate the two (A4, C3). Do not tell the user "the game is running at 45 fps" on this evidence.

**E2 — Replace the 1 s average with instantaneous frame-time reporting.** Per-frame `dt` from the rAF
timestamp, kept as a fixed-bucket histogram of **frame times**, surfaced as p50/p95/p99 ms plus a
"frames > 2 dt" counter; ~30 lines, no dependencies (rule 2), values in `js/config.js` (rule 5). Justified
by: distribution-not-counter (sentry-unreal #1281), tail-metric sample-size caution (flycast #545),
cadence≠headroom (latish.dev). Report `ms` and `p95`, not "fps".

**E3 — Add the speed ground-truth as a *decomposed* sim/wall ratio — this is the 2026-supported pattern
with named prior art** (air-jam PR #128: `simulatedMs < wallMs` "is exactly the slow motion this is meant
to expose"; steampunk-miner #480: `ticksDroppedByCap` + frame p95; Specimen #196: sim/wall divergence as
a first-class metric). Concretely in `Loop`, per second: `simAdvanced = Σ(steps × step)`,
`intended = Σ(hitstop-seconds) + Σ(dt × (timescale − 1))`, `lostToGuardrails = Σ(dt) − clampedDt − …`
i.e. count every tick where `n === maxSteps` and every `dt > maxFrameDt` clamp. Display
`sim/wall = (advanced + intended)/wall` and show **intended vs lost separately** — that single split is
what turns the ambiguous 0.7 into an actionable number, and it is exactly what the video could not
establish.

**E4 — Hook LoAF as the cause-attribution channel, feature-detected.** `PerformanceObserver` on
`'long-animation-frame'` with `buffered:true`, summarised per second (count, max `duration`, top
`scripts[].sourceURL`). Our two test targets (Chrome desktop, Chrome for Android via Pages) are precisely
where LoAF ships since 123 (B1); Firefox/Safari users get the histogram + the ratio only, and the readout
must not misattribute their stalls (sketch-rts #392 lesson). Keep the threshold ≥50 ms in mind: an
unexplained hold with **no** LoAF entry points at GPU/compositor, matching our known fill-rate profile
(`docs/lag-research-2026-10-22.md`).
**E5 — Do not adopt INP as the run-smoothness metric** (B5): it is input-anchored. Do treat it as
*separately* relevant to the mobile touch controls, and keep it out of the FPS readout.
**E6 — Recording methodology upgrade for future test clips:** capture at the device's native frame rate if
the recorder allows, and run `truefps` on the MP4 to get true per-sample durations/longest stall instead of
assuming CFR (C4). Keep the in-game-clock cross-check: it is the only part of a recording that cannot be a
capture artifact.
**E7 — Do not add `requestIdleCallback` or any npm dependency** as a measurement crutch (B6, rule 2);
roll the instrumentation in-tree, behind the existing `?fps=1` gate (extend it to
`?fps=1` → histogram + ratio + LoAF summary).

Open decision for the user (not taken here): whether designed hit-stop should be *reduced* in dense
late-game moments (a feel change, needs sign-off) once E3 shows how much of the observed slowdown is
intended.
