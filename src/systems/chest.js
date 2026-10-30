// 상자: 조합 조건이 맞으면 열기 전에 어떤 조합(메인)을 할지 고르고, 나머지는 확률로 1~5개 강화
// 엘리트 상자는 나무에서, 보스 상자는 은에서 시작하고 강화 개수가 많으면 등급이 오른다(3~4개 은, 5개 금).
(function (G) {
  'use strict';

  // 강화 개수 1~5의 기본 확률
  G.CHEST_ODDS = [0.4, 0.22, 0.2, 0.1, 0.08];
  G.CHEST_MAX = 5;
  G.BOSS_CHEST_MIN = 3;
  G.CHEST_TIERS = ['wood', 'silver', 'gold'];

  G.chestTierFor = function (count) { return count >= 5 ? 'gold' : count >= 3 ? 'silver' : 'wood'; };

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
      // Lv 5·10은 갈래를 골라야 하므로 상자로는 올리지 않는다
      if (G.isBaseWeapon(w.key) && w.level < G.WEAPON_MAX && w.level !== 4 && w.level !== 9) list.push({ kind: 'weapon', key: w.key });
    });
    Object.keys(p.passives).forEach((k) => {
      if (p.passives[k] < G.PASSIVE_MAX) list.push({ kind: 'passive', key: k });
    });
    return list;
  }

  // 상자를 열고 결과를 바로 적용한 뒤, 화면에 보여 줄 내용을 돌려준다
  // 상자를 열기 전에 고를 수 있는 조합들 (새 조합 + 예전 진화·조합)
  G.comboChoiceOptions = function (p) {
    return G.xcomboOptions(p).concat(G.findCombos(p).map((c) => ({ kind: 'oldcombo', combo: c })));
  };

  // choice: 사용자가 고른 조합(없으면 조합하지 않음)
  G.openChest = function (game, source, choice) {
    const p = game.player;
    let count = G.rollChestCount(p.stats.luck);
    if (source === 'boss') count = Math.max(G.BOSS_CHEST_MIN, count);
    count = Math.min(G.CHEST_MAX, count + (p.stats.chestBonus || 0));
    const startTier = source === 'boss' ? 'silver' : 'wood';
    const tier = G.CHEST_TIERS[Math.max(G.CHEST_TIERS.indexOf(startTier), G.CHEST_TIERS.indexOf(G.chestTierFor(count)))];
    const result = { combo: null, upgrades: [], count, gold: 0, source: source || 'elite', startTier, tier };
    let left = count;

    if (choice && choice.kind === 'xcombo') { result.combo = G.applyXcombo(game, choice); left--; }
    else if (choice && choice.kind === 'oldcombo') { result.combo = G.applyCombo(game, choice.combo); left--; }
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
