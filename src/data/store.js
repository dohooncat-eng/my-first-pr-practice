// 상점 상품 (구글 플레이용, 원화). 실제 결제는 G.billing이 맡고 웹에서는 안내만 보여 준다.
(function (G) {
  'use strict';

  G.STORE = {
    products: [
      {
        id: 'crystal_100', kind: 'crystals', name: '별빛 결정 100', art: 'store_crystal_s', price: 1000,
        grant: { crystals: 100 }, firstBonus: true,
      },
      {
        id: 'crystal_330', kind: 'crystals', name: '별빛 결정 330', art: 'store_crystal_m', price: 3000,
        grant: { crystals: 330 }, firstBonus: true,
      },
      {
        id: 'crystal_1150', kind: 'crystals', name: '별빛 결정 1,150', art: 'store_crystal_l', price: 10000,
        grant: { crystals: 1150 }, firstBonus: true,
      },
      {
        id: 'starter_pack', kind: 'pack', name: '초보자 패키지', art: 'store_starter', price: 2000, limit: 1,
        desc: '별빛 결정 300 · 금화 5,000 · ★★ 확정 뽑기권 1장',
        grant: { crystals: 300, gold: 5000, tickets2: 1 },
      },
      {
        id: 'remove_ads', kind: 'noads', name: '광고 제거', art: 'store_noads', price: 3000, limit: 1,
        desc: '판이 끝날 때 나오는 광고가 사라지고, 광고 보상은 바로 받습니다. 별빛 결정 100 덤',
        grant: { crystals: 100, noAds: true },
      },
      {
        id: 'blessing_30', kind: 'pass', name: '등불 축복 (30일)', art: 'store_pass', price: 4000,
        desc: '바로 별빛 결정 200, 30일 동안 매일 60 (총 2,000)',
        grant: { crystals: 200, passDays: 30 },
      },
    ],
    passDaily: 60,
    exchange: { crystals: 50, gold: 1000 }, // 별빛 결정 → 금화
  };

  // 쿠폰 코드 (fill: 금화·별빛 결정을 한도까지)
  G.COUPONS = {
    SBR: { fill: true, desc: '금화·별빛 결정을 한도까지' },
  };

  G.storeProduct = function (id) { return G.STORE.products.find((p) => p.id === id) || null; };
})(window.G);
