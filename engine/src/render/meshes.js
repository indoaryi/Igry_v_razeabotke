  // ================= meshes =================
  function loft(rings, o = {}) {
    const seg = o.seg || 12, ex = o.exp || 2, ax = o.axis || 'y';
    const map = ax === 'y' ? (u, a, v) => [u, a, v] : (u, a, v) => [u, v, a];
    const axisVec = ax === 'y' ? [0, 1, 0] : [0, 0, 1];
    const P = [], C = [], tris = [], starts = [];
    const ph = o.phase || 0;
    for (const r of rings) {
      starts.push(P.length);
      const cu = r.cu || 0, cv = r.cv || 0;
      for (let i = 0; i < seg; i++) {
        const t = (i / seg) * Math.PI * 2 + ph, c = Math.cos(t), s = Math.sin(t);
        P.push(map(cu + r.hu * Math.sign(c) * Math.pow(Math.abs(c), 2 / ex), r.a, cv + r.hv * Math.sign(s) * Math.pow(Math.abs(s), 2 / ex)));
        C.push(map(cu, r.a, cv));
      }
    }
    for (let k = 0; k < rings.length - 1; k++) for (let i = 0; i < seg; i++) {
      const a = starts[k] + i, b = starts[k] + (i + 1) % seg, c = starts[k + 1] + i, d = starts[k + 1] + (i + 1) % seg;
      tris.push([a, b, d, 0], [a, d, c, 0]);
    }
    if (o.capA !== false) {
      const r = rings[0], ci = P.length;
      P.push(map(r.cu || 0, o.capAAt ?? r.a, r.cv || 0)); C.push(null);
      for (let i = 0; i < seg; i++) tris.push([ci, starts[0] + (i + 1) % seg, starts[0] + i, -1]);
    }
    if (o.capB !== false) {
      const L = rings.length - 1, r = rings[L], ci = P.length;
      P.push(map(r.cu || 0, o.capBAt ?? r.a, r.cv || 0)); C.push(null);
      for (let i = 0; i < seg; i++) tris.push([ci, starts[L] + i, starts[L] + (i + 1) % seg, 1]);
    }
    const Nn = P.map(() => [0, 0, 0]), I = [];
    for (const [i0, i1, i2, kind] of tris) {
      const p0 = P[i0], p1 = P[i1], p2 = P[i2];
      let n = cross(sub(p1, p0), sub(p2, p0));
      const out = kind === 0 ? sub(scl(add(add(p0, p1), p2), 1 / 3), scl(add(add(C[i0], C[i1]), C[i2]), 1 / 3)) : scl(axisVec, kind);
      if (dot(n, out) < 0) n = scl(n, -1);
      for (const i of [i0, i1, i2]) { Nn[i][0] += n[0]; Nn[i][1] += n[1]; Nn[i][2] += n[2]; }
      I.push(i0, i1, i2);
    }
    return { pos: P.flat(), nrm: Nn.map(nrm).flat(), idx: I };
  }
  function ellipsoid(ex_, ey_, ez_, o = {}) {
    const K = o.rings || 8, rings = [];
    const lo = o.half ? 0 : -Math.PI / 2, hi = Math.PI / 2;
    for (let k = o.half ? 0 : 1; k < K; k++) {
      const ph = lo + (hi - lo) * (k / K), c = Math.cos(ph), s = Math.sin(ph);
      rings.push({ a: ey_ * s, hu: ex_ * c, hv: ez_ * c });
    }
    return loft(rings, { seg: o.seg || 12, exp: o.exp || 2, capA: !o.half, capAAt: -ey_, capBAt: ey_ });
  }
  function capsule(L, r1, r2, o = {}) {
    const rings = [], K = 3;
    for (let k = 1; k <= K; k++) { const ph = -Math.PI / 2 + (Math.PI / 2) * (k / (K + 1)); rings.push({ a: -L + r2 * Math.sin(ph), hu: r2 * Math.cos(ph), hv: r2 * Math.cos(ph) }); }
    rings.push({ a: -L, hu: r2, hv: r2 });
    rings.push({ a: 0, hu: r1, hv: r1 });
    for (let k = 1; k <= K; k++) { const ph = (Math.PI / 2) * (k / (K + 1)); rings.push({ a: r1 * Math.sin(ph), hu: r1 * Math.cos(ph), hv: r1 * Math.cos(ph) }); }
    return loft(rings, { seg: o.seg || 10, exp: o.exp || 2, capAAt: -L - r2, capBAt: r1 });
  }
  // cylinder along +Y from 0 to L with flat caps
  const cyl = (r1, r2, L, seg = 12) => loft([{ a: 0, hu: r1, hv: r1 }, { a: L, hu: r2, hv: r2 }], { seg, capAAt: 0, capBAt: L });
  function box(hx, hy, hz) {
    const P = [], Nn = [], I = [], h = [hx, hy, hz];
    const F = [
      [[1, 0, 0], [0, 0, -1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
      [[0, 1, 0], [1, 0, 0], [0, 0, -1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
      [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]]
    ];
    for (const [n, u, v] of F) {
      const b = P.length / 3;
      for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { for (let i = 0; i < 3; i++) P.push((n[i] + u[i] * su + v[i] * sv) * h[i]); Nn.push(...n); }
      I.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    return { pos: P, nrm: Nn, idx: I };
  }
  const tube = (rs, seg = 14, exp = 2.2) => loft(rs, { seg, exp, capA: false, capB: false });
  // flat-shaded convex polygons (each listed counter-clockwise seen from outside)
  function polyMesh(polys) {
    const P = [], Nn = [], I = [];
    for (const poly of polys) {
      const n = nrm(cross(sub(poly[1], poly[0]), sub(poly[2], poly[0])));
      const b = P.length / 3;
      for (const p of poly) { P.push(p[0], p[1], p[2]); Nn.push(n[0], n[1], n[2]); }
      for (let i = 1; i < poly.length - 1; i++) I.push(b, b + i, b + i + 1);
    }
    return { pos: P, nrm: Nn, idx: I };
  }
  // four-sided roof: base rectangle at y = 0, apex at (0, h, 0)
  function pyramid(hw, hd, h) {
    const A = [0, h, 0], a = [-hw, 0, hd], b = [hw, 0, hd], c = [hw, 0, -hd], d = [-hw, 0, -hd];
    return polyMesh([[a, b, A], [b, c, A], [c, d, A], [d, a, A], [d, c, b, a]]);
  }
  // ring in the xz plane (basketball rim)
  function torus(R, r, n = 20, m = 6) {
    const P = [], Nn = [], I = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      for (let j = 0; j < m; j++) {
        const b = (j / m) * Math.PI * 2, cb = Math.cos(b), sb = Math.sin(b);
        P.push((R + r * cb) * ca, r * sb, (R + r * cb) * sa); Nn.push(cb * ca, sb, cb * sa);
      }
    }
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
      const a = i * m + j, b = ((i + 1) % n) * m + j, c = i * m + (j + 1) % m, d = ((i + 1) % n) * m + (j + 1) % m;
      I.push(a, b, d, a, d, c);
    }
    return { pos: P, nrm: Nn, idx: I };
  }
  // 1-px lines (wires, nets, railings): pairs of points
  function lineMesh(segs) {
    const P = [], Nn = [], I = [];
    for (const [a, b] of segs) { const i = P.length / 3; P.push(...a, ...b); Nn.push(0, 1, 0, 0, 1, 0); I.push(i, i + 1); }
    return { pos: P, nrm: Nn, idx: I, lines: true };
  }
  // a sagging wire between two points
  function catenary(a, b, sag, n = 14) {
    const pts = [];
    for (let i = 0; i <= n; i++) { const t = i / n; const p = lerpV(a, b, t); p[1] -= sag * 4 * t * (1 - t); pts.push(p); }
    const segs = []; for (let i = 0; i < n; i++) segs.push([pts[i], pts[i + 1]]);
    return segs;
  }

