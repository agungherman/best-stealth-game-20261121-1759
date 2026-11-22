// The Silent Stacks — keyboard and mouse input.
//
// One object, `input`, holds the current state: which movement keys are
// down, whether the player is sneaking, where the mouse is over the canvas,
// and one-shot actions (a coin toss) that the game loop consumes once.

const input = {
  up: false,
  down: false,
  left: false,
  right: false,
  sneak: false,
  mouseX: 0,
  mouseY: 0,
  mouseClicked: false,   // set on click, cleared by the game loop after use
  coinPressed: false,    // set on E, cleared by the game loop after use
};

const INPUT_KEYS = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ShiftLeft: 'sneak', ShiftRight: 'sneak',
};

function inputKeyDown(event) {
  const field = INPUT_KEYS[event.code];
  if (field) {
    input[field] = true;
    event.preventDefault();
  } else if (event.code === 'KeyE') {
    input.coinPressed = true;
    event.preventDefault();
  }
}

function inputKeyUp(event) {
  const field = INPUT_KEYS[event.code];
  if (field) {
    input[field] = false;
    event.preventDefault();
  }
}

function inputMouseMove(event) {
  const rect = event.target.getBoundingClientRect();
  input.mouseX = event.clientX - rect.left;
  input.mouseY = event.clientY - rect.top;
}

function inputMouseClick(event) {
  inputMouseMove(event);
  input.mouseClicked = true;
}

// Direction the player wants to move, as a unit vector (or zero when idle).
function inputMoveDirection() {
  let x = 0;
  let y = 0;
  if (input.left) x -= 1;
  if (input.right) x += 1;
  if (input.up) y -= 1;
  if (input.down) y += 1;
  if (x === 0 && y === 0) return { x: 0, y: 0 };
  const len = Math.hypot(x, y);
  return { x: x / len, y: y / len };
}

function inputAttach(canvas) {
  window.addEventListener('keydown', inputKeyDown);
  window.addEventListener('keyup', inputKeyUp);
  canvas.addEventListener('mousemove', inputMouseMove);
  canvas.addEventListener('click', inputMouseClick);
}
