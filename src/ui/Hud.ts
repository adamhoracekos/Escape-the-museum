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
  private fade: HTMLElement;
  private fadeKicker: HTMLElement;
  private fadeTitle: HTMLElement;
  private many: HTMLElement[] = [];
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
    // The fade sits outside the HUD root so it still covers the screen when the HUD is hidden.
    this.fade = el('div', 'fade', container, '<div class="chapter-card"><em></em><strong></strong></div>');
    this.fadeKicker = this.fade.querySelector('em')!;
    this.fadeTitle = this.fade.querySelector('strong')!;
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
    const fig = typeof ex.fig === 'string' ? ex.fig : ex.fig();
    if (this.labelFig.textContent !== fig) this.labelFig.textContent = fig;
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

  setStatus(text: string | null): void {
    const t = text ?? '';
    if (this.fragments.textContent !== t) this.fragments.textContent = t;
  }

  /** Black screen between areas. With a card, the chapter title shows on the black. */
  setFade(opacity: number, card: { kicker: string; title: string } | null): void {
    this.fade.style.opacity = opacity.toFixed(3);
    this.fade.style.pointerEvents = opacity > 0.01 ? 'auto' : 'none';
    this.fade.classList.toggle('with-card', !!card);
    if (card) {
      this.fadeKicker.textContent = card.kicker;
      this.fadeTitle.textContent = card.title;
    }
  }

  /** Several labels at once, used by the ending when every label in the rotunda lights up. */
  setLabels(list: Exhibit[], camera: THREE.Camera, w: number, h: number, focus: Exhibit | null = null): void {
    while (this.many.length < list.length) {
      this.many.push(el('div', 'fig-label', this.root, '<i></i><b></b><span><em></em><strong></strong></span>'));
    }
    this.many.forEach((node, i) => {
      const ex = list[i];
      if (!ex) {
        node.classList.remove('show');
        return;
      }
      this.v.copy(ex.anchor).project(camera);
      if (this.v.z > 1 || Math.abs(this.v.x) > 1.2 || Math.abs(this.v.y) > 1.2) {
        node.classList.remove('show');
        return;
      }
      node.style.transform = `translate(${(((this.v.x + 1) / 2) * w).toFixed(1)}px, ${(((1 - this.v.y) / 2) * h).toFixed(1)}px)`;
      node.querySelector('em')!.textContent = typeof ex.fig === 'string' ? ex.fig : ex.fig();
      node.querySelector('strong')!.textContent = ex.text();
      node.classList.toggle('warn', !!ex.warn?.());
      // Once one label matters most, the rest step back behind it.
      node.classList.toggle('dim', !!focus && ex !== focus);
      node.style.zIndex = ex === focus ? '2' : '';
      node.classList.add('show');
    });
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
