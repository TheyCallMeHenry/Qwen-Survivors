// Characters: player + per-level enemy skins. All face RIGHT — flip at draw time
// with flipX(). Feet/base sit near the bottom of each canvas; shadowR is the
// runtime soft-shadow radius. Hit-flash copies are made at use via flashCopy.
// m01 = Evernight Wood (originals) · m02 = Higan re-skins (13.3) · m03 = Drowned City re-skins (13.5).

import { makeCanvas, roundRectPath, poly, formShade } from './base.js';
import { TAU } from '../utils/math.js';

function canvasOf(w, h, draw) {
  const c = makeCanvas(w, h);
  draw(c.getContext('2d'));
  return c;
}

// Playable-character sheet builders (mage/warden/ranger/swash/ghost) retired here in
// Phase 27 — they now live in art/heroes.js, redesigned from scratch. This module is
// enemy skins only (buildCharacters).

function ratFrame() {
  return canvasOf(30, 26, (g) => {
    g.strokeStyle = '#8a7070';
    g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(4, 15); g.quadraticCurveTo(0, 17, 1, 21); g.stroke();
    g.fillStyle = '#6b7076';
    g.beginPath(); g.ellipse(13, 16, 9, 6, 0, 0, TAU); g.fill();
    formShade(g, 4, 10, 18, 12); // 24.5 rat body
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
    formShade(g, 11.5, 9, 11, 12); // 24.5 bat body
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
    formShade(g, 8, 16, 15, 16); // 24.5 goblin torso
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
    formShade(g, 9, 10, 28, 14); // 24.5 wolf body
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
    formShade(g, 17, 18, 32, 30); // 24.5 brute torso
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
    formShade(g, 9, 14, 16, 32); // 24.5 cultist robe
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
    formShade(g, 4, 9.5, 18, 13); // 24.5 tanuki body
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
    formShade(g, 8, 16, 15, 16); // 24.5 shikome torso
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
    formShade(g, 9, 10, 28, 14); // 24.5 kitsune body
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
    formShade(g, 17, 18, 32, 30); // 24.5 oni torso
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
    formShade(g, 9, 14, 16, 32); // 24.5 miko robe
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
    formShade(g, 79, 15.5, 18, 13); // 24.5 ryū head
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
    formShade(g, 5.5, 7, 19, 14); // 24.5 crab shell
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
    formShade(g, 10, 7.5, 20, 13); // 24.5 goldfish body
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
    formShade(g, 8, 16, 15, 16); // 24.5 merman torso
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
    formShade(g, 8, 16, 15, 16); // 24.5 mermaid torso
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
    formShade(g, 8, 9, 37, 15); // 24.5 stingray disc
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
    formShade(g, 12, 16 + dy, 44, 28); // 24.5 orca body
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
    formShade(g, 13.5, 4.5, 9, 9); // 24.5 eel head
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
    formShade(g, 20, 42 + dy, 68, 40); // 24.5 shark body
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
    formShade(g, 18, 6, 56, 88); // 24.5 wraith cloak
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

// Enemy skins only (Phase 27): playable sheets live in art/heroes.js. The `player` key
// is retired — nothing reads it (players draw from buildRoster()[charKey]).
export function buildCharacters(levelKey) {
  const out = {
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

// Playable-character roster art: RETIRED here in Phase 27 — buildRoster/buildGhost now
// live only in art/heroes.js (from-scratch sheets). Callers import from there.

// ── 29.9 Wolfpack companion art (NOT the enemy wolf skin) ────────────────────────
// User law: the bonded pack must never read as enemy wolves — bigger silhouettes
// (54×38 vs the enemy's 46×32), aggressive low-head gallop with pinned-back ears,
// erect hackle spikes, bared fangs, amber eyes (the enemy's are red), and violet
// moon-lit fur tips echoing the Werewolf hero (pack identity, heroes.js).
// Each wolf's coat is its index identity: light brown / dark grey / dark brown.
// Contrast-checked against every enemy skin here: enemy wolf blue-grey (#454d58…),
// rat warm grey (#6b7076), bat violet (#55486e), goblin green, brute taupe-brown
// (#5a4a40 — greyish, vs the pack's saturated brown+grey+tan and different shape),
// cultist robed, bosses dark — no pack coat matches any of them, and the pack's
// four-legged gallop + fangs + violet tips distinguish it from the bipedal brute.
// No gradients except formShade's linear pass → boot radial stays 0 even if these
// are ever built inside an instrumented frame.
export const PACK_PALS = [
  { body: '#b08256', dark: '#7c5a36', light: '#c9a06e', belly: '#e6d2ac' }, // light brown (1st)
  { body: '#4a505a', dark: '#2c3138', light: '#5d646f', belly: '#8b929c' }, // dark grey (2nd)
  { body: '#5b3d24', dark: '#38230f', light: '#77522f', belly: '#9a7448' }, // dark brown (3rd)
];
const PACK_TIP = 'rgba(192,132,252,0.85)'; // moon-lit fur tips (Werewolf pack bond)
const PACK_EYE = '#ffb648';

function packWolfFrame(pal, l1, l2) {
  return canvasOf(54, 38, (g) => {
    // raised, forward-swept tail (speed read) with a violet tip
    g.strokeStyle = pal.dark; g.lineWidth = 3.4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(11, 16); g.quadraticCurveTo(4, 12, 2, 5); g.stroke();
    g.strokeStyle = PACK_TIP; g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(3.2, 7.5); g.quadraticCurveTo(2.4, 6, 2, 5); g.stroke();
    // legs (drive further than the enemy wolf — longer stride)
    g.fillStyle = pal.dark;
    g.fillRect(16 + l1, 24, 4, 12);
    g.fillRect(24 + l2, 24, 4, 12);
    g.fillRect(33 + l2, 24, 4, 12);
    g.fillRect(39 + l1, 24, 4, 12);
    // body: longer, lower, driving forward
    g.fillStyle = pal.body;
    g.beginPath(); g.ellipse(28, 19, 17, 8.5, 0, 0, TAU); g.fill();
    formShade(g, 11, 10.5, 34, 17); // 24.4 top-left light, linear only
    // dark dorsal band under the hackle spikes (posture contrast the enemy lacks)
    g.fillStyle = pal.dark;
    poly(g, [[15, 14], [41, 14], [41, 16.6], [15, 16.6]]); g.fill();
    // belly patch (friend read — enemies have none), dimmed so the coat stays primary
    g.globalAlpha = 0.5; g.fillStyle = pal.belly;
    g.beginPath(); g.ellipse(28, 24.5, 10, 3, 0, 0, TAU); g.fill();
    g.globalAlpha = 1;
    // hackle spikes along the back (aggression)
    g.fillStyle = pal.dark;
    for (const x of [18, 25, 32]) {
      poly(g, [[x, 11], [x + 3.5, 6.5], [x + 6, 11.5]]); g.fill();
    }
    // fur tips on the haunch, violet
    g.strokeStyle = PACK_TIP; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(13, 14); g.lineTo(10, 12); g.stroke();
    // head: lowered and thrust forward (the enemy's sits high and round), lighter
    // than the body + outlined so the aggressive face reads at 1×
    g.fillStyle = pal.light;
    poly(g, [[38, 12], [49, 14], [52, 19], [49, 24], [38, 22]]); g.fill();
    g.strokeStyle = 'rgba(10,14,20,0.75)'; g.lineWidth = 1.4; g.lineJoin = 'round';
    poly(g, [[38, 12], [49, 14], [52, 19], [49, 24], [38, 22]]); g.closePath(); g.stroke();
    // brow/muzzle band (darker than the lit head plane) — drawn BEFORE the eye so it shades, not hides
    g.fillStyle = pal.body;
    poly(g, [[38, 12], [49, 14], [46, 17], [39, 16]]); g.fill();
    // open snarling jaw + fangs
    g.fillStyle = pal.dark;
    poly(g, [[44, 22], [51, 23], [48, 27], [43, 25]]); g.fill();
    g.fillStyle = '#f4f7fa';
    poly(g, [[46.5, 23], [48, 26.5], [49.5, 23.2]]); g.fill();
    poly(g, [[43, 22.3], [44, 25], [45.4, 22.6]]); g.fill();
    // pinned-back ears (aggressive posture), violet-tipped
    g.fillStyle = pal.dark;
    poly(g, [[38, 12], [30, 6], [36, 15]]); g.fill();
    poly(g, [[42, 11], [37, 3.5], [45, 11]]); g.fill();
    g.strokeStyle = PACK_TIP; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(30.5, 6.5); g.lineTo(33.5, 9); g.stroke();
    g.beginPath(); g.moveTo(37.5, 4.2); g.lineTo(40, 7.5); g.stroke();
    // amber eye (enemy wolf's is red)
    g.fillStyle = PACK_EYE;
    g.beginPath(); g.ellipse(45, 18.2, 1.6, 1.1, 0, 0, TAU); g.fill();
    g.fillStyle = '#161c24';
    g.beginPath(); g.ellipse(51.5, 18.5, 1.4, 1.1, 0, 0, TAU); g.fill();
  });
}

// Pack sheet for combat's companion draws: frames indexed by wolf order
// (0 = light brown leader, 1 = dark grey, 2 = dark brown), 4-frame gallop
// cycle on the same leg-offset rhythm as the enemy wolf (anim rate stays
// CFG.enemies.wolf.fps — combat owns the clock, this module only bakes art).
export function buildPackWolves() {
  return {
    w: 54, h: 38, shadowR: 13,
    frames: PACK_PALS.map((pal) => [[5, 0], [0, 5], [0, 0], [-5, 0]].map(([l1, l2]) => packWolfFrame(pal, l1, l2))),
  };
}

