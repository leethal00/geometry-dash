export interface InputState {
  /** Whether the action button is currently held down */
  actionHeld: boolean;
  /** Whether the action button was pressed this frame (rising edge) */
  actionPressed: boolean;
  /** Whether escape/pause was pressed this frame */
  pausePressed: boolean;
}

export class InputHandler {
  private _actionHeld = false;
  private _actionPressed = false;
  private _pausePressed = false;
  private readonly boundHandlers: {
    keydown: (event: KeyboardEvent) => void;
    keyup: (event: KeyboardEvent) => void;
    mousedown: (event: MouseEvent) => void;
    mouseup: (event: MouseEvent) => void;
    touchstart: (event: TouchEvent) => void;
    touchend: (event: TouchEvent) => void;
  };

  constructor(private readonly target: EventTarget = document) {
    this.boundHandlers = {
      keydown: this.onKeyDown.bind(this),
      keyup: this.onKeyUp.bind(this),
      mousedown: this.onMouseDown.bind(this),
      mouseup: this.onMouseUp.bind(this),
      touchstart: this.onTouchStart.bind(this),
      touchend: this.onTouchEnd.bind(this),
    };
  }

  attach(): void {
    this.target.addEventListener('keydown', this.boundHandlers.keydown as EventListener);
    this.target.addEventListener('keyup', this.boundHandlers.keyup as EventListener);
    this.target.addEventListener('mousedown', this.boundHandlers.mousedown as EventListener);
    this.target.addEventListener('mouseup', this.boundHandlers.mouseup as EventListener);
    this.target.addEventListener('touchstart', this.boundHandlers.touchstart as EventListener);
    this.target.addEventListener('touchend', this.boundHandlers.touchend as EventListener);
  }

  detach(): void {
    this.target.removeEventListener('keydown', this.boundHandlers.keydown as EventListener);
    this.target.removeEventListener('keyup', this.boundHandlers.keyup as EventListener);
    this.target.removeEventListener('mousedown', this.boundHandlers.mousedown as EventListener);
    this.target.removeEventListener('mouseup', this.boundHandlers.mouseup as EventListener);
    this.target.removeEventListener('touchstart', this.boundHandlers.touchstart as EventListener);
    this.target.removeEventListener('touchend', this.boundHandlers.touchend as EventListener);
  }

  /** Call once per frame to get current input state, then resets per-frame flags. */
  poll(): InputState {
    const state: InputState = {
      actionHeld: this._actionHeld,
      actionPressed: this._actionPressed,
      pausePressed: this._pausePressed,
    };
    this._actionPressed = false;
    this._pausePressed = false;
    return state;
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (event.repeat) return;
    if (event.code === 'Space' || event.code === 'ArrowUp') {
      event.preventDefault();
      this._actionHeld = true;
      this._actionPressed = true;
    }
    if (event.code === 'Escape' || event.code === 'KeyP') {
      this._pausePressed = true;
    }
  }

  private onKeyUp(event: KeyboardEvent): void {
    if (event.code === 'Space' || event.code === 'ArrowUp') {
      this._actionHeld = false;
    }
  }

  private onMouseDown(_event: MouseEvent): void {
    this._actionHeld = true;
    this._actionPressed = true;
  }

  private onMouseUp(_event: MouseEvent): void {
    this._actionHeld = false;
  }

  private onTouchStart(event: TouchEvent): void {
    event.preventDefault();
    this._actionHeld = true;
    this._actionPressed = true;
  }

  private onTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    if (event.touches.length === 0) {
      this._actionHeld = false;
    }
  }
}
