# Geometry Dash

A rhythm-based platformer built with HTML5 Canvas and TypeScript. A cube auto-scrolls through obstacle courses synced to music — tap to jump, one hit means death. Features 6 vehicle modes, a level editor, and 5 built-in levels.

No game framework. Raw Canvas 2D API for maximum performance.

## Quick Start

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Click or press Space to start.

## Controls

| Action | Input |
|--------|-------|
| Jump / Start / Retry | Space, Arrow Up, Mouse Click, Touch Tap |
| Pause / Resume | Escape, P |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with hot reload |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build locally |
| `npm test` | Run tests once |
| `npm run test:watch` | Run tests in watch mode |

## Tech Stack

- **Language**: TypeScript (strict mode)
- **Rendering**: HTML5 Canvas 2D
- **Build**: Vite
- **Tests**: Vitest + jsdom
- **Audio**: Web Audio API (planned)
- **Target**: 60fps, ES2020+

Zero runtime dependencies.

## Architecture

```
src/
  main.ts              Entry point — creates canvas, starts game
  game/
    Game.ts            Main game loop (fixed timestep) and rendering
    GameState.ts       State machine: Menu → Playing → Paused / Dead
    Input.ts           Keyboard, mouse, and touch input handler
    Camera.ts          Viewport tracking with screen shake
    Config.ts          Physics constants (game units, not pixels)
```

### Game Loop

The game loop uses a **fixed timestep accumulator** pattern:

1. `requestAnimationFrame` provides the frame callback
2. Delta time is clamped to `MAX_DELTA` (0.25s) to prevent spiral of death
3. Physics updates run at a fixed 60 ticks/sec (`FIXED_TIMESTEP = 1/60`)
4. Multiple fixed updates per frame if the accumulator has built up
5. Rendering happens once per frame after all physics ticks

### State Machine

```
Menu ──→ Playing ──→ Paused
              │         │
              │         └──→ Playing (resume)
              │         └──→ Menu
              └──→ Dead ──→ Playing (retry)
                        └──→ Menu
```

Valid transitions are enforced — invalid transitions are silently rejected. Listeners can subscribe to state changes via `onTransition()`.

### Input System

The `InputHandler` uses a **poll model**: events set internal flags, and the game reads them once per fixed update via `poll()`. Per-frame flags (`actionPressed`, `pausePressed`) auto-reset after polling so each press is consumed exactly once.

Supports keyboard (Space/ArrowUp for action, Escape/P for pause), mouse click, and touch with proper `preventDefault` to avoid scroll/zoom on mobile.

### Camera

Tracks a target position in game units and converts to pixel offsets for rendering. Supports screen shake with exponential decay (0.9 multiplier per tick, snaps to zero below threshold).

### Config

All physics values are in **game units**, not pixels:

| Constant | Value | Notes |
|----------|-------|-------|
| `UNIT_SIZE` | 40 | Pixels per game unit |
| `SCROLL_SPEED` | 8.4 | Units/tick (311 px/sec at 1x) |
| `GRAVITY` | 0.8 | Units/tick² downward |
| `JUMP_VELOCITY` | -10 | Units/tick upward |
| `LEVEL_HEIGHT` | 30 | Units |
| `CANVAS_WIDTH` | 1280 | Default width |
| `CANVAS_HEIGHT` | 720 | Default height (16:9) |
| `FIXED_TIMESTEP` | 1/60 | Seconds per tick |

### Canvas Sizing

The canvas maintains a 16:9 aspect ratio using letterbox/pillarbox scaling. On resize, it fills the available window dimension while preserving aspect ratio.

## Project Status

**Phase 1 complete** — foundation scaffold with game loop, state machine, input handling, and camera system.

See [SPEC.md](SPEC.md) for the full game specification and build plan covering all 5 phases (14 tasks total).

### Planned Features

- Physics engine with AABB collision and spatial grid
- 6 vehicle modes: cube, ship, ball, UFO, wave, spider
- Portals, pads, orbs, triggers
- Parallax backgrounds, particle effects, HSL colour theming
- Web Audio music sync with BPM detection
- Full level editor with save/load/export
- 5 built-in levels of increasing difficulty

## Testing

124 tests across 5 test files covering:

- **Game.ts** — loop mechanics, state transitions via input, rendering
- **GameState.ts** — all valid/invalid transitions, listeners, reset
- **Input.ts** — keyboard, mouse, touch, edge cases (repeat keys, multi-touch)
- **Camera.ts** — follow, shake, resize, offset calculations
- **Config.ts** — value correctness, consistency checks

```bash
npm test
```

## Design Principles

- **No frameworks** — raw Canvas 2D for full control and performance
- **Fixed timestep** — deterministic physics regardless of frame rate
- **Game units** — all physics in abstract units, pixel conversion only at render time
- **Entity-component style** — modular, composable game objects
- **Performance first** — object pooling, spatial grids, viewport culling
