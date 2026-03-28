# Architectural Decisions

## 2026-03-28 Fixed Timestep Game Loop

**Context**: Need deterministic physics that behaves identically regardless of frame rate or device performance.

**Decision**: Use an accumulator-based fixed timestep loop at 60 ticks/sec with delta clamping at 0.25s.

**Rationale**: Fixed timestep ensures physics calculations are reproducible — essential for a precision platformer where timing determines success. The accumulator pattern allows multiple physics updates per frame when the system lags, catching up without changing the physics. Delta clamping prevents spiral of death (where lag causes more physics work, causing more lag).

**Consequences**: All physics code runs at exactly 60Hz. Rendering is decoupled and runs at display refresh rate. Any new physics must go through `fixedUpdate()`, not the render loop.

## 2026-03-28 Game Units Over Pixels

**Context**: Physics values need to be readable, portable, and independent of screen resolution.

**Decision**: All physics constants (gravity, speed, jump velocity) are in abstract game units. Pixel conversion happens only at render time via `UNIT_SIZE` (40px per unit).

**Rationale**: Makes physics code easier to reason about and tune. Changing resolution or canvas size doesn't affect gameplay. The spec defines all values in game units, so the code matches the spec directly.

**Consequences**: Every render call must multiply by `UNIT_SIZE` to convert. New developers must understand the unit system. Config values won't match pixel values they see on screen.

## 2026-03-28 Poll-Based Input Model

**Context**: Need to handle keyboard, mouse, and touch input uniformly with per-frame precision.

**Decision**: Events set internal flags. The game loop calls `poll()` once per fixed update to read and reset per-frame flags.

**Rationale**: Decouples event timing from game timing. Each press is consumed exactly once, preventing double-jumps from a single tap. The poll model works identically across input methods and is easy to test (set flags, call poll, check result).

**Consequences**: Input latency is at most one fixed timestep (16.6ms). All new input types must follow the same flag-and-poll pattern.

## 2026-03-28 No Game Framework

**Context**: Choosing between a game framework (Phaser, PixiJS) and raw Canvas 2D.

**Decision**: Raw Canvas 2D with no runtime dependencies.

**Rationale**: Full control over rendering pipeline and performance characteristics. No framework abstraction overhead. The game's rendering needs (rectangles, simple shapes, text) don't require a framework. Keeps the bundle minimal and the code transparent.

**Consequences**: Must implement all game infrastructure (game loop, input, camera, collision, etc.) from scratch. More initial work but no framework lock-in or unnecessary abstraction layers.
