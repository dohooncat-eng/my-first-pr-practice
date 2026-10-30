// 스테이지 10개. 앞 스테이지를 깨면 다음이 열린다. 스테이지마다 맵 모양(map, src/systems/map.js)이 다르다. 버티는 시간은 난이도마다 다르다(보통 10분 · 어려움 15분 · MAX 20분).
(function (G) {
  'use strict';

  // 적·보스 곡선은 20분 기준. 짧은 난이도는 같은 곡선을 더 빨리 지나간다(G.curveTime)
  G.WIN_TIME = 1200;

  G.STAGES = [
    {
      id: 'forest', name: '속삭이는 숲', thumb: 'stage_forest',
      desc: '이끼와 달빛의 숲. 등불지기의 첫 밤.',
      enemies: { basic: 'slime', fast: 'bat', tank: 'golem', ranged: 'sporemage' },
      boss: 'treant',
      ground: 'ground_tile', decals: ['decal_grass_0', 'decal_grass_1', 'decal_stone', 'decal_mushroom', 'decal_flowers', 'decal_roots'],
      hpMul: 1, growth: 1, dmgMul: 1, speedMul: 1, goldMul: 1,
      dark: [3, 7, 10], groundColor: '#111a17', dust: 'rgba(110, 120, 90, 0.5)',
      map: { type: 'open' },
    },
    {
      id: 'marsh', name: '가라앉은 늪', thumb: 'stage_marsh',
      desc: '안개 낀 늪. 독두꺼비와 도깨비불이 떠돈다.',
      enemies: { basic: 'toad', fast: 'wisp', tank: 'wraith', ranged: 'bogwitch' },
      boss: 'marshqueen',
      // 이 스테이지가 열리면 레벨업에 나오기 시작하는 무기·패시브
      unlocks: ['weapon:poison', 'passive:regen', 'passive:amount', 'passive:armor', 'weapon:trap', 'passive:wick', 'weapon:frost', 'weapon:shield'],
      ground: 'ground_marsh', decals: ['decal_marsh_0', 'decal_marsh_1', 'decal_marsh_2', 'decal_marsh_3'],
      hpMul: 1.08, growth: 1.08, dmgMul: 1.08, speedMul: 1.03, goldMul: 1.15,
      dark: [4, 10, 9], groundColor: '#12201a', dust: 'rgba(90, 110, 80, 0.5)',
      map: { type: 'ponds', cell: 520, r: [90, 170], chance: 0.55, look: { deep: '#050c08', water: '#14261c', shore: '#2f4a32', rim: 'rgba(182, 227, 90, 0.35)' } },
    },
    {
      id: 'ruins', name: '잿빛 폐허', thumb: 'stage_ruins',
      desc: '무너진 성채. 꺼지지 않은 잿불 사이로 해골이 걷는다.',
      enemies: { basic: 'skeleton', fast: 'gargoyle', tank: 'armor', ranged: 'ashcaster' },
      boss: 'ashknight',
      unlocks: ['weapon:meteor', 'passive:luck', 'weapon:bell', 'weapon:lance', 'passive:keeneye', 'passive:lore'],
      ground: 'ground_ruins', decals: ['decal_ruins_0', 'decal_ruins_1', 'decal_ruins_2', 'decal_ruins_3'],
      hpMul: 1.15, growth: 1.16, dmgMul: 1.15, speedMul: 1.05, goldMul: 1.3,
      dark: [9, 7, 6], groundColor: '#1a1715', dust: 'rgba(130, 120, 110, 0.5)',
      map: { type: 'pillars', cell: 300, r: [26, 46], chance: 0.5, look: { top: '#6e6a66', body: '#2a2420', rim: 'rgba(255, 140, 80, 0.35)' } },
    },
    {
      id: 'abyss', name: '달의 심연', thumb: 'stage_abyss',
      desc: '별빛이 가라앉은 심연. 빛을 먹는 것들이 산다.',
      enemies: { basic: 'voideye', fast: 'wolf', tank: 'stareater', ranged: 'starseer' },
      boss: 'eclipse',
      unlocks: ['weapon:moth', 'weapon:tornado', 'passive:cloak', 'weapon:whip', 'passive:rage'],
      ground: 'ground_abyss', decals: ['decal_abyss_0', 'decal_abyss_1', 'decal_abyss_2', 'decal_abyss_3'],
      hpMul: 1.18, growth: 1.18, dmgMul: 1.15, speedMul: 1.05, goldMul: 1.5,
      dark: [5, 5, 16], groundColor: '#10121f', dust: 'rgba(120, 110, 170, 0.45)',
      map: { type: 'arena', r: 1000, shrink: 0.35, look: { wall: 'rgba(4, 3, 14, 0.95)', edge: 'rgba(190, 170, 255, 0.65)' } },
    },
    {
      id: 'frost', name: '서리 고개', thumb: 'stage_frost',
      desc: '눈보라가 그치지 않는 좁은 협곡. 앞뒤로만 길이 있다.',
      enemies: { basic: 'snowimp', fast: 'frostwing', tank: 'icegolem', ranged: 'frostcaller' },
      boss: 'wintermaw',
      ground: 'ground_frost', decals: ['decal_frost_0', 'decal_frost_1', 'decal_frost_2', 'decal_frost_3'],
      hpMul: 1.22, growth: 1.22, dmgMul: 1.2, speedMul: 1.06, goldMul: 1.65,
      dark: [6, 10, 18], groundColor: '#1a2433', dust: 'rgba(200, 230, 255, 0.45)',
      map: { type: 'corridor', axis: 'x', half: 300, look: { wall: 'rgba(5, 9, 16, 0.95)', edge: 'rgba(200, 235, 255, 0.7)' } },
    },
    {
      id: 'mine', name: '불타는 광산', thumb: 'stage_mine',
      desc: '쇳물이 흐르는 갱도. 기둥 사이로 길을 찾아야 한다.',
      enemies: { basic: 'cinderling', fast: 'sparkhound', tank: 'slaggolem', ranged: 'minebomber' },
      boss: 'forgeheart',
      ground: 'ground_mine', decals: ['decal_mine_0', 'decal_mine_1', 'decal_mine_2', 'decal_mine_3'],
      hpMul: 1.26, growth: 1.26, dmgMul: 1.24, speedMul: 1.07, goldMul: 1.8,
      dark: [12, 6, 4], groundColor: '#1d1410', dust: 'rgba(255, 150, 80, 0.4)',
      map: { type: 'pillars', cell: 220, r: [30, 52], chance: 0.65, look: { top: '#5a4436', body: '#1e130e', rim: 'rgba(255, 140, 60, 0.5)' } },
    },
    {
      id: 'lake', name: '거울 호수', thumb: 'stage_lake',
      desc: '달을 비추는 검은 호수. 연못 사이 좁은 땅을 건넌다.',
      enemies: { basic: 'mirrorling', fast: 'glassfish', tank: 'shellguard', ranged: 'mirrormage' },
      boss: 'lakemother',
      ground: 'ground_lake', decals: ['decal_lake_0', 'decal_lake_1', 'decal_lake_2', 'decal_lake_3'],
      hpMul: 1.3, growth: 1.3, dmgMul: 1.28, speedMul: 1.08, goldMul: 2,
      dark: [4, 8, 16], groundColor: '#111a24', dust: 'rgba(190, 220, 255, 0.4)',
      map: { type: 'ponds', cell: 480, r: [110, 190], chance: 0.7, look: { deep: '#03060c', water: '#0f1c30', shore: '#33445c', rim: 'rgba(200, 225, 255, 0.45)' } },
    },
    {
      id: 'tower', name: '바람의 탑', thumb: 'stage_tower',
      desc: '구름까지 닿는 돌탑. 위아래로만 열린 좁은 계단.',
      enemies: { basic: 'galeimp', fast: 'harpy', tank: 'stoneward', ranged: 'stormarcher' },
      boss: 'tempestlord',
      ground: 'ground_tower', decals: ['decal_tower_0', 'decal_tower_1', 'decal_tower_2', 'decal_tower_3'],
      hpMul: 1.34, growth: 1.34, dmgMul: 1.32, speedMul: 1.1, goldMul: 2.15,
      dark: [7, 10, 14], groundColor: '#1a2028', dust: 'rgba(210, 240, 255, 0.4)',
      map: { type: 'corridor', axis: 'y', half: 280, look: { wall: 'rgba(6, 9, 13, 0.95)', edge: 'rgba(210, 240, 255, 0.65)' } },
    },
    {
      id: 'garden', name: '시든 정원', thumb: 'stage_garden',
      desc: '병든 꽃이 피는 정원. 가시덤불이 길을 막는다.',
      enemies: { basic: 'rotsprout', fast: 'thornmoth', tank: 'bloomhulk', ranged: 'pollenwitch' },
      boss: 'witheredqueen',
      ground: 'ground_garden', decals: ['decal_garden_0', 'decal_garden_1', 'decal_garden_2', 'decal_garden_3'],
      hpMul: 1.38, growth: 1.38, dmgMul: 1.36, speedMul: 1.1, goldMul: 2.3,
      dark: [10, 6, 14], groundColor: '#1a1420', dust: 'rgba(214, 160, 255, 0.4)',
      map: { type: 'pillars', cell: 260, r: [22, 36], chance: 0.6, look: { top: '#4a3a52', body: '#170f1c', rim: 'rgba(155, 191, 90, 0.5)' } },
    },
    {
      id: 'lighthouse', name: '마지막 등대', thumb: 'stage_lighthouse',
      desc: '세상의 끝, 꺼져 가는 거대한 등대. 갇힌 바위섬에서 마지막 밤을 버틴다.',
      enemies: { basic: 'hollowman', fast: 'shadeling', tank: 'nightknight', ranged: 'voidpriest' },
      boss: 'nightless',
      ground: 'ground_lighthouse', decals: ['decal_lighthouse_0', 'decal_lighthouse_1', 'decal_lighthouse_2', 'decal_lighthouse_3'],
      hpMul: 1.45, growth: 1.42, dmgMul: 1.4, speedMul: 1.12, goldMul: 2.5,
      dark: [3, 3, 9], groundColor: '#0e0e16', dust: 'rgba(255, 210, 122, 0.35)',
      map: { type: 'arena', r: 800, shrink: 0.3, look: { wall: 'rgba(1, 1, 5, 0.96)', edge: 'rgba(255, 210, 122, 0.7)' } },
    },
  ];

  // 무기·패시브 → 그것을 여는 스테이지 id (목록에 없으면 처음부터 열림)
  G.ITEM_UNLOCK_STAGE = {};
  G.STAGES.forEach((st) => (st.unlocks || []).forEach((k) => { G.ITEM_UNLOCK_STAGE[k] = st.id; }));

  G.stageById = function (id) { return G.STAGES.find((s) => s.id === id) || G.STAGES[0]; };

  // 난이도: 버틸 시간(초), 적 등장량·체력·피해·속도, 엘리트 간격(곡선 초), 보스 체력, 금화 배율, 깰 때마다 받는 결정
  G.DIFFICULTIES = [
    {
      id: 'normal', name: '보통', desc: '10분 + 최종 보스 · 금화 3배, 결정 80',
      time: 600, spawn: 1, hp: 1, dmg: 1, speed: 1, eliteEvery: 60, bossHp: 1, gold: 1, crystals: 80,
    },
    {
      id: 'hard', name: '어려움', desc: '15분 + 최종 보스 · 적 1.8배·속도 1.12배 · 금화 8배, 결정 250',
      time: 900, spawn: 1.8, hp: 1.4, dmg: 1.3, speed: 1.12, eliteEvery: 45, bossHp: 1.8, gold: 2, crystals: 250,
    },
    {
      id: 'max', name: 'MAX', desc: '20분 + 최종 보스 · 적 2.6배·속도 1.25배, 엘리트 30초마다 · 금화 20배, 결정 600',
      time: 1200, spawn: 2.6, hp: 2, dmg: 1.5, speed: 1.25, eliteEvery: 30, bossHp: 3, gold: 4, crystals: 600,
    },
  ];

  G.difficultyById = function (id) { return G.DIFFICULTIES.find((d) => d.id === id) || G.DIFFICULTIES[0]; };

  // 이번 판에서 버틸 시간(초), 그리고 20분 곡선 위의 지금 위치(초)
  G.runTime = function (game) { return (game.difficulty || G.DIFFICULTIES[0]).time; };
  G.curveTime = function (game) { return game.time * G.WIN_TIME / G.runTime(game); };
})(window.G);
