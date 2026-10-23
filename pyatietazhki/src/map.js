  // ================= locations: the first yard =================
  // Ground, one character per 1 m cell (row = z, column = x):
  //   .  lawn    ,  rough grass and weeds    :  trodden earth    #  asphalt    _  concrete apron
  const GROUND_KEY = { '.': 'газон', ',': 'бурьян, некошеная трава', ':': 'вытоптанная земля', '#': 'асфальт', '_': 'бетонная отмостка' };
  const YARD1 = {
    id: 'yard1', name: 'Двор у пятиэтажек', short: 'У пятиэтажек', photo: 'yard1',
    photoAlt: 'Исходная фотография: заросший двор, качели, горка, гараж с граффити, подстанция, игровой комплекс с красными крышами и пятиэтажки за деревьями',
    size: [30, 30],
    ground: null,   // filled by makeGround() the first time the yard is built
    paths: [
      [[29.6, 27.2], [24.5, 23.4], [19.2, 21.4], [14.6, 20.6], [10.8, 20.1], [6.4, 19.3], [4.0, 19.1]],
      [[19.2, 21.4], [18.8, 16.4], [19.6, 13.2]],
      [[6.3, 7.6], [7.6, 8.7], [10.2, 10.3], [11.0, 11.0]]
    ],
    objects: [
      { n: 1, type: 'swing', at: [7.4, 21.6], rot: 0, color: '#4f8a46', seat: true },
      { n: 2, type: 'swing', at: [7.4, 25.8], rot: 0, color: '#d6b03a', seed: 31 },
      { n: 3, type: 'hoop', at: [4.6, 18.4], rot: 90 },
      { n: 4, type: 'slide', at: [9.0, 16.4], rot: 0 },
      { n: 5, type: 'platform', at: [12.2, 17.8], rot: 0 },
      { n: 6, type: 'pullbar', at: [11.0, 11.8], rot: 0 },
      { n: 7, type: 'garage', at: [6.6, 11.5], rot: 0 },
      { n: 8, type: 'substation', at: [7.5, 4.6], rot: 0 },
      { n: 9, type: 'towers', at: [18.0, 11.2], rot: 0 },
      { n: 13, type: 'block5', at: [2, 29], rot: 90, len: 20, brick: '#d9d6ce', brick2: '#c9c5bc', panel: '#6f93ba', panel2: '#8a6a4c', entr: [1, 4], balc: [0, 3, 5], seed: 7 },
      { n: 14, type: 'block5', at: [13, 1], rot: 0, len: 17, brick: '#cfae84', brick2: '#bf9c72', panel: '#9b4a3a', panel2: '#6e3326', frame: '#e6e1d6', entr: [], balc: [1, 2, 4], seed: 9 },
      { n: 12, type: 'bench', at: [3.15, 21.9], rot: 90 },
      { n: 12, type: 'urn', at: [3.2, 20.75], rot: 0 },
      { n: 15, type: 'swing', at: [10.6, 23.6], rot: 0, color: '#8b9095', half: 0.8, bar: 1.9, spl: 0.6, plain: true, seed: 33 },
      { n: 16, type: 'pole', at: [12.0, 3.6], rot: 0 },
      { n: 10, type: 'grass', at: [13.4, 7.6], rx: 1.6, rz: 1.0, seed: 201 },
      { n: 10, type: 'grass', at: [21.0, 7.2], rx: 2.2, rz: 1.2, seed: 202, dry: 0.55 },
      { n: 10, type: 'grass', at: [24.0, 10.4], rx: 1.5, rz: 2.2, seed: 203 },
      { n: 10, type: 'grass', at: [25.5, 15.5], rx: 1.3, rz: 2.4, seed: 204, dry: 0.5 },
      { n: 10, type: 'grass', at: [6.0, 28.6], rx: 1.2, rz: 0.9, seed: 206 },
      { n: 10, type: 'grass', at: [20.2, 26.6], rx: 1.7, rz: 1.1, seed: 207 },
      { n: 10, type: 'grass', at: [13.6, 27.8], rx: 1.4, rz: 1.0, seed: 208, dry: 0.2 },
      { n: 10, type: 'grass', at: [16.4, 14.2], rx: 1.0, rz: 0.7, seed: 209 },
      { n: 10, type: 'grass', at: [22.8, 20.4], rx: 1.2, rz: 1.5, seed: 210 },
      { n: 10, type: 'grass', at: [9.8, 8.8], rx: 0.9, rz: 0.6, seed: 211, dry: 0.6 },
      { n: 17, type: 'tree', kind: 'ash', at: [3.0, 5.6], seed: 101 },
      { n: 17, type: 'tree', kind: 'birch', at: [1.6, 2.0], seed: 102 },
      { n: 17, type: 'tree', kind: 'maple', at: [14.6, 3.6], seed: 103 },
      { n: 17, type: 'tree', kind: 'poplar', at: [18.2, 3.0], seed: 104 },
      { n: 17, type: 'tree', kind: 'birch', at: [21.6, 3.8], seed: 105 },
      { n: 17, type: 'tree', kind: 'maple', at: [25.0, 3.2], seed: 106 },
      { n: 17, type: 'tree', kind: 'poplar', at: [28.3, 4.4], seed: 107 },
      { n: 17, type: 'tree', kind: 'ash', at: [27.0, 9.0], seed: 108 },
      { n: 17, type: 'tree', kind: 'willow', at: [28.2, 13.0], seed: 109 },
      { n: 17, type: 'tree', kind: 'birch', at: [27.4, 17.0], seed: 110 },
      { n: 17, type: 'tree', kind: 'poplar', at: [28.6, 21.0], seed: 111 },
      { n: 17, type: 'tree', kind: 'ash', at: [28.8, 28.8], h: 9.2, seed: 112 },
      { n: 18, type: 'tree', kind: 'bare', at: [5.0, 27.6], seed: 113 },
      { n: 17, type: 'tree', kind: 'young', at: [16.8, 27.8], seed: 114 },
      { n: 19, type: 'bush', kind: 'lilac', at: [13.2, 6.8], size: 1.0, seed: 301 },
      { n: 19, type: 'bush', kind: 'elder', at: [4.5, 8.4], size: 0.8, seed: 302 },
      { n: 19, type: 'bush', kind: 'hazel', at: [23.0, 6.0], size: 1.2, seed: 303 },
      { n: 19, type: 'bush', kind: 'dogrose', at: [14.0, 13.7], size: 0.9, seed: 304 },
      { n: 19, type: 'bush', kind: 'hazel', at: [29.0, 25.0], size: 1.3, seed: 305 },
      { n: 19, type: 'bush', kind: 'lilac', at: [21.6, 29.3], size: 1.0, seed: 307 },
      { n: 19, type: 'bush', kind: 'shoots', at: [4.6, 15.6], size: 0.7, seed: 308 },
      { n: 19, type: 'bush', kind: 'hazel', at: [26.0, 11.0], size: 1.1, seed: 309 },
      { n: 19, type: 'bush', kind: 'elder', at: [27.6, 15.2], size: 1.0, seed: 310 },
      { n: 19, type: 'bush', kind: 'lilac', at: [26.6, 19.2], size: 1.1, seed: 311 },
      { n: 19, type: 'bush', kind: 'shoots', at: [28.2, 23.2], size: 0.9, seed: 312 },
      { n: 19, type: 'bush', kind: 'lilac', at: [16.2, 5.0], size: 0.9, seed: 313 },
      { n: 19, type: 'bush', kind: 'shoots', at: [19.8, 5.8], size: 0.8, seed: 314 },
      { n: 19, type: 'bush', kind: 'elder', at: [26.6, 6.4], size: 1.0, seed: 315 },
      { n: 19, type: 'bush', kind: 'dogrose', at: [25.0, 27.6], size: 0.9, seed: 316 },
      { n: 20, type: 'tires', at: [5.0, 27.0], rot: 90, count: 3, seed: 91 },
      { n: 20, type: 'tires', at: [4.9, 23.3], rot: 90, count: 2, seed: 92, shift: 2 },
      { type: 'curb', at: [4.0, 7.0], rot: -90, len: 23 }
    ],
    // where the hero appears: at the start, and when he comes back from the yard with birches along the left house
    spawns: {
      start: { at: [14.2, 20.4], yaw: -1.9 },
      fromYard2: { at: [3.15, 29.25], yaw: Math.PI, walk: [3.15, 26.2] }
    },
    // walking into one of these rectangles (x0, z0, x1, z1) takes the hero to another location
    exits: [{ to: 'yard2', rect: [2.0, 28.75, 4.7, 30], go: [3.15, 29.55], arrive: 'fromYard1', label: 'Двор с берёзами', note: 'Асфальт вдоль левого дома ведёт в соседний двор.' }],
    pigeons: { home: { x0: 3.5, x1: 5.7, z0: 18.9, z1: 23.6 }, perches: [[3.0, 2.93, 23.3], [3.35, 2.93, 24.7], [6.4, 2.36, 21.6], [7.9, 2.36, 21.6], [5.2, 2.47, 11.3], [6.9, 2.47, 10.6]] },
    intercom: 'Домофон пищит, но никто не открывает.',
    photoCam: { at: [26.2, 26.2], look: Math.atan2(-1, -1) },
    legend: [
      { n: 1, name: 'Качели', act: 'покачаться', note: 'Сиденье на цепях, герой раскачивается ногами.' },
      { n: 2, name: 'Каркас качелей без сиденья', act: 'подтянуться', note: 'На фото сидений нет, так что это турник.' },
      { n: 3, name: 'Баскетбольный щит', act: 'бросить мяч', note: 'Попадает примерно в половине бросков.' },
      { n: 4, name: 'Горка', act: 'скатиться', note: 'Лестница, площадка, железный желоб.' },
      { n: 5, name: 'Помост', act: 'сесть', note: 'Сидя можно курить и пить, винтовка ложится рядом.' },
      { n: 6, name: 'Турник у сарая', act: 'подтянуться', note: 'Жёлтая рама и красный столб, как на снимке.' },
      { n: 7, name: 'Сарай с граффити', act: 'читать граффити, расставить банки', note: 'Банки на крыше — мишени для винтовки.' },
      { n: 8, name: 'Подстанция', act: 'подёргать дверь', note: 'Заперто, на двери предупреждение.' },
      { n: 9, name: 'Игровой комплекс', act: 'залезть на башню', note: 'С башни тоже можно стрелять и курить.' },
      { n: 10, name: 'Бурьян', act: 'обыскать', note: 'Иногда там сигареты или энергетик.' },
      { n: 11, name: 'Подъезды', act: 'позвонить в домофон', note: 'Домофон пищит, но двери пока заперты. На фото подъезды скрывают деревья.', added: true },
      { n: 12, name: 'Лавочка с урной', act: 'сесть', note: 'Из первого двора, поставил к подъезду.', added: true },
      { n: 13, name: 'Пятиэтажка слева', note: 'Белый силикатный кирпич, застеклённые лоджии.', decor: true },
      { n: 14, name: 'Пятиэтажка справа', note: 'Тот же предмет, жёлтый кирпич и красные балконы.', decor: true },
      { n: 15, name: 'Старая рама', note: 'Металлолом, просто стоит.', decor: true },
      { n: 16, name: 'Столб с фонарём', note: 'Провода идут к подстанции и к домам.', decor: true },
      { n: 17, name: 'Деревья', note: 'Ясени, клёны, берёзы, тополя и ива; кое-где листья уже желтеют.', decor: true },
      { n: 18, name: 'Сухое дерево', note: 'Голые ветки перед левым домом.', decor: true },
      { n: 19, name: 'Кусты', note: 'Сирень, бузина, лещина, шиповник с ягодами и поросль вдоль домов и у подстанции.', decor: true },
      { n: 20, name: 'Клумбы из шин', note: 'Покрашенные шины с бархатцами у подъезда.', decor: true, added: true }
    ],
    pins: [[1, 8.4, 53.3], [2, 12.4, 53.0], [3, 20.1, 49.6], [4, 25.2, 52.3], [5, 23.6, 56.4], [6, 30.6, 51.8], [7, 35.6, 51.4], [8, 44.8, 49.0], [9, 62.5, 49.2], [10, 55.6, 53.6],
    [13, 3.8, 37.3], [14, 71.2, 36.4], [15, 16.4, 56.8], [16, 51.2, 43.2], [17, 89, 42], [18, 9.4, 42.6], [19, 7.4, 73.3]],
    cards: [
      { title: 'Пятиэтажка', multi: () => [[INST.find((i) => i.n === 13)], [INST.find((i) => i.n === 14)]], tag: 'декор', type: 'block5' },
      { title: 'Подъезд', pick: () => [INST.find((i) => i.n === 13), ...byType('entrance'), ...byType('bench'), ...byType('urn')], focus: () => byType('entrance')[0], pad: 1.25, tag: 'домофон', type: 'entrance', act: true },
      { title: 'Подстанция', pick: () => byType('substation'), tag: 'дверь', type: 'substation', act: true },
      { title: 'Сарай с граффити', pick: () => byType('garage'), tag: 'граффити, банки', type: 'garage', act: true },
      { title: 'Игровой комплекс', pick: () => byType('towers'), tag: 'залезть', type: 'towers', act: true },
      { title: 'Качели', pick: () => [INST.find((i) => i.n === 1)], tag: 'покачаться', type: 'swing', act: true },
      { title: 'Турник', pick: () => byType('pullbar'), tag: 'подтянуться', type: 'pullbar', act: true },
      { title: 'Горка', pick: () => byType('slide'), tag: 'скатиться', type: 'slide', act: true },
      { title: 'Помост', pick: () => byType('platform'), tag: 'сесть', type: 'platform', act: true },
      { title: 'Баскетбольный щит', pick: () => byType('hoop'), tag: 'бросить мяч', type: 'hoop', act: true },
      { title: 'Столб с фонарём', pick: () => byType('pole'), tag: 'декор', type: 'pole' },
      { title: 'Деревья', multi: () => [[INST.find((i) => i.def.kind === 'ash')], [INST.find((i) => i.def.kind === 'birch')], [INST.find((i) => i.def.kind === 'willow')]], tag: 'декор', type: 'tree' },
      { title: 'Кусты', multi: () => [[INST.find((i) => i.def.kind === 'lilac')], [INST.find((i) => i.def.kind === 'dogrose')]], tag: 'декор', type: 'bush' },
      { title: 'Клумба из шин', pick: () => [byType('tires')[0]], tag: 'декор', type: 'tires' },
      { title: 'Бурьян', pick: () => [byType('grass')[2]], tag: 'обыскать', type: 'grass', act: true },
      { title: 'Лавочка и урна', pick: () => [...byType('bench'), ...byType('urn')], tag: 'сесть', type: 'bench', act: true }
    ],
    makeGround: (map) => {
      const W = map.size[0], Hh = map.size[1], g = [];
      const inE = (x, z, cx, cz, rx, rz) => ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2 <= 1;
      for (let z = 0; z < Hh; z++) {
        let row = '';
        for (let x = 0; x < W; x++) {
          const cx = x + 0.5, cz = z + 0.5;
          let c = '.';
          if (cx > 25.2 || (cz < 5.2 && cx > 12.6) || (cx < 4.2 && cz < 7)) c = ',';
          for (const o of map.objects) if (o.type === 'grass' && inE(cx, cz, o.at[0], o.at[1], o.rx + 0.7, o.rz + 0.7)) c = ',';
          for (const [ex, ez, rx, rz] of [[7.4, 21.6, 1.0, 1.7], [7.4, 25.8, 0.9, 0.8], [11.0, 11.8, 1.1, 0.7], [9.0, 18.7, 0.6, 0.9], [7.7, 18.4, 1.2, 0.8], [6.3, 7.6, 1.1, 0.7], [6.6, 13.7, 1.7, 0.6], [19.7, 12.9, 0.8, 0.8], [12.2, 18.7, 1.6, 0.6]]) if (inE(cx, cz, ex, ez, rx, rz)) c = ':';
          if (cz < 2 && cx > 13) c = '_';
          if (cx < 4 && cz > 7) c = '#';
          row += c;
        }
        g.push(row);
      }
      return g;
    },
    // power lines: pole → substation, pole → the far block's wall, pole → the near block's corner
    afterBuild: () => {
      const pole = byType('pole')[0], sub = byType('substation')[0];
      const pa = pole.built.attach.map((p) => xf(pole.M0, p)), sa = sub.built.attach.map((p) => xf(sub.M0, p));
      const runs = [];
      for (let i = 0; i < 3; i++) runs.push([pa[i], sa[i], 0.35]);
      runs.push([pa[0], [15.6, 6.4, 1.08], 0.45], [pa[2], [16.2, 6.4, 1.08], 0.45]);
      runs.push([pa[1], [2.12, 7.4, 9.6], 0.7]);
      instantiate({ type: 'wires', at: [0, 0], rot: 0, runs });
    },
    // which objects the data excerpt shows, and a line for the house
    dataTypes: ['swing', 'hoop', 'slide', 'platform', 'pullbar', 'garage', 'substation', 'towers', 'bench', 'pole'],
    dataNote: `  { n: 13, type: 'block5', at: [2, 29], rot: 90, len: 20, brick: '#d9d6ce', entr: [1, 4], … },`
  };
  // the location being played; locations.js switches it
  let MAP = YARD1;
  const groundType = (x, z) => { const r = MAP.ground[Math.floor(z)]; return r ? (r[Math.floor(x)] || '.') : '.'; };
