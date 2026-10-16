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

/** Corridors between the rotunda and the chapters (GDD 9): about 12 s of walking. */
export const CORRIDOR = {
  length: 36,
  width: 3.4,
  height: 3.6,
  /** Distance from the far end at which the fade to the level starts. */
  triggerFromEnd: 3,
} as const;

/** Fade to black between areas, with the chapter card in the middle (seconds). */
export const TRANSITION = {
  fadeOut: 0.9,
  hold: 2.4,
  holdShort: 0.8,
  fadeIn: 1.2,
} as const;

/** Ice Age hunters (GDD 7.1 and 7.2). Speeds in m/s, times in seconds. */
export const HUNTER = {
  patrolSpeed: 1.6,
  searchSpeed: 2.0,
  chaseSpeed: 4.4,
  /** Full width of the view cone in degrees, and how far it reaches. */
  viewAngle: 90,
  viewDistance: 14,
  /** Closer than this the hunter needs no confirmation: seeing you is enough. */
  closeSight: 4,
  /** Time in view needed to turn suspicion into a chase. */
  confirmTime: 0.5,
  /** Suspicion: stop, turn the head, then walk over to look. */
  suspicionTime: 1.5,
  /** Out of sight this long during a chase and the hunter goes to search. */
  loseTime: 2.5,
  searchTime: 20,
  searchRadius: 6,
  /** Stand in front of a hiding place for this long while searching. */
  inspectTime: 2.2,
  catchDistance: 0.95,
  /** Puppet motion (GDD 7.1): the pose changes 8 to 12 times a second, with an occasional dead stop. */
  poseRateMin: 8,
  poseRateMax: 12,
  holdChance: 0.07,
  holdTime: 0.45,
  height: 1.9,
  radius: 0.4,
} as const;

/** Hiding places (GDD 5). */
export const HIDING = {
  enterTime: 0.6,
  noise: 3,
  /** Seen within this many seconds before you are inside, and the hunter knows where you are. */
  seenWindow: 0.8,
  /** After this long in one place the hunter comes to check it anyway. */
  maxTime: 30,
  warnTime: 20,
  fov: 48,
  yawRange: 0.55,
  pitchRange: 0.3,
} as const;

export const SAVE_KEY = 'escape-the-museum.save';
/** Version 2: progress ids are namespaced by level ("ice-age/fragment-1"). Older saves are ignored. */
export const SAVE_VERSION = 2;
