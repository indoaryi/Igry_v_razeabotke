#!/usr/bin/env node
// Проверка сохранений от начала до конца: немного поиграть, сохранить в слот, загрузить (страница перезагружается) и сравнить мир;
// потом то же через файл, потом новая игра. Мир сравнивается целиком — тем, что идёт в сохранение: после загрузки сохранение
// должно выйти тем же, что загружали. Так проверяется каждая часть сохранения, какие бы модули их ни добавили.
//   node tools/test-saves.mjs <игра> [--dev]
import { openGame } from './lib/page.mjs';

const args = process.argv.slice(2);
const game = args.find((a) => !a.startsWith('--')) || 'poligon';
const G = await openGame(game, { steady: true, dev: args.includes('--dev'), seed: 777 });
const { ev, reloadInto } = G;
const run = (sec) => G.page.evaluate((sec) => { const Y = window.__game; for (let t = 0; t < sec; t += 0.5) Y.step(0.5); }, sec);
let fails = 0;
const check = (what, ok, detail) => { console.log((ok ? 'ok    ' : 'НЕТ   ') + what + (detail ? ' — ' + detail : '')); if (!ok) fails++; };
const world = async () => JSON.parse(await ev(`(() => { const d = saveData(); delete d.saved; return JSON.stringify(d); })()`));
const diff = (a, b, at = '') => {
  if (JSON.stringify(a) === JSON.stringify(b)) return [];
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return [`${at || '·'}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`];
  const out = [];
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) out.push(...diff(a[k], b[k], at ? at + '.' + k : k));
  return out;
};

const fresh = await world();
console.log(`${game}: частей сохранения ${Object.keys(fresh.parts).length} (${Object.keys(fresh.parts).join(', ')})`);
// play a little: another hour, a few steps, something remembered, a flag; then through an exit if there is one
await ev(`(() => { daySet(17.5); setFlag('test.flag', 3); const t = INST.find((i) => i.id && i.key); if (t) remember(t, { tested: true }); const p = nearestFree(hero.x + 2.5, hero.z + 1.5, 3); if (p) walkTo(p[0], p[1]); })()`);
await run(5);
const exit = await ev(`(MAP.exits || [])[0] ? MAP.exits[0].to : null`);
if (exit) {
  await ev(`goToLocation(${JSON.stringify(exit)})`);
  for (let i = 0; i < 40 && (await ev('MAP.id')) !== exit; i++) await run(1);
  await run(2);
  await ev(`(() => { const p = nearestFree(hero.x + 1.5, hero.z - 1.5, 3); if (p) walkTo(p[0], p[1]); })()`);
  await run(4);
}
const played = await world();
check('мир изменился, пока играли', diff(fresh, played).length > 0, diff(fresh, played).slice(0, 4).join('; '));
if (exit) { const auto = JSON.parse(await ev(`JSON.stringify(storeRead('auto'))`)); check('при переходе записалось автосохранение', !!auto && auto.loc === played.loc, auto ? auto.loc : 'нет'); }
check('сохранение в слот 1', await ev(`saveTo('1')`));
const text = await ev(`JSON.stringify(saveData())`);

await reloadInto(`loadSlot('1')`);
let d = diff(played, await world());
check('слот 1 возвращает тот же мир', !d.length, d.slice(0, 6).join('; '));
const panel = await G.page.evaluate(() => [...document.querySelectorAll('#saves .saves-tx')].map((e) => e.textContent));
check('панель показывает автосохранение и слот 1', !panel.length || (panel.length === 4 && !/пусто/.test(panel[1])), panel.join(' | ') || 'панели на странице нет');

await reloadInto(`newGame()`);
d = diff(fresh, await world());
check('новая игра начинается с начала', !d.length, d.slice(0, 6).join('; '));
check('слоты после новой игры на месте', !!JSON.parse(await ev(`JSON.stringify(storeRead('1'))`)));
check('старое автосохранение после новой игры не вернулось', !JSON.parse(await ev(`JSON.stringify(storeRead('auto'))`)));

await reloadInto(`loadText(${JSON.stringify(text)})`);
d = diff(played, await world());
check('файл возвращает тот же мир', !d.length, d.slice(0, 6).join('; '));
check('файл другой игры не принимается', !(await ev(`loadText(${JSON.stringify(JSON.stringify(Object.assign(JSON.parse(text), { game: 'другая' })))})`)));
check('файл новее формата не принимается', !(await ev(`loadText(${JSON.stringify(JSON.stringify(Object.assign(JSON.parse(text), { v: 999 })))})`)));
check('на странице нет ошибок', G.errors.length === 0, G.errors.join(' | '));
console.log(fails ? `\nНе прошло: ${fails}` : '\nВсё прошло.');
await G.close();
process.exitCode = fails ? 1 : 0;
