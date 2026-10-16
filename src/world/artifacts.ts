import * as THREE from 'three';
import { MAT } from './props';

// The artifacts of each chapter, assembled from four fragments. Gold seams show where the
// conservator joined the pieces, so the finished object still remembers being broken.

const seamMat = new THREE.MeshPhongMaterial({ color: 0xe8b53a, shininess: 140, specular: 0xfff0b0, emissive: 0x2a1a00 });

function seam(radius: number, y: number, tilt: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.TorusGeometry(radius, radius * 0.045, 6, 40), seamMat);
  m.position.y = y;
  m.rotation.x = Math.PI / 2 + tilt;
  return m;
}

/** Venus of Dolní Věstonice: fired clay, faceless head with four slits, about 30 cm in the case. */
export function venusMesh(): THREE.Group {
  const g = new THREE.Group();
  const clay = new THREE.MeshPhongMaterial({ color: 0x3d2a1f, shininess: 28, specular: 0x2a2018 });
  const profile = [
    [0.001, 0],
    [0.018, 0.004],
    [0.026, 0.04],
    [0.034, 0.08],
    [0.05, 0.115],
    [0.062, 0.135],
    [0.058, 0.155],
    [0.046, 0.175],
    [0.042, 0.2],
    [0.036, 0.225],
    [0.02, 0.238],
    [0.016, 0.245],
    [0.022, 0.255],
    [0.024, 0.275],
    [0.016, 0.292],
    [0.001, 0.298],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 32), clay);
  body.scale.z = 0.78;
  g.add(body);

  // Belly and breasts, the parts a lathe cannot make.
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.04, 20, 14), clay);
  belly.scale.set(1.15, 0.9, 0.85);
  belly.position.set(0, 0.14, 0.022);
  g.add(belly);
  for (const s of [-1, 1]) {
    const breast = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 12), clay);
    breast.scale.set(0.9, 1.5, 0.9);
    breast.position.set(s * 0.019, 0.188, 0.03);
    breast.rotation.x = 0.25;
    g.add(breast);
  }
  // Arms folded along the sides.
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.06, 4, 8), clay);
    arm.position.set(s * 0.04, 0.2, 0.004);
    arm.rotation.z = s * 0.35;
    g.add(arm);
  }
  // Four slits across the head where a face would be.
  const slitMat = new THREE.MeshBasicMaterial({ color: 0x0a0605 });
  for (let i = 0; i < 4; i++) {
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.0025, 0.004), slitMat);
    const a = (i - 1.5) * 0.36;
    slit.position.set(Math.sin(a) * 0.017, 0.278 - Math.abs(i - 1.5) * 0.002, Math.cos(a) * 0.016);
    slit.rotation.y = a;
    g.add(slit);
  }
  const seams = new THREE.Group();
  seams.add(seam(0.047, 0.1, 0.12), seam(0.05, 0.163, -0.12), seam(0.02, 0.243, 0.05));
  seams.scale.z = 0.8;
  g.add(seams);
  g.traverse((o) => ((o as THREE.Mesh).castShadow = true));
  return g;
}

/** Heart scarab: green stone beetle on an inscribed oval base. */
export function scarabMesh(): THREE.Group {
  const g = new THREE.Group();
  const stone = new THREE.MeshPhongMaterial({ color: 0x1e4b3b, shininess: 110, specular: 0x6a8a7a });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.03, 40), stone);
  base.scale.z = 1.4;
  base.position.y = 0.015;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.004, 6, 48), MAT.gold);
  rim.scale.y = 1.4;
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.03;
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.07, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), stone);
  body.scale.set(0.95, 0.75, 1.25);
  body.position.set(0, 0.03, -0.012);
  const thorax = new THREE.Mesh(new THREE.SphereGeometry(0.045, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), stone);
  thorax.scale.set(1.25, 0.8, 0.7);
  thorax.position.set(0, 0.03, 0.07);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.028, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), stone);
  head.scale.set(1.5, 0.6, 0.9);
  head.position.set(0, 0.03, 0.105);
  const groove = new THREE.MeshBasicMaterial({ color: 0x0b1a14 });
  const split = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.004, 0.12), groove);
  split.position.set(0, 0.083, -0.015);
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.002, 4, 32, Math.PI), groove);
  collar.rotation.x = -Math.PI / 2;
  collar.scale.set(1, 0.55, 1);
  collar.position.set(0, 0.07, 0.048);
  collar.rotation.z = Math.PI;
  g.add(base, rim, body, thorax, head, split, collar);
  g.add(seam(0.071, 0.05, 0.5), seam(0.05, 0.045, -0.4));
  g.scale.setScalar(1.6);
  g.traverse((o) => ((o as THREE.Mesh).castShadow = true));
  return g;
}

export function artifactMesh(chapterId: string): THREE.Group {
  return chapterId === 'egypt' ? scarabMesh() : venusMesh();
}
