import { CONFIG } from './Config.js';

export class Camera {
  x = 0;
  y = 0;
  width: number;
  height: number;
  shakeIntensity = 0;
  private shakeDecay = 0.9;
  private shakeOffsetX = 0;
  private shakeOffsetY = 0;

  constructor(width: number = CONFIG.CANVAS_WIDTH, height: number = CONFIG.CANVAS_HEIGHT) {
    this.width = width;
    this.height = height;
  }

  /** Follow a target x position (player), centring horizontally with an offset. */
  follow(targetX: number, targetY: number): void {
    this.x = targetX - this.width / (CONFIG.UNIT_SIZE * 4);
    this.y = targetY;
  }

  shake(intensity: number): void {
    this.shakeIntensity = intensity;
  }

  update(): void {
    if (this.shakeIntensity > 0.01) {
      this.shakeOffsetX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      this.shakeOffsetY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.shakeIntensity = 0;
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }
  }

  /** Get the final render offset in pixels, including shake. */
  get renderOffsetX(): number {
    return -this.x * CONFIG.UNIT_SIZE + this.shakeOffsetX;
  }

  get renderOffsetY(): number {
    return this.shakeOffsetY;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }
}
