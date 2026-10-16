import { STAMINA } from '../config';

/**
 * Sprint stamina. Pure logic so it can be unit tested without a renderer.
 * Once fully drained the player must recover `minToStart` before sprinting again,
 * which stops sprint from flickering on and off at zero.
 */
export class Stamina {
  value: number = STAMINA.max;
  private sinceSprint = Infinity;
  private exhausted = false;

  /** Returns whether the player is actually sprinting this frame. */
  update(dt: number, wantsSprint: boolean, isMoving: boolean): boolean {
    const canSprint = wantsSprint && isMoving && this.value > 0 && !this.exhausted;
    if (canSprint) {
      this.value = Math.max(0, this.value - dt);
      this.sinceSprint = 0;
      if (this.value === 0) this.exhausted = true;
      return true;
    }
    this.sinceSprint += dt;
    if (this.sinceSprint >= STAMINA.recoverDelay) {
      this.value = Math.min(STAMINA.max, this.value + dt * (STAMINA.max / STAMINA.recoverTime));
    }
    if (this.exhausted && this.value >= STAMINA.minToStart) this.exhausted = false;
    return false;
  }

  get fraction(): number {
    return this.value / STAMINA.max;
  }

  get isExhausted(): boolean {
    return this.exhausted;
  }
}
