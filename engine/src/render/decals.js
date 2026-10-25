  // ================= decals: signs, plates and graffiti drawn once into one texture atlas =================
  // Texel density matches the screen: 54 texels per metre across a wall and 66 per metre up it,
  // so iso walls show the pictures one texel per pixel.
  // Any module adds its pictures while the page loads: addDecal(name, width m, height m, draw(ctx, w px, h px));
  // buildDecals() lays them out in that order when the game starts. A thing then wears one with decal(name) or decalOn().
  import { rng, ry } from '../core/math.js';
  import { mat } from './materials.js';
  import { uploadDecals } from './webgl.js';
  export const DECALS = {};
  const DECAL_LIST = [];
  const DX = 54, DY = 66;
  export const SANS = 'Arial, "Helvetica Neue", "DejaVu Sans", sans-serif';
  export function addDecal(name, wm, hm, draw) { DECAL_LIST.push({ name, wm, hm, draw }); }
  function binarize(c) {
    const g = c.getContext('2d', { willReadFrequently: true }), im = g.getImageData(0, 0, c.width, c.height), d = im.data;
    for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 110 ? 255 : 0;
    g.putImageData(im, 0, 0);
  }
  export function outlinedText(g, txt, x, y, font, fill, outline, ow) {
    g.font = font; g.textBaseline = 'top';
    if (outline) {
      g.fillStyle = outline;
      for (let dy = -ow; dy <= ow; dy++) for (let dx = -ow; dx <= ow; dx++) if (dx || dy) g.fillText(txt, x + dx, y + dy);
    }
    g.fillStyle = fill; g.fillText(txt, x, y);
  }
  export function scribble(g, x, y, w, h, color, seed, lw) {
    const R = rng(seed);
    g.strokeStyle = color; g.lineWidth = lw || 2; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath();
    let px = x, py = y + h * 0.55; g.moveTo(px, py);
    const n = 5 + Math.floor(R() * 4);
    for (let i = 0; i < n; i++) {
      const nx = x + ((i + 1) / n) * w, ny = y + h * (0.15 + R() * 0.7);
      g.bezierCurveTo(px + w * (0.05 + R() * 0.2), y - h * 0.15 + R() * h * 0.5, nx - w * R() * 0.18, y + h * (0.7 + R() * 0.45), nx, ny);
      if (R() < 0.45) { g.moveTo(nx - w * 0.03, y + h * 0.1); g.lineTo(nx + w * 0.01, y + h * 0.95); g.moveTo(nx, ny); }
      px = nx; py = ny;
    }
    g.moveTo(x - 2, y + h * 1.05); g.quadraticCurveTo(x + w * 0.5, y + h * 1.35, x + w + 3, y + h * 0.9);
    g.stroke();
  }
  export function drips(g, x0, x1, y, color, seed) {
    const R = rng(seed); g.fillStyle = color;
    for (let x = x0; x < x1; x += 3 + Math.floor(R() * 7)) g.fillRect(x, y, 1, 2 + Math.floor(R() * 7));
  }
  export function heart(g, cx, cy, r, color) {
    g.fillStyle = color; g.beginPath();
    g.moveTo(cx, cy + r * 0.9);
    g.bezierCurveTo(cx - r * 1.6, cy - r * 0.2, cx - r * 0.7, cy - r * 1.3, cx, cy - r * 0.45);
    g.bezierCurveTo(cx + r * 0.7, cy - r * 1.3, cx + r * 1.6, cy - r * 0.2, cx, cy + r * 0.9);
    g.fill();
  }
  export function buildDecals() {
    const AW = 512, AH = 512;
    const atlas = document.createElement('canvas'); atlas.width = AW; atlas.height = AH;
    const actx = atlas.getContext('2d', { willReadFrequently: true });
    let sx = 0, sy = 0, rowH = 0;
    for (const { name, wm, hm, draw } of DECAL_LIST) {
      const w = Math.round(wm * DX), h = Math.round(hm * DY);
      if (sx + w > AW) { sx = 0; sy += rowH + 2; rowH = 0; }
      if (sy + h > AH) console.warn('decal atlas is full: ' + name);
      actx.save(); actx.beginPath(); actx.rect(sx, sy, w, h); actx.clip(); actx.translate(sx, sy);
      draw(actx, w, h);
      actx.restore();
      DECALS[name] = { w: wm, h: hm, uv: [(sx + 0.01) / AW, (sy + 0.01) / AH, (w - 0.02) / AW, (h - 0.02) / AH] };
      sx += w + 2; rowH = Math.max(rowH, h);
    }
    binarize(atlas);
    uploadDecals(atlas);
    return atlas;
  }
  // a thin plate carrying a decal: centre c, facing local +z of the rotation rot
  function decalMat(name) { const d = DECALS[name]; return mat('#ffffff', { pat: 40, p: [d.w / 2, d.h / 2, 0, 0], r: d.uv, noise: 0 }); }
  const decalCache = new Map();
  export const decal = (name) => { let m = decalCache.get(name); if (!m) { m = Object.assign(decalMat(name), { noShadow: true }); decalCache.set(name, m); } return m; };
  // put a decal plate centred at c (local), facing direction f: 'z' (+z), 'x' (+x), '-x'
  export function decalOn(k, name, c, f) {
    const d = DECALS[name], h = [d.w / 2, d.h / 2, 0.003];
    const rot = f === 'x' ? ry(Math.PI / 2) : f === '-x' ? ry(-Math.PI / 2) : f === '-z' ? ry(Math.PI) : null;
    k.box(decal(name), c, h, rot, 0);
  }
