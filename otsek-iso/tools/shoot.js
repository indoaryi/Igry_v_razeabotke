// Drives the three.js renderer in headless Chromium and saves raw frames (supersampled PNGs) + metadata.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = '/home/claude/iso/build/raw';
fs.mkdirSync(OUT, { recursive: true });
const only = process.argv[2] || 'all';

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1200, height: 1200 } });
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  p.on('console', m => { if (m.type() === 'error') console.log('console', m.text()); });
  await p.goto('http://localhost:8777/render/index.html');
  await p.evaluate(() => window.ready);
  const save = (name, res) => { fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(res.png.split(',')[1], 'base64')); return { w: res.w, h: res.h, originX: res.originX, originY: res.originY, minX: res.minX, minY: res.minY }; };
  const meta = { frames: {}, room: {}, props: {}, info: await p.evaluate(() => window.worldInfo()) };
  const shoot = async (who, dir, anim, frames, extra, label) => {
    for (let f = 0; f < frames; f++) {
      const res = await p.evaluate(([who, dir, anim, t, extra]) => window.renderChar(who, dir, anim, t, extra), [who, dir, anim, f / frames, extra || {}]);
      const name = `${who}_${label || anim}_${dir}_${f}`;
      meta.frames[name] = Object.assign(save(name, res), { who, dir, anim: label || anim, f });
    }
  };
  if (only === 'all' || only === 'player') { for (let d = 0; d < 8; d++) { await shoot('player', d, 'walk', 8); await shoot('player', d, 'idle', 4); } }
  if (only === 'all' || only === 'guard') { for (const d of [0, 1, 7]) { await shoot('guard', d, 'idle', 4, { hold: 'rifle' }); await shoot('guard', d, 'idle', 1, { hold: 'rifle', shift: 1 }, 'shiftL'); await shoot('guard', d, 'idle', 1, { hold: 'rifle', shift: -1 }, 'shiftR'); } for (let d = 0; d < 8; d++) await shoot('guard', d, 'walk', 8, { hold: 'rifle', armSwing: 0 }); }
  if (only === 'all' || only === 'clerk') { for (const d of [0, 7, 1]) { await shoot('clerk', d, 'sitType', 4); await shoot('clerk', d, 'sitLook', 4); await shoot('clerk', d, 'sitLook', 1, { headYaw: 0.6 }, 'sitLookL'); await shoot('clerk', d, 'sitLook', 1, { headYaw: -0.6 }, 'sitLookR'); } }
  if (only === 'all' || only === 'mech') { for (const d of [0, 1, 7]) { await shoot('mech', d, 'idle', 4); await shoot('mech', d, 'shift', 12); await shoot('mech', d, 'sigh', 12); } }
  if (only === 'all' || only === 'room') {
    meta.room = save('room_static', await p.evaluate(() => window.renderRoom('static')));
    const props = await p.evaluate(() => window.propList());
    for (const id of Object.keys(props)) { meta.props[id] = Object.assign(save('prop_' + id, await p.evaluate(id => window.renderRoom(id), id)), props[id]); }
  }
  const prev = fs.existsSync(OUT + '/meta.json') ? JSON.parse(fs.readFileSync(OUT + '/meta.json')) : { frames: {}, props: {} };
  const merged = { frames: Object.assign(prev.frames || {}, meta.frames), room: Object.keys(meta.room).length ? meta.room : prev.room, props: Object.assign(prev.props || {}, meta.props), info: meta.info };
  fs.writeFileSync(OUT + '/meta.json', JSON.stringify(merged));
  console.log('frames', Object.keys(merged.frames).length, 'props', Object.keys(merged.props).length);
  await b.close();
})();
