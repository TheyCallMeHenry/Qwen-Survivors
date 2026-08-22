// Characters: player + per-level enemy skins. All face RIGHT — flip at draw time
// with flipX(). Feet/base sit near the bottom of each canvas; shadowR is the
// runtime soft-shadow radius. Hit-flash copies are made at use via flashCopy.
// m01 = Evernight Wood (originals) · m02 = Higan re-skins (13.3) · m03 lands 13.5.

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
  return out;
}
