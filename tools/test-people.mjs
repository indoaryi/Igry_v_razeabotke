#!/usr/bin/env node
// Проверка «одной модели человека» на полигоне: вещь героя садится на другого человека, управление переходит к другому и обратно,
// сохранение помнит, кем ты играешь, а тот, кого оставили, живёт как человек: ждёт, идёт следом, переходит с тобой в другую локацию.
//   node tools/test-people.mjs [--dev] [--shots=<папка для снимков>]
import fs from 'fs';
import path from 'path';
import { openGame } from './lib/page.mjs';

const args = process.argv.slice(2);
const shotsDir = (args.find((a) => a.startsWith('--shots=')) || '').slice(8);
const G = await openGame('poligon', { steady: true, dev: args.includes('--dev'), seed: 777 });
const { ev, reloadInto } = G;
// the world steps by hand; then a few frames, so the picture (and the people's snapshots) catch up
const run = async (sec) => { await G.page.evaluate((sec) => { const Y = window.__game; for (let t = 0; t < sec; t += 0.5) Y.step(0.5); }, sec); await G.frames(3); };
let fails = 0;
const check = (what, ok, detail) => { console.log((ok ? 'ok    ' : 'НЕТ   ') + what + (detail ? ' — ' + detail : '')); if (!ok) fails++; };
const world = async () => JSON.parse(await ev(`(() => { const d = saveData(); delete d.saved; return JSON.stringify(d); })()`));
const shot = async (name) => {
  if (!shotsDir) return;
  fs.mkdirSync(shotsDir, { recursive: true });
  await G.page.evaluate(() => document.getElementById('stageBox').scrollIntoView({ block: 'start' }));
  const box = await G.page.locator('#stage').boundingBox();
  await G.page.screenshot({ path: path.join(shotsDir, name), clip: box, timeout: 600000 });
};

// ---------- a thing of the hero's on somebody else ----------
const heroLook = await ev(`HERO.look.id`);           // the hero as he starts (on the range — in the jacket)
check('у прапорщика свой комплект', await ev(`dressedModel(SOMOV).look.id`) === 'kzu');
await ev(`(() => { setView('near'); const p = nearestFree(SOMOV.x + 0.6, SOMOV.z + 1.8, 2); walkTo(p[0], p[1]); })()`);
await run(6);
check('у героя есть шлем', await ev(`invCount(INV.hero, 'helmet')`) === 1);
await ev(`lendHelmet()`);
await run(1);
const pieces = await ev(`SOMOV.model.look.pieces.join(',')`);
check('шлем героя надет на прапорщика', /armorHelmet/.test(pieces) && !/kzuHelmet/.test(pieces), pieces);
check('остальное на нём своё', /kzuPack/.test(pieces) && /kzuVest/.test(pieces));
check('у героя модель прежняя', await ev(`HERO.look.id`) === heroLook, heroLook);
check('шлем перешёл из вещей героя в вещи прапорщика', await ev(`invCount(INV.hero, 'helmet') === 0 && invCount(SOMOV.inv, 'helmet') === 1`));
await ev(`hero.tyaw = yawTo(SOMOV.x, SOMOV.z)`); await run(1);
await shot('1-somov-in-hero-helmet.png');

// ---------- control passes to him ----------
const heroAt = JSON.parse(await ev(`JSON.stringify([hero.x, hero.z])`));
check('управление переходит к прапорщику', await ev(`takeControl(SOMOV)`) === true);
check('теперь «герой» — это он', await ev(`hero === SOMOV && hero.id`) === 'somov');
check('его вещи — вещи игрока', await ev(`INV.hero === SOMOV.inv && invCount(INV.hero, 'rub') === 400`));
check('его одежда — снаряжение игрока', await ev(`equip === SOMOV.gear && equip.head === 'helmet' && HERO.look.id === 'kzu|helmet'`));
check('прежний герой стал человеком рядом', await ev(`(() => { const h = personById('hero'); return !!h && !!h.inst && h.mode === 'wait' && personHere(h); })()`));
await ev(`(() => { const p = nearestFree(hero.x + 3, hero.z - 1.5, 3); walkTo(p[0], p[1]); })()`);
await run(5);
const moved = JSON.parse(await ev(`JSON.stringify({ me: [hero.x, hero.z], him: [personById('hero').x, personById('hero').z] })`));
check('прапорщик идёт, куда сказали', Math.hypot(moved.me[0] - 15.4, moved.me[1] - 16.9) > 1, moved.me.map((v) => v.toFixed(2)).join(', '));
check('герой ждёт, где стоял', Math.hypot(moved.him[0] - heroAt[0], moved.him[1] - heroAt[1]) < 0.3);
await shot('2-steering-somov.png');
await ev(`personFollow(personById('hero'))`);
await run(6);
check('по просьбе герой идёт следом', await ev(`Math.hypot(personById('hero').x - hero.x, personById('hero').z - hero.z)`) < 3);
await shot('3-hero-follows.png');

// ---------- the save remembers who you are ----------
check('сохранение в слот 1', await ev(`saveTo('1')`));
const before = await world();
await reloadInto(`loadSlot('1')`);
const after = await world();
check('после загрузки ты снова прапорщик', await ev(`hero.id`) === 'somov' && await ev(`HERO.look.id`) === 'kzu|helmet');
check('и герой там же, человеком', await ev(`(() => { const h = personById('hero'); return !!h && !!h.inst && h.mode === 'follow'; })()`));
check('мир тот же, что сохраняли', JSON.stringify(before) === JSON.stringify(after));

// ---------- through an exit with him, then back into the hero ----------
const exit = await ev(`(MAP.exits || [])[0] ? MAP.exits[0].to : null`);
if (exit) {
  await ev(`goToLocation(${JSON.stringify(exit)})`);
  for (let i = 0; i < 40 && (await ev('MAP.id')) !== exit; i++) await run(1);
  await run(2);
  check('в другую локацию — вместе', await ev(`MAP.id === ${JSON.stringify(exit)} && SOMOV.loc === MAP.id && personById('hero').loc === MAP.id && personHere(personById('hero'))`));
}
check('управление возвращается к герою', await ev(`takeControl(personById('hero'))`) === true);
check('герой снова свой', await ev(`hero.id === 'hero' && HERO.look.id === ${JSON.stringify(heroLook)} && !!SOMOV.inst && SOMOV.mode === 'wait'`));
check('прапорщик забрал свои вещи', await ev(`SOMOV.inv !== INV.hero && invCount(SOMOV.inv, 'rub') === 400`));
await run(2);
await shot('4-back-in-hero.png');
// ---------- he sells the helmet he is wearing: off it comes ----------
await ev(`invAdd(INV.hero, MONEY, 500)`);
await ev(`(() => { openTrade(SOMOV); DEAL.take.set('helmet', 1); dealPay(); dealDo(); closeTrade(); })()`);
await run(1);
check('проданный шлем прапорщик снимает', await ev(`SOMOV.gear.head === null && invCount(SOMOV.inv, 'helmet') === 0 && invCount(INV.hero, 'helmet') === 1`));
check('и он снова в своём шлеме', await ev(`SOMOV.model.look.id`) === 'kzu');
check('на странице нет ошибок', G.errors.length === 0, G.errors.join(' | '));
console.log(fails ? `\nНе прошло: ${fails}` : '\nВсё прошло.');
await G.close();
process.exitCode = fails ? 1 : 0;
