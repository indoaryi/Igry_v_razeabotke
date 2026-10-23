  // ================= decals: graffiti, signs and plates drawn once into a texture atlas =================
  // Texel density matches the screen: 54 texels per metre across a wall and 66 per metre up it,
  // so iso walls show the pictures one texel per pixel.
  const DECALS = {};
  const DX = 54, DY = 66;
  function binarize(c) {
    const g = c.getContext('2d', { willReadFrequently: true }), im = g.getImageData(0, 0, c.width, c.height), d = im.data;
    for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 110 ? 255 : 0;
    g.putImageData(im, 0, 0);
  }
  function outlinedText(g, txt, x, y, font, fill, outline, ow) {
    g.font = font; g.textBaseline = 'top';
    if (outline) {
      g.fillStyle = outline;
      for (let dy = -ow; dy <= ow; dy++) for (let dx = -ow; dx <= ow; dx++) if (dx || dy) g.fillText(txt, x + dx, y + dy);
    }
    g.fillStyle = fill; g.fillText(txt, x, y);
  }
  function scribble(g, x, y, w, h, color, seed, lw) {
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
  function drips(g, x0, x1, y, color, seed) {
    const R = rng(seed); g.fillStyle = color;
    for (let x = x0; x < x1; x += 3 + Math.floor(R() * 7)) g.fillRect(x, y, 1, 2 + Math.floor(R() * 7));
  }
  function heart(g, cx, cy, r, color) {
    g.fillStyle = color; g.beginPath();
    g.moveTo(cx, cy + r * 0.9);
    g.bezierCurveTo(cx - r * 1.6, cy - r * 0.2, cx - r * 0.7, cy - r * 1.3, cx, cy - r * 0.45);
    g.bezierCurveTo(cx + r * 0.7, cy - r * 1.3, cx + r * 1.6, cy - r * 0.2, cx, cy + r * 0.9);
    g.fill();
  }
  function buildDecals() {
    const AW = 512, AH = 512;
    const atlas = document.createElement('canvas'); atlas.width = AW; atlas.height = AH;
    const actx = atlas.getContext('2d', { willReadFrequently: true });
    let sx = 0, sy = 0, rowH = 0;
    const place = (name, wm, hm, draw) => {
      const w = Math.round(wm * DX), h = Math.round(hm * DY);
      if (sx + w > AW) { sx = 0; sy += rowH + 2; rowH = 0; }
      actx.save(); actx.beginPath(); actx.rect(sx, sy, w, h); actx.clip(); actx.translate(sx, sy);
      draw(actx, w, h);
      actx.restore();
      DECALS[name] = { w: wm, h: hm, uv: [(sx + 0.01) / AW, (sy + 0.01) / AH, (w - 0.02) / AW, (h - 0.02) / AH] };
      sx += w + 2; rowH = Math.max(rowH, h);
    };
    const SANS = 'Arial, "Helvetica Neue", "DejaVu Sans", sans-serif';
    // garage front: a blue piece, a buffed-over stencil, scribbled tags and a heart
    place('grafFront', 4.9, 2.0, (g, w, h) => {
      g.fillStyle = '#ecebe5'; g.fillRect(150, 16, 104, 50);
      g.fillStyle = '#dcdad2'; g.fillRect(150, 62, 104, 4);
      outlinedText(g, 'ЗДЕСЬ БЫЛ', 157, 22, 'bold 13px ' + SANS, '#1d1d1f', null, 0);
      outlinedText(g, 'ВАСЯ', 172, 40, 'bold 17px ' + SANS, '#1d1d1f', null, 0);
      outlinedText(g, 'ЦОЙ', 10, 10, 'bold 34px ' + SANS, '#3f7fd2', '#121214', 2);
      outlinedText(g, 'ЖИВ', 22, 46, 'bold 30px ' + SANS, '#3f7fd2', '#121214', 2);
      drips(g, 14, 86, 78, '#3f7fd2', 3);
      scribble(g, 96, 82, 64, 22, '#151517', 11, 2);
      heart(g, 196, 96, 9, '#c8352c');
      outlinedText(g, 'В+К', 184, 108, 'bold 11px ' + SANS, '#c8352c', null, 0);
      scribble(g, 218, 92, 34, 14, '#2f7d3c', 23, 2);
      scribble(g, 12, 100, 60, 16, '#151517', 31, 1.5);
    });
    place('grafSide', 2.9, 2.0, (g, w, h) => {
      scribble(g, 10, 20, 100, 40, '#151517', 41, 3);
      scribble(g, 30, 74, 70, 22, '#2b5fb0', 47, 2);
      outlinedText(g, '2007', 110, 84, 'bold 12px ' + SANS, '#e9e7e0', '#151517', 1);
      g.strokeStyle = '#d9682b'; g.lineWidth = 2; g.beginPath(); g.moveTo(112, 20); g.lineTo(140, 36); g.lineTo(126, 40); g.moveTo(140, 36); g.lineTo(136, 22); g.stroke();
    });
    place('tagSub', 1.3, 0.55, (g, w, h) => { scribble(g, 4, 6, w - 10, h - 16, '#1a1a1c', 53, 2); });
    place('hazard', 0.42, 0.36, (g, w, h) => {
      g.fillStyle = '#1b1b1d'; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w, h); g.lineTo(0, h); g.closePath(); g.fill();
      g.fillStyle = '#f2c230'; g.beginPath(); g.moveTo(w / 2, 3); g.lineTo(w - 3, h - 2); g.lineTo(3, h - 2); g.closePath(); g.fill();
      g.fillStyle = '#1b1b1d'; g.beginPath(); g.moveTo(w / 2 + 1, 6); g.lineTo(w / 2 - 3, h * 0.6); g.lineTo(w / 2 + 1, h * 0.6); g.lineTo(w / 2 - 2, h - 4); g.lineTo(w / 2 + 4, h * 0.5); g.lineTo(w / 2, h * 0.5); g.lineTo(w / 2 + 3, 6); g.closePath(); g.fill();
    });
    place('danger', 0.62, 0.4, (g, w, h) => {
      g.fillStyle = '#f1efe8'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#c8352c'; g.fillRect(0, 0, w, 6);
      g.fillStyle = '#1b1b1d'; g.beginPath(); g.moveTo(w * 0.42, 8); g.lineTo(w * 0.3, h * 0.62); g.lineTo(w * 0.5, h * 0.55); g.lineTo(w * 0.4, h - 3); g.lineTo(w * 0.66, h * 0.42); g.lineTo(w * 0.47, h * 0.48); g.lineTo(w * 0.58, 8); g.closePath(); g.fill();
    });
    place('stencil', 1.05, 0.26, (g, w, h) => { outlinedText(g, 'ТП-117', 1, 1, 'bold 14px ' + SANS, '#2a2a2c', null, 0); });
    place('plate1', 0.32, 0.22, (g, w, h) => { g.fillStyle = '#2f5d9e'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2f2ee'; g.fillRect(1, 1, w - 2, 1); outlinedText(g, '1', 6, 2, 'bold 11px ' + SANS, '#f2f2ee', null, 0); g.fillRect(12, 6, 4, 1); g.fillRect(12, 9, 4, 1); });
    place('plate2', 0.32, 0.22, (g, w, h) => { g.fillStyle = '#2f5d9e'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2f2ee'; g.fillRect(1, 1, w - 2, 1); outlinedText(g, '2', 5, 2, 'bold 11px ' + SANS, '#f2f2ee', null, 0); g.fillRect(12, 6, 4, 1); g.fillRect(12, 9, 4, 1); });
    place('houseNo', 0.62, 0.36, (g, w, h) => { g.fillStyle = '#2f5d9e'; g.fillRect(0, 0, w, h); g.strokeStyle = '#f2f2ee'; g.strokeRect(1.5, 1.5, w - 3, h - 3); outlinedText(g, '12', 8, 5, 'bold 15px ' + SANS, '#f2f2ee', null, 0); });
    place('intercom', 0.18, 0.28, (g, w, h) => {
      g.fillStyle = '#9ea3a6'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b2d30'; g.fillRect(2, 2, w - 4, 4);
      g.fillStyle = '#3c3f43'; for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) g.fillRect(2 + c * 2, 8 + r * 2, 1, 1);
    });
    place('notice', 0.3, 0.4, (g, w, h) => {
      g.fillStyle = '#f4f2ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#c8352c'; g.fillRect(2, 2, w - 4, 2);
      g.fillStyle = '#8a8a86'; for (let y = 7; y < h - 3; y += 3) g.fillRect(2, y, w - 4 - ((y * 7) % 5), 1);
    });
    place('board', 1.2, 0.9, (g, w, h) => {
      g.strokeStyle = '#c8352c'; g.lineWidth = 2; g.strokeRect(3, 3, w - 6, h - 6);
      g.strokeRect(w / 2 - 12, h - 26, 24, 18);
    });
    // notices stuck to the lamp post: one with tear-off phone strips, one printed, one faded
    place('ads1', 0.22, 0.3, (g, w, h) => {
      g.fillStyle = '#f2f0e8'; g.fillRect(0, 0, w, h - 5);
      outlinedText(g, 'ПРОДАМ', 1, 1, 'bold 5px ' + SANS, '#1d1d1f', null, 0);
      g.fillStyle = '#5b5b58'; for (let y = 9; y < h - 9; y += 2) g.fillRect(1, y, w - 2 - ((y * 5) % 4), 1);
      g.fillStyle = '#f2f0e8'; for (let x = 0; x < w; x += 2) g.fillRect(x, h - 5, 1, 5 - ((x * 3) % 3));
    });
    place('ads2', 0.2, 0.26, (g, w, h) => {
      g.fillStyle = '#e8d562'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#c8352c'; g.fillRect(1, 1, w - 2, 3);
      g.fillStyle = '#3b3a35'; for (let y = 6; y < h - 2; y += 2) g.fillRect(1, y, w - 2 - ((y * 3) % 5), 1);
    });
    place('ads3', 0.18, 0.2, (g, w, h) => {
      g.fillStyle = '#dcd8cc'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#9a978e'; for (let y = 2; y < h - 2; y += 3) g.fillRect(1, y, w - 3 - ((y * 7) % 4), 1);
    });
    binarize(atlas);
    uploadDecals(atlas);
    return atlas;
  }
  // a thin plate carrying a decal: centre c, facing local +z of the rotation rot
  function decalMat(name) { const d = DECALS[name]; return mat('#ffffff', { pat: 40, p: [d.w / 2, d.h / 2, 0, 0], r: d.uv, noise: 0 }); }

