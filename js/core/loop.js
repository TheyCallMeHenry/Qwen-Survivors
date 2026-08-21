// Fixed-timestep update loop with timescale + hit-stop.

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
      let dt = (t - this.last) / 1000;
      this.last = t;
      dt = Math.min(dt, 0.1); // clamp huge gaps (tab switch, debugger)
      if (this.hitstop > 0) this.hitstop -= dt;
      const ts = this.hitstop > 0 ? 0 : this.timescale;
      this.acc += dt * ts;
      let n = 0;
      while (this.acc >= this.step && n < 5) {
        this.update(this.step);
        this.acc -= this.step;
        n++;
      }
      if (n >= 5) this.acc = 0;
      if (this.render) this.render(dt);
      this._raf = requestAnimationFrame(this._frame);
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
