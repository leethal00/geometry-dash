import { CONFIG } from '../game/Config.js';

// --- Level definition types (grid units) ---

interface LevelDefinition {
  name: string;
  /** Total level length in grid units */
  length: number;
  /** Ground gap ranges [start, end) in grid units — ground is absent here */
  gaps: [number, number][];
  /** Block positions [x, y] in grid units (y=0 = ground level) */
  blocks: [number, number][];
  /** Spike positions [x, y] in grid units (pointing up) */
  spikes: [number, number][];
}

// --- Loaded level (pixel coordinates) ---

export interface LevelObstacle {
  x: number;
  y: number;
}

export interface GroundSegment {
  startPx: number;
  endPx: number;
}

export class Level {
  readonly name: string;
  readonly lengthPx: number;
  readonly gaps: { startPx: number; endPx: number }[];
  readonly groundSegments: GroundSegment[];
  readonly blocks: LevelObstacle[];
  readonly spikes: LevelObstacle[];

  constructor(def: LevelDefinition) {
    const U = CONFIG.UNIT_SIZE;
    this.name = def.name;
    this.lengthPx = def.length * U;

    // Convert gaps to pixels
    this.gaps = def.gaps.map(([s, e]) => ({ startPx: s * U, endPx: e * U }));

    // Compute ground segments (the inverse of gaps)
    this.groundSegments = [];
    let prev = 0;
    for (const [s, e] of def.gaps) {
      if (s * U > prev) {
        this.groundSegments.push({ startPx: prev, endPx: s * U });
      }
      prev = e * U;
    }
    if (prev < this.lengthPx) {
      this.groundSegments.push({ startPx: prev, endPx: this.lengthPx });
    }

    // Convert blocks and spikes to pixels, sorted by x
    this.blocks = def.blocks
      .map(([x, y]) => ({ x: x * U, y: y * U }))
      .sort((a, b) => a.x - b.x);

    this.spikes = def.spikes
      .map(([x, y]) => ({ x: x * U, y: y * U }))
      .sort((a, b) => a.x - b.x);
  }

  /** Check if the given x position (player center) is over solid ground */
  isOverGround(centerX: number): boolean {
    for (const gap of this.gaps) {
      if (centerX >= gap.startPx && centerX < gap.endPx) return false;
    }
    return centerX >= 0 && centerX < this.lengthPx;
  }

  static firstLevel(): Level {
    return new Level(FIRST_FLIGHT);
  }
}

// ============================================================
// "First Flight" — 380 blocks, ~45 seconds, cube only
// Difficulty: Very Easy → Easy. Completable in 5-15 attempts.
// Phase 1 (0-100): single spikes, 10+ block gaps, learn timing
// Phase 2 (100-200): blocks, first ground gaps, still forgiving
// Phase 3 (200-300): double spikes, block+spike combos
// Phase 4 (300-380): triple spikes max, tighter but readable
// ============================================================

const FIRST_FLIGHT: LevelDefinition = {
  name: 'First Flight',
  length: 380,

  gaps: [
    // Phase 2: first gaps — 2 blocks wide, very learnable
    [140, 142],
    [175, 177],
    // Phase 3: still 2 blocks
    [225, 227],
    [260, 262],
    // Phase 4: one 3-block gap as the hardest obstacle
    [320, 323],
    [355, 357],
  ],

  blocks: [
    // Phase 2: single blocks to jump over
    [115, 0],
    [155, 0],
    [185, 0],

    // Phase 3: blocks + 2-high walls
    [210, 0],
    [245, 0],
    [270, 0], [270, 1],

    // Phase 4: harder block patterns
    [310, 0],
    [340, 0], [340, 1],
    [365, 0],
  ],

  spikes: [
    // === Phase 1: Very easy (0-100) ===
    // Single spikes with 10+ block gaps. Just learn to jump.
    // First obstacle at block 18 — plenty of settling-in time
    [18, 0],
    [30, 0],
    [42, 0],
    [55, 0],
    [70, 0],
    [85, 0],

    // === Phase 2: Easy (100-200) ===
    // Single spikes, first block obstacles, first ground gaps
    [105, 0],
    [125, 0],
    // After first gap landing
    [148, 0],
    [165, 0],
    // First double spike
    [190, 0], [193, 0],

    // === Phase 3: Medium (200-300) ===
    // Double spikes, block+spike combos, medium spacing
    [220, 0],
    // Double spike
    [235, 0], [238, 0],
    [250, 0],
    // Spike after block
    [275, 0],
    // Double spike
    [290, 0], [293, 0],

    // === Phase 4: Hardest section (300-380) ===
    // Triple spikes max, tighter but still readable
    [305, 0],
    // Triple spike — the hardest single obstacle
    [330, 0], [331, 0], [332, 0],
    [348, 0],
    // Double spike near the end
    [360, 0], [363, 0],
    [372, 0],
  ],
};
