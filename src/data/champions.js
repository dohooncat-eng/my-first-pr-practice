// 챔피언 4명: 시작 무기, 기본 특성, 업그레이드로 강해지는 고유 능력(Lv 1~5, Lv 5는 각성)
(function (G) {
  'use strict';

  G.ABILITY_MAX = 5;
  G.ABILITY_COSTS = [120, 300, 600, 1100, 2000];

  G.CHAMPIONS = {
    keeper: {
      name: '등불지기', sprite: 'player', weapon: 'bolt', price: 0,
      desc: '꺼지지 않는 등불을 든 균형 잡힌 생존자.',
      trait: '경험치 흡수 범위 +15%',
      base: { maxHp: 100, speed: 155 },
      ability: { name: '꺼지지 않는 불', perLevel: '흡수 범위·경험치 +5%', awaken: '레벨업 선택지가 4장이 됩니다' },
      apply(s, lv) {
        s.magnet *= 1.15 + 0.05 * lv;
        s.xpMul += 0.05 * lv;
        if (lv >= 5) s.choices = 4;
      },
    },
    knight: {
      name: '은빛 기사', sprite: 'knight', weapon: 'sword', price: 300,
      desc: '무거운 갑옷으로 버티며 정면을 베어 낸다.',
      trait: '최대 체력 130, 받는 피해 -10%, 조금 느림',
      base: { maxHp: 130, speed: 145 },
      ability: { name: '은빛 맹세', perLevel: '받는 피해 -4%', awaken: '맞으면 주변을 반격해 벱니다' },
      apply(s, lv) {
        s.armor += 0.1 + 0.04 * lv;
        if (lv >= 5) s.retaliate = 1;
      },
    },
    witch: {
      name: '반딧불 마녀', sprite: 'witch', weapon: 'orb', weaponLevel: 2, price: 400,
      desc: '반딧불을 부리는 마녀. 몸은 약하지만 손이 빠르다.',
      trait: '최대 체력 85, 공격 대기 시간 -5%, 반딧불 Lv 2로 시작',
      base: { maxHp: 85, speed: 155 },
      ability: { name: '반딧불 의식', perLevel: '공격 대기 시간 -3%', awaken: '무기 하나를 더 들고 시작합니다' },
      apply(s, lv) {
        s.cooldown *= 0.95 * Math.pow(0.97, lv);
        if (lv >= 5) s.extraWeapon = 1;
      },
    },
    hunter: {
      name: '그림자 사냥꾼', sprite: 'hunter', weapon: 'scythe', price: 600,
      desc: '어둠 속을 누비는 사냥꾼. 빠르고 치명적이다.',
      trait: '최대 체력 90, 이동 속도 +10%, 치명타 +5%',
      base: { maxHp: 90, speed: 170 },
      ability: { name: '그림자 걸음', perLevel: '이동 속도·치명타 확률 +3%', awaken: '치명타 피해가 2배가 됩니다' },
      apply(s, lv) {
        s.speed += 0.1 + 0.03 * lv;
        s.crit += 0.05 + 0.03 * lv;
        if (lv >= 5) s.critMult *= 2;
      },
    },
  };

  G.CHAMPION_ORDER = ['keeper', 'knight', 'witch', 'hunter'];
})(window.G);
