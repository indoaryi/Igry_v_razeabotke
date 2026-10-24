#!/usr/bin/env node
// Лист «со всех сторон» для шагающей машины: восемь сторон стоя, стоянка на колене, открытый люк, герой для масштаба.
//   node tools/machine-sheet.mjs <файл.png> [--game=pyatietazhki] [--loc=yard2] [--kind=b32] [--scale=3] [--views=stand,park,open]
// Рисует тем же движком, что и игра, без двора вокруг.
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
const out = path.resolve(args.find((a) => !a.startsWith('--')) || 'machine.png');
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
await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
await page.goto(`http://127.0.0.1:${server.address().port}/${opt.game || 'pyatietazhki'}/index.html`);
await page.waitForFunction(() => window.__game && window.__game.bootMs >= 0, null, { timeout: 240000, polling: 250 });
const views = String(opt.views || 'stand,park,open').split(',');
const url = await page.evaluate(({ loc, k, views, kind }) => {
  const Y = window.__game;
  Y.noIntro = true;
  if (Y.MAP.id !== loc) Y.enterLocation(loc, 'start');
  return Y.ev(`(() => {
    const m = MACHINES.find((q) => q.inst && (!${JSON.stringify(kind)} || q.kind === ${JSON.stringify(kind)})), K = ${k}, W = 260, H = 330;
    const keep = JSON.parse(JSON.stringify({ x: m.x, z: m.z, yaw: m.yaw, crouch: m.crouch, door: m.door, dogs: m.dogs, wheel: m.wheel, shutter: m.shutter, lamps: m.lamps, glow: m.glow, lean: m.lean, arms: m.arms }));
    const feetKeep = m.feet;
    const shots = [];
    const pose = (c) => {
      m.yaw = c.yaw; m.x = 15; m.z = 15;
      m.crouch = c.park ? 1 : 0; m.lean = c.park ? m.K.D.leanPark : m.K.D.leanStand;
      m.arms = [0, 1].map((i) => Object.assign({}, c.park ? armPark(m.K.D, i) : armRest(m.K.D, i)));
      m.door = c.door || 0; m.dogs = c.door ? 1 : 0; m.wheel = c.door ? -2.6 : 0;
      m.shutter = c.park ? 0 : 1; m.lamps = c.park ? 0 : 1; m.glow = c.park ? 0.3 : 1;
      m.feet = [0, 1].map((i) => footPose(m, i, c.park ? 1 : 0));
      m.bodyX = m.bodyY = m.bodyZ = m.roll = m.pitch = m.twist = 0; m.cupola = 0; m.shud = 0; m.engine = 0;
      m.snap = machineSnapshot(m); m.bones = machineBones(m, m.snap); machineBounds(m);
    };
    const views = ${JSON.stringify(views)};
    const list = [];
    const front = (m.K.D.board.style || 'rear') === 'front', parked = m.K.D.parkStyle === 'squat' ? 'на корточках' : 'на колене';
    if (views.includes('stand')) for (let i = 0; i < 8; i++) list.push({ yaw: Math.PI / 4 + i * Math.PI / 4, label: ['спереди', 'спереди-справа', 'справа', 'сзади-справа', 'сзади', 'сзади-слева', 'слева', 'спереди-слева'][i] });
    if (views.includes('park')) { list.push({ yaw: Math.PI / 4 + Math.PI / 2, park: true, label: parked + ', справа' }); list.push({ yaw: front ? Math.PI / 4 + 0.6 : Math.PI * 5 / 4 - 0.6, park: true, label: parked + (front ? ', спереди' : ', сзади') }); }
    if (views.includes('open')) { list.push({ yaw: front ? Math.PI / 4 + 0.75 : Math.PI * 5 / 4 + 0.5, park: true, door: 1, hero: true, label: 'люк открыт, рядом герой' }); list.push({ yaw: Math.PI / 4 + 1.0, hero: true, label: 'рост героя для сравнения' }); }
    for (const c of list) {
      pose(c);
      const items = machineItems(m), main = items.slice(), shadow = items.filter((it) => it.shadow);
      if (c.hero) {
        const sp = c.door ? (front ? mLocal(m, -0.55, 1.45) : mLocal(m, 0.75, -1.15)) : mLocal(m, 1.05, 0.25);
        const yawH = c.door ? (front ? m.yaw + Math.PI - 0.5 : m.yaw + 0.6) : m.yaw;
        const p = buildPose({ t: 0, phase: 0, walkW: 0, runW: 0, sitW: 0, smokeW: 0, smokeT: 0, drinkW: 0, drinkT: 0, punchW: 0, punchT: 0, shootW: 0, shootT: 0, throwW: 0, throwT: 0, reachW: 0, reachT: 0 }, HERO.D, equip.hands === 'rifle');
        const B = evalBones(p.p, [sp[0], 0, sp[1]], yawH, HERO.D);
        for (const it of heroList(B, p)) { main.push(it); shadow.push(it); }
      }
      const sr = m.inst.sr, cx = (sr[0] + sr[2]) / 2, cy = (sr[1] + sr[3]) / 2 + 22;
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      render3D(TGT_SMALL, { w: W, h: H, ax: W / 2 - cx, ay: H / 2 - cy, s: S }, { main, shadow }, false, cv.getContext('2d'), 0, 0);
      shots.push({ cv, label: c.label });
    }
    Object.assign(m, keep); m.feet = feetKeep; m.snap = null; m.bones = null;
    const cols = 4, rows = Math.ceil(shots.length / cols), lab = 26;
    const sheet = document.createElement('canvas'); sheet.width = cols * W * K; sheet.height = rows * (H * K + lab);
    const g = sheet.getContext('2d');
    g.fillStyle = '#d9ddd6'; g.fillRect(0, 0, sheet.width, sheet.height);
    g.imageSmoothingEnabled = false;
    shots.forEach((s, i) => {
      const x = (i % cols) * W * K, y = Math.floor(i / cols) * (H * K + lab);
      g.fillStyle = (i % 2) ? '#cfd4cc' : '#d6dad2'; g.fillRect(x, y, W * K, H * K + lab);
      g.drawImage(s.cv, x, y + lab, W * K, H * K);
      g.fillStyle = '#2a2d2b'; g.font = '600 15px sans-serif'; g.fillText(s.label, x + 12, y + 18);
    });
    return sheet.toDataURL('image/png');
  })()`);
}, { loc: opt.loc || 'yard2', k: +(opt.scale || 3), views, kind: opt.kind || '' });
fs.writeFileSync(out, Buffer.from(url.split(',')[1], 'base64'));
console.log('wrote', out, errors.length ? 'ERRORS: ' + errors.join(' | ') : '');
await browser.close();
server.close();
