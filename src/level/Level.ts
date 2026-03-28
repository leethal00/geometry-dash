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
// Difficulty: Easy → Medium, rhythmic patterns at ~128 BPM feel
// ============================================================

const FIRST_FLIGHT: LevelDefinition = {
  name: 'First Flight',
  length: 380,

  gaps: [
    // Phase 2 gaps (easy — 2-3 blocks wide)
    [80, 83],
    [110, 113],
    [136, 139],
    // Phase 3 gaps
    [160, 163],
    [180, 183],
    [200, 203],
    [216, 219],
    [236, 239],
    // Phase 4 gaps (intense)
    [266, 269],
    [282, 285],
    [300, 303],
    [316, 319],
  ],

  blocks: [
    // Phase 1: Easy intro — single blocks to jump over
    [46, 0],
    [64, 0],

    // Phase 1 end: 2-high wall
    [70, 0], [70, 1],

    // Phase 2: After first gap
    [96, 0], [96, 1],
    [120, 0],
    [132, 0], [132, 1],
    [152, 0],

    // Phase 3: Getting harder
    [172, 0],
    [192, 0], [192, 1],
    [208, 0],
    [232, 0], [232, 1],
    [252, 0], [252, 1],

    // Phase 4: Intense
    [275, 0],
    [291, 0], [291, 1],
    [309, 0],
    [332, 0],
  ],

  spikes: [
    // === Phase 1: Easy intro (blocks 16-76) ===
    // Single spikes every ~8 blocks — learn the rhythm
    [20, 0],
    [28, 0],
    [36, 0],
    // Double spike
    [40, 0], [41, 0],
    // After first block
    [52, 0],
    // Double spike
    [56, 0], [57, 0],
    // After second block
    [68, 0],
    // Block+spike combo
    [73, 0],

    // === Phase 2: Getting started (blocks 84-156) ===
    [88, 0],
    [92, 0], [93, 0],
    [100, 0],
    // Triple spike — requires early jump
    [104, 0], [105, 0], [106, 0],
    [116, 0],
    [124, 0],
    [128, 0], [129, 0],
    // Spike on top of block (can't land on it!)
    [120, 1],
    [144, 0],
    [148, 0], [149, 0],
    // Triple spike
    [156, 0], [157, 0], [158, 0],

    // === Phase 3: Challenging (blocks 164-256) ===
    [168, 0], [169, 0],
    // Spike on block
    [172, 1],
    [176, 0],
    [188, 0], [189, 0], [190, 0],
    [196, 0],
    [204, 0],
    // Spike on block
    [208, 1],
    [212, 0], [213, 0],
    // Quad spike — long chain!
    [224, 0], [225, 0], [226, 0], [227, 0],
    [244, 0],
    [248, 0], [249, 0],

    // === Phase 4: Intense (blocks 260-336) — tighter spacing ===
    [260, 0],
    [263, 0], [264, 0],
    [272, 0],
    [278, 0], [279, 0], [280, 0],
    [288, 0],
    [294, 0], [295, 0],
    [297, 0],
    [306, 0], [307, 0], [308, 0],
    [312, 0],
    [324, 0],
    [328, 0], [329, 0],
    [336, 0],

    // === Phase 5: Cooldown ===
    [344, 0],
    [352, 0],
  ],
};
