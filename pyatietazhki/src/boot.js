  // ================= the game's locations =================
  import { $ } from '../../engine/src/core/prelude.js';
  import { S, reduceMotion } from '../../engine/src/core/camera.js';
  import { GAME, hook } from '../../engine/src/core/game.js';
  import { TGT_SMALL, render3D } from '../../engine/src/render/webgl.js';
  import { buildDecals } from '../../engine/src/render/decals.js';
  import { LOCATIONS, MAP } from '../../engine/src/world/map.js';
  import { loadSaved, startSaving, whenReady } from '../../engine/src/world/state.js';
  import { INST, byType } from '../../engine/src/world/instances.js';
  import { enterLocation } from '../../engine/src/world/locations.js';
  import { HERO, buildHero, equip, setHero } from '../../engine/src/hero/model.js';
  import { buildPose, evalBones } from '../../engine/src/hero/skeleton.js';
  import { hero } from '../../engine/src/hero/hero.js';
  import { heroList } from '../../engine/src/hero/rig.js';
  import { goSit } from '../../engine/src/hero/state.js';
  import { GAME_API, prepareStage, runFrames } from '../../engine/src/core/run.js';
  import { MACHINE_HOOKS } from '../../engine/src/machine/machine.js';
  import { YARD1 } from './map.js';
  import { YARD2 } from './yard2.js';
  import { ITEMS, itemById } from './inventory.js';
  import { PIGEONS } from './pigeons.js';
  import { carAlarm, doShoot, goBar, goCans, goDoor, goGraffiti, goSearch, goSlide, goSubstation, goSwing, goThrow, goTower, startDrink, startSmoke } from './hero-state.js';
  import { iconCanvas } from './ui-portrait.js';
  import { icons, onItem, renderItems, setGear } from './ui-inventory.js';
  import { CARDS, buildLegend, drawPlan, planEl, renderCards } from './ui-breakdown.js';
  LOCATIONS.yard1 = YARD1;
  LOCATIONS.yard2 = YARD2;
  // a heavy machine stamping past parked cars sets their alarms off
  MACHINE_HOOKS.stomp.push((P) => {
    for (const c of byType('car')) if (c.dyn.alarm <= 0 && Math.hypot(c.center[0] - P[0], c.center[1] - P[2]) < 3.3) { carAlarm(c, 'От тяжёлых шагов у машины сработала сигнализация.'); break; }
  });

  // ================= boot =================
  // a save (if there is one: world/state.js) comes in two steps: the machines before the first location is built, the hero,
  // his supplies, the clock and the camera after it; what he wears must be one of the yard's things
  function boot(data) {
    const t0 = performance.now(), T = {}, mark = (k) => { T[k] = Math.round(performance.now() - t0); };
    buildDecals(); mark('decals');
    loadSaved(data, 'before');
    enterLocation(data && LOCATIONS[data.loc] ? data.loc : 'yard1', 'start'); mark('world');
    const resumed = loadSaved(data, 'after');
    if (resumed) {
      window.__yard.noIntro = true;
      for (const k of ['body', 'head', 'hands']) if (equip[k] !== null && !itemById(equip[k])) equip[k] = null;
    }
    setHero(buildHero(equip));
    for (const it of ITEMS) icons[it.id] = iconCanvas(it.id);
    renderItems(); mark('ui');
    prepareStage();
    window.__yard.times = T;
    buildLegend();
    $('loading').hidden = true;
    window.__yard.bootMs = Math.round(performance.now() - t0);
    if (!reduceMotion && MAP.id === 'yard1') {
      let touched = false;
      document.addEventListener('pointerdown', () => { touched = true; }, { capture: true });
      const sw = INST.find((i) => i.n === 1);
      setTimeout(() => { if (!touched && !window.__yard.noIntro) goSwing(sw); }, 900);
      setTimeout(() => {
        if (touched || window.__yard.noIntro || !hero.act || hero.act.kind !== 'swing') return;
        goSit(byType('platform')[0]); hero.queue.push({ type: 'call', fn: startSmoke });
      }, 13000);
    }
    startSaving();
    runFrames();
  }
  hook(GAME.frame, (dt) => drawPlan(dt), 30);
  // the test handle: the engine's (window.__game) with the yard's own names added
  window.__yard = Object.defineProperties(GAME_API, Object.getOwnPropertyDescriptors({
    setGear, onItem, goSwing, goBar, goSlide, goTower, goThrow, goSearch, goGraffiti, goCans, goDoor, goSubstation,
    doShoot, startSmoke, startDrink,
    sprite: (c, yaw, size = [140, 190]) => {
      const ctx0 = Object.assign({ t: 0, phase: 0, walkW: 0, runW: 0, sitW: 0, smokeW: 0, smokeT: 0, drinkW: 0, drinkT: 0, punchW: 0, punchT: 0, shootW: 0, shootT: 0, throwW: 0, throwT: 0, reachW: 0, reachT: 0 }, c);
      const pose = buildPose(ctx0, HERO.D, equip.hands === 'rifle');
      const B = evalBones(pose.p, [0, 0, 0], yaw, HERO.D);
      const cv = document.createElement('canvas'); cv.width = size[0]; cv.height = size[1];
      render3D(TGT_SMALL, { w: size[0], h: size[1], ax: size[0] / 2, ay: size[1] - 20, s: S }, { main: heroList(B, pose) }, false, cv.getContext('2d'), 0, 0);
      return cv.toDataURL();
    },
    get pigeons() { return PIGEONS; },
    renderCards: () => renderCards(), cardCanvases: () => CARDS.map((c) => c.cv), plan: planEl
  }));
  whenReady('pyatietazhki', (data) => { try { boot(data); } catch (e) { console.error(e); $('loading').textContent = 'Не получилось собрать двор: ' + e.message; } });
