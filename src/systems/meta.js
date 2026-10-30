// 영구 진행 데이터: 금화·별빛 결정, 챔피언 해금·능력 레벨, 가챠, 구매 기록, 스테이지·난이도 클리어, 최고 기록, 설정
(function (G) {
  'use strict';

  // v2: 대규모 업데이트에서 진행을 한 번 초기화했다(예전 키는 불러올 때 지운다)
  const KEY = 'hollowlight.meta.v2';
  const RESET_KEYS = ['hollowlight.meta', 'hollowlight.run'];
  const OLD_BEST_KEY = 'deungbul.best';

  function defaults() {
    return {
      v: 1,
      gold: 0,
      unlocked: { keeper: true },
      champLv: { keeper: 0, knight: 0, witch: 0, hunter: 0 },
      cleared: {},
      best: {},
      settings: { sfx: 0.7, music: 0.5, shake: true, numbers: true, fps: false, quality: 'auto', speed: 1 },
      lastDifficulty: 'normal',
      crystals: 0,
      gacha: { pulls: 0, pity: 0, items: {}, tickets2: 0, freeDay: -1 },
      purchases: {},
      noAds: false,
      speedMode: false, // 배속(2·3배) 구매 여부
      pass: { until: -1, lastClaim: -1 },
      runsSinceAd: 0,
      coupons: {},
      shards: {}, // 영웅 조각 { 영웅: 개수 }
      heroGacha: { pulls: 0, pity: 0 },
      lore: {}, // 본 세계관 설명 { 키: true }
    };
  }

  // 배속: 샀을 때만 settings.speed(1·2·3배)를 쓴다
  G.SPEEDS = [1, 2, 3];
  G.speedMul = function () {
    const s = G.meta.settings.speed;
    return G.meta.speedMode && G.SPEEDS.indexOf(s) !== -1 ? s : 1;
  };

  // 재화 한도
  G.CURRENCY_MAX = { gold: 9999999, crystals: 99999 };

  G.addCurrency = function (kind, n) {
    G.meta[kind] = Math.min(G.CURRENCY_MAX[kind], Math.max(0, (G.meta[kind] || 0) + n));
    return G.meta[kind];
  };

  // 쿠폰: 저장 데이터마다 코드 하나에 한 번 (대소문자·앞뒤 공백 무시)
  G.redeemCoupon = function (code) {
    const key = String(code || '').trim().toUpperCase();
    const c = G.COUPONS[key];
    if (!c) return { ok: false, reason: 'invalid' };
    if (G.meta.coupons[key]) return { ok: false, reason: 'used' };
    const granted = { gold: 0, crystals: 0 };
    if (c.fill) {
      granted.gold = G.CURRENCY_MAX.gold - G.meta.gold;
      granted.crystals = G.CURRENCY_MAX.crystals - G.meta.crystals;
    }
    if (c.gold) granted.gold += c.gold;
    if (c.crystals) granted.crystals += c.crystals;
    G.addCurrency('gold', granted.gold);
    G.addCurrency('crystals', granted.crystals);
    if (c.speedMode) {
      granted.speedMode = true;
      G.meta.speedMode = true;
      if (!G.meta.settings.speed || G.meta.settings.speed === 1) G.meta.settings.speed = 2;
    }
    G.meta.coupons[key] = true;
    G.saveMeta();
    return { ok: true, granted, gold: G.meta.gold, crystals: G.meta.crystals };
  };

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
      m.gold = Math.min(G.CURRENCY_MAX.gold, Math.max(0, Number(saved.gold) || 0));
      Object.assign(m.unlocked, saved.unlocked);
      Object.assign(m.champLv, saved.champLv);
      Object.assign(m.cleared, saved.cleared);
      Object.assign(m.best, saved.best);
      Object.assign(m.settings, saved.settings);
      // 예전 저장(2배속 켜고 끄기)을 배속 단계로 옮긴다
      if (saved.settings && saved.settings.speed == null) m.settings.speed = saved.settings.speed2x ? 2 : 1;
      delete m.settings.speed2x;
      if (G.difficultyById && saved.lastDifficulty) m.lastDifficulty = G.difficultyById(saved.lastDifficulty).id;
      m.crystals = Math.min(G.CURRENCY_MAX.crystals, Math.max(0, num(saved.crystals, 0)));
      Object.assign(m.coupons, saved.coupons);
      Object.assign(m.lore, saved.lore);
      Object.assign(m.shards, saved.shards);
      if (saved.heroGacha) m.heroGacha = { pulls: num(saved.heroGacha.pulls, 0), pity: num(saved.heroGacha.pity, 0) };
      loadGacha(m, saved.gacha);
      Object.assign(m.purchases, saved.purchases);
      m.noAds = !!saved.noAds;
      m.speedMode = !!saved.speedMode;
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
    RESET_KEYS.forEach((k) => G.storage.remove(k));
    G.loadMeta();
    if (G.game) G.game.settings = G.meta.settings;
  };

  G.isStageUnlocked = function (id) {
    const i = G.STAGES.findIndex((s) => s.id === id);
    if (i <= 0) return i === 0;
    return !!G.meta.cleared[G.STAGES[i - 1].id];
  };

  // 무기·패시브는 그것을 여는 스테이지가 열려야 레벨업에 나온다 (kind: 'weapon' | 'passive')
  G.isItemUnlocked = function (kind, key) {
    const st = G.ITEM_UNLOCK_STAGE[kind + ':' + key];
    return !st || G.isStageUnlocked(st);
  };

  G.stageUnlockNames = function (stageId) {
    return (G.stageById(stageId).unlocks || []).map((k) => {
      const [kind, key] = k.split(':');
      return (kind === 'weapon' ? G.WEAPONS : G.PASSIVES)[key].name;
    });
  };

  // 난이도는 처음부터 고를 수 있다(열린 스테이지면)
  G.isDifficultyUnlocked = function (stageId) { return G.isStageUnlocked(stageId); };

  G.difficultyLockText = function (stageId, diffId) {
    if (G.isDifficultyUnlocked(stageId, diffId)) return null;
    return '앞 스테이지를 깨면 열립니다';
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

  // 판이 끝났을 때: 금화 정산, 클리어·최고 기록, 클리어 별빛 결정(매번 + 첫 클리어 덤), 새로 열린 것 문구
  G.settleRun = function (game, win) {
    const st = game.stage;
    const newlyUnlocked = [];
    const minutes = Math.floor(G.curveTime(game) / 60); // 짧은 난이도도 20분 기준으로 센다
    const diff = game.difficulty || G.DIFFICULTIES[0];
    const goldMul = (game.player && game.player.stats.goldMul) || 1;
    const bonus = Math.round((minutes * 15 + (win ? 600 : 0)) * st.goldMul * diff.gold * goldMul);
    const gold = Math.round(game.runGold * diff.gold * goldMul) + bonus;
    G.addCurrency('gold', gold);
    let crystals = 0, firstClear = false;
    let unlockedDifficulty = null;
    if (win) {
      const dKey = st.id + ':' + diff.id;
      crystals = Math.round((diff.crystals || 0) * (1 + G.STAGES.indexOf(st) * 0.5));
      if (!G.meta.cleared[dKey]) {
        G.meta.cleared[dKey] = true;
        firstClear = true;
        crystals += G.GACHA.firstClearCrystals[diff.id] || 0;
        if (diff.id !== 'normal') newlyUnlocked.push(st.name + ' ' + diff.name + ' 첫 클리어!');
      }
      if (!G.meta.cleared[st.id]) {
        G.meta.cleared[st.id] = true;
        const i = G.STAGES.indexOf(st);
        const next = G.STAGES[i + 1];
        if (next) {
          newlyUnlocked.push('새 스테이지: ' + next.name);
          const names = G.stageUnlockNames(next.id);
          if (names.length) newlyUnlocked.push('새 무기·패시브: ' + names.join(', '));
        }
      }
    }
    if (crystals) G.addCurrency('crystals', crystals);
    const rec = { time: Math.floor(game.time), kills: game.kills, level: game.player.level, champion: game.player.champion, difficulty: diff.id };
    const better = (b) => !b || rec.time > b.time || (rec.time === b.time && rec.kills > b.kills);
    const isBest = better(G.meta.best[st.id + ':' + diff.id]);
    if (isBest) G.meta.best[st.id + ':' + diff.id] = rec;
    if (better(G.meta.best[st.id])) G.meta.best[st.id] = rec;
    G.saveMeta();
    return { gold, bonus, isBest, newlyUnlocked, crystals, firstClear, unlockedDifficulty };
  };
})(window.G);
