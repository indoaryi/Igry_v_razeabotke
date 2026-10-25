  // ================= a body: what every person in the world is made of — the hero and everybody else alike =================
  // Where he stands and which way he looks, his way (path) and the orders still to do (queue), his gait, sitting, the head turned
  // off the body's line, what his hands are busy with (overlays), the activity that owns him for a while, his look and what he wears.
  // The player steers one body (hero.js: hero, stepped by state.js); the people module gives the others their minds (people.js).
  // Both step a body with the same pieces below and pose it the same way (rig.js: bodyRig), so any body can be either:
  // control can pass from one to another, and a thing anyone wears is put on the same way.
  import { approach } from '../core/math.js';
  import { groundY } from '../world/instances.js';
  import { buildPerson, dress, WEAR } from './look.js';
  import { DRINK_INTRO, DRINK_PERIOD, DRINK_SIPS, SHOOT_LEN, SHOTS, SMOKE_INTRO, SMOKE_PERIOD, SMOKE_PUFFS, THROW_LEN, THROW_REL } from './skeleton.js';
  // overlays are things he does with his hands while standing, walking or sitting: on — wanted, w — how far the pose has blended in,
  // t — time since it began; each blends in at its own pace
  const BLEND = { smoke: 4, drink: 4, punch: 4, shoot: 8, thr: 6, reach: 6, talk: 4 };
  export const OVERLAYS = Object.keys(BLEND);
  // how fast he walks and runs, m/s, lightly dressed and in heavy kit (people's own; the hero has his, hero.js)
  export const PACE = { walk: 1.38, run: 3.2, walkHeavy: 1.3, runHeavy: 3.2 };
  // a new body; o — what is his own: where he stands, his look, what he wears (gear: { body, head, hands }), his pace,
  // turn (how fast he turns on the spot), speedK (a factor on his pace)
  export function newBody(o) {
    return Object.assign({
      x: 0, z: 0, y: 0, yaw: 0, tyaw: 0, path: [], queue: [], phase: 0, walkW: 0, runW: 0, run: false,
      sit: 0, sitTarget: 0, seat: null, t: 0, target: null, act: null, aimYaw: null, aimAt: null, focus: null, head: 0, headTo: 0,
      smoke: { on: false, w: 0, t: 0 }, drink: { on: false, w: 0, t: 0 }, punch: { on: false, w: 0, t: 0 }, shoot: { on: false, w: 0, t: 0 },
      thr: { on: false, w: 0, t: 0, inst: null }, reach: { on: false, w: 0, t: 0, to: null, cb: null, fired: false },
      talk: { on: false, w: 0, t: 0, dur: 0 },          // speaking a line: the head nods, a hand explains (see applyTalk)
      vehicle: null, inside: false, arrived: false,     // the machine he is in (or climbing into), whether it hides him, and "just came in through an exit"
      look: null, gear: { body: null, head: null, hands: null }, model: null, pace: PACE, turn: 7, speedK: 1
    }, o);
  }
  // his look with what he wears put on: built once per set of clothes (look.js)
  export const dressedModel = (b) => buildPerson(dress(b.look, [b.gear.body, b.gear.head, b.gear.hands]));
  // heavy kit slows him down: a look heavy by itself (the КЗУ) or a worn thing that is (the power armour)
  export const heavy = (b) => !!(b.look && b.look.armor) || ['body', 'head', 'hands'].some((s) => { const w = WEAR[b.gear[s]]; return !!(w && w.armor); });
  export const speedOf = (b) => (b.run ? (heavy(b) ? b.pace.runHeavy : b.pace.run) : (heavy(b) ? b.pace.walkHeavy : b.pace.walk)) * b.speedK;
  export const cycleOf = (b) => b.run ? 2.3 : (heavy(b) ? 1.45 : 1.38);       // metres per full stride cycle

  // ---------- his step, in pieces: each mind (the player's orders, a person's own) calls them in its own order ----------
  // walk `budget` metres along his way; he faces where he goes unless the point says back (stepping back onto a seat)
  export function walkAlong(b, budget, cycle) {
    while (budget > 0 && b.path.length) {
      const wp = b.path[0], dx = wp.x - b.x, dz = wp.z - b.z, d = Math.hypot(dx, dz);
      if (d > 1e-4 && !wp.back) b.tyaw = Math.atan2(dx, dz);
      if (d <= budget) { b.x = wp.x; b.z = wp.z; budget -= d; b.phase += d / cycle; b.path.shift(); }
      else { b.x += dx / d * budget; b.z += dz / d * budget; b.phase += budget / cycle; budget = 0; }
    }
  }
  // the gait blends towards walking / running, sitting towards the seat; off an activity his feet find the ground
  export function settle(b, dt, walking, running) {
    b.walkW = approach(b.walkW, walking ? 1 : 0, dt * 7);
    b.runW = approach(b.runW, running ? 1 : 0, dt * 4);
    b.sit = approach(b.sit, b.sitTarget, dt / 0.5);
    if (!b.act) b.y = approach(b.y, groundY(b.x, b.z), dt * 1.6);
  }
  export function blendOverlays(b, dt) {
    for (const k in BLEND) {
      const a = b[k];
      a.w = approach(a.w, a.on ? 1 : 0, dt * BLEND[k]);
      if (a.on || a.w > 0) a.t += dt; else a.t = 0;
    }
  }
  // overlays that have run their course end; shotT — the shooting overlay's time before this step's blend.
  // o: { busy() — an activity keeps his hands (he stops talking), shot(b) — a round leaves the muzzle, rig() — his pose, for what he throws }
  export function endOverlays(b, shotT, o) {
    if (b.talk.on && (b.talk.t > b.talk.dur || b.path.length || (o.busy && o.busy()))) b.talk.on = false;
    const sh = b.shoot;
    if (sh.on && o.shot) for (const s of SHOTS) if (shotT < s && sh.t >= s) o.shot(b);
    if (sh.on && sh.t > SHOOT_LEN) { sh.on = false; b.aimYaw = null; }
    if (b.punch.on && b.punch.t > 1.25) b.punch.on = false;
    if (b.smoke.on && b.smoke.t > SMOKE_INTRO + SMOKE_PERIOD * SMOKE_PUFFS + 0.4) b.smoke.on = false;
    if (b.drink.on && b.drink.t > DRINK_INTRO + DRINK_PERIOD * DRINK_SIPS) b.drink.on = false;
    const th = b.thr;
    if (th.on && !th.released && th.t >= THROW_REL) { th.released = true; if (th.release && o.rig) th.release(o.rig()); }
    if (th.on && th.t > THROW_LEN) th.on = false;
    const re = b.reach;
    if (re.on && !re.fired && re.t > 0.7) { re.fired = true; if (re.cb) re.cb(); }
    if (re.on && re.t > 1.7) re.on = false;
  }
