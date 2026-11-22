// The Silent Stacks — the thief.
// Walks with WASD or the arrows, sneaks while Shift is held, tosses a
// coin with E or a mouse click to pull a warden away, and pockets a
// manuscript by walking over it. Movement is axis-separated against the
// walls, so the thief slides along a shelf instead of sticking to it.

import { CONFIG } from './config.js';
import { isWall } from './levels.js';

export class Player {
  constructor(x, y) {
    this.x = x + 0.5;
    this.y = y + 0.5;
    this.facing = 0; // radians; 0 is east
    this.sneak = false;
    this.coins = CONFIG.coinsPerLevel;
    this.moving = false;
    this.tileKey = Math.floor(this.x) + ',' + Math.floor(this.y);
  }

  reset(x, y) {
    this.x = x + 0.5;
    this.y = y + 0.5;
    this.facing = 0;
    this.sneak = false;
    this.coins = CONFIG.coinsPerLevel;
    this.moving = false;
    this.tileKey = Math.floor(this.x) + ',' + Math.floor(this.y);
  }

  // One axis at a time, so a diagonal push slides along a wall.
  tryMove(level, dx, dy) {
    const r = CONFIG.playerRadius;
    const nx = this.x + dx;
    if (!hitsWall(level, nx, this.y, r)) this.x = nx;
    const ny = this.y + dy;
    if (!hitsWall(level, this.x, ny, r)) this.y = ny;
  }

  update(dt, input, level, world) {
    const axis = input.moveAxis();
    this.sneak = input.sneak;
    const speed = this.sneak ? CONFIG.playerSneak : CONFIG.playerWalk;
    this.moving = axis.x !== 0 || axis.y !== 0;
    if (this.moving) {
      this.facing = Math.atan2(axis.y, axis.x);
      this.tryMove(level, axis.x * speed * dt, axis.y * speed * dt);
    }

    // A footstep each time the thief crosses into a new tile.
    const key = Math.floor(this.x) + ',' + Math.floor(this.y);
    if (key !== this.tileKey) {
      this.tileKey = key;
      world.onEvent('playerstep', this);
    }

    // Toss a coin: E throws it ahead, a click throws it at the tile.
    if (input.justPressed('KeyE')) this.tossAhead(world);
    const click = input.takeClick();
    if (click) this.tossAtClick(world, click);

    // Pocket any manuscript underfoot.
    for (const m of level.manuscripts) {
      if (!m.taken && Math.hypot(m.x + 0.5 - this.x, m.y + 0.5 - this.y) <= CONFIG.pickupDistance) {
        m.taken = true;
        world.onEvent('pickup', m);
      }
    }
  }

  tossAhead(world) {
    if (this.coins <= 0) return;
    const tx = this.x + Math.cos(this.facing) * CONFIG.coinThrow;
    const ty = this.y + Math.sin(this.facing) * CONFIG.coinThrow;
    this.tossCoin(world, tx, ty);
  }

  tossAtClick(world, click) {
    if (this.coins <= 0) return;
    const tile = world.screenToTile(click.x, click.y);
    if (!tile) return;
    const dist = Math.hypot(tile.x + 0.5 - this.x, tile.y + 0.5 - this.y);
    if (dist > CONFIG.coinClickRange) return;
    if (isWall(world.level, tile.x, tile.y)) return;
    this.tossCoin(world, tile.x + 0.5, tile.y + 0.5);
  }

  tossCoin(world, x, y) {
    this.coins -= 1;
    world.onEvent('coin', { x, y });
  }
}

// Would a circle of radius r at (x, y) touch a wall? Checks the tiles
// the circle overlaps, so the thief cannot clip a shelf corner.
function hitsWall(level, x, y, r) {
  const x0 = Math.floor(x - r), x1 = Math.floor(x + r);
  const y0 = Math.floor(y - r), y1 = Math.floor(y + r);
  for (let cy = y0; cy <= y1; cy++) {
    for (let cx = x0; cx <= x1; cx++) {
      if (isWall(level, cx, cy)) {
        const nearestX = Math.max(cx, Math.min(x, cx + 1));
        const nearestY = Math.max(cy, Math.min(y, cy + 1));
        if (Math.hypot(x - nearestX, y - nearestY) < r) return true;
      }
    }
  }
  return false;
}
