// 상자: 조합 조건이 맞으면 무조건 하나 조합하고, 나머지는 확률로 1~5개 강화
(function (G) {
  'use strict';

  // 강화 개수 1~5의 기본 확률
  G.CHEST_ODDS = [0.5, 0.25, 0.13, 0.08, 0.04];

  // 행운이 높을수록 많은 쪽의 비중이 커진다 (행운 1이면 기본 확률 그대로)
  G.rollChestCount = function (luck) {
    const w = G.CHEST_ODDS.map((p, i) => p * Math.pow(luck || 1, i));
    const total = w.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < w.length; i++) {
      if ((r -= w[i]) < 0) return i + 1;
    }
    return w.length;
  };

  function upgradeTargets(p) {
    const list = [];
    p.weapons.forEach((w) => {
      if (G.isBaseWeapon(w.key) && w.level < G.WEAPON_MAX) list.push({ kind: 'weapon', key: w.key });
    });
    Object.keys(p.passives).forEach((k) => {
      if (p.passives[k] < G.PASSIVE_MAX) list.push({ kind: 'passive', key: k });
    });
    return list;
  }

  // 상자를 열고 결과를 바로 적용한 뒤, 화면에 보여 줄 내용을 돌려준다
  G.openChest = function (game) {
    const p = game.player;
    const count = G.rollChestCount(p.stats.luck);
    const result = { combo: null, upgrades: [], count, gold: 0 };
    let left = count;

    const combos = G.findCombos(p);
    if (combos.length) {
      result.combo = G.applyCombo(game, G.pick(combos));
      left--;
    }
    for (let i = 0; i < left; i++) {
      const targets = upgradeTargets(p);
      if (!targets.length) {
        result.gold += 20;
        continue;
      }
      const t = G.pick(targets);
      if (t.kind === 'weapon') {
        const w = p.weapons.find((x) => x.key === t.key);
        result.upgrades.push({ kind: 'weapon', key: t.key, name: G.WEAPONS[t.key].name, from: w.level, to: w.level + 1 });
        w.level++;
      } else {
        const from = p.passives[t.key];
        p.passives[t.key] = from + 1;
        result.upgrades.push({ kind: 'passive', key: t.key, name: G.PASSIVES[t.key].name, from, to: from + 1 });
      }
    }
    game.runGold += result.gold;
    G.recalcStats(game);
    return result;
  };
})(window.G);
