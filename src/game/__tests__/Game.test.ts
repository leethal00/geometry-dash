import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Game } from '../Game.js';
import { GameState } from '../GameState.js';

/** Create a stub CanvasRenderingContext2D — jsdom doesn't provide one. */
function createMockContext(): CanvasRenderingContext2D {
  return {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'start',
    textBaseline: 'alphabetic',
  } as unknown as CanvasRenderingContext2D;
}

function createCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.id = 'game-canvas';
  canvas.width = 1280;
  canvas.height = 720;
  // Stub getContext to return our mock
  const mockCtx = createMockContext();
  vi.spyOn(canvas, 'getContext').mockReturnValue(mockCtx);
  document.body.appendChild(canvas);
  return canvas;
}

describe('Game', () => {
  let canvas: HTMLCanvasElement;
  let game: Game;

  beforeEach(() => {
    // Mock window dimensions for resize
    Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 720, writable: true });

    canvas = createCanvas();
    game = new Game(canvas);
  });

  afterEach(() => {
    game?.stop();
    canvas?.remove();
  });

  describe('constructor', () => {
    it('should initialise with canvas and context', () => {
      expect(game.canvas).toBe(canvas);
      expect(game.ctx).toBeDefined();
    });

    it('should start in Menu state', () => {
      expect(game.stateMachine.state).toBe(GameState.Menu);
    });

    it('should not be running initially', () => {
      expect(game.running).toBe(false);
    });

    it('should have zero tick count initially', () => {
      expect(game.tickCount).toBe(0);
    });

    it('should throw if canvas has no 2d context', () => {
      const badCanvas = document.createElement('canvas');
      vi.spyOn(badCanvas, 'getContext').mockReturnValue(null);
      expect(() => new Game(badCanvas)).toThrow('Failed to get 2D rendering context');
    });
  });

  describe('start/stop', () => {
    it('should set running to true on start', () => {
      vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
      game.start();
      expect(game.running).toBe(true);
    });

    it('should set running to false on stop', () => {
      vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
      game.start();
      game.stop();
      expect(game.running).toBe(false);
    });

    it('should not start twice', () => {
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
      game.start();
      game.start();
      // Only one initial raf call expected (the loop call is from start)
      expect(rafSpy).toHaveBeenCalledTimes(1);
    });

    it('should cancel animation frame on stop', () => {
      const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame');
      vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(42);
      game.start();
      game.stop();
      expect(cancelSpy).toHaveBeenCalledWith(42);
    });
  });

  describe('canvas resizing', () => {
    it('should resize canvas to fit window while maintaining aspect ratio', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1920 });
      Object.defineProperty(window, 'innerHeight', { value: 1080 });
      game.resizeCanvas();
      // 1920/1080 = 16/9, so should use full window
      expect(canvas.width).toBe(1920);
      expect(canvas.height).toBe(1080);
    });

    it('should letterbox when window is wider than 16:9', () => {
      Object.defineProperty(window, 'innerWidth', { value: 2000 });
      Object.defineProperty(window, 'innerHeight', { value: 1000 });
      game.resizeCanvas();
      // Window is 2:1 which is wider than 16:9
      // Height constrains: 1000 height, width = 1000 * 16/9 ≈ 1777.78
      expect(canvas.height).toBe(1000);
      // Canvas width is integer, so allow ±1 pixel tolerance
      expect(Math.abs(canvas.width - 1000 * (16 / 9))).toBeLessThan(1);
    });

    it('should pillarbox when window is taller than 16:9', () => {
      Object.defineProperty(window, 'innerWidth', { value: 800 });
      Object.defineProperty(window, 'innerHeight', { value: 800 });
      game.resizeCanvas();
      // Window is 1:1 which is taller than 16:9
      // Width constrains: 800 width, height = 800 / (16/9) = 450
      expect(canvas.width).toBe(800);
      expect(canvas.height).toBeCloseTo(800 / (16 / 9), 0);
    });

    it('should update camera dimensions on resize', () => {
      Object.defineProperty(window, 'innerWidth', { value: 640 });
      Object.defineProperty(window, 'innerHeight', { value: 360 });
      game.resizeCanvas();
      expect(game.camera.width).toBe(canvas.width);
      expect(game.camera.height).toBe(canvas.height);
    });
  });

  describe('state machine integration', () => {
    it('should expose the state machine', () => {
      expect(game.stateMachine).toBeDefined();
      expect(game.stateMachine.state).toBe(GameState.Menu);
    });

    it('should transition from menu to playing', () => {
      game.stateMachine.transition(GameState.Playing);
      expect(game.stateMachine.state).toBe(GameState.Playing);
    });
  });

  describe('input integration', () => {
    it('should have an input handler', () => {
      expect(game.input).toBeDefined();
    });
  });

  describe('fixedUpdate state transitions via input', () => {
    let rafCallback: ((time: number) => void) | null;
    let baseTime: number;

    beforeEach(() => {
      rafCallback = null;
      baseTime = performance.now();
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafCallback = cb;
        return 1;
      });
    });

    it('should transition from Menu to Playing on action press', () => {
      game.start();
      // Simulate space press then advance a frame with enough delta for a tick
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
      if (rafCallback) rafCallback(baseTime + 20);
      expect(game.stateMachine.state).toBe(GameState.Playing);
    });

    it('should transition from Playing to Paused on pause press', () => {
      game.stateMachine.transition(GameState.Playing);
      game.start();
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
      if (rafCallback) rafCallback(baseTime + 20);
      expect(game.stateMachine.state).toBe(GameState.Paused);
    });

    it('should transition from Paused to Playing on pause press', () => {
      game.stateMachine.transition(GameState.Playing);
      game.stateMachine.transition(GameState.Paused);
      game.start();
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape' }));
      if (rafCallback) rafCallback(baseTime + 20);
      expect(game.stateMachine.state).toBe(GameState.Playing);
    });

    it('should transition from Dead to Playing on action press', () => {
      game.stateMachine.transition(GameState.Playing);
      game.stateMachine.transition(GameState.Dead);
      game.start();
      document.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
      if (rafCallback) rafCallback(baseTime + 20);
      expect(game.stateMachine.state).toBe(GameState.Playing);
    });
  });

  describe('game loop mechanics', () => {
    let rafCallback: ((time: number) => void) | null;
    let mockTime: number;

    beforeEach(() => {
      rafCallback = null;
      mockTime = 1000; // Start at 1000ms to avoid edge cases
      vi.spyOn(performance, 'now').mockReturnValue(mockTime);
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafCallback = cb;
        return 1;
      });
    });

    it('should clamp large deltas to MAX_DELTA', () => {
      game.start();
      // Advance by 2 seconds — way beyond MAX_DELTA (0.25s)
      // With MAX_DELTA = 0.25 and FIXED_TIMESTEP = 1/60, max ticks = floor(0.25 / (1/60)) = 15
      if (rafCallback) rafCallback(mockTime + 2000);
      expect(game.tickCount).toBeLessThanOrEqual(15);
      expect(game.tickCount).toBeGreaterThan(0);
    });

    it('should accumulate ticks proportional to elapsed time', () => {
      game.start();
      // Advance by 100ms = 6 ticks at 60fps (100 / 16.667 = 5.99, floor = 5... but accumulator carries)
      // Actually: delta=0.1s, accumulator=0.1, 0.1 / (1/60) = 6 ticks exactly
      if (rafCallback) rafCallback(mockTime + 100);
      expect(game.tickCount).toBe(6);
    });

    it('should not tick when delta is less than one timestep', () => {
      game.start();
      // Advance by 5ms = 0.3 timesteps (1 timestep = ~16.67ms)
      if (rafCallback) rafCallback(mockTime + 5);
      expect(game.tickCount).toBe(0);
    });

    it('should stop looping when not running', () => {
      const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
      game.start();
      game.stop();
      const callCount = rafSpy.mock.calls.length;
      // After stop, calling the loop callback should not schedule another frame
      if (rafCallback) rafCallback(mockTime + 100);
      expect(rafSpy.mock.calls.length).toBe(callCount);
    });

    it('should track FPS over one second', () => {
      let rafCallCount = 0;
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafCallCount++;
        rafCallback = cb;
        return 1;
      });

      game.start();
      expect(game.fps).toBe(0);

      // Simulate many frames at 16ms intervals to cross the 1-second boundary
      for (let i = 1; i <= 70; i++) {
        if (rafCallback) rafCallback(mockTime + i * 16);
      }

      // 70 frames at 16ms = 1120ms total, should have crossed 1s boundary
      expect(rafCallCount).toBeGreaterThan(60);
      expect(game.fps).toBeGreaterThan(0);
    });
  });

  describe('stop edge cases', () => {
    it('should handle stop when not started', () => {
      expect(() => game.stop()).not.toThrow();
      expect(game.running).toBe(false);
    });

    it('should handle multiple stop calls', () => {
      vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1);
      game.start();
      game.stop();
      expect(() => game.stop()).not.toThrow();
    });
  });

  describe('render dispatching', () => {
    let rafCallback: ((time: number) => void) | null;
    let baseTime: number;

    beforeEach(() => {
      rafCallback = null;
      baseTime = performance.now();
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        rafCallback = cb;
        return 1;
      });
    });

    it('should call clearRect on each render', () => {
      game.start();
      if (rafCallback) rafCallback(baseTime + 20);
      expect(game.ctx.clearRect).toHaveBeenCalled();
    });

    it('should render menu text in Menu state', () => {
      game.start();
      if (rafCallback) rafCallback(baseTime + 20);
      expect(game.ctx.fillText).toHaveBeenCalledWith(
        'Geometry Dash',
        expect.any(Number),
        expect.any(Number),
      );
    });

    it('should render pause overlay in Paused state', () => {
      game.stateMachine.transition(GameState.Playing);
      game.stateMachine.transition(GameState.Paused);
      game.start();
      if (rafCallback) rafCallback(baseTime + 20);
      expect(game.ctx.fillText).toHaveBeenCalledWith(
        'PAUSED',
        expect.any(Number),
        expect.any(Number),
      );
    });

    it('should render dead overlay in Dead state', () => {
      game.stateMachine.transition(GameState.Playing);
      game.stateMachine.transition(GameState.Dead);
      game.start();
      if (rafCallback) rafCallback(baseTime + 20);
      expect(game.ctx.fillText).toHaveBeenCalledWith(
        'DEAD',
        expect.any(Number),
        expect.any(Number),
      );
    });
  });
});
