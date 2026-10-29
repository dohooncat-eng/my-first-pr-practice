// 패시브 능력과 레벨업 선택지
(function (G) {
  'use strict';

  G.PASSIVE_MAX = 5;

  G.PASSIVES = {
    vitality: {
      name: '튼튼한 몸', desc: '최대 체력 +20, 바로 20 회복',
      apply(p) { p.maxHp += 20; p.hp = Math.min(p.maxHp, p.hp + 20); },
    },
    swift: {
      name: '가벼운 발', desc: '이동 속도 +8%',
      apply(p) { p.stats.speed += 0.08; },
    },
    might: {
      name: '불꽃 심지', desc: '모든 피해 +10%',
      apply(p) { p.stats.damage += 0.1; },
    },
    haste: {
      name: '숙련', desc: '공격 대기 시간 -8%',
      apply(p) { p.stats.cooldown *= 0.92; },
    },
    magnet: {
      name: '끌림', desc: '경험치 흡수 범위 +30%',
      apply(p) { p.stats.magnet *= 1.3; },
    },
  };

  // 가중치를 두고 겹치지 않게 n개 고른다
  G.buildChoices = function (player, n) {
    const pool = [];
    Object.keys(G.WEAPONS).forEach((key) => {
      const owned = player.weapons.find((w) => w.key === key);
      if (!owned) pool.push({ kind: 'weapon', key, level: 1, weight: 1.1 });
      else if (owned.level < G.WEAPON_MAX) pool.push({ kind: 'weapon', key, level: owned.level + 1, weight: 1.5 });
    });
    Object.keys(G.PASSIVES).forEach((key) => {
      const lv = player.passives[key] || 0;
      if (lv < G.PASSIVE_MAX) pool.push({ kind: 'passive', key, level: lv + 1, weight: 1 });
    });

    const choices = [];
    while (choices.length < n && pool.length) {
      const total = pool.reduce((s, c) => s + c.weight, 0);
      let r = Math.random() * total;
      let i = 0;
      while (r > pool[i].weight) { r -= pool[i].weight; i++; }
      choices.push(pool.splice(Math.min(i, pool.length - 1), 1)[0]);
    }
    if (choices.length < n) choices.push({ kind: 'heal', key: 'heal', level: 0 });
    return choices;
  };

  G.applyChoice = function (game, c) {
    const p = game.player;
    if (c.kind === 'weapon') {
      const owned = p.weapons.find((w) => w.key === c.key);
      if (owned) owned.level = c.level;
      else G.addWeapon(p, c.key);
    } else if (c.kind === 'passive') {
      p.passives[c.key] = c.level;
      G.PASSIVES[c.key].apply(p);
    } else {
      G.healPlayer(game, 40);
    }
  };

  // 카드에 보일 글
  G.describeChoice = function (c) {
    if (c.kind === 'weapon') {
      const def = G.WEAPONS[c.key];
      return {
        title: def.name,
        tag: c.level === 1 ? '새 무기' : 'Lv ' + c.level,
        isNew: c.level === 1,
        text: c.level === 1 ? def.desc : def.notes[c.level - 1],
        icon: c.key,
      };
    }
    if (c.kind === 'passive') {
      const def = G.PASSIVES[c.key];
      return {
        title: def.name,
        tag: c.level === 1 ? '새 능력' : 'Lv ' + c.level,
        isNew: c.level === 1,
        text: def.desc,
        icon: c.key,
      };
    }
    return { title: '약초', tag: '회복', isNew: false, text: '체력을 40 회복합니다.', icon: 'heal' };
  };
})(window.G);
