import { SAVE_KEY, SAVE_VERSION } from '../config';

export interface SaveData {
  version: number;
  /** Level the checkpoint belongs to, e.g. 'test-room', 'rotunda', 'ice-age'. */
  levelId: string;
  checkpointId: string;
  /** Ids of collected pickups. They stay collected after being caught (GDD 6). */
  collected: string[];
  batteryCharge: number;
  spareBatteries: number;
  savedAt: number;
}

/** Minimal storage interface so tests can pass an in-memory map. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStore(): KeyValueStore | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // access throws in some sandboxed or private contexts
  }
}

export function isSaveData(v: unknown): v is SaveData {
  if (!v || typeof v !== 'object') return false;
  const s = v as Record<string, unknown>;
  return (
    s.version === SAVE_VERSION &&
    typeof s.levelId === 'string' &&
    typeof s.checkpointId === 'string' &&
    Array.isArray(s.collected) &&
    s.collected.every((c) => typeof c === 'string') &&
    typeof s.batteryCharge === 'number' &&
    typeof s.spareBatteries === 'number' &&
    typeof s.savedAt === 'number'
  );
}

/**
 * Progress is saved at checkpoints and when an artifact is placed.
 * Storage can be missing or throw; the game must keep running either way.
 */
export class SaveSystem {
  constructor(private store: KeyValueStore | null = defaultStore()) {}

  get available(): boolean {
    return this.store !== null;
  }

  load(): SaveData | null {
    if (!this.store) return null;
    try {
      const raw = this.store.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      return isSaveData(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  save(data: Omit<SaveData, 'version' | 'savedAt'>): boolean {
    if (!this.store) return false;
    const full: SaveData = { ...data, collected: [...new Set(data.collected)], version: SAVE_VERSION, savedAt: Date.now() };
    try {
      this.store.setItem(SAVE_KEY, JSON.stringify(full));
      return true;
    } catch {
      return false;
    }
  }

  clear(): void {
    try {
      this.store?.removeItem(SAVE_KEY);
    } catch {
      /* storage unavailable, nothing to clear */
    }
  }
}
