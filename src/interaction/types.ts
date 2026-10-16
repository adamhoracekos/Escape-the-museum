import type * as THREE from 'three';

export interface Interactable {
  id: string;
  /** Root object hit by the look ray. Children count as hits too. */
  object: THREE.Object3D;
  /** Text after "[E]", or null when there is nothing to do right now. */
  prompt(): string | null;
  interact(): void;
}

/**
 * A museum label in the "Fig. N" style of the visual direction.
 * Text is a function so labels can change register as the level progresses (GDD 10).
 */
export interface Exhibit {
  object: THREE.Object3D;
  /** World point the label's leader line points at. */
  anchor: THREE.Vector3;
  fig: string;
  text(): string;
  /** Unsettling labels are drawn in red. */
  warn?(): boolean;
}
