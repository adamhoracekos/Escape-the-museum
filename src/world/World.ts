import * as THREE from 'three';
import { MeshBVH, acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from 'three-mesh-bvh';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Surface } from '../config';

// Every Mesh raycast in the game goes through the BVH when one is present.
THREE.Mesh.prototype.raycast = acceleratedRaycast;
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

declare module 'three' {
  interface BufferGeometry {
    boundsTree?: MeshBVH;
    computeBoundsTree: typeof computeBoundsTree;
    disposeBoundsTree: typeof disposeBoundsTree;
  }
}

export interface SurfaceZone {
  box: THREE.Box3;
  surface: Surface;
}

/** Bakes every solid mesh under `roots` into one world-space geometry with a BVH. */
function bakeCollider(roots: THREE.Object3D[]): THREE.BufferGeometry {
  const geos: THREE.BufferGeometry[] = [];
  for (const root of roots) {
    root.updateWorldMatrix(true, true);
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || m.userData.noCollide) return;
      let g = m.geometry.clone();
      for (const name of Object.keys(g.attributes)) if (name !== 'position') g.deleteAttribute(name);
      if (g.index) g = g.toNonIndexed();
      g.applyMatrix4(m.matrixWorld);
      geos.push(g);
    });
  }
  const merged = geos.length ? mergeGeometries(geos, false) : new THREE.BufferGeometry();
  geos.forEach((g) => g.dispose());
  merged.boundsTree = new MeshBVH(merged);
  return merged;
}

/** A collider that can be switched off, e.g. a gate that opens or a rope that is taken down. */
export class DynamicCollider {
  enabled = true;
  constructor(readonly bvh: MeshBVH) {}
}

/**
 * Collision for a level: every static solid mesh is baked into one BVH.
 * Rendering keeps the original meshes; only the collider is merged.
 * Objects that must stop blocking later are added with `addDynamic`, not as solids.
 */
export class World {
  readonly collider: THREE.Mesh;
  readonly surfaces: SurfaceZone[];
  private defaultSurface: Surface;
  private dynamics: DynamicCollider[] = [];

  constructor(solids: THREE.Object3D[], surfaces: SurfaceZone[] = [], defaultSurface: Surface = 'tile') {
    const merged = bakeCollider(solids);
    this.collider = new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ wireframe: true, color: 0x3bd16f }));
    this.collider.visible = false;
    this.surfaces = surfaces;
    this.defaultSurface = defaultSurface;
  }

  get bvh(): MeshBVH {
    return this.collider.geometry.boundsTree!;
  }

  /** The static BVH plus every dynamic collider that is currently enabled. */
  get colliders(): MeshBVH[] {
    const out = [this.bvh];
    for (const d of this.dynamics) if (d.enabled) out.push(d.bvh);
    return out;
  }

  addDynamic(objects: THREE.Object3D[]): DynamicCollider {
    const d = new DynamicCollider(bakeCollider(objects).boundsTree!);
    this.dynamics.push(d);
    return d;
  }

  surfaceAt(p: THREE.Vector3): Surface {
    for (const z of this.surfaces) if (z.box.containsPoint(p)) return z.surface;
    return this.defaultSurface;
  }

  /** Distance to the first solid hit along a ray, or Infinity. Used for line-of-sight checks. */
  rayDistance(origin: THREE.Vector3, dir: THREE.Vector3, far: number): number {
    const ray = new THREE.Ray(origin, dir);
    let best = Infinity;
    for (const bvh of this.colliders) {
      const hit = bvh.raycastFirst(ray, THREE.DoubleSide);
      if (hit && hit.distance <= far && hit.distance < best) best = hit.distance;
    }
    return best;
  }
}
