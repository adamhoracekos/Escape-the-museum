import * as THREE from 'three';

/** Shared early-CGI material palette (GDD style rule 5: glossy Phong, no PBR). */
export const MAT = {
  wall: new THREE.MeshPhongMaterial({ color: 0xece4d0, shininess: 12 }),
  trim: new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 90, specular: 0x666666 }),
  wood: new THREE.MeshPhongMaterial({ color: 0x6b4428, shininess: 40 }),
  darkWood: new THREE.MeshPhongMaterial({ color: 0x3a2416, shininess: 30 }),
  gold: new THREE.MeshPhongMaterial({ color: 0xe0ac2a, shininess: 120, specular: 0xffeeaa }),
  marble: new THREE.MeshPhongMaterial({ color: 0xe9e4d8, shininess: 70 }),
  crate: new THREE.MeshPhongMaterial({ color: 0x9a7a52, shininess: 8 }),
  cloth: new THREE.MeshPhongMaterial({ color: 0xdedad0, shininess: 5 }),
  metal: new THREE.MeshPhongMaterial({ color: 0x55585e, shininess: 90 }),
  glass: new THREE.MeshPhongMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.18, shininess: 160, specular: 0xffffff, depthWrite: false }),
  terracotta: new THREE.MeshPhongMaterial({ color: 0xb4643a, shininess: 30, flatShading: true, emissive: 0x2a1006 }),
};

export function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Axis-aligned wall from (x1,z1) to (x2,z2), bottom at y0, given height. */
export function wall(x1: number, z1: number, x2: number, z2: number, y0: number, h: number, mat: THREE.Material, t = 0.3): THREE.Mesh {
  const w = Math.max(Math.abs(x2 - x1), t);
  const d = Math.max(Math.abs(z2 - z1), t);
  return box(w, h, d, mat, (x1 + x2) / 2, y0 + h / 2, (z1 + z2) / 2);
}

/** A ceramic fragment: low-poly shard with a faint warm glint so it can be found in the dark. */
export function fragmentMesh(seed: number): THREE.Group {
  const g = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(0.09, 0);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const s = 0.7 + ((Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453) % 1 + 1) % 1 * 0.6;
    p.setXYZ(i, p.getX(i) * s, p.getY(i) * s * 0.6, p.getZ(i) * s);
  }
  geo.computeVertexNormals();
  const shard = new THREE.Mesh(geo, MAT.terracotta);
  shard.castShadow = true;
  const glint = new THREE.PointLight(0xffb070, 0.6, 1.4, 2);
  g.add(shard, glint);
  return g;
}

export function batteryMesh(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.13, 16), new THREE.MeshPhongMaterial({ color: 0x15171c, shininess: 80 }));
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.05, 16), new THREE.MeshPhongMaterial({ color: 0xf2c230, shininess: 80, emissive: 0x3a2a00 }));
  band.position.y = 0.03;
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.015, 8), MAT.metal);
  tip.position.y = 0.072;
  g.add(body, band, tip);
  g.rotation.z = Math.PI / 2;
  g.traverse((o) => ((o as THREE.Mesh).castShadow = true));
  return g;
}

/** Museum bench with a small reading lamp: the checkpoint marker (GDD 6). */
export function benchMesh(): { group: THREE.Group; lamp: THREE.PointLight } {
  const g = new THREE.Group();
  g.add(box(1.6, 0.08, 0.5, MAT.wood, 0, 0.45, 0));
  for (const x of [-0.7, 0.7]) g.add(box(0.08, 0.45, 0.45, MAT.darkWood, x, 0.225, 0));
  const pole = box(0.04, 1.3, 0.04, MAT.metal, 0.95, 0.65, 0);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.18, 16, 1, true), new THREE.MeshPhongMaterial({ color: 0x1d9757, side: THREE.DoubleSide, shininess: 60 }));
  shade.position.set(0.95, 1.33, 0);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff1c0 }));
  bulb.position.set(0.95, 1.27, 0);
  bulb.userData.noCollide = true;
  shade.userData.noCollide = true;
  const lamp = new THREE.PointLight(0xffd9a0, 3, 5, 1.6);
  lamp.position.set(0.95, 1.2, 0);
  g.add(pole, shade, bulb, lamp);
  return { group: g, lamp };
}

export function bustMesh(mat: THREE.Material = MAT.marble): THREE.Group {
  const g = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat);
  torso.scale.set(1.5, 0.9, 0.8);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.2, 12), mat);
  neck.position.y = 0.32;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 16), mat);
  head.scale.set(0.9, 1.12, 1);
  head.position.y = 0.52;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 8), mat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0.51, 0.18);
  g.add(torso, neck, head, nose);
  g.traverse((o) => ((o as THREE.Mesh).castShadow = true));
  return g;
}

/** Something tall under a dust sheet. */
export function coveredStatue(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.45, 1.5, 16), MAT.cloth);
  body.position.y = 0.75;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), MAT.cloth);
  head.position.y = 1.62;
  const drape = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.5, 16, 1, true), MAT.cloth);
  drape.position.y = 0.25;
  g.add(body, head, drape);
  g.traverse((o) => {
    (o as THREE.Mesh).castShadow = true;
    (o as THREE.Mesh).receiveShadow = true;
  });
  return g;
}
