// 적 데이터: 역할(그림 규격·움직임)과 종류별 수치, 중간 보스
(function (G) {
  'use strict';

  // 역할별 그림 규격. feet: 몸 중심에서 그림 기준점까지 거리
  G.ENEMY_ROLES = {
    basic: { w: 42, h: 42, ay: 86 / 96, feet: 12, shadow: 14, fps: 6 },
    fast: { w: 50, h: 43, ay: 0.5, feet: -4, shadow: 9, fps: 12, fly: true },
    tank: { w: 66, h: 66, ay: 118 / 128, feet: 22, shadow: 22, fps: 4 },
    ranged: { w: 44, h: 48, ay: 0.9, feet: 12, shadow: 12, fps: 5 },
  };

  G.ENEMY_TYPES = {
    slime: { name: '이끼 슬라임', role: 'basic', hp: 12, speed: 62, r: 13, damage: 8, xp: 1, color: '#6fbf73' },
    bat: { name: '그림자 박쥐', role: 'fast', hp: 6, speed: 112, r: 11, damage: 5, xp: 1, wobble: true, color: '#9b7fd1' },
    golem: { name: '바위 골렘', role: 'tank', hp: 55, speed: 36, r: 21, damage: 12, xp: 3, color: '#a39a8c' },
    // 원거리: range 안에서 멈춰 0.6초 조준(빨간 선) 뒤 탄 한 발, cd초마다
    sporemage: { name: '포자 주술사', role: 'ranged', hp: 10, speed: 58, r: 12, damage: 8, xp: 2, range: 250, cd: 3.2, shot: 'rgba(200, 240, 90, 0.95)', color: '#9bc45a' },

    toad: { name: '독두꺼비', role: 'basic', hp: 14, speed: 60, r: 14, damage: 9, xp: 1, hop: true, color: '#7fae4a' },
    wisp: { name: '도깨비불', role: 'fast', hp: 6, speed: 114, r: 10, damage: 6, xp: 1, wobble: true, color: '#7fe8d0' },
    wraith: { name: '늪 망령', role: 'tank', hp: 60, speed: 34, r: 22, damage: 13, xp: 3, color: '#5f8a6e' },
    bogwitch: { name: '늪 주술사', role: 'ranged', hp: 11, speed: 56, r: 12, damage: 9, xp: 2, range: 260, cd: 3.0, shot: 'rgba(110, 240, 200, 0.95)', color: '#5fbf9a' },

    skeleton: { name: '해골 병사', role: 'basic', hp: 15, speed: 64, r: 13, damage: 9, xp: 1, color: '#d9d2c0' },
    gargoyle: { name: '돌 가고일', role: 'fast', hp: 8, speed: 112, r: 11, damage: 6, xp: 1, wobble: true, color: '#8a8580' },
    armor: { name: '저주받은 갑옷', role: 'tank', hp: 70, speed: 32, r: 22, damage: 14, xp: 3, color: '#8e7bc4' },
    ashcaster: { name: '잿불 사수', role: 'ranged', hp: 12, speed: 60, r: 12, damage: 10, xp: 2, range: 270, cd: 2.8, shot: 'rgba(255, 140, 60, 0.95)', color: '#d0703d' },

    voideye: { name: '공허의 눈', role: 'basic', hp: 16, speed: 62, r: 13, damage: 10, xp: 1, color: '#a98be0' },
    wolf: { name: '그림자 늑대', role: 'fast', hp: 9, speed: 110, r: 12, damage: 7, xp: 1, color: '#5b6fb0' },
    stareater: { name: '별 먹는 자', role: 'tank', hp: 80, speed: 36, r: 23, damage: 15, xp: 3, color: '#cfe6ff' },
    // 서리 고개
    snowimp: { name: '눈 도깨비', role: 'basic', hp: 15, speed: 60, r: 13, damage: 9, xp: 1, color: '#cfe9ff' },
    frostwing: { name: '서리 날개', role: 'fast', hp: 7, speed: 118, r: 11, damage: 6, xp: 1, wobble: true, color: '#9fd0ff' },
    icegolem: { name: '얼음 거인', role: 'tank', hp: 68, speed: 33, r: 22, damage: 14, xp: 3, color: '#6aa6d6' },
    frostcaller: { name: '서리 부름꾼', role: 'ranged', hp: 12, speed: 56, r: 12, damage: 10, xp: 2, range: 270, cd: 2.9, shot: 'rgba(170, 225, 255, 0.95)', color: '#8fc6ee' },
    // 불타는 광산
    cinderling: { name: '잿불 꼬마', role: 'basic', hp: 16, speed: 64, r: 13, damage: 10, xp: 1, hop: true, color: '#ff8a3d' },
    sparkhound: { name: '불씨 사냥개', role: 'fast', hp: 8, speed: 126, r: 12, damage: 7, xp: 1, color: '#ffb35a' },
    slaggolem: { name: '쇳물 골렘', role: 'tank', hp: 75, speed: 32, r: 23, damage: 15, xp: 3, color: '#c8642c' },
    minebomber: { name: '광산 폭탄꾼', role: 'ranged', hp: 13, speed: 55, r: 12, damage: 11, xp: 2, range: 250, cd: 3.1, shot: 'rgba(255, 150, 60, 0.95)', color: '#e0904a' },
    // 거울 호수
    mirrorling: { name: '거울 그림자', role: 'basic', hp: 16, speed: 62, r: 13, damage: 10, xp: 1, color: '#bfe0ff' },
    glassfish: { name: '유리 물고기', role: 'fast', hp: 8, speed: 120, r: 11, damage: 7, xp: 1, wobble: true, color: '#9fd8ff' },
    shellguard: { name: '조개 수호병', role: 'tank', hp: 84, speed: 30, r: 23, damage: 15, xp: 3, color: '#6f8fb8' },
    mirrormage: { name: '반사 술사', role: 'ranged', hp: 13, speed: 58, r: 12, damage: 11, xp: 2, range: 285, cd: 2.7, shot: 'rgba(210, 235, 255, 0.95)', color: '#a8c8f0' },
    // 바람의 탑
    galeimp: { name: '바람 꼬마', role: 'basic', hp: 16, speed: 66, r: 13, damage: 10, xp: 1, wobble: true, color: '#d9f2ff' },
    harpy: { name: '하피', role: 'fast', hp: 9, speed: 128, r: 12, damage: 8, xp: 1, color: '#a8c8d8' },
    stoneward: { name: '돌 파수꾼', role: 'tank', hp: 86, speed: 32, r: 23, damage: 16, xp: 3, color: '#8fb0c0' },
    stormarcher: { name: '폭풍 궁수', role: 'ranged', hp: 13, speed: 60, r: 12, damage: 12, xp: 2, range: 300, cd: 2.6, shot: 'rgba(220, 240, 120, 0.95)', color: '#b8d8e8' },
    // 시든 정원
    rotsprout: { name: '썩은 새싹', role: 'basic', hp: 17, speed: 58, r: 13, damage: 11, xp: 1, hop: true, color: '#9bbf5a' },
    thornmoth: { name: '가시 나방', role: 'fast', hp: 9, speed: 122, r: 12, damage: 8, xp: 1, wobble: true, color: '#d6a0ff' },
    bloomhulk: { name: '꽃 거인', role: 'tank', hp: 90, speed: 30, r: 24, damage: 16, xp: 3, color: '#a07ac0' },
    pollenwitch: { name: '꽃가루 마녀', role: 'ranged', hp: 14, speed: 56, r: 12, damage: 12, xp: 2, range: 275, cd: 2.5, shot: 'rgba(230, 200, 90, 0.95)', color: '#c8a0e0' },
    // 마지막 등대
    hollowman: { name: '텅 빈 자', role: 'basic', hp: 18, speed: 64, r: 13, damage: 12, xp: 1, color: '#6a6680' },
    shadeling: { name: '그림자 조각', role: 'fast', hp: 10, speed: 130, r: 11, damage: 9, xp: 1, wobble: true, color: '#4a4670' },
    nightknight: { name: '밤의 기사', role: 'tank', hp: 96, speed: 34, r: 24, damage: 17, xp: 3, color: '#2a2840' },
    voidpriest: { name: '공허 사제', role: 'ranged', hp: 15, speed: 58, r: 12, damage: 13, xp: 2, range: 290, cd: 2.4, shot: 'rgba(160, 140, 255, 0.95)', color: '#8f84e0' },
    starseer: { name: '별의 눈 사제', role: 'ranged', hp: 13, speed: 58, r: 12, damage: 11, xp: 2, range: 280, cd: 2.6, shot: 'rgba(170, 150, 255, 0.95)', color: '#8f84e0' },
  };

  // 보스: 같은 보스가 중간 보스로 두 번, 판 끝에 최종 보스로 나온다(갈수록 패턴이 늘어난다)
  G.BOSS_SPRITE = { w: 120, h: 120, ay: 180 / 192, feet: 40, shadow: 46, fps: 5 };
  G.BOSS_TYPES = {
    treant: { name: '고목 수호자', hp: 1400, speed: 40, r: 44, damage: 22, pattern: 'treant', color: '#8fb36a' },
    marshqueen: { name: '늪의 여왕', hp: 1500, speed: 44, r: 44, damage: 24, pattern: 'marshqueen', color: '#b6e35a' },
    ashknight: { name: '잿빛 기사', hp: 1650, speed: 52, r: 40, damage: 26, pattern: 'ashknight', color: '#ff6b3d' },
    wintermaw: { name: '겨울 아귀', hp: 2000, speed: 46, r: 44, damage: 30, pattern: 'frostbreath', color: '#bfe9ff' },
    forgeheart: { name: '대장간 심장', hp: 2200, speed: 40, r: 46, damage: 32, pattern: 'forge', color: '#ff8a3d' },
    lakemother: { name: '호수의 어머니', hp: 2400, speed: 44, r: 44, damage: 33, pattern: 'marshqueen', color: '#9fd8ff' },
    tempestlord: { name: '폭풍의 주인', hp: 2600, speed: 50, r: 42, damage: 34, pattern: 'eclipse', color: '#c9f0ff' },
    witheredqueen: { name: '시든 여왕', hp: 2800, speed: 42, r: 44, damage: 36, pattern: 'thorns', color: '#d6a0ff' },
    nightless: { name: '끝없는 밤', hp: 3200, speed: 44, r: 46, damage: 38, pattern: 'nightfall', color: '#8f84e0' },
    eclipse: { name: '월식의 군주', hp: 1850, speed: 42, r: 40, damage: 28, pattern: 'eclipse', color: '#cfe6ff' },
  };
  // 곡선 초(20분 기준): 판 시간의 1/3·2/3에 중간 보스, 끝에 최종 보스(index 2). 최종 보스를 쓰러뜨리면 클리어
  G.BOSS_TIMES = [400, 800, 1200];
  G.BOSS_HP_SCALE = [2.5, 6, 28];
})(window.G);
