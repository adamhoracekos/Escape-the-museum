import * as THREE from 'three';
import type { Exhibit, Interactable } from '../interaction/types';
import { World, type SurfaceZone } from '../world/World';
import { MAT, benchMesh, box, bustMesh, coveredStatue, wall } from '../world/props';
import { checkerTexture, gridTexture, noiseTexture, posterTexture, signTexture } from '../world/textures';
import type { Checkpoint, Level, LevelServices } from './Level';
import { Pickups } from './pickups';

/**
 * Greybox test level from step 2, kept as a debug-only level (debug panel, key 0): movement, crouching, ramps and stairs,
 * flashlight in a dark room, pickups, labels, checkpoints and noise surfaces.
 *
 *  Room A "Conservation Lab"  x -6..6,  z -5..5   (dimly lit, safe)
 *  Room B "Storage Gallery"   x  6..20, z -7..7   (dark: ramp, stairs, surfaces)
 *  Crawlspace                 x 20..24, z -0.8..0.8, 1.3 m high (crouch only)
 *  Alcove                     x 24..27, z -2..2
 */
export function createTestRoom(svc: LevelServices): Level {
  const root = new THREE.Group();
  const solids: THREE.Object3D[] = [];
  const add = (o: THREE.Object3D, solid = true) => {
    root.add(o);
    if (solid) solids.push(o);
    return o;
  };
  const H = 4;

  // Floor and ceilings
  const floorTex = checkerTexture('#20306e', '#efe9da', 2);
  floorTex.repeat.set(33 / 1.2, 14 / 1.2);
  const floorMat = new THREE.MeshPhongMaterial({ map: floorTex, shininess: 60, specular: 0x333333 });
  const floor = box(33, 0.2, 14, floorMat, 10.5, -0.1, 0);
  floor.castShadow = false;
  add(floor);
  const ceilMat = new THREE.MeshPhongMaterial({ color: 0xd9d2c0, shininess: 5 });
  add(box(12.6, 0.2, 10.6, ceilMat, 0, H + 0.1, 0));
  add(box(14, 0.2, 14, ceilMat, 13, H + 0.1, 0));

  // Room A walls, door to B at x = 6, z -1..1, 2.4 m high
  add(wall(-6, -5, 6, -5, 0, H, MAT.wall));
  add(wall(-6, 5, 6, 5, 0, H, MAT.wall));
  add(wall(-6, -5, -6, 5, 0, H, MAT.wall));
  add(wall(6, -7, 6, -1, 0, H, MAT.wall));
  add(wall(6, 1, 6, 7, 0, H, MAT.wall));
  add(wall(6, -1, 6, 1, 2.4, H - 2.4, MAT.wall));
  for (const z of [-1.08, 1.08]) add(box(0.4, 2.4, 0.16, MAT.trim, 6, 1.2, z));
  const doorSign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), new THREE.MeshBasicMaterial({ map: signTexture('STORAGE', '#d63a2a', '#ffffff') }));
  doorSign.position.set(5.84, 2.85, 0);
  doorSign.rotation.y = -Math.PI / 2;
  add(doorSign, false);

  // Room B walls, crawlspace opening at x = 20, z -0.8..0.8, 1.3 m high
  add(wall(6, -7, 20, -7, 0, H, MAT.wall));
  add(wall(6, 7, 20, 7, 0, H, MAT.wall));
  add(wall(20, -7, 20, -0.8, 0, H, MAT.wall));
  add(wall(20, 0.8, 20, 7, 0, H, MAT.wall));
  add(wall(20, -0.8, 20, 0.8, 1.3, H - 1.3, MAT.wall));

  // Crawlspace and alcove
  add(wall(20, -0.8, 24, -0.8, 0, 1.3, MAT.wall, 0.2));
  add(wall(20, 0.8, 24, 0.8, 0, 1.3, MAT.wall, 0.2));
  add(box(4, 0.2, 1.8, ceilMat, 22, 1.4, 0));
  add(wall(24, -2, 27, -2, 0, 2.5, MAT.wall));
  add(wall(24, 2, 27, 2, 0, 2.5, MAT.wall));
  add(wall(27, -2, 27, 2, 0, 2.5, MAT.wall));
  add(wall(24, -2, 24, -0.8, 0, 2.5, MAT.wall));
  add(wall(24, 0.8, 24, 2, 0, 2.5, MAT.wall));
  add(wall(24, -0.8, 24, 0.8, 1.3, 1.2, MAT.wall));
  add(box(3.2, 0.2, 4.2, ceilMat, 25.5, 2.6, 0));

  // Room A furniture
  const table = new THREE.Group();
  table.add(box(2.2, 0.08, 1.1, MAT.trim, 0, 0.92, 0));
  for (const [x, z] of [[-1, -0.45], [1, -0.45], [-1, 0.45], [1, 0.45]]) table.add(box(0.06, 0.88, 0.06, MAT.metal, x, 0.44, z));
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshPhongMaterial({ map: gridTexture('#1d9757', '#38b673'), shininess: 10 }));
  mat.rotation.x = -Math.PI / 2;
  mat.position.y = 0.965;
  mat.userData.noCollide = true;
  table.add(mat);
  table.position.set(0, 0, -1.5);
  add(table);

  const vitrine = new THREE.Group();
  vitrine.add(box(1, 0.9, 1, MAT.trim, 0, 0.45, 0));
  const glass = box(1, 1.1, 1, MAT.glass, 0, 1.45, 0);
  glass.castShadow = false;
  vitrine.add(glass);
  const bust = bustMesh();
  bust.position.y = 0.9;
  bust.rotation.y = -0.5;
  vitrine.add(bust);
  vitrine.position.set(-4, 0, -3.5);
  add(vitrine);

  const poster = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 1.5),
    new THREE.MeshPhongMaterial({
      shininess: 30,
      map: posterTexture('How to Survive After Closing Time', 'Illustrated Encyclopedia · Vol. 2', '#f2c230', '#15171c', (g, w) => {
        g.fillStyle = '#15171c';
        g.font = '600 26px Jost, Futura, sans-serif';
        g.textAlign = 'left';
        const tips = ['1. Keep your light on them.', '2. Walk. Running is loud.', '3. Rest where the lamps are green.', '4. Do not read every label.'];
        tips.forEach((t, i) => g.fillText(t, 50, 230 + i * 70));
        g.strokeStyle = '#d63a2a';
        g.lineWidth = 6;
        g.beginPath();
        g.arc(w / 2, 560, 60, 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = '#15171c';
        g.beginPath();
        g.arc(w / 2, 560, 18, 0, Math.PI * 2);
        g.fill();
      }),
    }),
  );
  poster.position.set(-5.84, 1.75, 1);
  poster.rotation.y = Math.PI / 2;
  add(poster, false);

  // Lighting: Room A dim and warm, Room B practically dark.
  root.add(new THREE.HemisphereLight(0x3a4466, 0x0b0a08, 0.25));
  const labLamp = new THREE.PointLight(0xffd9a0, 6, 9, 1.6);
  labLamp.position.set(0, 3.2, -1.5);
  root.add(labLamp);
  const pendant = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 0.25, 20, 1, true), new THREE.MeshPhongMaterial({ color: 0x1d9757, side: THREE.DoubleSide }));
  pendant.position.set(0, 3.45, -1.5);
  pendant.userData.noCollide = true;
  root.add(pendant);
  const exitLight = new THREE.PointLight(0x3bd16f, 0.6, 3.5, 2);
  exitLight.position.set(19.6, 1.8, 0);
  root.add(exitLight);
  const exitSign = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.22), new THREE.MeshBasicMaterial({ map: signTexture('EXIT?', '#1d9757', '#ffffff') }));
  exitSign.position.set(19.83, 1.7, 0);
  exitSign.rotation.y = -Math.PI / 2;
  root.add(exitSign);

  // Room B: ramp up to a platform, stairs back down, pillars and crates.
  add(box(4, 1.2, 3, MAT.crate, 17, 0.6, -5.3));
  const rampLen = Math.hypot(5, 1.2);
  const ramp = box(rampLen, 0.2, 2.2, MAT.crate, 12.5, 0.5, -5.6);
  ramp.rotation.z = Math.atan2(1.2, 5);
  add(ramp);
  for (let i = 0; i < 7; i++) {
    const h = 1.2 - (i + 1) * (1.2 / 7);
    if (h <= 0.01) continue;
    add(box(1.8, h, 0.36, MAT.crate, 17, h / 2, -3.62 + i * 0.36));
  }
  for (const [x, z] of [[9, -2.5], [13, 2.2], [9, 5.5]]) {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, H, 20), MAT.trim);
    col.position.set(x, H / 2, z);
    col.castShadow = col.receiveShadow = true;
    add(col);
  }
  for (const [x, z, s] of [[11, -1.2, 1], [11.9, -1.6, 0.7], [15.5, 5.6, 1.1], [18.6, 3.8, 0.8]]) add(box(s, s, s, MAT.crate, x, s / 2, z));

  const statue = coveredStatue();
  statue.position.set(14.5, 0, 0.3);
  add(statue);

  // Noise test surfaces in Room B (GDD 3: snow 0.7, sand 1.3, grate 1.6).
  const surfaces: SurfaceZone[] = [];
  const patch = (x: number, z: number, w: number, d: number, mat: THREE.Material, surface: SurfaceZone['surface']) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.012, z);
    m.receiveShadow = true;
    root.add(m);
    surfaces.push({ surface, box: new THREE.Box3(new THREE.Vector3(x - w / 2, -1, z - d / 2), new THREE.Vector3(x + w / 2, 3, z + d / 2)) });
    return m;
  };
  patch(8.5, 3, 2.6, 3, new THREE.MeshPhongMaterial({ map: noiseTexture('#eef4fb', '#c9d8e8'), shininess: 30 }), 'snow');
  patch(11.5, 4.5, 2.6, 3, new THREE.MeshLambertMaterial({ map: noiseTexture('#d9a441', '#b8862e', 1600) }), 'sand');
  const grateTex = gridTexture('#121316', '#5f646d');
  grateTex.repeat.set(3, 3);
  patch(17.5, 0.2, 3, 3, new THREE.MeshPhongMaterial({ map: grateTex, shininess: 90 }), 'grate');

  // Checkpoints
  const checkpoints: Checkpoint[] = [
    { id: 'lab-bench', position: new THREE.Vector3(-3.5, 0, 3), yaw: Math.atan2(-3.5, 4.5), radius: 1.8 },
    { id: 'storage-bench', position: new THREE.Vector3(7.6, 0, -4.8), yaw: -Math.PI / 2, radius: 1.8 },
  ];
  const benches = checkpoints.map((cp, i) => {
    const b = benchMesh();
    b.group.position.set(cp.position.x, 0, cp.position.z + (i === 0 ? 1.2 : -1.4));
    if (i === 1) b.group.rotation.y = Math.PI;
    add(b.group);
    return b;
  });

  // Pickups
  const interactables: Interactable[] = [];
  const pickups = new Pickups(root, svc, interactables);
  pickups.fragment('test-room/fragment-1', new THREE.Vector3(17.5, 1.45, -5.6), 1);
  pickups.fragment('test-room/fragment-2', new THREE.Vector3(26, 0.35, 0.5), 2);
  pickups.battery('test-room/battery-1', new THREE.Vector3(0.6, 1.0, -1.4));
  pickups.battery('test-room/battery-2', new THREE.Vector3(18.6, 0.85, 3.8));
  pickups.battery('test-room/battery-3', new THREE.Vector3(25.2, 0.05, -1.3));
  const found = () => svc.progress.fragments('test-room');

  const TOTAL = 2;
  let assembled = false;
  interactables.push({
    id: 'conservation-table',
    object: table,
    prompt: () => {
      if (assembled) return null;
      const n = found();
      return n >= TOTAL ? 'Assemble the fragments' : `Conservation table (${n} / ${TOTAL} fragments)`;
    },
    interact: () => {
      if (found() >= TOTAL) {
        assembled = true;
        svc.toast('Test artifact assembled. In a real level the way back to the rotunda would open now.');
      } else svc.toast('Not enough fragments yet.');
    },
  });
  checkpoints.forEach((cp, i) =>
    interactables.push({ id: `${cp.id}-rest`, object: benches[i].group, prompt: () => 'Rest (save progress)', interact: () => svc.saveAtCheckpoint(cp) }),
  );

  // Labels
  const exhibits: Exhibit[] = [
    { object: table, anchor: new THREE.Vector3(0, 1.1, -1.5), fig: 'Fig. 1', text: () => 'Conservation table. Fragments are assembled here.' },
    {
      object: vitrine,
      anchor: new THREE.Vector3(-4, 1.9, -3.5),
      fig: 'Fig. 2',
      text: () => (found() >= 1 ? 'Bust of a donor. It has turned to look at the door.' : 'Bust of a donor, marble, 1891.'),
      warn: () => found() >= 1,
    },
    {
      object: statue,
      anchor: new THREE.Vector3(14.5, 1.7, 0.3),
      fig: 'Fig. 3',
      text: () => (found() >= 2 ? 'Covered exhibit. Facing you.' : 'Covered exhibit. Facing the wall.'),
      warn: () => found() >= 2,
    },
    { object: poster, anchor: new THREE.Vector3(-5.8, 2.3, 1), fig: 'Fig. 4', text: () => 'Visitor guidance, printed after closing.' },
  ];

  const world = new World(solids, surfaces, 'tile');
  root.add(world.collider);

  return {
    id: 'test-room',
    title: 'Conservation Lab (test build)',
    card: { kicker: 'Debug', title: 'Test room', long: false },
    root,
    world,
    checkpoints,
    spawns: { start: checkpoints[0] },
    interactables,
    exhibits,
    background: new THREE.Color(0x020306),
    fog: null,
    exposure: 1.05,
    status: () => `Fragments ${found()} / ${TOTAL}`,
    update(_dt, t) {
      pickups.update(t);
      bust.rotation.y = found() >= 1 ? 0.9 : -0.5;
      statue.rotation.y = found() >= 2 ? Math.PI * 0.5 : -Math.PI * 0.5;
      exitLight.intensity = Math.sin(t * 9) + Math.sin(t * 3.7) > 1.5 ? 0.05 : 0.6;
      benches.forEach((b) => (b.lamp.intensity = 3 + Math.sin(t * 1.3) * 0.15));
    },
    refresh() {
      pickups.refresh();
    },
  };
}
