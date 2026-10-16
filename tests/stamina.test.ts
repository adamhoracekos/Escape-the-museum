import { describe, expect, it } from 'vitest';
import { STAMINA } from '../src/config';
import { Stamina } from '../src/player/Stamina';

const run = (s: Stamina, seconds: number, sprint: boolean, moving = true) => {
  let sprinted = false;
  for (let t = 0; t < seconds; t += 0.01) sprinted = s.update(0.01, sprint, moving) || sprinted;
  return sprinted;
};

describe('Stamina', () => {
  it('drains while sprinting and runs out after max seconds', () => {
    const s = new Stamina();
    run(s, STAMINA.max - 0.5, true);
    expect(s.value).toBeGreaterThan(0);
    run(s, 1, true);
    expect(s.value).toBe(0);
    expect(s.isExhausted).toBe(true);
  });

  it('does not sprint when standing still', () => {
    const s = new Stamina();
    expect(run(s, 1, true, false)).toBe(false);
    expect(s.value).toBe(STAMINA.max);
  });

  it('blocks sprint after exhaustion until minToStart has recovered', () => {
    const s = new Stamina();
    run(s, STAMINA.max + 0.1, true);
    expect(s.update(0.01, true, true)).toBe(false);
    run(s, STAMINA.recoverDelay + 0.2, false);
    expect(s.isExhausted).toBe(true);
    run(s, (STAMINA.minToStart / STAMINA.max) * STAMINA.recoverTime + 0.1, false);
    expect(s.isExhausted).toBe(false);
    expect(s.update(0.01, true, true)).toBe(true);
  });

  it('recovers fully in recoverTime after the delay', () => {
    const s = new Stamina();
    run(s, STAMINA.max + 0.1, true);
    run(s, STAMINA.recoverDelay + STAMINA.recoverTime + 0.1, false);
    expect(s.value).toBeCloseTo(STAMINA.max, 5);
  });
});
