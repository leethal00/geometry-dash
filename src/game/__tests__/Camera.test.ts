import { describe, it, expect, beforeEach } from 'vitest';
import { Camera } from '../Camera.js';
import { CONFIG } from '../Config.js';

describe('Camera', () => {
  let camera: Camera;

  beforeEach(() => {
    camera = new Camera(1280, 720);
  });

  describe('initial state', () => {
    it('should start at origin', () => {
      expect(camera.x).toBe(0);
      expect(camera.y).toBe(0);
    });

    it('should have correct dimensions', () => {
      expect(camera.width).toBe(1280);
      expect(camera.height).toBe(720);
    });

    it('should have no shake', () => {
      expect(camera.shakeIntensity).toBe(0);
    });
  });

  describe('follow', () => {
    it('should update camera position to follow target', () => {
      camera.follow(100, 5);
      expect(camera.x).toBe(100 - camera.width / (CONFIG.UNIT_SIZE * 4));
      expect(camera.y).toBe(5);
    });

    it('should track moving target', () => {
      camera.follow(50, 0);
      const firstX = camera.x;
      camera.follow(100, 0);
      expect(camera.x).toBeGreaterThan(firstX);
    });
  });

  describe('shake', () => {
    it('should set shake intensity', () => {
      camera.shake(10);
      expect(camera.shakeIntensity).toBe(10);
    });

    it('should decay shake over updates', () => {
      camera.shake(10);
      camera.update();
      expect(camera.shakeIntensity).toBeLessThan(10);
    });

    it('should eventually settle to zero', () => {
      camera.shake(5);
      for (let i = 0; i < 200; i++) {
        camera.update();
      }
      expect(camera.shakeIntensity).toBe(0);
    });

    it('should produce non-zero render offsets during shake', () => {
      camera.shake(20);
      camera.update();
      // Due to randomness we can't assert exact values, but intensity > 0.01
      // means offsets are computed. Run several updates to get a non-zero one.
      let foundNonZero = false;
      for (let i = 0; i < 50; i++) {
        camera.update();
        if (camera.renderOffsetX !== -camera.x * CONFIG.UNIT_SIZE || camera.renderOffsetY !== 0) {
          foundNonZero = true;
          break;
        }
      }
      expect(foundNonZero).toBe(true);
    });

    it('should have zero shake offsets when no shake', () => {
      camera.follow(10, 0);
      camera.update();
      expect(camera.renderOffsetY).toBe(0);
    });
  });

  describe('resize', () => {
    it('should update dimensions', () => {
      camera.resize(800, 600);
      expect(camera.width).toBe(800);
      expect(camera.height).toBe(600);
    });
  });

  describe('renderOffset', () => {
    it('should translate camera x to pixel offset', () => {
      camera.x = 10;
      camera.update();
      expect(camera.renderOffsetX).toBe(-10 * CONFIG.UNIT_SIZE);
    });

    it('should return zero renderOffsetX when camera at origin with no shake', () => {
      camera.update();
      expect(camera.renderOffsetX).toBe(0);
      expect(camera.renderOffsetY).toBe(0);
    });

    it('should incorporate shake into renderOffsetX', () => {
      camera.x = 5;
      camera.shake(100);
      camera.update();
      // renderOffsetX = -5 * UNIT_SIZE + shakeOffset
      // shakeOffset is random but non-zero with high intensity
      expect(camera.renderOffsetX).not.toBe(-5 * CONFIG.UNIT_SIZE);
    });
  });

  describe('default constructor', () => {
    it('should use CONFIG defaults when no args provided', () => {
      const defaultCamera = new Camera();
      expect(defaultCamera.width).toBe(CONFIG.CANVAS_WIDTH);
      expect(defaultCamera.height).toBe(CONFIG.CANVAS_HEIGHT);
    });
  });

  describe('shake decay rate', () => {
    it('should decay shake intensity by 0.9 each update', () => {
      camera.shake(10);
      camera.update();
      expect(camera.shakeIntensity).toBeCloseTo(9, 1);
      camera.update();
      expect(camera.shakeIntensity).toBeCloseTo(8.1, 1);
    });

    it('should snap to zero when shake falls below threshold', () => {
      camera.shake(0.005);
      camera.update();
      expect(camera.shakeIntensity).toBe(0);
    });
  });

  describe('follow edge cases', () => {
    it('should handle negative target coordinates', () => {
      camera.follow(-10, -5);
      expect(camera.x).toBe(-10 - camera.width / (CONFIG.UNIT_SIZE * 4));
      expect(camera.y).toBe(-5);
    });

    it('should handle zero target', () => {
      camera.follow(0, 0);
      expect(camera.x).toBe(-camera.width / (CONFIG.UNIT_SIZE * 4));
      expect(camera.y).toBe(0);
    });
  });
});
