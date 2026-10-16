import type * as THREE from 'three';
import type { Sfx } from '../audio/Sfx';
import type { Hunter } from '../enemy/Hunter';
import type { Exhibit, Interactable } from '../interaction/types';
import type { Progress } from '../progress/Progress';
import type { World } from '../world/World';

export interface Spawn {
  position: THREE.Vector3;
  yaw: number;
}

export interface Checkpoint extends Spawn {
  id: string;
  /** Reaching this radius around the bench activates the checkpoint. */
  radius: number;
}

/** What enemies may know about the player. Read-only and live: values change every frame. */
export interface PlayerView {
  /** False during menus, transitions and the caught card: enemies hold still then. */
  readonly active: boolean;
  readonly feet: THREE.Vector3;
  readonly eye: THREE.Vector3;
  /** Noise radius in metres this frame (GDD 3). */
  readonly noise: number;
  /** The hiding place the player is getting into or sitting in, or null. */
  readonly hidingIn: string | null;
  /** Seconds spent in the current hiding place. */
  readonly hideSeconds: number;
  /** Is this point in the flashlight beam and in plain view of the camera? */
  lights(point: THREE.Vector3): boolean;
}

/** A place to hide (GDD 5): a cabinet, a diorama backdrop, a sarcophagus. */
export interface HidingSpot {
  id: string;
  /** Where the camera sits inside, and which way it looks out. */
  eye: THREE.Vector3;
  yaw: number;
  /** Where the player steps out. */
  exit: Spawn;
  /** Where a hunter stands to check it, and what it looks at. */
  stand: THREE.Vector3;
  look: THREE.Vector3;
  /** Label shown while hiding, e.g. "Visitor, hiding". */
  label: string;
  setOpen(open: boolean): void;
  /** The player is inside: the doors stop being drawn once shut, so the camera looks out through the slit. */
  setOccupied(inside: boolean): void;
}

/** What a level may ask of the game. Keeps levels free of HUD and save details. */
export interface LevelServices {
  readonly progress: Progress;
  collectFragment(id: string): void;
  /** Returns false if it could not be taken (battery limit). */
  collectBattery(id: string): boolean;
  /** Records a milestone (artifact assembled or placed) and saves at once. */
  commit(id: string): void;
  toast(text: string): void;
  saveAtCheckpoint(cp: Checkpoint): void;
  /** Fade out, load `levelId` and put the player at its spawn `spawnId`. */
  travel(levelId: string, spawnId: string): void;
  readonly player: PlayerView;
  readonly sfx: Sfx;
  catchPlayer(): void;
  hide(spot: HidingSpot): void;
}

/** Chapter card shown on black while a level loads. */
export interface TitleCard {
  kicker: string;
  title: string;
  /** Longer hold for chapter openings, short for coming back to the rotunda. */
  long: boolean;
}

export interface Level {
  id: string;
  title: string;
  card: TitleCard;
  root: THREE.Group;
  world: World;
  checkpoints: Checkpoint[];
  spawns: Record<string, Spawn>;
  interactables: Interactable[];
  exhibits: Exhibit[];
  background: THREE.Color;
  fog: THREE.Fog | null;
  exposure: number;
  /** Called every frame while the level is active. */
  update(dt: number, t: number, playerFeet: THREE.Vector3): void;
  /** Re-sync visuals with progress, e.g. after loading a save or arriving. */
  refresh(): void;
  /** One line in the HUD corner (fragments, carried artifact), or null. */
  status(): string | null;
  /** Camera path behind the title screen. */
  titleView?(t: number, camera: THREE.PerspectiveCamera): void;
  /** Enemies in this level, for the debug panel and browser tests. */
  enemies?: Hunter[];
  /** After being caught, before the player reappears at the checkpoint: put enemies back on patrol. */
  onRespawn?(): void;
  /** Extra line for the debug panel. */
  debug?(): string;
  /** Ending cinematic, k runs from 0 to 1. */
  setEnding?(k: number): void;
}

export type LevelFactory = (svc: LevelServices) => Level;
