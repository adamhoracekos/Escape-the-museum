import * as THREE from 'three';
import { Sfx } from '../audio/Sfx';
import { HIDING, PLAYER, TRANSITION } from '../config';
import { DebugPanel } from '../debug/DebugPanel';
import { LookTargets } from '../interaction/LookTargets';
import type { Exhibit } from '../interaction/types';
import type { Checkpoint, HidingSpot, Level, LevelServices, PlayerView, TitleCard } from '../levels/Level';
import { FIRST_LEVEL, LEVELS } from '../levels/registry';
import { Flashlight } from '../player/Flashlight';
import { Player } from '../player/Player';
import { Progress } from '../progress/Progress';
import { SaveSystem } from '../save/SaveSystem';
import { Hud } from '../ui/Hud';
import { Menu } from '../ui/Menu';
import { Input } from './Input';

type State = 'title' | 'playing' | 'paused' | 'caught' | 'ending' | 'end';

interface Transition {
  phase: 'out' | 'hold' | 'in';
  t: number;
  to: string;
  spawn: string;
  card: TitleCard | null;
}

const CAUGHT_SECONDS = 3;
/** The museum clock starts at closing time and runs while you play. */
const CLOCK_START_MINUTES = 23 * 60;
/** Ending beats in seconds: lights die, labels come on one by one, the last one, black. */
const ENDING = { lightsStart: 1.5, lightsEnd: 6, labelsStart: 6.5, labelEvery: 0.35, visitorAt: 11, fadeAt: 16, cardAt: 18 } as const;

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private input: Input;
  private player: Player;
  private flashlight: Flashlight;
  private look = new LookTargets();
  private hud: Hud;
  private menu: Menu;
  private debug: DebugPanel;
  private saves = new SaveSystem();
  private progress = new Progress();
  private levels = new Map<string, Level>();
  private level!: Level;
  private state: State = 'title';
  private checkpoint!: Checkpoint;
  private transition: Transition | null = null;
  private caughtTimer = 0;
  private endingTime = 0;
  private visitorLabel: Exhibit;
  private playSeconds = 0;
  private clock = new THREE.Clock();
  private elapsed = 0;
  private svc: LevelServices;
  private sfx = new Sfx();
  private hiding: { spot: HidingSpot; seconds: number; flashWasOn: boolean } | null = null;

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(PLAYER.fov, 1, 0.05, 140);
    this.scene.add(this.camera);
    this.input = new Input(this.renderer.domElement);
    this.player = new Player(this.camera);
    this.flashlight = new Flashlight(this.camera);
    this.hud = new Hud(container);
    this.debug = new DebugPanel(container, this.scene);
    this.menu = new Menu(container, {
      onContinue: () => this.start(true),
      onNewGame: () => this.start(false),
      onHunterTest: () => this.start(false, 'test-room'),
      onResume: () => this.resume(),
      onBackToTitle: () => this.backToTitle(),
    });

    this.input.onLockChange = (locked) => {
      if (!locked && !this.input.dragLook && this.state === 'playing') this.pause();
    };

    const anchor = new THREE.Vector3();
    this.visitorLabel = { object: this.camera, anchor, fig: 'Fig. 1', text: () => 'Visitor. Collection incomplete.', warn: () => true };
    this.svc = this.services();
    this.activate(FIRST_LEVEL);
    this.hud.setVisible(false);
    this.menu.showTitle(this.saves.load() !== null, this.saves.available);

    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  // ----- level and progress -------------------------------------------------

  private services(): LevelServices {
    return {
      progress: this.progress,
      collectFragment: (id) => {
        this.progress.add(id);
        this.hud.toast('Fragment recovered');
      },
      collectBattery: (id) => {
        if (!this.flashlight.battery.addSpare()) {
          this.hud.toast('You cannot carry more batteries');
          return false;
        }
        this.progress.add(id);
        this.hud.toast('Spare battery. Press R to swap it in.');
        return true;
      },
      commit: (id) => {
        this.progress.add(id);
        this.save();
        if (id.endsWith('/placed') && this.progress.isComplete()) this.startEnding();
      },
      toast: (t) => this.hud.toast(t, 4),
      saveAtCheckpoint: (cp) => this.reachCheckpoint(cp, true),
      travel: (to, spawn) => this.travel(to, spawn),
      player: this.playerView(),
      sfx: this.sfx,
      catchPlayer: () => this.catchPlayer(),
      hide: (spot) => this.hide(spot),
    };
  }

  private playerView(): PlayerView {
    const game = this;
    const eye = new THREE.Vector3();
    const v = new THREE.Vector3();
    return {
      get active() {
        return game.state === 'playing' && !game.transition;
      },
      get feet() {
        return game.player.position;
      },
      get eye() {
        return eye.copy(game.camera.position);
      },
      get noise() {
        return game.player.noise;
      },
      get hidingIn() {
        return game.hiding?.spot.id ?? null;
      },
      get hideSeconds() {
        return game.hiding?.seconds ?? 0;
      },
      lights(point) {
        if (!game.flashlight.illuminates(point)) return false;
        const from = game.camera.position;
        const dist = v.copy(point).sub(from).length();
        return game.level.world.rayDistance(from, v.normalize(), dist) >= dist - 0.3;
      },
    };
  }

  // ----- hiding (GDD 5) ------------------------------------------------------

  private hide(spot: HidingSpot): void {
    if (this.state !== 'playing' || this.transition || this.hiding) return;
    this.hiding = { spot, seconds: 0, flashWasOn: this.flashlight.on };
    // No light shines out of a closed cabinet, and the beam would give you away.
    this.flashlight.on = false;
    spot.setOpen(true);
    spot.setOccupied(true);
    this.sfx.cue('creak', spot.look);
    this.player.hideAt(spot.eye, spot.yaw);
  }

  private leaveHiding(): void {
    const h = this.hiding;
    if (!h) return;
    this.hiding = null;
    h.spot.setOpen(true);
    h.spot.setOccupied(false);
    this.sfx.cue('creak', h.spot.look);
    this.player.leaveHiding(h.spot.exit);
    this.flashlight.on = h.flashWasOn;
  }

  /** Being caught or teleported ends hiding without stepping out. */
  private dropHiding(): void {
    this.hiding?.spot.setOccupied(false);
    this.hiding = null;
  }

  /** Makes a level the current one, building it the first time it is needed. */
  private activate(id: string): void {
    const factory = LEVELS[id] ?? LEVELS[FIRST_LEVEL];
    let level = this.levels.get(id);
    if (!level) {
      level = factory(this.svc);
      this.levels.set(id, level);
    }
    if (this.level) this.scene.remove(this.level.root);
    this.level = level;
    this.scene.add(level.root);
    this.scene.background = level.background;
    this.scene.fog = level.fog;
    this.renderer.toneMappingExposure = level.exposure;
    this.look.interactables = level.interactables;
    this.look.exhibits = level.exhibits;
    level.refresh();
  }

  /** Puts the player at a spawn of the current level and makes its first bench the checkpoint. */
  private arrive(spawnId: string): void {
    const spawn = this.level.spawns[spawnId] ?? this.level.checkpoints[0];
    this.dropHiding();
    this.player.teleport(spawn.position, spawn.yaw);
    this.checkpoint = this.level.checkpoints[0];
    const inRotunda = this.level.id === 'rotunda';
    // The rotunda is where you rest: the flashlight comes back full and is not needed there.
    if (inRotunda) this.flashlight.battery.charge = 1;
    this.flashlight.on = !inRotunda;
  }

  private travel(to: string, spawn: string): void {
    if (this.transition || this.state !== 'playing') return;
    this.transition = { phase: 'out', t: 0, to, spawn, card: null };
  }

  private save(): boolean {
    // The test room is a sandbox: playing it must not overwrite the real game's save.
    if (this.level.id === 'test-room') return true;
    return this.saves.save({
      levelId: this.level.id,
      checkpointId: this.checkpoint.id,
      collected: [...this.progress.ids],
      batteryCharge: this.flashlight.battery.charge,
      spareBatteries: this.flashlight.battery.spares,
    });
  }

  private start(continueSave: boolean, sandbox: string | null = null): void {
    this.progress.load([]);
    this.flashlight.battery.charge = 1;
    this.flashlight.battery.spares = 0;
    this.playSeconds = 0;
    this.transition = null;
    this.hud.setFade(0, null);
    this.hud.setLabels([], this.camera, 0, 0);
    const save = continueSave ? this.saves.load() : null;
    if (save && LEVELS[save.levelId]) {
      this.progress.load(save.collected);
      this.activate(save.levelId);
      this.arrive('start');
      this.flashlight.battery.charge = save.batteryCharge;
      this.flashlight.battery.spares = save.spareBatteries;
      const cp = this.level.checkpoints.find((c) => c.id === save.checkpointId) ?? this.level.checkpoints[0];
      this.checkpoint = cp;
      this.player.teleport(cp.position, cp.yaw);
    } else if (sandbox) {
      this.activate(sandbox);
      this.level.refresh();
      this.level.onRespawn?.();
      this.arrive('start');
    } else {
      if (!continueSave) this.saves.clear();
      this.activate(FIRST_LEVEL);
      this.arrive('start');
    }
    this.sfx.resume();
    this.input.requestLock();
    this.menu.hideAll();
    this.hud.setVisible(true);
    this.state = 'playing';
    this.player.frozen = false;
    this.player.movementLocked = false;
  }

  private reachCheckpoint(cp: Checkpoint, manual: boolean): void {
    const changed = this.checkpoint?.id !== cp.id;
    this.checkpoint = cp;
    const ok = this.save();
    if (manual || changed) this.hud.toast(ok ? 'Progress saved' : 'Checkpoint reached (this browser cannot save)');
  }

  /** Being caught: dark card, then back to the last checkpoint with fragments kept (GDD 6). */
  catchPlayer(): void {
    if (this.state !== 'playing' || this.transition) return;
    this.state = 'caught';
    this.caughtTimer = CAUGHT_SECONDS;
    this.player.frozen = true;
    this.sfx.cue('shutter');
    this.hud.showCaught(`Fig. 41: Visitor. Acquired ${this.clockText()}.`);
  }

  private clockText(): string {
    const minutes = CLOCK_START_MINUTES + Math.floor(this.playSeconds / 60);
    return `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  }

  private respawn(): void {
    this.hud.showCaught(null);
    if (this.hiding) this.flashlight.on = true;
    this.dropHiding();
    this.level.onRespawn?.();
    this.player.teleport(this.checkpoint.position, this.checkpoint.yaw);
    this.flashlight.battery.topUpForRespawn();
    this.player.frozen = false;
    this.state = 'playing';
  }

  // ----- ending ----------------------------------------------------------------

  /** Both artifacts are home: the rotunda goes dark and every label lights up (GDD 9). */
  private startEnding(): void {
    this.state = 'ending';
    this.endingTime = 0;
    this.player.movementLocked = true;
  }

  private updateEnding(dt: number): void {
    this.endingTime += dt;
    const t = this.endingTime;
    const k = THREE.MathUtils.clamp((t - ENDING.lightsStart) / (ENDING.lightsEnd - ENDING.lightsStart), 0, 1);
    this.level.setEnding?.(k);
    this.flashlight.on = false;

    const shown: Exhibit[] = [];
    if (t > ENDING.labelsStart) {
      const n = Math.floor((t - ENDING.labelsStart) / ENDING.labelEvery) + 1;
      shown.push(...this.level.exhibits.filter((e) => e.object.visible).slice(0, n));
    }
    if (t > ENDING.visitorAt) {
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
      this.visitorLabel.anchor.copy(this.camera.position).addScaledVector(fwd, 2).add(new THREE.Vector3(0, -0.25, 0));
      shown.push(this.visitorLabel);
    }
    this.hud.setLabels(shown, this.camera, this.container.clientWidth, this.container.clientHeight, t > ENDING.visitorAt ? this.visitorLabel : null);
    if (t > ENDING.fadeAt) this.hud.setFade(Math.min(1, (t - ENDING.fadeAt) / 1.5), null);
    if (t > ENDING.cardAt && this.state === 'ending') {
      this.state = 'end';
      this.hud.setLabels([], this.camera, 0, 0);
      this.hud.setVisible(false);
      this.input.releaseLock();
      this.menu.showEnd();
    }
  }

  private backToTitle(): void {
    this.state = 'title';
    this.player.movementLocked = false;
    this.hud.setFade(0, null);
    this.hud.setVisible(false);
    this.activate(FIRST_LEVEL);
    this.menu.showTitle(this.saves.load() !== null, this.saves.available);
  }

  // ----- pause ---------------------------------------------------------------

  private pause(): void {
    this.state = 'paused';
    this.player.frozen = true;
    this.menu.showPause();
  }

  private resume(): void {
    this.sfx.resume();
    this.menu.hideAll();
    this.input.requestLock();
    this.player.frozen = this.transition?.phase === 'hold';
    this.state = 'playing';
  }

  // ----- frame ---------------------------------------------------------------

  /** The label on the cabinet you are in changes while you are in it (GDD 5). */
  private hidingCaption(): string {
    const h = this.hiding!;
    if (h.seconds > HIDING.warnTime) return `Fig. 12: ${h.spot.label}. Not for much longer.`;
    return `Fig. 12: ${h.spot.label}.`;
  }

  private updateFov(dt: number): void {
    const want = this.hiding ? HIDING.fov : PLAYER.fov;
    if (Math.abs(this.camera.fov - want) < 0.01) return;
    this.camera.fov += (want - this.camera.fov) * Math.min(1, dt * 6);
    this.camera.updateProjectionMatrix();
  }

  private resize(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private handleKeys(): void {
    const i = this.input;
    if (i.wasPressed('Backquote')) this.debug.toggle();
    if (this.state !== 'playing') return;
    if (i.wasPressed('Escape') && i.dragLook) this.pause();
    if (this.transition) return;
    if (this.hiding) {
      if (i.wasPressed('KeyE') && this.hiding.seconds > HIDING.enterTime) this.leaveHiding();
      return;
    }
    if (i.wasPressed('KeyF')) this.flashlight.toggle();
    if (i.wasPressed('KeyR')) {
      const b = this.flashlight.battery;
      if (b.swap()) this.hud.toast('Fresh battery');
      else if (b.spares === 0) this.hud.toast('No spare batteries');
    }
    if (i.wasPressed('KeyE') && this.look.focused) this.look.focused.interact();
    if (this.debug.enabled) {
      if (i.wasPressed('KeyK')) this.catchPlayer();
      if (i.wasPressed('KeyV')) this.level.world.collider.visible = !this.level.world.collider.visible;
      const jumps: Record<string, string> = { Digit1: 'rotunda', Digit2: 'ice-age', Digit3: 'egypt', Digit0: 'test-room' };
      for (const [key, id] of Object.entries(jumps)) if (i.wasPressed(key)) this.travel(id, 'start');
      if (i.wasPressed('KeyN')) {
        for (let n = 1; n <= 4; n++) this.progress.add(`${this.level.id}/fragment-${n}`);
        this.level.refresh();
        this.hud.toast('Debug: all fragments of this level collected');
      }
    }
  }

  private updateTransition(dt: number): void {
    const tr = this.transition;
    if (!tr) return;
    tr.t += dt;
    if (tr.phase === 'out') {
      this.hud.setFade(Math.min(1, tr.t / TRANSITION.fadeOut), null);
      if (tr.t >= TRANSITION.fadeOut) {
        this.activate(tr.to);
        this.arrive(tr.spawn);
        this.save();
        this.renderer.compile(this.scene, this.camera);
        tr.card = this.level.card;
        tr.phase = 'hold';
        tr.t = 0;
        this.player.frozen = true;
        this.hud.setFade(1, tr.card);
      }
    } else if (tr.phase === 'hold') {
      if (tr.t >= (tr.card?.long ? TRANSITION.hold : TRANSITION.holdShort)) {
        tr.phase = 'in';
        tr.t = 0;
        this.player.frozen = false;
      }
    } else {
      this.hud.setFade(Math.max(0, 1 - tr.t / TRANSITION.fadeIn), tr.card);
      if (tr.t >= TRANSITION.fadeIn) {
        this.hud.setFade(0, null);
        this.transition = null;
        this.hud.toast(this.level.id === 'rotunda' ? 'Progress saved. The rotunda is safe.' : 'Progress saved', 3);
      }
    }
  }

  private frame(): void {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.elapsed += dt;
    this.handleKeys();

    if (this.state === 'playing' || this.state === 'caught' || this.state === 'ending') {
      if (this.state === 'playing') {
        this.playSeconds += dt;
        this.updateTransition(dt);
      }
      this.player.update(dt, this.input, this.level.world);
      if (this.hiding && this.state === 'playing') this.hiding.seconds += dt;
      this.updateFov(dt);
      this.flashlight.update(dt, this.elapsed);
      this.sfx.setListener(this.camera);
      this.level.update(dt, this.elapsed, this.player.position);
      this.look.update(this.camera, this.level.world);

      if (!this.transition && this.state === 'playing') {
        for (const cp of this.level.checkpoints) {
          if (cp.id !== this.checkpoint.id && cp.position.distanceTo(this.player.position) < cp.radius) this.reachCheckpoint(cp, false);
        }
      }

      if (this.state === 'caught') {
        this.caughtTimer -= dt;
        if (this.caughtTimer <= 0) this.respawn();
      }
      if (this.state === 'ending') this.updateEnding(dt);

      const b = this.flashlight.battery;
      const interactive = this.state === 'playing' && !this.transition && !this.hiding;
      const hidePrompt = this.hiding && this.hiding.seconds > HIDING.enterTime && this.state === 'playing' ? 'Leave the cabinet' : null;
      this.hud.setPrompt(interactive ? (this.look.focused?.prompt() ?? null) : hidePrompt);
      this.hud.setLabel(interactive ? this.look.focusedExhibit : null, this.camera, this.container.clientWidth, this.container.clientHeight);
      this.hud.setHiding(this.hiding && this.state === 'playing' ? this.hidingCaption() : null, !!this.hiding && this.hiding.seconds > HIDING.warnTime);
      this.hud.setBattery(b.charge, b.spares, this.flashlight.on, b.isLow);
      this.hud.setStamina(this.player.stamina.fraction, this.player.stamina.isExhausted);
      this.hud.setStatus(this.state === 'ending' ? null : this.level.status());
      this.hud.update(dt);
    } else {
      // Title, pause and end: slow drift so the menu has a living background.
      this.input.consumeLook();
      if (this.state !== 'paused') this.level.update(dt, this.elapsed, this.player.position);
      if (this.state === 'title' && this.level.titleView) {
        this.level.titleView(this.elapsed, this.camera);
        this.flashlight.on = false;
        this.flashlight.update(0, this.elapsed);
      }
    }

    const p = this.player;
    const ex = this.look.focusedExhibit;
    this.debug.update(
      dt,
      {
        state: this.state + (this.transition ? ` (${this.transition.phase} to ${this.transition.to})` : ''),
        level: this.level.id,
        pos: `${p.position.x.toFixed(2)} ${p.position.y.toFixed(2)} ${p.position.z.toFixed(2)}`,
        mode: p.mode + (p.onGround ? '' : ' (air)'),
        surface: this.level.world.surfaceAt(p.position),
        noise: `${p.noise.toFixed(1)} m`,
        stamina: `${p.stamina.value.toFixed(1)} s`,
        battery: `${(this.flashlight.battery.charge * 100).toFixed(0)} % +${this.flashlight.battery.spares}`,
        checkpoint: this.checkpoint?.id ?? '-',
        look: this.look.focused?.id ?? (ex ? (typeof ex.fig === 'string' ? ex.fig : ex.fig()) : '-'),
        drawCalls: this.renderer.info.render.calls,
        hiding: this.hiding ? `${this.hiding.spot.id} ${this.hiding.seconds.toFixed(0)} s` : '-',
        enemy: this.level.debug?.() ?? '-',
      },
      p.position,
      p.noise,
    );

    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  }
}
