  // ================= catalog, part two: what the yard with birches needs =================
  // golden weeping birches, a young rowan, autumn grass
  TREE.birchGold = { h: 13, bole: 3.0, r0: 0.21, w: 2.9, up: 0.8, limbs: 6, cl: [0.2, 0.36], per: 2.3, dens: 17, leaf: '#c9a13a', aut: '#7b8a3c', af: 0.14, bark: '#e3e0d8', birch: true, droop: 0.95, weep: 0.75, solid: 0.34 };
  TREE.rowan = { h: 4.8, bole: 1.3, r0: 0.09, w: 1.7, up: 0.6, limbs: 4, cl: [0.2, 0.34], per: 1.8, dens: 12, leaf: '#a29c3f', aut: '#c4532a', af: 0.32, bark: '#6d6259', solid: 0.36 };
  const MEADOW_AUTUMN = {
    lawn: tuftMat('#5e6c34', '#ab9c59', 0.16), lush: tuftMat('#56682f', '#ab9c59', 0.1),
    rough: tuftMat('#6a6935', '#bba962', 0.42), dry: tuftMat('#8a8248', '#c9b66d', 0.7)
  };

  // blinking indicators while a car alarm screams
  const ALARM_MAT = Object.assign(flat('#ffb23d', 4), { fl: 1, noShadow: true });
  function carLightItems() {
    const out = [];
    for (const c of byType('car')) {
      if (!(c.dyn.alarm > 0) || (Math.floor(c.dyn.alarm * 3) & 1)) continue;
      for (const p of c.built.lights) out.push({ mesh: getMesh('alarmLamp', () => box(0.06, 0.045, 0.045)), model: M(c.M0, tr(...p)), mat: ALARM_MAT, id: c.id, flags: 3 });
    }
    return out;
  }
