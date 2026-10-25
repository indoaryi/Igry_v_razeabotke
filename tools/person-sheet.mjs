#!/usr/bin/env node
// Лист «со всех сторон» для человека: восемь сторон стоя, шаг, разговор, сидя, крупно голова и рюкзак, рядом герой для роста.
//   node tools/person-sheet.mjs <файл.png> [--game=poligon] [--look=KZU_LOOK] [--scale=3] [--views=sides,poses,close | pair (спереди и сзади)]
// Или несколько внешностей в ряд — например, одна и та же вещь на разных людях:
//   node tools/person-sheet.mjs ряд.png --lineup="Герой=dress(HERO_LOOK, []);В куртке=dress(HERO_LOOK, ['jacket']);Сомов в шлеме героя=dress(KZU_LOOK, ['helmet'])" [--views=pair]
// Рисует тем же движком, что и игра, без локации вокруг.
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = createRequire('/opt/npm-tools/node_modules/')('playwright')); }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return i < 0 ? [a.slice(2), true] : [a.slice(2, i), a.slice(i + 1)]; }));
const out = path.resolve(args.find((a) => !a.startsWith('--')) || 'person.png');
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': p.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await page.goto(`http://127.0.0.1:${server.address().port}/${opt.game || 'poligon'}/index.html`);
await page.waitForFunction(() => window.__game && window.__game.bootMs >= 0, null, { timeout: 240000, polling: 250 });
const views = String(opt.views || (opt.lineup ? 'front' : 'sides,poses,close')).split(',');
// the lineup: label=look expression, separated by ;
const lineup = opt.lineup ? String(opt.lineup).split(';').filter(Boolean).map((e) => { const i = e.indexOf('='); return { label: e.slice(0, i), expr: e.slice(i + 1) }; }) : null;
const looks = lineup ? '[' + lineup.map((e) => `{ label: ${JSON.stringify(e.label)}, look: ${e.expr} }`).join(', ') + ']' : 'null';
const url = await page.evaluate(({ K, views, look, looks }) => window.__game.ev(`(() => {
  const LOOKS = ${looks};
  const L = LOOKS ? LOOKS[0].look : ${look}, P0 = buildPerson(L), W = 150, H = 200;
  const ctx0 = { t: 0, phase: 0, walkW: 0, runW: 0, sitW: 0, smokeW: 0, smokeT: 0, drinkW: 0, drinkT: 0, punchW: 0, punchT: 0, shootW: 0, shootT: 0, throwW: 0, throwT: 0, reachW: 0, reachT: 0, talkW: 0, talkT: 0 };
  const list = [], views = ${JSON.stringify(views)};
  const names = ['спереди', 'спереди-справа', 'справа', 'сзади-справа', 'сзади', 'сзади-слева', 'слева', 'спереди-слева'];
  if (LOOKS) for (const e of LOOKS) {
    list.push({ yaw: Math.PI / 4, label: e.label, P: buildPerson(e.look) });
    if (views.includes('pair')) list.push({ yaw: Math.PI / 4 + Math.PI, label: e.label + ' · сзади', P: buildPerson(e.look) });
  }
  if (!LOOKS && views.includes('sides')) for (let i = 0; i < 8; i++) list.push({ yaw: Math.PI / 4 + i * Math.PI / 4, label: names[i] });
  if (!LOOKS && views.includes('pair')) { list.push({ yaw: Math.PI / 4, label: names[0] }); list.push({ yaw: Math.PI / 4 + Math.PI, label: names[4] }); }
  if (views.includes('poses')) {
    list.push({ yaw: Math.PI / 4 + Math.PI / 2, c: { walkW: 1, phase: 0.25 }, label: 'шаг' });
    list.push({ yaw: Math.PI / 4 - 0.5, c: { walkW: 1, runW: 1, phase: 0.3 }, label: 'бег' });
    list.push({ yaw: Math.PI / 4 - 0.4, c: { talkW: 1, talkT: 0.6 }, label: 'говорит' });
    list.push({ yaw: Math.PI / 4 + 0.5, c: { sitW: 1 }, sit: true, label: 'сидит' });
    list.push({ yaw: Math.PI / 4 - 0.3, hero: true, label: 'рядом герой' });
  }
  if (views.includes('close')) {
    list.push({ yaw: Math.PI / 4 - 0.25, zoom: 2.4, at: 'head', label: 'шлем крупно' });
    list.push({ yaw: Math.PI / 4 + Math.PI - 0.35, zoom: 1.9, at: 'chest', label: 'рюкзак крупно' });
    list.push({ yaw: Math.PI / 4 + 0.9, zoom: 1.9, at: 'chest', label: 'сбоку крупно' });
  }
  const shots = [];
  for (const v of list) {
    const P = v.P || P0, D = P.D;
    const c = Object.assign({}, ctx0, v.c || {});
    const pose = buildPose(c, D, false);
    const B = evalBones(pose.p, [0, 0, 0], v.yaw, D);
    const main = P.parts.map((pt) => ({ mesh: pt.mesh, model: mul(B[pt.bone], pt.off), mat: pt.mat, id: 3, flags: 16 }));
    if (v.hero) {
      const hp = buildPose(ctx0, HERO.D, equip.hands === 'rifle');
      const HB = evalBones(hp.p, [0.55, 0, -0.25], v.yaw + 0.3, HERO.D);
      for (const it of heroList(HB, hp)) main.push(it);
    }
    const z = v.zoom || 1, A = v.at ? xf(B[v.at], v.at === 'head' ? [0, 0.08, 0] : [0, 0.1, 0]) : [0, 0.9, 0];
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    render3D(TGT_SMALL, { w: W, h: H, ax: W / 2, ay: H / 2, s: S * z, A }, { main, shadow: [] }, false, cv.getContext('2d'), 0, 0);
    shots.push({ cv, label: v.label });
  }
  const cols = LOOKS ? Math.min(shots.length, 6) : 4, rows = Math.ceil(shots.length / cols), lab = 24;
  const sheet = document.createElement('canvas'); sheet.width = cols * W * ${K}; sheet.height = rows * (H * ${K} + lab);
  const g = sheet.getContext('2d');
  g.fillStyle = '#d9ddd6'; g.fillRect(0, 0, sheet.width, sheet.height);
  g.imageSmoothingEnabled = false;
  shots.forEach((s, i) => {
    const x = (i % cols) * W * ${K}, y = Math.floor(i / cols) * (H * ${K} + lab);
    g.fillStyle = (i % 2) ? '#cfd4cc' : '#d6dad2'; g.fillRect(x, y, W * ${K}, H * ${K} + lab);
    g.drawImage(s.cv, x, y + lab, W * ${K}, H * ${K});
    g.fillStyle = '#2a2d2b'; g.font = '600 15px sans-serif'; g.fillText(s.label, x + 12, y + 17);
  });
  return sheet.toDataURL('image/png');
})()`), { K: +(opt.scale || 3), views, look: opt.look || 'KZU_LOOK', looks });
fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
console.log('wrote', out, errors.length ? 'ERRORS: ' + errors.join(' | ') : '');
await browser.close();
server.close();
