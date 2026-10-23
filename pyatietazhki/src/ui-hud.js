  // ================= HUD, context panel, actions =================
  const hudState = $('hudState'), hudNear = $('hudNear'), tipEl = $('tip');
  const ctxK = $('ctxK'), ctxName = $('ctxName'), ctxNote = $('ctxNote'), ctxActs = $('ctxActs');
  const aSmoke = $('aSmoke'), aDrink = $('aDrink'), aPunch = $('aPunch'), aShoot = $('aShoot');
  function stateText() {
    let s;
    if (driving() && !hero.act) return dirOf(hero.yaw).arrow + ' ' + machineState(hero.vehicle);
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
    if (i.type === 'grass') return Math.max(0, (Math.hypot((hero.x - i.def.at[0]) / i.def.rx, (hero.z - i.def.at[1]) / i.def.rz) - 1) * Math.min(i.def.rx, i.def.rz));
    let d = Infinity;
    for (const s of i.spots) d = Math.min(d, Math.hypot(s.w[0] - hero.x, s.w[1] - hero.z));
    for (const b of i.blocks) d = Math.min(d, b.poly ? (pointInPoly(hero.x, hero.z, b.poly) ? 0 : distToPoly(hero.x, hero.z, b.poly)) : Math.max(0, Math.hypot(hero.x - b.c[0], hero.z - b.c[1]) - b.r));
    return d;
  }
  function contextNow() {
    if (driving() && !hero.act) return { inst: hero.vehicle, mode: 'pilot' };
    if (hero.act && hero.act.inst && hero.act.kind !== 'kneel' && hero.act.kind !== 'look') return { inst: hero.act.inst, mode: 'busy' };
    if ((hero.sitTarget === 1 || hero.sit > 0) && hero.seat) return { inst: hero.seat.inst, mode: 'seated' };
    let best = null, bd = 2.2;
    for (const i of INST) if (i.active) { const d = distToInst(i); if (d < bd) { bd = d; best = i; } }
    if (best) return { inst: best, mode: 'near' };
    if (hero.focus) return { inst: hero.focus, mode: 'focus' };
    return null;
  }
  let ctxKey = '', hudKey = '', ctxTimer = 0;
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
    hudNear.hidden = !(cx && (cx.mode === 'near' || cx.mode === 'busy' || cx.mode === 'seated'));
    if (cx) hudNear.textContent = (cx.mode === 'near' ? 'рядом: ' : '') + nameOf(cx.inst).toLowerCase();
    if (key === ctxKey) return;
    ctxKey = key;
    ctxActs.textContent = '';
    if (!cx) {
      ctxK.textContent = 'Рядом'; ctxName.textContent = 'ничего'; ctxNote.textContent = 'Подойди к чему-нибудь или нажми на предмет во дворе. Нажатие на землю — просто идти.';
      return;
    }
    const inst = cx.inst;
    ctxK.textContent = cx.mode === 'pilot' ? 'Внутри' : cx.mode === 'busy' || cx.mode === 'seated' ? 'Сейчас' : cx.mode === 'near' ? 'Рядом' : 'Выбрано';
    ctxName.textContent = nameOf(inst);
    ctxNote.textContent = noteOf(inst);
    if (cx.mode === 'busy') {
      const k = hero.act.kind;
      const lab = k === 'swing' ? 'Слезть' : k === 'hang' ? 'Спрыгнуть' : k === 'tower' ? 'Спуститься' : null;
      if (lab && hero.act.stage !== 'dismount' && hero.act.stage !== 'drop' && hero.act.stage !== 'down') ctxActs.append(button(lab, () => standUp(), 'main'));
      return;
    }
    if (cx.mode === 'seated') { ctxActs.append(button('Встать', () => standUp(), 'main')); return; }
    if (cx.mode === 'pilot') { acts.forEach((a, i) => ctxActs.append(button(a.label, () => { a.run(); ctxKey = ''; }, i === 0 ? 'main' : ''))); return; }
    acts.forEach((a, i) => ctxActs.append(button(a.label, () => { hero.focus = inst; a.run(); ctxKey = ''; }, i === 0 ? 'main' : '', a.off)));
  }
  function updateHud() {
    const s = stateText();
    const key = s + hero.smoke.on + hero.drink.on + equip.hands + equip.head;
    if (key === hudKey) return;
    hudKey = key;
    hudState.textContent = s;
    aSmoke.textContent = hero.smoke.on ? 'Потушить' : 'Закурить'; aSmoke.setAttribute('aria-pressed', String(hero.smoke.on));
    aDrink.textContent = hero.drink.on ? 'Убрать банку' : 'Энергетик'; aDrink.setAttribute('aria-pressed', String(hero.drink.on));
    aShoot.disabled = equip.hands !== 'rifle';
  }
  aSmoke.addEventListener('click', () => { if (hero.smoke.on) hero.smoke.on = false; else startSmoke(); });
  aDrink.addEventListener('click', () => { if (hero.drink.on) hero.drink.on = false; else startDrink(); });
  aPunch.addEventListener('click', doPunch);
  aShoot.addEventListener('click', doShoot);
  const vBtns = { near: $('vNear'), far: $('vFar'), all: $('vAll') };
  for (const [m, b] of Object.entries(vBtns)) b.addEventListener('click', () => {
    viewMode = m; for (const [m2, b2] of Object.entries(vBtns)) b2.setAttribute('aria-pressed', String(m2 === m));
    camX = null; fitStage(); lastKey = '';
  });
  $('gridChk').addEventListener('change', (e) => { showGrid = e.target.checked; });
  // which yard: the current one is pressed, the other walks the hero to the exit that leads there
  const locSeg = $('locSeg');
  function buildLocSeg() {
    locSeg.textContent = '';
    for (const id of Object.keys(LOCATIONS)) {
      const b = document.createElement('button');
      b.type = 'button'; b.id = 'loc-' + id; b.textContent = LOCATIONS[id].short;
      b.setAttribute('aria-pressed', String(id === MAP.id));
      b.addEventListener('click', () => goToLocation(id));
      locSeg.append(b);
    }
  }
  LOC_HOOKS.enter.push(buildLocSeg);
  $('rawChk').addEventListener('change', (e) => { raw = e.target.checked; lastKey = ''; });

  // ---------- stage input ----------
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
  stageEl.addEventListener('pointerleave', () => { hoverPt = null; hoverId = 0; tipEl.hidden = true; stageEl.classList.remove('over'); });
  function updateHover(dt) {
    hoverT -= dt;
    if (!hoverPt || hoverT > 0) return;
    hoverT = 0.08;
    const inst = pickFrac(hoverPt.fx, hoverPt.fy);
    const id = inst && inst.active ? inst.id : 0;
    hoverId = id;
    stageEl.classList.toggle('over', !!id);
    if (!id) { tipEl.hidden = true; return; }
    const a = actionsOf(inst)[0];
    tipEl.innerHTML = '';
    tipEl.append(document.createTextNode(nameOf(inst)));
    if (a) { const sm = document.createElement('small'); sm.textContent = a.label; tipEl.append(sm); }
    tipEl.style.left = hoverPt.x + 'px'; tipEl.style.top = hoverPt.y + 'px';
    tipEl.hidden = false;
  }

