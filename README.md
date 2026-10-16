# Escape the Museum

A first-person surreal horror game for the browser, built with three.js.
The museum is an illustrated encyclopedia that wants you in its collection.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests (stamina, battery, saves, noise, progress, corridors)
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
| ` | Debug panel (K = simulate being caught, V = show collision mesh, 1/2/3/0 = jump to rotunda / Ice Age / Egypt / test room, N = all fragments here) |

## Layout

```
src/
  config.ts            all gameplay numbers from the design document
  core/Game.ts         game states, level switching, fade transitions, checkpoints, ending
  core/Input.ts        keyboard, mouse, pointer lock with drag-to-look fallback
  player/              capsule controller, stamina, battery, flashlight, noise
  interaction/         look raycast for interactables and "Fig. N" labels
  levels/Rotunda.ts    the safe hub: dome, orrery, plinths, doorways and dark corridors
  levels/ChapterStub.ts placeholder chapter (arrive, 4 fragments, assemble, way back)
  levels/registry.ts   every loadable level by id
  levels/TestRoom.ts   step-2 greybox, reachable from the debug panel
  progress/            chapters, and progress as namespaced ids ("ice-age/placed")
  world/               BVH collision (static and switchable), props, artifacts, textures, mesh merging
  save/SaveSystem.ts   versioned localStorage saves that survive storage errors
  ui/                  HUD and menus (plain DOM)
  debug/DebugPanel.ts  developer overlay
tests/                 Vitest unit tests for the pure logic
```

## Game loop so far

Rotunda → corridor (lights die as you walk, ~12 s) → fade with chapter card → chapter →
four fragments → conservation table → passage back lights up → rotunda → artifact on its plinth.
Egypt opens once the Venus is on Plinth I. Placing both artifacts plays the ending.
The two chapters are placeholders until steps 5 and 6.

Everything is built from primitives and canvas textures for now; there are no external model files yet.
