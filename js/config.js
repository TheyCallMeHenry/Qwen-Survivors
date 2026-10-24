// All tuning in one place. World units = CSS pixels.

export const CFG = {
  world: { w: 4200, h: 3200, margin: 70, tile: 256, cullPad: 300, decorPad: 260, starBands: 4 }, // cullPad = Y-sort entity gather pad; decorPad = world-space decor/ridge cull pad; starBands = 25.4d twinkle alpha-group count

  run: {
    time: 300,          // legacy canonical default; live end-time now comes from durations below (17.1/17.2)
    bossAt: 240,        // wraith spawn time (first boss event = 4:00)
    bossEvery: 300,     // cadence between boss events: 4:00, 9:00, 14:00, 19:00, … (17.3)
    victoryBonus: 10000,
    timeScorePerSec: 15,
    maxWeapons: 5,      // base standard-weapon slots per player (co-op cap = base − (N−1), 11.5)
    // Selectable run durations (Phase 17, PLAN §3.10). time null = ENDLESS (death-only end).
    durations: {
      order: ['d5', 'd10', 'd15', 'd20', 'endless'],
      d5: { time: 300, label: '5:00' },
      d10: { time: 600, label: '10:00' },
      d15: { time: 900, label: '15:00' },
      d20: { time: 1200, label: '20:00' },
      endless: { time: null, label: 'ENDLESS' },
    },
    defaultDuration: 'd5', // default = the old fixed 5:00 run → solo invariance
  },

  player: {
    r: 14,
    maxHp: 100,
    speed: 265,
    accel: 14,           // exponential convergence lambda (high = snappy)
    dashTime: 0.18,
    dashSpeed: 690,
    dashCd: 1.75,
    dashIframeExtra: 0.06,
    hurtIframes: 0.7,
    knockback: 76,
    animFps: 8,
    ghostEvery: 0.035,  // dash ghost trail spacing (s)
  },

  // Playable character roster (11.6, D28/D34/D56–D62). Data-driven (D60): adding a
  // character = one entry here + one frame builder in art/heroes.js (Phase 27 sheets).
  // `hp`/`speed` are absolute bases (replace CFG.player when selected), `dmg` = weapon-
  // damage multiplier, `weapon` = pre-owned starting weapon (null = none → ghost gets 2
  // offers, D59), `cost` = Soulshard unlock price (D58; 0 = default/starter), `accent` =
  // UI theming color (11.8; ghost = null → per-seat Pac-Man tint, D62 channel).
  // STAT VALUES (O) user-approved 2026-08-22 (revisions: mage 60hp/275sp, ranger 110hp/320sp, warden 230sp).
  characters: {
    order: ['mage', 'warden', 'ranger', 'swash', 'baseball', 'werewolf', 'golem', 'toad', 'gunslinger'],
    mage:    { name: 'Mage',         weapon: 'wand',   cost: 0,    hp: 60,  dmg: 1.35, speed: 275, accent: '#9fe8ff', desc: 'Glass cannon — +35% weapon damage, low max HP. Starts with the Moonbolt Wand.' },
    warden:  { name: 'Warden',       weapon: 'garlic', cost: 3500, hp: 150, dmg: 0.85, speed: 230, accent: '#ffb454', desc: 'Tanky, slowest move speed, lower-medium damage. Starts with the Wraith Garlic aura.' },
    ranger:  { name: 'Ranger',       weapon: 'bow',    cost: 1500, hp: 110, dmg: 1.0,  speed: 320, accent: '#a4ffc9', desc: 'Fast and balanced. Starts with the Bow & Arrow.' },
    swash:   { name: 'Swashbuckler', weapon: 'bombs', cost: 7500, hp: 90,  dmg: 1.15, speed: 300, accent: '#e8b45a', desc: 'Agile, upper-medium damage. Starts with Sunder Bombs. (D94 re-tool.)' },
    baseball: { name: 'Baseball Player', weapon: 'bat', cost: 5000, hp: 120, dmg: 1.1, speed: 285, accent: '#f06543', desc: 'Bruiser — massive knockback control. Starts with the Baseball Bat.' },
    werewolf: { name: 'Werewolf',    weapon: 'wolfpack', cost: 7500, hp: 110, dmg: 1.05, speed: 305, accent: '#c084fc', desc: 'Fast striker with an autonomous pack-hunter. Starts bonded to a Wolfpack.' },
    golem:   { name: 'Stone Golem',  weapon: 'boulder', cost: 10000, hp: 190, dmg: 0.9, speed: 195, accent: '#9aa7b8', desc: 'Slowest juggernaut — crushes small fries outright. Starts with the Rolling Boulder.' },
    toad:    { name: 'Giant Toad',   weapon: 'tongue', cost: 12500, hp: 140, dmg: 0.95, speed: 240, accent: '#7ed957', desc: 'Sustain tank — hauls foes in and eats them to heal. Starts with the Frog Tongue.' },
    gunslinger: { name: 'Wild West Gunslinger', weapon: 'pistols', cost: 15000, hp: 85, dmg: 1.2, speed: 295, accent: '#d9a066', desc: 'Deadliest duo — high damage, thinnest skin. Starts with the Twin Fangs. (D94.)' },
    ghost:   { name: 'Ghost',        weapon: null,     cost: 0,    hp: 100, dmg: 1.0,  speed: 265, accent: null, desc: 'Faceless fallback — baseline stats, no starting weapon.' },
  },

  // Ghost per-player tints (D62): seat 0→3, Pac-Man ghost colors (Blinky/Pinky/Inky/Clyde).
  ghostColors: ['#ff4b4b', '#ff7bd9', '#4be3ff', '#ffa24b'],

  // Camera follow/lead/decay + the four shake intensities the run fires (bomb,
  // boss kill, player hurt, death) — rule 5: these were magic numbers in game.js.
  camera: {
    follow: 9, lead: 0.14, shakeDecay: 3.4, shakeAmp: 16, // shakeAmp = px offset at full shake
    shake: { bomb: 0.6, bossKill: 0.8, hurt: 0.45, death: 1 },
  },

  // Main-loop guardrails (core/loop.js): the wall-clock gap clamp (tab switch,
  // debugger) and the per-rAF fixed-step backlog cap. The 1/60 step itself is an
  // architecture invariant (AGENTS frame pipeline), so it stays in the Loop.
  loop: { maxFrameDt: 0.1, maxSteps: 5 },

  // View zoom (13.8): camera-view factor — 0.80 = zoomed out (×1.56 area) / 1.0 = full view.
  // Touch default 0.80 (D13), persisted per-browser; HUD DOM + minimap always stay 1×.
  zoom: { touch: 0.8, full: 1.0, key: 'qsurv.zoom.v1' },
  // Per-category volumes (31.5, user spec): the settings sliders, 0..1 multipliers applied
  // on top of the internal mix in CFG.audio (sfxVol/musicVol/ambVol stay the tuning base).
  // Defaults 1/1/1; persisted at key. Master mute is separate (scores.muteKey) — unchanged.
  volumes: { key: 'qsurv.volumes.v1', effects: 1, music: 1, background: 1 },
  ui: { bannerMs: 2600 }, // banner hold before the next queued banner shows (CSS bannerIn 2.6 s)

  menu: {
    // (menu backdrop seed moved to the level def: levels.js menuSeed, Phase 13)
    amp: 0.2,            // camera drift amplitude (× world size)
    speed: 0.1,          // camera drift angular speed (rad/s)
  },

  lighting: {
    base: '8,10,24', baseAlpha: 0.86, glowAlpha: 0.30,
    playerR: 510, playerRgb: '205,220,255', playerFlicker: 0.15,
    bossR: 240, bossRgb: '168,96,255', bossFlicker: 0.5,
  },

  weapons: {
    wand: {
      name: 'Moonbolt Wand',
      desc: 'Auto-fires spectral bolts at the nearest enemy.',
      icon: 'wand',
      levels: [
        { rate: 0.64, dmg: 12, count: 1, pierce: 0 },
        { rate: 0.54, dmg: 16, count: 1, pierce: 1 },
        { rate: 0.49, dmg: 20, count: 2, pierce: 1 },
        { rate: 0.42, dmg: 26, count: 2, pierce: 2 },
        { rate: 0.36, dmg: 34, count: 3, pierce: 2 },
      ],
    },
    garlic: {
      name: 'Wraith Garlic',
      desc: 'A pulsing aura that seeps into nearby foes.',
      icon: 'garlic',
      levels: [
        { r: 85, dmg: 7 }, { r: 100, dmg: 10 }, { r: 118, dmg: 14 }, { r: 138, dmg: 18 }, { r: 160, dmg: 24 },
      ],
    },
    axe: {
      name: 'Spectral Axe',
      desc: 'Hurls a boomerang that arcs out and back.',
      icon: 'axe',
      levels: [
        { cd: 1.40, dmg: 16, count: 1, size: 1.0 },
        { cd: 1.25, dmg: 22, count: 1, size: 1.1 },
        { cd: 1.10, dmg: 28, count: 1, size: 1.25 },
        { cd: 0.95, dmg: 36, count: 2, size: 1.3 },
        { cd: 0.80, dmg: 46, count: 2, size: 1.45 },
      ],
    },
    blades: {
      name: 'Aegis Blades',
      desc: 'Ghost blades orbit you, shearing attackers.',
      icon: 'blades',
      levels: [
        { n: 1, dmg: 10, rad: 64 }, { n: 2, dmg: 14, rad: 70 }, { n: 3, dmg: 18, rad: 76 },
        { n: 3, dmg: 24, rad: 82 }, { n: 4, dmg: 32, rad: 88 },
      ],
    },
    pistols: {
      name: 'Twin Fangs',
      desc: 'Twin pistols — each shot sends two rounds at the nearest foes.',
      icon: 'pistols',
      levels: [
        { rate: 0.55, dmg: 9, spread: 0.10 },
        { rate: 0.48, dmg: 11, spread: 0.10 },
        { rate: 0.42, dmg: 13, spread: 0.08 },
        { rate: 0.36, dmg: 15, spread: 0.08 },
        { rate: 0.30, dmg: 18, spread: 0.06 },
      ],
    },
    bombs: {
      name: 'Sunder Bombs',
      desc: 'Lob cartoon bombs that land, pause, then boom in an AOE.',
      icon: 'bombs',
      // 23.2 rework (user): blast radius ×1.5, base damage ×2 (scaling shape kept).
      levels: [
        { cd: 2.2, dmg: 80, r: 142, fuse: 1.1 },
        { cd: 2.0, dmg: 104, r: 157, fuse: 0.95 },
        { cd: 1.8, dmg: 132, r: 172, fuse: 0.8 },
        { cd: 1.6, dmg: 164, r: 192, fuse: 0.65 },
        { cd: 1.4, dmg: 200, r: 210, fuse: 0.5 },
      ],
    },
    flame: {
      name: 'Pyre Lance',
      desc: 'A streaming geyser of flame that ignites foes. Limited fuel, slow refill.',
      icon: 'flame',
      // range = aim/acquisition radius. Flat 150 at every level (2026-09-04): the
      // visible stream reaches ~85–200 px (mean ~136 incl. sprite extent), so the old
      // 300–380 ramp damaged enemies in an invisible gap far past the flame's end.
      // Level growth stays in tick/dot/fuel/recharge — never in range again.
      levels: [
        { tick: 6, dot: 4, dotDur: 2.5, range: 150, fuel: 4.0, recharge: 7.0 },
        { tick: 8, dot: 5, dotDur: 2.8, range: 150, fuel: 5.0, recharge: 6.5 },
        { tick: 10, dot: 6, dotDur: 3.0, range: 150, fuel: 6.0, recharge: 6.0 },
        { tick: 13, dot: 8, dotDur: 3.3, range: 150, fuel: 7.0, recharge: 5.5 },
        { tick: 16, dot: 10, dotDur: 3.6, range: 150, fuel: 8.0, recharge: 5.0 },
      ],
    },
    // 12.3 Snowball Launcher (weapon #9). Lobbed snowball → small impact AoE on the
    // targeted enemy + accumulating slow stacks; SLOW_FREEZE stacks → brief freeze.
    // `cd` = fire interval; `speed`/arc feed the lob flight (see combat.fireSnowball).
    snowball: {
      name: 'Snowball Launcher',
      desc: 'Lobs a packed snowball that bursts in a small blast, slowing foes. 3 slows → freeze.',
      icon: 'snowball',
      levels: [
        { cd: 1.60, dmg: 26, r: 95 },
        { cd: 1.45, dmg: 34, r: 102 },
        { cd: 1.30, dmg: 44, r: 110 },
        { cd: 1.15, dmg: 56, r: 118 },
        { cd: 1.00, dmg: 70, r: 128 },
      ],
    },
    ringLightning: {
      name: 'Ring of Chain Lightning',
      desc: 'A jeweled ring arcs lightning at nearby foes. 3 shocks → stun + chain burst.',
      icon: 'ringLightning',
      // `jumps` = enemies the chain burst leaps to when shock stacks hit max
      // (12.4: weapon levels increase the chain count).
      levels: [
        { dmg: 30, jumps: 2 },
        { dmg: 38, jumps: 3 },
        { dmg: 50, jumps: 4 },
        { dmg: 64, jumps: 5 },
        { dmg: 82, jumps: 6 },
      ],
    },
    bow: {
      name: 'Bow & Arrow',
      desc: 'Looses a fast arrow at the nearest foe.',
      icon: 'bow',
      // 23.1 (user): charge = the drawn-string wind-up before the arrow looses (s, flat
      // at every level). Cadence raised so bow > wand > pistols at EVERY level — the old
      // rate table was numerically identical to Twin Fangs (the "doesn't feel unique" bug).
      charge: 0.25,
      levels: [
        { rate: 0.68, dmg: 16 },
        { rate: 0.60, dmg: 21 },
        { rate: 0.53, dmg: 27 },
        { rate: 0.46, dmg: 34 },
        { rate: 0.39, dmg: 42 },
      ],
    },
    // ---- Phase 21 (D96) — nine new weapons; stat tables verbatim from
    // docs/phase21-resolutions-2026-10-20.md §B (user-approved 2026-10-20) ----
    // 31.4 (user notes 2026-10-26, lines 85-90): the weapon was renamed and reworked
    // into the "Homing Missile". KEY → DISPLAY: `cannon` = "Homing Missile" — this is
    // the single mapping; the key itself (and the combat `shell*` knobs, `cannonRange`,
    // the `cannon` icon key, the `shell` sprite key, fireShell/shells/`heShell`) stay
    // STABLE: renaming ids would ripple through synergy `requires`, saved runs, and the
    // WEAPON_FIELDS/WEAPON_STATS/battery tables for zero behavioral clarity.
    cannon: {
      name: 'Homing Missile',
      // 31.4: card text states the real behaviour (lock → home → detonate); the honest
      // range/cadence/damage lines are generated from CFG by WEAPON_STATS. Supersedes the
      // 29.12 punch-through wording — the user retired that mechanic.
      desc: 'Fires a slow missile that locks onto the toughest foe in range, homes in, and explodes on contact.',
      icon: 'cannon',
      levels: [
        // 31.4 (user): blast area +25% → blastR ×1.25 per level (task ruling: multiply
        // the radius). cd/dmg structure UNCHANGED (Phase 23 law: change only what the
        // user names). Old rows for the diff: 70/76/82/88/95.
        { cd: 2.6, dmg: 90, blastR: 87.5 },
        { cd: 2.4, dmg: 115, blastR: 95 },
        { cd: 2.2, dmg: 145, blastR: 102.5 },
        { cd: 2.0, dmg: 180, blastR: 110 },
        { cd: 1.8, dmg: 225, blastR: 118.75 },
      ],
    },
    laser: {
      name: 'Continuous Laser',
      desc: 'A sustained beam that sears every foe it sweeps. Long cooldown.',
      icon: 'laser',
      // 29.7 (D99, user-confirmed 2026-10-22): the beam ORBITS, anchored at the
      // owner. rot = angular velocity (rad/s); the orbit angle lives on the player
      // (Player._laserAng) and advances EVERY tick, active window or not — a
      // reactivation fires at whatever angle the orbit has reached. cd = downtime
      // between active windows; every level-up raises rot and lowers cd (spec).
      // count = simultaneous beams, equidistant (L3: 2 at 180°, L5: 3 at 120°),
      // sharing the orbit angle, angular velocity, dur and cd exactly.
      levels: [
        { cd: 5.0, dur: 1.2, dps: 34, len: 240, w: 12, rot: 1.0, count: 1 },
        { cd: 4.6, dur: 1.3, dps: 42, len: 250, w: 12, rot: 1.15, count: 1 },
        { cd: 4.2, dur: 1.4, dps: 52, len: 260, w: 14, rot: 1.3, count: 2 },
        { cd: 3.8, dur: 1.5, dps: 64, len: 270, w: 14, rot: 1.45, count: 2 },
        { cd: 3.4, dur: 1.6, dps: 78, len: 285, w: 16, rot: 1.6, count: 3 },
      ],
    },
    wolfpack: {
      name: 'Wolfpack',
      desc: 'Wolves bonded to you hound foes near you and bleed them. The pack never dies.',
      icon: 'wolf', // 29.9 art half shipped: three-pack card icon + per-wolf coats live in js/art (icons.wolf, PACK_PALS)
      // 29.9 (user law 2026-10-22): level rules alternate stat-up / spawn-only.
      // L2 = stat-up; L3 = spawn a 2nd wolf at the CURRENT stats (rows identical —
      // no stat-up); L4 = stat-up that applies to ALL wolves (the pack reads the
      // current row at bite time — wolves never snapshot stats); L5 = spawn a 3rd
      // wolf, no stat-up. count = live wolves; targeting keeps the existing
      // pounce pick (combat._nearestTo), NOT the spatial grid (user directive).
      levels: [
        { dmg: 30, bleed: 8, bleedDur: 3.0, count: 1 },
        { dmg: 38, bleed: 10, bleedDur: 3.0, count: 1 },
        { dmg: 38, bleed: 10, bleedDur: 3.0, count: 2 },
        { dmg: 60, bleed: 16, bleedDur: 3.2, count: 2 },
        { dmg: 60, bleed: 16, bleedDur: 3.2, count: 3 },
      ],
    },
    boulder: {
      name: 'Rolling Boulder',
      desc: 'Sends a boulder rolling in a cardinal line, crushing small fries. One at a time.',
      icon: 'boulder',
      // 29.6 (user playtest 2026-10-22): "fires too infrequently" — initial cd 4.0 s,
      // −0.3 s per level-up (L1=4.0 … L5=2.8). The fire-site picks this row by level,
      // so the curve lives entirely in the table.
      levels: [
        { cd: 4.0, dmg: 70 },
        { cd: 3.7, dmg: 90 },
        { cd: 3.4, dmg: 110 },
        { cd: 3.1, dmg: 130 },
        { cd: 2.8, dmg: 155 },
      ],
    },
    webs: {
      name: 'Web-slingers',
      desc: 'Webs burst on impact, pinning everything nearby in place.',
      icon: 'webs',
      levels: [
        { cd: 1.6, dmg: 18, r: 90, hold: 0.7 },
        { cd: 1.5, dmg: 24, r: 96, hold: 0.8 },
        { cd: 1.4, dmg: 31, r: 102, hold: 0.9 },
        { cd: 1.3, dmg: 39, r: 110, hold: 1.0 },
        { cd: 1.2, dmg: 48, r: 118, hold: 1.2 },
      ],
    },
    gatling: {
      name: 'Gatling Gun',
      desc: '40-round buzzsaw bursts — pea-shooter damage, then a 3 s reload.',
      icon: 'gatling',
      burst: 40, reload: 3.0, // spec-fixed (Phase 21 verbatim): growth stays in the table
      // 31.8 (user directive 2026-10-23): per-round base dmg −25% at every level
      // (exact ×0.75 kept — the honest card line is generated from these numbers).
      levels: [
        { cd: 0.075, dmg: 3, spread: 0.16 },
        { cd: 0.075, dmg: 3.75, spread: 0.14 },
        { cd: 0.070, dmg: 4.5, spread: 0.12 },
        { cd: 0.065, dmg: 5.25, spread: 0.11 },
        { cd: 0.060, dmg: 6.75, spread: 0.10 },
      ],
    },
    bat: {
      name: 'Baseball Bat',
      desc: 'Frantic short swings with huge knockback. 1-in-500 HOMERUN (one-hit KO).',
      icon: 'bat',
      homerun: 500, // spec-fixed odds (non-boss only) — homerKing synergy upgrades them
      levels: [
        { cd: 0.34, dmg: 26, kb: 3.0, arc: 100 },
        { cd: 0.30, dmg: 31, kb: 3.0, arc: 100 },
        { cd: 0.27, dmg: 36, kb: 3.5, arc: 105 },
        { cd: 0.24, dmg: 41, kb: 3.5, arc: 105 },
        { cd: 0.22, dmg: 48, kb: 4.0, arc: 110 },
      ],
    },
    tongue: {
      name: 'Frog Tongue',
      desc: 'Latches on, drags foes in, and poisons them. Foes killed by the lash are eaten.',
      icon: 'tongue',
      levels: [
        { cd: 2.2, dmg: 34, poison: 4, poisonDur: 3.0 },
        { cd: 2.05, dmg: 44, poison: 5, poisonDur: 3.0 },
        { cd: 1.9, dmg: 56, poison: 6, poisonDur: 3.2 },
        { cd: 1.75, dmg: 70, poison: 8, poisonDur: 3.4 },
        { cd: 1.6, dmg: 86, poison: 10, poisonDur: 3.5 },
      ],
    },
    ball: {
      name: 'Cannonball',
      desc: 'Tuck into a ball and rocket into foes — ricochets, invulnerable, 10 s cooldown.',
      icon: 'ball',
      cd: 10.0, // spec-fixed at every level; growth = +1 bounce/level (hits 2→6)
      levels: [
        { dmg: 60, hits: 2 },
        { dmg: 72, hits: 3 },
        { dmg: 85, hits: 4 },
        { dmg: 97, hits: 5 },
        { dmg: 110, hits: 6 },
      ],
    },
  },

  // Weapon/passive synergies: a single-level card offered only when every
  // `requires` entry is at max (weapon: levels.length, passive: max).
  // Stored in player.synergies (does NOT count toward maxWeapons).
  synergies: {
    blight: {
      name: 'Blight Hex',
      desc: 'Moonbolts seep into foes, dealing blight damage over time.',
      icon: 'blight', requires: ['wand', 'garlic'],
      levels: [{ dps: 14, dur: 3.0 }],
    },
    tempest: {
      name: 'Tempest Blades',
      desc: 'Orbiting blades now hurl tangential bolts at the swarm.',
      icon: 'tempest', requires: ['axe', 'blades'],
      levels: [{ rate: 0.8, dmg: 12 }],
    },
    inferno: {
      name: 'Inferno Rounds',
      desc: 'Twin rounds now ignite foes, dealing burn damage over time.',
      icon: 'inferno', requires: ['pistols', 'flame'],
      levels: [{ dps: 12, dur: 2.5 }],
    },
    napalm: {
      name: 'Napalm Detonation',
      desc: 'Bomb blasts now ignite every foe caught in the radius.',
      icon: 'napalm', requires: ['bombs', 'flame'],
      levels: [{ dps: 18, dur: 3.0 }],
    },
    // 23.3 (user DECIDED): the old kill-heal effect is REPLACED in place by over-heal.
    // ceiling = fraction of CURRENT max HP the over-health bar may reach; decay = how
    // fast the bonus shrinks back to 100% (fraction of max HP per second).
    phoenix: {
      name: 'Phoenix Heart',
      desc: 'Hearts at full health grant over-health up to 200% max — decays 1%/s.',
      icon: 'phoenix', requires: ['hp', 'regen'],
      levels: [{ ceiling: 2, decay: 0.01 }],
    },
    // 12.6: the four spec'd synergies + Heart of Oak × Lodestone (user scoped in 2026-09-05).
    // All five are 5-level cards (PLAN Phase 12 rule) — offered when their OWN two sources max.
    flamingArrows: {
      name: 'Flaming Arrows',
      desc: 'Arrows leave the string alight, burning every foe they strike.',
      icon: 'flamingArrows', requires: ['bow', 'flame'],
      levels: [
        { dps: 8, dur: 2.0 }, { dps: 11, dur: 2.2 }, { dps: 14, dur: 2.5 },
        { dps: 18, dur: 2.8 }, { dps: 22, dur: 3.0 },
      ],
    },
    heartPiercer: {
      name: 'Heart-Piercer',
      desc: 'Channel your vitality into the bow — heavier arrows that skewer onward foes.',
      icon: 'heartPiercer', requires: ['bow', 'hp'],
      // bonus = flat extra damage per arrow; pierce = EXTRA enemies an arrow passes through
      levels: [
        { bonus: 10, pierce: 1 }, { bonus: 14, pierce: 2 }, { bonus: 18, pierce: 3 },
        { bonus: 22, pierce: 4 }, { bonus: 26, pierce: 5 },
      ],
    },
    blueFlame: {
      name: 'Blue Flame',
      desc: 'Snowball bursts flash-freeze foes while blue fire eats at them.',
      icon: 'blueFlame', requires: ['snowball', 'flame'],
      // freeze = seconds frozen in place; dps/dur = the simultaneous fire DoT (12.5 blue-flame half)
      levels: [
        // L5 freeze matches combat.freezeDur (0.8) — a card promising "freeze in place"
        // must actually lock the foe, not merely refresh under the slow-proc cap.
        { freeze: 0.3, dps: 8, dur: 2.0 }, { freeze: 0.4, dps: 11, dur: 2.2 },
        { freeze: 0.5, dps: 14, dur: 2.5 }, { freeze: 0.6, dps: 18, dur: 2.8 },
        { freeze: 0.8, dps: 22, dur: 3.0 },
      ],
    },
    stormVolley: {
      name: 'Storm Volley',
      desc: 'Every fourth round calls a lightning strike that arcs to nearby foes.',
      icon: 'stormVolley', requires: ['pistols', 'ringLightning'],
      // every = rounds per strike; jumps = chain links (also grants 1 shock stack each)
      levels: [
        { dmg: 45, jumps: 2 }, { dmg: 60, jumps: 3 }, { dmg: 75, jumps: 4 },
        { dmg: 90, jumps: 5 }, { dmg: 110, jumps: 6 },
      ],
    },
    heartMagnet: {
      name: 'Heart Compass',
      desc: 'Hearts feel the Lodestone — healing hearts are pulled to you.',
      icon: 'heartMagnet', requires: ['hp', 'magnet'],
      // pull = radius multiplier on the gem magnet range for HEARTS
      levels: [
        { pull: 1.0 }, { pull: 1.25 }, { pull: 1.5 }, { pull: 1.75 }, { pull: 2.0 },
      ],
    },
    // ---- Phase 21 (D96) — five new synergies (doc §E, user-approved) ----
    heShell: {
      // 31.4: only the REFERENCED WEAPON NAME in copy is updated ("Tank Cannon" no
      // longer exists); the ignite-on-blast mechanic is untouched (user did not name it).
      // The synergy's name/key ("Shells of Perdition" / `heShell`) awaits the user's
      // ruling — flagged 31.4, not decided here.
      name: 'Shells of Perdition',
      desc: 'Homing Missile explosions now set every caught foe alight.',
      icon: 'heShell', requires: ['cannon', 'flame'],
      levels: [
        { dps: 12, dur: 2.5 }, { dps: 16, dur: 2.75 }, { dps: 20, dur: 3.0 },
        { dps: 25, dur: 3.25 }, { dps: 30, dur: 3.5 },
      ],
    },
    staticPelt: {
      name: 'Static Pelt',
      desc: 'The pack\u2019s pounces shock their quarry and call a chain burst.',
      icon: 'staticPelt', requires: ['wolfpack', 'ringLightning'],
      levels: [
        { jumps: 2 }, { jumps: 3 }, { jumps: 4 }, { jumps: 5 }, { jumps: 6 },
      ],
    },
    homerKing: {
      name: 'Homerun King',
      desc: 'Swing for the fences — the 1-in-500 HOMERUN gets far luckier.',
      icon: 'homerKing', requires: ['bat', 'bow'],
      // odds = the HOMERUN is 1-in-`odds` (500 base)
      levels: [
        { odds: 250 }, { odds: 150 }, { odds: 100 }, { odds: 75 }, { odds: 50 },
      ],
    },
    gutFeast: {
      name: 'Gut Feast',
      desc: 'A heartier appetite — eaten foes restore far more HP.',
      icon: 'gutFeast', requires: ['tongue', 'hp'],
      levels: [
        { mul: 1.25 }, { mul: 1.5 }, { mul: 1.75 }, { mul: 2.0 }, { mul: 2.5 },
      ],
    },
    avalanche: {
      name: 'Avalanche',
      desc: 'The boulder plows slow-deepening drifts and hits harder.',
      icon: 'avalanche', requires: ['boulder', 'snowball'],
      // stacks = slow stacks per hit; bonus = extra flat damage per hit
      levels: [
        { stacks: 1, bonus: 0 }, { stacks: 1, bonus: 8 }, { stacks: 1, bonus: 16 },
        { stacks: 2, bonus: 16 }, { stacks: 2, bonus: 30 },
      ],
    },
  },

  passives: {
    speed:  { name: 'Celerity Boots', desc: '+10% movement speed', icon: 'boots', max: 3, val: 0.10 },
    hp:     { name: 'Heart of Oak',   desc: '+25 max HP, heal 25 now', icon: 'heart', max: 3, val: 25 },
    dmg:    { name: 'Rune of Might',  desc: '+12% weapon damage', icon: 'sword', max: 5, val: 0.12 },
    magnet: { name: 'Lodestone',      desc: '+60% pickup range', icon: 'magnet', max: 3, val: 0.60 },
    regen:  { name: 'Moon Sigil',     desc: 'Regenerate 0.8 HP/s', icon: 'sigil', max: 3, val: 0.8 },
    // 29.14 Coffee: fire-rate passive. Scheme = the existing scalar-`val` passives
    // (speed/dmg style): one ADDITIVE increment per level, folded in recomputeStats
    // into a single multiplier cdMul = 1 − val × levels that _weapons applies when
    // arming EVERY weapon cooldown (cd/rate + gatling reload + flame recharge). All
    // equipped weapons share the one multiplier; max 5 levels → cdMul floor 0.40
    // (−60% cooldowns at max). Not offered twice in co-op: the pool/lock machinery
    // is key-driven (D91), so registration through CFG.passives is all it takes.
    // icon: 29.14 art half shipped — the dedicated mug slot (icons.coffee, plain
    // white mug with steaming brown coffee) replaced the borrowed 'sigil' reference.
    coffee: { name: 'Coffee', desc: '−12% weapon cooldowns', icon: 'coffee', max: 5, val: 0.12 },
    // Phase 21 "run-equipable items" (D95): passive-pool entries with per-level `levels`
    // tables (behavior lookups in combat/player), not scalar `val` increments.
    shield: {
      name: 'Mirror Shield',
      desc: 'Ricochets enemy projectiles — 3 every 5 s, radius grows, window shortens.',
      icon: 'shield', max: 5,
      levels: [
        { r: 130, window: 5.0 }, { r: 145, window: 4.5 }, { r: 160, window: 4.0 },
        { r: 175, window: 3.5 }, { r: 190, window: 3.0 },
      ],
    },
    skates: {
      name: 'Ice Skates',
      desc: 'Slippery glide + speed; sliding into foes hurts both of you.',
      icon: 'skates', max: 5,
      // spd = extra move-speed fraction; glideK = deceleration multiplier on release;
      // slideDmg = per-impact damage to BOTH (0.5 s re-hit lock per foe; cap 6 at max)
      // 29.13 (2026-10-22): glideK roughly halved at every level — the user wants a
      // clearly slipperier feel and a much longer glide after input stops (L1 slide
      // time at 400 px/s ≈ 0.5 s → ≈ 0.93 s). No new mechanics.
      levels: [
        { spd: 0.05, glideK: 0.20, slideDmg: 2 }, { spd: 0.075, glideK: 0.17, slideDmg: 3 },
        { spd: 0.10, glideK: 0.14, slideDmg: 4 }, { spd: 0.125, glideK: 0.11, slideDmg: 5 },
        { spd: 0.15, glideK: 0.08, slideDmg: 6 },
      ],
    },
  },

  // Level-up offer draw (Phase 15 rework, D81). UNIFORM sample-without-replacement over
  // the legal card pool: every card has equal odds, no category weighted (user directive
  // 2026-09-05). Odds depend only on total pool size, so they stay equal as the roster
  // expands (Phase 21).
  //   slots = cards shown per level-up (3)
  offer: {
    slots: 3,
  },

  gems: { magnetBase: 70, collectR: 16, maxAlive: 320, heartPool: 32, heartChance: 0.045, heartChanceLowHp: 0.08, heartHeal: 20, lowHpFrac: 0.3, escapePad: 6 }, // escapePad (22.2): px beyond a spot's edge

  // XP needed to go from level L to L+1
  xpNeed: (L) => 4 + (L - 1) * 3,

  enemies: {
    rat:     { hp: 20,   speed: [110, 150], dmg: 8,  xp: 1,  r: 11, score: 10, fps: 4 },
    bat:     { hp: 14,   speed: [150, 185], dmg: 6,  xp: 1,  r: 11, score: 10, fly: true, weave: true, fps: 8 },
    goblin:  { hp: 42,   speed: [85, 105],  dmg: 12, xp: 2,  r: 13, score: 20, fps: 6 },
    wolf:    { hp: 65,   speed: [175, 205], dmg: 15, xp: 3,  r: 14, score: 30, fps: 8 },
    brute:   { hp: 280,  speed: [62, 78],   dmg: 25, xp: 5,  r: 22, score: 60, fps: 3 },
    cultist: { hp: 55,   speed: [75, 95],   dmg: 10, xp: 3,  r: 13, score: 30, ranged: true, fps: 4 },
    // 31.7 (user directive 2026-10-23): all stage bosses' base max HP +30% (2400 → 3120).
    wraith:  { hp: 3120, speed: [55, 65],   dmg: 28, xp: 50, r: 30, score: 5000, boss: true, fps: 4 },
    ryu:     { hp: 3120, speed: [55, 65],   dmg: 28, xp: 50, r: 30, score: 5000, boss: true, fps: 4 },
    shark:   { hp: 3120, speed: [55, 65],   dmg: 28, xp: 50, r: 30, score: 5000, boss: true, fps: 4 },
  },

  ai: {
    gridCell: 96,       // enemy spatial hash cell (px)
    steer: 7,           // chase velocity convergence lambda
    sepPad: 6,          // extra separation clearance (px)
    sepPush: 420,       // separation acceleration
    weaveAmp: 34,       // bat perpendicular weave (px/s)
    weaveFreq: 3.4,
    cultistRange: [230, 330],
    cultistShotCd: [1.6, 2.6],
    orbSpeed: 250,
    wraithWindup: 0.7,
    wraithCharge: 0.75,
    wraithChargeSpeed: 330,
    wraithChargeCd: [5.5, 8.5],
  },

  combat: {
    boltSpeed: 540, boltLife: 1.5, boltR: 5, boltKb: 170,
    wandRange: 560, wandSpread: 0.16,
    axeSpeed: 430, axeLife: 1.9, axeR: 10, axeKb: 130, axeTick: 0.30, axeTurnFrac: 0.45, // turn-back when life drops to this fraction (combat._axes; card range derives from 1−it)
    orbitSpeed: 2.4, orbitR: 9, orbitTick: 0.35, orbitKb: 190, orbitSize: 26,
    garlicTick: 0.45,
    spawnOriginFrac: 0.55, // 16.2: shared projectile spawn origin — fraction of the character sprite height above the feet (mid-torso); 1 = feet (legacy), 0 = head
    orbLife: 4.5, orbR: 7,
    hitStopKill: 0.05, hitStopBoss: 0.18, hitStopHurt: 0.07,
    // Twin Fangs rounds (small, fast, short-lived — distinct from the cyan bolt)
    bulletSpeed: 720, bulletLife: 0.8, bulletR: 4, bulletKb: 120, pistolRange: 520,
    // Sunder Bombs (lob arc + fuse pause before AOE)
    // bombKb 260→520 (23.2): "very strong push-back" — magnitude only; direction stays
    // radial from the blast centre (_explode dx/d, dy/d — unchanged).
    bombDist: 240, bombMin: 120, bombFly: 0.55, bombH: 70, bombKb: 520, bombFlash: 0.4,
    // Bow & Arrow (12.2): fast single-target arrow at the nearest foe — straight
    // flight, one hit (no pierce; Heart-Piercer 12.6 adds that), mid-torso origin (16.2)
    arrowSpeed: 640, arrowLife: 1.4, arrowR: 4, arrowKb: 150,
    // Snowball Launcher (12.3): lobbed snowball — arcs to the targeted enemy, bursts in a
    // small impact AoE there, applies slow stacks. Bomb-style flight (fly time + parabola),
    // NO fuse pause: it bursts ON impact.
    snowballSpeed: 460, snowballFlyK: 1 / 460, snowballH: 56, snowballR: 9, snowballKb: 90,
    // Status pipeline (12.5): slow/shock stacks with independent per-stack 5 s expiry
    // (config scalar — expected playtest tuning). slowPct = movement speed reduction per
    // stack (multiplicative: speed × (1 − slowPct·stacks)); SLOW_FREEZE stacks → freezeDur
    // movement lock. Shock/stun fields land with 12.4.
    statusStackTtl: 5,
    slowPct: 0.16, slowMaxStacks: 3, freezeDur: 0.8,
    // Shock → stun (12.4): the ring's bolts apply shock stacks; shockMaxStacks → stunDur
    // full lock + a branching chain burst (jumps from the weapon level) to nearby foes.
    shockMaxStacks: 3, stunDur: 0.6,
    // Ring of Chain Lightning (12.4): periodic bolt at the nearest foe + one shock stack;
    // on proc the burst chains to `jumps` fresh foes within jumpR of the last hit.
    ringCd: 0.9, ringDmg: 18, ringJumpR: 260, ringKb: 40, ringBeamDur: 0.16,
    // Pyre Lance flame sprites (flow-y drag/rise + wobble, grow-then-fade)
    // 16.3: front speed exactly 2x the pre-16.3 build (260/80) + lifetime trimmed
    // 0.65 -> 0.33 => mean stream reach exactly +33% (94.6 -> 125.8 px, drag
    // unchanged) and the jet extends toward the target 2x faster. flameMomentum =
    // the share of the owner's velocity the flame inherits (LEAD-while-moving —
    // the player's own momentum, D70 user hypothesis; 0 = trail behind).
    flameSpeed: 520, flameSpeedVar: 160, flameLife: 0.33, flameLifeVar: 0.075,
    flameSize: 18, flameR: 12, flameDrag: 2.0, flameRise: 140, flameMomentum: 0.5,
    flameWobAmp: 14, flameWobFreq: 9, flameHit: 0.22,

    // Phase 21 (D96) — new-weapon mechanics knobs (per-level damage lives in CFG.weapons)
    // 29.12 (2026-10-22): cannonRange = dedicated acquisition + re-lock range, 1.5× the
    // old shared wandRange (560 → 840). 31.4: it now gates ONLY the lock-on search
    // (the missile itself is bounded by the fuse below, not by range).
    // 31.4 (user, "~30% slower"): shellSpeed 460 ×0.7 = 322 EXACT (460×0.7, single
    // source). missileFuse = hard 10 s per-missile auto-detonate (notes line 89: an
    // expired fuse detonates in place as if it had hit an enemy; a re-lock NEVER resets
    // it). Keys `shell*` belong to the Homing Missile (see the weapons.cannon mapping).
    shellSpeed: 322, shellR: 11, shellBlastK: 0.5, cannonRange: 840, missileFuse: 10,
    // 30.2: Continuous Laser contact feedback (scorch sparks). The beam's damage is per-frame
    // dpsTick (D21: deliberately no hit-flash, no knockback), so a sweeping beam reads as
    // "nothing happening" — sparks at the contact point make the sear legible. scorchTick =
    // minimum interval per foe (the same per-foe cd-Map idiom as orbitTick/flameHit);
    // scorchLife/scorchSize = the blit's fade window and on-screen size. Rate + dps unchanged.
    // (29.5-era `laserSpeed`/`laserTick` keys deleted: the orbit is CFG.weapons.laser.rot and
    // the damage is per-frame, so both were unread by any code — grep-proven 2026-10-22.)
    scorchTick: 0.1, scorchLife: 0.22, scorchSize: 16,
    companionLeash: 192, companionPounceCd: 2.0, companionSpeed: 380, // Wolfpack (pounce cd spec-fixed)
    boulderSpeed: 300, boulderR: 34, boulderDecay: 0.75, boulderMaxHits: 6, boulderSquishR: 12,
    webSpeed: 430, webR: 9,                                  // Web-slingers
    batRange: 62, batKbImpulse: 520, homerunFx: 1.2,         // Baseball Bat (HOMERUN fx = fx lifetime s)
    tongueRange: 660, tongueSpeed: 760, tonguePullDur: 0.4, tongueHealK: 0.06, tongueHealCap: 15,
    ballSpeed: 620, ballDecay: 0.9, ballMaxHits: 6, ballSearchR: 260, // Cannonball (player ball-state)
    // 31.2 (user spec 2026-10-26): next-bounce input steering — full cone angle in degrees
    // around the last held movement direction (0 = steering off); ballLosStep = sample spacing
    // of the straight-line reachability test that stops the ball pinning on a collider and
    // "bouncing into nothing" for the rest of its arc (31.2 defect).
    ballSteerCone: 30, ballLosStep: 40,
    shieldCharges: 3,                                        // Mirror Shield window/r at level lookup
    skateSlideMin: 200, skateSlideLock: 0.5,                 // Ice Skates slide-damage gate
  },

  spawner: {
    firstSpawn: 1.2,
    // spawn placement: band just outside the view edge (px) + fallback offset when the band is out of world (px)
    spawnPad: 15,
    spawnFallback: 30,
    // alive enemy cap over time
    aliveCap: (t) => Math.min(200, 60 + Math.floor(t / 12)),
    // seconds between spawn events
    interval: (t) => Math.max(0.35, 1.7 - t * 0.0047),
    // enemies per spawn event (batch 2 at t0 — a camped player must meet the swarm early)
    batch: (t) => Math.min(6, 2 + Math.floor(t / 55)),
    // type weights by time moved to the per-level defs (levels.js, Phase 13)
  },

  audio: {
    musicVol: 0.20, sfxVol: 0.5, ambVol: 0.30,
    // 10.6 — eldritch track tuning (66 BPM, D-dim7 {D, F, Ab, B})
    bpm: 66,
    schedAhead: 0.12, // scheduler lookahead (s)
    subGain: 0.5,
    droneGain: 0.08, droneCutoff: 340, droneLfoHz: 0.05, droneLfoDepth: 120,
    pulseGain: 0.6,
    colorGain: 0.12, colorSend: 0.5,
    delayTime: 0.34, delayFb: 0.38,
    // 13.11 — per-level flavor voices + m03 muffle (level bus routes through a lowpass)
    bellGain: 0.05, chimeGain: 0.04, taikoGain: 0.09, bubbleGain: 0.03, whaleGain: 0.06,
    muffleOff: 12000, // pass-through cutoff (audibly a no-op) for m01/m02
    muffleM03: 600,   // The Drowned City — muffled, deep, underwater
    texGain: 0.05, texCutoff: 240, texLfoHz: 0.03, texLfoDepth: 120,
    // ambience (unchanged since Phase 5)
    windGain: 0.45, windLfoHz: 0.045, windCutoff: 420,
    howlEvery: [18, 40], // s between ambient wolf howls
    howlGain: 0.5,
  },

  // Co-op (Phase 11): 1 room = 1 run; host-authoritative; seats = join order.
  coop: {
    maxPlayers: 4,
    perPlayer: 0.33,  // 11.3: enemy HP/damage/spawn/boss ×(1 + perPlayer × added players)
    interpLag: 0.1,  // 11.2: client render lag for snapshot interpolation (s)
    leashR: 700,  // 11.4: co-op shared vision radius — every player pair held ≤ this; player light radius in co-op (solo keeps 510)
  },

  scores: {
    max: 10,
    storageKey: 'qsurv.hiscores.v1',
    muteKey: 'qsurv.mute',
  },

  // Persistent meta progression (Soulshards + between-run upgrades). localStorage.
  meta: {
    storageKey: 'qsurv.meta.v1',
    winsKey: 'qsurv.wins.v1',        // per-level cumulative victory counts (13.6)
    levelKey: 'qsurv.level.v1',      // last-selected level (13.7)
    durKey: 'qsurv.duration.v1',     // per-level selected run duration (17.2)
    charKey: 'qsurv.character.v1',   // last-selected playable character (11.6.2)
    charListKey: 'qsurv.chars.v1',   // unlocked character keys (11.6.2, D58)
    shardPerScore: 400,   // shards per score point
    victoryBonus: 25,     // flat bonus shards on victory
    upgrades: {
      // D84 (2026-09-07): economy slow-down — one shared curve, user-set.
      maxHp: { name: 'Vitality',        desc: '+20 max HP',           icon: 'heart', max: 5, val: 20,     cost: [50, 100, 200, 400, 1000] },
      dmg:   { name: 'Ferocity',        desc: '+8% weapon damage',    icon: 'sword', max: 5, val: 0.08,  cost: [50, 100, 200, 400, 1000] },
      speed: { name: 'Swiftness',       desc: '+6% movement speed',   icon: 'boots', max: 5, val: 0.06,  cost: [50, 100, 200, 400, 1000] },
      xp:    { name: 'Soul Attunement', desc: '+12% XP gain',         icon: 'gem',   max: 5, val: 0.12,  cost: [50, 100, 200, 400, 1000] },
      dash:  { name: 'Phantom Step',    desc: '−8% dash cooldown',    icon: 'dash',  max: 5, val: -0.08, cost: [50, 100, 200, 400, 1000] },
    },
    // Level-up screen actions (Phase 18, PLAN §3.11, D84). Meta shop: locked at 0;
    // level 1 = unlock = 1 use/run, each further level +1 → max 10 uses/run each.
    // NOT cards/items — screen buttons only (user spec, verbatim).
    actions: {
      order: ['skip', 'reroll', 'banish'],
      skip:   { name: 'SKIP',    icon: 'skip',   max: 10, xpRatio: 0.66, cost: [300, 600, 900, 1200, 1500, 1800, 2100, 2400, 2700, 3000],
        desc: 'Pass on this offer — gain 66% of the next level\u2019s XP instead', },
      reroll: { name: 'RE-ROLL', icon: 'reroll', max: 10, cost: [300, 600, 900, 1200, 1500, 1800, 2100, 2400, 2700, 3000],
        desc: 'Discard these cards, draw a fresh set (discarded stay in the pool)', },
      banish: { name: 'BANISH',  icon: 'banish', max: 10, cost: [300, 600, 900, 1200, 1500, 1800, 2100, 2400, 2700, 3000],
        desc: 'Remove a card from your offers for the rest of the run (owned cards freeze at their current level)', },
    },
  },

  perf: {
    dprCapDesktop: 2,
    dprCapMobile: 1.5,
    particleCap: 512,
    snowCount: 90,
    scorchCap: 48, // 30.2: max live scorch sparks (bounded like particleCap; drops rather than delays)
    frameHist: 300, // 31.1: ?fps=1 frame-time ring size (percentile window ≈ last 5 s at 60 Hz)
    perfWindowMs: 1000, // 31.1: ?fps=1 recompute/display interval (percentiles cost only here)
    petalColor: '#f7b8c8', // sakura petal (m02 foreground)
    bubbleColor: 'rgba(205,240,255,0.8)', // rising bubble rim (m03 foreground, D49)
  },
};
