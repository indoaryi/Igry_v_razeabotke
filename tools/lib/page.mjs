// A game page in a headless browser for checks: a local server for the repository, Chromium with a software GPU,
// and — when asked — a page whose clock stands still, whose dice are seeded and whose world moves only by __game.step,
// so that two builds that behave the same give the same pixels.
import fs from 'fs';
import path from 'path';
import http from 'http';
import { createRequire } from 'module';
import { root } from './modules.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = createRequire('/opt/npm-tools/node_modules/')('playwright')); }

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp' };
// opts: { w, h, dpr, steady: true (frozen clock, seeded dice, world paused, no intro), seed }
export async function openGame(game, opts = {}) {
  const server = http.createServer((req, res) => {
    const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: opts.w || 900, height: opts.h || 700 }, deviceScaleFactor: opts.dpr || 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  if (opts.steady) {
    await page.addInitScript((seed) => {
      Object.defineProperty(window, '__game', { configurable: true, get() { return this.__g; }, set(v) { v.paused = true; v.noIntro = true; this.__g = v; } });
      let t = 1000;
      performance.now = () => t;
      window.__clock = { add: (d) => { t += d; } };
      const raf = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => raf(() => cb(t));
      let s = seed;
      Math.random = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let x = Math.imul(s ^ s >>> 15, 1 | s); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
    }, opts.seed || 20261025);
  }
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/${opts.dev ? `build/${game}.dev.html` : `${game}/index.html`}`;
  const booted = () => page.waitForFunction(() => window.__game && window.__game.bootMs >= 0, null, { timeout: 300000, polling: 100 });
  await page.goto(url);
  await booted();
  const ev = (src) => page.evaluate((src) => window.__game.ev(src), src);
  const frames = (n) => page.evaluate((n) => new Promise((res) => { let k = 0; const f = () => (++k >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
  // run code that reloads the page (a load, a new game) and wait for the game to boot again
  const reloadInto = async (src) => { await Promise.all([page.waitForEvent('load', { timeout: 300000 }), ev(src).catch(() => null)]); await booted(); };
  const close = async () => { await browser.close(); server.close(); };
  return { page, ev, frames, booted, reloadInto, errors, close };
}
// how many pixels of two PNG pictures differ (worked out in the page, so no image library is needed)
export async function pixelDiff(page, a, b) {
  return page.evaluate(async ([a, b]) => {
    const load = (b64) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = 'data:image/png;base64,' + b64; });
    const [A, B] = await Promise.all([load(a), load(b)]);
    if (A.width !== B.width || A.height !== B.height) return { size: true };
    const px = (im) => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, im.width, im.height).data; };
    const da = px(A), db = px(B);
    let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let i = 0; i < da.length; i += 4) {
      if (da[i] !== db[i] || da[i + 1] !== db[i + 1] || da[i + 2] !== db[i + 2]) {
        n++; const p = i / 4, x = p % A.width, y = (p / A.width) | 0;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    return { n, share: n / (da.length / 4), box: n ? [x0, y0, x1, y1] : null };
  }, [a.toString('base64'), b.toString('base64')]);
}
