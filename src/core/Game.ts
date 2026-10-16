import * as THREE from 'three';
import { PLAYER } from '../config';
import { DebugPanel } from '../debug/DebugPanel';
import { LookTargets } from '../interaction/LookTargets';
import type { Checkpoint, Level, LevelServices } from '../levels/Level';
import { createTestRoom } from '../levels/TestRoom';
import { Flashlight } from '../player/Flashlight';
import { Player } from '../player/Player';
import { SaveSystem } from '../save/SaveSystem';
import { Hud } from '../ui/Hud';
import { Menu } from '../ui/Menu';
import { Input } from './Input';

type State = 'title' | 'playing' | 'paused' | 'caught';

const CAUGHT_SECONDS = 3;
/** The museum clock starts at closing time and runs while you play. */
const CLOCK_START_MINUTES = 23 * 60;

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
  private level!: Level;
  private state: State = 'title';
  private collected = new Set<string>();
  private checkpoint!: Checkpoint;
  private caughtTimer = 0;
  private playSeconds = 0;
  private clock = new THREE.Clock();
  private elapsed = 0;

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(PLAYER.fov, 1, 0.05, 120);
    this.scene.add(this.camera);
    this.input = new Input(this.renderer.domElement);
    this.player = new Player(this.camera);
    this.flashlight = new Flashlight(this.camera);
    this.hud = new Hud(container);
    this.debug = new DebugPanel(container, this.scene);
    this.menu = new Menu(container, {
      onContinue: () => this.start(true),
      onNewGame: () => this.start(false),
      onResume: () => this.resume(),
    });

    this.input.onLockChange = (locked) => {
      if (!locked && !this.input.dragLook && this.state === 'playing') this.pause();
    };

    this.loadLevel();
    this.hud.setVisible(false);
    this.menu.showTitle(this.saves.load() !== null, this.saves.available);

    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  // ----- level and progress -------------------------------------------------

  private services(): LevelServices {
    return {
      isCollected: (id) => this.collected.has(id),
      collectFragment: (id) => {
        this.collected.add(id);
        const n = this.fragmentsCollected();
        this.hud.toast(`Fragment ${n} of ${this.level.fragmentsTotal} recovered`);
      },
      collectBattery: (id) => {
        if (!this.flashlight.battery.addSpare()) {
          this.hud.toast('You cannot carry more batteries');
          return false;
        }
        this.collected.add(id);
        this.hud.toast('Spare battery. Press R to swap it in.');
        return true;
      },
      fragmentsCollected: () => this.fragmentsCollected(),
      toast: (t) => this.hud.toast(t, 4),
      saveAtCheckpoint: (cp) => this.reachCheckpoint(cp, true),
    };
  }

  private fragmentsCollected(): number {
    let n = 0;
    for (const id of this.collected) if (id.includes('fragment')) n++;
    return n;
  }

  private loadLevel(): void {
    if (this.level) this.scene.remove(this.level.root);
    this.level = createTestRoom(this.services());
    this.scene.add(this.level.root);
    this.scene.background = this.level.background;
    this.look.interactables = this.level.interactables;
    this.look.exhibits = this.level.exhibits;
  }

  private start(continueSave: boolean): void {
    this.collected.clear();
    this.flashlight.battery.charge = 1;
    this.flashlight.battery.spares = 0;
    this.flashlight.on = true;
    this.playSeconds = 0;
    let cp = this.level.checkpoints[0];
    const save = continueSave ? this.saves.load() : null;
    if (save && save.levelId === this.level.id) {
      save.collected.forEach((id) => this.collected.add(id));
      this.flashlight.battery.charge = save.batteryCharge;
      this.flashlight.battery.spares = save.spareBatteries;
      cp = this.level.checkpoints.find((c) => c.id === save.checkpointId) ?? cp;
    } else if (!continueSave) {
      this.saves.clear();
    }
    this.level.refresh();
    this.checkpoint = cp;
    this.player.teleport(cp.position, cp.yaw);
    this.input.requestLock();
    this.menu.hideAll();
    this.hud.setVisible(true);
    this.state = 'playing';
    this.player.frozen = false;
  }

  private reachCheckpoint(cp: Checkpoint, manual: boolean): void {
    const changed = this.checkpoint?.id !== cp.id;
    this.checkpoint = cp;
    const ok = this.saves.save({
      levelId: this.level.id,
      checkpointId: cp.id,
      collected: [...this.collected],
      batteryCharge: this.flashlight.battery.charge,
      spareBatteries: this.flashlight.battery.spares,
    });
    if (manual || changed) this.hud.toast(ok ? 'Progress saved' : 'Checkpoint reached (this browser cannot save)');
  }

  /** Being caught: dark card, then back to the last checkpoint with fragments kept (GDD 6). */
  catchPlayer(): void {
    if (this.state !== 'playing') return;
    this.state = 'caught';
    this.caughtTimer = CAUGHT_SECONDS;
    this.player.frozen = true;
    const minutes = CLOCK_START_MINUTES + Math.floor(this.playSeconds / 60);
    const hh = String(Math.floor(minutes / 60) % 24).padStart(2, '0');
    const mm = String(minutes % 60).padStart(2, '0');
    this.hud.showCaught(`Fig. 41: Visitor. Acquired ${hh}:${mm}.`);
  }

  private respawn(): void {
    this.hud.showCaught(null);
    this.player.teleport(this.checkpoint.position, this.checkpoint.yaw);
    this.flashlight.battery.topUpForRespawn();
    this.player.frozen = false;
    this.state = 'playing';
  }

  // ----- pause ---------------------------------------------------------------

  private pause(): void {
    this.state = 'paused';
    this.player.frozen = true;
    this.menu.showPause();
  }

  private resume(): void {
    this.menu.hideAll();
    this.input.requestLock();
    this.player.frozen = false;
    this.state = 'playing';
  }

  // ----- frame ---------------------------------------------------------------

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
    }
  }

  private frame(): void {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.elapsed += dt;
    this.handleKeys();

    if (this.state === 'playing' || this.state === 'caught') {
      if (this.state === 'playing') this.playSeconds += dt;
      this.player.update(dt, this.input, this.level.world);
      this.flashlight.update(dt, this.elapsed);
      this.level.update(dt, this.elapsed, this.player.position);
      this.look.update(this.camera, this.level.world);

      for (const cp of this.level.checkpoints) {
        if (cp.id !== this.checkpoint.id && cp.position.distanceTo(this.player.position) < cp.radius) this.reachCheckpoint(cp, false);
      }

      if (this.state === 'caught') {
        this.caughtTimer -= dt;
        if (this.caughtTimer <= 0) this.respawn();
      }

      const b = this.flashlight.battery;
      this.hud.setPrompt(this.state === 'playing' ? (this.look.focused?.prompt() ?? null) : null);
      this.hud.setLabel(this.state === 'playing' ? this.look.focusedExhibit : null, this.camera, this.container.clientWidth, this.container.clientHeight);
      this.hud.setBattery(b.charge, b.spares, this.flashlight.on, b.isLow);
      this.hud.setStamina(this.player.stamina.fraction, this.player.stamina.isExhausted);
      this.hud.setFragments(this.fragmentsCollected(), this.level.fragmentsTotal);
      this.hud.update(dt);
    } else {
      // Title and pause: slow drift so the menu has a living background.
      this.input.consumeLook();
      this.level.update(dt, this.elapsed, this.player.position);
      if (this.state === 'title') {
        this.camera.position.set(-2 + Math.sin(this.elapsed * 0.1) * 0.6, 1.7, 3.6);
        this.camera.rotation.set(-0.12, -0.35 + Math.sin(this.elapsed * 0.07) * 0.15, 0, 'YXZ');
        this.flashlight.update(0, this.elapsed);
      }
    }

    const p = this.player;
    this.debug.update(
      dt,
      {
        state: this.state,
        pos: `${p.position.x.toFixed(2)} ${p.position.y.toFixed(2)} ${p.position.z.toFixed(2)}`,
        mode: p.mode + (p.onGround ? '' : ' (air)'),
        surface: this.level.world.surfaceAt(p.position),
        noise: `${p.noise.toFixed(1)} m`,
        stamina: `${p.stamina.value.toFixed(1)} s`,
        battery: `${(this.flashlight.battery.charge * 100).toFixed(0)} % +${this.flashlight.battery.spares}`,
        checkpoint: this.checkpoint?.id ?? '-',
        look: this.look.focused?.id ?? this.look.focusedExhibit?.fig ?? '-',
        drawCalls: this.renderer.info.render.calls,
      },
      p.position,
      p.noise,
    );

    this.renderer.render(this.scene, this.camera);
    this.input.endFrame();
  }
}
