export enum GameState {
  Menu = 'menu',
  Playing = 'playing',
  Paused = 'paused',
  Dead = 'dead',
}

export type StateTransitionCallback = (from: GameState, to: GameState) => void;

const VALID_TRANSITIONS: Record<GameState, GameState[]> = {
  [GameState.Menu]: [GameState.Playing],
  [GameState.Playing]: [GameState.Paused, GameState.Dead, GameState.Menu],
  [GameState.Paused]: [GameState.Playing, GameState.Menu],
  [GameState.Dead]: [GameState.Playing, GameState.Menu],
};

export class GameStateMachine {
  private _state: GameState = GameState.Menu;
  private readonly listeners: StateTransitionCallback[] = [];

  get state(): GameState {
    return this._state;
  }

  transition(to: GameState): boolean {
    const allowed = VALID_TRANSITIONS[this._state];
    if (!allowed.includes(to)) {
      return false;
    }
    const from = this._state;
    this._state = to;
    for (const listener of this.listeners) {
      listener(from, to);
    }
    return true;
  }

  onTransition(callback: StateTransitionCallback): void {
    this.listeners.push(callback);
  }

  removeListener(callback: StateTransitionCallback): void {
    const index = this.listeners.indexOf(callback);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  canTransitionTo(to: GameState): boolean {
    return VALID_TRANSITIONS[this._state].includes(to);
  }

  reset(): void {
    this._state = GameState.Menu;
  }
}
