/* Отсек 7, изометрическая версия: все спрайты отрисованы из 3D-моделей, покадровая ходьба в 8 направлениях. Phaser 3.80. */
(() => {
'use strict';
const META = window.__META__, SPR = META.sprites, ROOMM = META.room, PROPS = META.props;
const PPM = META.info.PPM, ELEV = META.info.ELEV, RW = META.info.ROOM.W, RD = META.info.ROOM.D;
const DPR = Math.min(window.devicePixelRatio || 1, 2);
const S2 = Math.SQRT2, SE = Math.sin(ELEV), CE = Math.cos(ELEV);
const OX = -ROOMM.minX, OY = -ROOMM.minY;          // the room image is drawn at (0,0)
const W = ROOMM.w, H = ROOMM.h;

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
/* world (metres on the floor, y up) → screen pixels of the room image */
const toS = (x, z, y = 0) => ({ sx: (x - z) / S2 * PPM + OX, sy: (x + z) / S2 * PPM * SE - y * CE * PPM + OY });
const toW = (sx, sy) => { const a = (sx - OX) / PPM * S2, b = (sy - OY) / PPM / SE * S2; return { x: (a + b) / 2, z: (b - a) / 2 }; };
const depthOf = (x, z) => (x + z) * 10;
/* facing angle (deg, world) → sprite direction 0..7 (0 = toward the viewer, counter-clockwise) */
const dirOf = (dx, dz) => { const phi = Math.atan2(dx, dz) * 180 / Math.PI; return ((Math.round((45 - phi) / 45) % 8) + 8) % 8; };
const DIR_VEC = k => { const phi = (45 - 45 * k) * Math.PI / 180; return { x: Math.sin(phi), z: Math.cos(phi) }; };

/* ------------------------------------------------------------ navigation (10 cm cells on the floor) */
const CELL = 0.1, GW = Math.round(RW / CELL), GH = Math.round(RD / CELL);
const NAV = new Uint8Array(GW * GH);
const BLOCKS = [];   // axis-aligned rectangles in metres: [x0, z0, x1, z1]
function buildNav() {
  NAV.fill(1);
  const block = (x0, z0, x1, z1) => { BLOCKS.push([x0, z0, x1, z1]); for (let gz = Math.max(0, Math.floor(z0 / CELL)); gz < Math.min(GH, Math.ceil(z1 / CELL)); gz++) for (let gx = Math.max(0, Math.floor(x0 / CELL)); gx < Math.min(GW, Math.ceil(x1 / CELL)); gx++) NAV[gz * GW + gx] = 0; };
  for (const id in PROPS) { const p = PROPS[id]; if (p.fw) block(p.x - p.fw / 2 - 0.25, p.z - p.fd / 2 - 0.25, p.x + p.fw / 2 + 0.25, p.z + p.fd / 2 + 0.25); }
  block(0, 0, 0.45, RD); block(0, 0, RW, 0.45);                  // walls
  block(0.35, 4.6, 1.15, 5.8); block(0.35, 7.2, 1.15, 8.4);     // guards
  block(5.6, 0.3, 7.5, 1.7);                                   // mech
  block(1.3, 3.5, 2.2, 4.7);                                   // clerk + stool
}
const cellOk = (gx, gz) => gx >= 0 && gz >= 0 && gx < GW && gz < GH && NAV[gz * GW + gx] === 1;
const walkable = (x, z) => cellOk(Math.floor(x / CELL), Math.floor(z / CELL));
function nearestWalkable(x, z, maxR = 30) {
  const cx = clamp(Math.floor(x / CELL), 0, GW - 1), cz = clamp(Math.floor(z / CELL), 0, GH - 1);
  if (NAV[cz * GW + cx]) return { x, z };
  for (let r = 1; r <= maxR; r++) { let best = null, bd = 1e9; for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue; if (!cellOk(cx + dx, cz + dz)) continue; const dd = dx * dx + dz * dz; if (dd < bd) { bd = dd; best = { x: (cx + dx + 0.5) * CELL, z: (cz + dz + 0.5) * CELL }; } } if (best) return best; }
  return null;
}
function lineClear(ax, az, bx, bz) { const n = Math.ceil(Math.hypot(bx - ax, bz - az) / (CELL * 0.5)); for (let i = 1; i <= n; i++) { const t = i / n; if (!walkable(ax + (bx - ax) * t, az + (bz - az) * t)) return false; } return true; }
const GC = new Float32Array(GW * GH), CAME = new Int32Array(GW * GH), STAMP = new Uint32Array(GW * GH), CLOSED = new Uint32Array(GW * GH);
let stampN = 1;
const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, S2], [1, -1, S2], [-1, 1, S2], [-1, -1, S2]];
function findPath(sx, sz, tx, tz) {
  const s = nearestWalkable(sx, sz), t = nearestWalkable(tx, tz);
  if (!s || !t) return null;
  if (lineClear(s.x, s.z, t.x, t.z)) return [s, t];
  const idx = (p) => clamp(Math.floor(p.z / CELL), 0, GH - 1) * GW + clamp(Math.floor(p.x / CELL), 0, GW - 1);
  const stamp = ++stampN, start = idx(s), goal = idx(t), gx = goal % GW, gz = (goal / GW) | 0;
  const hh = i => { const dx = Math.abs(i % GW - gx), dz = Math.abs(((i / GW) | 0) - gz); return dx + dz + (S2 - 2) * Math.min(dx, dz); };
  const open = [[hh(start), start]]; STAMP[start] = stamp; GC[start] = 0; CAME[start] = -1;
  let found = false, guard = 0;
  while (open.length && guard++ < 50000) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const cur = open[bi][1]; open[bi] = open[open.length - 1]; open.pop();
    if (cur === goal) { found = true; break; }
    if (CLOSED[cur] === stamp) continue; CLOSED[cur] = stamp;
    const x = cur % GW, z = (cur / GW) | 0;
    for (const [dx, dz, c] of DIRS) { const nx = x + dx, nz = z + dz; if (!cellOk(nx, nz)) continue; const ni = nz * GW + nx; if (CLOSED[ni] === stamp) continue; if (dx && dz && (!cellOk(nx, z) || !cellOk(x, nz))) continue; const ng = GC[cur] + c; if (STAMP[ni] !== stamp || ng < GC[ni]) { STAMP[ni] = stamp; GC[ni] = ng; CAME[ni] = cur; open.push([ng + hh(ni), ni]); } }
  }
  if (!found) return null;
  const cells = []; for (let c = goal; c !== -1; c = CAME[c]) { cells.push(c); if (c === start) break; }
  cells.reverse();
  const pts = cells.map(c => ({ x: (c % GW + 0.5) * CELL, z: (((c / GW) | 0) + 0.5) * CELL }));
  pts[0] = s; pts[pts.length - 1] = t;
  const out = [pts[0]]; let i = 0;
  while (i < pts.length - 1) { let j = i + 1; while (j + 1 < pts.length && lineClear(pts[i].x, pts[i].z, pts[j + 1].x, pts[j + 1].z)) j++; out.push(pts[j]); i = j; }
  return out;
}

/* ------------------------------------------------------------ audio */
const AUD = (() => {
  let ctx = null, master, noise, hum;
  const ok = () => ctx && ctx.state === 'running';
  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220; const g = ctx.createGain(); g.gain.value = 0.05; src.connect(lp); lp.connect(g); g.connect(master); src.start();
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 100; const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2000; bp.Q.value = 8; hum = ctx.createGain(); hum.gain.value = 0.006; o.connect(bp); bp.connect(hum); hum.connect(master); o.start();
  }
  function burst(freq, dur, vol, type = 'bandpass', q = 1, delay = 0) { if (!ok()) return; const s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = ctx.createGain(), t = ctx.currentTime + delay; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.02, dur * 0.2)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.05); }
  function tone(freq, dur, vol, type = 'sine', delay = 0, to) { if (!ok()) return; const o = ctx.createOscillator(); o.type = type; const g = ctx.createGain(), t = ctx.currentTime + delay; o.frequency.setValueAtTime(freq, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02); }
  return {
    setOn(on) { if (on) { init(); ctx.resume(); } else if (ctx) ctx.suspend(); },
    step(v = 1) { burst(900, 0.07, 0.05 * v, 'bandpass', 2); tone(1900 + Math.random() * 300, 0.06, 0.008 * v, 'triangle'); },
    hiss(v = 1) { burst(3200, 1.5, 0.05 * v, 'highpass', 0.7); burst(300, 0.5, 0.05 * v, 'lowpass', 1); },
    servo(v = 1) { tone(140, 0.55, 0.018 * v, 'sawtooth', 0, 210); tone(70, 0.3, 0.03 * v, 'sine', 0.45); },
    radio(v = 1) { burst(2400, 0.12, 0.035 * v, 'bandpass', 3); burst(1800, 0.08, 0.02 * v, 'bandpass', 3, 0.14); },
    click() { burst(4000, 0.02, 0.012, 'highpass', 1); }, blip() { tone(880, 0.05, 0.015, 'square'); },
    stamp() { tone(90, 0.2, 0.09, 'sine', 0, 50); burst(500, 0.12, 0.08, 'lowpass', 1); }, beep() { tone(1320, 0.08, 0.02, 'square'); tone(990, 0.1, 0.02, 'square', 0.1); },
    flickerHum(on) { if (ok() && hum) hum.gain.setTargetAtTime(on ? 0.006 : 0.016, ctx.currentTime, 0.02); },
  };
})();

/* ------------------------------------------------------------ sprite helpers */
class Figure {
  constructor(scene, who, x, z, dir) {
    this.scene = scene; this.who = who; this.x = x; this.z = z; this.dir = dir; this.t = rand(0, 3);
    this.img = scene.add.image(0, 0, 'atlas'); this.sh = scene.add.image(0, 0, 'shadow').setDepth(5).setAlpha(0.35);
    this.lift = 0;
  }
  show(name) {
    const m = SPR[name]; if (!m) return;
    const f = this.scene.textures.getFrame('atlas', name);
    this.img.setFrame(name).setOrigin(m.ox / f.width, m.oy / f.height);
    const p = toS(this.x, this.z, this.lift);
    this.img.setPosition(Math.round(p.sx), Math.round(p.sy)).setDepth(depthOf(this.x, this.z)).setTint(this.scene.flickTint());
    this.sh.setPosition(Math.round(p.sx), Math.round(toS(this.x, this.z).sy)).setScale(this.shadowScale || 1.2, (this.shadowScale || 1.2) * 0.5);
  }
  bounds() { const b = this.img.getBounds(); return { x0: b.x, x1: b.right, y0: b.y, y1: b.bottom }; }
  face(x, z) { this.dir = dirOf(x - this.x, z - this.z); }
}

class Player extends Figure {
  constructor(scene, x, z) { super(scene, 'player', x, z, 4); this.speed = 1.7; this.phase = 0; this.moving = false; this.path = null; this.stepN = 0; }
  goTo(x, z, cb) { const p = findPath(this.x, this.z, x, z); if (!p) { if (cb) cb(false); return false; } this.path = p; this.pi = 1; this.onArrive = cb; return true; }
  stop() { this.path = null; this.onArrive = null; }
  update(dt, keys) {
    this.t += dt; let moving = false;
    if (keys && (keys.x || keys.z)) {
      this.path = null; const l = Math.hypot(keys.x, keys.z), sp = this.speed * dt;
      const nx = this.x + keys.x / l * sp, nz = this.z + keys.z / l * sp;
      if (walkable(nx, nz)) { this.x = nx; this.z = nz; } else if (walkable(nx, this.z)) this.x = nx; else if (walkable(this.x, nz)) this.z = nz;
      this.dir = dirOf(keys.x, keys.z); moving = true; this.phase += sp / 1.4;
    } else if (this.path) {
      const tg = this.path[this.pi], dx = tg.x - this.x, dz = tg.z - this.z, d = Math.hypot(dx, dz), sp = this.speed * dt;
      if (d <= sp) { this.x = tg.x; this.z = tg.z; this.pi++; if (this.pi >= this.path.length) { this.path = null; const cb = this.onArrive; this.onArrive = null; if (cb) cb(true); } }
      else { this.x += dx / d * sp; this.z += dz / d * sp; }
      if (d > 0.001) this.dir = dirOf(dx, dz);
      moving = true; this.phase += Math.min(sp, d) / 1.4;
    }
    if (moving) { const st = Math.floor(this.phase * 2); if (st !== this.stepN) { this.stepN = st; AUD.step(0.8); } }
    this.moving = moving;
    const f = moving ? Math.floor(this.phase * 8) % 8 : Math.floor(this.t * 2.2) % 4;
    this.show(`player_${moving ? 'walk' : 'idle'}_${this.dir}_${f}`);
  }
}

class Guard extends Figure {
  constructor(scene, x, z, name) { super(scene, 'guard', x, z, 7); this.name = name; this.bx = x; this.bz = z; this.jolt = 0; this.shiftT = rand(4, 9); this.shift = 0; this.offX = 0; this.offTo = 0; this.shadowScale = 1.35; }
  speak(text) { this.jolt = 1; AUD.radio(0.8); this.scene.bubbles.say(this, text, 'radio'); }
  update(dt) {
    this.t += dt; this.shiftT -= dt; this.jolt = Math.max(0, this.jolt - dt * 2);
    if (this.shiftT <= 0) { this.shiftT = rand(5, 11); this.shift = this.shift ? 0 : pick([-1, 1]); }
    this.offX = lerp(this.offX, this.offTo, clamp(dt * 3, 0, 1)); this.x = this.bx + this.offX;
    const f = this.jolt > 0.5 ? 'shiftR_7_0' : this.shift ? (this.shift > 0 ? 'shiftL_7_0' : 'shiftR_7_0') : `idle_7_${Math.floor(this.t * 1.6) % 4}`;
    this.show('guard_' + f);
  }
}

class Clerk extends Figure {
  constructor(scene, x, z) { super(scene, 'clerk', x, z, 7); this.mode = 'type'; this.modeT = rand(5, 9); this.forceFace = false; this.typeT = 0; this.talking = 0; this.glance = 0; }
  update(dt, playerNear) {
    this.t += dt; this.modeT -= dt;
    if (this.forceFace || playerNear) this.mode = 'look';
    else if (this.modeT <= 0) { this.mode = this.mode === 'type' ? 'look' : 'type'; this.modeT = this.mode === 'type' ? rand(7, 13) : rand(2, 4); if (this.mode === 'look' && Math.random() < 0.5) this.glance = pick(['L', 'R']); else this.glance = 0; }
    if (this.mode === 'type') { this.typeT -= dt; if (this.typeT <= 0) { this.typeT = rand(0.08, 0.45); AUD.click(); } }
    const f = this.mode === 'type' ? `sitType_7_${Math.floor(this.t * 6) % 4}` : this.glance && !playerNear && !this.forceFace ? `sitLook${this.glance}_7_0` : `sitLook_7_${Math.floor(this.t * 2) % 4}`;
    this.show('clerk_' + f);
  }
}

class Mech extends Figure {
  constructor(scene, x, z) {
    super(scene, 'mech', x, z, 0); this.shadowScale = 2.4; this.anim = 'idle'; this.at = 0; this.next = rand(2, 4); this.sighNext = rand(6, 10); this.blink = 0;
    this.steam = scene.add.particles(0, 0, 'puff', { lifespan: 1800, speedY: { min: -30, max: -55 }, speedX: { min: -12, max: 12 }, scale: { start: 0.3, end: 1.4 }, alpha: { start: 0.55, end: 0 }, quantity: 1, frequency: -1, tint: 0xe6e9df }).setDepth(depthOf(x, z) + 1);
    this.lightA = scene.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0x5dff7a).setDepth(depthOf(x, z) + 0.5).setScale(0.12);
  }
  sigh() { if (this.anim === 'sigh') return; this.anim = 'sigh'; this.at = 0; this.sighNext = rand(14, 24); AUD.hiss(0.8); }
  wake() { this.blink = 1.2; this.sigh(); AUD.beep(); }
  update(dt) {
    this.t += dt; this.next -= dt; this.sighNext -= dt; this.blink = Math.max(0, this.blink - dt);
    if (this.anim === 'idle') { if (this.sighNext <= 0) this.sigh(); else if (this.next <= 0) { this.anim = 'shift'; this.at = 0; this.next = rand(4.5, 8.5); AUD.servo(0.6); } }
    let f;
    if (this.anim === 'shift') { this.at += dt / 1.4; f = `shift_0_${Math.min(11, Math.floor(this.at * 12))}`; if (this.at >= 1) this.anim = 'idle'; }
    else if (this.anim === 'sigh') { this.at += dt / 3.2; const i = Math.min(11, Math.floor(this.at * 12)); f = `sigh_0_${i}`; if (this.at < 0.3 && Math.random() < dt * 24) { const p = toS(this.x, this.z, 2.55); this.steam.emitParticleAt(p.sx + rand(-22, 22), p.sy, 1); } if (this.at >= 1) this.anim = 'idle'; }
    else f = `idle_0_${Math.floor(this.t * 2) % 4}`;
    this.show('mech_' + f);
    const p = toS(this.x + 0.42, this.z, 2.05);
    const on = this.blink > 0 ? (Math.floor(this.blink * 10) % 2 ? 1 : 0.1) : 0.6 + 0.2 * Math.sin(this.t * 3);
    this.lightA.setPosition(p.sx, p.sy).setAlpha(on);
  }
}

/* ------------------------------------------------------------ text */
const GUARD_LINES = ['Гражданин, не отвлекайте.', 'Проходите, не задерживайтесь.', 'Все вопросы — к дежурному.', 'Гражданин, вы мешаете несению службы.', 'Не положено.', 'Без пропуска не положено.', 'Разговоры на посту запрещены.'];
const DOOR_LINES = ['Стоять. Проход закрыт.', 'Отойдите от гермоворот.', 'Гражданин, назад.'];
const BANTER = [['Третий за смену.', 'Не отвлекайся.'], ['Шагоход опять вздыхает.', 'Ему тоже до конца смены.'], ['Обед когда?', 'Позже.'], ['Слышал? Говорят, наверху солнце.', 'Отставить разговоры.']];
const THING_LINES = { crate1: 'Ящики опломбированы. Пломбы свежие.', crate2: 'Верхний ящик подписан мелом: «НЕ МОЁ».', crate3: 'Ящик. Тяжёлый даже на вид.', crate4: 'Ещё ящик. Их тут больше, чем людей.', cabinet: 'Распределительный шкаф. Лампочки мигают в своём ритме.', barrel: 'Бочка. Пустая. Наверное.', bottles: 'Баллоны. На каждом номер и «не вскрывать».', cart: 'Баллоны на тележке. Надпись стёрта. Лучше не трогать.', boxpanel: 'Щиток гудит. Значит, работает.', desk: 'Стол дежурного. Бумаги, кружка, радар.', stool: 'Табурет. Занят.' };
const DLG = {
  start0: { t: 'Следующий. Фамилия, номер пропуска, цель визита.', o: [['Мне нужно попасть на приём.', 'whom'], ['Что за этими воротами?', 'gates'], ['Я по крайне важному делу.', 'persuade', 'Убеждение'], ['Ничего. Я пойду.', 'bye']] },
  start1: { t: 'Опять вы. Я же сказал: зайдите позже.', o: [['Уже позже.', 'notlate'], ['Мне всё-таки нужно на приём.', 'whom'], ['Ухожу, ухожу.', 'bye']] },
  start2: { t: 'Гражданин. Позже — это не сейчас.', o: [['А когда?', 'later'], ['Понял.', 'bye']] },
  whom: { t: 'К кому?', o: [['К начальнику отсека.', 'chief'], ['К тому, кто здесь всё решает.', 'decides'], ['А к кому вообще можно?', 'anyone']] },
  chief: { t: 'Начальник отсека принимает по записи. Запись по вторникам, с девяти до девяти пятнадцати.', o: [['Запишите меня.', 'record'], ['А сегодня какой день?', 'day']] },
  record: { t: 'Запись по вторникам. Зайдите позже.', stamp: true, o: [['Насколько позже?', 'later'], ['Ладно.', 'bye']] },
  day: { t: 'Не вторник. Зайдите позже.', stamp: true, o: [['Насколько позже?', 'later'], ['Ладно.', 'bye']] },
  decides: { t: 'Здесь всё решает распорядок. Распорядок говорит: зайдите позже.', stamp: true, o: [['Насколько позже?', 'later'], ['Ладно.', 'bye']] },
  anyone: { t: 'Приём временно приостановлен до особого распоряжения. Зайдите позже.', stamp: true, o: [['Насколько позже?', 'later'], ['Ладно.', 'bye']] },
  gates: { t: 'Служебная информация. Гражданин, вам туда не надо.', o: [['Мне надо на приём.', 'whom'], ['Понятно.', 'bye']] },
  persuade: { t: 'Важное дело оформляется по форме семь-Б. В трёх экземплярах. Бланки закончились. Зайдите позже.', stamp: true, check: 'Не вышло', o: [['Насколько позже?', 'later'], ['Ладно.', 'bye']] },
  notlate: { t: 'Недостаточно позже.', o: [['А когда будет достаточно?', 'later'], ['Ясно.', 'bye']] },
  later: { t: 'Позже, гражданин. Следующий!', end: true }, bye: { t: 'Следующий!', end: true },
};

/* ------------------------------------------------------------ scene */
const SPOT = { clerk: { x: 3.3, z: 4.1 }, guardL: { x: 1.9, z: 5.3 }, guardR: { x: 1.9, z: 7.7 }, mech: { x: 6.5, z: 2.8 }, door: { x: 1.5, z: 6.5 } };
class Room extends Phaser.Scene {
  constructor() { super('room'); }
  preload() {
    this.load.image('room', 'room_iso.webp');
    this.load.atlas('atlas', 'atlas_iso.webp', window.__ATLAS__);
    this.load.on('progress', v => { const el = document.getElementById('loadbar'); if (el) el.style.width = Math.round(v * 100) + '%'; });
  }
  create() {
    buildNav(); this.makeTextures();
    this.bg = this.add.image(0, 0, 'room').setOrigin(0).setDepth(0);
    this.flick = 1; this.flickT = rand(6, 14); this.flickOn = true;
    this.props = {};
    for (const id in PROPS) { const p = PROPS[id]; const im = this.add.image(p.sx, p.sy, 'atlas', 'prop_' + id).setOrigin(0).setDepth(depthOf(p.x, p.z)); this.props[id] = im; }
    this.props.stool.setDepth(depthOf(1.75, 4.1) - 1);
    this.clerk = new Clerk(this, 1.75, 4.1); this.clerk.lift = 0;
    this.guards = [new Guard(this, 0.75, 5.2, 'L'), new Guard(this, 0.75, 7.8, 'R')];
    this.mech = new Mech(this, 6.5, 0.95);
    this.player = new Player(this, 6.0, 10.0);
    this.bubbles = new Bubbles(this); this.dialog = new Dialog(this);
    this.dust = this.add.particles(0, 0, 'dust', { x: { min: 150, max: W - 100 }, y: { min: 80, max: H - 60 }, lifespan: 9000, speedX: { min: -3, max: 3 }, speedY: { min: -2, max: 2 }, scale: { min: 0.15, max: 0.35 }, alpha: { start: 0, end: 0 }, frequency: 240, blendMode: 'ADD', tint: 0xfdf6e0, emitCallback: p => { p.alphaMax = rand(0.1, 0.3); } }).setDepth(9000);
    this.dust.addParticleProcessor({ update: p => { p.alpha = (p.alphaMax || 0.2) * Math.sin(Math.PI * p.lifeT); } });
    this.lampGlows = [[0.08, 2.3, 2.5], [0.08, 2.3, 10.5], [2.5, 2.3, 0.08], [6.5, 2.3, 0.08], [0.06, 1.9, 5.2], [0.06, 1.9, 7.8]].map(([x, y, z]) => { const p = toS(x, z, y); return this.add.image(p.sx, p.sy, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xf6f8ee).setDepth(1).setScale(0.6, 0.4).setAlpha(0.3); });
    this.flickLamp = this.lampGlows[2];
    this.banterT = rand(25, 40); this.visits = 0;
    this.setupCamera(); this.setupInput();
    this.marker = this.add.image(0, 0, 'ring').setDepth(6).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);
    HUD.bind(this);
    const snap = window.claude && window.claude.hot && window.claude.hot.data;
    if (snap && snap.px) { this.player.x = snap.px; this.player.z = snap.pz; this.visits = snap.visits || 0; }
    try { if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ px: this.player.x, pz: this.player.z, visits: this.visits })); } catch (e) { /* no hot reload here */ }
    document.getElementById('loader').classList.add('done');
  }
  makeTextures() {
    const T = this.textures;
    const canvas = (k, w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); T.addCanvas(k, c); };
    canvas('glow', 128, 128, (g, w) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    canvas('puff', 64, 64, (g, w) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    canvas('shadow', 48, 24, g => { const gr = g.createRadialGradient(24, 12, 0, 24, 12, 24); gr.addColorStop(0, 'rgba(0,0,0,0.8)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.setTransform(1, 0, 0, 0.5, 0, 0); g.fillStyle = gr; g.fillRect(0, 0, 48, 48); });
    canvas('dust', 8, 8, g => { const gr = g.createRadialGradient(4, 4, 0, 4, 4, 4); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 8, 8); });
    canvas('ring', 48, 24, g => { g.strokeStyle = 'rgba(255,214,120,0.95)'; g.lineWidth = 2; g.beginPath(); g.ellipse(24, 12, 20, 10, 0, 0, Math.PI * 2); g.stroke(); });
    T.get('atlas').setFilter(Phaser.Textures.FilterMode.NEAREST); T.get('room').setFilter(Phaser.Textures.FilterMode.NEAREST);
  }
  flickTint() { return this.flickOn ? 0xffffff : 0xe4e4e8; }
  setupCamera() { this.camX = toS(this.player.x, this.player.z).sx; this.camY = toS(this.player.x, this.player.z).sy - 60; this.zoomMul = 1; this.fit(); this.scale.on('resize', () => this.fit()); }
  baseZoom() { const w = this.scale.width, h = this.scale.height; const fit = Math.min(w / W, h / H); return w / h >= 1.15 ? Math.max(1, Math.floor(fit * 2) / 2) : Math.max(fit, Math.round(h / H * 2) / 2); }
  fit() { this.minMul = Math.min(1, Math.min(this.scale.width / W, this.scale.height / H) / this.baseZoom()); this.zoomMul = clamp(this.zoomMul, this.minMul, 3); this.zoom = this.baseZoom() * this.zoomMul; this.cameras.main.setZoom(this.zoom); }
  zoomBy(k) { this.zoomMul = clamp(this.zoomMul * k, this.minMul, 3); this.fit(); }
  updateCamera(dt) {
    const cam = this.cameras.main, vw = this.scale.width / this.zoom, vh = this.scale.height / this.zoom;
    const pp = toS(this.player.x, this.player.z);
    let tx = pp.sx, ty = pp.sy - 50;
    if (this.dialog.open) { const cp = toS(this.clerk.x, this.clerk.z); tx = (pp.sx + cp.sx) / 2; ty = (pp.sy + cp.sy) / 2 - 20 + this.dialog.panelWorld(this.zoom) * 0.5; }
    const cx = vw >= W ? W / 2 : clamp(tx, vw / 2, W - vw / 2), cy = vh >= H ? H / 2 : clamp(ty, vh / 2, H - vh / 2);
    const k = clamp(dt * 4, 0, 1); this.camX = lerp(this.camX, cx, k); this.camY = lerp(this.camY, cy, k);
    if (this.shake > 0) this.shake -= dt;
    cam.centerOn(Math.round(this.camX), Math.round(this.camY + (this.shake > 0 ? Math.sin(this.time.now * 0.09) * 2 : 0)));
  }
  setupInput() {
    const pts = new Map(); let pinch = null, moved = false, down = null;
    this.input.on('pointerdown', p => { pts.set(p.id, { x: p.x, y: p.y }); down = { x: p.x, y: p.y }; moved = false; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), m: this.zoomMul }; } });
    this.input.on('pointermove', p => { if (!pts.has(p.id)) return; pts.set(p.id, { x: p.x, y: p.y }); if (pinch && pts.size >= 2) { const [a, b] = [...pts.values()]; this.zoomMul = clamp(pinch.m * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, this.minMul, 3); this.fit(); moved = true; } else if (down && Math.hypot(p.x - down.x, p.y - down.y) > 14 * DPR) moved = true; });
    const up = p => { const wasPinch = !!pinch; pts.delete(p.id); if (pts.size < 2) pinch = null; if (wasPinch || moved || !down) return; down = null; if (this.dialog.open) { this.dialog.skip(); return; } const wp = this.cameras.main.getWorldPoint(p.x, p.y); this.tapAt(wp.x, wp.y); };
    this.input.on('pointerup', up); this.input.on('pointerupoutside', up);
    this.input.on('wheel', (p, o, dx, dy) => this.zoomBy(dy > 0 ? 0.9 : 1.1));
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
    this.input.keyboard.on('keydown', e => {
      if (this.dialog.open) { const n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 }[e.code]; if (n != null) this.dialog.choose(n); else if (e.code === 'Space' || e.code === 'Enter') this.dialog.skip(); else if (e.code === 'Escape') this.dialog.close(); return; }
      if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') this.interactNearest();
    });
  }
  hit(b, x, y) { return x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1; }
  tapAt(sx, sy) {
    HUD.firstMove();
    const figs = [['clerk', this.clerk], ['guard', this.guards[0]], ['guard', this.guards[1]], ['mech', this.mech]].filter(([, f]) => this.hit(f.bounds(), sx, sy)).sort((a, b) => depthOf(b[1].x, b[1].z) - depthOf(a[1].x, a[1].z));
    if (figs.length) return this.approach(figs[0][0], figs[0][1]);
    const w = toW(sx, sy);
    if (w.x < 0.3 && Math.abs(w.z - 6.5) < 1.6 && sy < toS(0, 6.5).sy) return this.approachDoor();
    for (const id in this.props) { const im = this.props[id]; const b = im.getBounds(); if (sx > b.x && sx < b.right && sy > b.y && sy < b.bottom) { const p = PROPS[id]; if (!walkable(w.x, w.z) || sy < toS(p.x, p.z).sy) return this.approachProp(id); } }
    this.walkTo(w.x, w.z);
  }
  walkTo(x, z, cb) { const t = nearestWalkable(x, z, 25); if (!t) return; const p = toS(t.x, t.z); this.marker.setPosition(p.sx, p.sy).setVisible(true).setAlpha(1); this.markerT = 1; this.player.goTo(t.x, t.z, ok => { if (ok && cb) cb(); }); }
  approach(kind, o) {
    const p = this.player;
    const go = (spot, then) => { if (dist(p.x, p.z, spot.x, spot.z) < 0.35) then(); else this.walkTo(spot.x, spot.z, then); };
    if (kind === 'clerk') go(SPOT.clerk, () => { p.face(this.clerk.x, this.clerk.z); this.startDialog(); });
    else if (kind === 'guard') go(o.name === 'L' ? SPOT.guardL : SPOT.guardR, () => { p.face(o.x, o.z); o.speak(this.nextGuardLine()); });
    else if (kind === 'mech') go(SPOT.mech, () => { p.face(o.x, o.z); o.wake(); this.time.delayedCall(500, () => this.bubbles.say(this.mech, pick(['ШАГОХОД № 1. РЕЖИМ ОЖИДАНИЯ.', 'ЦЕЛЬ НЕ ОБНАРУЖЕНА. ВЗДЫХАЮ.', 'ДО КОНЦА СМЕНЫ: МНОГО.']), 'machine')); this.time.delayedCall(2800, () => this.bubbles.say(p, pick(['Говорят, они всё слышат.', 'Пахнет маслом и тоской.', 'Номер один. Интересно, сколько их всего.']), 'thought')); });
  }
  approachDoor() { this.walkTo(SPOT.door.x, SPOT.door.z, () => { this.player.face(0, 6.5); const g = this.guards[this.player.z < 6.5 ? 0 : 1]; this.guards.forEach(gg => gg.offTo = 0.35); g.speak(pick(DOOR_LINES)); this.time.delayedCall(4500, () => this.guards.forEach(gg => gg.offTo = 0)); }); }
  approachProp(id) {
    const p = PROPS[id], pl = this.player;
    const spot = nearestWalkable(p.x + (p.fw || 0.6) / 2 + 0.6, p.z + (p.fd || 0.6) / 2 + 0.6, 30);
    const say = () => { pl.face(p.x, p.z); this.bubbles.say(pl, THING_LINES[id] || 'Ничего интересного.', 'thought'); };
    if (!spot || dist(pl.x, pl.z, spot.x, spot.z) < 0.4) say(); else this.walkTo(spot.x, spot.z, say);
  }
  nextGuardLine() { let l; do { l = pick(GUARD_LINES); } while (l === this.lastGuardLine); this.lastGuardLine = l; return l; }
  interactNearest() { const p = this.player, cand = [['clerk', this.clerk, SPOT.clerk], ['guard', this.guards[0], SPOT.guardL], ['guard', this.guards[1], SPOT.guardR], ['mech', this.mech, SPOT.mech]]; let best = null, bd = 1e9; for (const c of cand) { const d = dist(p.x, p.z, c[2].x, c[2].z); if (d < bd) { bd = d; best = c; } } if (best && bd < 2.5) this.approach(best[0], best[1]); }
  startDialog() { this.clerk.forceFace = true; this.time.delayedCall(260, () => this.dialog.start(this.visits === 0 ? 'start0' : this.visits === 1 ? 'start1' : 'start2')); }
  endDialog() { this.visits++; this.clerk.forceFace = false; this.clerk.mode = 'type'; this.clerk.modeT = 3; if (this.visits === 2) this.time.delayedCall(3500, () => this.guards[1].speak('Ходят тут…')); }
  update(time, delta) {
    const dt = clamp((this.game.loop.rawDelta || delta) / 1000, 0.001, 0.1);
    this.flickT -= dt;
    if (this.flickT <= 0) { if (this.flickOn) { this.flickOn = false; this.flickT = rand(0.05, 0.16); this.flickCount = (this.flickCount || 0) + 1; AUD.flickerHum(false); } else { this.flickOn = true; if (this.flickCount < (this.flickBurst || 0)) this.flickT = rand(0.04, 0.12); else { this.flickT = rand(7, 16); this.flickCount = 0; this.flickBurst = rand(1, 4) | 0; } AUD.flickerHum(true); } }
    this.flickLamp.setAlpha(this.flickOn ? 0.3 : 0);
    this.bg.setTint(this.flickTint());
    let kx = 0, kz = 0;
    if (!this.dialog.open && this.keys) {
      const K = this.keys, r = (K.D.isDown || K.RIGHT.isDown ? 1 : 0) - (K.A.isDown || K.LEFT.isDown ? 1 : 0), d = (K.S.isDown || K.DOWN.isDown ? 1 : 0) - (K.W.isDown || K.UP.isDown ? 1 : 0);
      // screen right = world (+x, -z), screen down = world (+x, +z)
      kx = r + d; kz = -r + d; if (kx || kz) HUD.firstMove();
    }
    this.player.update(dt, { x: kx, z: kz });
    this.guards.forEach(g => g.update(dt));
    this.banterT -= dt;
    if (this.banterT <= 0) { this.banterT = rand(40, 70); if (!this.dialog.open && dist(this.player.x, this.player.z, 0.8, 6.5) > 3) { const b = pick(BANTER); this.guards[0].speak(b[0]); this.time.delayedCall(2600, () => this.guards[1].speak(b[1])); } }
    this.clerk.update(dt, dist(this.player.x, this.player.z, this.clerk.x, this.clerk.z) < 2.2);
    this.mech.update(dt);
    if (this.markerT > 0) { this.markerT -= dt; this.marker.setAlpha(clamp(this.markerT, 0, 1)); if (this.markerT <= 0 || !this.player.path) this.marker.setVisible(this.markerT > 0 && !!this.player.path); }
    this.updateCamera(dt); this.bubbles.update(dt); this.dialog.update(dt);
  }
}

/* ------------------------------------------------------------ bubbles & dialog (DOM) */
class Bubbles {
  constructor(scene) { this.scene = scene; this.list = []; this.root = document.getElementById('bubbles'); }
  say(who, text, kind = 'say') {
    const nb = who.bounds();
    this.list.filter(b => { if (b.who === who) return true; const ob = b.who.bounds(); return Math.abs((ob.x0 + ob.x1) / 2 - (nb.x0 + nb.x1) / 2) < 160 && Math.abs(ob.y0 - nb.y0) < 80; }).forEach(b => b.t = Math.min(b.t, 0.15));
    const el = document.createElement('div'); el.className = 'bubble ' + kind; el.textContent = text; this.root.appendChild(el);
    const b = { who, el, t: 2.4 + text.length * 0.05 }; this.list.push(b); requestAnimationFrame(() => el.classList.add('in'));
  }
  update(dt) {
    const cam = this.scene.cameras.main, z = cam.zoom / DPR;
    for (const b of this.list) { b.t -= dt; const bd = b.who.bounds(); const sx = ((bd.x0 + bd.x1) / 2 - cam.worldView.x) * z, sy = (bd.y0 - 4 - cam.worldView.y) * z; b.el.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`; if (b.t <= 0 && !b.dead) { b.el.classList.remove('in'); b.el.classList.add('out'); b.dead = 0.0001; } if (b.dead) b.dead += dt; }
    this.list = this.list.filter(b => { if (b.dead > 0.35) { b.el.remove(); return false; } return true; });
  }
}
class Dialog {
  constructor(scene) {
    this.scene = scene; this.open = false;
    this.el = document.getElementById('dlg'); this.textEl = document.getElementById('dlgText'); this.optsEl = document.getElementById('dlgOpts'); this.checkEl = document.getElementById('dlgCheck');
    document.getElementById('dlgClose').addEventListener('click', () => this.close());
    this.el.addEventListener('pointerup', e => { if (!e.target.closest('button')) this.skip(); });
    ['pointerdown', 'pointerup', 'touchstart', 'mousedown', 'wheel'].forEach(ev => this.el.addEventListener(ev, e => e.stopPropagation(), { passive: true }));
    this.drawPortrait();
  }
  drawPortrait() {
    const c = document.getElementById('portrait'), g = c.getContext('2d');
    const im = new Image(); im.onload = () => { g.imageSmoothingEnabled = false; g.drawImage(im, 0, 0, c.width, c.height); g.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = 0; y < c.height; y += 3) g.fillRect(0, y, c.width, 1); };
    im.src = 'data:image/png;base64,' + window.__PORTRAIT__;
  }
  panelWorld(zoom) { return this.open ? (this.el.offsetHeight * DPR) / zoom : 0; }
  start(node) { this.open = true; this.el.hidden = false; document.body.classList.add('talking'); requestAnimationFrame(() => this.el.classList.add('in')); HUD.hint(false); this.show(node); }
  show(id) { const n = DLG[id]; this.node = n; this.full = n.t; this.shown = 0; this.typing = true; this.optsEl.innerHTML = ''; this.textEl.textContent = ''; this.scene.clerk.talking = 1; this.checkEl.hidden = !n.check; if (n.check) this.checkEl.textContent = n.check; }
  update(dt) { if (!this.open || !this.typing) return; const before = Math.floor(this.shown); this.shown = Math.min(this.full.length, this.shown + dt * 34); if (Math.floor(this.shown) !== before && Math.floor(this.shown) % 3 === 0) AUD.blip(); this.textEl.textContent = this.full.slice(0, Math.floor(this.shown)); if (this.shown >= this.full.length) this.finishLine(); }
  skip() { if (this.typing) { this.shown = this.full.length; this.textEl.textContent = this.full; this.finishLine(); } else if (this.node && this.node.end) this.close(); }
  finishLine() {
    this.typing = false; this.scene.clerk.talking = 0; const n = this.node;
    if (n.stamp) { AUD.stamp(); this.scene.shake = 0.2; }
    this.optsEl.innerHTML = '';
    (n.end ? [['Уйти', null]] : n.o).forEach(([label, to, tag], i) => { const li = document.createElement('li'); const b = document.createElement('button'); b.type = 'button'; b.id = 'opt' + i; b.innerHTML = `<span class="num">${i + 1}</span><span class="lbl"></span>`; if (tag) { const t = document.createElement('span'); t.className = 'tag'; t.textContent = tag; b.querySelector('.lbl').appendChild(t); } b.querySelector('.lbl').appendChild(document.createTextNode(label)); b.addEventListener('click', e => { e.stopPropagation(); this.choose(i); }); li.appendChild(b); this.optsEl.appendChild(li); });
  }
  choose(i) { if (!this.open || !this.node) return; if (this.typing) { this.skip(); return; } const n = this.node; if (n.end) { this.close(); return; } const o = n.o[i]; if (o) this.show(o[1]); }
  close() { if (!this.open) return; this.open = false; this.el.classList.remove('in'); this.scene.clerk.talking = 0; document.body.classList.remove('talking'); setTimeout(() => { if (!this.open) this.el.hidden = true; }, 250); this.scene.endDialog(); }
}
const HUD = {
  bind(scene) { this.scene = scene; this.soundBtn = document.getElementById('sound'); this.soundBtn.addEventListener('click', () => { this.sound = !this.sound; AUD.setOn(this.sound); this.refresh(); }); document.getElementById('zin').addEventListener('click', () => scene.zoomBy(1.25)); document.getElementById('zout').addEventListener('click', () => scene.zoomBy(0.8)); ['hud', 'zoom'].forEach(id => { const el = document.getElementById(id); ['pointerdown', 'pointerup', 'touchstart', 'mousedown', 'wheel'].forEach(ev => el.addEventListener(ev, e => e.stopPropagation(), { passive: true })); }); this.refresh(); },
  refresh() { this.soundBtn.classList.toggle('on', !!this.sound); this.soundBtn.querySelector('b').textContent = this.sound ? 'звук' : 'тихо'; this.soundBtn.setAttribute('aria-pressed', this.sound ? 'true' : 'false'); },
  firstMove() { if (this.moved) return; this.moved = true; this.hint(false); },
  hint(on) { const h = document.getElementById('hint'); if (h) h.classList.toggle('gone', !on); },
};
function start() {
  const size = () => ({ w: Math.max(320, window.innerWidth), h: Math.max(320, window.innerHeight) });
  const s0 = size();
  const game = new Phaser.Game({ type: Phaser.WEBGL, parent: 'game', backgroundColor: '#000000', pixelArt: true, scale: { mode: Phaser.Scale.NONE, width: Math.round(s0.w * DPR), height: Math.round(s0.h * DPR), zoom: 1 / DPR }, input: { activePointers: 3 }, scene: [Room], banner: false, audio: { noAudio: true } });
  window.addEventListener('resize', () => { const s = size(); game.scale.resize(Math.round(s.w * DPR), Math.round(s.h * DPR)); game.scale.setZoom(1 / DPR); });
  game.events.once('ready', () => game.scale.setZoom(1 / DPR));
  window.__game = game; window.__dbg = { toS, toW, walkable, findPath, SPOT };
}
const boot = () => window.claude && window.claude.hot && window.claude.hot.ready ? window.claude.hot.ready(start) : start();
boot();
})();
