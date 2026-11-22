// The Silent Stacks — keyboard and mouse.
// Tracks which keys are held, which were just pressed this frame, and
// where the mouse is, so the game can ask simple questions each tick:
// "which way is the player pushing?", "did they just press E?", "did
// they click a floor tile?".

export class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set();
    this.mouse = { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 };
    this.gesture = false; // true once the player has pressed or clicked anything
  }

  attach(target) {
    target.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.pressed.add(e.code);
      this.keys.add(e.code);
      this.gesture = true;
    });
    target.addEventListener('keyup', (e) => this.keys.delete(e.code));
    target.addEventListener('blur', () => { this.keys.clear(); });
    const canvas = target.document ? target.document.querySelector('canvas') : null;
    if (canvas) {
      canvas.addEventListener('mousemove', (e) => {
        const r = canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - r.left;
        this.mouse.y = e.clientY - r.top;
      });
      canvas.addEventListener('mousedown', (e) => {
        const r = canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - r.left;
        this.mouse.y = e.clientY - r.top;
        this.mouse.clicked = true;
        this.mouse.clickX = this.mouse.x;
        this.mouse.clickY = this.mouse.y;
        this.gesture = true;
      });
    }
  }

  down(code) { return this.keys.has(code); }

  justPressed(code) { return this.pressed.has(code); }

  // Movement vector from WASD or the arrow keys, normalised.
  moveAxis() {
    let x = 0, y = 0;
    if (this.down('KeyA') || this.down('ArrowLeft')) x -= 1;
    if (this.down('KeyD') || this.down('ArrowRight')) x += 1;
    if (this.down('KeyW') || this.down('ArrowUp')) y -= 1;
    if (this.down('KeyS') || this.down('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) { const inv = 1 / Math.hypot(x, y); x *= inv; y *= inv; }
    return { x, y };
  }

  get sneak() { return this.down('ShiftLeft') || this.down('ShiftRight'); }

  // Take the pending click, if any, and clear it.
  takeClick() {
    if (!this.mouse.clicked) return null;
    this.mouse.clicked = false;
    return { x: this.mouse.clickX, y: this.mouse.clickY };
  }

  // Call at the end of every frame: a press only counts on the frame it happened.
  endFrame() { this.pressed.clear(); }
}
