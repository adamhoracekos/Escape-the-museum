import * as THREE from 'three';

export function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Museum checkerboard, `n` squares per side of one texture tile. */
export function checkerTexture(a: string, b: string, n = 2): THREE.CanvasTexture {
  const t = canvasTexture(256, 256, (g, w) => {
    const s = w / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        g.fillStyle = (x + y) % 2 ? a : b;
        g.fillRect(x * s, y * s, s, s);
      }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter;
  return t;
}

export function gridTexture(bg: string, line: string): THREE.CanvasTexture {
  const t = canvasTexture(128, 128, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = line;
    g.lineWidth = 10;
    for (let i = 0; i <= 4; i++) {
      g.beginPath();
      g.moveTo(i * 32, 0);
      g.lineTo(i * 32, h);
      g.stroke();
      g.beginPath();
      g.moveTo(0, i * 32);
      g.lineTo(w, i * 32);
      g.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function noiseTexture(base: string, speck: string, density = 900): THREE.CanvasTexture {
  const t = canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    g.fillStyle = speck;
    for (let i = 0; i < density; i++) g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Edutainment-style poster: bold title, a simple diagram, and a footer line. */
export function posterTexture(title: string, footer: string, bg: string, fg: string, diagram: (g: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  return canvasTexture(512, 704, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.textAlign = 'center';
    g.font = '800 40px Jost, Futura, "Century Gothic", sans-serif';
    const words = title.split(' ');
    let line = '';
    let y = 72;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (g.measureText(test).width > w - 60 && line) {
        g.fillText(line, w / 2, y);
        line = word;
        y += 46;
      } else line = test;
    }
    g.fillText(line, w / 2, y);
    g.save();
    diagram(g, w, h);
    g.restore();
    g.fillStyle = fg;
    g.globalAlpha = 0.75;
    g.font = '500 20px "IBM Plex Mono", monospace';
    g.textAlign = 'center';
    g.fillText(footer, w / 2, h - 30);
  });
}

export function signTexture(text: string, bg: string, fg: string): THREE.CanvasTexture {
  return canvasTexture(512, 128, (g, w, h) => {
    g.fillStyle = bg;
    g.fillRect(0, 0, w, h);
    g.fillStyle = fg;
    g.font = '700 54px Jost, Futura, "Century Gothic", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2 + 3);
  });
}
