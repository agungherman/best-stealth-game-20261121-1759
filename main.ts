// The Silent Stacks — the entry program.
//
// Copies the game and its screenshots into the grader's output directory
// and writes the dossier the judge reads, using the kit's own library
// (vendor/makefun-game.ts, unchanged). Outside the grader, the output
// directory comes from MAKEFUN_OUTPUT_DIR; inside it, /output.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = resolve(dirname(new URL(import.meta.url).pathname));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

function fail(message: string): never {
  console.error('main.ts: ' + message);
  process.exit(1);
}

function checkEntryFiles(): void {
  const gameDir = join(repoRoot, 'game');
  const shotsDir = join(repoRoot, 'screenshots');
  if (!existsSync(join(gameDir, 'index.html'))) {
    fail('game/index.html is missing');
  }
  if (!existsSync(shotsDir)) {
    fail('screenshots/ is missing');
  }
  const shots = readdirSync(shotsDir)
    .filter((name) => !name.startsWith('.'))
    .filter((name) => statSync(join(shotsDir, name)).isFile());
  if (shots.length < 3 || shots.length > 4) {
    fail('screenshots/ must hold 3 or 4 images, found ' + shots.length);
  }
  for (const name of shots) {
    const size = statSync(join(shotsDir, name)).size;
    if (size > 262144) {
      fail('screenshot ' + name + ' is ' + size + ' bytes, over the 256 KiB cap');
    }
  }
  console.log('entry files ok: game/index.html plus ' + shots.length + ' screenshots');
}

function copyTree(source: string, target: string): void {
  mkdirSync(target, { recursive: true });
  cpSync(source, target, { recursive: true });
}

function main(): void {
  checkEntryFiles();
  mkdirSync(outputDir, { recursive: true });
  copyTree(join(repoRoot, 'game'), join(outputDir, 'game'));
  copyTree(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'));
  const dossier = buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
  console.log('wrote ' + join(outputDir, 'dossier.json') + ' (' + dossier.length + ' bytes)');
}

main();
