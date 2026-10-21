// Fixed-timestep update loop with timescale + hit-stop.
// Timing guardrails (frame clamp + backlog cap) live in CFG.loop; the 1/60 step
// is the architecture invariant and stays here.
import { CFG } from '../config.js';

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
    this._raf = null;
    this._frame = (t) => {
      if (!this.running) return;
      // Schedule the next frame BEFORE running the current one: a throwing
      // update/render must cost one bad frame, never the whole loop (the old
      // bottom-of-body reschedule severed the rAF chain on any exception).
      this._raf = requestAnimationFrame(this._frame);
      let dt = (t - this.last) / 1000;
      this.last = t;
      dt = Math.min(dt, CFG.loop.maxFrameDt); // clamp huge gaps (tab switch, debugger)
      if (this.hitstop > 0) this.hitstop -= dt;
      const ts = this.hitstop > 0 ? 0 : this.timescale;
      this.acc += dt * ts;
      let n = 0;
      while (this.acc >= this.step && n < CFG.loop.maxSteps) {
        this.update(this.step);
        this.acc -= this.step;
        n++;
      }
      if (n >= CFG.loop.maxSteps) this.acc = 0;
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
