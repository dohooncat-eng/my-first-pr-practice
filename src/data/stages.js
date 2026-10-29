// 스테이지 4개. 앞 스테이지를 깨면 다음이 열린다. 버티는 시간은 난이도마다 다르다(보통 10분 · 어려움 15분 · MAX 20분).
(function (G) {
  'use strict';

  // 적·보스 곡선은 20분 기준. 짧은 난이도는 같은 곡선을 더 빨리 지나간다(G.curveTime)
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
      // 이 스테이지가 열리면 레벨업에 나오기 시작하는 무기·패시브
      unlocks: ['weapon:poison', 'passive:regen', 'passive:amount', 'passive:armor', 'weapon:trap', 'passive:wick'],
      ground: 'ground_marsh', decals: ['decal_marsh_0', 'decal_marsh_1', 'decal_marsh_2', 'decal_marsh_3'],
      hpMul: 1.08, growth: 1.08, dmgMul: 1.08, speedMul: 1.03, goldMul: 1.5,
      dark: [4, 10, 9], groundColor: '#12201a', dust: 'rgba(90, 110, 80, 0.5)',
    },
    {
      id: 'ruins', name: '잿빛 폐허', thumb: 'stage_ruins',
      desc: '무너진 성채. 꺼지지 않은 잿불 사이로 해골이 걷는다.',
      enemies: { basic: 'skeleton', fast: 'gargoyle', tank: 'armor' },
      boss: 'ashknight',
      unlocks: ['weapon:meteor', 'passive:luck', 'weapon:bell', 'weapon:lance', 'passive:keeneye', 'passive:lore'],
      ground: 'ground_ruins', decals: ['decal_ruins_0', 'decal_ruins_1', 'decal_ruins_2', 'decal_ruins_3'],
      hpMul: 1.15, growth: 1.16, dmgMul: 1.15, speedMul: 1.05, goldMul: 2.2,
      dark: [9, 7, 6], groundColor: '#1a1715', dust: 'rgba(130, 120, 110, 0.5)',
    },
    {
      id: 'abyss', name: '달의 심연', thumb: 'stage_abyss',
      desc: '별빛이 가라앉은 심연. 빛을 먹는 것들이 산다.',
      enemies: { basic: 'voideye', fast: 'wolf', tank: 'stareater' },
      boss: 'eclipse',
      unlocks: ['weapon:moth', 'weapon:tornado', 'passive:cloak', 'weapon:whip', 'passive:rage'],
      ground: 'ground_abyss', decals: ['decal_abyss_0', 'decal_abyss_1', 'decal_abyss_2', 'decal_abyss_3'],
      hpMul: 1.18, growth: 1.18, dmgMul: 1.15, speedMul: 1.05, goldMul: 3,
      dark: [5, 5, 16], groundColor: '#10121f', dust: 'rgba(120, 110, 170, 0.45)',
    },
  ];

  // 무기·패시브 → 그것을 여는 스테이지 id (목록에 없으면 처음부터 열림)
  G.ITEM_UNLOCK_STAGE = {};
  G.STAGES.forEach((st) => (st.unlocks || []).forEach((k) => { G.ITEM_UNLOCK_STAGE[k] = st.id; }));

  G.stageById = function (id) { return G.STAGES.find((s) => s.id === id) || G.STAGES[0]; };

  // 난이도: 버틸 시간(초), 적 등장량·체력·피해·속도, 엘리트 간격(곡선 초), 보스 체력, 금화 배율, 깰 때마다 받는 결정
  G.DIFFICULTIES = [
    {
      id: 'normal', name: '보통', desc: '10분 · 적이 쏟아지는 기본 밤 · 금화 2배',
      time: 600, spawn: 1, hp: 1, dmg: 1, speed: 1, eliteEvery: 60, bossHp: 1, gold: 2, crystals: 10,
    },
    {
      id: 'hard', name: '어려움', desc: '15분 · 적 1.5배·체력 1.8배·피해 1.3배 · 금화 5배, 결정 40',
      time: 900, spawn: 1.5, hp: 1.8, dmg: 1.3, speed: 1.06, eliteEvery: 45, bossHp: 1.8, gold: 5, crystals: 40,
    },
    {
      id: 'max', name: 'MAX', desc: '20분 · 적 2배·체력 3배·피해 1.5배, 엘리트 30초마다 · 금화 10배, 결정 100',
      time: 1200, spawn: 2, hp: 3, dmg: 1.5, speed: 1.12, eliteEvery: 30, bossHp: 3, gold: 10, crystals: 100,
    },
  ];

  G.difficultyById = function (id) { return G.DIFFICULTIES.find((d) => d.id === id) || G.DIFFICULTIES[0]; };

  // 이번 판에서 버틸 시간(초), 그리고 20분 곡선 위의 지금 위치(초)
  G.runTime = function (game) { return (game.difficulty || G.DIFFICULTIES[0]).time; };
  G.curveTime = function (game) { return game.time * G.WIN_TIME / G.runTime(game); };
})(window.G);
