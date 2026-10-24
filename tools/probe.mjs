#!/usr/bin/env node
// Запустить код внутри игры с остановленными часами и напечатать результат — для быстрых проверок без снимков.
//   node tools/probe.mjs [--game=pyatietazhki] --loc=yard1 "код1" "код2" …
// Каждый кусок кода выполняется внутри игры (видит её имена: hero, walkTo, MACHINES…); между кусками можно шагать время: step(сек).
// Печатает то, что вернул каждый кусок (JSON), и ошибки страницы.
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
const codes = args.filter((a) => !a.startsWith('--'));
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
page.on('console', (m) => { if ((m.type() === 'error' || m.type() === 'warning') && !/Failed to load resource/.test(m.text())) errors.push(m.type() + ': ' + m.text()); });
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await page.goto(`http://127.0.0.1:${server.address().port}/${opt.game || 'pyatietazhki'}/index.html`);
await page.waitForFunction(() => window.__game && window.__game.bootMs >= 0, null, { timeout: 240000, polling: 250 });
await page.evaluate(({ loc }) => {
  const Y = window.__game; Y.noIntro = true; Y.paused = true;
  if (loc && Y.MAP.id !== loc) Y.enterLocation(loc, 'start');
}, { loc: opt.loc || '' });
for (const c of codes) {
  const r = await page.evaluate((c) => { try { return JSON.stringify(window.__game.ev('{ const step = (s) => window.__game.step(s); eval(' + JSON.stringify(c) + '); }')); } catch (e) { return 'THROW ' + e.message; } }, c);
  console.log(r);
}
if (errors.length) console.log('PAGE ERRORS:', errors.join(' | '));
await browser.close();
server.close();
