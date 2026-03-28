/** Game constants — all physics values in game units, not pixels. */

export const CONFIG = {
  /** Target frames per second */
  TARGET_FPS: 60,

  /** Fixed timestep in seconds (1/60) */
  FIXED_TIMESTEP: 1 / 60,

  /** Maximum delta time to prevent spiral of death (seconds) */
  MAX_DELTA: 0.25,

  /** Pixels per game unit */
  UNIT_SIZE: 40,

  /** Level height in game units */
  LEVEL_HEIGHT: 30,

  /** Cube mode horizontal scroll speed in units/tick */
  SCROLL_SPEED: 8.4,

  /** Cube mode gravity in units/tick² */
  GRAVITY: 0.8,

  /** Cube mode jump velocity in units/tick */
  JUMP_VELOCITY: -10,

  /** Ground Y position in game units */
  GROUND_Y: 0,

  /** Canvas default width */
  CANVAS_WIDTH: 1280,

  /** Canvas default height */
  CANVAS_HEIGHT: 720,

  /** Aspect ratio (16:9) */
  ASPECT_RATIO: 16 / 9,
} as const;
