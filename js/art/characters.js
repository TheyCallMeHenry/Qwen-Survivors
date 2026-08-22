// Characters: player + per-level enemy skins. All face RIGHT — flip at draw time
// with flipX(). Feet/base sit near the bottom of each canvas; shadowR is the
// runtime soft-shadow radius. Hit-flash copies are made at use via flashCopy.
// m01 = Evernight Wood (originals) · m02 = Higan re-skins (13.3) · m03 = Drowned City re-skins (13.5).

import { makeCanvas, roundRectPath, poly } from './base.js';
import { TAU } from '../utils/math.js';

function canvasOf(w, h, draw) {
  const c = makeCanvas(w, h);
  draw(c.getContext('2d'));
  return c;
}

// Player 56×64, feet y≈58, base at bottom.
function playerFrame(dy, legL, legR) {
  return canvasOf(56, 64, (g) => {
    g.save();
    g.translate(0, dy);
    // legs
    g.fillStyle = '#222b3a';
    g.fillRect(22 + legL, 44, 6, 14);
    g.fillRect(30 + legR, 44, 6, 14);
    // cloak
    roundRectPath(g, 18, 24, 22, 25, 6);
    g.fillStyle = '#35415a';
    g.fill();
    // sword on back
    g.strokeStyle = '#9fb0c8';
    g.lineCap = 'round';
    g.lineWidth = 3;
    g.beginPath(); g.moveTo(17, 30); g.lineTo(9, 13); g.stroke();
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(7, 17); g.lineTo(15, 15); g.stroke();
    // hood + face + eyes (facing right)
    g.fillStyle = '#3d4a66';
    g.beginPath(); g.arc(29, 18, 10, 0, TAU); g.fill();
    g.fillStyle = '#0d1118';
    g.beginPath(); g.arc(31, 19, 6.5, 0, TAU); g.fill();
    g.fillStyle = '#9fe8ff';
    g.beginPath(); g.arc(32.5, 18.5, 1.2, 0, TAU); g.fill();
    g.beginPath(); g.arc(35.5, 20, 1.1, 0, TAU); g.fill();
    g.restore();
  });
}

// Warden 58×66 — heavy plate armor (D62: bigger than the mage, smaller than the brute 64×60), steel + amber.
function wardenFrame(dy, legL, legR) {
  return canvasOf(58, 66, (g) => {
    g.save();
    g.translate(0, dy);
    // heavy boots
    g.fillStyle = '#232a38';
    g.fillRect(19 + legL, 52, 9, 12);
    g.fillRect(32 + legR, 52, 9, 12);
    // tower shield on back
    roundRectPath(g, 6, 28, 9, 22, 3);
    g.fillStyle = '#333d52';
    g.fill();
    // torso plate
    roundRectPath(g, 14, 26, 31, 30, 7);
    g.fillStyle = '#46536b';
    g.fill();
    g.strokeStyle = '#ffb454';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(17, 50); g.lineTo(42, 50); g.stroke();
    // pauldrons
    g.fillStyle = '#55627c';
    g.beginPath(); g.arc(18, 28, 6.5, 0, TAU); g.fill();
    g.beginPath(); g.arc(43, 28, 6.5, 0, TAU); g.fill();
    // helmet + visor slit (facing right)
    g.fillStyle = '#4d5a74';
    g.beginPath(); g.arc(32, 15, 10, 0, TAU); g.fill();
    g.fillStyle = '#0d1118';
    g.fillRect(30, 12, 12, 5);
    g.fillStyle = '#ffb454';
    g.beginPath(); g.arc(38, 14.5, 1.4, 0, TAU); g.fill();
    g.restore();
  });
}

// Ranger 52×60 — lean light armor, quiver + bow (fast, balanced).
function rangerFrame(dy, legL, legR) {
  return canvasOf(52, 60, (g) => {
    g.save();
    g.translate(0, dy);
    // legs
    g.fillStyle = '#26332a';
    g.fillRect(20 + legL, 42, 6, 14);
    g.fillRect(28 + legR, 42, 6, 14);
    // quiver on back + arrow nocks
    roundRectPath(g, 8, 18, 8, 20, 3);
    g.fillStyle = '#4a3b28';
    g.fill();
    g.strokeStyle = '#c9a06a';
    g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(9.5, 20); g.lineTo(9.5, 15); g.stroke();
    g.beginPath(); g.moveTo(12.5, 20); g.lineTo(12.5, 16); g.stroke();
    // tunic
    roundRectPath(g, 15, 26, 22, 20, 5);
    g.fillStyle = '#3d5a45';
    g.fill();
    // hood + face + eyes (facing right)
    g.fillStyle = '#33503c';
    g.beginPath(); g.arc(28, 16, 9, 0, TAU); g.fill();
    g.fillStyle = '#0d1118';
    g.beginPath(); g.arc(30.5, 17, 5.5, 0, TAU); g.fill();
    g.fillStyle = '#a4ffc9';
    g.beginPath(); g.arc(32, 16.5, 1.2, 0, TAU); g.fill();
    g.beginPath(); g.arc(34.5, 18, 1.1, 0, TAU); g.fill();
    // bow in the front hand
    g.strokeStyle = '#c9a06a';
    g.lineWidth = 2;
    g.beginPath(); g.arc(38, 32, 9, -TAU / 4, TAU / 4); g.stroke();
    g.restore();
  });
}

// Swashbuckler 54×62 — duster, sash, saber (agile, upper-medium).
function swashFrame(dy, legL, legR) {
  return canvasOf(54, 62, (g) => {
    g.save();
    g.translate(0, dy);
    // legs
    g.fillStyle = '#33283c';
    g.fillRect(20 + legL, 44, 6, 14);
    g.fillRect(29 + legR, 44, 6, 14);
    // saber on back
    g.strokeStyle = '#d9e2f0';
    g.lineCap = 'round';
    g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(16, 28); g.lineTo(6, 44); g.stroke();
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(10, 26); g.lineTo(16, 24); g.stroke();
    // duster + gold sash
    roundRectPath(g, 16, 26, 22, 22, 5);
    g.fillStyle = '#6a3a4a';
    g.fill();
    g.strokeStyle = '#e8b45a';
    g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(18, 30); g.lineTo(36, 42); g.stroke();
    // head: hair + face + eyes (facing right)
    g.fillStyle = '#c98a4b';
    g.beginPath(); g.arc(29, 15, 9, TAU / 2, TAU * 1.5); g.fill();
    g.beginPath(); g.arc(21, 17, 4, 0, TAU); g.fill(); // back tuft
    g.fillStyle = '#e8c39e';
    g.beginPath(); g.arc(30, 17, 7.5, 0, TAU); g.fill();
    g.fillStyle = '#33283c';
    g.beginPath(); g.arc(33, 16.5, 1.2, 0, TAU); g.fill();
    g.beginPath(); g.arc(35.5, 18, 1.1, 0, TAU); g.fill();
    g.restore();
  });
}

// Ghost 56×64 — classic sheet (D62), tinted per player (Pac-Man ghost colors, CFG.ghostColors).
function ghostFrame(color, dy, legL, legR) {
  return canvasOf(56, 64, (g) => {
    g.save();
    g.translate(0, dy);
    // sheet body: dome + sides down to a scalloped hem (hem waves with the run cycle)
    g.fillStyle = color;
    g.beginPath();
    g.arc(28, 24, 20, Math.PI, TAU);
    g.lineTo(48, 52);
    const hem = 52 + (legL > 0 ? 2 : 0);
    g.quadraticCurveTo(44, hem + 8, 40, 52 + (legL < 0 ? 2 : 0));
    g.quadraticCurveTo(36, hem + 8, 32, 52);
    g.quadraticCurveTo(28, hem + 8, 24, 52 + (legL > 0 ? 2 : 0));
    g.quadraticCurveTo(20, hem + 8, 16, 52);
    g.lineTo(8, 24);
    g.closePath();
    g.fill();
    // eyes (facing right)
    g.fillStyle = '#0d1118';
    g.beginPath(); g.ellipse(32, 22, 2.6, 3.4, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(39, 23, 2.6, 3.4, 0, 0, TAU); g.fill();
    g.restore();
  });
}

function ratFrame() {
  return canvasOf(30, 26, (g) => {
    g.strokeStyle = '#8a7070';
    g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(4, 15); g.quadraticCurveTo(0, 17, 1, 21); g.stroke();
    g.fillStyle = '#6b7076';
    g.beginPath(); g.ellipse(13, 16, 9, 6, 0, 0, TAU); g.fill();
    g.fillStyle = '#767b80';
    g.beginPath(); g.arc(22, 13, 5.5, 0, TAU); g.fill();
    poly(g, [[26, 12], [29, 14], [26, 15]]);
    g.fill();
    g.fillStyle = '#c99aa0';
    g.beginPath(); g.arc(19, 7.5, 2.6, 0, TAU); g.fill();
    g.fillStyle = '#ff5a5a';
    g.beginPath(); g.arc(23.5, 11.5, 1, 0, TAU); g.fill();
    g.fillStyle = '#4a4f55';
    g.beginPath(); g.ellipse(9, 21, 2.4, 1.4, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(17, 21, 2.4, 1.4, 0, 0, TAU); g.fill();
  });
}

function batFrame(up) {
  return canvasOf(34, 28, (g) => {
    const wy = up ? 5 : 16, wt = up ? -2 : 2;
    g.fillStyle = '#55486e';
    poly(g, [[13, 13], [3, wy], [8, wy + 5 + wt], [4, wy + 8], [13, 16]]);
    g.fill();
    poly(g, [[21, 13], [31, wy], [26, wy + 5 + wt], [30, wy + 8], [21, 16]]);
    g.fill();
    g.fillStyle = '#4a3f5c';
    g.beginPath(); g.ellipse(17, 15, 5.5, 6, 0, 0, TAU); g.fill();
    g.beginPath(); g.arc(17, 8.5, 4.5, 0, TAU); g.fill();
    poly(g, [[13.5, 6], [12, 2], [16, 5]]);
    g.fill();
    poly(g, [[20.5, 6], [22, 2], [18, 5]]);
    g.fill();
    g.fillStyle = '#ff5a5a';
    g.beginPath(); g.arc(15.5, 8, 0.9, 0, TAU); g.fill();
    g.beginPath(); g.arc(18.5, 8, 0.9, 0, TAU); g.fill();
  });
}

function goblinFrame(legL, legR) {
  return canvasOf(30, 38, (g) => {
    g.fillStyle = '#3a5228';
    g.fillRect(11 + legL, 30, 4, 8);
    g.fillRect(16 + legR, 30, 4, 8);
    roundRectPath(g, 8, 16, 15, 16, 4);
    g.fillStyle = '#4f7a3a';
    g.fill();
    g.strokeStyle = '#5a4430';
    g.lineWidth = 3;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(24, 20); g.lineTo(27, 8); g.stroke();
    g.fillStyle = '#5d8a44';
    g.beginPath(); g.arc(16, 10, 7, 0, TAU); g.fill();
    poly(g, [[9, 9], [3, 6], [10, 12]]);
    g.fill();
    poly(g, [[23, 9], [29, 6], [22, 12]]);
    g.fill();
    g.fillStyle = '#ffd24a';
    g.beginPath(); g.arc(18.5, 9, 1.2, 0, TAU); g.fill();
    g.beginPath(); g.arc(22, 9.5, 1.1, 0, TAU); g.fill();
  });
}

function wolfFrame(l1, l2) {
  return canvasOf(46, 32, (g) => {
    g.strokeStyle = '#4c545e';
    g.lineWidth = 3;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(8, 16); g.quadraticCurveTo(2, 12, 1, 8); g.stroke();
    g.fillStyle = '#454d58';
    g.fillRect(12 + l1, 22, 3.5, 10);
    g.fillRect(20 + l2, 22, 3.5, 10);
    g.fillRect(28 + l2, 22, 3.5, 10);
    g.fillRect(34 + l1, 22, 3.5, 10);
    g.fillStyle = '#5a626e';
    g.beginPath(); g.ellipse(23, 17, 14, 7, 0, 0, TAU); g.fill();
    g.fillStyle = '#616a76';
    g.beginPath(); g.arc(37, 12, 6, 0, TAU); g.fill();
    poly(g, [[39, 10], [45, 13], [39, 16]]);
    g.fill();
    poly(g, [[33, 7], [31, 1], [37, 4]]);
    g.fill();
    g.fillStyle = '#ff6a4a';
    g.beginPath(); g.arc(38.5, 10.5, 1, 0, TAU); g.fill();
  });
}

function bruteFrame(frame) {
  return canvasOf(64, 60, (g) => {
    g.save();
    g.translate(0, frame ? -1.5 : 0);
    g.fillStyle = '#4a3d34';
    g.fillRect(22, 46, 9, 14);
    g.fillRect(36, 46, 9, 14);
    roundRectPath(g, 17, 18, 32, 30, 8);
    g.fillStyle = '#5a4a40';
    g.fill();
    g.fillStyle = '#52433a';
    roundRectPath(g, 8, 20 + (frame ? -3 : 0), 10, 22, 4);
    g.fill();
    roundRectPath(g, 48, 20 + (frame ? -3 : 0), 10, 22, 4);
    g.fill();
    g.fillStyle = '#6a584a';
    g.beginPath(); g.arc(33, 11, 8, 0, TAU); g.fill();
    g.fillStyle = '#2a2018';
    g.beginPath(); g.arc(31, 10, 1.3, 0, TAU); g.fill();
    g.beginPath(); g.arc(36, 10, 1.3, 0, TAU); g.fill();
    // glowing core
    const core = g.createRadialGradient(33, 33, 1, 33, 33, 10);
    core.addColorStop(0, frame ? 'rgba(255,220,130,0.95)' : 'rgba(255,200,100,0.8)');
    core.addColorStop(0.4, 'rgba(255,170,60,0.35)');
    core.addColorStop(1, 'rgba(255,150,50,0)');
    g.fillStyle = core;
    g.beginPath(); g.arc(33, 33, 10, 0, TAU); g.fill();
    g.fillStyle = '#ffe9c0';
    g.beginPath(); g.arc(33, 33, 2.5, 0, TAU); g.fill();
    g.restore();
  });
}

function cultistFrame(frame) {
  return canvasOf(32, 46, (g) => {
    g.save();
    g.translate(0, frame ? -1.5 : 0);
    poly(g, [[9, 46], [12, 14], [21, 14], [25, 46]]);
    g.fillStyle = '#2a2438';
    g.fill();
    g.fillStyle = '#322a44';
    g.beginPath(); g.arc(17, 11, 6.5, 0, TAU); g.fill();
    g.fillStyle = '#08060e';
    g.beginPath(); g.arc(19, 12, 4, 0, TAU); g.fill();
    const orbY = 24 + (frame ? -2 : 0);
    const glow = g.createRadialGradient(27, orbY, 0.5, 27, orbY, 8);
    glow.addColorStop(0, 'rgba(208,92,224,0.8)');
    glow.addColorStop(1, 'rgba(208,92,224,0)');
    g.fillStyle = glow;
    g.beginPath(); g.arc(27, orbY, 8, 0, TAU); g.fill();
    g.fillStyle = '#e8b0f2';
    g.beginPath(); g.arc(27, orbY, 2.4, 0, TAU); g.fill();
    g.restore();
  });
}

// --- Map 02 "Higan" skins (13.3) — same canvas footprints as the m01 slots ---

function tanukiFrame() {
  return canvasOf(30, 26, (g) => {
    g.strokeStyle = '#5a4a3c';
    g.lineWidth = 3;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(4, 16); g.quadraticCurveTo(-1, 14, 1, 9); g.stroke();
    g.fillStyle = '#6e5a48';
    g.beginPath(); g.ellipse(13, 16, 9, 6.5, 0, 0, TAU); g.fill();
    g.fillStyle = '#cbb9a4';
    g.beginPath(); g.ellipse(14, 19, 5.5, 2.6, 0, 0, TAU); g.fill();
    g.fillStyle = '#776450';
    g.beginPath(); g.arc(22, 13, 5.8, 0, TAU); g.fill();
    g.fillStyle = '#5f4d3e';
    g.beginPath(); g.arc(19, 7.5, 1.8, 0, TAU); g.fill();
    g.beginPath(); g.arc(25, 7.5, 1.8, 0, TAU); g.fill();
    g.fillStyle = '#3d3128';
    g.beginPath(); g.ellipse(23, 12.5, 4, 2.6, 0, 0, TAU); g.fill();
    g.fillStyle = '#ff5a5a';
    g.beginPath(); g.arc(24.5, 12, 1, 0, TAU); g.fill();
    g.beginPath(); g.arc(27, 15, 0.9, 0, TAU); g.fill();
    g.fillStyle = '#4a3d30';
    g.beginPath(); g.ellipse(9, 21, 2.4, 1.4, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(17, 21, 2.4, 1.4, 0, 0, TAU); g.fill();
  });
}

function hooiFrame(up) {
  return canvasOf(34, 28, (g) => {
    const cy = up ? 12 : 15;
    g.fillStyle = 'rgba(120,220,170,0.22)';
    g.beginPath(); g.ellipse(15, cy + 6, 6, 4, 0, 0, TAU); g.fill();
    const fl = g.createRadialGradient(17, cy, 1, 17, cy, 10);
    fl.addColorStop(0, 'rgba(230,255,240,0.95)');
    fl.addColorStop(0.45, 'rgba(120,235,190,0.7)');
    fl.addColorStop(1, 'rgba(80,200,170,0)');
    g.fillStyle = fl;
    g.beginPath(); g.ellipse(17, cy, 8, 9, 0, 0, TAU); g.fill();
    g.fillStyle = '#9fe8c8';
    g.beginPath(); g.arc(17, cy, 5, 0, TAU); g.fill();
    g.fillStyle = '#141f1a';
    g.beginPath(); g.arc(19.5, cy - 0.5, 2.8, 0, 0, TAU); g.fill();
    g.fillStyle = '#eafff4';
    g.beginPath(); g.arc(20.5, cy - 1, 0.9, 0, TAU); g.fill();
    g.beginPath(); g.arc(22, cy, 0.7, 0, TAU); g.fill();
  });
}

function shikomeFrame(legL, legR) {
  return canvasOf(30, 38, (g) => {
    g.fillStyle = '#3c3a4a';
    g.fillRect(11 + legL, 30, 4, 8);
    g.fillRect(16 + legR, 30, 4, 8);
    roundRectPath(g, 8, 16, 15, 16, 4);
    g.fillStyle = '#5d5a72';
    g.fill();
    g.strokeStyle = '#8a8298';
    g.lineWidth = 2.5;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(24, 20); g.lineTo(28, 8); g.stroke();
    g.fillStyle = '#6a6478';
    g.beginPath(); g.arc(28, 7, 3.4, 0, 0, TAU); g.fill();
    g.fillStyle = '#6e6a86';
    g.beginPath(); g.arc(16, 10, 7, 0, 0, TAU); g.fill();
    g.fillStyle = '#d8d2e2';
    poly(g, [[11, 6], [7, 1], [13, 4]]);
    g.fill();
    poly(g, [[21, 6], [25, 1], [19, 4]]);
    g.fill();
    g.fillStyle = '#ff8a4a';
    g.beginPath(); g.arc(18.5, 9, 1.2, 0, 0, TAU); g.fill();
    g.beginPath(); g.arc(22, 9.5, 1.1, 0, 0, TAU); g.fill();
    g.fillStyle = '#e8e2f0';
    poly(g, [[19, 13], [20, 16], [21.5, 13]]);
    g.fill();
  });
}

function kitsuneFrame(l1, l2) {
  return canvasOf(46, 32, (g) => {
    g.strokeStyle = '#d88a4a';
    g.lineWidth = 4;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(8, 15); g.quadraticCurveTo(0, 11, 1, 6); g.stroke();
    g.strokeStyle = '#f0e8e0';
    g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(1, 7); g.lineTo(1.5, 5); g.stroke();
    g.strokeStyle = '#c87a3e';
    g.lineWidth = 4;
    g.beginPath(); g.moveTo(10, 18); g.quadraticCurveTo(3, 15, 2, 10); g.stroke();
    g.fillStyle = '#d88a4a';
    g.fillRect(12 + l1, 22, 3.5, 10);
    g.fillRect(20 + l2, 22, 3.5, 10);
    g.fillRect(28 + l2, 22, 3.5, 10);
    g.fillRect(34 + l1, 22, 3.5, 10);
    g.fillStyle = '#e09a58';
    g.beginPath(); g.ellipse(23, 17, 14, 7, 0, 0, TAU); g.fill();
    g.fillStyle = '#f0e8e0';
    g.beginPath(); g.ellipse(21, 20, 11, 4, 0, 0, TAU); g.fill();
    g.fillStyle = '#e09a58';
    g.beginPath(); g.arc(37, 12, 6, 0, 0, TAU); g.fill();
    poly(g, [[39, 10], [45, 13], [39, 16]]);
    g.fill();
    poly(g, [[33, 7], [31, 1], [37, 4]]);
    g.fill();
    poly(g, [[29, 7], [25, 1], [32, 5]]);
    g.fill();
    g.fillStyle = '#ff6a4a';
    g.beginPath(); g.arc(38.5, 10.5, 1, 0, 0, TAU); g.fill();
  });
}

function oniFrame(frame) {
  return canvasOf(64, 60, (g) => {
    g.save();
    g.translate(0, frame ? -1.5 : 0);
    g.fillStyle = '#5a2a2e';
    g.fillRect(22, 46, 9, 14);
    g.fillRect(36, 46, 9, 14);
    roundRectPath(g, 17, 18, 32, 30, 8);
    g.fillStyle = '#a83c3c';
    g.fill();
    // loincloth belt
    g.fillStyle = '#7a5a3a';
    g.fillRect(19, 40, 28, 5);
    // arms
    roundRectPath(g, 8, 20 + (frame ? -3 : 0), 10, 22, 4);
    g.fillStyle = '#963232';
    g.fill();
    roundRectPath(g, 48, 20 + (frame ? -3 : 0), 10, 22, 4);
    g.fill();
    // head
    g.fillStyle = '#b04444';
    g.beginPath(); g.arc(33, 11, 8, 0, 0, TAU); g.fill();
    // horns
    g.fillStyle = '#efe6d8';
    poly(g, [[26, 6], [22, 0], [30, 3]]);
    g.fill();
    poly(g, [[40, 6], [44, 0], [36, 3]]);
    g.fill();
    g.fillStyle = '#2a0f10';
    g.beginPath(); g.arc(31, 10, 1.3, 0, 0, TAU); g.fill();
    g.beginPath(); g.arc(36, 10, 1.3, 0, 0, TAU); g.fill();
    // fangs
    g.fillStyle = '#f2ead8';
    poly(g, [[30, 15], [31.5, 18], [33, 15]]);
    g.fill();
    poly(g, [[35, 15], [36.5, 18], [38, 15]]);
    g.fill();
    // glowing core
    const core = g.createRadialGradient(33, 33, 1, 33, 33, 10);
    core.addColorStop(0, frame ? 'rgba(255,220,130,0.95)' : 'rgba(255,200,100,0.8)');
    core.addColorStop(0.4, 'rgba(255,170,60,0.35)');
    core.addColorStop(1, 'rgba(255,150,50,0)');
    g.fillStyle = core;
    g.beginPath(); g.arc(33, 33, 10, 0, 0, TAU); g.fill();
    g.fillStyle = '#ffe9c0';
    g.beginPath(); g.arc(33, 33, 2.5, 0, 0, TAU); g.fill();
    g.restore();
  });
}

function mikoFrame(frame) {
  return canvasOf(32, 46, (g) => {
    g.save();
    g.translate(0, frame ? -1.5 : 0);
    poly(g, [[9, 46], [12, 14], [21, 14], [25, 46]]);
    g.fillStyle = '#e8e2d8';
    g.fill();
    poly(g, [[9, 46], [12, 14], [17, 14], [15, 46]]);
    g.fillStyle = '#b8434a';
    g.fill();
    g.fillStyle = '#3a2a2c';
    g.beginPath(); g.arc(17, 11, 6.5, 0, 0, TAU); g.fill();
    g.beginPath(); g.rect(13, 11, 8, 26); g.fill();
    g.fillStyle = '#08060e';
    g.beginPath(); g.arc(19, 12, 4, 0, 0, TAU); g.fill();
    g.fillStyle = '#d8c8e8';
    g.beginPath(); g.arc(18, 12.5, 1, 0, 0, TAU); g.fill();
    const orbY = 24 + (frame ? -2 : 0);
    // ofuda talisman orb: white paper strip, red seal, kanji-like mark
    const glow = g.createRadialGradient(27, orbY, 0.5, 27, orbY, 8);
    glow.addColorStop(0, 'rgba(255,236,200,0.8)');
    glow.addColorStop(1, 'rgba(255,236,200,0)');
    g.fillStyle = glow;
    g.beginPath(); g.arc(27, orbY, 8, 0, 0, TAU); g.fill();
    g.fillStyle = '#f5f0e6';
    g.fillRect(25, orbY - 4, 4, 8);
    g.fillStyle = '#c03038';
    g.fillRect(25.5, orbY - 3, 3, 2.4);
    g.fillStyle = '#2a2438';
    g.fillRect(26.5, orbY + 1, 1, 2.4);
    g.restore();
  });
}

function ryuFrame(frame) {
  return canvasOf(96, 112, (g) => {
    g.save();
    g.translate(0, frame ? 2 : 0);
    // serpentine body: two overlapping sine curves, tail → head (facing RIGHT)
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const seg = (w, col, dy, a, b) => {
      g.strokeStyle = col;
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(2, 74);
      g.bezierCurveTo(20, 74 - a + dy, 34, 60 + b + dy, 50, 44 + dy);
      g.bezierCurveTo(64, 30 + dy, 74, 26 + b * 0.5 + dy, 84, 22 + dy);
      g.stroke();
    };
    seg(26, '#122a3e', frame ? 2 : 0, 10, 0);
    seg(26, '#1d4463', frame ? 0 : -2, 16, -6);
    // scale highlights
    g.fillStyle = 'rgba(160,220,255,0.5)';
    for (let i = 0; i < 6; i++) {
      g.beginPath(); g.arc(14 + i * 12, 66 - i * 6 + (frame ? 1 : 0), 2.2, 0, 0, TAU); g.fill();
    }
    // head
    g.fillStyle = '#265a80';
    g.beginPath(); g.ellipse(88, 22, 9, 6.5, -0.35, 0, TAU); g.fill();
    poly(g, [[96, 20], [102, 24], [95, 26]]);
    g.fill();
    // whiskers
    g.strokeStyle = '#dcecf8';
    g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(96, 21); g.quadraticCurveTo(104, 16, 108, 18); g.stroke();
    g.beginPath(); g.moveTo(96, 25); g.quadraticCurveTo(104, 26, 107, 30); g.stroke();
    // antlers
    g.strokeStyle = '#e8dcc0';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(84, 17); g.lineTo(80, 8); g.moveTo(82, 12); g.lineTo(77, 10); g.stroke();
    g.beginPath(); g.moveTo(90, 16); g.lineTo(92, 7); g.moveTo(91, 11); g.lineTo(96, 9); g.stroke();
    // eye
    g.fillStyle = '#ffd24a';
    g.beginPath(); g.arc(91, 21, 1.6, 0, 0, TAU); g.fill();
    // belly plates
    g.fillStyle = 'rgba(220,240,250,0.35)';
    for (let i = 0; i < 5; i++) {
      g.beginPath(); g.ellipse(28 + i * 13, 72 - i * 8 + (frame ? 1 : 0), 4, 2.4, -0.4, 0, TAU); g.fill();
    }
    g.restore();
  });
}

// --- Map 03 "The Drowned City" skins (13.5) — same canvas footprints as the m01 slots ---

function crabFrame() {
  return canvasOf(30, 26, (g) => {
    g.strokeStyle = '#a04832';
    g.lineWidth = 1.5;
    g.lineCap = 'round';
    for (const [x0, x1] of [[8, 2], [13, 5], [18, 9], [22, 16], [25, 23]]) {
      g.beginPath(); g.moveTo(x0, 19); g.quadraticCurveTo((x0 + x1) / 2, 22, x1, 24); g.stroke();
    }
    g.fillStyle = '#c86a3c';
    g.beginPath(); g.ellipse(15, 14, 9.5, 7, 0, 0, TAU); g.fill();
    g.fillStyle = '#b3543a';
    g.beginPath(); g.ellipse(15, 12, 8, 4, 0, 0, TAU); g.fill();
    // claws (forward = right)
    g.fillStyle = '#d87848';
    g.beginPath(); g.arc(24, 8, 3.4, 0, 0, TAU); g.fill();
    g.beginPath(); g.arc(28, 12, 3.4, 0, 0, TAU); g.fill();
    g.fillStyle = '#3a1f14';
    g.beginPath(); g.arc(25, 7, 1.2, 0, 0, TAU); g.fill();
    g.beginPath(); g.arc(29, 11, 1.2, 0, 0, TAU); g.fill();
    // stalked eyes
    g.strokeStyle = '#8a4a30';
    g.lineWidth = 1;
    g.beginPath(); g.moveTo(12, 10); g.lineTo(11.5, 6); g.stroke();
    g.beginPath(); g.moveTo(17, 10); g.lineTo(17.5, 5.5); g.stroke();
    g.fillStyle = '#2a1a12';
    g.beginPath(); g.arc(11.5, 5.5, 1.3, 0, 0, TAU); g.fill();
    g.beginPath(); g.arc(17.5, 5, 1.3, 0, 0, TAU); g.fill();
  });
}

function goldfishFrame(up) {
  return canvasOf(34, 28, (g) => {
    const fy = up ? -2 : 2;
    g.fillStyle = '#d87a42';
    poly(g, [[9, 14 + fy * 0.5], [2, 6 + fy], [5, 14], [2, 22 - fy]]);
    g.fill();
    g.fillStyle = '#e8935a';
    g.beginPath(); g.ellipse(20, 14, 10, 6.5, 0, 0, TAU); g.fill();
    g.fillStyle = '#f2b076';
    g.beginPath(); g.ellipse(21, 16.5, 8, 3.5, 0, 0, TAU); g.fill();
    g.fillStyle = '#d87a42';
    poly(g, [[16, 8.5 + fy * 0.5], [19, 3 + fy], [22, 8.5 + fy * 0.5]]);
    g.fill();
    g.fillStyle = '#2a1a12';
    g.beginPath(); g.arc(27, 12.5, 1.3, 0, 0, TAU); g.fill();
  });
}

function mermanFrame(legL, legR) {
  return canvasOf(30, 38, (g) => {
    const sway = (legL + legR) * 0.5;
    // fish tail (sways with the goblin leg cycle)
    g.fillStyle = '#4a7a6e';
    poly(g, [[11 + sway, 30], [8 + sway, 38], [15 + sway, 33], [21 + sway, 38], [18 + sway, 30]]);
    g.fill();
    roundRectPath(g, 8, 16, 15, 16, 4);
    g.fillStyle = '#7aa894';
    g.fill();
    g.strokeStyle = '#9a6a3a';
    g.lineWidth = 3;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(24, 20); g.lineTo(27, 8); g.stroke();
    // coral club tip
    g.strokeStyle = '#c86a3c';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(27, 8); g.lineTo(26, 4); g.moveTo(27, 8); g.lineTo(29, 5); g.stroke();
    g.fillStyle = '#6a9a8a';
    g.beginPath(); g.arc(16, 10, 7, 0, 0, TAU); g.fill();
    g.fillStyle = '#ffd24a';
    g.beginPath(); g.arc(18.5, 9, 1.2, 0, 0, TAU); g.fill();
    g.beginPath(); g.arc(22, 9.5, 1.1, 0, 0, TAU); g.fill();
  });
}

function mermaidFrame(legL, legR) {
  return canvasOf(30, 38, (g) => {
    const sway = (legL + legR) * 0.5;
    g.fillStyle = '#3a6a80';
    poly(g, [[11 + sway, 30], [7 + sway, 38], [15 + sway, 32], [22 + sway, 38], [18 + sway, 30]]);
    g.fill();
    roundRectPath(g, 8, 16, 15, 16, 4);
    g.fillStyle = '#8ab0a0';
    g.fill();
    // shell top + flowing hair
    g.fillStyle = '#d87a8a';
    poly(g, [[9, 18], [22, 18], [15.5, 23]]);
    g.fill();
    g.fillStyle = '#4a8a9a';
    poly(g, [[9, 4], [4, 12], [9, 16]]);
    g.fill();
    poly(g, [[23, 4], [28, 12], [22, 16]]);
    g.fill();
    g.fillStyle = '#7aa894';
    g.beginPath(); g.arc(16, 10, 7, 0, 0, TAU); g.fill();
    g.fillStyle = '#ffd24a';
    g.beginPath(); g.arc(18.5, 9, 1.2, 0, 0, TAU); g.fill();
    g.beginPath(); g.arc(22, 9.5, 1.1, 0, 0, TAU); g.fill();
  });
}

function stingrayFrame(l1, l2) {
  return canvasOf(46, 32, (g) => {
    g.save();
    g.translate(0, (l1 - l2) * 0.15); // swim undulation on the wolf leg cycle
    // whip tail
    g.strokeStyle = '#3a6a80';
    g.lineWidth = 2;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(8, 18); g.quadraticCurveTo(2, 14, 1, 22); g.stroke();
    // pectoral disc + pointed snout
    g.fillStyle = '#4a7a90';
    poly(g, [[8, 16], [20, 9], [40, 12], [45, 16], [40, 20], [20, 24]]);
    g.fill();
    g.fillStyle = '#5a8aa0';
    g.beginPath(); g.ellipse(22, 16.5, 11, 5, 0, 0, TAU); g.fill();
    // eyes + mouth slits behind the snout
    g.fillStyle = '#1a2a34';
    g.beginPath(); g.arc(38, 14, 1.1, 0, 0, TAU); g.fill();
    g.strokeStyle = '#2a4a5a';
    g.lineWidth = 1;
    for (const mx of [33, 35.5]) {
      g.beginPath(); g.moveTo(mx, 19.5); g.lineTo(mx + 2.5, 20); g.stroke();
    }
    g.restore();
  });
}

function orcaFrame(frame) {
  return canvasOf(64, 60, (g) => {
    g.save();
    g.translate(0, frame ? -1.5 : 0);
    const dy = frame ? 0.5 : 0;
    // tail fluke
    g.fillStyle = '#232c36';
    poly(g, [[16, 30 + dy], [5, 18 + dy], [11, 30 + dy], [5, 42 + dy]]);
    g.fill();
    // body
    g.fillStyle = '#2c3844';
    g.beginPath(); g.ellipse(34, 30 + dy, 22, 14, 0, 0, TAU); g.fill();
    // head + snout
    g.fillStyle = '#324050';
    g.beginPath(); g.ellipse(50, 32 + dy, 10, 9, 0, 0, TAU); g.fill();
    poly(g, [[56, 28 + dy], [62, 33 + dy], [56, 37 + dy]]);
    g.fill();
    // white belly + eye patch
    g.fillStyle = '#e8f2f5';
    g.beginPath(); g.ellipse(34, 37 + dy, 17, 7, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(50, 40 + dy, 8, 5, 0, 0, TAU); g.fill();
    g.fillStyle = '#e8f2f5';
    g.beginPath(); g.ellipse(52, 26 + dy, 3, 2, -0.3, 0, TAU); g.fill();
    // dorsal fin
    g.fillStyle = '#2c3844';
    poly(g, [[28, 18 + dy], [36, 8 + dy], [42, 18 + dy]]);
    g.fill();
    // eye + jaw
    g.fillStyle = '#10181f';
    g.beginPath(); g.arc(53.5, 28.5 + dy, 1.2, 0, 0, TAU); g.fill();
    g.strokeStyle = '#1c2630';
    g.lineWidth = 1.5;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(50, 38 + dy); g.quadraticCurveTo(56, 40 + dy, 61, 37 + dy); g.stroke();
    g.fillStyle = '#e8f2f5';
    for (const tx of [52, 55, 58]) poly(g, [[tx, 38 + dy], [tx + 1.5, 40.5 + dy], [tx + 3, 38.5 + dy]]), g.fill();
    g.restore();
  });
}

function eelFrame(frame) {
  return canvasOf(32, 46, (g) => {
    g.save();
    g.translate(0, frame ? -1.5 : 0);
    const bow = frame ? 4 : 0; // body bows between frames
    // serpentine body, head near the top (facing right)
    g.strokeStyle = '#4a7a8a';
    g.lineWidth = 6;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(15, 45); g.bezierCurveTo(9 + bow, 32, 23 - bow, 22, 17, 10); g.stroke();
    g.strokeStyle = '#6a9aaa';
    g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(15, 44); g.bezierCurveTo(10 + bow, 32, 22 - bow, 22, 17, 11); g.stroke();
    // head + eye
    g.fillStyle = '#5a8a9a';
    g.beginPath(); g.arc(18, 9, 4.5, 0, 0, TAU); g.fill();
    g.fillStyle = '#ffd24a';
    g.beginPath(); g.arc(20.5, 8.5, 1, 0, 0, TAU); g.fill();
    // jagged lightning zap where the cultist orb sits
    const oz = frame ? 1 : -1;
    const glow = g.createRadialGradient(27, 24, 0.5, 27, 24, 8);
    glow.addColorStop(0, 'rgba(140,220,255,0.7)');
    glow.addColorStop(1, 'rgba(140,220,255,0)');
    g.fillStyle = glow;
    g.beginPath(); g.arc(27, 24, 8, 0, 0, TAU); g.fill();
    g.strokeStyle = '#bfe8ff';
    g.lineWidth = 1.8;
    g.lineJoin = 'miter';
    g.beginPath(); g.moveTo(25, 15); g.lineTo(29, 21 + oz); g.lineTo(25.5, 22 + oz); g.lineTo(30, 28 + oz * 0.5); g.lineTo(26, 31); g.stroke();
    g.restore();
  });
}

function sharkFrame(frame) {
  return canvasOf(96, 112, (g) => {
    g.save();
    g.translate(0, frame ? 2 : 0);
    const dy = frame ? 0.5 : 0;
    // tail fluke
    g.fillStyle = '#3a4a58';
    poly(g, [[20, 64 + dy], [8, 44 + dy], [15, 62 + dy], [8, 82 + dy]]);
    g.fill();
    // torpedo body (facing RIGHT)
    g.fillStyle = '#4a5a66';
    g.beginPath(); g.ellipse(54, 62 + dy, 34, 20, 0, 0, TAU); g.fill();
    g.fillStyle = '#51606e';
    g.beginPath(); g.ellipse(78, 58 + dy, 12, 12, 0, 0, TAU); g.fill();
    poly(g, [[84, 50 + dy], [94, 58 + dy], [84, 66 + dy]]);
    g.fill();
    // belly (FLASHES bright on the frame-1 windup pose)
    g.fillStyle = frame ? '#ffffff' : '#d8e8ec';
    g.beginPath(); g.ellipse(54, 73 + dy, 29, 9, 0, 0, TAU); g.fill();
    if (frame) {
      const bf = g.createRadialGradient(54, 74 + dy, 2, 54, 74 + dy, 22);
      bf.addColorStop(0, 'rgba(230,250,255,0.9)');
      bf.addColorStop(1, 'rgba(230,250,255,0)');
      g.fillStyle = bf;
      g.beginPath(); g.ellipse(54, 73 + dy, 24, 11, 0, 0, TAU); g.fill();
    }
    // dorsal fin + pectoral
    g.fillStyle = '#3a4a58';
    poly(g, [[40, 45 + dy], [52, 28 + dy], [64, 44 + dy]]);
    g.fill();
    poly(g, [[60, 62 + dy], [70, 74 + dy], [64, 66 + dy]]);
    g.fill();
    // eye + jaw + teeth
    g.fillStyle = '#1a242c';
    g.beginPath(); g.arc(82, 55 + dy, 1.6, 0, 0, TAU); g.fill();
    g.strokeStyle = '#38464f';
    g.lineWidth = 1.5;
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(88, 66 + dy); g.quadraticCurveTo(82, 70 + dy, 74, 69 + dy); g.stroke();
    g.fillStyle = '#e8f2f5';
    for (const tx of [76, 80, 84, 87.5]) poly(g, [[tx, 67.5 + dy], [tx + 1.3, 70 + dy], [tx + 2.6, 67.5 + dy]]), g.fill();
    // gill slits
    g.strokeStyle = '#38464f';
    g.lineWidth = 1.2;
    for (const gx of [68, 71.5, 75]) {
      g.beginPath(); g.moveTo(gx, 54 + dy); g.lineTo(gx, 64 + dy); g.stroke();
    }
    g.restore();
  });
}

function wraithFrame(frame) {
  return canvasOf(92, 112, (g) => {
    g.save();
    g.translate(0, frame ? 3 : 0);
    // tattered cloak
    poly(g, [[46, 6], [22, 34], [18, 78], [28, 88], [34, 80], [40, 92], [46, 84], [52, 94], [58, 82], [64, 90], [74, 80], [70, 34]]);
    g.fillStyle = '#1c1830';
    g.fill();
    g.fillStyle = 'rgba(60,52,96,0.8)';
    poly(g, [[24, 40], [8, 52], [14, 62], [26, 54]]);
    g.fill();
    poly(g, [[68, 40], [84, 52], [78, 62], [66, 54]]);
    g.fill();
    // hood + face
    g.fillStyle = '#241f3a';
    g.beginPath(); g.arc(46, 20, 14, 0, TAU); g.fill();
    g.fillStyle = '#05040a';
    g.beginPath(); g.ellipse(46, 22, 9, 7.5, 0, 0, TAU); g.fill();
    // glowing eyes
    const eg = g.createRadialGradient(46, 21, 1, 46, 21, 14);
    eg.addColorStop(0, `rgba(140,230,255,${frame ? 0.95 : 0.75})`);
    eg.addColorStop(1, 'rgba(140,230,255,0)');
    g.fillStyle = eg;
    g.beginPath(); g.arc(46, 21, 14, 0, TAU); g.fill();
    g.fillStyle = '#d2f4ff';
    g.beginPath(); g.ellipse(41.5, 21, 2.2, 1.4, 0, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(50.5, 21, 2.2, 1.4, 0, 0, TAU); g.fill();
    g.restore();
  });
}

export function buildCharacters(levelKey) {
  const playerRun = [[4, 0], [0, 0], [-4, 0], [0, 0]];
  const out = {
    player: {
      w: 56, h: 64, shadowR: 12,
      idle: [playerFrame(0, 0, 0), playerFrame(-1, 0, 0)],
      run: playerRun.map(([l, r], i) => playerFrame(i % 2 ? -1 : 0, l, r)),
    },
    rat: { w: 30, h: 26, shadowR: 8, frames: [ratFrame()] },
    bat: { w: 34, h: 28, shadowR: 8, frames: [batFrame(true), batFrame(false)] },
    goblin: {
      w: 30, h: 38, shadowR: 9,
      frames: [[3, 0], [0, 0], [-3, 0]].map(([l, r]) => goblinFrame(l, r)),
    },
    wolf: {
      w: 46, h: 32, shadowR: 11,
      frames: [[5, 0], [0, 5], [0, 0], [-5, 0]].map(([l, r]) => wolfFrame(l, r)),
    },
    brute: { w: 64, h: 60, shadowR: 14, frames: [bruteFrame(0), bruteFrame(1)] },
    cultist: { w: 32, h: 46, shadowR: 9, frames: [cultistFrame(0), cultistFrame(1)] },
    wraith: { w: 92, h: 112, shadowR: 20, frames: [wraithFrame(0), wraithFrame(1)] },
    ryu: { w: 96, h: 112, shadowR: 20, frames: [ryuFrame(0), ryuFrame(1)] },
    shark: { w: 96, h: 112, shadowR: 20, frames: [sharkFrame(0), sharkFrame(1)] },
  };
  if (levelKey === 'm02') {
    // Higan slot re-skins (A1) + Ryū boss (A5) — same footprints, mechanics unchanged
    out.rat = { w: 30, h: 26, shadowR: 8, frames: [tanukiFrame()] };
    out.bat = { w: 34, h: 28, shadowR: 8, frames: [hooiFrame(true), hooiFrame(false)] };
    out.goblin = { w: 30, h: 38, shadowR: 9, frames: [[3, 0], [0, 0], [-3, 0]].map(([l, r]) => shikomeFrame(l, r)) };
    out.wolf = { w: 46, h: 32, shadowR: 11, frames: [[5, 0], [0, 5], [0, 0], [-5, 0]].map(([l, r]) => kitsuneFrame(l, r)) };
    out.brute = { w: 64, h: 60, shadowR: 14, frames: [oniFrame(0), oniFrame(1)] };
    out.cultist = { w: 32, h: 46, shadowR: 9, frames: [mikoFrame(0), mikoFrame(1)] };
    out.wraith = out.ryu; // boss key swap — the m02 boss IS Ryū
  }
  if (levelKey === 'm03') {
    // Drowned City slot re-skins (A1/A2) + Great White boss — same footprints, mechanics unchanged
    out.rat = { w: 30, h: 26, shadowR: 8, frames: [crabFrame()] };
    out.bat = { w: 34, h: 28, shadowR: 8, frames: [goldfishFrame(true), goldfishFrame(false)] };
    out.goblin = {
      w: 30, h: 38, shadowR: 9,
      frames: [mermanFrame(3, 0), mermaidFrame(0, 0), mermanFrame(-3, 0)], // merman + mermaid skins
    };
    out.wolf = {
      w: 46, h: 32, shadowR: 11,
      frames: [[5, 0], [0, 5], [0, 0], [-5, 0]].map(([l, r]) => stingrayFrame(l, r)),
    };
    out.brute = { w: 64, h: 60, shadowR: 14, frames: [orcaFrame(0), orcaFrame(1)] };
    out.cultist = { w: 32, h: 46, shadowR: 9, frames: [eelFrame(0), eelFrame(1)] };
    out.wraith = out.shark; // boss key swap — the m03 boss IS the Great White
  }
  return out;
}

// Playable-character roster art (11.6, D60): one builder per character, Player-def shaped
// {w, h, shadowR, idle[2], run[4]} — same convention as `player` above. The mage reuses
// the ORIGINAL frames (D62: starter keeps the Phase-10 look, bit-identity). `ghostColor`
// tints the sheet (D62; seat order via CFG.ghostColors) — default = seat 0.
export function buildRoster(ghostColor) {
  const run = [[4, 0], [0, 0], [-4, 0], [0, 0]];
  const mk = (frame, w, h, shadowR) => ({
    w, h, shadowR,
    idle: [frame(0, 0, 0), frame(-1, 0, 0)],
    run: run.map(([l, r], i) => frame(i % 2 ? -1 : 0, l, r)),
  });
  const gc = ghostColor || '#ff4b4b';
  const ghost = (dy, legL, legR) => ghostFrame(gc, dy, legL, legR);
  return {
    mage: mk(playerFrame, 56, 64, 12),
    warden: mk(wardenFrame, 58, 66, 13),
    ranger: mk(rangerFrame, 52, 60, 11),
    swash: mk(swashFrame, 54, 62, 12),
    ghost: mk(ghost, 56, 64, 12),
  };
}
