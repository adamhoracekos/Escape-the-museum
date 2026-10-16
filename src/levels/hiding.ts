import * as THREE from 'three';
import type { Interactable } from '../interaction/types';
import { MAT, box } from '../world/props';
import type { HidingSpot, LevelServices } from './Level';

export interface Cabinet {
  group: THREE.Group;
  spot: HidingSpot;
  interactable: Interactable;
  update(dt: number): void;
}

const W = 1.1;
const D = 0.75;
const H = 2.15;
const brass = new THREE.MeshPhongMaterial({ color: 0xc9962a, shininess: 110, specular: 0xffeeaa });
const slitGlass = new THREE.MeshPhongMaterial({ color: 0x0b0d10, shininess: 140, specular: 0x8899aa });

/**
 * A tall storage cabinet with two doors and a narrow glass slit at eye height: a hiding place (GDD 5).
 * `facing` is the direction the doors open towards, in the same angle convention as the rest of the game
 * (forward = (sin a, 0, cos a)). The body is solid; the doors are decorative and swing.
 */
export function cabinet(id: string, x: number, z: number, facing: number, svc: LevelServices, label = 'Visitor, hiding'): Cabinet {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = facing;
  const t = 0.05;
  group.add(box(W, H, t, MAT.darkWood, 0, H / 2, -D / 2 + t / 2));
  group.add(box(t, H, D, MAT.darkWood, -W / 2 + t / 2, H / 2, 0));
  group.add(box(t, H, D, MAT.darkWood, W / 2 - t / 2, H / 2, 0));
  group.add(box(W + 0.08, 0.08, D + 0.06, MAT.wood, 0, H + 0.04, 0));
  group.add(box(W + 0.04, 0.12, D + 0.02, MAT.wood, 0, 0.06, 0));

  // Doors pivot on the outer edges and are kept out of the merge so they can swing.
  const doors: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const hinge = new THREE.Group();
    hinge.position.set(side * (W / 2), 0, D / 2);
    hinge.userData.dynamic = true;
    const leaf = box(W / 2 - 0.01, H - 0.16, 0.04, MAT.wood, -side * (W / 4), H / 2, 0);
    leaf.userData.noCollide = true;
    const slit = new THREE.Mesh(new THREE.PlaneGeometry(W / 2 - 0.14, 0.07), slitGlass);
    slit.position.set(-side * (W / 4), 1.52, 0.022);
    slit.userData.noCollide = true;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), brass);
    knob.position.set(-side * (W / 2 - 0.07), 1.05, 0.04);
    knob.userData.noCollide = true;
    hinge.add(leaf, slit, knob);
    group.add(hinge);
    doors.push(hinge);
  }
  // Invisible front so the closed cabinet is solid to walk into; doors themselves never collide.
  const front = box(W, H, 0.04, MAT.wood, 0, H / 2, D / 2);
  front.visible = false;
  group.add(front);

  group.updateMatrixWorld(true);
  const local = (lx: number, ly: number, lz: number) => new THREE.Vector3(lx, ly, lz).applyMatrix4(group.matrixWorld);
  // Camera forward is (-sin yaw, 0, -cos yaw), so looking out of the doors means yaw = facing + pi.
  const camYaw = facing + Math.PI;
  let openFor = 0;
  let k = 0;
  let occupied = false;

  const spot: HidingSpot = {
    id,
    eye: local(0, 1.52, 0.02),
    yaw: camYaw,
    exit: { position: local(0, 0, D / 2 + 0.75), yaw: camYaw },
    stand: local(0, 0, D / 2 + 0.85),
    look: local(0, 1.5, 0),
    label,
    setOpen(open) {
      openFor = open ? 1.1 : 0;
    },
    setOccupied(inside) {
      occupied = inside;
    },
  };

  const interactable: Interactable = {
    id: `${id}-hide`,
    object: group,
    prompt: () => (svc.player.hidingIn ? null : 'Hide in the cabinet'),
    interact: () => svc.hide(spot),
  };

  return {
    group,
    spot,
    interactable,
    update(dt) {
      openFor = Math.max(0, openFor - dt);
      const target = openFor > 0 ? 1 : 0;
      k += (target - k) * Math.min(1, dt * 9);
      doors[0].rotation.y = -k * 1.7;
      doors[1].rotation.y = k * 1.7;
      // From inside, the inner face of a shut door would fill the screen; the HUD draws the slit instead.
      for (const d of doors) d.visible = !(occupied && k < 0.05);
    },
  };
}
