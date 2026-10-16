import * as THREE from 'three';
import { MAT } from '../../world/props';
import { mergeStatic } from '../../world/merge';
import { canvasTexture } from '../../world/textures';

interface PlanetSpec {
  name: string;
  orbit: number;
  size: number;
  /** Orbital period in Earth years; the model compresses these so the outer planets still move. */
  period: number;
  map: () => THREE.Texture | null;
  color: number;
  ring?: { inner: number; outer: number; color: number; tilt: number };
}

function banded(colors: string[], spots = false): THREE.Texture {
  return canvasTexture(256, 128, (g, w, h) => {
    const band = h / colors.length;
    colors.forEach((c, i) => {
      g.fillStyle = c;
      g.fillRect(0, i * band, w, band + 1);
    });
    if (spots) {
      g.fillStyle = '#b5523b';
      g.beginPath();
      g.ellipse(w * 0.62, h * 0.62, 18, 9, 0, 0, Math.PI * 2);
      g.fill();
    }
  });
}

function earthMap(): THREE.Texture {
  return canvasTexture(256, 128, (g, w, h) => {
    g.fillStyle = '#1f4fd1';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#1d9757';
    // Hand-placed blobs, deterministic so every build looks the same.
    const blobs = [
      [40, 40, 26, 18], [62, 78, 14, 24], [128, 44, 30, 16], [140, 80, 18, 22], [196, 52, 26, 20], [210, 96, 16, 10], [96, 30, 10, 8],
    ];
    for (const [x, y, rx, ry] of blobs) {
      g.beginPath();
      g.ellipse(x, y, rx, ry, 0.4, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#fbfaf6';
    g.fillRect(0, 0, w, 7);
    g.fillRect(0, h - 7, w, 7);
  });
}

const PLANETS: PlanetSpec[] = [
  { name: 'Mercury', orbit: 0.75, size: 0.06, period: 0.24, map: () => null, color: 0xa8a39a },
  { name: 'Venus', orbit: 1.05, size: 0.1, period: 0.62, map: () => null, color: 0xe8c48a },
  { name: 'Earth', orbit: 1.4, size: 0.11, period: 1, map: earthMap, color: 0xffffff },
  { name: 'Mars', orbit: 1.75, size: 0.08, period: 1.88, map: () => null, color: 0xd0583a },
  { name: 'Jupiter', orbit: 2.25, size: 0.25, period: 11.9, map: () => banded(['#d9b38c', '#b88a5e', '#ead2b0', '#a8774f', '#e6c9a0', '#c49a6c', '#ead2b0'], true), color: 0xffffff },
  { name: 'Saturn', orbit: 2.8, size: 0.2, period: 29.5, map: () => banded(['#e8d2a6', '#d4b77f', '#efe0bd', '#cfae74', '#e8d2a6']), color: 0xffffff, ring: { inner: 0.27, outer: 0.44, color: 0xe2cd9c, tilt: 1.15 } },
  { name: 'Uranus', orbit: 3.25, size: 0.14, period: 84, map: () => null, color: 0x9fd8e0, ring: { inner: 0.19, outer: 0.22, color: 0xbfe6ea, tilt: 0.15 } },
  { name: 'Neptune', orbit: 3.65, size: 0.135, period: 165, map: () => null, color: 0x3c63d6 },
];

export interface Orrery {
  group: THREE.Group;
  /** speed: 1 forwards, -1 backwards. dark: 0..1 how far the rotunda has gone out. */
  update(dt: number, speed: number, dark: number): void;
}

/**
 * Brass orrery with all eight planets, the Moon around the Earth, Saturn's and Uranus's rings,
 * and a geared drum on a wooden plinth. Only the plinth collides; the arms swing over your head.
 */
export function createOrrery(): Orrery {
  const group = new THREE.Group();
  const wood = new THREE.MeshPhongMaterial({ color: 0x4a2c18, shininess: 50 });
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.6, 40), wood);
  plinth.position.y = 0.3;
  plinth.castShadow = plinth.receiveShadow = true;
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.55, 40), MAT.gold);
  drum.position.y = 0.875;
  drum.castShadow = true;
  group.add(plinth, drum);

  const moving = new THREE.Group();
  moving.userData.noCollide = true;
  group.add(moving);

  // Gear ring around the drum, turning with the planets.
  const gear = new THREE.Group();
  gear.position.y = 1.16;
  const teeth = 36;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.035, 8, 64), MAT.gold);
  rim.rotation.x = Math.PI / 2;
  gear.add(rim);
  const toothGeo = new THREE.BoxGeometry(0.05, 0.06, 0.07);
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2;
    const t = new THREE.Mesh(toothGeo, MAT.gold);
    t.position.set(Math.sin(a) * 0.66, 0, Math.cos(a) * 0.66);
    t.rotation.y = a;
    gear.add(t);
  }
  mergeStatic(gear);
  moving.add(gear);
  const orbits = new THREE.Group();
  moving.add(orbits);

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.4, 12), MAT.gold);
  post.position.y = 1.85;
  moving.add(post);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffc42e });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(0.38, 32, 16), sunMat);
  sun.position.y = 2.55;
  const corona = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.012, 6, 64), MAT.gold);
  corona.position.y = 2.55;
  corona.rotation.x = Math.PI / 2;
  const glow = new THREE.PointLight(0xffc860, 4, 8, 1.5);
  glow.position.y = 2.55;
  moving.add(sun, corona, glow);

  const arms: { arm: THREE.Group; planet: THREE.Mesh; speed: number }[] = [];
  let moonArm: THREE.Group | null = null;
  PLANETS.forEach((p, i) => {
    const arm = new THREE.Group();
    arm.position.y = 2.55 - 0.06 * (i - 3.5) * 0.4;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, p.orbit, 6), MAT.gold);
    rod.rotation.z = Math.PI / 2;
    rod.position.x = p.orbit / 2;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), MAT.gold);
    stem.position.set(p.orbit, -0.06, 0);
    const map = p.map();
    const planet = new THREE.Mesh(new THREE.SphereGeometry(p.size, 32, 16), new THREE.MeshPhongMaterial({ color: p.color, map, shininess: 70 }));
    planet.position.set(p.orbit, p.size * 0.6, 0);
    planet.castShadow = true;
    arm.add(rod, stem, planet);
    if (p.ring) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(p.ring.inner, p.ring.outer, 48), new THREE.MeshPhongMaterial({ color: p.ring.color, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
      ring.rotation.x = p.ring.tilt;
      planet.add(ring);
    }
    if (p.name === 'Earth') {
      moonArm = new THREE.Group();
      const moon = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 8), new THREE.MeshPhongMaterial({ color: 0xd8d6d0 }));
      moon.position.x = 0.2;
      moonArm.add(moon);
      planet.add(moonArm);
      planet.rotation.z = 0.41; // Earth's axial tilt, 23.4 degrees
    }
    const orbit = new THREE.Mesh(new THREE.TorusGeometry(p.orbit, 0.005, 4, 96), MAT.gold);
    orbit.rotation.x = Math.PI / 2;
    orbit.position.y = arm.position.y;
    orbits.add(orbit);
    moving.add(arm);
    arm.rotation.y = i * 1.7;
    // Real periods would freeze Neptune in place; a square root keeps the order and keeps everything moving.
    arms.push({ arm, planet, speed: 0.55 / Math.sqrt(p.period) });
  });
  // Merge what moves together so the orrery stays cheap to draw; planets keep their own materials.
  mergeStatic(orbits);
  for (const a of arms) {
    a.planet.userData.dynamic = true;
    mergeStatic(a.arm);
  }
  moving.traverse((o) => (o.userData.noCollide = true));

  return {
    group,
    update(dt, speed, dark) {
      for (const a of arms) a.arm.rotation.y += dt * a.speed * speed;
      if (moonArm) (moonArm as THREE.Group).rotation.y += dt * 2.2 * speed;
      gear.rotation.y -= dt * 0.12 * speed;
      glow.intensity = 4 * (1 - dark);
      sunMat.color.set(0xffc42e).lerp(new THREE.Color(0x3a2a08), Math.min(1, dark * 1.4));
    },
  };
}
