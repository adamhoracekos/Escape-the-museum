import * as THREE from 'three';
import type { ExtendedTriangle, MeshBVH } from 'three-mesh-bvh';
import type { World } from '../world/World';

export interface NavOptions {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Cell size in metres. */
  cell?: number;
  /** Clearance the walker needs around its centre line. */
  radius?: number;
  height?: number;
  /** Floor rays start here and go down. Keep it under the ceilings. */
  probeY?: number;
  /** Largest height step between neighbouring cells (ramps and stairs pass, crate tops do not). */
  maxStep?: number;
}

const DOWN = new THREE.Vector3(0, -1, 0);
const NEIGHBOURS = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2],
] as const;

/**
 * Walkable grid baked from the collision world, with A* and string pulling.
 * A cell is walkable when a downward ray finds floor and a capsule of the walker's size fits there.
 * Every path it returns runs over walkable cells only, so walkers can follow it without their own collision.
 */
export class NavGrid {
  readonly cell: number;
  readonly cols: number;
  readonly rows: number;
  /** Floor height per cell, NaN where nothing can stand. */
  readonly floor: Float32Array;
  /** Connected component per cell, -1 when not walkable. */
  readonly component: Int32Array;
  private minX: number;
  private minZ: number;
  private maxStep: number;

  constructor(world: World, o: NavOptions) {
    this.cell = o.cell ?? 0.5;
    this.minX = o.minX;
    this.minZ = o.minZ;
    this.cols = Math.ceil((o.maxX - o.minX) / this.cell);
    this.rows = Math.ceil((o.maxZ - o.minZ) / this.cell);
    this.maxStep = o.maxStep ?? 0.35;
    const radius = o.radius ?? 0.4;
    const height = o.height ?? 1.9;
    const probeY = o.probeY ?? 3.8;
    this.floor = new Float32Array(this.cols * this.rows).fill(NaN);
    this.component = new Int32Array(this.cols * this.rows).fill(-1);

    const origin = new THREE.Vector3();
    for (let j = 0; j < this.rows; j++) {
      for (let i = 0; i < this.cols; i++) {
        const c = this.centre(i, j);
        origin.set(c.x, probeY, c.z);
        const d = world.rayDistance(origin, DOWN, probeY + 2);
        if (!Number.isFinite(d)) continue;
        const y = probeY - d;
        if (capsuleBlocked(world.colliders, c.x, y, c.z, radius, height)) continue;
        this.floor[j * this.cols + i] = y;
      }
    }
    this.labelComponents();
  }

  index(i: number, j: number): number {
    return j * this.cols + i;
  }

  centre(i: number, j: number): { x: number; z: number } {
    return { x: this.minX + (i + 0.5) * this.cell, z: this.minZ + (j + 0.5) * this.cell };
  }

  cellOf(x: number, z: number): [number, number] {
    return [Math.floor((x - this.minX) / this.cell), Math.floor((z - this.minZ) / this.cell)];
  }

  inside(i: number, j: number): boolean {
    return i >= 0 && j >= 0 && i < this.cols && j < this.rows;
  }

  walkable(i: number, j: number): boolean {
    return this.inside(i, j) && !Number.isNaN(this.floor[this.index(i, j)]);
  }

  /** Floor height under a point, or NaN when it is not walkable. */
  heightAt(x: number, z: number): number {
    const [i, j] = this.cellOf(x, z);
    return this.inside(i, j) ? this.floor[this.index(i, j)] : NaN;
  }

  componentAt(x: number, z: number): number {
    const [i, j] = this.cellOf(x, z);
    return this.inside(i, j) ? this.component[this.index(i, j)] : -1;
  }

  private stepOk(a: number, b: number): boolean {
    return Math.abs(this.floor[a] - this.floor[b]) <= this.maxStep;
  }

  private labelComponents(): void {
    let next = 0;
    const stack: number[] = [];
    for (let start = 0; start < this.floor.length; start++) {
      if (Number.isNaN(this.floor[start]) || this.component[start] >= 0) continue;
      this.component[start] = next;
      stack.push(start);
      while (stack.length) {
        const cur = stack.pop()!;
        const ci = cur % this.cols;
        const cj = (cur - ci) / this.cols;
        for (const [di, dj] of NEIGHBOURS) {
          const ni = ci + di;
          const nj = cj + dj;
          if (!this.canStep(ci, cj, ni, nj)) continue;
          const n = this.index(ni, nj);
          if (this.component[n] >= 0) continue;
          this.component[n] = next;
          stack.push(n);
        }
      }
      next++;
    }
  }

  /** Neighbour step: walkable, small height change, and no cutting corners past a wall. */
  private canStep(ci: number, cj: number, ni: number, nj: number): boolean {
    if (!this.walkable(ni, nj)) return false;
    if (!this.stepOk(this.index(ci, cj), this.index(ni, nj))) return false;
    if (ni !== ci && nj !== cj) return this.walkable(ni, cj) && this.walkable(ci, nj);
    return true;
  }

  /** Nearest walkable cell centre in the given component, searching outwards ring by ring. */
  nearest(x: number, z: number, component = -1, maxRings = 12): THREE.Vector3 | null {
    const [ci, cj] = this.cellOf(x, z);
    for (let r = 0; r <= maxRings; r++) {
      let best: THREE.Vector3 | null = null;
      let bestD = Infinity;
      for (let j = cj - r; j <= cj + r; j++) {
        for (let i = ci - r; i <= ci + r; i++) {
          if (Math.max(Math.abs(i - ci), Math.abs(j - cj)) !== r || !this.walkable(i, j)) continue;
          const k = this.index(i, j);
          if (component >= 0 && this.component[k] !== component) continue;
          const c = this.centre(i, j);
          const d = (c.x - x) ** 2 + (c.z - z) ** 2;
          if (d < bestD) {
            bestD = d;
            best = new THREE.Vector3(c.x, this.floor[k], c.z);
          }
        }
      }
      if (best) return best;
    }
    return null;
  }

  /** Can a walker go straight from a to b? Samples the segment densely enough to catch one-cell gaps. */
  lineClear(ax: number, az: number, bx: number, bz: number): boolean {
    const len = Math.hypot(bx - ax, bz - az);
    const n = Math.max(1, Math.ceil(len / (this.cell * 0.25)));
    let [pi, pj] = this.cellOf(ax, az);
    if (!this.walkable(pi, pj)) return false;
    for (let s = 1; s <= n; s++) {
      const t = s / n;
      const [i, j] = this.cellOf(ax + (bx - ax) * t, az + (bz - az) * t);
      if (i === pi && j === pj) continue;
      if (!this.walkable(i, j)) return false;
      if (!this.stepOk(this.index(pi, pj), this.index(i, j))) return false;
      // A diagonal move between two cells must not squeeze past a blocked corner.
      if (i !== pi && j !== pj && (!this.walkable(i, pj) || !this.walkable(pi, j))) return false;
      pi = i;
      pj = j;
    }
    return true;
  }

  /** A* from a to b over walkable cells, then shortened with straight segments. Null when unreachable. */
  findPath(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3[] | null {
    const start = this.nearest(from.x, from.z);
    if (!start) return null;
    const comp = this.componentAt(start.x, start.z);
    const goal = this.nearest(to.x, to.z, comp);
    if (!goal) return null;
    const [si, sj] = this.cellOf(start.x, start.z);
    const [gi, gj] = this.cellOf(goal.x, goal.z);
    const s = this.index(si, sj);
    const g = this.index(gi, gj);

    const total = this.floor.length;
    const cost = new Float32Array(total).fill(Infinity);
    const came = new Int32Array(total).fill(-1);
    const closed = new Uint8Array(total);
    const heap = new MinHeap();
    cost[s] = 0;
    heap.push(s, 0);
    const h = (i: number, j: number) => {
      const dx = Math.abs(i - gi);
      const dz = Math.abs(j - gj);
      return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
    };
    while (heap.size) {
      const cur = heap.pop();
      if (cur === g) break;
      if (closed[cur]) continue;
      closed[cur] = 1;
      const ci = cur % this.cols;
      const cj = (cur - ci) / this.cols;
      for (const [di, dj, w] of NEIGHBOURS) {
        const ni = ci + di;
        const nj = cj + dj;
        if (!this.canStep(ci, cj, ni, nj)) continue;
        const n = this.index(ni, nj);
        const c = cost[cur] + w;
        if (c < cost[n]) {
          cost[n] = c;
          came[n] = cur;
          heap.push(n, c + h(ni, nj));
        }
      }
    }
    if (s !== g && came[g] < 0) return null;

    const cells: THREE.Vector3[] = [];
    for (let k = g; k >= 0; k = k === s ? -1 : came[k]) {
      const i = k % this.cols;
      const c = this.centre(i, (k - i) / this.cols);
      cells.push(new THREE.Vector3(c.x, this.floor[k], c.z));
    }
    cells.reverse();
    // The exact target, when it is itself reachable, beats its cell centre.
    const exact = this.componentAt(to.x, to.z) === comp && this.lineClear(goal.x, goal.z, to.x, to.z);
    if (exact) cells[cells.length - 1] = new THREE.Vector3(to.x, this.heightAt(to.x, to.z), to.z);
    return this.smooth(from, cells);
  }

  /** String pulling: from each corner, jump to the farthest later point still in straight view. */
  private smooth(from: THREE.Vector3, cells: THREE.Vector3[]): THREE.Vector3[] {
    const out: THREE.Vector3[] = [];
    let ax = from.x;
    let az = from.z;
    let k = 0;
    while (k < cells.length) {
      let far = k;
      for (let m = cells.length - 1; m > k; m--) {
        if (this.lineClear(ax, az, cells[m].x, cells[m].z)) {
          far = m;
          break;
        }
      }
      out.push(cells[far]);
      ax = cells[far].x;
      az = cells[far].z;
      k = far + 1;
    }
    return out;
  }

  /** A random reachable point within `radius` of p, in the same component as `near`. */
  randomPoint(p: THREE.Vector3, radius: number, rng: () => number, component: number): THREE.Vector3 | null {
    for (let tries = 0; tries < 24; tries++) {
      const a = rng() * Math.PI * 2;
      const r = Math.sqrt(rng()) * radius;
      const q = this.nearest(p.x + Math.sin(a) * r, p.z + Math.cos(a) * r, component, 2);
      if (q) return q;
    }
    return null;
  }
}

/** Does a vertical capsule standing at (x, y, z) touch any solid? */
function capsuleBlocked(colliders: MeshBVH[], x: number, y: number, z: number, r: number, height: number): boolean {
  // Lift the bottom a little so the floor itself (and gentle ramps) do not count.
  const seg = new THREE.Line3(new THREE.Vector3(x, y + r + 0.12, z), new THREE.Vector3(x, y + height - r, z));
  const box = new THREE.Box3().setFromPoints([seg.start, seg.end]).expandByScalar(r);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  for (const bvh of colliders) {
    let hit = false;
    bvh.shapecast({
      intersectsBounds: (bb) => bb.intersectsBox(box),
      intersectsTriangle: (tri: ExtendedTriangle) => {
        hit = tri.closestPointToSegment(seg, a, b) < r;
        return hit;
      },
    });
    if (hit) return true;
  }
  return false;
}

class MinHeap {
  private ids: number[] = [];
  private keys: number[] = [];

  get size(): number {
    return this.ids.length;
  }

  push(id: number, key: number): void {
    this.ids.push(id);
    this.keys.push(key);
    let i = this.ids.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.keys[p] <= this.keys[i]) break;
      this.swap(i, p);
      i = p;
    }
  }

  pop(): number {
    const top = this.ids[0];
    const lastId = this.ids.pop()!;
    const lastKey = this.keys.pop()!;
    if (this.ids.length) {
      this.ids[0] = lastId;
      this.keys[0] = lastKey;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < this.ids.length && this.keys[l] < this.keys[m]) m = l;
        if (r < this.ids.length && this.keys[r] < this.keys[m]) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }

  private swap(a: number, b: number): void {
    [this.ids[a], this.ids[b]] = [this.ids[b], this.ids[a]];
    [this.keys[a], this.keys[b]] = [this.keys[b], this.keys[a]];
  }
}
