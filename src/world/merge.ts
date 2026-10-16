import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Merges every static mesh under `root` that shares a material into one mesh, to keep
 * draw calls inside the budget (GDD 12: under 150 per scene). Meshes marked
 * `userData.dynamic` (animated, swapped or toggled later) are left alone.
 * Collision flags survive: meshes are only merged with others of the same `noCollide`.
 */
export function mergeStatic(root: THREE.Object3D): THREE.Group {
  root.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map<string, { mat: THREE.Material; noCollide: boolean; cast: boolean; recv: boolean; geos: THREE.BufferGeometry[] }>();
  const remove: THREE.Mesh[] = [];

  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || Array.isArray(m.material)) return;
    for (let p: THREE.Object3D | null = m; p && p !== root; p = p.parent) if (p.userData.dynamic) return;
    const key = `${m.material.uuid}|${!!m.userData.noCollide}|${m.castShadow}|${m.receiveShadow}`;
    let b = buckets.get(key);
    if (!b) {
      b = { mat: m.material, noCollide: !!m.userData.noCollide, cast: m.castShadow, recv: m.receiveShadow, geos: [] };
      buckets.set(key, b);
    }
    let g = m.geometry.clone();
    if (g.index) g = g.toNonIndexed();
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    b.geos.push(g);
    remove.push(m);
  });

  for (const m of remove) m.parent?.remove(m);
  const out = new THREE.Group();
  for (const b of buckets.values()) {
    if (b.geos.length === 0) continue;
    const merged = mergeGeometries(b.geos, false);
    b.geos.forEach((g) => g.dispose());
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, b.mat);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = b.recv;
    mesh.userData.noCollide = b.noCollide;
    out.add(mesh);
  }
  root.add(out);
  return out;
}
