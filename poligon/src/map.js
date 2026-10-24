  // ================= the test range: two locations that between them show everything the engine can do =================
  // Ground, one character per 1 m cell (row = z, column = x):  .  lawn   ,  weeds   :  trodden earth   #  asphalt   _  concrete
  // The ground here is painted from rectangles (later ones win), not typed out row by row: the range is 36 × 28 m.
  function groundFrom(W, H, base, rects) {
    const g = [];
    for (let z = 0; z < H; z++) {
      let row = '';
      for (let x = 0; x < W; x++) {
        const cx = x + 0.5, cz = z + 0.5;
        let c = base;
        for (const [ch, x0, z0, x1, z1] of rects) if (cx >= x0 && cx < x1 && cz >= z0 && cz < z1) c = ch;
        row += c;
      }
      g.push(row);
    }
    return g;
  }
  // the range: a five-storey hostel along the left edge, the walking suits on a concrete pad, a firing line facing a row of targets,
  // a watchtower by the line, a substation, a container and barrels along the back, a guard booth at the gate, a grove in the far corner
  const RANGE = {
    id: 'range', name: 'Испытательный полигон', short: 'Полигон',
    size: [36, 28],
    sunAt: 14,
    arrival: 'Костюмы на площадке, мишени подняты.',
    makeGround: () => groundFrom(36, 28, '.', [
      [',', 0, 0, 12, 10], [',', 0, 0, 36, 2.6], [',', 31, 0, 36, 28],             // weeds in the grove, along the back and the right edge
      [':', 21, 4.4, 34.5, 14.5], [',', 21, 8.5, 22.2, 14.5], [',', 33.6, 8.5, 34.5, 14.5],    // the range: trodden earth, weeds only at its sides
      ['#', 1.5, 8, 5.2, 28], ['#', 5.2, 22.5, 21, 25.5], ['#', 17, 21, 21, 28],     // parking along the hostel, the road to the gate
      ['_', 1.5, 11.5, 2.3, 26.5],                                                    // the apron under the hostel
      ['_', 7, 11, 15.5, 19.6],                                                       // the pad for the suits
      ['_', 21, 14.5, 34.5, 16.2], ['_', 18.2, 11.4, 21.8, 15.6],                     // the firing line, the foot of the tower
      [':', 15.5, 14.4, 18.2, 15.6]
    ]),
    paths: [
      [[2.4, 19.2], [4.8, 18.4], [7.0, 16.0]],
      [[15.5, 15.0], [17.0, 15.1], [18.2, 14.6]],
      [[19.0, 21.2], [19.4, 18.6], [20.0, 16.2]],
      [[8.6, 10.8], [8.0, 7.6], [6.9, 5.9]]
    ],
    objects: [
      { n: 1, type: 'block5', at: [1.5, 26.6], rot: 90, len: 14.6, brick: '#d8cfbf', brick2: '#c8bea9', panel: '#7e8f6a', panel2: '#5b4a3a', frame: '#e8e4da', entr: [1, 3], balc: [0, 2, 4], seed: 77 },
      { n: 2, type: 'substation', at: [16.0, 1.2], rot: 0 },
      { n: 3, type: 'pole', at: [17.2, 9.6], rot: 0 },
      { n: 4, type: 'container', at: [27.4, 1.5], rot: 90, color: '#3d6f8e' },
      { n: 4, type: 'container', at: [33.3, 4.6], rot: 0, color: '#8e4a33', seed: 722 },
      { n: 5, type: 'barrels', at: [31.0, 7.6], n: 3, lying: true, seed: 731 },
      { n: 5, type: 'barrels', at: [12.6, 3.6], n: 2, seed: 732, cols: ['#4f5d6a', '#7a3d2c'] },
      { n: 6, type: 'concrete', at: [24.6, 3.5], rot: 0, len: 4.8, rows: 2, seed: 741 },
      { n: 6, type: 'concrete', at: [29.6, 3.5], rot: 0, len: 4.8, rows: 2, seed: 742 },
      { n: 6, type: 'concrete', at: [19.6, 19.6], rot: 90, len: 2.4, rows: 1, seed: 743 },
      ...[[23.0, 'tgtRings'], [25.6, 'tgtMan'], [28.2, 'tgtRings'], [30.8, 'tgtMan'], [33.2, 'tgtRings']].map(([x, face], i) => ({ n: 7, type: 'target', at: [x, 5.6 + (i % 2) * 1.6], rot: 0, face, seed: 701 + i })),
      { n: 8, type: 'watchtower', at: [20.0, 12.6], rot: 0 },
      { n: 9, type: 'booth', at: [14.4, 21.2], rot: 0 },
      { n: 10, type: 'sign', at: [10.4, 25.6], rot: 0 },
      { n: 11, type: 'metalgarage', at: [4.4, 4.6], rot: 0, color: '#6a6e4a' },
      { n: 12, type: 'car', kind: 'boxy', color: '#5f6a4c', at: [3.5, 12.6], rot: -90, seed: 801, rim: '#3b3d40', look: 'Армейский внедорожник. В бардачке путевой лист и фонарик.' },
      { n: 12, type: 'car', kind: 'sedan', color: '#c9c3b2', at: [3.6, 22.4], rot: -90, seed: 802, look: 'Старый седан коменданта. На сиденье журнал испытаний.' },
      { n: 13, type: 'bench', at: [6.4, 20.2], rot: 0 },
      { n: 13, type: 'bench', at: [9.2, 21.6], rot: -90 },
      { n: 13, type: 'urn', at: [7.6, 21.0], rot: 0 },
      { n: 14, type: 'tires', at: [5.7, 9.4], rot: 0, count: 3, seed: 93 },
      { n: 15, type: 'curbstones', at: [5.2, 8.0], rot: -90, len: 14.5, seed: 811 },
      { n: 16, type: 'tree', kind: 'ash', at: [2.4, 2.8], seed: 821 },
      { n: 16, type: 'tree', kind: 'birch', at: [9.6, 1.6], seed: 822 },
      { n: 16, type: 'tree', kind: 'maple', at: [8.6, 7.0], seed: 823 },
      { n: 16, type: 'tree', kind: 'young', at: [1.4, 7.6], seed: 824 },
      { n: 16, type: 'tree', kind: 'poplar', at: [21.2, 1.3], seed: 825 },
      { n: 16, type: 'tree', kind: 'birch', at: [35.2, 0.9], seed: 826 },
      { n: 16, type: 'tree', kind: 'bare', at: [12.6, 8.6], seed: 828 },
      { n: 16, type: 'tree', kind: 'birch', at: [7.0, 26.6], h: 9, seed: 829 },
      { n: 17, type: 'bush', kind: 'lilac', at: [2.6, 9.6], size: 0.9, seed: 831 },
      { n: 17, type: 'bush', kind: 'elder', at: [11.0, 5.2], size: 1.0, seed: 832 },
      { n: 17, type: 'bush', kind: 'hazel', at: [6.6, 1.4], size: 1.1, seed: 833 },
      { n: 17, type: 'bush', kind: 'dogrose', at: [17.0, 18.2], size: 0.9, seed: 834 },
      { n: 17, type: 'bush', kind: 'shoots', at: [33.6, 13.6], size: 0.8, seed: 835 },
      { n: 17, type: 'bush', kind: 'lilac', at: [12.0, 26.6], size: 1.0, seed: 836 },
      { n: 17, type: 'bush', kind: 'elder', at: [33.8, 24.6], size: 1.0, seed: 837 },
      { n: 18, type: 'grass', at: [21.4, 9.6], rx: 0.9, rz: 1.4, seed: 841, dry: 0.5 },
      { n: 18, type: 'grass', at: [34.8, 12.0], rx: 1.0, rz: 1.8, seed: 842, dry: 0.6 },
      { n: 18, type: 'grass', at: [5.4, 7.2], rx: 1.3, rz: 0.9, seed: 843 },
      { n: 18, type: 'grass', at: [27.0, 25.0], rx: 1.6, rz: 1.1, seed: 844, dry: 0.4 },
      { n: 18, type: 'grass', at: [14.0, 5.8], rx: 1.0, rz: 1.4, seed: 845, dry: 0.55 }
    ],
    // power lines: from the lamp post to the substation
    afterBuild: () => {
      const pole = byType('pole')[0], sub = byType('substation')[0];
      const pa = pole.built.attach.map((p) => xf(pole.M0, p)), sa = sub.built.attach.map((p) => xf(sub.M0, p));
      instantiate({ type: 'wires', at: [0, 0], rot: 0, runs: [0, 1, 2].map((i) => [pa[i], sa[i], 0.35]) });
    },
    machines: [{ n: 19, kind: 'ibk3', at: [9.6, 14.2], yaw: Math.PI / 2 }, { n: 20, kind: 'b32', at: [13.2, 16.8], yaw: Math.PI / 4 }],
    spawns: {
      start: { at: [14.6, 19.2], yaw: -2.5 },
      fromEdge: { at: [19.0, 27.4], yaw: Math.PI, walk: [19.0, 24.0] }
    },
    exits: [{ to: 'edge', rect: [17.0, 27.2, 21.0, 28], go: [19.0, 27.6], arrive: 'fromRange' }],
    intercom: 'Домофон хрипит: «Испытатели? Ужин в восемь».'
  };

  // the forest edge behind the gate: birches and ashes, bushes, weeds, an abandoned garage, an old car, leaves on the grass
  const EDGE_TREES = [[3.2, 3.0, 'birch', 9.5], [7.8, 1.8, 'ash', 0], [12.6, 2.6, 'birch', 10], [17.4, 1.6, 'poplar', 0], [22.6, 2.8, 'birch', 9],
    [2.2, 8.6, 'maple', 0], [2.6, 14.6, 'willow', 0], [3.0, 19.6, 'birch', 8.5], [9.6, 9.0, 'young', 0], [24.2, 4.6, 'ash', 0], [14.6, 7.4, 'bare', 0]];
  function edgeLeaves(x, z) {
    let d = 0.18;
    for (const [tx, tz, kind] of EDGE_TREES) if (kind !== 'bare') { const q = 1 - ((x - tx) ** 2 + (z - tz) ** 2) / 30; if (q > 0) d = Math.max(d, 0.2 + 0.75 * q); }
    return clamp(d, 0, 1);
  }
  const EDGE = {
    id: 'edge', name: 'Опушка за воротами', short: 'Опушка',
    size: [26, 22],
    sun: [0.78, 0.55, -0.2], light: 'right', sunAt: 16.3,       // a low sun from the right: long shadows across the grass
    arrival: 'За воротами тихо, только листья.',
    makeGround: () => groundFrom(26, 22, '.', [
      [',', 0, 0, 26, 4.2], [',', 0, 0, 5.2, 22], [',', 20, 8, 26, 22],
      ['#', 17, 0, 21, 1.6], [':', 17.4, 1.6, 20.6, 3.0],
      [':', 9.4, 13.6, 14.2, 17.6]
    ]),
    style: { leaves: edgeLeaves, leafMax: 0.12, litter: ['bench', 'urn'] },
    leafRate: 2.4,
    paths: [
      [[19.0, 2.6], [18.0, 6.4], [15.2, 10.8], [12.4, 14.8], [8.0, 18.6], [5.6, 21.6]],
      [[15.2, 10.8], [19.6, 12.6], [22.4, 17.2]]
    ],
    objects: [
      ...EDGE_TREES.map(([x, z, kind, h], i) => ({ n: 1, type: 'tree', kind, at: [x, z], h: h || undefined, seed: 901 + i })),
      { n: 2, type: 'metalgarage', at: [8.4, 5.6], rot: 30, color: '#7a3a2b', seed: 951 },
      { n: 3, type: 'car', kind: 'hatch', color: '#8a8f76', at: [16.4, 16.6], rot: 64, seed: 952, look: 'Брошенный хэтчбек. В багажнике ржавые гильзы и старая каска.' },
      { n: 4, type: 'barrels', at: [11.4, 3.6], n: 4, lying: true, seed: 953 },
      { n: 5, type: 'bench', at: [10.6, 12.6], rot: 140 },
      { n: 5, type: 'urn', at: [9.6, 11.9], rot: 0 },
      { n: 6, type: 'bush', kind: 'hazel', at: [5.6, 6.0], size: 1.2, seed: 961 },
      { n: 6, type: 'bush', kind: 'lilac', at: [21.0, 6.6], size: 1.0, seed: 962 },
      { n: 6, type: 'bush', kind: 'dogrose', at: [6.0, 16.6], size: 1.0, seed: 963 },
      { n: 6, type: 'bush', kind: 'elder', at: [24.0, 19.6], size: 1.1, seed: 964 },
      { n: 6, type: 'bush', kind: 'shoots', at: [13.8, 19.8], size: 0.9, seed: 965 },
      { n: 7, type: 'grass', at: [6.6, 11.6], rx: 1.6, rz: 1.2, seed: 971, dry: 0.6 },
      { n: 7, type: 'grass', at: [20.8, 10.2], rx: 1.4, rz: 1.0, seed: 972, dry: 0.5 },
      { n: 7, type: 'grass', at: [12.2, 9.0], rx: 1.0, rz: 0.8, seed: 973, dry: 0.7 },
      { n: 7, type: 'grass', at: [17.8, 20.0], rx: 1.5, rz: 1.0, seed: 974, dry: 0.4 }
    ],
    spawns: {
      start: { at: [19.0, 3.6], yaw: 0.4 },
      fromRange: { at: [19.0, 0.5], yaw: 0, walk: [18.8, 3.8] }
    },
    exits: [{ to: 'range', rect: [17.0, 0, 21.0, 0.8], go: [19.0, 0.4], arrive: 'fromEdge' }]
  };
  LOCATIONS.range = RANGE;
  LOCATIONS.edge = EDGE;
