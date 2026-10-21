// Co-op transport for the browser client (Phase 11, 11.2). Thin wrapper over
// the native WebSocket against the same origin that served the page (the
// serve.mjs co-op room). Node-safe import (no top-level side effects); the
// browser-only `new WebSocket(url)` happens in connect().
import { pack, unpack } from './coop.js';

export class CoopConn {
  constructor(url) {
    this.url = url;
    this.open = false;
    this.ws = null;
    this._q = null; // non-array only while a handshake is in flight — see send()
    this.onMessage = null; // (obj) — one handler owns dispatch (game)
  }

  connect() {
    if (this.ws) return;
    const ws = new WebSocket(this.url);
    this.ws = ws;
    this._q = []; // queue until the handshake opens (attachNet sends hello synchronously)
    ws.onopen = () => {
      this.open = true;
      const q = this._q;
      this._q = null;
      for (const o of q) this.send(o); // flush in order
    };
    ws.onclose = () => { this.open = false; this.ws = null; this._q = null; this.onMessage && this.onMessage({ t: 'netclosed' }); };
    ws.onerror = () => {}; // the browser always fires 'close' right after — netclosed covers it
    ws.onmessage = (ev) => {
      const m = typeof ev.data === 'string' ? unpack(ev.data) : null; // malformed frame must not throw
      if (m && this.onMessage) this.onMessage(m);
    };
  }

  // Open → send now; still CONNECTING → queue (a hello fired right after
  // connect() would otherwise be dropped — readyState is 0 until open).
  send(obj) {
    if (this._q) { this._q.push(obj); return; }
    if (!this.ws || this.ws.readyState !== 1) return;
    try { this.ws.send(pack(obj)); } catch { /* closing */ }
  }

  sendHello(levelKey, profile) { this.send({ t: 'hello', levelKey, profile }); }
  sendInput(mx, my, dash) { this.send({ t: 'input', mx, my, dash }); }
  sendState(id, body) { this.send(Object.assign({ t: 'state' }, body, { id })); }
  sendRunStart(id, seed, levelKey, dur) { this.send({ t: 'runstart', id, seed, levelKey, dur }); } // dur: seconds | null = ENDLESS (17.3)
  // shards (14.2, D54): host run-end only — the run-level award every client accrues.
  sendClosed(reason, shards) { this.send(shards == null ? { t: 'closed', reason } : { t: 'closed', reason, shards }); }

  // Deliberate close: detach handlers first so the closing socket cannot deliver
  // a late netclosed after leave/run-end — that race would kill a fresh
  // connection the game opens in the meantime.
  close() {
    this._q = null;
    if (this.ws) {
      const ws = this.ws;
      ws.onopen = ws.onclose = ws.onerror = ws.onmessage = null;
      try { ws.close(); } catch { /* already gone */ }
      this.ws = null;
    }
    this.open = false;
  }
}
