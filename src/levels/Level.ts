import type * as THREE from 'three';
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
  /** Ending cinematic, k runs from 0 to 1. */
  setEnding?(k: number): void;
}

export type LevelFactory = (svc: LevelServices) => Level;
