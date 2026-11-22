// The Silent Stacks — the game loop and the state machine.
//
// States: menu -> playing -> caught | levelDone -> playing -> win.
// The loop runs on requestAnimationFrame with a clamped delta, updates the
// thief and every warden, and keeps the HUD honest. A `?shot=N` query
// parameter (used only to take the entry's screenshots) poses one frozen
// frame of the game instead: the same rendering code, a staged moment.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const game = {
  state: 'menu',           // menu | playing | caught | levelDone | win
  levelIndex: 0,
  parsed: null,
  player: null,
  guards: [],
  coin: null,              // the tossed coin, while it lies on the floor
  coinTimer: 0,
  time: 0,                 // seconds in the current level
  totalTime: 0,
  spotted: 0,              // times the alarm was raised, all levels
  lastTimestamp: 0,
  messageTimer: 0,
};

function gameLoadLevel(index) {
  game.levelIndex = index;
  const def = LEVELS[index];
  const parsed = parseLevel(def);
  game.parsed = parsed;
  game.player = playerMake(parsed.start);
  game.guards = def.guards.map(function (g) { return guardMake(g, def.speed); });
  game.coin = null;
  game.coinTimer = 0;
  game.time = 0;
  game.messageTimer = 0;
  gameUpdateHud();
  setMessage('Level ' + (index + 1) + ' — ' + def.name + '. Take every manuscript, then reach the green door.');
}

function gameStart() {
  audioInit();
  game.levelIndex = 0;
  game.totalTime = 0;
  game.spotted = 0;
  gameLoadLevel(0);
  game.state = 'playing';
  showOverlay(null);
}

function gameRetryLevel() {
  gameLoadLevel(game.levelIndex);
  game.state = 'playing';
  showOverlay(null);
}

function gameNextLevel() {
  game.levelIndex++;
  if (game.levelIndex >= LEVELS.length) {
    game.state = 'win';
    showOverlay('win');
    document.getElementById('winText').textContent =
      'All three manuscripts, in ' + formatTime(game.totalTime) +
      ', spotted ' + game.spotted + (game.spotted === 1 ? ' time.' : ' times.');
    audioLevelClear();
  } else {
    gameLoadLevel(game.levelIndex);
    game.state = 'playing';
    showOverlay(null);
  }
}

function gameCaught(reason) {
  game.state = 'caught';
  document.getElementById('caughtText').textContent = reason;
  showOverlay('caught');
  audioCaught();
}

function gameLevelDone() {
  game.totalTime += game.time;
  game.state = 'levelDone';
  const last = game.levelIndex === LEVELS.length - 1;
  document.getElementById('levelDoneText').textContent =
    LEVELS[game.levelIndex].name + ' cleared in ' + formatTime(game.time) +
    ' — spotted ' + game.spotted + (game.spotted === 1 ? ' time' : ' times') + ' so far.';
  document.getElementById('nextBtn').textContent = last ? 'See the ending' : 'Next level';
  showOverlay('levelDone');
  audioLevelClear();
}

function showOverlay(which) {
  const ids = ['menu', 'caught', 'levelDone', 'win'];
  for (const id of ids) {
    document.getElementById(id).classList.toggle('hidden', id !== which);
  }
}

function setMessage(text) {
  document.getElementById('msg').textContent = text;
  game.messageTimer = 4;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}

function gameUpdateHud() {
  const def = LEVELS[game.levelIndex];
  const taken = game.parsed.loot.filter(function (item) { return item.taken; }).length;
  document.getElementById('hudLevel').textContent =
    (game.levelIndex + 1) + ' — ' + def.name;
  document.getElementById('hudLoot').textContent = taken + ' / ' + game.parsed.loot.length;
  document.getElementById('hudCoins').textContent = String(game.player.coins);
  document.getElementById('hudSpotted').textContent = String(game.spotted);
  document.getElementById('hudTime').textContent = formatTime(game.totalTime + game.time);
  const worst = game.guards.reduce(function (m, g) { return Math.max(m, g.detection); }, 0);
  const fill = document.getElementById('detectFill');
  fill.style.width = worst.toFixed(0) + '%';
  fill.style.background = worst >= 100 ? '#ff5a4b' : worst >= 50 ? '#f2a03c' : '#f2c94c';
}

// One frame of play.
function gameTick(dt) {
  game.time += dt;
  const player = game.player;
  const parsed = game.parsed;

  playerUpdate(parsed, player, dt);

  // A coin toss, from E or a mouse click.
  if (input.coinPressed || input.mouseClicked) {
    input.coinPressed = false;
    input.mouseClicked = false;
    if (game.state === 'playing') {
      const spot = playerTossCoin(parsed, player);
      if (spot) {
        game.coin = { x: (spot.x + 0.5) * TILE, y: (spot.y + 0.5) * TILE, tileX: spot.x, tileY: spot.y };
        game.coinTimer = 0;
        setMessage('The coin clinks on the stone. A warden turns to look.');
      } else if (player.coins <= 0) {
        setMessage('No coins left. Patience will have to do.');
      }
    }
  }

  // The coin lies for a while, then the nearest warden comes to look at it.
  if (game.coin) {
    game.coinTimer += dt;
    if (game.coinTimer > 0.4 && !game.coin.investigated) {
      game.coin.investigated = true;
      let nearest = null;
      let nearestD = Infinity;
      for (const guard of game.guards) {
        const d = Math.hypot(guard.x - game.coin.x, guard.y - game.coin.y);
        if (d < nearestD) { nearestD = d; nearest = guard; }
      }
      if (nearest && nearestD < COIN_HEAR_TILES * TILE && nearest.state === 'patrol') {
        nearest.state = 'suspicious';
        guardRouteTo(parsed, nearest, game.coin.tileX, game.coin.tileY);
      }
    }
    if (game.coinTimer > 6) game.coin = null;
  }

  // The wardens, and what they notice.
  const events = [];
  for (const guard of game.guards) {
    guardUpdate(parsed, guard, player, dt, events);
  }
  for (const event of events) {
    if (event === 'alarm') {
      game.spotted++;
      setMessage('Spotted! Break line of sight — now!');
      audioAlarm();
    } else if (event === 'suspicious') {
      setMessage('A warden heard something. Stay out of the light.');
      audioSuspicious();
    } else if (event === 'caught') {
      gameCaught('A warden caught you in the open, lantern in your face.');
      return;
    }
  }

  // Manuscripts and the exit.
  if (playerCollectLoot(parsed, player) > 0) {
    const taken = parsed.loot.filter(function (item) { return item.taken; }).length;
    if (taken === parsed.loot.length) {
      setMessage('Every manuscript is yours. The green door is open — go!');
    } else {
      setMessage('Manuscript taken. ' + (parsed.loot.length - taken) + ' to go.');
    }
  }
  if (playerAtExit(parsed, player)) {
    gameLevelDone();
    return;
  }

  if (game.messageTimer > 0) {
    game.messageTimer -= dt;
    if (game.messageTimer <= 0) document.getElementById('msg').textContent = '';
  }
  gameUpdateHud();
}

function gameFrame(timestamp) {
  requestAnimationFrame(gameFrame);
  const dt = Math.min(0.05, (timestamp - game.lastTimestamp) / 1000 || 0.016);
  game.lastTimestamp = timestamp;
  if (game.state === 'playing') gameTick(dt);
  // After the win the level index runs past the last level; keep rendering
  // the vault behind the win overlay instead of reading past the array.
  const viewLevel = LEVELS[Math.min(game.levelIndex, LEVELS.length - 1)];
  renderGame(ctx, game.parsed, viewLevel, game.player, game.guards, game.coin, timestamp / 1000);
}

// Screenshot mode: `?shot=1..4` poses one frozen frame of the game for the
// entry's screenshots. It renders the same code, with a staged moment.
function gameApplyShot(n) {
  gameLoadLevel(n === 4 ? 2 : n - 1);
  const parsed = game.parsed;
  const player = game.player;
  if (n === 1) {
    // The cover: the whole first level, lanterns sweeping, loot glowing.
    player.x = parsed.start.x;
    player.y = parsed.start.y;
    game.state = 'playing';
  } else if (n === 2) {
    // Crouched behind a shelf while a lantern sweeps just past.
    player.x = (4.5) * TILE;
    player.y = (6.5) * TILE;
    player.sneaking = true;
    player.facing = Math.PI;
    const guard = game.guards[0];
    guard.x = (8.5) * TILE;
    guard.y = (6.5) * TILE;
    guard.angle = 0;
    guard.detection = 62;
    game.state = 'playing';
  } else if (n === 3) {
    // The alarm: a warden has spotted the thief by the exit.
    player.x = (17.5) * TILE;
    player.y = (12.5) * TILE;
    player.facing = Math.PI;
    parsed.loot.forEach(function (item) { item.taken = true; });
    const guard = game.guards[0];
    guard.x = (14.5) * TILE;
    guard.y = (10.5) * TILE;
    guard.angle = Math.atan2(player.y - guard.y, player.x - guard.x);
    guard.state = 'chase';
    guard.detection = 100;
    game.state = 'playing';
  } else {
    // The ending: the vault cleared, manuscripts in hand.
    parsed.loot.forEach(function (item) { item.taken = true; });
    player.x = (20.5) * TILE;
    player.y = (13.5) * TILE;
    player.facing = -Math.PI / 2;
    game.state = 'playing';
  }
  gameUpdateHud();
  showOverlay(null);
  renderGame(ctx, parsed, LEVELS[game.levelIndex], player, game.guards, game.coin, 1.2);
}

function gameBoot() {
  inputAttach(canvas);
  document.getElementById('startBtn').addEventListener('click', gameStart);
  document.getElementById('retryBtn').addEventListener('click', gameRetryLevel);
  document.getElementById('nextBtn').addEventListener('click', gameNextLevel);
  document.getElementById('againBtn').addEventListener('click', gameStart);
  gameLoadLevel(0);
  const shot = new URLSearchParams(window.location.search).get('shot');
  if (shot) {
    gameApplyShot(parseInt(shot, 10) || 1);
  } else {
    game.lastTimestamp = performance.now();
    requestAnimationFrame(gameFrame);
  }
}

gameBoot();
