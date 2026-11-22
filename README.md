# The Silent Stacks

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

A top-down stealth game for make.fun's **best stealth game** bounty. Night has
fallen on the Grand Archive: steal every rare manuscript and reach the green
door without ever being seen.

## Play

Open `game/index.html` in a desktop browser (no build step, no network).
Serve the `game/` folder with any static server, or just open the file.

- **Move:** WASD / arrow keys
- **Sneak:** hold Shift (slower, quieter, harder to spot)
- **Toss a coin:** E or mouse click — the nearest warden comes to look at it
- **Goal:** take every manuscript, then reach the green exit door

Wardens patrol fixed rounds with lantern cones. Stand inside a cone with a
clear line of sight and the detection ring fills — faster up close, slower
while you sneak or stand in shadow. At half, a warden comes to investigate
(`?`). At full, it chases you (`!`). Break line of sight and suspicion fades,
so a near miss is a scare, not a sentence. Footsteps grow louder as a warden
draws near.

Three levels: **The Reading Room**, **The Stacks**, and **The Vault** — more
wardens, faster patrols, and tighter cover as the night goes on.

## Structure

- `game/index.html` — the page, HUD, and overlays
- `game/src/config.js` — every tuning number in one place
- `game/src/levels.js` — the three maps, the parser, and the pathfinder
- `game/src/input.js` — keyboard and mouse state
- `game/src/audio.js` — procedural WebAudio sound (no audio files)
- `game/src/guards.js` — warden patrol, vision, and detection
- `game/src/player.js` — movement, sneaking, coins, and pickups
- `game/src/render.js` — the canvas: floor, cones, wardens, thief, darkness
- `game/src/main.js` — the loop, the state machine, and screenshot mode
- `main.ts` — copies the game and screenshots to `/output` and writes the dossier
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

Screenshots: `?shot=1..4` poses a frozen frame of the game (the cover, a
near miss, the alarm, and the ending) — the same rendering code, a staged
moment.

## License

MIT — see `LICENSE`.
