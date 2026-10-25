  // ================= navigation: a quarter-metre grid, A* with 8 neighbours, then string pulling =================
  // one grid per walker size: the hero, and big walking machines (their own body is left out while one is driven)
  import { SQ2 } from '../core/camera.js';
  import { clamp } from '../core/math.js';
  import { INST } from './instances.js';
  import { GH, GW } from './ground.js';
  const NR = 4;
  let NWX = 120, NWZ = 120;
  const HERO_R = 0.24;
  export const NAV = { hero: { r: HERO_R, b: null, skip: null }, big: { r: 0.62, b: null, skip: null } };
  let navB = null;            // the hero's grid
  export function navAlloc() {
    NWX = GW * NR; NWZ = GH * NR;
    for (const g of Object.values(NAV)) g.b = new Uint8Array(NWX * NWZ);
    navB = NAV.hero.b;
  }
  // the current location's walk grids come back from its kept runtime (locations.js)
  export function navRestore(rt) {
    NWX = GW * NR; NWZ = GH * NR;
    NAV.hero.b = rt.navHero; NAV.big.b = rt.navBig; navB = NAV.hero.b;
  }
  export function pointInPoly(x, z, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, zi] = poly[i], [xj, zj] = poly[j];
      if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) inside = !inside;
    }
    return inside;
  }
  export function distToPoly(x, z, poly) {
    let best = Infinity;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [ax, az] = poly[j], [bx, bz] = poly[i];
      const ex = bx - ax, ez = bz - az, t = clamp(((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez || 1), 0, 1);
      best = Math.min(best, Math.hypot(x - ax - ex * t, z - az - ez * t));
    }
    return best;
  }
  export function buildNav(g = NAV.hero) {
    const nb = g.b, R_ = g.r;
    nb.fill(0);
    for (let j = 0; j < NWZ; j++) for (let i = 0; i < NWX; i++) {
      const x = (i + 0.5) / NR, z = (j + 0.5) / NR;
      if (x < 0.4 || z < 0.4 || x > GW - 0.4 || z > GH - 0.4) nb[j * NWX + i] = 1;
    }
    for (const inst of INST) for (const b of inst.blocks) {
      if (inst === g.skip) continue;
      let x0, z0, x1, z1;
      if (b.poly) { x0 = Math.min(...b.poly.map((p) => p[0])); x1 = Math.max(...b.poly.map((p) => p[0])); z0 = Math.min(...b.poly.map((p) => p[1])); z1 = Math.max(...b.poly.map((p) => p[1])); }
      else { x0 = b.c[0] - b.r; x1 = b.c[0] + b.r; z0 = b.c[1] - b.r; z1 = b.c[1] + b.r; }
      const i0 = clamp(Math.floor((x0 - R_) * NR), 0, NWX - 1), i1 = clamp(Math.ceil((x1 + R_) * NR), 0, NWX - 1);
      const j0 = clamp(Math.floor((z0 - R_) * NR), 0, NWZ - 1), j1 = clamp(Math.ceil((z1 + R_) * NR), 0, NWZ - 1);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const x = (i + 0.5) / NR, z = (j + 0.5) / NR;
        const hit = b.poly ? (pointInPoly(x, z, b.poly) || distToPoly(x, z, b.poly) < R_) : Math.hypot(x - b.c[0], z - b.c[1]) < b.r + R_;
        if (hit) nb[j * NWX + i] = 1;
      }
    }
  }
  const cellOf = (x, z) => [clamp(Math.floor(x * NR), 0, NWX - 1), clamp(Math.floor(z * NR), 0, NWZ - 1)];
  export const blockedAt = (x, z, g = NAV.hero) => { const [i, j] = cellOf(x, z); return g.b[j * NWX + i] === 1; };
  export function nearestFree(x, z, maxR = 3, g = NAV.hero) {
    if (!blockedAt(x, z, g)) return [x, z];
    for (let r = 1; r <= maxR * NR; r++) {
      let best = null, bd = Infinity;
      for (let a = 0; a < 24; a++) {
        const ang = a / 24 * Math.PI * 2, px = x + Math.cos(ang) * r / NR, pz = z + Math.sin(ang) * r / NR;
        if (px < 0 || pz < 0 || px >= GW || pz >= GH || blockedAt(px, pz, g)) continue;
        const dd = Math.hypot(px - x, pz - z);
        if (dd < bd) { bd = dd; best = [px, pz]; }
      }
      if (best) return best;
    }
    return null;
  }
  function lineFree(a, b, g = NAV.hero) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(L / 0.08);
    for (let i = 1; i < n; i++) { const t = i / n; if (blockedAt(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, g)) return false; }
    return true;
  }
  // binary heap keyed by f
  export function findPath(from, to, grid = NAV.hero) {
    let s = from, g = to;
    const navB = grid.b;
    if (blockedAt(s[0], s[1], grid)) { const f2 = nearestFree(s[0], s[1], 1.5, grid); if (!f2) return null; s = f2; }
    if (blockedAt(g[0], g[1], grid)) { const g2 = nearestFree(g[0], g[1], 3, grid); if (!g2) return null; g = g2; }
    if (lineFree(s, g, grid)) return [g];
    const [si, sj] = cellOf(s[0], s[1]), [gi, gj] = cellOf(g[0], g[1]);
    const N = NWX * NWZ, gS = new Float32Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const heap = [], push = (k, f) => { heap.push([f, k]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = c * 2 + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
    const hfn = (i, j) => { const dx = Math.abs(i - gi), dz = Math.abs(j - gj); return (dx + dz) + (SQ2 - 2) * Math.min(dx, dz); };
    const sk = sj * NWX + si, gk = gj * NWX + gi;
    gS[sk] = 0; push(sk, hfn(si, sj));
    const D8 = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, SQ2], [1, -1, SQ2], [-1, 1, SQ2], [-1, -1, SQ2]];
    let found = false, iter = 0;
    while (heap.length && iter++ < 60000) {
      const [, k] = pop();
      if (closed[k]) continue;
      closed[k] = 1;
      if (k === gk) { found = true; break; }
      const i = k % NWX, j = (k / NWX) | 0;
      for (const [di, dj, w] of D8) {
        const ni = i + di, nj = j + dj;
        if (ni < 0 || nj < 0 || ni >= NWX || nj >= NWZ) continue;
        const nk = nj * NWX + ni;
        if (navB[nk] || closed[nk]) continue;
        if (di && dj && (navB[j * NWX + ni] || navB[nj * NWX + i])) continue;
        const ng = gS[k] + w;
        if (ng < gS[nk]) { gS[nk] = ng; prev[nk] = k; push(nk, ng + hfn(ni, nj)); }
      }
    }
    if (!found) return null;
    const cells = [];
    for (let k = gk; k !== -1 && k !== sk; k = prev[k]) cells.unshift([(k % NWX + 0.5) / NR, (((k / NWX) | 0) + 0.5) / NR]);
    cells[cells.length - 1] = g;
    // string pulling: keep only the corners we cannot see past
    const out = [];
    let cur = s, idx = 0;
    while (idx < cells.length) {
      let far = idx;
      for (let t = cells.length - 1; t > idx; t--) if (lineFree(cur, cells[t], grid)) { far = t; break; }
      out.push(cells[far]); cur = cells[far]; idx = far + 1;
    }
    return out;
  }

