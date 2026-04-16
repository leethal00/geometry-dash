import { CONFIG, VehicleMode } from '../game/Config.js';

export interface TrailPoint {
  x: number;
  y: number;
  rotation: number;
}

export class Player {
  /** World position in pixels (bottom-left of hitbox, y positive = up from ground) */
  x = 0;
  y = 0;
  /** Vertical velocity in px/tick (positive = upward) */
  vy = 0;
  /** Whether the player is standing on a surface */
  onGround = true;
  /** Whether the player is alive */
  alive = true;
  /** Current visual rotation in degrees */
  rotation = 0;
  /** Target rotation (increments by 90 per jump) */
  targetRotation = 0;
  /** Whether gravity is currently flipped (running on ceiling) */
  gravityFlipped = false;
  /** Trail of recent positions for rendering */
  trail: TrailPoint[] = [];
  /** Current vehicle mode */
  mode: VehicleMode = VehicleMode.Cube;

  reset(): void {
    this.x = 80; // start 2 blocks in
    this.y = 0;
    this.vy = 0;
    this.onGround = true;
    this.alive = true;
    this.rotation = 0;
    this.targetRotation = 0;
    this.gravityFlipped = false;
    this.trail = [];
    this.mode = VehicleMode.Cube;
  }

  /** Cube mode: single tap jump from ground */
  jump(): void {
    if (!this.onGround) return;
    this.vy = this.gravityFlipped ? -CONFIG.JUMP_VELOCITY : CONFIG.JUMP_VELOCITY;
    this.onGround = false;
    this.targetRotation += this.gravityFlipped ? -90 : 90;
  }

  /** Ball mode: toggle gravity direction on tap */
  ballTap(): void {
    if (!this.onGround) return;
    this.gravityFlipped = !this.gravityFlipped;
    this.vy = this.gravityFlipped ? -CONFIG.BALL_GRAVITY * 4 : CONFIG.BALL_GRAVITY * 4;
    this.onGround = false;
  }

  /** UFO mode: short upward impulse on each tap */
  ufoTap(): void {
    this.vy = this.gravityFlipped ? -CONFIG.UFO_IMPULSE : CONFIG.UFO_IMPULSE;
  }

  /** Spider mode: teleport to opposite surface */
  spiderTap(): void {
    if (!this.onGround) return;
    this.gravityFlipped = !this.gravityFlipped;
    // Teleport: will be handled in Game.ts by snapping to opposite surface
    this.onGround = false;
    // Give a small impulse toward the new surface
    this.vy = this.gravityFlipped ? CONFIG.SPIDER_GRAVITY * 3 : -CONFIG.SPIDER_GRAVITY * 3;
  }

  padLaunch(): void {
    this.vy = this.gravityFlipped ? -CONFIG.PAD_LAUNCH_VELOCITY : CONFIG.PAD_LAUNCH_VELOCITY;
    this.onGround = false;
    this.targetRotation += this.gravityFlipped ? -90 : 90;
  }

  orbJump(): void {
    this.vy = this.gravityFlipped ? -CONFIG.ORB_JUMP_VELOCITY : CONFIG.ORB_JUMP_VELOCITY;
    this.onGround = false;
    this.targetRotation += this.gravityFlipped ? -90 : 90;
  }

  /** Record current position for trail rendering */
  recordTrail(): void {
    this.trail.push({ x: this.x, y: this.y, rotation: this.rotation });
    if (this.trail.length > CONFIG.TRAIL_LENGTH) {
      this.trail.shift();
    }
  }

  /** Smoothly interpolate visual rotation toward target */
  updateRotation(): void {
    if (this.mode === VehicleMode.Cube) {
      // Cube: snap rotation toward target
      const diff = this.targetRotation - this.rotation;
      if (Math.abs(diff) < 0.5) {
        this.rotation = this.targetRotation;
      } else {
        this.rotation += diff * 0.18;
      }
    } else if (this.mode === VehicleMode.Ball) {
      // Ball: continuous rotation in movement direction
      const dir = this.gravityFlipped ? -1 : 1;
      this.rotation += dir * 5;
    } else if (this.mode === VehicleMode.Ship || this.mode === VehicleMode.UFO) {
      // Ship/UFO: tilt based on vertical velocity
      const targetTilt = Math.max(-30, Math.min(30, this.vy * 3));
      this.rotation += (targetTilt - this.rotation) * 0.15;
    } else if (this.mode === VehicleMode.Wave) {
      // Wave: fixed 45° angle based on direction
      const target = this.vy > 0 ? 45 : -45;
      this.rotation += (target - this.rotation) * 0.3;
    } else if (this.mode === VehicleMode.Spider) {
      // Spider: no rotation, stays upright
      this.rotation += (0 - this.rotation) * 0.2;
    }
  }
}
