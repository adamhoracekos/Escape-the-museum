/**
 * Keyboard and mouse input. Uses pointer lock when the browser allows it and
 * falls back to drag-to-look (hold the left button) when it is refused,
 * for example inside sandboxed frames.
 */
export class Input {
  private down = new Set<string>();
  private pressed = new Set<string>();
  private lookX = 0;
  private lookY = 0;
  private dragging = false;
  /** Mouse events are ignored briefly after the pointer locks; see handleMouseMove. */
  private ignoreUntil = 0;
  locked = false;
  dragLook = false;
  sensitivity = 0.0022;

  onLockChange: (locked: boolean) => void = () => {};

  constructor(private element: HTMLElement) {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', () => this.down.clear());
    document.addEventListener('pointerlockchange', this.handleLockChange);
    document.addEventListener('pointerlockerror', () => {
      this.dragLook = true;
      this.onLockChange(true);
    });
    document.addEventListener('mousemove', this.handleMouseMove);
    element.addEventListener('mousedown', (e) => {
      if (this.dragLook && e.button === 0) this.dragging = true;
    });
    window.addEventListener('mouseup', () => (this.dragging = false));
  }

  /** Must be called from a user gesture (click). */
  requestLock(): void {
    if (this.dragLook) {
      this.onLockChange(true);
      return;
    }
    try {
      const res = this.element.requestPointerLock() as unknown as Promise<void> | undefined;
      if (res && typeof res.catch === 'function') {
        res.catch(() => {
          this.dragLook = true;
          this.onLockChange(true);
        });
      }
    } catch {
      this.dragLook = true;
      this.onLockChange(true);
    }
  }

  releaseLock(): void {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  isDown(code: string): boolean {
    return this.down.has(code);
  }

  /** True only on the first frame the key went down. Cleared by endFrame(). */
  wasPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  consumeLook(): { x: number; y: number } {
    const out = { x: this.lookX * this.sensitivity, y: this.lookY * this.sensitivity };
    this.lookX = 0;
    this.lookY = 0;
    return out;
  }

  endFrame(): void {
    this.pressed.clear();
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.down.has(e.code)) this.pressed.add(e.code);
    this.down.add(e.code);
    // Ctrl+W and similar would close the tab while crouch-walking; block the browser defaults we use.
    if ((e.ctrlKey || e.code.startsWith('Control')) && ['KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(e.code)) e.preventDefault();
    if (e.code === 'Space') e.preventDefault();
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.down.delete(e.code);
  };

  private handleLockChange = () => {
    this.locked = document.pointerLockElement === this.element;
    if (this.locked) this.ignoreUntil = performance.now() + 120;
    this.onLockChange(this.locked);
  };

  private handleMouseMove = (e: MouseEvent) => {
    // Chrome can report one huge movement right after the pointer locks, which would
    // spin the camera at the start of a game. Drop those events.
    if (performance.now() < this.ignoreUntil || Math.abs(e.movementX) > 400 || Math.abs(e.movementY) > 400) return;
    if (this.locked || (this.dragLook && this.dragging)) {
      this.lookX += e.movementX;
      this.lookY += e.movementY;
    }
  };
}
