// 조합 판정과 실행: 진화(무기 Lv 5 + 패시브), 무기 조합(둘 다 Lv 5), 패시브 조합(둘 다 Lv 5)
(function (G) {
  'use strict';

  function weapon(p, key) { return p.weapons.find((w) => w.key === key); }

  // 패시브를 가졌거나, 그 패시브가 들어간 패시브 조합을 가졌는지
  function hasPassive(p, key) {
    return !!p.passives[key] || p.fusions.some((f) => G.FUSIONS[f].contains.indexOf(key) !== -1);
  }

  function ready(p, c) {
    if (c.type === 'evolve') {
      const w = weapon(p, c.weapon);
      return !!w && w.level >= G.WEAPON_MAX && hasPassive(p, c.passive);
    }
    if (c.type === 'union') {
      return c.weapons.every((k) => { const w = weapon(p, k); return w && w.level >= G.WEAPON_MAX; });
    }
    return c.passives.every((k) => p.passives[k] >= G.PASSIVE_MAX);
  }

  G.findCombos = function (p) { return G.COMBOS.filter((c) => ready(p, c)); };

  G.comboResultInfo = function (c) {
    const def = c.type === 'fusion' ? G.FUSIONS[c.result] : G.WEAPONS[c.result];
    return { key: c.result, result: c.result, name: def.name, desc: def.desc, type: c.type, typeLabel: G.COMBO_TYPE_LABEL[c.type] };
  };

  G.applyCombo = function (game, c) {
    const p = game.player;
    if (c.type === 'evolve') {
      const w = weapon(p, c.weapon);
      w.key = c.result;
      w.level = 1;
      w.timer = 0.2;
      w.state = {};
    } else if (c.type === 'union') {
      const idx = p.weapons.findIndex((w) => w.key === c.weapons[0]);
      p.weapons = p.weapons.filter((w) => c.weapons.indexOf(w.key) === -1);
      p.weapons.splice(Math.min(idx, p.weapons.length), 0, { key: c.result, level: 1, timer: 0.2, state: {} });
    } else {
      c.passives.forEach((k) => { delete p.passives[k]; });
      p.fusions.push(c.result);
      G.recalcStats(game);
    }
    const info = G.comboResultInfo(c);
    G.announce(game, info.typeLabel + '! ' + info.name);
    G.burst(game, p.x, p.y, 'rgba(255, 210, 120, 0.95)', 46, 320, true);
    G.ring(game, p.x, p.y, 10, 300, 0.8, 'rgba(255, 214, 130, 0.95)', 8);
    G.screenFlash(game, '255, 220, 150', 0.35, 0.6);
    G.addShake(game, 6);
    return info;
  };

  // 조합 도감: 조합마다 재료 상태
  G.comboStatus = function (p) {
    return G.COMBOS.map((c) => {
      const parts = [];
      const done = c.type === 'fusion' ? p.fusions.indexOf(c.result) !== -1 : !!weapon(p, c.result);
      if (c.type === 'evolve') {
        const w = weapon(p, c.weapon);
        parts.push({ kind: 'weapon', key: c.weapon, name: G.WEAPONS[c.weapon].name, level: w ? w.level : 0, need: G.WEAPON_MAX, ok: !!w && w.level >= G.WEAPON_MAX });
        parts.push({ kind: 'passive', key: c.passive, name: G.PASSIVES[c.passive].name, level: p.passives[c.passive] || (hasPassive(p, c.passive) ? G.PASSIVE_MAX : 0), need: 1, ok: hasPassive(p, c.passive) });
      } else if (c.type === 'union') {
        c.weapons.forEach((k) => {
          const w = weapon(p, k);
          parts.push({ kind: 'weapon', key: k, name: G.WEAPONS[k].name, level: w ? w.level : 0, need: G.WEAPON_MAX, ok: !!w && w.level >= G.WEAPON_MAX });
        });
      } else {
        c.passives.forEach((k) => {
          parts.push({ kind: 'passive', key: k, name: G.PASSIVES[k].name, level: p.passives[k] || 0, need: G.PASSIVE_MAX, ok: p.passives[k] >= G.PASSIVE_MAX });
        });
      }
      return { combo: c, result: G.comboResultInfo(c), ready: !done && ready(p, c), done, parts };
    });
  };
})(window.G);
