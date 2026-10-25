  // ================= the breakdown: photo with numbers, scheme, catalog, data =================
  const infoOf = (n) => MAP.legend.find((l) => l.n === n);
  function goToNumber(n) {
    const list = INST.filter((i) => i.n === n);
    if (!list.length) return;
    list.sort((a, b) => Math.hypot(a.center[0] - hero.x, a.center[1] - hero.z) - Math.hypot(b.center[0] - hero.x, b.center[1] - hero.z));
    const inst = list.find((i) => i.active) || list[0];
    $('stageBox').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    if (inst.active) { hero.focus = inst; doDefault(inst); refreshContext(); return; }
    // decor: walk up to it
    const dx = hero.x - inst.center[0], dz = hero.z - inst.center[1], dl = Math.hypot(dx, dz) || 1;
    let p = [inst.center[0] + dx / dl * 2, inst.center[1] + dz / dl * 2];
    p = nearestFree(clamp(p[0], 0.6, GW - 0.6), clamp(p[1], 0.6, GH - 0.6), 6) || p;
    walkTo(p[0], p[1]);
    toast(infoOf(n).name + '. ' + infoOf(n).note);
  }
  // the breakdown always shows the location the hero is in; these are rebuilt on every arrival
  function buildFound() {
    const fig = $('photo');
    fig.querySelectorAll('.pin').forEach((e) => e.remove());
    const img = $('photoImg'), src = (window.YARD_PHOTOS || {})[MAP.photo];
    if (src && img.getAttribute('src') !== src) img.src = src;
    img.alt = MAP.photoAlt || '';
    for (const [n, x, y] of MAP.pins) {
      const L = infoOf(n);
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'pin' + (L.decor ? ' decor' : ''); b.textContent = n;
      b.style.left = x + '%'; b.style.top = y + '%';
      b.setAttribute('aria-label', n + '. ' + L.name + (L.act ? ': ' + L.act : ''));
      b.addEventListener('click', () => goToNumber(n));
      b.addEventListener('mouseenter', () => { const li = $('obj-' + n); if (li) li.classList.add('hl'); });
      b.addEventListener('mouseleave', () => { const li = $('obj-' + n); if (li) li.classList.remove('hl'); });
      fig.append(b);
    }
    const ol = $('objlist'), dl = $('decorlist');
    ol.textContent = ''; dl.textContent = '';
    for (const L of MAP.legend) {
      if (L.decor) {
        const li = document.createElement('li'), b = document.createElement('button');
        b.type = 'button'; b.title = L.note; b.setAttribute('aria-label', 'Показать во дворе: ' + L.name);
        const i = document.createElement('i'); i.textContent = L.n;
        b.append(i, document.createTextNode(L.name)); b.addEventListener('click', () => goToNumber(L.n));
        li.append(b); dl.append(li); continue;
      }
      const li = document.createElement('li');
      li.id = 'obj-' + L.n;
      const n = document.createElement('button'); n.type = 'button'; n.className = 'n'; n.textContent = L.n; n.style.border = '0'; n.style.cursor = 'pointer'; n.style.font = 'inherit';
      n.setAttribute('aria-label', 'Показать во дворе: ' + L.name);
      n.addEventListener('click', () => goToNumber(L.n));
      const dv = document.createElement('div');
      const b = document.createElement('b'); b.textContent = L.name + ' · ';
      const em = document.createElement('em'); em.textContent = L.act; b.append(em);
      const s = document.createElement('span'); s.textContent = L.note + (L.added ? ' На фото не видно, добавил сам.' : '');
      dv.append(b, s); li.append(n, dv); ol.append(li);
    }
  }

  // ---------- scheme: the same map seen from straight above, north up; doubles as a minimap ----------
  const planEl = $('plan');
  const PLAN = { cs: 12.6, m: 26 };
  let planBase = null, planTimer = 0, planKey = '';
  const GCOL = { '.': '#9cc160', ',': '#7c9a44', ':': '#c6a878', '#': '#8f9295', '_': '#c4c1b9' };
  const TCOL = { garage: '#d9d7cf', substation: '#f0eee8', towers: '#c4463a', swing: '#6f9a63', pullbar: '#d9b23b', slide: '#9a6646', platform: '#8c8982', hoop: '#4b6e8d', bench: '#3f6a58', urn: '#7b776f', pole: '#8d8a83', entrance: '#b9b5ab', metalgarage: '#7c3a2c', car: '#5d6670', ibk3: '#5f6b47', b32: '#7b8186', tires: '#d9d6cf' };
  function planPt(x, z) { const k = PLAN.cs / SQ2; return [PLAN.w / 2 + (x - z) * k, PLAN.m + (x + z) * k]; }
  function planSize() { PLAN.w = Math.round(GW * PLAN.cs * SQ2 + PLAN.m * 2); PLAN.h = PLAN.w; }
  function drawPlanBase() {
    planSize();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const c = document.createElement('canvas'); c.width = PLAN.w * dpr; c.height = PLAN.h * dpr;
    const g = c.getContext('2d'); g.scale(dpr, dpr);
    const poly = (pts, fill, stroke, lw = 1) => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw; g.stroke(); } };
    for (let z = 0; z < GH; z++) for (let x = 0; x < GW; x++) {
      const t = MAP.ground[z][x];
      poly([planPt(x, z), planPt(x + 1, z), planPt(x + 1, z + 1), planPt(x, z + 1)], GCOL[t] || GCOL['.']);
    }
    g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 0.6;
    for (let k = 0; k <= GW; k++) { g.beginPath(); g.moveTo(...planPt(k, 0)); g.lineTo(...planPt(k, GH)); g.stroke(); g.beginPath(); g.moveTo(...planPt(0, k)); g.lineTo(...planPt(GW, k)); g.stroke(); }
    g.strokeStyle = '#ad8c5e'; g.lineWidth = PLAN.cs * 0.6; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const pl of MAP.paths) { g.beginPath(); pl.forEach((p, i) => i ? g.lineTo(...planPt(p[0], p[1])) : g.moveTo(...planPt(p[0], p[1]))); g.stroke(); }
    // buildings (whole footprints, clipped by nothing: they hang over the edge like on the map)
    for (const i of INST) if (i.type === 'block5') poly(i.blocks[0].poly.map((p) => planPt(p[0], p[1])), i.def.brick, 'rgba(0,0,0,0.45)');
    for (const i of INST) {
      if (i.type === 'grass') {
        g.save(); g.translate(...planPt(i.def.at[0], i.def.at[1])); g.rotate(Math.PI / 4); g.scale(1, 1);
        g.beginPath(); g.ellipse(0, 0, i.def.rx * PLAN.cs, i.def.rz * PLAN.cs, 0, 0, Math.PI * 2);
        g.fillStyle = 'rgba(86,116,40,0.55)'; g.fill(); g.strokeStyle = 'rgba(60,80,30,0.7)'; g.lineWidth = 1; g.setLineDash([3, 2]); g.stroke(); g.setLineDash([]);
        g.restore();
      }
    }
    for (const i of INST) {
      const col = TCOL[i.type];
      if (!col) continue;
      if (i.type === 'entrance') { const h = i.built.heights[0]; const ps = [[h.rect[0], h.rect[1]], [h.rect[2], h.rect[1]], [h.rect[2], h.rect[3]], [h.rect[0], h.rect[3]]].map((p) => toWorld2(i.M0, p)); poly(ps.map((p) => planPt(p[0], p[1])), col, 'rgba(0,0,0,0.5)'); continue; }
      for (const b of i.blocks) {
        if (b.poly) poly(b.poly.map((p) => planPt(p[0], p[1])), col, 'rgba(0,0,0,0.5)');
        else { g.beginPath(); g.arc(...planPt(b.c[0], b.c[1]), Math.max(2, b.r * PLAN.cs * 1.2), 0, Math.PI * 2); g.fillStyle = col; g.fill(); g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; g.stroke(); }
      }
    }
    for (const i of INST) if (i.type === 'tree' || i.type === 'bush') {
      const r = Math.max(0.5, (i.bb[3] - i.bb[0]) / 2) * PLAN.cs;
      const [px, py] = planPt(i.def.at[0], i.def.at[1]);
      g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2);
      g.fillStyle = i.def.kind === 'bare' ? 'rgba(110,98,86,0.28)' : 'rgba(52,96,40,0.45)'; g.fill();
      g.strokeStyle = 'rgba(30,60,25,0.55)'; g.lineWidth = 1; g.stroke();
      g.beginPath(); g.arc(px, py, 2.2, 0, Math.PI * 2); g.fillStyle = '#5b4a3a'; g.fill();
    }
    // where the photo was taken from: a wedge looking north across the lawn
    {
      const cam = MAP.photoCam.at, look = MAP.photoCam.look, half = MAP.photoCam.half || 0.62, L = MAP.photoCam.len || 17;
      const p0 = planPt(cam[0], cam[1]);
      g.beginPath(); g.moveTo(...p0);
      for (let i = 0; i <= 12; i++) { const a = look - half + (2 * half) * i / 12; g.lineTo(...planPt(cam[0] + Math.cos(a) * L, cam[1] + Math.sin(a) * L)); }
      g.closePath();
      const grad = g.createRadialGradient(p0[0], p0[1], 4, p0[0], p0[1], L * PLAN.cs);
      grad.addColorStop(0, 'rgba(255,255,255,0.42)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad; g.fill();
      g.beginPath(); g.arc(...p0, 6.5, 0, Math.PI * 2); g.fillStyle = '#1B1F22'; g.fill();
      g.beginPath(); g.arc(...p0, 2.6, 0, Math.PI * 2); g.fillStyle = '#ffffff'; g.fill();
      g.font = '600 11px ' + getComputedStyle(document.body).getPropertyValue('--body'); g.textAlign = 'left'; g.textBaseline = 'middle';
      g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,0.85)'; g.strokeText('отсюда фото', p0[0] + 10, p0[1] + 1);
      g.fillStyle = '#1B1F22'; g.fillText('отсюда фото', p0[0] + 10, p0[1] + 1);
    }
    // number badges
    const seen = new Set();
    const badge = (n, x, y, small) => {
      const L = infoOf(n); if (!L) return;
      const [px, py] = planPt(x, y);
      g.beginPath(); g.arc(px, py, small ? 7 : 8.5, 0, Math.PI * 2);
      g.fillStyle = L.decor ? '#ffffff' : '#B8691C'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = L.decor ? '#1B1F22' : '#ffffff'; g.stroke();
      g.fillStyle = L.decor ? '#1B1F22' : '#ffffff'; g.font = '600 ' + (small ? 8 : 9.5) + 'px ' + getComputedStyle(document.body).getPropertyValue('--mono'); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(n), px, py + 0.5);
    };
    for (const i of INST) {
      if (!i.n) continue;
      const Li = infoOf(i.n);
      if (Li && Li.decor && seen.has(i.n)) continue;
      seen.add(i.n);
      let x = i.center[0], z = i.center[1];
      if (i.type === 'block5') { const f = toWorld2(i.M0, [i.def.len * 0.5, -3]); x = f[0]; z = f[1]; }
      if (i.type === 'grass' || i.type === 'tree' || i.type === 'bush') { x = i.def.at[0]; z = i.def.at[1]; }
      badge(i.n, x, z, i.type === 'grass');
    }
    // compass
    g.fillStyle = getComputedStyle(document.body).getPropertyValue('--muted') || '#586067';
    g.font = '600 12px ' + getComputedStyle(document.body).getPropertyValue('--mono'); g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('С', ...planPt(-0.9, -0.9)); g.fillText('Ю', ...planPt(GW + 0.9, GH + 0.9)); g.fillText('З', ...planPt(-0.9, GH + 0.9)); g.fillText('В', ...planPt(GW + 0.9, -0.9));
    planBase = c;
    planEl.width = c.width; planEl.height = c.height;
    planEl.style.aspectRatio = PLAN.w + ' / ' + PLAN.h;
  }
  function drawPlan(dt) {
    planTimer -= dt;
    if (planTimer > 0 || !planBase) return;
    planTimer = 0.25;
    const key = hero.x.toFixed(2) + hero.z.toFixed(2) + hero.yaw.toFixed(1);
    if (key === planKey) return;
    planKey = key;
    const g = planEl.getContext('2d'), dpr = planEl.width / PLAN.w;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, planEl.width, planEl.height); g.drawImage(planBase, 0, 0);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const [px, py] = planPt(hero.x, hero.z);
    const d = planPt(hero.x + Math.sin(hero.yaw) * 1.1, hero.z + Math.cos(hero.yaw) * 1.1);
    g.strokeStyle = '#1B1F22'; g.lineWidth = 2; g.beginPath(); g.moveTo(px, py); g.lineTo(...d); g.stroke();
    g.beginPath(); g.arc(px, py, 5.5, 0, Math.PI * 2); g.fillStyle = '#E2A048'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#1B1F22'; g.stroke();
  }
  planEl.addEventListener('click', (e) => {
    const r = planEl.getBoundingClientRect();
    const X = (e.clientX - r.left) / r.width * PLAN.w, Y = (e.clientY - r.top) / r.height * PLAN.h;
    const k = PLAN.cs / SQ2, a = (X - PLAN.w / 2) / k, b = (Y - PLAN.m) / k;
    const x = (a + b) / 2, z = (b - a) / 2;
    if (x < 0.4 || z < 0.4 || x > GW - 0.4 || z > GH - 0.4) return;
    walkTo(x, z);
  });
  planEl.style.cursor = 'pointer';
  function buildLegend() {
    const ul = $('legend');
    const items = [['.', 'газон'], [',', 'бурьян, некошеная трава'], [':', 'вытоптанная земля'], ['#', 'асфальт'], ['_', 'бетонная отмостка']];
    for (const [ch, name] of items) {
      const li = document.createElement('li');
      const i = document.createElement('i'); i.style.background = GCOL[ch];
      const c = document.createElement('code'); c.textContent = ch;
      const s = document.createElement('span'); s.textContent = name;
      li.append(i, c, s); ul.append(li);
    }
    const extra = [['#ad8c5e', 'тропинка'], ['rgba(52,96,40,0.6)', 'крона дерева'], ['#B8691C', 'активный предмет'], ['#E2A048', 'герой, нажми на схему — пойдёт']];
    for (const [col, name] of extra) {
      const li = document.createElement('li');
      const i = document.createElement('i'); i.style.background = col; if (name.startsWith('герой') || name.startsWith('активный')) i.style.borderRadius = '50%';
      const s = document.createElement('span'); s.textContent = name;
      li.append(i, s); ul.append(li);
    }
  }

  // ---------- catalog cards: each object rendered by the engine on its own ----------
  let CARDS = [];
  function renderGroups(cv, groups, focus, pad) {
    groups = groups.map((g) => g.filter(Boolean)).filter((g) => g.length);
    if (!groups.length) return;
    const ctx = cv.getContext('2d'), W = cv.width, H = cv.height, n = groups.length, cw = W / n;
    let z = 1;
    const rects = groups.map((g) => {
      let r = [Infinity, Infinity, -Infinity, -Infinity];
      for (const i of focus ? [focus] : g) r = [Math.min(r[0], i.sr[0]), Math.min(r[1], i.sr[1]), Math.max(r[2], i.sr[2]), Math.max(r[3], i.sr[3])];
      if (pad) { const cx = (r[0] + r[2]) / 2, cy = (r[1] + r[3]) / 2, hw = (r[2] - r[0]) / 2 * pad, hh = (r[3] - r[1]) / 2 * pad; r = [cx - hw, cy - hh, cx + hw, cy + hh]; }
      return r;
    });
    for (const r of rects) z = Math.min(z, (cw - 12) / (r[2] - r[0]), (H - 12) / (r[3] - r[1]));
    ctx.clearRect(0, 0, W, H);
    const dyn = dynItems();
    groups.forEach((g, gi) => {
      const r = rects[gi], cx = (r[0] + r[2]) / 2, cy = (r[1] + r[3]) / 2;
      const ids = new Set(g.map((i) => i.id));
      const main = [], shadow = [];
      for (const i of g) for (const it of itemsFor(i)) { main.push(it); if (it.shadow) shadow.push(it); }
      for (const it of dyn) if (ids.has(it.id)) { main.push(it); if (it.shadow) shadow.push(it); }
      const v = { w: Math.round(cw), h: H, ax: cw / 2 - cx * z, ay: H / 2 - cy * z + 2, s: S * z };
      render3D(TGT_SMALL, v, { main, shadow }, false, ctx, Math.round(cw * gi), 0);
    });
  }
  function buildCards() {
    const box_ = $('cards');
    box_.textContent = '';
    CARDS = MAP.cards;
    for (const c of CARDS) {
      const T = CATALOG[c.type] || { size: '', note: '' };
      const art = document.createElement('article'); art.className = 'card';
      const cv = document.createElement('canvas'); cv.width = 220; cv.height = 165; cv.setAttribute('aria-hidden', 'true');
      const body = document.createElement('div'); body.className = 'cb';
      const top = document.createElement('div'); top.className = 'ct';
      const b = document.createElement('b'); b.textContent = c.title;
      const sz = document.createElement('span'); sz.className = 'sz'; sz.textContent = T.size;
      top.append(b, sz);
      const p = document.createElement('p'); p.textContent = T.note;
      const tag = document.createElement('span'); tag.className = 'tag' + (c.act ? ' act' : ''); tag.textContent = c.act ? 'активный · ' + c.tag : 'декор';
      body.append(top, p, tag); art.append(cv, body); box_.append(art);
      c.cv = cv;
    }
  }
  function renderCards() { for (const c of CARDS) renderGroups(c.cv, c.multi ? c.multi() : [c.pick()], c.focus ? c.focus() : null, c.pad); }

  // everything below the stage follows the hero into each location
  LOC_HOOKS.enter.push((def) => {
    for (const id of ['locNow1', 'locNow2', 'locNow3', 'locNow4']) { const el = $(id); if (el) el.textContent = def.name; }
    buildFound(); drawPlanBase(); planKey = ''; buildCards(); buildData();
    setTimeout(renderCards, 60);
  });

  // ---------- data excerpt ----------
  function buildData() {
    const fmt = (o) => {
      const parts = [];
      for (const [k, v] of Object.entries(o)) {
        if (k === 'runs') continue;
        parts.push(k + ': ' + (Array.isArray(v) ? '[' + v.join(', ') + ']' : typeof v === 'string' ? `'${v}'` : v));
      }
      return '  { ' + parts.join(', ') + ' },';
    };
    const lines = [];
    lines.push(`// земля: ${GH} строк по ${GW} клеток, одна буква — один метр`);
    lines.push('ground: [');
    for (const r of MAP.ground) lines.push("  '" + r + "',");
    lines.push('],');
    lines.push('// предметы: тип из каталога, клетка (x, z), поворот в градусах');
    lines.push('objects: [');
    const shown = MAP.objects.filter((o) => MAP.dataTypes.includes(o.type)).slice(0, 12);
    for (const o of shown) lines.push(fmt(o));
    lines.push(MAP.dataNote);
    lines.push(`  // …и ещё ${MAP.objects.length - shown.length - 1}: ${MAP.dataRest || 'второй дом, деревья, кусты, бурьян, бордюр'}`);
    lines.push(']');
    $('dataCode').textContent = lines.join('\n');
  }

