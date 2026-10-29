// 스테이지 4개. 앞 스테이지를 깨면 다음이 열린다. 모두 20분 생존이 목표.
(function (G) {
  'use strict';

  G.WIN_TIME = 1200;

  G.STAGES = [
    {
      id: 'forest', name: '속삭이는 숲', thumb: 'stage_forest',
      desc: '이끼와 달빛의 숲. 등불지기의 첫 밤.',
      enemies: { basic: 'slime', fast: 'bat', tank: 'golem' },
      boss: 'treant',
      ground: 'ground_tile', decals: ['decal_grass_0', 'decal_grass_1', 'decal_stone', 'decal_mushroom', 'decal_flowers', 'decal_roots'],
      hpMul: 1, growth: 1, dmgMul: 1, speedMul: 1, goldMul: 1,
      dark: [3, 7, 10], groundColor: '#111a17', dust: 'rgba(110, 120, 90, 0.5)',
    },
    {
      id: 'marsh', name: '가라앉은 늪', thumb: 'stage_marsh',
      desc: '안개 낀 늪. 독두꺼비와 도깨비불이 떠돈다.',
      enemies: { basic: 'toad', fast: 'wisp', tank: 'wraith' },
      boss: 'marshqueen',
      ground: 'ground_marsh', decals: ['decal_marsh_0', 'decal_marsh_1', 'decal_marsh_2', 'decal_marsh_3'],
      hpMul: 1.08, growth: 1.08, dmgMul: 1.08, speedMul: 1.03, goldMul: 1.5,
      dark: [4, 10, 9], groundColor: '#12201a', dust: 'rgba(90, 110, 80, 0.5)',
    },
    {
      id: 'ruins', name: '잿빛 폐허', thumb: 'stage_ruins',
      desc: '무너진 성채. 꺼지지 않은 잿불 사이로 해골이 걷는다.',
      enemies: { basic: 'skeleton', fast: 'gargoyle', tank: 'armor' },
      boss: 'ashknight',
      ground: 'ground_ruins', decals: ['decal_ruins_0', 'decal_ruins_1', 'decal_ruins_2', 'decal_ruins_3'],
      hpMul: 1.15, growth: 1.16, dmgMul: 1.15, speedMul: 1.05, goldMul: 2.2,
      dark: [9, 7, 6], groundColor: '#1a1715', dust: 'rgba(130, 120, 110, 0.5)',
    },
    {
      id: 'abyss', name: '달의 심연', thumb: 'stage_abyss',
      desc: '별빛이 가라앉은 심연. 빛을 먹는 것들이 산다.',
      enemies: { basic: 'voideye', fast: 'wolf', tank: 'stareater' },
      boss: 'eclipse',
      ground: 'ground_abyss', decals: ['decal_abyss_0', 'decal_abyss_1', 'decal_abyss_2', 'decal_abyss_3'],
      hpMul: 1.18, growth: 1.18, dmgMul: 1.15, speedMul: 1.05, goldMul: 3,
      dark: [5, 5, 16], groundColor: '#10121f', dust: 'rgba(120, 110, 170, 0.45)',
    },
  ];

  G.stageById = function (id) { return G.STAGES.find((s) => s.id === id) || G.STAGES[0]; };

  // 난이도: 적 등장량·체력·피해·속도, 엘리트 간격, 보스 체력, 금화 배율
  G.DIFFICULTIES = [
    {
      id: 'normal', name: '보통', desc: '적이 쏟아지는 기본 밤',
      spawn: 1, hp: 1, dmg: 1, speed: 1, eliteEvery: 60, bossHp: 1, gold: 1,
    },
    {
      id: 'hard', name: '어려움', desc: '적 1.5배·체력 1.8배·피해 1.3배, 금화 1.8배',
      spawn: 1.5, hp: 1.8, dmg: 1.3, speed: 1.06, eliteEvery: 45, bossHp: 1.8, gold: 1.8,
    },
    {
      id: 'max', name: 'MAX', desc: '적 2배·체력 3배·피해 1.5배, 엘리트 30초마다, 금화 3배',
      spawn: 2, hp: 3, dmg: 1.5, speed: 1.12, eliteEvery: 30, bossHp: 3, gold: 3,
    },
  ];

  G.difficultyById = function (id) { return G.DIFFICULTIES.find((d) => d.id === id) || G.DIFFICULTIES[0]; };
})(window.G);
