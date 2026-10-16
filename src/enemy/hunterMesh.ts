import * as THREE from 'three';

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
  /** Extra sideways tilt of the head, the "listening" look. */
  tilt: number;
  /** Spear pitch in the body frame: 0 points it straight up, pi/2 levels it forwards. */
  spear: number;
}

const STAND: Pose = { lShoulder: 0.05, rShoulder: 0.25, lElbow: 0.15, rElbow: 0.9, lHip: 0, rHip: 0, lKnee: 0, rKnee: 0, lean: 0, tilt: 0, spear: 0.15 };

/** Walking: four key poses, stepped through at the puppet rate, never blended. */
export const WALK: Pose[] = [
  { ...STAND, lShoulder: -0.35, lHip: 0.4, rHip: -0.3, rKnee: 0.4, lean: 0.05 },
  { ...STAND, lShoulder: 0, lHip: 0.1, rHip: 0, lKnee: 0.1, rKnee: 0.7, lean: 0.05 },
  { ...STAND, lShoulder: 0.35, lHip: -0.3, rHip: 0.4, lKnee: 0.4, lean: 0.05 },
  { ...STAND, lShoulder: 0, lHip: 0, rHip: 0.1, lKnee: 0.7, rKnee: 0.1, lean: 0.05 },
];

/** Running with the spear levelled. */
export const RUN: Pose[] = [
  { ...STAND, lShoulder: -0.8, rShoulder: 1.25, rElbow: 0.25, lHip: 0.85, rHip: -0.6, lKnee: 0.3, rKnee: 0.9, lean: 0.32, spear: 1.4 },
  { ...STAND, lShoulder: 0.2, rShoulder: 1.25, rElbow: 0.25, lHip: 0.2, rHip: -0.1, lKnee: 0.6, rKnee: 1.3, lean: 0.36, spear: 1.45 },
  { ...STAND, lShoulder: 0.8, rShoulder: 1.25, rElbow: 0.25, lHip: -0.6, rHip: 0.85, lKnee: 0.9, rKnee: 0.3, lean: 0.32, spear: 1.4 },
  { ...STAND, lShoulder: -0.2, rShoulder: 1.25, rElbow: 0.25, lHip: -0.1, rHip: 0.2, lKnee: 1.3, rKnee: 0.6, lean: 0.36, spear: 1.45 },
];

export const IDLE: Pose[] = [STAND, { ...STAND, tilt: 0.05 }];
/** Stopped and listening: spear raised, head cocked. */
export const ALERT: Pose[] = [
  { ...STAND, rShoulder: 2.3, rElbow: 0.6, lShoulder: 0.5, lElbow: 1.0, lHip: 0.25, rKnee: 0.25, lean: 0.12, tilt: 0.28, spear: 1.5 },
  { ...STAND, rShoulder: 2.2, rElbow: 0.7, lShoulder: 0.45, lElbow: 1.1, lHip: 0.25, rKnee: 0.25, lean: 0.14, tilt: -0.22, spear: 1.55 },
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

const plaster = new THREE.MeshPhongMaterial({ color: 0xcdb08a, shininess: 18, specular: 0x222222 });
const fur = new THREE.MeshPhongMaterial({ color: 0x5b3c24, shininess: 4, flatShading: true });
const hide = new THREE.MeshPhongMaterial({ color: 0x8a6440, shininess: 6, flatShading: true });
const shaft = new THREE.MeshPhongMaterial({ color: 0x6b4428, shininess: 30 });
const flint = new THREE.MeshPhongMaterial({ color: 0x3b3c40, shininess: 80, flatShading: true });

function limb(len: number, r0: number, r1: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, len, 10), mat);
  m.position.y = -len / 2;
  return m;
}

function joint(parent: THREE.Object3D, x: number, y: number, z: number, r: number, mat: THREE.Material = plaster): THREE.Group {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), mat));
  parent.add(g);
  return g;
}

/**
 * A diorama hunter: a smooth plaster mannequin with no face, a fur cape, a hide wrap and a flint-tipped spear.
 * Built from pivots so the puppet poses can swing whole limbs. About 1.9 m tall.
 */
export function createHunterRig(): HunterRig {
  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 0.95;
  root.add(hips);
  const body = new THREE.Group();
  hips.add(body);

  // Torso: a lathe that narrows at the waist.
  const profile = [
    [0.0, 0], [0.17, 0], [0.19, 0.08], [0.16, 0.22], [0.19, 0.38], [0.23, 0.5], [0.22, 0.56], [0.08, 0.62], [0, 0.63],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const torso = new THREE.Mesh(new THREE.LatheGeometry(profile, 18), plaster);
  torso.scale.z = 0.72;
  body.add(torso);
  const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.32, 9, 1, true), hide);
  wrap.position.y = 0.0;
  wrap.scale.z = 0.8;
  body.add(wrap);
  // Fur mantle over the shoulders only, so the plaster body still reads as a mannequin.
  const cape = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.34, 0.3, 9, 1, true), fur);
  cape.position.set(0, 0.47, -0.01);
  cape.scale.set(1, 1, 0.78);
  body.add(cape);
  const strap = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 5, 18), hide);
  strap.position.set(0, 0.3, 0);
  strap.rotation.set(Math.PI / 2, 0.5, 0);
  strap.scale.set(1, 0.75, 1);
  body.add(strap);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.14, 10), plaster);
  neck.position.y = 0.68;
  body.add(neck);
  const head = new THREE.Group();
  head.position.y = 0.76;
  body.add(head);
  // Smooth egg with no features at all: the GDD's faceless hunter.
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 14), plaster);
  skull.scale.set(0.92, 1.25, 1.05);
  skull.position.y = 0.09;
  head.add(skull);

  const lShoulder = joint(body, 0.24, 0.5, 0, 0.07);
  const rShoulder = joint(body, -0.24, 0.5, 0, 0.07);
  lShoulder.add(limb(0.3, 0.06, 0.05, plaster));
  rShoulder.add(limb(0.3, 0.06, 0.05, plaster));
  const lElbow = joint(lShoulder, 0, -0.3, 0, 0.05);
  const rElbow = joint(rShoulder, 0, -0.3, 0, 0.05);
  lElbow.add(limb(0.27, 0.045, 0.04, plaster));
  rElbow.add(limb(0.27, 0.045, 0.04, plaster));
  const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), plaster);
  lHand.position.y = -0.3;
  lHand.scale.set(0.8, 1.2, 0.6);
  lElbow.add(lHand);
  const rHand = lHand.clone();
  rElbow.add(rHand);

  // Spear in the right hand, pointing along the forearm's forward axis.
  const spear = new THREE.Group();
  spear.position.y = -0.3;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 2.1, 8), shaft);
  pole.position.y = 0.45;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.22, 4), flint);
  tip.position.y = 1.6;
  tip.scale.z = 0.4;
  const binding = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.08, 8), hide);
  binding.position.y = 1.47;
  spear.add(pole, tip, binding);
  rElbow.add(spear);

  const lHip = joint(hips, 0.11, -0.02, 0, 0.08);
  const rHip = joint(hips, -0.11, -0.02, 0, 0.08);
  lHip.add(limb(0.44, 0.08, 0.06, plaster));
  rHip.add(limb(0.44, 0.08, 0.06, plaster));
  const lKnee = joint(lHip, 0, -0.44, 0, 0.06);
  const rKnee = joint(rHip, 0, -0.44, 0, 0.06);
  lKnee.add(limb(0.43, 0.06, 0.045, plaster));
  rKnee.add(limb(0.43, 0.06, 0.045, plaster));
  for (const k of [lKnee, rKnee]) {
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.22), fur);
    foot.position.set(0, -0.46, 0.05);
    k.add(foot);
  }

  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
  });

  const probe = (parent: THREE.Object3D, y: number) => {
    const o = new THREE.Object3D();
    o.position.y = y;
    parent.add(o);
    return o;
  };
  const probes = [probe(head, 0.1), probe(body, 0.35), probe(hips, -0.1), probe(lKnee, -0.1), probe(rKnee, -0.1)];

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
      head.rotation.set(-p.lean * 0.5, headYaw, p.tilt, 'YXZ');
      // Every joint turns about x, so the spear can be counter-rotated to hold its pitch in the body frame.
      spear.rotation.x = p.spear + p.rShoulder + p.rElbow;
    },
  };
}
