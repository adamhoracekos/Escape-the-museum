import { describe, expect, it } from 'vitest';
import { Progress } from '../src/progress/Progress';

describe('Progress', () => {
  it('counts fragments per level only', () => {
    const p = new Progress();
    p.load(['ice-age/fragment-1', 'ice-age/fragment-2', 'egypt/fragment-1', 'ice-age/battery-1']);
    expect(p.fragments('ice-age')).toBe(2);
    expect(p.fragments('egypt')).toBe(1);
    expect(p.fragments('rotunda')).toBe(0);
  });

  it('opens Egypt only after the Venus is on its plinth', () => {
    const p = new Progress();
    expect(p.isOpen('ice-age')).toBe(true);
    expect(p.isOpen('egypt')).toBe(false);
    p.add('ice-age/assembled');
    expect(p.isCarrying('ice-age')).toBe(true);
    expect(p.isOpen('ice-age')).toBe(false); // no going back in while carrying it
    expect(p.isOpen('egypt')).toBe(false);
    p.add('ice-age/placed');
    expect(p.isCarrying('ice-age')).toBe(false);
    expect(p.isOpen('egypt')).toBe(true);
  });

  it('never opens wings that are not built', () => {
    const p = new Progress();
    expect(p.isOpen('solar-system')).toBe(false);
    expect(p.isOpen('nonsense')).toBe(false);
  });

  it('is complete when both artifacts are placed', () => {
    const p = new Progress();
    p.load(['ice-age/assembled', 'ice-age/placed', 'egypt/assembled']);
    expect(p.placedCount()).toBe(1);
    expect(p.isComplete()).toBe(false);
    p.add('egypt/placed');
    expect(p.isComplete()).toBe(true);
  });
});
