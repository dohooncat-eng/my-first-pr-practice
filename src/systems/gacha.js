// 가챠: 등급 뽑기(천장·10회 보장·3성 중복 없음), 최대 레벨 환급, 확률 정보, 도감, 스탯 적용
(function (G) {
  'use strict';

  function st() { return G.meta.gacha; }

  G.gachaLevel = function (key) { return st().items[key] || 0; };

  G.gachaCost = function (n, currency) {
    const c = G.GACHA.costs[currency === 'crystal' ? 'crystal' : 'gold'];
    return n >= 10 ? c.ten : c.one;
  };

  G.gachaFreeAvailable = function () {
    return st().freeDay !== G.dayNumber() && G.ads.rewardedReady();
  };

  G.gachaCanAfford = function (n, currency) {
    if (currency === 'gold') return G.meta.gold >= G.gachaCost(n, 'gold');
    if (currency === 'crystal') return G.meta.crystals >= G.gachaCost(n, 'crystal');
    if (currency === 'ticket2') return n === 1 && st().tickets2 > 0;
    if (currency === 'free') return n === 1 && G.gachaFreeAvailable();
    return false;
  };

  // 3성 확정까지 남은 횟수 (1이면 다음 뽑기가 3성)
  G.gachaPityLeft = function () { return G.GACHA.pity - st().pity; };

  function rollStar(minStar) {
    if (st().pity + 1 >= G.GACHA.pity) return 3;
    const r = Math.random();
    if (r < G.GACHA.rates[3]) return 3;
    if (r < G.GACHA.rates[3] + G.GACHA.rates[2]) return 2;
    return Math.max(1, minStar);
  }

  // 아직 최대 레벨이 아닌 것만 (3성은 최대 1이라 이미 가진 것은 빠진다)
  function openKeys(star) {
    const items = st().items;
    return G.gachaKeysByStar(star).filter((k) => (items[k] || 0) < G.GACHA_ITEMS[k].max);
  }

  // 나온 등급에 남은 것이 없으면 아래 등급, 그다음 위 등급에서 고른다. 중복·최대 레벨은 나오지 않는다.
  function starWithItems(star) {
    const order = [star, star - 1, star - 2, star + 1, star + 2].filter((s) => s >= 1 && s <= 3);
    return order.find((s) => openKeys(s).length) || 0;
  }

  function giveStar(rolled) {
    const g = st();
    g.pulls++;
    g.pity = rolled === 3 ? 0 : g.pity + 1;
    const star = starWithItems(rolled);
    if (!star) {
      // 전부 최대 레벨: 별빛 결정으로 돌려준다
      const c = G.GACHA.refund[rolled].crystals;
      G.addCurrency('crystals', c);
      return { key: null, star: rolled, name: '별빛 결정 ' + c, icon: 'crystal', from: 0, to: 0, isNew: false, refund: { crystals: c } };
    }
    const key = G.pick(openKeys(star));
    const it = G.GACHA_ITEMS[key];
    const from = g.items[key] || 0;
    g.items[key] = from + 1;
    return { key, star, name: it.name, icon: it.icon, from, to: from + 1, isNew: from === 0, refund: null };
  }

  // 전부 최대 레벨인지 (뽑기 화면 안내용)
  G.gachaComplete = function () { return !starWithItems(3); };

  G.gachaPull = function (n, currency) {
    n = n >= 10 ? 10 : 1;
    if (!G.gachaCanAfford(n, currency)) {
      const reason = { gold: 'gold', crystal: 'crystals', ticket2: 'ticket', free: 'free' }[currency] || 'gold';
      return { ok: false, reason, results: [], best: 0, pityLeft: G.gachaPityLeft() };
    }
    const g = st();
    if (currency === 'gold') G.meta.gold -= G.gachaCost(n, 'gold');
    else if (currency === 'crystal') G.meta.crystals -= G.gachaCost(n, 'crystal');
    else if (currency === 'ticket2') g.tickets2--;
    else if (currency === 'free') g.freeDay = G.dayNumber();

    const results = [];
    let hasTwo = false;
    for (let i = 0; i < n; i++) {
      let min = currency === 'ticket2' ? 2 : 1;
      // 10회 뽑기의 마지막 장은 2성 이상 보장
      if (n === 10 && i === 9 && !hasTwo) min = 2;
      const star = rollStar(min);
      if (star >= 2) hasTwo = true;
      results.push(giveStar(star));
    }
    G.saveMeta();
    return { ok: true, reason: null, results, best: Math.max.apply(null, results.map((r) => r.star)), pityLeft: G.gachaPityLeft() };
  };

  // 천장을 넣은 실제 3성 확률 (평균 몇 번에 한 번 나오는지의 역수)
  function effectiveThreeRate() {
    const p = G.GACHA.rates[3];
    const mean = (1 - Math.pow(1 - p, G.GACHA.pity)) / p;
    return 1 / mean;
  }

  const pct = (v, d) => (v * 100).toFixed(d === undefined ? 2 : d) + '%';

  G.gachaOdds = function () {
    const groups = [3, 2, 1].map((star) => {
      const keys = G.gachaKeysByStar(star);
      const rate = G.GACHA.rates[star];
      return {
        star, rate, rateLabel: pct(rate, 1),
        items: keys.map((k) => ({ key: k, name: G.GACHA_ITEMS[k].name, rate: rate / keys.length, rateLabel: pct(rate / keys.length, 3) })),
      };
    });
    const r = G.GACHA.refund;
    return {
      groups,
      rules: [
        '1회 뽑기마다 위 확률로 등급이 정해지고, 그 등급 안에서 종류는 같은 확률로 정해집니다.',
        '10회 뽑기는 ★★ 이상을 1개 보장합니다(마지막 장).',
        '★★★ 없이 ' + G.GACHA.pity + '번째 뽑기는 ★★★가 확정됩니다(천장). ★★★가 나오면 횟수는 0으로 돌아갑니다.',
        '천장을 포함한 ★★★의 실제 확률은 약 ' + pct(effectiveThreeRate(), 2) + '입니다.',
        '이미 가진 ★★★와 최대 레벨인 것은 나오지 않습니다. 같은 등급의 남은 것이 그 확률을 나눠 가집니다.',
        '한 등급을 모두 최대로 만들면 그 자리에서 아래 등급(없으면 위 등급)의 남은 것이 나옵니다.',
        '모든 것을 최대로 만든 뒤에는 별빛 결정으로 돌려받습니다(★★★ ' + r[3].crystals + ' · ★★ ' + r[2].crystals + ' · ★ ' + r[1].crystals + ').',
        '★★ 확정 뽑기권은 ★★ 이상이 나오며, ★★★ 확률은 같습니다. 모든 뽑기는 천장 횟수에 들어갑니다.',
      ],
    };
  };

  G.gachaCollection = function () {
    return G.GACHA_ORDER.map((key) => {
      const it = G.GACHA_ITEMS[key];
      const level = G.gachaLevel(key);
      return {
        key, star: it.star, name: it.name, icon: it.icon, level, max: it.max,
        desc: it.desc(Math.max(1, level)),
        next: level >= it.max ? null : it.desc(level + 1),
      };
    });
  };

  // G.recalcStats가 챔피언 능력 다음에 부른다
  G.applyGachaStats = function (s) {
    const items = st().items;
    Object.keys(items).forEach((k) => {
      const it = G.GACHA_ITEMS[k];
      const lv = Math.min(items[k] || 0, it ? it.max : 0);
      if (lv > 0) it.apply(s, lv);
    });
  };
})(window.G);
