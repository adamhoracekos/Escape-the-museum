import * as THREE from 'three';
import { HUNTER } from '../../config';
import { Hunter } from '../../enemy/Hunter';
import { IDLE, ALERT, WALK, createHunterRig } from '../../enemy/hunterMesh';
import { NavGrid } from '../../enemy/NavGrid';
import type { Exhibit, Interactable } from '../../interaction/types';
import { chapterById } from '../../progress/chapters';
import { artifactMesh } from '../../world/artifacts';
import { factPosterTexture, type FactPosterSpec } from '../../world/factPoster';
import { mergeStatic } from '../../world/merge';
import { MAT, benchMesh, box } from '../../world/props';
import { checkerTexture, gridTexture, noiseTexture, signTexture } from '../../world/textures';
import { World } from '../../world/World';
import { cabinet } from '../hiding';
import type { Checkpoint, Level, LevelServices } from '../Level';
import { Pickups } from '../pickups';
import { room, wallWithGaps } from '../rooms';
import { BONE_HUT_POSTER, CAVE_POSTER, HEAT_POSTER, HUNTERS_POSTER, ICE_CORE_POSTER, ICE_LAYERS_POSTER, MAMMOTH_POSTER } from './posters';
import {
  ICE,
  ROCK,
  boneMesh,
  boulder,
  deadTree,
  freezer,
  hearth,
  heatLamp,
  iceCore,
  mammothSkeleton,
  mirrorStand,
  pedestal,
  spike,
  steppeMural,
  tent,
  type BoneKind,
} from './props';

const ID = 'ice-age';
const FRAGMENTS = 4;
const BONES: BoneKind[] = ['tusk', 'femur', 'scapula'];
const BONE_NAMES: Record<BoneKind, string> = { tusk: 'tusk', femur: 'thigh bone', scapula: 'shoulder blade' };

interface Area {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/*
 * Chapter I: The Ice Age (GDD 8.1). Six zones, three puzzles, four fragments.
 *
 *   Z5 Cave         x 30..44, z -48..-30   finale: fragment 4, lights out, three hunters
 *   Z4 Ice lab      x 14..30, z -46..-32   P3 heat lamp and mirrors, a guard in the dark corner
 *   Z3 Mammoth hall x 14..30, z -32..-16   P2 skeleton, the scare, gate north to Z4
 *   Z2 Diorama      x -6..14, z -32..-16   two hunters, three bones, snow
 *   Z1 Ice cores    x -2..12, z -16..-4    P1 stratigraphy, the hunter behind glass
 *   Z0 Start        x 0..10,  z -4..4      conservation table, passage back west
 *   Shortcut        Z5 south -> tunnel x 36..38 -> tunnel z -1..1 -> Z0 east door
 */
const AREA = {
  z2: { minX: -6, maxX: 14.4, minZ: -32, maxZ: -16 },
  z3: { minX: 13.6, maxX: 30, minZ: -32, maxZ: -16 },
  guard: { minX: 23.5, maxX: 30, minZ: -46, maxZ: -39.5 },
  z5: { minX: 30, maxX: 44, minZ: -48, maxZ: -29.6 },
  tunnelA: { minX: 36, maxX: 38, minZ: -30.4, maxZ: 1 },
  tunnelB: { minX: 9.6, maxX: 38, minZ: -1, maxZ: 1 },
} satisfies Record<string, Area>;

const inArea = (a: Area, p: THREE.Vector3) => p.x >= a.minX && p.x <= a.maxX && p.z >= a.minZ && p.z <= a.maxZ;

export function createIceAge(svc: LevelServices): Level {
  const ch = chapterById(ID)!;
  const progress = svc.progress;
  const root = new THREE.Group();
  const statics = new THREE.Group();
  root.add(statics);
  const solids: THREE.Object3D[] = [statics];
  const add = (o: THREE.Object3D, solid = true) => {
    (solid ? statics : root).add(o);
    return o;
  };
  const addAll = (list: THREE.Object3D[]) => list.forEach((o) => add(o));
  const interactables: Interactable[] = [];
  const exhibits: Exhibit[] = [];
  const has = (id: string) => progress.has(`${ID}/${id}`);
  const found = () => progress.fragments(ID);

  // ----- materials -----------------------------------------------------------
  const rep = (t: THREE.Texture) => {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };
  const tileMat = new THREE.MeshPhongMaterial({ map: rep(checkerTexture('#20306e', '#efe9da', 2)), shininess: 60, specular: 0x333333 });
  const coolWall = new THREE.MeshPhongMaterial({ color: 0xc9d6dc, shininess: 10 });
  const warmWall = MAT.wall;
  const ceil = new THREE.MeshPhongMaterial({ color: 0xcfc8b6, shininess: 4 });
  const darkCeil = new THREE.MeshPhongMaterial({ color: 0x1c2026, shininess: 2 });
  const snowMat = new THREE.MeshPhongMaterial({ map: rep(noiseTexture('#e8eff6', '#c3d2e2', 1400)), shininess: 25 });
  const labFloor = new THREE.MeshPhongMaterial({ map: rep(gridTexture('#d9e2e8', '#aab7c0')), shininess: 70 });
  const caveFloor = new THREE.MeshPhongMaterial({ map: rep(noiseTexture('#3c424b', '#2a2f36', 1800)), shininess: 6 });
  const tunnelFloor = new THREE.MeshPhongMaterial({ map: rep(gridTexture('#2b2d33', '#4a4e57')), shininess: 50 });
  const greenStrip = new THREE.MeshBasicMaterial({ color: 0x1b2a20 });

  // ----- rooms ---------------------------------------------------------------
  // Passage back to the rotunda, shut until the Venus is whole.
  addAll(room({ x0: -6, x1: 0, z0: -1.2, z1: 1.2, h: 2.6, floor: MAT.crate, wall: warmWall, ceiling: ceil, skip: ['e'] }));
  // Z0 start
  addAll(room({ x0: 0, x1: 10, z0: -4, z1: 4, h: 3.4, floor: tileMat, wall: warmWall, ceiling: ceil, skip: ['n'], gaps: { w: [{ at: 0, width: 2.4, height: 2.6 }], e: [{ at: 0, width: 2.0, height: 2.6 }] } }));
  // Z1 ice cores, with a window into the glass-case diorama on the west wall
  addAll(room({ x0: -2, x1: 12, z0: -16, z1: -4, h: 4.5, floor: tileMat, wall: coolWall, ceiling: ceil, skip: ['n'], gaps: { s: [{ at: 5, width: 2.4, height: 2.8 }], w: [{ at: -10, width: 4, height: 2.8 }] } }));
  addAll(room({ x0: -6, x1: -2, z0: -12, z1: -8, h: 3.2, floor: snowMat, wall: coolWall, ceiling: darkCeil, skip: ['e'], tile: 2 }));
  // Z2 diorama of the hunters
  addAll(room({ x0: -6, x1: 14, z0: -32, z1: -16, h: 5, floor: snowMat, wall: coolWall, ceiling: darkCeil, gaps: { s: [{ at: 5, width: 2.4, height: 2.8 }], e: [{ at: -24, width: 2.4, height: 2.8 }] }, tile: 3 }));
  // Z3 mammoth hall: tall, warm
  addAll(room({ x0: 14, x1: 30, z0: -32, z1: -16, h: 7, floor: tileMat, wall: warmWall, ceiling: ceil, skip: ['w'], gaps: { n: [{ at: 22, width: 2.6, height: 3.2 }] } }));
  // Z4 ice lab
  addAll(room({ x0: 14, x1: 30, z0: -46, z1: -32, h: 4.5, floor: labFloor, wall: coolWall, ceiling: ceil, skip: ['s', 'e'], tile: 1 }));
  // Z5 cave
  addAll(room({ x0: 30, x1: 44, z0: -48, z1: -30, h: 6, floor: caveFloor, wall: ROCK, ceiling: ROCK, gaps: { w: [{ at: -39, width: 2.4, height: 2.8 }], s: [{ at: 37, width: 2.0, height: 2.6 }] }, tile: 3 }));
  // Shortcut tunnels
  add(box(2, 0.2, 31, tunnelFloor, 37, -0.1, -14.5));
  add(box(26, 0.2, 2, tunnelFloor, 23, -0.1, 0));
  add(box(2.3, 0.2, 31.3, darkCeil, 37, 2.7, -14.5));
  add(box(26.3, 0.2, 2.3, darkCeil, 23, 2.7, 0));
  addAll(wallWithGaps('z', 36, -30, -1, 2.6, warmWall));
  addAll(wallWithGaps('z', 38, -30, 1, 2.6, warmWall));
  addAll(wallWithGaps('x', -1, 10, 36, 2.6, warmWall));
  addAll(wallWithGaps('x', 1, 10, 38, 2.6, warmWall));
  for (const [x, z, w, d] of [[37, -14.5, 0.12, 30], [23, 0, 26, 0.12]] as const) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(w, d), greenStrip);
    s.rotation.x = -Math.PI / 2;
    s.position.set(x, 0.01, z);
    root.add(s);
  }

  // ----- gates and doors ---------------------------------------------------------
  const gateMat = new THREE.MeshPhongMaterial({ map: rep(gridTexture('#2b2d33', '#5f646d')), shininess: 70 });
  const makeGate = (w: number, h: number, d: number, x: number, z: number) => {
    const mesh = box(w, h, d, gateMat, x, h / 2, z);
    mesh.userData.dynamic = true;
    root.add(mesh);
    return mesh;
  };
  const world = new World(solids, [
    { box: new THREE.Box3(new THREE.Vector3(-6, -1, -32), new THREE.Vector3(14, 3, -16)), surface: 'snow' },
    { box: new THREE.Box3(new THREE.Vector3(-6, -1, -12), new THREE.Vector3(-2, 3, -8)), surface: 'snow' },
    { box: new THREE.Box3(new THREE.Vector3(36, -1, -30), new THREE.Vector3(38, 3, 1)), surface: 'grate' },
    { box: new THREE.Box3(new THREE.Vector3(10, -1, -1), new THREE.Vector3(38, 3, 1)), surface: 'grate' },
  ]);

  // ----- Z0: start ---------------------------------------------------------------
  const backShutter = makeGate(0.12, 2.6, 2.4, 0.05, 0);
  const backCollider = world.addDynamic([box(0.3, 2.6, 2.4, MAT.trim, 0.05, 1.3, 0)]);
  const passageLight = new THREE.PointLight(0x3bd16f, 0, 7, 1.6);
  passageLight.position.set(-3, 2.2, 0);
  root.add(passageLight);
  const passageStrip = new THREE.MeshBasicMaterial({ color: 0x1b2a20 });
  const pstrip = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 0.12), passageStrip);
  pstrip.rotation.x = -Math.PI / 2;
  pstrip.position.set(-3, 0.01, 0);
  root.add(pstrip);

  const eastDoor = makeGate(0.12, 2.6, 2.0, 9.95, 0);
  const eastCollider = world.addDynamic([box(0.3, 2.6, 2.0, MAT.trim, 9.95, 1.3, 0)]);
  const staffSign = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.32), new THREE.MeshBasicMaterial({ map: signTexture('STAFF ONLY', '#d63a2a', '#ffffff') }));
  staffSign.position.set(9.83, 2.95, 0);
  staffSign.rotation.y = -Math.PI / 2;
  add(staffSign, false);

  const table = new THREE.Group();
  table.add(box(2.2, 0.08, 1.1, MAT.trim, 0, 0.92, 0));
  for (const [x, z] of [[-1, -0.45], [1, -0.45], [-1, 0.45], [1, 0.45]]) table.add(box(0.06, 0.88, 0.06, MAT.metal, x, 0.44, z));
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshPhongMaterial({ map: gridTexture('#1d9757', '#38b673'), shininess: 10 }));
  mat.rotation.x = -Math.PI / 2;
  mat.position.y = 0.965;
  mat.userData.noCollide = true;
  table.add(mat);
  table.position.set(5, 0, 3.0);
  table.userData.dynamic = true;
  root.add(table);
  solids.push(table);
  const venus = artifactMesh(ID);
  venus.position.set(5, 0.97, 3.0);
  venus.visible = false;
  venus.traverse((o) => (o.userData.noCollide = true));
  root.add(venus);
  const z0Lamp = new THREE.PointLight(0xffd9a0, 5, 9, 1.6);
  z0Lamp.position.set(5, 3.0, 2.2);
  root.add(z0Lamp);

  const posters: { spec: FactPosterSpec; x: number; z: number; ry: number; y?: number; fig: string }[] = [
    { spec: HUNTERS_POSTER, x: 2.2, z: 3.84, ry: Math.PI, fig: 'Fig. 2' },
    { spec: ICE_LAYERS_POSTER, x: 9.6, z: -15.84, ry: 0, fig: 'Fig. 5' },
    { spec: ICE_CORE_POSTER, x: 11.84, z: -5.6, ry: -Math.PI / 2, fig: 'Fig. 6' },
    { spec: BONE_HUT_POSTER, x: 9, z: -16.16, ry: Math.PI, fig: 'Fig. 8' },
    { spec: MAMMOTH_POSTER, x: 26, z: -16.16, ry: Math.PI, fig: 'Fig. 13' },
    { spec: HEAT_POSTER, x: 14.16, z: -40, ry: Math.PI / 2, fig: 'Fig. 15' },
    { spec: CAVE_POSTER, x: 30.2, z: -36.5, ry: Math.PI / 2, fig: 'Fig. 19', y: 1.9 },
  ];
  for (const p of posters) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5), new THREE.MeshPhongMaterial({ map: factPosterTexture(p.spec), shininess: 30 }));
    m.position.set(p.x, p.y ?? 1.75, p.z);
    m.rotation.y = p.ry;
    m.userData.dynamic = true;
    root.add(m);
    exhibits.push({ object: m, anchor: m.position.clone().setY((p.y ?? 1.75) + 0.85), fig: p.fig, text: () => `${p.spec.title}. ${p.spec.fact}` });
  }

  // ----- Z1: ice cores and the glass case ---------------------------------------------
  const z1Lamp = new THREE.PointLight(0xe8f2ff, 6, 14, 1.4);
  z1Lamp.position.set(5, 4, -10);
  root.add(z1Lamp);
  // Rack on the east wall: four slots, youngest on the left as you face it.
  const rack = new THREE.Group();
  rack.add(box(0.5, 0.12, 3.2, MAT.wood, 0, 0.5, 0));
  rack.add(box(0.5, 0.12, 3.2, MAT.wood, 0, 1.6, 0));
  rack.add(box(0.08, 1.7, 3.3, MAT.darkWood, 0.22, 0.85, 0));
  rack.position.set(11.55, 0, -10);
  add(rack);
  const rackSign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.32), new THREE.MeshBasicMaterial({ map: signTexture('YOUNGEST  ←  →  OLDEST', '#15171c', '#ffffff') }));
  rackSign.position.set(11.6, 2.05, -10);
  rackSign.rotation.y = -Math.PI / 2;
  add(rackSign, false);
  // Layer spacing per core, thickest (youngest) first: the solution order.
  const SPACING = [26, 15, 8, 4];
  const slotZ = [-8.95, -9.65, -10.35, -11.05]; // left to right as seen from the room (facing +x)
  const order = [2, 0, 3, 1]; // which core sits in each slot at the start
  const cores = SPACING.map((s, i) => {
    const c = iceCore(s, i + 3);
    c.userData.dynamic = true;
    root.add(c);
    return c;
  });
  let selected = -1;
  const placeCores = () => {
    order.forEach((core, slot) => {
      cores[core].position.set(11.45, 1.05 + (slot === selected ? 0.12 : 0), slotZ[slot]);
    });
  };
  const coresSolved = () => has('cores');
  cores.forEach((c) => {
    interactables.push({
      id: `core-${cores.indexOf(c)}`,
      object: c,
      prompt: () => {
        if (coresSolved()) return null;
        const slot = order.indexOf(cores.indexOf(c));
        if (selected < 0) return 'Lift this core';
        return selected === slot ? 'Put it back' : 'Swap the cores';
      },
      interact: () => {
        const slot = order.indexOf(cores.indexOf(c));
        if (selected < 0) selected = slot;
        else {
          if (selected !== slot) [order[selected], order[slot]] = [order[slot], order[selected]];
          selected = -1;
          svc.sfx.cue('creak', c.position);
          if (order.every((core, i) => core === i)) {
            svc.commit(`${ID}/cores`);
            svc.toast('The cores are in order. Something clicks in the freezer.');
          }
        }
        placeCores();
      },
    });
  });
  const fz = freezer();
  fz.group.position.set(10.9, 0, -14.6);
  add(fz.group);
  const glassCase = new THREE.Group();
  const sill = box(0.4, 0.9, 4, MAT.trim, -2, 0.45, -10);
  add(sill);
  const glass = box(0.05, 1.9, 4, MAT.glass, -2, 1.85, -10);
  glass.userData.noCollide = true;
  glass.castShadow = false;
  glassCase.add(glass);
  root.add(glassCase);
  const caseMural = new THREE.Mesh(new THREE.PlaneGeometry(4, 3.2), new THREE.MeshPhongMaterial({ map: steppeMural(4), shininess: 4 }));
  caseMural.position.set(-5.84, 1.6, -10);
  caseMural.rotation.y = Math.PI / 2;
  add(caseMural, false);
  const caseLight = new THREE.PointLight(0x9fb8ff, 1.2, 5, 2);
  caseLight.position.set(-4, 2.9, -10);
  root.add(caseLight);
  // The hunter behind the glass: no brain, one rule. It steps closer only while unlit.
  const glassHunter = createHunterRig();
  const GLASS_START = new THREE.Vector3(-5.2, 0, -10.4);
  glassHunter.root.position.copy(GLASS_START);
  glassHunter.root.rotation.y = Math.PI / 2;
  glassHunter.apply(IDLE[0], 0);
  root.add(glassHunter.root);
  let glassTick = 0;
  let glassFrame = 0;
  exhibits.push({
    object: glassHunter.root,
    anchor: new THREE.Vector3(-3, 2.4, -10),
    fig: 'Fig. 4',
    text: () => (glassHunter.root.position.x > -4.2 ? 'Hunter, Upper Palaeolithic. Closer to the glass than it was.' : 'Hunter, Upper Palaeolithic. Hunted in darkness.'),
    warn: () => glassHunter.root.position.x > -4.2,
  });

  // ----- Z2: the diorama -------------------------------------------------------------
  const moon = new THREE.PointLight(0x7f9cd6, 2.2, 24, 1.2);
  moon.position.set(4, 4.6, -24);
  root.add(moon);
  const muralN = new THREE.Mesh(new THREE.PlaneGeometry(19.6, 4.8), new THREE.MeshPhongMaterial({ map: steppeMural(19.6), shininess: 4 }));
  muralN.position.set(4, 2.4, -31.83);
  add(muralN, false);
  const muralW = new THREE.Mesh(new THREE.PlaneGeometry(15.6, 4.8), new THREE.MeshPhongMaterial({ map: steppeMural(15.6), shininess: 4 }));
  muralW.position.set(-5.83, 2.4, -24);
  muralW.rotation.y = Math.PI / 2;
  add(muralW, false);
  const tentG = tent();
  tentG.position.set(-1.5, 0, -27.5);
  add(tentG);
  const hearthG = hearth();
  hearthG.position.set(3, 0, -24);
  add(hearthG, false);
  for (const [x, z, r, s] of [[8, -20, 1.0, 1], [10.5, -28.5, 1.3, 2], [0.5, -19.5, 0.8, 3], [-4, -30, 1.1, 4], [6.5, -27, 0.7, 5], [-3.5, -21.5, 0.9, 6]] as const) {
    const b = boulder(r, s);
    b.position.set(x, r * 0.45, z);
    add(b);
  }
  for (const [x, z, h] of [[6, -30.5, 4.2], [-3, -18, 3.6], [12, -21.5, 3.9], [1.5, -30.8, 3.2]] as const) {
    const t = deadTree(h);
    t.position.set(x, 0, z);
    add(t);
  }
  const looseBones: Record<BoneKind, THREE.Object3D> = {} as Record<BoneKind, THREE.Object3D>;
  const bonePlaces: Record<BoneKind, [number, number, number, number]> = {
    tusk: [3.8, 0.1, -22.6, 0.3],
    femur: [-1.4, 0.09, -25.6, 1.5],
    scapula: [11.8, 0.05, -30.2, 0.9],
  };
  for (const kind of BONES) {
    const b = boneMesh(kind);
    const [x, y, z, ry] = bonePlaces[kind];
    b.position.set(x, y, z);
    if (kind === 'femur') b.rotation.set(0, ry, Math.PI / 2);
    else if (kind === 'scapula') b.rotation.set(-Math.PI / 2, 0, ry);
    else b.rotation.set(0, ry, 0);
    b.scale.setScalar(kind === 'tusk' ? 0.8 : 1);
    const proxy = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    proxy.userData.noCollide = true;
    b.add(proxy);
    root.add(b);
    looseBones[kind] = b;
    interactables.push({
      id: `bone-${kind}`,
      object: b,
      prompt: () => (has(`bone-${kind}`) ? null : `Take the mammoth ${BONE_NAMES[kind]}`),
      interact: () => {
        progress.add(`${ID}/bone-${kind}`);
        b.visible = false;
        svc.toast(`Mammoth ${BONE_NAMES[kind]}. It belongs to the skeleton in the next hall.`);
      },
    });
  }
  exhibits.push(
    { object: tentG, anchor: new THREE.Vector3(-1.5, 3.1, -27.5), fig: 'Fig. 9', text: () => 'Shelter of hides over a frame of poles. On the treeless steppe, bone and hide replaced wood.' },
    { object: hearthG, anchor: new THREE.Vector3(3, 0.8, -24), fig: 'Fig. 10', text: () => 'Hearth. Where wood was scarce, Ice Age people burned bone as fuel.' },
    { object: muralN, anchor: new THREE.Vector3(4, 3.6, -31.6), fig: 'Fig. 7', text: () => 'Painted backdrop: the mammoth steppe, a cold, dry grassland that once reached from Spain to Canada.' },
  );

  // ----- Z3: the mammoth -------------------------------------------------------------
  const z3Lamps = [new THREE.PointLight(0xffd9a0, 6, 14, 1.4), new THREE.PointLight(0xffd9a0, 6, 14, 1.4)];
  z3Lamps[0].position.set(18, 5.5, -24);
  z3Lamps[1].position.set(26, 5.5, -24);
  z3Lamps.forEach((l) => root.add(l));
  add(box(6.2, 0.4, 3, MAT.marble, 22, 0.2, -24));
  const skel = mammothSkeleton();
  skel.group.position.set(21.8, 0.4, -24);
  skel.group.userData.dynamic = true;
  skel.group.traverse((o) => (o.userData.noCollide = true));
  root.add(skel.group);
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.5), new THREE.MeshBasicMaterial({ map: signTexture('MISSING: TUSK, FEMUR, SCAPULA', '#15171c', '#f2c230') }));
  plaque.position.set(22, 0.25, -22.48);
  add(plaque, false);
  const skullRest = skel.skull.rotation.y;
  const placed = (k: BoneKind) => has(`placed-${k}`);
  for (const kind of BONES) {
    const sock = skel.sockets[kind];
    const proxy = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    proxy.userData.noCollide = true;
    sock.ghost.add(proxy);
    interactables.push({
      id: `socket-${kind}`,
      object: sock.ghost,
      prompt: () => {
        if (placed(kind) || !sock.ghost.visible) return null;
        return has(`bone-${kind}`) ? `Fit the ${BONE_NAMES[kind]}` : `Missing: the ${BONE_NAMES[kind]}`;
      },
      interact: () => {
        if (!has(`bone-${kind}`)) {
          svc.toast(`The ${BONE_NAMES[kind]} is somewhere in the diorama of the hunters.`);
          return;
        }
        progress.add(`${ID}/placed-${kind}`);
        plaque.visible = !BONES.every(placed);
        svc.sfx.cue('creak', skel.group.position);
        syncSkeleton();
        if (BONES.every(placed)) {
          svc.commit(`${ID}/skeleton`);
          scare = 0.001;
        }
      },
    });
  }
  const syncSkeleton = () => {
    for (const kind of BONES) {
      skel.sockets[kind].ghost.visible = !placed(kind);
      skel.sockets[kind].real.visible = placed(kind);
      looseBones[kind].visible = !has(`bone-${kind}`);
    }
  };
  exhibits.push({
    object: skel.group,
    anchor: new THREE.Vector3(24, 3.9, -24),
    fig: 'Fig. 14',
    text: () =>
      has('skeleton')
        ? 'Woolly mammoth. It remembers the cold. It remembers you.'
        : `Woolly mammoth (Mammuthus primigenius). Its ridged molars ground tough steppe grass. ${BONES.filter((k) => !placed(k)).length ? 'Incomplete.' : ''}`,
    warn: () => has('skeleton'),
  });
  const northGate = makeGate(2.6, 3.2, 0.14, 22, -32);
  const northCollider = world.addDynamic([box(2.6, 3.2, 0.3, MAT.trim, 22, 1.6, -32)]);
  let scare = 0;

  // ----- Z4: the ice lab ---------------------------------------------------------------
  const labLamp = new THREE.PointLight(0xe8f2ff, 5, 13, 1.4);
  labLamp.position.set(18, 4, -37);
  root.add(labLamp);
  for (const [x, z, w, d] of [[17.2, -44.6, 3, 0.9], [21.5, -33.2, 2.4, 0.8]] as const) {
    add(box(w, 0.9, d, MAT.trim, x, 0.45, z));
  }
  const lampG = heatLamp();
  lampG.position.set(16, 0, -36);
  add(lampG);
  const lampGlow = new THREE.PointLight(0xff5530, 1.5, 4, 2);
  lampGlow.position.set(16.4, 1.2, -36);
  root.add(lampGlow);
  const MIRRORS = [
    { x: 20, z: -36, want: 1 },
    { x: 20, z: -43, want: 1 },
    { x: 27, z: -43, want: 3 },
  ];
  const mirrorState = [0, 2, 0];
  const mirrors = MIRRORS.map((m) => {
    const s = mirrorStand();
    s.group.position.set(m.x, 0, m.z);
    root.add(s.group);
    solids.push(s.group);
    return s;
  });
  const BLOCK = new THREE.Vector3(27, 0, -37);
  const iceBlock = box(1.1, 1.3, 1.1, ICE, BLOCK.x, 0.65, BLOCK.z);
  iceBlock.userData.dynamic = true;
  iceBlock.userData.noCollide = true;
  root.add(iceBlock);
  const blockCollider = world.addDynamic([box(1.1, 1.3, 1.1, MAT.trim, BLOCK.x, 0.65, BLOCK.z)]);
  let melt = 0;
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xff4020, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const beamSegs: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 6), beamMat);
    seg.userData.noCollide = true;
    seg.visible = false;
    root.add(seg);
    beamSegs.push(seg);
  }
  let beamHits = false;
  const traceBeam = () => {
    // States: 0 and 2 face the beam square on and stop it; 1 is "/" and 3 is "\".
    let pos = new THREE.Vector3(16.3, 1.2, -36);
    let dir = new THREE.Vector3(1, 0, 0);
    beamHits = false;
    let i = 0;
    for (; i < beamSegs.length; i++) {
      let best: { d: number; kind: 'mirror' | 'block'; idx: number } | null = null;
      MIRRORS.forEach((m, k) => {
        const to = new THREE.Vector3(m.x - pos.x, 0, m.z - pos.z);
        const along = to.dot(dir);
        const off = to.clone().addScaledVector(dir, -along).length();
        if (along > 0.3 && off < 0.3 && (!best || along < best.d)) best = { d: along, kind: 'mirror', idx: k };
      });
      if (melt < 1) {
        const to = new THREE.Vector3(BLOCK.x - pos.x, 0, BLOCK.z - pos.z);
        const along = to.dot(dir);
        const off = to.clone().addScaledVector(dir, -along).length();
        if (along > 0.3 && off < 0.5 && (!best || along < (best as { d: number }).d)) best = { d: along - 0.55, kind: 'block', idx: -1 };
      }
      const wallD = world.rayDistance(pos, dir, 30);
      const hit = best as { d: number; kind: 'mirror' | 'block'; idx: number } | null;
      const d = hit && hit.d < wallD ? hit.d : Math.min(wallD, 30);
      const seg = beamSegs[i];
      seg.visible = true;
      seg.scale.y = d;
      seg.position.copy(pos).addScaledVector(dir, d / 2);
      seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      if (!hit || hit.d >= wallD) break;
      if (hit.kind === 'block') {
        beamHits = true;
        break;
      }
      const st = mirrorState[hit.idx];
      if (st === 0 || st === 2) break;
      pos = pos.clone().addScaledVector(dir, hit.d);
      const u = st === 1 ? new THREE.Vector3(1, 0, -1).normalize() : new THREE.Vector3(1, 0, 1).normalize();
      dir = u.multiplyScalar(2 * dir.dot(u)).sub(dir).normalize();
    }
    for (i++; i < beamSegs.length; i++) beamSegs[i].visible = false;
  };
  const beamSolved = () => has('beam');
  mirrors.forEach((m, k) => {
    m.head.rotation.y = mirrorState[k] * (Math.PI / 4);
    interactables.push({
      id: `mirror-${k}`,
      object: m.group,
      prompt: () => (beamSolved() ? null : 'Turn the mirror'),
      interact: () => {
        mirrorState[k] = (mirrorState[k] + 1) % 4;
        m.head.rotation.y = mirrorState[k] * (Math.PI / 4);
        svc.sfx.cue('creak', m.group.position);
        traceBeam();
      },
    });
  });
  // The cold store door to the cave opens once the third fragment is out of the ice.
  const caveDoor = makeGate(0.14, 2.8, 2.4, 30, -39);
  const caveCollider = world.addDynamic([box(0.3, 2.8, 2.4, MAT.trim, 30, 1.4, -39)]);
  exhibits.push(
    { object: lampG, anchor: new THREE.Vector3(16, 1.8, -36), fig: 'Fig. 16', text: () => 'Infrared lamp. Infrared light carries heat you can feel but cannot see.' },
    { object: iceBlock, anchor: new THREE.Vector3(BLOCK.x, 1.6, BLOCK.z), fig: 'Fig. 17', text: () => 'Block of lake ice. Ice is lighter than water, which is why it floats.' },
    { object: mirrors[0].group, anchor: new THREE.Vector3(20, 1.8, -36), fig: 'Fig. 18', text: () => 'Mirror. Light leaves it at the same angle it arrives.' },
  );

  // ----- Z5: the cave -----------------------------------------------------------------
  // One fat lamp in the far corner lights both the pedestal and the plaster group sitting around it.
  const LAMP = new THREE.Vector3(41.2, 0, -45.2);
  const caveLight = new THREE.PointLight(0xffb070, 5, 13, 1.5);
  caveLight.position.set(40.2, 2.4, -43.4);
  root.add(caveLight);
  add(box(0.5, 0.5, 0.5, ROCK, LAMP.x, 0.25, LAMP.z));
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb040 }));
  flame.scale.y = 1.8;
  flame.position.set(LAMP.x, 0.62, LAMP.z);
  flame.userData.noCollide = true;
  root.add(flame);
  const ped = pedestal();
  ped.position.set(38, 0, -40);
  add(ped);
  for (const [x, z, r, s] of [[31.5, -46.5, 1.4, 7], [42.5, -33, 1.2, 9], [31.2, -31.4, 1.0, 10], [34, -47.4, 1.0, 11], [43.2, -38.5, 1.1, 12]] as const) {
    const b = boulder(r, s);
    b.position.set(x, r * 0.4, z);
    add(b);
  }
  for (const [x, z, h, r, down] of [[33, -43, 1.6, 0.3, false], [41, -35, 1.2, 0.25, false], [35, -34, 1.8, 0.2, true], [40.5, -36, 2.2, 0.3, true], [33.5, -38, 1.4, 0.22, true]] as const) {
    const sp = spike(h, r, down);
    sp.position.set(x, down ? 6 - h / 2 : h / 2, z);
    if (down) sp.userData.noCollide = true;
    add(sp, !down);
  }
  const painting = new THREE.Mesh(
    new THREE.PlaneGeometry(4, 1.6),
    new THREE.MeshPhongMaterial({ map: steppeMural(4), transparent: true, opacity: 0.35, shininess: 2 }),
  );
  painting.position.set(43.82, 2.8, -40);
  painting.rotation.y = -Math.PI / 2;
  add(painting, false);
  const shortcutGate = makeGate(2.0, 2.6, 0.14, 37, -30);
  const shortcutCollider = world.addDynamic([box(2.0, 2.6, 0.3, MAT.trim, 37, 1.3, -30)]);

  // ----- benches, cabinets, pickups ----------------------------------------------------
  const benchAt = (id: string, x: number, z: number, ry: number, faceYaw: number, spawnX: number, spawnZ: number): Checkpoint => {
    const b = benchMesh();
    b.group.position.set(x, 0, z);
    b.group.rotation.y = ry;
    b.group.userData.dynamic = true;
    b.lamp.visible = false; // the glowing bulb is enough; real lights are kept for the rooms
    root.add(b.group);
    solids.push(b.group);
    const cp: Checkpoint = { id, position: new THREE.Vector3(spawnX, 0, spawnZ), yaw: faceYaw, radius: 1.6 };
    interactables.push({ id: `${id}-rest`, object: b.group, prompt: () => 'Rest (save progress)', interact: () => svc.saveAtCheckpoint(cp) });
    return cp;
  };
  const start = benchAt(`${ID}-start`, 1.6, 3.4, Math.PI, -Math.PI / 2, 1.4, 0);
  const cpCores = benchAt(`${ID}-cores`, 0, -5.0, Math.PI, 0, 1.2, -6.4);
  const cpHall = benchAt(`${ID}-hall`, 28.6, -18, -Math.PI / 2, Math.PI / 2, 27, -18.5);
  const cpLab = benchAt(`${ID}-lab`, 15, -34, Math.PI / 2, -Math.PI / 2, 16.4, -34.4);
  // No bench at the cave mouth: reaching it saves, and taking the last fragment saves here again,
  // so being caught in the finale replays the escape instead of skipping it.
  const cpCave: Checkpoint = { id: `${ID}-cave`, position: new THREE.Vector3(32.2, 0, -39), yaw: -Math.PI / 2, radius: 1.4 };
  const checkpoints = [start, cpCores, cpHall, cpLab, cpCave];

  const cabinets = [
    cabinet(`${ID}/cabinet-a`, -4, -16.525, Math.PI, svc),
    cabinet(`${ID}/cabinet-b`, 12.4, -16.525, Math.PI, svc),
    cabinet(`${ID}/cabinet-c`, 29.475, -44.6, -Math.PI / 2, svc),
  ];
  for (const c of cabinets) {
    add(c.group);
    interactables.push(c.interactable);
  }

  const pickups = new Pickups(root, svc, interactables);
  pickups.fragment(`${ID}/fragment-1`, new THREE.Vector3(10.7, 0.95, -14.6), 1, coresSolved);
  pickups.fragment(`${ID}/fragment-2`, new THREE.Vector3(23, 0.3, -21.9), 2, () => has('skeleton'));
  pickups.fragment(`${ID}/fragment-3`, new THREE.Vector3(BLOCK.x, 0.45, BLOCK.z), 3, () => melt >= 1);
  pickups.fragment(`${ID}/fragment-4`, new THREE.Vector3(38, 1.3, -40), 4);
  pickups.battery(`${ID}/battery-1`, new THREE.Vector3(11.2, 0.92, -14.5), coresSolved);
  pickups.battery(`${ID}/battery-2`, new THREE.Vector3(-4.6, 0.05, -29.2));
  pickups.battery(`${ID}/battery-3`, new THREE.Vector3(21.5, 0.95, -33.2));
  pickups.battery(`${ID}/battery-4`, new THREE.Vector3(29.2, 0.05, -45.5));
  pickups.battery(`${ID}/battery-5`, new THREE.Vector3(31.6, 0.05, -41.2));

  // ----- hunters ------------------------------------------------------------------------
  root.add(world.collider);
  // The grid is built with every door open; the blockers below stand in for the shut ones.
  const doors = [backCollider, eastCollider, northCollider, caveCollider, shortcutCollider];
  doors.forEach((d) => (d.enabled = false));
  // Probes start under the lowest lintel (2.6 m) so every doorway reads as open floor.
  const nav = new NavGrid(world, { minX: -6, maxX: 44, minZ: -48, maxZ: 4, cell: 0.5, probeY: 2.5, height: HUNTER.height });
  const gateNorth = nav.addBlocker(20.6, -32.4, 23.4, -31.6);
  const gateShortcut = nav.addBlocker(35.8, -30.4, 38.2, -29.6);
  const gateEast = nav.addBlocker(9.6, -1.2, 10.4, 1.2);
  doors.forEach((d) => (d.enabled = true));
  const navZ2 = nav.restrict([AREA.z2]);
  const navZ2Z3 = nav.restrict([AREA.z2, AREA.z3]);
  const navGuard = nav.restrict([AREA.guard]);
  const navCave = nav.restrict([AREA.z5, AREA.tunnelA, AREA.tunnelB]);
  const snap = (n: NavGrid, x: number, z: number) => n.nearest(x, z) ?? new THREE.Vector3(x, 0, z);
  const spots = cabinets.map((c) => c.spot);
  const routeA = [snap(navZ2, -3.5, -24), snap(navZ2, 2.5, -30.5), snap(navZ2, 9, -31), snap(navZ2, 12.8, -25)];
  const routeB = [snap(navZ2, 12.5, -18), snap(navZ2, 4.5, -17.5), snap(navZ2, -4.5, -18.5), snap(navZ2, 1.5, -21.5)];
  const routeGuard = [snap(navGuard, 24.5, -40.5), snap(navGuard, 29, -40.5), snap(navGuard, 29, -45), snap(navGuard, 24.5, -45)];
  const hunterA = new Hunter({ id: 'hunter-a', start: routeA[0], route: routeA, spots, seed: 3 }, world, navZ2, svc);
  const hunterB = new Hunter({ id: 'hunter-b', start: routeB[0], route: routeB, spots, seed: 5 }, world, navZ2, svc);
  const guard = new Hunter({ id: 'guard', start: routeGuard[0], route: routeGuard, spots, seed: 9 }, world, navGuard, svc);
  // Far enough from the pedestal (about 5.5 m) that a player who runs at once reaches the gate first.
  const trio = [
    [39.6, -45.4],
    [42.8, -44.6],
    [41.4, -46.9],
  ].map(([x, z], i) => {
    const s = snap(navCave, x, z);
    const heading = Math.atan2(LAMP.x - s.x, LAMP.z - s.z);
    return new Hunter({ id: `cave-${i}`, start: s, route: [s], spots: [], seed: 20 + i, heading }, world, navCave, svc);
  });
  const hunters = [hunterA, hunterB, guard, ...trio];
  for (const h of hunters) root.add(h.rig.root);
  const hunterAnchors = hunters.map(() => new THREE.Vector3());
  hunters.forEach((h, i) => {
    const isTrio = trio.includes(h);
    exhibits.push({
      object: h.rig.root,
      anchor: hunterAnchors[i],
      fig: `Fig. ${[11, 12, 20, 21][Math.min(i, 3)]}`,
      text: () => {
        if (h.state === 'chase') return 'Hunter, Upper Palaeolithic. Hunting now.';
        if (isTrio && !h.active) return 'Hunters around a lamp, plaster group, 1936. Upper Palaeolithic people lit caves with lamps of burning fat.';
        return 'Hunter, Upper Palaeolithic. Lived some 30,000 years ago. Hunted in darkness.';
      },
      warn: () => h.state === 'chase' || (isTrio && h.active),
    });
  });

  mergeStatic(statics);

  // ----- state -------------------------------------------------------------------------
  let finale = false;
  let blackout = 0;
  let homeSafe = false;
  let opening = 0;
  let travelled = false;
  let flicker = 0;

  const sync = () => {
    const assembled = progress.isAssembled(ID);
    backCollider.enabled = !assembled;
    venus.visible = assembled;
    passageLight.intensity = assembled ? 2.2 : 0;
    passageStrip.color.set(assembled ? 0x3bd16f : 0x1b2a20);
    if (!assembled) {
      backShutter.position.y = 1.3;
      opening = 0;
    } else {
      backShutter.position.y = 3.7;
      opening = 1;
    }
    // Cores and freezer
    if (coresSolved()) order.splice(0, 4, 0, 1, 2, 3);
    selected = -1;
    placeCores();
    fz.lid.rotation.x = coresSolved() ? -1.6 : 0;
    // Skeleton and the gate north
    syncSkeleton();
    const done = has('skeleton');
    northCollider.enabled = !done;
    northGate.position.y = done ? 3.2 + 1.6 : 1.6;
    gateNorth.set(!done);
    skel.skull.rotation.y = done ? skullRest - 0.7 : skullRest;
    plaque.visible = !BONES.every(placed);
    for (const h of [hunterA, hunterB]) h.setTerritory(done ? navZ2Z3 : navZ2);
    scare = 0;
    // Beam and the ice block
    if (beamSolved()) mirrorState.splice(0, 3, ...MIRRORS.map((m) => m.want));
    mirrors.forEach((m, k) => (m.head.rotation.y = mirrorState[k] * (Math.PI / 4)));
    melt = beamSolved() ? 1 : 0;
    blockCollider.enabled = melt < 1;
    iceBlock.visible = melt < 1;
    traceBeam();
    const caveOpen = has('fragment-3');
    caveCollider.enabled = !caveOpen;
    caveDoor.position.y = caveOpen ? 4.2 : 1.4;
    // Finale: fragment 4 taken but the Venus not yet assembled
    finale = has('fragment-4') && !assembled;
    homeSafe = assembled;
    blackout = finale ? 0.001 : 0;
    const shortcutOpen = finale;
    shortcutCollider.enabled = !shortcutOpen;
    shortcutGate.position.y = shortcutOpen ? 3.9 : 1.3;
    gateShortcut.set(!shortcutOpen);
    const eastOpen = finale;
    eastCollider.enabled = !eastOpen;
    eastDoor.position.y = eastOpen ? 3.9 : 1.3;
    gateEast.set(!eastOpen);
    for (const h of hunters) h.reset();
    for (const h of trio) h.active = false;
    caveLight.intensity = assembled ? 0 : 5;
    flame.visible = caveLight.intensity > 0.5;
    glassHunter.root.position.copy(GLASS_START);
    glassHunter.apply(IDLE[0], 0);
  };

  const startFinale = () => {
    svc.saveAtCheckpoint(cpCave);
    finale = true;
    blackout = 0.001;
    svc.sfx.cue('chase', new THREE.Vector3(38, 2, -40));
    svc.toast('The lamp goes out. Somewhere in the dark, a gate grinds open.');
    shortcutCollider.enabled = false;
    gateShortcut.set(false);
    eastCollider.enabled = false;
    gateEast.set(false);
  };

  const inZone = (feet: THREE.Vector3, a: Area) => inArea(a, feet);
  const Z1: Area = { minX: -2, maxX: 12, minZ: -16, maxZ: -4 };
  const Z0: Area = { minX: 0, maxX: 9.4, minZ: -4, maxZ: 4 };

  // The conservation table. Assembling ends the finale without resetting the hunters mid-run.
  interactables.push({
    id: `${ID}-table`,
    object: table,
    prompt: () => {
      if (progress.isAssembled(ID)) return null;
      return found() >= FRAGMENTS ? `Assemble the ${ch.artifact}` : `Conservation table (${found()} / ${FRAGMENTS} fragments)`;
    },
    interact: () => {
      if (found() < FRAGMENTS) {
        svc.toast('Not enough fragments yet.');
        return;
      }
      svc.commit(`${ID}/assembled`);
      svc.toast(`The ${ch.artifact} is whole again. Behind you, the passage is open.`);
      venus.visible = true;
      backCollider.enabled = false;
      passageLight.intensity = 2.2;
      passageStrip.color.set(0x3bd16f);
      opening = 0.001;
      finale = false;
      homeSafe = true;
      eastCollider.enabled = true;
      gateEast.set(true);
      eastDoor.position.y = 1.3;
    },
  });
  exhibits.push(
    {
      object: table,
      anchor: new THREE.Vector3(5, 1.3, 3.0),
      fig: 'Fig. 1',
      text: () =>
        progress.isAssembled(ID)
          ? `${ch.artifact}. Fired clay, about 29,000 years old: one of the oldest ceramic figures known. Assembled again after closing.`
          : 'Conservation table. The fragments of the figurine are assembled here.',
    },
    {
      object: backShutter,
      anchor: new THREE.Vector3(0.1, 2.9, 0),
      fig: 'Fig. 3',
      text: () => (progress.isAssembled(ID) ? 'Way back to the Rotunda. Open.' : 'Way back to the Rotunda. Closed from this side.'),
    },
  );

  return {
    id: ID,
    title: ch.title,
    card: { kicker: `Chapter ${ch.numeral}`, title: ch.title, long: true },
    root,
    world,
    checkpoints,
    spawns: { start },
    interactables,
    exhibits,
    enemies: hunters,
    background: new THREE.Color(0x04070c),
    fog: new THREE.Fog(0x04070c, 8, 34),
    exposure: 1.05,
    status: () => {
      if (progress.isAssembled(ID)) return `Carrying: ${ch.artifact}`;
      const bones = BONES.filter((k) => has(`bone-${k}`) && !placed(k)).length;
      return `Fragments ${found()} / ${FRAGMENTS}${bones ? ` · Bones carried ${bones}` : ''}`;
    },
    debug: () => hunters.filter((h) => h.active).map((h) => `${h.state[0]}${h.frozen ? '*' : ''}`).join(' '),
    onRespawn() {
      sync();
    },
    update(dt, t, feet) {
      pickups.update(t);
      for (const c of cabinets) c.update(dt);
      if (venus.visible) venus.rotation.y = t * 0.4;

      // Passage back opens after assembling.
      if (opening > 0 && opening < 1) {
        opening = Math.min(1, opening + dt / 1.6);
        backShutter.position.y = 1.3 + opening * opening * 2.4;
      }

      // Hunters: only those near enough are drawn; all of them think.
      if (svc.player.active) for (const h of hunters) h.update(dt);
      hunters.forEach((h, i) => {
        hunterAnchors[i].copy(h.rig.root.position).setY(h.rig.root.position.y + 2.35);
        h.rig.root.visible = h.rig.root.position.distanceTo(feet) < 30;
      });

      // The glass case hunter steps towards the glass while nobody lights it.
      if (inZone(feet, Z1) && svc.player.active) {
        glassHunter.root.updateMatrixWorld(true);
        const v = new THREE.Vector3();
        const lit = glassHunter.probes.some((p) => svc.player.lights(p.getWorldPosition(v)));
        glassTick -= dt;
        if (!lit && glassTick <= 0) {
          glassTick = 0.1;
          const p = glassHunter.root.position;
          const close = p.x >= -2.75;
          if (!close) p.x = Math.min(-2.75, p.x + 0.09);
          glassFrame = (glassFrame + 1) % 4;
          const head = Math.atan2(feet.x - p.x, feet.z - p.z) - glassHunter.root.rotation.y;
          glassHunter.apply(close ? ALERT[glassFrame % 2] : WALK[glassFrame], THREE.MathUtils.clamp(Math.atan2(Math.sin(head), Math.cos(head)), -1.2, 1.2));
        }
      }

      // P1: freezer lid
      if (coresSolved() && fz.lid.rotation.x > -1.6) fz.lid.rotation.x = Math.max(-1.6, fz.lid.rotation.x - dt * 2);

      // P2: the scare. The skull turns to you, the lamps stutter, the hunters are let into the hall.
      if (scare > 0 && scare < 3) {
        scare += dt;
        const k = Math.min(1, (scare - 0.2) / 0.35);
        if (k > 0) {
          const want = Math.atan2(-(feet.z - (-24)), feet.x - 22) - skel.group.rotation.y;
          skel.skull.rotation.y = skullRest + THREE.MathUtils.clamp(want, -0.9, 0.9) * THREE.MathUtils.smoothstep(k, 0, 1);
        }
        if (scare > 1.2 && northCollider.enabled) {
          northCollider.enabled = false;
          gateNorth.set(false);
          for (const h of [hunterA, hunterB]) {
            h.setTerritory(navZ2Z3);
            h.alert();
          }
          svc.toast('Run. The gate past the mammoth is open.');
        }
        if (scare > 1.2) northGate.position.y = Math.min(4.8, northGate.position.y + dt * 2.2);
        flicker = 1;
      }
      flicker = Math.max(0, flicker - dt * 0.25);
      const chasing = hunters.some((h) => h.active && h.state === 'chase');
      const stutter = (flicker > 0 || chasing) && Math.sin(t * 29) + Math.sin(t * 11.3) > 1.1;
      z3Lamps.forEach((l) => (l.intensity = stutter ? 0.6 : has('skeleton') ? 3.5 : 6));

      // P3: melting the block once the beam reaches it.
      if (!beamSolved() && beamHits) {
        melt = Math.min(1, melt + dt / 3);
        iceBlock.scale.set(1 - melt * 0.6, 1 - melt * 0.85, 1 - melt * 0.6);
        iceBlock.position.y = 0.65 * (1 - melt * 0.85);
        if (melt >= 1) {
          iceBlock.visible = false;
          blockCollider.enabled = false;
          svc.commit(`${ID}/beam`);
          svc.toast('The ice gives up the third fragment.');
          traceBeam();
        }
      }
      // The cold store opens once fragment 3 is taken.
      if (has('fragment-3') && caveCollider.enabled) {
        caveCollider.enabled = false;
        svc.toast('A door unlocks at the far end of the lab.');
      }
      if (!caveCollider.enabled && caveDoor.position.y < 4.2) caveDoor.position.y = Math.min(4.2, caveDoor.position.y + dt * 1.5);

      // Finale
      if (!finale && has('fragment-4') && !progress.isAssembled(ID)) startFinale();
      if (finale && blackout > 0 && blackout < 2) {
        blackout += dt;
        caveLight.intensity = Math.max(0, 5 * (1 - blackout * 2));
        flame.visible = caveLight.intensity > 0.5;
        if (blackout > 1.2 && !trio[0].active) {
          for (const h of trio) {
            h.active = true;
            h.alert();
          }
        }
      }
      if (finale) {
        shortcutGate.position.y = Math.min(3.9, shortcutGate.position.y + dt * 1.6);
        eastDoor.position.y = Math.min(3.9, eastDoor.position.y + dt * 1.6);
        // Home: the door slams behind you and they stay on the other side.
        if (!homeSafe && inZone(feet, Z0)) {
          homeSafe = true;
          eastCollider.enabled = true;
          gateEast.set(true);
          eastDoor.position.y = 1.3;
          svc.sfx.cue('open', new THREE.Vector3(10, 1.3, 0));
          svc.toast('The staff door slams shut behind you. Assemble the Venus.');
        }
        if (homeSafe) eastDoor.position.y = 1.3;
      }

      // Back to the rotunda once assembled.
      if (!travelled && progress.isAssembled(ID) && feet.x < -4.4 && Math.abs(feet.z) < 1.2) {
        travelled = true;
        svc.travel('rotunda', `from-${ID}`);
      }
    },
    refresh() {
      pickups.refresh();
      sync();
      travelled = false;
    },
  } satisfies Level & { enemies: Hunter[] };
}
