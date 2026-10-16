import * as THREE from 'three';

export type Cue = 'suspicion' | 'chase' | 'lost' | 'calm' | 'creak' | 'open' | 'shutter';

/**
 * Small synthesised sound set, so every enemy state change is audible (GDD 7.1) before the real sound pass.
 * Everything is made with oscillators and filtered noise; there are no audio files.
 * Positional sounds are panned and attenuated by hand against the camera.
 */
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private listener = new THREE.Vector3();
  private right = new THREE.Vector3(1, 0, 0);

  /** Must be called from a click: browsers only start audio after a user gesture. */
  resume(): void {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.7;
        this.master.connect(this.ctx.destination);
        const len = this.ctx.sampleRate;
        this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noise.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  setListener(camera: THREE.Camera): void {
    camera.getWorldPosition(this.listener);
    this.right.set(1, 0, 0).applyQuaternion(camera.quaternion);
  }

  /** Gain and pan for a sound at `pos`; null when it is too far to bother. */
  private place(pos: THREE.Vector3, loudness: number, reach: number): { gain: number; pan: number } | null {
    const to = pos.clone().sub(this.listener);
    const d = to.length();
    if (d > reach) return null;
    const gain = loudness / (1 + (d * d) / 9);
    const pan = d > 0.01 ? THREE.MathUtils.clamp(to.normalize().dot(this.right), -1, 1) * 0.8 : 0;
    return { gain, pan };
  }

  private out(pan: number): AudioNode {
    const ctx = this.ctx!;
    if (!ctx.createStereoPanner) return this.master!;
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    p.connect(this.master!);
    return p;
  }

  private burst(dest: AudioNode, when: number, dur: number, gain: number, type: BiquadFilterType, freq: number, q = 1): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.7 + Math.random() * 0.6;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(f).connect(g).connect(dest);
    src.start(when, Math.random() * 0.5, dur + 0.05);
  }

  private tone(dest: AudioNode, when: number, freq: number, dur: number, gain: number, type: OscillatorType = 'sine', attack = 0.005): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(gain, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g).connect(dest);
    o.start(when);
    o.stop(when + dur + 0.05);
  }

  /** A plaster foot on the floor. Running steps are heavier and sharper. */
  step(pos: THREE.Vector3, heavy: boolean): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const p = this.place(pos, heavy ? 1.1 : 0.7, 26);
    if (!p) return;
    const now = this.ctx.currentTime;
    const dest = this.out(p.pan);
    this.burst(dest, now, heavy ? 0.09 : 0.06, p.gain, 'lowpass', heavy ? 900 : 520, 0.8);
    this.tone(dest, now, heavy ? 70 : 95, 0.08, p.gain * 0.6, 'sine');
  }

  cue(c: Cue, at?: THREE.Vector3): void {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const placed = at ? this.place(at, 1, 60) : { gain: 1, pan: 0 };
    if (!placed) return;
    const dest = this.out(placed.pan);
    const k = Math.max(0.35, Math.min(1, placed.gain * 3));
    switch (c) {
      case 'suspicion':
        // Two music-box notes going down, like a toy winding down in the next room.
        this.tone(dest, now, 1318.5, 0.9, 0.12 * k, 'triangle');
        this.tone(dest, now + 0.28, 1046.5, 1.2, 0.1 * k, 'triangle');
        break;
      case 'chase':
        // Low cluster swelling up, and the lamps buzz.
        for (const f of [55, 58.3, 82.4, 110]) this.tone(dest, now, f, 1.8, 0.09 * k, 'sawtooth', 0.25);
        this.burst(dest, now, 0.5, 0.25 * k, 'bandpass', 120, 6);
        break;
      case 'lost':
        this.tone(dest, now, 220, 1.4, 0.07 * k, 'triangle', 0.05);
        this.tone(dest, now + 0.2, 207.6, 1.6, 0.06 * k, 'triangle', 0.05);
        break;
      case 'calm':
        this.tone(dest, now, 784, 1.2, 0.05 * k, 'sine', 0.02);
        this.tone(dest, now + 0.18, 1046.5, 1.4, 0.04 * k, 'sine', 0.02);
        break;
      case 'creak':
        this.burst(dest, now, 0.5, 0.35 * k, 'bandpass', 700, 12);
        this.burst(dest, now + 0.12, 0.35, 0.2 * k, 'bandpass', 1100, 14);
        break;
      case 'open':
        this.burst(dest, now, 0.7, 0.6, 'bandpass', 500, 10);
        this.burst(dest, now + 0.2, 0.15, 0.6, 'lowpass', 300, 1);
        break;
      case 'shutter':
        this.burst(dest, now, 0.03, 0.8, 'highpass', 2500, 0.7);
        this.burst(dest, now + 0.09, 0.05, 0.6, 'highpass', 1800, 0.7);
        break;
    }
  }
}
