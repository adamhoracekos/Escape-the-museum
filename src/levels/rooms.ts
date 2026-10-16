import * as THREE from 'three';
import { box } from '../world/props';

export interface Gap {
  /** Centre of the opening along the wall. */
  at: number;
  width: number;
  /** Height of the opening; the wall continues above it as a lintel. */
  height: number;
}

/**
 * A straight wall with openings. `axis: 'x'` runs along x at z = `fixed`; `axis: 'z'` runs along z at x = `fixed`.
 * Returns the pieces (wall segments and lintels) so callers can add them to their static group.
 */
export function wallWithGaps(axis: 'x' | 'z', fixed: number, from: number, to: number, h: number, mat: THREE.Material, gaps: Gap[] = [], t = 0.3): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  const seg = (a: number, b: number, y0: number, y1: number) => {
    if (b - a < 0.01 || y1 - y0 < 0.01) return;
    const mid = (a + b) / 2;
    const m = axis === 'x' ? box(b - a, y1 - y0, t, mat, mid, (y0 + y1) / 2, fixed) : box(t, y1 - y0, b - a, mat, fixed, (y0 + y1) / 2, mid);
    out.push(m);
  };
  const sorted = [...gaps].sort((a, b) => a.at - b.at);
  let cursor = from;
  for (const g of sorted) {
    const a = g.at - g.width / 2;
    const b = g.at + g.width / 2;
    seg(cursor, a, 0, h);
    seg(a, b, g.height, h);
    cursor = b;
  }
  seg(cursor, to, 0, h);
  return out;
}

export interface RoomSpec {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  h: number;
  floor: THREE.Material;
  wall: THREE.Material;
  ceiling: THREE.Material;
  /** Openings per side: n is z = z0, s is z = z1, w is x = x0, e is x = x1. */
  gaps?: Partial<Record<'n' | 's' | 'w' | 'e', Gap[]>>;
  /** Sides another room already built (shared walls must not be built twice). */
  skip?: ('n' | 's' | 'w' | 'e')[];
  /** Scale of the floor texture: metres per repeat. */
  tile?: number;
}

/** Floor, ceiling and the four walls of an axis-aligned room. */
export function room(r: RoomSpec): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  const w = r.x1 - r.x0;
  const d = r.z1 - r.z0;
  const cx = (r.x0 + r.x1) / 2;
  const cz = (r.z0 + r.z1) / 2;
  const floor = box(w, 0.2, d, r.floor, cx, -0.1, cz);
  floor.castShadow = false;
  // Each room gets its own UV scale so tiles stay square whatever the room size.
  const tile = r.tile ?? 1.2;
  const uv = floor.geometry.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / tile), uv.getY(i) * (d / tile));
  out.push(floor);
  const ceil = box(w + 0.3, 0.2, d + 0.3, r.ceiling, cx, r.h + 0.1, cz);
  ceil.castShadow = false;
  out.push(ceil);
  const skip = new Set(r.skip ?? []);
  const g = r.gaps ?? {};
  if (!skip.has('n')) out.push(...wallWithGaps('x', r.z0, r.x0 - 0.15, r.x1 + 0.15, r.h, r.wall, g.n));
  if (!skip.has('s')) out.push(...wallWithGaps('x', r.z1, r.x0 - 0.15, r.x1 + 0.15, r.h, r.wall, g.s));
  if (!skip.has('w')) out.push(...wallWithGaps('z', r.x0, r.z0 + 0.15, r.z1 - 0.15, r.h, r.wall, g.w));
  if (!skip.has('e')) out.push(...wallWithGaps('z', r.x1, r.z0 + 0.15, r.z1 - 0.15, r.h, r.wall, g.e));
  return out;
}
