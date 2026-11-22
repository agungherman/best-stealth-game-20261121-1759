// The Silent Stacks — tuning numbers. Every speed, range and rate the game
// uses lives here, so a balance change is one edit, not a hunt through files.

export const CONFIG = {
  cols: 24,
  rows: 16,
  hudHeight: 54,

  // Movement, in tiles per second.
  playerWalk: 3.4,
  playerSneak: 1.8,
  wardenPatrol: 1.55,
  wardenInvestigate: 2.15,
  wardenChase: 2.65,
  vaultPatrolMult: 1.25,

  // A warden's lantern cone.
  visionRange: 5.6,
  visionHalfAngle: 0.61, // ~35 degrees each side of the facing direction

  // Detection 0..100. How fast suspicion climbs while the player is seen.
  detectClose: 46, // at the warden's feet, centre of the cone
  detectFar: 10, // at the cone's far edge
  sneakMult: 0.55, // holding Shift while seen
  shadowMult: 0.5, // standing on a dark tile while seen
  decay: 26, // suspicion lost per second out of sight
  suspectAt: 50, // warden walks over to look
  alarmAt: 100, // warden sounds the alarm and chases

  // Warden behaviour timers, in seconds.
  chaseGiveUp: 2.6, // no sight for this long and the chase is called off
  investigateTime: 2.2, // seconds spent looking at a spot
  repathEvery: 0.35, // how often a chasing warden re-plans its route

  // Coins: the player's distraction. Toss one and the nearest warden
  // within lure radius walks over to look at where it landed.
  coinsPerLevel: 3,
  coinThrow: 4, // tiles ahead of the player when thrown with E
  coinClickRange: 5, // how far a clicked tile may be from the player
  coinLureRadius: 9, // wardens further away ignore a tossed coin

  catchDistance: 0.55, // warden this close to the player means caught
  pickupDistance: 0.55, // walk this close to a manuscript to take it
  exitDistance: 0.65, // reach the open exit from this close to leave

  playerRadius: 0.32,
  wardenRadius: 0.34,
};
