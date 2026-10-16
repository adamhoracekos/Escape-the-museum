/**
 * Geometry helpers for corridors that leave the round rotunda radially.
 * A corridor at `angle` points along (sin angle, 0, cos angle), the same convention
 * as three.js cylinders, so a corridor group rotated by `angle` around Y has local +Z outward.
 */

export interface CorridorCoords {
  /** Distance walked into the corridor, measured from its mouth. Negative inside the rotunda. */
  along: number;
  /** Sideways offset from the corridor's centre line. */
  lateral: number;
}

export function corridorCoords(x: number, z: number, angle: number, mouth: number): CorridorCoords {
  const dx = Math.sin(angle);
  const dz = Math.cos(angle);
  return { along: x * dx + z * dz - mouth, lateral: x * dz - z * dx };
}

/** 0 at the mouth, 1 at the far end, clamped. Only meaningful while inside the corridor. */
export function corridorProgress(c: CorridorCoords, length: number, halfWidth: number): number {
  if (Math.abs(c.lateral) > halfWidth + 0.5 || c.along < 0) return 0;
  return Math.min(1, c.along / length);
}

/**
 * Ceiling panels die from the far end towards the rotunda as the player walks in,
 * so the dark is always ahead and, past the middle, behind as well (GDD 9).
 * `panel` is the panel's own position along the corridor, 0..1.
 */
export function panelLit(panel: number, progress: number): boolean {
  return panel < 0.8 - progress;
}

/** How dark the whole scene gets: none near the mouth, full black near the end. */
export function corridorDarkness(progress: number): number {
  const t = Math.min(1, Math.max(0, (progress - 0.12) / (0.72 - 0.12)));
  return t * t * (3 - 2 * t);
}

/** Yaw that makes a first-person camera at (x, z) look at the origin. */
export function yawToCentre(x: number, z: number): number {
  return Math.atan2(x, z);
}
