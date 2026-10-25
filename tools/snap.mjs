#!/usr/bin/env node
// Ровные снимки для проверки переделок: часы страницы стоят, кубики брошены с затравкой, мир идёт только по шагам.
// Две сборки, которые ведут себя одинаково, дают одинаковые снимки — до пикселя.
//   node tools/snap.mjs <папка> --game=poligon [сценарии…] [--against=<папка прежних снимков>] [--dev] [--w=900 --h=700]
// Сценарии — из <игра>/shots.json, как у tools/shoot.mjs. Рядом со снимками — snap.log: что стало с миром после каждого шага.
// С --against каждый снимок сравнивается с одноимённым из той папки (и журналы тоже); код выхода 1, если что-то отличается.
// --dev — снимать игру прямо из модулей (build/<игра>.dev.html), а не склеенную страницу.
// Порядок работы: снять до переделки в одну папку, после — с --against=<та папка>.
import fs from 'fs';
import path from 'path';
import { root } from './lib/modules.mjs';
import { openGame, pixelDiff } from './lib/page.mjs';

const args = process.argv.slice(2);
const opt = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const pos = args.filter((a) => !a.startsWith('--'));
const out = path.resolve(pos[0] || 'snaps');
const game = opt.game || 'pyatietazhki';
const SCEN = JSON.parse(fs.readFileSync(path.join(root, game, 'shots.json'), 'utf8'));
const names = pos.slice(1).length ? pos.slice(1) : Object.keys(SCEN);
fs.mkdirSync(out, { recursive: true });

const G = await openGame(game, { steady: true, dev: !!opt.dev, w: +(opt.w || 900), h: +(opt.h || 700) });
const { page, ev, frames } = G;
const log = [];
let differ = 0;
for (const name of names) {
  const s = SCEN[name];
  if (!s) { console.log('нет такого сценария', name); continue; }
  await page.evaluate((s) => {
    const Y = window.__game;
    const want = s.loc || Object.keys(Y.LOCATIONS)[0];
    if (Y.MAP.id !== want) Y.enterLocation(want, 'start');
    Y.standUp && Y.standUp();
    Y.hero.act = null; Y.hero.path.length = 0; Y.hero.queue.length = 0; Y.hero.target = null;
    Y.hero.x = s.at[0]; Y.hero.z = s.at[1]; Y.hero.y = 0;
    for (const k of ['smoke', 'drink', 'punch', 'shoot', 'thr', 'reach']) { Y.hero[k].on = false; Y.hero[k].w = 0; Y.hero[k].t = 0; }
    Y.setView(s.view);
    if (s.js) Y.ev(s.js);
    Y.step(0.2);
  }, s);
  await frames(3);
  await page.evaluate((on) => { for (const id of ['rawChk', 'gridChk']) { const c = document.getElementById(id); if (c && c.checked !== on.includes(id)) c.click(); } }, s.checks || []);
  if (s.act) await ev(s.act);
  const steps = s.steps || [0.6];
  let i = 0;
  for (const dt of steps) {
    await page.evaluate((dt) => { window.__clock.add(dt * 1000); window.__game.step(dt); }, dt);
    await frames(3);
    const file = `${name}${steps.length > 1 ? '-' + (++i) : ''}.png`;
    await page.evaluate(() => document.getElementById('stageBox').scrollIntoView({ block: 'start' }));
    const box = await page.locator('#stage').boundingBox();
    const png = await page.screenshot({ path: path.join(out, file), clip: box, timeout: 600000 });
    const st = await page.evaluate(() => { const Y = window.__game; return [Y.dbg().drawCalls + ' draws', Y.MAP.id, Y.hero.x.toFixed(3), Y.hero.z.toFixed(3), Y.hero.yaw.toFixed(3), Y.INST.length + ' things'].join(' '); });
    log.push(`${file}: ${st}`);
    let note = '';
    if (opt.against) {
      const prev = path.resolve(opt.against, file);
      if (!fs.existsSync(prev)) note = ' — прежнего снимка нет';
      else {
        const d = await pixelDiff(page, fs.readFileSync(prev), png);
        if (d.size) { note = ' — другой размер'; differ++; }
        else if (d.n) { note = ` — отличается ${d.n} пикс. (${(d.share * 100).toFixed(3)}%), в рамке ${d.box.join(',')}`; differ++; }
        else note = ' — совпадает';
      }
    }
    console.log(`${file}: ${st}${note}`);
  }
}
fs.writeFileSync(path.join(out, 'snap.log'), log.join('\n') + '\n');
if (opt.against && fs.existsSync(path.resolve(opt.against, 'snap.log'))) {
  const before = fs.readFileSync(path.resolve(opt.against, 'snap.log'), 'utf8').trim().split('\n');
  const now = log.filter((l) => before.some((b) => b.split(':')[0] === l.split(':')[0]));
  const changed = now.filter((l) => !before.includes(l));
  console.log(changed.length ? `\nМир после шагов стал другим:\n  ${changed.join('\n  ')}` : '\nМир после каждого шага тот же.');
  differ += changed.length;
}
if (G.errors.length) { console.log('ОШИБКИ НА СТРАНИЦЕ:\n' + G.errors.join('\n')); differ++; }
if (opt.against) console.log(differ ? `\nОтличий: ${differ}` : '\nВсё совпадает.');
await G.close();
process.exitCode = differ ? 1 : 0;
