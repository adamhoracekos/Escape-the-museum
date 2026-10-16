import * as THREE from 'three';
import { canvasTexture, posterTexture } from '../../world/textures';

type Diagram = (g: CanvasRenderingContext2D, w: number, h: number) => void;

interface PosterSpec {
  title: string;
  bg: string;
  fg: string;
  diagram: Diagram;
  /** What the same poster says once the corridor has gone grey. */
  wrong: string;
}

const FOOTER = 'Illustrated Encyclopedia · Vol. 2';

const iceAge: PosterSpec[] = [
  {
    title: 'The Last Ice Age',
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

const egypt: PosterSpec[] = [
  {
    title: 'The Gift of the Nile',
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

/** The same poster drained of colour, darker, with its title replaced in red. */
function wrongVersion(spec: PosterSpec): THREE.CanvasTexture {
  const src = posterTexture(spec.title, 'DO NOT TURN AROUND', spec.bg, spec.fg, spec.diagram);
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

/** Three friendly posters, then the same three gone wrong, in walking order. */
export function corridorPosters(chapterId: string): THREE.CanvasTexture[] {
  const specs = chapterId === 'egypt' ? egypt : iceAge;
  return [...specs.map((s) => posterTexture(s.title, FOOTER, s.bg, s.fg, s.diagram)), ...specs.map(wrongVersion)];
}
