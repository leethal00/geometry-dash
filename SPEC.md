# Geometry Dash Clone — Full Specification & Swarm Build Plan

## Game Overview

A rhythm-based platformer where a cube (and other vehicles) auto-scrolls through obstacle courses synchronised to electronic music. The player's only input is tapping/clicking to jump (or hold for certain vehicles). One hit = death = restart from the beginning. The challenge is memorising the level and perfecting timing.

## Tech Stack

- **Engine**: HTML5 Canvas + TypeScript (no framework — raw performance)
- **Build**: Vite for dev server and bundling
- **Audio**: Web Audio API for precise music sync
- **Hosting**: GitHub Pages (leethal00/geometry-dash)
- **Structure**: Modular ES modules, no dependencies except Vite

## Core Mechanics

### 1. Physics & Movement

**Cube Mode (default):**
- Constant horizontal scroll speed: 8.4 units/tick at 60fps (311 pixels/sec at 1x speed)
- Gravity: 0.8 units/tick² downward
- Jump velocity: -10 units/tick (single tap, no variable height)
- Player CANNOT double jump in cube mode
- Ground detection: player snaps to ground surface when falling
- Ceiling detection: player dies on ceiling contact (unless in specific modes)
- The cube rotates visually (90° per jump, smooth interpolation) but rotation is cosmetic only — hitbox stays square

**Ship Mode:**
- Hold to fly upward (thrust = -0.5 units/tick²), release to fall
- Gravity: 0.4 units/tick² (lighter than cube)
- Speed gates can change horizontal scroll speed
- Ship has a triangular visual, trail effect behind it
- Can fly between floor and ceiling — both are solid boundaries (not death)

**Ball Mode:**
- Tap to toggle gravity direction (normal ↔ inverted)
- Gravity: 0.8 units/tick² in current direction
- Rolls along surfaces, can roll on ceiling when inverted
- Visual: circle that rotates in movement direction

**UFO Mode:**
- Each tap gives a short upward boost (impulse = -6 units/tick)
- Gravity always pulls down: 0.6 units/tick²
- Can tap repeatedly for sustained flight
- Visual: UFO shape with glow

**Wave Mode:**
- Hold to move diagonally upward, release to move diagonally downward
- Constant diagonal speed (45° angle)
- No gravity — pure diagonal movement
- Trail is essential visual feedback
- Very tight corridors — precision mode

**Spider Mode:**
- Tap to teleport to the opposite surface (floor ↔ ceiling)
- Gravity pulls toward current surface
- Similar to ball but instant teleport instead of gravity flip
- Visual: spider shape

### 2. Obstacles & Objects

**Blocks:**
- Solid square blocks (1x1 unit grid)
- Player dies on collision with any face
- Can be stacked, arranged in any pattern
- Textures/colours change per level theme

**Spikes:**
- Triangular, placed on blocks or ground/ceiling
- Death on any contact
- Can face up, down, left, right
- Sizes: full (1x1), half (0.5x1), tiny (0.25x0.25)

**Platforms:**
- Horizontal surfaces the player can land on
- Can be at any height
- Moving platforms: horizontal or vertical oscillation
- Disappearing platforms: visible briefly, then vanish

**Portals:**
- **Mode portals**: Change vehicle type (cube→ship, ship→ball, etc.)
- **Gravity portal**: Flip gravity (yellow = normal, blue = inverted)
- **Speed portal**: Change game speed (0.5x, 1x, 2x, 3x, 4x)
- **Size portal**: Mini mode (smaller hitbox, higher jump) / normal
- **Dual portal**: Split into two players controlling simultaneously
- Visual: tall rectangular gate with particle effects, distinct colours per type

**Pads (on ground/ceiling):**
- **Yellow pad**: Standard bounce (like a jump but stronger)
- **Pink pad**: Lower bounce
- **Red pad**: Highest bounce
- **Blue pad**: Gravity flip + bounce
- Player hits pad → automatic bounce, no input needed

**Rings/Orbs (in air):**
- **Yellow orb**: Jump in mid-air when tapped near orb
- **Pink orb**: Lower mid-air jump
- **Red orb**: Highest mid-air jump  
- **Blue orb**: Gravity flip + jump
- **Green orb**: Reverse gravity direction of current jump
- **Black orb**: Downward impulse
- **Dash orb**: Launches in a specific direction for set distance
- Player must TAP while near the orb — timing matters

**Triggers:**
- **Move trigger**: Moves a group of objects to new position
- **Toggle trigger**: Show/hide object groups
- **Colour trigger**: Change background/ground colour
- **Shake trigger**: Screen shake effect
- **Pulse trigger**: Colour pulse on objects
- **Alpha trigger**: Fade objects in/out
- Triggers fire when the camera passes their x-position

### 3. Level Structure

**Grid System:**
- Levels built on a grid: 30 units tall, unlimited length horizontal
- Ground at y=0, ceiling at y=30 (when present)
- Objects snap to grid but can be placed at half-grid positions
- Camera follows player horizontally, centred vertically (with smoothing)

**Sections:**
- Levels divided into sections, each with a theme/colour scheme
- Transitions between sections use colour triggers and portal combinations
- Typical level: 60-120 seconds at 1x speed

**Checkpoints (Practice Mode only):**
- Green diamonds placed throughout the level
- In practice mode: respawn at last checkpoint on death
- In normal mode: no checkpoints, death = restart from beginning

**Completion:**
- Reach the end of the level = complete
- Track: attempts, best progress %, completion status
- Star ratings based on completion + coins collected

### 4. Visual System

**Background:**
- Parallax scrolling background layers (3-4 layers)
- Gradient backgrounds that shift colours via triggers
- Particle effects layer (floating particles, speed lines)

**Ground:**
- Textured ground line with customisable colour
- Ground pattern scrolls with player movement
- Can have gaps (player falls and dies if no platform below)

**Player Visuals:**
- Customisable cube/ship/ball icons (unlockable)
- Trail effects behind player (colour customisable)
- Death effect: cube shatters into particles
- Spawn effect: cube assembles from particles

**Effects:**
- Screen pulse on beat drops
- Glow effects on interactive objects (orbs, portals)
- Particle burst when hitting pads/orbs
- Speed lines at higher speeds
- Chromatic aberration on screen shake

**Colour System:**
- HSL-based colour system for easy theming
- Primary colour: player, ground, UI
- Secondary colour: background, particles
- Object colours: triggered changes throughout level
- All colours animatable via triggers

### 5. Audio System

**Music Sync:**
- Music drives the level design — obstacles placed on beats
- BPM detection for editor snap-to-beat
- Audio context for precise timing (Web Audio API, not HTML5 Audio)
- Preload entire track before level starts
- Visual metronome in editor

**Sound Effects:**
- Jump: short percussive click
- Death: crash/shatter sound
- Portal enter: whoosh with pitch shift
- Pad bounce: spring boing
- Orb activate: magical chime
- Coin collect: bright ding
- Level complete: triumphant fanfare
- Menu click: soft UI click

### 6. Game Modes

**Normal Mode:**
- Play the level from start to finish
- Death = restart from beginning
- Track attempts and best progress percentage
- Completing unlocks the level's reward (stars, icons)

**Practice Mode:**
- Same level but with checkpoints
- Auto-placed checkpoints at regular intervals
- Player-placeable checkpoints (tap secondary button)
- Death = respawn at last checkpoint
- Progress doesn't count toward completion

### 7. Level Editor

**Grid Editor:**
- Full-screen grid view
- Object palette: blocks, spikes, portals, pads, orbs, triggers, decorations
- Place objects by clicking/tapping on grid
- Select, move, copy, paste, delete objects
- Multi-select with drag rectangle
- Undo/redo (50 levels deep)
- Zoom in/out (mouse wheel / pinch)
- Pan with middle-mouse / two-finger drag

**Object Properties:**
- Each object has editable properties
- Groups: assign objects to numbered groups for trigger targeting
- Colour channels: assign objects to colour channels for colour triggers
- Z-layer: foreground, playfield, background
- Rotation: 0°, 90°, 180°, 270° (and free rotation for decorations)

**Testing:**
- Play-from-here: test level starting at camera position
- Full playtest: test from beginning
- Instant switch between edit and play mode

**Song Selection:**
- Upload custom MP3/OGG files
- BPM input for beat grid alignment
- Preview playback in editor
- Waveform display for visual timing

**Save/Load:**
- Levels saved as JSON in localStorage
- Export level as shareable JSON string (copy to clipboard)
- Import level from JSON string
- Level metadata: name, creator, difficulty rating, song info

### 8. Menus & UI

**Main Menu:**
- Game title with animated background
- Buttons: Play, Editor, Settings
- Player icon customisation access
- Stats display (total attempts, stars earned, etc.)

**Level Select:**
- Grid of level cards
- Each shows: name, difficulty, progress bar, star rating, attempt count
- Built-in levels (5-10) + custom levels
- Sort by difficulty, name, recent

**Settings:**
- Music volume slider
- SFX volume slider  
- Show FPS toggle
- Performance mode (reduce particles/effects)
- Reset progress button

**In-Game HUD:**
- Progress bar at top (% through level)
- Attempt counter
- Practice mode: checkpoint indicator
- Pause button → resume, practice mode toggle, restart, exit
- Minimal — don't obscure gameplay

### 9. Built-In Levels

Create 5 levels of increasing difficulty:

**Level 1: "First Flight"**
- Difficulty: Easy
- BPM: 128
- Duration: ~45 seconds
- Modes: Cube only
- Teaches: jumping, timing, basic spike avoidance
- Simple block patterns, generous spacing

**Level 2: "Neon Rush"**
- Difficulty: Normal  
- BPM: 140
- Duration: ~60 seconds
- Modes: Cube + Ship
- Teaches: ship flying, portal transitions
- More complex spike patterns, first ship section

**Level 3: "Gravity Wells"**
- Difficulty: Hard
- BPM: 150
- Duration: ~75 seconds
- Modes: Cube + Ship + Ball
- Teaches: gravity flipping, ball mode
- Gravity portals, tight corridors in ship

**Level 4: "Digital Descent"**
- Difficulty: Harder
- BPM: 160
- Duration: ~90 seconds
- Modes: Cube + Ship + UFO + Wave
- Teaches: UFO tapping, wave precision
- Mixed mode transitions, speed changes

**Level 5: "Chaos Theory"**
- Difficulty: Insane
- BPM: 170
- Duration: ~120 seconds
- Modes: All modes
- Everything combined, tight timings, speed changes
- Multiple gravity flips, mini mode sections

### 10. Performance Requirements

- Solid 60fps on modern browsers (Chrome, Safari, Firefox)
- Canvas rendering with requestAnimationFrame
- Object pooling for particles
- Only render objects within viewport + buffer
- Efficient collision detection (spatial grid, not N² checks)
- Preload all assets before gameplay
- Target: handle 500+ objects on screen without frame drops

## Project Structure

```
geometry-dash/
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── src/
│   ├── main.ts                    # Entry point
│   ├── game/
│   │   ├── Game.ts                # Main game loop, state machine
│   │   ├── GameState.ts           # Enum: menu, playing, editor, paused, dead
│   │   ├── Camera.ts              # Viewport, scrolling, shake effects
│   │   ├── Input.ts               # Keyboard, mouse, touch input handler
│   │   └── Config.ts              # Game constants (physics values, speeds)
│   ├── physics/
│   │   ├── Physics.ts             # Physics update loop
│   │   ├── Collision.ts           # Collision detection (AABB, spatial grid)
│   │   ├── PlayerPhysics.ts       # Per-mode physics (cube, ship, ball, etc.)
│   │   └── SpatialGrid.ts        # Spatial partitioning for fast collision
│   ├── entities/
│   │   ├── Player.ts              # Player entity, mode switching
│   │   ├── Block.ts               # Solid block
│   │   ├── Spike.ts               # Spike obstacle
│   │   ├── Portal.ts              # Mode/gravity/speed/size portals
│   │   ├── Pad.ts                 # Jump pads
│   │   ├── Orb.ts                 # Mid-air orbs
│   │   ├── Trigger.ts             # Trigger objects (move, toggle, colour, etc.)
│   │   ├── Coin.ts                # Collectible coins
│   │   ├── Checkpoint.ts          # Practice mode checkpoints
│   │   └── Entity.ts              # Base entity class
│   ├── rendering/
│   │   ├── Renderer.ts            # Main canvas renderer
│   │   ├── Background.ts          # Parallax background layers
│   │   ├── Particles.ts           # Particle system (pooled)
│   │   ├── Trail.ts               # Player trail effect
│   │   ├── Effects.ts             # Screen shake, pulse, chromatic aberration
│   │   ├── Colors.ts              # HSL colour system, theme management
│   │   └── Sprites.ts             # Sprite/icon rendering
│   ├── audio/
│   │   ├── AudioManager.ts        # Web Audio API wrapper
│   │   ├── MusicSync.ts           # BPM sync, beat tracking
│   │   └── SFX.ts                 # Sound effects playback
│   ├── level/
│   │   ├── Level.ts               # Level data structure
│   │   ├── LevelLoader.ts         # Parse level JSON, instantiate objects
│   │   ├── LevelSerializer.ts     # Serialize level to/from JSON
│   │   └── BuiltInLevels.ts       # 5 built-in level definitions
│   ├── editor/
│   │   ├── Editor.ts              # Level editor main controller
│   │   ├── EditorUI.ts            # Editor UI (palette, properties panel)
│   │   ├── EditorGrid.ts          # Grid rendering and snap
│   │   ├── EditorTools.ts         # Select, place, delete, copy tools
│   │   ├── ObjectPalette.ts       # Object selection palette
│   │   └── History.ts             # Undo/redo stack
│   ├── ui/
│   │   ├── Menu.ts                # Main menu
│   │   ├── LevelSelect.ts         # Level selection screen
│   │   ├── HUD.ts                 # In-game HUD (progress, attempts)
│   │   ├── PauseMenu.ts           # Pause overlay
│   │   ├── Settings.ts            # Settings screen
│   │   ├── DeathScreen.ts         # Death animation + restart
│   │   └── UIRenderer.ts          # Shared UI rendering (buttons, text)
│   ├── data/
│   │   ├── SaveManager.ts         # localStorage save/load
│   │   ├── PlayerProgress.ts      # Completion, attempts, stars
│   │   └── PlayerCustomisation.ts # Icon/trail/colour selections
│   └── utils/
│       ├── math.ts                # Lerp, clamp, easing functions
│       ├── pool.ts                # Object pool for particles
│       └── constants.ts           # Shared constants
├── assets/
│   ├── audio/
│   │   ├── music/                 # Level music files (MP3)
│   │   └── sfx/                   # Sound effects (short MP3/WAV)
│   └── icons/                     # Player icon sprites
└── levels/
    └── built-in/                  # Built-in level JSON files
```

## Swarm Build Plan

### Phase 1: Foundation (Tasks 1-3)
1. **Project scaffold + game loop** — Vite + TypeScript setup, canvas initialisation, 60fps game loop with fixed timestep, state machine (menu/playing/paused/dead), input handler
2. **Physics engine + cube mode** — Player entity, gravity, jumping, ground collision, AABB collision, spatial grid, basic death/respawn
3. **Renderer + basic level** — Canvas renderer, camera scrolling, block rendering, spike rendering, background, ground line, simple test level

### Phase 2: Core Gameplay (Tasks 4-7)
4. **Obstacles + interactions** — Pads (yellow/pink/red/blue), orbs (yellow/pink/red/blue/green/black), coins, collision responses
5. **Portals + vehicle modes** — Mode portals, gravity portals, speed portals, size portals. Ship mode, ball mode physics
6. **Advanced vehicles** — UFO, wave, spider modes. Dual mode portal
7. **Triggers + visual system** — Move/toggle/colour/shake/pulse/alpha triggers, colour channel system, parallax background

### Phase 3: Polish (Tasks 8-10)
8. **Audio system** — Web Audio API, music playback, BPM sync, all sound effects, volume controls
9. **Particles + effects** — Death particles, trail system, portal particles, pad/orb effects, speed lines, screen shake, glow effects
10. **UI + menus** — Main menu, level select, settings, HUD, pause menu, death screen, completion screen

### Phase 4: Content (Tasks 11-13)  
11. **Level editor (basic)** — Grid editor, object palette, place/delete/select, save/load to localStorage, export/import JSON
12. **Level editor (advanced)** — Object properties, groups, triggers in editor, song upload, BPM grid, play-from-here testing
13. **Built-in levels** — Design and build all 5 levels with music sync

### Phase 5: Final (Task 14)
14. **Final polish** — Performance optimisation, responsive canvas sizing, touch controls, customisation system, stats tracking, GitHub Pages deployment

---

## Setup Commands

Run these in order:

### 1. Register the project in the swarm

```bash
cd ~/Documents/Claude/agent-swarm
claude "Create a new project in the swarm:

1. mkdir -p projects/geometry-dash

2. Create projects/geometry-dash/context.md:
A Geometry Dash clone built with HTML5 Canvas and TypeScript. Rhythm-based platformer where a cube auto-scrolls through obstacle courses synced to music. Player taps to jump, one hit = death. Features 6 vehicle modes (cube, ship, ball, UFO, wave, spider), a full level editor, and 5 built-in levels. Built with Vite, no game framework — raw Canvas 2D for maximum performance.

3. Create projects/geometry-dash/repo.yaml:
name: geometry-dash
local_path: ~/Documents/Claude/geometry-dash
remote: github.com/leethal00/geometry-dash
default_branch: main
branch_strategy: direct
target_branch: main
language: typescript
framework: vite
test_command: npm test
build_command: npm run build

4. Create projects/geometry-dash/rules.md:
TypeScript strict mode. No game frameworks — raw Canvas 2D API only. 60fps target. Fixed timestep game loop. All physics values in game units not pixels. Entity-component style architecture. Modular ES modules. Vite for bundling. No external runtime dependencies. Performance critical — use object pooling, spatial grids, viewport culling.

5. Create the labels on the new repo.

Commit and push."
```

### 2. Create the repo

```bash
mkdir -p ~/Documents/Claude/geometry-dash
cd ~/Documents/Claude/geometry-dash
git init
gh repo create leethal00/geometry-dash --public --source=. --push
```

### 3. Create GitHub Issues for each phase

Create these issues on leethal00/geometry-dash. The file watcher will pick them up automatically.

**Issue 1:** (label: swarm, full)
```
Title: Project scaffold, game loop, and input system
Body: Set up the Vite + TypeScript project. Create the HTML5 Canvas game loop with fixed timestep at 60fps. Implement the game state machine (menu, playing, paused, dead). Create the input handler supporting keyboard (space/up to jump), mouse click, and touch tap. The canvas should be responsive and centred. Include a basic placeholder main menu that starts the game on click.

Files to create: All files under src/game/, src/main.ts, index.html, vite.config.ts, tsconfig.json, package.json

Acceptance criteria:
- npm run dev starts the game
- Canvas renders at 60fps
- State machine transitions between menu → playing → paused → dead
- Space/click/tap input detected and logged
- Canvas resizes responsively
```

**Issue 2:** (label: swarm, full)
```
Title: Physics engine and cube mode movement
Body: Implement the core physics engine with gravity, jumping, and collision detection. Create the Player entity with cube mode physics: constant horizontal scroll (8.4 units/tick), gravity (0.8 units/tick²), jump velocity (-10 units/tick). Implement AABB collision detection with spatial grid partitioning. Player should scroll through a simple test level with ground, gaps, and blocks. Death on spike/obstacle collision restarts the level.

Key physics values:
- Scroll speed: 8.4 units/tick (311px/sec at 1x)
- Gravity: 0.8 units/tick²
- Jump velocity: -10 units/tick
- Grid: 1 unit = ~40px
- Level height: 30 units

Files to create: src/physics/*, src/entities/Player.ts, src/entities/Block.ts, src/entities/Spike.ts, src/entities/Entity.ts

Acceptance criteria:
- Cube scrolls right at constant speed
- Tap/space makes cube jump with correct physics
- Cube lands on ground and blocks
- Cube dies on spike contact and level restarts
- Collision detection handles 500+ objects without frame drops
- Spatial grid partitioning working
```

**Issue 3:** (label: swarm, full)
```
Title: Renderer, camera system, and visual foundation
Body: Implement the canvas renderer with camera scrolling that follows the player. Create the parallax background system (3 layers), ground line with scrolling texture, and block/spike rendering. Implement the colour system using HSL for easy theming. Add the cube rotation visual (90° per jump, smooth interpolation). Create the camera system with smooth follow and support for screen shake.

Files to create: src/rendering/*, src/game/Camera.ts

Acceptance criteria:
- Camera smoothly follows player horizontally
- 3-layer parallax background scrolls at different speeds
- Ground line with texture scrolls with player
- Blocks render as solid coloured squares
- Spikes render as triangles on surfaces
- Cube rotates smoothly 90° on each jump
- HSL colour system allows easy theme changes
- Screen shake function works
```

**Issues 4-14:** Continue the pattern following the phase plan above. Each issue gets the `swarm` label and either `full` (for complex tasks) or `swarm` only (for feature pipeline).

### 4. Start the file watcher (if not already running)

```bash
cd ~/Documents/Claude/agent-swarm
./orchestrator/file-watcher.sh
```

### 5. Create issues and watch the swarm build

Create issues 1-3 first on GitHub with the `swarm` label. The file watcher will pick them up and run the pipeline for each one sequentially. Monitor progress on the Command Centre dashboard.

After those complete and pass review, create issues 4-7, and so on through the phases.

---

## Notes for the Swarm

- Each issue should be self-contained — the coder should be able to complete it without dependencies on incomplete issues
- Issues in the same phase can be worked in parallel IF the file watcher supports it (currently sequential)
- The analyst will need to read the existing codebase before each task to understand what's already built
- The spec above is the reference — agents should consult it for physics values, object types, and architecture decisions
- Music files will need to be sourced separately (use royalty-free electronic tracks) — the swarm should create placeholder silence/beep tracks for development
