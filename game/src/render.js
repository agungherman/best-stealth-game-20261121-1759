// The Silent Stacks — canvas rendering.
//
// One top-down view of the archive, drawn fresh every frame: the checkered
// floor and its pools of shadow, the walls, shelves and crates, the glowing
// manuscripts and the green exit door, then the wardens with their lantern
// cones, the thief, and finally a soft darkness that leaves the lantern
// cones and the thief's own small pool of light readable. A warden's mark
// above its head says what it is thinking: "?" while it comes to look,
// "!" while it chases.

function renderGame(ctx, parsed, level, player, guards, coin, time) {
  renderFloor(ctx, parsed, level);
  renderExitAndLoot(ctx, parsed, time);
  renderCones(ctx, guards);
  renderGuards(ctx, guards);
  renderCoin(ctx, coin, time);
  renderPlayer(ctx, player);
  renderDarkness(ctx, guards, player);
}

function renderFloor(ctx, parsed, level) {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const px = x * TILE;
      const py = y * TILE;
      const key = x + ',' + y;
      const ch = level.map[y][x];
      if (ch === '#') {
        ctx.fillStyle = COLOR_WALL;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = COLOR_WALL_TOP;
        ctx.fillRect(px, py, TILE, 6);
      } else if (ch === 'B') {
        ctx.fillStyle = COLOR_SHELF;
        ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
        ctx.fillStyle = COLOR_SHELF_TOP;
        ctx.fillRect(px + 2, py + 2, TILE - 4, 8);
        ctx.fillStyle = '#2e1e12';
        ctx.fillRect(px + 6, py + 14, TILE - 12, 3);
        ctx.fillRect(px + 6, py + 24, TILE - 12, 3);
      } else if (ch === 'T') {
        ctx.fillStyle = COLOR_CRATE;
        ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
        ctx.fillStyle = COLOR_CRATE_TOP;
        ctx.fillRect(px + 3, py + 3, TILE - 6, 7);
        ctx.strokeStyle = '#3a2d16';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 3, py + 3, TILE - 6, TILE - 6);
      } else {
        const alt = (x + y) % 2 === 0;
        if (parsed.shadow.has(key)) {
          ctx.fillStyle = COLOR_SHADOW_FLOOR;
        } else {
          ctx.fillStyle = alt ? COLOR_FLOOR : COLOR_FLOOR_ALT;
        }
        ctx.fillRect(px, py, TILE, TILE);
        if (parsed.shadow.has(key)) {
          ctx.fillStyle = 'rgba(120, 130, 200, 0.05)';
          ctx.fillRect(px, py, TILE, TILE);
        }
      }
    }
  }
}

function renderExitAndLoot(ctx, parsed, time) {
  // The exit door: green while it waits, brighter once it is open.
  const open = parsed.loot.every(function (item) { return item.taken; });
  const pulse = 0.55 + 0.25 * Math.sin(time * 2.4);
  ctx.save();
  ctx.globalAlpha = open ? 0.95 : pulse;
  ctx.fillStyle = COLOR_EXIT;
  ctx.fillRect(parsed.exit.x - 16, parsed.exit.y - 16, 32, 32);
  ctx.fillStyle = '#0b0b12';
  ctx.font = 'bold 20px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(open ? '➜' : '✦', parsed.exit.x, parsed.exit.y + 1);
  ctx.restore();
  ctx.strokeStyle = COLOR_EXIT;
  ctx.lineWidth = 2;
  ctx.strokeRect(parsed.exit.x - 16, parsed.exit.y - 16, 32, 32);

  // Manuscripts: gold books that bob and glow until they are taken.
  for (const item of parsed.loot) {
    if (item.taken) continue;
    const bob = Math.sin(time * 3 + item.x) * 2;
    const glow = 0.5 + 0.3 * Math.sin(time * 3 + item.x);
    ctx.save();
    ctx.globalAlpha = glow;
    ctx.fillStyle = COLOR_LOOT;
    ctx.beginPath();
    ctx.arc(item.x, item.y + bob, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#7a5c10';
    ctx.fillRect(item.x - 7, item.y - 5 + bob, 14, 10);
    ctx.fillStyle = COLOR_LOOT;
    ctx.fillRect(item.x - 7, item.y - 5 + bob, 4, 10);
    ctx.restore();
  }
}

// A warden's lantern cone: a wedge from its position along its facing.
function renderCone(ctx, guard) {
  const range = GUARD_SIGHT_RANGE;
  const a0 = guard.angle - GUARD_SIGHT_HALF_ANGLE;
  const a1 = guard.angle + GUARD_SIGHT_HALF_ANGLE;
  let fill = COLOR_CONE_CALM;
  if (guard.state === 'chase') fill = COLOR_CONE_ALARM;
  else if (guard.state === 'suspicious' || guard.detection >= SUSPICIOUS_AT) fill = COLOR_CONE_SUSPICIOUS;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.arc(guard.x, guard.y, range, a0, a1);
  ctx.closePath();
  ctx.fill();
  // The lantern's edge, so the cone reads at a glance.
  ctx.strokeStyle = 'rgba(242, 201, 76, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(guard.x + Math.cos(a0) * range, guard.y + Math.sin(a0) * range);
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(guard.x + Math.cos(a1) * range, guard.y + Math.sin(a1) * range);
  ctx.stroke();
}

function renderCones(ctx, guards) {
  for (const guard of guards) renderCone(ctx, guard);
}

function renderGuards(ctx, guards) {
  for (const guard of guards) {
    // Body: a warden in a rust-red coat, with a lantern dot at its front.
    ctx.fillStyle = COLOR_GUARD;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f5e6c8';
    ctx.beginPath();
    ctx.arc(
      guard.x + Math.cos(guard.angle) * 8,
      guard.y + Math.sin(guard.angle) * 8,
      5, 0, Math.PI * 2
    );
    ctx.fill();
    // Detection ring: fills as the warden notices you.
    if (guard.detection > 1) {
      ctx.strokeStyle = guard.detection >= 100 ? '#ff5a4b' : '#f2c94c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(guard.x, guard.y, 19, -Math.PI / 2, -Math.PI / 2 + (guard.detection / 100) * Math.PI * 2);
      ctx.stroke();
    }
    // What the warden is thinking.
    let mark = '';
    if (guard.state === 'chase') mark = '!';
    else if (guard.state === 'suspicious' || guard.state === 'return') mark = '?';
    if (mark) {
      ctx.font = 'bold 22px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = guard.state === 'chase' ? '#ff5a4b' : '#f2c94c';
      ctx.fillText(mark, guard.x, guard.y - 20);
    }
  }
}

function renderCoin(ctx, coin, time) {
  if (!coin) return;
  const bob = Math.sin(time * 6) * 2;
  ctx.fillStyle = '#ffd968';
  ctx.beginPath();
  ctx.arc(coin.x, coin.y + bob, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7a5c10';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(coin.x, coin.y + bob, 6, 0, Math.PI * 2);
  ctx.stroke();
}

function renderPlayer(ctx, player) {
  // A soft pool of light around the thief, then the thief itself: a pale
  // figure with a dark hood, facing where it walks.
  const grad = ctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, 70);
  grad.addColorStop(0, 'rgba(232, 226, 208, 0.14)');
  grad.addColorStop(1, 'rgba(232, 226, 208, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 70, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = player.sneaking ? '#b8b09a' : COLOR_PLAYER;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a2a35';
  ctx.beginPath();
  ctx.arc(
    player.x + Math.cos(player.facing) * 6,
    player.y + Math.sin(player.facing) * 6,
    6, 0, Math.PI * 2
  );
  ctx.fill();
  // Crouch ring while sneaking, so the stance reads on screen.
  if (player.sneaking) {
    ctx.strokeStyle = 'rgba(232, 226, 208, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 4, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// Darkness over everything except the lantern cones and the thief's light.
// The dark layer lives on its own offscreen canvas, where holes are punched
// around each warden and the thief, and is then laid over the game: punching
// holes on the main canvas would erase the game itself underneath.
let darknessCanvas = null;

function renderDarkness(ctx, guards, player) {
  if (!darknessCanvas) {
    darknessCanvas = document.createElement('canvas');
    darknessCanvas.width = VIEW_W;
    darknessCanvas.height = VIEW_H;
  }
  const dctx = darknessCanvas.getContext('2d');
  dctx.clearRect(0, 0, VIEW_W, VIEW_H);
  dctx.fillStyle = 'rgba(5, 5, 12, 0.42)';
  dctx.fillRect(0, 0, VIEW_W, VIEW_H);
  dctx.globalCompositeOperation = 'destination-out';
  const punchHole = function (x, y, radius, strength) {
    const grad = dctx.createRadialGradient(x, y, 10, x, y, radius);
    grad.addColorStop(0, 'rgba(0,0,0,' + strength + ')');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    dctx.fillStyle = grad;
    dctx.beginPath();
    dctx.arc(x, y, radius, 0, Math.PI * 2);
    dctx.fill();
  };
  for (const guard of guards) punchHole(guard.x, guard.y, 130, 0.85);
  punchHole(player.x, player.y, 110, 0.9);
  dctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(darknessCanvas, 0, 0);
}
