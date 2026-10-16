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
| E | Interact, hide in a cabinet, leave it |
| Esc | Pause |
| ` | Debug panel (K = simulate being caught, V = show collision mesh, 1/2/3/0 = jump to rotunda / Ice Age / Egypt / test room, N = all fragments here) |

## Layout

```
src/
  config.ts            all gameplay numbers from the design document
  core/Game.ts         game states, level switching, fade transitions, checkpoints, ending
  core/Input.ts        keyboard, mouse, pointer lock with drag-to-look fallback
  player/              capsule controller, stamina, battery, flashlight, noise, hiding
  enemy/               nav grid (A* over the collision world), hunter state machine, hunter body and rig
  audio/Sfx.ts         synthesised cues for enemy states, steps, doors, the camera shutter
  interaction/         look raycast for interactables and "Fig. N" labels
  levels/Rotunda.ts    the safe hub: dome, orrery, plinths, doorways and dark corridors
  levels/ChapterStub.ts placeholder chapter (arrive, 4 fragments, assemble, way back)
  levels/iceAge/       Chapter I: layout, puzzles, finale (IceAge.ts), props, fact posters
  levels/rooms.ts      axis-aligned rooms and walls with door openings
  levels/registry.ts   every loadable level by id
  levels/TestRoom.ts   greybox with one hunter and three cabinets ("Hunter test room" on the title screen)
  levels/hiding.ts     hiding cabinets
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
The Ice Age is a real level since step 5; Egypt is still a placeholder until step 6.

## The hunter (step 4)

One Ice Age hunter patrols the storage gallery of the test room. It runs the shared machine from GDD 7.1:
patrol → suspicion (stops, turns its head, then walks over) → chase → search (20 s, checks nearby cabinets
without opening them) → return. It sees in a 90° cone up to 14 m, hears the player's noise radius, and does
not move or think while the flashlight is on it. It opens a cabinet only if it saw you get in, or after you
have been inside for 30 s. Every state change has a sound; during a chase the lamps stutter.
The decision logic (`enemy/HunterBrain.ts`) has no scene and is covered by unit tests.

## Chapter I: The Ice Age (step 5)

Six zones from GDD 8.1, about 50 × 50 m:

| Zone | What happens | Fragment |
|---|---|---|
| Z0 start | conservation table, way back west, staff door east (shortcut) | |
| Z1 ice cores | order four cores by layer thickness; a hunter behind glass steps closer while unlit | 1 (freezer) |
| Z2 diorama | two patrolling hunters, three loose mammoth bones in the snow, two cabinets | |
| Z3 mammoth hall | fit the bones; the skull turns, the north gate opens, the diorama hunters are let in | 2 |
| Z4 ice lab | turn three mirrors to bring the heat lamp's beam to the ice block; a guard in the dark corner | 3 |
| Z5 cave | taking the last fragment kills the light and wakes three hunters; the shortcut gate opens | 4 |

The finale runs back through a service tunnel to the staff door, which slams behind you in Z0.
Progress ids beyond the usual ones: `ice-age/cores`, `ice-age/skeleton`, `ice-age/beam`,
`ice-age/bone-<tusk|femur|scapula>`, `ice-age/placed-<tusk|femur|scapula>`.

Everything is built from primitives and canvas textures for now; there are no external model files yet.
