// Smooth-follow camera: exponential tracking, velocity look-ahead, trauma shake.
// Node-safe. Exposes {x, y, w, h} (view center + size, CSS px) + {ox, oy} shake offset;
// game passes {x: cam.x + cam.ox, y: cam.y + cam.oy, w, h} as the view/cam object.
import { CFG } from '../config.js';
import { approach, clamp, rand } from '../utils/math.js';

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.w = 960;
    this.h = 540;
    this.shake = 0;   // trauma 0..1
    this.ox = 0;      // this frame's shake offset
    this.oy = 0;
  }

  setView(w, h) {
    this.w = w;
    this.h = h;
  }

  snap(x, y) {
    this.x = x;
    this.y = y;
    this.shake = 0;
    this.ox = this.oy = 0;
  }

  addShake(amt) {
    this.shake = Math.min(1, this.shake + amt);
  }

  // px,py = player pos; vx,vy = player velocity (look-ahead direction).
  update(dt, px, py, vx, vy) {
    const c = CFG.camera;
    const tx = px + vx * c.lead;
    const ty = py + vy * c.lead;
    const hw = this.w / 2, hh = this.h / 2;
    this.x = clamp(approach(this.x, tx, c.follow, dt), Math.min(hw, CFG.world.w / 2), Math.max(CFG.world.w - hw, CFG.world.w / 2));
    this.y = clamp(approach(this.y, ty, c.follow, dt), Math.min(hh, CFG.world.h / 2), Math.max(CFG.world.h - hh, CFG.world.h / 2));
    this.shake = Math.max(0, this.shake - c.shakeDecay * dt);
    const m = this.shake * this.shake * 16;
    this.ox = rand(-m, m);
    this.oy = rand(-m, m);
  }
}
