import { NOISE, SURFACE_NOISE, type Surface } from '../config';

export type MoveMode = 'idle' | 'crouch' | 'walk' | 'sprint';

/** Radius in metres within which enemies hear the player this frame (GDD 3). */
export function noiseRadius(mode: MoveMode, surface: Surface): number {
  return NOISE[mode] * SURFACE_NOISE[surface];
}
