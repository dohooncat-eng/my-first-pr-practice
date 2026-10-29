// 영구 진행 데이터: 금화, 챔피언 해금·능력 레벨, 스테이지 클리어, 최고 기록, 설정
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
      settings: { sfx: 0.7, music: 0.5, shake: true, numbers: true, fps: false },
      lastDifficulty: 'normal',
    };
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

  // 판이 끝났을 때: 금화 정산, 클리어·최고 기록, 새로 열린 것 문구
  G.settleRun = function (game, win) {
    const st = game.stage;
    const newlyUnlocked = [];
    const minutes = Math.floor(game.time / 60);
    const diff = game.difficulty || G.DIFFICULTIES[0];
    const bonus = Math.round((minutes * 6 + (win ? 120 : 0)) * st.goldMul * diff.gold);
    const gold = Math.round(game.runGold * diff.gold) + bonus;
    G.meta.gold += gold;
    if (win) {
      const dKey = st.id + ':' + diff.id;
      if (!G.meta.cleared[dKey]) {
        G.meta.cleared[dKey] = true;
        if (diff.id !== 'normal') newlyUnlocked.push(st.name + ' ' + diff.name + ' 클리어!');
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
    return { gold, bonus, isBest, newlyUnlocked };
  };
})(window.G);
