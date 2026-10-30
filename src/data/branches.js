// 무기 분기와 조합 (대규모 업데이트 4단계)
// - 기본 무기는 Lv 10까지. Lv 5와 Lv 10에서 갈래를 하나 고른다(무기마다 갈래 수가 다르다).
// - 갈래는 수치를 바꾸고(mul 곱, add 더함) 맞힐 때 효과(fx)를 더한다.
//   fx: burn 화상(맞힌 피해 비율/초) · poison 중독(쌓임) · chill 냉기(쌓이면 얼림) · stun 기절(초) · knock 밀쳐냄
//       lifesteal 흡혈(피해 비율) · execute 처형(남은 체력 비율 이하면 즉사, 보스 제외) · explode 폭발(반지름) · chain 연쇄(마리 수)
// - Lv 5 갈래마다 subs(조합 상대 2개)가 있다. 메인 무기 Lv 10 + 상대 무기 Lv 5 이상이면 상자에서 조합할 수 있다.
//   조합 결과는 메인 무기의 모양(동작)을 그대로 쓰고, 상대 무기의 힘(SIG)이 더해진 완전히 새 무기 하나다.
//   같은 두 무기라도 어느 쪽이 메인이냐, 메인이 어느 갈래냐에 따라 다른 무기가 된다.
(function (G) {
  'use strict';

  const b = (id, name, desc, mods) => Object.assign({ id, name, desc }, mods);

  G.BRANCHES = {
    bolt: {
      b5: [
        b('pierce', '관통 화살', '관통 +3, 화살이 30% 빨라집니다.', { add: { pierce: 3 }, mul: { speed: 1.3 }, subs: ['lance', 'chain'] }),
        b('blast', '폭발 화살', '맞은 자리가 터집니다. 화살 -1, 피해 +20%.', { add: { count: -1 }, mul: { dmg: 1.2 }, fx: { explode: 46 }, subs: ['meteor', 'frost'] }),
      ],
      b10: {
        pierce: [
          b('rail', '꿰뚫는 빛줄기', '피해 +60%, 속도 +60%, 관통 +6', { mul: { dmg: 1.6, speed: 1.6 }, add: { pierce: 6 } }),
          b('volley', '연사', '더 자주(-40%), 화살 +2', { mul: { cd: 0.6 }, add: { count: 2 } }),
          b('ember', '불타는 화살', '화상, 화살 +1, 피해 +20%', { mul: { dmg: 1.2 }, add: { count: 1 }, fx: { burn: 0.4 } }),
        ],
        blast: [
          b('cluster', '연쇄 폭발', '폭발이 크고(+24) 피해 +30%', { mul: { dmg: 1.3 }, fx: { explode: 24 } }),
          b('napalm', '화염탄', '폭발 자리에 화상', { fx: { burn: 0.6 } }),
          b('barrage', '포화', '화살 +3, 더 자주(-20%)', { add: { count: 3 }, mul: { cd: 0.8 } }),
        ],
      },
    },
    sword: {
      b5: [
        b('heavy', '대검', '피해 +60%, 범위 +15%, 느려짐. 크게 밀쳐냅니다.', { mul: { dmg: 1.6, cd: 1.25, range: 1.15 }, fx: { knock: 300 }, subs: ['bell', 'shield'] }),
        b('swift', '쾌검', '훨씬 자주(-40%) 베고 피해 -15%', { mul: { cd: 0.6, dmg: 0.85 }, subs: ['whip', 'scythe'] }),
        b('blood', '피의 검', '준 피해의 3%만큼 회복합니다.', { fx: { lifesteal: 0.03 }, subs: ['poison', 'aura'] }),
      ],
      b10: {
        heavy: [
          b('quake', '땅 가르기', '범위 +30%, 맞으면 기절', { mul: { range: 1.3 }, fx: { stun: 0.4 } }),
          b('execution', '처형', '체력 12% 아래 적은 즉사, 피해 +30%', { mul: { dmg: 1.3 }, fx: { execute: 0.12 } }),
        ],
        swift: [
          b('thousand', '천 번 베기', '더 자주(-40%)', { mul: { cd: 0.6 } }),
          b('gale', '칼바람', '범위 +40%, 베는 각도 넓게', { mul: { range: 1.4 }, add: { arc: 1.5 } }),
        ],
        blood: [
          b('feast', '피의 만찬', '흡혈 +3%, 피해 +30%', { mul: { dmg: 1.3 }, fx: { lifesteal: 0.03 } }),
          b('crimson', '핏빛 폭발', '벤 자리가 터집니다', { fx: { explode: 60 } }),
        ],
      },
    },
    orb: {
      b5: [
        b('swarm', '반딧불 무리', '반딧불 +3, 피해 -15%', { add: { count: 3 }, mul: { dmg: 0.85 }, subs: ['moth', 'tornado'] }),
        b('blaze', '불꽃 반딧불', '닿은 적에 화상, 피해 +20%', { mul: { dmg: 1.2 }, fx: { burn: 0.5 }, subs: ['bolt', 'aura'] }),
      ],
      b10: {
        swarm: [
          b('galaxy', '은하', '반딧불 +4, 넓게(+30%)', { add: { count: 4 }, mul: { radius: 1.3 } }),
          b('hive', '벌집', '빠르게 돌고(+60%) 피해 +30%', { mul: { spin: 1.6, dmg: 1.3 } }),
          b('frostfly', '서리 반딧불', '닿은 적에 냉기', { fx: { chill: 1 } }),
        ],
        blaze: [
          b('sunfire', '태양불', '화상 +60%, 넓게(+20%)', { mul: { radius: 1.2 }, fx: { burn: 0.6 } }),
          b('nova', '터지는 반딧불', '닿은 자리가 터집니다', { fx: { explode: 50 } }),
          b('swarmfire', '불꽃 떼', '반딧불 +3', { add: { count: 3 } }),
        ],
      },
    },
    aura: {
      b5: [
        b('wide', '넓은 빛', '범위 +40%', { mul: { radius: 1.4 }, subs: ['bell', 'frost'] }),
        b('searing', '작열', '피해 +60%, 더 자주 태웁니다', { mul: { dmg: 1.6, tick: 0.8 }, subs: ['poison', 'orb'] }),
        b('warding', '수호의 빛', '흡혈 2%, 다가온 적을 밀어냅니다', { fx: { lifesteal: 0.02, knock: 120 }, subs: ['shield', 'sword'] }),
      ],
      b10: {
        wide: [
          b('dawn', '여명', '범위 +40%, 피해 +30%', { mul: { radius: 1.4, dmg: 1.3 } }),
          b('holyfrost', '성스러운 서리', '빛 안의 적에 냉기', { fx: { chill: 1 } }),
        ],
        searing: [
          b('hellfire', '업화', '피해 +60%', { mul: { dmg: 1.6 } }),
          b('brand', '낙인', '빛 안의 적에 화상', { fx: { burn: 0.8 } }),
        ],
        warding: [
          b('sanctum', '성역', '흡혈 +2%, 범위 +20%', { mul: { radius: 1.2 }, fx: { lifesteal: 0.02 } }),
          b('repel', '밀어내는 빛', '훨씬 세게 밀어냅니다', { fx: { knock: 250 } }),
        ],
      },
    },
    chain: {
      b5: [
        b('storm', '번개 폭풍', '번개 +2, 더 자주(-15%)', { add: { targets: 2 }, mul: { cd: 0.85 }, subs: ['tornado', 'meteor'] }),
        b('arc', '긴 사슬', '튀는 횟수 +4, 더 멀리(+30%)', { add: { jumps: 4 }, mul: { range: 1.3 }, subs: ['bolt', 'frost'] }),
      ],
      b10: {
        storm: [
          b('tempest', '폭풍우', '더 자주(-40%)', { mul: { cd: 0.6 } }),
          b('thunder', '천둥', '피해 +80%, 기절', { mul: { dmg: 1.8 }, fx: { stun: 0.3 } }),
          b('static', '정전기', '맞은 적에서 2마리 더 연쇄', { fx: { chain: 2 } }),
        ],
        arc: [
          b('web', '번개 그물', '튀는 횟수 +6', { add: { jumps: 6 } }),
          b('overload', '과부하', '맞은 자리가 터집니다', { fx: { explode: 50 } }),
          b('surge', '전류 폭주', '피해 +50%, 더 멀리(+30%)', { mul: { dmg: 1.5, range: 1.3 } }),
        ],
      },
    },
    scythe: {
      b5: [
        b('reap', '수확의 낫', '낫이 커지고(+40%) 피해 +30%', { mul: { size: 1.4, dmg: 1.3 }, subs: ['sword', 'poison'] }),
        b('whirl', '회오리 낫', '낫 +2, 빠르게(+20%)', { add: { count: 2 }, mul: { speed: 1.2 }, subs: ['tornado', 'orb'] }),
      ],
      b10: {
        reap: [
          b('death', '죽음의 낫', '체력 15% 아래 적은 즉사', { fx: { execute: 0.15 } }),
          b('harvest', '피의 수확', '흡혈 3%', { fx: { lifesteal: 0.03 } }),
          b('giant', '거인의 낫', '낫이 훨씬 커집니다(+50%)', { mul: { size: 1.5 } }),
        ],
        whirl: [
          b('blades', '칼날 폭풍', '낫 +3', { add: { count: 3 } }),
          b('farreach', '먼 회오리', '더 멀리(+40%), 더 자주(-25%)', { mul: { range: 1.4, cd: 0.75 } }),
          b('frostreap', '서리 낫', '맞은 적에 냉기', { fx: { chill: 1 } }),
        ],
      },
    },
    poison: {
      b5: [
        b('spread', '번지는 독', '웅덩이가 넓고(+40%) 하나 더', { mul: { radius: 1.4 }, add: { count: 1 }, subs: ['tornado', 'aura'] }),
        b('toxin', '맹독', '피해 +70%, 중독이 쌓입니다', { mul: { dmg: 1.7 }, fx: { poison: 0.3 }, subs: ['sword', 'scythe'] }),
      ],
      b10: {
        spread: [
          b('swamp', '독 늪', '오래(+60%) 넓게(+30%)', { mul: { duration: 1.6, radius: 1.3 } }),
          b('spores', '포자 비', '웅덩이 +3', { add: { count: 3 } }),
          b('rot', '썩은 늪', '웅덩이 안 적에 냉기(느려짐)', { fx: { chill: 1 } }),
        ],
        toxin: [
          b('venom', '독사의 이빨', '중독 +40%', { fx: { poison: 0.4 } }),
          b('corrode', '부식', '체력 10% 아래 적은 즉사', { fx: { execute: 0.1 } }),
          b('plague', '역병', '독이 옆 적 2마리에게 번집니다', { fx: { chain: 2 } }),
        ],
      },
    },
    meteor: {
      b5: [
        b('rain', '유성비', '유성 +3, 피해 -20%', { add: { count: 3 }, mul: { dmg: 0.8 }, subs: ['chain', 'frost'] }),
        b('giant', '거대 운석', '범위 +50%, 피해 +80%, 유성 -2', { mul: { radius: 1.5, dmg: 1.8, cd: 1.2 }, add: { count: -2 }, subs: ['bell', 'bolt'] }),
      ],
      b10: {
        rain: [
          b('shower', '별의 소나기', '유성 +4', { add: { count: 4 } }),
          b('firefall', '불비', '떨어진 자리에 화상', { fx: { burn: 0.6 } }),
          b('starlight', '별빛 연타', '더 자주(-40%)', { mul: { cd: 0.6 } }),
        ],
        giant: [
          b('impact', '충돌', '맞은 적 기절', { fx: { stun: 0.6 } }),
          b('crater', '불타는 구덩이', '화상, 범위 +30%', { mul: { radius: 1.3 }, fx: { burn: 0.8 } }),
          b('apocalypse', '종말', '피해 +80%', { mul: { dmg: 1.8 } }),
        ],
      },
    },
    bell: {
      b5: [
        b('toll', '조종', '피해 +60%, 맞으면 기절', { mul: { dmg: 1.6 }, fx: { stun: 0.4 }, subs: ['sword', 'meteor'] }),
        b('echo', '메아리', '더 자주(-40%), 범위 +15%', { mul: { cd: 0.6, radius: 1.15 }, subs: ['aura', 'chain'] }),
      ],
      b10: {
        toll: [
          b('requiem', '진혼곡', '피해 +80%', { mul: { dmg: 1.8 } }),
          b('silence', '침묵', '기절 +0.5초', { fx: { stun: 0.5 } }),
        ],
        echo: [
          b('chorus', '합창', '더 자주(-40%)', { mul: { cd: 0.6 } }),
          b('resonance', '공명', '범위 +40%, 밀쳐냄 +50%', { mul: { radius: 1.4, knock: 1.5 } }),
        ],
      },
    },
    trap: {
      b5: [
        b('mine', '지뢰밭', '덫 +3', { add: { count: 3 }, subs: ['meteor', 'frost'] }),
        b('snare', '올가미', '터지면 기절과 냉기', { fx: { stun: 0.8, chill: 1 }, subs: ['poison', 'whip'] }),
        b('bomb', '폭탄 덫', '범위 +50%, 피해 +50%', { mul: { radius: 1.5, dmg: 1.5 }, subs: ['bolt', 'bell'] }),
      ],
      b10: {
        mine: [
          b('minefield', '끝없는 지뢰', '덫 +4, 오래 갑니다(+50%)', { add: { count: 4 }, mul: { life: 1.5 } }),
          b('scatter', '흩어지는 파편', '맞은 적이 또 터집니다', { fx: { explode: 50 } }),
        ],
        snare: [
          b('web', '거미줄', '기절 +0.6초, 범위 +30%', { mul: { radius: 1.3 }, fx: { stun: 0.6 } }),
          b('thorn', '가시 올가미', '중독', { fx: { poison: 0.4 } }),
        ],
        bomb: [
          b('nuke', '대폭발', '범위 +50%, 피해 +60%', { mul: { radius: 1.5, dmg: 1.6 } }),
          b('firebomb', '화염 폭탄', '화상', { fx: { burn: 0.8 } }),
        ],
      },
    },
    lance: {
      b5: [
        b('judgement', '심판의 창', '창이 굵고(+80%) 피해 +40%', { mul: { width: 1.8, dmg: 1.4 }, subs: ['bell', 'meteor'] }),
        b('needle', '빛의 바늘', '창 +3, 가늘게, 더 자주(-20%)', { add: { count: 3 }, mul: { width: 0.7, cd: 0.8 }, subs: ['bolt', 'frost'] }),
      ],
      b10: {
        judgement: [
          b('heaven', '하늘의 창', '길이 +40%, 피해 +50%', { mul: { length: 1.4, dmg: 1.5 } }),
          b('sear', '불타는 창', '화상', { fx: { burn: 0.6 } }),
          b('smite', '징벌', '기절', { fx: { stun: 0.4 } }),
        ],
        needle: [
          b('needlerain', '바늘 비', '창 +4', { add: { count: 4 } }),
          b('piercer', '꿰뚫는 바늘', '피해 +60%', { mul: { dmg: 1.6 } }),
          b('icicle', '고드름', '냉기', { fx: { chill: 1 } }),
        ],
      },
    },
    moth: {
      b5: [
        b('cloud', '나방 구름', '나방 +4, 피해 -20%', { add: { count: 4 }, mul: { dmg: 0.8 }, subs: ['orb', 'poison'] }),
        b('hunter', '사냥 나방', '여러 번 물고(+3) 피해 +40%, 빠르게', { add: { hits: 3 }, mul: { dmg: 1.4, speed: 1.3 }, subs: ['scythe', 'chain'] }),
      ],
      b10: {
        cloud: [
          b('eclipse', '월식', '나방 +5', { add: { count: 5 } }),
          b('dust', '독가루', '중독', { fx: { poison: 0.3 } }),
          b('glow', '불나방', '화상', { fx: { burn: 0.4 } }),
        ],
        hunter: [
          b('reaper', '사신 나방', '체력 12% 아래 적은 즉사', { fx: { execute: 0.12 } }),
          b('vampire', '흡혈 나방', '흡혈 3%', { fx: { lifesteal: 0.03 } }),
          b('swiftwing', '날쌘 날개', '더 자주(-40%)', { mul: { cd: 0.6 } }),
        ],
      },
    },
    tornado: {
      b5: [
        b('vortex', '소용돌이', '빨아들이는 힘 +80%, 범위 +30%', { mul: { pull: 1.8, radius: 1.3 }, subs: ['chain', 'poison'] }),
        b('cyclone', '회오리 떼', '회오리 +2, 오래(+30%)', { add: { count: 2 }, mul: { life: 1.3 }, subs: ['orb', 'frost'] }),
      ],
      b10: {
        vortex: [
          b('blackhole', '검은 구멍', '빨아들이는 힘 2배, 피해 +50%', { mul: { pull: 2, dmg: 1.5 } }),
          b('shred', '갈아내기', '더 자주 벱니다(-40%)', { mul: { tick: 0.6 } }),
        ],
        cyclone: [
          b('stormfront', '폭풍 전선', '회오리 +2', { add: { count: 2 } }),
          b('blizzard', '눈보라', '냉기', { fx: { chill: 1 } }),
          b('firestorm', '불 폭풍', '화상', { fx: { burn: 0.5 } }),
        ],
      },
    },
    whip: {
      b5: [
        b('lash', '연타', '훨씬 자주(-40%)', { mul: { cd: 0.6 }, subs: ['sword', 'chain'] }),
        b('long', '긴 채찍', '길이 +50%, 굵게(+20%)', { mul: { length: 1.5, width: 1.2 }, subs: ['lance', 'poison'] }),
      ],
      b10: {
        lash: [
          b('frenzy', '광란', '더 자주(-40%)', { mul: { cd: 0.6 } }),
          b('flame', '불꽃 채찍', '화상', { fx: { burn: 0.6 } }),
          b('bleed', '피 흘리기', '중독', { fx: { poison: 0.3 } }),
        ],
        long: [
          b('reach', '먼 손길', '길이 +40%', { mul: { length: 1.4 } }),
          b('crush', '분쇄', '피해 +70%, 기절', { mul: { dmg: 1.7 }, fx: { stun: 0.3 } }),
          b('drain', '흡혈 채찍', '흡혈 3%', { fx: { lifesteal: 0.03 } }),
        ],
      },
    },
    frost: {
      b5: [
        b('shard', '얼음 파편', '방울 +3, 피해 -15%', { add: { count: 3 }, mul: { dmg: 0.85 }, subs: ['bolt', 'scythe'] }),
        b('glacier', '빙하', '피해 +60%, 오래 얼립니다(+50%)', { mul: { dmg: 1.6, freeze: 1.5 }, subs: ['bell', 'aura'] }),
      ],
      b10: {
        shard: [
          b('hail', '우박', '방울 +4', { add: { count: 4 } }),
          b('lancet', '얼음 송곳', '관통 +4', { add: { pierce: 4 } }),
          b('shatter', '산산조각', '맞은 자리가 터집니다', { fx: { explode: 40 } }),
        ],
        glacier: [
          b('absolute', '절대 영도', '얼리는 시간 +80%, 서리 1번에 얼어붙습니다', { mul: { freeze: 1.8 }, add: { freezeAt: -5 } }),
          b('avalanche', '눈사태', '피해 +80%', { mul: { dmg: 1.8 } }),
        ],
      },
    },
    shield: {
      b5: [
        b('bulwark', '큰 방패', '방패가 커지고(+40%) 세게 밀쳐냅니다(+40%)', { mul: { size: 1.4, knock: 1.4 }, subs: ['sword', 'bell'] }),
        b('mirror', '거울 방패', '방패 +2, 빠르게 돕니다(+30%)', { add: { count: 2 }, mul: { spin: 1.3 }, subs: ['lance', 'frost'] }),
      ],
      b10: {
        bulwark: [
          b('fortress', '요새', '더 크고(+40%) 피해 +50%', { mul: { size: 1.4, dmg: 1.5 } }),
          b('thornshield', '가시 방패', '흡혈 3%', { fx: { lifesteal: 0.03 } }),
          b('quakeshield', '진동 방패', '기절', { fx: { stun: 0.4 } }),
        ],
        mirror: [
          b('prism', '프리즘', '방패 +3', { add: { count: 3 } }),
          b('radiance', '광휘', '화상', { fx: { burn: 0.5 } }),
          b('aegis', '이지스', '넓게(+30%), 피해 +40%', { mul: { radius: 1.3, dmg: 1.4 } }),
        ],
      },
    },
  };

  // 조합 상대 무기가 더해 주는 힘(맞힐 때 효과)과 이름 앞말
  G.COMBO_SIG = {
    bolt: { adj: '불타는', fx: { burn: 0.5 } },
    sword: { adj: '칼날', fx: { execute: 0.1 } },
    orb: { adj: '반딧불', fx: { lifesteal: 0.015 } },
    aura: { adj: '빛무리', fx: { chill: 1 } },
    chain: { adj: '번개', fx: { chain: 3 } },
    scythe: { adj: '사신의', fx: { poison: 0.3 } },
    poison: { adj: '맹독', fx: { poison: 0.6 } },
    meteor: { adj: '유성', fx: { explode: 60 } },
    bell: { adj: '울리는', fx: { stun: 0.5 } },
    trap: { adj: '덫 깔린', fx: { explode: 40 } },
    lance: { adj: '심판의', fx: { chain: 1, execute: 0.05 } },
    moth: { adj: '나방', fx: { chain: 2 } },
    tornado: { adj: '폭풍', fx: { chill: 1, knock: 200 } },
    whip: { adj: '채찍', fx: { burn: 0.4, knock: 150 } },
    frost: { adj: '서리', fx: { chill: 2 } },
    shield: { adj: '수호의', fx: { lifesteal: 0.02, knock: 300 } },
  };
  // 조합 무기는 메인 무기 Lv 10 수치에 이만큼 더 강하다
  G.COMBO_BOOST = { mul: { dmg: 1.6 }, add: { count: 1 } };
})(window.G);
