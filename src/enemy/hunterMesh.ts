import * as THREE from 'three';
import { canvasTexture } from '../world/textures';

/** Joint angles for one puppet pose, in radians. Positive shoulder and hip angles swing the limb forward. */
export interface Pose {
  lShoulder: number;
  rShoulder: number;
  lElbow: number;
  rElbow: number;
  lHip: number;
  rHip: number;
  lKnee: number;
  rKnee: number;
  lean: number;
  /** Sideways tilt of the head on top of its permanent crooked angle. */
  tilt: number;
  /** Spear pitch in the body frame: 0 points it straight up, pi/2 levels it forwards. */
  spear: number;
  /** 0 fingers hang loose, 1 fingers splay open (reaching). */
  splay: number;
}

const STAND: Pose = { lShoulder: 0.05, rShoulder: 0.25, lElbow: 0.1, rElbow: 0.9, lHip: 0, rHip: 0, lKnee: 0.05, rKnee: 0.05, lean: 0.08, tilt: 0, spear: 0.15, splay: 0 };

/** Walking: four key poses, stepped through at the puppet rate, never blended. Stiff, slightly stooped. */
export const WALK: Pose[] = [
  { ...STAND, lShoulder: -0.3, lHip: 0.38, rHip: -0.28, rKnee: 0.45, lean: 0.14 },
  { ...STAND, lShoulder: 0, lHip: 0.1, rHip: 0, lKnee: 0.1, rKnee: 0.75, lean: 0.12, tilt: 0.06 },
  { ...STAND, lShoulder: 0.3, lHip: -0.28, rHip: 0.38, lKnee: 0.45, lean: 0.14 },
  { ...STAND, lShoulder: 0, lHip: 0, rHip: 0.1, lKnee: 0.75, rKnee: 0.1, lean: 0.12, tilt: -0.04 },
];

/** Running bent low, spear levelled, the free hand reaching for you with its fingers open. */
export const RUN: Pose[] = [
  { ...STAND, lShoulder: 1.45, lElbow: 0.1, rShoulder: 1.2, rElbow: 0.3, lHip: 0.9, rHip: -0.6, lKnee: 0.3, rKnee: 1.0, lean: 0.5, spear: 1.45, splay: 1 },
  { ...STAND, lShoulder: 1.6, lElbow: 0.05, rShoulder: 1.25, rElbow: 0.25, lHip: 0.2, rHip: -0.1, lKnee: 0.6, rKnee: 1.4, lean: 0.55, spear: 1.5, splay: 1, tilt: 0.12 },
  { ...STAND, lShoulder: 1.45, lElbow: 0.1, rShoulder: 1.2, rElbow: 0.3, lHip: -0.6, rHip: 0.9, lKnee: 1.0, rKnee: 0.3, lean: 0.5, spear: 1.45, splay: 1 },
  { ...STAND, lShoulder: 1.6, lElbow: 0.05, rShoulder: 1.25, rElbow: 0.25, lHip: -0.1, rHip: 0.2, lKnee: 1.4, rKnee: 0.6, lean: 0.55, spear: 1.5, splay: 1, tilt: -0.1 },
];

export const IDLE: Pose[] = [STAND, { ...STAND, tilt: 0.08 }];
/** Stopped and listening: spear raised, head cocked hard to one side, the other hand half raised. */
export const ALERT: Pose[] = [
  { ...STAND, rShoulder: 2.3, rElbow: 0.6, lShoulder: 0.7, lElbow: 0.9, lHip: 0.25, rKnee: 0.3, lean: 0.25, tilt: 0.45, spear: 1.5, splay: 0.7 },
  { ...STAND, rShoulder: 2.2, rElbow: 0.7, lShoulder: 0.65, lElbow: 1.0, lHip: 0.25, rKnee: 0.3, lean: 0.28, tilt: -0.3, spear: 1.55, splay: 0.7 },
];

export interface HunterRig {
  root: THREE.Group;
  /** Everything above the hips, for leaning. */
  body: THREE.Group;
  head: THREE.Group;
  joints: Record<'lShoulder' | 'rShoulder' | 'lElbow' | 'rElbow' | 'lHip' | 'rHip' | 'lKnee' | 'rKnee', THREE.Group>;
  /** Points tested against the flashlight beam. */
  probes: THREE.Object3D[];
  apply(p: Pose, headYaw: number): void;
}

/** Old plaster: yellowed, stained darker where hands have touched it for ninety years, cracked. */
function stainedPlaster(): THREE.Texture {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#b8a688';
    g.fillRect(0, 0, w, h);
    let s = 17;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 70; i++) {
      g.fillStyle = `rgba(${40 + rnd() * 30}, ${30 + rnd() * 20}, ${20 + rnd() * 15}, ${0.08 + rnd() * 0.18})`;
      g.beginPath();
      g.ellipse(rnd() * w, rnd() * h, 6 + rnd() * 26, 4 + rnd() * 18, rnd() * 3, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = 'rgba(25, 18, 12, 0.75)';
    g.lineWidth = 1.2;
    for (let i = 0; i < 14; i++) {
      let x = rnd() * w;
      let y = rnd() * h;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += (rnd() - 0.5) * 22;
        y += rnd() * 16;
        g.lineTo(x, y);
      }
      g.stroke();
    }
  });
}

let shared: { plaster: THREE.Material; joint: THREE.Material; fur: THREE.Material; hide: THREE.Material; shaft: THREE.Material; flint: THREE.Material; hollow: THREE.Material } | null = null;

function materials() {
  if (shared) return shared;
  const map = stainedPlaster();
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  shared = {
    plaster: new THREE.MeshPhongMaterial({ map, color: 0xffffff, shininess: 14, specular: 0x1a1a1a }),
    // Joints are where the paint wore through to the grey wire-and-gesso underneath.
    joint: new THREE.MeshPhongMaterial({ color: 0x5c5650, shininess: 30 }),
    fur: new THREE.MeshPhongMaterial({ color: 0x3e2a1a, shininess: 4, flatShading: true }),
    hide: new THREE.MeshPhongMaterial({ color: 0x6e5034, shininess: 6, flatShading: true }),
    shaft: new THREE.MeshPhongMaterial({ color: 0x4f3220, shininess: 30 }),
    flint: new THREE.MeshPhongMaterial({ color: 0x2c2d31, shininess: 90, flatShading: true }),
    hollow: new THREE.MeshBasicMaterial({ color: 0x020101 }),
  };
  return shared;
}

function limb(len: number, r0: number, r1: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, len, 10), mat);
  m.position.y = -len / 2;
  return m;
}

function joint(parent: THREE.Object3D, x: number, y: number, z: number, r: number, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), mat));
  parent.add(g);
  return g;
}

/** A hand of four long, thin fingers that can hang or splay. */
function hand(parent: THREE.Object3D, y: number, m: ReturnType<typeof materials>): THREE.Group[] {
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.035), m.plaster);
  palm.position.y = y;
  parent.add(palm);
  const fingers: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    const f = new THREE.Group();
    f.position.set(-0.027 + i * 0.018, y - 0.045, 0);
    const len = 0.16 + (i === 1 || i === 2 ? 0.03 : 0);
    f.add(limb(len, 0.008, 0.005, m.plaster));
    parent.add(f);
    fingers.push(f);
  }
  return fingers;
}

/**
 * A diorama hunter gone wrong: a tall, stooped plaster mannequin, stained and cracked, joints worn grey,
 * a crooked head with two empty sockets and a slot of a mouth, long splayed fingers, a fur mantle and a flint spear.
 * About 2.1 m tall. Built from pivots so the puppet poses can swing whole limbs.
 */
export function createHunterRig(): HunterRig {
  const m = materials();
  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 1.08;
  root.add(hips);
  const body = new THREE.Group();
  hips.add(body);

  // Torso: long and narrow, the ribs showing as ridges in the lathe profile.
  const profile = [
    [0.0, 0], [0.15, 0], [0.165, 0.08], [0.13, 0.22], [0.15, 0.3], [0.13, 0.36], [0.16, 0.44], [0.2, 0.56], [0.21, 0.62], [0.07, 0.69], [0, 0.7],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const torso = new THREE.Mesh(new THREE.LatheGeometry(profile, 16), m.plaster);
  torso.scale.z = 0.66;
  body.add(torso);
  const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.23, 0.3, 8, 1, true), m.hide);
  wrap.scale.z = 0.8;
  body.add(wrap);
  const cape = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.33, 0.32, 8, 1, true), m.fur);
  cape.position.set(0, 0.53, -0.02);
  cape.scale.set(1, 1, 0.75);
  body.add(cape);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.2, 8), m.joint);
  neck.position.y = 0.78;
  body.add(neck);
  const head = new THREE.Group();
  head.position.y = 0.87;
  body.add(head);
  // A permanent crooked angle, as if the neck was set wrong when the figure was made.
  const crooked = new THREE.Group();
  crooked.rotation.z = 0.32;
  head.add(crooked);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 14), m.plaster);
  skull.scale.set(0.86, 1.32, 1.02);
  skull.position.y = 0.1;
  crooked.add(skull);
  // Two empty sockets and a slot for a mouth: holes in the plaster, darker than anything around them.
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), m.hollow);
    eye.scale.set(1, 1.35, 0.5);
    eye.position.set(s * 0.04, 0.13, 0.1);
    crooked.add(eye);
  }
  const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.075, 0.02), m.hollow);
  mouth.position.set(0.004, 0.02, 0.105);
  mouth.rotation.z = 0.08;
  crooked.add(mouth);

  const lShoulder = joint(body, 0.22, 0.58, 0, 0.055, m.joint);
  const rShoulder = joint(body, -0.22, 0.58, 0, 0.055, m.joint);
  lShoulder.add(limb(0.38, 0.05, 0.04, m.plaster));
  rShoulder.add(limb(0.38, 0.05, 0.04, m.plaster));
  const lElbow = joint(lShoulder, 0, -0.38, 0, 0.042, m.joint);
  const rElbow = joint(rShoulder, 0, -0.38, 0, 0.042, m.joint);
  lElbow.add(limb(0.36, 0.038, 0.03, m.plaster));
  rElbow.add(limb(0.36, 0.038, 0.03, m.plaster));
  const lFingers = hand(lElbow, -0.4, m);
  const rFingers = hand(rElbow, -0.4, m);

  const spear = new THREE.Group();
  spear.position.y = -0.4;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 2.2, 7), m.shaft);
  pole.position.y = 0.45;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.26, 4), m.flint);
  tip.position.y = 1.67;
  tip.scale.z = 0.4;
  const binding = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.08, 7), m.hide);
  binding.position.y = 1.52;
  spear.add(pole, tip, binding);
  rElbow.add(spear);

  const lHip = joint(hips, 0.1, -0.02, 0, 0.065, m.joint);
  const rHip = joint(hips, -0.1, -0.02, 0, 0.065, m.joint);
  lHip.add(limb(0.52, 0.07, 0.05, m.plaster));
  rHip.add(limb(0.52, 0.07, 0.05, m.plaster));
  const lKnee = joint(lHip, 0, -0.52, 0, 0.052, m.joint);
  const rKnee = joint(rHip, 0, -0.52, 0, 0.052, m.joint);
  lKnee.add(limb(0.5, 0.05, 0.035, m.plaster));
  rKnee.add(limb(0.5, 0.05, 0.035, m.plaster));
  for (const k of [lKnee, rKnee]) {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.24), m.fur);
    foot.position.set(0, -0.53, 0.06);
    k.add(foot);
  }

  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });

  const probe = (parent: THREE.Object3D, y: number) => {
    const o = new THREE.Object3D();
    o.position.y = y;
    parent.add(o);
    return o;
  };
  const probes = [probe(head, 0.1), probe(body, 0.4), probe(hips, -0.1), probe(lKnee, -0.1), probe(rKnee, -0.1)];

  const joints = { lShoulder, rShoulder, lElbow, rElbow, lHip, rHip, lKnee, rKnee };
  return {
    root,
    body,
    head,
    joints,
    probes,
    apply(p, headYaw) {
      // Rotations about x: negative swings a limb forward because the limbs hang along -y.
      lShoulder.rotation.x = -p.lShoulder;
      rShoulder.rotation.x = -p.rShoulder;
      lElbow.rotation.x = -p.lElbow;
      rElbow.rotation.x = -p.rElbow;
      lHip.rotation.x = -p.lHip;
      rHip.rotation.x = -p.rHip;
      lKnee.rotation.x = p.lKnee;
      rKnee.rotation.x = p.rKnee;
      body.rotation.x = p.lean;
      // The head stays level-ish while the body stoops, so it seems to watch you over its own shoulders.
      head.rotation.set(-p.lean * 0.8, headYaw, p.tilt, 'YXZ');
      // Every joint turns about x, so the spear can be counter-rotated to hold its pitch in the body frame.
      spear.rotation.x = p.spear + p.rShoulder + p.rElbow;
      lFingers.forEach((f, i) => (f.rotation.z = (i - 1.5) * 0.28 * p.splay));
      rFingers.forEach((f, i) => (f.rotation.z = (i - 1.5) * 0.12 * p.splay));
    },
  };
}
