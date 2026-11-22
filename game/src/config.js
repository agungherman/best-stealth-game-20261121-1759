// The Silent Stacks — tuning constants. One place for every number the
// game balances on, so a level or a mechanic can be retuned without hunting
// through the logic files.

const TILE = 40;               // pixels per map tile
const COLS = 24;               // map width in tiles
const ROWS = 16;               // map height in tiles
const VIEW_W = COLS * TILE;    // 960
const VIEW_H = ROWS * TILE;    // 640

// Player speeds, pixels per second.
const PLAYER_WALK_SPEED = 170;
const PLAYER_SNEAK_SPEED = 95;

// Guard speeds, pixels per second.
const GUARD_PATROL_SPEED = 72;
const GUARD_INVESTIGATE_SPEED = 112;
const GUARD_CHASE_SPEED = 176;
const GUARD_PAUSE_SECONDS = 1.6;   // wait at each patrol waypoint

// Vision: how far a warden's lantern reaches, and how wide its cone is.
const GUARD_SIGHT_RANGE = 225;
const GUARD_SIGHT_HALF_ANGLE = 0.66; // radians, about 38 degrees

// Detection: 0..100. Reaching 100 raises the alarm.
const DETECT_BASE_RATE = 58;      // per second, point blank, walking in light
const DETECT_FAR_FLOOR = 14;      // per second, at the edge of the cone
const DETECT_SNEAK_FACTOR = 0.55; // sneaking is harder to notice
const DETECT_SHADOW_FACTOR = 0.35;// standing in shadow is harder to notice
const DETECT_STILL_FACTOR = 0.8;  // standing still draws less attention
const DETECT_DECAY_RATE = 30;     // per second while unseen
const SUSPICIOUS_AT = 50;         // detection at which a warden investigates
const CHASE_LOSE_SECONDS = 2.5;   // unseen this long ends a chase
const INVESTIGATE_LOOK_SECONDS = 2.0;

// The coin: a thrown distraction.
const COIN_RANGE_TILES = 6;       // how far a coin can be tossed
const COIN_HEAR_TILES = 8;        // wardens within this many tiles come to look
const COINS_PER_LEVEL = 3;

// Catching: a chasing warden this close ends the level.
const CATCH_DISTANCE = 20;

// Colours.
const COLOR_FLOOR = '#23232e';
const COLOR_FLOOR_ALT = '#262633';
const COLOR_SHADOW_FLOOR = '#171724';
const COLOR_WALL = '#3d3a52';
const COLOR_WALL_TOP = '#4d4a68';
const COLOR_SHELF = '#4a3220';
const COLOR_SHELF_TOP = '#6b4a2e';
const COLOR_CRATE = '#5c4a2a';
const COLOR_CRATE_TOP = '#7a6338';
const COLOR_EXIT = '#37d67a';
const COLOR_LOOT = '#f2c94c';
const COLOR_PLAYER = '#e8e2d0';
const COLOR_GUARD = '#d95f4b';
const COLOR_CONE_CALM = 'rgba(242, 201, 76, 0.20)';
const COLOR_CONE_SUSPICIOUS = 'rgba(242, 160, 60, 0.30)';
const COLOR_CONE_ALARM = 'rgba(217, 95, 75, 0.34)';
