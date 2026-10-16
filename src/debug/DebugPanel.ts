import * as THREE from 'three';

/**
 * Developer overlay, toggled with the backquote key (`).
 * Shows player state and draws the current noise radius on the floor.
 * K simulates being caught, V shows the collision mesh.
 */
export class DebugPanel {
  enabled = false;
  private box: HTMLElement;
  readonly noiseRing: THREE.Mesh;
  private frames = 0;
  private acc = 0;
  private fps = 0;

  constructor(container: HTMLElement, scene: THREE.Scene) {
    this.box = document.createElement('pre');
    this.box.className = 'debug';
    this.box.hidden = true;
    container.appendChild(this.box);
    this.noiseRing = new THREE.Mesh(
      new THREE.RingGeometry(0.97, 1, 64),
      new THREE.MeshBasicMaterial({ color: 0xff4040, transparent: true, opacity: 0.6, depthTest: false }),
    );
    this.noiseRing.rotation.x = -Math.PI / 2;
    this.noiseRing.renderOrder = 999;
    this.noiseRing.visible = false;
    this.noiseRing.userData.noCollide = true;
    scene.add(this.noiseRing);
  }

  toggle(): void {
    this.enabled = !this.enabled;
    this.box.hidden = !this.enabled;
    this.noiseRing.visible = this.enabled;
  }

  update(dt: number, lines: Record<string, string | number>, feet: THREE.Vector3, noise: number): void {
    this.frames++;
    this.acc += dt;
    if (this.acc >= 0.5) {
      this.fps = Math.round(this.frames / this.acc);
      this.frames = 0;
      this.acc = 0;
    }
    if (!this.enabled) return;
    this.noiseRing.position.set(feet.x, feet.y + 0.03, feet.z);
    this.noiseRing.scale.setScalar(Math.max(0.01, noise));
    this.noiseRing.visible = noise > 0;
    const rows = Object.entries({ fps: this.fps, ...lines }).map(([k, v]) => `${k.padEnd(10)} ${v}`);
    rows.push('', '` close   K caught   V collider');
    this.box.textContent = rows.join('\n');
  }
}
