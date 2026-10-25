  // ================= the standard page around the stage: a line for the player, the HUD chips, the context panel, view controls, taps =================
  // Every element is looked up by id and may be missing — a game's page takes what it needs:
  //   toast · hudState, hudNear, hudClock (chips over the stage) · tip (hover tooltip) · ctxK, ctxName, ctxNote, ctxActs (what is near and what to do)
  //   vNear, vFar, vAll (zoom) · gridChk, rawChk · locSeg (one button per location) · todSeg, clockChk (time of day)
  // (the line for the player, «toast», is in core/toast.js: lower modules speak through it too)
  const hudState = $('hudState'), hudNear = $('hudNear'), tipEl = $('tip');
  const ctxK = $('ctxK'), ctxName = $('ctxName'), ctxNote = $('ctxNote'), ctxActs = $('ctxActs');
  function stateText() {
    let s;
    if (driving() && !hero.act) return dirOf(hero.yaw).arrow + ' ' + (hero.vehicle.ride ? hero.vehicle.ride.state() : 'внутри');
    for (const f of GAME.state) { const g = f(); if (g) return dirOf(hero.yaw).arrow + ' ' + g; }
    if (hero.act) s = ACT[hero.act.kind].state(hero.act);
    else if (hero.path.length) s = hero.run ? 'бежит' : 'идёт';
    else if (hero.sitTarget === 1) s = hero.sit < 1 ? 'садится' : 'сидит';
    else if (hero.sit > 0) s = 'встаёт';
    else s = 'стоит';
    if (hero.punch.on) s = 'бьёт';
    if (hero.shoot.on) s = 'стреляет';
    if (hero.thr.on) s = 'бросает мяч';
    if (hero.smoke.on) s += ' · курит';
    if (hero.drink.on) s += ' · пьёт';
    return dirOf(hero.yaw).arrow + ' ' + s;
  }
  function distToInst(i) {
    if (i.T && i.T.near) return i.T.near(i, hero.x, hero.z);
    let d = Infinity;
    for (const s of i.spots) d = Math.min(d, Math.hypot(s.w[0] - hero.x, s.w[1] - hero.z));
    for (const b of i.blocks) d = Math.min(d, b.poly ? (pointInPoly(hero.x, hero.z, b.poly) ? 0 : distToPoly(hero.x, hero.z, b.poly)) : Math.max(0, Math.hypot(hero.x - b.c[0], hero.z - b.c[1]) - b.r));
    return d;
  }
  // what the context panel is about: the machine he drives, what he is busy with, his seat, the nearest active thing, the last one tapped
  function contextNow() {
    if (driving() && !hero.act) return { inst: hero.vehicle, mode: 'pilot' };
    for (const f of GAME.context) { const c = f(); if (c) return c; }
    if (hero.act && hero.act.inst && !ACT[hero.act.kind].quiet) return { inst: hero.act.inst, mode: 'busy' };
    if ((hero.sitTarget === 1 || hero.sit > 0) && hero.seat) return { inst: hero.seat.inst, mode: 'seated' };
    let best = null, bd = 2.2;
    for (const i of INST) if (i.active) { const d = distToInst(i); if (d < bd) { bd = d; best = i; } }
    if (best) return { inst: best, mode: 'near' };
    if (hero.focus) return { inst: hero.focus, mode: 'focus' };
    return null;
  }
  let ctxKey = '', hudKey = '', ctxTimer = 0;
  // the context panel is rebuilt on its next check (after something the player did may have changed what it shows)
  const refreshContext = () => { ctxKey = ''; };
  function button(label, fn, cls, off) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn' + (cls ? ' ' + cls : ''); b.textContent = label;
    if (off) b.disabled = true;
    b.addEventListener('click', fn);
    return b;
  }
  function updateContext(dt) {
    ctxTimer -= dt;
    if (ctxTimer > 0) return;
    ctxTimer = 0.2;
    const cx = contextNow();
    const acts = cx ? actionsOf(cx.inst) : [];
    const key = cx ? cx.mode + cx.inst.id + acts.map((a) => a.label).join() + (hero.act ? hero.act.stage : '') + (cx.inst.machine ? cx.inst.machine.mode : '') : 'none';
    if (hudNear) {
      hudNear.hidden = !(cx && (cx.mode === 'near' || cx.mode === 'busy' || cx.mode === 'seated'));
      if (cx) hudNear.textContent = (cx.mode === 'near' ? 'рядом: ' : '') + chipOf(cx.inst);
    }
    if (key === ctxKey || !ctxActs) return;
    ctxKey = key;
    ctxActs.textContent = '';
    if (!cx) {
      ctxK.textContent = 'Рядом'; ctxName.textContent = 'ничего'; ctxNote.textContent = TEXTS.nothingNear;
      return;
    }
    const inst = cx.inst;
    ctxK.textContent = cx.mode === 'pilot' ? 'Внутри' : cx.mode === 'busy' || cx.mode === 'seated' ? 'Сейчас' : cx.mode === 'near' ? 'Рядом' : 'Выбрано';
    ctxName.textContent = nameOf(inst);
    ctxNote.textContent = noteOf(inst);
    if (cx.mode === 'busy') {
      const A = ACT[hero.act.kind], lab = A.leave ? A.leave(hero.act) : null;
      if (lab) ctxActs.append(button(lab, () => standUp(), 'main'));
      return;
    }
    if (cx.mode === 'seated') { ctxActs.append(button('Встать', () => standUp(), 'main')); return; }
    if (cx.mode === 'pilot') { acts.forEach((a, i) => ctxActs.append(button(a.label, () => { a.run(); ctxKey = ''; }, i === 0 ? 'main' : ''))); return; }
    acts.forEach((a, i) => ctxActs.append(button(a.label, () => { hero.focus = inst; a.run(); ctxKey = ''; }, i === 0 ? 'main' : '', a.off)));
  }
  function updateHud() {
    const s = stateText();
    if (s === hudKey || !hudState) return;
    hudKey = s;
    hudState.textContent = s;
  }
  // zoom: close, the usual distance, the whole location
  const vBtns = { near: $('vNear'), far: $('vFar'), all: $('vAll') };
  function setView(m) {
    setViewMode(m); for (const [m2, b2] of Object.entries(vBtns)) if (b2) b2.setAttribute('aria-pressed', String(m2 === m));
    recenter(); fitStage(); redraw();
  }
  for (const [m, b] of Object.entries(vBtns)) if (b) b.addEventListener('click', () => setView(m));
  if ($('gridChk')) $('gridChk').addEventListener('change', (e) => { setGrid(e.target.checked); });
  if ($('rawChk')) $('rawChk').addEventListener('change', (e) => { setRaw(e.target.checked); redraw(); });
  // which location: the current one is pressed, another walks the hero to the exit that leads there
  const locSeg = $('locSeg');
  function buildLocSeg() {
    if (!locSeg) return;
    locSeg.textContent = '';
    for (const id of Object.keys(LOCATIONS)) {
      const b = document.createElement('button');
      b.type = 'button'; b.id = 'loc-' + id; b.textContent = LOCATIONS[id].short || LOCATIONS[id].name;
      b.setAttribute('aria-pressed', String(id === MAP.id));
      b.addEventListener('click', () => goToLocation(id));
      locSeg.append(b);
    }
  }
  LOC_HOOKS.enter.push(buildLocSeg);
  // time of day: a preset hurries the clock forward to its hour; the box lets the clock run by itself (a day in ten minutes)
  const todSeg = $('todSeg'), clockChk = $('clockChk'), hudClock = $('hudClock');
  if (todSeg) for (const P of DAY_PRESETS) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = P.name; b.dataset.p = P.id;
    b.addEventListener('click', () => dayGoto(P.h));
    todSeg.append(b);
  }
  if (clockChk) clockChk.addEventListener('change', (e) => { DAY.run = e.target.checked; });
  let clockKey = '';
  function updateClock() {
    const k = fmtHour(DAY.t) + dayPeriod(DAY.goal ?? DAY.t);
    if (k === clockKey) return;
    clockKey = k;
    if (hudClock) hudClock.textContent = fmtHour(DAY.t);
    const want = dayPeriod(DAY.goal ?? DAY.t);
    if (todSeg) for (const b of todSeg.children) b.setAttribute('aria-pressed', String(b.dataset.p === want));
  }

  // ---------- taps on the stage: a thing that can be used — use it; the ground — walk there ----------
  let hoverPt = null, hoverT = 0;
  stageEl.addEventListener('click', (e) => {
    if (travelState) return;
    const r = stageEl.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width, fy = (e.clientY - r.top) / r.height;
    const inst = pickFrac(fx, fy);
    if (inst && inst.active) { hero.focus = inst; doDefault(inst); ctxKey = ''; return; }
    const [sx, sy] = viewToWorld(fx, fy);
    const [gx, gz] = groundAt(sx, sy);
    if (gx < 0.4 || gz < 0.4 || gx > GW - 0.4 || gz > GH - 0.4) return;
    walkTo(gx, gz);
  });
  stageEl.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const r = stageEl.getBoundingClientRect();
    hoverPt = { fx: (e.clientX - r.left) / r.width, fy: (e.clientY - r.top) / r.height, x: e.clientX - r.left, y: e.clientY - r.top };
  });
  stageEl.addEventListener('pointerleave', () => { hoverPt = null; setHover(0); if (tipEl) tipEl.hidden = true; stageEl.classList.remove('over'); });
  function updateHover(dt) {
    hoverT -= dt;
    if (!hoverPt || hoverT > 0) return;
    hoverT = 0.08;
    const inst = pickFrac(hoverPt.fx, hoverPt.fy);
    const id = inst && inst.active ? inst.id : 0;
    setHover(id);
    stageEl.classList.toggle('over', !!id);
    if (!tipEl) return;
    if (!id) { tipEl.hidden = true; return; }
    const a = actionsOf(inst)[0];
    tipEl.innerHTML = '';
    tipEl.append(document.createTextNode(nameOf(inst)));
    if (a) { const sm = document.createElement('small'); sm.textContent = a.label; tipEl.append(sm); }
    tipEl.style.left = hoverPt.x + 'px'; tipEl.style.top = hoverPt.y + 'px';
    tipEl.hidden = false;
  }
