import { describe, expect, it } from 'vitest';
import { corridorCoords, corridorDarkness, corridorProgress, panelLit, yawToCentre } from '../src/levels/rotunda/corridorMath';

describe('corridor geometry', () => {
  it('measures distance along and across a corridor at any angle', () => {
    const a = Math.PI / 4;
    const c = corridorCoords(Math.sin(a) * 20, Math.cos(a) * 20, a, 10);
    expect(c.along).toBeCloseTo(10);
    expect(c.lateral).toBeCloseTo(0);
    const side = corridorCoords(Math.sin(a) * 20 + Math.cos(a), Math.cos(a) * 20 - Math.sin(a), a, 10);
    expect(side.lateral).toBeCloseTo(1);
  });

  it('reports no progress outside the corridor', () => {
    expect(corridorProgress({ along: -2, lateral: 0 }, 36, 1.7)).toBe(0);
    expect(corridorProgress({ along: 10, lateral: 5 }, 36, 1.7)).toBe(0);
    expect(corridorProgress({ along: 18, lateral: 0.5 }, 36, 1.7)).toBeCloseTo(0.5);
    expect(corridorProgress({ along: 50, lateral: 0 }, 36, 1.7)).toBe(1);
  });

  it('goes from light to black and kills panels from the far end', () => {
    expect(corridorDarkness(0)).toBe(0);
    expect(corridorDarkness(1)).toBe(1);
    expect(corridorDarkness(0.4)).toBeGreaterThan(0.3);
    expect(panelLit(0.1, 0)).toBe(true);
    expect(panelLit(0.95, 0)).toBe(false);
    expect(panelLit(0.1, 0.8)).toBe(false);
  });

  it('turns a camera to face the centre', () => {
    const yaw = yawToCentre(0, -7);
    // Camera forward is (-sin yaw, 0, -cos yaw).
    expect(-Math.sin(yaw)).toBeCloseTo(0);
    expect(-Math.cos(yaw)).toBeCloseTo(1);
  });
});
