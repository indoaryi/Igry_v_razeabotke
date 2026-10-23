  // ================= the map: ground strings + a list of objects =================
  // Ground, one character per 1 m cell (row = z, column = x):
  //   .  lawn    ,  rough grass and weeds    :  trodden earth    #  asphalt    _  concrete apron
  const GROUND_KEY = { '.': 'газон', ',': 'бурьян, некошеная трава', ':': 'вытоптанная земля', '#': 'асфальт', '_': 'бетонная отмостка' };
  const MAP = {
    size: [30, 30],
    ground: null,   // filled from GROUND_ROWS below
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
      { n: 17, type: 'tree', kind: 'maple', at: [28.2, 13.0], seed: 109 },
      { n: 17, type: 'tree', kind: 'birch', at: [27.4, 17.0], seed: 110 },
      { n: 17, type: 'tree', kind: 'poplar', at: [28.6, 21.0], seed: 111 },
      { n: 17, type: 'tree', kind: 'ash', at: [28.8, 28.8], h: 9.2, seed: 112 },
      { n: 18, type: 'tree', kind: 'bare', at: [5.0, 27.6], seed: 113 },
      { n: 17, type: 'tree', kind: 'young', at: [16.8, 27.8], seed: 114 },
      { n: 19, type: 'bush', at: [13.2, 6.8], size: 1.0, seed: 301 },
      { n: 19, type: 'bush', at: [4.5, 8.4], size: 0.8, seed: 302 },
      { n: 19, type: 'bush', at: [23.0, 6.0], size: 1.2, seed: 303 },
      { n: 19, type: 'bush', at: [14.0, 13.7], size: 0.9, seed: 304 },
      { n: 19, type: 'bush', at: [29.0, 25.0], size: 1.3, seed: 305 },
      { n: 19, type: 'bush', at: [21.6, 29.3], size: 1.0, seed: 307 },
      { n: 19, type: 'bush', at: [4.6, 15.6], size: 0.7, seed: 308 },
      { type: 'curb', at: [4.0, 7.0], rot: -90, len: 23 }
    ]
  };
  // the ground rows are generated once from these shapes and then kept as plain strings
  function makeGroundRows() {
    const W = MAP.size[0], Hh = MAP.size[1], g = [];
    const inE = (x, z, cx, cz, rx, rz) => ((x - cx) / rx) ** 2 + ((z - cz) / rz) ** 2 <= 1;
    for (let z = 0; z < Hh; z++) {
      let row = '';
      for (let x = 0; x < W; x++) {
        const cx = x + 0.5, cz = z + 0.5;
        let c = '.';
        if (cx > 25.2 || (cz < 5.2 && cx > 12.6) || (cx < 4.2 && cz < 7)) c = ',';
        for (const o of MAP.objects) if (o.type === 'grass' && inE(cx, cz, o.at[0], o.at[1], o.rx + 0.7, o.rz + 0.7)) c = ',';
        for (const [ex, ez, rx, rz] of [[7.4, 21.6, 1.0, 1.7], [7.4, 25.8, 0.9, 0.8], [11.0, 11.8, 1.1, 0.7], [9.0, 18.7, 0.6, 0.9], [7.7, 18.4, 1.2, 0.8], [6.3, 7.6, 1.1, 0.7], [6.6, 13.7, 1.7, 0.6], [19.7, 12.9, 0.8, 0.8], [12.2, 18.7, 1.6, 0.6]]) if (inE(cx, cz, ex, ez, rx, rz)) c = ':';
        if (cz < 2 && cx > 13) c = '_';
        if (cx < 4 && cz > 7) c = '#';
        row += c;
      }
      g.push(row);
    }
    return g;
  }
  MAP.ground = makeGroundRows();
  const groundType = (x, z) => { const r = MAP.ground[Math.floor(z)]; return r ? (r[Math.floor(x)] || '.') : '.'; };

