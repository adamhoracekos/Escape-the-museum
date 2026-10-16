import * as THREE from 'three';
import { MAT, box } from '../../world/props';
import { canvasTexture } from '../../world/textures';

/** Old ivory: the colour of museum bone that has been varnished more than once. */
export const BONE = new THREE.MeshPhongMaterial({ color: 0xd8c9a6, shininess: 35, specular: 0x332a1a });
const GHOST = new THREE.MeshBasicMaterial({ color: 0x7fb7d9, wireframe: true, transparent: true, opacity: 0.35 });
export const ROCK = new THREE.MeshPhongMaterial({ color: 0x5d636d, shininess: 8, flatShading: true });
export const ICE = new THREE.MeshPhongMaterial({ color: 0xbfe0f2, shininess: 140, specular: 0xffffff, transparent: true, opacity: 0.78 });
const HIDE = new THREE.MeshPhongMaterial({ color: 0x7a5a3a, shininess: 6, flatShading: true, side: THREE.DoubleSide });
const CHAR = new THREE.MeshPhongMaterial({ color: 0x1a1512, shininess: 2 });
const DEADWOOD = new THREE.MeshPhongMaterial({ color: 0x3b3128, shininess: 4, flatShading: true });
const SILVER = new THREE.MeshPhongMaterial({ color: 0xdfe6ee, shininess: 200, specular: 0xffffff });

export type BoneKind = 'tusk' | 'femur' | 'scapula';

function rod(len: number, r0: number, r1: number, mat: THREE.Material, seg = 8): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, len, seg), mat);
  m.castShadow = true;
  return m;
}

/** Geometry of a single loose bone, shared by the skeleton socket and the pickup in the diorama. */
export function boneMesh(kind: BoneKind, mat: THREE.Material = BONE): THREE.Object3D {
  const g = new THREE.Group();
  if (kind === 'tusk') {
    const t = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.07, 8, 24, Math.PI * 0.62), mat);
    t.castShadow = true;
    g.add(t);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.25, 8), mat);
    tip.position.set(Math.cos(Math.PI * 0.62) * 1.15, Math.sin(Math.PI * 0.62) * 1.15, 0);
    tip.rotation.z = Math.PI * 0.62;
    g.add(tip);
  } else if (kind === 'femur') {
    const shaft = rod(1.05, 0.07, 0.08, mat);
    g.add(shaft);
    for (const y of [-0.55, 0.55]) {
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), mat);
      knob.scale.set(1.3, 0.8, 1);
      knob.position.y = y;
      g.add(knob);
    }
  } else {
    // Shoulder blade: a flat, roughly triangular plate with a ridge.
    const shape = new THREE.Shape();
    shape.moveTo(-0.32, 0.45);
    shape.quadraticCurveTo(0, 0.6, 0.34, 0.42);
    shape.lineTo(0.08, -0.45);
    shape.lineTo(-0.06, -0.45);
    shape.closePath();
    const plate = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false }), mat);
    plate.castShadow = true;
    g.add(plate);
    const ridge = rod(0.8, 0.02, 0.03, mat, 6);
    ridge.position.set(0, 0.02, 0.05);
    g.add(ridge);
  }
  return g;
}

export interface Skeleton {
  group: THREE.Group;
  /** Pivot at the neck: the scare turns it towards the player. */
  skull: THREE.Group;
  /** Missing bones: a ghost outline until placed, then the real bone. */
  sockets: Record<BoneKind, { ghost: THREE.Object3D; real: THREE.Object3D; anchor: THREE.Vector3 }>;
  /** World position inside the rib cage (fragment 2 falls from here). */
  ribs: THREE.Vector3;
}

/**
 * Woolly mammoth skeleton, about 3.2 m at the shoulder and 4.6 m long, facing +x.
 * The high shoulder hump and the sloping back are what tell it apart from an elephant.
 */
export function mammothSkeleton(): Skeleton {
  const group = new THREE.Group();
  const vert = new THREE.SphereGeometry(0.11, 8, 6);
  // Spine: a curve from the tail over the hump to the neck.
  const spine = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.5, 2.0, 0),
    new THREE.Vector3(-1.9, 2.55, 0),
    new THREE.Vector3(-0.8, 2.85, 0),
    new THREE.Vector3(0.4, 3.15, 0),
    new THREE.Vector3(1.2, 3.1, 0),
    new THREE.Vector3(1.75, 2.75, 0),
  ]);
  const N = 22;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const p = spine.getPoint(t);
    const v = new THREE.Mesh(vert, BONE);
    v.scale.setScalar(0.7 + Math.sin(t * Math.PI) * 0.5);
    v.position.copy(p);
    group.add(v);
    // Neural spines: tallest over the shoulders, the hump.
    const h = 0.12 + Math.max(0, Math.sin((t - 0.35) * Math.PI * 1.6)) * 0.45;
    if (t > 0.1) {
      const sp = rod(h, 0.025, 0.035, BONE, 5);
      sp.position.set(p.x, p.y + h / 2 + 0.06, 0);
      sp.rotation.z = 0.25;
      group.add(sp);
    }
  }
  // Ribs: pairs of arcs hanging from the spine, deepest at the chest.
  const ribGeo = new THREE.TorusGeometry(0.62, 0.028, 5, 16, Math.PI);
  ribGeo.rotateZ(Math.PI); // lower half of the ring
  ribGeo.rotateY(Math.PI / 2); // across the body
  for (let i = 0; i < 12; i++) {
    const x = -0.95 + i * 0.2;
    const p = spine.getPoint((x + 2.5) / 4.25);
    const depth = 0.75 + Math.sin(((i + 1) / 13) * Math.PI) * 0.35;
    const rib = new THREE.Mesh(ribGeo, BONE);
    rib.scale.set(1, depth * 1.4, 1);
    rib.position.set(x, p.y - 0.05, 0);
    group.add(rib);
  }
  // Pelvis
  const pelvis = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.09, 6, 14), BONE);
  pelvis.position.set(-1.75, 2.25, 0);
  pelvis.rotation.y = Math.PI / 2;
  pelvis.scale.set(1, 0.8, 1);
  group.add(pelvis);

  const leg = (x: number, z: number, top: number, upper: number, lower: number, skipUpper = false) => {
    if (!skipUpper) {
      const u = rod(upper, 0.08, 0.07, BONE);
      u.position.set(x, top - upper / 2, z);
      group.add(u);
    }
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), BONE);
    knee.position.set(x, top - upper, z);
    group.add(knee);
    const l = rod(lower, 0.07, 0.06, BONE);
    l.position.set(x, top - upper - lower / 2, z);
    group.add(l);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.12, 10), BONE);
    foot.position.set(x, 0.06, z);
    group.add(foot);
  };
  leg(1.0, 0.45, 2.75, 1.25, 1.35);
  leg(1.0, -0.45, 2.75, 1.25, 1.35);
  leg(-1.6, 0.42, 2.2, 1.1, 1.0);
  leg(-1.6, -0.42, 2.2, 1.1, 1.0, true); // right hind femur is missing

  // Skull on a neck pivot, with the left tusk in place and the right one missing.
  const skull = new THREE.Group();
  skull.position.set(1.8, 2.7, 0);
  group.add(skull);
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), BONE);
  cranium.scale.set(0.8, 1.15, 0.85);
  cranium.position.set(0.35, 0.05, 0);
  skull.add(cranium);
  const jaw = box(0.45, 0.25, 0.4, BONE, 0.45, -0.55, 0);
  skull.add(jaw);
  for (const s of [-1, 1]) {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), CHAR);
    socket.position.set(0.68, 0.18, s * 0.28);
    skull.add(socket);
  }
  const tuskAt = (side: number) => {
    const t = boneMesh('tusk');
    t.position.set(0.55, -0.35, side * 0.25);
    t.rotation.set(side * 0.35, 0, -Math.PI * 0.5);
    return t;
  };
  skull.add(tuskAt(1));

  // Sockets for the three missing bones.
  const sockets = {} as Skeleton['sockets'];
  const makeSocket = (kind: BoneKind, place: (o: THREE.Object3D) => void, parent: THREE.Object3D) => {
    const ghost = boneMesh(kind, GHOST);
    const real = boneMesh(kind);
    place(ghost);
    place(real);
    real.visible = false;
    parent.add(ghost, real);
    sockets[kind] = { ghost, real, anchor: new THREE.Vector3() };
  };
  makeSocket('tusk', (o) => {
    o.position.set(0.55, -0.35, -0.25);
    o.rotation.set(-0.35, 0, -Math.PI * 0.5);
  }, skull);
  makeSocket('femur', (o) => o.position.set(-1.6, 2.2 - 0.55, -0.42), group);
  makeSocket('scapula', (o) => {
    o.position.set(0.95, 2.75, 0.5);
    o.rotation.set(0, 0.1, 0.25);
  }, group);

  group.traverse((o) => ((o as THREE.Mesh).castShadow = true));
  return { group, skull, sockets, ribs: new THREE.Vector3(0.2, 2.1, 0) };
}

/** An ice core whose yearly layers are `spacing` pixels apart: thick near the top of the ice sheet, thin deep down. */
export function iceCore(spacing: number, seed: number): THREE.Mesh {
  const tex = canvasTexture(64, 256, (g, w, h) => {
    g.fillStyle = '#dcebf5';
    g.fillRect(0, 0, w, h);
    let s = seed * 9301 + 49297;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let y = rnd() * spacing; y < h; y += spacing * (0.85 + rnd() * 0.3)) {
      g.fillStyle = `rgba(70, 110, 140, ${0.35 + rnd() * 0.3})`;
      g.fillRect(0, y, w, Math.max(1, spacing * 0.28));
    }
    // Trapped air bubbles: the ancient atmosphere.
    g.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 40; i++) {
      g.beginPath();
      g.arc(rnd() * w, rnd() * h, 0.6 + rnd() * 1.2, 0, Math.PI * 2);
      g.fill();
    }
  });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.95, 18), new THREE.MeshPhongMaterial({ map: tex, shininess: 120, specular: 0xffffff, transparent: true, opacity: 0.92 }));
  m.castShadow = true;
  return m;
}

/** Chest freezer with a lid on a hinge at the back. */
export function freezer(): { group: THREE.Group; lid: THREE.Group } {
  const group = new THREE.Group();
  const white = new THREE.MeshPhongMaterial({ color: 0xe9eef2, shininess: 80 });
  group.add(box(1.3, 0.85, 0.75, white, 0, 0.425, 0));
  const inner = box(1.15, 0.05, 0.6, new THREE.MeshPhongMaterial({ color: 0x9fc7de }), 0, 0.82, 0);
  inner.userData.noCollide = true;
  group.add(inner);
  const lid = new THREE.Group();
  lid.position.set(0, 0.86, -0.37);
  const lidMesh = box(1.32, 0.08, 0.77, white, 0, 0.04, 0.385);
  lidMesh.userData.noCollide = true;
  lid.add(lidMesh);
  const handle = box(0.4, 0.04, 0.04, MAT.metal, 0, 0.06, 0.76);
  handle.userData.noCollide = true;
  lid.add(handle);
  lid.userData.dynamic = true;
  group.add(lid);
  return { group, lid };
}

/** A mirror on a stand that turns in 45 degree steps. */
export function mirrorStand(): { group: THREE.Group; head: THREE.Group } {
  const group = new THREE.Group();
  group.add(box(0.5, 0.06, 0.5, MAT.metal, 0, 0.03, 0));
  const post = rod(1.1, 0.03, 0.04, MAT.metal);
  post.position.y = 0.6;
  group.add(post);
  const head = new THREE.Group();
  head.position.y = 1.2;
  head.userData.dynamic = true;
  const frame = box(0.62, 0.48, 0.05, MAT.gold, 0, 0, 0);
  const glass = box(0.54, 0.4, 0.02, SILVER, 0, 0, 0.02);
  frame.userData.noCollide = true;
  glass.userData.noCollide = true;
  head.add(frame, glass);
  group.add(head);
  return { group, head };
}

/** A tall infrared lamp on a tripod. */
export function heatLamp(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const legM = rod(1.25, 0.02, 0.02, MAT.metal, 5);
    legM.position.set(Math.sin(a) * 0.22, 0.6, Math.cos(a) * 0.22);
    legM.rotation.set(Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35);
    g.add(legM);
  }
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.32, 16, 1, true), new THREE.MeshPhongMaterial({ color: 0xd63a2a, shininess: 60, side: THREE.DoubleSide }));
  housing.rotation.z = -Math.PI / 2;
  housing.position.set(0.05, 1.2, 0);
  const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), new THREE.MeshBasicMaterial({ color: 0xff5530 }));
  bulb.rotation.y = Math.PI / 2;
  bulb.position.set(0.2, 1.2, 0);
  bulb.userData.noCollide = true;
  g.add(housing, bulb);
  return g;
}

/** Hide tent on a frame of poles, with a dark opening. */
export function tent(): THREE.Group {
  const g = new THREE.Group();
  const cover = new THREE.Mesh(new THREE.ConeGeometry(1.8, 2.8, 7, 1, true), HIDE);
  cover.position.y = 1.4;
  cover.castShadow = cover.receiveShadow = true;
  g.add(cover);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.3;
    const pole = rod(3.4, 0.03, 0.04, DEADWOOD, 5);
    pole.position.set(Math.sin(a) * 0.3, 1.6, Math.cos(a) * 0.3);
    pole.rotation.set(Math.cos(a) * 0.55, 0, -Math.sin(a) * 0.55);
    g.add(pole);
  }
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.2), CHAR);
  door.position.set(0, 0.6, 1.42);
  door.rotation.x = -0.5;
  door.userData.noCollide = true;
  g.add(door);
  return g;
}

/** A dead hearth: a ring of stones around ash and charred bone. */
export function hearth(): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16 + (i % 3) * 0.03, 0), ROCK);
    s.position.set(Math.sin(a) * 0.6, 0.1, Math.cos(a) * 0.6);
    s.rotation.set(i, i * 2, 0);
    g.add(s);
  }
  const ash = new THREE.Mesh(new THREE.CircleGeometry(0.5, 16), CHAR);
  ash.rotation.x = -Math.PI / 2;
  ash.position.y = 0.02;
  g.add(ash);
  for (let i = 0; i < 4; i++) {
    const b = rod(0.5, 0.025, 0.03, CHAR, 5);
    b.rotation.set(Math.PI / 2, i * 0.8, 0.3);
    b.position.set(Math.sin(i) * 0.15, 0.06, Math.cos(i) * 0.15);
    g.add(b);
  }
  g.traverse((o) => (o.userData.noCollide = true));
  return g;
}

export function boulder(r: number, seed: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), ROCK);
  const pos = m.geometry.attributes.position as THREE.BufferAttribute;
  // The geometry is not indexed, so the jitter is keyed on the vertex position: corners shared by
  // several faces move together and the rock stays closed.
  const hash = (x: number, y: number, z: number) => {
    const v = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed * 4.581) * 43758.5453;
    return v - Math.floor(v);
  };
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const k = 0.84 + hash(Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000, Math.round(z * 1000) / 1000) * 0.26;
    pos.setXYZ(i, x * k, y * k * 0.75, z * k);
  }
  m.geometry.computeVertexNormals();
  m.castShadow = m.receiveShadow = true;
  return m;
}

/** A dead, leafless larch: trunk and a few snapped branches. */
export function deadTree(h: number): THREE.Group {
  const g = new THREE.Group();
  const trunk = rod(h, 0.06, 0.16, DEADWOOD, 6);
  trunk.position.y = h / 2;
  g.add(trunk);
  for (let i = 0; i < 6; i++) {
    const b = rod(0.5 + (i % 3) * 0.25, 0.015, 0.03, DEADWOOD, 4);
    const y = h * (0.35 + i * 0.1);
    b.position.set(Math.sin(i * 2.3) * 0.25, y, Math.cos(i * 2.3) * 0.25);
    b.rotation.set(Math.cos(i * 2.3) * 1.1, 0, -Math.sin(i * 2.3) * 1.1);
    g.add(b);
  }
  return g;
}

/** Painted diorama backdrop: the mammoth steppe at dusk, the way a 1930s museum painter would have done it. */
export function steppeMural(width: number): THREE.CanvasTexture {
  const px = Math.min(2048, Math.round(width * 96));
  return canvasTexture(px, 512, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.7);
    sky.addColorStop(0, '#1b2236');
    sky.addColorStop(0.6, '#4c5a78');
    sky.addColorStop(1, '#b9a68a');
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    // Far ice sheet and hills
    g.fillStyle = '#d7e3ec';
    g.beginPath();
    g.moveTo(0, h * 0.62);
    for (let x = 0; x <= w; x += 40) g.lineTo(x, h * 0.58 - Math.sin(x * 0.004) * 30 - Math.sin(x * 0.013) * 10);
    g.lineTo(w, h);
    g.lineTo(0, h);
    g.fill();
    g.fillStyle = '#8c8a72';
    g.beginPath();
    g.moveTo(0, h * 0.75);
    for (let x = 0; x <= w; x += 30) g.lineTo(x, h * 0.72 - Math.sin(x * 0.007 + 1) * 18);
    g.lineTo(w, h);
    g.lineTo(0, h);
    g.fill();
    // A herd of mammoths in silhouette, small and far away.
    g.fillStyle = '#2b2620';
    for (let i = 0; i < 7; i++) {
      const x = w * (0.15 + i * 0.11) + Math.sin(i * 3) * 30;
      const y = h * 0.7 + Math.sin(i * 1.7) * 6;
      const s = 0.6 + (i % 3) * 0.2;
      g.beginPath();
      g.ellipse(x, y, 26 * s, 16 * s, 0, 0, Math.PI * 2);
      g.ellipse(x + 22 * s, y - 8 * s, 10 * s, 11 * s, 0, 0, Math.PI * 2);
      g.fill();
      g.fillRect(x - 18 * s, y + 6 * s, 6 * s, 16 * s);
      g.fillRect(x + 10 * s, y + 6 * s, 6 * s, 16 * s);
    }
    g.fillStyle = '#e9e1cf';
    g.fillRect(0, h * 0.86, w, h * 0.14);
  });
}

export function pedestal(): THREE.Group {
  const g = new THREE.Group();
  g.add(box(0.8, 1.0, 0.8, MAT.marble, 0, 0.5, 0));
  g.add(box(0.95, 0.08, 0.95, MAT.gold, 0, 1.04, 0));
  return g;
}

/** Stalagmites and stalactites for the cave. */
export function spike(h: number, r: number, down = false): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), ROCK);
  m.position.y = down ? -h / 2 : h / 2;
  if (down) m.rotation.x = Math.PI;
  m.castShadow = true;
  return m;
}
