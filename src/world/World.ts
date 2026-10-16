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

/**
 * Static collision for a level: every solid mesh is baked into one BVH.
 * Rendering keeps the original meshes; only the collider is merged.
 */
export class World {
  readonly collider: THREE.Mesh;
  readonly surfaces: SurfaceZone[];
  private defaultSurface: Surface;

  constructor(solids: THREE.Object3D[], surfaces: SurfaceZone[] = [], defaultSurface: Surface = 'tile') {
    const geos: THREE.BufferGeometry[] = [];
    for (const root of solids) {
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
    this.collider = new THREE.Mesh(merged, new THREE.MeshBasicMaterial({ wireframe: true, color: 0x3bd16f }));
    this.collider.visible = false;
    this.surfaces = surfaces;
    this.defaultSurface = defaultSurface;
  }

  get bvh(): MeshBVH {
    return this.collider.geometry.boundsTree!;
  }

  surfaceAt(p: THREE.Vector3): Surface {
    for (const z of this.surfaces) if (z.box.containsPoint(p)) return z.surface;
    return this.defaultSurface;
  }

  /** Distance to the first solid hit along a ray, or Infinity. Used for line-of-sight checks. */
  rayDistance(origin: THREE.Vector3, dir: THREE.Vector3, far: number): number {
    const hit = this.bvh.raycastFirst(new THREE.Ray(origin, dir), THREE.DoubleSide);
    return hit && hit.distance <= far ? hit.distance : Infinity;
  }
}
