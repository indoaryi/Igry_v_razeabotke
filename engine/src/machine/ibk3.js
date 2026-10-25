  // ================= ИБК-3: a heavy walking suit for one person =================
  // Our own design for the yard with birches: a tank-hull cab on short thick legs. The pilot sits low in the cab
  // with his head in the cupola; he gets in from the back through a hatch with a hand wheel and two gas struts,
  // stepping on the tread of the right calf (the suit parks on its right knee) and the ledge of the engine block.
  // Faded olive paint, chipped to rust on the edges, mud on the legs. Sizes in metres; +x is the suit's left.
  // ---------- the combat suit: stencils and plates ----------
  import { M, alongPlusY, len, lerpV, rx, ry, rz, sc3, sub, tr } from '../core/math.js';
  import { flat, mat } from '../render/materials.js';
  import { box, cyl, ellipsoid, facets, lineMesh, torus } from '../render/meshes.js';
  import { DECALS, SANS, addDecal, decal, outlinedText } from '../render/decals.js';
  import { CATALOG } from '../world/instances.js';
  import { MACHINE_KINDS } from './machine.js';
  addDecal('sNum', 0.4, 0.32, (g, w, h) => { outlinedText(g, '07', 0, 0, 'bold 21px ' + SANS, '#ebe8de', null, 0); });
  addDecal('sName', 0.56, 0.12, (g, w, h) => { outlinedText(g, 'ИБК-3', 1, 0, 'bold 8px ' + SANS, '#ebe8de', null, 0); });
  addDecal('sHatch', 0.5, 0.12, (g, w, h) => { outlinedText(g, 'ЛЮК', 1, 0, 'bold 8px ' + SANS, '#ebe8de', null, 0); g.fillStyle = '#ebe8de'; g.fillRect(18, 3, 6, 2); g.fillRect(22, 2, 1, 4); g.fillRect(23, 3, 1, 2); });
  addDecal('sWarn', 0.24, 0.16, (g, w, h) => {
    g.fillStyle = '#d9a62a'; g.fillRect(0, 0, w, h); g.fillStyle = '#1c1c1e'; g.fillRect(1, 1, w - 2, 2);
    for (let y = 5; y < h - 1; y += 2) g.fillRect(2, y, w - 4 - ((y * 5) % 4), 1);
  });
  addDecal('sHazard', 0.8, 0.08, (g, w, h) => {
    for (let x = -h; x < w + h; x += 6) { g.fillStyle = '#d9a62a'; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 3, 0); g.lineTo(x + 3 - h, h); g.lineTo(x - h, h); g.closePath(); g.fill(); g.fillStyle = '#1c1c1e'; g.beginPath(); g.moveTo(x + 3, 0); g.lineTo(x + 6, 0); g.lineTo(x + 6 - h, h); g.lineTo(x + 3 - h, h); g.closePath(); g.fill(); }
  });
  {
    const OLIVE = '#646850', RUST = '#76503a';
    const armour = (o = {}) => mat(o.c || OLIVE, { pat: 50, b: o.b || RUST, p: [o.hs ?? 0, o.vs ?? 0, o.rv ?? 12, o.wear ?? 0.3], r: [0, o.mud ?? 0.02, 0, 0], noise: 0.025, grain: 30, spec: 0.22, gloss: 9 });
    const MM = {
      hull: armour({ hs: 2.2, vs: 1.6, wear: 0.35 }),
      plate: armour({ wear: 0.3 }),
      leg: armour({ hs: 2.6, wear: 0.4, mud: 0.07 }),
      foot: armour({ c: '#5c5f4b', wear: 0.5, mud: 0.16 }),
      dark: mat('#3c3f3a', { noise: 0.06, grain: 50, spec: 0.45, gloss: 14 }),
      ribs: mat('#3a3c37', { pat: 23, p: [36, 0, 0, 0], noise: 0.05, spec: 0.3, gloss: 12 }),
      rod: mat('#b9bdbb', { noise: 0.02, spec: 1, gloss: 26 }),
      barrel: mat('#474a43', { noise: 0.04, spec: 0.55, gloss: 16 }),
      rubber: mat('#262725', { noise: 0.04 }),
      hole: Object.assign(flat('#141615', 0), { noShadow: true }),
      pipe: mat('#4f4339', { pat: 38, b: '#7c4c33', p: [7, 0.8, 0, 0], noise: 0.05, grain: 60, spec: 0.2, gloss: 14 }),
      grille: mat('#2e302d', { pat: 12, p: [0.02, 60, 0, 0], noise: 0.03 }),
      glass: mat('#2b3d34', { noise: 0.02, spec: 1, gloss: 20 }),
      glassOn: flat('#74e7a0', 4),
      lens: mat('#cdc6a4', { noise: 0.02, spec: 1, gloss: 20 }),
      lensOn: flat('#fff3c4', 4),
      wood: mat('#7a5a3c', { noise: 0.1, grain: 60 }),
      can: mat('#59613e', { pat: 23, p: [9, 0, 0, 0], noise: 0.05, spec: 0.3, gloss: 10 }),
      tread: mat('#41433d', { pat: 26, p: [40, 0, 0, 0], noise: 0.05 }),
      wire: Object.assign(flat('#20211f', 0), { fl: 1, noShadow: true })
    };
    const lit = (s) => s.glow > 0.5, lampOn = (s) => s.lamps > 0.5;
    const BX = (h) => () => box(h[0], h[1], h[2]);
    const ALONG = (v) => alongPlusY(v);
    // the upper front glacis: from (y 0.46, z 0.53) up to (y 0.86, z 0.30); a frame lying in it
    const GLACIS = (t) => [0, 0.46 + 0.4 * t, 0.53 - 0.23 * t], GL_TILT = -0.522;
    MACHINE_KINDS.ibk3 = {
      name: 'Боевой костюм ИБК-3',
      D: {
        hipX: 0.36, thigh: 0.64, shin: 0.62, ankleY: 0.21, footX: 0.33, footZ: 0.02, toeAt: [0, -0.14, 0.25], sole: [0.18, 0.42, -0.27],
        hipStand: 1.38, hipPark: 0.74, waistY: 0.17, waistZ: 0.02, leanPark: 0.06, leanStand: 0.02, leanWalk: 0.05, height: 2.75, reach: 1.1, blockR: 0.72,
        // parked: the left foot forward, the right knee on the ground with the toes bent
        park: [{ x: 0.34, z: 0.3, y: 0, pitch: 0, toe: 0 }, { x: -0.33, z: -0.575, y: 0.13, pitch: 0.75, toe: -0.75 }],
        cupolaAt: [0, 1.0, -0.06], hinge: [0, 0.885, -0.468], doorMax: 2.05, wheelAt: [0, -0.4, -0.11],
        slit: { at: GLACIS(0.85), tilt: GL_TILT, travel: 0.085 },
        exhausts: [{ hinge: [0.565, 1.305, -0.395], tip: [0.565, 1.34, -0.355] }, { hinge: [-0.565, 1.305, -0.395], tip: [-0.565, 1.34, -0.355] }],
        antenna: [0.24, 1.05, -0.28],
        shX: 0.63, shY: 0.8, shZ: -0.02, upper: 0.44, fore: 0.46,
        armRest: { pitch: 0.06, roll: 0.05, elbow: 0.32, wrist: 0.12, grip: 0.4 },
        fingers: [{ name: 'F1', at: [0.085, -0.13, 0.055], curl: [0.15, 1.15] }, { name: 'F2', at: [0.005, -0.13, 0.055], curl: [0.15, 1.15] }, { name: 'Th', at: [-0.03, -0.09, -0.045], curl: [-0.2, -0.9], splay: 0.25 }],
        speed: 0.9, turn: 1.1, walkErr: 0.55, stepT: 0.6, settle: 0.18, lift: 0.22, lead: 0.3, maxLag: 0.42, sway: 0.075, rise: 0.035, comp: 0.06, compT: 0.34, twist: 0.06, armSwing: 0.16,
        lamps: [['torso', [0.3, 0.592, 0.556], [0, -0.1, 1]], ['torso', [-0.3, 0.592, 0.556], [0, -0.1, 1]], ['lLo', [0.22, -0.2, 0.13], [0, 0, 1]]],
        glows: [['slit', [0, 0, 0.02], [0, 0, 1]]],
        hiss: [['lShin', [0.14, -0.04, -0.12]], ['rShin', [-0.14, -0.04, -0.12]]],
        parkStyle: 'kneel',
        board: { style: 'rear', x: 0.02, zWheel: -1.02, zDoor: -1.38, step: ['rShin', [0, -0.3, -0.2]], sill: [0, 0.13, -0.47], seat: [0, 0.17, -0.05], grip: -0.7, handle: [0.4, 0.5, -0.53], top: [0.22, 0.87, -0.48], knock: [0, 0.4, -0.5] }
      },
      // the kind's own bones: the cupola turns, the hatch swings up on its top hinge, the wheel and the dogs on it, the slit shutter, exhaust flaps, the whip antenna
      bones(B, s, D) {
        B.cupola = M(B.torso, tr(...D.cupolaAt), ry(s.cupola));
        B.door = M(B.torso, tr(...D.hinge), rx(s.door * D.doorMax));
        B.wheel = M(B.door, tr(...D.wheelAt), rz(s.wheel));
        B.dogL = M(B.door, tr(0.03 * (1 - s.dogs), 0, 0));
        B.dogR = M(B.door, tr(-0.03 * (1 - s.dogs), 0, 0));
        B.slit = M(B.torso, tr(...D.slit.at), rx(D.slit.tilt));
        B.shutter = M(B.slit, tr(0, -D.slit.travel * s.shutter, 0));
        for (let i = 0; i < 2; i++) B['flap' + i] = M(B.torso, tr(...D.exhausts[i].hinge), rx(-s.flaps[i]));
        B.antenna = M(B.torso, tr(...D.antenna), rx(s.ant[0]), rz(s.ant[1]));
      },
      pistons: [
        ...['l', 'r'].map((s) => ({ a: [s + 'Thigh', [0, -0.12, -0.175]], b: [s + 'Shin', [0, -0.1, -0.17]], rb: 0.04, lb: 0.33, rr: 0.022, lr: 0.32, mb: MM.barrel, mr: MM.rod })),
        ...['l', 'r'].map((s) => ({ a: [s + 'Shin', [0, -0.44, -0.18]], b: [s + 'Foot', [0, -0.02, -0.25]], rb: 0.032, lb: 0.2, rr: 0.018, lr: 0.19, mb: MM.barrel, mr: MM.rod })),
        ...[1, -1].map((sg) => ({ a: ['torso', [sg * 0.35, 0.3, -0.478]], b: ['door', [sg * 0.31, -0.12, -0.035]], rb: 0.022, lb: 0.36, rr: 0.011, lr: 0.34, mb: MM.barrel, mr: MM.rod }))
      ],
      texts: {
        board: 'Забраться внутрь', knockLabel: 'Постучать по броне', exit: 'Выйти', lampsOn: 'Включить фары', lampsOff: 'Выключить фары', look: 'Осмотреться',
        note: 'Стоит на колене, люк сзади задраен. Внутри поместится один человек.',
        knock: 'Глухо, как в сейф. Броня толщиной в палец.',
        armour: 'В силовой броне в люк не пролезть. Сними броню в снаряжении.',
        ready: 'ИБК-3 ожил. Нажми на землю — пойдёт туда.',
        wakeNote: 'Двигатель прогревается, костюм встаёт.',
        pilotNote: 'Нажми на землю — костюм пойдёт туда. От тяжёлых шагов у машин срабатывает сигнализация.',
        out: 'Люк задраен. ИБК-3 остался стоять на колене.',
        noRoom: 'Сзади нет места, чтобы вылезти. Отойди от стены.'
      },
      build(put) {
        // ---------- torso: the cab ----------
        const T = [
          { a: 0.0, x0: -0.36, x1: 0.36, b0: -0.3, b1: 0.3, c: 0.08 }, { a: 0.1, x0: -0.44, x1: 0.44, b0: -0.44, b1: 0.4, c: 0.1 },
          { a: 0.3, x0: -0.495, x1: 0.495, b0: -0.46, b1: 0.472, c: 0.115 }, { a: 0.46, x0: -0.5, x1: 0.5, b0: -0.46, b1: 0.53, c: 0.12 },
          { a: 0.86, x0: -0.48, x1: 0.48, b0: -0.46, b1: 0.3, c: 0.12 }, { a: 1.0, x0: -0.4, x1: 0.4, b0: -0.37, b1: 0.17, c: 0.11 }];
        put('torso', 'hull', () => facets(T), null, MM.hull);
        // the doorway behind the hatch: dark inside, a rubber seal round it, a lamp glowing on the panel when the suit is alive
        put('torso', 'hole', BX([0.3, 0.365, 0.004]), tr(0, 0.49, -0.463), MM.hole);
        put('torso', 'sealH', BX([0.33, 0.02, 0.006]), tr(0, 0.865, -0.463), MM.rubber);
        put('torso', 'sealH', BX([0.33, 0.02, 0.006]), tr(0, 0.115, -0.463), MM.rubber);
        for (const sg of [1, -1]) put('torso', 'sealV', BX([0.02, 0.37, 0.006]), tr(sg * 0.315, 0.49, -0.463), MM.rubber);
        put('torso', 'panelLamp', BX([0.035, 0.012, 0.002]), tr(0.1, 0.66, -0.468), MM.glass, { alt: MM.glassOn, when: lit });
        put('torso', 'panelLamp', BX([0.035, 0.012, 0.002]), tr(-0.06, 0.6, -0.468), MM.glass, { alt: MM.glassOn, when: lit });
        // grab handles at the back corners
        for (const sg of [1, -1]) {
          put('torso', 'handle', () => cyl(0.016, 0.016, 0.42, 6), M(tr(sg * 0.4, 0.29, -0.53), ALONG([0, 1, 0])), MM.dark);
          for (const y of [0.33, 0.67]) put('torso', 'standoff', () => cyl(0.012, 0.012, 0.09, 6), M(tr(sg * 0.4, y, -0.44), ALONG([0, 0, -1])), MM.dark);
        }
        // vision slit with its brow and the guides of the shutter
        const SL = M(tr(...GLACIS(0.85)), rx(GL_TILT));
        put('torso', 'slit', BX([0.16, 0.02, 0.01]), M(SL, tr(0, 0, 0.004)), MM.glass, { alt: MM.glassOn, when: (s) => lit(s) && s.shutter > 0.5 });
        put('torso', 'brow', BX([0.215, 0.022, 0.03]), M(SL, tr(0, 0.06, 0.028)), MM.plate);
        for (const sg of [1, -1]) put('torso', 'guide', BX([0.012, 0.07, 0.012]), M(SL, tr(sg * 0.205, -0.045, 0.016)), MM.dark);
        // caged headlamps on brackets
        for (const sg of [1, -1]) {
          put('torso', 'lampBr', BX([0.025, 0.035, 0.035]), tr(sg * 0.3, 0.6, 0.47), MM.dark);
          put('torso', 'lampH', () => cyl(0.055, 0.062, 0.085, 10), M(tr(sg * 0.3, 0.6, 0.47), ALONG([0, -0.1, 1])), MM.dark);
          put('torso', 'lens', () => ellipsoid(0.05, 0.012, 0.05, { seg: 10, rings: 4 }), M(tr(sg * 0.3, 0.592, 0.556), ALONG([0, -0.1, 1])), MM.lens, { alt: MM.lensOn, when: lampOn });
          const cx = sg * 0.3, cz = 0.575, cy = 0.59;
          put('torso', 'cage' + sg, () => lineMesh([[[cx - 0.04, cy - 0.05, cz], [cx - 0.04, cy + 0.05, cz]], [[cx, cy - 0.055, cz], [cx, cy + 0.055, cz]], [[cx + 0.04, cy - 0.05, cz], [cx + 0.04, cy + 0.05, cz]], [[cx - 0.055, cy, cz], [cx + 0.055, cy, cz]]]), null, MM.wire);
        }
        // tow hooks at the bottom of the front, lifting eyes on the roof
        for (const sg of [1, -1]) {
          put('torso', 'hook', () => torus(0.04, 0.012, 10, 5), M(tr(sg * 0.2, 0.14, 0.43), rz(Math.PI / 2)), MM.dark);
          put('torso', 'eye', () => torus(0.035, 0.01, 10, 5), M(tr(sg * 0.3, 1.03, 0.06), rz(Math.PI / 2)), MM.dark);
        }
        // exhaust stacks over the shoulders, with perforated heat shields and flap caps
        for (const sg of [1, -1]) {
          const a = [sg * 0.54, 0.62, -0.335], b = [sg * 0.565, 1.305, -0.355], d = sub(b, a);
          put('torso', 'pipe', () => cyl(0.042, 0.042, len(d), 8), M(tr(...a), ALONG(d)), MM.pipe);
          put('torso', 'shield', () => cyl(0.058, 0.058, 0.26, 8), M(tr(...lerpV(a, b, 0.3)), ALONG(d)), MM.grille);
          for (const y of [0.72, 0.95]) put('torso', 'pipeBr', BX([0.045, 0.018, 0.02]), tr(sg * 0.5, y, -0.34), MM.dark);
        }
        for (let i = 0; i < 2; i++) put('flap' + i, 'flap', () => cyl(0.05, 0.05, 0.012, 8), tr(0, 0, 0.04), MM.dark);
        // a whip antenna on the roof, a jerrycan on the left side, a shovel on the right
        put('torso', 'antBase', () => cyl(0.028, 0.03, 0.06, 8), tr(0.24, 0.99, -0.28), MM.dark);
        put('antenna', 'whip', () => lineMesh([[[0, 0, 0], [0, 0.45, -0.01]], [[0, 0.45, -0.01], [0, 0.9, -0.03]], [[0, 0.9, -0.03], [0, 1.3, -0.06]]]), null, MM.wire);
        put('antenna', 'tip', BX([0.008, 0.012, 0.008]), tr(0, 1.3, -0.06), MM.dark);
        put('torso', 'can', BX([0.045, 0.13, 0.085]), tr(0.54, 0.47, -0.25), MM.can);
        put('torso', 'canCap', () => cyl(0.018, 0.018, 0.03, 6), tr(0.54, 0.6, -0.3), MM.dark);
        for (const y of [0.38, 0.56]) put('torso', 'strap', BX([0.05, 0.012, 0.09]), tr(0.545, y, -0.25), MM.rubber);
        put('torso', 'shovelH', () => cyl(0.016, 0.016, 0.56, 6), M(tr(-0.515, 0.4, -0.3), ALONG([0, 0, 1])), MM.wood);
        put('torso', 'shovelB', BX([0.008, 0.075, 0.09]), tr(-0.512, 0.4, 0.33), MM.dark);
        put('torso', 'shovelT', BX([0.01, 0.05, 0.012]), tr(-0.515, 0.4, -0.31), MM.wood);
        for (const z of [-0.15, 0.18]) put('torso', 'shovelC', BX([0.03, 0.025, 0.015]), tr(-0.5, 0.4, z), MM.dark);
        // stencils: the number on both sides, the name under it, a warning by the hatch
        for (const sg of [1, -1]) {
          put('torso', 'sNum' + sg, BX([DECALS.sNum.w / 2, DECALS.sNum.h / 2, 0.003]), M(tr(sg * 0.497, 0.64, 0.07), ry(sg * Math.PI / 2)), decal('sNum'));
          put('torso', 'sName' + sg, BX([DECALS.sName.w / 2, DECALS.sName.h / 2, 0.003]), M(tr(sg * 0.5, 0.38, 0.07), ry(sg * Math.PI / 2)), decal('sName'));
        }
        // ---------- cupola ----------
        put('torso', 'cupRing', () => cyl(0.262, 0.262, 0.03, 12), tr(0, 0.99, -0.06), MM.dark);
        put('cupola', 'cup', () => facets([{ a: 0, x0: -0.24, x1: 0.24, b0: -0.24, b1: 0.24, c: 0.085 }, { a: 0.13, x0: -0.225, x1: 0.225, b0: -0.225, b1: 0.225, c: 0.08 }, { a: 0.175, x0: -0.17, x1: 0.17, b0: -0.17, b1: 0.17, c: 0.06 }]), null, MM.hull);
        for (const ph of [0, Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2]) {
          const r = Math.abs(ph - Math.round(ph / (Math.PI / 2)) * (Math.PI / 2)) > 0.1 ? 0.2 : 0.229;
          put('cupola', 'vb', BX([0.042, 0.02, 0.008]), M(ry(ph), tr(0, 0.072, r)), MM.glass, { alt: MM.glassOn, when: lit });
          put('cupola', 'vbBrow', BX([0.052, 0.008, 0.02]), M(ry(ph), tr(0, 0.103, r + 0.004)), MM.plate);
        }
        put('cupola', 'hatch', () => cyl(0.12, 0.12, 0.022, 10), tr(0, 0.175, -0.03), MM.plate);
        put('cupola', 'hatchHinge', BX([0.04, 0.014, 0.02]), tr(0, 0.19, -0.155), MM.dark);
        put('cupola', 'peri', BX([0.034, 0.03, 0.03]), tr(0.09, 0.205, 0.07), MM.dark);
        put('cupola', 'periG', BX([0.026, 0.014, 0.004]), tr(0.09, 0.21, 0.102), MM.glass, { alt: MM.glassOn, when: lit });
        // ---------- shutter ----------
        put('shutter', 'shut', BX([0.19, 0.042, 0.012]), tr(0, 0, 0.026), MM.plate);
        put('shutter', 'shutK', BX([0.03, 0.01, 0.01]), tr(0, -0.035, 0.04), MM.dark);
        // ---------- the hatch: plate, raised panel, wheel, dogs, a handle bar, hazard stripes, «ЛЮК» ----------
        put('door', 'doorP', BX([0.32, 0.36, 0.0325]), tr(0, -0.375, -0.0325), MM.plate);
        put('door', 'doorR', BX([0.245, 0.27, 0.012]), tr(0, -0.41, -0.076), MM.plate);
        put('door', 'doorHg', () => cyl(0.022, 0.022, 0.6, 8), M(tr(-0.3, -0.01, -0.02), ALONG([1, 0, 0])), MM.dark);
        put('door', 'bar', () => cyl(0.015, 0.015, 0.3, 6), M(tr(-0.15, -0.7, -0.13), ALONG([1, 0, 0])), MM.dark);
        for (const sg of [1, -1]) put('door', 'barS', () => cyl(0.011, 0.011, 0.07, 6), M(tr(sg * 0.13, -0.7, -0.065), ALONG([0, 0, -1])), MM.dark);
        put('door', 'haz', BX([DECALS.sHazard.w / 2, DECALS.sHazard.h / 2, 0.003]), M(tr(0, -0.69, -0.0675), ry(Math.PI), sc3(0.78, 1, 1)), decal('sHazard'));
        put('door', 'sHatch', BX([DECALS.sHatch.w / 2, DECALS.sHatch.h / 2, 0.003]), M(tr(0, -0.11, -0.0675), ry(Math.PI), sc3(0.8, 1, 1)), decal('sHatch'));
        put('wheel', 'rim', () => torus(0.105, 0.014, 16, 5), rx(Math.PI / 2), MM.dark);
        put('wheel', 'hub', () => cyl(0.03, 0.03, 0.05, 8), M(tr(0, 0, 0.02), ALONG([0, 0, -1])), MM.dark);
        for (let k = 0; k < 3; k++) put('wheel', 'spoke', BX([0.008, 0.052, 0.008]), M(rz(k * Math.PI * 2 / 3), tr(0, 0.052, 0)), MM.dark);
        for (const y of [-0.22, -0.56]) { put('dogL', 'dog', BX([0.03, 0.022, 0.014]), tr(0.31, y, -0.05), MM.dark); put('dogR', 'dog', BX([0.03, 0.022, 0.014]), tr(-0.31, y, -0.05), MM.dark); }
        // ---------- pelvis ----------
        put('pelvis', 'core', () => facets([{ a: -0.16, x0: -0.28, x1: 0.28, b0: -0.26, b1: 0.24, c: 0.07 }, { a: 0.04, x0: -0.38, x1: 0.38, b0: -0.34, b1: 0.33, c: 0.09 }, { a: 0.17, x0: -0.34, x1: 0.34, b0: -0.3, b1: 0.29, c: 0.08 }]), null, MM.plate);
        put('pelvis', 'waist', () => cyl(0.31, 0.31, 0.07, 14), tr(0, 0.145, 0.02), MM.ribs);
        put('pelvis', 'engine', BX([0.27, 0.13, 0.09]), tr(0, 0.02, -0.4), MM.ribs);
        put('pelvis', 'ledge', BX([0.3, 0.012, 0.115]), tr(0, 0.162, -0.4), MM.tread);
        put('pelvis', 'ledgeHaz', BX([DECALS.sHazard.w / 2, DECALS.sHazard.h / 2, 0.003]), M(tr(0, 0.11, -0.4925), ry(Math.PI), sc3(0.7, 1, 1)), decal('sHazard'));
        put('pelvis', 'sWarn', BX([DECALS.sWarn.w / 2, DECALS.sWarn.h / 2, 0.003]), M(tr(0.17, -0.04, -0.4925), ry(Math.PI)), decal('sWarn'));
        put('pelvis', 'skirtF', BX([0.3, 0.12, 0.018]), M(tr(0, -0.07, 0.36), rx(-0.22)), MM.plate);
        for (const sg of [1, -1]) {
          put('pelvis', 'skirtS', BX([0.018, 0.13, 0.19]), M(tr(sg * 0.535, -0.03, 0), rz(sg * 0.12)), MM.plate);
          put('pelvis', 'hipDrum', () => cyl(0.13, 0.13, 0.2, 10), M(tr(sg * 0.26, 0, 0), ALONG([sg, 0, 0])), MM.dark);
        }
        // ---------- legs ----------
        for (const [sd, sg] of [['l', 1], ['r', -1]]) {
          put(sd + 'Thigh', 'thigh', () => facets([{ a: 0.07, x0: -0.1, x1: 0.1, b0: -0.11, b1: 0.11, c: 0.04 }, { a: -0.08, x0: -0.14, x1: 0.14, b0: -0.16, b1: 0.15, c: 0.05 }, { a: -0.46, x0: -0.13, x1: 0.13, b0: -0.14, b1: 0.14, c: 0.05 }, { a: -0.6, x0: -0.1, x1: 0.1, b0: -0.1, b1: 0.1, c: 0.04 }]), null, MM.leg);
          put(sd + 'Thigh', 'thighPl', BX([0.115, 0.15, 0.016]), M(tr(0, -0.27, 0.152), rx(0.05)), MM.plate);
          put(sd + 'Thigh', 'thighBr', BX([0.03, 0.035, 0.03]), tr(0, -0.12, -0.165), MM.dark);
          put(sd + 'Shin', 'knee', () => cyl(0.11, 0.11, 0.26, 10), M(tr(-0.13, 0, 0), ALONG([1, 0, 0])), MM.dark);
          put(sd + 'Shin', 'shin', () => facets([{ a: 0.02, x0: -0.12, x1: 0.12, b0: -0.12, b1: 0.15, c: 0.04 }, { a: -0.14, x0: -0.155, x1: 0.155, b0: -0.165, b1: 0.19, c: 0.05 }, { a: -0.45, x0: -0.185, x1: 0.185, b0: -0.195, b1: 0.19, c: 0.065 }, { a: -0.585, x0: -0.15, x1: 0.15, b0: -0.15, b1: 0.14, c: 0.05 }]), null, MM.leg);
          put(sd + 'Shin', 'kneeCap', BX([0.105, 0.095, 0.03]), M(tr(0, 0.03, 0.175), rx(-0.3)), MM.plate);
          put(sd + 'Shin', 'calfBr', BX([0.03, 0.035, 0.03]), tr(0, -0.1, -0.165), MM.dark);
          put(sd + 'Shin', 'calfBr2', BX([0.028, 0.03, 0.03]), tr(0, -0.44, -0.18), MM.dark);
          put(sd + 'Shin', 'ankle', () => cyl(0.075, 0.075, 0.22, 10), M(tr(-0.11, -0.62, 0), ALONG([1, 0, 0])), MM.dark);
          if (sd === 'r') {
            // the tread on the right calf: the first step up when the suit kneels
            put('rShin', 'tread', BX([0.11, 0.1, 0.012]), tr(0, -0.29, -0.188), MM.tread);
            put('rShin', 'treadHaz', BX([DECALS.sHazard.w / 2, DECALS.sHazard.h / 2, 0.003]), M(tr(0, -0.395, -0.186), ry(Math.PI), sc3(0.27, 0.6, 1)), decal('sHazard'));
          }
          put(sd + 'Foot', 'foot', () => facets([{ a: -0.27, x0: -0.13, x1: 0.13, b0: -0.21, b1: -0.09, c: 0.03 }, { a: -0.19, x0: -0.17, x1: 0.17, b0: -0.21, b1: 0.03, c: 0.04 }, { a: 0.1, x0: -0.18, x1: 0.18, b0: -0.21, b1: 0.01, c: 0.045 }, { a: 0.25, x0: -0.17, x1: 0.17, b0: -0.21, b1: -0.07, c: 0.03 }], { axis: 'z' }), null, MM.foot);
          put(sd + 'Foot', 'sole', BX([0.185, 0.018, 0.27]), tr(0, -0.193, -0.01), MM.rubber);
          put(sd + 'Foot', 'heelBr', BX([0.03, 0.03, 0.035]), tr(0, -0.02, -0.25), MM.dark);
          put(sd + 'Toe', 'toe', () => facets([{ a: 0, x0: -0.17, x1: 0.17, b0: -0.07, b1: 0.065, c: 0.03 }, { a: 0.17, x0: -0.15, x1: 0.15, b0: -0.07, b1: -0.015, c: 0.025 }], { axis: 'z' }), null, MM.foot);
          put(sd + 'Toe', 'toeSole', BX([0.165, 0.016, 0.085]), tr(0, -0.054, 0.085), MM.rubber);
          // ---------- arms ----------
          const ox = sg * 0.05;
          put(sd + 'Up', 'drum', () => cyl(0.16, 0.16, 0.15, 12), M(tr(-sg * 0.16, 0, 0), ALONG([sg, 0, 0])), MM.dark);
          put(sd + 'Up', 'paul', BX([0.13, 0.04, 0.19]), M(tr(sg * 0.05, 0.15, 0), rz(-sg * 0.32)), MM.plate);
          put(sd + 'Up', 'paulLip', BX([0.03, 0.08, 0.17]), tr(sg * 0.17, 0.07, 0), MM.plate);
          put(sd + 'Up', 'upper', () => facets([{ a: 0, x0: -0.09, x1: 0.09, b0: -0.1, b1: 0.1, c: 0.035 }, { a: -0.36, x0: -0.1, x1: 0.1, b0: -0.11, b1: 0.11, c: 0.04 }, { a: -0.42, x0: -0.08, x1: 0.08, b0: -0.085, b1: 0.085, c: 0.03 }]), tr(ox, 0, 0), MM.plate);
          put(sd + 'Lo', 'elbow', () => cyl(0.085, 0.085, 0.18, 10), M(tr(ox - 0.09, 0, 0), ALONG([1, 0, 0])), MM.dark);
          put(sd + 'Lo', 'fore', () => facets([{ a: 0.02, x0: -0.1, x1: 0.1, b0: -0.1, b1: 0.12, c: 0.035 }, { a: -0.1, x0: -0.12, x1: 0.12, b0: -0.12, b1: 0.15, c: 0.04 }, { a: -0.4, x0: -0.12, x1: 0.12, b0: -0.12, b1: 0.15, c: 0.045 }, { a: -0.45, x0: -0.1, x1: 0.1, b0: -0.1, b1: 0.12, c: 0.035 }]), tr(ox, 0, 0), MM.plate);
          if (sd === 'l') {
            // a searchlight on the left forearm
            put('lLo', 'slBr', BX([0.03, 0.03, 0.04]), tr(0.18, -0.2, 0), MM.dark);
            put('lLo', 'slH', () => cyl(0.06, 0.06, 0.14, 10), M(tr(0.22, -0.2, -0.015), ALONG([0, 0, 1])), MM.dark);
            put('lLo', 'slL', () => ellipsoid(0.052, 0.01, 0.052, { seg: 10, rings: 4 }), M(tr(0.22, -0.2, 0.127), ALONG([0, 0, 1])), MM.lens, { alt: MM.lensOn, when: lampOn });
          } else {
            // a short gun pod on the right forearm, its ammunition box under it
            put('rLo', 'pod', BX([0.05, 0.055, 0.14]), tr(-0.22, -0.24, 0.03), MM.plate);
            put('rLo', 'podB', () => cyl(0.022, 0.022, 0.2, 8), M(tr(-0.22, -0.235, 0.17), ALONG([0, 0, 1])), MM.dark);
            put('rLo', 'podM', () => cyl(0.03, 0.03, 0.045, 8), M(tr(-0.22, -0.235, 0.36), ALONG([0, 0, 1])), MM.dark);
            put('rLo', 'podAmmo', BX([0.04, 0.05, 0.06]), tr(-0.22, -0.335, -0.02), MM.can);
          }
          put(sd + 'Hand', 'palm', () => facets([{ a: 0.0, x0: -0.075, x1: 0.075, b0: -0.07, b1: 0.08, c: 0.025 }, { a: -0.13, x0: -0.08, x1: 0.08, b0: -0.07, b1: 0.09, c: 0.03 }]), tr(ox, 0, 0), MM.dark);
          for (const fg of ['F1', 'F2', 'Th']) put(sd + fg, 'finger', () => facets([{ a: 0.01, x0: -0.026, x1: 0.026, b0: -0.026, b1: 0.026, c: 0.01 }, { a: -0.125, x0: -0.018, x1: 0.018, b0: -0.018, b1: 0.02, c: 0.008 }]), null, MM.plate);
        }
      }
    };
    CATALOG.ibk3 = { name: 'Боевой костюм ИБК-3', size: '2,75 м', note: 'Тяжёлый пеший бронекостюм: кабина как башня танка, люк сзади с маховиком, внутри помещается герой.' };
  }
