import type { FactPosterSpec } from '../../world/factPoster';

/**
 * Posters for Chapter I. Every fact here is meant to be true as written (GDD pillar 5);
 * the drawings are simple encyclopedia diagrams. Two of them also teach the level's rules.
 */
export const HUNTERS_POSTER: FactPosterSpec = {
  title: 'How the Ice Age Hunters Stalked Their Prey',
  fact: 'With a spear-thrower, an Ice Age hunter could hurl a spear much farther and harder than by hand alone.',
  bg: '#f2c230',
  fg: '#15171c',
  diagram: (g, w) => {
    // Lit half: a hunter standing still. Dark half: the same hunter, closer.
    g.fillStyle = '#fbfaf6';
    g.fillRect(40, 150, w / 2 - 40, 420);
    g.fillStyle = '#15171c';
    g.fillRect(w / 2, 150, w / 2 - 40, 420);
    const figure = (x: number, y: number, s: number, c: string) => {
      g.fillStyle = c;
      g.beginPath();
      g.ellipse(x, y - 120 * s, 16 * s, 22 * s, 0.3, 0, Math.PI * 2);
      g.fill();
      g.fillRect(x - 12 * s, y - 98 * s, 24 * s, 80 * s);
      g.fillRect(x - 14 * s, y - 20 * s, 10 * s, 70 * s);
      g.fillRect(x + 4 * s, y - 20 * s, 10 * s, 70 * s);
      g.fillRect(x + 12 * s, y - 150 * s, 4 * s, 200 * s);
    };
    figure(150, 470, 1, '#15171c');
    figure(370, 500, 1.35, '#d63a2a');
    g.font = '600 26px "IBM Plex Mono", monospace';
    g.textAlign = 'center';
    g.fillStyle = '#15171c';
    g.fillText('LIT: STILL', 150, 560);
    g.fillStyle = '#fbfaf6';
    g.fillText('DARK: CLOSER', 370, 560);
  },
};

export const ICE_LAYERS_POSTER: FactPosterSpec = {
  title: 'Reading the Ice',
  fact: 'Snow piles up year after year and is pressed into ice. As the ice sinks and flows, its yearly layers are squeezed thinner, so the deeper, older ice has the thinnest layers.',
  bg: '#7fb7d9',
  fg: '#15171c',
  diagram: (g, w) => {
    const x = w / 2 - 70;
    let y = 160;
    g.fillStyle = '#eaf3f9';
    g.fillRect(x, 160, 140, 420);
    g.fillStyle = '#3f6f99';
    for (let gap = 60; y < 570; gap = Math.max(9, gap * 0.82)) {
      g.fillRect(x, y, 140, Math.max(3, gap * 0.25));
      y += gap;
    }
    g.strokeStyle = '#15171c';
    g.lineWidth = 6;
    g.strokeRect(x, 160, 140, 420);
    g.fillStyle = '#d63a2a';
    g.font = '600 24px "IBM Plex Mono", monospace';
    g.textAlign = 'left';
    g.fillText('young', x + 160, 190);
    g.fillText('old', x + 160, 570);
  },
};

export const ICE_CORE_POSTER: FactPosterSpec = {
  title: 'Air From the Ice Age',
  fact: 'Bubbles trapped in Antarctic ice hold real air from up to 800,000 years ago. Scientists melt them out to measure the ancient atmosphere.',
  bg: '#fbfaf6',
  fg: '#15171c',
  diagram: (g, w) => {
    g.fillStyle = '#cfe6f5';
    g.beginPath();
    g.arc(w / 2, 360, 190, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fbfaf6';
    for (let i = 0; i < 14; i++) {
      g.beginPath();
      g.arc(w / 2 + Math.sin(i * 2.4) * 130, 360 + Math.cos(i * 1.7) * 130, 12 + (i % 4) * 6, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = '#15171c';
    g.lineWidth = 6;
    g.beginPath();
    g.arc(w / 2, 360, 190, 0, Math.PI * 2);
    g.stroke();
  },
};

export const BONE_HUT_POSTER: FactPosterSpec = {
  title: 'Houses of Mammoth Bone',
  fact: 'Where trees were scarce, people of the Ice Age built huts from mammoth bones. Some huts found in Ukraine used the bones of dozens of mammoths.',
  bg: '#d63a2a',
  fg: '#fbfaf6',
  diagram: (g, w) => {
    g.fillStyle = '#e8dcc0';
    g.beginPath();
    g.moveTo(w / 2 - 210, 560);
    g.quadraticCurveTo(w / 2, 120, w / 2 + 210, 560);
    g.fill();
    g.strokeStyle = '#7a5a3a';
    g.lineWidth = 10;
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      g.arc(w / 2, 560, 60 + i * 28, Math.PI, Math.PI * 2);
      g.stroke();
    }
    g.fillStyle = '#15171c';
    g.fillRect(w / 2 - 40, 470, 80, 90);
  },
};

export const MAMMOTH_POSTER: FactPosterSpec = {
  title: 'The Woolly Mammoth',
  fact: 'A woolly mammoth stood about 3 metres at the shoulder, roughly the size of an African elephant. Long outer hair and a thick layer of fat kept out the cold.',
  bg: '#1d9757',
  fg: '#fbfaf6',
  diagram: (g, w) => {
    g.fillStyle = '#6b4428';
    g.beginPath();
    g.ellipse(w / 2 - 20, 380, 170, 110, 0, 0, Math.PI * 2);
    g.ellipse(w / 2 + 130, 300, 70, 80, 0, 0, Math.PI * 2);
    g.ellipse(w / 2 - 60, 270, 90, 50, -0.2, 0, Math.PI * 2);
    g.fill();
    for (const x of [-130, -60, 40, 100]) g.fillRect(w / 2 + x - 22, 430, 44, 130);
    g.strokeStyle = '#fbfaf6';
    g.lineWidth = 14;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(w / 2 + 160, 340);
    g.quadraticCurveTo(w / 2 + 250, 450, w / 2 + 170, 470);
    g.stroke();
    g.strokeStyle = '#f2c230';
    g.lineWidth = 4;
    g.setLineDash([10, 8]);
    g.beginPath();
    g.moveTo(60, 230);
    g.lineTo(60, 560);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#f2c230';
    g.font = '600 24px "IBM Plex Mono", monospace';
    g.fillText('3 m', 76, 400);
  },
};

export const HEAT_POSTER: FactPosterSpec = {
  title: 'Melting Ice Takes Heat',
  fact: 'Melting a kilogram of ice at 0 °C takes as much heat as warming the same water from 0 °C to 80 °C. A mirror sends light off at the same angle it arrives.',
  bg: '#fbfaf6',
  fg: '#15171c',
  diagram: (g, w) => {
    g.strokeStyle = '#15171c';
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(80, 520);
    g.lineTo(w - 80, 520);
    g.stroke();
    g.strokeStyle = '#d63a2a';
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(110, 210);
    g.lineTo(w / 2, 515);
    g.lineTo(w - 110, 210);
    g.stroke();
    g.strokeStyle = '#1f4fd1';
    g.lineWidth = 3;
    g.setLineDash([8, 8]);
    g.beginPath();
    g.moveTo(w / 2, 515);
    g.lineTo(w / 2, 200);
    g.stroke();
    g.setLineDash([]);
  },
};

export const CAVE_POSTER: FactPosterSpec = {
  title: 'Painted in the Dark',
  fact: 'The animals on the walls of Lascaux cave in France were painted about 17,000 years ago, by the light of lamps that burned animal fat.',
  bg: '#15171c',
  fg: '#f2c230',
  diagram: (g, w) => {
    g.fillStyle = '#b4643a';
    g.beginPath();
    g.ellipse(w / 2, 360, 150, 80, 0, 0, Math.PI * 2);
    g.ellipse(w / 2 + 140, 320, 50, 40, 0.4, 0, Math.PI * 2);
    g.fill();
    for (const x of [-100, -40, 50, 110]) g.fillRect(w / 2 + x - 12, 400, 24, 110);
    g.strokeStyle = '#b4643a';
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(w / 2 + 150, 290);
    g.lineTo(w / 2 + 190, 200);
    g.moveTo(w / 2 + 130, 290);
    g.lineTo(w / 2 + 110, 200);
    g.stroke();
  },
};
