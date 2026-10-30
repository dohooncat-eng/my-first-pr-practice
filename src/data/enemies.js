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
    starseer: { name: '별의 눈 사제', role: 'ranged', hp: 13, speed: 58, r: 12, damage: 11, xp: 2, range: 280, cd: 2.6, shot: 'rgba(170, 150, 255, 0.95)', color: '#8f84e0' },
  };

  // 보스: 같은 보스가 중간 보스로 두 번, 판 끝에 최종 보스로 나온다(갈수록 패턴이 늘어난다)
  G.BOSS_SPRITE = { w: 120, h: 120, ay: 180 / 192, feet: 40, shadow: 46, fps: 5 };
  G.BOSS_TYPES = {
    treant: { name: '고목 수호자', hp: 1400, speed: 40, r: 44, damage: 22, pattern: 'treant', color: '#8fb36a' },
    marshqueen: { name: '늪의 여왕', hp: 1500, speed: 44, r: 44, damage: 24, pattern: 'marshqueen', color: '#b6e35a' },
    ashknight: { name: '잿빛 기사', hp: 1650, speed: 52, r: 40, damage: 26, pattern: 'ashknight', color: '#ff6b3d' },
    eclipse: { name: '월식의 군주', hp: 1850, speed: 42, r: 40, damage: 28, pattern: 'eclipse', color: '#cfe6ff' },
  };
  // 곡선 초(20분 기준): 판 시간의 1/3·2/3에 중간 보스, 끝에 최종 보스(index 2). 최종 보스를 쓰러뜨리면 클리어
  G.BOSS_TIMES = [400, 800, 1200];
  G.BOSS_HP_SCALE = [2.5, 6, 28];
})(window.G);
