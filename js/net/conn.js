// Co-op transport for the browser client (Phase 11, 11.2). Thin wrapper over
// the native WebSocket against the same origin that served the page (the
// serve.mjs co-op room). Node-safe import (no top-level side effects); the
// browser-only `new WebSocket(url)` happens in connect().
import { pack } from './coop.js';

export class CoopConn {
  constructor(url) {
    this.url = url;
    this.open = false;
    this.ws = null;
    this.onMessage = null; // (obj) — one handler owns dispatch (game)
  }

  connect() {
    if (this.ws) return;
    const ws = new WebSocket(this.url);
    this.ws = ws;
    ws.onopen = () => { this.open = true; };
    ws.onclose = () => { this.open = false; this.ws = null; this.onMessage && this.onMessage({ t: 'netclosed' }); };
    ws.onerror = () => {};
    ws.onmessage = (ev) => {
      const m = typeof ev.data === 'string' ? JSON.parse(ev.data) : null;
      if (m && this.onMessage) this.onMessage(m);
    };
  }

  send(obj) {
    if (!this.ws || this.ws.readyState !== 1) return;
    try { this.ws.send(pack(obj)); } catch { /* closing */ }
  }

  sendHello(levelKey, profile) { this.send({ t: 'hello', levelKey, profile }); }
  sendInput(mx, my, dash) { this.send({ t: 'input', mx, my, dash }); }
  sendState(id, body) { this.send(Object.assign({ t: 'state' }, body, { id })); }
  sendRunStart(id, seed, levelKey) { this.send({ t: 'runstart', id, seed, levelKey }); }
  sendClosed(reason) { this.send({ t: 'closed', reason }); }

  close() {
    if (this.ws) { try { this.ws.close(); } catch { /* already gone */ } this.ws = null; }
    this.open = false;
  }
}
