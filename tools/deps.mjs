#!/usr/bin/env node
// Проверка модулей игры: кто у кого что берёт и всё ли честно.
//   node tools/deps.mjs <папка игры>            — сводка; при нарушениях код выхода 1
//   node tools/deps.mjs <папка игры> --all      — ещё и связи: какой модуль какие имена у каких модулей берёт
//   node tools/deps.mjs <папка игры> --fix      — дописать недостающие импорты (и export у хозяина имени), убрать лишние,
//                                                 а имя, переехавшее в другой модуль, брать у нового хозяина
// Правила:
//   - движок (engine/) не импортирует ничего из игр: всё игровое приходит к нему через крючки (engine/src/core/game.js);
//   - ядро движка не импортирует необязательные части — библиотеку предметов (props), шагающие машины (machine) и людей (people):
//     игра может их не подключать (как пустая площадка ploshchadka/);
//   - импорты без кругов: модуль берёт только у тех, кто запускается раньше; ответ «наверх» идёт через крючки;
//   - каждое имя модуля — своё, импортированное или встроенное в браузер; импортированное имя есть в экспорте модуля-источника;
//   - в импортированное имя не пишут (менять чужую переменную — только функцией её хозяина);
//   - импорт без нужды не держат; имена верхнего уровня разные во всей игре (сборка склеивает модули в один скрипт);
//   - форма модуля простая: импорт — одна строка вида  import { a, b } from '…';  экспорт — слово export перед объявлением.
import fs from 'fs';
import path from 'path';
import { root, walkModules, readModule, withImports, withExport, GLOBALS } from './lib/modules.mjs';

const args = process.argv.slice(2);
const game = args.find((a) => !a.startsWith('--')) || 'pyatietazhki';
const showAll = args.includes('--all');
const fix = args.includes('--fix');
const man = JSON.parse(fs.readFileSync(path.join(root, game, 'build.json'), 'utf8'));

const { order, mods, cycles, missing } = walkModules(man.entry, readModule);
const isEngine = (f) => f.startsWith('engine/');
const isOptional = (f) => /^engine\/src\/(props|machine|people)\//.test(f);
const isCore = (f) => isEngine(f) && !isOptional(f);

// a cycle shows as the import that starts it, with one way round as an example
const cycleStarts = new Map();
for (const c of cycles) { const k = `${c[0]} импортирует ${c[1]}`; if (!cycleStarts.has(k)) cycleStarts.set(k, c.join(' → ')); }
const P = { form: [], cycles: [...cycleStarts].map(([k, ex]) => `${k}, а тот через других — его самого (${ex})`), missing, engineToGame: [], coreToOptional: [], notExported: [], unknown: [], writes: [], unused: [], dupes: [] };
const owner = new Map();
for (const f of order) for (const n of mods.get(f).top.keys()) { if (owner.has(n)) P.dupes.push(`${n}: ${owner.get(n)} и ${f}`); else owner.set(n, f); }
let nImports = 0, nExports = 0;
const usedExports = new Set();
const want = new Map();               // for --fix: file → { add: Map(name → owner), drop: Set(name), move: Map(name → new owner) }; owner → names to export
const wantExport = new Map();
const wantOf = (f) => { if (!want.has(f)) want.set(f, { add: new Map(), drop: new Set(), move: new Map() }); return want.get(f); };
const exportIn = (f, n) => { if (!wantExport.has(f)) wantExport.set(f, new Set()); wantExport.get(f).add(n); };
for (const f of order) {
  const m = mods.get(f);
  for (const s of m.form) P.form.push(`${f}:${s}`);
  const imported = new Map();          // name → source module
  for (const im of m.imports) {
    if (isEngine(f) && !isEngine(im.from)) P.engineToGame.push(`${f}:${im.line} ← ${im.from}`);
    if (isCore(f) && isOptional(im.from)) P.coreToOptional.push(`${f}:${im.line} ← ${im.from}`);
    const src = mods.get(im.from);
    for (const n of im.names) {
      nImports++;
      imported.set(n, im.from);
      if (src && !(src.top.get(n) || {}).exported) {
        const to = !src.top.has(n) && owner.get(n);
        P.notExported.push(`${f}:${im.line} ${n} — в ${im.from} нет такого экспорта` + (to ? `  (теперь оно в ${to})` : ''));
        if (src.top.has(n)) exportIn(im.from, n);
        else if (to) { wantOf(f).move.set(n, to); if (!mods.get(to).top.get(n).exported) exportIn(to, n); }
      }
      else usedExports.add(im.from + '|' + n);
    }
  }
  const used = new Set();
  for (const r of m.refs) {
    used.add(r.name);
    if (m.top.has(r.name)) continue;
    if (imported.has(r.name)) { if (r.write) P.writes.push(`${f}:${r.line} ${r.name} (хозяин — ${imported.get(r.name)})`); continue; }
    if (!GLOBALS.has(r.name)) {
      P.unknown.push(`${f}:${r.line} ${r.name}` + (owner.has(r.name) ? `  (есть в ${owner.get(r.name)} — нужен импорт)` : ''));
      if (owner.has(r.name)) { wantOf(f).add.set(r.name, owner.get(r.name)); if (!mods.get(owner.get(r.name)).top.get(r.name).exported) exportIn(owner.get(r.name), r.name); }
    }
  }
  for (const [n, from] of imported) if (!used.has(n)) { P.unused.push(`${f}: ${n} (из ${from})`); wantOf(f).drop.add(n); }
  for (const [, t] of m.top) if (t.exported) nExports++;
}
const uniq = (a) => [...new Set(a)];
const out = (title, list) => { list = uniq(list); console.log(`\n${title}: ${list.length ? '' : 'нет'}`); for (const s of list) console.log('  ' + s); return list.length; };
console.log(`${game}: ${order.length} модулей, ${owner.size} имён верхнего уровня, ${nImports} импортов, ${nExports} экспортов (${nExports - usedExports.size} из них в этой игре никто не берёт)`);
let bad = 0;
bad += out('Форма модуля не та', P.form);
bad += out('Нет файла, который импортируют', P.missing);
bad += out('Круги импортов', P.cycles);
bad += out('Движок берёт у игры', P.engineToGame);
bad += out('Ядро движка берёт у библиотеки, машин или людей', P.coreToOptional);
bad += out('Берут то, чего модуль не отдаёт', P.notExported);
bad += out('Неизвестные имена', P.unknown);
bad += out('Пишут в чужое имя', P.writes);
bad += out('Импорт без нужды', P.unused);
bad += out('Одно имя объявлено дважды', P.dupes);
if (showAll) {
  console.log('\nСвязи (в порядке запуска):');
  for (const f of order) {
    const m = mods.get(f);
    if (!m.imports.length) { console.log(`  ${f}: —`); continue; }
    console.log(`  ${f}:`);
    for (const im of m.imports) console.log(`    ← ${im.from}${im.names.length ? ': ' + im.names.join(', ') : ''}`);
  }
}
if (fix && (want.size || wantExport.size)) {
  const pos = (f) => order.indexOf(f);
  const changed = [];
  for (const [f, w] of want) {
    const m = mods.get(f);
    const by = new Map();
    for (const im of m.imports) { if (!im.names.length) continue; for (const n of im.names) if (!w.drop.has(n) && !w.move.has(n)) { if (!by.has(im.from)) by.set(im.from, new Set()); by.get(im.from).add(n); } }
    for (const [n, from] of [...w.add, ...[...w.move].filter(([n]) => !w.drop.has(n))]) { if (!by.has(from)) by.set(from, new Set()); by.get(from).add(n); }
    const plain = m.imports.filter((im) => !im.names.length).map((im) => ({ names: [], from: im.from }));
    const list = [...plain, ...[...by].sort((a, b) => pos(a[0]) - pos(b[0])).map(([from, names]) => ({ names: [...names], from }))];
    fs.writeFileSync(path.join(root, f), withImports(f, fs.readFileSync(path.join(root, f), 'utf8'), list));
    changed.push(`${f}: ${[...w.add.keys()].map((n) => '+' + n).concat([...w.drop].map((n) => '−' + n), [...w.move].map(([n, to]) => n + ' → ' + to)).join(' ')}`);
  }
  for (const [f, names] of wantExport) {
    let src = fs.readFileSync(path.join(root, f), 'utf8');
    const top = mods.get(f).top, lines = new Set([...names].map((n) => top.get(n).stmt));
    for (const line of lines) { const next = withExport(src, line); if (next) src = next; }
    fs.writeFileSync(path.join(root, f), src);
    changed.push(`${f}: export ${[...names].join(', ')}`);
  }
  console.log('\nИсправлено (проверь ещё раз):');
  for (const c of changed) console.log('  ' + c);
}
process.exitCode = bad ? 1 : 0;
