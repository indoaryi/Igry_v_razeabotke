  // ================= math =================
  const I4 = () => { const m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; };
  const ID4 = I4();
  function mul(a, b) {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) {
      const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
      o[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
      o[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
      o[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
      o[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
    }
    return o;
  }
  const M = (...ms) => ms.reduce((a, b) => mul(a, b));
  function tr(x, y, z) { const m = I4(); m[12] = x; m[13] = y; m[14] = z; return m; }
  function rx(a) { const c = Math.cos(a), s = Math.sin(a), m = I4(); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; }
  function ry(a) { const c = Math.cos(a), s = Math.sin(a), m = I4(); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; }
  function rz(a) { const c = Math.cos(a), s = Math.sin(a), m = I4(); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; }
  function sc3(x, y, z) { const m = I4(); m[0] = x; m[5] = y; m[10] = z; return m; }
  const eul = (e) => M(ry(e[1]), rx(e[0]), rz(e[2]));
  function basis(X, Y, Z) { const m = I4(); m[0] = X[0]; m[1] = X[1]; m[2] = X[2]; m[4] = Y[0]; m[5] = Y[1]; m[6] = Y[2]; m[8] = Z[0]; m[9] = Z[1]; m[10] = Z[2]; return m; }
  const xf = (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]];
  const xfDir = (m, v) => [m[0] * v[0] + m[4] * v[1] + m[8] * v[2], m[1] * v[0] + m[5] * v[1] + m[9] * v[2], m[2] * v[0] + m[6] * v[1] + m[10] * v[2]];
  const rotOnly = (m) => { const o = Float32Array.from(m); o[12] = o[13] = o[14] = 0; return o; };
  // inverse of a rigid transform (rotation + translation)
  function invRigid(m) {
    const o = I4();
    o[0] = m[0]; o[1] = m[4]; o[2] = m[8]; o[4] = m[1]; o[5] = m[5]; o[6] = m[9]; o[8] = m[2]; o[9] = m[6]; o[10] = m[10];
    o[12] = -(m[0] * m[12] + m[1] * m[13] + m[2] * m[14]);
    o[13] = -(m[4] * m[12] + m[5] * m[13] + m[6] * m[14]);
    o[14] = -(m[8] * m[12] + m[9] * m[13] + m[10] * m[14]);
    return o;
  }
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const scl = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const len = (a) => Math.hypot(a[0], a[1], a[2]);
  const nrm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = (t) => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const lerp = (a, b, t) => a + (b - a) * t;
  const lerpV = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const rotXv = (v, a) => { const c = Math.cos(a), s = Math.sin(a); return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]; };
  const approach = (v, t, d) => v < t ? Math.min(t, v + d) : Math.max(t, v - d);
  const wrapA = (a) => { a = (a + Math.PI) % (2 * Math.PI); if (a < 0) a += 2 * Math.PI; return a - Math.PI; };
  const approachAngle = (a, t, d) => { const df = wrapA(t - a); return Math.abs(df) <= d ? t : wrapA(a + Math.sign(df) * d); };
  // world point → world art pixels (no camera offset); ground (y = 0) → cell coordinates and back
  const wpx = (P) => [S * dot(RV, P), -S * dot(UV, P)];
  const groundAt = (sx, sy) => { const a = sx / HW, b = sy / HH; return [(a + b) / 2, (b - a) / 2]; };
  function frameY(Y, Z) { Y = nrm(sub(Y, scl(Z, dot(Y, Z)))); return basis(cross(Y, Z), Y, Z); }   // Z forward, Y up
  function alongPlusY(u) { const Y = nrm(u); let X = cross(Y, [0, 0, 1]); if (len(X) < 1e-4) X = cross(Y, [1, 0, 0]); X = nrm(X); return basis(X, Y, cross(X, Y)); }
  function alongMinusY(u) { return alongPlusY(scl(u, -1)); }
  function track(t, keys, base) {
    const val = (v) => v || base;
    if (t <= keys[0][0]) return val(keys[0][1]);
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, a] = keys[i], [t1, b] = keys[i + 1];
      if (t <= t1) return lerpV(val(a), val(b), smooth((t - t0) / (t1 - t0)));
    }
    return val(keys[keys.length - 1][1]);
  }
  function rng(seed) {
    return () => {
      seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  // cheap deterministic value noise for the ground generator
  function hash2(x, y, s) { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 2147483647)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function vnoise(x, y, s) {
    const xi = Math.floor(x), yi = Math.floor(y), xf_ = x - xi, yf = y - yi;
    const u = xf_ * xf_ * (3 - 2 * xf_), v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  const fbm = (x, y, s) => vnoise(x, y, s) * 0.6 + vnoise(x * 2.1, y * 2.1, s + 7) * 0.28 + vnoise(x * 4.3, y * 4.3, s + 13) * 0.12;

