  // ================= boot =================
  function viewRect() {
    const lv = lastView; if (!lv) return null;
    return lv.over ? [lv.ox, lv.oy, lv.ox + lv.v.w / lv.sc, lv.oy + lv.v.h / lv.sc] : [lv.ox, lv.oy, lv.ox + VW, lv.oy + VH];
  }
  // what survives a page update for someone who has the yard open: where the hero stood, his gear and supplies, the view
  function hotData() {
    return { x: hero.x, z: hero.z, y: hero.y, yaw: hero.yaw, equip: Object.assign({}, equip), counts: ITEMS.filter((i) => i.use).map((i) => [i.id, i.count]), view: viewMode };
  }
  function applyHot(d) {
    if (!d || typeof d !== 'object' || !Number.isFinite(d.x)) return false;
    if (d.equip) for (const k of ['body', 'head', 'hands']) if (k in d.equip && (d.equip[k] === null || itemById(d.equip[k]))) equip[k] = d.equip[k];
    if (Array.isArray(d.counts)) for (const [id, n] of d.counts) { const it = itemById(id); if (it && Number.isFinite(n)) it.count = Math.max(0, n | 0); }
    if (Number.isFinite(d.z) && !(d.y > 0.05) && d.x > 0 && d.x < 30 && d.z > 0 && d.z < 30 && !blockedAt(d.x, d.z)) { hero.x = d.x; hero.z = d.z; }
    if (Number.isFinite(d.yaw)) hero.yaw = hero.tyaw = d.yaw;
    return true;
  }
  function boot(hot) {
    const resumed = applyHot(hot);
    if (resumed) window.__yard.noIntro = true;
    const t0 = performance.now(), T = {}, mark = (k) => { T[k] = Math.round(performance.now() - t0); };
    buildDecals(); mark('decals');
    buildWorld(); mark('world');
    initDyn();
    initPigeons();
    buildNav(); mark('nav');
    ground = buildGround(); uploadGround(ground); mark('ground');
    HERO = buildHero(equip);
    for (const it of ITEMS) icons[it.id] = iconCanvas(it.id);
    renderItems(); mark('ui');
    fitStage();
    window.__yard.times = T;
    if ('ResizeObserver' in window) new ResizeObserver(() => fitStage()).observe(stageEl); else window.addEventListener('resize', fitStage);
    buildFound(); buildLegend(); drawPlanBase(); buildCards(); buildData();
    $('loading').hidden = true;
    window.__yard.bootMs = Math.round(performance.now() - t0);
    if (!reduceMotion) {
      let touched = false;
      document.addEventListener('pointerdown', () => { touched = true; }, { capture: true });
      const sw = INST.find((i) => i.n === 1);
      setTimeout(() => { if (!touched && !window.__yard.noIntro) goSwing(sw); }, 900);
      setTimeout(() => {
        if (touched || window.__yard.noIntro || !hero.act || hero.act.kind !== 'swing') return;
        goSit(byType('platform')[0]); hero.queue.push({ type: 'smoke' });
      }, 13000);
    }
    if (resumed && hot.view && vBtns[hot.view] && hot.view !== viewMode) vBtns[hot.view].click();
    try { if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(hotData); } catch (e) { /* no live updates here */ }
    requestAnimationFrame(frame);
    setTimeout(renderCards, 60);
  }
  window.__yard = {
    hero, equip, INST, MAP, byType, setGear, onItem, walkTo, doDefault, goSwing, goBar, goSlide, goTower, goThrow, goSearch, goSit, goGraffiti, goCans, goDoor, goSubstation,
    doShoot, startSmoke, startDrink, standUp, turn, stage: stageEl, scene, layer, ACT, viewToWorld, pickFrac, findPath,
    setView: (m) => vBtns[m].click(), dbg: () => ({ drawCalls, VW, VH, kDev, view: lastView && { ox: lastView.ox, oy: lastView.oy, sc: lastView.sc } }),
    step: (sec) => { for (let t = 0; t < sec; t += 1 / 30) update(1 / 30, viewRect()); lastKey = ''; camX = null; }, act: () => hero.act && { kind: hero.act.kind, stage: hero.act.stage, w: hero.act.w },
    sprite: (c, yaw, size = [140, 190]) => {
      const ctx0 = Object.assign({ t: 0, phase: 0, walkW: 0, runW: 0, sitW: 0, smokeW: 0, smokeT: 0, drinkW: 0, drinkT: 0, punchW: 0, punchT: 0, shootW: 0, shootT: 0, throwW: 0, throwT: 0, reachW: 0, reachT: 0 }, c);
      const pose = buildPose(ctx0, HERO.D, equip.hands === 'rifle');
      const B = evalBones(pose.p, [0, 0, 0], yaw, HERO.D);
      const cv = document.createElement('canvas'); cv.width = size[0]; cv.height = size[1];
      render3D(TGT_SMALL, { w: size[0], h: size[1], ax: size[0] / 2, ay: size[1] - 20, s: S }, { main: heroList(B, pose) }, false, cv.getContext('2d'), 0, 0);
      return cv.toDataURL();
    },
    pigeons: PIGEONS,
    renderCards: () => renderCards(), cardCanvases: () => CARDS.map((c) => c.cv), plan: planEl, ground: () => ground, noIntro: false
  };
  let prev = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    try {
      update(dt, viewRect());
      if (stageVisible) drawStage(dt, hero.t);
      if (portraitVisible) drawPortrait(now / 1000);
      updateHud(); updateContext(dt); updateHover(dt); drawPlan(dt);
    } catch (err) { console.error(err); }
    requestAnimationFrame(frame);
  }
  let booted = false;
  const start = (data) => { if (booted) return; booted = true; try { boot(data || {}); } catch (e) { console.error(e); $('loading').textContent = 'Не получилось собрать двор: ' + e.message; } };
  setTimeout(() => {
    const h = window.claude && window.claude.hot;
    if (h && h.ready) h.ready(start); else start((h && h.data) || {});
  }, 30);
