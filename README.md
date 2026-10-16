# Escape the Museum

A first-person surreal horror game for the browser, built with three.js.
The museum is an illustrated encyclopedia that wants you in its collection.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests (stamina, battery, saves, noise)
npm run build    # typecheck + production build into dist/
```

## Controls

| Key | Action |
|---|---|
| W A S D | Walk |
| Shift | Run (limited breath) |
| Ctrl or C | Crouch, quieter |
| F | Flashlight on or off |
| R | Swap in a spare battery |
| E | Interact |
| Esc | Pause |
| ` | Debug panel (K = simulate being caught, V = show collision mesh) |

## Layout

```
src/
  config.ts            all gameplay numbers from the design document
  core/Game.ts         game states, checkpoints, caught/respawn, frame loop
  core/Input.ts        keyboard, mouse, pointer lock with drag-to-look fallback
  player/              capsule controller, stamina, battery, flashlight, noise
  interaction/         look raycast for interactables and "Fig. N" labels
  levels/              Level interface and the greybox test level
  world/               BVH collision world, materials and props, canvas textures
  save/SaveSystem.ts   versioned localStorage saves that survive storage errors
  ui/                  HUD and menus (plain DOM)
  debug/DebugPanel.ts  developer overlay
tests/                 Vitest unit tests for the pure logic
```

Everything is built from primitives and canvas textures for now; there are no external model files yet.
