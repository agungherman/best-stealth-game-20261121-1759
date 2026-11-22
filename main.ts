// The Silent Stacks — the hand-in program (Node 22, standard library only).
// The game is this directory's game/ folder: plain static files a desktop
// browser loads offline (game/index.html and its ES modules, no library
// and no network request), plus the screenshots/ the maker took of it.
// This program hands the game in: it copies game/ and screenshots/ from
// beside this file to /output and writes /output/dossier.json, the summary
// the judge reads, with the vendored make.fun library.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Walk a directory and count its files and bytes, so the summary below
// is real instead of guessed.
function summarise(dir) {
  let files = 0, bytes = 0;
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p);
      else { files += 1; bytes += st.size; }
    }
  };
  walk(dir);
  return { files, bytes };
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The gate refuses a screenshot over 256 KiB, so fail loudly here,
// while the maker can still retake it, instead of handing in a
// dossier the scorer would reject.
const shotsDir = join(here, 'screenshots');
if (existsSync(shotsDir)) {
  for (const name of readdirSync(shotsDir)) {
    const p = join(shotsDir, name);
    if (!statSync(p).isFile()) continue;
    const size = statSync(p).size;
    if (size > 262144) throw new Error(`screenshot ${name} is ${size} bytes, over the 256 KiB cap`);
  }
}

// The scorer's own caps: only text_max_bytes shapes the bytes; the others
// refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files in game/ or 48 MiB of game files, in
// all, or a path under game/ over 1000 bytes).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

const game = summarise(join(out, 'game'));
const shots = summarise(join(out, 'screenshots'));
const dossierBytes = statSync(join(out, 'dossier.json')).size;
console.log(`handed in: game/ ${game.files} files, ${game.bytes} bytes; ` +
  `screenshots/ ${shots.files} files, ${shots.bytes} bytes; ` +
  `dossier.json ${dossierBytes} bytes`);
