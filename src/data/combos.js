// 조합표: 진화(무기 Lv 5 + 패시브 보유), 무기 조합(둘 다 Lv 5), 패시브 조합(둘 다 Lv 5)
(function (G) {
  'use strict';

  G.COMBOS = [
    { type: 'evolve', result: 'inferno', weapon: 'bolt', passive: 'haste' },
    { type: 'evolve', result: 'moonblade', weapon: 'sword', passive: 'might' },
    { type: 'evolve', result: 'queen', weapon: 'orb', passive: 'magnet' },
    { type: 'evolve', result: 'holylamp', weapon: 'aura', passive: 'vitality' },
    { type: 'evolve', result: 'storm', weapon: 'chain', passive: 'area' },
    { type: 'evolve', result: 'reaper', weapon: 'scythe', passive: 'swift' },
    { type: 'evolve', result: 'garden', weapon: 'poison', passive: 'regen' },
    { type: 'evolve', result: 'starfall', weapon: 'meteor', passive: 'luck' },
    { type: 'evolve', result: 'earthbell', weapon: 'bell', passive: 'armor' },
    { type: 'evolve', result: 'helltrap', weapon: 'trap', passive: 'wick' },
    { type: 'evolve', result: 'judgment', weapon: 'lance', passive: 'keeneye' },
    { type: 'evolve', result: 'mothswarm', weapon: 'moth', passive: 'lore' },
    { type: 'evolve', result: 'tempest', weapon: 'tornado', passive: 'cloak' },
    { type: 'evolve', result: 'dragonwhip', weapon: 'whip', passive: 'rage' },
    { type: 'evolve', result: 'winter', weapon: 'frost', passive: 'wick' },
    { type: 'evolve', result: 'bulwark', weapon: 'shield', passive: 'armor' },

    { type: 'union', result: 'thunderbolt', weapons: ['bolt', 'chain'] },
    { type: 'union', result: 'twinmoon', weapons: ['sword', 'scythe'] },
    { type: 'union', result: 'sun', weapons: ['orb', 'aura'] },

    { type: 'fusion', result: 'heart', passives: ['vitality', 'regen'] },
    { type: 'fusion', result: 'hellfire', passives: ['might', 'amount'] },
    { type: 'fusion', result: 'sands', passives: ['haste', 'swift'] },
  ];

  G.COMBO_TYPE_LABEL = { evolve: '진화', union: '무기 조합', fusion: '패시브 조합' };
})(window.G);
