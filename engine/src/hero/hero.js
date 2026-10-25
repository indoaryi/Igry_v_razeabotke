  // ================= the hero: who he is — where he stands, what his hands are doing, the activities he can be busy with =================
  // His orders and his step are in state.js, how he is drawn in rig.js; this record is what both read.
  const DIR8 = [
    { arrow: '↙', name: 'вниз-влево' }, { arrow: '↓', name: 'вниз' }, { arrow: '↘', name: 'вниз-вправо' }, { arrow: '→', name: 'вправо' },
    { arrow: '↗', name: 'вверх-вправо' }, { arrow: '↑', name: 'вверх' }, { arrow: '↖', name: 'вверх-влево' }, { arrow: '←', name: 'влево' }
  ];
  const dirOf = (yaw) => DIR8[((Math.round(yaw / (Math.PI / 4)) % 8) + 8) % 8];
  // overlays (smoke, drink, punch, shoot, thr, reach) are things he does with his hands while standing, walking or sitting:
  // on — wanted, w — how far the pose has blended in, t — time since it began
  const hero = {
    x: 14.2, z: 20.4, y: 0, yaw: -1.9, tyaw: -1.9, path: [], queue: [], phase: 0, walkW: 0, runW: 0, run: false,
    sit: 0, sitTarget: 0, seat: null, t: 0, target: null, act: null, aimYaw: null, aimAt: null, focus: null,
    smoke: { on: false, w: 0, t: 0 }, drink: { on: false, w: 0, t: 0 }, punch: { on: false, w: 0, t: 0 }, shoot: { on: false, w: 0, t: 0 },
    thr: { on: false, w: 0, t: 0, inst: null }, reach: { on: false, w: 0, t: 0, to: null, cb: null, fired: false },
    talk: { on: false, w: 0, t: 0, dur: 0 },          // speaking a line: the head nods, a hand explains (see applyTalk)
    vehicle: null, inside: false, arrived: false     // the machine he is in (or climbing into), whether it hides him, and "just came in through an exit"
  };
  const speed = () => hero.run ? (armored() ? 2.7 : 3.4) : (armored() ? 1.15 : 1.38);
  const cycleLen = () => hero.run ? 2.3 : (armored() ? 1.45 : 1.38);
  const standHips = (D) => plantY(poseIdle(0, D), D);
  const lerpM = (a, b, t) => { const o = new Float32Array(16); for (let i = 0; i < 16; i++) o[i] = a[i] + (b[i] - a[i]) * t; return o; };
  const yawTo = (x, z) => Math.atan2(x - hero.x, z - hero.z);
  // the thing he sits in or drives: an instance with .ride = { hides(), focus() → world point, canTravel(), state() → text }
  const driving = () => !!(hero.inside && hero.vehicle);
  const heroHidden = () => !!(hero.inside && hero.vehicle && hero.vehicle.ride && hero.vehicle.ride.hides());

  // ---------- activities: each owns the hero for a while and says where his hips are ----------
  // ACT[kind] = { update(a, dt), ctx(a) → pose context or null, base(a, D) → hips matrix or null, state(a) → text,
  //   first: the stage it starts in, leave(a) → label of the button that ends it (or null), quiet: true — it does not take
  //   over the context panel, handsFree(a): his hands are free meanwhile (he may shoot or smoke), hands(a): where his hands hold on }
  // The engine has the plain ones; a game adds its own (swings, ladders…), the walking machines add 'board'.
  const ACT = {
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
