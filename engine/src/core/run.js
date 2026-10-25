  // ================= running a game: the stage gets ready, the frame loop, a handle for tests =================
  // A game's boot builds its first location and the hero, then calls prepareStage() and runFrames():
  //   buildDecals(); enterLocation('start-id', 'start'); setHero(buildHero(equip)); prepareStage(); runFrames();
  // window.__game is the handle tests and tools use (tools/shoot.mjs, tools/probe.mjs); a game may add its own names to it.
  let stageVisible = true;
  if ('IntersectionObserver' in window) new IntersectionObserver((es) => { for (const e of es) stageVisible = e.isIntersecting; }).observe(stageEl);
  function viewRect() {
    const lv = lastView; if (!lv) return null;
    return lv.over ? [lv.ox, lv.oy, lv.ox + lv.v.w / lv.sc, lv.oy + lv.v.h / lv.sc] : [lv.ox, lv.oy, lv.ox + VW, lv.oy + VH];
  }
  // size the stage to the page and follow it; read the page's colours for the air round the map
  function prepareStage() {
    fitStage();
    dayReadStage();
    if (window.matchMedia) { const mq = matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', dayReadStage); }
    if ('ResizeObserver' in window) new ResizeObserver(() => fitStage()).observe(stageEl); else window.addEventListener('resize', fitStage);
  }
  // ================= the world's step: the hero, the clock, the game's and the modules' own steps, effects, travel =================
  function update(dt, view) {
    heroStep(dt);
    dayUpdate(dt);
    for (const f of GAME.update) f(dt, view);
    updateFx(dt, view);
    updateTravel(dt);
    updateToast(dt);
  }
  const GAME_API = window.__game = {
    hero, equip, get INST() { return INST; }, get MAP() { return MAP; }, get LOCATIONS() { return LOCATIONS; }, byType, enterLocation, goToLocation,
    travel: () => travelState, walkTo, doDefault, goSit, standUp, turn, ACT, viewToWorld, pickFrac, findPath, stage: stageEl, scene, layer,
    setView: (m) => setView(m),
    dbg: () => ({ drawCalls, VW, VH, kDev, view: lastView && { ox: lastView.ox, oy: lastView.oy, sc: lastView.sc } }),
    // step the world by hand (tests stop the clock with paused = true)
    step: (sec) => { for (let t = 0; t < sec; t += 1 / 30) update(1 / 30, viewRect()); redraw(); recenter(); },
    act: () => hero.act && { kind: hero.act.kind, stage: hero.act.stage, w: hero.act.w },
    setHour: (h) => { daySet(h); redraw(); }, day: () => ({ t: DAY.t, run: DAY.run, goal: DAY.goal, look: Object.assign({}, DAYP) }),
    ev: (src) => eval(src),     // debugging: run code inside the game's scope
    ground: () => ground, paused: false, noIntro: false
  };
  let framePrev = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - framePrev) / 1000); framePrev = now;
    try {
      if (!GAME_API.paused) update(dt, viewRect());
      if (stageVisible) drawStage(dt, hero.t);
      updateHud(); updateClock(); updateContext(dt); updateHover(dt);
      for (const f of GAME.frame) f(dt, now);
    } catch (err) { console.error(err); }
    requestAnimationFrame(frame);
  }
  function runFrames() { framePrev = performance.now(); requestAnimationFrame(frame); }
