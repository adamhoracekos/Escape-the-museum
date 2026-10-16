const CONTROLS: [string, string][] = [
  ['W A S D', 'Walk'],
  ['Shift', 'Run (you will run out of breath)'],
  ['Ctrl or C', 'Crouch, quieter'],
  ['F', 'Flashlight on or off'],
  ['R', 'Swap in a spare battery'],
  ['E', 'Interact'],
  ['Esc', 'Pause'],
];

export interface MenuHandlers {
  onContinue: () => void;
  onNewGame: () => void;
  onResume: () => void;
  onBackToTitle: () => void;
}

/** Title and pause screens. Every button is a real click so pointer lock can be requested from it. */
export class Menu {
  private title: HTMLElement;
  private pause: HTMLElement;
  private end: HTMLElement;
  private continueBtn: HTMLButtonElement;
  private note: HTMLElement;

  constructor(container: HTMLElement, h: MenuHandlers) {
    const controls = CONTROLS.map(([k, d]) => `<li><kbd>${k}</kbd><span>${d}</span></li>`).join('');
    this.title = document.createElement('div');
    this.title.className = 'screen title-screen';
    this.title.innerHTML = `
      <div class="panel">
        <p class="vol">Illustrated Encyclopedia · Volume 2 · Build 3: the Rotunda</p>
        <h1>Escape the <span>Museum</span></h1>
        <p class="sub">The museum is closed. The exhibits are not.</p>
        <div class="buttons">
          <button type="button" class="primary" data-act="continue">Continue</button>
          <button type="button" data-act="new">New game</button>
        </div>
        <p class="note"></p>
        <ul class="controls">${controls}</ul>
        <p class="hint">Click a button to start. The mouse will be captured; press Esc to get it back.</p>
      </div>`;
    container.appendChild(this.title);

    this.pause = document.createElement('div');
    this.pause.className = 'screen pause-screen';
    this.pause.hidden = true;
    this.pause.innerHTML = `
      <div class="panel small">
        <h2>Paused</h2>
        <div class="buttons"><button type="button" class="primary" data-act="resume">Resume</button></div>
        <ul class="controls">${controls}</ul>
      </div>`;
    container.appendChild(this.pause);

    this.end = document.createElement('div');
    this.end.className = 'screen end-screen';
    this.end.hidden = true;
    this.end.innerHTML = `
      <div class="panel small">
        <p class="vol">Fig. 1 · Visitor</p>
        <h2>Collection incomplete.</h2>
        <p class="sub">End of this test build. The Ice Age and Ancient Egypt wings are placeholders for now; their real levels come next.</p>
        <div class="buttons"><button type="button" class="primary" data-act="title">Back to the title</button></div>
      </div>`;
    container.appendChild(this.end);
    this.end.querySelector('[data-act="title"]')!.addEventListener('click', h.onBackToTitle);

    this.continueBtn = this.title.querySelector('[data-act="continue"]')!;
    this.note = this.title.querySelector('.note')!;
    this.continueBtn.addEventListener('click', h.onContinue);
    this.title.querySelector('[data-act="new"]')!.addEventListener('click', h.onNewGame);
    this.pause.querySelector('[data-act="resume"]')!.addEventListener('click', h.onResume);
  }

  showTitle(hasSave: boolean, storageAvailable: boolean): void {
    this.continueBtn.hidden = !hasSave;
    this.note.textContent = storageAvailable ? '' : 'Progress cannot be saved in this browser window.';
    this.title.hidden = false;
    this.pause.hidden = true;
    this.end.hidden = true;
  }

  showEnd(): void {
    this.end.hidden = false;
    this.title.hidden = true;
    this.pause.hidden = true;
  }

  showPause(): void {
    this.pause.hidden = false;
    this.title.hidden = true;
  }

  hideAll(): void {
    this.title.hidden = true;
    this.pause.hidden = true;
    this.end.hidden = true;
  }
}
