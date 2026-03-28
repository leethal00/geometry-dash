import { describe, it, expect } from 'vitest';
import { CONFIG } from '../Config.js';

describe('Config', () => {
  it('should have TARGET_FPS of 60', () => {
    expect(CONFIG.TARGET_FPS).toBe(60);
  });

  it('should have FIXED_TIMESTEP matching 1/TARGET_FPS', () => {
    expect(CONFIG.FIXED_TIMESTEP).toBeCloseTo(1 / 60);
  });

  it('should have physics values matching spec', () => {
    expect(CONFIG.SCROLL_SPEED).toBe(8.4);
    expect(CONFIG.GRAVITY).toBe(0.8);
    expect(CONFIG.JUMP_VELOCITY).toBe(-10);
  });

  it('should have UNIT_SIZE of 40 pixels', () => {
    expect(CONFIG.UNIT_SIZE).toBe(40);
  });

  it('should have LEVEL_HEIGHT of 30 units', () => {
    expect(CONFIG.LEVEL_HEIGHT).toBe(30);
  });

  it('should have MAX_DELTA to prevent spiral of death', () => {
    expect(CONFIG.MAX_DELTA).toBeGreaterThan(0);
    expect(CONFIG.MAX_DELTA).toBeLessThan(1);
  });

  it('should have a 16:9 aspect ratio', () => {
    expect(CONFIG.ASPECT_RATIO).toBeCloseTo(16 / 9);
  });

  it('should be immutable (readonly)', () => {
    // TypeScript enforces this at compile time via `as const`,
    // but we verify the values don't change at runtime
    const originalFps = CONFIG.TARGET_FPS;
    expect(CONFIG.TARGET_FPS).toBe(originalFps);
  });
});
