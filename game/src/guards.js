// The Silent Stacks — the wardens.
// A warden walks a fixed loop of waypoints with a lantern cone. It cannot
// see through shelves. When it sees the thief its suspicion climbs —
// faster up close and in the middle of the cone, slower when the thief
// sneaks or hides in shadow. At half suspicion it walks over to look;
// at full suspicion it sounds the alarm and gives chase. Break the line
// of sight and suspicion drains away, a chance to recover.

import { CONFIG } from './config.js';
import { bfsPath, hasSight, isShadow } from './levels.js';

// Is the player inside this warden's cone, with a clear line of sight?
// Returns null when unseen, otherwise the distance and how far off the
// cone's centre the player is (0 = dead centre, 1 = at the edge).
export function coneCheck(level, warden, player) {
  const dx = player.x - warden.x, dy = player.y - warden.y;
  const dist = Math.hypot(dx, dy);
  if (dist > CONFIG.visionRange) return null;
  let angleOff = Math.abs(angleDiff(Math.atan2(dy, dx), warden.facing));
  if (angleOff > CONFIG.visionHalfAngle) return null;
  if (!hasSight(level, warden.x, warden.y, player.x, player.y)) return null;
  return { dist, angleOff: angleOff / CONFIG.visionHalfAngle };
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class Warden {
  constructor(def, level, speedMult) {
    const start = def.waypoints[0];
    this.x = start.x + 0.5;
    this.y = start.y + 0.5;
    this.waypoints = def.waypoints;
    this.wpIndex = 1 % def.waypoints.length;
    this.level = level;
    this.speedMult = speedMult;
    this.state = 'patrol'; // patrol | investigate | chase | return
    this.suspicion = 0;
    this.facing = 0;
    this.path = [];
    this.lookTime = 0;
    this.chaseTimer = 0;
    this.repathTimer = 0;
    this.target = null;
    this.tileKey = Math.floor(this.x) + ',' + Math.floor(this.y);
    this.planPathTo(this.waypoints[this.wpIndex]);
    if (this.path.length > 0) {
      const n = this.path[0];
      this.facing = Math.atan2(n.y - this.y, n.x - this.x);
    }
  }

  planPathTo(cell) {
    const p = bfsPath(this.level, this.x, this.y, cell.x, cell.y);
    this.path = p || [];
  }

  nearestWaypointIndex() {
    let best = 0, bestD = Infinity;
    this.waypoints.forEach((w, i) => {
      const d = Math.hypot(w.x + 0.5 - this.x, w.y + 0.5 - this.y);
      if (d < bestD) { bestD = d; best = i; }
    });
    return best;
  }

  // Walk the current path at the given speed. Returns true on arrival.
  followPath(dt, speed) {
    if (this.path.length === 0) return true;
    const node = this.path[0];
    const dx = node.x - this.x, dy = node.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = speed * dt;
    if (dist <= Math.max(step, 0.06)) {
      this.x = node.x; this.y = node.y;
      this.path.shift();
      return this.path.length === 0;
    }
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    this.facing = Math.atan2(dy, dx);
    return false;
  }

  update(dt, world) {
    const { level, player } = world;
    const seen = coneCheck(level, this, player);
    if (seen) {
      this.lastSeen = { x: player.x, y: player.y };
      this.chaseTimer = 0;
      // Suspicion climbs with closeness and centrality, and is softened
      // when the thief sneaks or hides in a dark corner.
      const distF = 1 - seen.dist / CONFIG.visionRange;
      const angF = 1 - seen.angleOff;
      let rate = CONFIG.detectFar + (CONFIG.detectClose - CONFIG.detectFar) * distF * angF;
      if (player.sneak) rate *= CONFIG.sneakMult;
      if (isShadow(level, player.x, player.y)) rate *= CONFIG.shadowMult;
      const before = this.suspicion;
      this.suspicion = Math.min(100, this.suspicion + rate * dt);
      this.facing = Math.atan2(player.y - this.y, player.x - this.x);
      if (before < CONFIG.suspectAt && this.suspicion >= CONFIG.suspectAt && this.state === 'patrol') {
        this.state = 'investigate';
        this.target = { ...this.lastSeen };
        this.planPathTo(this.target);
        world.onEvent('suspicious', this);
      }
      if (before < CONFIG.alarmAt && this.suspicion >= CONFIG.alarmAt && this.state !== 'chase') {
        this.state = 'chase';
        this.repathTimer = 0;
        world.onEvent('alarm', this);
      }
      if (this.state === 'investigate') this.target = { ...this.lastSeen };
    } else {
      this.suspicion = Math.max(0, this.suspicion - CONFIG.decay * dt);
      if (this.state === 'chase') {
        this.chaseTimer += dt;
        if (this.chaseTimer >= CONFIG.chaseGiveUp) {
          this.state = 'return';
          this.suspicion = 40;
          this.wpIndex = this.nearestWaypointIndex();
          this.planPathTo(this.waypoints[this.wpIndex]);
        }
      }
    }

    const speed = CONFIG.wardenPatrol * this.speedMult;
    if (this.state === 'patrol') {
      if (seen) {
        // Stop and stare: a warden that sees the thief does not walk past.
      } else if (this.followPath(dt, speed)) {
        this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
        this.planPathTo(this.waypoints[this.wpIndex]);
      }
    } else if (this.state === 'investigate') {
      if (this.followPath(dt, CONFIG.wardenInvestigate * this.speedMult)) {
        // Arrived: stand and look around for a while.
        this.lookTime += dt;
        this.facing += dt * 1.4;
        if (this.lookTime >= CONFIG.investigateTime) {
          this.lookTime = 0;
          this.state = 'return';
          this.wpIndex = this.nearestWaypointIndex();
          this.planPathTo(this.waypoints[this.wpIndex]);
        }
      } else {
        this.lookTime = 0;
      }
    } else if (this.state === 'chase') {
      this.repathTimer -= dt;
      if (this.repathTimer <= 0) {
        this.repathTimer = CONFIG.repathEvery;
        this.planPathTo({ x: Math.floor(player.x), y: Math.floor(player.y) });
      }
      this.followPath(dt, CONFIG.wardenChase * this.speedMult);
      if (Math.hypot(player.x - this.x, player.y - this.y) <= CONFIG.catchDistance) {
        world.onEvent('caught', this);
      }
    } else if (this.state === 'return') {
      if (this.followPath(dt, speed)) {
        this.state = 'patrol';
        this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
        this.planPathTo(this.waypoints[this.wpIndex]);
      }
    }

    // A footstep each time the warden crosses into a new tile.
    const key = Math.floor(this.x) + ',' + Math.floor(this.y);
    if (key !== this.tileKey) {
      this.tileKey = key;
      world.onEvent('footstep', this);
    }
  }
}
