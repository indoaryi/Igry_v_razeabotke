  // ================= locations: the yard with birches =================
  // From the second photo: a white brick five-storey with glazed loggias and a raised-brick "house" on the facade,
  // cars nose-in along it, a lawn under golden weeping birches, a path across it, a rusty metal garage,
  // a sidewalk with a curb along the right edge — that sidewalk is where the asphalt from the first yard comes in.
  // Map: the main house along the top-left edge (facade at x = 2, facing +x), the far house along the top-right edge,
  // apron x 2…3.9, parking x 3.9…8.6, lawn x 8.6…26.75, curb at 26.75, sidewalk x 26.75…30.
  import { clamp, xf } from '../../engine/src/core/math.js';
  import { INST, byType, instantiate } from '../../engine/src/world/instances.js';
  import { MEADOW_AUTUMN } from './catalog2.js';
  const Y2_BIRCHES = [[24.4, 3.4, 14, 501], [25.0, 14.4, 13, 502], [24.1, 25.2, 14, 503], [25.7, 28.9, 11, 504], [11.6, 4.2, 12, 505], [10.1, 27.4, 12.5, 506], [17.2, 25.8, 10, 507]];
  function yard2Leaves(x, z) {
    let d = 0.3;
    for (const [bx, bz] of Y2_BIRCHES) { const q = 1 - ((x - bx) ** 2 + (z - bz) ** 2) / 42; if (q > 0) d = Math.max(d, 0.3 + 0.7 * q); }
    if (x > 26.1 && x < 27.5) d = Math.max(d, 0.98 - Math.abs(x - 26.82) * 0.55);     // heaped along the curb on both sides
    else if (x >= 27.5) d *= 0.6;                                                      // the sidewalk gets swept now and then
    if (x > 3.9 && x < 8.6) d *= 0.38;                                                  // cars drive over the parking
    if (x < 3.9) d *= 0.5;
    return clamp(d, 0, 1);
  }
  export const YARD2 = {
    id: 'yard2', name: 'Двор с берёзами', short: 'С берёзами', photo: 'yard2',
    photoAlt: 'Исходная фотография: осенний двор, золотые берёзы, тропинка через газон к машинам у белой пятиэтажки, ржавый железный гараж справа',
    size: [30, 30],
    ground: null,
    sun: [0.78, 0.55, -0.2],                        // a low autumn sun from the right: the main facade in light, long shadows across the lawn
    light: 'right',                                 // faces take their tone from the upper right, as in the photo
    sunAt: 16.3,                                    // that is the sun of about 16:20; the time of day moves it from there
    arrival: 'Во дворе стоят два боевых костюма.',
    paths: [
      [[26.7, 10.6], [24.6, 10.4], [21.6, 11.6], [19.6, 12.6], [14.2, 14.1], [8.8, 14.7]],
      [[19.6, 12.6], [17.0, 17.4], [14.6, 22.6], [12.6, 29.6]]
    ],
    objects: [
      { n: 2, type: 'metalgarage', at: [21.2, 18.5], rot: 90 },
      { n: 3, type: 'car', kind: 'suv', color: '#25272a', at: [6.15, 2.9], rot: -90, seed: 601, look: 'Чёрный кроссовер. Внутри детское кресло и пачка салфеток.' },
      { n: 3, type: 'car', kind: 'sedan', color: '#1f2023', at: [6.25, 11.6], rot: -90, seed: 602, look: 'Чёрный седан. На торпеде иконка и ёлочка-ароматизатор.' },
      { n: 3, type: 'car', kind: 'sedan', color: '#b3302b', at: [6.25, 14.3], rot: -90, seed: 603, rim: '#3b3d40', look: 'За стеклом записка: «Отъеду через 5 минут». Судя по пыли, давно.' },
      { n: 3, type: 'car', kind: 'hatch', color: '#b8a27b', at: [6.1, 17.0], rot: -90, seed: 604, look: 'На заднем сиденье рассада в коробке из-под бананов.' },
      { n: 3, type: 'car', kind: 'boxy', color: '#a8acaa', at: [6.4, 25.4], rot: -88, seed: 605, rim: '#5b5e60', look: 'Старый внедорожник. В багажнике лопата и трос — ездит на дачу.' },
      ...Y2_BIRCHES.map(([x, z, h, seed]) => ({ n: 4, type: 'tree', kind: 'birchGold', at: [x, z], h, seed })),
      { n: 6, type: 'curbstones', at: [26.75, 0], rot: -90, len: 30, seed: 611 },
      { n: 6, type: 'curbstones', at: [8.64, 0], rot: -90, len: 30, seed: 612 },
      { n: 7, type: 'block5', at: [2, 27.5], rot: 90, len: 27, brick: '#dedbd3', brick2: '#d0ccc2', panel: '#e9e7e1', panel2: '#9a8c78', frame: '#f2f1ed', entr: [2, 6], balc: [1, 4, 7], glazed: 0.95, ornament: [5], seed: 21, entrN: 11 },
      { n: 8, type: 'block5', at: [9, 0.6], rot: 0, len: 17, brick: '#cbc8c1', brick2: '#bcb8af', panels: ['#d6c158', '#8fae5e', '#d9d4c5'], panel2: '#6e6a4c', frame: '#ecebe6', entr: [], balc: [1, 3, 4], glazed: 0.9, chimneys: 4, seed: 23 },
      { n: 9, type: 'tree', kind: 'rowan', at: [15.4, 17.6], seed: 401 },
      { n: 10, type: 'bush', kind: 'lilac', at: [2.85, 16.0], size: 0.9, seed: 621 },
      { n: 10, type: 'bush', kind: 'lilac', at: [2.8, 12.1], size: 0.85, seed: 622 },
      { n: 10, type: 'bush', kind: 'elder', at: [2.85, 24.7], size: 0.8, seed: 623 },
      { n: 10, type: 'bush', kind: 'elder', at: [12.4, 2.6], size: 1.0, seed: 624 },
      { n: 10, type: 'bush', kind: 'lilac', at: [16.8, 2.3], size: 1.1, seed: 625 },
      { n: 10, type: 'bush', kind: 'hazel', at: [20.8, 2.7], size: 1.0, seed: 626 },
      { n: 10, type: 'bush', kind: 'hazel', at: [14.2, 29.0], size: 1.1, seed: 627 },
      { n: 10, type: 'bush', kind: 'shoots', at: [19.6, 29.2], size: 0.9, seed: 628 },
      { n: 12, type: 'bench', at: [3.0, 23.0], rot: 90 },
      { n: 12, type: 'urn', at: [3.05, 21.95], rot: 0 },
      { n: 13, type: 'tree', kind: 'bare', at: [6.0, 0.9], h: 12, seed: 631 },
      { n: 13, type: 'tree', kind: 'bare', at: [8.2, 29.3], h: 10, seed: 632 },
      { n: 14, type: 'pole', at: [26.1, 6.2], rot: 0, flicker: true },
      { n: 16, type: 'grass', at: [17.6, 21.7], rx: 1.4, rz: 0.9, seed: 641, dry: 0.6, col: '#5f6a33', dryCol: '#c2ae66' },
      { n: 16, type: 'grass', at: [10.6, 21.4], rx: 1.0, rz: 1.3, seed: 642, dry: 0.65, col: '#5f6a33', dryCol: '#c2ae66' },
      { n: 16, type: 'grass', at: [24.9, 7.6], rx: 0.8, rz: 1.2, seed: 643, dry: 0.55, col: '#5f6a33', dryCol: '#c2ae66' }
    ],
    machines: [{ n: 1, kind: 'ibk3', at: [23.4, 9.0], yaw: -Math.PI / 2 }, { n: 17, kind: 'b32', at: [14.0, 10.0], yaw: Math.PI / 4 + 0.5 }],
    spawns: {
      start: { at: [27.6, 7.2], yaw: 0 },
      fromYard1: { at: [28.4, 0.9], yaw: 0, walk: [27.9, 6.6] }
    },
    exits: [{ to: 'yard1', rect: [26.85, 0, 30, 1.15], go: [28.4, 0.55], arrive: 'fromYard2', label: 'Двор у пятиэтажек', note: 'Тротуар ведёт обратно в первый двор.' }],
    pigeons: { home: { x0: 4.4, x1: 8.2, z0: 19.0, z1: 22.4 }, perches: [[6.0, 1.47, 14.3], [6.4, 1.47, 11.6], [20.6, 2.5, 18.5], [21.8, 2.5, 18.4], [6.1, 1.58, 17.0], [6.2, 1.66, 25.4]], n: 5 },
    intercom: 'Домофон пищит, но никто не открывает. Кто-то сверху ругается на гудящий костюм.',
    photoCam: { at: [28.2, 12.2], look: Math.PI + 0.04, half: 0.55, len: 19 },
    style: {
      palette: {
        '.': ['#46512a', '#515d2f', '#5d6934', '#6a7439', '#79803f'],
        ',': ['#5b5a2e', '#676433', '#746e39', '#837a42', '#948a4d'],
        ':': ['#5d4b38', '#6c5842', '#7a654d', '#887259', '#988367'],
        '#': ['#55575a', '#5e6063', '#67696c', '#717376', '#7c7e81']
      },
      leafColors: ['#c9a43a', '#d9b64e', '#b98a30', '#a8722e', '#e3c86a', '#8f6a3a'],
      leafMax: 0.44, flowers: false,
      leaves: yard2Leaves,
      litter: ['bench', 'urn', 'entrance', 'metalgarage']
    },
    meadow: { lawnH: 0.7, thin: 0.12, leafHide: 0.75, dryShare: 0.14, mats: MEADOW_AUTUMN },
    leafRate: 3.2,
    legend: [
      { n: 1, name: 'Боевой костюм ИБК-3', act: 'забраться внутрь и пойти', note: 'Тяжёлый шагающий костюм, ждёт на колене. Люк сзади на маховике, ступенька на голени; герой садится внутрь, костюм встаёт и ходит.', added: true },
      { n: 2, name: 'Железный гараж', act: 'читать объявления, подёргать замок', note: 'Ржавый лист, двускатная крыша, «Куплю гараж» на боку.' },
      { n: 3, name: 'Машины', act: 'осмотреть, пнуть колесо', note: 'Пять машин носом к дому. Пнёшь колесо — заорёт сигнализация.' },
      { n: 4, name: 'Берёзы', note: 'Старые плакучие берёзы в золоте, листья сыплются на газон и тротуар.', decor: true },
      { n: 5, name: 'Тропинка', note: 'Протоптана через газон к машинам, у гаража раздваивается.', decor: true },
      { n: 6, name: 'Тротуар и бордюр', note: 'Отдельные камни, у бордюра копятся листья. По тротуару — обратно в первый двор.', decor: true },
      { n: 7, name: 'Дом с «домиком»', note: 'Белый силикатный кирпич, застеклённые лоджии и кирпичный узор на фасаде.', decor: true },
      { n: 8, name: 'Дом с цветными лоджиями', note: 'Серый кирпич, жёлтые и зелёные лоджии, кирпичные трубы на крыше.', decor: true },
      { n: 9, name: 'Молодая рябина', note: 'Тонкое деревце посреди газона, листья краснеют.', decor: true },
      { n: 10, name: 'Кусты', note: 'Сирень у подъездов, бузина и лещина вдоль дальнего дома.', decor: true },
      { n: 11, name: 'Подъезды', act: 'позвонить в домофон', note: 'За машинами, на фото их почти не видно.' },
      { n: 12, name: 'Лавочка с урной', act: 'сесть', note: 'У второго подъезда.', added: true },
      { n: 13, name: 'Голые тополя', note: 'Уже облетели.', decor: true },
      { n: 14, name: 'Столб и провода', note: 'Провода тянутся к дальнему дому.', decor: true },
      { n: 15, name: 'Листопад', note: 'Листья на газоне, тропинке и асфальте; гуще всего под берёзами и у бордюра.', decor: true },
      { n: 16, name: 'Бурьян', act: 'обыскать', note: 'За гаражом, у машин и у столба.' },
      { n: 17, name: 'Бронекостюм «32»', act: 'забраться внутрь и пойти', note: 'Твой эскиз: короб брони на коротких ногах, спереди выпуклая капсула. Капсула откидывается вверх, герой сворачивается внутри, мачта с когтем раскрывает датчики.', added: true }
    ],
    pins: [[2, 86, 64], [3, 45, 58.7], [4, 21.5, 34.7], [5, 45, 74.7], [6, 15, 84], [7, 59, 37], [8, 84, 42.7], [9, 53, 50.7], [10, 43, 55.3], [11, 50.5, 54], [13, 73, 37.3], [14, 55, 28.7], [15, 65, 92]],
    cards: [
      { title: 'Боевой костюм ИБК-3', pick: () => byType('ibk3'), tag: 'залезть', type: 'ibk3', act: true },
      { title: 'Бронекостюм «32»', pick: () => byType('b32'), tag: 'залезть', type: 'b32', act: true },
      { title: 'Железный гараж', pick: () => byType('metalgarage'), tag: 'объявления, замок', type: 'metalgarage', act: true },
      { title: 'Машины', multi: () => ['sedan', 'hatch', 'boxy', 'suv'].map((kd) => [INST.find((i) => i.type === 'car' && i.def.kind === kd)]), tag: 'осмотреть, колесо', type: 'car', act: true },
      { title: 'Дом с «домиком»', pick: () => [INST.find((i) => i.n === 7)], tag: 'декор', type: 'block5' },
      { title: 'Дом с цветными лоджиями', pick: () => [INST.find((i) => i.n === 8)], tag: 'декор', type: 'block5' },
      { title: 'Берёзы и рябина', multi: () => [[INST.find((i) => i.def.kind === 'birchGold')], [INST.find((i) => i.def.kind === 'rowan')]], tag: 'декор', type: 'tree' },
      { title: 'Бордюр', pick: () => [byType('curbstones')[0]], tag: 'декор', type: 'curbstones' }
    ],
    makeGround: (map) => {
      const W = map.size[0], Hh = map.size[1], g = [];
      const inE = (x, z, cx, cz, rx, rz) => ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2 <= 1;
      for (let z = 0; z < Hh; z++) {
        let row = '';
        for (let x = 0; x < W; x++) {
          const cx = x + 0.5, cz = z + 0.5;
          let c = '.';
          if (cz < 1.8 || cx > 25.6) c = ',';
          for (const o of map.objects) if (o.type === 'grass' && inE(cx, cz, o.at[0], o.at[1], o.rx + 0.6, o.rz + 0.6)) c = ',';
          for (const [ex, ez, rx, rz] of [[23.6, 9.0, 1.9, 1.5], [14.3, 10.1, 1.8, 1.3], [22.0, 21.2, 1.4, 0.7], [24.6, 18.5, 0.6, 1.4]]) if (inE(cx, cz, ex, ez, rx, rz)) c = ':';
          if (cx < 3.9) c = '_';
          else if (cx < 8.6) c = '#';
          else if (cx > 26.75) c = '#';
          row += c;
        }
        g.push(row);
      }
      return g;
    },
    // power lines from the pole by the sidewalk: to the far house and off the map to the right
    afterBuild: () => {
      const pole = byType('pole')[0];
      const pa = pole.built.attach.map((p) => xf(pole.M0, p));
      instantiate({ type: 'wires', at: [0, 0], rot: 0, runs: [[pa[0], [23.5, 13.2, 0.75], 0.5], [pa[2], [24.6, 13.2, 0.75], 0.5], [pa[1], [31.5, 8.0, 9.5], 0.4]] });
    },
    dataTypes: ['metalgarage', 'car', 'curbstones', 'bench', 'pole', 'tree'],
    dataNote: `  { n: 7, type: 'block5', at: [2, 27.5], rot: 90, len: 27, brick: '#dedbd3', balc: [1, 4, 7], ornament: [5], … },`,
    dataRest: 'дальний дом, берёзы, кусты, бурьян, второй бордюр'
  };
