/* Живой двор — a living courtyard built on one painted image. Phaser 3.80. */
(() => {
'use strict';
const WORLD = window.__WORLD__, LIGHTS = window.__LIGHTS__;
const W = 1672, H = 941;
const DPR = Math.min(window.devicePixelRatio || 1, 2);

/* ----------------------------------------------------------------- helpers */
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const smooth01 = t => t * t * (3 - 2 * t);
const rgbInt = (r, g, b) => ((clamp(r, 0, 1) * 255) << 16) | ((clamp(g, 0, 1) * 255) << 8) | (clamp(b, 0, 1) * 255);
const personH = y => y < 380 ? 62 - (380 - y) * 0.03 : 62 + (y - 380) * 0.125;
const scaleAt = y => personH(y) / 47;

/* ----------------------------------------------------------------- navigation grid */
const CELL = 4, GW = Math.ceil(W / CELL), GH = Math.ceil(H / CELL);
const NAV = { walk: new Uint8Array(GW * GH), sand: new Uint8Array(GW * GH) };
function buildNav() {
  const c = document.createElement('canvas'); c.width = GW; c.height = GH;
  const g = c.getContext('2d', { willReadFrequently: true });
  const trace = pts => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0] / CELL, p[1] / CELL) : g.moveTo(p[0] / CELL, p[1] / CELL)); };
  g.fillStyle = '#000'; g.fillRect(0, 0, GW, GH);
  g.fillStyle = '#fff'; for (const k in WORLD.walk) { trace(WORLD.walk[k]); g.closePath(); g.fill(); }
  g.fillStyle = '#000'; for (const k in WORLD.block) { trace(WORLD.block[k]); g.closePath(); g.fill(); }
  g.strokeStyle = '#000'; g.lineWidth = 7 / CELL;
  for (const k in WORLD.fences) { trace(WORLD.fences[k].pts); g.stroke(); }
  let d = g.getImageData(0, 0, GW, GH).data;
  for (let i = 0; i < GW * GH; i++) NAV.walk[i] = d[i * 4] > 150 ? 1 : 0;
  g.fillStyle = '#000'; g.fillRect(0, 0, GW, GH); g.fillStyle = '#fff';
  WORLD.sand.forEach(k => { trace(WORLD.walk[k]); g.closePath(); g.fill(); });
  d = g.getImageData(0, 0, GW, GH).data;
  for (let i = 0; i < GW * GH; i++) NAV.sand[i] = d[i * 4] > 128 ? 1 : 0;
}
const cellIdx = (x, y) => clamp((y / CELL) | 0, 0, GH - 1) * GW + clamp((x / CELL) | 0, 0, GW - 1);
const walkable = (x, y) => x >= 0 && y >= 0 && x < W && y < H && NAV.walk[cellIdx(x, y)] === 1;
const onSand = (x, y) => NAV.sand[cellIdx(x, y)] === 1;
function nearestWalkable(x, y, maxR = 80) {
  const cx = clamp((x / CELL) | 0, 0, GW - 1), cy = clamp((y / CELL) | 0, 0, GH - 1);
  if (NAV.walk[cy * GW + cx]) return { x: clamp(x, 0, W - 1), y: clamp(y, 0, H - 1) };
  for (let r = 1; r <= maxR; r++) {
    let best = null, bd = 1e9;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const gx = cx + dx, gy = cy + dy;
      if (gx < 0 || gy < 0 || gx >= GW || gy >= GH || !NAV.walk[gy * GW + gx]) continue;
      const dd = dx * dx + dy * dy; if (dd < bd) { bd = dd; best = { x: gx * CELL + 2, y: gy * CELL + 2 }; }
    }
    if (best) return best;
  }
  return null;
}
class Heap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(k, v) { const K = this.k, V = this.v; K.push(k); V.push(v); let i = K.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (V[p] <= V[i]) break; [K[p], K[i]] = [K[i], K[p]]; [V[p], V[i]] = [V[i], V[p]]; i = p; } }
  pop() { const K = this.k, V = this.v, top = K[0], lk = K.pop(), lv = V.pop();
    if (K.length) { K[0] = lk; V[0] = lv; let i = 0;
      for (;;) { const l = 2 * i + 1, r = l + 1; let m = i;
        if (l < K.length && V[l] < V[m]) m = l; if (r < K.length && V[r] < V[m]) m = r;
        if (m === i) break; [K[m], K[i]] = [K[i], K[m]]; [V[m], V[i]] = [V[i], V[m]]; i = m; } }
    return top; }
}
const G_COST = new Float32Array(GW * GH), CAME = new Int32Array(GW * GH), STAMP = new Uint32Array(GW * GH), CLOSED = new Uint32Array(GW * GH);
let stampN = 1;
const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
function lineClear(ax, ay, bx, by) {
  const n = Math.ceil(Math.hypot(bx - ax, by - ay) / 2);
  for (let i = 1; i <= n; i++) { const t = i / n; if (!walkable(ax + (bx - ax) * t, ay + (by - ay) * t)) return false; }
  return true;
}
function findPath(sx, sy, tx, ty) {
  const s = nearestWalkable(sx, sy), t = nearestWalkable(tx, ty);
  if (!s || !t) return null;
  if (lineClear(s.x, s.y, t.x, t.y)) return [s, t];
  const stamp = ++stampN;
  const start = cellIdx(s.x, s.y), goal = cellIdx(t.x, t.y);
  const gx = goal % GW, gy = (goal / GW) | 0;
  const hh = i => { const dx = Math.abs(i % GW - gx), dy = Math.abs(((i / GW) | 0) - gy); return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy); };
  const heap = new Heap();
  STAMP[start] = stamp; G_COST[start] = 0; CAME[start] = -1; heap.push(start, hh(start));
  let found = false, guard = 0;
  while (heap.size && guard++ < 60000) {
    const cur = heap.pop();
    if (cur === goal) { found = true; break; }
    if (CLOSED[cur] === stamp) continue; CLOSED[cur] = stamp;
    const x = cur % GW, y = (cur / GW) | 0;
    for (const [dx, dy, c] of DIRS) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= GW || ny >= GH) continue;
      const ni = ny * GW + nx; if (!NAV.walk[ni] || CLOSED[ni] === stamp) continue;
      if (dx && dy && (!NAV.walk[y * GW + nx] || !NAV.walk[ny * GW + x])) continue;
      const ng = G_COST[cur] + c;
      if (STAMP[ni] !== stamp || ng < G_COST[ni]) { STAMP[ni] = stamp; G_COST[ni] = ng; CAME[ni] = cur; heap.push(ni, ng + hh(ni)); }
    }
  }
  if (!found) return null;
  const cells = []; for (let c = goal; c !== -1; c = CAME[c]) { cells.push(c); if (c === start) break; }
  cells.reverse();
  const pts = cells.map(c => ({ x: (c % GW) * CELL + 2, y: ((c / GW) | 0) * CELL + 2 }));
  pts[0] = s; pts[pts.length - 1] = t;
  const out = [pts[0]]; let i = 0;
  while (i < pts.length - 1) {
    let j = i + 1;
    while (j + 1 < pts.length && lineClear(pts[i].x, pts[i].y, pts[j + 1].x, pts[j + 1].y)) j++;
    out.push(pts[j]); i = j;
  }
  return out;
}
function randomWalkableIn(poly, tries = 60) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  poly.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
  for (let i = 0; i < tries; i++) { const x = rand(x0, x1), y = rand(y0, y1); if (walkable(x, y) && pointInPoly(x, y, poly)) return { x, y }; }
  return nearestWalkable((x0 + x1) / 2, (y0 + y1) / 2);
}
function pointInPoly(x, y, poly) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}

/* ----------------------------------------------------------------- places */
const P = {
  doorL: { x: 392, y: 332 }, doorLin: { x: 378, y: 304 },
  doorR: { x: 1215, y: 372 }, doorRin: { x: 1238, y: 350 },
  shop: { x: 1505, y: 442 }, shopIn: { x: 1530, y: 418 },
  exitN: { x: 745, y: 6 }, exitE: { x: 1666, y: 596 }, exitS: { x: 812, y: 934 },
  U1: { x: 300, y: 425 }, U2: { x: 452, y: 398 }, gap: { x: 505, y: 445 }, L1: { x: 330, y: 585 }, L2: { x: 560, y: 790 },
  S: { x: 800, y: 862 }, B1: { x: 1010, y: 755 }, B2: { x: 1280, y: 720 }, corner: { x: 1450, y: 640 },
  R1: { x: 1320, y: 545 }, R2: { x: 1100, y: 466 }, M1: { x: 900, y: 385 }, M2: { x: 700, y: 313 }, N1: { x: 745, y: 150 },
  pad: { x: 1085, y: 692 }, grannyFront: { x: 1050, y: 672 },
};
const LOOP = ['U2', 'gap', 'L1', 'L2', 'S', 'B1', 'B2', 'corner', 'R1', 'R2', 'M1', 'M2', 'U1'];
const SAND_POLY = WORLD.walk.sand;
const GROUND_PIGEON_POLYS = [SAND_POLY, [[1040, 652], [1110, 650], [1188, 636], [1112, 692], [1048, 744], [1030, 714]]];
const PERCHES = [
  { pts: [[1264, 784], [1300, 770], [1345, 753], [1392, 735], [1440, 717], [1490, 698], [1545, 678], [1628, 648], [1338, 800], [1404, 794], [1452, 772]], depth: 1500, roof: true },
  { pts: [[736, 413], [758, 410], [776, 416]], depth: 690 },
  { pts: [[945, 489], [972, 498], [1000, 506]], depth: 720 },
  { pts: [[1192, 233], [1226, 236], [1262, 240]], depth: 380 },
  { pts: [[338, 174], [370, 177], [402, 181]], depth: 330 },
  { pts: [[1402, 255], [1462, 268], [1542, 286]], depth: 350 },
];

/* ----------------------------------------------------------------- time of day */
const KEYS = [
  [0, 0, [0.33, 0.39, 0.62], 1], [270, 0, [0.29, 0.34, 0.57], 1], [360, 0.1, [0.48, 0.5, 0.72], 1],
  [420, 0.55, [0.86, 0.78, 0.86], 0.65], [480, 1, [1, 0.97, 0.95], 0.1], [720, 1, [1, 1, 1], 0],
  [900, 1, [1, 0.98, 0.94], 0], [990, 0.62, [1, 0.93, 0.86], 0.35], [1050, 0.12, [1, 0.97, 0.97], 0.85],
  [1110, 0, [0.92, 0.92, 1], 1], [1200, 0, [0.64, 0.68, 0.88], 1], [1320, 0, [0.45, 0.5, 0.74], 1], [1440, 0, [0.33, 0.39, 0.62], 1],
];
function timeParams(m) {
  m = ((m % 1440) + 1440) % 1440;
  let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1][0] <= m) i++;
  const a = KEYS[i], b = KEYS[i + 1], t = smooth01((m - a[0]) / (b[0] - a[0]));
  return { dayMix: lerp(a[1], b[1], t), tint: [lerp(a[2][0], b[2][0], t), lerp(a[2][1], b[2][1], t), lerp(a[2][2], b[2][2], t)], night: lerp(a[3], b[3], t) };
}
const fmtTime = m => { m = ((Math.floor(m) % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
const phaseName = m => { const h = (m / 60) % 24; return h < 5 ? 'ночь' : h < 9 ? 'утро' : h < 16.5 ? 'день' : h < 21.5 ? 'вечер' : 'ночь'; };
const inWindow = (m, a, b) => a <= b ? m >= a && m < b : m >= a || m < b;

/* ----------------------------------------------------------------- cast */
const CAST = {
  gleb: { h: 47, skin: '#c69a7c', hair: '#3a2618', hairStyle: 'long', beard: '#3b2517', coat: '#4f5333', coat2: '#3b3e26', hood: true, coatLen: 'mid', pants: '#283147', shoes: '#1d1815', trim: '#8a8273' },
  mama: { h: 44, skin: '#dcb196', hair: '#3b2318', hairStyle: 'pony', coat: '#b49d8e', coatLen: 'long', scarf: '#9b3b3d', pants: '#27324b', shoes: '#5c3a25' },
  dogman: { h: 46, skin: '#c09276', hairStyle: 'cap', hat: '#1f1f24', hair: '#2a2420', coat: '#30343a', coatLen: 'mid', pants: '#3a3b42', shoes: '#151416', w: 1.05 },
  kid: { h: 31, skin: '#e0b49a', hairStyle: 'pompom', hat: '#b23a3a', hair: '#5a3a22', coat: '#d1a22a', coatLen: 'short', pants: '#2b3550', shoes: '#2a2a30', run: true },
  granny: { h: 40, skin: '#d4a98e', hairStyle: 'kerchief', hat: '#7a3f63', coat: '#5d4a3a', coatLen: 'long', pants: '#3a3036', shoes: '#2a2220', w: 1.15 },
  night: { h: 46, skin: '#c4987e', hair: '#1f1a18', hairStyle: 'short', coat: '#25272d', coat2: '#1c1d22', hood: true, coatLen: 'short', pants: '#2c2c33', shoes: '#c9c9c9' },
};
const SHOPPERS = [
  { h: 45, skin: '#c99a80', hair: '#2b2018', hairStyle: 'short', coat: '#3d4a5f', coatLen: 'mid', pants: '#2d2d33', shoes: '#18161a' },
  { h: 43, skin: '#dcae94', hair: '#6a3a22', hairStyle: 'longw', coat: '#6b4f6b', coatLen: 'long', pants: '#2a2632', shoes: '#2b1d18' },
  { h: 46, skin: '#b88a70', hairStyle: 'cap', hat: '#7a2b2b', hair: '#3a2a20', coat: '#4a4a3a', coatLen: 'mid', pants: '#33343a', shoes: '#151515' },
  { h: 44, skin: '#d8ad92', hair: '#c9a46a', hairStyle: 'longw', coat: '#2f3542', coatLen: 'mid', scarf: '#d6c7a2', pants: '#1f2430', shoes: '#4a2f22' },
  { h: 47, skin: '#c29074', hair: '#585450', hairStyle: 'short', coat: '#5d6b4a', coatLen: 'short', pants: '#2e3442', shoes: '#1a1a1a', w: 1.12 },
  { h: 42, skin: '#e2b8a0', hairStyle: 'cap', hat: '#2c5a6a', hair: '#2a2018', coat: '#8a3a3a', coatLen: 'mid', pants: '#26263a', shoes: '#2a2226' },
];
const UMB_COLORS = ['#1c1c22', '#7a2430', '#26324f', '#2f4a3a', '#5b3d6b'];

/* ----------------------------------------------------------------- lines */
const LINES = {
  granny: {
    morning: ['— Глебушка, ты опять без шапки? Уши отморозишь!', '— Брат-то твой уже на работу ушёл. А ты?'],
    day: ['— А мы тут сидим, за порядком смотрим.', '— Видала, Зин? Опять он в телефон уткнулся.'],
    evening: ['— Видала, Зин? Вчера с девушкой у подъезда стоял.', '— Какая девушка? Он с шавермой стоял.'],
    night: ['— Не спится нам, Глебушка. Кто ж за двором следить будет?', '— Иди спать. Мы покараулим.'],
    rain: ['— Дождь — не повод покидать пост.'],
    passing: ['— Вон, Глеб идёт…', '— Без шапки опять.', '— Похудел, бедный.', '— Здравствуй, Глебушка!'],
  },
  shopgirl: { day: ['— Заходи, Глеб. Хлеб свежий, пельмени по акции.', '— Сдачи нет, давай без сдачи.'], night: ['— Ночная смена. Кофе из автомата будешь?', '— Курить вредно. Не начинай.'] },
  vitya: ['— Кота ищу. Рыжий, наглый, отзывается на «Барсик». Не видал?', '— Третий день объявление читаю. Вдруг что новое напишут.'],
  mama: ['— Тише, он только уснул.', '— Не знаешь, аптека на углу круглосуточная?', '— Опять дождь… а нам гулять положено.'],
  dogman: ['— Вечер добрый. Тузик, фу! Брось листья.', '— Он не кусается. Он только голубей не любит.'],
  kid: ['— Дядя, а вы голубей тоже гоняете?', '— Я вчера одного почти поймал!'],
  granny2: ['— Глебушка, а брат-то твой женился уже?', '— В «Продукты» сметану завезли, беги.'],
  shopper: ['— Добрый.', '— Хлеб свежий привезли?', '— Ну и погодка.', '— Пакет порвался, представляешь.'],
  night: ['— Не спится?', '— Тоже за шавермой?'],
};
const THINGS = [
  { id: 'granny', box: [1058, 562, 1162, 650], at: P.grannyFront, who: 'granny', anchor: [1108, 556] },
  { id: 'shopgirl', box: [1534, 350, 1568, 426], at: { x: 1528, y: 444 }, who: 'shopgirl', anchor: [1550, 346] },
  { id: 'vitya', box: [1382, 334, 1420, 408], at: { x: 1400, y: 414 }, who: 'vitya', anchor: [1400, 330] },
  { id: 'doorL', box: [338, 192, 388, 290], at: P.doorL, say: m => m > 1380 || m < 360 ? 'Тихо. Весь подъезд спит.' : 'Сорок вторая квартира. Брат опять не открывает.' },
  { id: 'doorR', box: [1220, 262, 1260, 348], at: P.doorRin, say: () => 'Домофон пищит, но не открывает. Классика.' },
  { id: 'shopwin', box: [1424, 290, 1502, 380], at: { x: 1460, y: 404 }, say: () => 'Пельмени, хлеб, батарейки. Всё, что нужно для счастья.' },
  { id: 'sign', box: [1362, 244, 1598, 338], at: { x: 1470, y: 404 }, say: () => '«ПРОДУКТЫ». Буква «Ы» опять мигает.' },
  { id: 'swings', box: [898, 482, 1040, 618], at: { x: 968, y: 640 }, say: () => 'Скрипят на весь двор. Лучшая музыка детства.' },
  { id: 'carousel', box: [840, 612, 933, 668], at: { x: 886, y: 692 }, say: () => 'Если раскрутить как следует, можно увидеть прошлое.' },
  { id: 'sandbox', box: [645, 595, 758, 648], at: { x: 700, y: 668 }, say: () => 'Кто-то слепил куличик. Уважаю.' },
  { id: 'slide', box: [614, 498, 730, 590], at: { x: 600, y: 600 }, say: () => 'Мокрая. Съезжать не буду. Наверное.' },
  { id: 'frame', box: [700, 405, 860, 592], at: { x: 780, y: 606 }, say: () => 'Здесь я однажды застрял. Никому не рассказывайте.' },
  { id: 'benchTL', box: [558, 445, 678, 520], at: { x: 600, y: 536 }, say: () => 'Лавочка мокрая. Посижу в другой раз.' },
  { id: 'lamp', box: [1020, 680, 1050, 740], at: { x: 1062, y: 712 }, say: m => m > 1080 || m < 420 ? 'Фонарь горит через раз. Сегодня — раз.' : 'Фонарь. Ждёт вечера.' },
  { id: 'neon', box: [1250, 790, 1420, 900], at: { x: 1250, y: 768 }, say: () => 'Шаверма до двух. Я знаю, где это.' },
  { id: 'roof', box: [1400, 640, 1672, 941], at: { x: 1460, y: 650 }, say: m => m > 1200 || m < 400 ? 'Там голуби ночуют. Тепло от вентиляции.' : 'Крыша. Оттуда голуби видят всё.' },
  { id: 'carDTL', box: [212, 297, 372, 380], car: true, say: () => 'Ей лет больше, чем мне.' },
  { id: 'carWTC', box: [477, 265, 642, 344], car: true, say: () => 'Опять на газоне припарковались.' },
  { id: 'carBlue', box: [966, 298, 1124, 386], car: true, say: () => 'Синяя. Как понедельник.' },
  { id: 'carWR', box: [1272, 410, 1458, 500], car: true, say: () => 'Сигнализация громкая. Проверено.' },
  { id: 'carSUV', box: [1535, 447, 1672, 564], car: true, say: () => 'Большая. Хозяин — маленький и злой.' },
  { id: 'carWL', box: [25, 410, 232, 512], car: true, say: () => 'Машина дяди Вити. Не трогай.' },
  { id: 'carWBL', box: [165, 700, 352, 812], car: true, say: () => 'Под листьями её почти не видно.' },
  { id: 'carWagon', box: [230, 765, 490, 912], car: true, say: () => 'На багажнике — целый сад из листьев.' },
  { id: 'carDB', box: [410, 845, 658, 941], car: true, say: () => 'Чья-то «девятка». Вечная.' },
  { id: 'carDBR', box: [985, 752, 1238, 902], car: true, say: () => 'Стоит тут с прошлой зимы.' },
  { id: 'carTop', box: [648, 140, 734, 200], car: true, say: () => 'Кто-то паркуется прямо на проезде.' },
];

/* ----------------------------------------------------------------- shared state */
const S = {
  min: 17 * 60 + 20, speedIdx: 0, rain: true, rainI: 1, wind: 6, windT: 0, gust: 0, gustT: 0, gustDur: 0, gustPow: 0,
  params: null, sound: false, started: false, firstMove: false,
};
const SPEEDS = [{ k: 1, label: '×1' }, { k: 6, label: '×6' }, { k: 30, label: '×30' }];
const BASE_RATE = 2; // game minutes per real second at ×1

/* ----------------------------------------------------------------- audio (synth only) */
const AUD = (() => {
  let ctx = null, master, rainG, windG, windF, noiseBuf;
  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); let b = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b = 0.97 * b + 0.03 * w; d[i] = w * 0.6 + b * 2.5; }
    const loop = (filterType, freq, q) => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q; const g = ctx.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(master); s.start(); return { g, f }; };
    const r1 = loop('bandpass', 2600, 0.5); rainG = r1.g;
    const r2 = loop('lowpass', 420, 0.7); r2.g.gain.value = 0; rainG.low = r2.g;
    const w = loop('lowpass', 380, 1.4); windG = w.g; windF = w.f;
  }
  function setOn(on) { if (on) { init(); ctx.resume(); } else if (ctx) ctx.suspend(); }
  function ambience(rain, wind) {
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    rainG.gain.setTargetAtTime(0.11 * rain, t, 0.4); rainG.low.gain.setTargetAtTime(0.05 * rain, t, 0.4);
    windG.gain.setTargetAtTime(0.012 + clamp(wind / 40, 0, 1) * 0.07, t, 0.5);
    windF.frequency.setTargetAtTime(260 + wind * 9, t, 0.5);
  }
  function burst(freq, dur, vol, type = 'bandpass', delay = 0) {
    if (!ctx || ctx.state !== 'running') return;
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = 1.2;
    const g = ctx.createGain(); const t = ctx.currentTime + delay;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }
  function tone(freq, dur, vol, type = 'square', delay = 0, glide) {
    if (!ctx || ctx.state !== 'running') return;
    const o = ctx.createOscillator(); o.type = type; const g = ctx.createGain(); const t = ctx.currentTime + delay;
    o.frequency.setValueAtTime(freq, t); if (glide) o.frequency.linearRampToValueAtTime(glide, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.setValueAtTime(vol, t + dur * 0.7); g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  return {
    setOn, ambience,
    flutter(v = 1) { for (let i = 0; i < 12; i++) burst(1300 + Math.random() * 500, 0.05, 0.05 * v, 'bandpass', i * 0.032 + Math.random() * 0.01); },
    step(wet, v = 1) { burst(wet ? 2200 : 700, wet ? 0.09 : 0.06, (wet ? 0.03 : 0.035) * v, wet ? 'highpass' : 'lowpass'); },
    chirp() { tone(1500, 0.08, 0.05); tone(1500, 0.08, 0.05, 'square', 0.14); },
    creak(v = 1) { tone(620, 0.32, 0.012 * v, 'triangle', 0, 980); },
    coo(v = 1) { tone(290, 0.22, 0.03 * v, 'sine', 0, 250); tone(310, 0.3, 0.03 * v, 'sine', 0.26, 240); },
    bark(v = 1) { burst(600, 0.09, 0.06 * v, 'bandpass'); burst(480, 0.12, 0.05 * v, 'bandpass', 0.16); },
  };
})();

/* ----------------------------------------------------------------- scene */
class Yard extends Phaser.Scene {
  constructor() { super('yard'); }
  preload() {
    this.load.image('bgEve', 'bg_eve.webp');
    this.load.image('bgDay', 'bg_day.webp');
    this.load.image('lights', 'lights.webp');
    this.load.on('progress', v => { const el = document.getElementById('loadbar'); if (el) el.style.width = Math.round(v * 100) + '%'; });
  }
  create() {
    buildNav();
    this.makeTextures();
    this.bgEve = this.add.image(0, 0, 'bgEve').setOrigin(0).setDepth(0);
    this.bgDay = this.add.image(0, 0, 'bgDay').setOrigin(0).setDepth(1);
    this.makeLights();
    this.makeNeon();
    this.leash = this.add.graphics().setDepth(1);
    this.swingG = this.add.graphics().setDepth(100 + 592);
    this.swing = [{ hooks: [[942, 493], [958, 497]], rest: [[943, 566], [958, 566]], col: 0x2d3a52, a: 0, v: 0 },
                  { hooks: [[977, 505], [994, 510]], rest: [[978, 578], [993, 578]], col: 0x6b3a32, a: 0, v: 0 }];
    this.actors = []; this.pigeons = []; this.fx = [];
    this.player = new Actor(this, { key: 'gleb', sheet: this.sheets.gleb, x: 395, y: 336, speed: 1.05, name: 'Глеб' });
    this.player.isPlayer = true;
    this.actors.push(this.player);
    this.makeStatics();
    this.makePigeons();
    this.makeWeather();
    this.director = new Director(this);
    this.bubbles = new Bubbles(this);
    this.setupCamera();
    this.setupInput();
    HUD.bind(this);
    this.marker = this.add.image(0, 0, 'ring').setDepth(57).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);
    this.applyTime(true);
    const snap = window.claude && window.claude.hot && window.claude.hot.data;
    if (snap && snap.min != null) { S.min = snap.min; S.rain = snap.rain; S.speedIdx = snap.speedIdx || 0; this.player.x = snap.px; this.player.y = snap.py; }
    try { if (window.claude && window.claude.hot && window.claude.hot.snapshot) window.claude.hot.snapshot(() => ({ min: S.min, rain: S.rain, speedIdx: S.speedIdx, px: this.player.x, py: this.player.y })); } catch (e) { /* the viewer may not support hot snapshots */ }
    document.getElementById('loader').classList.add('done');
  }

  /* ---------- textures */
  makeTextures() {
    const T = this.textures;
    const sheet = (key, sh, rows = ['front', 'side', 'back']) => {
      const tex = T.addCanvas(key, sh.canvas);
      rows.forEach((v, r) => { for (let f = 0; f < sh.cols; f++) tex.add(v + f, 0, f * sh.fw, r * sh.fh, sh.fw, sh.fh); });
      return sh;
    };
    this.sheets = {};
    for (const k in CAST) this.sheets[k] = sheet(k, SPR.person(CAST[k]));
    this.sheets.glebHood = sheet('glebHood', SPR.person(Object.assign({}, CAST.gleb, { hoodUp: true })));
    SHOPPERS.forEach((s, i) => { this.sheets['shopper' + i] = sheet('shopper' + i, SPR.person(s)); });
    this.sheets.dog = sheet('dog', SPR.dog({ fur: '#6b4a2f', belly: '#a5825f' }));
    this.sheets.pram = sheet('pram', SPR.pram());
    for (let v = 0; v < 4; v++) {
      const pg = SPR.pigeon(v); const tex = T.addCanvas('pigeon' + v, pg.canvas);
      pg.names.forEach((n, i) => tex.add(n, 0, i * pg.fw, 0, pg.fw, pg.fh));
      this.pigeonSheet = pg;
    }
    UMB_COLORS.forEach((c, i) => T.addCanvas('umb' + i, SPR.umbrella(c)));
    ['white', 'avoska', 'blue'].forEach(k => T.addCanvas('bag_' + k, SPR.bag(k)));
    const lin = k => T.get(k).setFilter(Phaser.Textures.FilterMode.LINEAR);
    T.addCanvas('glow', SPR.softDot(128)); lin('glow');
    T.addCanvas('puff', SPR.puff(32)); lin('puff');
    T.addCanvas('shadow', SPR.shadow()); lin('shadow');
    T.addCanvas('drop', SPR.drop()); lin('drop');
    T.addCanvas('ripple', SPR.ripple()); lin('ripple');
    const lv = SPR.leaves(); const lt = T.addCanvas('leaf', lv.canvas);
    for (let i = 0; i < lv.n; i++) lt.add('l' + i, 0, i * lv.fw, 0, lv.fw, lv.fh);
    this.leafKinds = lv.n;
    const ring = document.createElement('canvas'); ring.width = 40; ring.height = 16;
    const rg = ring.getContext('2d'); rg.strokeStyle = 'rgba(255,230,170,0.9)'; rg.lineWidth = 2; rg.beginPath(); rg.ellipse(20, 8, 17, 6, 0, 0, Math.PI * 2); rg.stroke();
    T.addCanvas('ring', ring); lin('ring');
    const lt2 = T.get('lights');
    LIGHTS.forEach(d => lt2.add(d.id, 0, d.ax, d.ay, d.w, d.h));
  }

  /* ---------- emissive overlays and glows */
  makeLights() {
    const rnd = (seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647)(7);
    this.wins = []; this.letters = []; this.glows = [];
    const glow = (x, y, r, col, base) => { const g = this.add.image(x, y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(4000).setScale(r / 64).setTint(col).setAlpha(0); g.base = base; this.glows.push(g); return g; };
    LIGHTS.forEach(d => {
      const img = this.add.image(d.x, d.y, 'lights', d.id).setOrigin(0).setDepth(2).setAlpha(0);
      img.meta = d;
      if (d.kind === 'window') {
        const on = 16 * 60 + rnd() * 200, off = (22 * 60 + rnd() * 240) % 1440, owl = rnd() < 0.12;
        const early = rnd() < 0.45, mOn = 330 + rnd() * 100, mOff = 450 + rnd() * 80;
        const tv = d.src === 'synth' && rnd() < 0.2;
        img.sched = { on, off, owl, early, mOn, mOff, tv, warmth: d.src === 'synth' ? pick([0xffffff, 0xffeedd, 0xfff4e0, 0xffe2c4]) : 0xffffff };
        img.cur = 0;
        img.glow = glow(d.x + d.w / 2, d.y + d.h / 2, Math.max(d.w, d.h) * 1.3, 0xffb070, 0.22);
        this.wins.push(img);
      } else if (d.kind === 'letter') { this.letters[d.index] = img; }
      else this[d.id === 'sign_box' ? 'signBox' : d.id] = img;
    });
    this.lampGlows = {
      entry_l: glow(341, 212, 42, 0xffc888, 0.65), entry_r: glow(1256, 274, 46, 0xffc888, 0.7),
      shopDoor: glow(1530, 372, 95, 0xffb878, 0.42), shopWin: glow(1460, 336, 120, 0xffc080, 0.28),
      sign: glow(1480, 292, 120, 0xff3a2a, 0.36), lamp: glow(1036, 692, 46, 0xfff0d0, 0.75),
      neon: glow(1320, 820, 110, 0xff3d8b, 0.32), neon24: glow(1580, 343, 34, 0x40e0ff, 0.5),
    };
    this.pointLights = [
      { x: 340, y: 300, r: 120, c: [1, 0.8, 0.55], i: 0.5, k: 'entry_l' }, { x: 1250, y: 360, r: 130, c: [1, 0.8, 0.55], i: 0.55, k: 'entry_r' },
      { x: 1500, y: 420, r: 210, c: [1, 0.82, 0.58], i: 0.7, k: 'shop' }, { x: 1480, y: 330, r: 160, c: [1, 0.35, 0.3], i: 0.3, k: 'sign' },
      { x: 1036, y: 712, r: 95, c: [1, 0.92, 0.75], i: 0.55, k: 'lamp' }, { x: 1310, y: 800, r: 140, c: [1, 0.35, 0.65], i: 0.35, k: 'neon' },
    ];
    this.lightState = { entry_l: 0, entry_r: 0, shop: 1, sign: 0, lamp: 0, neon: 0 };
    this.flick = { y: 0, lamp: 1, entry: 1, buzz: 1, t: 0 };
  }

  makeNeon() {
    const font1 = '700 15px "Pixelify Sans", "Courier New", monospace', font2 = '700 12px "Pixelify Sans", "Courier New", monospace';
    const draw = () => {
      const mk = (key, w, h, fn) => { if (this.textures.exists(key)) this.textures.remove(key); const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d')); this.textures.addCanvas(key, c).setFilter(Phaser.Textures.FilterMode.LINEAR); };
      mk('neonShav', 300, 150, g => {
        g.setTransform(1, -0.378, 0, 1, 0, 76);
        g.textBaseline = 'middle'; g.shadowColor = '#fff'; g.shadowBlur = 4; g.fillStyle = '#fff'; g.strokeStyle = '#fff';
        g.font = font1; const w1 = g.measureText('ШАВЕРМА').width; g.font = font2; const w2 = g.measureText('24 \u2192 за углом').width;
        const bw = Math.max(w1, w2) + 16;
        g.font = font1; g.fillText('ШАВЕРМА', 14, 31); g.font = font2; g.fillText('24 \u2192 за углом', 14, 49);
        g.lineWidth = 1.5; g.strokeRect(6, 18, bw, 42);
      });
      mk('neon24', 40, 20, g => { g.font = font2; g.textBaseline = 'middle'; g.shadowColor = '#fff'; g.shadowBlur = 3; g.fillStyle = '#fff'; g.fillText('24', 4, 10); g.strokeStyle = '#fff'; g.lineWidth = 1; g.strokeRect(1.5, 2.5, 22, 15); });
    };
    draw();
    this.neonShav = this.add.image(1252, 730, 'neonShav').setOrigin(0).setDepth(3).setScale(0.8);
    this.neonShavGlow = this.add.image(1252, 730, 'neonShav').setOrigin(0).setDepth(4001).setScale(0.8).setBlendMode(Phaser.BlendModes.ADD);
    this.neon24 = this.add.image(1567, 336, 'neon24').setOrigin(0).setDepth(3).setScale(0.75);
    this.neonHue = 0;
    if (document.fonts && document.fonts.load) Promise.all([document.fonts.load(font1), document.fonts.load(font2)]).then(() => {
      draw(); this.neonShav.setTexture('neonShav'); this.neonShavGlow.setTexture('neonShav'); this.neon24.setTexture('neon24');
    }).catch(() => {});
  }

  /* ---------- painted characters that stay put */
  makeStatics() {
    // cigarette smoke from the shop girl, steam from the roof vents
    this.smoke = this.add.particles(0, 0, 'puff', {
      x: { onEmit: () => 1556 + rand(-1, 1) }, y: { onEmit: () => 372 }, lifespan: 2600, speedY: { min: -10, max: -16 },
      speedX: { onEmit: () => S.wind * 0.6 + rand(-2, 2) }, scale: { start: 0.08, end: 0.5 }, alpha: { start: 0.35, end: 0 },
      frequency: 260, quantity: 1, tint: { onEmit: () => this.ambientInt || 0xffffff },
    }).setDepth(4000);
    this.smoke.stop(); this.smokeT = 2;
    this.steam = this.add.particles(0, 0, 'puff', {
      x: { onEmit: () => pick([1597, 1561]) + rand(-3, 3) }, y: { onEmit: p => 0 }, lifespan: 3800,
      speedY: { min: -14, max: -24 }, speedX: { onEmit: () => S.wind * 1.4 + rand(-3, 3) },
      scale: { start: 0.35, end: 1.9 }, alpha: { start: 0.22, end: 0 }, frequency: 220, quantity: 1,
      tint: { onEmit: () => this.ambientInt || 0xffffff },
      emitCallback: p => { p.y = p.x > 1580 ? 612 : 700; },
    }).setDepth(1490);
  }

  /* ---------- pigeons */
  makePigeons() {
    for (let i = 0; i < 9; i++) {
      const pt = randomWalkableIn(SAND_POLY);
      this.pigeons.push(new Pigeon(this, pt.x, pt.y, i % 4));
    }
  }

  /* ---------- rain, ripples, leaves */
  makeWeather() {
    const view = () => this.cameras.main.worldView;
    this.rainEm = this.add.particles(0, 0, 'drop', {
      x: { onEmit: () => { const v = view(); return v.x - 160 + Math.random() * (v.width + 320); } },
      y: { onEmit: () => { const v = view(); return v.y - 80 + Math.random() * v.height * 0.95; } },
      lifespan: { min: 380, max: 820 }, speedY: { min: 520, max: 660 },
      speedX: { onEmit: () => S.wind * 7 + rand(-10, 10) },
      rotate: { onEmit: () => -Math.atan2(S.wind * 7, 590) * 57.3 },
      scaleY: { min: 0.7, max: 1.35 }, scaleX: 1, alpha: { start: 0.42, end: 0.15 },
      quantity: 3, frequency: 16, tint: { onEmit: () => this.rainTint || 0xcfd8e6 },
    }).setDepth(3000);
    this.ripples = [];
    for (let i = 0; i < 46; i++) this.ripples.push(this.add.image(0, 0, 'ripple').setDepth(58).setVisible(false).setBlendMode(Phaser.BlendModes.ADD));
    this.leaves = [];
    for (let i = 0; i < 130; i++) {
      const im = this.add.image(0, 0, 'leaf', 'l' + (i % this.leafKinds)).setVisible(false);
      this.leaves.push({ im, state: 0 });
    }
    this.CANOPIES = [
      [0, 0, 210, 420, 1.4], [600, 0, 700, 260, 1], [800, 0, 1030, 300, 1.6], [0, 480, 330, 941, 1.8],
      [1080, 700, 1240, 941, 1.2], [1360, 480, 1560, 700, 0.8], [420, 380, 1320, 720, 0.7], [1130, 380, 1290, 460, 0.5],
    ];
  }

  setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, W, H);
    this.follow = { x: this.player.x, y: this.player.y - 40 };
    cam.startFollow(this.follow, false, 0.09, 0.09);
    this.fitZoom(true);
    this.scale.on('resize', () => this.fitZoom(false));
  }
  minZoom() { return Math.max(this.scale.width / W, this.scale.height / H); }
  fitZoom(initial) {
    const cam = this.cameras.main, mz = this.minZoom();
    if (initial || this.zoomLevel == null) this.zoomLevel = Math.max(mz, Math.min(mz * 1.45, (this.scale.height / 560)));
    this.zoomLevel = clamp(this.zoomLevel, mz, mz * 3.2);
    cam.setZoom(this.zoomLevel);
  }
  zoomBy(k) { this.zoomLevel = clamp(this.zoomLevel * k, this.minZoom(), this.minZoom() * 3.2); this.cameras.main.setZoom(this.zoomLevel); }

  setupInput() {
    this.input.addPointer(2);
    const pts = new Map(); let pinch = null, dragMoved = false, downAt = null;
    this.input.on('pointerdown', p => {
      pts.set(p.id, { x: p.x, y: p.y }); downAt = { x: p.x, y: p.y, t: performance.now() }; dragMoved = false;
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: this.zoomLevel }; }
      if (!S.started) { S.started = true; }
    });
    this.input.on('pointermove', p => {
      if (!pts.has(p.id)) return; pts.set(p.id, { x: p.x, y: p.y });
      if (pinch && pts.size >= 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); this.zoomLevel = clamp(pinch.z * d / pinch.d, this.minZoom(), this.minZoom() * 3.2); this.cameras.main.setZoom(this.zoomLevel); dragMoved = true; }
      else if (downAt && Math.hypot(p.x - downAt.x, p.y - downAt.y) > 14 * DPR) dragMoved = true;
    });
    const up = p => {
      const wasPinch = !!pinch; pts.delete(p.id); if (pts.size < 2) pinch = null;
      if (wasPinch || dragMoved || !downAt) return;
      const wp = this.cameras.main.getWorldPoint(p.x, p.y);
      this.tapAt(wp.x, wp.y);
      downAt = null;
    };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);
    this.input.on('wheel', (p, objs, dx, dy) => this.zoomBy(dy > 0 ? 0.9 : 1.1));
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
  }

  tapAt(x, y) {
    HUD.firstMove();
    // people first (moving actors), then pigeons, then things
    let best = null, bd = 1e9;
    for (const a of this.actors) {
      if (a.isPlayer || !a.alive || a.alpha < 0.5) continue;
      const hgt = personH(a.y) * (a.sheet.h / 47);
      if (x > a.x - hgt * 0.28 && x < a.x + hgt * 0.28 && y > a.y - hgt && y < a.y + 6) { const d = Math.abs(a.y - y); if (d < bd) { bd = d; best = a; } }
    }
    if (best) return this.approachActor(best);
    for (const pg of this.pigeons) if (!pg.flying && dist(x, y, pg.x, pg.y - 6) < 22) { this.walkPlayer(pg.x, pg.y + 6, () => this.bubbles.say(this.player, 'Кыш-кыш!', true)); return; }
    const hit = THINGS.filter(t => x >= t.box[0] && x <= t.box[2] && y >= t.box[1] && y <= t.box[3])
      .sort((a, b) => (a.box[2] - a.box[0]) * (a.box[3] - a.box[1]) - (b.box[2] - b.box[0]) * (b.box[3] - b.box[1]))[0];
    if (hit) return this.approachThing(hit);
    this.walkPlayer(x, y);
  }
  walkPlayer(x, y, cb) {
    const t = nearestWalkable(x, y, 40);
    if (!t) return;
    this.marker.setPosition(t.x, t.y).setVisible(true).setAlpha(1).setScale(scaleAt(t.y) * 0.9);
    this.markerT = 1.1;
    this.player.goTo(t.x, t.y, ok => { if (ok && cb) cb(); });
    if (this.player.chat) this.player.chat = null;
  }
  approachThing(t) {
    const say = () => {
      if (t.car) { this.carAlarm(t); return; }
      if (t.who) { this.player.faceTo(t.anchor[0], t.anchor[1] + 40); this.bubbles.say({ x: t.anchor[0], y: t.anchor[1], world: true }, this.staticLine(t.who)); return; }
      this.player.faceTo((t.box[0] + t.box[2]) / 2, (t.box[1] + t.box[3]) / 2);
      this.bubbles.say(this.player, t.say(S.min), true);
    };
    let at = t.at;
    if (!at) { const cx = (t.box[0] + t.box[2]) / 2; at = nearestWalkable(cx, t.box[3] + 14, 60) || { x: cx, y: t.box[3] }; }
    if (dist(this.player.x, this.player.y, at.x, at.y) < 30) say(); else this.walkPlayer(at.x, at.y, say);
  }
  approachActor(a) {
    const side = this.player.x < a.x ? -1 : 1;
    const tx = a.x + side * personH(a.y) * 0.4, ty = a.y + 2;
    a.hold(4.5);
    const talk = () => {
      if (!a.alive) return;
      a.faceTo(this.player.x, this.player.y); this.player.faceTo(a.x, a.y);
      a.hold(3.5);
      if (a.role === 'dog') { this.bubbles.say(this.player, 'Хороший пёс!', true); a.wag = 2.5; AUD.bark(0.6); return; }
      const lines = LINES[a.role] || LINES.shopper;
      this.bubbles.say(a, pick(lines));
    };
    if (dist(this.player.x, this.player.y, tx, ty) < 26) talk(); else this.walkPlayer(tx, ty, talk);
  }
  staticLine(who) {
    const m = S.min, h = m / 60;
    if (who === 'granny') {
      if (S.rain && Math.random() < 0.3) return pick(LINES.granny.rain);
      return pick(h < 5 || h >= 22 ? LINES.granny.night : h < 11 ? LINES.granny.morning : h < 17 ? LINES.granny.day : LINES.granny.evening);
    }
    if (who === 'shopgirl') return pick(h >= 21 || h < 7 ? LINES.shopgirl.night : LINES.shopgirl.day);
    if (who === 'vitya') return pick(LINES.vitya);
    return '…';
  }
  carAlarm(t) {
    const cx = (t.box[0] + t.box[2]) / 2, cy = (t.box[1] + t.box[3]) / 2, wdt = t.box[2] - t.box[0];
    this.player.faceTo(cx, cy);
    const blinks = [this.add.image(cx - wdt * 0.32, cy + 6, 'glow'), this.add.image(cx + wdt * 0.32, cy + 6, 'glow')];
    blinks.forEach(b => b.setBlendMode(Phaser.BlendModes.ADD).setTint(0xffa020).setScale(0.35).setDepth(4002).setAlpha(0));
    this.tweens.add({ targets: blinks, alpha: { from: 0.95, to: 0 }, duration: 260, repeat: 2, onComplete: () => blinks.forEach(b => b.destroy()) });
    AUD.chirp();
    this.bubbles.say(this.player, 'Пиу-пиу! ' + t.say(), true);
    this.scarePigeons(cx, cy, 160);
  }
  scarePigeons(x, y, r) { this.pigeons.forEach(p => { if (dist(x, y, p.x, p.y) < r) p.scare(x, y); }); }

  /* ---------- per-frame */
  update(time, delta) {
    const _t0 = performance.now();
    const raw = this.game.loop.rawDelta || delta;
    const dt = clamp(raw, 1, 100) / 1000;
    const sp = SPEEDS[S.speedIdx].k;
    S.min = (S.min + dt * BASE_RATE * sp) % 1440;
    S.total = (S.total || 0) + dt * BASE_RATE * sp;
    S.boost = 1 + (sp - 1) * 0.12;
    this.updateWind(dt);
    this.applyTime(false, dt);
    this.updatePlayerKeys(dt);
    this.director.update(dt);
    for (const a of this.actors) a.update(dt);
    this.actors = this.actors.filter(a => a.alive || a.isPlayer);
    for (const p of this.pigeons) p.update(dt);
    this.updateGrannies(dt);
    this.updateSwings(dt);
    this.updateLeash();
    this.updateLeaves(dt);
    this.updateRain(dt);
    this.updateSigns(dt);
    this.follow.x = lerp(this.follow.x, this.player.x, 1); this.follow.y = this.player.y - personH(this.player.y) * 0.45;
    if (this.markerT > 0) { this.markerT -= dt; this.marker.setAlpha(clamp(this.markerT, 0, 1)); if (this.markerT <= 0) this.marker.setVisible(false); }
    this.bubbles.update(dt);
    HUD.tick(dt);
    AUD.ambience(S.rain ? S.rainI : 0, S.wind + S.gust);
    const _el = performance.now() - _t0; this._perf = this._perf ? this._perf * 0.95 + _el * 0.05 : _el;
  }

  updateWind(dt) {
    S.windT += dt;
    const base = 6 + 4 * Math.sin(S.windT * 0.07) + 2.5 * Math.sin(S.windT * 0.23 + 1.3);
    S.gustT -= dt;
    if (S.gustT <= 0 && S.gustDur <= 0) { S.gustDur = rand(2.5, 5); S.gustPow = rand(12, 32) * (Math.random() < 0.15 ? -0.6 : 1); S.gustAge = 0; }
    if (S.gustDur > 0) {
      S.gustAge += dt; const t = S.gustAge / S.gustDur;
      S.gust = S.gustPow * Math.sin(Math.PI * clamp(t, 0, 1)) ** 0.7;
      if (S.gustAge >= S.gustDur) { S.gustDur = 0; S.gust = 0; S.gustT = rand(5, 16); }
    }
    S.wind = base + S.gust;
  }

  applyTime(force, dt = 0) {
    const tp = timeParams(S.min); S.params = tp;
    const rainDim = S.rain ? lerp(1, 0.9, S.rainI) : 1;
    const amb = [tp.tint[0] * rainDim, tp.tint[1] * rainDim, tp.tint[2] * (S.rain ? lerp(1, 0.96, S.rainI) : 1)];
    this.amb = amb; this.ambientInt = rgbInt(amb[0], amb[1], amb[2]);
    this.rainTint = rgbInt(0.55 + amb[0] * 0.35, 0.6 + amb[1] * 0.33, 0.68 + amb[2] * 0.3);
    this.bgEve.setTint(this.ambientInt); this.bgDay.setTint(this.ambientInt).setAlpha(tp.dayMix);
    this.neonShav.setTint(this.ambientInt);
    const night = tp.night, m = S.min, k = force ? 1 : clamp(dt * 1.6, 0, 1);
    // windows
    for (const w of this.wins) {
      const s = w.sched; let on = false;
      if (night > 0.25) {
        if (m >= s.on || m < 360) on = s.owl ? true : !(inWindow(m, s.off, 360));
        if (s.early && inWindow(m, s.mOn, s.mOff)) on = true;
      }
      if (night <= 0.25 && s.early && inWindow(m, s.mOn, s.mOff) && night > 0.05) on = true;
      w.cur = lerp(w.cur, on ? 1 : 0, k);
      let a = w.cur * clamp(0.35 + night, 0, 1);
      if (s.tv && night > 0.6 && m > 1200) { if (Math.random() < 0.12) w.tvT = rand(0.6, 1); w.setTint(w.tvT > 0.85 ? 0xb8ccff : 0x90a8ff); a *= w.tvT || 0.8; }
      else w.setTint(s.warmth);
      w.setAlpha(a); w.glow.setAlpha(a * w.glow.base * night);
    }
    const lampOn = night > 0.35 ? 1 : 0;
    const L = this.lightState;
    L.entry_l = lerp(L.entry_l, lampOn * this.flick.entry, k * 2); L.entry_r = lerp(L.entry_r, lampOn, k);
    L.shop = 0.5 + 0.5 * night; L.sign = lerp(L.sign, night > 0.2 ? this.flick.buzz : 0, k * 2);
    L.lamp = lerp(L.lamp, lampOn * this.flick.lamp, k * 3); L.neon = lerp(L.neon, night > 0.3 ? 1 : 0.0, k);
    if (this.entry_l) this.entry_l.setAlpha(L.entry_l);
    if (this.entry_r) this.entry_r.setAlpha(L.entry_r);
    if (this.shop) this.shop.setAlpha(L.shop);
    if (this.shop_refl) this.shop_refl.setAlpha(night * (S.rain ? 1 : 0.85));
    if (this.signBox) this.signBox.setAlpha(L.sign);
    const G = this.lampGlows;
    G.entry_l.setAlpha(L.entry_l * G.entry_l.base); G.entry_r.setAlpha(L.entry_r * G.entry_r.base);
    G.shopDoor.setAlpha(night * G.shopDoor.base); G.shopWin.setAlpha(night * G.shopWin.base);
    G.sign.setAlpha(L.sign * G.sign.base); G.lamp.setAlpha(L.lamp * G.lamp.base);
  }

  /* lighting for moving things: ambient + nearby lamps */
  lightAt(x, y) {
    const a = this.amb, n = S.params.night, L = this.lightState;
    let r = a[0], g = a[1], b = a[2];
    if (n > 0.05) for (const pl of this.pointLights) {
      const d = dist(x, y, pl.x, pl.y); if (d > pl.r) continue;
      const f = (1 - d / pl.r) ** 2 * pl.i * n * (L[pl.k] != null ? L[pl.k] : 1);
      r += pl.c[0] * f; g += pl.c[1] * f; b += pl.c[2] * f;
    }
    return rgbInt(r, g, b);
  }

  updatePlayerKeys(dt) {
    const K = this.keys; if (!K) return;
    let vx = (K.D.isDown || K.RIGHT.isDown ? 1 : 0) - (K.A.isDown || K.LEFT.isDown ? 1 : 0);
    let vy = (K.S.isDown || K.DOWN.isDown ? 1 : 0) - (K.W.isDown || K.UP.isDown ? 1 : 0);
    const p = this.player;
    if (!vx && !vy) { p.keyMove = false; return; }
    HUD.firstMove();
    p.path = null; p.keyMove = true;
    const l = Math.hypot(vx, vy); vx /= l; vy /= l;
    const sp = personH(p.y) * 0.85 * p.speedMul * dt;
    const nx = p.x + vx * sp, ny = p.y + vy * sp;
    if (walkable(nx, ny)) { p.x = nx; p.y = ny; } else if (walkable(nx, p.y)) p.x = nx; else if (walkable(p.x, ny)) p.y = ny;
    p.vx = vx; p.vy = vy; p.phase += sp / (personH(p.y) * 0.9);
  }

  updateGrannies(dt) {
    this.grannyT = (this.grannyT || 0) - dt;
    const p = this.player, d = dist(p.x, p.y, 1110, 640);
    if (d < 150 && this.grannyT <= 0 && !this.bubbles.busyNear(1108, 556)) {
      this.grannyT = rand(9, 16);
      if (Math.random() < 0.75) this.bubbles.say({ x: 1108, y: 556, world: true }, pick(LINES.granny.passing));
    }
    // shop girl smokes in short sessions
    this.smokeT -= dt;
    if (this.smokeT <= 0) { if (this.smoke.emitting) { this.smoke.stop(); this.smokeT = rand(5, 12); } else { this.smoke.start(); this.smokeT = rand(2.5, 4); } }
  }

  updateSwings(dt) {
    const g = this.swingG; g.clear();
    const wind = S.wind + S.gust;
    for (const s of this.swing) {
      const drive = clamp(wind / 30, -1, 1) * 0.9 + Math.sin(S.windT * 1.7 + s.col) * 0.15;
      s.v += (-9.5 * Math.sin(s.a) + drive * 1.4 - s.v * 0.35) * dt; s.a += s.v * dt;
      if (Math.abs(s.v) < 0.02 && Math.abs(s.a) > 0.15 && S.sound && Math.random() < 0.02 && this.near(965, 560, 400)) AUD.creak(0.8);
      const L = 72, sa = Math.sin(s.a), ca = Math.cos(s.a);
      const dy = L * (sa * 0.32 - (1 - ca) * 0.85), sc = 1 + sa * 0.06;
      const seat = s.rest.map(r => [r[0], r[1] + dy]);
      const am = this.amb, cc = Phaser.Display.Color.IntegerToRGB(s.col);
      const tint = c => rgbInt(c.r / 255 * am[0], c.g / 255 * am[1], c.b / 255 * am[2]);
      g.lineStyle(1, rgbInt(0.17 * am[0], 0.15 * am[1], 0.15 * am[2]), 0.9);
      s.hooks.forEach((h, i) => g.lineBetween(h[0], h[1], seat[i][0], seat[i][1]));
      g.fillStyle(tint(cc), 1);
      const x0 = seat[0][0] - 4 * sc, x1 = seat[1][0] + 4 * sc, y0 = seat[0][1] - 2, y1 = seat[1][1] + 1;
      g.fillPoints([{ x: x0, y: y0 }, { x: x1, y: y1 - 3 }, { x: x1, y: y1 + 2 }, { x: x0, y: y0 + 5 }], true);
      g.fillStyle(rgbInt(0.1 * am[0], 0.09 * am[1], 0.1 * am[2]), 0.85);
      g.fillPoints([{ x: x0, y: y0 + 4 }, { x: x1, y: y1 + 1 }, { x: x1, y: y1 + 2.5 }, { x: x0, y: y0 + 5.5 }], true);
    }
  }
  near(x, y, r) { const v = this.cameras.main.worldView; return x > v.x - r && x < v.right + r && y > v.y - r && y < v.bottom + r; }

  updateLeash() {
    const g = this.leash; g.clear();
    for (const a of this.actors) {
      if (!a.dog || !a.alive || !a.dog.alive) continue;
      const h = a.handPos(), d = a.dog.collarPos();
      g.lineStyle(1.2, rgbInt(0.12, 0.1, 0.1), 0.85);
      const mx = (h.x + d.x) / 2, my = Math.max(h.y, d.y) + 6;
      const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(h.x, h.y), new Phaser.Math.Vector2(mx, my), new Phaser.Math.Vector2(d.x, d.y));
      curve.draw(g, 10);
      g.setDepth(Math.max(a.sprite.depth, a.dog.sprite.depth) + 0.2);
    }
  }

  updateLeaves(dt) {
    const v = this.cameras.main.worldView, wind = S.wind;
    const rate = (0.9 + Math.abs(wind) * 0.12) * dt * 6;
    this.leafAcc = (this.leafAcc || 0) + rate;
    while (this.leafAcc > 1) {
      this.leafAcc -= 1;
      const c = pick(this.CANOPIES);
      if (Math.random() > c[4] / 1.8) continue;
      const x = rand(c[0], c[2]), y = rand(c[1], c[3]);
      if (x < v.x - 80 || x > v.right + 80 || y < v.y - 120 || y > v.bottom) continue;
      this.spawnLeaf(x, y, rand(50, 180), 0);
    }
    if (Math.abs(S.gust) > 14 && Math.random() < dt * 5) {
      const x = rand(v.x, v.right), y = rand(v.y + v.height * 0.3, v.bottom);
      if (walkable(x, y)) this.spawnLeaf(x, y, 0, 1);
    }
    const am = this.ambientInt;
    for (const L of this.leaves) {
      if (!L.state) continue;
      const im = L.im; L.t += dt;
      if (L.state === 1) {             // falling
        L.vx = wind * 1.6 + Math.sin(L.t * L.f + L.ph) * 16;
        L.x += L.vx * dt; L.y += L.vy * dt;
        im.setScale(L.sc * Math.cos(L.t * L.spin), L.sc).setRotation(Math.sin(L.t * 2.1 + L.ph) * 0.7);
        if (L.y >= L.gy) { L.state = 2; L.t = 0; L.life = rand(5, 10); im.setDepth(57).setScale(L.sc, L.sc * 0.8).setRotation(L.ph); }
        else im.setDepth(2500);
      } else if (L.state === 2) {      // resting on the ground
        if (Math.abs(S.gust) > 18 && Math.random() < dt * 0.6) { L.state = 3; L.t = 0; L.vx = S.gust * rand(1.5, 2.4); L.hop = rand(4, 10); }
        if (L.t > L.life) { L.state = 0; im.setVisible(false); continue; }
        im.setAlpha(clamp((L.life - L.t) / 1.5, 0, 1));
      } else if (L.state === 3) {      // skittering
        L.x += L.vx * dt; L.vx *= (1 - dt * 0.9);
        const hopY = -Math.abs(Math.sin(L.t * 7)) * L.hop * Math.max(0, 1 - L.t / 1.6);
        im.setPosition(L.x, L.y + hopY).setRotation(L.t * 8);
        if (L.t > 1.8) { L.state = 2; L.t = 0; L.life = rand(4, 8); }
        im.setTint(am); continue;
      }
      im.setPosition(L.x, L.y).setTint(am);
    }
  }
  spawnLeaf(x, y, fall, mode) {
    const L = this.leaves.find(l => !l.state); if (!L) return;
    L.state = mode ? 3 : 1; L.x = x; L.y = y; L.gy = y + fall; L.vy = rand(18, 32); L.t = 0; L.f = rand(1.5, 3); L.ph = rand(0, 6.28);
    L.spin = rand(3, 7); L.sc = scaleAt(y + fall) * rand(0.9, 1.4); L.vx = mode ? S.wind * 2 : 0; L.hop = rand(3, 8);
    L.im.setVisible(true).setAlpha(1).setScale(L.sc).setPosition(x, y).setDepth(mode ? 57 : 2500);
  }
  kickLeaves(x, y) { if (Math.random() < 0.08) { const L = this.leaves.find(l => !l.state); if (L) { this.spawnLeaf(x + rand(-8, 8), y - 2, 0, 1); } } }

  updateRain(dt) {
    S.rainI = lerp(S.rainI, S.rain ? 1 : 0, clamp(dt * 0.8, 0, 1));
    const on = S.rainI > 0.05;
    if (on && !this.rainEm.emitting) this.rainEm.start(); else if (!on && this.rainEm.emitting) this.rainEm.stop();
    const v = this.cameras.main.worldView;
    this.rainEm.setQuantity(Math.max(1, Math.round(S.rainI * (v.width * v.height) / 42000)));
    this.rainEm.setAlpha(clamp(0.4 + this.amb[0] * 0.6, 0, 1));
    // ripples
    for (const r of this.ripples) {
      if (r.visible) { r.t += dt; const k = r.t / r.life; r.setScale(r.s * (0.25 + k), r.s * (0.25 + k) * 0.9).setAlpha((1 - k) * 0.5 * r.a); if (k >= 1) r.setVisible(false); }
      else if (on && Math.random() < S.rainI * dt * 9) {
        const x = rand(v.x, v.right), y = rand(v.y, v.bottom);
        if (walkable(x, y) && !onSand(x, y)) { r.t = 0; r.life = rand(0.35, 0.6); r.s = scaleAt(y) * 0.5; r.a = clamp(0.5 + this.amb[2] * 0.5, 0, 1); r.setPosition(x, y).setVisible(true).setTint(this.rainTint); }
      }
    }
  }

  updateSigns(dt) {
    const F = this.flick; F.t += dt;
    if (Math.random() < dt * 0.5) F.y = F.y ? 0 : (Math.random() < 0.6 ? 1 : 0);
    const yOff = F.y && Math.random() < 0.5;
    if (Math.random() < dt * 0.06) F.buzzT = rand(0.2, 0.6);
    F.buzzT = (F.buzzT || 0) - dt; F.buzz = F.buzzT > 0 ? (Math.random() < 0.5 ? 0.3 : 1) : 1;
    if (Math.random() < dt * 0.08) F.lampT = rand(0.4, 1.4);
    F.lampT = (F.lampT || 0) - dt; F.lamp = F.lampT > 0 ? (Math.random() < 0.45 ? 0.1 : 1) : 1;
    if (Math.random() < dt * 0.03) F.entryT = rand(0.3, 0.9);
    F.entryT = (F.entryT || 0) - dt; F.entry = F.entryT > 0 ? (Math.random() < 0.4 ? 0.2 : 1) : 1;
    const sA = this.lightState.sign;
    this.letters.forEach((l, i) => l && l.setAlpha(sA * (i === 7 && yOff ? 0.05 : 1)));
    // neon: hue cycling
    this.neonHue = (this.neonHue + dt * 0.08) % 1;
    const n = this.lightState.neon;
    const flick = Math.random() < 0.015 ? 0.2 : 1;
    const c1 = Phaser.Display.Color.HSVToRGB(0.93 + Math.sin(F.t * 0.4) * 0.07, 0.75, 1).color;
    const c2 = Phaser.Display.Color.HSVToRGB(this.neonHue, 0.7, 1).color;
    this.neonShavGlow.setTint(c1).setAlpha(n * flick * 0.95);
    this.neonShav.setAlpha(0.35 + (1 - n) * 0.25);
    this.lampGlows.neon.setTint(c1).setAlpha(n * flick * this.lampGlows.neon.base);
    this.neon24.setTint(c2).setBlendMode(n > 0.5 ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL).setAlpha(0.35 + n * 0.65);
    this.lampGlows.neon24.setTint(c2).setAlpha(n * this.lampGlows.neon24.base);
    this.pointLights[5].c = [(c1 >> 16 & 255) / 255, (c1 >> 8 & 255) / 255, (c1 & 255) / 255];
  }
}

/* ----------------------------------------------------------------- walking people */
class Actor {
  constructor(scene, o) {
    this.scene = scene; this.key = o.key; this.sheet = o.sheet; this.x = o.x; this.y = o.y;
    this.speedMul = o.speed || 1; this.role = o.role; this.name = o.name;
    this.sprite = scene.add.sprite(this.x, this.y, o.key, 'front0').setOrigin(0.5, this.sheet.foot / this.sheet.fh);
    this.shadow = scene.add.image(this.x, this.y, 'shadow').setDepth(55);
    this.refl = scene.add.sprite(this.x, this.y, o.key, 'front0').setOrigin(0.5, this.sheet.foot / this.sheet.fh).setFlipY(true).setDepth(56);
    this.view = 'front'; this.flip = false; this.phase = 0; this.idleClock = rand(0, 3); this.path = null; this.pi = 0;
    this.vx = 0; this.vy = 1; this.moving = false; this.alive = true; this.alpha = o.alpha != null ? o.alpha : 1; this.fadeTo = null;
    this.holdT = 0; this.stepAcc = 0; this.umb = null; this.bag = null;
  }
  goTo(x, y, cb) {
    const p = findPath(this.x, this.y, x, y);
    if (!p) { cb && cb(false); return false; }
    this.path = p; this.pi = 1; this.onArrive = cb; return true;
  }
  hold(t) { this.holdT = Math.max(this.holdT, t); }
  faceTo(x, y) { const dx = x - this.x, dy = y - this.y; if (Math.abs(dx) > Math.abs(dy) * 0.75) { this.view = 'side'; this.flip = dx < 0; } else { this.view = dy > 0 ? 'front' : 'back'; this.flip = false; } this.faced = 1.5; }
  setUmbrella(on) {
    if (on && !this.umb) this.umb = this.scene.add.image(this.x, this.y, 'umb' + ((Math.random() * UMB_COLORS.length) | 0)).setOrigin(0.5, 0.94);
    if (!on && this.umb) { this.umb.destroy(); this.umb = null; }
  }
  setBag(kind) { if (this.bag) this.bag.destroy(); this.bag = kind ? this.scene.add.image(this.x, this.y, 'bag_' + kind).setOrigin(0.5, 0.05) : null; }
  frameName() {
    const f = this.moving ? (Math.floor(this.phase * this.sheet.walk) % this.sheet.walk) : this.sheet.walk + (Math.floor(this.idleClock / 1.2) % this.sheet.idle);
    return { name: this.view + f, f };
  }
  anchor(which) {
    const { name } = this.frameName(); const a = this.sheet.anchors && this.sheet.anchors[name]; if (!a || !a[which]) return null;
    const sc = scaleAt(this.y), lx = (a[which].x - this.sheet.fw / 2) * sc * (this.flip ? -1 : 1), ly = (a[which].y - this.sheet.foot) * sc;
    return { x: this.x + lx, y: this.y + ly };
  }
  handPos() { return this.anchor('hand') || { x: this.x, y: this.y - 30 }; }
  update(dt) {
    if (!this.alive) return;
    const sc0 = scaleAt(this.y);
    this.idleClock += dt;
    if (this.holdT > 0) this.holdT -= dt;
    let moving = false;
    if (this.path && this.holdT <= 0) {
      const tgt = this.path[this.pi], dx = tgt.x - this.x, dy = tgt.y - this.y, d = Math.hypot(dx, dy);
      const step = personH(this.y) * 0.85 * this.speedMul * dt * (this.isPlayer ? 1 : (S.boost || 1));
      if (d <= step) {
        this.x = tgt.x; this.y = tgt.y; this.pi++;
        if (this.pi >= this.path.length) { this.path = null; const cb = this.onArrive; this.onArrive = null; if (cb) cb(true); }
      } else { this.x += dx / d * step; this.y += dy / d * step; }
      if (d > 0.01) { this.vx = dx; this.vy = dy; }
      this.phase += step / (personH(this.y) * 0.9 * (this.stride || 1));
      moving = true;
    }
    if (this.keyMove) moving = true;
    if (moving && this.scene.kickLeaves) {
      this.stepAcc += 1;
      const stepPhase = Math.floor(this.phase * 2);
      if (stepPhase !== this.lastStep) { this.lastStep = stepPhase; if (this.isPlayer && S.sound) AUD.step(!onSand(this.x, this.y) && S.rainI > 0.2, 1); this.scene.kickLeaves(this.x, this.y); }
    }
    this.moving = moving;
    this.faced = (this.faced || 0) - dt;
    if (moving && this.faced <= 0) {
      const ax = Math.abs(this.vx), ay = Math.abs(this.vy);
      if (ax > ay * 0.75) { this.view = 'side'; this.flip = this.vx < 0; } else { this.view = this.vy > 0 ? 'front' : 'back'; this.flip = false; }
    }
    if (this.fadeTo != null) { this.alpha = lerp(this.alpha, this.fadeTo, clamp(dt * 3.5, 0, 1)); if (Math.abs(this.alpha - this.fadeTo) < 0.02) { this.alpha = this.fadeTo; const cb = this.onFade; this.fadeTo = null; this.onFade = null; if (cb) cb(); } }
    if (this.isPlayer) {
      const hood = S.rainI > 0.5 ? 'glebHood' : 'gleb';
      if (this.key !== hood) { this.key = hood; this.sprite.setTexture(hood); this.refl.setTexture(hood); }
    }
    this.render();
  }
  render() {
    const sc = scaleAt(this.y), { name } = this.frameName();
    const tint = this.scene.lightAt(this.x, this.y - 20);
    this.sprite.setFrame(name).setPosition(this.x, this.y).setScale(sc * (this.flip ? -1 : 1), sc).setDepth(100 + this.y).setTint(tint).setAlpha(this.alpha);
    const sh = personH(this.y) / 47;
    this.shadow.setPosition(this.x, this.y + 1).setScale(sh * 0.62 * (this.sheet.h / 46), sh * 0.6).setAlpha(0.42 * this.alpha);
    const wet = !onSand(this.x, this.y);
    this.refl.setVisible(wet).setFrame(name).setPosition(this.x, this.y + 1).setScale(sc * (this.flip ? -1 : 1), sc * 0.9).setTint(tint).setAlpha(0.22 * this.alpha);
    if (this.umb) {
      const a = this.anchor('headTop') || { x: this.x, y: this.y - personH(this.y) };
      const tilt = clamp((S.wind) * 0.008, -0.35, 0.35) + Math.sin(this.idleClock * 3) * 0.02;
      this.umb.setPosition(a.x, a.y - 2 * sc).setScale(sc * 0.95).setRotation(tilt).setDepth(100 + this.y + 0.4).setTint(tint).setAlpha(this.alpha);
    }
    if (this.bag) {
      const a = this.anchor(this.view === 'side' ? 'hand' : 'hand') || { x: this.x, y: this.y - 30 };
      this.bag.setPosition(a.x, a.y).setScale(sc * 0.95).setDepth(100 + this.y + (this.view === 'back' ? -0.3 : 0.3)).setTint(tint).setAlpha(this.alpha);
    }
  }
  destroy() {
    this.alive = false;
    [this.sprite, this.shadow, this.refl, this.umb, this.bag, this.extra].forEach(o => o && o.destroy());
    if (this.dog) this.dog.destroy();
  }
}

class Dog extends Actor {
  constructor(scene, owner) {
    super(scene, { key: 'dog', sheet: scene.sheets.dog, x: owner.x + 20, y: owner.y + 6, speed: 1.4, role: 'dog' });
    this.owner = owner; this.sniffT = 0; this.wag = 0; this.target = null; this.retarget = 0;
  }
  collarPos() { const sc = scaleAt(this.y) * 0.95; const side = this.view === 'side'; return { x: this.x + (side ? (this.flip ? -1 : 1) * 5 * sc : 0), y: this.y - (side ? 8 : 9) * sc }; }
  update(dt) {
    if (!this.alive) return;
    const o = this.owner; this.idleClock += dt; this.retarget -= dt; this.wag -= dt;
    if (this.fadeTo != null) { this.alpha = lerp(this.alpha, this.fadeTo, clamp(dt * 3.5, 0, 1)); if (Math.abs(this.alpha - this.fadeTo) < 0.02) { this.alpha = this.fadeTo; this.fadeTo = null; } }
    if (!o.alive) { this.destroy(); return; }
    // stay within the leash, sniff around, chase pigeons a little
    const leash = personH(o.y) * 0.9;
    if (this.retarget <= 0 || !this.target) {
      this.retarget = rand(1.2, 3);
      const ang = rand(0, Math.PI * 2), r = rand(0.3, 0.85) * leash;
      const fwd = o.moving ? { x: Math.sign(o.vx || 0.001) * leash * 0.5, y: Math.sign(o.vy || 0) * leash * 0.2 } : { x: 0, y: 0 };
      const t = { x: o.x + fwd.x + Math.cos(ang) * r, y: o.y + fwd.y + Math.sin(ang) * r * 0.5 };
      this.target = walkable(t.x, t.y) ? t : { x: o.x + 10, y: o.y + 4 };
      const pg = this.scene.pigeons.find(p => !p.flying && !p.perch && dist(p.x, p.y, this.x, this.y) < 110);
      if (pg && Math.random() < 0.6) { this.target = { x: pg.x, y: pg.y }; AUD.bark(this.scene.near(this.x, this.y, 0) ? 0.5 : 0); }
    }
    let tx = this.target.x, ty = this.target.y;
    const dO = dist(this.x, this.y, o.x, o.y); if (dO > leash) { tx = o.x; ty = o.y; }
    const dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy);
    const sp = personH(this.y) * (dO > leash ? 1.25 : 0.7) * dt * (S.boost || 1);
    let moving = false;
    if (d > 4) { const nx = this.x + dx / d * Math.min(sp, d), ny = this.y + dy / d * Math.min(sp, d); if (walkable(nx, ny)) { this.x = nx; this.y = ny; } else if (dO > leash) { this.x = nx; this.y = ny; } this.vx = dx; this.vy = dy; moving = true; this.phase += Math.min(sp, d) / (personH(this.y) * 0.35); }
    this.moving = moving;
    if (moving) { const ax = Math.abs(this.vx), ay = Math.abs(this.vy); if (ax > ay * 0.6) { this.view = 'side'; this.flip = this.vx < 0; } else { this.view = this.vy > 0 ? 'front' : 'back'; } }
    const sc = scaleAt(this.y) * 0.95;
    const f = moving ? (Math.floor(this.phase * 6) % 6) : 6 + (this.wag > 0 ? Math.floor(this.idleClock * 8) % 2 : Math.floor(this.idleClock / 1.5) % 2);
    const tint = this.scene.lightAt(this.x, this.y);
    this.sprite.setFrame(this.view + f).setPosition(this.x, this.y).setScale(sc * (this.flip ? -1 : 1), sc).setDepth(100 + this.y).setTint(tint).setAlpha(this.alpha);
    this.shadow.setPosition(this.x, this.y + 1).setScale(sc * 0.55, sc * 0.4).setAlpha(0.4 * this.alpha);
    this.refl.setVisible(!onSand(this.x, this.y)).setFrame(this.view + f).setPosition(this.x, this.y + 1).setScale(sc * (this.flip ? -1 : 1), sc * 0.9).setTint(tint).setAlpha(0.15 * this.alpha);
    if (this.scene.pigeons) this.scene.pigeons.forEach(p => { if (!p.flying && !p.perch && dist(p.x, p.y, this.x, this.y) < 60) p.scare(this.x, this.y); });
  }
}

/* ----------------------------------------------------------------- pigeons */
class Pigeon {
  constructor(scene, x, y, v) {
    this.scene = scene; this.x = x; this.y = y; this.v = v;
    this.sprite = scene.add.sprite(x, y, 'pigeon' + v, 'idle').setOrigin(0.5, 0.86);
    this.shadow = scene.add.image(x, y, 'shadow').setDepth(55).setAlpha(0.35);
    this.state = 'ground'; this.t = rand(0, 2); this.flip = Math.random() < 0.5; this.anim = 'idle'; this.act = 0;
    this.flying = false; this.perch = null; this.sleeping = false;
  }
  scare(fx, fy) {
    if (this.flying || this.state === 'takeoff') return;
    if (this.perch && dist(fx, fy, this.x, this.y) > 50) return;
    this.state = 'takeoff'; this.t = rand(0, 0.25); this.from = { x: fx, y: fy };
  }
  chooseLanding(away) {
    const night = S.params.night > 0.85 && (S.min > 1200 || S.min < 390);
    if (night || Math.random() < 0.35) {
      const pool = night ? [PERCHES[0]] : PERCHES; const pr = pick(pool); const pt = pick(pr.pts);
      return { x: pt[0] + rand(-4, 4), y: pt[1] + rand(-2, 2), perch: pr };
    }
    for (let i = 0; i < 20; i++) {
      const p = randomWalkableIn(pick(GROUND_PIGEON_POLYS));
      if (p && (!away || dist(p.x, p.y, away.x, away.y) > 170)) return { x: p.x, y: p.y, perch: null };
    }
    return { x: 1000, y: 690, perch: null };
  }
  fly(to) {
    this.flying = true; this.state = 'fly'; this.perch = null;
    this.f0 = { x: this.x, y: this.y }; this.f1 = to; this.ft = 0;
    const d = dist(this.x, this.y, to.x, to.y); this.fdur = clamp(d / 230, 0.6, 3.2);
    this.ctrl = { x: (this.x + to.x) / 2 + rand(-60, 60), y: Math.min(this.y, to.y) - rand(80, 170) };
    this.flip = to.x < this.x;
  }
  update(dt) {
    const sc = scaleAt(this.y) * 0.84; this.t -= dt;
    const pl = this.scene.player, night = S.params.night > 0.85 && (S.min > 1200 || S.min < 390);
    if (this.state === 'ground') {
      // threats
      for (const a of this.scene.actors) {
        if (!a.alive) continue;
        const r = a.isPlayer ? 78 : a.role === 'kid' ? 110 : 44;
        if (dist(a.x, a.y, this.x, this.y) < r * (a.moving ? 1 : 0.7)) { this.scare(a.x, a.y); break; }
      }
      if (night && Math.random() < dt * 0.4) { this.state = 'takeoff'; this.t = 0; this.from = null; }
      if (this.state === 'ground' && this.t <= 0) {
        const r = Math.random();
        if (r < 0.4) { this.anim = 'peck'; this.t = rand(0.25, 0.6); }
        else if (r < 0.8) { this.walkTo = { x: this.x + rand(-26, 26), y: this.y + rand(-12, 12) }; if (!walkable(this.walkTo.x, this.walkTo.y)) this.walkTo = null; this.t = rand(0.6, 1.4); }
        else { this.anim = 'idle'; this.t = rand(0.6, 2); if (Math.random() < 0.3 && S.sound && this.scene.near(this.x, this.y, -40)) AUD.coo(0.5); }
      }
      if (this.walkTo) {
        const dx = this.walkTo.x - this.x, dy = this.walkTo.y - this.y, d = Math.hypot(dx, dy);
        if (d < 1 || this.t <= 0) this.walkTo = null;
        else { const sp = 14 * sc * dt; this.x += dx / d * Math.min(sp, d); this.y += dy / d * Math.min(sp, d); this.flip = dx < 0; this.anim = Math.floor(this.scene.time.now / 140) % 2 ? 'walk1' : 'walk2'; }
      } else if (this.anim.startsWith('walk')) this.anim = 'idle';
    } else if (this.state === 'takeoff') {
      if (this.t <= 0) {
        this.fly(this.chooseLanding(this.from));
        if (S.sound && this.scene.near(this.x, this.y, 0)) AUD.flutter(0.9);
        this.scene.pigeons.forEach(p => { if (p !== this && p.state === 'ground' && dist(p.x, p.y, this.x, this.y) < 70) { p.state = 'takeoff'; p.t = rand(0.05, 0.4); p.from = this.from; } });
      }
    } else if (this.state === 'fly') {
      this.ft += dt / this.fdur; const t = clamp(this.ft, 0, 1);
      const it = 1 - t;
      this.x = it * it * this.f0.x + 2 * it * t * this.ctrl.x + t * t * this.f1.x;
      this.y = it * it * this.f0.y + 2 * it * t * this.ctrl.y + t * t * this.f1.y;
      this.gy = lerp(this.f0.y, this.f1.y, t);
      this.anim = t > 0.85 ? 'fly2' : ['fly1', 'fly2', 'fly3', 'fly2'][Math.floor(this.scene.time.now / 70) % 4];
      if (t >= 1) {
        this.flying = false; this.perch = this.f1.perch; this.state = this.perch ? 'perched' : 'ground'; this.t = rand(8, 26); this.anim = 'idle';
      }
    } else if (this.state === 'perched') {
      this.anim = night ? 'sleep' : (Math.floor(this.scene.time.now / 900 + this.v) % 5 === 0 ? 'peck' : 'idle');
      if (!night && this.t <= 0) { const dP = dist(pl.x, pl.y, 1000, 640); if (dP > 160 || Math.random() < 0.5) this.fly(this.chooseLanding(pl)); else this.t = rand(4, 10); }
      if (night) this.t = 5;
    }
    const s2 = scaleAt(this.flying ? this.gy : this.y) * 0.84;
    const depth = this.flying ? 2600 : this.perch ? this.perch.depth : 100 + this.y;
    const tint = this.scene.lightAt(this.x, this.y);
    this.sprite.setFrame(this.anim).setPosition(this.x, this.y).setScale(s2 * (this.flip ? -1 : 1), s2).setDepth(depth).setTint(tint);
    if (this.flying && !this.perch && !(this.f1 && this.f1.perch) && !(this.f0 && this.f0.perch)) this.shadow.setVisible(true).setPosition(this.x, this.gy).setScale(s2 * 0.3, s2 * 0.25).setAlpha(0.3);
    else if (!this.flying && !this.perch) this.shadow.setVisible(true).setPosition(this.x, this.y + 1).setScale(s2 * 0.32, s2 * 0.28).setAlpha(0.35);
    else this.shadow.setVisible(false);
  }
}

/* ----------------------------------------------------------------- who walks where and when */
class Director {
  constructor(scene) {
    this.scene = scene; this.npcs = {}; this.shopT = 3; this.lastMin = S.min; this.nightDone = false;
  }
  spawn(role, sheetKey, at, opts = {}) {
    const sc = this.scene;
    const a = new Actor(sc, { key: sheetKey, sheet: sc.sheets[sheetKey], x: at.x, y: at.y, speed: opts.speed || 1, role, alpha: 0 });
    a.fadeTo = 1; a.tasks = []; a.stride = opts.stride || 1;
    a.born = S.total || 0; a.maxLife = { mama: 230, dogman: 170, kid: 320, granny2: 190, night: 150, shopper: 100 }[role] || 150;
    if (S.rain && opts.umbrella !== false && Math.random() < 0.8) a.setUmbrella(true);
    sc.actors.push(a);
    return a;
  }
  run(a, tasks) { a.tasks = tasks; this.next(a); }
  next(a) {
    if (!a.alive) return;
    const t = a.tasks.shift(); if (!t) return;
    if (t.go) { const ok = a.goTo(t.go.x + (t.jx ? rand(-t.jx, t.jx) : 0), t.go.y + (t.jy ? rand(-t.jy, t.jy) : 0), () => this.next(a)); if (!ok) this.next(a); }
    else if (t.wait) { a.waitT = t.wait; }
    else if (t.fadeOut) { a.fadeTo = 0; a.onFade = () => this.next(a); }
    else if (t.fadeIn) { a.fadeTo = 1; a.onFade = () => this.next(a); }
    else if (t.fn) { t.fn(a); this.next(a); }
    else if (t.end) { a.destroy(); }
  }
  loopTasks(fromIdx, laps = 1) {
    const tasks = []; for (let l = 0; l < laps; l++) LOOP.forEach((k, i) => { if (l === 0 && i < fromIdx) return; tasks.push({ go: P[k], jx: 10, jy: 6 }); if (k === 'B2' && Math.random() < 0.5) tasks.push({ wait: rand(3, 7) }); });
    return tasks;
  }
  update(dt) {
    const sc = this.scene, m = S.min, N = this.npcs;
    for (const a of sc.actors) if (!a.isPlayer && a.alive && a.waitT > 0) { a.waitT -= dt; if (a.waitT <= 0) this.next(a); }
    // anyone who overstayed (usually at high time speed) slips away once nobody is looking
    for (const a of sc.actors) {
      if (a.isPlayer || !a.alive || a.role === 'dog' || a.leaving || a.born == null) continue;
      const age = (S.total || 0) - a.born;
      if (age > a.maxLife && (!sc.near(a.x, a.y - 40, -20) || age > a.maxLife * 2)) {
        a.leaving = true; a.tasks = []; a.path = null; a.fadeTo = 0; a.onFade = () => a.destroy();
        if (a.dog) a.dog.fadeTo = 0;
      } else if (age > a.maxLife && !a.hurrying) {
        a.hurrying = true; a.playUntil = 0; a.goingHome = true;
        const exits = ['doorLin', 'doorRin', 'exitN', 'exitE', 'exitS'].map(k => P[k]).sort((p, q) => dist(p.x, p.y, a.x, a.y) - dist(q.x, q.y, a.x, a.y));
        a.path = null; a.waitT = 0; this.run(a, [{ go: exits[0] }, { fadeOut: 1 }, { end: 1 }]);
      }
    }
    // mum with the pram: late morning and afternoon
    const mumTime = inWindow(m, 600, 750) || inWindow(m, 870, 1050);
    if (mumTime && !(N.mama && N.mama.alive)) {
      const a = N.mama = this.spawn('mama', 'mama', P.doorLin, { speed: 0.7, umbrella: true });
      a.pram = sc.add.sprite(a.x, a.y, 'pram', 'front0').setOrigin(0.5, 19 / 20); a.extra = a.pram;
      this.run(a, [{ go: P.doorL }, ...this.loopTasks(0, 3), { go: P.U2 }, { go: P.doorL }, { go: P.doorLin }, { fadeOut: 1 }, { end: 1 }]);
    }
    if (N.mama && N.mama.alive && !mumTime && N.mama.tasks.length > 4) N.mama.tasks = [{ go: P.doorL }, { go: P.doorLin }, { fadeOut: 1 }, { end: 1 }];
    // man with the dog: early morning and evening
    const dogTime = inWindow(m, 420, 510) || inWindow(m, 1140, 1290);
    if (dogTime && !(N.dogman && N.dogman.alive)) {
      const a = N.dogman = this.spawn('dogman', 'dogman', P.doorRin, { speed: 0.85 });
      a.dog = new Dog(sc, a); a.dog.alpha = 0; a.dog.fadeTo = 1; sc.actors.push(a.dog);
      this.run(a, [{ go: P.doorR }, { go: P.R2 }, { go: P.M1 }, { go: P.N1, jx: 20 }, { wait: rand(3, 6) }, { go: P.M2 }, { go: P.U1 }, { go: P.U2 }, { go: P.gap }, { go: P.L1 }, { go: P.L2 }, { go: P.S }, { go: P.B1 }, { go: P.B2 }, { go: P.corner }, { go: P.R1 }, { go: P.doorR }, { go: P.doorRin }, { fn: a => { if (a.dog) a.dog.fadeTo = 0; } }, { fadeOut: 1 }, { end: 1 }]);
    }
    // a kid on the playground in the afternoon
    const kidTime = inWindow(m, 720, 1000) && !(S.rain && S.rainI > 0.9 && Math.random() < 0.0);
    if (kidTime && !(N.kid && N.kid.alive)) {
      const a = N.kid = this.spawn('kid', 'kid', P.doorRin, { speed: 1.35, stride: 0.8, umbrella: false });
      a.kidMode = true;
      this.run(a, [{ go: P.doorR }, { go: P.R2 }, { go: P.R1 }, { go: P.corner }, { go: P.B2 }, { go: P.pad }, { fn: a => { a.playUntil = 1; } }]);
    }
    if (N.kid && N.kid.alive && N.kid.playUntil) this.kidPlay(N.kid, dt, kidTime);
    // granny goes shopping in the morning
    if (inWindow(m, 560, 690) && !(N.granny && N.granny.alive) && !this.grannyDoneDay) {
      this.grannyDoneDay = true;
      const a = N.granny = this.spawn('granny2', 'granny', P.doorLin, { speed: 0.55 });
      this.run(a, [{ go: P.doorL }, { go: P.U2 }, { go: P.M2 }, { go: P.M1 }, { go: P.R2 }, { go: P.shop }, { go: P.shopIn }, { fadeOut: 1 }, { wait: 6 }, { fn: a => a.setBag('avoska') }, { fadeIn: 1 }, { go: P.shop }, { go: P.R1 }, { go: P.corner }, { go: P.B2 }, { go: P.pad }, { wait: 9 }, { go: P.B1 }, { go: P.S }, { go: P.L2 }, { go: P.L1 }, { go: P.gap }, { go: P.U2 }, { go: P.doorL }, { go: P.doorLin }, { fadeOut: 1 }, { end: 1 }]);
    }
    if (m < 60) this.grannyDoneDay = false;
    // night walker with a glowing phone
    if (inWindow(m, 1390, 80) && !this.nightDone && !(N.night && N.night.alive)) {
      this.nightDone = true;
      const a = N.night = this.spawn('night', 'night', P.exitS, { speed: 0.8 });
      a.phone = sc.add.image(a.x, a.y, 'glow').setBlendMode(Phaser.BlendModes.ADD).setTint(0x7fb0ff).setDepth(4003); a.extra = a.phone;
      this.run(a, [{ go: P.S }, { go: P.B1 }, { go: P.B2 }, { go: P.corner }, { go: P.shop }, { go: P.shopIn }, { fadeOut: 1 }, { wait: 8 }, { fn: a => a.setBag('white') }, { fadeIn: 1 }, { go: P.R1 }, { go: P.R2 }, { go: P.doorR }, { go: P.doorRin }, { fadeOut: 1 }, { end: 1 }]);
    }
    if (inWindow(m, 300, 900)) this.nightDone = false;
    // shoppers all day long, more in the evening
    const h = m / 60;
    const rate = h < 6 ? 0.25 : h < 9 ? 2.2 : h < 12 ? 1.6 : h < 17 ? 1.4 : h < 21 ? 3 : 1;
    this.shopT -= dt * rate * SPEEDS[S.speedIdx].k * 0.35;
    const shoppers = sc.actors.filter(a => a.alive && a.role === 'shopper').length;
    if (this.shopT <= 0) { this.shopT = rand(6, 14); if (shoppers < 3) this.spawnShopper(); }
    // the night walker's phone
    if (N.night && N.night.alive && N.night.phone) { const a = N.night, hp = a.handPos(); a.phone.setPosition(hp.x, hp.y - 3 * scaleAt(a.y)).setScale(0.055 * scaleAt(a.y)).setAlpha(0.55 * a.alpha * S.params.night); }
    // the pram follows mum
    if (N.mama && N.mama.alive && N.mama.pram) this.updatePram(N.mama);
    // umbrellas follow the weather
    for (const a of sc.actors) if (!a.isPlayer && a.alive && a.role !== 'dog' && a.role !== 'kid') { if (S.rainI < 0.3 && a.umb) a.setUmbrella(false); if (S.rainI > 0.7 && !a.umb && a.wantUmb !== false && Math.random() < dt * 0.3) a.setUmbrella(true); }
  }
  spawnShopper() {
    const origins = ['doorLin', 'doorRin', 'exitN', 'exitE', 'exitS'];
    const o = pick(origins); let d = pick(origins); if (d === o) d = pick(origins);
    const key = 'shopper' + ((Math.random() * SHOPPERS.length) | 0);
    const a = this.spawn('shopper', key, P[o], { speed: rand(0.8, 1.05) });
    const via = (from) => from === 'doorLin' ? [{ go: P.doorL }, { go: P.U2 }, { go: P.M2 }, { go: P.M1 }] : from === 'exitS' ? [{ go: P.S }, { go: P.B1 }, { go: P.B2 }, { go: P.corner }] : from === 'exitN' ? [{ go: P.N1 }, { go: P.M1 }] : from === 'doorRin' ? [{ go: P.doorR }] : [];
    const back = (to) => to === 'doorLin' ? [{ go: P.R2 }, { go: P.M1 }, { go: P.M2 }, { go: P.U2 }, { go: P.doorL }, { go: P.doorLin }, { fadeOut: 1 }] :
      to === 'doorRin' ? [{ go: P.doorR }, { go: P.doorRin }, { fadeOut: 1 }] : to === 'exitS' ? [{ go: P.corner }, { go: P.B2 }, { go: P.B1 }, { go: P.S }, { go: P.exitS }, { fadeOut: 1 }] :
        to === 'exitN' ? [{ go: P.R2 }, { go: P.M1 }, { go: P.N1 }, { go: P.exitN }, { fadeOut: 1 }] : [{ go: P.exitE }, { fadeOut: 1 }];
    this.run(a, [...via(o), { go: P.shop, jx: 14, jy: 6 }, { go: P.shopIn }, { fadeOut: 1 }, { wait: rand(4, 12) },
      { fn: a => a.setBag(pick(['white', 'white', 'blue', 'avoska'])) }, { fadeIn: 1 }, { go: P.shop, jx: 10 }, ...back(d), { end: 1 }]);
  }
  kidPlay(a, dt, still) {
    if (!still && !a.goingHome) { a.goingHome = true; a.path = null; a.playUntil = 0; a.speedMul = 1; this.run(a, [{ go: P.pad }, { go: P.B2 }, { go: P.corner }, { go: P.R1 }, { go: P.R2 }, { go: P.doorR }, { go: P.doorRin }, { fadeOut: 1 }, { end: 1 }]); return; }
    if (a.path || a.holdT > 0) return;
    a.kidT = (a.kidT || 0) - dt; if (a.kidT > 0) return;
    const pg = this.scene.pigeons.filter(p => p.state === 'ground').sort((p, q) => dist(p.x, p.y, a.x, a.y) - dist(q.x, q.y, a.x, a.y))[0];
    if (pg && dist(pg.x, pg.y, a.x, a.y) < 260 && Math.random() < 0.65) { a.speedMul = 1.6; a.goTo(pg.x, pg.y); a.kidT = rand(0.5, 1.5); }
    else { a.speedMul = 1.1; const p = randomWalkableIn(SAND_POLY); a.goTo(p.x, p.y); a.kidT = rand(1.5, 4); }
  }
  updatePram(a) {
    const sc = scaleAt(a.y), H = personH(a.y);
    let ox = 0, oy = 0, view = a.view;
    if (view === 'side') ox = (a.flip ? -1 : 1) * H * 0.42; else if (view === 'front') oy = H * 0.14; else oy = -H * 0.12;
    const x = a.x + ox, y = a.y + oy;
    const f = a.moving ? Math.floor(a.phase * 4) % 2 : 0;
    a.pram.setFrame(view + f).setPosition(x, y).setScale(sc * 1.05 * (a.flip ? -1 : 1), sc * 1.05).setDepth(100 + y + (view === 'back' ? -1 : 0)).setTint(this.scene.lightAt(x, y)).setAlpha(a.alpha);
  }
}

/* ----------------------------------------------------------------- speech bubbles (DOM) */
class Bubbles {
  constructor(scene) { this.scene = scene; this.list = []; this.root = document.getElementById('bubbles'); }
  say(who, text, thought) {
    this.list.filter(b => b.who === who || (who.world && b.who.world && dist(b.who.x, b.who.y, who.x, who.y) < 30)).forEach(b => b.t = Math.min(b.t, 0.2));
    const el = document.createElement('div'); el.className = 'bubble' + (thought ? ' thought' : ''); el.textContent = text;
    this.root.appendChild(el);
    const b = { who, el, t: 2.6 + text.length * 0.045 };
    this.list.push(b); requestAnimationFrame(() => el.classList.add('in'));
    return b;
  }
  busyNear(x, y) { return this.list.some(b => b.who.world && dist(b.who.x, b.who.y, x, y) < 30); }
  update(dt) {
    const cam = this.scene.cameras.main, z = cam.zoom / DPR;
    for (const b of this.list) {
      b.t -= dt;
      let wx, wy;
      if (b.who.world) { wx = b.who.x; wy = b.who.y; }
      else { const a = b.who; if (!a.alive && !a.isPlayer) b.t = Math.min(b.t, 0); wx = a.x; wy = a.y - personH(a.y) * ((a.sheet ? a.sheet.h : 46) / 47) - 6; }
      const sx = (wx - cam.worldView.x) * z, sy = (wy - cam.worldView.y) * z;
      b.el.style.transform = `translate(${Math.round(sx)}px, ${Math.round(sy)}px) translate(-50%, -100%)`;
      if (b.t <= 0) { b.el.classList.remove('in'); b.el.classList.add('out'); b.dead = (b.dead || 0) + dt; }
    }
    this.list = this.list.filter(b => { if (b.dead > 0.35) { b.el.remove(); return false; } return true; });
  }
}

/* ----------------------------------------------------------------- HUD (DOM) */
const HUD = {
  bind(scene) {
    this.scene = scene;
    this.clock = document.getElementById('clock'); this.phase = document.getElementById('phase');
    this.slider = document.getElementById('time'); this.speedBtn = document.getElementById('speed');
    this.rainBtn = document.getElementById('rain'); this.soundBtn = document.getElementById('sound');
    this.slider.addEventListener('input', () => { S.min = +this.slider.value; this.scrubbing = true; });
    this.slider.addEventListener('change', () => { this.scrubbing = false; });
    this.speedBtn.addEventListener('click', () => { S.speedIdx = (S.speedIdx + 1) % SPEEDS.length; this.refresh(); });
    this.rainBtn.addEventListener('click', () => { S.rain = !S.rain; this.refresh(); });
    this.soundBtn.addEventListener('click', () => { S.sound = !S.sound; AUD.setOn(S.sound); this.refresh(); });
    document.getElementById('zin').addEventListener('click', () => scene.zoomBy(1.18));
    document.getElementById('zout').addEventListener('click', () => scene.zoomBy(1 / 1.18));
    ['hud', 'zoom'].forEach(id => { const el = document.getElementById(id); ['pointerdown', 'pointerup', 'touchstart', 'mousedown', 'wheel'].forEach(ev => el.addEventListener(ev, e => e.stopPropagation(), { passive: true })); });
    this.refresh(); this.tick(1);
  },
  refresh() {
    this.speedBtn.querySelector('b').textContent = SPEEDS[S.speedIdx].label;
    this.speedBtn.setAttribute('aria-label', 'Скорость времени ' + SPEEDS[S.speedIdx].label);
    this.rainBtn.classList.toggle('on', S.rain); this.rainBtn.querySelector('b').textContent = S.rain ? 'дождь' : 'сухо';
    this.soundBtn.classList.toggle('on', S.sound); this.soundBtn.querySelector('b').textContent = S.sound ? 'звук' : 'тихо';
  },
  tick(dt) {
    this.acc = (this.acc || 0) + dt; if (this.acc < 0.2) return; this.acc = 0;
    this.clock.textContent = fmtTime(S.min); this.phase.textContent = phaseName(S.min);
    if (!this.scrubbing) this.slider.value = Math.floor(S.min);
  },
  firstMove() { if (S.firstMove) return; S.firstMove = true; const h = document.getElementById('hint'); if (h) h.classList.add('gone'); },
};

/* ----------------------------------------------------------------- boot */
function start() {
  const size = () => ({ w: Math.max(320, window.innerWidth), h: Math.max(320, window.innerHeight) });
  const s0 = size();
  const game = new Phaser.Game({
    type: Phaser.WEBGL, parent: 'game', backgroundColor: '#0e0c0d', pixelArt: true,
    scale: { mode: Phaser.Scale.NONE, width: Math.round(s0.w * DPR), height: Math.round(s0.h * DPR), zoom: 1 / DPR },
    input: { activePointers: 3 }, scene: [Yard], banner: false, audio: { noAudio: true },
  });
  const onResize = () => { const s = size(); game.scale.resize(Math.round(s.w * DPR), Math.round(s.h * DPR)); game.scale.setZoom(1 / DPR); };
  window.addEventListener('resize', onResize);
  game.events.once('ready', () => { game.scale.setZoom(1 / DPR); });
  window.__game = game;
  window.__dbg = { findPath, NAV, S, nearestWalkable, walkable, GW, GH, CELL, P };
}
const boot = () => window.claude && window.claude.hot && window.claude.hot.ready ? window.claude.hot.ready(start) : start();
boot();
})();
