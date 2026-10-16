import * as THREE from 'three';
import { FLASHLIGHT } from '../config';
import { Battery } from './Battery';

/** The player's only tool. A shadow-casting spot light attached to the camera. */
export class Flashlight {
  readonly battery = new Battery();
  on = true;
  readonly light: THREE.SpotLight;
  private spill: THREE.PointLight;

  constructor(camera: THREE.Camera) {
    this.light = new THREE.SpotLight(0xfff1d6, FLASHLIGHT.intensity, FLASHLIGHT.distance, FLASHLIGHT.angle, FLASHLIGHT.penumbra, 1.4);
    this.light.position.set(0.18, -0.16, 0.05);
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(1024, 1024);
    this.light.shadow.bias = -0.0005;
    this.light.shadow.normalBias = 0.02;
    this.light.shadow.camera.near = 0.2;
    this.light.target.position.set(0, -0.05, -1);
    camera.add(this.light, this.light.target);

    // Faint bounce so the area right in front of the player is not pitch black.
    this.spill = new THREE.PointLight(0xffe7c4, 0.35, 3.5, 2);
    camera.add(this.spill);
  }

  toggle(): void {
    this.on = !this.on;
  }

  update(dt: number, t: number): void {
    this.battery.drain(dt, this.on);
    const out = this.on ? this.battery.output(t) : 0;
    this.light.intensity = FLASHLIGHT.intensity * out;
    this.spill.intensity = 0.35 * out;
    this.light.visible = out > 0;
  }

  /** Is the world point inside the lit cone and within range? Enemies use this later. */
  illuminates(point: THREE.Vector3): boolean {
    if (!this.light.visible || this.light.intensity <= 0.01) return false;
    const origin = this.light.getWorldPosition(new THREE.Vector3());
    const target = this.light.target.getWorldPosition(new THREE.Vector3());
    const axis = target.sub(origin).normalize();
    const to = point.clone().sub(origin);
    const dist = to.length();
    if (dist > FLASHLIGHT.distance) return false;
    return axis.angleTo(to.normalize()) < FLASHLIGHT.angle;
  }
}
