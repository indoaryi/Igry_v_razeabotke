  // ================= the empty lot: the smallest game on the engine =================
  // No catalog things at all — only the ground, the light of the hour and the hero. If this builds and the hero walks,
  // the engine stands on its own (tools/deps.mjs ploshchadka checks the code, tools/shoot.mjs the picture).
  // Ground, one character per 1 m cell: .  lawn   ,  weeds   :  trodden earth   #  asphalt   _  concrete
  import { $ } from '../../engine/src/core/prelude.js';
  import { buildDecals } from '../../engine/src/render/decals.js';
  import { LOCATIONS } from '../../engine/src/world/map.js';
  import { enterLocation } from '../../engine/src/world/locations.js';
  import { buildHero, equip, setHero } from '../../engine/src/hero/model.js';
  import { hero } from '../../engine/src/hero/hero.js';
  import { beginDrink, beginSmoke, busyAct, doPunch } from '../../engine/src/hero/state.js';
  import { GAME_API, prepareStage, runFrames } from '../../engine/src/core/run.js';
  LOCATIONS.lot = {
    id: 'lot', name: 'Пустая площадка', short: 'Площадка',
    size: [16, 16],
    ground: [
      ',,,,,,,,,,,,,,,,',
      ',..............,',
      ',.____________.,',
      ',._##########_.,',
      ',._##########_.,',
      ',._##########_.,',
      ',._##########_.,',
      ',._##########_.,',
      ',._##########_.,',
      ',._##########_.,',
      ',._##########_.,',
      ',._##########_.,',
      ',.____________.,',
      ',.....:::......,',
      ',,,,,,::,,,,,,,,',
      ',,,,,,,,,,,,,,,,'
    ],
    paths: [[[6.6, 15.8], [6.9, 13.6], [7.6, 12.7]]],
    objects: [],
    spawns: { start: { at: [8, 8.6], yaw: -1.9 } },
    butterflies: false
  };
  // the hero's hands, with no rules about items: the engine's overlays as they are
  $('aSmoke').addEventListener('click', () => { if (hero.smoke.on) hero.smoke.on = false; else if (!busyAct()) beginSmoke(); });
  $('aDrink').addEventListener('click', () => { if (hero.drink.on) hero.drink.on = false; else if (!busyAct()) beginDrink(); });
  $('aPunch').addEventListener('click', doPunch);

  function boot() {
    const t0 = performance.now();
    buildDecals();
    enterLocation('lot', 'start');
    setHero(buildHero(equip));
    prepareStage();
    $('loading').hidden = true;
    GAME_API.bootMs = Math.round(performance.now() - t0);
    runFrames();
  }
  setTimeout(() => { try { boot(); } catch (e) { console.error(e); $('loading').textContent = 'Не получилось собрать площадку: ' + e.message; } }, 30);
