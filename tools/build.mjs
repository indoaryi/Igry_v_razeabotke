#!/usr/bin/env node
// Сборка игры в одну самодостаточную страницу.
//   node tools/build.mjs pyatietazhki
// Читает <игра>/build.json: шаблон страницы, фото, список частей кода (движок + игра) в порядке склейки.
// Части склеиваются в один скрипт внутри общей функции, поэтому видят друг друга напрямую.
// Пишет две версии:
//   <игра>/index.html          — полная страница для GitHub Pages
//   build/<игра>.html          — то же без обёртки документа, для артефакта Claude
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const game = process.argv[2] || 'pyatietazhki';
const man = JSON.parse(fs.readFileSync(path.join(root, game, 'build.json'), 'utf8'));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const js = man.parts.map(read).join('');
const photo = man.photo
  ? `<script>document.getElementById('photoImg').src = 'data:image/jpeg;base64,${fs.readFileSync(path.join(root, man.photo)).toString('base64')}';</script>`
  : '';
const script = `<script>\n(() => {\n${js}})();\n</script>\n`;

let page = read(man.page);
if (!page.includes('<!--PHOTO-->\n') || !page.includes('<!--SCRIPT-->\n')) throw new Error('page template lacks markers');
page = page.replace('<!--PHOTO-->\n', () => photo + '\n').replace('<!--SCRIPT-->\n', () => script);

const SKELETON = '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0;font:14px -apple-system,BlinkMacSystemFont,sans-serif;background:#fff;color:#000}img{max-width:100%}[hidden]:not([hidden=until-found i]){display:none!important}</style></head><body>\n';

const out = path.join(root, man.out);
fs.writeFileSync(out, SKELETON + page + '\n</body></html>\n');
const art = path.join(root, man.artifact);
fs.mkdirSync(path.dirname(art), { recursive: true });
fs.writeFileSync(art, page);
console.log(`built ${path.relative(root, out)} (${(fs.statSync(out).size / 1024).toFixed(0)} KB), ${path.relative(root, art)}; ${man.parts.length} parts, ${js.split('\n').length} lines of code`);
