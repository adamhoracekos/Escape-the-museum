import * as THREE from 'three';
import { HUNTER } from '../config';

/** The shared enemy state machine from GDD 7.1. */
export type HunterState = 'patrol' | 'suspicious' | 'chase' | 'search' | 'return';

export interface SpotRef {
  id: string;
  /** Where a hunter stands to check it. */
  stand: THREE.Vector3;
  /** What it looks at while it checks. */
  look: THREE.Vector3;
}

/** What the body tells the brain each frame. */
export interface Senses {
  /** In the flashlight beam: the hunter does not move and does not think (GDD 7.2). */
  lit: boolean;
  /** The player is in the view cone, in line of sight, and not hidden. */
  sees: boolean;
  distance: number;
  playerPos: THREE.Vector3;
  /** Where a noise loud enough to reach the hunter came from, if one did this frame. */
  heard: THREE.Vector3 | null;
  /** The body has reached the current goal (or cannot get closer). */
  atGoal: boolean;
  /** The player's hiding place, when the hunter has a reason to open it: it saw them get in, or they stayed too long. */
  exposedSpot: SpotRef | null;
  /** True when it saw them get in; false when they simply stayed too long and it is only coming to look. */
  exposedSeen: boolean;
}

export interface Orders {
  goal: THREE.Vector3 | null;
  speed: number;
  lookAt: THREE.Vector3 | null;
  /** Standing at the player's hiding place: open it. */
  open: string | null;
  frozen: boolean;
}

export interface BrainWorld {
  route: THREE.Vector3[];
  spots: SpotRef[];
  /** A random reachable point near `centre`, for searching. */
  randomPoint(centre: THREE.Vector3, radius: number): THREE.Vector3 | null;
}

/**
 * Patrol, suspicion, chase, search, return. Pure decision making: the body (Hunter) supplies the senses and
 * walks wherever the orders say, so the whole machine runs in unit tests without a scene.
 */
export class HunterBrain {
  state: HunterState = 'patrol';
  onChange: (from: HunterState, to: HunterState) => void = () => {};

  private wp = 0;
  private pause = 0;
  private timer = 0;
  private confirm = 0;
  private unseen = 0;
  private point = new THREE.Vector3();
  private lastKnown = new THREE.Vector3();
  private searchCentre = new THREE.Vector3();
  private searchGoal: THREE.Vector3 | null = null;
  private searchLook: THREE.Vector3 | null = null;
  private inspected = new Set<string>();
  private opening: SpotRef | null = null;
  private last: Orders = { goal: null, speed: 0, lookAt: null, open: null, frozen: false };
  /** Where the previous orders sent the body: `atGoal` only means something for that goal. */
  private lastGoal: THREE.Vector3 | null = null;
  private senses!: Senses;

  constructor(private world: BrainWorld) {}

  reset(): void {
    this.state = 'patrol';
    this.wp = 0;
    this.pause = 0;
    this.timer = 0;
    this.confirm = 0;
    this.opening = null;
  }

  /** Seconds left in the current search, for the debug panel. */
  get searchLeft(): number {
    return this.state === 'search' ? Math.max(0, HUNTER.searchTime - this.timer) : 0;
  }

  private go(to: HunterState): void {
    if (to === this.state) return;
    const from = this.state;
    this.state = to;
    this.timer = 0;
    this.pause = 0;
    this.confirm = 0;
    this.unseen = 0;
    if (to === 'search') {
      this.searchGoal = null;
      this.inspected.clear();
    }
    if (to === 'return') this.wp = this.nearestWaypoint();
    this.onChange(from, to);
  }

  private nearestWaypoint(): number {
    let best = 0;
    let bestD = Infinity;
    this.world.route.forEach((p, i) => {
      const d = p.distanceToSquared(this.searchCentre);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }

  private startChase(at: THREE.Vector3): void {
    this.lastKnown.copy(at);
    this.go('chase');
  }

  private startSearch(centre: THREE.Vector3): void {
    this.searchCentre.copy(centre);
    this.go('search');
  }

  /** Seeing the player from patrol, suspicion or search. True when it turned into a chase. */
  private noticeBySight(s: Senses, dt: number): boolean {
    if (!s.sees) {
      this.confirm = Math.max(0, this.confirm - dt * 0.5);
      return false;
    }
    if (s.distance < HUNTER.closeSight) {
      this.startChase(s.playerPos);
      return true;
    }
    this.confirm += dt;
    if (this.confirm >= HUNTER.confirmTime) {
      this.startChase(s.playerPos);
      return true;
    }
    return false;
  }

  private suspect(at: THREE.Vector3): void {
    this.point.copy(at);
    if (this.state !== 'suspicious') {
      const keep = this.confirm;
      this.go('suspicious');
      this.confirm = keep;
    }
  }

  update(dt: number, s: Senses): Orders {
    if (s.lit) {
      this.last = { ...this.last, frozen: true, speed: 0 };
      return this.last;
    }
    this.timer += dt;
    this.senses = s;

    // A hiding place it has reason to open overrides whatever it was doing.
    if (s.exposedSpot && this.opening?.id !== s.exposedSpot.id) {
      this.opening = s.exposedSpot;
      if (this.state !== 'chase') this.startChase(s.exposedSpot.stand);
    }
    if (!s.exposedSpot) this.opening = null;

    switch (this.state) {
      case 'patrol':
      case 'return':
        return this.patrol(dt, s);
      case 'suspicious':
        return this.suspicious(dt, s);
      case 'chase':
        return this.chase(dt, s);
      case 'search':
        return this.search(dt, s);
    }
  }

  /** Has the body reached `goal`? The body reports arrival at the last goal it was given, so a fresh goal is never reached yet. */
  private at(goal: THREE.Vector3 | null): boolean {
    return !!goal && !!this.lastGoal && this.senses.atGoal && this.lastGoal.distanceToSquared(goal) < 0.0625;
  }

  private orders(goal: THREE.Vector3 | null, speed: number, lookAt: THREE.Vector3 | null, open: string | null = null): Orders {
    this.lastGoal = goal ? (this.lastGoal ?? new THREE.Vector3()).copy(goal) : null;
    this.last = { goal, speed, lookAt, open, frozen: false };
    return this.last;
  }

  private patrol(dt: number, s: Senses): Orders {
    if (this.noticeBySight(s, dt)) return this.chase(0, s);
    if (s.sees) {
      this.suspect(s.playerPos);
      return this.suspicious(0, s);
    }
    if (s.heard) {
      this.suspect(s.heard);
      return this.suspicious(0, s);
    }
    const route = this.world.route;
    if (!route.length) return this.orders(null, 0, null);
    if (this.at(route[this.wp])) {
      if (this.state === 'return') this.go('patrol');
      // A short stop at every waypoint: it is easier to slip past, and it looks like someone is posing it.
      this.pause += dt;
      if (this.pause > 0.9) {
        this.pause = 0;
        this.wp = (this.wp + 1) % route.length;
      } else return this.orders(route[this.wp], 0, null);
    }
    return this.orders(route[this.wp], HUNTER.patrolSpeed, null);
  }

  private suspicious(dt: number, s: Senses): Orders {
    if (this.noticeBySight(s, dt)) return this.chase(0, s);
    if (s.heard) this.point.copy(s.heard);
    else if (s.sees) this.point.copy(s.playerPos);
    // First it stops and turns its head, then it walks over to look.
    if (this.timer < HUNTER.suspicionTime) return this.orders(null, 0, this.point);
    if (this.at(this.point)) {
      this.startSearch(this.point);
      return this.search(0, s);
    }
    return this.orders(this.point, HUNTER.patrolSpeed, this.point);
  }

  private chase(dt: number, s: Senses): Orders {
    if (this.opening) {
      if (this.at(this.opening.stand)) return this.orders(this.opening.stand, 0, this.opening.look, this.opening.id);
      return this.orders(this.opening.stand, s.exposedSeen ? HUNTER.chaseSpeed : HUNTER.searchSpeed, null);
    }
    if (s.sees) {
      this.lastKnown.copy(s.playerPos);
      this.unseen = 0;
    } else {
      this.unseen += dt;
      // Running is loud: it follows the sound as well as the sight.
      if (s.heard) this.lastKnown.copy(s.heard);
    }
    const lost = this.unseen > HUNTER.loseTime && (this.at(this.lastKnown) || this.unseen > HUNTER.loseTime * 3);
    if (lost) {
      this.startSearch(this.lastKnown);
      return this.search(0, s);
    }
    return this.orders(this.lastKnown, HUNTER.chaseSpeed, null);
  }

  private search(dt: number, s: Senses): Orders {
    if (this.noticeBySight(s, dt)) return this.chase(0, s);
    if (s.heard) {
      // A sound moves the search but does not reset its clock.
      this.searchCentre.copy(s.heard);
      this.searchGoal = s.heard.clone();
      this.searchLook = null;
      this.pause = 0;
    }
    if (this.timer > HUNTER.searchTime) {
      this.go('return');
      return this.patrol(0, s);
    }
    if (!this.searchGoal) this.pickSearchGoal();
    if (this.at(this.searchGoal)) {
      this.pause += dt;
      const wait = this.searchLook ? HUNTER.inspectTime : 1.0;
      if (this.pause < wait) return this.orders(this.searchGoal, 0, this.searchLook);
      this.pause = 0;
      this.pickSearchGoal();
    }
    return this.orders(this.searchGoal, HUNTER.searchSpeed, this.searchLook);
  }

  /** Nearby hiding places first, nearest first, then random points around where it lost you. */
  private pickSearchGoal(): void {
    const near = this.world.spots
      .filter((sp) => !this.inspected.has(sp.id) && sp.stand.distanceTo(this.searchCentre) < HUNTER.searchRadius)
      .sort((a, b) => a.stand.distanceTo(this.searchCentre) - b.stand.distanceTo(this.searchCentre));
    if (near.length) {
      this.inspected.add(near[0].id);
      this.searchGoal = near[0].stand;
      this.searchLook = near[0].look;
      return;
    }
    this.searchGoal = this.world.randomPoint(this.searchCentre, HUNTER.searchRadius) ?? this.searchCentre.clone();
    this.searchLook = null;
  }
}
