// 영웅 12명: 영웅 소환(뽑기)으로 얻고, 중복은 조각이 되어 강화한다(Lv 0~10, Lv 5·10에 각성)
// 성능 차이는 적당히, 대신 영웅마다 "이 빌드에서는 사기"인 강점이 있다(빌드 궁합).
// apply(s, lv): affinity { 무기키: 피해 배율 } — 그 무기와 그 무기가 들어간 조합 무기에 적용
//               globalFx — 모든 무기에 붙는 맞힐 때 효과, frozenBonus·burnBonus·comboDmg — src/systems/heroes.js
(function (G) {
  'use strict';

  G.ABILITY_MAX = 10;

  const aff = (s, keys, mul) => { keys.forEach((k) => { s.affinity[k] = Math.max(s.affinity[k] || 1, mul); }); };
  const gfx = (s, fx) => { for (const k in fx) s.globalFx[k] = (s.globalFx[k] || 0) + fx[k]; };

  G.CHAMPIONS = {
    keeper: {
      name: '등불지기', sprite: 'player', weapon: 'bolt', star: 1,
      desc: '꺼지지 않는 등불을 든 균형 잡힌 생존자. 고를 수 있는 것이 많다.',
      trait: '경험치 흡수 범위 +15%', build: '어떤 빌드든 · 선택지가 많을수록 강함',
      base: { maxHp: 100, speed: 155 },
      ability: { name: '꺼지지 않는 불', perLevel: '흡수 범위·경험치 +4%', awaken: '레벨업 선택지 4장', awaken2: '선택지 5장, 다시 뽑기 +3' },
      apply(s, lv) {
        s.magnet *= 1.15 + 0.04 * lv;
        s.xpMul += 0.04 * lv;
        if (lv >= 5) s.choices = 4;
        if (lv >= 10) { s.choices = 5; s.rerolls += 3; }
      },
    },
    knight: {
      name: '은빛 기사', sprite: 'knight', weapon: 'sword', star: 1,
      desc: '무거운 갑옷으로 버티며 정면을 베어 낸다.',
      trait: '최대 체력 130, 받는 피해 -10%, 조금 느림', build: '은빛 검·빛의 방패 피해 증가',
      base: { maxHp: 130, speed: 145 },
      ability: { name: '은빛 맹세', perLevel: '받는 피해 -3%, 검·방패 피해 +4%', awaken: '맞으면 주변을 반격해 벱니다', awaken2: '받는 피해 -15% 더' },
      apply(s, lv) {
        s.armor += 0.1 + 0.03 * lv;
        aff(s, ['sword', 'shield'], 1.3 + 0.04 * lv);
        if (lv >= 5) s.retaliate = 1;
        if (lv >= 10) s.armor += 0.15;
      },
    },
    witch: {
      name: '반딧불 마녀', sprite: 'witch', weapon: 'orb', weaponLevel: 2, star: 1,
      desc: '반딧불을 부리는 마녀. 몸은 약하지만 손이 빠르다.',
      trait: '최대 체력 85, 공격 대기 시간 -5%, 반딧불 Lv 2로 시작', build: '반딧불·달나방 피해 증가',
      base: { maxHp: 85, speed: 155 },
      ability: { name: '반딧불 의식', perLevel: '공격 대기 시간 -2%, 반딧불·나방 피해 +4%', awaken: '무기 하나를 더 들고 시작', awaken2: '무기 둘을 더 들고 시작' },
      apply(s, lv) {
        s.cooldown *= 0.95 * Math.pow(0.98, lv);
        aff(s, ['orb', 'moth'], 1.3 + 0.04 * lv);
        if (lv >= 5) s.extraWeapon = 1;
        if (lv >= 10) s.extraWeapon = 2;
      },
    },
    hunter: {
      name: '그림자 사냥꾼', sprite: 'hunter', weapon: 'scythe', star: 1,
      desc: '어둠 속을 누비는 사냥꾼. 빠르고 치명적이다.',
      trait: '최대 체력 90, 이동 속도 +10%, 치명타 +5%', build: '치명타 빌드 · 회전 낫·불꽃 채찍',
      base: { maxHp: 90, speed: 170 },
      ability: { name: '그림자 걸음', perLevel: '이동 속도·치명타 확률 +2%', awaken: '치명타 피해 2배', awaken2: '치명타 확률 +20%' },
      apply(s, lv) {
        s.speed += 0.1 + 0.02 * lv;
        s.crit += 0.05 + 0.02 * lv;
        aff(s, ['scythe', 'whip'], 1.2 + 0.03 * lv);
        if (lv >= 5) s.critMult *= 2;
        if (lv >= 10) s.crit += 0.2;
      },
    },
    tinker: {
      name: '땜장이', sprite: 'tinker', weapon: 'trap', star: 1,
      desc: '무엇이든 고쳐 쓰고 어디든 덫을 깐다.',
      trait: '최대 체력 95, 설치물(덫·웅덩이·회오리)이 오래 갑니다', build: '설치형 빌드 · 덫·독 덩굴·회오리',
      base: { maxHp: 95, speed: 150 },
      ability: { name: '설치의 달인', perLevel: '설치물 지속 +6%, 피해 +5%', awaken: '투사체·설치물 +1', awaken2: '설치형 무기 피해 2배' },
      apply(s, lv) {
        s.duration += 0.15 + 0.06 * lv;
        aff(s, ['trap', 'poison', 'tornado'], 1.4 + 0.05 * lv);
        if (lv >= 5) s.amount += 1;
        if (lv >= 10) aff(s, ['trap', 'poison', 'tornado'], 2.4);
      },
    },
    frostseer: {
      name: '서리 예언자', sprite: 'frostseer', weapon: 'frost', star: 2,
      desc: '눈을 가린 예언자. 얼어붙은 것만 본다.',
      trait: '최대 체력 90, 얼어붙은 적에게 피해 +30%', build: '냉기 빌드 · 얼린 적을 부순다',
      base: { maxHp: 90, speed: 150 },
      ability: { name: '영원한 겨울', perLevel: '얼린 적 피해 +7%, 서리·오라 피해 +4%', awaken: '모든 무기에 냉기', awaken2: '얼린 적 피해 +80% 더' },
      apply(s, lv) {
        s.frozenBonus += 0.3 + 0.07 * lv;
        aff(s, ['frost', 'aura'], 1.3 + 0.04 * lv);
        if (lv >= 5) gfx(s, { chill: 1 });
        if (lv >= 10) s.frozenBonus += 0.8;
      },
    },
    pyro: {
      name: '불꽃술사', sprite: 'pyro', weapon: 'whip', star: 2,
      desc: '불을 다루다 머리카락까지 타 버린 술사.',
      trait: '최대 체력 95, 화상 피해 +20%', build: '화상 빌드 · 불꽃 채찍·불씨 화살',
      base: { maxHp: 95, speed: 155 },
      ability: { name: '꺼지지 않는 불길', perLevel: '화상 피해 +8%, 채찍·화살 피해 +4%', awaken: '모든 무기에 화상', awaken2: '화상 피해 2배' },
      apply(s, lv) {
        s.burnBonus += 0.2 + 0.08 * lv;
        aff(s, ['whip', 'bolt'], 1.3 + 0.04 * lv);
        if (lv >= 5) gfx(s, { burn: 0.25 });
        if (lv >= 10) s.burnBonus += 1;
      },
    },
    bard: {
      name: '음유시인', sprite: 'bard', weapon: 'bell', star: 2,
      desc: '노래 한 곡에 종소리를 실어 보낸다.',
      trait: '최대 체력 90, 투사체 +1, 대신 범위 -30%', build: '수 많은 빌드 · 종·번개·빛의 창',
      base: { maxHp: 90, speed: 160 },
      ability: { name: '돌림노래', perLevel: '공격 대기 시간 -3%, 종·번개·창 피해 +4%', awaken: '투사체 +1', awaken2: '투사체 +1, 범위 원래대로' },
      apply(s, lv) {
        s.amount += 1;
        s.area -= 0.3;
        s.cooldown *= Math.pow(0.97, lv);
        aff(s, ['bell', 'chain', 'lance'], 1.25 + 0.04 * lv);
        if (lv >= 5) s.amount += 1;
        if (lv >= 10) { s.amount += 1; s.area += 0.3; }
      },
    },
    warden: {
      name: '수호자', sprite: 'warden', weapon: 'shield', star: 2,
      desc: '등에 작은 등불을 지고 앞을 막아서는 수호자.',
      trait: '최대 체력 120, 보호막 30으로 시작', build: '버티는 빌드 · 방패·오라·검',
      base: { maxHp: 120, speed: 140 },
      ability: { name: '굳건한 방벽', perLevel: '보호막 +6, 방패·오라·검 피해 +4%', awaken: '맞으면 반격', awaken2: '보호막 2배, 모든 무기가 밀쳐냄' },
      apply(s, lv) {
        s.barrier += 30 + 6 * lv;
        s.barrierRegen += 10 + lv;
        aff(s, ['shield', 'aura', 'sword'], 1.3 + 0.04 * lv);
        if (lv >= 5) s.retaliate = 1;
        if (lv >= 10) { s.barrier *= 2; gfx(s, { knock: 120 }); }
      },
    },
    reaper: {
      name: '사신', sprite: 'reaper', weapon: 'moth', star: 3,
      desc: '죽음을 거두는 창백한 소녀. 은빛 나방이 따른다.',
      trait: '최대 체력 80, 모든 무기가 약한 적을 처형', build: '처형 빌드 · 많이 때리는 무기',
      base: { maxHp: 80, speed: 160 },
      ability: { name: '거두는 손', perLevel: '처형 기준 +0.6%, 나방·낫 피해 +4%', awaken: '모든 무기에 흡혈 1%', awaken2: '처형 기준 +6% 더' },
      apply(s, lv) {
        gfx(s, { execute: 0.04 + 0.006 * lv });
        aff(s, ['moth', 'scythe'], 1.3 + 0.04 * lv);
        if (lv >= 5) gfx(s, { lifesteal: 0.01 });
        if (lv >= 10) gfx(s, { execute: 0.06 });
      },
    },
    alchemist: {
      name: '연금술사', sprite: 'alchemist', weapon: 'poison', star: 3,
      desc: '무엇이든 섞어 보는 연금술사. 조합의 달인.',
      trait: '최대 체력 90, 조합 무기 피해 +25%', build: '조합 빌드 · 조합 무기가 강해짐',
      base: { maxHp: 90, speed: 150 },
      ability: { name: '대연성', perLevel: '조합 무기 피해 +5%', awaken: '상자 강화 +1', awaken2: '조합 무기 피해 +50% 더' },
      apply(s, lv) {
        s.comboDmg += 0.25 + 0.05 * lv;
        aff(s, ['poison'], 1.3 + 0.04 * lv);
        if (lv >= 5) s.chestBonus += 1;
        if (lv >= 10) s.comboDmg += 0.5;
      },
    },
    starchild: {
      name: '별의 아이', sprite: 'starchild', weapon: 'meteor', star: 3,
      desc: '별에서 떨어진 아이. 손끝에서 별이 쏟아진다.',
      trait: '최대 체력 85, 치명타 +5%', build: '하늘에서 떨어지는 빌드 · 별똥별·빛의 창·번개',
      base: { maxHp: 85, speed: 155 },
      ability: { name: '별의 축복', perLevel: '치명타 +2%, 별똥별·창·번개 피해 +4%', awaken: '치명타 피해 +50%', awaken2: '범위 +30%, 별똥별·창·번개 피해 2배' },
      apply(s, lv) {
        s.crit += 0.05 + 0.02 * lv;
        aff(s, ['meteor', 'lance', 'chain'], 1.3 + 0.04 * lv);
        if (lv >= 5) s.critMult += 0.5;
        if (lv >= 10) { s.area += 0.3; aff(s, ['meteor', 'lance', 'chain'], 2.1); }
      },
    },
  };

  G.CHAMPION_ORDER = ['keeper', 'knight', 'witch', 'hunter', 'tinker', 'frostseer', 'pyro', 'bard', 'warden', 'reaper', 'alchemist', 'starchild'];

  // 영웅 소환: 결정으로 싸게. 중복은 조각
  G.HERO_GACHA = {
    cost: { one: 30, ten: 270 },
    rates: { 3: 0.08, 2: 0.3, 1: 0.62 },
    pity: 60, // ★★★ 없이 60번째는 ★★★
    dupShards: { 1: 5, 2: 12, 3: 30 },
  };
  // 강화(Lv n → n+1)에 드는 조각과 금화
  G.HERO_UP_SHARDS = [3, 4, 6, 8, 10, 12, 15, 18, 22, 28];
  G.HERO_UP_GOLD = [100, 150, 250, 350, 500, 650, 800, 1000, 1300, 1600];
})(window.G);
