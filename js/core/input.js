// Unified input: keyboard + mouse (click-drag steer, right-click dash) + touch.
// Exposes normalized axes + edge-triggered dash/pause/mute/card selects.

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};
const DASH_CODES = new Set(['ShiftLeft', 'ShiftRight', 'Space', 'KeyK']);
const PREVENT_CODES = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
const STICK_RANGE = 52; // px for full deflection

export class Input {
  constructor(canvas, ui = {}) {
    this.canvas = canvas;
    this.ui = ui; // { joyBase, joyKnob, dashBtn }
    this.keys = Object.create(null);
    this.sticks = new Map(); // pointerId -> {ox,oy,dx,dy}
    this.dashEdge = false;
    this.pauseEdge = false;
    this.muteEdge = false;
    this.cardEdges = [false, false, false];
    this.gesture = false;
    this.isTouchUi = false;

    this._onKey = (e) => this.keydown(e);
    this._onKeyUp = (e) => this.keyup(e);
    this._onBlur = () => this.clearTransient();
    this._onPD = (e) => this.pointerDown(e);
    this._onPM = (e) => this.pointerMove(e);
    this._onPU = (e) => this.pointerUp(e);
    this._onCtx = (e) => e.preventDefault();
    this._onVis = () => { if (document.hidden) this.clearTransient(); };

    addEventListener('keydown', this._onKey, { passive: false });
    addEventListener('keyup', this._onKeyUp);
    addEventListener('blur', this._onBlur);
    document.addEventListener('visibilitychange', this._onVis);
    this.canvas.addEventListener('pointerdown', this._onPD);
    addEventListener('pointermove', this._onPM);
    addEventListener('pointerup', this._onPU);
    addEventListener('pointercancel', this._onPU);
    this.canvas.addEventListener('contextmenu', this._onCtx);
  }

  clearTransient() {
    this.keys = Object.create(null);
    this.sticks.clear();
    this.updateJoyUI();
  }

  keydown(e) {
    if (PREVENT_CODES.has(e.code)) e.preventDefault();
    this.gesture = true;
    if (e.repeat) return;
    const dir = KEYMAP[e.code];
    if (dir) { this.keys[dir] = true; return; }
    if (DASH_CODES.has(e.code)) this.dashEdge = true;
    else if (e.code === 'Escape' || e.code === 'KeyP') this.pauseEdge = true;
    else if (e.code === 'KeyM') this.muteEdge = true;
    else if (e.code === 'Digit1') this.cardEdges[0] = true;
    else if (e.code === 'Digit2') this.cardEdges[1] = true;
    else if (e.code === 'Digit3') this.cardEdges[2] = true;
  }

  keyup(e) {
    const dir = KEYMAP[e.code];
    if (dir) this.keys[dir] = false;
  }

  pointerDown(e) {
    this.gesture = true;
    if (e.pointerType === 'mouse' && e.button === 2) {
      // right-click = dash (mouse)
      this.dashEdge = true;
      return;
    }
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.sticks.set(e.pointerId, { ox: x, oy: y, dx: 0, dy: 0 });
    this.updateJoyUI();
  }

  pointerMove(e) {
    const s = this.sticks.get(e.pointerId);
    if (!s) return;
    const rect = this.canvas.getBoundingClientRect();
    s.dx = e.clientX - rect.left - s.ox;
    s.dy = e.clientY - rect.top - s.oy;
    this.updateJoyUI();
  }

  pointerUp(e) {
    this.sticks.delete(e.pointerId);
    this.updateJoyUI();
  }

  // Programmatic dash (touch button).
  queueDash() {
    this.gesture = true;
    this.dashEdge = true;
  }

  // Programmatic mute toggle (HUD button).
  queueMute() {
    this.gesture = true;
    this.muteEdge = true;
  }

  axes() {
    let x = 0, y = 0;
    if (this.keys.left) x -= 1;
    if (this.keys.right) x += 1;
    if (this.keys.up) y -= 1;
    if (this.keys.down) y += 1;
    if (x !== 0 || y !== 0) {
      const l = Math.hypot(x, y) || 1;
      return { x: x / l, y: y / l, source: 'key' };
    }
    let best = null;
    for (const s of this.sticks.values()) {
      const m = Math.hypot(s.dx, s.dy);
      if (m > 6 && (!best || m > best.m)) best = { m, dx: s.dx, dy: s.dy };
    }
    if (best) {
      const m = Math.min(1, best.m / STICK_RANGE);
      const a = Math.atan2(best.dy, best.dx);
      return { x: Math.cos(a) * m, y: Math.sin(a) * m, source: 'stick' };
    }
    return { x: 0, y: 0, source: 'none' };
  }

  consumeDash() { const d = this.dashEdge; this.dashEdge = false; return d; }
  consumePause() { const d = this.pauseEdge; this.pauseEdge = false; return d; }
  consumeMute() { const d = this.muteEdge; this.muteEdge = false; return d; }
  takeCardEdges() { const c = this.cardEdges; this.cardEdges = [false, false, false]; return c; }

  updateJoyUI() {
    const base = this.ui.joyBase, knob = this.ui.joyKnob;
    if (!base) return;
    let s = null;
    for (const st of this.sticks.values()) { if (!s || st.m > (s && s.m || 0)) { s = st; } }
    if (!s) { base.style.display = 'none'; return; }
    const W = innerWidth, H = innerHeight;
    const bx = Math.max(74, Math.min(W - 74, s.ox));
    const by = Math.max(74, Math.min(H - 74, s.oy));
    base.style.display = 'block';
    base.style.left = `${bx}px`;
    base.style.top = `${by}px`;
    const m = Math.hypot(s.dx, s.dy) || 1;
    const cx = (s.dx / m) * Math.min(m, STICK_RANGE);
    const cy = (s.dy / m) * Math.min(m, STICK_RANGE);
    knob.style.transform = `translate(${cx}px, ${cy}px)`;
  }
}
