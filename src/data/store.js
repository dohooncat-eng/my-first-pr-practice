// 상점 상품 (구글 플레이용, 원화). 실제 결제는 G.billing이 맡고 웹에서는 안내만 보여 준다.
// 결정 양: 뽑기를 전부 최대로 만드는 데(1,040회 · 결정 약 56,000) 큰 묶음 기준 10만 원 정도 들게 맞췄다.
// id는 구글 플레이 상품 id라 바꾸지 않는다.
(function (G) {
  'use strict';

  G.STORE = {
    products: [
      {
        id: 'crystal_100', kind: 'crystals', name: '별빛 결정 500', art: 'store_crystal_s', price: 1000,
        grant: { crystals: 500 }, firstBonus: true,
      },
      {
        id: 'crystal_330', kind: 'crystals', name: '별빛 결정 1,650', art: 'store_crystal_m', price: 3000,
        grant: { crystals: 1650 }, firstBonus: true,
      },
      {
        id: 'crystal_1150', kind: 'crystals', name: '별빛 결정 5,750', art: 'store_crystal_l', price: 10000,
        grant: { crystals: 5750 }, firstBonus: true,
      },
      {
        id: 'starter_pack', kind: 'pack', name: '초보자 패키지', art: 'store_starter', price: 2000, limit: 1,
        desc: '별빛 결정 1,500 · 금화 5,000 · ★★ 확정 뽑기권 1장',
        grant: { crystals: 1500, gold: 5000, tickets2: 1 },
      },
      {
        id: 'remove_ads', kind: 'noads', name: '광고 제거', art: 'store_noads', price: 3000, limit: 1,
        desc: '판이 끝날 때 나오는 광고가 사라지고, 광고 보상은 바로 받습니다. 별빛 결정 500 덤',
        grant: { crystals: 500, noAds: true },
      },
      {
        id: 'speed_mode', kind: 'speed', name: '배속 (2배·3배)', art: 'store_speed', price: 3000, limit: 1,
        desc: '판 시간이 2배·3배로 흘러 10분 판이 5분·3분 20초면 끝납니다. 적도 그만큼 몰려오지만 움직임은 그대로. 일시정지 화면에서 1배 → 2배 → 3배로 바꿉니다.',
        grant: { speedMode: true },
      },
      {
        id: 'blessing_30', kind: 'pass', name: '등불 축복 (30일)', art: 'store_pass', price: 4000,
        desc: '바로 별빛 결정 1,000, 30일 동안 매일 300 (총 10,000)',
        grant: { crystals: 1000, passDays: 30 },
      },
    ],
    passDaily: 300,
    exchange: { crystals: 50, gold: 1000 }, // 별빛 결정 → 금화
  };

  // 쿠폰 코드 (fill: 금화·별빛 결정을 한도까지)
  G.COUPONS = {
    SBR: { fill: true, desc: '금화·별빛 결정을 한도까지' },
  };

  G.storeProduct = function (id) { return G.STORE.products.find((p) => p.id === id) || null; };
})(window.G);
