// 결제(G.billing) · 상점 상태(G.store) · 광고(G.ads)
// 웹·아티팩트에서는 실제 결제와 광고가 없다. 구글 플레이 앱은 window.HollowlightNative 다리를 통해 연결한다:
//   purchase(id) → Promise<{ ok, reason }>, showRewarded(placement) → Promise<bool>, showInterstitial() → Promise
// ?debug 주소에서는 시험용으로 바로 지급한다.
(function (G) {
  'use strict';

  const DEBUG = /[?&]debug\b/.test(location.search);
  const INTERSTITIAL_EVERY = 3;

  function native() { return window.HollowlightNative || null; }

  // 기기 시간 기준 날짜 번호 (하루 1회 보상용)
  G.dayNumber = function (t) {
    const d = new Date(t === undefined ? Date.now() : t);
    return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
  };

  function grant(product) {
    const m = G.meta;
    const g = product.grant;
    const bought = m.purchases[product.id] || 0;
    const out = { crystals: 0, gold: 0, tickets2: 0, noAds: false, speedMode: false, passDays: 0 };
    if (g.crystals) {
      out.crystals = g.crystals * (product.firstBonus && bought === 0 ? 2 : 1);
      G.addCurrency('crystals', out.crystals);
    }
    if (g.gold) { out.gold = g.gold; G.addCurrency('gold', g.gold); }
    if (g.tickets2) { out.tickets2 = g.tickets2; m.gacha.tickets2 += g.tickets2; }
    if (g.noAds) { out.noAds = true; m.noAds = true; }
    if (g.speedMode) { out.speedMode = true; m.speedMode = true; m.settings.speed = 2; }
    if (g.passDays) {
      // 오늘부터 30일(이미 쓰는 중이면 이어서 30일). 오늘 몫은 바로 받을 수 있다.
      const today = G.dayNumber();
      m.pass.until = Math.max(today - 1, m.pass.until) + g.passDays;
      out.passDays = g.passDays;
    }
    m.purchases[product.id] = bought + 1;
    G.saveMeta();
    return out;
  }

  G.billing = {
    available() {
      const n = native();
      return !!(n && n.purchase) || DEBUG;
    },
    purchase(id) {
      const product = G.storeProduct(id);
      if (!product) return Promise.resolve({ ok: false, reason: 'unknown' });
      if (!G.store.status(id).canBuy) return Promise.resolve({ ok: false, reason: 'limit' });
      const n = native();
      if (n && n.purchase) {
        return Promise.resolve(n.purchase(id)).then(
          (r) => (r && r.ok ? { ok: true, granted: grant(product) } : { ok: false, reason: (r && r.reason) || 'cancelled' }),
          () => ({ ok: false, reason: 'cancelled' }),
        );
      }
      if (!DEBUG) return Promise.resolve({ ok: false, reason: 'unavailable' });
      return Promise.resolve({ ok: true, granted: grant(product), debug: true });
    },
  };

  G.store = {
    priceLabel(product) { return '₩' + product.price.toLocaleString('ko-KR'); },

    status(id) {
      const product = G.storeProduct(id);
      const bought = G.meta.purchases[id] || 0;
      const limitLeft = product && product.limit ? Math.max(0, product.limit - bought) : null;
      const firstBonus = !!(product && product.firstBonus && bought === 0);
      let note = '';
      if (firstBonus) note = '첫 구매 2배';
      else if (limitLeft === 0) note = product.kind === 'noads' || product.kind === 'speed' ? '구매함' : '구매 완료';
      else if (limitLeft !== null) note = limitLeft + '회 남음';
      if (product && product.kind === 'pass') {
        const ps = G.store.passStatus();
        if (ps.active) note = ps.daysLeft + '일 남음';
      }
      return { bought, limitLeft, canBuy: !!product && (limitLeft === null || limitLeft > 0), firstBonus, note };
    },

    exchange() {
      const ex = G.STORE.exchange;
      if (G.meta.crystals < ex.crystals) return false;
      G.meta.crystals -= ex.crystals;
      G.addCurrency('gold', ex.gold);
      G.saveMeta();
      return true;
    },

    passStatus() {
      const today = G.dayNumber();
      const p = G.meta.pass;
      const active = p.until >= today;
      return { active, daysLeft: active ? p.until - today + 1 : 0, claimedToday: p.lastClaim === today };
    },

    claimPassDaily() {
      const s = G.store.passStatus();
      if (!s.active || s.claimedToday) return 0;
      G.meta.pass.lastClaim = G.dayNumber();
      G.addCurrency('crystals', G.STORE.passDaily);
      G.saveMeta();
      return G.STORE.passDaily;
    },
  };

  G.ads = {
    available() {
      const n = native();
      return !!(n && n.showRewarded) || DEBUG;
    },
    // 보상형 광고 버튼을 보여 줄지 (광고 제거를 샀으면 광고 없이 바로 보상)
    rewardedReady() { return !!G.meta.noAds || G.ads.available(); },
    rewarded(placement) {
      if (G.meta.noAds) return Promise.resolve(true);
      const n = native();
      if (n && n.showRewarded) return Promise.resolve(n.showRewarded(placement)).then(Boolean, () => false);
      return Promise.resolve(DEBUG);
    },
    // 판이 끝나고 결과 화면을 떠날 때 3판에 1번
    maybeInterstitial() {
      if (G.meta.noAds) return Promise.resolve(false);
      G.meta.runsSinceAd = (G.meta.runsSinceAd || 0) + 1;
      const n = native();
      if (G.meta.runsSinceAd < INTERSTITIAL_EVERY || !(n && n.showInterstitial)) {
        G.saveMeta();
        return Promise.resolve(false);
      }
      G.meta.runsSinceAd = 0;
      G.saveMeta();
      return Promise.resolve(n.showInterstitial()).then(() => true, () => false);
    },
  };
})(window.G);
