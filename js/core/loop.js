// Fixed-timestep update loop with timescale + hit-stop.
// Timing guardrails (frame clamp + backlog cap) live in CFG.loop; the 1/60 step
// is the architecture invariant and stays here.
import { CFG } from '../config.js';

// 31.1 — ?fps=1 v2 diagnostics. A PerfCounters instance is attached to a Loop ONLY
// when the URL gate is on (js/main.js); with none attached the hot path pays a single
// null check. It instruments the exact time-discarding sites of Loop._frame so the
// readout can tell "deliberately frozen" apart from "discarded by overload" — the
// split the 29.1 1-second rAF average was provably blind to (displayed 60.0 through
// a 15 s frozen screen; docs/fps-test-video-review-2026-10-23.md §C).
//
// Window accounting — EXACT identity, every component summed per display window:
//   wall = advanced + intended + lostClamp + lostCap + idle + accDrift
//   advanced  = Σ n·step             simulated time actually run (n = steps taken per frame)
//   intended  = Σ dt·(1−ts)          deliberate non-simulation: ts=0 during hit-stop,
//                                    ts=timescale<1 slow-motion (never a performance fault)
//   lostClamp = Σ (rawW − dt)        wall beyond CFG.loop.maxFrameDt, clamped away (tab switch, stall)
//   lostCap   = Σ acc at CFG.loop.maxSteps cap — the backlog dropped by the `acc = 0` line
//   idle      = wall − Σ rawW, SIGNED (positive = NO rAF callback ran in that stretch —
//               compositor/display freeze, the blindness of the 29.1 counter;
//               negative = a frame straddling the window start, its wall time was already
//               accounted in the previous window; clamping it away would silently break
//               the identity, so it is shown as-is — seen only in the boundary second)
//   accDrift  = loop.acc(window end) − loop.acc(window start): sub-step carry between windows;
//               always 0 ≤ |accDrift| < one step, tracked explicitly so the identity stays exact.
// sim/wall ratio = advanced / wall (true game speed); (advanced+intended)/wall = the fraction
// of wall the game spent healthy-or-deliberately-slow (research doc §E3).
//
// Frame times: pre-allocated Float64Array ring (CFG.perf.frameHist slots ≈ the last 5 s at
// 60 Hz), written per frame with no allocation. Percentiles use nearest-rank
// (index = ceil(p/100·n)−1 over ascending values) and are computed ONLY in sample(),
// once per display tick — never in the hot path (repo perf guardrail).
export class PerfCounters {
  constructor({ step }) {
    this.step = step;
    this._hist = new Float64Array(CFG.perf.frameHist);
    this._histIdx = 0; // next write slot (wraps)
    this._histLen = 0; // values currently held (capped at ring size)
    this.resetWindow(0, 0);
  }
  // Start a measurement window at wall clock `nowMs` (performance.now domain),
  // recording the loop's accumulator as the window's starting carry.
  beginWindow(nowMs, acc) { this.resetWindow(nowMs, acc); }
  resetWindow(nowMs, acc) {
    this.windowStart = nowMs;
    this.accStart = acc;
    this.rawSum = 0; // Σ raw wall-deltas of the frames seen (s) — used to derive `idle`
    this.advanced = 0; this.intended = 0; this.lostClamp = 0; this.lostCap = 0;
    this.frames = 0;
    this.loafN = 0; this.loafMax = 0; // Long Animation Frames summary (fed from main.js)
  }
  // Per-frame hook, called by Loop._frame when a collector is attached. Positional
  // primitives only: no object/array/string allocation in the hot path.
  frame(rawW, dt, ts, n, dropped) {
    const h = this._hist;
    h[this._histIdx] = rawW * 1000;
    this._histIdx = (this._histIdx + 1) % h.length;
    if (this._histLen < h.length) this._histLen++;
    this.rawSum += rawW;
    this.advanced += n * this.step;
    this.intended += dt * (1 - ts);
    this.lostClamp += rawW - dt; // 0 unless the frame was clamped (rawW > maxFrameDt)
    this.lostCap += dropped;     // acc zeroed by the maxSteps guardrail this frame
    this.frames++;
  }
  // LoAF entry fed from the feature-detected PerformanceObserver in main.js.
  longFrame(durationMs) {
    this.loafN++;
    if (durationMs > this.loafMax) this.loafMax = durationMs;
  }
  // Read the window (computing percentiles here, once per display tick) and restart it.
  // `nowMs`/`accNow` are the wall clock and loop.acc at read time.
  sample(nowMs, accNow) {
    const wall = (nowMs - this.windowStart) / 1000;
    const idle = wall - this.rawSum; // signed — see the identity block above
    const n = this._histLen;
    let p50 = 0, p95 = 0, p99 = 0;
    if (n > 0) {
      const arr = this._hist.slice(0, n).sort(); // numeric sort is typed-array default
      const rank = (p) => arr[Math.max(0, Math.ceil((p / 100) * n) - 1)];
      p50 = rank(50); p95 = rank(95); p99 = rank(99);
    }
    const out = {
      wall,
      advanced: this.advanced,
      intended: this.intended,
      lostClamp: this.lostClamp,
      lostCap: this.lostCap,
      idle,
      accDrift: accNow - this.accStart,
      frames: this.frames,
      loafN: this.loafN,
      loafMax: this.loafMax,
      p50, p95, p99,
      ratio: wall > 0 ? this.advanced / wall : 0,
    };
    this.resetWindow(nowMs, accNow);
    return out;
  }
}

export class Loop {
  constructor({ update, render }) {
    this.update = update;
    this.render = render;
    this.timescale = 1;
    this.hitstop = 0;
    this.running = false;
    this.last = 0;
    this.acc = 0;
    this.step = 1 / 60;
    this.frames = 0; // rAF ticks executed (kept for diagnostics; see PerfCounters for pacing truth)
    this.perf = null; // PerfCounters when ?fps=1 is active; null = diagnostics off (31.1)
    this._raf = null;
    this._frame = (t) => {
      if (!this.running) return;
      // Schedule the next frame BEFORE running the current one: a throwing
      // update/render must cost one bad frame, never the whole loop (the old
      // bottom-of-body reschedule severed the rAF chain on any exception).
      this._raf = requestAnimationFrame(this._frame);
      this.frames++;
      const rawW = (t - this.last) / 1000; // true wall delta between rAF callbacks
      this.last = t;
      let dt = Math.min(rawW, CFG.loop.maxFrameDt); // clamp huge gaps (tab switch, debugger)
      if (this.hitstop > 0) this.hitstop -= dt;
      const ts = this.hitstop > 0 ? 0 : this.timescale;
      this.acc += dt * ts;
      let n = 0;
      while (this.acc >= this.step && n < CFG.loop.maxSteps) {
        this.update(this.step);
        this.acc -= this.step;
        n++;
      }
      let dropped = 0;
      if (n >= CFG.loop.maxSteps) { dropped = this.acc; this.acc = 0; }
      if (this.perf) this.perf.frame(rawW, dt, ts, n, dropped);
      if (this.render) this.render(dt);
    };
  }
  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this._raf = requestAnimationFrame(this._frame);
  }
  stop() {
    this.running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }
  hitStop(s) { this.hitstop = Math.max(this.hitstop, s); }
}
