#!/usr/bin/env node
// Сборка игры в одну самодостаточную страницу.
//   node tools/build.mjs pyatietazhki
// Читает <игра>/build.json: шаблон страницы, вход (src/main.js — из каких модулей состоит игра), фото локаций.
// Модули идут в том порядке, в каком их запустил бы сам браузер: каждый — после тех, у кого он берёт имена.
// Строки import выпадают, слово export снимается, и модули склеиваются в один скрипт внутри общей функции —
// поэтому имена верхнего уровня должны быть разными во всей игре (это проверяет tools/deps.mjs).
// Пишет три версии:
//   <игра>/index.html          — полная страница для GitHub Pages
//   build/<игра>.html          — то же без обёртки документа, для артефакта Claude
//   build/<игра>.dev.html      — игра прямо из модулей, без склейки (открывать через веб-сервер из корня репозитория):
//                                так браузер сам проверяет, что каждый модуль импортирует всё, что берёт
import fs from 'fs';
import path from 'path';
import { root, walkModules, joinable } from './lib/modules.mjs';

const game = process.argv[2] || 'pyatietazhki';
const man = JSON.parse(fs.readFileSync(path.join(root, game, 'build.json'), 'utf8'));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const { order, mods, cycles, missing } = walkModules(man.entry);
if (cycles.length || missing.length) {
  for (const c of cycles) console.error('круг импортов: ' + c.join(' → '));
  for (const m of missing) console.error('нет файла: ' + m);
  process.exit(1);
}
const js = order.map((f) => joinable(mods.get(f).src)).join('');
// location photos go in as data: URLs; the page picks the one for the location the hero is in
const photos = Object.entries(man.photos || {}).map(([k, f]) => `${JSON.stringify(k)}: 'data:image/jpeg;base64,${fs.readFileSync(path.join(root, f)).toString('base64')}'`);
const photo = photos.length ? `<script>window.YARD_PHOTOS = { ${photos.join(', ')} };</script>` : '';
const script = `<script>\n(() => {\n  'use strict';\n${js}})();\n</script>\n`;

const template = read(man.page);
if (!template.includes('<!--PHOTO-->\n') || !template.includes('<!--SCRIPT-->\n')) throw new Error('page template lacks markers');
const page = template.replace('<!--PHOTO-->\n', () => photo + '\n').replace('<!--SCRIPT-->\n', () => script);
const devPage = template.replace('<!--PHOTO-->\n', () => photo + '\n').replace('<!--SCRIPT-->\n', () => `<script type="module" src="../${man.entry}"></script>\n`);

const SKELETON = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>\n';

const out = path.join(root, man.out);
fs.writeFileSync(out, SKELETON + page + '\n</body></html>\n');
const art = path.join(root, man.artifact);
fs.mkdirSync(path.dirname(art), { recursive: true });
fs.writeFileSync(art, page);
const dev = path.join(root, 'build', game + '.dev.html');
fs.writeFileSync(dev, SKELETON + devPage + '\n</body></html>\n');
console.log(`built ${path.relative(root, out)} (${(fs.statSync(out).size / 1024).toFixed(0)} KB), ${path.relative(root, art)}, ${path.relative(root, dev)}; ${order.length} modules, ${js.split('\n').length} lines of code`);
