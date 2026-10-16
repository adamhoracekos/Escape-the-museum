import { FLASHLIGHT } from '../config';

/** Flashlight battery state. Pure logic, no three.js. */
export class Battery {
  /** Charge of the battery in the flashlight, 0..1. */
  charge = 1;
  spares = 0;

  drain(dt: number, lightOn: boolean): void {
    if (!lightOn) return;
    this.charge = Math.max(0, this.charge - dt / FLASHLIGHT.fullChargeSeconds);
  }

  get isEmpty(): boolean {
    return this.charge <= 0;
  }

  get isLow(): boolean {
    return this.charge < FLASHLIGHT.lowThreshold;
  }

  /** Adds a spare battery. Returns false when the player already carries the maximum. */
  addSpare(): boolean {
    if (this.spares >= FLASHLIGHT.maxSpareBatteries) return false;
    this.spares++;
    return true;
  }

  /** Swaps in a spare. Returns false when there is no spare or the current one is still full. */
  swap(): boolean {
    if (this.spares <= 0 || this.charge >= 0.999) return false;
    this.spares--;
    this.charge = 1;
    return true;
  }

  /** After being caught the player keeps at least half a battery (GDD 6). */
  topUpForRespawn(): void {
    this.charge = Math.max(this.charge, FLASHLIGHT.respawnMinCharge);
  }

  /**
   * Light output multiplier. Below the low threshold the light dims and flickers.
   * `t` is elapsed time in seconds, used as a deterministic flicker source.
   */
  output(t: number): number {
    if (this.isEmpty) return 0;
    if (!this.isLow) return 1;
    const k = this.charge / FLASHLIGHT.lowThreshold; // 1 at threshold, 0 when empty
    const flicker = Math.sin(t * 31) + Math.sin(t * 17.3) + Math.sin(t * 5.1);
    const drop = flicker > 2.2 - (1 - k) * 1.6 ? 0.15 : 1;
    return (0.35 + 0.65 * k) * drop;
  }
}
