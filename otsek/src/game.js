/* Отсек у гермоворот — a small Fallout-style room built from separate generated sprites. Phaser 3.80. */
(() => {
'use strict';
const PARTS = window.__PARTS__.parts, RIGS = window.__PARTS__.rigs, WORLD = window.__WORLD__, FX = window.__ROOMFX__;
const W = 1536, H = 1024;
const DPR = Math.min(window.devicePixelRatio || 1, 2);

/* ------------------------------------------------------------------ helpers */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const rgbInt = (r, g, b) => ((clamp(r, 0, 1) * 255) << 16) | ((clamp(g, 0, 1) * 255) << 8) | (clamp(b, 0, 1) * 255);
/* perspective of the painted room: floor scale grows linearly toward the camera */
const VP_Y = -521, PPM_K = 0.0928, DEPTH_K = 0.58;
const ppm = y => PPM_K * (y - VP_Y);                // world pixels per metre at floor line y

/* ------------------------------------------------------------------ navigation */
const CELL = 4, GW = Math.ceil(W / CELL), GH = Math.ceil(H / CELL);
const NAV = new Uint8Array(GW * GH);
function buildNav() {
  const c = document.createElement('canvas'); c.width = GW; c.height = GH;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#000'; g.fillRect(0, 0, GW, GH);
  g.fillStyle = '#fff'; g.beginPath();
  WORLD.floor.forEach((p, i) => i ? g.lineTo(p[0] / CELL, p[1] / CELL) : g.moveTo(p[0] / CELL, p[1] / CELL));
  g.closePath(); g.fill();
  g.fillStyle = '#000';
  for (const k in WORLD.obstacles) {
    const o = WORLD.obstacles[k];
    if (o.rect) { const [x0, y0, x1, y1] = o.rect; g.fillRect((x0 - 10) / CELL, (y0 - 5) / CELL, (x1 - x0 + 20) / CELL, (y1 - y0 + 10) / CELL); }
    else { const [cx, cy, rx, ry] = o.ellipse; g.beginPath(); g.ellipse(cx / CELL, cy / CELL, (rx + 10) / CELL, (ry + 5) / CELL, 0, 0, Math.PI * 2); g.fill(); }
  }
  const d = g.getImageData(0, 0, GW, GH).data;
  for (let i = 0; i < GW * GH; i++) NAV[i] = d[i * 4] > 140 ? 1 : 0;
}
const cellIdx = (x, y) => clamp((y / CELL) | 0, 0, GH - 1) * GW + clamp((x / CELL) | 0, 0, GW - 1);
const walkable = (x, y) => x >= 0 && y >= 0 && x < W && y < H && NAV[cellIdx(x, y)] === 1;
function nearestWalkable(x, y, maxR = 90) {
  const cx = clamp((x / CELL) | 0, 0, GW - 1), cy = clamp((y / CELL) | 0, 0, GH - 1);
  if (NAV[cy * GW + cx]) return { x, y };
  for (let r = 1; r <= maxR; r++) {
    let best = null, bd = 1e9;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const gx = cx + dx, gy = cy + dy;
      if (gx < 0 || gy < 0 || gx >= GW || gy >= GH || !NAV[gy * GW + gx]) continue;
      const dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = { x: gx * CELL + 2, y: gy * CELL + 2 }; }
    }
    if (best) return best;
  }
  return null;
}
function lineClear(ax, ay, bx, by) {
  const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 2);
  for (let i = 1; i <= n; i++) { const t = i / n; if (!walkable(ax + (bx - ax) * t, ay + (by - ay) * t)) return false; }
  return true;
}
const GC = new Float32Array(GW * GH), CAME = new Int32Array(GW * GH), STAMP = new Uint32Array(GW * GH), CLOSED = new Uint32Array(GW * GH);
let stampN = 1;
const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
function findPath(sx, sy, tx, ty) {
  const s = nearestWalkable(sx, sy), t = nearestWalkable(tx, ty);
  if (!s || !t) return null;
  if (lineClear(s.x, s.y, t.x, t.y)) return [s, t];
  const stamp = ++stampN, start = cellIdx(s.x, s.y), goal = cellIdx(t.x, t.y), gx = goal % GW, gy = (goal / GW) | 0;
  const hh = i => { const dx = Math.abs(i % GW - gx), dy = Math.abs(((i / GW) | 0) - gy); return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy); };
  const open = [[hh(start), start]];
  STAMP[start] = stamp; GC[start] = 0; CAME[start] = -1;
  let found = false, guard = 0;
  while (open.length && guard++ < 40000) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const cur = open[bi][1]; open[bi] = open[open.length - 1]; open.pop();
    if (cur === goal) { found = true; break; }
    if (CLOSED[cur] === stamp) continue; CLOSED[cur] = stamp;
    const x = cur % GW, y = (cur / GW) | 0;
    for (const [dx, dy, c] of DIRS) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      const ni = ny * GW + nx; if (!NAV[ni] || CLOSED[ni] === stamp) continue;
      if (dx && dy && (!NAV[y * GW + nx] || !NAV[ny * GW + x])) continue;
      const ng = GC[cur] + c;
      if (STAMP[ni] !== stamp || ng < GC[ni]) { STAMP[ni] = stamp; GC[ni] = ng; CAME[ni] = cur; open.push([ng + hh(ni), ni]); }
    }
  }
  if (!found) return null;
  const cells = []; for (let c = goal; c !== -1; c = CAME[c]) { cells.push(c); if (c === start) break; }
  cells.reverse();
  const pts = cells.map(c => ({ x: (c % GW) * CELL + 2, y: ((c / GW) | 0) * CELL + 2 }));
  pts[0] = s; pts[pts.length - 1] = t;
  const out = [pts[0]]; let i = 0;
  while (i < pts.length - 1) { let j = i + 1; while (j + 1 < pts.length && lineClear(pts[i].x, pts[i].y, pts[j + 1].x, pts[j + 1].y)) j++; out.push(pts[j]); i = j; }
  return out;
}

/* ------------------------------------------------------------------ light */
const LAMPS = [ // pools of light on the floor, for tinting the people who walk through them
  { x: 640, y: 430, r: 230, i: 0.16 }, { x: 965, y: 430, r: 230, i: 0.16 }, { x: 470, y: 700, r: 260, i: 0.14 },
  { x: 1150, y: 690, r: 260, i: 0.14 }, { x: 805, y: 360, r: 200, i: 0.12 },
];
function lightAt(x, y, flick) {
  let k = 0.8;
  for (const L of LAMPS) { const d = dist(x, y, L.x, L.y); if (d < L.r) k += (1 - d / L.r) ** 2 * L.i; }
  k *= flick;
  return rgbInt(k * 0.98, k * 1.0, k * 0.95);
}

/* ------------------------------------------------------------------ audio (synthesised, off until asked) */
const AUD = (() => {
  let ctx = null, master, noise, hum;
  const ok = () => ctx && ctx.state === 'running';
  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.8; master.connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // room tone: ventilation rumble plus a thin lamp buzz
    const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 220;
    const g = ctx.createGain(); g.gain.value = 0.05; src.connect(lp); lp.connect(g); g.connect(master); src.start();
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 100;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2000; bp.Q.value = 8;
    hum = ctx.createGain(); hum.gain.value = 0.006; o.connect(bp); bp.connect(hum); hum.connect(master); o.start();
  }
  function burst(freq, dur, vol, type = 'bandpass', q = 1, delay = 0) {
    if (!ok()) return;
    const s = ctx.createBufferSource(); s.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(), t = ctx.currentTime + delay;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.02, dur * 0.2)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  function tone(freq, dur, vol, type = 'sine', delay = 0, to) {
    if (!ok()) return;
    const o = ctx.createOscillator(); o.type = type; const g = ctx.createGain(), t = ctx.currentTime + delay;
    o.frequency.setValueAtTime(freq, t); if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  return {
    setOn(on) { if (on) { init(); ctx.resume(); } else if (ctx) ctx.suspend(); },
    step(v = 1) { burst(900, 0.07, 0.05 * v, 'bandpass', 2); tone(1900 + Math.random() * 300, 0.06, 0.008 * v, 'triangle'); },
    hiss(v = 1) { burst(3200, 1.5, 0.05 * v, 'highpass', 0.7); burst(300, 0.5, 0.05 * v, 'lowpass', 1); },
    servo(v = 1) { tone(140, 0.55, 0.018 * v, 'sawtooth', 0, 210); tone(70, 0.3, 0.03 * v, 'sine', 0.45); },
    radio(v = 1) { burst(2400, 0.12, 0.035 * v, 'bandpass', 3); burst(1800, 0.08, 0.02 * v, 'bandpass', 3, 0.14); },
    click() { burst(4000, 0.02, 0.012, 'highpass', 1); },
    blip() { tone(880, 0.05, 0.015, 'square'); },
    stamp() { tone(90, 0.2, 0.09, 'sine', 0, 50); burst(500, 0.12, 0.08, 'lowpass', 1); },
    beep() { tone(1320, 0.08, 0.02, 'square'); tone(990, 0.1, 0.02, 'square', 0.1); },
    flickerHum(on) { if (ok() && hum) hum.gain.setTargetAtTime(on ? 0.006 : 0.016, ctx.currentTime, 0.02); },
  };
})();

/* ------------------------------------------------------------------ rigs: characters cut into parts */
class Rig {
  constructor(scene, x, y, reflect) {
    this.scene = scene; this.x = x; this.y = y; this.flip = 1;
    this.root = scene.add.container(x, y);
    this.refl = reflect ? scene.add.container(x, y).setAlpha(0.13) : null;
    this.shadow = scene.add.image(x, y, 'shadow').setDepth(52);
    this.parts = [];
  }
  addPart(frame, anchor, pivot) {
    const P = PARTS[frame], pv = pivot || [P.x, P.y];
    const mk = cont => { const im = this.scene.add.image(0, 0, 'atlas', frame).setOrigin((pv[0] - P.x) / P.w, (pv[1] - P.y) / P.h).setScale(1 / P.ts); cont.add(im); return im; };
    const part = { main: mk(this.root), refl: this.refl ? mk(this.refl) : null, bx: pv[0] - anchor[0], by: pv[1] - anchor[1], P };
    part.set = (dx = 0, dy = 0, rot = 0, sx = 1, sy = 1, vis = true) => {
      for (const im of [part.main, part.refl]) if (im) im.setPosition(part.bx + dx, part.by + dy).setRotation(rot).setScale(sx / P.ts, sy / P.ts).setVisible(vis);
    };
    part.set();
    this.parts.push(part);
    return part;
  }
  place(scale, depth) {
    const sx = scale * this.flip;
    this.root.setPosition(this.x, this.y).setScale(sx, scale).setDepth(depth);
    if (this.refl) this.refl.setPosition(this.x, this.y + 1).setScale(sx, -scale * 0.92).setDepth(51);
  }
  tint(c) { for (const p of this.parts) { p.main.setTint(c); if (p.refl) p.refl.setTint(c); } }
}

const PLAYER_WAIST = { front: [236, 560], back: [232, 560], side: [168, 560] };
class Player extends Rig {
  constructor(scene, x, y) {
    super(scene, x, y, true);
    this.views = {};
    for (const v of ['front', 'back', 'side']) {
      const m = RIGS.player.views[v], anchor = [m.footX, m.bottom];
      const legs = v === 'side' ? ['legFar', 'legNear'] : ['legL', 'legR'];
      const set = { m };
      legs.forEach(n => { set[n] = this.addPart(`p_${v}_${n}`, anchor, PARTS[`p_${v}_${n}`].pivot); });
      set.upper = this.addPart(`p_${v}_upper`, anchor, PLAYER_WAIST[v]);
      this.views[v] = set;
    }
    this.view = 'back'; this.phase = 0; this.moving = false; this.t = 0; this.path = null; this.speed = 1.35;
    this.vx = 0; this.vy = -1; this.stepN = 0;
    this.speed = 1.9;
  }
  goTo(x, y, cb) {
    const p = findPath(this.x, this.y, x, y);
    if (!p) { if (cb) cb(false); return false; }
    this.path = p; this.pi = 1; this.onArrive = cb; return true;
  }
  stop() { this.path = null; this.onArrive = null; }
  face(x, y) {
    const dxm = (x - this.x) / ppm(this.y), dym = (y - this.y) / (ppm(this.y) * DEPTH_K);
    if (Math.abs(dxm) > Math.abs(dym)) { this.view = 'side'; this.flip = dxm < 0 ? 1 : -1; } else { this.view = dym > 0 ? 'front' : 'back'; this.flip = 1; }
  }
  update(dt, keys) {
    this.t += dt;
    let moving = false;
    const mps = ppm(this.y);
    if (keys && (keys.x || keys.y)) {
      this.path = null;
      const l = Math.hypot(keys.x, keys.y), sp = this.speed * dt;
      const nx = this.x + keys.x / l * sp * mps, ny = this.y + keys.y / l * sp * mps * DEPTH_K;
      if (walkable(nx, ny)) { this.x = nx; this.y = ny; } else if (walkable(nx, this.y)) this.x = nx; else if (walkable(this.x, ny)) this.y = ny;
      this.vx = keys.x; this.vy = keys.y; moving = true; this.phase += sp / 1.5;
    } else if (this.path) {
      const tg = this.path[this.pi], dxm = (tg.x - this.x) / mps, dym = (tg.y - this.y) / (mps * DEPTH_K), dm = Math.hypot(dxm, dym);
      const sp = this.speed * dt;
      if (dm <= sp) {
        this.x = tg.x; this.y = tg.y; this.pi++;
        if (this.pi >= this.path.length) { this.path = null; const cb = this.onArrive; this.onArrive = null; if (cb) cb(true); }
      } else { this.x += dxm / dm * sp * mps; this.y += dym / dm * sp * mps * DEPTH_K; }
      if (dm > 0.001) { this.vx = dxm; this.vy = dym; }
      moving = true; this.phase += Math.min(sp, dm) / 1.5;
    }
    if (moving) {
      if (Math.abs(this.vx) > Math.abs(this.vy)) { this.view = 'side'; this.flip = this.vx < 0 ? 1 : -1; } else { this.view = this.vy > 0 ? 'front' : 'back'; this.flip = 1; }
      const step = Math.floor(this.phase * 2);
      if (step !== this.stepN) { this.stepN = step; AUD.step(0.8); }
    }
    this.moving = moving;
    this.animate();
  }
  animate() {
    const a = this.phase * Math.PI * 2, mv = this.moving ? 1 : 0, br = Math.sin(this.t * 1.7);
    for (const v in this.views) {
      const s = this.views[v], on = v === this.view;
      for (const k of ['legL', 'legR', 'legFar', 'legNear', 'upper']) if (s[k]) s[k].main.setVisible(on), s[k].refl && s[k].refl.setVisible(on);
      if (!on) continue;
      if (v === 'side') {
        const sw = Math.sin(a) * mv;
        s.legNear.set(-sw * 30, -Math.max(0, Math.cos(a)) * 16 * mv, sw * 0.32);
        s.legFar.set(sw * 30, -Math.max(0, -Math.cos(a)) * 16 * mv, -sw * 0.32);
        s.upper.set(-sw * 2, -(1 - Math.abs(Math.sin(a))) * 7 * mv, -0.035 * mv, 1, 1 + 0.006 * br * (1 - mv));
      } else {
        const dir = v === 'front' ? 1 : -1;
        const leg = (f, vel) => [dir * f * 16 * mv - Math.max(0, vel) * 22 * mv, 1 + dir * f * 0.035 * mv];
        const [ly, ls] = leg(Math.sin(a), Math.cos(a)), [ry, rs] = leg(-Math.sin(a), -Math.cos(a));
        s.legL.set(0, ly, 0, ls, ls); s.legR.set(0, ry, 0, rs, rs);
        s.upper.set(Math.sin(a) * 3 * mv, -Math.abs(Math.sin(a)) * 7 * mv, Math.sin(a) * 0.018 * mv, 1, 1 + 0.006 * br * (1 - mv));
      }
    }
    const m = this.views[this.view].m, sc = ppm(this.y) * RIGS.player.heightM / (m.bottom - m.top);
    this.place(sc, this.y);
    const w = ppm(this.y);
    this.shadow.setPosition(this.x, this.y + 1).setScale(w * 0.0095, w * 0.0042).setAlpha(0.5);
  }
  bounds() { const h = ppm(this.y) * 1.82; return { x0: this.x - h * 0.22, x1: this.x + h * 0.22, y0: this.y - h, y1: this.y + 4 }; }
}

class Clerk {
  /* Sits at the console with his back to the room. Looks over a shoulder at whoever bothers him. */
  constructor(scene, seatX, seatY, depthY) {
    this.scene = scene; this.x = seatX; this.y = seatY; this.depthY = depthY;
    const R = RIGS.clerk; this.R = R;
    this.sc = ppm(depthY) * R.heightM / R.standH;
    this.N = [196, 160];
    this.root = scene.add.container(seatX, seatY).setDepth(depthY + 1).setScale(this.sc);
    const mk = (f, pv) => { const P = PARTS[f]; const im = scene.add.image(0, 0, 'atlas', f).setOrigin((pv[0] - P.x) / P.w, (pv[1] - P.y) / P.h).setScale(1 / P.ts); this.root.add(im); return im; };
    this.body = mk('c_body', R.seat);
    this.hBack = mk('c_head_back', this.N);
    this.hSide = mk('c_head_left', this.N);
    this.neck = [this.N[0] - R.seat[0], this.N[1] - R.seat[1]];
    const L = PARTS.c_head_left.lens; this.lensL = [L[0] - this.N[0], L[1] - this.N[1]];
    this.lens = scene.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0x6bff8a).setDepth(depthY + 1.6);
    // the near rim of the stool cushion goes over him, so he sits in it rather than on a cut line
    const D = RIGS.desk, PR = PARTS.d_stool_rim, desk = scene.desk;
    this.rim = scene.add.image(desk.x + (PR.x - desk.ax) * desk.sc, desk.y + (PR.y - desk.ay) * desk.sc, 'atlas', 'd_stool_rim').setOrigin(0).setScale(desk.sc / PR.ts).setDepth(depthY + 1.5);
    this.look = 0; this.lookTo = 0; this.side = 1; this.blend = 0; this.t = rand(0, 5);
    this.talking = 0; this.forceFace = false; this.typeT = 0; this.glanceT = rand(6, 12); this.glanceHold = 0; this.lean = 0;
    this.noticed = false; this.target = null;
  }
  bounds() { const h = ppm(this.depthY) * 1.05; return { x0: this.x - h * 0.32, x1: this.x + h * 0.32, y0: this.y - h * 1.05, y1: this.depthY + 4 }; }
  update(dt, playerNear) {
    this.t += dt;
    const pl = this.scene.player;
    // who is he looking at, and over which shoulder
    let want = 0;
    if (this.forceFace) { want = 1; this.target = pl; }
    else {
      if (playerNear && !this.noticed) { this.noticed = true; this.glanceHold = 1.6; this.target = pl; }
      if (!playerNear) this.noticed = false;
      this.glanceT -= dt;
      if (this.glanceT <= 0 && this.glanceHold <= 0) {
        this.glanceT = rand(9, 16); this.glanceHold = rand(1.2, 2.2);
        this.target = Math.random() < 0.6 ? pl : pick([this.scene.guards[0], this.scene.mech]);
      }
      if (this.glanceHold > 0) { this.glanceHold -= dt; want = 1; }
    }
    if (want && this.target) { const s = this.target.x >= this.x ? 1 : -1; if (s !== this.side && this.blend > 0.5) this.lookTo = 0; else { this.side = s; this.lookTo = 1; } }
    else this.lookTo = 0;
    this.blend = clamp(this.blend + (this.lookTo ? 1 : -1) * dt / 0.14, 0, 1);
    if (this.blend === 0 && want && this.target) this.side = this.target.x >= this.x ? 1 : -1;
    // working at the console: small lean, shoulders busy, keys clicking
    const working = this.blend < 0.05 && !this.forceFace;
    this.lean = lerp(this.lean, working ? 1 : 0, clamp(dt * 3, 0, 1));
    if (working) { this.typeT -= dt; if (this.typeT <= 0) { this.typeT = rand(0.08, 0.45); if (this.scene.nearCam(this.x, this.y, 0)) AUD.click(); } }
    this.apply();
  }
  apply() {
    const br = Math.sin(this.t * 1.6), type = this.lean * Math.sin(this.t * 17) * 0.6 * (Math.sin(this.t * 0.9) > -0.3 ? 1 : 0);
    const talk = this.talking > 0 ? Math.abs(Math.sin(this.t * 12)) * 5 : 0;
    const twist = this.blend * this.side * 0.025;
    const bodyRot = twist + this.lean * Math.sin(this.t * 0.7) * 0.006;
    this.body.setPosition(type, -this.lean * 4 + br * 1.5).setRotation(bodyRot).setScale(1 / PARTS.c_body.ts, (1 - this.lean * 0.012 + br * 0.004) / PARTS.c_body.ts);
    const nx = this.neck[0] * Math.cos(bodyRot) - this.neck[1] * Math.sin(bodyRot) + type;
    const ny = this.neck[0] * Math.sin(bodyRot) + this.neck[1] * Math.cos(bodyRot) - this.lean * 9 + br * 1.5;
    const nod = this.lean * (Math.sin(this.t * 0.45) > 0.6 ? 6 : 0) - talk * 0.4;
    const hRot = bodyRot + (this.talking > 0 ? Math.sin(this.t * 5) * 0.02 : 0);
    this.hBack.setPosition(nx, ny + nod).setRotation(hRot).setAlpha(1 - this.blend);
    this.hSide.setPosition(nx, ny - talk * 0.3).setRotation(hRot).setScale(-this.side / PARTS.c_head_left.ts, 1 / PARTS.c_head_left.ts).setAlpha(this.blend);
    const tint = this.scene.flickTint(this.x, this.depthY);
    this.body.setTint(tint); this.hBack.setTint(tint); this.hSide.setTint(tint); this.rim.setTint(tint);
    const lx = -this.side * this.lensL[0], ly = this.lensL[1];
    this.lens.setPosition(this.x + (nx + lx * Math.cos(hRot) - ly * Math.sin(hRot)) * this.sc, this.y + (ny - talk * 0.3 + lx * Math.sin(hRot) + ly * Math.cos(hRot)) * this.sc)
      .setScale(0.1 + 0.015 * Math.sin(this.t * 3)).setAlpha(this.blend * (0.55 + 0.25 * Math.sin(this.t * 2.2)));
  }
}

class Guard {
  constructor(scene, x, y, flip, name) {
    this.scene = scene; this.x = x; this.y = y; this.flip = flip ? -1 : 1; this.name = name;
    const P = PARTS.g_front, m = RIGS.guard.view;
    this.sc = ppm(y) * RIGS.guard.heightM / (m.bottom - m.top);
    this.img = scene.add.image(x, y, 'atlas', 'g_front').setOrigin((m.footX - P.x) / P.w, (m.bottom - P.y) / P.h).setDepth(y);
    this.refl = scene.add.image(x, y + 1, 'atlas', 'g_front').setOrigin((m.footX - P.x) / P.w, (m.bottom - P.y) / P.h).setDepth(51).setAlpha(0.12);
    this.shadow = scene.add.image(x, y + 1, 'shadow').setDepth(52).setAlpha(0.5);
    const v = PARTS.g_front.visor;
    this.visorOff = [(v[0] - m.footX) * this.sc * this.flip, (v[1] - m.bottom) * this.sc];
    this.visor = scene.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xffb347).setDepth(y + 0.5);
    this.t = rand(0, 10); this.shift = 0; this.shiftT = rand(4, 9); this.shiftTo = 0; this.jolt = 0; this.bx = x;
    this.offX = 0; this.offTo = 0;
  }
  speak(text) { this.jolt = 1; AUD.radio(this.scene.nearCam(this.x, this.y, 0) ? 1 : 0.3); this.scene.bubbles.say(this, text, 'radio'); }
  update(dt) {
    this.t += dt; this.shiftT -= dt;
    if (this.shiftT <= 0) { this.shiftT = rand(5, 11); this.shiftTo = this.shiftTo ? 0 : pick([-1, 1]); }
    this.shift = lerp(this.shift, this.shiftTo, clamp(dt * 1.5, 0, 1));
    this.offX = lerp(this.offX, this.offTo, clamp(dt * 4, 0, 1));
    this.jolt = Math.max(0, this.jolt - dt * 3);
    const br = 1 + 0.005 * Math.sin(this.t * 1.4), rot = this.shift * 0.012, j = Math.sin(this.jolt * Math.PI) * 1.2;
    const x = this.bx + this.offX, tint = this.scene.flickTint(x, this.y);
    this.x = x;
    for (const [im, sy] of [[this.img, 1], [this.refl, -0.92]]) im.setPosition(x, this.y + (sy < 0 ? 1 : -j)).setScale(this.sc * this.flip / PARTS.g_front.ts, this.sc * br * sy / PARTS.g_front.ts).setRotation(rot * (sy < 0 ? -1 : 1)).setTint(tint);
    const vx = x + this.visorOff[0] + Math.sin(rot) * -this.visorOff[1], vy = this.y + this.visorOff[1] * br - j;
    this.visor.setPosition(vx, vy).setScale(0.14 + this.jolt * 0.1).setAlpha(0.4 + 0.2 * Math.sin(this.t * 1.3) + this.jolt * 0.5);
    this.shadow.setPosition(x, this.y + 1).setScale(ppm(this.y) * 0.011, ppm(this.y) * 0.0045);
  }
  bounds() { const h = ppm(this.y) * 1.92; return { x0: this.x - h * 0.26, x1: this.x + h * 0.26, y0: this.y - h, y1: this.y + 4 }; }
}

class Mech extends Rig {
  constructor(scene, x, y) {
    super(scene, x, y, true);
    const M = RIGS.mech, anchor = [358.5, 690];
    this.legL = this.addPart('m_legL', anchor, PARTS.m_legL.foot);
    this.legR = this.addPart('m_legR', anchor, PARTS.m_legR.foot);
    this.body = this.addPart('m_body', anchor, [358, 330]);
    this.L = 690 - 330;
    this.sc = ppm(y) * M.heightM / (M.view.bottom - M.view.top);
    this.lights = M.lights.map(l => ({ bx: l[0] - 358.5, by: l[1] - 690, im: scene.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0x5dff7a).setDepth(y + 0.6) }));
    this.dx = 0; this.dy = 0; this.from = 0; this.to = 0; this.shT = 0; this.shDur = 0; this.next = rand(2, 4); this.side = 1;
    this.sighT = -1; this.sighNext = rand(6, 10); this.lift = [0, 0]; this.t = 0; this.blink = 0;
    this.steam = scene.add.particles(0, 0, 'puff', {
      lifespan: 2100, speedY: { min: -50, max: -90 }, speedX: { min: -22, max: 22 }, scale: { start: 0.55, end: 2.6 },
      alpha: { start: 0.6, end: 0 }, quantity: 1, frequency: -1, tint: 0xe8ebe0,
    }).setDepth(y + 0.7);
  }
  sigh() { if (this.sighT >= 0) return; this.sighT = 0; this.sighNext = rand(14, 24); AUD.hiss(this.scene.nearCam(this.x, this.y - 150, 0) ? 1 : 0.3); }
  wake() { this.blink = 1.2; this.sigh(); AUD.beep(); }
  update(dt) {
    this.t += dt; this.next -= dt; this.sighNext -= dt;
    if (this.sighNext <= 0) this.sigh();
    if (this.next <= 0 && this.sighT < 0) {
      this.side = -this.side; this.from = this.dx; this.to = this.side * 24; this.shT = 0; this.shDur = 1.3; this.next = rand(4.5, 8.5);
      if (this.scene.nearCam(this.x, this.y - 150, 0)) AUD.servo(0.8);
    }
    if (this.shDur > 0) {
      this.shT += dt / this.shDur; const k = ease(clamp(this.shT, 0, 1));
      this.dx = lerp(this.from, this.to, k);
      const unloaded = this.to > 0 ? 0 : 1, liftK = Math.sin(Math.PI * clamp(this.shT, 0, 1));
      this.lift[unloaded] = liftK * 16; this.lift[1 - unloaded] = 0;
      if (this.shT >= 1) { this.shDur = 0; this.lift = [0, 0]; }
    }
    let sighK = 0;
    if (this.sighT >= 0) {
      this.sighT += dt;
      const t = this.sighT;
      sighK = t < 0.9 ? ease(t / 0.9) : t < 1.3 ? 1 : t < 3 ? 1 - ease((t - 1.3) / 1.7) : 0;
      if (t < 1.3 && Math.random() < dt * 40) this.puff();
      if (t < 0.05 && !this.burst) { this.burst = true; for (let i = 0; i < 6; i++) this.puff(); }
      if (t >= 3) { this.sighT = -1; this.burst = false; }
    }
    this.dy = sighK * 22 + Math.sin(this.t * 2.4) * 1.5;
    const lrot = this.dx / this.L;
    this.legL.set(0, -this.lift[0], lrot, 1, 1 - this.dy / this.L * 0.5);
    this.legR.set(0, -this.lift[1], lrot, 1, 1 - this.dy / this.L * 0.5);
    this.body.set(this.dx, this.dy * 0.9, this.dx * 0.0022, 1, 1 - sighK * 0.01);
    this.place(this.sc, this.y);
    const tint = this.scene.flickTint(this.x, this.y);
    this.tint(tint);
    this.blink = Math.max(0, this.blink - dt);
    const on = (1 - sighK * 0.7) * (this.blink > 0 ? (Math.floor(this.blink * 10) % 2 ? 1.5 : 0.2) : 0.85 + 0.15 * Math.sin(this.t * 3.1));
    this.lights.forEach((l, i) => l.im.setPosition(this.x + (l.bx + this.dx) * this.sc, this.y + (l.by + this.dy * 0.9) * this.sc).setScale(i ? 0.09 : 0.14).setAlpha(clamp(on * (i ? 0.6 : 0.75), 0, 1)));
    this.shadow.setPosition(this.x + this.dx * this.sc * 0.5, this.y + 2).setScale(ppm(this.y) * 0.03, ppm(this.y) * 0.009).setAlpha(0.55);
  }
  puff() {
    const vent = pick([[-190, -560], [175, -575], [-10, -680]]);
    const x = this.x + (vent[0] + rand(-14, 14) + this.dx) * this.sc, y = this.y + (vent[1] + this.dy) * this.sc;
    this.steam.emitParticleAt(x, y, 1);
  }
  bounds() { const h = ppm(this.y) * 2.7; return { x0: this.x - h * 0.45, x1: this.x + h * 0.6, y0: this.y - h, y1: this.y + 6 }; }
}

class Desk {
  constructor(scene, x, y) {
    this.scene = scene; this.x = x; this.y = y;
    const D = RIGS.desk, P = PARTS.d_front, m = D.view;
    this.sc = ppm(y) / D.pxPerM;
    this.ax = m.footX; this.ay = D.floorY;
    this.img = scene.add.image(x, y, 'atlas', 'd_front').setOrigin((this.ax - P.x) / P.w, (this.ay - P.y) / P.h).setScale(this.sc / P.ts).setDepth(y);
    this.shadow = scene.add.image(x, y + 2, 'shadow').setDepth(52).setScale(ppm(y) * 0.034, ppm(y) * 0.008).setAlpha(0.55);
    this.W = (lx, ly) => [x + (lx - this.ax) * this.sc, y + (ly - this.ay) * this.sc];
    this.radar = scene.add.graphics().setDepth(y + 0.3).setBlendMode(Phaser.BlendModes.ADD);
    const [rx, ry] = this.W(D.radar[0], D.radar[1]); this.rc = [rx, ry, D.radar[2] * this.sc];
    this.lamp = scene.add.image(...this.W(D.lamp[0], D.lamp[1] + 6), 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xfff1d0).setDepth(y + 0.3).setScale(0.55, 0.3).setAlpha(0.5);
    this.leds = D.lights.filter(l => l[2] >= 6).slice(0, 12).map(l => ({ im: scene.add.image(...this.W(l[0], l[1]), 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(l[3] === 'r' ? 0xff4a3a : l[3] === 'g' ? 0x5dff7a : 0xffb347).setDepth(y + 0.3).setScale(0.05), p: rand(0.5, 3), o: rand(0, 6) }));
    const [mx, my] = this.W(D.mug[0], D.mug[1]);
    this.mug = scene.add.particles(mx, my, 'puff', { lifespan: 2200, speedY: { min: -6, max: -10 }, speedX: { min: -2, max: 2 }, scale: { start: 0.05, end: 0.28 }, alpha: { start: 0.22, end: 0 }, frequency: 420, tint: 0xe8e8e0 }).setDepth(y + 0.4);
    this.t = 0; this.blipA = rand(0, 6.28);
  }
  update(dt) {
    this.t += dt;
    const g = this.radar, [cx, cy, r] = this.rc, a = this.t * 1.8;
    g.clear();
    for (let i = 0; i < 9; i++) {
      const aa = a - i * 0.09;
      g.lineStyle(1, 0x7dff9a, 0.55 * (1 - i / 9));
      g.lineBetween(cx, cy, cx + Math.cos(aa) * r, cy + Math.sin(aa) * r);
    }
    const da = ((a - this.blipA) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    if (da < 3) { g.fillStyle(0xaaffb5, 0.9 * (1 - da / 3)); g.fillCircle(cx + Math.cos(this.blipA) * r * 0.55, cy + Math.sin(this.blipA) * r * 0.55, 1.2); }
    if (da > 6.1) this.blipA = rand(0, 6.28);
    for (const l of this.leds) l.im.setAlpha(Math.sin(this.t * l.p + l.o) > 0.2 ? 0.8 : 0.15);
    this.img.setTint(this.scene.flickTint(this.x, this.y));
  }
  bounds() { return { x0: this.x - 95, x1: this.x + 95, y0: this.y - 210, y1: this.y + 6 }; }
}

/* ------------------------------------------------------------------ talk */
const GUARD_LINES = ['Гражданин, не отвлекайте.', 'Проходите, не задерживайтесь.', 'Все вопросы — к дежурному.', 'Гражданин, вы мешаете несению службы.', 'Не положено.', 'Без пропуска не положено.', 'Разговоры на посту запрещены.'];
const DOOR_LINES = ['Стоять. Проход закрыт.', 'Отойдите от гермоворот.', 'Гражданин, назад.'];
const BANTER = [['Третий за смену.', 'Не отвлекайся.'], ['Шагоход опять вздыхает.', 'Ему тоже до конца смены.'], ['Обед когда?', 'Позже.'], ['Слышал? Говорят, наверху солнце.', 'Отставить разговоры.']];
const THINGS = [
  { box: [670, 60, 940, 330], door: true },
  { box: [468, 362, 594, 572], say: 'Ящики опломбированы. Пломбы свежие.' },
  { box: [352, 640, 460, 770], say: 'Баллоны на тележке. Надпись стёрта. Лучше не трогать.' },
  { box: [1104, 440, 1205, 705], say: 'Баллоны. На каждом номер и «не вскрывать».' },
  { box: [1146, 645, 1220, 775], say: 'Бочка. Пустая. Наверное.' },
  { box: [1000, 380, 1110, 556], say: 'Ящики. Один подписан мелом: «НЕ МОЁ».' },
  { box: [222, 590, 340, 910], say: 'Служебный выход. Заварен изнутри.' },
  { box: [1255, 600, 1360, 905], say: 'Соседний отсек. Табличка: «Не входить. Не выходить».' },
  { box: [400, 360, 480, 520], say: 'Дверь в подсобку. Заперта.' },
  { box: [100, 820, 250, 930], say: 'Щиток гудит. Значит, работает.' },
  { box: [1300, 840, 1410, 1000], say: 'Щиток. Кто-то нацарапал: «Здесь был Вася».' },
  { box: [740, 490, 860, 528], say: 'Люк. Снизу тянет сыростью.' },
  { box: [745, 742, 850, 790], say: 'Ещё один люк. Внизу что-то капает.' },
  { box: [990, 160, 1080, 345], say: 'Распределительный шкаф. Лампочки мигают в своём ритме.' },
];

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
  later: { t: 'Позже, гражданин. Следующий!', end: true },
  bye: { t: 'Следующий!', end: true },
};

/* ------------------------------------------------------------------ scene */
class Room extends Phaser.Scene {
  constructor() { super('room'); }
  preload() {
    this.load.image('room', 'room.webp');
    this.load.atlas('atlas', 'atlas.webp', window.__ATLAS__);
    this.load.on('progress', v => { const el = document.getElementById('loadbar'); if (el) el.style.width = Math.round(v * 100) + '%'; });
  }
  create() {
    buildNav();
    this.makeTextures();
    this.bg = this.add.image(0, 0, 'room').setOrigin(0).setDepth(0);
    this.flick = 1; this.flickT = rand(6, 14); this.flickOn = true;
    this.makeRoomFx();
    const pl = WORLD.place;
    this.desk = new Desk(this, pl.desk[0], pl.desk[1]);
    this.clerk = new Clerk(this, pl.seat[0], pl.seat[1], pl.stool[1]);
    this.guards = [new Guard(this, pl.guardL[0], pl.guardL[1], false, 'L'), new Guard(this, pl.guardR[0], pl.guardR[1], true, 'R')];
    this.mech = new Mech(this, pl.mech[0], pl.mech[1]);
    this.player = new Player(this, pl.player[0], pl.player[1]);
    this.bubbles = new Bubbles(this);
    this.dialog = new Dialog(this);
    this.banterT = rand(25, 40);
    this.visits = 0;
    this.setupCamera(); this.setupInput();
    this.marker = this.add.image(0, 0, 'ring').setDepth(53).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);
    HUD.bind(this);
    const snap = window.claude && window.claude.hot && window.claude.hot.data;
    if (snap && snap.px) { this.player.x = snap.px; this.player.y = snap.py; this.visits = snap.visits || 0; }
    try { if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ px: this.player.x, py: this.player.y, visits: this.visits })); } catch (e) { /* no hot reload here */ }
    document.getElementById('loader').classList.add('done');
  }
  makeTextures() {
    const T = this.textures;
    const canvas = (k, w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h); T.addCanvas(k, c); };
    canvas('glow', 128, 128, (g, w) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    canvas('puff', 64, 64, (g, w) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    canvas('shadow', 64, 32, (g) => { const gr = g.createRadialGradient(32, 16, 0, 32, 16, 32); gr.addColorStop(0, 'rgba(0,0,0,0.85)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.4)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.setTransform(1, 0, 0, 0.5, 0, 0); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); });
    canvas('dust', 8, 8, (g) => { const gr = g.createRadialGradient(4, 4, 0, 4, 4, 4); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 8, 8); });
    canvas('ring', 64, 32, (g) => { g.strokeStyle = 'rgba(255,214,120,0.95)'; g.lineWidth = 3; g.beginPath(); g.ellipse(32, 16, 28, 11, 0, 0, Math.PI * 2); g.stroke(); });
  }
  makeRoomFx() {
    // lamp glows (one of them flickers), blinking indicators, drifting dust, steam from floor gratings
    this.lampGlows = FX.lamps.map(([x, y, w, h], i) => {
      const g = this.add.image(x + w / 2, y + h / 2, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0xf3f7ee).setDepth(2);
      g.setScale(Math.max(w, 24) / 40, Math.max(h, 24) / 40).setAlpha(0.32); g.base = 0.32; return g;
    });
    this.flickLamp = this.lampGlows[4];
    this.leds = FX.leds.filter(l => l[2] >= 3).map(l => ({ im: this.add.image(l[0], l[1], 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(2).setTint(l[3] === 'r' ? 0xff4636 : l[3] === 'g' ? 0x5dff7a : 0xffb347).setScale(0.07 + Math.min(l[2], 40) / 900), p: rand(0.4, 2.5), o: rand(0, 6), steady: Math.random() < 0.4 }));
    this.dust = this.add.particles(0, 0, 'dust', {
      x: { min: 330, max: 1220 }, y: { min: 120, max: 960 }, lifespan: 9000, speedX: { min: -4, max: 4 }, speedY: { min: -3, max: 2 },
      scale: { min: 0.15, max: 0.4 }, alpha: { start: 0, end: 0, ease: 'Sine.easeInOut' }, frequency: 220, blendMode: 'ADD', tint: 0xfdf6e0,
      emitCallback: p => { p.alphaMax = rand(0.1, 0.35); },
    }).setDepth(2900);
    this.dust.addParticleProcessor({ update: (p) => { const k = p.lifeT; p.alpha = (p.alphaMax || 0.2) * Math.sin(Math.PI * k); } });
    this.floorSteam = this.add.particles(0, 0, 'puff', { lifespan: 2600, speedY: { min: -18, max: -30 }, speedX: { min: -5, max: 5 }, scale: { start: 0.3, end: 1.6 }, alpha: { start: 0.12, end: 0 }, frequency: -1, tint: 0xcfd6cc }).setDepth(55);
    this.steamT = rand(4, 9);
  }
  flickTint(x, y) { return lightAt(x, y, this.flick); }
  nearCam(x, y, m) { const v = this.cameras.main.worldView; return x > v.x - m && x < v.right + m && y > v.y - m && y < v.bottom + m; }

  setupCamera() {
    const cam = this.cameras.main;
    this.camX = this.player.x; this.camY = 520; this.zoomMul = 1;
    this.fit();
    this.scale.on('resize', () => this.fit());
  }
  baseZoom() {
    const w = this.scale.width, h = this.scale.height;
    const fitAll = Math.min(w / 1460, h / 1010);
    return w / h >= 1.15 ? fitAll : Math.max(fitAll, h / 1000);
  }
  fit() {
    const cam = this.cameras.main;
    this.minMul = Math.min(1, Math.min(this.scale.width / 1460, this.scale.height / 1010) / this.baseZoom());
    this.zoomMul = clamp(this.zoomMul, this.minMul, 2.6);
    this.zoom = this.baseZoom() * this.zoomMul;
    cam.setZoom(this.zoom);
    const css = this.zoom / DPR;
    this.textures.get('room').setFilter(this.zoom > 1.3 ? Phaser.Textures.FilterMode.NEAREST : Phaser.Textures.FilterMode.LINEAR);
    this.cssZoom = css;
  }
  zoomBy(k) { this.zoomMul = clamp(this.zoomMul * k, this.minMul, 2.6); this.fit(); }
  updateCamera(dt) {
    const cam = this.cameras.main, vw = this.scale.width / this.zoom, vh = this.scale.height / this.zoom;
    let tx = this.player.x, ty = this.player.y - ppm(this.player.y) * 0.9;
    if (this.dialog.open) {
      tx = (this.player.x + this.clerk.x) / 2;
      ty = (this.clerk.y + this.player.y) / 2 - 40 + this.dialog.panelWorld(this.zoom) * 0.5;
    }
    const cx = vw >= 1460 ? 768 : clamp(tx, 38 + vw / 2, 1498 - vw / 2);
    const cy = vh >= 1000 ? 505 : clamp(ty, vh / 2 - 10, 1010 - vh / 2);
    const k = clamp(dt * 4, 0, 1);
    this.camX = lerp(this.camX, cx, k); this.camY = lerp(this.camY, cy, k);
    if (this.shake > 0) { this.shake -= dt; }
    const sh = this.shake > 0 ? Math.sin(this.time.now * 0.09) * 2.5 * this.shake / 0.2 : 0;
    cam.centerOn(this.camX, this.camY + sh);
  }
  setupInput() {
    const pts = new Map(); let pinch = null, moved = false, down = null;
    this.input.on('pointerdown', p => {
      pts.set(p.id, { x: p.x, y: p.y }); down = { x: p.x, y: p.y }; moved = false;
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), m: this.zoomMul }; }
    });
    this.input.on('pointermove', p => {
      if (!pts.has(p.id)) return; pts.set(p.id, { x: p.x, y: p.y });
      if (pinch && pts.size >= 2) { const [a, b] = [...pts.values()]; this.zoomMul = clamp(pinch.m * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, this.minMul, 2.6); this.fit(); moved = true; }
      else if (down && Math.hypot(p.x - down.x, p.y - down.y) > 14 * DPR) moved = true;
    });
    const up = p => {
      const wasPinch = !!pinch; pts.delete(p.id); if (pts.size < 2) pinch = null;
      if (wasPinch || moved || !down) return;
      down = null;
      if (this.dialog.open) { this.dialog.skip(); return; }
      const wp = this.cameras.main.getWorldPoint(p.x, p.y);
      this.tapAt(wp.x, wp.y);
    };
    this.input.on('pointerup', up); this.input.on('pointerupoutside', up);
    this.input.on('wheel', (p, o, dx, dy) => this.zoomBy(dy > 0 ? 0.9 : 1.1));
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE,ONE,TWO,THREE,FOUR,ESC');
    this.input.keyboard.on('keydown', e => {
      if (this.dialog.open) {
        const n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Numpad1: 0, Numpad2: 1, Numpad3: 2, Numpad4: 3 }[e.code];
        if (n != null) this.dialog.choose(n); else if (e.code === 'Space' || e.code === 'Enter') this.dialog.skip(); else if (e.code === 'Escape') this.dialog.close();
        return;
      }
      if (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') this.interactNearest();
    });
  }
  inside(b, x, y, pad = 0) { return x > b.x0 - pad && x < b.x1 + pad && y > b.y0 - pad && y < b.y1 + pad; }
  tapAt(x, y) {
    HUD.firstMove();
    const order = [
      ['clerk', this.clerk], ['guard', this.guards[0]], ['guard', this.guards[1]], ['mech', this.mech], ['desk', this.desk],
    ];
    const hits = order.filter(([, o]) => this.inside(o.bounds(), x, y)).sort((a, b) => b[1].y - a[1].y);
    if (hits.length) return this.approach(hits[0][0], hits[0][1]);
    const th = THINGS.find(t => x >= t.box[0] && x <= t.box[2] && y >= t.box[1] && y <= t.box[3] && !walkable(x, y));
    if (th) return this.approachThing(th);
    this.walkTo(x, y);
  }
  walkTo(x, y, cb) {
    const t = nearestWalkable(x, y, 60); if (!t) return;
    this.marker.setPosition(t.x, t.y).setVisible(true).setAlpha(1).setScale(ppm(t.y) * 0.012); this.markerT = 1;
    this.player.goTo(t.x, t.y, ok => { if (ok && cb) cb(); });
  }
  approach(kind, o) {
    const p = this.player;
    if (kind === 'clerk' || kind === 'desk') {
      const spot = { x: 742, y: 600 };
      const talk = () => { p.face(this.clerk.x, this.clerk.y + 30); this.startDialog(); };
      if (dist(p.x, p.y, spot.x, spot.y) < 26) talk(); else this.walkTo(spot.x, spot.y, talk);
    } else if (kind === 'guard') {
      const spot = { x: o.bx + (o.name === 'L' ? 30 : -30), y: 400 };
      const talk = () => { p.face(o.x, o.y); o.speak(this.nextGuardLine()); };
      if (dist(p.x, p.y, spot.x, spot.y) < 26) talk(); else this.walkTo(spot.x, spot.y, talk);
    } else if (kind === 'mech') {
      const spot = { x: 836, y: 790 };
      const react = () => { p.face(o.x, o.y - 40); o.wake(); this.time.delayedCall(500, () => this.bubbles.say(this.mech, pick(['ШАГОХОД № 1. РЕЖИМ ОЖИДАНИЯ.', 'ЦЕЛЬ НЕ ОБНАРУЖЕНА. ВЗДЫХАЮ.', 'ДО КОНЦА СМЕНЫ: МНОГО.']), 'machine'));
        this.time.delayedCall(2800, () => this.bubbles.say(this.player, pick(['Говорят, они всё слышат.', 'Пахнет маслом и тоской.', 'Номер один. Интересно, сколько их всего.']), 'thought')); };
      if (dist(p.x, p.y, spot.x, spot.y) < 26) react(); else this.walkTo(spot.x, spot.y, react);
    }
  }
  nextGuardLine() { let l; do { l = pick(GUARD_LINES); } while (l === this.lastGuardLine); this.lastGuardLine = l; return l; }
  approachThing(t) {
    const p = this.player;
    if (t.door) {
      this.walkTo(805, 362, () => {
        p.face(805, 300);
        const g = this.guards[p.x < 805 ? 0 : 1];
        this.guards.forEach(gg => gg.offTo = gg.name === 'L' ? 14 : -14);
        g.speak(pick(DOOR_LINES));
        this.time.delayedCall(4500, () => this.guards.forEach(gg => gg.offTo = 0));
      });
      return;
    }
    const cx = (t.box[0] + t.box[2]) / 2, cy = t.box[3];
    const spot = nearestWalkable(cx, cy + 10, 80);
    const say = () => { p.face(cx, (t.box[1] + t.box[3]) / 2); this.bubbles.say(p, t.say, 'thought'); };
    if (!spot || dist(p.x, p.y, spot.x, spot.y) < 30) say(); else this.walkTo(spot.x, spot.y, say);
  }
  interactNearest() {
    const p = this.player, cand = [['clerk', this.clerk, 742, 600], ['guard', this.guards[0], 720, 400], ['guard', this.guards[1], 888, 400], ['mech', this.mech, 836, 790]];
    let best = null, bd = 1e9; for (const c of cand) { const d = dist(p.x, p.y, c[2], c[3]); if (d < bd) { bd = d; best = c; } }
    if (best && bd < 160) this.approach(best[0], best[1]);
  }
  startDialog() {
    this.clerk.forceFace = true;
    this.time.delayedCall(260, () => this.dialog.start(this.visits === 0 ? 'start0' : this.visits === 1 ? 'start1' : 'start2'));
  }
  endDialog() {
    this.visits++;
    this.clerk.forceFace = false; this.clerk.glanceHold = 0.8;
    if (this.visits === 2) this.time.delayedCall(3500, () => this.guards[1].speak('Ходят тут…'));
  }
  update(time, delta) {
    const dt = clamp((this.game.loop.rawDelta || delta) / 1000, 0.001, 0.1);
    // lamp flicker
    this.flickT -= dt;
    if (this.flickT <= 0) {
      if (this.flickOn) { this.flickOn = false; this.flickT = rand(0.05, 0.16); this.flickCount = (this.flickCount || 0) + 1; AUD.flickerHum(false); }
      else { this.flickOn = true; if (this.flickCount < (this.flickBurst || 0)) this.flickT = rand(0.04, 0.12); else { this.flickT = rand(7, 16); this.flickCount = 0; this.flickBurst = (rand(1, 4)) | 0; } AUD.flickerHum(true); }
    }
    this.flick = this.flickOn ? 1 : 0.93;
    this.flickLamp.setAlpha(this.flickOn ? this.flickLamp.base : 0);
    this.lampGlows.forEach(g => { if (g !== this.flickLamp) g.setAlpha(g.base * (0.95 + 0.05 * Math.sin(time * 0.003 + g.x))); });
    this.bg.setTint(this.flickOn ? 0xffffff : 0xeeeeee);
    for (const l of this.leds) l.im.setAlpha(l.steady ? 0.55 + 0.1 * Math.sin(time * 0.002 * l.p) : (Math.sin(time * 0.001 * l.p * 3 + l.o) > 0 ? 0.75 : 0.08));
    this.steamT -= dt;
    if (this.steamT <= 0) { this.steamT = rand(5, 12); const x = pick([rand(470, 590), rand(990, 1100)]), y = rand(560, 960); for (let i = 0; i < 6; i++) this.time.delayedCall(i * 120, () => this.floorSteam.emitParticleAt(x + rand(-12, 12), y, 1)); }
    // player
    let kx = 0, ky = 0;
    if (!this.dialog.open && this.keys) {
      const K = this.keys;
      kx = (K.D.isDown || K.RIGHT.isDown ? 1 : 0) - (K.A.isDown || K.LEFT.isDown ? 1 : 0);
      ky = (K.S.isDown || K.DOWN.isDown ? 1 : 0) - (K.W.isDown || K.UP.isDown ? 1 : 0);
      if (kx || ky) HUD.firstMove();
    }
    this.player.update(dt, { x: kx, y: ky });
    this.player.tint(this.flickTint(this.player.x, this.player.y));
    // guards react if someone hangs around the door
    const nearDoor = this.player.y < 395 && Math.abs(this.player.x - 805) < 110;
    if (nearDoor && !this.doorWarned) { this.doorWarned = true; if (!this.player.path) {} }
    if (!nearDoor) this.doorWarned = false;
    this.guards.forEach(g => g.update(dt));
    this.banterT -= dt;
    if (this.banterT <= 0) {
      this.banterT = rand(40, 70);
      if (!this.dialog.open && dist(this.player.x, this.player.y, 805, 343) > 230) {
        const b = pick(BANTER); this.guards[0].speak(b[0]); this.time.delayedCall(2600, () => this.guards[1].speak(b[1]));
      }
    }
    const pn = dist(this.player.x, this.player.y, this.clerk.x, this.clerk.depthY) < 150;
    this.clerk.update(dt, pn);
    this.mech.update(dt);
    this.desk.update(dt);
    if (this.markerT > 0) { this.markerT -= dt; this.marker.setAlpha(clamp(this.markerT, 0, 1)); if (this.markerT <= 0 || !this.player.path) this.marker.setVisible(this.markerT > 0 && !!this.player.path); }
    this.updateCamera(dt);
    this.bubbles.update(dt);
    this.dialog.update(dt);
  }
}

/* ------------------------------------------------------------------ speech bubbles (DOM) */
class Bubbles {
  constructor(scene) { this.scene = scene; this.list = []; this.root = document.getElementById('bubbles'); }
  say(who, text, kind = 'say') {
    // a new line pushes out the old one from the same speaker and from anyone standing close by
    const nb = who.bounds();
    this.list.filter(b => { if (b.who === who) return true; const ob = b.who.bounds(); return Math.abs((ob.x0 + ob.x1) / 2 - (nb.x0 + nb.x1) / 2) < 260 && Math.abs(ob.y0 - nb.y0) < 120; }).forEach(b => b.t = Math.min(b.t, 0.15));
    const el = document.createElement('div'); el.className = 'bubble ' + kind; el.textContent = text;
    this.root.appendChild(el);
    const b = { who, el, t: 2.4 + text.length * 0.05 };
    this.list.push(b); requestAnimationFrame(() => el.classList.add('in'));
  }
  update(dt) {
    const cam = this.scene.cameras.main, z = cam.zoom / DPR;
    for (const b of this.list) {
      b.t -= dt;
      const bd = b.who.bounds();
      const wx = (bd.x0 + bd.x1) / 2, wy = bd.y0 - 6;
      const sx = (wx - cam.worldView.x) * z, sy = (wy - cam.worldView.y) * z;
      b.el.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`;
      if (b.t <= 0 && !b.dead) { b.el.classList.remove('in'); b.el.classList.add('out'); b.dead = 0.0001; }
      if (b.dead) b.dead += dt;
    }
    this.list = this.list.filter(b => { if (b.dead > 0.35) { b.el.remove(); return false; } return true; });
  }
}

/* ------------------------------------------------------------------ dialogue panel (DOM) */
class Dialog {
  constructor(scene) {
    this.scene = scene; this.open = false;
    this.el = document.getElementById('dlg'); this.textEl = document.getElementById('dlgText'); this.optsEl = document.getElementById('dlgOpts');
    this.checkEl = document.getElementById('dlgCheck');
    document.getElementById('dlgClose').addEventListener('click', () => this.close());
    this.el.addEventListener('pointerup', e => { if (!e.target.closest('button')) this.skip(); });
    ['pointerdown', 'pointerup', 'touchstart', 'mousedown', 'wheel'].forEach(ev => this.el.addEventListener(ev, e => e.stopPropagation(), { passive: true }));
    this.drawPortrait();
  }
  drawPortrait() {
    const c = document.getElementById('portrait'), g = c.getContext('2d');
    const fr = this.scene.textures.getFrame('atlas', 'c_portrait'), src = fr.source.image;
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
    g.fillStyle = '#0d100e'; g.fillRect(0, 0, c.width, c.height);
    const s = Math.max(c.width / fr.cutWidth, c.height / fr.cutHeight);
    g.drawImage(src, fr.cutX, fr.cutY, fr.cutWidth, fr.cutHeight, (c.width - fr.cutWidth * s) / 2, 0, fr.cutWidth * s, fr.cutHeight * s);
    // scanlines, like a monitor in the guard post
    g.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = 0; y < c.height; y += 3) g.fillRect(0, y, c.width, 1);
  }
  panelWorld(zoom) { return this.open ? (this.el.offsetHeight * DPR) / zoom : 0; }
  start(node) { this.open = true; this.el.hidden = false; document.body.classList.add('talking'); requestAnimationFrame(() => this.el.classList.add('in')); HUD.hint(false); this.show(node); }
  show(id) {
    const n = DLG[id]; this.node = n; this.full = n.t; this.shown = 0; this.typing = true; this.optsEl.innerHTML = '';
    this.textEl.textContent = ''; this.scene.clerk.talking = 1;
    this.checkEl.hidden = !n.check; if (n.check) this.checkEl.textContent = n.check;
  }
  update(dt) {
    if (!this.open || !this.typing) return;
    const before = Math.floor(this.shown);
    this.shown = Math.min(this.full.length, this.shown + dt * 34);
    if (Math.floor(this.shown) !== before && Math.floor(this.shown) % 3 === 0) AUD.blip();
    this.textEl.textContent = this.full.slice(0, Math.floor(this.shown));
    if (this.shown >= this.full.length) this.finishLine();
  }
  skip() { if (this.typing) { this.shown = this.full.length; this.textEl.textContent = this.full; this.finishLine(); } else if (this.node && this.node.end) this.close(); }
  finishLine() {
    this.typing = false; this.scene.clerk.talking = 0;
    const n = this.node;
    if (n.stamp) { AUD.stamp(); this.scene.shake = 0.2; }
    this.optsEl.innerHTML = '';
    const opts = n.end ? [['Уйти', null]] : n.o;
    opts.forEach(([label, to, tag], i) => {
      const li = document.createElement('li'); const b = document.createElement('button'); b.type = 'button'; b.id = 'opt' + i;
      b.innerHTML = `<span class="num">${i + 1}</span><span class="lbl"></span>`;
      if (tag) { const t = document.createElement('span'); t.className = 'tag'; t.textContent = tag; b.querySelector('.lbl').appendChild(t); }
      b.querySelector('.lbl').appendChild(document.createTextNode(label));
      b.addEventListener('click', e => { e.stopPropagation(); this.choose(i); });
      li.appendChild(b); this.optsEl.appendChild(li);
    });
  }
  choose(i) {
    if (!this.open || !this.node) return;
    if (this.typing) { this.skip(); return; }
    const n = this.node; if (n.end) { this.close(); return; }
    const o = n.o[i]; if (!o) return;
    this.show(o[1]);
  }
  close() {
    if (!this.open) return;
    this.open = false; this.el.classList.remove('in'); this.scene.clerk.talking = 0; document.body.classList.remove('talking');
    setTimeout(() => { if (!this.open) this.el.hidden = true; }, 250);
    this.scene.endDialog();
  }
}

/* ------------------------------------------------------------------ HUD */
const HUD = {
  bind(scene) {
    this.scene = scene;
    this.soundBtn = document.getElementById('sound');
    this.soundBtn.addEventListener('click', () => { this.sound = !this.sound; AUD.setOn(this.sound); this.refresh(); });
    document.getElementById('zin').addEventListener('click', () => scene.zoomBy(1.2));
    document.getElementById('zout').addEventListener('click', () => scene.zoomBy(1 / 1.2));
    ['hud', 'zoom'].forEach(id => { const el = document.getElementById(id); ['pointerdown', 'pointerup', 'touchstart', 'mousedown', 'wheel'].forEach(ev => el.addEventListener(ev, e => e.stopPropagation(), { passive: true })); });
    this.refresh();
  },
  refresh() { this.soundBtn.classList.toggle('on', !!this.sound); this.soundBtn.querySelector('b').textContent = this.sound ? 'звук' : 'тихо'; this.soundBtn.setAttribute('aria-pressed', this.sound ? 'true' : 'false'); },
  firstMove() { if (this.moved) return; this.moved = true; this.hint(false); },
  hint(on) { const h = document.getElementById('hint'); if (h) h.classList.toggle('gone', !on); },
};

/* ------------------------------------------------------------------ boot */
function start() {
  const size = () => ({ w: Math.max(320, window.innerWidth), h: Math.max(320, window.innerHeight) });
  const s0 = size();
  const game = new Phaser.Game({
    type: Phaser.WEBGL, parent: 'game', backgroundColor: '#000000', pixelArt: false, antialias: true,
    render: { mipmapFilter: 'LINEAR_MIPMAP_LINEAR' },
    scale: { mode: Phaser.Scale.NONE, width: Math.round(s0.w * DPR), height: Math.round(s0.h * DPR), zoom: 1 / DPR },
    input: { activePointers: 3 }, scene: [Room], banner: false, audio: { noAudio: true },
  });
  window.addEventListener('resize', () => { const s = size(); game.scale.resize(Math.round(s.w * DPR), Math.round(s.h * DPR)); game.scale.setZoom(1 / DPR); });
  game.events.once('ready', () => game.scale.setZoom(1 / DPR));
  window.__game = game;
}
const boot = () => window.claude && window.claude.hot && window.claude.hot.ready ? window.claude.hot.ready(start) : start();
boot();
})();
