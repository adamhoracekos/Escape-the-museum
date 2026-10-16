import * as THREE from 'three';
import { CORRIDOR } from '../config';
import type { Exhibit, Interactable } from '../interaction/types';
import { CHAPTERS, PLAYABLE_CHAPTERS, type Chapter } from '../progress/chapters';
import { artifactMesh } from '../world/artifacts';
import { mergeStatic } from '../world/merge';
import { MAT, benchMesh, box, bustMesh } from '../world/props';
import { checkerTexture, posterTexture, signTexture } from '../world/textures';
import { World, type DynamicCollider } from '../world/World';
import type { Checkpoint, Level, LevelServices, Spawn } from './Level';
import { corridorCoords, corridorDarkness, corridorProgress, panelLit, yawToCentre } from './rotunda/corridorMath';
import { buildDecor, ROTUNDA_FACTS } from './rotunda/decor';
import { createOrrery } from './rotunda/orrery';
import { corridorPosters } from './rotunda/posters';
import { factPosterTexture } from '../world/factPoster';

/**
 * The rotunda: the lit, safe hub of the museum (GDD 9). Round hall under a dome with an
 * oculus, an orrery in the middle, six plinths for artifacts and four doorways.
 * The two playable doorways lead into long corridors that go dark as you walk;
 * at the far end the game fades to the chapter's first room.
 *
 * Angles follow three.js cylinders: a point at angle a and radius r is (r sin a, y, r cos a).
 */

const R = 10;
const H = 6;
const DOOR_HALF = CORRIDOR.width / 2;
const GAP = Math.asin(DOOR_HALF / R);
const MOUTH = R * Math.cos(GAP) - 0.1;
const PLINTH_R = 6.2;
const deg = (d: number) => (d * Math.PI) / 180;

const DOOR_ANGLE: Record<string, number> = { 'ice-age': deg(315), egypt: deg(45), 'solar-system': deg(135), depths: deg(225) };
const CHAPTER_PLINTH: Record<string, number> = { 'ice-age': deg(330), egypt: deg(30) };
const SPARE_PLINTHS = [90, 150, 210, 270].map(deg);
const BUST_ANGLES = [11.25, 78.75, 101.25, 168.75, 191.25, 258.75, 281.25, 348.75].map(deg);
/** This bust turns to face the wall once the first artifact is back (GDD 9). */
const TURNING_BUST = BUST_ANGLES.length - 1;

const CREAM = new THREE.Color(0xf4efe0);
const BLACK = new THREE.Color(0x000000);

const dirOf = (a: number) => new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
const at = (a: number, r: number, y = 0) => new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r);

interface ActiveCorridor {
  chapter: Chapter;
  angle: number;
  panels: THREE.Mesh[];
  rope: THREE.Object3D;
  ropeCollider: DynamicCollider;
}

export function createRotunda(svc: LevelServices): Level {
  const root = new THREE.Group();
  const statics = new THREE.Group();
  const solids: THREE.Object3D[] = [statics];
  root.add(statics);
  const interactables: Interactable[] = [];
  const exhibits: Exhibit[] = [];
  const progress = svc.progress;

  // ----- materials --------------------------------------------------------------
  const wallMat = new THREE.MeshPhongMaterial({ color: 0xf2ecdc, emissive: 0x2a261e, side: THREE.BackSide, shininess: 18 });
  const dadoMat = new THREE.MeshPhongMaterial({ color: 0x20306e, side: THREE.BackSide, shininess: 40 });
  const goldBack = new THREE.MeshPhongMaterial({ color: 0xe0ac2a, shininess: 120, specular: 0xffeeaa, side: THREE.BackSide });
  const domeMat = new THREE.MeshPhongMaterial({ color: 0xf7f2e6, emissive: 0x3a362c, side: THREE.BackSide, shininess: 8 });
  const lintelMat = new THREE.MeshPhongMaterial({ color: 0xf2ecdc, emissive: 0x2a261e, shininess: 18 });
  const corridorWall = new THREE.MeshPhongMaterial({ color: 0xe6dfcc, shininess: 10 });
  const corridorCeil = new THREE.MeshPhongMaterial({ color: 0xd8d1be, shininess: 4 });
  const rail = new THREE.MeshPhongMaterial({ color: 0xd63a2a, shininess: 50 });
  const skirt = new THREE.MeshPhongMaterial({ color: 0x15171c, shininess: 30 });
  const velvet = new THREE.MeshPhongMaterial({ color: 0x8e1b1b, shininess: 12 });
  const panelOn = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const panelOff = new THREE.MeshBasicMaterial({ color: 0x2c2c2c });
  const hidden = new THREE.MeshBasicMaterial({ visible: false });

  // ----- floor ------------------------------------------------------------------
  const floorTex = checkerTexture('#20306e', '#f4f1e8', 2);
  floorTex.repeat.set((2 * R) / 1.4, (2 * R) / 1.4);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(R, 96), new THREE.MeshPhongMaterial({ map: floorTex, shininess: 70, specular: 0x444444 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  statics.add(floor);

  // ----- walls between the four doorways ---------------------------------------
  const doorAngles = CHAPTERS.map((c) => DOOR_ANGLE[c.id]).sort((a, b) => a - b);
  doorAngles.forEach((a, i) => {
    const next = i + 1 < doorAngles.length ? doorAngles[i + 1] : doorAngles[0] + Math.PI * 2;
    const start = a + GAP;
    const len = next - a - 2 * GAP;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 48, 1, true, start, len), wallMat);
    seg.position.y = H / 2;
    seg.receiveShadow = true;
    statics.add(seg);
    const dado = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.03, R - 0.03, 1.1, 48, 1, true, start, len), dadoMat);
    dado.position.y = 0.55;
    dado.userData.noCollide = true;
    const line = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.04, R - 0.04, 0.06, 48, 1, true, start, len), goldBack);
    line.position.y = 1.13;
    line.userData.noCollide = true;
    statics.add(dado, line);
  });

  // ----- dome, oculus, cornice and ribs -----------------------------------------
  const OCULUS = 0.12; // half-angle of the opening at the top of the dome
  const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 20, 0, Math.PI * 2, OCULUS, Math.PI / 2 - OCULUS), domeMat);
  dome.position.y = H;
  dome.userData.noCollide = true;
  statics.add(dome);
  const oculusMat = new THREE.MeshBasicMaterial({ color: 0xfffbe6 });
  const oculus = new THREE.Mesh(new THREE.CircleGeometry(R * Math.sin(OCULUS) + 0.05, 48), oculusMat);
  oculus.rotation.x = Math.PI / 2;
  oculus.position.y = H + R * Math.cos(OCULUS) + 0.02;
  oculus.userData.dynamic = true;
  oculus.userData.noCollide = true;
  root.add(oculus);
  const cornice = new THREE.Mesh(new THREE.TorusGeometry(R - 0.1, 0.12, 8, 96), MAT.gold);
  cornice.rotation.x = Math.PI / 2;
  cornice.position.y = H;
  cornice.userData.noCollide = true;
  statics.add(cornice);
  const ribGeo = new THREE.TorusGeometry(R - 0.15, 0.05, 6, 40, Math.PI / 2 - OCULUS);
  for (let i = 0; i < 16; i++) {
    const holder = new THREE.Group();
    holder.position.y = H;
    holder.rotation.y = (i / 16) * Math.PI * 2;
    const rib = new THREE.Mesh(ribGeo, MAT.trim);
    rib.userData.noCollide = true;
    holder.add(rib);
    statics.add(holder);
  }

  // ----- columns ----------------------------------------------------------------
  for (let k = 0; k < 16; k++) {
    if (k % 4 === 2) continue; // doorway axes
    const a = (k / 16) * Math.PI * 2;
    const p = at(a, R - 0.9);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, H - 0.6, 24), MAT.trim);
    shaft.position.set(p.x, H / 2, p.z);
    shaft.castShadow = shaft.receiveShadow = true;
    statics.add(shaft, box(0.8, 0.3, 0.8, MAT.trim, p.x, 0.15, p.z), box(0.8, 0.3, 0.8, MAT.trim, p.x, H - 0.15, p.z));
  }

  // ----- doorways ---------------------------------------------------------------
  const corridors: ActiveCorridor[] = [];
  const spawns: Record<string, Spawn> = {};
  const world = { ropes: [] as { group: THREE.Group; blocker: THREE.Mesh; chapter: Chapter }[] };

  for (const ch of CHAPTERS) {
    const a = DOOR_ANGLE[ch.id];
    const dir = dirOf(a);
    const side = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
    const lintel = box(CORRIDOR.width + 0.4, H - CORRIDOR.height, 0.5, lintelMat, dir.x * R, (CORRIDOR.height + H) / 2, dir.z * R);
    lintel.rotation.y = a;
    statics.add(lintel);
    for (const s of [-1, 1]) {
      const p = dir.clone().multiplyScalar(R - 0.05).addScaledVector(side, s * (DOOR_HALF + 0.12));
      const jamb = box(0.32, CORRIDOR.height + 0.1, 0.7, MAT.trim, p.x, (CORRIDOR.height + 0.1) / 2, p.z);
      jamb.rotation.y = a;
      statics.add(jamb);
    }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.62), new THREE.MeshBasicMaterial({ map: signTexture(`${ch.numeral} · ${ch.title.toUpperCase()}`, ch.color, ch.ink) }));
    sign.position.copy(dir).multiplyScalar(R - 0.32);
    sign.position.y = 4.35;
    sign.rotation.y = a + Math.PI;
    sign.userData.noCollide = true;
    statics.add(sign);

    // The shell is static and merged with the rest of the hall; lights and posters stay separate.
    const shell = new THREE.Group();
    shell.rotation.y = a;
    statics.add(shell);
    const group = new THREE.Group();
    group.rotation.y = a;
    root.add(group);
    const len = ch.playable ? CORRIDOR.length : 2.6;
    buildCorridorShell(shell, len, ch.playable);

    if (ch.playable) {
      const panels: THREE.Mesh[] = [];
      for (let i = 0; i < 12; i++) {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.32), panelOn);
        p.rotation.x = Math.PI / 2;
        p.position.set(0, CORRIDOR.height - 0.01, MOUTH + 1.5 + i * 3);
        p.userData.noCollide = true;
        p.userData.panel = (1.5 + i * 3) / CORRIDOR.length;
        group.add(p);
        panels.push(p);
      }
      corridorPosters(ch.id).forEach((tex, i) => {
        const s = i % 2 ? 1 : -1;
        const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5), new THREE.MeshPhongMaterial({ map: tex, shininess: 30 }));
        poster.position.set(s * (DOOR_HALF - 0.01), 1.75, MOUTH + 3.5 + i * 4.1);
        poster.rotation.y = -s * (Math.PI / 2);
        poster.userData.noCollide = true;
        group.add(poster);
      });
      const rope = ropeBarrier(velvet);
      rope.position.copy(dir).multiplyScalar(R - 0.6);
      rope.rotation.y = a;
      root.add(rope);
      const blocker = new THREE.Mesh(new THREE.BoxGeometry(CORRIDOR.width + 0.4, 1.4, 0.3), hidden);
      blocker.position.copy(rope.position).setY(0.7);
      blocker.rotation.y = a;
      blocker.updateMatrixWorld();
      corridors.push({ chapter: ch, angle: a, panels, rope, ropeCollider: null as unknown as DynamicCollider });
      world.ropes.push({ group: rope, blocker, chapter: ch });

      const arrive = dir.clone().multiplyScalar(R - 1.9);
      spawns[`from-${ch.id}`] = { position: arrive, yaw: yawToCentre(arrive.x, arrive.z) };
    } else {
      // Unbuilt wing: a shallow dark recess with a notice and a rope that never comes down.
      const notice = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshBasicMaterial({ map: signTexture('INSTALLATION IN PROGRESS', '#15171c', '#f2c230') }));
      notice.position.set(0, 1.7, MOUTH + 2.6 - 0.01);
      notice.rotation.y = Math.PI;
      notice.userData.noCollide = true;
      group.add(notice);
      const rope = ropeBarrier(velvet);
      rope.position.copy(dir).multiplyScalar(R - 0.6);
      rope.rotation.y = a;
      root.add(rope);
      exhibits.push({ object: rope, anchor: rope.position.clone().setY(1.2), fig: `Gallery ${ch.numeral}`, text: () => `${ch.title}. Closed for installation.` });
    }
  }

  // ----- orrery -----------------------------------------------------------------
  const orr = createOrrery();
  const orrery = orr.group;
  orrery.userData.dynamic = true;
  root.add(orrery);
  solids.push(orrery);
  let orrerySpeed = 1;

  // ----- plinths ----------------------------------------------------------------
  const plinthLights: THREE.PointLight[] = [];
  const placedArtifacts = new Map<string, THREE.Object3D>();
  const plinth = (a: number, plaque: string, comingSoon: boolean) => {
    const p = at(a, PLINTH_R);
    const g = new THREE.Group();
    g.position.copy(p);
    g.rotation.y = a + Math.PI;
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.48, 1.1, 32), MAT.trim);
    ped.position.y = 0.55;
    ped.castShadow = ped.receiveShadow = true;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.08, 32), MAT.gold);
    band.position.y = 1.07;
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.8), MAT.glass);
    glass.position.y = 1.57;
    glass.userData.noCollide = true;
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.15), new THREE.MeshBasicMaterial({ map: signTexture(plaque, comingSoon ? '#5b606c' : '#15171c', comingSoon ? '#fbfaf6' : '#f2c230') }));
    plate.position.set(0, 0.82, 0.465);
    plate.rotation.x = -0.05;
    plate.userData.noCollide = true;
    g.add(ped, band, glass, plate);
    statics.add(g);
    const proxy = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 2.1, 12), hidden);
    proxy.position.set(p.x, 1.05, p.z);
    proxy.userData.noCollide = true;
    proxy.userData.dynamic = true;
    root.add(proxy);
    return { proxy, pos: p };
  };

  for (const ch of PLAYABLE_CHAPTERS) {
    const a = CHAPTER_PLINTH[ch.id];
    const { proxy, pos } = plinth(a, `PLINTH ${ch.numeral}`, false);
    const light = new THREE.PointLight(0xfff0c8, 0, 3.2, 2);
    light.position.set(pos.x, 2.35, pos.z);
    root.add(light);
    plinthLights.push(light);
    const art = artifactMesh(ch.id);
    art.position.set(pos.x, 1.13, pos.z);
    art.rotation.y = a + Math.PI;
    art.scale.multiplyScalar(1.3);
    art.visible = false;
    art.userData.dynamic = true;
    art.traverse((o) => (o.userData.noCollide = true));
    root.add(art);
    placedArtifacts.set(ch.id, art);

    interactables.push({
      id: `plinth-${ch.id}`,
      object: proxy,
      prompt: () => (progress.isCarrying(ch.id) ? `Place the ${ch.artifact}` : null),
      interact: () => {
        if (!progress.isCarrying(ch.id)) return;
        svc.commit(`${ch.id}/placed`);
        sync();
      },
    });
    const fig = ch.id === 'egypt' ? 'Fig. 3' : 'Fig. 2';
    exhibits.push({
      object: proxy,
      anchor: new THREE.Vector3(pos.x, 1.75, pos.z),
      fig: () => (progress.isPlaced(ch.id) ? fig : `Plinth ${ch.numeral}`),
      text: () => {
        if (progress.isPlaced(ch.id)) {
          return ch.id === 'egypt'
            ? 'Heart scarab, green stone. Laid over the heart of a mummy with a spell asking the heart not to speak against its owner.'
            : 'Venus of Dolní Věstonice, fired clay, 29,000 to 25,000 BCE. Found in Moravia in 1925; the oldest known ceramic figure in the world.';
        }
        if (progress.isCarrying(ch.id)) return `Reserved for the ${ch.artifact}. Bring it here.`;
        return `Reserved for the ${ch.artifact}.`;
      },
    });
  }
  ['III', 'IV', 'V', 'VI'].forEach((numeral, i) => {
    const { proxy, pos } = plinth(SPARE_PLINTHS[i], 'COMING SOON', true);
    exhibits.push({ object: proxy, anchor: new THREE.Vector3(pos.x, 1.75, pos.z), fig: `Plinth ${numeral}`, text: () => 'Coming soon to this gallery.' });
  });

  // ----- busts on wall brackets -------------------------------------------------
  let turningBust: THREE.Object3D | null = null;
  BUST_ANGLES.forEach((a, i) => {
    const p = at(a, R - 0.3);
    const bracket = box(0.62, 0.08, 0.5, MAT.gold, p.x, 2.96, p.z);
    bracket.rotation.y = a;
    bracket.userData.noCollide = true;
    statics.add(bracket);
    const bust = bustMesh();
    bust.position.set(p.x, 3.0, p.z);
    bust.rotation.y = a + Math.PI;
    bust.scale.setScalar(0.9);
    bust.traverse((o) => (o.userData.noCollide = true));
    if (i === TURNING_BUST) {
      bust.userData.dynamic = true;
      root.add(bust);
      turningBust = bust;
    } else statics.add(bust);
  });
  const bustAngle = BUST_ANGLES[TURNING_BUST];
  exhibits.push({
    object: turningBust!,
    anchor: at(bustAngle, R - 0.35, 3.6),
    fig: 'Fig. 5',
    text: () => (progress.placedCount() >= 1 ? 'Benefactor, marble, 1891. Facing the wall.' : 'Benefactor, marble, 1891.'),
    warn: () => progress.placedCount() >= 1,
  });

  // ----- bench, posters ---------------------------------------------------------
  const benchAngle = Math.PI;
  const bench = benchMesh();
  bench.group.position.copy(at(benchAngle, 8.0));
  bench.group.rotation.y = benchAngle;
  statics.add(bench.group);
  const startPos = at(benchAngle, 6.9);
  const checkpoint: Checkpoint = { id: 'rotunda-bench', position: startPos, yaw: yawToCentre(startPos.x, startPos.z), radius: 1.6 };
  spawns.start = checkpoint;
  const benchProxy = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.9, 0.6), hidden);
  benchProxy.position.copy(at(benchAngle, 8.0, 0.45));
  benchProxy.rotation.y = benchAngle;
  benchProxy.userData.noCollide = true;
  benchProxy.userData.dynamic = true;
  root.add(benchProxy);
  interactables.push({ id: 'rotunda-bench-rest', object: benchProxy, prompt: () => 'Rest (save progress)', interact: () => svc.saveAtCheckpoint(checkpoint) });

  const plan = wallPoster(
    deg(191.25),
    posterTexture('Museum Plan', 'You are here: the Rotunda', '#fbfaf6', '#15171c', (g, w) => {
      const cx = w / 2;
      const cy = 380;
      g.lineWidth = 6;
      g.strokeStyle = '#15171c';
      const wings: [number, string, string][] = [
        [-45, '#7fb7d9', 'I'],
        [45, '#d9a441', 'II'],
        [135, '#2a3f8f', 'III'],
        [225, '#1d7a7a', 'IV'],
      ];
      for (const [d, c, n] of wings) {
        const r = (d * Math.PI) / 180;
        const x = cx + Math.sin(r) * 190;
        const y = cy - Math.cos(r) * 190;
        g.beginPath();
        g.moveTo(cx + Math.sin(r) * 70, cy - Math.cos(r) * 70);
        g.lineTo(x, y);
        g.stroke();
        g.fillStyle = c;
        g.fillRect(x - 38, y - 38, 76, 76);
        g.strokeRect(x - 38, y - 38, 76, 76);
        g.fillStyle = c === '#7fb7d9' || c === '#d9a441' ? '#15171c' : '#ffffff';
        g.font = '800 30px Jost, Futura, sans-serif';
        g.textAlign = 'center';
        g.fillText(n, x, y + 11);
      }
      g.fillStyle = '#f2c230';
      g.beginPath();
      g.arc(cx, cy, 70, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.fillStyle = '#d63a2a';
      g.beginPath();
      g.arc(cx, cy + 46, 10, 0, Math.PI * 2);
      g.fill();
    }),
  );
  const guide = wallPoster(
    deg(168.75),
    posterTexture('How to Survive After Closing Time', 'Illustrated Encyclopedia · Vol. 2', '#f2c230', '#15171c', (g, w) => {
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
  );
  function wallPoster(a: number, tex: THREE.Texture): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.5), new THREE.MeshPhongMaterial({ map: tex, shininess: 30 }));
    m.position.copy(at(a, R - 0.06, 1.95));
    m.rotation.y = a + Math.PI;
    m.userData.noCollide = true;
    m.userData.dynamic = true;
    root.add(m);
    return m;
  }
  exhibits.push(
    { object: plan, anchor: plan.position.clone().setY(2.5), fig: 'Fig. 6', text: () => 'Plan of the museum. Four wings, one way in.' },
    {
      object: guide,
      anchor: guide.position.clone().setY(2.5),
      fig: 'Fig. 7',
      text: () => (progress.placedCount() >= 1 ? 'Visitor guidance. Someone has underlined rule 4.' : 'Visitor guidance, printed after closing.'),
    },
    {
      object: orrery,
      anchor: new THREE.Vector3(0, 2.95, 0),
      fig: 'Fig. 4',
      text: () =>
        progress.placedCount() >= 1
          ? 'Orrery, brass, 1903. Running backwards.'
          : 'Orrery, brass, 1903. Named after the 4th Earl of Orrery, for whom one of the first was made around 1713.',
      warn: () => progress.placedCount() >= 1,
    },
  );

  for (const f of ROTUNDA_FACTS) {
    const poster = wallPoster(f.angle, factPosterTexture(f.poster));
    exhibits.push({ object: poster, anchor: poster.position.clone().setY(2.5), fig: f.fig, text: () => f.label });
  }

  // ----- decor ------------------------------------------------------------------
  const columnAngles = Array.from({ length: 16 }, (_, k) => k).filter((k) => k % 4 !== 2).map((k) => (k / 16) * Math.PI * 2);
  const decor = buildDecor(statics, root, {
    radius: R,
    height: H,
    columnAngles,
    doorAngles: DOOR_ANGLE,
    chapterColors: Object.fromEntries(CHAPTERS.map((c) => [c.id, { color: c.color, ink: c.ink, numeral: c.numeral, title: c.title }])),
  });
  decor.fountains.forEach((f, i) =>
    interactables.push({ id: `fountain-${i}`, object: f, prompt: () => 'Drink', interact: () => svc.toast('The water is lukewarm and tastes faintly of coins.') }),
  );

  // ----- light ------------------------------------------------------------------
  const hemi = new THREE.HemisphereLight(0xfffaf0, 0xcfc6ae, 1.15);
  root.add(hemi);
  const oculusLight = new THREE.SpotLight(0xfff4d8, 2.4, 0, Math.atan(11.5 / 15.5), 0.45, 0);
  oculusLight.position.set(0, H + R - 0.5, 0);
  oculusLight.target.position.set(0, 0, 0);
  oculusLight.castShadow = true;
  oculusLight.shadow.mapSize.set(2048, 2048);
  oculusLight.shadow.bias = -0.0004;
  oculusLight.shadow.camera.near = 6;
  oculusLight.shadow.camera.far = 20;
  root.add(oculusLight, oculusLight.target);

  mergeStatic(statics);

  // Rope blockers become dynamic colliders so the corridor can open and close.
  const worldObj = new World(solids, [], 'tile');
  root.add(worldObj.collider);
  world.ropes.forEach((r, i) => (corridors[i].ropeCollider = worldObj.addDynamic([r.blocker])));

  const fog = new THREE.Fog(CREAM.clone(), 20, 55);
  const background = CREAM.clone();
  let ending = 0;

  /** Ropes, artifacts on plinths and the changes the museum makes once it notices you. */
  function sync() {
    for (const c of corridors) {
      const open = progress.isOpen(c.chapter.id);
      c.rope.visible = !open;
      c.ropeCollider.enabled = !open;
    }
    PLAYABLE_CHAPTERS.forEach((ch, i) => {
      const placed = progress.isPlaced(ch.id);
      placedArtifacts.get(ch.id)!.visible = placed;
      plinthLights[i].intensity = placed ? 1.6 : 0;
    });
  }

  // Exhibits for ropes on the playable doorways explain why they are up.
  for (const c of corridors) {
    exhibits.push({
      object: c.rope,
      anchor: c.rope.position.clone().setY(1.2),
      fig: `Gallery ${c.chapter.numeral}`,
      text: () => {
        if (progress.isPlaced(c.chapter.id)) return `${c.chapter.title}. Collection complete. Closed.`;
        if (progress.isAssembled(c.chapter.id)) return `${c.chapter.title}. Closed for the night.`;
        const req = c.chapter.requires ? CHAPTERS.find((x) => x.id === c.chapter.requires) : null;
        return req ? `${c.chapter.title}. Opens when Plinth ${req.numeral} is filled.` : `${c.chapter.title}. Closed.`;
      },
    });
  }

  return {
    id: 'rotunda',
    title: 'The Rotunda',
    card: { kicker: 'Illustrated Encyclopedia · Vol. 2', title: 'The Rotunda', long: false },
    root,
    world: worldObj,
    checkpoints: [checkpoint],
    spawns,
    interactables,
    exhibits,
    background,
    fog,
    exposure: 1.0,
    status() {
      const carrying = PLAYABLE_CHAPTERS.find((c) => progress.isCarrying(c.id));
      if (carrying) return `Carrying: ${carrying.artifact}`;
      return `Collection ${progress.placedCount()} / ${PLAYABLE_CHAPTERS.length}`;
    },
    update(dt, t, feet) {
      // Orrery: slows, stops and runs backwards once the first artifact is back.
      const target = progress.placedCount() >= 1 ? -1 : 1;
      orrerySpeed += (target - orrerySpeed) * Math.min(1, dt * 0.35);
      for (const art of placedArtifacts.values()) if (art.visible) art.rotation.y += dt * 0.25;

      // Corridors: darkness follows how far in the player is.
      let dark = 0;
      for (const c of corridors) {
        const cc = corridorCoords(feet.x, feet.z, c.angle, MOUTH);
        const prog = corridorProgress(cc, CORRIDOR.length, DOOR_HALF);
        dark = Math.max(dark, corridorDarkness(prog));
        for (const p of c.panels) {
          const f = p.userData.panel as number;
          let lit = panelLit(f, prog);
          const edge = 0.8 - prog - f;
          if (lit && prog > 0 && edge < 0.05) lit = Math.sin(t * 37 + f * 50) + Math.sin(t * 13) > 0.3;
          p.material = lit ? panelOn : panelOff;
        }
        if (cc.along > CORRIDOR.length - CORRIDOR.triggerFromEnd && Math.abs(cc.lateral) < DOOR_HALF + 0.5 && progress.isOpen(c.chapter.id)) {
          svc.travel(c.chapter.id, 'start');
        }
      }
      const lightK = (1 - dark) * (1 - ending);
      fog.color.copy(CREAM).lerp(BLACK, Math.max(dark, ending * 0.85));
      background.copy(fog.color);
      fog.near = THREE.MathUtils.lerp(20, 0.5, dark);
      fog.far = THREE.MathUtils.lerp(55, 9, dark);
      hemi.intensity = 1.15 * lightK + 0.03;
      oculusLight.intensity = 2.4 * lightK;
      oculusMat.color.setRGB(1, 0.98, 0.9).multiplyScalar(Math.max(0.04, 1 - ending));
      decor.update(t, lightK);
      orr.update(dt, orrerySpeed * (1 - ending), Math.max(dark, ending > 0.3 ? 1 : 0));
      bench.lamp.intensity = 3 + Math.sin(t * 1.3) * 0.15;
    },
    refresh() {
      sync();
      if (turningBust) turningBust.rotation.y = progress.placedCount() >= 1 ? bustAngle : bustAngle + Math.PI;
      orrerySpeed = progress.placedCount() >= 1 ? -1 : 1;
      ending = 0;
    },
    titleView(t, cam) {
      const a = t * 0.05 + 2.4;
      cam.position.set(Math.sin(a) * 3.4, 1.75, Math.cos(a) * 3.4);
      cam.lookAt(Math.sin(a + 0.8) * 9.5, 2.5, Math.cos(a + 0.8) * 9.5);
    },
    setEnding(k) {
      ending = k;
    },
  };

  /** Floor, walls, ceiling and end wall of a corridor in its local frame (+Z away from the rotunda). */
  function buildCorridorShell(group: THREE.Group, len: number, decorated: boolean) {
    const W = CORRIDOR.width;
    const CH = CORRIDOR.height;
    const fTex = checkerTexture('#1a2658', '#d9d3c4', 2);
    fTex.repeat.set((W + 0.6) / 1.4, len / 1.4);
    const fl = box(W + 0.6, 0.2, len + 0.3, new THREE.MeshPhongMaterial({ map: fTex, shininess: 50, specular: 0x333333 }), 0, -0.103, MOUTH + len / 2 - 0.15);
    fl.castShadow = false;
    group.add(fl);
    for (const s of [-1, 1]) {
      group.add(box(0.3, CH, len, corridorWall, s * (W / 2 + 0.15), CH / 2, MOUTH + len / 2));
      if (decorated) {
        const r = box(0.04, 0.1, len, rail, s * (W / 2 - 0.02), 0.95, MOUTH + len / 2);
        r.userData.noCollide = true;
        const k = box(0.03, 0.14, len, skirt, s * (W / 2 - 0.015), 0.07, MOUTH + len / 2);
        k.userData.noCollide = true;
        group.add(r, k);
      }
    }
    group.add(box(W + 0.6, 0.2, len, corridorCeil, 0, CH + 0.1, MOUTH + len / 2));
    group.add(box(W + 0.6, CH, 0.3, corridorWall, 0, CH / 2, MOUTH + len + 0.15));
  }
}

/** Brass stanchions with a red velvet rope, in the local frame of a doorway. */
function ropeBarrier(velvet: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  for (const x of [-1.45, 1.45]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.92, 12), MAT.gold);
    post.position.set(x, 0.46, 0);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.04, 20), MAT.gold);
    base.position.set(x, 0.02, 0);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), MAT.gold);
    knob.position.set(x, 0.95, 0);
    g.add(post, base, knob);
  }
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 20; i++) {
    const u = i / 20;
    const x = -1.42 + u * 2.84;
    pts.push(new THREE.Vector3(x, 0.9 - Math.sin(u * Math.PI) * 0.2, 0));
  }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.028, 8), velvet));
  g.traverse((o) => {
    o.userData.noCollide = true;
    (o as THREE.Mesh).castShadow = true;
  });
  return g;
}
