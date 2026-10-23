  // ================= inventory =================
  const ITEMS = [
    { id: 'jacket', name: 'Кожаная куртка', note: 'Броня +1', slot: 'body' },
    { id: 'armor', name: 'Силовая броня', note: 'Броня +8, скорость −15%', slot: 'body' },
    { id: 'helmet', name: 'Шлем брони', note: 'Броня +3, в нём не покуришь', slot: 'head' },
    { id: 'rifle', name: 'Штурмовая винтовка', note: 'Урон 12, очередь по 3', slot: 'hands' },
    { id: 'cigs', name: 'Сигареты «Альде­бараан»', note: 'Спокойствие +2', use: true, count: 20 },
    { id: 'atom', name: 'Энергетик «ATOM»', note: 'Бодрость +5', use: true, count: 3 }
  ];
  const equip = { body: 'jacket', head: null, hands: 'rifle' };
  const itemById = (id) => ITEMS.find((i) => i.id === id);
  const isOn = (id) => equip.body === id || equip.head === id || equip.hands === id;
  let HERO = null, gearVer = 0;
  const armored = () => equip.body === 'armor';

