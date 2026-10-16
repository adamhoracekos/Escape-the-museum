import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { HUNTER } from '../src/config';
import { HunterBrain, type Senses, type SpotRef } from '../src/enemy/HunterBrain';
import { NavGrid } from '../src/enemy/NavGrid';
import { World } from '../src/world/World';

const v = (x: number, z: number) => new THREE.Vector3(x, 0, z);

function senses(over: Partial<Senses> = {}): Senses {
  return { lit: false, sees: false, distance: 10, playerPos: v(5, 5), heard: null, atGoal: false, exposedSpot: null, exposedSeen: false, ...over };
}

function brain(spots: SpotRef[] = []): HunterBrain {
  return new HunterBrain({ route: [v(0, 0), v(10, 0)], spots, randomPoint: (c) => c.clone().add(v(1, 0)) });
}

/** Runs the brain for `seconds` at 60 fps with the same senses. */
function run(b: HunterBrain, seconds: number, s: Partial<Senses> = {}) {
  let o = b.update(1 / 60, senses(s));
  for (let t = 1 / 60; t < seconds; t += 1 / 60) o = b.update(1 / 60, senses(s));
  return o;
}

describe('HunterBrain', () => {
  it('walks its route on patrol', () => {
    const b = brain();
    const o = run(b, 0.1);
    expect(b.state).toBe('patrol');
    expect(o.goal?.x).toBe(0);
    expect(o.speed).toBe(HUNTER.patrolSpeed);
  });

  it('turns a noise into suspicion: first it stops and looks, then it walks over', () => {
    const b = brain();
    const o = b.update(1 / 60, senses({ heard: v(4, 4) }));
    expect(b.state).toBe('suspicious');
    expect(o.speed).toBe(0);
    expect(o.lookAt?.x).toBe(4);
    const later = run(b, HUNTER.suspicionTime + 0.1);
    expect(later.goal?.x).toBe(4);
    expect(later.speed).toBe(HUNTER.patrolSpeed);
  });

  it('needs a moment of sight before a chase from afar, none up close', () => {
    const far = brain();
    far.update(1 / 60, senses({ sees: true, distance: 10 }));
    expect(far.state).toBe('suspicious');
    run(far, HUNTER.confirmTime + 0.05, { sees: true, distance: 10 });
    expect(far.state).toBe('chase');

    const near = brain();
    near.update(1 / 60, senses({ sees: true, distance: 2 }));
    expect(near.state).toBe('chase');
  });

  it('chases at chase speed towards where it last saw you', () => {
    const b = brain();
    b.update(1 / 60, senses({ sees: true, distance: 2, playerPos: v(3, 1) }));
    const o = b.update(1 / 60, senses({ sees: false, playerPos: v(9, 9) }));
    expect(o.speed).toBe(HUNTER.chaseSpeed);
    expect(o.goal?.x).toBe(3);
    expect(o.goal?.z).toBe(1);
  });

  it('loses you, searches for 20 s, then returns to its route and patrols again', () => {
    const b = brain();
    b.update(1 / 60, senses({ sees: true, distance: 2, playerPos: v(3, 1) }));
    run(b, HUNTER.loseTime + 0.1, { atGoal: true });
    expect(b.state).toBe('search');
    run(b, HUNTER.searchTime - 1, { atGoal: false });
    expect(b.state).toBe('search');
    run(b, 1.5, { atGoal: false });
    expect(b.state).toBe('return');
    run(b, 0.1, { atGoal: true });
    expect(b.state).toBe('patrol');
  });

  it('does nothing at all while lit: no movement and no clock', () => {
    const b = brain();
    b.update(1 / 60, senses({ heard: v(4, 4) }));
    const o = run(b, 10, { lit: true });
    expect(o.frozen).toBe(true);
    expect(o.speed).toBe(0);
    expect(b.state).toBe('suspicious');
    // The suspicion clock did not run under the light: it still stands and looks.
    expect(b.update(1 / 60, senses()).speed).toBe(0);
  });

  it('checks nearby hiding places while searching, without opening them', () => {
    const spot: SpotRef = { id: 'cab', stand: v(4, 1), look: v(4, 0) };
    const b = brain([spot]);
    b.update(1 / 60, senses({ sees: true, distance: 2, playerPos: v(3, 1) }));
    run(b, HUNTER.loseTime + 0.1, { atGoal: true });
    const o = b.update(1 / 60, senses());
    expect(b.state).toBe('search');
    expect(o.goal).toBe(spot.stand);
    const at = run(b, 1, { atGoal: true });
    expect(at.lookAt).toBe(spot.look);
    expect(at.open).toBeNull();
  });

  it('opens the hiding place it saw you get into', () => {
    const spot: SpotRef = { id: 'cab', stand: v(4, 1), look: v(4, 0) };
    const b = brain([spot]);
    const go = b.update(1 / 60, senses({ exposedSpot: spot, exposedSeen: true }));
    expect(b.state).toBe('chase');
    expect(go.goal).toBe(spot.stand);
    expect(go.speed).toBe(HUNTER.chaseSpeed);
    const at = b.update(1 / 60, senses({ exposedSpot: spot, exposedSeen: true, atGoal: true }));
    expect(at.open).toBe('cab');
  });

  it('does not open a cabinet from across the room on the frame it decides to', () => {
    const spot: SpotRef = { id: 'cab', stand: v(4, 1), look: v(4, 0) };
    const b = brain([spot]);
    run(b, 0.5, { atGoal: true }); // pausing at a waypoint, so the body reports arrival
    const o = b.update(1 / 60, senses({ exposedSpot: spot, exposedSeen: false, atGoal: true }));
    expect(o.open).toBeNull();
    expect(o.goal).toBe(spot.stand);
  });

  it('comes to check a hiding place you stayed in too long, at walking pace', () => {
    const spot: SpotRef = { id: 'cab', stand: v(4, 1), look: v(4, 0) };
    const b = brain([spot]);
    const go = b.update(1 / 60, senses({ exposedSpot: spot, exposedSeen: false }));
    expect(go.speed).toBe(HUNTER.searchSpeed);
  });
});

describe('NavGrid', () => {
  // A 10 x 10 m floor with a wall across the middle and a 1.2 m gap at one end.
  function room(): World {
    const mat = new THREE.MeshBasicMaterial();
    const floor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.2, 10), mat);
    floor.position.set(5, -0.1, 5);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3, 8.8), mat);
    wall.position.set(5, 1.5, 4.4);
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
    crate.position.set(2, 0.5, 2);
    const scene = new THREE.Group();
    scene.add(floor, wall, crate);
    return new World([scene]);
  }

  it('blocks walls, and keeps a crate top as an island nobody can walk onto', () => {
    const nav = new NavGrid(room(), { minX: 0, maxX: 10, minZ: 0, maxZ: 10, probeY: 2.5 });
    expect(Number.isNaN(nav.heightAt(5, 3))).toBe(true);
    expect(nav.heightAt(8, 3)).toBeCloseTo(0, 3);
    expect(nav.heightAt(2, 2)).toBeCloseTo(1, 3);
    expect(nav.componentAt(2, 2)).not.toBe(nav.componentAt(8, 3));
    // Asked to go onto the crate, it stops at the nearest floor beside it.
    const path = nav.findPath(v(8, 3), v(2, 2))!;
    expect(path[path.length - 1].y).toBeCloseTo(0, 3);
  });

  it('finds a way around the wall through the gap, and every leg is straight-walkable', () => {
    const nav = new NavGrid(room(), { minX: 0, maxX: 10, minZ: 0, maxZ: 10, probeY: 2.5 });
    const path = nav.findPath(v(2.5, 5), v(7.5, 5))!;
    expect(path).not.toBeNull();
    expect(path.some((p) => p.z > 8.8)).toBe(true);
    let from = v(2.5, 5);
    for (const p of path) {
      expect(nav.lineClear(from.x, from.z, p.x, p.z)).toBe(true);
      from = p;
    }
    expect(path[path.length - 1].distanceTo(v(7.5, 5))).toBeLessThan(0.01);
    expect(nav.lineClear(2.5, 5, 7.5, 5)).toBe(false);
  });
});
