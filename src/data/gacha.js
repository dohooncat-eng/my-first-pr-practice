// 가챠: 금화·별빛 결정으로 뽑는 영구 업그레이드 23종 (모든 챔피언 공통)
// apply(s, lv)는 G.recalcStats에서 챔피언 능력 다음, 패시브 앞에 적용된다.
(function (G) {
  'use strict';

  G.GACHA = {
    costs: { gold: { one: 200, ten: 1800 }, crystal: { one: 60, ten: 540 } },
    // 등급 확률 (3성은 종류마다 0.3%)
    rates: { 3: 0.015, 2: 0.15, 1: 0.835 },
    pity: 100, // 3성 없이 100번째 뽑기는 3성 확정
    // 모든 것을 최대 레벨로 만든 뒤 뽑으면 등급별로 돌려주는 별빛 결정 (중복·최대 레벨은 나오지 않는다)
    refund: { 3: { crystals: 50 }, 2: { crystals: 15 }, 1: { crystals: 5 } },
    // 스테이지·난이도를 처음 깼을 때 받는 별빛 결정
    firstClearCrystals: { normal: 30, hard: 60, max: 100 },
  };

  G.GACHA_STAR_LABEL = { 1: '★', 2: '★★', 3: '★★★' };

  const pct = (v) => +(v * 100).toFixed(1) + '%';

  G.GACHA_ITEMS = {
    // ★★★ 한 번만 뽑으면 끝
    lantern_choice: {
      star: 3, max: 1, name: '선택의 등불', icon: 'g_choice',
      desc: () => '레벨업 카드가 1장 더 나옵니다',
      apply(s) { s.choices += 1; },
    },
    fate_reroll: {
      star: 3, max: 1, name: '운명 바꾸기', icon: 'g_reroll',
      desc: () => '판마다 레벨업 카드를 3번 다시 뽑을 수 있습니다',
      apply(s) { s.rerolls += 3; },
    },
    phoenix: {
      star: 3, max: 1, name: '불사조 깃털', icon: 'g_phoenix',
      desc: () => '판마다 한 번, 쓰러지면 체력 50%로 되살아납니다',
      apply(s) { s.revive += 1; },
    },
    twin_star: {
      star: 3, max: 1, name: '쌍둥이 별', icon: 'g_twinstar',
      desc: () => '모든 무기의 투사체·개수 +1',
      apply(s) { s.amount += 1; },
    },
    golden_chest: {
      star: 3, max: 1, name: '황금 상자', icon: 'g_goldchest',
      desc: () => '상자를 열 때 강화 개수 +1 (최대 5)',
      apply(s) { s.chestBonus += 1; },
    },

    // ★★ Lv 1~5
    g_might: {
      star: 2, max: 5, name: '날 선 불꽃', icon: 'icon_might',
      desc: (lv) => '모든 피해 +' + pct(0.04 * lv),
      apply(s, lv) { s.damage += 0.04 * lv; },
    },
    g_haste: {
      star: 2, max: 5, name: '바쁜 손', icon: 'icon_haste',
      desc: (lv) => '공격 대기 시간 -' + pct(1 - Math.pow(0.97, lv)),
      apply(s, lv) { s.cooldown *= Math.pow(0.97, lv); },
    },
    g_area: {
      star: 2, max: 5, name: '퍼지는 빛', icon: 'icon_area',
      desc: (lv) => '공격 범위 +' + pct(0.05 * lv),
      apply(s, lv) { s.area += 0.05 * lv; },
    },
    g_eye: {
      star: 2, max: 5, name: '매의 눈', icon: 'icon_luck',
      desc: (lv) => '치명타 확률 +' + pct(0.02 * lv),
      apply(s, lv) { s.crit += 0.02 * lv; },
    },
    g_learn: {
      star: 2, max: 5, name: '배움', icon: 'g_book',
      desc: (lv) => '경험치 +' + pct(0.06 * lv),
      apply(s, lv) { s.xpMul += 0.06 * lv; },
    },
    g_greed: {
      star: 2, max: 5, name: '황금 주머니', icon: 'g_goldbag',
      desc: (lv) => '얻는 금화 +' + pct(0.1 * lv),
      apply(s, lv) { s.goldMul += 0.1 * lv; },
    },
    g_shell: {
      star: 2, max: 5, name: '단단한 껍질', icon: 'icon_armor',
      desc: (lv) => '받는 피해 -' + pct(0.03 * lv),
      apply(s, lv) { s.armor += 0.03 * lv; },
    },
    g_start: {
      star: 2, max: 5, name: '첫걸음', icon: 'g_firststep',
      desc: (lv) => 'Lv ' + (1 + lv) + '로 시작 (시작할 때 카드 ' + lv + '번 고름)',
      apply(s, lv) { s.startLevel += lv; },
    },

    // ★ Lv 1~100 (조금씩, 오래)
    b_hp: {
      star: 1, max: 100, name: '체력', icon: 'icon_vitality',
      desc: (lv) => '최대 체력 +' + 2 * lv,
      apply(s, lv) { s.maxHp += 2 * lv; },
    },
    b_atk: {
      star: 1, max: 100, name: '공격력', icon: 'icon_might',
      desc: (lv) => '모든 피해 +' + pct(0.005 * lv),
      apply(s, lv) { s.damage += 0.005 * lv; },
    },
    b_speed: {
      star: 1, max: 100, name: '이동 속도', icon: 'icon_swift',
      desc: (lv) => '이동 속도 +' + pct(0.002 * lv),
      apply(s, lv) { s.speed += 0.002 * lv; },
    },
    b_cd: {
      star: 1, max: 100, name: '공격 속도', icon: 'icon_haste',
      desc: (lv) => '공격 대기 시간 -' + pct(0.002 * lv),
      apply(s, lv) { s.cooldown *= 1 - 0.002 * lv; },
    },
    b_magnet: {
      star: 1, max: 100, name: '흡수 범위', icon: 'icon_magnet',
      desc: (lv) => '경험치 흡수 범위 +' + pct(0.01 * lv),
      apply(s, lv) { s.magnet *= 1 + 0.01 * lv; },
    },
    b_regen: {
      star: 1, max: 100, name: '회복', icon: 'icon_regen',
      desc: (lv) => '1초마다 체력 ' + +(0.01 * lv).toFixed(2) + ' 회복',
      apply(s, lv) { s.regen += 0.01 * lv; },
    },
    b_armor: {
      star: 1, max: 100, name: '방어', icon: 'icon_armor',
      desc: (lv) => '받는 피해 -' + pct(0.002 * lv),
      apply(s, lv) { s.armor += 0.002 * lv; },
    },
    b_critdmg: {
      star: 1, max: 100, name: '치명타 피해', icon: 'g_critdmg',
      desc: (lv) => '치명타 피해 +' + pct(0.01 * lv),
      apply(s, lv) { s.critMult += 0.01 * lv; },
    },
    b_xp: {
      star: 1, max: 100, name: '경험치', icon: 'g_book',
      desc: (lv) => '경험치 +' + pct(0.005 * lv),
      apply(s, lv) { s.xpMul += 0.005 * lv; },
    },
    b_gold: {
      star: 1, max: 100, name: '금화', icon: 'coin',
      desc: (lv) => '얻는 금화 +' + pct(0.01 * lv),
      apply(s, lv) { s.goldMul += 0.01 * lv; },
    },
  };

  G.GACHA_ORDER = Object.keys(G.GACHA_ITEMS);
  G.gachaKeysByStar = function (star) {
    return G.GACHA_ORDER.filter((k) => G.GACHA_ITEMS[k].star === star);
  };
})(window.G);
