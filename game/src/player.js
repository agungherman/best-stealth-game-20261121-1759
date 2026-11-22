// The Silent Stacks — the thief.
//
// The player moves with WASD or the arrow keys, sneaks while Shift is held,
// and tosses a coin with E or a mouse click: the coin lands where the mouse
// points (within reach) and the nearest warden comes to look at it.
// Manuscripts are picked up by walking over them; the exit opens once every
// manuscript in the level is taken. Movement is axis-separated, so the thief
// slides along walls instead of sticking to them.

function playerMake(start) {
  return {
    x: start.x,
    y: start.y,
    radius: 13,
    sneaking: false,
    moving: false,
    facing: 0,          // radians; where the thief last walked toward
    stepPhase: 0,
    coins: COINS_PER_LEVEL,
  };
}

// Try to move by (dx, dy); each axis is tested on its own so the thief
// slides along a wall instead of stopping dead on a corner.
function playerTryMove(parsed, player, dx, dy) {
  const r = player.radius;
  const canStand = function (x, y) {
    const tiles = [
      [Math.floor((x - r) / TILE), Math.floor((y - r) / TILE)],
      [Math.floor((x + r) / TILE), Math.floor((y - r) / TILE)],
      [Math.floor((x - r) / TILE), Math.floor((y + r) / TILE)],
      [Math.floor((x + r) / TILE), Math.floor((y + r) / TILE)],
    ];
    for (const t of tiles) {
      if (!levelTileWalkable(parsed, t[0], t[1])) return false;
    }
    return true;
  };
  if (dx !== 0 && canStand(player.x + dx, player.y)) player.x += dx;
  if (dy !== 0 && canStand(player.x, player.y + dy)) player.y += dy;
}

function playerUpdate(parsed, player, dt) {
  const dir = inputMoveDirection();
  player.sneaking = input.sneak;
  player.moving = dir.x !== 0 || dir.y !== 0;
  if (player.moving) {
    const speed = player.sneaking ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
    playerTryMove(parsed, player, dir.x * speed * dt, dir.y * speed * dt);
    player.facing = Math.atan2(dir.y, dir.x);
    // Soft steps, slower and quieter while sneaking.
    player.stepPhase += dt * speed * 0.11;
    if (player.stepPhase > Math.PI) {
      player.stepPhase -= Math.PI * 2;
      audioFootstep(player.sneaking ? 0.25 : 0.6, 0);
    }
  }
}

// A coin toss: returns the tile the coin lands on, or null when the player
// has no coins left or the target is out of reach / inside a wall.
function playerTossCoin(parsed, player) {
  if (player.coins <= 0) return null;
  const dx = input.mouseX - player.x;
  const dy = input.mouseY - player.y;
  const dist = Math.hypot(dx, dy);
  if (dist > COIN_RANGE_TILES * TILE) return null;
  const tx = Math.floor(input.mouseX / TILE);
  const ty = Math.floor(input.mouseY / TILE);
  if (!levelTileWalkable(parsed, tx, ty)) return null;
  player.coins--;
  audioCoinClink();
  return { x: tx, y: ty };
}

// Pick up any manuscript the thief stands on. Returns how many were taken.
function playerCollectLoot(parsed, player) {
  let taken = 0;
  for (const item of parsed.loot) {
    if (item.taken) continue;
    if (Math.hypot(item.x - player.x, item.y - player.y) < TILE * 0.7) {
      item.taken = true;
      taken++;
    }
  }
  if (taken > 0) audioPickup();
  return taken;
}

// Has the thief reached the exit, with every manuscript already taken?
function playerAtExit(parsed, player) {
  const remaining = parsed.loot.filter(function (item) { return !item.taken; }).length;
  if (remaining > 0) return false;
  return Math.hypot(parsed.exit.x - player.x, parsed.exit.y - player.y) < TILE * 0.7;
}
