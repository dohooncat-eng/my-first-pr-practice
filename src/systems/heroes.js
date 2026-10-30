// 영웅: 소환(뽑기)·조각·강화, 그리고 판 안에서의 빌드 궁합(무기별 피해 배율·모든 무기 효과·얼린 적/화상/조합 보너스)
(function (G) {
  'use strict';

  function hg() { return G.meta.heroGacha; }

  // ---------- 소환 ----------
  G.heroCost = function (n) { return n >= 10 ? G.HERO_GACHA.cost.ten : G.HERO_GACHA.cost.one; };
  G.heroCanAfford = function (n) { return G.meta.crystals >= G.heroCost(n); };
  G.heroPityLeft = function () { return G.HERO_GACHA.pity - hg().pity; };

  function rollStar() {
    if (hg().pity + 1 >= G.HERO_GACHA.pity) return 3;
    const r = Math.random(), R = G.HERO_GACHA.rates;
    return r < R[3] ? 3 : r < R[3] + R[2] ? 2 : 1;
  }

  function giveHero(star) {
    const g = hg();
    g.pulls++;
    g.pity = star === 3 ? 0 : g.pity + 1;
    const pool = G.CHAMPION_ORDER.filter((k) => G.CHAMPIONS[k].star === star);
    const key = G.pick(pool);
    const ch = G.CHAMPIONS[key];
    const m = G.meta;
    if (!m.unlocked[key]) {
      m.unlocked[key] = true;
      if (m.champLv[key] === undefined) m.champLv[key] = 0;
      return { key, star, name: ch.name, icon: ch.sprite + '_0', isNew: true, from: 0, to: 0, hero: true, refund: null };
    }
    const sh = G.HERO_GACHA.dupShards[star];
    m.shards[key] = (m.shards[key] || 0) + sh;
    return { key, star, name: ch.name, icon: ch.sprite + '_0', isNew: false, shards: sh, hero: true, refund: null };
  }

  G.heroPull = function (n) {
    n = n >= 10 ? 10 : 1;
    if (!G.heroCanAfford(n)) return { ok: false, reason: 'crystals', results: [], best: 0 };
    G.meta.crystals -= G.heroCost(n);
    const results = [];
    let hasTwo = false;
    for (let i = 0; i < n; i++) {
      let star = rollStar();
      if (n === 10 && i === 9 && !hasTwo) star = Math.max(2, star); // 10회는 ★★ 이상 하나 보장
      if (star >= 2) hasTwo = true;
      results.push(giveHero(star));
    }
    G.saveMeta();
    return { ok: true, results, best: Math.max.apply(null, results.map((r) => r.star)) };
  };

  // ---------- 강화 (조각 + 금화, 싸게) ----------
  G.abilityCost = function (key) {
    const lv = G.meta.champLv[key] || 0;
    if (lv >= G.ABILITY_MAX) return null;
    return { shards: G.HERO_UP_SHARDS[lv], gold: G.HERO_UP_GOLD[lv] };
  };
  G.canUpgradeHero = function (key) {
    const c = G.abilityCost(key);
    return !!c && !!G.meta.unlocked[key] && (G.meta.shards[key] || 0) >= c.shards && G.meta.gold >= c.gold;
  };
  G.upgradeAbility = function (key) {
    if (!G.canUpgradeHero(key)) return false;
    const c = G.abilityCost(key);
    G.meta.shards[key] -= c.shards;
    G.meta.gold -= c.gold;
    G.meta.champLv[key] = (G.meta.champLv[key] || 0) + 1;
    G.saveMeta();
    return true;
  };

  // ---------- 판 안: 빌드 궁합 ----------
  // 무기의 '가족' (조합·진화 무기는 재료 무기들)
  function family(key) {
    const d = G.WEAPONS[key];
    if (!d) return [];
    if (d.kind === 'base') return [key];
    return Array.isArray(d.from) ? d.from : [d.from];
  }

  // 지금 맞히는 무기(G.curWeaponKey)와 적 상태에 따른 피해 배율
  G.heroDmgMul = function (game, e) {
    const s = game.player.stats;
    let mul = 1;
    const key = G.curWeaponKey;
    if (key) {
      const cache = s._aff || (s._aff = {});
      let a = cache[key];
      if (a === undefined) {
        a = 1;
        family(key).forEach((k) => { if (s.affinity[k] > a) a = s.affinity[k]; });
        const kind = G.WEAPONS[key] && G.WEAPONS[key].kind;
        if (kind && kind !== 'base') a *= 1 + s.comboDmg;
        cache[key] = a;
      }
      mul *= a;
    }
    if (s.frozenBonus && e.frozenUntil > game.time) mul *= 1 + s.frozenBonus;
    return mul;
  };
  G.hasGlobalFx = function (s) {
    for (const k in s.globalFx) return true;
    return false;
  };
})(window.G);
