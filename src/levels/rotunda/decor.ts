import * as THREE from 'three';
import type { FactPosterSpec } from '../../world/factPoster';
import { MAT, benchMesh, box } from '../../world/props';
import { canvasTexture } from '../../world/textures';

/**
 * Dressing for the rotunda: banners on the columns, bunting under the dome, potted plants by
 * the doorways, drinking fountains, a second bench, and a soft shaft of light with dust in it.
 * The aim is a children's museum remembered from long ago: tidy, warm, a little too quiet.
 */

const deg = (d: number) => (d * Math.PI) / 180;
const at = (a: number, r: number, y = 0) => new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r);

export interface DecorOptions {
  radius: number;
  height: number;
  columnAngles: number[];
  doorAngles: Record<string, number>;
  chapterColors: Record<string, { color: string; ink: string; numeral: string; title: string }>;
}

export interface Decor {
  fountains: THREE.Object3D[];
  update(t: number, light: number): void;
}

// ----- banners -----------------------------------------------------------------

function bannerTexture(bg: string, ink: string, top: string, words: string[]): THREE.CanvasTexture {
  const t = canvasTexture(128, 384, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = bg;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(w, 0);
    g.lineTo(w, h);
    g.lineTo(w / 2, h - 44);
    g.lineTo(0, h);
    g.closePath();
    g.fill();
    g.fillStyle = ink;
    g.fillRect(0, 0, w, 10);
    g.font = '800 64px Jost, Futura, "Century Gothic", sans-serif';
    g.textAlign = 'center';
    g.fillText(top, w / 2, 92);
    g.beginPath();
    g.arc(w / 2, 150, 20, 0, Math.PI * 2);
    g.fill();
    g.font = '700 20px Jost, Futura, "Century Gothic", sans-serif';
    words.forEach((word, i) => g.fillText(word, w / 2, 214 + i * 26));
  });
  return t;
}

// ----- bunting -----------------------------------------------------------------

function sagCurve(a: number, r0: number, y0: number, r1: number, y1: number, sag: number): THREE.CatmullRomCurve3 {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 16; i++) {
    const u = i / 16;
    const r = r0 + (r1 - r0) * u;
    pts.push(at(a, r, y0 + (y1 - y0) * u - Math.sin(u * Math.PI) * sag));
  }
  return new THREE.CatmullRomCurve3(pts);
}

function pennantGeometry(curves: THREE.CatmullRomCurve3[], every: number, colorIndex: number, colors: number): THREE.BufferGeometry {
  const pos: number[] = [];
  let n = 0;
  for (const c of curves) {
    const len = c.getLength();
    const count = Math.floor(len / every);
    for (let i = 1; i < count; i++) {
      if (n++ % colors !== colorIndex) continue;
      const a = c.getPointAt((i * every - 0.13) / len);
      const b = c.getPointAt((i * every + 0.13) / len);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z, mid.x, mid.y - 0.32, mid.z);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// ----- plants ------------------------------------------------------------------

const leaf = new THREE.MeshPhongMaterial({ color: 0x2f7d46, shininess: 30, side: THREE.DoubleSide });
const darkLeaf = new THREE.MeshPhongMaterial({ color: 0x23603a, shininess: 20 });
const potMat = new THREE.MeshPhongMaterial({ color: 0xf4efe4, shininess: 90, specular: 0x555555 });
const trunkMat = new THREE.MeshPhongMaterial({ color: 0x7a5a3a, shininess: 10 });
const bloom = new THREE.MeshPhongMaterial({ color: 0xd63a2a, shininess: 40 });
const soilMat = new THREE.MeshLambertMaterial({ color: 0x2a1c12 });
const porcelain = new THREE.MeshPhongMaterial({ color: 0xf6f3ec, shininess: 120, specular: 0x888888 });
const waterMat = new THREE.MeshPhongMaterial({ color: 0x8fc6e8, shininess: 150, transparent: true, opacity: 0.7 });

function pot(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.26, 0.55, 28), potMat);
  body.position.y = 0.275;
  body.castShadow = body.receiveShadow = true;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.06, 28), MAT.gold);
  band.position.y = 0.5;
  band.userData.noCollide = true;
  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.31, 20), soilMat);
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = 0.53;
  soil.userData.noCollide = true;
  g.add(body, band, soil);
  return g;
}

function frond(length: number): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(0.2, length, 1, 8);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) + length / 2; // 0 at the base, length at the tip
    const narrow = 1 - (y / length) * 0.85;
    p.setX(i, p.getX(i) * narrow);
    p.setZ(i, -((y / length) ** 2) * length * 0.55);
    p.setY(i, y);
  }
  geo.rotateX(-Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

function palm(): THREE.Group {
  const g = pot();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.2, 10), trunkMat);
  trunk.position.y = 1.1;
  trunk.userData.noCollide = true;
  g.add(trunk);
  const geo = frond(0.95);
  for (let i = 0; i < 8; i++) {
    const f = new THREE.Mesh(geo, leaf);
    f.position.y = 1.68;
    f.rotation.set(-0.35, (i / 8) * Math.PI * 2 + 0.3, 0, 'YXZ');
    f.userData.noCollide = true;
    f.castShadow = true;
    g.add(f);
  }
  return g;
}

function geranium(seed: number): THREE.Group {
  const g = pot();
  const bush = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), darkLeaf);
  bush.scale.set(1, 0.7, 1);
  bush.position.y = 0.8;
  bush.castShadow = true;
  bush.userData.noCollide = true;
  g.add(bush);
  const flower = new THREE.SphereGeometry(0.055, 8, 6);
  for (let i = 0; i < 14; i++) {
    const a = i * 2.39996 + seed;
    const up = 0.25 + ((i * 7) % 10) / 14;
    const f = new THREE.Mesh(flower, bloom);
    f.position.set(Math.cos(a) * 0.38 * Math.sqrt(1 - up * up * 0.6), 0.8 + up * 0.28, Math.sin(a) * 0.38 * Math.sqrt(1 - up * up * 0.6));
    f.userData.noCollide = true;
    g.add(f);
  }
  return g;
}

// ----- fountain ----------------------------------------------------------------

function fountain(): THREE.Group {
  const g = new THREE.Group();
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.82, 20), porcelain);
  column.position.y = 0.41;
  column.castShadow = true;
  const basin = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), porcelain);
  basin.position.y = 0.96;
  basin.scale.y = 0.45;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.02, 8, 32), porcelain);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.96;
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.22, 24), waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.92;
  water.userData.noCollide = true;
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.12, 8), MAT.gold);
  spout.position.set(0, 1.0, 0.04);
  spout.rotation.x = 0.5;
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 12), MAT.gold);
  knob.position.set(0.2, 0.9, 0.16);
  knob.rotation.z = Math.PI / 2;
  [basin, rim, spout, knob].forEach((m) => (m.userData.noCollide = true));
  g.add(column, basin, rim, water, spout, knob);
  return g;
}

// ----- light shaft and dust ----------------------------------------------------

function shaftTexture(): THREE.CanvasTexture {
  return canvasTexture(4, 128, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.55, '#5a5a5a');
    grad.addColorStop(1, '#000000');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
}

export function buildDecor(statics: THREE.Group, root: THREE.Group, o: DecorOptions): Decor {
  const { radius: R, height: H } = o;

  // Banners on the columns: the two next to each doorway carry that wing's colours,
  // the rest belong to the encyclopedia itself.
  const bannerMats = new Map<string, THREE.Material>();
  const bannerFor = (key: string, make: () => THREE.Texture) => {
    let m = bannerMats.get(key);
    if (!m) {
      m = new THREE.MeshPhongMaterial({ map: make(), alphaTest: 0.5, side: THREE.DoubleSide, shininess: 8 });
      bannerMats.set(key, m);
    }
    return m;
  };
  const bannerGeo = new THREE.PlaneGeometry(0.62, 1.86);
  for (const a of o.columnAngles) {
    let mat: THREE.Material = bannerFor('vol', () => bannerTexture('#d63a2a', '#fbfaf6', '2', ['VOL.', 'ILLUS-', 'TRATED', 'ENCYCLO-', 'PEDIA']));
    for (const [id, d] of Object.entries(o.doorAngles)) {
      const diff = Math.abs(Math.atan2(Math.sin(a - d), Math.cos(a - d)));
      if (diff < deg(30)) {
        const c = o.chapterColors[id];
        mat = bannerFor(id, () => bannerTexture(c.color, c.ink, c.numeral, c.title.toUpperCase().replace(/^THE /, '').split(' ')));
      }
    }
    const b = new THREE.Mesh(bannerGeo, mat);
    b.position.copy(at(a, R - 0.9 - 0.36, 4.05));
    b.rotation.y = a + Math.PI;
    b.userData.noCollide = true;
    const rod = box(0.74, 0.035, 0.035, MAT.gold, 0, 0, 0);
    rod.position.copy(at(a, R - 0.9 - 0.37, 5.0));
    rod.rotation.y = a;
    rod.userData.noCollide = true;
    statics.add(b, rod);
  }

  // Bunting from the columns to a ring above the orrery.
  const curves = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => sagCurve(deg(22.5 + i * 45), R - 1.25, 5.45, 0.55, 4.75, 0.5));
  const pennantColors = [0xd63a2a, 0xf2c230, 0x1f4fd1, 0x1d9757];
  pennantColors.forEach((c, i) => {
    const m = new THREE.Mesh(pennantGeometry(curves, 0.42, i, pennantColors.length), new THREE.MeshPhongMaterial({ color: c, side: THREE.DoubleSide, shininess: 20 }));
    m.userData.noCollide = true;
    statics.add(m);
  });
  const cord = new THREE.MeshBasicMaterial({ color: 0xf4efe0 });
  for (const c of curves) {
    const t = new THREE.Mesh(new THREE.TubeGeometry(c, 40, 0.007, 4), cord);
    t.userData.noCollide = true;
    statics.add(t);
  }
  const hub = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.02, 6, 32), MAT.gold);
  hub.rotation.x = Math.PI / 2;
  hub.position.y = 4.75;
  hub.userData.noCollide = true;
  statics.add(hub);

  // Potted palms and geraniums either side of every doorway.
  Object.values(o.doorAngles).forEach((d, i) => {
    for (const s of [-1, 1]) {
      const plant = (i + (s > 0 ? 1 : 0)) % 2 === 0 ? palm() : geranium(i * 3 + s);
      plant.position.copy(at(d + s * deg(17), R - 1.3));
      plant.rotation.y = d * 3 + s;
      statics.add(plant);
    }
  });

  // Drinking fountains under the side posters.
  const fountains: THREE.Object3D[] = [];
  for (const a of [deg(101.25), deg(258.75)]) {
    const f = fountain();
    f.position.copy(at(a, R - 0.6));
    f.rotation.y = a + Math.PI;
    statics.add(f);
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.1, 0.6), new THREE.MeshBasicMaterial({ visible: false }));
    proxy.position.copy(at(a, R - 0.6, 0.55));
    proxy.userData.noCollide = true;
    proxy.userData.dynamic = true;
    root.add(proxy);
    fountains.push(proxy);
  }

  // A second bench, for sitting only.
  const bench = benchMesh();
  bench.group.position.copy(at(0, R - 2));
  bench.group.rotation.y = 0;
  bench.lamp.intensity = 0;
  bench.group.remove(bench.lamp);
  statics.add(bench.group);

  // Light falling from the oculus, with dust turning slowly in it.
  const shaftMat = new THREE.MeshBasicMaterial({
    color: 0xfff0c8,
    alphaMap: shaftTexture(),
    transparent: true,
    opacity: 0.11,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const top = H + R * Math.cos(0.12);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(R * Math.sin(0.12), 2.1, top, 40, 1, true), shaftMat);
  shaft.position.y = top / 2;
  shaft.userData.noCollide = true;
  shaft.userData.dynamic = true;
  root.add(shaft);

  const DUST = 260;
  const dustPos = new Float32Array(DUST * 3);
  const seeds = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    const a = (i * 2.39996) % (Math.PI * 2);
    const r = Math.sqrt(((i * 37) % 100) / 100) * 1.7;
    seeds[i * 3] = Math.cos(a) * r;
    seeds[i * 3 + 1] = 0.4 + (((i * 53) % 100) / 100) * 6;
    seeds[i * 3 + 2] = Math.sin(a) * r;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dustMat = new THREE.PointsMaterial({ color: 0xfff4d8, size: 0.03, transparent: true, opacity: 0.7, depthWrite: false });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  dust.userData.noCollide = true;
  dust.userData.dynamic = true;
  root.add(dust);

  return {
    fountains,
    update(t, light) {
      for (let i = 0; i < DUST; i++) {
        const k = i * 3;
        dustPos[k] = seeds[k] + Math.sin(t * 0.13 + i) * 0.25;
        dustPos[k + 1] = seeds[k + 1] + Math.sin(t * 0.07 + i * 1.7) * 0.35;
        dustPos[k + 2] = seeds[k + 2] + Math.cos(t * 0.11 + i * 0.6) * 0.25;
      }
      dustGeo.attributes.position.needsUpdate = true;
      shaftMat.opacity = 0.11 * light;
      dustMat.opacity = 0.7 * light;
      shaft.visible = dust.visible = light > 0.01;
    },
  };
}

// ----- facts on the walls ------------------------------------------------------

export interface WallFact {
  angle: number;
  fig: string;
  label: string;
  poster: FactPosterSpec;
}

/** Six encyclopedia posters for the rotunda's side bays. Every fact is real (GDD pillar 5). */
export const ROTUNDA_FACTS: WallFact[] = [
  {
    angle: deg(348.75),
    fig: 'Fig. 8',
    label: 'Poster: What is a museum? A temple of the Muses.',
    poster: {
      title: 'What Is a Museum?',
      fact: 'The word museum comes from the Greek mouseion, a temple of the Muses. The Louvre in Paris opened to the public in 1793.',
      bg: '#fbfaf6',
      fg: '#15171c',
      diagram: (g, w) => {
        g.fillStyle = '#1f4fd1';
        g.beginPath();
        g.moveTo(w / 2 - 190, 290);
        g.lineTo(w / 2, 190);
        g.lineTo(w / 2 + 190, 290);
        g.fill();
        for (let i = 0; i < 5; i++) g.fillRect(w / 2 - 170 + i * 80, 310, 34, 220);
        g.fillRect(w / 2 - 200, 540, 400, 30);
        g.fillStyle = '#f2c230';
        g.beginPath();
        g.arc(w / 2, 255, 18, 0, Math.PI * 2);
        g.fill();
      },
    },
  },
  {
    angle: deg(11.25),
    fig: 'Fig. 9',
    label: 'Poster: The Sun. Its light takes 8 minutes 20 seconds to reach us.',
    poster: {
      title: 'The Sun',
      fact: 'The Sun holds 99.8% of all the mass in the Solar System. Its light takes about 8 minutes and 20 seconds to reach Earth.',
      bg: '#14205a',
      fg: '#fbfaf6',
      diagram: (g, w) => {
        g.fillStyle = '#ffc42e';
        g.beginPath();
        g.arc(110, 380, 150, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#fbfaf6';
        g.setLineDash([14, 12]);
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(270, 380);
        g.lineTo(w - 70, 380);
        g.stroke();
        g.setLineDash([]);
        g.fillStyle = '#1f4fd1';
        g.beginPath();
        g.arc(w - 50, 380, 14, 0, Math.PI * 2);
        g.fill();
      },
    },
  },
  {
    angle: deg(78.75),
    fig: 'Fig. 10',
    label: 'Poster: Deep time. Humans arrive in the last six seconds.',
    poster: {
      title: 'Deep Time',
      fact: "If Earth's 4.5 billion years were squeezed into one day, modern humans would appear only in the last six seconds before midnight.",
      bg: '#f2c230',
      fg: '#15171c',
      diagram: (g, w) => {
        const cx = w / 2;
        const cy = 380;
        g.fillStyle = '#fbfaf6';
        g.beginPath();
        g.arc(cx, cy, 190, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#15171c';
        g.lineWidth = 8;
        g.stroke();
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          g.beginPath();
          g.moveTo(cx + Math.sin(a) * 165, cy - Math.cos(a) * 165);
          g.lineTo(cx + Math.sin(a) * 185, cy - Math.cos(a) * 185);
          g.stroke();
        }
        g.fillStyle = '#d63a2a';
        g.beginPath();
        g.moveTo(cx, cy);
        g.arc(cx, cy, 185, -Math.PI / 2 - 0.05, -Math.PI / 2);
        g.fill();
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(cx, cy - 150);
        g.moveTo(cx, cy);
        g.lineTo(cx - 6, cy - 110);
        g.stroke();
      },
    },
  },
  {
    angle: deg(101.25),
    fig: 'Fig. 11',
    label: 'Poster: The human skeleton. 206 bones in an adult.',
    poster: {
      title: 'The Human Skeleton',
      fact: 'An adult skeleton has 206 bones. A newborn baby has around 300, and many of them fuse together as you grow.',
      bg: '#1d9757',
      fg: '#fbfaf6',
      diagram: (g, w) => {
        const cx = w / 2;
        g.strokeStyle = '#fbfaf6';
        g.fillStyle = '#fbfaf6';
        g.lineWidth = 10;
        g.lineCap = 'round';
        g.beginPath();
        g.arc(cx, 200, 44, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.moveTo(cx, 245);
        g.lineTo(cx, 450);
        for (let i = 0; i < 5; i++) {
          g.moveTo(cx - 70 + i * 3, 280 + i * 26);
          g.quadraticCurveTo(cx, 268 + i * 26, cx + 70 - i * 3, 280 + i * 26);
        }
        g.moveTo(cx - 90, 270);
        g.lineTo(cx - 120, 420);
        g.moveTo(cx + 90, 270);
        g.lineTo(cx + 120, 420);
        g.moveTo(cx - 60, 450);
        g.lineTo(cx + 60, 450);
        g.moveTo(cx - 45, 455);
        g.lineTo(cx - 60, 610);
        g.moveTo(cx + 45, 455);
        g.lineTo(cx + 60, 610);
        g.stroke();
      },
    },
  },
  {
    angle: deg(258.75),
    fig: 'Fig. 12',
    label: 'Poster: The midnight zone. Below 1,000 m the sea is dark.',
    poster: {
      title: 'The Midnight Zone',
      fact: 'Sunlight fades out about 1,000 m below the surface of the sea. Deeper than that, the ocean is completely dark.',
      bg: '#1d7a7a',
      fg: '#fbfaf6',
      diagram: (g, w) => {
        const bands = ['#8fd3e8', '#3f9fc4', '#1f5f8f', '#123a5c', '#071a2b'];
        bands.forEach((c, i) => {
          g.fillStyle = c;
          g.fillRect(60, 170 + i * 90, w - 120, 90);
        });
        g.fillStyle = '#f2c230';
        g.beginPath();
        g.arc(w / 2, 520, 10, 0, Math.PI * 2);
        g.fill();
        g.strokeStyle = '#f2c230';
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(w / 2 + 30, 560);
        g.quadraticCurveTo(w / 2 + 20, 520, w / 2 + 6, 522);
        g.stroke();
        g.fillStyle = '#2b3d4f';
        g.beginPath();
        g.ellipse(w / 2 + 70, 566, 50, 24, 0, 0, Math.PI * 2);
        g.fill();
      },
    },
  },
  {
    angle: deg(281.25),
    fig: 'Fig. 13',
    label: 'Poster: How old is it? Carbon-14 halves every 5,730 years.',
    poster: {
      title: 'How Old Is It?',
      fact: 'Half of the carbon-14 in a bone or a piece of wood decays every 5,730 years. Measuring what is left dates things up to about 50,000 years old.',
      bg: '#fbfaf6',
      fg: '#15171c',
      diagram: (g) => {
        [1, 0.5, 0.25, 0.125].forEach((v, i) => {
          g.fillStyle = '#d63a2a';
          const hgt = 360 * v;
          g.fillRect(80 + i * 95, 560 - hgt, 70, hgt);
        });
        g.fillStyle = '#15171c';
        g.fillRect(60, 560, 400, 6);
      },
    },
  },
];
