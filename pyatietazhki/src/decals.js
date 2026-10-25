  // ================= decals of the first yard: graffiti on the shed, the lines on the backboard =================
  // garage front: a blue piece, a buffed-over stencil, scribbled tags and a heart
  import { SANS, addDecal, drips, heart, outlinedText, scribble } from '../../engine/src/render/decals.js';
  addDecal('grafFront', 4.9, 2.0, (g, w, h) => {
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
  addDecal('grafSide', 2.9, 2.0, (g, w, h) => {
    scribble(g, 10, 20, 100, 40, '#151517', 41, 3);
    scribble(g, 30, 74, 70, 22, '#2b5fb0', 47, 2);
    outlinedText(g, '2007', 110, 84, 'bold 12px ' + SANS, '#e9e7e0', '#151517', 1);
    g.strokeStyle = '#d9682b'; g.lineWidth = 2; g.beginPath(); g.moveTo(112, 20); g.lineTo(140, 36); g.lineTo(126, 40); g.moveTo(140, 36); g.lineTo(136, 22); g.stroke();
  });
  addDecal('board', 1.2, 0.9, (g, w, h) => {
    g.strokeStyle = '#c8352c'; g.lineWidth = 2; g.strokeRect(3, 3, w - 6, h - 6);
    g.strokeRect(w / 2 - 12, h - 26, 24, 18);
  });
