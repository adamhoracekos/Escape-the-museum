import { describe, expect, it } from 'vitest';
import { SAVE_KEY } from '../src/config';
import { SaveSystem, type KeyValueStore } from '../src/save/SaveSystem';

class MemoryStore implements KeyValueStore {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

const sample = { levelId: 'test-room', checkpointId: 'lab-bench', collected: ['a', 'b', 'a'], batteryCharge: 0.4, spareBatteries: 1 };

describe('SaveSystem', () => {
  it('round-trips a save and de-duplicates collected ids', () => {
    const s = new SaveSystem(new MemoryStore());
    expect(s.save(sample)).toBe(true);
    const loaded = s.load();
    expect(loaded?.checkpointId).toBe('lab-bench');
    expect(loaded?.collected).toEqual(['a', 'b']);
  });

  it('ignores corrupted or foreign data', () => {
    const store = new MemoryStore();
    const s = new SaveSystem(store);
    store.setItem(SAVE_KEY, '{not json');
    expect(s.load()).toBeNull();
    store.setItem(SAVE_KEY, JSON.stringify({ version: 999 }));
    expect(s.load()).toBeNull();
  });

  it('keeps working when storage throws or is missing', () => {
    const throwing: KeyValueStore = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    };
    const s = new SaveSystem(throwing);
    expect(s.load()).toBeNull();
    expect(s.save(sample)).toBe(false);
    expect(() => s.clear()).not.toThrow();
    const none = new SaveSystem(null);
    expect(none.available).toBe(false);
    expect(none.save(sample)).toBe(false);
  });
});
