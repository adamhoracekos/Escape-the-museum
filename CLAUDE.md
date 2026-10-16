# Notes for Claude

- Stack: three.js 0.170 + three-mesh-bvh, TypeScript, Vite, Vitest. Node 22.
- Before pushing: `npm run typecheck && npm test && npx vite build`.
- Gameplay numbers live in `src/config.ts` and come from the design document (GDD v0.1). Change them there, not inline.
- Player-facing text is English. Style: Utopian Scholastic labels ("Fig. N: ...") with black outlines and primary colours.
- Progress is a set of namespaced ids in `src/progress/Progress.ts`: `<level>/fragment-N`, `<level>/battery-N`, `<chapter>/assembled`, `<chapter>/placed`. Changing the scheme means bumping `SAVE_VERSION`.
- Static level geometry goes through `mergeStatic` to stay under the draw-call budget; mark anything animated, toggled or used as a look/interact target with `userData.dynamic = true` so it is not merged away.
- Things that must stop blocking later (gates, ropes) use `World.addDynamic`, not the static solids list.
- Levels implement `src/levels/Level.ts`; solid meshes go into `World` for collision, decorative ones get `userData.noCollide = true`.
- `window.game` is exposed only in dev builds for browser-driven tests. For deterministic tests stop the loop (`renderer.setAnimationLoop(null)`), stub `clock.getDelta` and call `game.frame()`.
- Enemies: decisions live in `HunterBrain` (pure, unit-tested); the `Hunter` body senses, walks a `NavGrid` and animates. Levels list them in `Level.enemies` and reset them in `onRespawn`. A `NavGrid` probe height must sit under every lintel the enemy should pass.
- The test room never writes the save (`Game.save` skips it), so the title-screen "Hunter test room" cannot clobber a real run.
