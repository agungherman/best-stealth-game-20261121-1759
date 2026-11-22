// The Silent Stacks — the night wardens.
//
// A warden patrols a fixed route, lantern sweeping. Its state machine:
//   patrol     walk the waypoints, pausing at each
//   suspicious move to where it last glimpsed you, then look around
//   chase      run at you once the alarm is raised
//   return     walk back to the patrol route and resume
//
// Detection is a meter per warden, 0..100. It rises while you stand inside
// its lantern cone with a clear line of sight, faster the closer you are,
// slower while you sneak or stand in shadow; it drains while you are unseen.
// At 50 the warden grows suspicious and comes to look. At 100 it raises the
// alarm and chases. Break line of sight and the chase ends; the meter
// falls back, so a near miss is a scare, not a sentence.

function guardMake(def, speedMul) {
  const path = def.path.map(function (p) {
    return { x: (p[0] + 0.5) * TILE, y: (p[1] + 0.5) * TILE };
  });
  const first = path[0];
  const second = path[1] || path[0];
  return {
    path: path,
    waypoint: 1,
    x: first.x,
    y: first.y,
    angle: Math.atan2(second.y - first.y, second.x - first.x),
    speedMul: speedMul,
    state: 'patrol',
    pause: 0,
    detection: 0,
    lastSeen: null,
    lookTimer: 0,
    unseenTimer: 0,
    route: null,      // pathfinder route (list of pixel points) when leaving patrol
    routeIndex: 0,
    stepPhase: Math.random() * Math.PI * 2,
    wasSuspicious: false,
    wasAlarmed: false,
  };
}

// True when a straight line between two points crosses no solid tile.
// Samples the line every 8 pixels: cheap, and exact enough for a cone.
function guardLineOfSight(parsed, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const tx = Math.floor((x0 + dx * t) / TILE);
    const ty = Math.floor((y0 + dy * t) / TILE);
    if (parsed.solid.has(tx + ',' + ty)) return false;
  }
  return true;
}

// Can this warden see the player right now? Inside the cone, in range,
// with a clear line of sight.
function guardCanSee(parsed, guard, px, py) {
  const dx = px - guard.x;
  const dy = py - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD_SIGHT_RANGE) return false;
  if (dist < 12) return true; // stepped on by the player: no hiding that
  const toPlayer = Math.atan2(dy, dx);
  let diff = toPlayer - guard.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  if (Math.abs(diff) > GUARD_SIGHT_HALF_ANGLE) return false;
  return guardLineOfSight(parsed, guard.x, guard.y, px, py);
}

// How fast detection rises while this warden sees the player.
function guardDetectionRate(guard, px, py, sneaking, inShadow, moving) {
  const dist = Math.hypot(px - guard.x, py - guard.y);
  const near = 1 - Math.min(1, dist / GUARD_SIGHT_RANGE);
  let rate = DETECT_FAR_FLOOR + (DETECT_BASE_RATE - DETECT_FAR_FLOOR) * near;
  if (sneaking) rate *= DETECT_SNEAK_FACTOR;
  if (inShadow) rate *= DETECT_SHADOW_FACTOR;
  if (!moving) rate *= DETECT_STILL_FACTOR;
  return rate;
}

// Walk toward a point at a speed; returns true on arrival.
function guardStepToward(guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  const step = speed * dt;
  if (dist <= step) {
    guard.x = tx;
    guard.y = ty;
    return true;
  }
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  guard.angle = Math.atan2(dy, dx);
  return false;
}

// Follow a pathfinder route; returns true when the route is finished.
function guardFollowRoute(guard, speed, dt) {
  if (!guard.route || guard.routeIndex >= guard.route.length) return true;
  const target = guard.route[guard.routeIndex];
  if (guardStepToward(guard, target[0], target[1], speed, dt)) {
    guard.routeIndex++;
  }
  return guard.routeIndex >= guard.route.length;
}

// Ask the grid pathfinder for a route to a tile; falls back to a straight
// walk when no route exists (the warden then bumps along the wall).
function guardRouteTo(parsed, guard, tileX, tileY) {
  const from = [Math.floor(guard.x / TILE), Math.floor(guard.y / TILE)];
  const path = levelFindPath(parsed, from, [tileX, tileY]);
  guard.route = path;
  guard.routeIndex = 0;
}

// One warden, one frame. Returns 'alarm' the moment the alarm is raised,
// 'suspicious' when the warden first grows suspicious, otherwise null.
// `events` collects caught/alarm signals for the game loop.
function guardUpdate(parsed, guard, player, dt, events) {
  const sees = guardCanSee(parsed, guard, player.x, player.y);
  const inShadow = parsed.shadow.has(
    Math.floor(player.x / TILE) + ',' + Math.floor(player.y / TILE)
  );
  const moving = player.moving;

  if (sees) {
    guard.detection += guardDetectionRate(
      guard, player.x, player.y, player.sneaking, inShadow, moving
    ) * dt;
    guard.lastSeen = { x: player.x, y: player.y };
    guard.unseenTimer = 0;
  } else {
    guard.detection = Math.max(0, guard.detection - DETECT_DECAY_RATE * dt);
    guard.unseenTimer += dt;
  }
  if (guard.detection > 100) guard.detection = 100;

  if (guard.detection >= 100 && guard.state !== 'chase') {
    guard.state = 'chase';
    guard.route = null;
    if (!guard.wasAlarmed) {
      guard.wasAlarmed = true;
      events.push('alarm');
    }
  } else if (guard.detection >= SUSPICIOUS_AT && guard.state === 'patrol') {
    guard.state = 'suspicious';
    if (guard.lastSeen) {
      guardRouteTo(parsed, guard,
        Math.floor(guard.lastSeen.x / TILE), Math.floor(guard.lastSeen.y / TILE));
    }
    if (!guard.wasSuspicious) {
      guard.wasSuspicious = true;
      events.push('suspicious');
    }
  }
  if (guard.detection < SUSPICIOUS_AT - 5) guard.wasSuspicious = false;
  if (guard.detection < 40) guard.wasAlarmed = false;

  const speed = function (base) { return base * guard.speedMul; };

  if (guard.state === 'patrol') {
    if (sees) {
      // The warden has noticed something: it stops and watches the figure
      // in its lantern light instead of walking on past. Standing in the
      // open in front of a warden is dangerous; break line of sight.
      guard.angle = Math.atan2(player.y - guard.y, player.x - guard.x);
    } else if (guard.pause > 0) {
      guard.pause -= dt;
    } else {
      const target = guard.path[guard.waypoint];
      if (guardStepToward(guard, target.x, target.y, speed(GUARD_PATROL_SPEED), dt)) {
        guard.waypoint = (guard.waypoint + 1) % guard.path.length;
        guard.pause = GUARD_PAUSE_SECONDS;
      }
    }
  } else if (guard.state === 'suspicious') {
    if (guardFollowRoute(guard, speed(GUARD_INVESTIGATE_SPEED), dt)) {
      guard.lookTimer += dt;
      // Sweep the lantern while looking around.
      guard.angle += dt * 1.4;
      if (guard.lookTimer > INVESTIGATE_LOOK_SECONDS) {
        guard.lookTimer = 0;
        guard.state = 'return';
        const nearest = guardNearestWaypoint(guard);
        guardRouteTo(parsed, guard,
          Math.floor(nearest.x / TILE), Math.floor(nearest.y / TILE));
      }
    } else {
      guard.lookTimer = 0;
    }
  } else if (guard.state === 'chase') {
    guardRouteTo(parsed, guard,
      Math.floor(player.x / TILE), Math.floor(player.y / TILE));
    if (guardFollowRoute(guard, speed(GUARD_CHASE_SPEED), dt)) {
      // The route ends at the player's tile, not the player: close the
      // last few pixels directly, or a warden would stop one step short.
      guardStepToward(guard, player.x, player.y, speed(GUARD_CHASE_SPEED), dt);
    }
    if (!sees && guard.unseenTimer > CHASE_LOSE_SECONDS) {
      guard.state = 'return';
      guard.detection = 40;
      const nearest = guardNearestWaypoint(guard);
      guardRouteTo(parsed, guard,
        Math.floor(nearest.x / TILE), Math.floor(nearest.y / TILE));
    }
    if (Math.hypot(player.x - guard.x, player.y - guard.y) < CATCH_DISTANCE) {
      events.push('caught');
    }
  } else if (guard.state === 'return') {
    if (guardFollowRoute(guard, speed(GUARD_INVESTIGATE_SPEED), dt)) {
      guard.state = 'patrol';
      guard.waypoint = guardNearestWaypointIndex(guard);
      guard.pause = 0;
    }
  }

  // Footsteps: a soft tick each half-step, louder the closer the warden.
  guard.stepPhase += dt * speed(GUARD_PATROL_SPEED) * 0.09;
  if (guard.stepPhase > Math.PI) {
    guard.stepPhase -= Math.PI * 2;
    const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
    if (dist < 320) {
      audioFootstep(1 - dist / 320, (guard.x - player.x) / 320);
    }
  }

  return guard.state;
}

function guardNearestWaypoint(guard) {
  let best = guard.path[0];
  let bestD = Infinity;
  for (const p of guard.path) {
    const d = Math.hypot(p.x - guard.x, p.y - guard.y);
    if (d < bestD) { bestD = d; best = p; }
  }
  return best;
}

function guardNearestWaypointIndex(guard) {
  let best = 0;
  let bestD = Infinity;
  guard.path.forEach(function (p, i) {
    const d = Math.hypot(p.x - guard.x, p.y - guard.y);
    if (d < bestD) { bestD = d; best = i; }
  });
  return best;
}
