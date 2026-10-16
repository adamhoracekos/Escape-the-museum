import * as THREE from 'three';
import { factPosterTexture, type FactPosterSpec } from '../../world/factPoster';
import { canvasTexture } from '../../world/textures';

interface PosterSpec extends FactPosterSpec {
  /** What the same poster says once the corridor has gone grey. */
  wrong: string;
}

const iceAge: PosterSpec[] = [
  {
    title: 'The Last Ice Age',
    fact: 'About 20,000 years ago ice up to 3 km thick covered northern Europe and North America, and the sea was some 120 m lower than today.',
    bg: '#7fb7d9',
    fg: '#15171c',
    wrong: 'IT REMEMBERS THE COLD',
    diagram: (g, w) => {
      // Northern hemisphere with the ice sheet growing from the pole.
      g.fillStyle = '#1d9757';
      g.beginPath();
      g.arc(w / 2, 380, 170, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#fbfaf6';
      for (const [r, a] of [[140, 1], [110, 1], [80, 1]] as const) {
        g.globalAlpha = a;
        g.beginPath();
        g.arc(w / 2, 380, r, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      g.strokeStyle = '#15171c';
      g.lineWidth = 6;
      g.beginPath();
      g.arc(w / 2, 380, 170, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = '#15171c';
      g.font = '500 22px "IBM Plex Mono", monospace';
      g.textAlign = 'center';
      g.fillText('20,000 years ago', w / 2, 600);
    },
  },
  {
    title: 'The Woolly Mammoth',
    fact: 'The last woolly mammoths lived on Wrangel Island until about 4,000 years ago, when the pyramids of Giza were already standing.',
    bg: '#f2c230',
    fg: '#15171c',
    wrong: 'WALK. DO NOT RUN.',
    diagram: (g) => {
      g.fillStyle = '#6b4428';
      g.beginPath();
      g.ellipse(260, 360, 150, 105, 0, 0, Math.PI * 2);
      g.fill();
      g.beginPath();
      g.ellipse(390, 320, 70, 75, 0, 0, Math.PI * 2);
      g.fill();
      for (const x of [170, 220, 300, 350]) g.fillRect(x - 22, 400, 44, 140);
      g.strokeStyle = '#6b4428';
      g.lineWidth = 26;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(440, 340);
      g.quadraticCurveTo(470, 440, 430, 500);
      g.stroke();
      g.strokeStyle = '#fbfaf6';
      g.lineWidth = 12;
      g.beginPath();
      g.moveTo(410, 380);
      g.quadraticCurveTo(500, 470, 440, 430);
      g.stroke();
    },
  },
  {
    title: 'Reading an Ice Core',
    fact: 'Ice drilled in Antarctica traps bubbles of air up to 800,000 years old. Near the top, each thin layer is one year of snow.',
    bg: '#fbfaf6',
    fg: '#15171c',
    wrong: 'THEY HUNT IN THE DARK',
    diagram: (g, w) => {
      const cols = ['#dfeaf3', '#b9d3e6', '#93bcd9', '#6c9fc4', '#3f6f99', '#1f3f66'];
      cols.forEach((c, i) => {
        g.fillStyle = c;
        g.fillRect(w / 2 - 70, 170 + i * 66, 140, 66);
      });
      g.strokeStyle = '#15171c';
      g.lineWidth = 5;
      g.strokeRect(w / 2 - 70, 170, 140, 396);
      g.fillStyle = '#d63a2a';
      g.font = '500 20px "IBM Plex Mono", monospace';
      g.textAlign = 'left';
      g.fillText('young', w / 2 + 90, 200);
      g.fillText('old', w / 2 + 90, 550);
    },
  },
];

iceAge.push({
  title: 'The First Artists',
  fact: 'The animals painted in Chauvet Cave in France are more than 30,000 years old, among the oldest cave paintings known.',
  bg: '#d63a2a',
  fg: '#fbfaf6',
  wrong: 'KEEP THE LIGHT ON THEM',
  diagram: (g, w) => {
    g.fillStyle = '#f2e3c4';
    g.beginPath();
    g.ellipse(w / 2, 400, 200, 170, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#3b2a20';
    g.beginPath();
    g.ellipse(w / 2 - 10, 400, 110, 50, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(w / 2 + 110, 360, 40, 32, 0.3, 0, Math.PI * 2);
    g.fill();
    for (const x of [-80, -40, 30, 70]) g.fillRect(w / 2 + x, 430, 16, 70);
    g.strokeStyle = '#3b2a20';
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(w / 2 + 120, 335);
    g.quadraticCurveTo(w / 2 + 170, 280, w / 2 + 150, 250);
    g.stroke();
  },
});

const egypt: PosterSpec[] = [
  {
    title: 'The Gift of the Nile',
    fact: 'Every summer the Nile flooded and left black, fertile mud. The Egyptians called their country Kemet, the Black Land.',
    bg: '#d9a441',
    fg: '#15171c',
    wrong: 'SHE HEARS YOU',
    diagram: (g, w) => {
      g.fillStyle = '#1f4fd1';
      g.beginPath();
      g.moveTo(w / 2 - 20, 600);
      g.bezierCurveTo(w / 2 + 80, 480, w / 2 - 90, 330, w / 2 + 10, 170);
      g.lineTo(w / 2 + 40, 170);
      g.bezierCurveTo(w / 2 - 60, 330, w / 2 + 110, 480, w / 2 + 20, 600);
      g.fill();
      g.fillStyle = '#1d9757';
      g.fillRect(70, 560, w - 140, 18);
      g.fillStyle = '#15171c';
      g.beginPath();
      g.moveTo(110, 300);
      g.lineTo(170, 200);
      g.lineTo(230, 300);
      g.fill();
    },
  },
  {
    title: 'Reading Hieroglyphs',
    fact: 'In 1822 Jean-François Champollion deciphered hieroglyphs, helped by the Rosetta Stone, which repeats one decree in three scripts.',
    bg: '#fbfaf6',
    fg: '#15171c',
    wrong: 'WALK SOFTLY',
    diagram: (g, w) => {
      g.strokeStyle = '#15171c';
      g.lineWidth = 6;
      g.beginPath();
      g.ellipse(w / 2, 380, 110, 190, 0, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = '#d63a2a';
      g.beginPath();
      g.arc(w / 2, 260, 30, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#1f4fd1';
      g.fillRect(w / 2 - 50, 340, 100, 22);
      g.fillStyle = '#15171c';
      g.beginPath();
      g.moveTo(w / 2 - 40, 480);
      g.quadraticCurveTo(w / 2, 400, w / 2 + 40, 480);
      g.fill();
    },
  },
  {
    title: 'The Weighing of the Heart',
    fact: 'In the afterlife the heart was weighed against the feather of Maat, goddess of truth. A heart heavy with wrongs was eaten by Ammit.',
    bg: '#1d9757',
    fg: '#fbfaf6',
    wrong: 'THE HEART IS WEIGHED',
    diagram: (g, w) => {
      g.strokeStyle = '#f2c230';
      g.fillStyle = '#f2c230';
      g.lineWidth = 8;
      g.beginPath();
      g.moveTo(w / 2, 560);
      g.lineTo(w / 2, 240);
      g.moveTo(w / 2 - 160, 280);
      g.lineTo(w / 2 + 160, 260);
      g.stroke();
      g.beginPath();
      g.moveTo(w / 2 - 160, 280);
      g.lineTo(w / 2 - 200, 380);
      g.lineTo(w / 2 - 120, 380);
      g.closePath();
      g.moveTo(w / 2 + 160, 260);
      g.lineTo(w / 2 + 120, 360);
      g.lineTo(w / 2 + 200, 360);
      g.closePath();
      g.stroke();
      g.fillStyle = '#d63a2a';
      g.beginPath();
      g.arc(w / 2 - 160, 360, 20, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#fbfaf6';
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(w / 2 + 160, 340);
      g.lineTo(w / 2 + 175, 300);
      g.stroke();
    },
  },
];

egypt.push({
  title: 'Canopic Jars',
  fact: 'Four jars kept the liver, lungs, stomach and intestines of the dead. Each lid shows one of the four sons of Horus.',
  bg: '#1f4fd1',
  fg: '#fbfaf6',
  wrong: 'SHE COUNTS YOUR STEPS',
  diagram: (g) => {
    const heads = ['#f2c230', '#d63a2a', '#1d9757', '#fbfaf6'];
    heads.forEach((c, i) => {
      const x = 90 + i * 110;
      g.fillStyle = '#e8d2a6';
      g.beginPath();
      g.moveTo(x - 38, 560);
      g.quadraticCurveTo(x - 52, 420, x - 30, 360);
      g.lineTo(x + 30, 360);
      g.quadraticCurveTo(x + 52, 420, x + 38, 560);
      g.fill();
      g.fillStyle = c;
      g.beginPath();
      g.arc(x, 330, 34, 0, Math.PI * 2);
      g.fill();
    });
  },
});

/** The same poster drained of colour, darker, with its title replaced in red. */
function wrongVersion(spec: PosterSpec): THREE.CanvasTexture {
  const src = factPosterTexture({ ...spec, footer: 'DO NOT TURN AROUND' });
  const img = src.image as HTMLCanvasElement;
  const tex = canvasTexture(img.width, img.height, (g, w, h) => {
    g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, w, h);
    for (let i = 0; i < d.data.length; i += 4) {
      const l = (d.data[i] * 0.3 + d.data[i + 1] * 0.59 + d.data[i + 2] * 0.11) * 0.62;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = l;
    }
    g.putImageData(d, 0, 0);
    g.fillStyle = '#2b2b2b';
    g.fillRect(0, 0, w, 150);
    g.fillStyle = '#d63a2a';
    g.font = '800 40px Jost, Futura, "Century Gothic", sans-serif';
    g.textAlign = 'center';
    g.fillText(spec.wrong, w / 2, 92);
  });
  src.dispose();
  return tex;
}

/** Four friendly posters, then the same four gone wrong, in walking order. */
export function corridorPosters(chapterId: string): THREE.CanvasTexture[] {
  const specs = chapterId === 'egypt' ? egypt : iceAge;
  return [...specs.map(factPosterTexture), ...specs.map(wrongVersion)];
}
