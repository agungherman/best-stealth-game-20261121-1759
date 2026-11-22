// The Silent Stacks — the three levels of the Grand Archive.
//
// Map legend:
//   #  wall (solid, blocks sight and movement)
//   .  floor
//   ,  shadow floor (dark: a warden's gaze builds three times slower here)
//   B  bookshelf (solid, blocks sight: the best cover in the archive)
//   T  crate (solid, blocks sight)
//   P  where the thief starts
//   A  a manuscript to steal
//   E  the exit door (opens once every manuscript is taken)
//
// Guards are not drawn on the map: each level lists their patrol routes as
// tile waypoints. Every patrol leg runs down a clear corridor, so a guard
// walks it in a straight line; investigating and chasing use the grid
// pathfinder in guards.js instead.

const LEVELS = [
  {
    name: 'The Reading Room',
    speed: 1.0,
    map: [
      '########################',
      '#P....B......B....A....#',
      '#......................#',
      '#..B.....B......B......#',
      '#......................#',
      '#.####.######.####.....#',
      '#......................#',
      '#..T......B......T.....#',
      '#......................#',
      '#....####.######.###...#',
      '#......................#',
      '#..B.....B......B......#',
      '#..........A...........#',
      '#...................E..#',
      '#......................#',
      '########################',
    ],
    guards: [
      { path: [[3, 6], [20, 6]] },
      { path: [[20, 10], [3, 10]] },
    ],
  },
  {
    name: 'The Stacks',
    speed: 1.1,
    map: [
      '########################',
      '#P..B.....,,.....B..A..#',
      '#......................#',
      '#.B...B...B...B...B....#',
      '#..,,,,...,,,,...,,,,..#',
      '#.####.######.####.....#',
      '#......................#',
      '#.B....T......T....B...#',
      '#......................#',
      '#....####.######.###...#',
      '#......................#',
      '#.B.....,,.....,,....B.#',
      '#......A.......A.......#',
      '#...................E..#',
      '#......................#',
      '########################',
    ],
    guards: [
      { path: [[2, 6], [21, 6]] },
      { path: [[21, 10], [2, 10]] },
      { path: [[22, 2], [22, 13]] },
    ],
  },
  {
    name: 'The Vault',
    speed: 1.25,
    map: [
      '########################',
      '#P..B....T......B...A..#',
      '#..,,,,....,,,,....,,..#',
      '#.B..B..B..B..B..B..B..#',
      '#......................#',
      '#.##.####.####.####....#',
      '#......................#',
      '#.T....B....T....B.....#',
      '#......................#',
      '#...####.####.####.##..#',
      '#......................#',
      '#.B..B..B..B..B..B..B..#',
      '#....A......,......A...#',
      '#...................E..#',
      '#......................#',
      '########################',
    ],
    guards: [
      { path: [[2, 6], [21, 6]] },
      { path: [[21, 10], [2, 10]] },
      { path: [[1, 2], [1, 13]] },
      { path: [[22, 13], [22, 2]] },
    ],
  },
];

// Turn one level's ASCII map into the structures the game uses: a set of
// solid tiles (walls, shelves, crates), a set of shadow tiles, the player's
// start in pixels, the manuscripts, and the exit. Throws on a malformed map
// so a bad level fails loudly at load time instead of mid-game.
function parseLevel(def) {
  const solid = new Set();
  const shadow = new Set();
  const loot = [];
  let start = null;
  let exit = null;
  if (def.map.length !== ROWS) throw new Error('level must have ' + ROWS + ' rows');
  def.map.forEach(function (row, y) {
    if (row.length !== COLS) throw new Error('row ' + y + ' is ' + row.length + ' wide, want ' + COLS);
    for (let x = 0; x < COLS; x++) {
      const ch = row[x];
      const key = x + ',' + y;
      if (ch === '#' || ch === 'B' || ch === 'T') solid.add(key);
      else if (ch === ',') shadow.add(key);
      else if (ch === 'P') start = { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
      else if (ch === 'A') loot.push({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, taken: false });
      else if (ch === 'E') exit = { x: (x + 0.5) * TILE, y: (y + 0.5) * TILE };
      else if (ch !== '.') throw new Error('unknown tile ' + JSON.stringify(ch) + ' at ' + x + ',' + y);
    }
  });
  if (!start) throw new Error('level has no player start');
  if (!exit) throw new Error('level has no exit');
  if (loot.length === 0) throw new Error('level has no manuscripts');
  return { solid: solid, shadow: shadow, loot: loot, start: start, exit: exit };
}

// Is the tile at (tx, ty) walkable? Outside the map counts as solid.
function levelTileWalkable(parsed, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return false;
  return !parsed.solid.has(tx + ',' + ty);
}

// Breadth-first search over walkable tiles. Returns the list of tile
// centres (in pixels) from start to goal, or null when no route exists.
function levelFindPath(parsed, fromTile, toTile) {
  const key = function (x, y) { return x + ',' + y; };
  const prev = new Map();
  const queue = [fromTile];
  prev.set(key(fromTile[0], fromTile[1]), null);
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur[0] === toTile[0] && cur[1] === toTile[1]) break;
    const neighbours = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const d of neighbours) {
      const nx = cur[0] + d[0];
      const ny = cur[1] + d[1];
      if (!levelTileWalkable(parsed, nx, ny)) continue;
      if (prev.has(key(nx, ny))) continue;
      prev.set(key(nx, ny), cur);
      queue.push([nx, ny]);
    }
  }
  if (!prev.has(key(toTile[0], toTile[1]))) return null;
  const path = [];
  let cur = toTile;
  while (cur) {
    path.unshift([(cur[0] + 0.5) * TILE, (cur[1] + 0.5) * TILE]);
    cur = prev.get(key(cur[0], cur[1]));
  }
  return path;
}
