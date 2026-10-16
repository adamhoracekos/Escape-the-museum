// Gameplay numbers from the design document (GDD v0.1, chapters 3 to 6).
// Keep tuning values here so playtests change one file.

export const PLAYER = {
  radius: 0.32,
  standHeight: 1.75,
  crouchHeight: 1.1,
  eyeOffset: 0.1, // eye sits this far below the top of the capsule
  walkSpeed: 3.0,
  sprintSpeed: 5.2,
  crouchSpeed: 1.4,
  acceleration: 14,
  gravity: -20,
  stepBobAmount: 0.035,
  stepBobFrequency: 1.9, // steps per metre travelled
  fov: 75,
} as const;

export const STAMINA = {
  max: 6, // seconds of sprint
  recoverTime: 8, // seconds from empty to full
  recoverDelay: 0.6, // pause after sprinting before recovery starts
  minToStart: 1.0, // seconds needed to start a new sprint once exhausted
} as const;

/** Noise radius in metres for each movement mode (GDD 3). */
export const NOISE = {
  idle: 0,
  crouch: 1.5,
  walk: 5,
  sprint: 12,
} as const;

export type Surface = 'snow' | 'tile' | 'sand' | 'grate';

export const SURFACE_NOISE: Record<Surface, number> = {
  snow: 0.7,
  tile: 1.0,
  sand: 1.3,
  grate: 1.6,
};

export const FLASHLIGHT = {
  fullChargeSeconds: 240,
  lowThreshold: 0.2,
  maxSpareBatteries: 2,
  intensity: 16,
  distance: 22,
  angle: 0.46,
  penumbra: 0.8,
  respawnMinCharge: 0.5,
} as const;

export const INTERACT = {
  reach: 2.2,
  labelReach: 4,
} as const;

export const SAVE_KEY = 'escape-the-museum.save';
export const SAVE_VERSION = 1;
