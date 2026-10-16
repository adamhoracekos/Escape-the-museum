import * as THREE from 'three';
import type { ExtendedTriangle } from 'three-mesh-bvh';
import { PLAYER } from '../config';
import type { Input } from '../core/Input';
import type { World } from '../world/World';
import { Stamina } from './Stamina';
import { noiseRadius, type MoveMode } from './noise';

const SUBSTEPS = 5;
const UP = new THREE.Vector3(0, 1, 0);

/**
 * First-person capsule controller. `position` is the point between the feet.
 * Collision follows the three-mesh-bvh character controller approach:
 * move, then push the capsule segment out of every triangle closer than the radius.
 */
export class Player {
  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  yaw = 0;
  pitch = 0;
  height: number = PLAYER.standHeight;
  onGround = false;
  crouching = false;
  mode: MoveMode = 'idle';
  noise = 0;
  readonly stamina = new Stamina();
  /** Set by the game when movement must stop (menus, caught sequence). */
  frozen = false;
  onFootstep: (mode: MoveMode) => void = () => {};

  private bobDistance = 0;
  private lastStepIndex = 0;
  private seg = new THREE.Line3();
  private box = new THREE.Box3();
  private triPoint = new THREE.Vector3();
  private capPoint = new THREE.Vector3();
  private tmp = new THREE.Vector3();
  private wish = new THREE.Vector3();

  constructor(private camera: THREE.PerspectiveCamera) {}

  teleport(pos: THREE.Vector3, yaw: number): void {
    this.position.copy(pos);
    this.velocity.set(0, 0, 0);
    this.yaw = yaw;
    this.pitch = 0;
    this.crouching = false;
    this.height = PLAYER.standHeight;
  }

  update(dt: number, input: Input, world: World): void {
    const look = input.consumeLook();
    if (!this.frozen) {
      this.yaw -= look.x;
      this.pitch = THREE.MathUtils.clamp(this.pitch - look.y, -1.45, 1.45);
    }

    // Crouch: hold Ctrl or C. Standing up is blocked under low ceilings.
    const wantsCrouch = !this.frozen && (input.isDown('ControlLeft') || input.isDown('ControlRight') || input.isDown('KeyC'));
    if (wantsCrouch) this.crouching = true;
    else if (this.crouching && !this.overlaps(world, this.position, PLAYER.standHeight)) this.crouching = false;
    const targetHeight = this.crouching ? PLAYER.crouchHeight : PLAYER.standHeight;
    this.height += (targetHeight - this.height) * (1 - Math.exp(-dt * 12));

    // Desired horizontal direction from WASD in camera yaw space.
    this.wish.set(0, 0, 0);
    if (!this.frozen) {
      if (input.isDown('KeyW') || input.isDown('ArrowUp')) this.wish.z -= 1;
      if (input.isDown('KeyS') || input.isDown('ArrowDown')) this.wish.z += 1;
      if (input.isDown('KeyA') || input.isDown('ArrowLeft')) this.wish.x -= 1;
      if (input.isDown('KeyD') || input.isDown('ArrowRight')) this.wish.x += 1;
    }
    const moving = this.wish.lengthSq() > 0;
    if (moving) this.wish.normalize().applyAxisAngle(UP, this.yaw);

    const wantsSprint = !this.frozen && !this.crouching && (input.isDown('ShiftLeft') || input.isDown('ShiftRight'));
    const sprinting = this.stamina.update(dt, wantsSprint, moving);
    const speed = this.crouching ? PLAYER.crouchSpeed : sprinting ? PLAYER.sprintSpeed : PLAYER.walkSpeed;

    const k = 1 - Math.exp(-dt * PLAYER.acceleration);
    this.velocity.x += (this.wish.x * speed - this.velocity.x) * k;
    this.velocity.z += (this.wish.z * speed - this.velocity.z) * k;

    const sdt = dt / SUBSTEPS;
    for (let i = 0; i < SUBSTEPS; i++) this.step(sdt, world);

    // Movement mode and noise come from what actually happened, not from the keys held.
    const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    this.mode = horizSpeed < 0.3 ? 'idle' : this.crouching ? 'crouch' : sprinting ? 'sprint' : 'walk';
    this.noise = noiseRadius(this.mode, world.surfaceAt(this.position));

    // Head bob and footstep events.
    let bob = 0;
    if (this.onGround && horizSpeed > 0.3) {
      this.bobDistance += horizSpeed * dt;
      const phase = this.bobDistance * PLAYER.stepBobFrequency * Math.PI;
      bob = Math.abs(Math.sin(phase)) * PLAYER.stepBobAmount * Math.min(1, horizSpeed / PLAYER.walkSpeed);
      const stepIndex = Math.floor(phase / Math.PI);
      if (stepIndex !== this.lastStepIndex) {
        this.lastStepIndex = stepIndex;
        this.onFootstep(this.mode);
      }
    }

    this.camera.position.set(this.position.x, this.position.y + this.height - PLAYER.eyeOffset - bob, this.position.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  private step(dt: number, world: World): void {
    this.velocity.y += PLAYER.gravity * dt;
    if (this.onGround && this.velocity.y < 0) this.velocity.y = Math.max(this.velocity.y, -2);
    const prev = this.tmp.copy(this.position);
    this.position.addScaledVector(this.velocity, dt);

    const r = PLAYER.radius;
    this.setSegment(this.position, this.height);
    this.pushOut(world, r);

    const newPos = this.capPoint.copy(this.seg.start).sub(new THREE.Vector3(0, r, 0));
    const delta = newPos.clone().sub(this.position);
    this.onGround = delta.y > Math.abs(dt * this.velocity.y * 0.25);
    this.position.copy(newPos);

    if (this.onGround) {
      this.velocity.y = 0;
    } else if (delta.lengthSq() > 1e-10) {
      delta.normalize();
      this.velocity.addScaledVector(delta, -delta.dot(this.velocity));
    }

    // Safety net: never fall out of the level.
    if (this.position.y < -20) this.position.copy(prev).setY(2);
  }

  private setSegment(feet: THREE.Vector3, height: number): void {
    const r = PLAYER.radius;
    this.seg.start.set(feet.x, feet.y + r, feet.z);
    this.seg.end.set(feet.x, feet.y + height - r, feet.z);
    this.box.makeEmpty();
    this.box.expandByPoint(this.seg.start).expandByPoint(this.seg.end);
    this.box.min.addScalar(-r);
    this.box.max.addScalar(r);
  }

  private pushOut(world: World, r: number): void {
    world.bvh.shapecast({
      intersectsBounds: (b) => b.intersectsBox(this.box),
      intersectsTriangle: (tri: ExtendedTriangle) => {
        const d = tri.closestPointToSegment(this.seg, this.triPoint, this.capPoint);
        if (d < r) {
          const depth = r - d;
          const dir = this.capPoint.sub(this.triPoint).normalize();
          this.seg.start.addScaledVector(dir, depth);
          this.seg.end.addScaledVector(dir, depth);
        }
        return false;
      },
    });
  }

  /** Would a capsule of this height at `feet` intersect the world? */
  overlaps(world: World, feet: THREE.Vector3, height: number): boolean {
    const r = PLAYER.radius * 0.95;
    this.setSegment(feet, height);
    let hit = false;
    world.bvh.shapecast({
      intersectsBounds: (b) => b.intersectsBox(this.box),
      intersectsTriangle: (tri: ExtendedTriangle) => {
        // Ignore the floor under the feet: only test the part of the capsule above knee height.
        const seg = new THREE.Line3(this.seg.start.clone().setY(this.seg.start.y + 0.25), this.seg.end);
        if (tri.closestPointToSegment(seg, this.triPoint, this.capPoint) < r) hit = true;
        return hit;
      },
    });
    return hit;
  }
}
