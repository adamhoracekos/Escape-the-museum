# Notes for Claude

- Stack: three.js 0.170 + three-mesh-bvh, TypeScript, Vite, Vitest. Node 22.
- Before pushing: `npm run typecheck && npm test && npx vite build`.
- Gameplay numbers live in `src/config.ts` and come from the design document (GDD v0.1). Change them there, not inline.
- Player-facing text is English. Style: Utopian Scholastic labels ("Fig. N: ...") with black outlines and primary colours.
- Pickup ids that count as artifact fragments must contain the word `fragment` (see `Game.fragmentsCollected`).
- Levels implement `src/levels/Level.ts`; solid meshes go into `World` for collision, decorative ones get `userData.noCollide = true`.
- `window.game` is exposed only in dev builds for browser-driven tests.
