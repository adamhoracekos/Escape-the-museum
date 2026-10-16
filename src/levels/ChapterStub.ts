import * as THREE from 'three';
import type { Exhibit, Interactable } from '../interaction/types';
import type { Chapter } from '../progress/chapters';
import { artifactMesh } from '../world/artifacts';
import { mergeStatic } from '../world/merge';
import { MAT, benchMesh, box, coveredStatue, wall } from '../world/props';
import { checkerTexture, gridTexture, noiseTexture, posterTexture, signTexture } from '../world/textures';
import { World, type SurfaceZone } from '../world/World';
import type { Checkpoint, Level, LevelServices } from './Level';
import { Pickups } from './pickups';

const FRAGMENTS = 4;

interface Theme {
  floor: THREE.Material;
  surface: SurfaceZone['surface'];
  fog: number;
  ambientSky: number;
  ambientGround: number;
  accent: THREE.Material;
  props: (add: (o: THREE.Object3D, solid?: boolean) => THREE.Object3D) => void;
  watcher: { fig: string; calm: string; alarmed: string };
}

function themeFor(ch: Chapter): Theme {
  if (ch.id === 'egypt') {
    const stone = new THREE.MeshPhongMaterial({ color: 0xc9a25e, shininess: 10, flatShading: true });
    return {
      floor: new THREE.MeshLambertMaterial({ map: repeat(noiseTexture('#d9a441', '#b8862e', 1600), 8) }),
      surface: 'sand',
      fog: 0x0a0703,
      ambientSky: 0x6a4a22,
      ambientGround: 0x0b0804,
      accent: stone,
      props: (add) => {
        for (const [x, z] of [[9, -4.2], [9, 4.2]]) {
          const ob = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.5, 4.2, 4), stone);
          ob.position.set(x, 2.1, z);
          ob.rotation.y = Math.PI / 4;
          ob.castShadow = ob.receiveShadow = true;
          add(ob);
        }
        const sarc = new THREE.Group();
        sarc.add(box(2.3, 0.8, 0.95, stone, 0, 0.4, 0));
        sarc.add(box(2.4, 0.16, 1.05, MAT.gold, 0, 0.88, 0));
        sarc.position.set(15, 0, 0);
        add(sarc);
        for (const [x, z, s] of [[18.5, -5.2, 1], [12, 5.8, 0.8]]) {
          const mound = new THREE.Mesh(new THREE.SphereGeometry(s, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), stone);
          mound.scale.y = 0.35;
          mound.position.set(x, 0, z);
          mound.userData.noCollide = true;
          add(mound, false);
        }
      },
      watcher: { fig: 'Fig. 22', calm: 'The Curator, wrapped linen. Does not see you.', alarmed: 'The Curator. Does not see you. Hears you.' },
    };
  }
  const ice = new THREE.MeshPhongMaterial({ color: 0xbfe0f2, shininess: 140, specular: 0xffffff, transparent: true, opacity: 0.82 });
  return {
    floor: new THREE.MeshPhongMaterial({ map: repeat(noiseTexture('#eef4fb', '#c9d8e8'), 8), shininess: 30 }),
    surface: 'snow',
    fog: 0x04070c,
    ambientSky: 0x3a5a7a,
    ambientGround: 0x05070a,
    accent: ice,
    props: (add) => {
      for (const [x, z, w, h, d] of [[10, -4.8, 1.6, 1.8, 1.2], [16.6, -5.6, 1.2, 1.4, 1.6], [12.5, 4.8, 2, 1.2, 1.1], [19, 2.6, 1, 2.2, 1]]) {
        const b = box(w, h, d, ice, x, h / 2, z);
        b.rotation.y = (x * 0.37) % 0.6;
        add(b);
      }
      const tusk = new THREE.MeshPhongMaterial({ color: 0xe8dcc0, shininess: 50 });
      for (const s of [-1, 1]) {
        const t = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.11, 10, 32, Math.PI * 0.9), tusk);
        t.position.set(15, 0.15, s * 0.55);
        t.rotation.y = Math.PI / 2;
        t.castShadow = true;
        add(t);
      }
    },
    watcher: { fig: 'Fig. 11', calm: 'Hunter, Upper Palaeolithic. Hunted in darkness.', alarmed: 'Hunter, Upper Palaeolithic. Hunting now.' },
  };
}

function repeat(t: THREE.Texture, n: number): THREE.Texture {
  t.repeat.set(n, n);
  return t;
}

/**
 * Placeholder for a chapter until its real level is built (steps 5 and 6 of the plan).
 * It already has the full loop: arrive with the passage closing behind you, find four
 * fragments in a dark hall, assemble the artifact on the conservation table, and the
 * passage back to the rotunda lights up.
 *
 *  Antechamber   x -5..5,  z -4..4   (start, bench, conservation table)
 *  Passage back  x -10..-5, z -1..1  (shut until the artifact is assembled)
 *  Hall          x 5..21,  z -7..7   (dark, fragments)
 */
export function createChapterStub(ch: Chapter, svc: LevelServices): Level {
  const root = new THREE.Group();
  const statics = new THREE.Group();
  root.add(statics);
  const solids: THREE.Object3D[] = [statics];
  const add = (o: THREE.Object3D, solid = true) => {
    (solid ? statics : root).add(o);
    return o;
  };
  const theme = themeFor(ch);
  const progress = svc.progress;
  const HA = 3.4;
  const HB = 4.5;

  // Floors and ceilings
  const tile = checkerTexture('#20306e', '#efe9da', 2);
  tile.repeat.set(10 / 1.2, 8 / 1.2);
  add(box(10, 0.2, 8, new THREE.MeshPhongMaterial({ map: tile, shininess: 60, specular: 0x333333 }), 0, -0.1, 0));
  add(box(5.2, 0.2, 2.4, MAT.crate, -7.5, -0.1, 0));
  add(box(16, 0.2, 14, theme.floor, 13, -0.1, 0));
  const ceil = new THREE.MeshPhongMaterial({ color: 0xcfc8b6, shininess: 4 });
  add(box(10.6, 0.2, 8.6, ceil, 0, HA + 0.1, 0));
  add(box(5.2, 0.2, 2.6, ceil, -7.5, 2.7, 0));
  add(box(16.6, 0.2, 14.6, ceil, 13, HB + 0.1, 0));

  // Antechamber walls: passage back on the west, doorway to the hall on the east.
  add(wall(-5, -4, 5, -4, 0, HA, MAT.wall));
  add(wall(-5, 4, 5, 4, 0, HA, MAT.wall));
  add(wall(-5, -4, -5, -1, 0, HA, MAT.wall));
  add(wall(-5, 1, -5, 4, 0, HA, MAT.wall));
  add(wall(-5, -1, -5, 1, 2.6, HA - 2.6, MAT.wall));
  add(wall(5, -7, 5, -1.2, 0, HB, MAT.wall));
  add(wall(5, 1.2, 5, 7, 0, HB, MAT.wall));
  add(wall(5, -1.2, 5, 1.2, 2.8, HB - 2.8, MAT.wall));
  // Passage back
  add(wall(-10, -1, -5, -1, 0, 2.6, MAT.wall));
  add(wall(-10, 1, -5, 1, 0, 2.6, MAT.wall));
  add(wall(-10, -1, -10, 1, 0, 2.6, MAT.wall));
  // Hall walls
  add(wall(5, -7, 21, -7, 0, HB, MAT.wall));
  add(wall(5, 7, 21, 7, 0, HB, MAT.wall));
  add(wall(21, -7, 21, 7, 0, HB, MAT.wall));

  // The shutter that closed behind the player. It lifts once the artifact is assembled.
  const shutterMat = new THREE.MeshPhongMaterial({ map: repeat(gridTexture('#2b2d33', '#5f646d'), 2), shininess: 70 });
  const shutter = box(0.12, 2.6, 2.1, shutterMat, -5.05, 1.3, 0);
  shutter.userData.dynamic = true;
  root.add(shutter);
  const passageLight = new THREE.PointLight(0x3bd16f, 0, 7, 1.6);
  passageLight.position.set(-8, 2.2, 0);
  root.add(passageLight);
  const stripMat = new THREE.MeshBasicMaterial({ color: 0x1b2a20 });
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.12), stripMat);
  strip.rotation.x = -Math.PI / 2;
  strip.position.set(-7.6, 0.01, 0);
  root.add(strip);

  // Antechamber dressing
  const chapterPoster = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 1.5),
    new THREE.MeshPhongMaterial({
      shininess: 30,
      map: posterTexture(ch.title, `Chapter ${ch.numeral} · Illustrated Encyclopedia`, ch.color, ch.ink, (g, w) => {
        g.fillStyle = ch.ink;
        g.font = '800 160px Jost, Futura, sans-serif';
        g.textAlign = 'center';
        g.fillText(ch.numeral, w / 2, 420);
      }),
    }),
  );
  chapterPoster.position.set(-1.5, 1.8, 3.84);
  chapterPoster.rotation.y = Math.PI;
  add(chapterPoster, false);
  const notice = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.6), new THREE.MeshBasicMaterial({ map: signTexture('INSTALLATION IN PROGRESS', '#15171c', '#f2c230') }));
  notice.position.set(20.84, 2.6, 0);
  notice.rotation.y = -Math.PI / 2;
  add(notice, false);

  const table = new THREE.Group();
  table.add(box(2.2, 0.08, 1.1, MAT.trim, 0, 0.92, 0));
  for (const [x, z] of [[-1, -0.45], [1, -0.45], [-1, 0.45], [1, 0.45]]) table.add(box(0.06, 0.88, 0.06, MAT.metal, x, 0.44, z));
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshPhongMaterial({ map: gridTexture('#1d9757', '#38b673'), shininess: 10 }));
  mat.rotation.x = -Math.PI / 2;
  mat.position.y = 0.965;
  mat.userData.noCollide = true;
  table.add(mat);
  table.position.set(1.5, 0, -3.1);
  table.userData.dynamic = true;
  root.add(table);
  solids.push(table);
  const artifact = artifactMesh(ch.id);
  artifact.position.set(1.5, 0.97, -3.1);
  artifact.visible = false;
  artifact.traverse((o) => (o.userData.noCollide = true));
  root.add(artifact);

  // The watcher: a figure under a dust sheet whose label shifts register as you find fragments (GDD 10).
  const watcher = coveredStatue();
  watcher.position.set(17.5, 0, 4.5);
  watcher.userData.dynamic = true;
  root.add(watcher);
  solids.push(watcher);
  theme.props(add);
  for (const [x, z, s] of [[8.5, -5.6, 1], [7.4, -5.9, 0.7], [20, -6, 0.9]]) add(box(s, s, s, MAT.crate, x, s / 2, z));
  add(box(1.2, 1.1, 0.8, MAT.trim, 13, 0.55, -1.2));

  // Lighting: a warm lamp over the table, the hall left to the flashlight.
  root.add(new THREE.HemisphereLight(theme.ambientSky, theme.ambientGround, 0.22));
  const lamp = new THREE.PointLight(0xffd9a0, 5, 8, 1.6);
  lamp.position.set(1.5, 2.9, -2.6);
  root.add(lamp);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 0.25, 20, 1, true), new THREE.MeshPhongMaterial({ color: 0x1d9757, side: THREE.DoubleSide }));
  shade.position.set(1.5, 3.1, -2.6);
  shade.userData.noCollide = true;
  add(shade, false);

  // Checkpoint: the bench right where the player arrives.
  const start: Checkpoint = { id: `${ch.id}-start`, position: new THREE.Vector3(-3.6, 0, 0), yaw: -Math.PI / 2, radius: 1.6 };
  const bench = benchMesh();
  bench.group.position.set(-3.4, 0, 3.35);
  bench.group.rotation.y = Math.PI;
  bench.group.userData.dynamic = true;
  add(bench.group);

  // Pickups
  const interactables: Interactable[] = [];
  const pickups = new Pickups(root, svc, interactables);
  pickups.fragment(`${ch.id}/fragment-1`, new THREE.Vector3(8.5, 1.15, -5.6), 1);
  pickups.fragment(`${ch.id}/fragment-2`, new THREE.Vector3(13, 1.25, -1.2), 2);
  pickups.fragment(`${ch.id}/fragment-3`, new THREE.Vector3(20.2, 0.3, 6.2), 3);
  pickups.fragment(`${ch.id}/fragment-4`, new THREE.Vector3(19.9, 1.05, -6), 4);
  pickups.battery(`${ch.id}/battery-1`, new THREE.Vector3(7.4, 0.75, -5.9));
  pickups.battery(`${ch.id}/battery-2`, new THREE.Vector3(6, 0.05, 6.3));
  const found = () => progress.fragments(ch.id);

  interactables.push({
    id: `${ch.id}-table`,
    object: table,
    prompt: () => {
      if (progress.isAssembled(ch.id)) return null;
      return found() >= FRAGMENTS ? `Assemble the ${ch.artifact}` : `Conservation table (${found()} / ${FRAGMENTS} fragments)`;
    },
    interact: () => {
      if (found() < FRAGMENTS) {
        svc.toast('Not enough fragments yet.');
        return;
      }
      svc.commit(`${ch.id}/assembled`);
      svc.toast(`The ${ch.artifact} is whole again. Behind you, the passage is open.`);
      opening = 0.001;
      sync();
    },
  });
  interactables.push({ id: `${ch.id}-bench-rest`, object: bench.group, prompt: () => 'Rest (save progress)', interact: () => svc.saveAtCheckpoint(start) });

  const exhibits: Exhibit[] = [
    { object: table, anchor: new THREE.Vector3(1.5, 1.2, -3.1), fig: 'Fig. 1', text: () => (progress.isAssembled(ch.id) ? `${ch.artifact}. Assembled after closing.` : 'Conservation table. Fragments are assembled here.') },
    { object: chapterPoster, anchor: new THREE.Vector3(-1.5, 2.45, 3.8), fig: 'Fig. 2', text: () => `Chapter ${ch.numeral}: ${ch.title}. This gallery is still being installed.` },
    {
      object: watcher,
      anchor: new THREE.Vector3(17.5, 1.75, 4.5),
      fig: theme.watcher.fig,
      text: () => (found() >= 3 ? theme.watcher.alarmed : theme.watcher.calm),
      warn: () => found() >= 3,
    },
    {
      object: shutter,
      anchor: new THREE.Vector3(-5, 1.9, 0),
      fig: 'Fig. 3',
      text: () => (progress.isAssembled(ch.id) ? 'Way back to the Rotunda. Open.' : 'Way back to the Rotunda. Closed from this side.'),
    },
  ];

  const world = new World(solids, [{ box: new THREE.Box3(new THREE.Vector3(5, -1, -7), new THREE.Vector3(21, 3, 7)), surface: theme.surface }], 'tile');
  root.add(world.collider);
  const shutterCollider = world.addDynamic([box(0.3, 2.6, 2.1, MAT.trim, -5.05, 1.3, 0)]);
  mergeStatic(statics);

  let opening = 0;
  let travelled = false;
  function sync() {
    const open = progress.isAssembled(ch.id);
    shutterCollider.enabled = !open;
    artifact.visible = open;
    passageLight.intensity = open ? 2.2 : 0;
    stripMat.color.set(open ? 0x3bd16f : 0x1b2a20);
    if (!open) {
      shutter.position.y = 1.3;
      opening = 0;
    }
  }

  return {
    id: ch.id,
    title: ch.title,
    card: { kicker: `Chapter ${ch.numeral}`, title: ch.title, long: true },
    root,
    world,
    checkpoints: [start],
    spawns: { start },
    interactables,
    exhibits,
    background: new THREE.Color(theme.fog),
    fog: new THREE.Fog(theme.fog, 6, 30),
    exposure: 1.05,
    status: () => (progress.isAssembled(ch.id) ? `Carrying: ${ch.artifact}` : `Fragments ${found()} / ${FRAGMENTS}`),
    update(dt, t, feet) {
      pickups.update(t);
      if (artifact.visible) artifact.rotation.y = t * 0.4;
      if (opening > 0 && opening < 1) {
        opening = Math.min(1, opening + dt / 1.6);
        shutter.position.y = 1.3 + opening * opening * 2.4;
      }
      watcher.rotation.y = found() >= 3 ? -Math.PI / 2 : Math.PI / 2;
      bench.lamp.intensity = 3 + Math.sin(t * 1.3) * 0.15;
      if (!travelled && progress.isAssembled(ch.id) && feet.x < -8.4 && Math.abs(feet.z) < 1) {
        travelled = true;
        svc.travel('rotunda', `from-${ch.id}`);
      }
    },
    refresh() {
      pickups.refresh();
      sync();
      travelled = false;
      if (progress.isAssembled(ch.id)) {
        opening = 1;
        shutter.position.y = 1.3 + 2.4;
      }
    },
  };
}
