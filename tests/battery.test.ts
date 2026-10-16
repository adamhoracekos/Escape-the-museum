import { describe, expect, it } from 'vitest';
import { FLASHLIGHT } from '../src/config';
import { Battery } from '../src/player/Battery';

describe('Battery', () => {
  it('lasts fullChargeSeconds of light and does not drain when off', () => {
    const b = new Battery();
    b.drain(FLASHLIGHT.fullChargeSeconds / 2, true);
    expect(b.charge).toBeCloseTo(0.5);
    b.drain(1000, false);
    expect(b.charge).toBeCloseTo(0.5);
    b.drain(FLASHLIGHT.fullChargeSeconds, true);
    expect(b.isEmpty).toBe(true);
    expect(b.output(1)).toBe(0);
  });

  it('caps spare batteries', () => {
    const b = new Battery();
    for (let i = 0; i < FLASHLIGHT.maxSpareBatteries; i++) expect(b.addSpare()).toBe(true);
    expect(b.addSpare()).toBe(false);
  });

  it('swaps only when a spare exists and the battery is not full', () => {
    const b = new Battery();
    b.addSpare();
    expect(b.swap()).toBe(false);
    b.charge = 0.1;
    expect(b.swap()).toBe(true);
    expect(b.charge).toBe(1);
    expect(b.spares).toBe(0);
    b.charge = 0.1;
    expect(b.swap()).toBe(false);
  });

  it('dims below the low threshold and keeps full output above it', () => {
    const b = new Battery();
    expect(b.output(0)).toBe(1);
    b.charge = FLASHLIGHT.lowThreshold / 2;
    for (let t = 0; t < 5; t += 0.1) expect(b.output(t)).toBeLessThan(1);
  });

  it('tops up to at least half on respawn', () => {
    const b = new Battery();
    b.charge = 0.1;
    b.topUpForRespawn();
    expect(b.charge).toBe(FLASHLIGHT.respawnMinCharge);
    b.charge = 0.9;
    b.topUpForRespawn();
    expect(b.charge).toBe(0.9);
  });
});
