#!/usr/bin/env node
// Снимки сцены в безголовом браузере — чтобы видеть, что получилось, и сравнивать «до/после».
//   node tools/shoot.mjs <папка для снимков> [--game=pyatietazhki] [--w=1280 --h=900 --dpr=1] [сценарии…] [--probe] [--full] [--js="код"]
// Сценарии берутся из <игра>/shots.json (по умолчанию — все):
//   { "имя": { "loc": "локация", "at": [x, z], "view": "near|far|all", "js": "код до снимка", "act": "код после подготовки",
//              "steps": [секунды до каждого снимка], "checks": ["id галочки, которую включить"] } }
// Нужен Playwright с Chromium (WebGL2 через SwiftShader).
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
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const pos = args.filter((a) => !a.startsWith('--'));
const outDir = path.resolve(pos[0] || 'shots');
const pagePath = opt.page || (opt.game || 'pyatietazhki') + '/index.html';
const W = +(opt.w || 1280), H = +(opt.h || 900), DPR = +(opt.dpr || 1);
const prefix = opt.prefix || '';

const game = opt.game || 'pyatietazhki';
const SCEN = JSON.parse(fs.readFileSync(path.join(root, game, 'shots.json'), 'utf8'));
const names = pos.slice(1).length ? pos.slice(1) : Object.keys(SCEN);

const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: DPR });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
const t0 = Date.now();
await page.goto(`http://127.0.0.1:${port}/${pagePath}`);
try { await page.waitForFunction(() => window.__game && window.__game.bootMs >= 0, null, { timeout: 240000, polling: 250 }); }
catch (e) { console.log('the page did not start:\n' + errors.join('\n')); await browser.close(); server.close(); process.exit(1); }
const boot = await page.evaluate(() => { window.__game.noIntro = true; return { bootMs: window.__game.bootMs, times: window.__game.times }; });
console.log(`boot ${boot.bootMs} ms`, JSON.stringify(boot.times), `(page ready in ${Date.now() - t0} ms)`);
if (opt.probe) {
  const stats = await page.evaluate(() => {
    const by = {};
    for (const i of window.__game.INST) {
      const b = by[i.type] || (by[i.type] = { n: 0, tris: 0, draws: 0 });
      b.n++; for (const c of i.chunks) { b.draws++; b.tris += c.lines ? 0 : c.mesh.n / 3; }
    }
    return by;
  });
  let T = 0, D = 0;
  for (const [k, v] of Object.entries(stats).sort((a, b) => b[1].tris - a[1].tris)) { console.log(k.padEnd(12), String(v.n).padStart(4), 'objects', String(Math.round(v.tris)).padStart(8), 'triangles', String(v.draws).padStart(5), 'draws'); T += v.tris; D += v.draws; }
  console.log('total', Math.round(T), 'triangles,', D, 'draws');
}
const frames = (n) => page.evaluate((n) => new Promise((res) => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);

for (const name of names) {
  const s = SCEN[name];
  if (!s) { console.log('unknown scenario', name); continue; }
  await page.evaluate(({ s, js }) => {
    const Y = window.__game;
    const want = s.loc || Object.keys(Y.LOCATIONS)[0];
    if (Y.MAP.id !== want) Y.enterLocation(want, 'start');
    Y.standUp && Y.standUp();
    Y.hero.act = null; Y.hero.path.length = 0; Y.hero.queue.length = 0; Y.hero.target = null;
    Y.hero.x = s.at[0]; Y.hero.z = s.at[1]; Y.hero.y = 0;
    for (const k of ['smoke', 'drink', 'punch', 'shoot', 'thr', 'reach']) { Y.hero[k].on = false; Y.hero[k].w = 0; Y.hero[k].t = 0; }
    Y.setView(s.view);
    if (js) Y.ev(js);
    Y.step(0.2);
  }, { s, js: opt.js || s.js || '' });
  await frames(3);
  const steps = s.steps || [0.6];
  await page.evaluate((on) => { for (const id of ['rawChk', 'gridChk']) { const c = document.getElementById(id); if (c && c.checked !== on.includes(id)) c.click(); } }, s.checks || []);
  if (s.act) await page.evaluate((act) => window.__game.ev(act), s.act);
  let i = 0;
  for (const dt of steps) {
    const t1 = Date.now();
    await page.evaluate((dt) => window.__game.step(dt), dt);
    await frames(3);
    const dbg = await page.evaluate(() => window.__game.dbg());
    const file = path.join(outDir, `${prefix}${name}${steps.length > 1 ? '-' + (++i) : ''}.png`);
    await page.evaluate(() => document.getElementById('stageBox').scrollIntoView({ block: 'start' }));
    const box = await page.locator('#stage').boundingBox();
    await page.screenshot({ path: file, clip: box, timeout: 600000 });
    console.log(`${name}: ${path.basename(file)} — ${dbg.VW}×${dbg.VH} art px ×${dbg.kDev}, ${dbg.drawCalls} draw calls, ${Date.now() - t1} ms`);
  }
}
if (opt.full) {
  await page.evaluate(() => window.__game.renderCards && window.__game.renderCards());
  for (const id of ['cards', 'found', 'plan']) {
    const el = page.locator('#' + id);
    await el.scrollIntoViewIfNeeded({ timeout: 600000 });
    const box = await el.boundingBox();
    if (box) await page.screenshot({ path: path.join(outDir, prefix + 'section-' + id + '.png'), clip: box, timeout: 600000 });
  }
}
const perf = await page.evaluate(async () => {
  // average time of a full stage redraw, in ms
  const Y = window.__game; const n = 6; const t0 = performance.now();
  for (let i = 0; i < n; i++) { Y.step(1 / 12); await new Promise((r) => requestAnimationFrame(() => r())); }
  return (performance.now() - t0) / n;
});
console.log(`~${perf.toFixed(0)} ms per redraw here (software GPU)`);
const real = errors.filter((e) => !/ERR_FAILED|fonts\.g/.test(e));
if (real.length) { console.log('ERRORS:\n' + real.join('\n')); process.exitCode = 1; }
await browser.close();
server.close();
