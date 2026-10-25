  // ================= the yard's quick actions under the stage: shoot, smoke, drink, punch =================
  // (the HUD chips, the context panel, zoom, the clock and taps on the stage are the engine's — engine/src/ui/hud.js)
  import { $ } from '../../engine/src/core/prelude.js';
  import { GAME, hook } from '../../engine/src/core/game.js';
  import { equip } from '../../engine/src/hero/wardrobe.js';
  import { hero } from '../../engine/src/hero/hero.js';
  import { doPunch } from '../../engine/src/hero/state.js';
  import { doShoot, startDrink, startSmoke } from './hero-state.js';
  const aSmoke = $('aSmoke'), aDrink = $('aDrink'), aPunch = $('aPunch'), aShoot = $('aShoot');
  let actKey = '';
  hook(GAME.frame, () => {
    const key = '' + hero.smoke.on + hero.drink.on + equip.hands + equip.head;
    if (key === actKey) return;
    actKey = key;
    aSmoke.textContent = hero.smoke.on ? 'Потушить' : 'Закурить'; aSmoke.setAttribute('aria-pressed', String(hero.smoke.on));
    aDrink.textContent = hero.drink.on ? 'Убрать банку' : 'Энергетик'; aDrink.setAttribute('aria-pressed', String(hero.drink.on));
    aShoot.disabled = equip.hands !== 'rifle';
  }, 20);
  aSmoke.addEventListener('click', () => { if (hero.smoke.on) hero.smoke.on = false; else startSmoke(); });
  aDrink.addEventListener('click', () => { if (hero.drink.on) hero.drink.on = false; else startDrink(); });
  aPunch.addEventListener('click', doPunch);
  aShoot.addEventListener('click', doShoot);
