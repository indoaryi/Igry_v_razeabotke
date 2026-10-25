  // ================= colours =================
  import { clamp } from '../core/math.js';
  export function hex2rgb(h) { return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]; }
  function rgb2hsl([r, g, b]) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function hsl2rgb([h, s, l]) {
    h = (((h % 360) + 360) % 360) / 360;
    if (s <= 0) return [l, l, l];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = (t) => { t = ((t % 1) + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
    return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
  }
  const shiftHue = (h, target, amt) => { const d = ((target - h + 540) % 360) - 180; return h + clamp(d, -amt, amt); };
  function makeRamp(hex) {
    const [h, s, l] = rgb2hsl(hex2rgb(hex));
    return Float32Array.from([
      hsl2rgb([shiftHue(h, 245, 16), Math.min(1, s * 1.1 + 0.02), l * 0.46]),
      hsl2rgb([shiftHue(h, 245, 9), Math.min(1, s * 1.05), l * 0.66]),
      hsl2rgb([shiftHue(h, 245, 3), s, l * 0.84]),
      hsl2rgb([h, s, l]),
      hsl2rgb([shiftHue(h, 48, 9), s * 0.92, Math.min(0.96, l + (1 - l) * 0.2 + 0.035)])
    ].flat());
  }
  let matSerial = 0;
  export function mat(hex, o = {}) {
    return {
      a: makeRamp(hex), b: makeRamp(o.b || hex), pat: o.pat || 0, key: ++matSerial,
      p: Float32Array.from(o.p || [0, 0, 0, 0]), r: Float32Array.from(o.r || [0, 0, 0, 0]),
      q: Float32Array.from([o.noise ?? 0.08, o.grain ?? 50, o.side ?? 1, o.nape ?? -1]),
      s: Float32Array.from([o.spec ?? 0, o.gloss ?? 16, o.thin ? 1 : 0, 0]),
      w: o.wind ? Float32Array.from(o.wind) : null      // [sway m, 1 / height m, speed, flutter share]
    };
  }
  export const hexRGB = (h) => hex2rgb(h).map((v) => Math.round(v * 255));
  export const COL = {
    skin: '#c48d6c', beard: '#9a958d', hair: '#6b6762', leather: '#34261f', tank: '#d9d3c6', cargo: '#62645c',
    belt: '#1d1d1f', metal: '#8e9093', boot: '#29292b', lace: '#8f8f8f', steel: '#676b6f', rust: '#6f5a44',
    yellow: '#c99a2e', rubber: '#2b2b2d', olive: '#504c3c', green: '#3ad86a', red: '#d23a2a', gun: '#3c3a30',
    khaki: '#5d5843', black: '#1f1f21', purple: '#4b1f3d', gold: '#c9a24a', can: '#b6b9bd', wood: '#5a4330',
    paper: '#e4ddcf', target: '#b43a2c', cable: '#18181a'
  };

  // painted metal with rust patches and chips (o: rustCol, rf — patches per metre, rt — how rare, spec)
  export const paint = (hex, o = {}) => mat(hex, { pat: 38, b: o.rustCol || '#7c4c33', p: [o.rf || 6, o.rt ?? 0.9, 0, 0], noise: 0.05, grain: 60, spec: o.spec ?? 0.35, gloss: 14 });
  // one flat tone of the palette; tone 4 glows (lamps, lenses)
  export const flat = (hex, idx) => mat(hex, { pat: 10, p: [idx, 0, 0, 0] });
