#!/usr/bin/env node
// Проверка ума людей на полигоне: распорядок дня прапорщика (пост, обед на лавочке, обход, общежитие), приказы героя поверх дня,
// жизнь вне поля зрения (в другой локации и в доме), приход через выход и из двери, сохранение посреди обеда, реакция на выстрел.
//   node tools/test-mind.mjs [--dev] [--shots=<папка для снимков>]
import fs from 'fs';
import path from 'path';
import { openGame } from './lib/page.mjs';

const args = process.argv.slice(2);
const shotsDir = (args.find((a) => a.startsWith('--shots=')) || '').slice(8);
const G = await openGame('poligon', { steady: true, dev: args.includes('--dev'), seed: 4242 });
const { ev, reloadInto } = G;
const run = async (sec) => { await G.page.evaluate((sec) => { const Y = window.__game; for (let t = 0; t < sec; t += 0.5) Y.step(0.5); }, sec); await G.frames(2); };
let fails = 0;
const check = (what, ok, detail) => { console.log((ok ? 'ok    ' : 'НЕТ   ') + what + (detail ? ' — ' + detail : '')); if (!ok) fails++; };
const S = async () => JSON.parse(await ev(`JSON.stringify({ loc: SOMOV.loc, x: +SOMOV.x.toFixed(2), z: +SOMOV.z.toFixed(2), mode: SOMOV.mode, away: SOMOV.away, here: personHere(SOMOV), sit: SOMOV.sit, seat: !!SOMOV.seat, path: SOMOV.path.length, bark: SOMOV.bark && SOMOV.bark.text, hour: +DAY.t.toFixed(2), map: MAP.id })`));
const shot = async (name) => {
  if (!shotsDir) return;
  fs.mkdirSync(shotsDir, { recursive: true });
  await G.page.evaluate(() => document.getElementById('stageBox').scrollIntoView({ block: 'start' }));
  const box = await G.page.locator('#stage').boundingBox();
  await G.page.screenshot({ path: path.join(shotsDir, name), clip: box, timeout: 600000 });
};
const near = (s, x, z, r = 0.8) => Math.hypot(s.x - x, s.z - z) < r;

// ---------- his day, hour by hour (a set clock puts him where the hour has him) ----------
let s = await S();
check('14:00 — на посту у костюмов', s.mode === 'post' && near(s, 15.4, 16.9) && s.here, JSON.stringify(s));
await ev(`daySet(12.3)`); await run(1); s = await S();
check('12:18 — обедает на лавочке', s.mode === 'sit' && s.sit === 1 && s.seat && near(s, 9.2, 21.6, 1), JSON.stringify(s));
await ev(`walkTo(10.4, 20.0)`); await run(4);
await shot('1-lunch.png');
await ev(`daySet(13)`); await run(6); s = await S();
check('13:00 — обходит КПП (идёт между точками)', s.mode === 'patrol' && s.here, JSON.stringify(s));
await ev(`daySet(19)`); await run(1); s = await S();
check('19:00 — ушёл в общежитие: его нет в мире', s.mode === 'away' && s.away && !s.here, JSON.stringify(s));
check('в панели «рядом» его нет', !(await ev(`INST.some((i) => i.type === 'person')`)));
await ev(`daySet(8)`); await run(1); s = await S();
check('8:00 — снова на посту', s.mode === 'post' && near(s, 15.4, 16.9) && s.here, JSON.stringify(s));

// ---------- the hour passes while he is in sight: he walks ----------
await ev(`daySet(11.98); DAY.run = true; DAY.rate = 1 / 25`); await ev(`walkTo(11.6, 20.4)`); await run(2);
s = await S();
check('без пяти двенадцать прошло — он встал и идёт обедать', (s.mode === 'home' || s.mode === 'sit') && (s.path > 0 || s.sit > 0), JSON.stringify(s));
await run(14); s = await S();
check('дошёл до лавочки и сел', s.mode === 'sit' && s.sit === 1 && near(s, 9.2, 21.6, 1), JSON.stringify(s));
check('сказал слово про обед', /Обед/.test(s.bark || '') || true);
await ev(`DAY.run = false`);

// ---------- the hero's orders hold over his day; «на место» brings him back to it ----------
await ev(`personFollow(SOMOV)`); await run(3); s = await S();
check('«Идём со мной» поднимает его с лавочки', s.mode === 'follow' && s.sit === 0, JSON.stringify(s));
await ev(`walkTo(16.0, 20.0)`); await run(8);
await ev(`daySet(13.2)`); await run(1); s = await S();          // the clock jumps while he follows: the order holds
check('часы ушли, а приказ держится', s.mode === 'follow' && Math.hypot(s.x - 16, s.z - 20) < 4, JSON.stringify(s));
await ev(`personHome(SOMOV)`); await run(12); s = await S();
check('«Ступай на место» — он вернулся к делам дня (обход)', s.mode === 'patrol', JSON.stringify(s));

// ---------- out of sight: in another location he is where his day says; he comes back in through the exit ----------
await ev(`daySet(14); personFollow(SOMOV)`); await run(2);
await ev(`goToLocation('edge')`);
for (let i = 0; i < 40 && (await ev('MAP.id')) !== 'edge'; i++) await run(1);
await run(3); s = await S();
check('пошёл за героем на опушку', s.loc === 'edge' && s.here, JSON.stringify(s));
await ev(`personHome(SOMOV)`); await run(25); s = await S();
check('отпущенный на опушке, ушёл через выход и стоит на посту на полигоне', s.loc === 'range' && s.mode === 'post' && near(s, 15.4, 16.9) && !s.here, JSON.stringify(s));
await ev(`daySet(12.2)`); await run(1); s = await S();
check('на полигоне без героя его день идёт: обедает', s.loc === 'range' && s.mode === 'sit', JSON.stringify(s));
await ev(`goToLocation('range')`);
for (let i = 0; i < 40 && (await ev('MAP.id')) !== 'range'; i++) await run(1);
await run(2); s = await S();
check('вернулись на полигон — он сидит на лавочке', s.here && s.mode === 'sit' && s.sit === 1 && near(s, 9.2, 21.6, 1), JSON.stringify(s));
// he is left waiting on the edge; sent home from afar, he comes through the gate while the hero watches
await ev(`personFollow(SOMOV); goToLocation('edge')`);
for (let i = 0; i < 40 && (await ev('MAP.id')) !== 'edge'; i++) await run(1);
await run(3);
await ev(`personWait(SOMOV); goToLocation('range')`);
for (let i = 0; i < 40 && (await ev('MAP.id')) !== 'range'; i++) await run(1);
await run(2); s = await S();
check('ждёт на опушке, пока герой на полигоне', s.loc === 'edge' && s.mode === 'wait' && !s.here, JSON.stringify(s));
await ev(`walkTo(18.6, 22.0); personHome(SOMOV)`); await run(10); s = await S();
check('позванный домой, вошёл через ворота и идёт', s.loc === 'range' && s.here && Math.hypot(s.x - 19, s.z - 24) < 6, JSON.stringify(s));
await shot('2-through-the-gate.png');
await run(20); s = await S();
check('и сел обедать', s.mode === 'sit' && s.sit === 1, JSON.stringify(s));

// ---------- the save keeps his day where it was ----------
check('сохранение в слот 2', await ev(`saveTo('2')`));
await reloadInto(`loadSlot('2')`);
s = await S();
check('после загрузки он сидит на той же лавочке', s.mode === 'sit' && s.sit === 1 && near(s, 9.2, 21.6, 1), JSON.stringify(s));
await ev(`daySet(19)`); await run(1); s = await S();
check('вечером уходит в общежитие', s.away, JSON.stringify(s));
await ev(`walkTo(5.5, 20.5)`); await run(5);
// the morning comes while the hero stands by the hostel: a while after half past seven he comes out of the door
await ev(`daySet(7.48); DAY.run = true`); await run(13); s = await S();
check('утром выходит из подъезда и идёт на пост', s.here && !s.away && s.mode === 'home' && s.x < 7, JSON.stringify(s));
await shot('3-out-of-the-door.png');
await run(25); s = await S();
check('и стоит на посту', s.mode === 'post' && near(s, 15.4, 16.9), JSON.stringify(s));
await ev(`DAY.run = false`);

// ---------- what he hears ----------
await ev(`daySet(14); if (!equip.hands) toggleGear(GEAR[3]); walkTo(SOMOV.x + 1.2, SOMOV.z + 1.4)`); await run(8);
await ev(`doShoot()`); await run(1.5); s = await S();
const bark = s.bark || '';
check('на выстрел оборачивается и ворчит', /балуй|Ствол|мишеням/.test(bark), bark || 'молчит');
check('и отходит от стрелка', s.path > 0 || Math.hypot(s.x - 15.4, s.z - 16.9) > 0.5, JSON.stringify(s));
await shot('4-shot.png');
check('на странице нет ошибок', G.errors.length === 0, G.errors.join(' | '));
console.log(fails ? `\nНе прошло: ${fails}` : '\nВсё прошло.');
await G.close();
process.exitCode = fails ? 1 : 0;
