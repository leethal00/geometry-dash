/** Game constants — physics values in pixels per tick at 60fps unless noted. */

export const CONFIG = {
  /** Target frames per second */
  TARGET_FPS: 60,

  /** Fixed timestep in seconds (1/60) */
  FIXED_TIMESTEP: 1 / 60,

  /** Maximum delta time to prevent spiral of death (seconds) */
  MAX_DELTA: 0.25,

  /** Pixels per game unit (block size) */
  UNIT_SIZE: 40,

  /** Canvas default width */
  CANVAS_WIDTH: 1280,

  /** Canvas default height */
  CANVAS_HEIGHT: 720,

  /** Aspect ratio (16:9) */
  ASPECT_RATIO: 16 / 9,

  /** Player hitbox size in pixels (1 block) */
  PLAYER_SIZE: 40,

  /** Player horizontal position on screen (fraction from left) */
  PLAYER_SCREEN_X: 0.25,

  // --- Music sync ---

  /** Beats per minute */
  BPM: 128,

  /** Grid units per beat (obstacle spacing quantum) */
  BEAT_UNITS: 4,

  /** Scroll speed derived from BPM: exactly BEAT_UNITS per beat
   *  = (BPM × BEAT_UNITS × UNIT_SIZE) / (FPS × 60) */
  SCROLL_SPEED: (128 * 4 * 40) / (60 * 60), // ≈5.689 px/tick

  /** Gravity in px/tick² (subtracted from vy each tick) */
  GRAVITY: 1.4,

  /** Jump velocity in px/tick (positive = upward) */
  JUMP_VELOCITY: 18.2,

  /** Ground line position as fraction of canvas height from top */
  GROUND_Y_RATIO: 0.78,

  // --- Death ---

  /** Ticks to wait after death before auto-restart (fast respawn) */
  DEATH_PAUSE_TICKS: 15,

  /** Ticks to freeze before particles explode */
  DEATH_FREEZE_TICKS: 2,

  /** Number of particles emitted on death */
  DEATH_PARTICLE_COUNT: 30,

  /** Particle lifetime in ticks */
  PARTICLE_LIFETIME: 50,

  // --- Collision ---

  /** Spike hitbox inset in pixels (makes collision more forgiving) */
  SPIKE_INSET: 12,

  /** Landing tolerance in pixels (how far below block top prevY can be) */
  LANDING_TOLERANCE: 4,

  /** Fall death threshold in pixels below ground */
  FALL_DEATH_Y: -300,

  // --- Game objects ---

  /** Jump pad launch velocity in px/tick (higher than normal jump) */
  PAD_LAUNCH_VELOCITY: 24,

  /** Jump orb velocity in px/tick (same as normal jump, works mid-air) */
  ORB_JUMP_VELOCITY: 18.2,

  /** Ceiling height in pixels above ground (for gravity flip) */
  CEILING_HEIGHT: 400,

  // --- Visual ---

  /** Number of trail positions to store behind player */
  TRAIL_LENGTH: 8,
} as const;
