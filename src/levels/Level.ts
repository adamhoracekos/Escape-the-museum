import type * as THREE from 'three';
import type { Exhibit, Interactable } from '../interaction/types';
import type { World } from '../world/World';

export interface Checkpoint {
  id: string;
  position: THREE.Vector3;
  yaw: number;
  /** Reaching this radius around the bench activates the checkpoint. */
  radius: number;
}

/** What a level may ask of the game. Keeps levels free of HUD and save details. */
export interface LevelServices {
  isCollected(id: string): boolean;
  /** Marks an item collected. Returns false if it could not be taken (e.g. battery limit). */
  collectFragment(id: string): void;
  collectBattery(id: string): boolean;
  fragmentsCollected(): number;
  toast(text: string): void;
  saveAtCheckpoint(cp: Checkpoint): void;
}

export interface Level {
  id: string;
  title: string;
  root: THREE.Group;
  world: World;
  checkpoints: Checkpoint[];
  interactables: Interactable[];
  exhibits: Exhibit[];
  fragmentsTotal: number;
  background: THREE.Color;
  /** Called every frame while the level is active. */
  update(dt: number, t: number, playerFeet: THREE.Vector3): void;
  /** Re-sync visuals with collected state, e.g. after loading a save. */
  refresh(): void;
}
