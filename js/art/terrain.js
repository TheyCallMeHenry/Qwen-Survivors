// Terrain: grass tiles, ground decals, trees, rocks, village props, mountains, lakes.
// Standing sprites have their base (feet/bottom) at the bottom-center of the canvas.

import { makeCanvas, poly, sideShade, rimLight, flipX } from './base.js';
import { mulberry32, TAU, lerp } from '../utils/math.js';

function grassTile2(rng, tone) {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  g.fillStyle = ['#22331f', '#1f2f1d', '#243621'][tone];
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 24; i++) {
    const x = rng() * 256, y = rng() * 256, r = 16 + rng() * 34;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, rng() < 0.5 ? 'rgba(58,92,52,0.10)' : 'rgba(12,20,10,0.12)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 90; i++) {
    g.fillStyle = rng() < 0.5 ? 'rgba(84,120,70,0.5)' : 'rgba(16,26,16,0.5)';
    g.fillRect(rng() * 256, rng() * 256, 2, 1);
  }
  for (let i = 0; i < 6; i++) {
    g.fillStyle = 'rgba(247,184,200,0.5)';
    g.beginPath();
    g.ellipse(rng() * 256, rng() * 256, 2.2, 1.2, rng() * TAU, 0, TAU);
    g.fill();
  }
  return c;
}

function grassTile(rng, tone) {
  const c = makeCanvas(256, 256);
  const g = c.getContext('2d');
  g.fillStyle = ['#141d18', '#16201a', '#131b16'][tone];
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 24; i++) {
    const x = rng() * 256, y = rng() * 256, r = 16 + rng() * 34;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, rng() < 0.5 ? 'rgba(46,66,50,0.10)' : 'rgba(8,14,10,0.12)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 90; i++) {
    g.fillStyle = rng() < 0.5 ? 'rgba(52,74,56,0.5)' : 'rgba(10,16,12,0.5)';
    g.fillRect(rng() * 256, rng() * 256, 2, 1);
  }
  return c;
}

function tuft() {
  const c = makeCanvas(20, 16);
  const g = c.getContext('2d');
  g.strokeStyle = 'rgba(58,88,64,0.9)';
  g.lineWidth = 1.4;
  for (let i = 0; i < 6; i++) {
    const x = 3 + i * 2.6;
    g.beginPath();
    g.moveTo(x, 15);
    g.quadraticCurveTo(x + (i % 2 ? 2 : -2), 8, x + (i % 2 ? 3 : -3), 2 + (i % 3) * 2);
    g.stroke();
  }
  return c;
}

function pebble() {
  const c = makeCanvas(16, 10);
  const g = c.getContext('2d');
  g.fillStyle = '#3a4150';
  g.beginPath(); g.ellipse(5, 6, 4, 2.6, 0, 0, TAU); g.fill();
  g.fillStyle = '#454e5e';
  g.beginPath(); g.ellipse(11, 7, 3, 2, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(160,180,210,0.25)';
  g.beginPath(); g.ellipse(4, 5, 2, 1, 0, 0, TAU); g.fill();
  return c;
}

function flower(kind) {
  const c = makeCanvas(12, 14);
  const g = c.getContext('2d');
  g.strokeStyle = '#3c5a40';
  g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(6, 13); g.lineTo(6, 5); g.stroke();
  g.fillStyle = kind === 'a' ? '#cfd4f2' : '#8fb8e8';
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * TAU;
    g.beginPath();
    g.ellipse(6 + Math.cos(a) * 2.4, 4.5 + Math.sin(a) * 2.4, 2, 1.4, a, 0, TAU);
    g.fill();
  }
  g.fillStyle = '#f2e6a0';
  g.beginPath(); g.arc(6, 4.5, 1.3, 0, TAU); g.fill();
  return c;
}

function bone() {
  const c = makeCanvas(20, 8);
  const g = c.getContext('2d');
  g.strokeStyle = '#cfc9b8';
  g.lineWidth = 2.4;
  g.beginPath(); g.moveTo(4, 5); g.lineTo(16, 4); g.stroke();
  g.fillStyle = '#cfc9b8';
  for (const x of [3, 6, 14, 17]) { g.beginPath(); g.arc(x, 4.5, 1.4, 0, TAU); g.fill(); }
  return c;
}

// Soft radial ground patch (moss / mud).
function blob(w, h, rgb, a) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
  grad.addColorStop(0, `rgba(${rgb},${a})`);
  grad.addColorStop(0.7, `rgba(${rgb},${a * 0.55})`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  return c;
}

function pineTree(v) {
  const w = 64, h = 88;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const rng = mulberry32(31 + v * 7);
  const col = ['#16281c', '#182c1f', '#152618', '#1a2e21'][v];
  g.fillStyle = '#2a2018';
  g.fillRect(28, 70, 8, 18);
  for (let i = 0; i < 3; i++) {
    const ty = 12 + i * 22, tw = 14 + i * 8, th = 30;
    const sway = (rng() - 0.5) * 5;
    poly(g, [[32 + sway, ty], [32 - tw, ty + th], [32 + tw, ty + th]]);
    g.fillStyle = col;
    g.fill();
    sideShade(g, w, h, 'right', 0.34);
    rimLight(g, 'rgba(150,180,170,0.14)');
  }
  return c;
}

function pineBigTree(v) {
  const w = 90, h = 120;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const rng = mulberry32(57 + v * 11);
  const col = v ? '#182c1f' : '#16281c';
  g.fillStyle = '#2a2018';
  g.fillRect(41, 104, 8, 16);
  for (let i = 0; i < 3; i++) {
    const ty = 16 + i * 30, tw = 18 + i * 10, th = 34;
    const sway = (rng() - 0.5) * 6;
    poly(g, [[45 + sway, ty], [45 - tw, ty + th], [45 + tw, ty + th]]);
    g.fillStyle = col;
    g.fill();
    sideShade(g, w, h, 'right', 0.34);
    // snow on the tier tip
    poly(g, [[45 + sway, ty], [45 + sway - 9, ty + 9], [45 + sway + 9, ty + 9]]);
    g.fillStyle = 'rgba(224,234,252,0.85)';
    g.fill();
    rimLight(g, 'rgba(150,180,170,0.12)');
  }
  return c;
}

function deadTreeSprite() {
  const c = makeCanvas(44, 92);
  const g = c.getContext('2d');
  g.lineCap = 'round';
  g.strokeStyle = '#3a2f26';
  g.lineWidth = 7;
  g.beginPath(); g.moveTo(22, 92); g.lineTo(20, 40); g.stroke();
  g.lineWidth = 4;
  g.beginPath(); g.moveTo(20, 52); g.lineTo(4, 30); g.stroke();
  g.beginPath(); g.moveTo(21, 44); g.lineTo(38, 22); g.stroke();
  g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(6, 34); g.lineTo(14, 24); g.stroke();
  g.beginPath(); g.moveTo(34, 26); g.lineTo(40, 12); g.stroke();
  return c;
}

function boulder(v) {
  const w = v ? 36 : 48, h = v ? 28 : 36;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const rng = mulberry32(90 + v * 13);
  const pts = [[3, h]];
  for (let i = 0; i <= 5; i++) pts.push([3 + (w - 6) * i / 5, h - 6 - rng() * (h - 14)]);
  pts.push([w - 3, h]);
  poly(g, pts);
  g.fillStyle = v ? '#454e5e' : '#3c4454';
  g.fill();
  sideShade(g, w, h, 'right', 0.35);
  rimLight(g, 'rgba(170,190,220,0.22)');
  return c;
}

function stumpSprite() {
  const c = makeCanvas(36, 26);
  const g = c.getContext('2d');
  g.fillStyle = '#4a3826';
  g.fillRect(8, 8, 20, 18);
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(8, 8, 20, 4);
  g.fillStyle = '#6b543c';
  g.beginPath(); g.ellipse(18, 9, 10, 5, 0, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.3)';
  g.beginPath(); g.ellipse(18, 9, 6, 3, 0, 0, TAU); g.stroke();
  return c;
}

function mushroomSprite() {
  const c = makeCanvas(20, 22);
  const g = c.getContext('2d');
  g.fillStyle = '#d8d2c4';
  g.fillRect(8, 13, 4, 9);
  g.fillStyle = '#a03a30';
  g.beginPath(); g.ellipse(10, 10, 8, 6, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(230,225,210,0.8)';
  g.beginPath(); g.arc(7, 8, 1.4, 0, TAU); g.fill();
  g.beginPath(); g.arc(13, 11, 1.1, 0, TAU); g.fill();
  return c;
}

function monolithSprite() {
  const w = 44, h = 96;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  poly(g, [[12, 96], [15, 24], [22, 12], [30, 14], [32, 96]]);
  g.fillStyle = '#242c3e';
  g.fill();
  sideShade(g, w, h, 'right', 0.4);
  rimLight(g, 'rgba(150,190,255,0.25)');
  // rune glow (wide faint under, thin bright over)
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(120,230,255,0.25)';
  g.lineWidth = 5;
  g.beginPath(); g.moveTo(22, 30); g.lineTo(26, 42); g.lineTo(20, 54); g.stroke();
  g.strokeStyle = 'rgba(120,230,255,0.9)';
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(22, 30); g.lineTo(26, 42); g.lineTo(20, 54); g.stroke();
  return c;
}

function campfireSprite() {
  const c = makeCanvas(56, 48);
  const g = c.getContext('2d');
  g.strokeStyle = '#4a3421';
  g.lineWidth = 5;
  g.lineCap = 'round';
  g.beginPath(); g.moveTo(18, 40); g.lineTo(38, 32); g.stroke();
  g.beginPath(); g.moveTo(38, 40); g.lineTo(18, 32); g.stroke();
  g.fillStyle = '#454e5e';
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * TAU;
    g.beginPath();
    g.ellipse(28 + Math.cos(a) * 17, 38 + Math.sin(a) * 7, 4, 3, 0, 0, TAU);
    g.fill();
  }
  poly(g, [[28, 4], [36, 22], [32, 34], [24, 34], [20, 22]]);
  g.fillStyle = '#e07a28';
  g.fill();
  poly(g, [[28, 12], [33, 24], [30, 33], [26, 33], [23, 24]]);
  g.fillStyle = '#ffcf5a';
  g.fill();
  return c;
}

function hut(v) {
  const w = 120, h = 96;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  g.fillStyle = v ? '#443626' : '#4a3a2a';
  g.fillRect(18, 46, 84, 48);
  g.strokeStyle = 'rgba(0,0,0,0.25)';
  g.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    g.beginPath(); g.moveTo(18, 46 + i * 12); g.lineTo(102, 46 + i * 12); g.stroke();
  }
  g.fillStyle = '#241c14';
  g.fillRect(52, 62, 16, 32);
  const wx = v ? 78 : 28;
  g.fillStyle = '#e8b878';
  g.fillRect(wx, 58, 13, 13);
  g.strokeStyle = 'rgba(0,0,0,0.4)';
  g.strokeRect(wx + 0.5, 58.5, 12, 12);
  poly(g, [[8, 48], [60, 12], [112, 48]]);
  g.fillStyle = '#2a211a';
  g.fill();
  sideShade(g, w, h, 'right', 0.3);
  // snow band on the roof
  poly(g, [[14, 44], [60, 13], [106, 44], [98, 44], [60, 17], [22, 44]]);
  g.fillStyle = 'rgba(222,232,250,0.85)';
  g.fill();
  g.fillStyle = '#3a3040';
  g.fillRect(78, 22, 10, 18);
  return c;
}

function wellSprite() {
  const c = makeCanvas(56, 64);
  const g = c.getContext('2d');
  g.fillStyle = '#3c4454';
  g.fillRect(12, 38, 32, 24);
  g.fillStyle = '#2e3544';
  for (let i = 0; i < 4; i++) g.fillRect(14 + i * 8, 42 + (i % 2) * 8, 7, 4);
  g.fillStyle = '#0e1118';
  g.beginPath(); g.ellipse(28, 40, 14, 5, 0, 0, TAU); g.fill();
  g.fillStyle = '#3a2e20';
  g.fillRect(14, 14, 5, 26);
  g.fillRect(37, 14, 5, 26);
  poly(g, [[8, 18], [28, 4], [48, 18]]);
  g.fillStyle = '#2a211a';
  g.fill();
  poly(g, [[12, 16], [28, 5], [44, 16], [40, 15], [28, 7], [16, 15]]);
  g.fillStyle = 'rgba(222,232,250,0.8)';
  g.fill();
  return c;
}

// --- m02 (Higan) ground decals ---

function tuftG() {
  const c = makeCanvas(20, 16);
  const g = c.getContext('2d');
  g.strokeStyle = 'rgba(88,128,74,0.9)';
  g.lineWidth = 1.4;
  for (let i = 0; i < 6; i++) {
    const x = 3 + i * 2.6;
    g.beginPath();
    g.moveTo(x, 15);
    g.quadraticCurveTo(x + (i % 2 ? 2 : -2), 8, x + (i % 2 ? 3 : -3), 2 + (i % 3) * 2);
    g.stroke();
  }
  return c;
}

function flowerC() { // cherry-blossom sprig
  const c = makeCanvas(12, 14);
  const g = c.getContext('2d');
  g.strokeStyle = '#4a5a3a';
  g.lineWidth = 1.2;
  g.beginPath(); g.moveTo(6, 13); g.lineTo(6, 5); g.stroke();
  g.fillStyle = '#f5c3d0';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    g.beginPath();
    g.ellipse(6 + Math.cos(a) * 2.4, 4.5 + Math.sin(a) * 2.4, 2, 1.4, a, 0, TAU);
    g.fill();
  }
  g.fillStyle = '#ffe9f0';
  g.beginPath(); g.arc(6, 4.5, 1.2, 0, TAU); g.fill();
  return c;
}

function petalDrop() {
  const c = makeCanvas(14, 10);
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(247,184,200,0.55)';
  for (const [x, y, r, rot] of [[4, 6, 2.6, 0.4], [10, 4, 2.2, -0.7]]) {
    g.beginPath();
    g.ellipse(x, y, r, r * 0.6, rot, 0, TAU);
    g.fill();
  }
  return c;
}

function stone() {
  const c = makeCanvas(22, 14);
  const g = c.getContext('2d');
  g.fillStyle = '#5a5f66';
  g.beginPath(); g.ellipse(8, 9, 6, 4.4, 0, 0, TAU); g.fill();
  g.fillStyle = '#6a7078';
  g.beginPath(); g.ellipse(16, 10, 4, 2.8, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(200,210,220,0.2)';
  g.beginPath(); g.ellipse(7, 7.5, 3, 1.6, 0, 0, TAU); g.fill();
  return c;
}

function pathSlab(v) { // 46x32 stone slab
  const c = makeCanvas(46, 32);
  const g = c.getContext('2d');
  g.fillStyle = ['#565b63', '#4f545c', '#5c616a'][v];
  poly(g, [[4, 8], [20, 3], [40, 6], [43, 20], [30, 29], [8, 27], [2, 16]]);
  g.fill();
  g.strokeStyle = 'rgba(20,24,30,0.4)';
  g.lineWidth = 1.5;
  g.stroke();
  g.fillStyle = 'rgba(210,216,226,0.1)';
  g.beginPath(); g.ellipse(20, 12, 12, 5, -0.15, 0, TAU); g.fill();
  return c;
}

// --- m02 (Higan) standing sprites ---

function cherryTree(v) { // 64x88: trunk + 5-6 pink radial blobs
  const w = 64, h = 88;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const rng = mulberry32(201 + v * 7);
  g.lineCap = 'round';
  g.strokeStyle = '#3a2a26';
  g.lineWidth = 6;
  g.beginPath(); g.moveTo(32, 88); g.quadraticCurveTo(30, 60, 32, 44); g.stroke();
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(31, 62); g.quadraticCurveTo(18, 52, 12, 40); g.stroke();
  g.beginPath(); g.moveTo(32, 58); g.quadraticCurveTo(46, 48, 52, 38); g.stroke();
  const cols = ['#e896ae', '#e28aa4', '#ee9fb6', '#df85a0'];
  const n = 5 + (rng() * 2 | 0);
  for (let i = 0; i < n; i++) {
    const px = 14 + rng() * 36, py = 12 + rng() * 30, pr = 13 + rng() * 9;
    const grad = g.createRadialGradient(px, py, pr * 0.3, px, py, pr);
    grad.addColorStop(0, cols[v]);
    grad.addColorStop(0.75, cols[(v + 1) % 4]);
    grad.addColorStop(1, 'rgba(214,120,150,0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
  }
  return c;
}

function cherryBigTree(v) { // 90x120
  const w = 90, h = 120;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const rng = mulberry32(301 + v * 11);
  g.lineCap = 'round';
  g.strokeStyle = '#42302a';
  g.lineWidth = 9;
  g.beginPath(); g.moveTo(45, 120); g.quadraticCurveTo(42, 84, 45, 60); g.stroke();
  g.lineWidth = 4;
  g.beginPath(); g.moveTo(44, 92); g.quadraticCurveTo(26, 78, 16, 60); g.stroke();
  g.beginPath(); g.moveTo(46, 84); g.quadraticCurveTo(64, 70, 76, 52); g.stroke();
  const cols = ['#f0a4b8', '#e694a8'];
  for (let i = 0; i < 7; i++) {
    const px = 18 + rng() * 54, py = 16 + rng() * 40, pr = 16 + rng() * 12;
    const grad = g.createRadialGradient(px, py, pr * 0.3, px, py, pr);
    grad.addColorStop(0, cols[v]);
    grad.addColorStop(0.75, cols[v ^ 1]);
    grad.addColorStop(1, 'rgba(214,120,150,0)');
    g.fillStyle = grad;
    g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
  }
  return c;
}

function bamboo(v) { // 44x110: 3-4 culms + nodes + leaves
  const w = 44, h = 110;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const rng = mulberry32(401 + v * 13);
  const n = 3 + (rng() * 2 | 0);
  const cols = ['#4f7a3e', '#558546'];
  for (let i = 0; i < n; i++) {
    const x = 8 + i * (28 / Math.max(1, n - 1)) + (rng() - 0.5) * 4;
    const top = 6 + rng() * 18;
    g.strokeStyle = cols[v];
    g.lineWidth = 3.4;
    g.beginPath(); g.moveTo(x, 110); g.lineTo(x + (rng() - 0.5) * 4, top); g.stroke();
    g.strokeStyle = 'rgba(20,34,18,0.6)';
    g.lineWidth = 1;
    for (let y = 20; y < 104; y += 14 + rng() * 8) {
      g.beginPath(); g.moveTo(x - 3, y); g.lineTo(x + 3, y); g.stroke();
    }
    g.fillStyle = 'rgba(96,140,80,0.85)';
    for (let j = 0; j < 5; j++) {
      const ly = top + 6 + rng() * 30, lx = x + (rng() < 0.5 ? -1 : 1) * (6 + rng() * 8);
      g.beginPath();
      g.ellipse(lx, ly, 6, 2.2, (rng() - 0.5) * 1.6, 0, TAU);
      g.fill();
    }
  }
  return c;
}

function toriiSprite() { // 110x130 vermilion gate
  const w = 110, h = 130;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const red = '#b8382c';
  g.fillStyle = red;
  g.fillRect(22, 38, 12, 92);
  g.fillRect(76, 38, 12, 92);
  g.fillRect(16, 46, 24, 8);
  g.fillRect(70, 46, 24, 8);
  g.fillStyle = '#8e2b22';
  g.fillRect(52, 30, 6, 26);
  g.fillStyle = '#241c1c';
  g.fillRect(20, 30, 70, 10);
  g.beginPath();
  g.moveTo(8, 24); g.lineTo(102, 24); g.lineTo(96, 14); g.lineTo(14, 14); g.closePath();
  g.fill();
  g.fillStyle = '#2e2424';
  g.fillRect(4, 24, 102, 6);
  g.beginPath();
  g.moveTo(8, 24); g.lineTo(102, 24); g.lineTo(96, 14); g.lineTo(14, 14); g.closePath();
  g.fill();
  g.fillStyle = red;
  g.fillRect(8, 12, 94, 5);
  g.fillRect(10, 16, 90, 3);
  g.strokeStyle = 'rgba(0,0,0,0.25)';
  g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(26, 46); g.lineTo(26, 130); g.stroke();
  g.beginPath(); g.moveTo(84, 46); g.lineTo(84, 130); g.stroke();
  return c;
}

function shrine(v) { // 120x110: stone base + body + warm window + upturned dark roof
  const w = 120, h = 110;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  g.fillStyle = '#4a4f57';
  g.fillRect(8, 92, 104, 16);
  g.fillStyle = 'rgba(0,0,0,0.25)';
  g.fillRect(8, 92, 104, 5);
  g.fillStyle = v ? '#5d4a36' : '#65523e';
  g.fillRect(26, 52, 68, 42);
  g.strokeStyle = 'rgba(0,0,0,0.25)';
  g.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    g.beginPath(); g.moveTo(26, 52 + i * 10.5); g.lineTo(94, 52 + i * 10.5); g.stroke();
  }
  g.fillStyle = '#e8b878';
  g.fillRect(52, 62, 16, 20);
  g.strokeStyle = 'rgba(0,0,0,0.4)';
  g.strokeRect(52.5, 62.5, 15, 19);
  g.fillStyle = '#2a211a';
  g.beginPath();
  g.moveTo(8, 54); g.lineTo(60, 18); g.lineTo(112, 54);
  g.quadraticCurveTo(120, 52, 122, 44); g.lineTo(104, 46);
  g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(8, 54); g.lineTo(60, 18); g.lineTo(112, 54);
  g.quadraticCurveTo(104, 50, 60, 24); g.quadraticCurveTo(16, 50, 8, 54);
  g.closePath();
  g.fill();
  g.strokeStyle = '#3a2c22';
  g.lineWidth = 2;
  g.beginPath(); g.moveTo(10, 52); g.quadraticCurveTo(60, 26, 110, 52); g.stroke();
  sideShade(g, w, h, 'right', 0.28);
  return c;
}

function pagodaSprite() { // 100x170: 3 tiers + spire + gold orb
  const w = 100, h = 170;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const tier = (y, halfW) => {
    g.fillStyle = '#65523e';
    g.fillRect(50 - halfW * 0.62, y, halfW * 1.24, 26);
    g.fillStyle = '#2a211a';
    g.beginPath();
    g.moveTo(50 - halfW - 8, y + 2); g.lineTo(50, y - 24); g.lineTo(50 + halfW + 8, y + 2);
    g.quadraticCurveTo(50 + halfW + 14, y - 2, 50 + halfW + 12, y - 8);
    g.lineTo(50 - halfW - 12, y - 8); g.quadraticCurveTo(50 - halfW - 14, y - 2, 50 - halfW - 8, y + 2);
    g.closePath();
    g.fill();
  };
  g.fillStyle = '#4a3826';
  g.fillRect(40, 154, 20, 16);
  g.fillRect(34, 158, 32, 8);
  tier(128, 34);
  tier(88, 28);
  tier(48, 22);
  g.fillStyle = '#e8b878';
  g.fillRect(45, 104, 10, 14);
  g.fillRect(45, 64, 10, 12);
  g.strokeStyle = '#8a6a3a';
  g.lineWidth = 3;
  g.beginPath(); g.moveTo(50, 26); g.lineTo(50, 6); g.stroke();
  g.fillStyle = '#e8c86a';
  g.beginPath(); g.arc(50, 10, 4, 0, TAU); g.fill();
  sideShade(g, w, h, 'right', 0.25);
  return c;
}

function lantern(v) { // 30x56 tooro (stone lantern)
  const w = 30, h = 56;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const stone = v ? '#565b63' : '#5c616a';
  g.fillStyle = stone;
  g.fillRect(10, 48, 10, 8);
  g.fillRect(6, 44, 18, 5);
  g.fillRect(12, 26, 6, 19);
  g.fillStyle = '#454a52';
  g.beginPath();
  g.moveTo(4, 26); g.lineTo(15, 12); g.lineTo(26, 26); g.closePath();
  g.fill();
  g.fillStyle = stone;
  g.fillRect(11, 26, 8, 14);
  g.fillStyle = 'rgba(255,200,128,0.35)';
  g.fillRect(7, 27, 16, 16);
  g.fillStyle = '#ffcf8e';
  g.fillRect(12, 29, 6, 11);
  return c;
}

// Koi: 18x9 body, base at bottom-center. v = color variant.
function koiFish(v) {
  const c = makeCanvas(18, 9);
  const g = c.getContext('2d');
  const cols = [['#f2f0ea', '#c0392b'], ['#e8a03c', '#f2f0ea'], ['#c0392b', '#f2f0ea']][v % 3];
  g.fillStyle = cols[0];
  g.beginPath(); g.ellipse(7, 4.5, 6, 3, 0, 0, TAU); g.fill();
  g.fillStyle = cols[1];
  g.beginPath(); g.ellipse(10, 4.2, 2.6, 1.8, 0, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(4, 4.8, 2.2, 1.5, 0, 0, TAU); g.fill();
  g.fillStyle = cols[1];
  g.beginPath();
  g.moveTo(1.5, 4.5); g.lineTo(-1.5, 2); g.lineTo(-1.5, 7); g.closePath();
  g.fill();
  g.fillStyle = '#1c1c24';
  g.beginPath(); g.arc(12.5, 3.8, 0.8, 0, TAU); g.fill();
  return c;
}

// Koi pond: teal water + ripples + lily pads + stone rim + reeds (2rx x 2ry canvas).
export function koiPondSprite(rng, rx, ry) {
  const pad = 6;
  const w = rx * 2 + pad * 2, h = ry * 2 + pad * 2;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const cx = w / 2, cy = h / 2;
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  const grad = g.createRadialGradient(cx, cy, 4, cx, cy, rx);
  grad.addColorStop(0, '#3e7d6e');
  grad.addColorStop(0.8, '#2c5c52');
  grad.addColorStop(1, '#1f4640');
  g.fillStyle = grad;
  g.fill();
  g.save();
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  g.clip();
  g.strokeStyle = 'rgba(220,240,235,0.18)';
  g.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const rrx = rx * (0.3 + rng() * 0.55), rry = ry * (0.3 + rng() * 0.5);
    g.beginPath();
    g.ellipse(cx + (rng() - 0.5) * rx * 0.8, cy + (rng() - 0.5) * ry * 0.8, rrx, rry, 0, 0, TAU);
    g.stroke();
  }
  for (let i = 0; i < 2 + (rng() * 2 | 0); i++) { // 2-3 lily pads
    const lx = cx + (rng() - 0.5) * rx * 1.2, ly = cy + (rng() - 0.5) * ry * 1.2;
    const lr = 5 + rng() * 6;
    g.fillStyle = '#3f6a3a';
    g.beginPath(); g.ellipse(lx, ly, lr, lr * 0.6, 0, 0.35, TAU + 0.35); g.fill();
  }
  g.restore();
  // stone rim
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU + rng() * 0.2;
    g.fillStyle = i % 2 ? '#5a5f66' : '#4f545c';
    g.beginPath();
    g.ellipse(cx + Math.cos(a) * (rx + 2), cy + Math.sin(a) * (ry + 2), 5 + rng() * 3, 3.5 + rng() * 2, 0, 0, TAU);
    g.fill();
  }
  // reeds at the corner
  g.strokeStyle = '#4f7a3e';
  g.lineWidth = 1.6;
  for (let i = 0; i < 4; i++) {
    const bx = cx - rx * 0.7 + i * 4, by = cy + ry * 0.75;
    g.beginPath(); g.moveTo(bx, by + 4); g.quadraticCurveTo(bx + 2, by - 8, bx + 5, by - 14); g.stroke();
  }
  return c;
}

export function buildTerrain() {
  const rng = mulberry32(4242);
  const grassTiles = [0, 1, 2].map((i) => grassTile(rng, i));
  const decals = {
    tuft: tuft(),
    pebble: pebble(),
    flowerA: flower('a'),
    flowerB: flower('b'),
    bone: bone(),
    mud: blob(96, 64, '70,56,40', 0.35),
    moss: blob(128, 88, '44,70,50', 0.4),
    // m02 (Higan)
    tuftG: tuftG(),
    flowerC: flowerC(),
    petalDrop: petalDrop(),
    stone: stone(),
    pathA: pathSlab(0),
    pathB: pathSlab(1),
    pathC: pathSlab(2),
  };
  const pine = [0, 1, 2, 3].map(pineTree);
  const pineBig = [0, 1].map(pineBigTree);
  const deadTree = deadTreeSprite();
  const boulders = [0, 1].map(boulder);
  const stump = stumpSprite();
  const mushroom = mushroomSprite();
  const monolith = monolithSprite();
  const campfire = campfireSprite();
  const huts = [0, 1].map(hut);
  const well = wellSprite();
  // m02 (Higan): separate rng streams, built after m01 (keeps m01 golden + bit-identity)
  const m02Tiles = [0, 1, 2].map((i) => grassTile2(mulberry32(4242 + i * 97), i));
  const koi = [0, 1, 2].map(koiFish);
  const koiF = koi.map(flipX);
  const cherry = [0, 1, 2, 3].map(cherryTree);
  const cherryBig = [0, 1].map(cherryBigTree);
  const bamboos = [0, 1].map(bamboo);
  const torii = toriiSprite();
  const shrines = [0, 1].map(shrine);
  const pagoda = pagodaSprite();
  const lanterns = [0, 1].map(lantern);
  // flat key map used by world.js to resolve decor entries
  const sprites = { well, monolith, campfire, stump, mushroom, dead: deadTree };
  for (let i = 0; i < 4; i++) sprites[`pine:${i}`] = pine[i];
  for (let i = 0; i < 2; i++) {
    sprites[`pineBig:${i}`] = pineBig[i];
    sprites[`boulder:${i}`] = boulders[i];
    sprites[`hut:${i}`] = huts[i];
    sprites[`cherryBig:${i}`] = cherryBig[i];
    sprites[`bamboo:${i}`] = bamboos[i];
    sprites[`shrine:${i}`] = shrines[i];
    sprites[`lantern:${i}`] = lanterns[i];
  }
  for (let i = 0; i < 4; i++) sprites[`cherry:${i}`] = cherry[i];
  sprites.torii = torii;
  sprites['pagoda:0'] = pagoda;
  return { grassTiles, decals, pine, pineBig, deadTree, boulders, stump, mushroom, monolith, campfire, huts, well, sprites, ground: { m01: grassTiles, m02: m02Tiles }, koi, koiF };
}

// Snow-capped mountain silhouette, base at bottom edge. rng drives shape.
export function mountainSprite(rng, w, h) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const px = w * (0.35 + rng() * 0.3);
  const peakY = h * (0.08 + rng() * 0.12);
  const steps = 6;
  const pts = [[0, h]];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    pts.push([lerp(0, px, t), Math.max(peakY, lerp(h * 0.75, peakY, t) + (i < steps ? (rng() - 0.5) * h * 0.22 : 0))]);
  }
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    pts.push([lerp(px, w, t), Math.min(h, Math.max(peakY + 10, lerp(peakY, h * 0.7, t) + (i < steps ? (rng() - 0.5) * h * 0.18 : 0)))]);
  }
  pts.push([w, h]);
  poly(g, pts);
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#2c3352');
  grad.addColorStop(1, '#1e2338');
  g.fillStyle = grad;
  g.fill();
  sideShade(g, w, h, 'right', 0.25);
  g.strokeStyle = 'rgba(10,14,26,0.35)';
  g.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const sx = px + (rng() - 0.5) * w * 0.2;
    g.beginPath();
    g.moveTo(sx, peakY + 8);
    g.lineTo(sx + (rng() - 0.5) * 30, h * 0.6);
    g.stroke();
  }
  // snow cap (zigzag blob under the peak)
  const cap = [[px, peakY]];
  for (let i = 1; i <= 4; i++) cap.push([px + w * 0.04 * i, peakY + h * 0.04 * i + (i % 2 ? 6 : -2)]);
  for (let i = 4; i >= 1; i--) cap.push([px - w * 0.034 * i, peakY + h * 0.042 * i + ((i + 1) % 2 ? 5 : -2)]);
  poly(g, cap);
  g.fillStyle = 'rgba(218,228,248,0.88)';
  g.fill();
  return c;
}

// Frozen lake: ice + cracks + rim. Canvas is 2rx x 2ry (+ padding).
export function lakeSprite(rng, rx, ry) {
  const pad = 6;
  const w = rx * 2 + pad * 2, h = ry * 2 + pad * 2;
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const cx = w / 2, cy = h / 2;
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  const grad = g.createRadialGradient(cx, cy, 4, cx, cy, rx);
  grad.addColorStop(0, '#8fa8cc');
  grad.addColorStop(0.75, '#6f86ae');
  grad.addColorStop(1, '#5d739c');
  g.fillStyle = grad;
  g.fill();
  g.save();
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  g.clip();
  g.beginPath();
  g.ellipse(cx + rx * 0.2, cy + ry * 0.15, rx * 0.5, ry * 0.5, 0, 0, TAU);
  g.fillStyle = 'rgba(70,92,140,0.5)';
  g.fill();
  g.strokeStyle = 'rgba(28,42,68,0.55)';
  g.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    let x = cx + (rng() - 0.5) * rx * 1.4;
    let y = cy + (rng() - 0.5) * ry * 1.4;
    g.beginPath();
    g.moveTo(x, y);
    for (let j = 0; j < 3; j++) {
      x += (rng() - 0.5) * rx * 0.5;
      y += (rng() - 0.5) * ry * 0.5;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  g.restore();
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  g.strokeStyle = 'rgba(200,220,255,0.3)';
  g.lineWidth = 1.5;
  g.stroke();
  return c;
}

// Pre-rendered screen vignette (foreground pass).
export function buildVignette(w, h) {
  const c = makeCanvas(w, h);
  const g = c.getContext('2d');
  const r = Math.max(w, h) * 0.72;
  const grad = g.createRadialGradient(w / 2, h / 2, r * 0.55, w / 2, h / 2, r);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(3,5,12,0.55)');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  return c;
}
