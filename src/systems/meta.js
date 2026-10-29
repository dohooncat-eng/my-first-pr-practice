// 영구 진행 데이터: 금화·별빛 결정, 챔피언 해금·능력 레벨, 가챠, 구매 기록, 스테이지·난이도 클리어, 최고 기록, 설정
(function (G) {
  'use strict';

  const KEY = 'hollowlight.meta';
  const OLD_BEST_KEY = 'deungbul.best';

  function defaults() {
    return {
      v: 1,
      gold: 0,
      unlocked: { keeper: true },
      champLv: { keeper: 0, knight: 0, witch: 0, hunter: 0 },
      cleared: {},
      best: {},
      settings: { sfx: 0.7, music: 0.5, shake: true, numbers: true, fps: false, quality: 'auto' },
      lastDifficulty: 'normal',
      crystals: 0,
      gacha: { pulls: 0, pity: 0, items: {}, tickets2: 0, freeDay: -1 },
      purchases: {},
      noAds: false,
      pass: { until: -1, lastClaim: -1 },
      runsSinceAd: 0,
    };
  }

  const num = (v, d) => (typeof v === 'number' && isFinite(v) ? v : d);

  function loadGacha(m, g) {
    if (!g || typeof g !== 'object') return;
    m.gacha.pulls = Math.max(0, num(g.pulls, 0));
    m.gacha.pity = G.clamp(num(g.pity, 0), 0, G.GACHA.pity - 1);
    m.gacha.tickets2 = Math.max(0, num(g.tickets2, 0));
    m.gacha.freeDay = num(g.freeDay, -1);
    Object.keys(g.items || {}).forEach((k) => {
      const it = G.GACHA_ITEMS[k];
      if (it) m.gacha.items[k] = G.clamp(Math.floor(num(g.items[k], 0)), 0, it.max);
    });
  }

  G.loadMeta = function () {
    const saved = G.storage.get(KEY);
    const m = defaults();
    if (saved && typeof saved === 'object') {
      m.gold = Math.max(0, Number(saved.gold) || 0);
      Object.assign(m.unlocked, saved.unlocked);
      Object.assign(m.champLv, saved.champLv);
      Object.assign(m.cleared, saved.cleared);
      Object.assign(m.best, saved.best);
      Object.assign(m.settings, saved.settings);
      if (G.difficultyById && saved.lastDifficulty) m.lastDifficulty = G.difficultyById(saved.lastDifficulty).id;
      m.crystals = Math.max(0, num(saved.crystals, 0));
      loadGacha(m, saved.gacha);
      Object.assign(m.purchases, saved.purchases);
      m.noAds = !!saved.noAds;
      if (saved.pass) m.pass = { until: num(saved.pass.until, -1), lastClaim: num(saved.pass.lastClaim, -1) };
      m.runsSinceAd = Math.max(0, num(saved.runsSinceAd, 0));
    } else {
      // 이름을 바꾸기 전(등불지기) 최고 기록을 첫 스테이지 기록으로 옮겨 온다
      const old = G.storage.get(OLD_BEST_KEY);
      if (old && typeof old.time === 'number') {
        m.best.forest = { time: old.time, kills: old.kills, level: old.level, champion: 'keeper' };
      }
    }
    G.meta = m;
    return m;
  };

  G.saveMeta = function () { G.storage.set(KEY, G.meta); };

  G.resetAllData = function () {
    G.storage.remove(KEY);
    G.storage.remove(G.RUN_KEY);
    G.storage.remove(OLD_BEST_KEY);
    G.loadMeta();
    if (G.game) G.game.settings = G.meta.settings;
  };

  G.isStageUnlocked = function (id) {
    const i = G.STAGES.findIndex((s) => s.id === id);
    if (i <= 0) return i === 0;
    return !!G.meta.cleared[G.STAGES[i - 1].id];
  };

  // 난이도는 스테이지마다 차례로 열린다: 보통 → 어려움 → MAX
  // (난이도별 기록이 생기기 전의 클리어 기록 cleared[스테이지]는 보통 클리어로 친다)
  const DIFF_NEEDS = { hard: 'normal', max: 'hard' };

  function clearedOn(stageId, diffId) {
    const c = G.meta.cleared;
    return !!(c[stageId + ':' + diffId] || (diffId === 'normal' && c[stageId]));
  }

  G.isDifficultyUnlocked = function (stageId, diffId) {
    if (!G.isStageUnlocked(stageId)) return false;
    const need = DIFF_NEEDS[diffId];
    return !need || clearedOn(stageId, need);
  };

  G.difficultyLockText = function (stageId, diffId) {
    if (G.isDifficultyUnlocked(stageId, diffId)) return null;
    if (!G.isStageUnlocked(stageId)) return '앞 스테이지를 깨면 열립니다';
    return G.difficultyById(DIFF_NEEDS[diffId]).name + '을 깨면 열립니다';
  };

  G.championPrice = function (key) { return G.CHAMPIONS[key].price; };

  G.buyChampion = function (key) {
    const price = G.championPrice(key);
    if (G.meta.unlocked[key] || G.meta.gold < price) return false;
    G.meta.gold -= price;
    G.meta.unlocked[key] = true;
    G.saveMeta();
    return true;
  };

  G.abilityCost = function (key) {
    const lv = G.meta.champLv[key] || 0;
    return lv >= G.ABILITY_MAX ? null : G.ABILITY_COSTS[lv];
  };

  G.upgradeAbility = function (key) {
    const cost = G.abilityCost(key);
    if (cost === null || !G.meta.unlocked[key] || G.meta.gold < cost) return false;
    G.meta.gold -= cost;
    G.meta.champLv[key] = (G.meta.champLv[key] || 0) + 1;
    G.saveMeta();
    return true;
  };

  // 판이 끝났을 때: 금화 정산, 클리어·최고 기록, 첫 클리어 별빛 결정, 새로 열린 것 문구
  G.settleRun = function (game, win) {
    const st = game.stage;
    const newlyUnlocked = [];
    const minutes = Math.floor(game.time / 60);
    const diff = game.difficulty || G.DIFFICULTIES[0];
    const goldMul = (game.player && game.player.stats.goldMul) || 1;
    const bonus = Math.round((minutes * 6 + (win ? 120 : 0)) * st.goldMul * diff.gold * goldMul);
    const gold = Math.round(game.runGold * diff.gold * goldMul) + bonus;
    G.meta.gold += gold;
    let crystals = 0;
    let unlockedDifficulty = null;
    if (win) {
      const dKey = st.id + ':' + diff.id;
      if (!G.meta.cleared[dKey]) {
        G.meta.cleared[dKey] = true;
        crystals = G.GACHA.firstClearCrystals[diff.id] || 0;
        G.meta.crystals += crystals;
        if (diff.id !== 'normal') newlyUnlocked.push(st.name + ' ' + diff.name + ' 클리어!');
        const next = G.DIFFICULTIES[G.DIFFICULTIES.indexOf(diff) + 1];
        if (next) {
          unlockedDifficulty = next.name;
          newlyUnlocked.push(st.name + ' ' + next.name + ' 난이도가 열렸습니다');
        }
      }
      if (!G.meta.cleared[st.id]) {
        G.meta.cleared[st.id] = true;
        const i = G.STAGES.indexOf(st);
        if (G.STAGES[i + 1]) newlyUnlocked.push('새 스테이지: ' + G.STAGES[i + 1].name);
      }
    }
    const rec = { time: Math.floor(game.time), kills: game.kills, level: game.player.level, champion: game.player.champion, difficulty: diff.id };
    const better = (b) => !b || rec.time > b.time || (rec.time === b.time && rec.kills > b.kills);
    const isBest = better(G.meta.best[st.id + ':' + diff.id]);
    if (isBest) G.meta.best[st.id + ':' + diff.id] = rec;
    if (better(G.meta.best[st.id])) G.meta.best[st.id] = rec;
    G.saveMeta();
    return { gold, bonus, isBest, newlyUnlocked, crystals, unlockedDifficulty };
  };
})(window.G);
