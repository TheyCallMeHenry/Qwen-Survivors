#!/usr/bin/env node
// Zero-dependency static server + co-op WebSocket room (Phase 11).
// Port 47893, binds 0.0.0.0 so LAN devices can reach it.
// 1 room = 1 run; the server only relays frames — the host browser runs the
// sim (host-authoritative, 11.2). Import-safe: nothing starts on import.
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { MSG, pack, unpack, createRoom, joinRoom, leaveRoom, closeRoom } from '../js/net/coop.js';

export const PORT = 47893;
const ROOT = resolve(join(dirname(fileURLToPath(import.meta.url)), '..'));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

export function createGameServer(root = ROOT) {
  root = resolve(root);
  return createServer(async (req, res) => {
    const send = (code, type, body = '') => {
      if (res.headersSent) return;
      res.writeHead(code, {
        'content-type': type,
        'content-length': Buffer.byteLength(body),
        'cache-control': 'no-cache',
      });
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (p === '/') p = '/index.html';
      const file = resolve(join(root, '.' + p));
      if (file !== root && !file.startsWith(root + sep)) return send(404, 'text/plain; charset=utf-8', '404 Not Found');
      const st = await stat(file).catch(() => null);
      if (!st || !st.isFile()) return send(404, 'text/plain; charset=utf-8', '404 Not Found');
      const body = await readFile(file);
      send(200, MIME[extname(file).toLowerCase()] || 'application/octet-stream', body);
    } catch (err) {
      console.error(err);
      send(500, 'text/plain; charset=utf-8', '500 Internal Server Error');
    }
  });
}

// ---------- co-op WebSocket room (RFC 6455, text frames only) ----------

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const OP_TEXT = 0x1, OP_CLOSE = 0x8, OP_PING = 0x9, OP_PONG = 0xa;
const MAX_PAYLOAD = 64 * 1024; // state snapshots are small — bound frame size

export function wsAcceptKey(key) {
  return createHash('sha1').update(key + GUID).digest('base64');
}

// Server→client frame: FIN + opcode, unmasked.
export function encodeFrame(opcode, payload) {
  const data = Buffer.isBuffer(payload) ? payload : Buffer.from(String(payload));
  const len = data.length;
  let head;
  if (len < 126) { head = Buffer.alloc(2); head[1] = len; }
  else if (len < 65536) { head = Buffer.alloc(4); head[1] = 126; head.writeUInt16BE(len, 2); }
  else { head = Buffer.alloc(10); head[1] = 127; head.writeBigUInt64BE(BigInt(len), 2); }
  head[0] = 0x80 | opcode;
  return Buffer.concat([head, data]);
}

// Incrementally consume client→server frames from buf. Client frames are
// masked (RFC 6455 §5.1). Protocol here is unfragmented text, so continuation
// frames are a protocol error. Returns { rest, error }.
export function consumeFrames(buf, emit) {
  let off = 0;
  while (true) {
    if (buf.length - off < 2) break;
    const b0 = buf[off], b1 = buf[off + 1];
    const op = b0 & 0x0f, masked = (b1 & 0x80) !== 0;
    const len1 = b1 & 0x7f;
    let len = len1, at = off + 2;
    if (len1 === 126) {
      if (buf.length - off < 4) break;
      len = buf.readUInt16BE(off + 2); at = off + 4;
    } else if (len1 === 127) {
      if (buf.length - off < 10) break;
      len = Number(buf.readBigUInt64BE(off + 2)); at = off + 10;
    }
    if (masked) at += 4;
    if (len > MAX_PAYLOAD) return { rest: Buffer.alloc(0), error: 'max-payload' };
    if (buf.length < at + len) break; // partial frame — wait for more bytes
    const payload = buf.slice(at, at + len);
    off = at + len;
    if (masked) {
      const mask = buf.slice(at - 4, at);
      for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
    }
    if (op === OP_TEXT) emit({ type: 'text', str: payload.toString('utf8') });
    else if (op === OP_CLOSE) emit({ type: 'close', code: payload.length >= 2 ? payload.readUInt16BE(0) : 1000 });
    else if (op === OP_PING) emit({ type: 'ping', payload });
    else if (op === OP_PONG) emit({ type: 'pong' });
    else return { rest: Buffer.alloc(0), error: 'bad-opcode' }; // incl. continuation (fragmented)
  }
  return { rest: buf.slice(off) };
}

// Attach the co-op room to an http server (the 'upgrade' hook). One room for
// the process lifetime of the server: first hello opens it, run end/host
// leave closes it, next hello starts a fresh room.
export function attachCoopRoom(server) {
  let room = null;
  const conns = new Map(); // socket → { id, buf }
  const nextId = { n: 0 };

  const send = (c, obj) => { try { c.sock.write(encodeFrame(OP_TEXT, pack(obj))); } catch { /* closing */ } };
  const broadcast = (obj) => { for (const v of conns.values()) send(v, obj); };
  const rosterMsg = (r) => ({ t: MSG.roster, ids: r.players.map((p) => p.id), levelKey: r.levelKey });

  server.on('upgrade', (req, sock) => {
    const key = req.headers['sec-websocket-key'];
    if (req.headers.upgrade?.toLowerCase() !== 'websocket' || typeof key !== 'string') {
      sock.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
      sock.destroy();
      return;
    }
    sock.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${wsAcceptKey(key)}\r\n\r\n`
    );

    const c = { id: ++nextId.n, buf: Buffer.alloc(0), sock };
    conns.set(sock, c);

    sock.on('data', (chunk) => {
      c.buf = Buffer.concat([c.buf, chunk]);
      const r = consumeFrames(c.buf, (ev) => {
        if (ev.type === 'text') {
          const m = unpack(ev.str);
          if (!m || typeof m.t !== 'string') return;
          if (m.t === MSG.hello) {
            if (room && room.status === 'open') {
              const res = joinRoom(room, { id: c.id, profile: m.profile && typeof m.profile === 'object' ? m.profile : null });
              if (!res.ok) { send(c, { t: MSG.full }); return; }
              send(c, { t: MSG.joined, id: c.id, seat: res.seat, n: res.n, levelKey: res.levelKey });
              broadcast(rosterMsg(room));
            } else {
              room = createRoom(typeof m.levelKey === 'string' ? m.levelKey : 'm01');
              const res = joinRoom(room, { id: c.id, profile: m.profile && typeof m.profile === 'object' ? m.profile : null });
              send(c, { t: MSG.joined, id: c.id, seat: res.seat, n: res.n, levelKey: res.levelKey });
              broadcast(rosterMsg(room));
            }
          } else if (room && (m.t === MSG.input || m.t === MSG.state || m.t === MSG.runstart)) {
            const from = room.players.find((p) => p.id === c.id);
            if (!from) return; // not seated — ignore
            // Relay to the OTHER seated clients (the sender already owns that
            // input/sim locally — the host applies local input directly).
            const msg = m.t === MSG.input
              ? { t: MSG.input, id: from.id, mx: num(m.mx), my: num(m.my), dash: !!m.dash }
              : m.t === MSG.state
                ? { t: MSG.state, id: from.id, step: num(m.step), tick: num(m.tick), players: Array.isArray(m.players) ? m.players : [], score: num(m.score), kills: num(m.kills) }
                : { t: MSG.runstart, id: from.id, seed: num(m.seed) };
            for (const v of conns.values()) if (v.id !== c.id) send(v, msg);
          } else if (m.t === MSG.closed) {
            // host ends the room explicitly (run over / quit)
            const from = room.players.find((p) => p.id === c.id);
            if (from && from.seat === 0) { closeRoom(room, 'host'); for (const v of conns.values()) send(v, { t: MSG.closed, reason: 'host' }); room = null; }
          }
        } else if (ev.type === 'ping') sock.write(encodeFrame(OP_PONG, ev.payload));
        else if (ev.type === 'close') sock.end(encodeFrame(OP_CLOSE, ev.payload));
      });
      c.buf = r.error ? Buffer.alloc(0) : r.rest;
      if (r.error) sock.destroy();
    });

    const bye = () => {
      if (!conns.has(sock)) return;
      conns.delete(sock);
      const had = room && room.players.some((p) => p.id === c.id);
      if (had) {
        const r = leaveRoom(room, c.id);
        if (r.closed) { broadcast({ t: MSG.closed, reason: 'host-leave' }); room = null; }
        else { broadcast({ t: MSG.left, id: c.id }); broadcast(rosterMsg(room)); }
      }
    };
    sock.on('close', bye);
    sock.on('error', bye);
  });

  // For tests/inspection.
  attachCoopRoom.room = () => room;
}

function num(v) { return typeof v === 'number' && Number.isFinite(v) ? v : 0; }

function lanAddrs() {
  const out = [];
  for (const ifaces of Object.values(networkInterfaces()))
    for (const a of ifaces) if (a.family === 'IPv4' && !a.internal) out.push(a.address);
  return out;
}

// Entry point: `node tools/serve.mjs` (or `npm run serve`). Importing this
// module (tests) has no side effects — the guard compares resolved paths.
const isMain = (() => {
  try { return !!process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();

if (isMain) {
  const srv = createGameServer();
  srv.on('error', (err) => {
    console.error(`serve: ${err.message}`);
    process.exit(1);
  });
  attachCoopRoom(srv);
  srv.listen(PORT, '0.0.0.0', () => {
    console.log(`QWEN SURVIVORS — port ${PORT} (0.0.0.0)`);
    console.log(`  this machine: http://localhost:${PORT}`);
    for (const ip of lanAddrs()) console.log(`  lan:          http://${ip}:${PORT}`);
  });
}
