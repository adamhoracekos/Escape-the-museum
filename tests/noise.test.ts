import { describe, expect, it } from 'vitest';
import { noiseRadius } from '../src/player/noise';

describe('noiseRadius', () => {
  it('matches the GDD table', () => {
    expect(noiseRadius('idle', 'tile')).toBe(0);
    expect(noiseRadius('crouch', 'tile')).toBe(1.5);
    expect(noiseRadius('walk', 'tile')).toBe(5);
    expect(noiseRadius('sprint', 'tile')).toBe(12);
    expect(noiseRadius('walk', 'snow')).toBeCloseTo(3.5);
    expect(noiseRadius('sprint', 'grate')).toBeCloseTo(19.2);
  });
});
