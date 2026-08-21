// Seeded world layout — thin dispatch to the per-level layout hook (Phase 13).
// World.generate() resolves the sprite keys (`k`) against the terrain pack
// and builds the collider grid.

import { getLevel } from './levels.js';

export function generateWorld(seed, levelKey = 'm01') {
  const layout = getLevel(levelKey).layout;
  if (!layout) throw new Error(`layout for ${levelKey} is not implemented yet`);
  return layout(seed);
}
