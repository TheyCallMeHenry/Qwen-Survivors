#!/usr/bin/env node
// Zero-dependency static server for the game. Port 47893, binds 0.0.0.0 so LAN devices can reach it.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';

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

function lanAddrs() {
  const out = [];
  for (const ifaces of Object.values(networkInterfaces()))
    for (const a of ifaces) if (a.family === 'IPv4' && !a.internal) out.push(a.address);
  return out;
}

// Entry point: `node tools/serve.mjs` (or `npm run serve`).
// (An argv[1]-vs-import.meta.url main-module gate misfired under Git Bash and silently no-opped.)
const srv = createGameServer();
srv.on('error', (err) => {
  console.error(`serve: ${err.message}`);
  process.exit(1);
});
srv.listen(PORT, '0.0.0.0', () => {
  console.log(`QWEN SURVIVORS — port ${PORT} (0.0.0.0)`);
  console.log(`  this machine: http://localhost:${PORT}`);
  for (const ip of lanAddrs()) console.log(`  lan:          http://${ip}:${PORT}`);
});
