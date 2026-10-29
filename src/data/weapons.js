// 무기 데이터: 기본 무기 14개(레벨 1~5) + 진화 무기 14개 + 무기 조합 3개(레벨 1개)
// 새 무기 5개(덫·빛의 창·달나방·회오리·불꽃 채찍)의 동작은 src/systems/weapons/new2.js
// 동작은 src/systems/weapons/에 있다. 수치 이름은 무기마다 그 동작이 읽는 필드다.
(function (G) {
  'use strict';

  G.WEAPON_MAX = 5;
  G.WEAPON_SLOTS = 6;

  G.WEAPONS = {
    // ---------- 기본 무기 ----------
    bolt: {
      kind: 'base', name: '불씨 화살',
      desc: '가장 가까운 적에게 불씨를 쏩니다.',
      levels: [
        { dmg: 12, cd: 0.85, count: 1, pierce: 1, speed: 430 },
        { dmg: 12, cd: 0.85, count: 2, pierce: 1, speed: 430 },
        { dmg: 17, cd: 0.8, count: 2, pierce: 2, speed: 460 },
        { dmg: 17, cd: 0.7, count: 3, pierce: 2, speed: 460 },
        { dmg: 24, cd: 0.6, count: 4, pierce: 3, speed: 500 },
      ],
      notes: ['', '화살 +1', '피해 +40%, 관통 +1', '화살 +1, 더 빠르게 쏩니다', '피해 +40%, 화살 +1, 관통 +1'],
    },
    sword: {
      kind: 'base', name: '은빛 검',
      desc: '가장 가까운 적 쪽을 크게 베고 밀어냅니다.',
      levels: [
        { dmg: 21, cd: 1.2, range: 100, arc: 2.0, back: false },
        { dmg: 27, cd: 1.2, range: 106, arc: 2.1, back: false },
        { dmg: 32, cd: 1.1, range: 118, arc: 2.1, back: false },
        { dmg: 38, cd: 1.1, range: 118, arc: 2.1, back: true },
        { dmg: 50, cd: 0.95, range: 138, arc: 2.3, back: true },
      ],
      notes: ['', '피해 +29%, 범위 증가', '피해 +19%, 범위 증가, 더 빠르게 벱니다', '피해 +19%, 뒤쪽도 함께 벱니다', '피해 +32%, 범위·속도 증가'],
    },
    orb: {
      kind: 'base', name: '반딧불',
      desc: '반딧불이 주위를 돌며 닿는 적을 밀어냅니다.',
      levels: [
        { dmg: 10, count: 2, radius: 72, spin: 3.0 },
        { dmg: 10, count: 3, radius: 76, spin: 3.0 },
        { dmg: 14, count: 3, radius: 84, spin: 3.4 },
        { dmg: 14, count: 4, radius: 90, spin: 3.6 },
        { dmg: 21, count: 5, radius: 100, spin: 4.0 },
      ],
      notes: ['', '반딧불 +1', '피해 +40%, 더 넓고 빠르게', '반딧불 +1', '피해 +50%, 반딧불 +1'],
    },
    aura: {
      kind: 'base', name: '등불 오라',
      desc: '주변 적을 계속 태우고 느리게 만듭니다.',
      levels: [
        { dmg: 4, radius: 64, tick: 0.5 },
        { dmg: 5, radius: 76, tick: 0.5 },
        { dmg: 6, radius: 88, tick: 0.45 },
        { dmg: 8, radius: 100, tick: 0.4 },
        { dmg: 11, radius: 118, tick: 0.35 },
      ],
      notes: ['', '피해·범위 증가', '피해·범위 증가, 더 자주 태웁니다', '피해 +33%, 범위 증가', '피해 +38%, 범위 크게 증가'],
    },
    chain: {
      kind: 'base', name: '번개 사슬',
      desc: '적에게 번개를 떨어뜨리고, 근처 적에게 튀어 갑니다.',
      levels: [
        { dmg: 16, cd: 1.4, targets: 1, jumps: 3, range: 130 },
        { dmg: 16, cd: 1.3, targets: 2, jumps: 3, range: 130 },
        { dmg: 22, cd: 1.2, targets: 2, jumps: 4, range: 140 },
        { dmg: 22, cd: 1.05, targets: 3, jumps: 5, range: 150 },
        { dmg: 32, cd: 0.9, targets: 4, jumps: 6, range: 170 },
      ],
      notes: ['', '번개 +1', '피해 +40%, 튀는 횟수 +1', '번개 +1, 튀는 횟수 +1, 더 자주 칩니다', '피해 +45%, 번개 +1, 튀는 횟수 +1, 더 멀리 튑니다'],
    },
    scythe: {
      kind: 'base', name: '회전 낫',
      desc: '낫을 던집니다. 낫은 날아갔다 돌아오며 두 번 벱니다.',
      levels: [
        { dmg: 13, cd: 1.5, count: 1, range: 220, speed: 420, size: 1 },
        { dmg: 13, cd: 1.5, count: 2, range: 220, speed: 420, size: 1 },
        { dmg: 18, cd: 1.35, count: 2, range: 240, speed: 440, size: 1.15 },
        { dmg: 18, cd: 1.2, count: 3, range: 240, speed: 440, size: 1.15 },
        { dmg: 26, cd: 1.0, count: 3, range: 260, speed: 470, size: 1.3 },
      ],
      notes: ['', '낫 +1', '피해 +40%, 낫이 커집니다', '낫 +1, 더 빠르게 던집니다', '피해 +45%, 낫이 더 커집니다'],
    },
    poison: {
      kind: 'base', name: '독 덩굴',
      desc: '근처 땅에 독 웅덩이를 피워 지나가는 적을 중독시킵니다.',
      levels: [
        { dmg: 4, cd: 2.4, count: 1, radius: 50, duration: 3, tick: 0.4 },
        { dmg: 4, cd: 2.4, count: 2, radius: 50, duration: 3, tick: 0.4 },
        { dmg: 6, cd: 2.2, count: 2, radius: 60, duration: 3.5, tick: 0.4 },
        { dmg: 6, cd: 2.0, count: 3, radius: 64, duration: 3.5, tick: 0.35 },
        { dmg: 8, cd: 1.8, count: 3, radius: 72, duration: 4, tick: 0.35 },
      ],
      notes: ['', '웅덩이 +1', '피해 +50%, 크고 오래갑니다', '웅덩이 +1, 더 자주 피웁니다', '피해 +33%, 더 크고 오래갑니다'],
    },
    meteor: {
      kind: 'base', name: '별똥별',
      desc: '적 위로 별똥별을 떨어뜨려 넓게 폭발시킵니다.',
      levels: [
        { dmg: 30, cd: 2.8, count: 1, radius: 60, delay: 0.7 },
        { dmg: 30, cd: 2.6, count: 2, radius: 60, delay: 0.7 },
        { dmg: 42, cd: 2.4, count: 2, radius: 68, delay: 0.65 },
        { dmg: 42, cd: 2.2, count: 3, radius: 72, delay: 0.6 },
        { dmg: 60, cd: 2.0, count: 4, radius: 80, delay: 0.55 },
      ],
      notes: ['', '별똥별 +1', '피해 +40%, 폭발 범위 증가', '별똥별 +1, 더 자주 떨어집니다', '피해 +45%, 별똥별 +1'],
    },
    bell: {
      kind: 'base', name: '종소리 파동',
      desc: '종을 울려 퍼져 나가는 충격파로 적을 밀어냅니다.',
      levels: [
        { dmg: 7, cd: 3.0, radius: 150, knock: 320, width: 26 },
        { dmg: 9, cd: 2.8, radius: 165, knock: 340, width: 28 },
        { dmg: 9, cd: 2.5, radius: 185, knock: 360, width: 30 },
        { dmg: 12, cd: 2.3, radius: 205, knock: 380, width: 32 },
        { dmg: 16, cd: 2.0, radius: 230, knock: 420, width: 34 },
      ],
      notes: ['', '피해 +30%, 범위 증가', '범위 증가, 더 자주 울립니다', '피해 +33%, 범위 증가', '피해 +33%, 범위·속도 증가'],
    },
    trap: {
      kind: 'base', name: '그림자 덫',
      desc: '주변 땅에 덫을 깔고, 적이 밟으면 폭발합니다.',
      levels: [
        { dmg: 26, cd: 2.2, count: 1, radius: 55, life: 8, spread: 140 },
        { dmg: 26, cd: 2.2, count: 2, radius: 55, life: 8, spread: 150 },
        { dmg: 36, cd: 2.0, count: 2, radius: 62, life: 9, spread: 160 },
        { dmg: 36, cd: 1.8, count: 3, radius: 66, life: 9, spread: 170 },
        { dmg: 52, cd: 1.6, count: 4, radius: 74, life: 10, spread: 180 },
      ],
      notes: ['', '덫 +1', '피해 +38%, 폭발 범위 증가', '덫 +1, 더 자주 깝니다', '피해 +44%, 덫 +1'],
    },
    lance: {
      kind: 'base', name: '빛의 창',
      desc: '가장 가까운 적 쪽으로 모든 적을 꿰뚫는 빛줄기를 쏩니다.',
      levels: [
        { dmg: 22, cd: 1.6, count: 1, length: 300, width: 16 },
        { dmg: 28, cd: 1.6, count: 1, length: 330, width: 18 },
        { dmg: 28, cd: 1.4, count: 2, length: 340, width: 18 },
        { dmg: 36, cd: 1.3, count: 2, length: 360, width: 20 },
        { dmg: 50, cd: 1.1, count: 3, length: 400, width: 22 },
      ],
      notes: ['', '피해 +27%, 길어집니다', '빛줄기 +1, 더 자주 쏩니다', '피해 +29%, 굵어집니다', '피해 +39%, 빛줄기 +1'],
    },
    moth: {
      kind: 'base', name: '달나방 떼',
      desc: '적을 쫓아 날아가는 달나방을 풀어놓습니다.',
      levels: [
        { dmg: 18, cd: 1.2, count: 2, speed: 260, life: 3 },
        { dmg: 18, cd: 1.2, count: 3, speed: 270, life: 3 },
        { dmg: 24, cd: 1.1, count: 3, speed: 290, life: 3.2 },
        { dmg: 24, cd: 1.0, count: 4, speed: 300, life: 3.4, hits: 2 },
        { dmg: 34, cd: 0.85, count: 5, speed: 320, life: 3.6, hits: 2 },
      ],
      notes: ['', '나방 +1', '피해 +33%, 더 빨라집니다', '나방 +1, 더 자주 풀고 적 2마리를 뚫습니다', '피해 +42%, 나방 +1'],
    },
    tornado: {
      kind: 'base', name: '회오리',
      desc: '떠돌아다니며 적을 끌어당기고 갈아 버리는 회오리를 일으킵니다.',
      levels: [
        { dmg: 6, cd: 4.5, count: 1, radius: 48, life: 4, tick: 0.3, pull: 90, speed: 90 },
        { dmg: 8, cd: 4.5, count: 1, radius: 52, life: 4.5, tick: 0.3, pull: 100, speed: 95 },
        { dmg: 8, cd: 4.0, count: 2, radius: 54, life: 4.5, tick: 0.3, pull: 100, speed: 100 },
        { dmg: 11, cd: 3.6, count: 2, radius: 58, life: 5, tick: 0.28, pull: 115, speed: 105 },
        { dmg: 15, cd: 3.2, count: 2, radius: 66, life: 5.5, tick: 0.25, pull: 130, speed: 110 },
      ],
      notes: ['', '피해 +33%, 오래갑니다', '회오리 +1, 더 자주 일으킵니다', '피해 +38%, 커집니다', '피해 +36%, 크고 오래갑니다'],
    },
    whip: {
      kind: 'base', name: '불꽃 채찍',
      desc: '좌우를 번갈아 길게 후려칩니다.',
      levels: [
        { dmg: 20, cd: 1.3, length: 130, width: 34, both: false },
        { dmg: 26, cd: 1.3, length: 140, width: 36, both: false },
        { dmg: 26, cd: 1.2, length: 150, width: 38, both: true },
        { dmg: 34, cd: 1.1, length: 160, width: 40, both: true },
        { dmg: 54, cd: 0.95, length: 180, width: 44, both: true },
      ],
      notes: ['', '피해 +30%, 길어집니다', '양쪽을 함께 후려칩니다', '피해 +31%, 길어집니다', '피해 +59%, 더 길고 빨라집니다'],
    },

    // ---------- 진화 무기 (무기 Lv 5 + 패시브) ----------
    inferno: {
      kind: 'evolved', from: 'bolt', name: '화염 폭풍',
      desc: '불씨 화살이 쉴 새 없이 쏟아지고, 맞은 자리가 폭발합니다.',
      levels: [{ dmg: 30, cd: 0.35, count: 4, pierce: 3, speed: 560, explode: 42 }],
    },
    moonblade: {
      kind: 'evolved', from: 'sword', name: '월광검',
      desc: '사방을 한 번에 베고, 가장 가까운 적에게 검기를 날립니다.',
      levels: [{ dmg: 55, cd: 0.9, range: 150, arc: 6.3, waveDmg: 35, waveSpeed: 520 }],
    },
    queen: {
      kind: 'evolved', from: 'orb', name: '반딧불 여왕',
      desc: '반딧불 7마리가 넓게 돌고, 스친 경험치 결정을 끌어옵니다.',
      levels: [{ dmg: 26, count: 7, radius: 120, spin: 4.4 }],
    },
    holylamp: {
      kind: 'evolved', from: 'aura', name: '성스러운 등불',
      desc: '넓은 빛이 적을 태우고, 빛 안에서 적을 처치하면 체력을 회복합니다.',
      levels: [{ dmg: 16, radius: 150, tick: 0.3, healOnKill: 1 }],
    },
    storm: {
      kind: 'evolved', from: 'chain', name: '뇌우',
      desc: '번개가 쉴 새 없이 쏟아지고 멀리까지 튑니다.',
      levels: [{ dmg: 55, cd: 0.45, targets: 6, jumps: 8, range: 200 }],
    },
    reaper: {
      kind: 'evolved', from: 'scythe', name: '사신의 낫',
      desc: '거대한 낫 4개가 사방으로 날아갔다 돌아오며 모든 것을 벱니다.',
      levels: [{ dmg: 38, cd: 0.9, count: 4, range: 300, speed: 480, size: 1.7 }],
    },
    garden: {
      kind: 'evolved', from: 'poison', name: '맹독 정원',
      desc: '독 웅덩이가 크고 오래가며, 중독된 적은 크게 느려집니다.',
      levels: [{ dmg: 12, cd: 1.4, count: 3, radius: 90, duration: 4.5, tick: 0.35, slow: 0.5 }],
    },
    starfall: {
      kind: 'evolved', from: 'meteor', name: '유성우',
      desc: '유성이 비처럼 쏟아집니다.',
      levels: [{ dmg: 90, cd: 1.0, count: 7, radius: 95, delay: 0.5 }],
    },
    earthbell: {
      kind: 'evolved', from: 'bell', name: '대지의 종',
      desc: '충격파가 두 번 울리고, 맞은 적을 잠시 기절시킵니다.',
      levels: [{ dmg: 22, cd: 2.0, radius: 260, knock: 420, width: 38, stun: 0.8, echo: true }],
    },

    helltrap: {
      kind: 'evolved', from: 'trap', name: '지옥 덫',
      desc: '덫이 터지면 주변 덫까지 연쇄로 터지고, 불길이 남습니다.',
      levels: [{ dmg: 80, cd: 1.0, count: 5, radius: 95, life: 12, spread: 200, chain: true }],
    },
    judgment: {
      kind: 'evolved', from: 'lance', name: '심판의 창',
      desc: '사방으로 네 줄기 빛의 창이 쏟아집니다.',
      levels: [{ dmg: 70, cd: 0.9, count: 4, length: 460, width: 28, around: true }],
    },
    mothswarm: {
      kind: 'evolved', from: 'moth', name: '달나방 군단',
      desc: '달나방 무리가 쉬지 않고 적을 쫓아 물어뜯습니다.',
      levels: [{ dmg: 30, cd: 0.6, count: 6, speed: 360, life: 4, pierce: 2 }],
    },
    tempest: {
      kind: 'evolved', from: 'tornado', name: '폭풍 회랑',
      desc: '거대한 회오리 두 개가 주위를 돌며 적을 빨아들입니다.',
      levels: [{ dmg: 24, cd: 2.6, count: 2, radius: 90, life: 6, tick: 0.22, pull: 180, speed: 120, orbit: true }],
    },
    dragonwhip: {
      kind: 'evolved', from: 'whip', name: '용의 채찍',
      desc: '양쪽을 한꺼번에 후려치고, 지나간 자리에 불길이 남습니다.',
      levels: [{ dmg: 70, cd: 0.8, length: 230, width: 54, both: true, flame: true }],
    },

    // ---------- 무기 조합 (무기 Lv 5 + 무기 Lv 5) ----------
    thunderbolt: {
      kind: 'union', from: ['bolt', 'chain'], name: '뇌화살',
      desc: '관통하는 번개 화살이 맞은 적에서 다시 번개를 튕깁니다.',
      levels: [{ dmg: 40, cd: 0.45, count: 5, pierce: 5, speed: 620, jumps: 3, range: 150 }],
    },
    twinmoon: {
      kind: 'union', from: ['sword', 'scythe'], name: '쌍월',
      desc: '초승달 칼날 여섯 개가 사방으로 날아갔다 돌아오며 벱니다.',
      levels: [{ dmg: 40, cd: 0.8, count: 6, range: 280, speed: 520, size: 1.6 }],
    },
    sun: {
      kind: 'union', from: ['orb', 'aura'], name: '작은 태양',
      desc: '태양 두 개가 주위를 돌며 닿는 적을 태우고, 주변 전체를 불태웁니다.',
      levels: [{ dmg: 55, count: 2, radius: 110, spin: 2.2, auraDmg: 15, auraRadius: 140, tick: 0.35 }],
    },
  };

  G.isBaseWeapon = function (key) { return G.WEAPONS[key] && G.WEAPONS[key].kind === 'base'; };
  G.weaponMaxLevel = function (key) { return G.WEAPONS[key].levels.length; };
})(window.G);
