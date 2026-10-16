import * as THREE from 'three';
import type { Interactable } from '../interaction/types';
import { batteryMesh, fragmentMesh } from '../world/props';
import type { LevelServices } from './Level';

interface Pickup {
  id: string;
  obj: THREE.Object3D;
  base: THREE.Vector3;
  spin: boolean;
}

/** Fragments and batteries lying around a level: placement, prompts, bobbing and save sync. */
export class Pickups {
  private items: Pickup[] = [];
  // Small pickups get an invisible, larger hit sphere so they are easy to aim at.
  private proxyGeo = new THREE.SphereGeometry(0.2, 8, 6);
  private proxyMat = new THREE.MeshBasicMaterial({ visible: false });

  constructor(
    private root: THREE.Object3D,
    private svc: LevelServices,
    private interactables: Interactable[],
  ) {}

  private withProxy(o: THREE.Object3D): THREE.Object3D {
    const proxy = new THREE.Mesh(this.proxyGeo, this.proxyMat);
    proxy.userData.noCollide = true;
    o.add(proxy);
    return o;
  }

  fragment(id: string, pos: THREE.Vector3, seed: number): void {
    const m = this.withProxy(fragmentMesh(seed));
    m.position.copy(pos);
    this.root.add(m);
    this.items.push({ id, obj: m, base: pos.clone(), spin: true });
    this.interactables.push({
      id,
      object: m,
      prompt: () => (this.svc.progress.has(id) ? null : 'Pick up fragment'),
      interact: () => {
        this.svc.collectFragment(id);
        m.visible = false;
      },
    });
  }

  battery(id: string, pos: THREE.Vector3): void {
    const m = this.withProxy(batteryMesh());
    m.position.copy(pos);
    this.root.add(m);
    this.items.push({ id, obj: m, base: pos.clone(), spin: false });
    this.interactables.push({
      id,
      object: m,
      prompt: () => (this.svc.progress.has(id) ? null : 'Take battery'),
      interact: () => {
        if (this.svc.collectBattery(id)) m.visible = false;
      },
    });
  }

  update(t: number): void {
    for (const p of this.items) {
      if (!p.obj.visible) continue;
      p.obj.position.y = p.base.y + Math.sin(t * 2 + p.base.x) * 0.03;
      if (p.spin) p.obj.rotation.y = t * 0.8;
    }
  }

  refresh(): void {
    for (const p of this.items) p.obj.visible = !this.svc.progress.has(p.id);
  }
}
