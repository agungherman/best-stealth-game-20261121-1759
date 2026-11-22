// The Silent Stacks — everything the eye sees.
// Canvas 2D, no images and no fonts to load: floorboards, shelves with
// book spines, parchment manuscripts, the green exit, hooded figures and
// lantern cones are all drawn from shapes. A darkness layer (punched
// with light around the thief, the lanterns and the objectives) gives
// the midnight mood, and the HUD and overlays are drawn on the canvas
// too, so a screenshot always shows the whole game.

import { CONFIG } from './config.js';
import { isShadow, isWall } from './levels.js';

const SPINES = ['#7a4a3a', '#4a6a7a', '#6a7a4a', '#8a6a3a', '#5a4a7a', '#a35a4a'];

function hash2(x, y) {
  let h = (x * 73856093) ^ (y * 19349663);
  h = (h ^ (h >> 13)) >>> 0;
  return h;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dark = document.createElement('canvas');
    this.darkCtx = this.dark.getContext('2d');
    this.tile = 40;
    this.ox = 0;
    this.oy = 0;
    this.resize();
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.dark.width = this.canvas.width;
    this.dark.height = this.canvas.height;
    this.darkCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w;
    this.h = h;
    const availH = h - CONFIG.hudHeight - 8;
    this.tile = Math.max(20, Math.floor(Math.min(w / CONFIG.cols, availH / CONFIG.rows)));
    this.ox = Math.floor((w - this.tile * CONFIG.cols) / 2);
    this.oy = CONFIG.hudHeight + Math.floor((availH - this.tile * CONFIG.rows) / 2);
  }

  px(tx) { return this.ox + tx * this.tile; }
  py(ty) { return this.oy + ty * this.tile; }

  screenToTile(sx, sy) {
    const tx = Math.floor((sx - this.ox) / this.tile);
    const ty = Math.floor((sy - this.oy) / this.tile);
    if (tx < 0 || ty < 0 || tx >= CONFIG.cols || ty >= CONFIG.rows) return null;
    return { x: tx, y: ty };
  }

  draw(world) {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.w, this.h);
    ctx.fillStyle = '#0b0d14';
    ctx.fillRect(0, 0, this.w, this.h);
    this.drawFloor(world);
    this.drawExit(world);
    for (const m of world.level.manuscripts) if (!m.taken) this.drawManuscript(m, world.time);
    for (const c of world.coins) this.drawCoin(c);
    for (const w of world.wardens) this.drawCone(world, w);
    this.drawDarkness(world);
    for (const w of world.wardens) this.drawWarden(w);
    this.drawPlayer(world);
    this.drawHud(world);
    if (world.state !== 'playing') this.drawOverlay(world);
  }

  drawFloor(world) {
    const { ctx } = this;
    const level = world.level;
    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const px = this.px(x), py = this.py(y), t = this.tile;
        if (level.grid[y][x] === '#') {
          ctx.fillStyle = '#3a2a18';
          ctx.fillRect(px, py, t, t);
          ctx.fillStyle = '#4a3620';
          ctx.fillRect(px, py, t, 3);
          // Book spines: thin coloured strips, placed by a hash so the
          // shelf looks the same every frame and every run.
          const h = hash2(x, y);
          for (let s = 0; s < 3; s++) {
            ctx.fillStyle = SPINES[(h + s * 7) % SPINES.length];
            const bx = px + 4 + s * ((t - 8) / 3);
            ctx.fillRect(bx, py + 7, (t - 8) / 3 - 2, t - 12);
          }
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.fillRect(px, py + t - 3, t, 3);
        } else {
          const dark = isShadow(level, x, y);
          const checker = (x + y) % 2 === 0;
          ctx.fillStyle = dark ? '#171a26' : (checker ? '#2a2115' : '#241c12');
          ctx.fillRect(px, py, t, t);
          if (dark) {
            ctx.fillStyle = 'rgba(90,110,180,0.10)';
            ctx.fillRect(px + 3, py + 3, t - 6, t - 6);
          }
        }
      }
    }
  }

  drawManuscript(m, time) {
    const { ctx } = this;
    const cx = this.px(m.x + 0.5), cy = this.py(m.y + 0.5);
    const pulse = 0.10 + 0.06 * Math.sin(time * 2.2);
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, this.tile * 0.9);
    g.addColorStop(0, 'rgba(232,217,168,' + pulse.toFixed(3) + ')');
    g.addColorStop(1, 'rgba(232,217,168,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx - this.tile, cy - this.tile, this.tile * 2, this.tile * 2);
    const w = this.tile * 0.42, h = this.tile * 0.52;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.12);
    ctx.fillStyle = '#e8d9a8';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = '#8a7a58';
    ctx.fillRect(-w / 2 + 3, -h / 2 + 5, w - 6, 2);
    ctx.fillRect(-w / 2 + 3, -h / 2 + 10, w - 6, 2);
    ctx.fillRect(-w / 2 + 3, -h / 2 + 15, w - 10, 2);
    ctx.fillStyle = '#a33327';
    ctx.beginPath(); ctx.arc(w / 2 - 4, h / 2 - 4, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  drawExit(world) {
    const { ctx } = this;
    const e = world.level.exit;
    const cx = this.px(e.x + 0.5), cy = this.py(e.y + 0.5);
    const t = this.tile;
    if (world.exitOpen) {
      const pulse = 0.22 + 0.10 * Math.sin(world.time * 3);
      const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, t * 1.3);
      g.addColorStop(0, 'rgba(70,255,140,' + pulse.toFixed(3) + ')');
      g.addColorStop(1, 'rgba(70,255,140,0)');
      ctx.fillStyle = g;
      ctx.fillRect(cx - t * 1.3, cy - t * 1.3, t * 2.6, t * 2.6);
    }
    ctx.fillStyle = world.exitOpen ? '#37d67a' : '#245c33';
    ctx.fillRect(cx - t * 0.30, cy - t * 0.38, t * 0.60, t * 0.76);
    ctx.fillStyle = '#0d1f12';
    ctx.fillRect(cx - t * 0.30, cy - t * 0.38, t * 0.60, 4);
    if (!world.exitOpen) {
      ctx.fillStyle = '#d8c86a';
      ctx.fillRect(cx - 2, cy - 4, 4, 10);
      ctx.beginPath(); ctx.arc(cx, cy - 6, 4, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = '#0d1f12';
      ctx.font = 'bold ' + Math.max(9, Math.floor(t * 0.22)) + 'px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('EXIT', cx, cy - t * 0.48);
    }
  }

  drawCoin(c) {
    const { ctx } = this;
    const cx = this.px(c.x), cy = this.py(c.y);
    ctx.fillStyle = '#e8c33a';
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath(); ctx.arc(cx - 1.5, cy - 1.5, 2, 0, Math.PI * 2); ctx.fill();
  }

  // The lantern cone, raycast against the shelves so light stops at a wall.
  conePolygon(level, w) {
    const pts = [{ x: w.x, y: w.y }];
    const steps = 26;
    for (let i = 0; i <= steps; i++) {
      const a = w.facing - CONFIG.visionHalfAngle + (2 * CONFIG.visionHalfAngle) * (i / steps);
      let r = CONFIG.visionRange;
      for (let d = 0.3; d <= CONFIG.visionRange; d += 0.15) {
        if (isWall(level, w.x + Math.cos(a) * d, w.y + Math.sin(a) * d)) { r = Math.max(0.2, d - 0.15); break; }
      }
      pts.push({ x: w.x + Math.cos(a) * r, y: w.y + Math.sin(a) * r });
    }
    return pts;
  }

  drawCone(world, w) {
    const { ctx } = this;
    const pts = this.conePolygon(world.level, w);
    let fill = 'rgba(255,205,80,0.15)';
    if (w.state === 'chase' || w.suspicion >= 100) fill = 'rgba(255,60,45,0.26)';
    else if (w.suspicion >= CONFIG.suspectAt) fill = 'rgba(255,150,50,0.22)';
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(this.px(pts[0].x), this.py(pts[0].y));
    for (let i = 1; i < pts.length; i++) ctx.lineTo(this.px(pts[i].x), this.py(pts[i].y));
    ctx.closePath();
    ctx.fill();
  }

  drawDarkness(world) {
    const d = this.darkCtx;
    d.clearRect(0, 0, this.w, this.h);
    d.fillStyle = 'rgba(3,5,14,0.80)';
    d.fillRect(0, 0, this.w, this.h);
    d.globalCompositeOperation = 'destination-out';
    const punch = (tx, ty, rTiles, strength) => {
      const cx = this.px(tx), cy = this.py(ty), r = rTiles * this.tile;
      const g = d.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(0,0,0,' + strength + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g;
      d.beginPath(); d.arc(cx, cy, r, 0, Math.PI * 2); d.fill();
    };
    punch(world.player.x, world.player.y, 4.6, 0.96);
    for (const w of world.wardens) punch(w.x, w.y, 2.8, 0.9);
    for (const m of world.level.manuscripts) if (!m.taken) punch(m.x + 0.5, m.y + 0.5, 1.9, 0.75);
    punch(world.level.exit.x + 0.5, world.level.exit.y + 0.5, 2.3, 0.8);
    d.globalCompositeOperation = 'source-over';
    this.ctx.drawImage(this.dark, 0, 0, this.w, this.h);
  }

  drawPlayer(world) {
    const { ctx } = this;
    const p = world.player;
    const cx = this.px(p.x), cy = this.py(p.y);
    const t = this.tile;
    const s = p.sneak ? 0.82 : 1;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(cx, cy + t * 0.30, t * 0.30 * s, t * 0.12 * s, 0, 0, Math.PI * 2); ctx.fill();
    // Cloak: a triangle pointing where the thief faces.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(p.facing);
    ctx.fillStyle = '#2e2e44';
    ctx.beginPath();
    ctx.moveTo(t * 0.34 * s, 0);
    ctx.lineTo(-t * 0.26 * s, -t * 0.26 * s);
    ctx.lineTo(-t * 0.26 * s, t * 0.26 * s);
    ctx.closePath(); ctx.fill();
    ctx.restore();
    // Hood and a shadowed face, with a pale rim so the thief reads
    // against the dark floor.
    ctx.fillStyle = '#3a3a52';
    ctx.beginPath(); ctx.arc(cx, cy, t * 0.24 * s, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(220,210,180,0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, t * 0.24 * s, p.facing - 1.1, p.facing + 1.1);
    ctx.stroke();
    ctx.fillStyle = '#0e0e18';
    ctx.beginPath(); ctx.arc(cx + Math.cos(p.facing) * t * 0.07, cy + Math.sin(p.facing) * t * 0.07, t * 0.13 * s, 0, Math.PI * 2); ctx.fill();
    if (p.sneak) {
      ctx.fillStyle = 'rgba(232,220,180,0.75)';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('sneak', cx, cy - t * 0.36);
    }
  }

  drawWarden(w) {
    const { ctx } = this;
    const cx = this.px(w.x), cy = this.py(w.y);
    const t = this.tile;
    // Lantern glow at the warden's side.
    const lx = cx + Math.cos(w.facing) * t * 0.34;
    const ly = cy + Math.sin(w.facing) * t * 0.34;
    const g = ctx.createRadialGradient(lx, ly, 1, lx, ly, t * 0.7);
    g.addColorStop(0, 'rgba(255,215,106,0.5)');
    g.addColorStop(1, 'rgba(255,215,106,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(lx, ly, t * 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(cx, cy + t * 0.32, t * 0.30, t * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    // Robe.
    ctx.fillStyle = '#4a3a5a';
    ctx.beginPath();
    ctx.moveTo(cx, cy - t * 0.34);
    ctx.lineTo(cx + t * 0.26, cy + t * 0.28);
    ctx.lineTo(cx - t * 0.26, cy + t * 0.28);
    ctx.closePath(); ctx.fill();
    // Hood.
    ctx.fillStyle = '#5d4a70';
    ctx.beginPath(); ctx.arc(cx, cy - t * 0.12, t * 0.20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath(); ctx.arc(lx, ly, 4.5, 0, Math.PI * 2); ctx.fill();
    // '?' while suspicious, '!' while chasing.
    const mark = w.state === 'chase' ? '!' : (w.suspicion >= CONFIG.suspectAt ? '?' : null);
    if (mark) {
      ctx.fillStyle = w.state === 'chase' ? '#ff3c2d' : '#ffb02e';
      ctx.beginPath(); ctx.arc(cx, cy - t * 0.58, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#14090a';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(mark, cx, cy - t * 0.58 + 0.5);
      ctx.textBaseline = 'alphabetic';
    }
  }

  drawHud(world) {
    const { ctx } = this;
    ctx.fillStyle = '#10131c';
    ctx.fillRect(0, 0, this.w, CONFIG.hudHeight);
    ctx.fillStyle = '#2a2f42';
    ctx.fillRect(0, CONFIG.hudHeight - 1, this.w, 1);
    const got = world.level.manuscripts.filter((m) => m.taken).length;
    const total = world.level.manuscripts.length;
    ctx.fillStyle = '#e8e0c8';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Level ' + (world.levelIndex + 1) + ' — ' + world.level.name, 14, 22);
    ctx.font = '14px monospace';
    ctx.fillText('Manuscripts ' + got + '/' + total + '   Coins ' + world.player.coins +
      '   Spotted ' + world.spotted + '   Time ' + fmtTime(world.timer), 14, 43);
    // Detection meter, top right: how close any warden is to raising the alarm.
    const mw = 210, mx = this.w - mw - 16, my = 16;
    ctx.fillStyle = '#e8e0c8';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('SEEN', mx, my + 11);
    ctx.fillStyle = '#1c2030';
    ctx.fillRect(mx + 48, my, mw - 48, 13);
    const d = Math.max(0, Math.min(100, world.detection));
    ctx.fillStyle = d >= 100 ? '#ff3c2d' : (d >= CONFIG.suspectAt ? '#ffb02e' : '#37d67a');
    ctx.fillRect(mx + 48, my, (mw - 48) * (d / 100), 13);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(mx + 48 + (mw - 48) * 0.5, my, 1, 13);
    ctx.fillStyle = '#8a90a8';
    ctx.font = '11px monospace';
    ctx.fillText(Math.round(d) + '%', mx + 48, my + 28);
  }

  drawOverlay(world) {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(5,7,14,0.72)';
    ctx.fillRect(0, 0, this.w, this.h);
    const cx = this.w / 2;
    const cy = this.h / 2 - 20;
    ctx.textAlign = 'center';
    if (world.state === 'menu') {
      ctx.fillStyle = '#e8d9a8';
      ctx.font = 'bold 44px monospace';
      ctx.fillText('THE SILENT STACKS', cx, cy - 70);
      ctx.fillStyle = '#c8b98a';
      ctx.font = '16px monospace';
      ctx.fillText('A midnight theft in the Grand Archive', cx, cy - 38);
      ctx.fillStyle = '#e8e0c8';
      ctx.font = '15px monospace';
      ctx.fillText('Steal every manuscript, then slip out the green door — unseen.', cx, cy + 2);
      ctx.fillText('WASD / arrows move · Shift sneak · E or click toss a coin', cx, cy + 28);
      ctx.fillText('A lantern cone that finds you raises the alarm. Break sight to recover.', cx, cy + 54);
      ctx.fillStyle = '#ffd76a';
      ctx.font = 'bold 17px monospace';
      ctx.fillText('Press Enter or click to begin', cx, cy + 96);
    } else if (world.state === 'caught') {
      ctx.fillStyle = '#ff3c2d';
      ctx.font = 'bold 44px monospace';
      ctx.fillText('CAUGHT!', cx, cy - 30);
      ctx.fillStyle = '#e8e0c8';
      ctx.font = '16px monospace';
      ctx.fillText('A warden laid hands on you in the dark.', cx, cy + 8);
      ctx.fillStyle = '#ffd76a';
      ctx.font = 'bold 17px monospace';
      ctx.fillText('Press R to try this floor again', cx, cy + 52);
    } else if (world.state === 'levelclear') {
      ctx.fillStyle = '#37d67a';
      ctx.font = 'bold 40px monospace';
      ctx.fillText('LEVEL CLEAR', cx, cy - 30);
      ctx.fillStyle = '#e8e0c8';
      ctx.font = '16px monospace';
      ctx.fillText('Every manuscript on this floor is yours.', cx, cy + 8);
      ctx.fillStyle = '#ffd76a';
      ctx.font = 'bold 17px monospace';
      ctx.fillText('Press Enter for the next floor', cx, cy + 52);
    } else if (world.state === 'win') {
      ctx.fillStyle = '#e8d9a8';
      ctx.font = 'bold 38px monospace';
      ctx.fillText('THE ARCHIVE IS YOURS', cx, cy - 40);
      ctx.fillStyle = '#e8e0c8';
      ctx.font = '16px monospace';
      ctx.fillText('All three manuscripts, in ' + fmtTime(world.timer) + ', spotted ' + world.spotted + ' time' + (world.spotted === 1 ? '' : 's') + '.', cx, cy + 0);
      ctx.fillStyle = '#ffd76a';
      ctx.font = 'bold 17px monospace';
      ctx.fillText('Press R to play again', cx, cy + 44);
    }
  }
}

export function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ':' + String(s).padStart(2, '0');
}
