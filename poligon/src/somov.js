  // ================= the second person on the range: warrant officer Somov, testing a sealed protective kit =================
  // He is the engine's person (engine/src/people): stands by the walking suits, notices the hero, talks, follows, trades.
  // His kit is the engine's КЗУ look, built after the player's sketch (camouflage, a sealed helmet with a smoked visor, a respirator,
  // a hose to the life-support box on his back, a radio with a whip antenna).
  import { sparkleAround } from '../../engine/src/fx/fx2d.js';
  import { MONEY } from '../../engine/src/people/items.js';
  import { KZU_LOOK } from '../../engine/src/people/look.js';
  import { PEOPLE_HOOKS, addPerson, atHome, personFollow, personHome, personWait } from '../../engine/src/people/people.js';
  import { DIALOGS, talkSeen } from '../../engine/src/people/talk.js';
  import { openTrade } from '../../engine/src/people/trade.js';
  import { gearCheck } from './things.js';
  const modeOf = (p) => p.mode === 'talk' ? p.prevMode : p.mode;
  export const SOMOV = addPerson({
    id: 'somov', name: 'Прапорщик Сомов', short: 'прапорщик Сомов', look: KZU_LOOK, loc: 'range', at: [15.4, 16.9], yaw: -0.1,
    note: 'Испытывает защитный комплект. Говорит через динамик на груди.',
    dialog: 'somov',
    inv: [{ t: MONEY, n: 400 }, { t: 'medkit', n: 2 }, { t: 'stew', n: 3 }, { t: 'filter', n: 4 }, { t: 'battery', n: 6 }, { t: 'grenade', n: 6 }, { t: 'torch', n: 1 }, { t: 'cigs', n: 20 }, { t: 'drink', n: 3 }],
    trade: {
      buy: 0.6, sell: 1,
      wants: (t) => t === 'armor' ? 'Броню не возьму: я в своём-то комплекте еле хожу.' : t === 'scrap' ? 'Бумажки не беру, у меня своих хватает.' : true,
      says: {
        open: 'Только по-честному. Прапорщик своё отдаёт со скрипом.',
        done: ['По рукам.', 'Приятно иметь дело.', 'Забирай. Я не видел, ты не видел.']
      }
    },
    barks: {
      hello: (p) => (p.greeted = (p.greeted || 0) + 1) === 1 ? 'Здравия желаю.' : ['Бу-бу… Тьфу ты, динамик. Здравия желаю!', 'А, это снова ты.', 'Здравия желаю.'][p.greeted % 3],
      follow: ['Иду.', 'Есть, за тобой.', 'Веди.'],
      wait: ['Жду здесь.', 'Есть ждать.'],
      home: ['Пошёл на место.', 'Есть на место.'],
      sit: ['Перекур? Я рядом посижу. Курить всё равно не могу.', 'Посидим.'],
      arrive: (p, loc) => loc.id === 'edge' ? 'Опушка. Тишина, листья — фильтр отдыхает.' : 'Полигон. Родные бочки.',
      idle: ['Шланг давит на плечо. Терпимо.', 'В шлеме слышно, как сам дышишь.', 'Фильтр сипит — значит, работает.', 'Жарко в нём, как в бане.']
    }
  });
  // what the hero can ask him, at almost any point of the talk
  const somovHub = (p) => [
    { say: 'Как тебе в этом комплекте?', to: 'suit', when: () => !talkSeen(p, 'suit') },
    { say: 'Что тут за полигон?', to: 'range', when: () => !talkSeen(p, 'range') },
    { say: 'Как тебя в нём кормят?', to: 'food', when: () => talkSeen(p, 'suit') && !talkSeen(p, 'food') },
    { say: 'Что у тебя есть на обмен?', run: openTrade, to: 'shop' },
    { say: 'Пойдём со мной.', run: personFollow, to: 'follow', when: () => modeOf(p) !== 'follow' },
    { say: 'Подожди здесь.', run: personWait, to: 'wait', when: () => modeOf(p) === 'follow' },
    { say: 'Ступай на своё место.', run: personHome, to: 'home', when: () => !atHome(p) && modeOf(p) !== 'home' },
    { say: 'Бывай.' }
  ];
  DIALOGS.somov = {
    start: (p) => talkSeen(p, 'hello') ? 'again' : 'hello',
    nodes: {
      hello: {
        say: '«Бу-бу… бу-бу-бу!» Он стучит по коробке на груди, в шлеме щёлкает динамик. — Так слышно? Прапорщик Сомов. Испытываю защитный комплект, третьи сутки не снимаю.',
        opts: (p) => [{ say: 'Третьи сутки? И как оно?', to: 'suit' }, ...somovHub(p).filter((o) => o.to !== 'suit')]
      },
      again: { say: ['Слушаю.', 'Чего хотел?', 'Снова ты. Говори, только громко — в шлеме плохо слышно.'], opts: somovHub },
      suit: {
        say: 'Жарко, как в бане. Зато ни пыль, ни газ не берут. Фильтры меняю каждые шесть часов. Запасные есть — могу уступить.',
        opts: (p) => [{ say: 'А стекло выдержит?', to: 'glass', when: () => !talkSeen(p, 'glass') }, ...somovHub(p)]
      },
      glass: { say: 'Осколок с десяти метров держит. Проверяли на мне, между прочим. Я расписался, что не возражаю.', opts: somovHub },
      range: { say: 'Седьмой испытательный. Гоняют шагающие костюмы. ИБК-3 старый, надёжный, как утюг. А «тридцать второй» — экспериментальный, у него вся морда открывается. Полезешь — не урони, мне за него отвечать.', opts: somovHub },
      food: { say: 'Через трубку. Сегодня давали борщ. Через фильтр он, правда, на вкус как фильтр.', opts: somovHub },
      shop: { say: 'Смотри, выбирай. Что ещё?', opts: somovHub },
      follow: { say: ['Мне всё равно положено ходить — проверять комплект на марше. Веди.', 'Есть. Я за тобой.'], opts: [{ say: 'Тогда за мной.' }] },
      wait: { say: 'Жду здесь. Только недолго: фильтр на шесть часов.', opts: [{ say: 'Я скоро.' }] },
      home: { say: 'Есть вернуться на место. Если что — я у костюмов.', opts: [{ say: 'Бывай.' }] }
    }
  };
  // a deal: clothes he sold come off, the panels redraw
  PEOPLE_HOOKS.traded.push(() => { if (gearCheck()) sparkleAround(); });
