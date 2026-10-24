  // ================= hero state =================
  const DIR8 = [
    { arrow: '↙', name: 'вниз-влево' }, { arrow: '↓', name: 'вниз' }, { arrow: '↘', name: 'вниз-вправо' }, { arrow: '→', name: 'вправо' },
    { arrow: '↗', name: 'вверх-вправо' }, { arrow: '↑', name: 'вверх' }, { arrow: '↖', name: 'вверх-влево' }, { arrow: '←', name: 'влево' }
  ];
  const dirOf = (yaw) => DIR8[((Math.round(yaw / (Math.PI / 4)) % 8) + 8) % 8];
  const hero = {
    x: 14.2, z: 20.4, y: 0, yaw: -1.9, tyaw: -1.9, path: [], queue: [], phase: 0, walkW: 0, runW: 0, run: false,
    sit: 0, sitTarget: 0, seat: null, t: 0, target: null, act: null, aimYaw: null, aimAt: null, focus: null,
    smoke: { on: false, w: 0, t: 0 }, drink: { on: false, w: 0, t: 0 }, punch: { on: false, w: 0, t: 0 }, shoot: { on: false, w: 0, t: 0 },
    thr: { on: false, w: 0, t: 0, inst: null }, reach: { on: false, w: 0, t: 0, to: null, cb: null, fired: false },
    vehicle: null, inside: false, arrived: false     // the machine he is in (or climbing into), whether it hides him, and "just came in through an exit"
  };
  const speed = () => hero.run ? (armored() ? 2.7 : 3.4) : (armored() ? 1.15 : 1.38);
  const cycleLen = () => hero.run ? 2.3 : (armored() ? 1.45 : 1.38);
  const standHips = (D) => plantY(poseIdle(0, D), D);
  const lerpM = (a, b, t) => { const o = new Float32Array(16); for (let i = 0; i < 16; i++) o[i] = a[i] + (b[i] - a[i]) * t; return o; };
  const yawTo = (x, z) => Math.atan2(x - hero.x, z - hero.z);
  const localPt = (inst, p) => xf(inst.M0, p);

  // ---------- activities: each owns the hero for a while and says where his hips are ----------
  const SWING_W = Math.sqrt(9.8 / SW.CH);
  const seatFrame = (inst) => M(inst.M0, tr(0, SW.BAR, 0), rx(inst.dyn.theta || 0), tr(0, -SW.CH, 0));
  const ACT = {
    swing: {
      update(a, dt) {
        const dy = a.inst.dyn; a.st += dt;
        if (a.stage === 'mount') { a.w = smooth(a.st / 0.6); if (a.st >= 0.6) { a.stage = 'swing'; a.st = 0; } }
        else if (a.stage === 'swing') { dy.amp = approach(dy.amp || 0, 0.6, dt * 0.13); if (a.leave) { a.stage = 'stop'; a.st = 0; } }
        else if (a.stage === 'stop') { dy.amp = approach(dy.amp, 0, dt * 0.34); if (dy.amp < 0.025) { a.stage = 'dismount'; a.st = 0; } }
        else if (a.stage === 'dismount') { a.w = 1 - smooth(a.st / 0.6); if (a.st >= 0.6) a.done = true; }
        dy.occupied = !a.done;
        hero.yaw = hero.tyaw = a.spot.wyaw;
      },
      ctx(a) { const dy = a.inst.dyn; const v = dy.amp > 0.01 ? -Math.cos(dy.ph || 0) : 0; return { kind: 'swing', w: a.w, u: v }; },
      base(a, D) {
        const sf = M(seatFrame(a.inst), tr(0, 0.165, -0.055));
        const st = M(tr(a.spot.w[0], standHips(D), a.spot.w[1]), ry(a.spot.wyaw));
        return lerpM(st, sf, smooth(a.w));
      },
      state: (a) => a.stage === 'mount' ? 'садится на качели' : a.stage === 'dismount' ? 'слезает' : 'качается'
    },
    hang: {
      update(a, dt) {
        a.st += dt;
        if (a.stage === 'jump') { a.w = smooth(a.st / 0.45); if (a.st >= 0.45) { a.stage = 'reps'; a.st = 0; } }
        else if (a.stage === 'reps') {
          const T = armored() ? 1.05 : 1.3, u = a.st % T, n = Math.floor(a.st / T);
          a.pull = u < 0.5 * T / 1.3 ? smooth(u / (0.5 * T / 1.3)) : u < 0.7 * T / 1.3 ? 1 : 1 - smooth((u - 0.7 * T / 1.3) / (0.55 * T / 1.3));
          if (n > a.count) { a.count = n; }
          if ((a.leave && a.pull < 0.05) || n >= a.reps) { a.stage = 'drop'; a.st = 0; a.pull = 0; }
        } else if (a.stage === 'drop') { a.w = 1 - smooth(a.st / 0.4); if (a.st >= 0.4) a.done = true; }
      },
      ctx: (a) => ({ kind: 'hang', w: a.w, pull: a.pull || 0 }),
      base(a, D) {
        const hang = a.bar + 0.012 - (D.spineY + D.chestY + hangHandY(D, a.pull || 0));
        const hop = a.stage === 'jump' ? Math.sin(Math.PI * clamp(a.st / 0.45, 0, 1)) * 0.08 : 0;
        return M(tr(hero.x, lerp(standHips(D), hang, a.w) + hop, hero.z), ry(hero.yaw));
      },
      state: (a) => a.stage === 'reps' ? 'подтягивается · ' + Math.min(a.reps, a.count + (a.pull > 0.9 ? 1 : 0)) : 'на турнике'
    },
    slide: {
      update(a, dt) {
        a.st += dt;
        const g = (p) => localPt(a.inst, p);
        if (a.stage === 'climb') {
          const u = smooth(clamp(a.st / 1.6, 0, 1));
          const p = g(lerpV([0, 0, SL.lad0 - 0.38], [0, SL.top, SL.lad1 + 0.14], u));
          hero.x = p[0]; hero.z = p[2]; hero.y = p[1];
          a.w = Math.min(smooth(a.st / 0.25), 1 - smooth((a.st - 1.35) / 0.25)); a.ph = a.st / 1.6 * 2.5;
          if (a.st >= 1.6) { a.stage = 'sit'; a.st = 0; a.w = 0; }
        } else if (a.stage === 'sit') {
          a.w = smooth(a.st / 0.5);
          const p = g(lerpV([0, SL.top, SL.lad1 + 0.14], [0, SL.top, SL.z0 - 0.1], smooth(a.st / 0.5)));
          hero.x = p[0]; hero.z = p[2];
          if (a.st >= 0.5) { a.stage = 'down'; a.st = 0; }
        } else if (a.stage === 'down') {
          const T = 0.9, s = clamp(a.st / T, 0, 1), u = s * s;
          const p = g([0, lerp(SL.top, SL.low, u), lerp(SL.z0 - 0.1, SL.z1 + 0.25, u)]);
          hero.x = p[0]; hero.z = p[2]; hero.y = p[1];
          if (a.st >= T) { a.stage = 'land'; a.st = 0; }
        } else if (a.stage === 'land') {
          const p = g([0, 0, lerp(SL.z1 + 0.25, SL.run + 0.55, smooth(a.st / 0.55))]);
          hero.x = p[0]; hero.z = p[2]; hero.y = 0;
          a.w = 1 - smooth(a.st / 0.55);
          if (a.st >= 0.55) a.done = true;
        }
      },
      ctx: (a) => a.stage === 'climb' ? { kind: 'climb', w: a.w, ph: a.ph } : { kind: 'slide', w: a.w },
      base(a, D) {
        const yaw = a.inst.yaw0, g = (p) => localPt(a.inst, p);
        if (a.stage === 'climb') return null;
        if (a.stage === 'sit') {
          const st = M(tr(...add(g([0, SL.top, SL.lad1 + 0.14]), [0, standHips(D), 0])), ry(yaw));
          const se = M(tr(...add(g([0, SL.top, SL.z0 - 0.1]), [0, 0.15, 0])), ry(yaw), rx(a.inst.built.ang * 0.4));
          return lerpM(st, se, smooth(a.w));
        }
        if (a.stage === 'down') { const s = clamp(a.st / 0.9, 0, 1); return M(tr(hero.x, hero.y + 0.15, hero.z), ry(yaw), rx(a.inst.built.ang * (s < 0.85 ? lerp(0.4, 1, s / 0.3 > 1 ? 1 : s / 0.3) : 1 - (s - 0.85) / 0.15))); }
        const st = M(tr(hero.x, standHips(D), hero.z), ry(yaw));
        const se = M(tr(...add(g([0, SL.low, SL.z1 + 0.25]), [0, 0.15, 0])), ry(yaw));
        return lerpM(st, se, smooth(a.w));
      },
      state: (a) => a.stage === 'climb' ? 'лезет на горку' : a.stage === 'down' ? 'катится' : 'на горке'
    },
    tower: {
      update(a, dt) {
        a.st += dt;
        const B = TW.B, path = (u) => localPt(a.inst, [B.cx, B.deck * u, lerp(B.hs + 0.75, -0.02, smooth(u))]);
        if (a.stage === 'climb' || a.stage === 'down') {
          const T = 1.5, raw = clamp(a.st / T, 0, 1), u = a.stage === 'climb' ? raw : 1 - raw;
          const p = path(u); hero.x = p[0]; hero.z = p[2]; hero.y = p[1];
          a.w = Math.min(smooth(a.st / 0.25), 1 - smooth((a.st - (T - 0.25)) / 0.25)); a.ph = a.st / T * 2.2;
          hero.yaw = hero.tyaw = a.inst.yaw0 + Math.PI;
          if (a.st >= T) {
            if (a.stage === 'climb') { a.stage = 'top'; a.st = 0; a.w = 0; hero.tyaw = a.inst.yaw0; }
            else a.done = true;
          }
        } else if (a.stage === 'top') { a.w = 0; if (a.leave && !hero.shoot.on && hero.shoot.w <= 0) { a.stage = 'down'; a.st = 0; } }
      },
      ctx: (a) => a.stage === 'top' ? null : { kind: 'climb', w: a.w, ph: a.ph },
      base: () => null,
      state: (a) => a.stage === 'top' ? 'на башне' : a.stage === 'climb' ? 'лезет на башню' : 'спускается'
    },
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
      state: () => 'ищет в траве'
    },
    look: {
      update(a, dt) { a.st += dt; if (a.leave) { a.done = true; return; } if (!a.fired && a.st > (a.dur || 1.5) * 0.6) { a.fired = true; if (a.cb) a.cb(); } if (a.st >= (a.dur || 1.5)) a.done = true; },
      ctx: () => null, base: () => null, state: () => 'смотрит'
    }
  };
  function startAct(kind, inst, opts = {}) {
    hero.act = Object.assign({ kind, inst, st: 0, w: 0, stage: opts.stage || ({ swing: 'mount', hang: 'jump', slide: 'climb', tower: 'climb' }[kind] || 'go'), leave: false, done: false }, opts);
    hero.path.length = 0;
  }
  const onTower = () => hero.act && hero.act.kind === 'tower' && hero.act.stage === 'top';
  const busyAct = () => hero.act && !onTower();

  // ---------- commands ----------
  // a new order replaces the old one at once: the hero drops the rest of his way, even mid-step, and heads off from where he stands
  function clearPlans() {
    hero.path.length = 0; hero.queue = []; hero.target = null;
    const th = hero.thr;
    if (th.on && !th.released && th.inst) {     // a throw cut short: the ball drops at his feet instead of vanishing
      const b = th.inst.dyn.ball;
      b.pos = [hero.x + Math.sin(hero.yaw) * 0.3, 0.12, hero.z + Math.cos(hero.yaw) * 0.3]; b.v = [Math.sin(hero.yaw) * 0.6, 0, Math.cos(hero.yaw) * 0.6]; b.state = 'roll';
      th.released = true;
    }
  }
  function leaveCmds() {
    const out = [];
    if (hero.act) out.push({ type: 'leave' });
    if (hero.sitTarget === 1 || hero.sit > 0) out.push({ type: 'stand' }, { type: 'goto', x: hero.seat ? hero.seat.front[0] : hero.x, z: hero.seat ? hero.seat.front[1] : hero.z });
    return out;
  }
  function plan(...cmds) {
    hero.punch.on = false; hero.thr.on = false; hero.reach.on = false;
    if (!onTower()) hero.shoot.on = false;
    const lv = leaveCmds(); clearPlans();
    if (hero.act) hero.act.leave = true;
    hero.queue.push(...lv, ...cmds);
  }
  function runQueue() {
    while (hero.queue.length) {
      const c = hero.queue[0];
      if (c.type === 'path') {
        hero.queue.shift();
        const pts = findPath([hero.x, hero.z], c.to, hero.vehicle ? NAV.big : NAV.hero);
        if (!pts) { if (c.fail) c.fail(); continue; }
        let L = 0, p = [hero.x, hero.z];
        for (const q of pts) { L += Math.hypot(q[0] - p[0], q[1] - p[1]); p = q; }
        hero.run = c.run ?? L > 6.5;
        for (const q of pts) if (Math.hypot(q[0] - hero.x, q[1] - hero.z) > 0.02 || pts.length > 1) hero.path.push({ x: q[0], z: q[1] });
        if (hero.path.length) return;
        continue;
      }
      if (c.type === 'goto') { hero.queue.shift(); if (Math.hypot(c.x - hero.x, c.z - hero.z) > 0.01) { hero.path.push({ x: c.x, z: c.z, back: !!c.back }); hero.run = false; return; } continue; }
      if (c.type === 'face') { hero.queue.shift(); hero.tyaw = c.yaw; continue; }
      if (c.type === 'turned') { if (Math.abs(wrapA(hero.yaw - hero.tyaw)) > 0.06) return; hero.queue.shift(); continue; }
      if (c.type === 'sit') { hero.seat = c.seat; hero.sitTarget = 1; if (hero.sit < 1) return; hero.queue.shift(); continue; }
      if (c.type === 'stand') { hero.sitTarget = 0; if (hero.sit > 0) return; hero.seat = null; hero.queue.shift(); continue; }
      if (c.type === 'act') { hero.queue.shift(); startAct(c.kind, c.inst, c.opts); return; }
      if (c.type === 'leave') { hero.queue.shift(); continue; }
      if (c.type === 'call') { hero.queue.shift(); c.fn(); continue; }
      if (c.type === 'shoot') { hero.queue.shift(); startShoot(); continue; }
      if (c.type === 'waitShoot') { if (hero.shoot.on || hero.shoot.w > 0) return; hero.queue.shift(); continue; }
      if (c.type === 'smoke') { hero.queue.shift(); startSmoke(); continue; }
      if (c.type === 'punch') { hero.queue.shift(); hero.smoke.on = false; hero.drink.on = false; hero.punch.on = true; hero.punch.t = 0; continue; }
      if (c.type === 'throw') { hero.queue.shift(); startThrow(c.inst); continue; }
      if (c.type === 'waitThrow') { if (hero.thr.on || hero.thr.w > 0) return; hero.queue.shift(); continue; }
      if (c.type === 'reach') { hero.queue.shift(); Object.assign(hero.reach, { on: true, t: 0, to: c.to, cb: c.cb, fired: false }); continue; }
      if (c.type === 'waitReach') { if (hero.reach.on || hero.reach.w > 0) return; hero.queue.shift(); continue; }
      hero.queue.shift();
    }
  }

  // ---------- overlays ----------
  function startShoot() {
    const cans = hero.aimAt;
    if (!cans) return;
    hero.aimYaw = yawTo(cans.pos[0], cans.pos[2]);
    hero.tyaw = hero.aimYaw;
    hero.smoke.on = false; hero.drink.on = false; hero.punch.on = false;
    hero.shoot.on = true; hero.shoot.t = 0;
  }
  const inMachine = () => { if (!hero.inside && !(hero.act && hero.act.kind === 'board')) return false; toast('Руки на рычагах — сначала выберись из костюма.'); return true; };
  function startSmoke() {
    const it = itemById('cigs');
    if (inMachine()) return false;
    if (equip.head === 'helmet') { toast('В шлеме не покуришь. Сними шлем в снаряжении.'); return false; }
    if (busyAct()) { toast('Сначала слезь — руки заняты.'); return false; }
    if (it.count <= 0) { toast('Сигареты кончились. Поищи в бурьяне.'); return false; }
    if (hero.smoke.on) return false;
    it.count--; renderItems();
    hero.drink.on = false; hero.punch.on = false; hero.shoot.on = false;
    hero.smoke.on = true; hero.smoke.t = 0; hero.smoke.w = 0;
    return true;
  }
  function startDrink() {
    const it = itemById('atom');
    if (inMachine()) return false;
    if (equip.head === 'helmet') { toast('Через шлем не попьёшь. Сними шлем в снаряжении.'); return false; }
    if (busyAct()) { toast('Сначала слезь — руки заняты.'); return false; }
    if (it.count <= 0) { toast('Энергетик кончился. Поищи в бурьяне.'); return false; }
    if (hero.drink.on) return false;
    it.count--; renderItems();
    hero.smoke.on = false; hero.punch.on = false; hero.shoot.on = false;
    hero.drink.on = true; hero.drink.t = 0; hero.drink.w = 0;
    return true;
  }
  function startThrow(inst) {
    hero.smoke.on = false; hero.drink.on = false;
    hero.thr.on = true; hero.thr.t = 0; hero.thr.inst = inst; hero.thr.released = false;
    const b = inst.dyn.ball; b.state = 'held';
  }

  // ---------- what the hero can do with each object ----------
  const spotOf = (inst, kind) => inst.spots.find((s) => !kind || s.kind === kind) || inst.spots[0];
  const goSpot = (sp, run) => [{ type: 'path', to: sp.w, run }, { type: 'goto', x: sp.w[0], z: sp.w[1] }, { type: 'face', yaw: sp.wyaw }, { type: 'turned' }];
  function noArmor(msg) { if (!armored()) return false; toast(msg + ' Сними броню в снаряжении.'); return true; }
  function seatsOf(inst) {
    return (inst.built.seats || []).map((s) => {
      const w = toWorld2(inst.M0, [s.x, s.z]), f = toWorld2(inst.M0, [s.x, s.z + 0.58]);
      return { inst, s, at: w, front: f, yaw: wrapA(inst.yaw0 + s.yaw), rifleM: M(inst.M0, tr(...s.rifle), frameY([0, 0, 1], [Math.sign(s.rifle[0] - s.x) || 1, 0, 0]), tr(0, 0, -0.16)) };
    });
  }
  function goSit(inst) {
    const seats = seatsOf(inst).filter((s) => !(hero.seat && hero.seat.s === s.s));
    seats.sort((a, b) => Math.hypot(a.at[0] - hero.x, a.at[1] - hero.z) - Math.hypot(b.at[0] - hero.x, b.at[1] - hero.z));
    const st = seats[0];
    plan({ type: 'path', to: st.front }, { type: 'goto', x: st.front[0], z: st.front[1] }, { type: 'face', yaw: st.yaw }, { type: 'turned' },
      { type: 'goto', x: st.at[0], z: st.at[1], back: true }, { type: 'sit', seat: st });
  }
  function goSwing(inst) {
    if (noArmor('Детские качели силовую броню не выдержат.')) return;
    const sp = spotOf(inst, 'swing');
    plan(...goSpot(sp), { type: 'act', kind: 'swing', inst, opts: { spot: sp } });
  }
  function goBar(inst) {
    const sp = spotOf(inst, 'bar');
    if (!inst.def.seat && inst.type === 'swing') toast('Сиденья давно нет. Зато можно подтянуться.');
    plan(...goSpot(sp), { type: 'act', kind: 'hang', inst, opts: { bar: inst.built.bar, reps: 5, count: 0, pull: 0, after: () => toast(armored() ? 'Пять раз в броне. Сервоприводы помогают.' : 'Пять раз. Неплохо для курильщика.') } });
  }
  function goSlide(inst) {
    if (noArmor('Горка под силовой бронёй сложится.')) return;
    const sp = spotOf(inst, 'ladder');
    plan(...goSpot(sp), { type: 'act', kind: 'slide', inst });
  }
  function goTower(inst) {
    if (noArmor('В силовой броне в детскую башню не пролезть.')) return;
    const sp = spotOf(inst, 'ladder');
    plan(...goSpot(sp), { type: 'act', kind: 'tower', inst });
  }
  function goThrow(inst) {
    const sp = spotOf(inst, 'throw');
    const rim = localPt(inst, inst.built.rim);
    plan(...goSpot(sp), { type: 'call', fn: () => { hero.tyaw = yawTo(rim[0], rim[2]); } }, { type: 'turned' }, { type: 'throw', inst }, { type: 'waitThrow' });
  }
  const FINDS = [
    { p: 0.3, item: 'cigs', n: 4, msg: 'Нашёл початую пачку «Альдебараана». Четыре штуки!' },
    { p: 0.22, item: 'atom', n: 1, msg: 'Нашёл банку «ATOM» — целая, даже не вскрытая.' },
    { p: 0.12, msg: 'Пробка от «Жигулёвского». Сувенир.' },
    { p: 0.1, msg: 'Кассета без коробки. «Кино», судя по надписи.' },
    { p: 0.1, msg: 'Ржавый ключ. От чего — непонятно.' },
    { p: 0.16, msg: 'Только репейник на штанах.' }
  ];
  let findRng = rng(2026);
  function goSearch(inst) {
    if (inst.dyn.searched) { toast('Здесь уже всё перерыто.'); return; }
    // walk to the nearest edge of the patch
    const cx = inst.def.at[0], cz = inst.def.at[1], dx = hero.x - cx, dz = hero.z - cz, dl = Math.hypot(dx, dz) || 1;
    const ex = cx + dx / dl * (inst.def.rx * 0.85), ez = cz + dz / dl * (inst.def.rz * 0.85);
    plan({ type: 'path', to: [ex, ez] }, { type: 'call', fn: () => { hero.tyaw = yawTo(cx, cz); } }, { type: 'turned' },
      { type: 'act', kind: 'kneel', inst, opts: { cb: () => {
        inst.dyn.searched = true;
        let r = findRng(), f = FINDS[FINDS.length - 1];
        for (const x of FINDS) { if (r < x.p) { f = x; break; } r -= x.p; }
        if (f.item) { const it = itemById(f.item); it.count += f.n; renderItems(); flashItem(f.item); }
        toast(f.msg);
      } } });
  }
  const GRAFFITI = [
    '«Цой жив». Кто бы сомневался.',
    '«Здесь был Вася». Вася, судя по всему, был здесь часто.',
    '«В+К» в сердечке. Интересно, что с ними стало.'
  ];
  function goGraffiti(inst) {
    const sp = spotOf(inst, 'front');
    plan(...goSpot(sp), { type: 'act', kind: 'look', inst, opts: { dur: 1.6, cb: () => { inst.dyn.gi = ((inst.dyn.gi ?? -1) + 1) % GRAFFITI.length; toast(GRAFFITI[inst.dyn.gi]); } } });
  }
  function goCans(inst) {
    const sp = spotOf(inst, 'front');
    if (inst.dyn.cans.every((c) => c.state === 'up')) { toast('Банки и так стоят. Можно стрелять.'); return; }
    plan(...goSpot(sp), { type: 'reach', to: [-0.08, 0.62, 0.42], cb: () => { resetCans(inst); toast('Банки снова на крыше.'); } }, { type: 'waitReach' });
  }
  function goSubstation(inst) {
    const sp = spotOf(inst, 'door');
    plan(...goSpot(sp), { type: 'reach', to: [-0.12, 0.05, 0.5], cb: () => toast('Заперто. «Не влезай — убьёт». Логично.') }, { type: 'waitReach' });
  }
  function goDoor(inst) {
    const sp = spotOf(inst, 'door');
    plan(...goSpot(sp), { type: 'reach', to: [-0.2, 0.1, 0.46], cb: () => toast(MAP.intercom || 'Домофон пищит, но никто не открывает.') }, { type: 'waitReach' });
  }
  const POSTERS = [
    '«Куплю гараж. Дорого. Звоните». Телефон оторвали.',
    '«Вскрытие замков, круглосуточно». Удобно повесить прямо на гараж.',
    'Под объявлениями старые, в три слоя. Самое нижнее — про видеокассеты.'
  ];
  function goPosters(inst) {
    const sp = spotOf(inst, 'side');
    plan(...goSpot(sp), { type: 'act', kind: 'look', inst, opts: { dur: 1.6, cb: () => { inst.dyn.pi = ((inst.dyn.pi ?? -1) + 1) % POSTERS.length; toast(POSTERS[inst.dyn.pi]); } } });
  }
  function goLock(inst) {
    const sp = spotOf(inst, 'door');
    plan(...goSpot(sp), { type: 'reach', to: [-0.1, -0.05, 0.45], cb: () => toast('Замок висит намертво. Петли рыжие, но держат.') }, { type: 'waitReach' });
  }
  function goCarLook(inst) {
    const sp = spotOf(inst, 'side');
    plan(...goSpot(sp), { type: 'act', kind: 'look', inst, opts: { dur: 1.4, cb: () => toast(inst.def.look || 'Чья-то машина.') } });
  }
  function carAlarm(inst, why) {
    if (inst.dyn.alarm > 0) return;
    inst.dyn.alarm = 9;
    for (const b of PIGEONS) b.scare = true;
    toast(why || 'Сработала сигнализация. Лучше отойти.');
  }
  function goCarKnock(inst) {
    const sp = spotOf(inst, 'wheel');
    plan(...goSpot(sp), { type: 'reach', to: [-0.16, -0.62, 0.42], cb: () => carAlarm(inst) }, { type: 'waitReach' });
  }
  function nameOf(inst) {
    const t = inst.type;
    if (t === 'swing') return inst.def.seat ? 'Качели' : 'Качели без сиденья';
    if (t === 'entrance') return 'Подъезд ' + (inst.def.idx + 1);
    if (t === 'bench') return 'Лавочка у подъезда';
    if (t === 'garage') return 'Сарай с граффити';
    if (t === 'grass') return 'Бурьян';
    if (t === 'car') return { sedan: 'Седан', hatch: 'Хэтчбек', boxy: 'Внедорожник', suv: 'Кроссовер' }[inst.def.kind] || 'Машина';
    if (t === 'ibk3') return 'Боевой костюм ИБК-3';
    return CATALOG[t] ? CATALOG[t].name : t;
  }
  function actionsOf(inst) {
    const t = inst.type;
    if (t === 'swing') return inst.def.seat ? [{ label: 'Покачаться', run: () => goSwing(inst) }] : [{ label: 'Подтянуться', run: () => goBar(inst) }];
    if (t === 'pullbar') return [{ label: 'Подтянуться', run: () => goBar(inst) }];
    if (t === 'slide') return [{ label: 'Скатиться', run: () => goSlide(inst) }];
    if (t === 'platform' || t === 'bench') return [{ label: 'Сесть', run: () => goSit(inst) }];
    if (t === 'hoop') return [{ label: 'Бросить мяч', run: () => goThrow(inst) }];
    if (t === 'towers') return [{ label: 'Залезть на башню', run: () => goTower(inst) }];
    if (t === 'garage') return [{ label: 'Читать граффити', run: () => goGraffiti(inst) }, { label: 'Расставить банки', run: () => goCans(inst) }];
    if (t === 'substation') return [{ label: 'Подёргать дверь', run: () => goSubstation(inst) }];
    if (t === 'grass') return [{ label: inst.dyn.searched ? 'Тут уже пусто' : 'Обыскать', run: () => goSearch(inst), off: !!inst.dyn.searched }];
    if (t === 'entrance') return [{ label: 'Позвонить в домофон', run: () => goDoor(inst) }];
    if (t === 'metalgarage') return [{ label: 'Читать объявления', run: () => goPosters(inst) }, { label: 'Подёргать замок', run: () => goLock(inst) }];
    if (t === 'car') return [{ label: 'Заглянуть в окно', run: () => goCarLook(inst) }, { label: 'Постучать по колесу', run: () => goCarKnock(inst) }];
    if (inst.machine) return machineActions(inst);
    return [];
  }
  const NOTES = {
    swing: 'Цепи скрипят, но держат. Раскачивается сам, ногами.',
    swing0: 'Сиденье кто-то унёс, осталась перекладина.',
    pullbar: 'Перекладина на высоте двух с четвертью метров.',
    slide: 'Железный желоб, нагретый солнцем.',
    platform: 'Тут сидят по вечерам. Винтовку можно положить рядом.',
    bench: 'Лавочка у первого подъезда, урна рядом.',
    hoop: 'Кольцо на высоте 3,05 м. Мяч валяется у столба.',
    towers: 'Детская башня, взрослому там тесно, но влезть можно.',
    garage: 'На крыше стоят банки — по ним можно стрелять.',
    substation: 'Гудит. На двери предупреждение.',
    grass: 'В бурьяне иногда что-то валяется.',
    entrance: 'Железная дверь с домофоном.',
    metalgarage: 'Ржавый, с объявлениями. Двери на навесном замке.',
    car: 'Стоит носом к дому. От пинка заорёт.'
  };
  const noteOf = (inst) => inst.machine ? machineNote(inst) : inst.type === 'swing' && !inst.def.seat ? NOTES.swing0 : NOTES[inst.type] || '';
  function doDefault(inst) {
    // from inside a machine, tapping a thing walks the machine up to it
    if (driving()) { if (inst !== hero.vehicle) { const c = inst.center || inst.def.at; walkTo(c[0], c[1]); } return; }
    const a = actionsOf(inst)[0]; if (a && !a.off) a.run(); else if (a && a.off) toast('Здесь уже всё перерыто.'); }
  function walkTo(x, z) {
    hero.thr.on = false;
    plan({ type: 'path', to: [x, z] });
    hero.target = [x, z];
  }
  function standUp() { plan(); }
  function doPunch() { if (inMachine()) return; plan({ type: 'punch' }); }
  function doShoot() {
    if (inMachine()) return;
    if (equip.hands !== 'rifle') { toast('Сначала возьми винтовку в снаряжении.'); return; }
    if (hero.shoot.on) return;
    const g = byType('garage')[0];
    if (!g || !g.dyn.cans) { toast('Стрелять здесь не по чему. Банки остались на сарае в первом дворе.'); return; }
    const up = g.dyn.cans.filter((c) => c.state === 'up');
    if (!up.length) { toast('Банок не осталось. Подойди к сараю и расставь их.'); hero.focus = g; return; }
    up.sort((a, b) => Math.hypot(a.pos[0] - hero.x, a.pos[2] - hero.z) - Math.hypot(b.pos[0] - hero.x, b.pos[2] - hero.z));
    hero.aimAt = up[0];
    if (onTower()) { startShoot(); return; }
    plan({ type: 'call', fn: () => { hero.tyaw = yawTo(up[0].pos[0], up[0].pos[2]); } }, { type: 'turned' }, { type: 'shoot' });
  }
  function turn(d) {
    if (driving()) return;
    if (hero.path.length || hero.sit > 0 || hero.sitTarget || hero.shoot.on || busyAct()) return;
    hero.tyaw = wrapA(hero.tyaw + d * Math.PI / 4);
  }

