// Playable character sheets (11.6 roster art; Phase 27 full from-scratch reimagining,
// user directive 2026-09-07). Five concepts drawn off the binding D62 archetypes —
// every silhouette is built around ONE readable shape + two or three identity props so
// it still reads at 1× on a crowded screen, then refined with garment layering,
// material-specific gradients and the Phase 24 top-left key light (`formShade`).
//
//   mage    "the Moonscribe"      glass cannon · Moonbolt Wand   → tall narrow bell,
//                                  oversized bent point hat, crescent staff, rune hem
//   warden  "the Oathbound"       tank, slowest · Wraith Garlic  → square slab frame,
//                                  great helm sunk between pauldrons, chest brazier
//   ranger  "the Greenwalker"     fast, balanced · Aegis Blades  → lean small-head
//                                  frame, leaf mantle, vertical branch bow, trailing scarf
//   swash   "the Ember Duelist"   agile, upper-medium · Pyre Lance → wide-brim + plume,
//                                  open longcoat with tails, brass pyre lance held lit
//   ghost   "ragged sheet"        faceless fallback (D62)        → cloth-in-motion
//                                  silhouette: dome + torn hem rippling with the stride
//
// CONTRACT (asserted in tools/test-boot.mjs): footprints + shadowR byte-stable, `idle[2]`
// + `run[4]`, builders face RIGHT with feet near the canvas bottom, signature
// `(dy, legL, legR)` — callers pass only legL, which is mirrored between the legs to
// drive both the scissored stride and every piece of secondary motion (phase `s`).

import { makeCanvas, roundRectPath, formShade } from './base.js';
import { TAU } from '../utils/math.js';

const sheet = (w, h, draw) => { const c = makeCanvas(w, h); draw(c.getContext('2d')); return c; }

// build-time gradient builders (never per frame — perf guardrail)
const lg = (g, x0, y0, x1, y1, stops) => {
  const gr = g.createLinearGradient(x0, y0, x1, y1);
  for (const [t, col] of stops) gr.addColorStop(t, col);
  return gr;
};
const rg = (g, cx, cy, r0, r1, stops) => {
  const gr = g.createRadialGradient(cx, cy, r0, cx, cy, r1);
  for (const [t, col] of stops) gr.addColorStop(t, col);
  return gr;
};
const dot = (g, x, y, r, fill) => { g.fillStyle = fill; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
const ell = (g, x, y, rx, ry, rot, fill) => { g.fillStyle = fill; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); g.fill(); };
// open arc stroke — reads as a crescent / cuff / guard at sprite scale
const arcStroke = (g, cx, cy, r, a0, a1, col, w) => {
  g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
  g.beginPath(); g.arc(cx, cy, r, a0, a1); g.stroke();
};
// the two glints that make an eye read as alive rather than painted
const eyeGlint = (g, x, y, r, col, glint) => { dot(g, x, y, r, col); dot(g, x - r * 0.35, y - r * 0.35, Math.max(0.35, r * 0.34), glint); };

// per-seat ghost tint helpers (CFG.ghostColors are hex)
const rgbOf = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const hexOf = ([r, gg, b]) => '#' + [r, gg, b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const shade = (hex, t) => { const a = rgbOf(hex), tgt = t < 0 ? 0 : 255, k = Math.abs(t); return hexOf(a.map((v) => v + (tgt - v) * k)); };
const rgbaOf = (hex, a) => { const [r, gg, b] = rgbOf(hex); return `rgba(${r},${gg},${b},${a})`; };

// ── Mage 56×64 · "the Moonscribe" (glass cannon: 60 hp / ×1.35 dmg) ─────────
// Shape language: a tall narrow bell. Everything vertical and light — the point hat is
// deliberately oversized so the head reads as "all mind", and the only warm color in the
// sheet is the moonstone light she is borrowing.
export function mageFrame(dy, legL, legR) {
  return sheet(56, 64, (g) => {
    g.save();
    g.translate(0, dy);
    const s = legL / 4;                       // run phase −1..+1
    const legF = legL, legB = -(legR || legL); // mirrored scissor

    // ── crescent staff (behind the sleeve): shaft, moon head, drifting motes ──
    g.strokeStyle = lg(g, 46, 53, 43, 14, [[0, '#3a2c1c'], [0.55, '#6d5335'], [1, '#8f7048']]);
    g.lineWidth = 3.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(45.5, 50); g.quadraticCurveTo(43.2, 31, 44, 13); g.stroke();
    dot(g, 44, 10, 8.6, rg(g, 44, 10, 0.6, 8.6, [[0, 'rgba(233,255,252,0.95)'], [0.35, 'rgba(159,232,255,0.5)'], [1, 'rgba(159,232,255,0)']]));
    arcStroke(g, 44, 10, 4.6, -Math.PI * 0.72, Math.PI * 0.42, '#eafffb', 2.4);
    dot(g, 41.5, 5.2, 0.9, 'rgba(233,255,252,0.85)');   // motes riding the moon
    dot(g, 49.5, 16.5, 0.7, 'rgba(159,232,255,0.7)');

    // ── legs + boot toes peeking out under the hem ──
    g.fillStyle = '#1b2233';
    g.fillRect(23 + legB, 45, 5.4, 8);
    g.fillRect(30 + legF, 45, 5.4, 8);
    g.fillStyle = lg(g, 0, 50, 0, 58, [[0, '#2c364b'], [1, '#141a27']]);
    roundRectPath(g, 21 + legB, 51.5, 9.6, 6.6, 2.1); g.fill();
    roundRectPath(g, 29 + legF, 51.5, 9.6, 6.6, 2.1); g.fill();
    g.fillStyle = '#0e131d';                            // toe caps (kept inside the canvas)
    roundRectPath(g, 29.6 + legB, 54, 7.2, 4.1, 1.6); g.fill();
    roundRectPath(g, 35.8 + legF, 54, 7.2, 4.1, 1.6); g.fill();

    // ── robe: the bell — flared hem swinging with the stride, rune embroidery ──
    g.fillStyle = lg(g, 18, 30, 40, 52, [[0, '#4a4372'], [0.45, '#39335c'], [1, '#211d38']]);
    g.beginPath();
    g.moveTo(19, 32);
    g.bezierCurveTo(15, 38, 13.6, 45, 12.6, 50);
    g.quadraticCurveTo(17, 52.6, 21.6, 50.6);
    g.quadraticCurveTo(26, 53.4 + s * 0.8, 30.6, 50.6);
    g.quadraticCurveTo(35, 52.6, 39.6, 50);
    g.bezierCurveTo(39, 44, 38, 37, 36, 32);
    g.closePath(); g.fill();
    formShade(g, 12, 30, 28, 23);
    g.strokeStyle = 'rgba(159,232,255,0.4)'; g.lineWidth = 1.1;   // hem sigil-line
    g.beginPath(); g.moveTo(14.6, 47.6); g.quadraticCurveTo(26, 51.4, 38, 47.6); g.stroke();
    for (const [rx, ry] of [[17.5, 49], [22, 50.4], [27, 50.6], [32.5, 49.6]]) dot(g, rx, ry, 0.9, 'rgba(180,240,255,0.7)');

    // ── shoulder mantle (velvet, scalloped lower edge) ──
    g.fillStyle = lg(g, 14, 26, 42, 39, [[0, '#5c5488'], [1, '#312a4c']]);
    g.beginPath();
    g.moveTo(14.5, 33);
    g.quadraticCurveTo(20, 27.4, 28, 26.9);
    g.quadraticCurveTo(36, 27.4, 41.5, 33);
    g.quadraticCurveTo(38, 36.6, 34.5, 38.6);
    g.quadraticCurveTo(30.6, 36.2, 28, 38.7);
    g.quadraticCurveTo(25.4, 36.2, 21.5, 38.6);
    g.quadraticCurveTo(17.6, 36, 14.5, 33);
    g.closePath(); g.fill();
    formShade(g, 14, 26, 28, 13);

    // ── front sleeve (bell cuff) + hand closing on the shaft ──
    g.fillStyle = lg(g, 33, 32, 44, 41, [[0, '#463f6e'], [1, '#2a2445']]);
    g.beginPath();
    g.moveTo(33.5, 33); g.quadraticCurveTo(41, 33.4, 44.6, 37.4);
    g.quadraticCurveTo(41.4, 41, 36.4, 40.4);
    g.quadraticCurveTo(34, 37.4, 33.5, 33);
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(159,232,255,0.35)'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(42.2, 34.4); g.lineTo(43.4, 40.2); g.stroke();
    dot(g, 44.2, 37.6, 2.1, '#d9cfe8');

    // ── talisman: chain + crescent pendant over the sternum ──
    g.strokeStyle = '#c9a35c'; g.lineWidth = 0.9;
    g.beginPath(); g.moveTo(24.6, 37.6); g.lineTo(27, 40.2); g.moveTo(30.4, 37.6); g.lineTo(28, 40.2); g.stroke();
    arcStroke(g, 27.6, 42.6, 2.4, Math.PI * 0.15, Math.PI * 1.35, '#eafffb', 1.3);

    // ── head: deep shadow under the brim, moonstone eyes only ──
    g.fillStyle = '#171430';
    g.beginPath(); g.ellipse(28, 21, 7.6, 7.2, 0, 0, TAU); g.fill();
    dot(g, 30.6, 21.6, 1.5, 'rgba(159,232,255,0.35)');
    dot(g, 34.1, 22.4, 1.35, 'rgba(159,232,255,0.3)');
    eyeGlint(g, 30.6, 21.4, 1.05, '#9fe8ff', '#eafffb');
    eyeGlint(g, 34.1, 22.2, 0.95, '#9fe8ff', '#eafffb');

    // ── the bent point hat: cone → gold band → brim → star charm ──
    const hat = lg(g, 17, 2, 41, 18, [[0, '#5a5190'], [0.6, '#3a3361'], [1, '#231e3b']]);
    g.fillStyle = hat;
    g.beginPath();
    g.moveTo(17.6, 14.2);
    g.bezierCurveTo(19, 8.4, 27, 3.4, 40.6, 2.2);      // leading edge up to the tip
    g.bezierCurveTo(33, 6.4, 31.4, 10.6, 38.4, 14.2);  // folded tip back down
    g.closePath(); g.fill();
    formShade(g, 17, 2, 24, 13);
    dot(g, 27.4, 12.6, 1.5, '#c9a35c');                 // hat jewel
    dot(g, 27.4, 12.6, 0.6, '#ffe9b8');
    g.fillStyle = lg(g, 11, 11, 45, 20, [[0, '#4b4374'], [1, '#211c37']]);
    g.beginPath(); g.ellipse(28, 15, 16.6, 4.1, -0.02, 0, TAU); g.fill();   // brim
    g.strokeStyle = 'rgba(190,215,255,0.3)'; g.lineWidth = 1;
    g.beginPath(); g.ellipse(28, 14.4, 16.2, 3.4, -0.02, Math.PI * 1.05, Math.PI * 1.75); g.stroke();
    g.strokeStyle = '#c9a35c'; g.lineWidth = 0.8;      // charm thread off the tip
    g.beginPath(); g.moveTo(40.6, 1.4); g.quadraticCurveTo(44, 3.2, 45.1, 5.4); g.stroke();
    dot(g, 45.4, 6.1, 1.3, '#ffe9b8');
    g.restore();
  });
}

// ── Warden 58×66 · "the Oathbound" (tank: 150 hp / ×0.85 dmg / slowest) ──────
// Shape language: a square slab — helmet sunk between the shoulders so there is no neck,
// mass widest at the pauldrons, everything below the belt stacked in horizontal lames.
// The amber furnace set into the breastplate is where its Wraith Garlic aura burns.
export function wardenFrame(dy, legL, legR) {
  return sheet(58, 66, (g) => {
    g.save();
    g.translate(0, dy);
    const s = legL / 4;
    const legF = legL, legB = -(legR || legL);

    // ── tower shield strapped to the back (only its lit edge shows) ──
    g.fillStyle = lg(g, 3.5, 20, 15, 52, [[0, '#4e5c78'], [1, '#28313f']]);
    roundRectPath(g, 3.6, 20, 11.6, 31, 4); g.fill();
    g.strokeStyle = 'rgba(255,180,84,0.4)'; g.lineWidth = 1.2;
    g.beginPath(); g.moveTo(4.9, 23); g.lineTo(4.9, 47); g.stroke();
    dot(g, 9.4, 34, 3.3, 'rgba(255,180,84,0.5)'); dot(g, 9.4, 34, 1.6, '#ffd08c');   // boss

    // ── legs: greaves + squared sabatons, knee capping catching the key light ──
    g.fillStyle = lg(g, 0, 45, 0, 58, [[0, '#4a5972'], [1, '#2b3444']]);
    roundRectPath(g, 20 + legB, 45, 10.4, 13, 3); g.fill();
    roundRectPath(g, 31 + legF, 45, 10.4, 13, 3); g.fill();
    ell(g, 25.2 + legB, 46.8, 5.4, 3, 0, '#61728f');
    ell(g, 36.2 + legF, 46.8, 5.4, 3, 0, '#61728f');
    g.fillStyle = lg(g, 0, 55, 0, 62.6, [[0, '#2e3949'], [1, '#151b26']]);
    roundRectPath(g, 18.4 + legB, 55, 13.6, 7.6, 2.4); g.fill();
    roundRectPath(g, 29.4 + legF, 55, 13.6, 7.6, 2.4); g.fill();
    g.fillStyle = '#0e131b';                                            // soles
    roundRectPath(g, 18.4 + legB, 60.6, 13.6, 2, 1); g.fill();
    roundRectPath(g, 29.4 + legF, 60.6, 13.6, 2, 1); g.fill();

    // ── back pauldron + fur mantle over the off-shoulder ──
    ell(g, 17.5, 29.5, 9, 8.4, 0, '#4a586f');
    g.fillStyle = lg(g, 12, 23, 27, 38, [[0, '#7d6c53'], [1, '#43382a']]);
    g.beginPath();
    g.moveTo(14.2, 26.6); g.quadraticCurveTo(21, 23, 26.4, 26.6);
    g.quadraticCurveTo(24.4, 33.6, 20.4, 37.8);
    g.quadraticCurveTo(15, 34.8, 12.4, 29.6);
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(18,14,10,0.5)'; g.lineWidth = 0.9;            // fur strands
    for (let i = 0; i < 5; i++) { const fx = 14 + i * 2.4; g.beginPath(); g.moveTo(fx, 27.6); g.lineTo(fx - 1.3, 33.8 + (i % 2) * 2.2); g.stroke(); }

    // ── faulds: three lames, narrowing down ──
    g.fillStyle = lg(g, 0, 43, 0, 58, [[0, '#5b6b87'], [1, '#39465c']]);
    roundRectPath(g, 16.4, 43, 25.4, 6.6, 2.6); g.fill();
    roundRectPath(g, 18, 48.2, 22.2, 6, 2.4); g.fill();
    roundRectPath(g, 19.6, 52.8, 19, 5, 2.2); g.fill();

    // ── cuirass + the oath-fire brazier (garlic aura source) ──
    g.fillStyle = lg(g, 17, 26, 43, 50, [[0, '#68799b'], [0.5, '#4b5a75'], [1, '#323d52']]);
    g.beginPath();
    g.moveTo(18.4, 30); g.quadraticCurveTo(29, 26.2, 39.6, 30);
    g.lineTo(41, 41); g.quadraticCurveTo(29, 47.2, 17, 41);
    g.closePath(); g.fill();
    formShade(g, 17, 26, 25, 21);
    g.fillStyle = '#586780'; roundRectPath(g, 23, 24.8, 13, 4.6, 2); g.fill();   // gorget
    dot(g, 29, 37, 10, rg(g, 29, 37, 1, 10, [[0, 'rgba(255,208,140,0.9)'], [0.45, 'rgba(255,180,84,0.42)'], [1, 'rgba(255,180,84,0)']]));
    g.fillStyle = '#131922'; roundRectPath(g, 23.6, 31.4, 11, 12.4, 2.6); g.fill();
    for (let i = 0; i < 3; i++) {
      const gy = 32.8 + i * 3.5;
      g.fillStyle = lg(g, 25, gy, 33, gy + 2.4, [[0, '#ffe6bc'], [1, '#ff9c3c']]);
      roundRectPath(g, 25.2, gy, 7.8, 2.4, 1.1); g.fill();
    }
    for (const [rx, ry] of [[19.6, 32], [38.6, 32], [20.6, 40], [37.6, 40]]) dot(g, rx, ry, 0.85, '#8f9cb2');

    // ── belt + the broken chain at the hip (swings with the stride) ──
    g.fillStyle = '#4a3b28'; roundRectPath(g, 16.4, 42.6, 25.4, 4.8, 2); g.fill();
    g.fillStyle = '#c9a35c'; roundRectPath(g, 27.2, 42.8, 4.8, 4.6, 1.2); g.fill();
    g.strokeStyle = '#8b97ad'; g.lineWidth = 1.3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(40.4, 45.6); g.quadraticCurveTo(45.4 + s * 0.8, 51, 43.6 - s * 0.6, 56.4); g.stroke();
    dot(g, 43.4 - s * 0.8, 57.8, 1.6, '#8b97ad');

    // ── front pauldron: two lames + rivets (the heavy shoulder) ──
    g.fillStyle = lg(g, 34, 21, 46, 36, [[0, '#6c7c9c'], [1, '#455369']]);
    g.beginPath(); g.arc(43.4, 29.6, 9.4, Math.PI * 1.02, Math.PI * 1.98); g.quadraticCurveTo(46, 36, 39.6, 36.6); g.closePath(); g.fill();
    arcStroke(g, 43.4, 29.6, 7.4, Math.PI * 1.06, Math.PI * 1.86, 'rgba(255,180,84,0.45)', 1.3);
    arcStroke(g, 42.4, 31.4, 9.6, Math.PI * 1.1, Math.PI * 1.7, 'rgba(18,24,34,0.55)', 1.1);
    dot(g, 39.6, 24.4, 1.1, '#ffb454'); dot(g, 46.2, 26.6, 1, '#c9a35c');

    // ── great helm: no neck, comb swept back, embers behind the slit ──
    g.fillStyle = lg(g, 22, 3, 36, 12, [[0, '#ab463a'], [1, '#6c2922']]);
    g.beginPath(); g.moveTo(25.4, 8.6); g.quadraticCurveTo(29, 1.6, 34.6, 5.4);
    g.quadraticCurveTo(30.4, 9, 28.8, 12.2); g.closePath(); g.fill();
    g.fillStyle = lg(g, 19, 5, 40, 26, [[0, '#6d7c9a'], [0.55, '#4e5c78'], [1, '#344056']]);
    g.beginPath();
    g.moveTo(19.4, 19); g.quadraticCurveTo(19.8, 6.2, 29.2, 6);
    g.quadraticCurveTo(38.6, 6.2, 39, 19);
    g.quadraticCurveTo(34.2, 25.6, 29.2, 25.6);
    g.quadraticCurveTo(24.2, 25.6, 19.4, 19);
    g.closePath(); g.fill();
    formShade(g, 19, 5, 20, 21);
    g.fillStyle = '#0a0f17'; roundRectPath(g, 23.4, 13.6, 13.8, 4.8, 1.8); g.fill();   // visor slit
    dot(g, 33.6, 15.9, 1.5, '#ffd08c'); dot(g, 30.2, 15.9, 1.15, '#ffb454');
    g.strokeStyle = 'rgba(9,13,19,0.6)'; g.lineWidth = 1;                               // breath vents
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(25.4 + i * 2.8, 20.6); g.lineTo(26.6 + i * 2.8, 23.4); g.stroke(); }
    g.restore();
  });
}

// ── Ranger 52×60 · "the Greenwalker" (fast: 110 hp / ×1.0 dmg / 320 speed) ───
// Shape language: lean and small-headed so the frame reads as quick even standing still.
// The only long line is the bow, held vertical — it doubles as the silhouette's spine.
export function rangerFrame(dy, legL, legR) {
  return sheet(52, 60, (g) => {
    g.save();
    g.translate(0, dy);
    const s = legL / 4;
    const legF = legL, legB = -(legR || legL);

    // ── quiver on the back + three fletched shafts (accent = mint) ──
    g.fillStyle = lg(g, 7, 18, 16, 38, [[0, '#6b5537'], [1, '#382b1a']]);
    g.beginPath();
    g.moveTo(9.4, 19); g.quadraticCurveTo(15.6, 17.8, 16.6, 22);
    g.lineTo(14.6, 37); g.quadraticCurveTo(9.6, 39.2, 7.8, 34);
    g.closePath(); g.fill();
    for (const [ax, ay] of [[9.6, 12.4], [12.6, 11.2], [15.4, 13.4]]) {
      g.strokeStyle = '#cbb894'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(ax + 1.4, ay + 6); g.lineTo(ax, ay); g.stroke();
      ell(g, ax - 0.2, ay + 0.4, 1.7, 2.5, -0.35, '#a4ffc9');
    }

    // ── scarf thrown behind by the stride ──
    g.strokeStyle = '#8d6b4a'; g.lineWidth = 2.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(21, 25.4); g.quadraticCurveTo(13.4, 27 - s * 1.6, 6.6, 32.6 - s * 2.6); g.stroke();

    // ── legs: slim, calf-wrapped, soft boots ──
    g.fillStyle = '#3c4a3a';
    roundRectPath(g, 19.4 + legB, 42, 6.2, 10.4, 2.4); g.fill();
    roundRectPath(g, 27 + legF, 42, 6.2, 10.4, 2.4); g.fill();
    g.strokeStyle = '#71895f'; g.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const wy = 45.4 + i * 2.3;
      g.beginPath(); g.moveTo(19.6 + legB, wy); g.lineTo(25.4 + legB, wy - 0.6);
      g.moveTo(27.2 + legF, wy); g.lineTo(33 + legF, wy - 0.6); g.stroke();
    }
    g.fillStyle = lg(g, 0, 50, 0, 55.4, [[0, '#3b4a31'], [1, '#1e2819']]);
    roundRectPath(g, 18 + legB, 50.2, 9.8, 5.2, 2.2); g.fill();
    roundRectPath(g, 26.6 + legF, 50.2, 9.8, 5.2, 2.2); g.fill();

    // ── jerkin: laced front, belt + pouch ──
    g.fillStyle = lg(g, 18, 24, 36, 45, [[0, '#57764f'], [0.55, '#42583c'], [1, '#2a3826']]);
    g.beginPath();
    g.moveTo(19.4, 27); g.quadraticCurveTo(26, 24.2, 33, 27);
    g.lineTo(34, 40); g.quadraticCurveTo(26, 45, 18.4, 40);
    g.closePath(); g.fill();
    formShade(g, 18, 24, 17, 21);
    g.strokeStyle = '#d9cbb2'; g.lineWidth = 0.9;
    for (let i = 0; i < 4; i++) {
      const ly = 29 + i * 2.5;
      g.beginPath(); g.moveTo(23.4, ly); g.lineTo(28.6, ly + 1.6); g.moveTo(28.6, ly); g.lineTo(23.4, ly + 1.6); g.stroke();
    }
    g.fillStyle = '#4a3b28'; roundRectPath(g, 18.4, 39.4, 16.2, 3.8, 1.6); g.fill();
    g.fillStyle = '#6b5537'; roundRectPath(g, 29.4, 40.4, 5.6, 5.2, 1.6); g.fill();
    dot(g, 24.4, 41.3, 1.1, '#c9a35c');

    // ── leaf-mesh mantle, scalloped hem fluttering with the stride ──
    g.fillStyle = lg(g, 12, 23, 40, 40, [[0, '#6f9460'], [1, '#31462c']]);
    g.beginPath();
    g.moveTo(13.4, 30); g.quadraticCurveTo(19, 24.2, 26, 23.8); g.quadraticCurveTo(33.4, 24.2, 38.6, 30);
    g.quadraticCurveTo(36.6, 34 + s * 0.9, 34.4, 37.4);
    g.quadraticCurveTo(31.6, 34.2, 29.4, 38.6);
    g.quadraticCurveTo(26.4, 34.6, 23.8, 38.8);
    g.quadraticCurveTo(21, 34.4, 18.4, 37.6);
    g.quadraticCurveTo(15.4, 34.4, 13.4, 30);
    g.closePath(); g.fill();
    formShade(g, 13, 23, 26, 16);

    // ── cowl down at the nape + ponytail out the back ──
    g.fillStyle = '#3f5a39';
    g.beginPath(); g.moveTo(18.4, 23.6); g.quadraticCurveTo(23, 26.6, 20.6, 30.4);
    g.quadraticCurveTo(16.4, 27.6, 18.4, 23.6); g.closePath(); g.fill();
    g.strokeStyle = '#2b2118'; g.lineWidth = 2.4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(20.6, 19.8); g.quadraticCurveTo(15.8, 22.6 - s * 1.2, 14.8, 26.4); g.stroke();

    // ── head: small, alert, eyes on the target ──
    g.fillStyle = '#2b2118';
    g.beginPath(); g.ellipse(25, 18.4, 7, 6.6, 0, 0, TAU); g.fill();
    g.fillStyle = lg(g, 21, 13, 34, 26, [[0, '#eccfa9'], [1, '#c39f78']]);
    g.beginPath(); g.ellipse(27.2, 19.4, 5.8, 5.6, 0, 0, TAU); g.fill();
    formShade(g, 21, 13, 12, 12);
    eyeGlint(g, 29.6, 19, 1.2, '#182018', '#a4ffc9');
    g.strokeStyle = '#6b5537'; g.lineWidth = 1.6;                       // headband
    g.beginPath(); g.moveTo(21.4, 16.4); g.quadraticCurveTo(27, 13.6, 32.2, 16.8); g.stroke();
    g.fillStyle = '#a4ffc9';                                            // tied feather
    g.beginPath(); g.moveTo(21.4, 16.6); g.quadraticCurveTo(17.8, 14.4, 16.4, 11.4);
    g.quadraticCurveTo(19.8, 13.4, 21.4, 16.6); g.closePath(); g.fill();

    // ── branch bow held vertical: limbs curve toward the target, string pale ──
    g.strokeStyle = lg(g, 37, 12, 43, 48, [[0, '#cda875'], [1, '#7a5a34']]);
    g.lineWidth = 2.3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(37.6, 14.4); g.quadraticCurveTo(43.6, 30.5, 37.6, 46.6); g.stroke();
    g.strokeStyle = '#8a6a3a'; g.lineWidth = 1.7;
    g.beginPath(); g.moveTo(37.6, 14.4); g.lineTo(40, 17); g.moveTo(37.6, 46.6); g.lineTo(40, 44); g.stroke();
    g.strokeStyle = 'rgba(235,240,250,0.55)'; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(37.6, 14.4); g.lineTo(37.6, 46.6); g.stroke();

    // ── front sleeve + hand on the grip (drawn over the bow so it holds it) ──
    g.fillStyle = lg(g, 30, 26, 39, 36, [[0, '#50704a'], [1, '#2b3a25']]);
    g.beginPath(); g.moveTo(31, 27.8); g.quadraticCurveTo(37.4, 28.2, 39.8, 31.6);
    g.quadraticCurveTo(36.4, 35, 32.4, 34.4); g.closePath(); g.fill();
    dot(g, 39.2, 31.4, 2, '#eccfa9');

    // ── mooned acorn charm at the belt (the Greenwalker's mark) ──
    dot(g, 20.6, 43.4, 3.2, rg(g, 20.6, 43.4, 0.4, 3.2, [[0, 'rgba(164,255,201,0.5)'], [1, 'rgba(164,255,201,0)']]));
    g.fillStyle = '#a4ffc9';
    g.beginPath(); g.moveTo(19.8, 43.2); g.quadraticCurveTo(20.6, 41.4, 21.4, 43.2);
    g.quadraticCurveTo(20.6, 44.6, 19.8, 43.2); g.closePath(); g.fill();
    g.restore();
  });
}

// ── Swashbuckler 54×62 · "the Ember Duelist" (agile: 90 hp / ×1.15 dmg) ──────
// Shape language: diagonals — plume, baldric, scabbard and the lit pyre lance all run
// across the frame, so even the idle pose looks mid-lunge. Wine + brass, one flame.
export function swashFrame(dy, legL, legR) {
  return sheet(54, 62, (g) => {
    g.save();
    g.translate(0, dy);
    const s = legL / 4;
    const legF = legL, legB = -(legR || legL);

    // ── coat tails thrown by the stride (behind everything) ──
    g.fillStyle = lg(g, 5, 30, 22, 58, [[0, '#7b3d51'], [1, '#3a1a27']]);
    g.beginPath();
    g.moveTo(19, 34);
    g.quadraticCurveTo(11, 40 - s * 2, 5.4, 50 - s * 3);
    g.quadraticCurveTo(11, 49, 15, 44);
    g.quadraticCurveTo(14, 51, 12, 57);
    g.quadraticCurveTo(18, 50, 21, 42);
    g.closePath(); g.fill();

    // ── plume streaming back off the hat (behind the crown) ──
    g.strokeStyle = lg(g, 6, 2, 22, 14, [[0, '#e8b45a'], [1, '#8a5a2f']]);
    g.lineWidth = 2.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(21.4, 12.4); g.quadraticCurveTo(13, 7 - s * 1.2, 5.4, 6.4 - s * 1.4); g.stroke();
    g.strokeStyle = 'rgba(232,180,90,0.5)'; g.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const bx = 19 - i * 3.6, by = 11.4 - i * 1.1;
      g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - 1.6, by - 2.4); g.stroke();
    }

    // ── boots: cuffed shafts, toes right, spur rowels behind the heels ──
    g.fillStyle = lg(g, 0, 45, 0, 58, [[0, '#3b2e44'], [1, '#1e1726']]);
    roundRectPath(g, 19 + legB, 45, 8.8, 12.6, 2.6); g.fill();
    roundRectPath(g, 28 + legF, 45, 8.8, 12.6, 2.6); g.fill();
    g.fillStyle = '#4b3a56';
    roundRectPath(g, 17.9 + legB, 44, 11, 4.2, 1.8); g.fill();
    roundRectPath(g, 26.9 + legF, 44, 11, 4.2, 1.8); g.fill();
    g.fillStyle = '#231a2d';
    roundRectPath(g, 19.4 + legB, 54.6, 11.6, 3.8, 1.6); g.fill();
    roundRectPath(g, 28.4 + legF, 54.6, 11.6, 3.8, 1.6); g.fill();
    arcStroke(g, 18.4 + legB, 56, 1.8, 0, TAU, '#c9a35c', 1);
    arcStroke(g, 27.4 + legF, 56, 1.8, 0, TAU, '#c9a35c', 1);

    // ── longcoat: open front, high collar, hem flaring over the tails ──
    g.fillStyle = lg(g, 14, 25, 40, 52, [[0, '#8b4b61'], [0.55, '#6d3749'], [1, '#46202e']]);
    g.beginPath();
    g.moveTo(16, 28.8); g.quadraticCurveTo(27, 25.2, 38, 28.8);
    g.lineTo(40.2, 46); g.quadraticCurveTo(27, 52.2, 14, 46);
    g.closePath(); g.fill();
    formShade(g, 14, 25, 27, 27);
    // shirt + cravat
    g.fillStyle = lg(g, 22, 28, 34, 44, [[0, '#e8dcc0'], [1, '#b9a58a']]);
    g.beginPath();
    g.moveTo(23.4, 29); g.lineTo(31.6, 29);
    g.quadraticCurveTo(33.2, 40, 27.6, 43.2); g.quadraticCurveTo(22.4, 40, 23.4, 29);
    g.closePath(); g.fill();
    // lapels folded back
    g.fillStyle = lg(g, 18, 27, 36, 42, [[0, '#a25c74'], [1, '#59283a']]);
    g.beginPath(); g.moveTo(23.4, 29); g.quadraticCurveTo(19.4, 34, 22, 42.2); g.lineTo(25.6, 40);
    g.quadraticCurveTo(23, 34, 26.6, 29.4); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(31.6, 29); g.quadraticCurveTo(35.6, 34, 33, 42.2); g.lineTo(29.8, 40);
    g.quadraticCurveTo(32, 34, 28.6, 29.4); g.closePath(); g.fill();
    dot(g, 27.6, 30.4, 2.2, '#efe4d2');   // cravat knot
    // collar wings behind the head
    g.fillStyle = '#5f2b3c';
    g.beginPath(); g.moveTo(19.8, 26.6); g.quadraticCurveTo(23.4, 22.6, 26.4, 26.4); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(28.6, 26.4); g.quadraticCurveTo(31.6, 22.4, 35, 26.4); g.closePath(); g.fill();

    // ── baldric + gold sash with fringe ──
    g.strokeStyle = '#5a4632'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(21, 30); g.lineTo(34.4, 43); g.stroke();
    dot(g, 27.6, 36.4, 1.5, '#c9a35c');
    g.fillStyle = lg(g, 15, 42, 38, 48, [[0, '#e8b45a'], [1, '#a2762f']]);
    g.beginPath();
    g.moveTo(15.4, 42.8); g.quadraticCurveTo(27, 46.4, 38.6, 42.8);
    g.lineTo(39.2, 47.4); g.quadraticCurveTo(27, 51, 15, 47.4);
    g.closePath(); g.fill();
    g.strokeStyle = '#c9a35c'; g.lineWidth = 0.9;
    for (let i = 0; i < 4; i++) { const fx = 16.4 + i * 1.9; g.beginPath(); g.moveTo(fx, 47); g.lineTo(fx - 1.4, 50.8 + (i % 2)); g.stroke(); }

    // ── rapier sheathed at the off hip: hilt forward, scabbard trailing ──
    g.strokeStyle = '#2a2036'; g.lineWidth = 2.8; g.lineCap = 'round';
    g.beginPath(); g.moveTo(18.4, 45); g.lineTo(7.2, 52 - s * 0.8); g.stroke();
    arcStroke(g, 19.6, 44.4, 2.9, Math.PI * 1.02, Math.PI * 1.92, '#dfe7f2', 1.4);
    dot(g, 21.8, 43.2, 1.3, '#c9a35c');

    // ── head: three-quarter face, wry grin, sideburn ──
    g.fillStyle = '#2b2028';
    g.beginPath(); g.ellipse(26, 18.8, 7, 6.4, 0, 0, TAU); g.fill();
    g.fillStyle = lg(g, 22, 13, 34, 26, [[0, '#eecaa2'], [1, '#c69c72']]);
    g.beginPath(); g.ellipse(28, 19.8, 5.8, 5.6, 0, 0, TAU); g.fill();
    formShade(g, 22, 13, 12, 12);
    eyeGlint(g, 30.4, 19.4, 1.2, '#2b2028', '#fff6e8');
    g.strokeStyle = '#8a5f46'; g.lineWidth = 0.9;
    g.beginPath(); g.moveTo(30.4, 22.4); g.quadraticCurveTo(32.4, 23.2, 32.9, 21.6); g.stroke();
    g.strokeStyle = '#2b2028'; g.lineWidth = 1.7;
    g.beginPath(); g.moveTo(24.4, 17.2); g.quadraticCurveTo(22.8, 21, 24.4, 24); g.stroke();

    // ── wide-brim hat: crown → gold band → brim (dipping at the sides) ──
    const hat = lg(g, 12, 7, 42, 20, [[0, '#5c3141'], [1, '#2d1620']]);
    g.fillStyle = hat;
    g.beginPath();
    g.moveTo(19.8, 14.8); g.quadraticCurveTo(20.8, 8, 27, 7.6);
    g.quadraticCurveTo(33.4, 8, 34.4, 14.8); g.closePath(); g.fill();
    formShade(g, 19, 7, 15, 8);
    g.strokeStyle = '#c9a35c'; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(20.4, 13.4); g.quadraticCurveTo(27, 11.2, 33.9, 13.4); g.stroke();
    g.fillStyle = lg(g, 11, 11, 43, 20, [[0, '#4c2836'], [1, '#251019']]);
    g.beginPath(); g.ellipse(27, 15.2, 16, 4.2, -0.03, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,200,140,0.28)'; g.lineWidth = 1;
    g.beginPath(); g.ellipse(27, 14.6, 15.4, 3.4, -0.03, Math.PI * 1.06, Math.PI * 1.74); g.stroke();

    // ── the Pyre Lance: brass nozzle held forward, pilot flame lit ──
    g.fillStyle = lg(g, 32, 29, 42, 40, [[0, '#7c4257'], [1, '#4a2030']]);
    g.beginPath(); g.moveTo(33, 30.6); g.quadraticCurveTo(39.4, 31, 41.8, 34.6);
    g.quadraticCurveTo(38.4, 38, 34.4, 37.2); g.closePath(); g.fill();
    dot(g, 41.4, 35, 2, '#eecaa2');
    g.strokeStyle = lg(g, 39, 36, 48, 32, [[0, '#8a6f3a'], [0.5, '#d9b168'], [1, '#fff0c0']]);
    g.lineWidth = 3.2; g.lineCap = 'round';
    g.beginPath(); g.moveTo(40, 36); g.lineTo(47.8, 33); g.stroke();
    dot(g, 48.6, 32.6, 1.8, 'rgba(255,240,200,0.9)');
    dot(g, 49.4, 31.8, 4, rg(g, 49.4, 31.8, 0.5, 4, [[0, 'rgba(255,240,200,0.9)'], [0.4, 'rgba(255,160,60,0.5)'], [1, 'rgba(255,120,40,0)']]));
    g.fillStyle = '#ffd9a0';
    g.beginPath(); g.moveTo(47.8, 33); g.quadraticCurveTo(50.6 + s * 0.8, 30.8, 48.8, 28);
    g.quadraticCurveTo(48.6, 31, 47.8, 33); g.closePath(); g.fill();
    g.restore();
  });
}

// ── Ghost 56×64 · ragged sheet (faceless fallback, D62; tinted per seat) ─────
// Shape language: cloth in motion. No legs — the torn hem is the run cycle, rippling
// against the stride, and the eye holes sit right of centre so it reads as facing.
export function ghostFrame(color, dy, legL, legR) {
  const c = color || '#ff4b4b';
  return sheet(56, 64, (g) => {
    g.save();
    g.translate(0, dy);
    const s = legL / 4;
    const pale = shade(c, 0.32), mid = shade(c, -0.16), deep = shade(c, -0.48), voidCol = '#0d1118';

    // ── the sheet: dome → shoulders → ragged hem (torn points lift with the stride) ──
    g.fillStyle = lg(g, 10, 5, 46, 56, [[0, pale], [0.5, c], [1, mid]]);
    g.beginPath();
    g.moveTo(28, 5.4);
    g.bezierCurveTo(38, 5.4, 47.4, 12, 47.6, 30);
    g.bezierCurveTo(49, 38, 46.6, 45, 44.6, 50);
    g.quadraticCurveTo(41, 45 - s * 2, 38.6, 55 - s * 1.5);
    g.quadraticCurveTo(35, 47 + s * 1.5, 31.6, 56.2 + s);
    g.quadraticCurveTo(28, 47 - s * 1.5, 24, 55 - s);
    g.quadraticCurveTo(20, 46 + s * 2, 16.6, 53 + s * 1.5);
    g.quadraticCurveTo(13, 45.4, 11.4, 49);
    g.bezierCurveTo(9.4, 44, 8.2, 37, 8.4, 30);
    g.bezierCurveTo(8.6, 12, 18, 5.4, 28, 5.4);
    g.closePath(); g.fill();
    formShade(g, 8, 5, 40, 51);

    // ── drape folds + the light showing through at the hem ──
    g.strokeStyle = rgbaOf(deep, 0.5); g.lineWidth = 1.2;
    for (const [fx, fy] of [[16, 24], [23, 30], [34, 27]]) {
      g.beginPath(); g.moveTo(fx, fy); g.quadraticCurveTo(fx + 1.6, fy + 9, fx - 0.6, fy + 17); g.stroke();
    }
    dot(g, 28, 48, 13, rg(g, 28, 48, 1, 13, [[0, rgbaOf(pale, 0.28)], [1, rgbaOf(pale, 0)]]));

    // ── hands pinching the sheet up from inside (two taut points at the shoulders) ──
    ell(g, 16.4, 17.6, 3.2, 2.4, -0.5, rgbaOf(pale, 0.55));
    ell(g, 40.2, 15.8, 3, 2.2, 0.4, rgbaOf(pale, 0.45));

    // ── eye holes + a small surprised mouth (right of centre = facing) ──
    dot(g, 31.6, 24.4, 4.6, rg(g, 31.6, 24.4, 0.5, 4.6, [[0, rgbaOf(c, 0.35)], [1, rgbaOf(c, 0)]]));
    dot(g, 38.8, 25.2, 4.2, rg(g, 38.8, 25.2, 0.5, 4.2, [[0, rgbaOf(c, 0.3)], [1, rgbaOf(c, 0)]]));
    ell(g, 31.6, 24.4, 2.9, 3.8, 0, voidCol);
    ell(g, 38.8, 25.2, 2.7, 3.6, 0, voidCol);
    dot(g, 30.5, 22.6, 0.8, 'rgba(240,246,255,0.5)');
    dot(g, 37.7, 23.4, 0.7, 'rgba(240,246,255,0.4)');
    ell(g, 35.6, 33.4, 2.1, 2.7, 0, rgbaOf(voidCol, 0.8));
    g.restore();
  });
}

// ── sheet assembly (unchanged contract: idle[2] + run[4], feet anchored) ──────
const RUN = [[4, 0], [0, 0], [-4, 0], [0, 0]];
const mkSheet = (frame, w, h, shadowR) => ({
  w, h, shadowR,
  idle: [frame(0, 0, 0), frame(-1, 0, 0)],
  run: RUN.map(([l, r], i) => frame(i % 2 ? -1 : 0, l, r)),
});

// D62 (11.6.4): per-seat ghost sheet without rebuilding the full roster.
export function buildGhost(color) {
  const gc = color || '#ff4b4b';
  return mkSheet((dy, l, r) => ghostFrame(gc, dy, l, r), 56, 64, 12);
}

export function buildRoster(ghostColor) {
  return {
    mage: mkSheet(mageFrame, 56, 64, 12),
    warden: mkSheet(wardenFrame, 58, 66, 13),
    ranger: mkSheet(rangerFrame, 52, 60, 11),
    swash: mkSheet(swashFrame, 54, 62, 12),
    ghost: buildGhost(ghostColor),
  };
}
