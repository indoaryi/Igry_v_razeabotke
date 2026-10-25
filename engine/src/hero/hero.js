  // ================= the hero: the body the player steers, and the activities a body can be busy with =================
  // He is a body like anyone's (body.js) — his look and gear are the hero's own (wardrobe.js). His orders and his step are in
  // state.js, how he is drawn in rig.js. `hero` is whoever the player steers: when control passes to another person
  // (people.js: takeControl), every module that says hero means the new one.
  import { smooth } from '../core/math.js';
  import { HERO_LOOK, equip } from './wardrobe.js';
  import { plantY, poseIdle } from './skeleton.js';
  import { heavy, newBody } from './body.js';
  const DIR8 = [
    { arrow: '↙', name: 'вниз-влево' }, { arrow: '↓', name: 'вниз' }, { arrow: '↘', name: 'вниз-вправо' }, { arrow: '→', name: 'вправо' },
    { arrow: '↗', name: 'вверх-вправо' }, { arrow: '↑', name: 'вверх' }, { arrow: '↖', name: 'вверх-влево' }, { arrow: '←', name: 'влево' }
  ];
  export const dirOf = (yaw) => DIR8[((Math.round(yaw / (Math.PI / 4)) % 8) + 8) % 8];
  // the body the player steers — at first the hero himself (id 'hero'); his pace: he runs faster than most, and his power armour
  // is heavier than anyone's kit
  export let hero = newBody({ id: 'hero', x: 14.2, z: 20.4, yaw: -1.9, tyaw: -1.9, look: HERO_LOOK, gear: equip, pace: { walk: 1.38, run: 3.4, walkHeavy: 1.15, runHeavy: 2.7 }, turn: 8 });
  export function setHeroBody(b) { hero = b; }
  // in heavy kit (the power armour, or a look heavy by itself): slower, and some things are out of reach
  export const armored = () => heavy(hero);
  export const standHips = (D) => plantY(poseIdle(0, D), D);
  export const lerpM = (a, b, t) => { const o = new Float32Array(16); for (let i = 0; i < 16; i++) o[i] = a[i] + (b[i] - a[i]) * t; return o; };
  export const yawTo = (x, z) => Math.atan2(x - hero.x, z - hero.z);
  // the thing he sits in or drives: an instance with .ride = { hides(), focus() → world point, canTravel(), state() → text }
  export const driving = () => !!(hero.inside && hero.vehicle);
  export const heroHidden = () => !!(hero.inside && hero.vehicle && hero.vehicle.ride && hero.vehicle.ride.hides());

  // ---------- activities: each owns the hero for a while and says where his hips are ----------
  // ACT[kind] = { update(a, dt), ctx(a) → pose context or null, base(a, D) → hips matrix or null, state(a) → text,
  //   first: the stage it starts in, leave(a) → label of the button that ends it (or null), quiet: true — it does not take
  //   over the context panel, handsFree(a): his hands are free meanwhile (he may shoot or smoke), hands(a): where his hands hold on }
  // The engine has the plain ones; a game adds its own (swings, ladders…), the walking machines add 'board'.
  export const ACT = {
    // kneel down, do something with his hands (a.cb at the bottom), get up
    kneel: {
      update(a, dt) {
        a.st += dt;
        const T = 1.9;
        if (a.leave && !a.fired && a.st < T + 0.35) { a.fired = true; a.st = T + 0.35 + Math.max(0, 0.35 - a.st); }     // called away: gets up at once, finds nothing

        a.w = Math.min(smooth(a.st / 0.35), 1 - smooth((a.st - (T + 0.35)) / 0.35));
        if (!a.fired && a.st > T) { a.fired = true; if (a.cb) a.cb(); }
        if (a.st >= T + 0.7) a.done = true;
      },
      ctx: (a) => ({ kind: 'kneel', w: a.w }),
      base: () => null,
      state: (a) => a.text || 'ищет в траве',
      quiet: true
    },
    // stand and look at something for a while (a.dur), a.cb a little before the end
    look: {
      update(a, dt) { a.st += dt; if (a.leave) { a.done = true; return; } if (!a.fired && a.st > (a.dur || 1.5) * 0.6) { a.fired = true; if (a.cb) a.cb(); } if (a.st >= (a.dur || 1.5)) a.done = true; },
      ctx: () => null, base: () => null, state: (a) => a.text || 'смотрит', quiet: true
    }
  };
