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
  // a faceted solid for armour and hulls: a stack of chamfered rectangles along the axis ('y' or 'z'), flat-shaded.
  // ring: { a: position along the axis, x0..x1 across, b0..b1 along the other axis (z for 'y', y for 'z'), c: corner chamfer }
  function facets(rings, o = {}) {
    const ax = o.axis || 'y';
    const pt = (r, u, v) => ax === 'y' ? [u, r.a, v] : [u, v, r.a];
    const P = [], Nn = [], I = [];
    const ringPts = (r) => {
      const c = Math.max(0.002, r.c ?? 0.04);
      return [[r.x1 - c, r.b1], [r.x1, r.b1 - c], [r.x1, r.b0 + c], [r.x1 - c, r.b0], [r.x0 + c, r.b0], [r.x0, r.b0 + c], [r.x0, r.b1 - c], [r.x0 + c, r.b1]].map(([u, v]) => pt(r, u, v));
    };
    const R = rings.map(ringPts);
    const mid = (k) => { const r = rings[k]; return pt(r, (r.x0 + r.x1) / 2, (r.b0 + r.b1) / 2); };
    const face = (pts, out) => {
      let n = nrm(cross(sub(pts[2], pts[0]), sub(pts[pts.length - 1], pts[1])));
      if (pts.length === 3) n = nrm(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])));
      if (dot(n, out) < 0) n = scl(n, -1);
      const b = P.length / 3;
      for (const p of pts) { P.push(p[0], p[1], p[2]); Nn.push(n[0], n[1], n[2]); }
      for (let i = 1; i < pts.length - 1; i++) I.push(b, b + i, b + i + 1);
    };
    for (let k = 0; k < rings.length - 1; k++) {
      const c0 = mid(k), c1 = mid(k + 1);
      for (let i = 0; i < 8; i++) {
        const j = (i + 1) % 8, q = [R[k][i], R[k][j], R[k + 1][j], R[k + 1][i]];
        if (len(sub(q[0], q[1])) + len(sub(q[3], q[2])) < 0.003) continue;
        const cq = scl(add(add(q[0], q[1]), add(q[2], q[3])), 0.25), ca = lerpV(c0, c1, 0.5);
        face(q, sub(cq, ca));
      }
    }
    const L = rings.length - 1;
    if (o.capA !== false) face(R[0], sub(mid(0), mid(1)));
    if (o.capB !== false) face(R[L], sub(mid(L), mid(L - 1)));
    return { pos: P, nrm: Nn, idx: I };
  }
  // a point on a hull ring at angle t round it (π/2 straight ahead along +z, 0 to +x): a superellipse that can be
  // deeper or shallower and squarer or rounder in front (hf, exF) than behind (hb, exB); hv / ex serve both halves
  function hullPoint(r, t) {
    const c = Math.cos(t), s = Math.sin(t), fr = s >= 0;
    const e = 2 / ((fr ? r.exF : r.exB) ?? r.ex ?? 2.2), d = (fr ? r.hf : r.hb) ?? r.hv;
    return [(r.cx || 0) + r.hu * Math.sign(c) * Math.pow(Math.abs(c), e), r.y, r.cz + d * Math.sign(s) * Math.pow(Math.abs(s), e)];
  }
  // a smooth hull (an egg, a pod, a box with rounded edges) with an opening cut into its front for a hatch that swings out of it.
  // rings: [{ y, hu, hf, hb (or hv), cz, cx?, exF, exB (or ex) }] — sections stacked along y, see hullPoint;
  // o: { seg: vertices round a ring, open: { k0, k1, half: (y) => half-angle of the opening round +z, m: vertices across it }, out, wall,
  //      bulge: (y, u, n) => how far the hatch's skin swells out of the hull at height y, u from −1 to 1 across the opening, n the hull's normal }
  // The vertices of each ring are spread so that the edges of the opening run along them: the opening's outline is smooth.
  // Returns raw meshes: hull (outside, without the opening), cavity (inside, facing in), jamb (the cut through the wall),
  // shell / shellIn / shellEdge (the hatch: outer skin a little proud of the hull, inner skin, its rim) and loop (points round the opening).
  function splitHull(rings, o) {
    const n = o.seg || 32, op = o.open, m = op.m, wall = o.wall ?? 0.05, dOut = o.out ?? 0.006, dIn = o.shellIn ?? 0.04;
    const K = rings.length, P = [];
    for (let k = 0; k < K; k++) {
      const r = rings[k], h = op.half(r.y), row = [];
      for (let i = 0; i < n; i++) row.push(hullPoint(r, i <= m ? Math.PI / 2 - h + 2 * h * i / m : Math.PI / 2 + h + (2 * Math.PI - 2 * h) * (i - m) / (n - m)));
      P.push(row);
    }
    const top = rings[K - 1], bot = rings[0];
    const apexT = [top.cx || 0, top.y + (o.capTop ?? 0.03), top.cz], apexB = [bot.cx || 0, bot.y - (o.capBot ?? 0.02), bot.cz];
    // smooth normals from neighbours on the closed grid
    const N = P.map((row, k) => row.map((p, i) => {
      const a = row[(i + 1) % n], b = row[(i - 1 + n) % n];
      const up = k < K - 1 ? P[k + 1][i] : apexT, dn = k > 0 ? P[k - 1][i] : apexB;
      let v = nrm(cross(sub(up, dn), sub(a, b)));
      const ctr = [rings[k].cx || 0, p[1], rings[k].cz];
      if (dot(v, sub(p, ctr)) < 0) v = scl(v, -1);
      return v;
    }));
    const inOpen = (k, i) => i < m && k >= op.k0 && k < op.k1;
    const mk = () => ({ pos: [], nrm: [], idx: [] });
    const vtx = (g, p, nn) => { g.pos.push(p[0], p[1], p[2]); g.nrm.push(nn[0], nn[1], nn[2]); return g.pos.length / 3 - 1; };
    const quad = (g, a, b, c, d, na, nb, nc, nd, flip) => {
      const i0 = vtx(g, a, na), i1 = vtx(g, b, nb), i2 = vtx(g, c, nc), i3 = vtx(g, d, nd);
      if (flip) g.idx.push(i0, i2, i1, i0, i3, i2); else g.idx.push(i0, i1, i2, i0, i2, i3);
    };
    const off = (k, i, d) => add(P[k][i], scl(N[k][i], d));
    const neg = (v) => scl(v, -1);
    // the hatch's two skins over the opening: proud of the hull by dOut (plus the bulge), and dIn inside it (plus the bulge)
    const SO = [], SI = [];
    for (let k = op.k0; k <= op.k1; k++) {
      const ro = [], ri = [];
      for (let i = 0; i <= m; i++) {
        const b = o.bulge ? o.bulge(rings[k].y, 2 * i / m - 1, N[k][i]) : [0, 0, 0];
        ro.push(add(off(k, i, dOut), b)); ri.push(add(off(k, i, -dIn), b));
      }
      SO.push(ro); SI.push(ri);
    }
    const gridN = (G) => G.map((row, a) => row.map((p, i) => {
      const up = G[Math.min(a + 1, G.length - 1)][i], dn = G[Math.max(a - 1, 0)][i], l = row[Math.max(i - 1, 0)], r = row[Math.min(i + 1, m)];
      let v = nrm(cross(sub(up, dn), sub(l, r)));
      if (dot(v, N[op.k0 + a][i]) < 0) v = scl(v, -1);
      return v;
    }));
    const NO = gridN(SO), NI = gridN(SI);
    const so = (k, i) => SO[k - op.k0][i], si = (k, i) => SI[k - op.k0][i], no = (k, i) => NO[k - op.k0][i], ni = (k, i) => neg(NI[k - op.k0][i]);
    const hull = mk(), cavity = mk(), shell = mk(), shellIn = mk(), shellEdge = mk(), jamb = mk();
    for (let k = 0; k < K - 1; k++) for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      if (inOpen(k, i)) {
        quad(shell, so(k, i), so(k, j), so(k + 1, j), so(k + 1, i), no(k, i), no(k, j), no(k + 1, j), no(k + 1, i));
        quad(shellIn, si(k, i), si(k, j), si(k + 1, j), si(k + 1, i), ni(k, i), ni(k, j), ni(k + 1, j), ni(k + 1, i), true);
      } else {
        quad(hull, P[k][i], P[k][j], P[k + 1][j], P[k + 1][i], N[k][i], N[k][j], N[k + 1][j], N[k + 1][i]);
        quad(cavity, off(k, i, -wall), off(k, j, -wall), off(k + 1, j, -wall), off(k + 1, i, -wall), neg(N[k][i]), neg(N[k][j]), neg(N[k + 1][j]), neg(N[k + 1][i]), true);
      }
    }
    // caps: fans to the apexes
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      let b = vtx(hull, apexT, [0, 1, 0]); hull.idx.push(b, vtx(hull, P[K - 1][j], N[K - 1][j]), vtx(hull, P[K - 1][i], N[K - 1][i]));
      b = vtx(hull, apexB, [0, -1, 0]); hull.idx.push(b, vtx(hull, P[0][i], N[0][i]), vtx(hull, P[0][j], N[0][j]));
    }
    // the loop round the opening (on the hull surface), counter-clockwise seen from the front
    const loopIdx = [];
    for (let i = 0; i <= m; i++) loopIdx.push([op.k0, i]);
    for (let k = op.k0 + 1; k <= op.k1; k++) loopIdx.push([k, m]);
    for (let i = m - 1; i >= 0; i--) loopIdx.push([op.k1, i]);
    for (let k = op.k1 - 1; k > op.k0; k--) loopIdx.push([k, 0]);
    const ctr = P[Math.round((op.k0 + op.k1) / 2)][Math.round(m / 2)];
    const strip = (g, A, B2, flipOut) => {
      for (let q = 0; q < loopIdx.length; q++) {
        const [k0, i0] = loopIdx[q], [k1, i1] = loopIdx[(q + 1) % loopIdx.length];
        const a0 = A(k0, i0), a1 = A(k1, i1), b0 = B2(k0, i0), b1 = B2(k1, i1);
        let nn = nrm(cross(sub(a1, a0), sub(b0, a0)));
        const mid = scl(add(add(a0, a1), add(b0, b1)), 0.25), away = sub(mid, ctr);
        if ((dot(nn, away) < 0) !== !!flipOut) nn = scl(nn, -1);
        const i_ = [vtx(g, a0, nn), vtx(g, a1, nn), vtx(g, b1, nn), vtx(g, b0, nn)];
        g.idx.push(i_[0], i_[1], i_[2], i_[0], i_[2], i_[3]);
      }
    };
    strip(shellEdge, so, si, false);
    strip(jamb, (k, i) => P[k][i], (k, i) => off(k, i, -wall), true);
    return { hull, cavity, jamb, shell, shellIn, shellEdge, loop: loopIdx.map(([k, i]) => P[k][i]), loopN: loopIdx.map(([k, i]) => N[k][i]), P, N };
  }
  // a round tube along a polyline (seals, hoses, cables); closed joins the ends
  function tubeAlong(pts, r, seg = 6, closed = false) {
    const P = [], Nn = [], I = [], L = pts.length;
    const tan = pts.map((p, i) => nrm(sub(pts[closed ? (i + 1) % L : Math.min(i + 1, L - 1)], pts[closed ? (i - 1 + L) % L : Math.max(i - 1, 0)])));
    let ref = Math.abs(tan[0][1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    for (let i = 0; i < L; i++) {
      const T = tan[i], U = nrm(sub(ref, scl(T, dot(ref, T)))), V = cross(T, U);
      ref = U;      // carry the frame along so it does not twist
      for (let j = 0; j < seg; j++) {
        const a = j / seg * Math.PI * 2, d = add(scl(U, Math.cos(a)), scl(V, Math.sin(a)));
        P.push(...add(pts[i], scl(d, r))); Nn.push(...d);
      }
    }
    const rows = closed ? L : L - 1;
    for (let i = 0; i < rows; i++) for (let j = 0; j < seg; j++) {
      const a = i * seg + j, b = i * seg + (j + 1) % seg, c = ((i + 1) % L) * seg + j, d = ((i + 1) % L) * seg + (j + 1) % seg;
      I.push(a, b, d, a, d, c);
    }
    return { pos: P, nrm: Nn, idx: I };
  }
  // a smooth curve through points (Catmull-Rom), n steps per span
  function smoothPath(pts, n = 6) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
      for (let s = 0; s < n; s++) {
        const t = s / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1, 2].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3)));
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
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

