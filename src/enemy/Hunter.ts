import * as THREE from 'three';
import { HIDING, HUNTER } from '../config';
import type { HidingSpot, LevelServices } from '../levels/Level';
import type { World } from '../world/World';
import { HunterBrain, type HunterState, type Orders, type SpotRef } from './HunterBrain';
import { ALERT, IDLE, RUN, WALK, createHunterRig, type HunterRig, type Pose } from './hunterMesh';
import type { NavGrid } from './NavGrid';

export interface HunterOptions {
  id: string;
  start: THREE.Vector3;
  route: THREE.Vector3[];
  spots: HidingSpot[];
  seed?: number;
}

const EYE = 1.72;
const COS_HALF_VIEW = Math.cos(THREE.MathUtils.degToRad(HUNTER.viewAngle / 2));

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * An Ice Age hunter: the body around a HunterBrain. It senses the player, walks the nav grid,
 * and is drawn as a puppet that jumps between poses 8 to 12 times a second (GDD 7.1).
 * The one rule (GDD 7.2): while the flashlight is on it, it does not move at all.
 */
export class Hunter {
  readonly rig: HunterRig;
  readonly brain: HunterBrain;
  /** Where the hunter really is. The drawn figure only catches up at each puppet tick. */
  readonly position = new THREE.Vector3();
  heading = 0;
  frozen = false;
  /** Seconds since it last saw the player. */
  sinceSeen = Infinity;

  private rng: () => number;
  private path: THREE.Vector3[] = [];
  private pathGoal: THREE.Vector3 | null = null;
  private replan = 0;
  private atGoal = false;
  private tick = 0;
  private hold = 0;
  private frame = 0;
  private stepDistance = 0;
  private headYaw = 0;
  private hidingWatched: string | null = null;
  private seenEntering = false;
  private component: number;
  private spotRefs: SpotRef[];

  constructor(
    private opts: HunterOptions,
    private world: World,
    private nav: NavGrid,
    private svc: LevelServices,
  ) {
    this.rng = mulberry32(opts.seed ?? 7);
    this.rig = createHunterRig();
    this.spotRefs = opts.spots.map((s) => ({ id: s.id, stand: s.stand, look: s.look }));
    this.component = nav.componentAt(opts.start.x, opts.start.z);
    this.brain = new HunterBrain({
      route: opts.route,
      spots: this.spotRefs,
      randomPoint: (c, r) => nav.randomPoint(c, r, this.rng, this.component),
    });
    this.brain.onChange = (from, to) => this.announce(from, to);
    this.reset();
  }

  get state(): HunterState {
    return this.brain.state;
  }

  reset(): void {
    this.position.copy(this.opts.start);
    this.heading = 0;
    this.path = [];
    this.pathGoal = null;
    this.brain.reset();
    this.sinceSeen = Infinity;
    this.hidingWatched = null;
    this.seenEntering = false;
    this.frozen = false;
    this.syncFigure(IDLE[0]);
  }

  /** Every state change is heard and seen (GDD 7.1). */
  private announce(from: HunterState, to: HunterState): void {
    const at = this.position.clone().setY(EYE);
    if (to === 'suspicious') this.svc.sfx.cue('suspicion', at);
    else if (to === 'chase') this.svc.sfx.cue('chase', at);
    else if (to === 'search' && from === 'chase') this.svc.sfx.cue('lost', at);
    else if (to === 'return') this.svc.sfx.cue('calm');
  }

  private eye(): THREE.Vector3 {
    return new THREE.Vector3(this.position.x, this.position.y + EYE, this.position.z);
  }

  /** In the cone, in range, nothing solid in between, and not hidden. */
  private seesPlayer(): boolean {
    const p = this.svc.player;
    if (p.hidingIn) return false;
    const eye = this.eye();
    const to = p.eye.clone().sub(eye);
    const dist = to.length();
    if (dist > HUNTER.viewDistance) return false;
    const flat = new THREE.Vector3(to.x, 0, to.z).normalize();
    const facing = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    // Right next to it, the cone does not matter: it can feel you there.
    if (dist > 1.6 && flat.dot(facing) < COS_HALF_VIEW) return false;
    return this.world.rayDistance(eye, to.normalize(), dist) >= dist - 0.25;
  }

  private isLit(): boolean {
    const v = new THREE.Vector3();
    for (const probe of this.rig.probes) {
      probe.getWorldPosition(v);
      if (this.svc.player.lights(v)) return true;
    }
    return false;
  }

  update(dt: number): void {
    const p = this.svc.player;
    this.rig.root.updateMatrixWorld(true);
    this.frozen = this.isLit();
    const sees = !this.frozen && this.seesPlayer();
    this.sinceSeen = sees ? 0 : this.sinceSeen + dt;

    // Hiding: did it see them get in? Remember that for as long as they stay in.
    if (p.hidingIn !== this.hidingWatched) {
      this.hidingWatched = p.hidingIn;
      this.seenEntering = !!p.hidingIn && this.sinceSeen < HIDING.seenWindow + HIDING.enterTime;
    }
    const spot = p.hidingIn ? this.spotRefs.find((s) => s.id === p.hidingIn) ?? null : null;
    const overdue = p.hideSeconds > HIDING.maxTime;
    const exposed = spot && (this.seenEntering || overdue) ? spot : null;

    const flatDist = Math.hypot(p.feet.x - this.position.x, p.feet.z - this.position.z);
    const heard = !this.frozen && p.noise > 0 && flatDist <= p.noise ? p.feet.clone() : null;

    const orders = this.brain.update(dt, {
      lit: this.frozen,
      sees,
      distance: flatDist,
      playerPos: p.feet,
      heard,
      atGoal: this.atGoal,
      exposedSpot: exposed,
      exposedSeen: this.seenEntering,
    });

    if (!this.frozen) {
      this.move(dt, orders);
      const target = orders.open ? this.opts.spots.find((s) => s.id === orders.open) : undefined;
      if (target && p.hidingIn === target.id && Math.hypot(target.stand.x - this.position.x, target.stand.z - this.position.z) < 1.2) {
        target.setOpen(true);
        this.svc.sfx.cue('open');
        this.svc.catchPlayer();
      } else if (!p.hidingIn && flatDist < HUNTER.catchDistance && Math.abs(p.feet.y - this.position.y) < 1.2) {
        this.svc.catchPlayer();
      }
    }
    this.animate(dt, orders);
  }

  private move(dt: number, o: Orders): void {
    if (!o.goal || o.speed <= 0) {
      // Standing still at a goal (a pause on patrol, a look at a cabinet) still counts as being there.
      this.atGoal = !!o.goal && Math.hypot(o.goal.x - this.position.x, o.goal.z - this.position.z) < 0.6;
      if (o.lookAt) this.turnTowards(o.lookAt, dt, 5);
      return;
    }
    this.replan -= dt;
    const goalMoved = !this.pathGoal || this.pathGoal.distanceToSquared(o.goal) > 0.25;
    if (goalMoved || this.replan <= 0) {
      this.planTo(o.goal);
      this.replan = this.brain.state === 'chase' ? 0.25 : 1.0;
    }
    let budget = o.speed * dt;
    while (budget > 0 && this.path.length) {
      const next = this.path[0];
      const dx = next.x - this.position.x;
      const dz = next.z - this.position.z;
      const d = Math.hypot(dx, dz);
      if (d <= budget) {
        this.position.x = next.x;
        this.position.z = next.z;
        budget -= d;
        this.path.shift();
        continue;
      }
      this.position.x += (dx / d) * budget;
      this.position.z += (dz / d) * budget;
      this.turnTowards(next, dt, o.speed > HUNTER.searchSpeed ? 10 : 6);
      this.stepDistance += budget;
      budget = 0;
    }
    const y = this.nav.heightAt(this.position.x, this.position.z);
    if (!Number.isNaN(y)) this.position.y = y;
    this.atGoal = this.path.length === 0;
  }

  private planTo(goal: THREE.Vector3): void {
    this.pathGoal = goal.clone();
    if (this.nav.componentAt(goal.x, goal.z) === this.component && this.nav.lineClear(this.position.x, this.position.z, goal.x, goal.z)) {
      this.path = [goal.clone()];
      return;
    }
    // Unreachable goals (the player on a crate) end at the nearest point it can stand on.
    this.path = this.nav.findPath(this.position, goal) ?? [];
  }

  private turnTowards(p: THREE.Vector3, dt: number, rate: number): void {
    const want = Math.atan2(p.x - this.position.x, p.z - this.position.z);
    let d = want - this.heading;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.heading += d * Math.min(1, dt * rate);
  }

  /** Puppet motion: the figure jumps to the real position and a new pose 8 to 12 times a second. */
  private animate(dt: number, o: Orders): void {
    if (this.frozen) return;
    if (this.hold > 0) {
      this.hold -= dt;
      return;
    }
    this.tick -= dt;
    if (this.tick > 0) return;
    this.tick = 1 / THREE.MathUtils.lerp(HUNTER.poseRateMin, HUNTER.poseRateMax, this.rng());
    if (o.speed > 0 && this.rng() < HUNTER.holdChance) this.hold = HUNTER.holdTime * (0.6 + this.rng() * 0.8);

    let set: Pose[];
    if (o.speed >= HUNTER.chaseSpeed) set = RUN;
    else if (o.speed > 0) set = WALK;
    else if (this.state === 'suspicious' || o.lookAt) set = ALERT;
    else set = IDLE;
    this.frame = (this.frame + 1) % set.length;

    // Head turns to what it is looking at, within what a neck allows.
    if (o.lookAt) {
      const want = Math.atan2(o.lookAt.x - this.position.x, o.lookAt.z - this.position.z) - this.heading;
      this.headYaw = THREE.MathUtils.clamp(Math.atan2(Math.sin(want), Math.cos(want)), -1.2, 1.2);
    } else this.headYaw *= 0.4;

    const before = this.rig.root.position.clone();
    this.syncFigure(set[this.frame % set.length]);
    const moved = before.distanceTo(this.rig.root.position);
    if (moved > 0.05 && (set === WALK || set === RUN) && this.frame % 2 === 0) {
      this.svc.sfx.step(this.rig.root.position, set === RUN);
    }
  }

  private syncFigure(pose: Pose): void {
    this.rig.root.position.copy(this.position);
    this.rig.root.rotation.y = this.heading;
    this.rig.apply(pose, this.headYaw);
  }
}
