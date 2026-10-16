import * as THREE from 'three';
import { INTERACT } from '../config';
import type { World } from '../world/World';
import type { Exhibit, Interactable } from './types';

/**
 * Finds what the player is looking at: the nearest interactable within reach
 * and the nearest exhibit label within label range. Walls block both.
 */
export class LookTargets {
  interactables: Interactable[] = [];
  exhibits: Exhibit[] = [];
  focused: Interactable | null = null;
  focusedExhibit: Exhibit | null = null;

  private ray = new THREE.Raycaster();
  private center = new THREE.Vector2(0, 0);

  update(camera: THREE.Camera, world: World): void {
    camera.updateMatrixWorld();
    this.ray.setFromCamera(this.center, camera);
    this.ray.far = INTERACT.labelReach;
    const wall = world.rayDistance(this.ray.ray.origin, this.ray.ray.direction, INTERACT.labelReach);

    this.focused = null;
    let best = Math.min(INTERACT.reach, wall + 0.05);
    for (const it of this.interactables) {
      if (!it.object.visible) continue;
      const hit = this.ray.intersectObject(it.object, true)[0];
      if (hit && hit.distance < best && it.prompt() !== null) {
        best = hit.distance;
        this.focused = it;
      }
    }

    this.focusedExhibit = null;
    let bestEx = Math.min(INTERACT.labelReach, wall + 0.05);
    for (const ex of this.exhibits) {
      if (!ex.object.visible) continue;
      const hit = this.ray.intersectObject(ex.object, true)[0];
      if (hit && hit.distance < bestEx) {
        bestEx = hit.distance;
        this.focusedExhibit = ex;
      }
    }
  }
}
