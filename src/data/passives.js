// 패시브 데이터: 기본 패시브 16개(레벨 1~5) + 패시브 조합 3개
// apply(s, lv)는 스탯 묶음 s에 그 레벨만큼의 효과를 더한다 (G.recalcStats가 매번 처음부터 계산).
(function (G) {
  'use strict';

  G.PASSIVE_MAX = 5;
  G.PASSIVE_SLOTS = 6;

  const AMOUNT_BY_LEVEL = [0, 1, 1, 2, 2, 3];

  G.PASSIVES = {
    vitality: { name: '튼튼한 몸', desc: '최대 체력 +20', apply(s, lv) { s.maxHp += 20 * lv; } },
    // 방어막: 체력 위의 보호막이 피해를 먼저 받고, 4초 동안 맞지 않으면 다시 차오른다
    barrier: { name: '방어막', desc: '보호막 +18 (4초 맞지 않으면 다시 참)', apply(s, lv) { s.barrier += 18 * lv; s.barrierRegen += 6 + 3 * lv; } },
    swift: { name: '가벼운 발', desc: '이동 속도 +8%', apply(s, lv) { s.speed += 0.08 * lv; } },
    might: { name: '불꽃 심지', desc: '모든 피해 +10%', apply(s, lv) { s.damage += 0.1 * lv; } },
    haste: { name: '숙련', desc: '공격 대기 시간 -8%', apply(s, lv) { s.cooldown *= Math.pow(0.92, lv); } },
    magnet: { name: '끌림', desc: '경험치 흡수 범위 +30%', apply(s, lv) { s.magnet *= 1 + 0.3 * lv; } },
    regen: { name: '재생의 이끼', desc: '1초마다 체력 0.15 회복', apply(s, lv) { s.regen += 0.15 * lv; } },
    armor: { name: '바위 갑옷', desc: '받는 피해 -6%', apply(s, lv) { s.armor += 0.06 * lv; } },
    area: { name: '넓은 빛', desc: '공격 범위 +10%', apply(s, lv) { s.area += 0.1 * lv; } },
    amount: { name: '쌍둥이 심지', desc: 'Lv 1·3·5에 투사체 +1', apply(s, lv) { s.amount += AMOUNT_BY_LEVEL[lv]; } },
    luck: { name: '별의 가호', desc: '치명타 확률 +4%, 상자에서 더 많이 강화', apply(s, lv) { s.crit += 0.04 * lv; s.luck += 0.12 * lv; } },
    wick: { name: '오래 타는 심지', desc: '덫·웅덩이·회오리 같은 효과가 12% 더 오래갑니다', apply(s, lv) { s.duration += 0.12 * lv; } },
    keeneye: { name: '날카로운 눈', desc: '치명타 피해 +15%', apply(s, lv) { s.critMult += 0.15 * lv; } },
    lore: { name: '배움의 등불', desc: '경험치 +8%', apply(s, lv) { s.xpMul += 0.08 * lv; } },
    cloak: { name: '그림자 망토', desc: '공격을 피할 확률 +4%', apply(s, lv) { s.dodge += 0.04 * lv; } },
    rage: { name: '분노의 불씨', desc: '체력이 절반 아래일 때 모든 피해 +8%', apply(s, lv) { s.rage += 0.08 * lv; } },
  };

  // 패시브 조합: 재료 두 개(둘 다 Lv 5)를 합친 것. 재료의 Lv 5 효과 + 추가 효과를 모두 담는다.
  G.FUSIONS = {
    heart: {
      name: '불멸의 심장', contains: ['vitality', 'regen'],
      desc: '최대 체력 +150, 1초마다 1.2 회복, 쓰러지면 한 번 되살아납니다.',
      apply(s) { s.maxHp += 150; s.regen += 1.2; s.revive += 1; },
    },
    hellfire: {
      name: '겁화', contains: ['might', 'amount'],
      desc: '모든 피해 +80%, 투사체 +4',
      apply(s) { s.damage += 0.8; s.amount += 4; },
    },
    sands: {
      name: '시간의 모래', contains: ['haste', 'swift'],
      desc: '공격 대기 시간 -40%, 이동 속도 +50%',
      apply(s) { s.cooldown *= 0.6; s.speed += 0.5; },
    },
  };
})(window.G);
