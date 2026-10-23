  // ================= update =================
  let toastT = 0;
  const toastEl = $('toast');
  function toast(msg) { toastEl.textContent = msg; toastEl.hidden = false; toastT = 3.2; }
  function update(dt, view) {
    hero.t += dt;
    if (hero.act) {
      if (hero.queue.length && hero.queue[0].type === 'leave') hero.act.leave = true;
      ACT[hero.act.kind].update(hero.act, dt);
      if (hero.act.done) { const a = hero.act; hero.act = null; hero.y = groundY(hero.x, hero.z); if (a.after) a.after(); }
    } else if (hero.path.length && !driving()) {
      let budget = speed() * dt;
      while (budget > 0 && hero.path.length) {
        const wp = hero.path[0], dx = wp.x - hero.x, dz = wp.z - hero.z, d = Math.hypot(dx, dz);
        if (d > 1e-4 && !wp.back) hero.tyaw = Math.atan2(dx, dz);
        if (d <= budget) { hero.x = wp.x; hero.z = wp.z; budget -= d; hero.phase += d / cycleLen(); hero.path.shift(); }
        else { hero.x += dx / d * budget; hero.z += dz / d * budget; hero.phase += budget / cycleLen(); budget = 0; }
      }
    }
    hero.yaw = approachAngle(hero.yaw, hero.tyaw, dt * (hero.path.length ? 10 : 7));
    if (!hero.path.length && !hero.act) runQueue();
    if (!hero.path.length && hero.target && Math.hypot(hero.target[0] - hero.x, hero.target[1] - hero.z) < 0.35) hero.target = null;
    const moving = hero.path.length > 0 && !hero.act && !driving();
    hero.walkW = approach(hero.walkW, moving ? 1 : 0, dt * 7);
    hero.runW = approach(hero.runW, moving && hero.run ? 1 : 0, dt * 4);
    hero.sit = approach(hero.sit, hero.sitTarget, dt / 0.5);
    if (!hero.act) hero.y = approach(hero.y, groundY(hero.x, hero.z), dt * 1.6);
    const sh = hero.shoot, prevT = sh.t;
    for (const k of ['smoke', 'drink', 'punch', 'shoot', 'thr', 'reach']) {
      const a = hero[k];
      a.w = approach(a.w, a.on ? 1 : 0, dt * (k === 'shoot' ? 8 : k === 'thr' || k === 'reach' ? 6 : 4));
      if (a.on || a.w > 0) a.t += dt; else a.t = 0;
    }
    if (sh.on) for (const s of SHOTS) if (prevT < s && sh.t >= s) fireShot();
    if (sh.on && sh.t > SHOOT_LEN) { sh.on = false; hero.aimYaw = null; }
    if (hero.punch.on && hero.punch.t > 1.25) hero.punch.on = false;
    if (hero.smoke.on && hero.smoke.t > SMOKE_INTRO + SMOKE_PERIOD * SMOKE_PUFFS + 0.4) hero.smoke.on = false;
    if (hero.drink.on && hero.drink.t > DRINK_INTRO + DRINK_PERIOD * DRINK_SIPS) hero.drink.on = false;
    const th = hero.thr;
    if (th.on && !th.released && th.t >= THROW_REL) { th.released = true; releaseBall(heroRig(false)); }
    if (th.on && th.t > THROW_LEN) th.on = false;
    const re = hero.reach;
    if (re.on && !re.fired && re.t > 0.7) { re.fired = true; if (re.cb) re.cb(); }
    if (re.on && re.t > 1.7) re.on = false;
    updateMachines(dt);
    updateDyn(dt);
    updatePigeons(dt);
    updateFx(dt, view);
    updateTravel(dt);
    if (toastT > 0) { toastT -= dt; if (toastT <= 0) toastEl.hidden = true; }
  }

