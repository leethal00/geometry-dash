import { CONFIG } from './Config.js';

export class Camera {
  /** Camera world x position in pixels (left edge of viewport) */
  x = 0;
  /** Screen shake offset */
  shakeX = 0;
  shakeY = 0;
  width: number;
  height: number;

  private shakeIntensity = 0;

  constructor(width: number = CONFIG.CANVAS_WIDTH, height: number = CONFIG.CANVAS_HEIGHT) {
    this.width = width;
    this.height = height;
  }

  /** Position camera so player appears at PLAYER_SCREEN_X fraction from left */
  follow(playerX: number): void {
    this.x = playerX - this.width * CONFIG.PLAYER_SCREEN_X;
    if (this.x < 0) this.x = 0;
  }

  shake(intensity: number): void {
    this.shakeIntensity = intensity;
  }

  update(): void {
    if (this.shakeIntensity > 0.5) {
      this.shakeX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      this.shakeY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      this.shakeIntensity *= 0.88;
    } else {
      this.shakeIntensity = 0;
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  reset(): void {
    this.x = 0;
    this.shakeIntensity = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  /** Ground line Y position on screen */
  get groundScreenY(): number {
    return this.height * CONFIG.GROUND_Y_RATIO;
  }
}
