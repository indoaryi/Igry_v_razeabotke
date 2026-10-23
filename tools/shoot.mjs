#!/usr/bin/env node
// Снимки сцены в безголовом браузере — чтобы видеть, что получилось, и сравнивать «до/после».
//   node tools/shoot.mjs <папка для снимков> [--page=pyatietazhki/index.html] [--w=1280 --h=900 --dpr=1] [сценарии…]
// Сценарии: far near all smoke trees playground building shed (по умолчанию — все).
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
const pagePath = opt.page || 'pyatietazhki/index.html';
const W = +(opt.w || 1280), H = +(opt.h || 900), DPR = +(opt.dpr || 1);
const prefix = opt.prefix || '';

// hero position, view and what to do before the shot
const SCEN = {
  far: { at: [14.2, 20.4], view: 'far' },
  near: { at: [14.2, 20.4], view: 'near' },
  all: { at: [14.2, 20.4], view: 'all' },
  smoke: { at: [14.2, 20.4], view: 'near', run: 'smoke', steps: [3.0, 0.6, 0.6] },
  smokefar: { at: [14.2, 20.4], view: 'far', run: 'smoke', steps: [3.5] },
  trees: { at: [24.6, 12.5], view: 'near' },
  playground: { at: [15.6, 14.2], view: 'near' },
  building: { at: [5.2, 16.0], view: 'near' },
  shed: { at: [8.4, 14.0], view: 'near' },
  far2: { at: [20.0, 8.0], view: 'far' },
  shoot: { at: [6.8, 16.2], view: 'near', run: 'shoot', steps: [1.25] },
  facade: { at: [20.5, 3.4], view: 'near' },
  walk: { at: [12.0, 20.2], view: 'near', run: 'walk', steps: [0.9] },
  facade2: { at: [4.6, 12.6], view: 'near' }
};
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
try { await page.waitForFunction(() => window.__yard && window.__yard.bootMs >= 0, null, { timeout: 120000 }); }
catch (e) { console.log('the page did not start:\n' + errors.join('\n')); await browser.close(); server.close(); process.exit(1); }
const boot = await page.evaluate(() => { window.__yard.noIntro = true; return { bootMs: window.__yard.bootMs, times: window.__yard.times }; });
console.log(`boot ${boot.bootMs} ms`, JSON.stringify(boot.times), `(page ready in ${Date.now() - t0} ms)`);
if (opt.probe) {
  const stats = await page.evaluate(() => {
    const by = {};
    for (const i of window.__yard.INST) {
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
  await page.evaluate(({ s }) => {
    const Y = window.__yard;
    Y.standUp && Y.standUp();
    Y.hero.act = null; Y.hero.path.length = 0; Y.hero.queue.length = 0; Y.hero.target = null;
    Y.hero.x = s.at[0]; Y.hero.z = s.at[1]; Y.hero.y = 0;
    for (const k of ['smoke', 'drink', 'punch', 'shoot', 'thr', 'reach']) { Y.hero[k].on = false; Y.hero[k].w = 0; Y.hero[k].t = 0; }
    Y.setView(s.view);
    Y.step(0.2);
  }, { s });
  await frames(3);
  const steps = s.steps || [0.6];
  if (s.run === 'smoke') await page.evaluate(() => window.__yard.startSmoke());
  if (s.run === 'walk') await page.evaluate(() => window.__yard.walkTo(16.5, 20.8));
  if (s.run === 'shoot') await page.evaluate(() => { const Y = window.__yard; Y.setGear && Y.setGear('hands', 'rifle'); Y.doShoot(); });
  let i = 0;
  for (const dt of steps) {
    const t1 = Date.now();
    await page.evaluate((dt) => window.__yard.step(dt), dt);
    await frames(3);
    const dbg = await page.evaluate(() => window.__yard.dbg());
    const file = path.join(outDir, `${prefix}${name}${steps.length > 1 ? '-' + (++i) : ''}.png`);
    const box = await page.locator('#stage').boundingBox();
    await page.screenshot({ path: file, clip: box, timeout: 600000 });
    console.log(`${name}: ${path.basename(file)} — ${dbg.VW}×${dbg.VH} art px ×${dbg.kDev}, ${dbg.drawCalls} draw calls, ${Date.now() - t1} ms`);
  }
}
if (opt.full) {
  await page.evaluate(() => window.__yard.renderCards && window.__yard.renderCards());
  for (const id of ['cards', 'found', 'plan']) {
    const el = page.locator('#' + id);
    await el.scrollIntoViewIfNeeded({ timeout: 600000 });
    const box = await el.boundingBox();
    if (box) await page.screenshot({ path: path.join(outDir, prefix + 'section-' + id + '.png'), clip: box, timeout: 600000 });
  }
}
const perf = await page.evaluate(async () => {
  // average time of a full stage redraw, in ms
  const Y = window.__yard; const n = 6; const t0 = performance.now();
  for (let i = 0; i < n; i++) { Y.step(1 / 12); await new Promise((r) => requestAnimationFrame(() => r())); }
  return (performance.now() - t0) / n;
});
console.log(`~${perf.toFixed(0)} ms per redraw here (software GPU)`);
const real = errors.filter((e) => !/ERR_FAILED|fonts\.g/.test(e));
if (real.length) { console.log('ERRORS:\n' + real.join('\n')); process.exitCode = 1; }
await browser.close();
server.close();
