import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GameState, GameStateMachine } from '../GameState.js';

describe('GameStateMachine', () => {
  let sm: GameStateMachine;

  beforeEach(() => {
    sm = new GameStateMachine();
  });

  describe('initial state', () => {
    it('should start in Menu state', () => {
      expect(sm.state).toBe(GameState.Menu);
    });
  });

  describe('valid transitions', () => {
    it('should transition from Menu to Playing', () => {
      expect(sm.transition(GameState.Playing)).toBe(true);
      expect(sm.state).toBe(GameState.Playing);
    });

    it('should transition from Playing to Paused', () => {
      sm.transition(GameState.Playing);
      expect(sm.transition(GameState.Paused)).toBe(true);
      expect(sm.state).toBe(GameState.Paused);
    });

    it('should transition from Playing to Dead', () => {
      sm.transition(GameState.Playing);
      expect(sm.transition(GameState.Dead)).toBe(true);
      expect(sm.state).toBe(GameState.Dead);
    });

    it('should transition from Playing to Menu', () => {
      sm.transition(GameState.Playing);
      expect(sm.transition(GameState.Menu)).toBe(true);
      expect(sm.state).toBe(GameState.Menu);
    });

    it('should transition from Paused to Playing (resume)', () => {
      sm.transition(GameState.Playing);
      sm.transition(GameState.Paused);
      expect(sm.transition(GameState.Playing)).toBe(true);
      expect(sm.state).toBe(GameState.Playing);
    });

    it('should transition from Paused to Menu (quit)', () => {
      sm.transition(GameState.Playing);
      sm.transition(GameState.Paused);
      expect(sm.transition(GameState.Menu)).toBe(true);
      expect(sm.state).toBe(GameState.Menu);
    });

    it('should transition from Dead to Playing (retry)', () => {
      sm.transition(GameState.Playing);
      sm.transition(GameState.Dead);
      expect(sm.transition(GameState.Playing)).toBe(true);
      expect(sm.state).toBe(GameState.Playing);
    });

    it('should transition from Dead to Menu (quit)', () => {
      sm.transition(GameState.Playing);
      sm.transition(GameState.Dead);
      expect(sm.transition(GameState.Menu)).toBe(true);
      expect(sm.state).toBe(GameState.Menu);
    });
  });

  describe('invalid transitions', () => {
    it('should not transition from Menu to Paused', () => {
      expect(sm.transition(GameState.Paused)).toBe(false);
      expect(sm.state).toBe(GameState.Menu);
    });

    it('should not transition from Menu to Dead', () => {
      expect(sm.transition(GameState.Dead)).toBe(false);
      expect(sm.state).toBe(GameState.Menu);
    });

    it('should not transition from Menu to Menu', () => {
      expect(sm.transition(GameState.Menu)).toBe(false);
      expect(sm.state).toBe(GameState.Menu);
    });

    it('should not transition from Paused to Dead', () => {
      sm.transition(GameState.Playing);
      sm.transition(GameState.Paused);
      expect(sm.transition(GameState.Dead)).toBe(false);
      expect(sm.state).toBe(GameState.Paused);
    });

    it('should not transition from Dead to Paused', () => {
      sm.transition(GameState.Playing);
      sm.transition(GameState.Dead);
      expect(sm.transition(GameState.Paused)).toBe(false);
      expect(sm.state).toBe(GameState.Dead);
    });
  });

  describe('canTransitionTo', () => {
    it('should report valid transitions from Menu', () => {
      expect(sm.canTransitionTo(GameState.Playing)).toBe(true);
      expect(sm.canTransitionTo(GameState.Paused)).toBe(false);
      expect(sm.canTransitionTo(GameState.Dead)).toBe(false);
    });

    it('should report valid transitions from Playing', () => {
      sm.transition(GameState.Playing);
      expect(sm.canTransitionTo(GameState.Paused)).toBe(true);
      expect(sm.canTransitionTo(GameState.Dead)).toBe(true);
      expect(sm.canTransitionTo(GameState.Menu)).toBe(true);
    });
  });

  describe('listeners', () => {
    it('should notify listeners on valid transition', () => {
      const callback = vi.fn();
      sm.onTransition(callback);
      sm.transition(GameState.Playing);
      expect(callback).toHaveBeenCalledWith(GameState.Menu, GameState.Playing);
    });

    it('should not notify listeners on invalid transition', () => {
      const callback = vi.fn();
      sm.onTransition(callback);
      sm.transition(GameState.Dead); // invalid from Menu
      expect(callback).not.toHaveBeenCalled();
    });

    it('should support multiple listeners', () => {
      const cb1 = vi.fn();
      const cb2 = vi.fn();
      sm.onTransition(cb1);
      sm.onTransition(cb2);
      sm.transition(GameState.Playing);
      expect(cb1).toHaveBeenCalledOnce();
      expect(cb2).toHaveBeenCalledOnce();
    });

    it('should remove listeners', () => {
      const callback = vi.fn();
      sm.onTransition(callback);
      sm.removeListener(callback);
      sm.transition(GameState.Playing);
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle removing a non-existent listener', () => {
      const callback = vi.fn();
      sm.removeListener(callback); // should not throw
    });
  });

  describe('reset', () => {
    it('should reset state to Menu', () => {
      sm.transition(GameState.Playing);
      sm.transition(GameState.Dead);
      sm.reset();
      expect(sm.state).toBe(GameState.Menu);
    });
  });

  describe('full game lifecycle', () => {
    it('should support menu → playing → dead → playing → paused → menu', () => {
      expect(sm.state).toBe(GameState.Menu);
      sm.transition(GameState.Playing);
      expect(sm.state).toBe(GameState.Playing);
      sm.transition(GameState.Dead);
      expect(sm.state).toBe(GameState.Dead);
      sm.transition(GameState.Playing);
      expect(sm.state).toBe(GameState.Playing);
      sm.transition(GameState.Paused);
      expect(sm.state).toBe(GameState.Paused);
      sm.transition(GameState.Menu);
      expect(sm.state).toBe(GameState.Menu);
    });
  });
});
