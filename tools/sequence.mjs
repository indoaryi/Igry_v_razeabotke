#!/usr/bin/env node
// Покадровая проверка анимации: часы игры останавливаются, тест сам шагает время и снимает сцену после каждого шага.
//   node tools/sequence.mjs <папка> [--game=pyatietazhki] --setup="код" [--each="код"] [--dt=0.25] [--n=24] [--view=near] [--w=1000 --h=720] [--cols=6] [--loc=yard2] [--kind=b32]
// Код выполняется внутри игры (видит её имена). Пишет кадры frame-NN.png и лист sheet.png.
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
const outDir = path.resolve(args.find((a) => !a.startsWith('--')) || 'seq');
fs.mkdirSync(outDir, { recursive: true });
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': p.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: +(opt.w || 1000), height: +(opt.h || 720) } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await page.goto(`http://127.0.0.1:${server.address().port}/${opt.game || 'pyatietazhki'}/index.html`);
await page.waitForFunction(() => window.__game && window.__game.bootMs >= 0, null, { timeout: 240000, polling: 250 });
const frames = (n) => page.evaluate((n) => new Promise((res) => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
await page.evaluate(({ loc, view, setup, kind }) => {
  const Y = window.__game;
  Y.noIntro = true; Y.paused = true;
  if (Y.MAP.id !== loc) Y.enterLocation(loc, 'start');
  Y.setView(view);
  for (const id of ['rawChk', 'gridChk']) { const c = document.getElementById(id); if (c.checked) c.click(); }
  if (setup) Y.ev(setup);
  Y.step(0.05);
  document.getElementById('stageBox').scrollIntoView({ block: 'start' });
  window.__seqKind = kind;
}, { loc: opt.loc || 'yard2', view: opt.view || 'near', setup: opt.setup || '', kind: opt.kind || '' });
const n = +(opt.n || 24), dt = +(opt.dt || 0.25), shots = [];
for (let i = 0; i < n; i++) {
  if (i > 0) await page.evaluate(({ dt, each }) => { const Y = window.__game; Y.step(dt); if (each) Y.ev(each); }, { dt, each: opt.each || '' });
  await frames(2);
  const r = await page.evaluate(() => {
    const Y = window.__game, st = document.getElementById('stage');
    const info = Y.ev(`(() => { const m = (hero.act && hero.act.inst && hero.act.inst.machine) || (hero.vehicle && hero.vehicle.machine) || MACHINES.find((q) => q.inst && (!window.__seqKind || q.kind === window.__seqKind)); return [hero.act ? hero.act.kind + ':' + (hero.act.stage || '') + ':' + (hero.act.st || 0).toFixed(2) : '-', m ? m.mode + ' door ' + m.door.toFixed(2) + ' crouch ' + m.crouch.toFixed(2) : '', 'hero ' + hero.x.toFixed(2) + ',' + hero.z.toFixed(2) + (hero.inside ? ' inside' : '')].join(' | '); })()`);
    return { url: st.toDataURL('image/png'), info };
  });
  const file = path.join(outDir, `frame-${String(i).padStart(2, '0')}.png`);
  fs.writeFileSync(file, Buffer.from(r.url.split(',')[1], 'base64'));
  shots.push(file);
  console.log(i, (i * dt).toFixed(2), r.info);
}
// contact sheet
const cols = +(opt.cols || 6);
const sheet = await page.evaluate(async ({ urls, cols, crop }) => {
  const imgs = await Promise.all(urls.map((u) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = u; })));
  const w = imgs[0].width, h = imgs[0].height, c = crop ? crop.split(',').map(Number) : [0, 0, w, h];
  const cw = c[2], ch = c[3], rows = Math.ceil(imgs.length / cols), k = Math.min(1, 1800 / (cols * cw));
  const cv = document.createElement('canvas'); cv.width = Math.round(cols * cw * k); cv.height = Math.round(rows * ch * k);
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = k < 1;
  imgs.forEach((im, i) => { g.drawImage(im, c[0], c[1], cw, ch, (i % cols) * cw * k, Math.floor(i / cols) * ch * k, cw * k, ch * k); g.fillStyle = '#fff'; g.font = '14px sans-serif'; g.fillText(String(i), (i % cols) * cw * k + 4, Math.floor(i / cols) * ch * k + 16); });
  return cv.toDataURL('image/png');
}, { urls: shots.map((f) => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64')), cols, crop: opt.crop || '' });
fs.writeFileSync(path.join(outDir, 'sheet.png'), Buffer.from(sheet.split(',')[1], 'base64'));
console.log('sheet', path.join(outDir, 'sheet.png'), errors.length ? 'ERRORS: ' + errors.join(' | ') : '');
await browser.close();
server.close();
