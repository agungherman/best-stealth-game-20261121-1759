// The Silent Stacks — the game itself.
// Loads a floor, runs the loop, and owns the state machine: menu,
// playing, caught, level clear, win. Wardens and the thief report what
// happens through onEvent, and this file answers: a sting when a warden
// grows suspicious, an alarm and a spotted mark when the chase starts,
// a chime for a manuscript, and a tossed coin pulling the nearest
// warden over to look. ?shot=1..4 stages a frozen scene for screenshots.

import { CONFIG } from './config.js';
import { LEVELS, parseLevel } from './levels.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { Warden } from './guards.js';
import { Player } from './player.js';
import { Renderer } from './render.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.input = new Input();
    this.input.attach(window);
    this.sound = new Sound();
    this.renderer = new Renderer(canvas);
    this.state = 'menu';
    this.levelIndex = 0;
    this.timer = 0;
    this.spotted = 0;
    this.time = 0;
    this.detection = 0;
    this.exitOpen = false;
    this.frozen = false;
    this.coins = [];
    this.loadLevel(0);
    window.addEventListener('resize', () => this.renderer.resize());
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    if (shot) this.applyShot(Number(shot));
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  get level() { return this._level; }

  loadLevel(i) {
    this.levelIndex = i;
    const def = LEVELS[i];
    this._level = parseLevel(def);
    this.player = new Player(this._level.playerStart.x, this._level.playerStart.y);
    this.wardens = def.wardens.map((w) => new Warden(w, this._level, def.speed));
    this.coins = [];
    this.exitOpen = false;
    this.detection = 0;
  }

  screenToTile(sx, sy) { return this.renderer.screenToTile(sx, sy); }

  onEvent(type, data) {
    if (type === 'suspicious') {
      this.sound.sting();
    } else if (type === 'alarm') {
      this.sound.alarm();
      this.spotted += 1;
    } else if (type === 'caught') {
      if (this.state === 'playing') this.state = 'caught';
    } else if (type === 'pickup') {
      this.sound.chime();
      const got = this._level.manuscripts.filter((m) => m.taken).length;
      if (got >= this._level.manuscripts.length) this.exitOpen = true;
    } else if (type === 'coin') {
      this.sound.coin();
      this.coins.push({ x: data.x, y: data.y });
      // The nearest warden in earshot walks over to look at the coin.
      let best = null, bestD = Infinity;
      for (const w of this.wardens) {
        const d = Math.hypot(w.x - data.x, w.y - data.y);
        if (d < bestD) { bestD = d; best = w; }
      }
      if (best && bestD <= CONFIG.coinLureRadius && best.state !== 'chase') {
        best.state = 'investigate';
        best.target = { x: data.x, y: data.y };
        best.lookTime = 0;
        best.planPathTo({ x: Math.floor(data.x), y: Math.floor(data.y) });
      }
    } else if (type === 'footstep') {
      const dx = data.x - this.player.x;
      const dist = Math.hypot(data.x - this.player.x, data.y - this.player.y);
      this.sound.footstep(Math.max(-1, Math.min(1, dx / 6)), Math.max(0, 1 - dist / 12) * 0.45);
    } else if (type === 'playerstep') {
      this.sound.footstep(0, 0.07);
    }
  }

  update(dt) {
    if (this.state !== 'playing' || this.frozen) return;
    this.timer += dt;
    this.time += dt;
    this.player.update(dt, this.input, this._level, this);
    for (const w of this.wardens) w.update(dt, this);
    this.detection = this.wardens.reduce((m, w) => Math.max(m, w.suspicion), 0);
    // All manuscripts in hand and the thief at the green door: floor done.
    if (this.exitOpen) {
      const e = this._level.exit;
      if (Math.hypot(e.x + 0.5 - this.player.x, e.y + 0.5 - this.player.y) <= CONFIG.exitDistance) {
        if (this.levelIndex >= LEVELS.length - 1) {
          this.state = 'win';
          this.sound.win();
        } else {
          this.state = 'levelclear';
        }
      }
    }
    // Menu and overlay keys are handled in handleOverlays, which runs
    // every frame; this update only runs while the game is being played.
  }

  handleOverlays() {
    if (this.state === 'menu' && (this.input.justPressed('Enter') || this.input.takeClick())) {
      this.sound.ensure();
      this.state = 'playing';
    } else if (this.state === 'levelclear' && this.input.justPressed('Enter')) {
      this.loadLevel(this.levelIndex + 1);
      this.state = 'playing';
    } else if (this.state === 'caught' && this.input.justPressed('KeyR')) {
      this.loadLevel(this.levelIndex);
      this.state = 'playing';
    } else if (this.state === 'win' && this.input.justPressed('KeyR')) {
      this.timer = 0;
      this.spotted = 0;
      this.loadLevel(0);
      this.state = 'playing';
    }
    if (this.input.gesture) this.sound.ensure();
  }

  loop(t) {
    const dt = Math.min(0.05, Math.max(0, (t - this.last) / 1000));
    this.last = t;
    this.handleOverlays();
    this.update(dt);
    this.renderer.draw(this);
    this.input.endFrame();
    requestAnimationFrame((nt) => this.loop(nt));
  }

  // Stage a frozen scene for a screenshot. Positions are fixed, the
  // clock is stopped, and nothing moves, so the render is identical
  // every time it is taken.
  applyShot(n) {
    this.frozen = true;
    this.time = 1.0;
    this.state = 'playing';
    const place = (w, x, y, facing, suspicion, state) => {
      w.x = x; w.y = y; w.facing = facing;
      w.suspicion = suspicion; w.state = state; w.path = [];
    };
    if (n === 1) {
      // Cover: the Reading Room, wardens on patrol, cones sweeping.
      this.loadLevel(0);
      this.player.x = 4.5; this.player.y = 2.5; this.player.facing = 0;
      place(this.wardens[0], 10.5, 3.5, 0, 0, 'patrol');
      place(this.wardens[1], 15.5, 10.5, Math.PI, 0, 'patrol');
    } else if (n === 2) {
      // Near miss: sneaking in the Stacks aisle, a cone on the thief,
      // the meter at 62 and a '?' over the warden.
      this.loadLevel(1);
      this.player.x = 8.5; this.player.y = 7.5; this.player.facing = 0; this.player.sneak = true;
      place(this.wardens[0], 12.5, 7.5, Math.PI, 62, 'investigate');
      place(this.wardens[1], 6.5, 13.5, -Math.PI / 2, 0, 'patrol');
      place(this.wardens[2], 15.5, 2.5, Math.PI / 2, 0, 'patrol');
      this.detection = 62;
    } else if (n === 3) {
      // Alarm: the cone is red, the warden is chasing, the thief is
      // two steps from the green door.
      this.loadLevel(1);
      this._level.manuscripts[0].taken = true;
      this._level.manuscripts[1].taken = true;
      this.player.x = 12.5; this.player.y = 11.5; this.player.facing = Math.PI / 2;
      place(this.wardens[0], 14.5, 11.5, Math.PI, 100, 'chase');
      place(this.wardens[1], 4.5, 13.5, 0, 30, 'patrol');
      place(this.wardens[2], 9.5, 2.5, Math.PI / 2, 0, 'patrol');
      this.detection = 100;
      this.spotted = 1;
    } else {
      // Finale: the Vault, every manuscript taken, the exit open and
      // the thief stepping through the green door.
      this.loadLevel(2);
      for (const m of this._level.manuscripts) m.taken = true;
      this.exitOpen = true;
      this.player.x = 12.5; this.player.y = 13.5; this.player.facing = -Math.PI / 2;
      place(this.wardens[0], 10.5, 2.5, 0, 0, 'patrol');
      place(this.wardens[1], 4.5, 13.5, 0, 0, 'patrol');
      place(this.wardens[2], 20.5, 13.5, Math.PI, 0, 'patrol');
      place(this.wardens[3], 12.5, 7.5, -Math.PI / 2, 0, 'patrol');
      this.timer = 187;
    }
  }

  // Test helpers, used by the maker's own playtests.
  debugWarp(x, y) { this.player.x = x; this.player.y = y; }
  debugCollectAll() {
    for (const m of this._level.manuscripts) m.taken = true;
    this.exitOpen = true;
  }
  debugSetLevel(i) { this.loadLevel(i); this.state = 'playing'; }
}

const canvas = document.getElementById('game');
const game = new Game(canvas);
// The maker's playtests drive the game through this handle.
window.__stealth = game;
