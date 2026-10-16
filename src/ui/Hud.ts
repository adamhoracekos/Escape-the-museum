import * as THREE from 'three';
import type { Exhibit } from '../interaction/types';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, parent: HTMLElement, html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  if (html) e.innerHTML = html;
  parent.appendChild(e);
  return e;
}

/** All on-screen text and meters. Plain DOM over the canvas. */
export class Hud {
  readonly root: HTMLElement;
  private crosshair: HTMLElement;
  private prompt: HTMLElement;
  private label: HTMLElement;
  private labelFig: HTMLElement;
  private labelText: HTMLElement;
  private batteryFill: HTMLElement;
  private batterySpares: HTMLElement;
  private batteryBox: HTMLElement;
  private staminaBox: HTMLElement;
  private staminaFill: HTMLElement;
  private fragments: HTMLElement;
  private toastBox: HTMLElement;
  private caught: HTMLElement;
  private caughtText: HTMLElement;
  private toastTimer = 0;
  private v = new THREE.Vector3();

  constructor(container: HTMLElement) {
    this.root = el('div', 'hud', container);
    this.crosshair = el('div', 'crosshair', this.root);
    this.prompt = el('div', 'prompt', this.root);
    this.label = el('div', 'fig-label', this.root, '<i></i><b></b><span><em></em><strong></strong></span>');
    this.labelFig = this.label.querySelector('em')!;
    this.labelText = this.label.querySelector('strong')!;
    const meters = el('div', 'meters', this.root);
    this.batteryBox = el('div', 'meter battery', meters, '<span class="cap">Light</span><div class="bar"><div class="fill"></div></div><span class="spares"></span>');
    this.batteryFill = this.batteryBox.querySelector('.fill')!;
    this.batterySpares = this.batteryBox.querySelector('.spares')!;
    this.staminaBox = el('div', 'meter stamina', meters, '<span class="cap">Breath</span><div class="bar"><div class="fill"></div></div>');
    this.staminaFill = this.staminaBox.querySelector('.fill')!;
    this.fragments = el('div', 'fragments', this.root);
    this.toastBox = el('div', 'toast', this.root);
    this.caught = el('div', 'caught', this.root, '<div class="card"><em>Collection record</em><strong></strong></div>');
    this.caughtText = this.caught.querySelector('strong')!;
  }

  setVisible(v: boolean): void {
    this.root.hidden = !v;
  }

  setPrompt(text: string | null): void {
    this.prompt.textContent = text ? `[E] ${text}` : '';
    this.prompt.classList.toggle('show', !!text);
    this.crosshair.classList.toggle('active', !!text);
  }

  setLabel(ex: Exhibit | null, camera: THREE.Camera, w: number, h: number): void {
    if (!ex) {
      this.label.classList.remove('show');
      return;
    }
    this.v.copy(ex.anchor).project(camera);
    if (this.v.z > 1) {
      this.label.classList.remove('show');
      return;
    }
    const x = ((this.v.x + 1) / 2) * w;
    const y = ((1 - this.v.y) / 2) * h;
    this.label.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    const text = ex.text();
    if (this.labelFig.textContent !== ex.fig) this.labelFig.textContent = ex.fig;
    if (this.labelText.textContent !== text) this.labelText.textContent = text;
    this.label.classList.toggle('warn', !!ex.warn?.());
    this.label.classList.add('show');
  }

  setBattery(charge: number, spares: number, lightOn: boolean, low: boolean): void {
    this.batteryFill.style.width = `${(charge * 100).toFixed(1)}%`;
    this.batterySpares.textContent = spares > 0 ? `+${spares}` : '';
    this.batteryBox.classList.toggle('off', !lightOn);
    this.batteryBox.classList.toggle('low', low);
  }

  setStamina(fraction: number, exhausted: boolean): void {
    this.staminaFill.style.width = `${(fraction * 100).toFixed(1)}%`;
    this.staminaBox.classList.toggle('show', fraction < 0.999);
    this.staminaBox.classList.toggle('low', exhausted);
  }

  setFragments(have: number, total: number): void {
    this.fragments.textContent = total > 0 ? `Fragments ${have} / ${total}` : '';
  }

  toast(text: string, seconds = 2.6): void {
    this.toastBox.textContent = text;
    this.toastBox.classList.add('show');
    this.toastTimer = seconds;
  }

  showCaught(text: string | null): void {
    if (text) this.caughtText.textContent = text;
    this.caught.classList.toggle('show', !!text);
  }

  update(dt: number): void {
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastBox.classList.remove('show');
    }
  }
}
