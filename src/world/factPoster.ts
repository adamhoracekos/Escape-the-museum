import type * as THREE from 'three';
import { posterTexture } from './textures';

export type Diagram = (g: CanvasRenderingContext2D, w: number, h: number) => void;

/** An encyclopedia poster: title, a picture, and one true fact the player can take home (GDD pillar 5). */
export interface FactPosterSpec {
  title: string;
  fact: string;
  bg: string;
  fg: string;
  /** Drawn for the full 512 x 704 poster; it is shrunk into the picture band above the fact. */
  diagram: Diagram;
  footer?: string;
}

export const FOOTER = 'Illustrated Encyclopedia · Vol. 2';

/** Word-wraps `text` and returns the y below the last line. */
export function wrapText(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
  let line = '';
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (g.measureText(test).width > maxWidth && line) {
      g.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else line = test;
  }
  if (line) g.fillText(line, x, y);
  return y + lineHeight;
}

export function factPosterTexture(p: FactPosterSpec): THREE.CanvasTexture {
  return posterTexture(p.title, p.footer ?? FOOTER, p.bg, p.fg, (g, w, h) => {
    const k = 0.6;
    g.save();
    g.translate((w * (1 - k)) / 2, 150 - 160 * k);
    g.scale(k, k);
    p.diagram(g, w, h);
    g.restore();
    g.strokeStyle = p.fg;
    g.globalAlpha = 0.35;
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(40, 452);
    g.lineTo(w - 40, 452);
    g.stroke();
    g.globalAlpha = 1;
    g.fillStyle = p.fg;
    g.font = '500 25px Jost, Futura, "Century Gothic", sans-serif';
    g.textAlign = 'left';
    wrapText(g, p.fact, 44, 492, w - 88, 31);
  });
}
