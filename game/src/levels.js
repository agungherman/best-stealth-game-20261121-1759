// The Silent Stacks — the three floors of the Grand Archive.
// Each map is 24 columns by 16 rows of characters:
//   '#' a shelf or wall (blocks movement and sight)
//   '.' open floor
//   ',' a dark corner (floor, but suspicion climbs half as fast there)
//   'P' where the thief starts
//   'M' a manuscript to steal
//   'E' the green exit door
// Warden patrol routes are lists of floor cells, walked in a loop.

export const LEVELS = [
  {
    name: 'The Reading Room',
    speed: 1.0,
    wardens: [
      { waypoints: [{ x: 3, y: 3 }, { x: 20, y: 3 }, { x: 20, y: 6 }, { x: 3, y: 6 }] },
      { waypoints: [{ x: 3, y: 10 }, { x: 20, y: 10 }, { x: 20, y: 13 }, { x: 3, y: 13 }] },
    ],
    map: [
      '########################',
      '#......................#',
      '#P..................M..#',
      '#......................#',
      '#.######....######.....#',
      '#......................#',
      '#......................#',
      '#......................#',
      '#.######....######.....#',
      '#......................#',
      '#......................#',
      '#...,,,,,..............#',
      '#...,,,,,...........M..#',
      '#...........E..........#',
      '#......................#',
      '########################',
    ],
  },
  {
    name: 'The Stacks',
    speed: 1.0,
    wardens: [
      { waypoints: [{ x: 2, y: 3 }, { x: 21, y: 3 }, { x: 21, y: 7 }, { x: 2, y: 7 }] },
      { waypoints: [{ x: 2, y: 12 }, { x: 21, y: 12 }, { x: 21, y: 14 }, { x: 2, y: 14 }] },
      { waypoints: [{ x: 9, y: 1 }, { x: 9, y: 14 }, { x: 15, y: 14 }, { x: 15, y: 1 }] },
    ],
    map: [
      '########################',
      '#......................#',
      '#P..................M..#',
      '#......................#',
      '#....##....##....##....#',
      '#....##....##....##....#',
      '#....##....##....##....#',
      '#...........M..........#',
      '#.,,,..................#',
      '#....##....##....##....#',
      '#....##....##....##....#',
      '#....##....##....##....#',
      '#......................#',
      '#..M........E..........#',
      '#......................#',
      '########################',
    ],
  },
  {
    name: 'The Vault',
    speed: 1.25,
    wardens: [
      { waypoints: [{ x: 2, y: 1 }, { x: 21, y: 1 }, { x: 21, y: 3 }, { x: 2, y: 3 }] },
      { waypoints: [{ x: 2, y: 12 }, { x: 8, y: 12 }, { x: 8, y: 14 }, { x: 2, y: 14 }] },
      { waypoints: [{ x: 17, y: 12 }, { x: 22, y: 12 }, { x: 22, y: 14 }, { x: 17, y: 14 }] },
      { waypoints: [{ x: 8, y: 5 }, { x: 16, y: 5 }, { x: 16, y: 10 }, { x: 8, y: 10 }] },
    ],
    map: [
      '########################',
      '#..................,,,.#',
      '#P..................M..#',
      '#......................#',
      '#..######..######..###.#',
      '#........######........#',
      '#........#....#........#',
      '#........#.M..#........#',
      '#........#..M.#........#',
      '#........#....#........#',
      '#........##..##........#',
      '#..######....####..###.#',
      '#..,,,,................#',
      '#...........E..........#',
      '#......................#',
      '########################',
    ],
  },
];

// Turn one level's ASCII map into the structures the game plays on.
// Entity letters are replaced by floor in the grid; their positions are
// returned separately so the game can move manuscripts and the exit around.
export function parseLevel(def) {
  const height = def.map.length;
  const width = def.map[0].length;
  const grid = [];
  const shadows = new Set();
  let playerStart = { x: 1, y: 1 };
  const manuscripts = [];
  let exit = { x: width - 2, y: height - 2 };
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const ch = def.map[y][x] || '.';
      if (ch === 'P') { playerStart = { x, y }; row.push('.'); }
      else if (ch === 'M') { manuscripts.push({ x, y, taken: false }); row.push('.'); }
      else if (ch === 'E') { exit = { x, y }; row.push('.'); }
      else if (ch === ',') { shadows.add(x + ',' + y); row.push('.'); }
      else if (ch === '#') { row.push('#'); }
      else { row.push('.'); }
    }
    grid.push(row);
  }
  return { name: def.name, speed: def.speed, width, height, grid, shadows, playerStart, manuscripts, exit };
}

export function isWall(level, x, y) {
  const cx = Math.floor(x), cy = Math.floor(y);
  if (cx < 0 || cy < 0 || cx >= level.width || cy >= level.height) return true;
  return level.grid[cy][cx] === '#';
}

export function isShadow(level, x, y) {
  return level.shadows.has(Math.floor(x) + ',' + Math.floor(y));
}

// True when a straight line between two points crosses no wall.
// Steps along the line in small increments and tests the cell under
// each step, so a line grazing a corner is caught.
export function hasSight(level, x0, y0, x1, y1) {
  const dx = x1 - x0, dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist * 4));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isWall(level, x0 + dx * t, y0 + dy * t)) return false;
  }
  return true;
}

// Breadth-first search over floor cells. Returns the cells to walk,
// start excluded and target included, or null when no route exists.
export function bfsPath(level, sx, sy, tx, ty) {
  const sx0 = Math.floor(sx), sy0 = Math.floor(sy);
  const tx0 = Math.floor(tx), ty0 = Math.floor(ty);
  if (sx0 === tx0 && sy0 === ty0) return [];
  if (isWall(level, tx0, ty0)) return null;
  const key = (x, y) => y * level.width + x;
  const prev = new Map();
  const seen = new Set([key(sx0, sy0)]);
  const queue = [{ x: sx0, y: sy0 }];
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  while (queue.length > 0) {
    const cur = queue.shift();
    for (const [dx, dy] of dirs) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= level.width || ny >= level.height) continue;
      if (level.grid[ny][nx] === '#') continue;
      const k = key(nx, ny);
      if (seen.has(k)) continue;
      seen.add(k);
      prev.set(k, cur);
      if (nx === tx0 && ny === ty0) {
        const path = [];
        let node = { x: nx, y: ny };
        while (!(node.x === sx0 && node.y === sy0)) {
          path.unshift({ x: node.x + 0.5, y: node.y + 0.5 });
          node = prev.get(key(node.x, node.y));
        }
        return path;
      }
      queue.push({ x: nx, y: ny });
    }
  }
  return null;
}
