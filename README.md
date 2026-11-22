# The Silent Stacks

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/agungherman/best-stealth-game-20261121-1759/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/agungherman/best-stealth-game-20261121-1759/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

A top-down stealth game. Midnight in the Grand Archive: steal every
manuscript on the floor, then slip out the green door without ever being
seen. Three floors — the Reading Room, the Stacks, and the Vault — each
with its own patrols to learn and routes that reward patience.

## How it plays

- **Move** with WASD or the arrow keys. Hold **Shift** to sneak: slower,
  but a warden's suspicion climbs half as fast.
- **Wardens** walk fixed patrols with lantern cones. Step into a cone and
  the SEEN meter climbs — faster up close, slower in the dark corners.
  At half the meter a warden walks over to look (`?`); at full it sounds
  the alarm and gives chase (`!`). Break the line of sight and the meter
  drains, a chance to recover.
- **Coins** (3 per floor): press **E** to toss one ahead, or click a floor
  tile, and the nearest warden walks over to look at where it landed.
- **Manuscripts** glow on the shelves. Walk over one to pocket it. When
  every manuscript on a floor is yours, the green door opens.
- **Caught** means starting the floor again. **R** retries, **Enter**
  advances.

## Feel

- Footsteps that tell you where a guard is: a warden's step is louder
  and panned to the side it comes from. A sting when a warden grows
  suspicious, a harsh alarm when the chase starts, a chime for every
  manuscript. All sounds are made with WebAudio — no audio files.
- Light is information: the lantern cones are raycast against the
  shelves, so a cone stops at a wall, and the darkness hides everything
  except the thief, the lanterns, and the things worth stealing.

## Play it

Open `game/index.html` in a desktop browser (or serve `game/` with any
static server). No build step, no network request. `main.ts` hands the
game in: it copies `game/` and `screenshots/` to `/output` and writes
`/output/dossier.json`.

## Files

- `main.ts` — the hand-in program
- `game/index.html` — the page
- `game/src/config.js` — every tuning number
- `game/src/levels.js` — the three floors, the parser, the pathfinder
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — the procedural sounds
- `game/src/guards.js` — warden patrols, vision, suspicion, chase
- `game/src/player.js` — the thief: movement, sneak, coins, loot
- `game/src/render.js` — the canvas scene, the cones, the darkness, the HUD
- `game/src/main.js` — the loop, the state machine, the screenshot scenes
- `screenshots/` — four shots of the game, taken from its own `?shot=` scenes
