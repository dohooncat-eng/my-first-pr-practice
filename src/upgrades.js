// 레벨업 선택지: 칸 제한(무기 6·패시브 6)을 지키며 가중치로 고른다
(function (G) {
  'use strict';

  G.passiveSlotsUsed = function (p) { return Object.keys(p.passives).length + p.fusions.length; };

  // 이 기본 무기가 이미 진화·조합 재료로 쓰였는지
  function consumed(p, key) {
    return p.weapons.some((w) => {
      const from = G.WEAPONS[w.key].from;
      return from === key || (Array.isArray(from) && from.indexOf(key) !== -1);
    });
  }

  function passiveInFusion(p, key) {
    return p.fusions.some((f) => G.FUSIONS[f].contains.indexOf(key) !== -1);
  }

  G.buildChoices = function (game, n) {
    const p = game.player;
    const pool = [];
    const weaponSlotFree = p.weapons.length < G.WEAPON_SLOTS;
    const passiveSlotFree = G.passiveSlotsUsed(p) < G.PASSIVE_SLOTS;

    Object.keys(G.WEAPONS).forEach((key) => {
      if (!G.isBaseWeapon(key)) return;
      const owned = p.weapons.find((w) => w.key === key);
      if (owned) {
        if (owned.level < G.WEAPON_MAX) pool.push({ kind: 'weapon', key, level: owned.level + 1, weight: 1.5 });
      } else if (weaponSlotFree && !consumed(p, key)) {
        pool.push({ kind: 'weapon', key, level: 1, weight: 1 });
      }
    });
    Object.keys(G.PASSIVES).forEach((key) => {
      if (passiveInFusion(p, key)) return;
      const lv = p.passives[key] || 0;
      if (lv > 0 && lv < G.PASSIVE_MAX) pool.push({ kind: 'passive', key, level: lv + 1, weight: 1.1 });
      else if (lv === 0 && passiveSlotFree) pool.push({ kind: 'passive', key, level: 1, weight: 0.9 });
    });

    const choices = [];
    while (choices.length < n && pool.length) {
      const total = pool.reduce((s, c) => s + c.weight, 0);
      let r = Math.random() * total;
      let i = 0;
      while (i < pool.length - 1 && r > pool[i].weight) { r -= pool[i].weight; i++; }
      choices.push(pool.splice(i, 1)[0]);
    }
    // 더 올릴 게 없으면 회복·금화
    if (choices.length < n) choices.push({ kind: 'heal', key: 'heal', level: 0 });
    if (choices.length < n) choices.push({ kind: 'gold', key: 'gold', level: 0 });
    return choices;
  };

  G.applyChoice = function (game, c) {
    const p = game.player;
    if (c.kind === 'weapon') {
      const owned = p.weapons.find((w) => w.key === c.key);
      if (owned) owned.level = c.level;
      else G.addWeapon(p, c.key, 1);
    } else if (c.kind === 'passive') {
      p.passives[c.key] = c.level;
      G.recalcStats(game);
    } else if (c.kind === 'heal') {
      G.healPlayer(game, 40);
    } else if (c.kind === 'gold') {
      game.runGold += 25;
    }
  };

  // 이 선택이 조합에 어떻게 이어지는지 한 줄
  function comboHint(p, c) {
    if (c.kind === 'weapon') {
      for (const cb of G.COMBOS) {
        if (cb.type === 'evolve' && cb.weapon === c.key && c.level === G.WEAPON_MAX) {
          const has = p.passives[cb.passive] || passiveInFusion(p, cb.passive);
          return has ? '상자를 열면 ' + G.WEAPONS[cb.result].name + '(으)로 진화' : G.PASSIVES[cb.passive].name + ' 있으면 진화';
        }
        if (cb.type === 'union' && cb.weapons.indexOf(c.key) !== -1 && c.level === G.WEAPON_MAX) {
          const other = cb.weapons[0] === c.key ? cb.weapons[1] : cb.weapons[0];
          const ow = p.weapons.find((w) => w.key === other);
          if (ow && ow.level === G.WEAPON_MAX) return '상자를 열면 ' + G.WEAPONS[cb.result].name + '(으)로 조합';
        }
      }
    } else if (c.kind === 'passive') {
      for (const cb of G.COMBOS) {
        if (cb.type === 'evolve' && cb.passive === c.key && c.level === 1) {
          const w = p.weapons.find((x) => x.key === cb.weapon);
          if (w) return G.WEAPONS[cb.weapon].name + ' 진화 재료';
        }
        if (cb.type === 'fusion' && cb.passives.indexOf(c.key) !== -1 && c.level === G.PASSIVE_MAX) {
          const other = cb.passives[0] === c.key ? cb.passives[1] : cb.passives[0];
          if (p.passives[other] === G.PASSIVE_MAX) return '상자를 열면 ' + G.FUSIONS[cb.result].name + '(으)로 조합';
        }
      }
    }
    return '';
  }

  G.describeChoice = function (c) {
    const p = G.game.player;
    if (c.kind === 'weapon') {
      const def = G.WEAPONS[c.key];
      return {
        title: def.name, tag: c.level === 1 ? '새 무기' : 'Lv ' + c.level, isNew: c.level === 1,
        text: c.level === 1 ? def.desc : def.notes[c.level - 1], icon: c.key, comboHint: comboHint(p, c),
        level: c.level, max: G.WEAPON_MAX,
      };
    }
    if (c.kind === 'passive') {
      const def = G.PASSIVES[c.key];
      return {
        title: def.name, tag: c.level === 1 ? '새 능력' : 'Lv ' + c.level, isNew: c.level === 1,
        text: def.desc, icon: c.key, comboHint: comboHint(p, c), level: c.level, max: G.PASSIVE_MAX,
      };
    }
    if (c.kind === 'gold') {
      return { title: '금화 주머니', tag: '금화', isNew: false, text: '금화 25개를 얻습니다.', icon: 'heal', comboHint: '' };
    }
    return { title: '약초', tag: '회복', isNew: false, text: '체력을 40 회복합니다.', icon: 'heal', comboHint: '' };
  };
})(window.G);
