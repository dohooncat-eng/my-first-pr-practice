// 진행 중인 판 저장·불러오기: 10초마다, 그리고 창을 닫거나 탭을 옮길 때 자동 저장
(function (G) {
  'use strict';

  G.RUN_KEY = 'hollowlight.run.v2';
  const MAX_SAVED_ENEMIES = 450;

  function r1(v) { return Math.round(v * 10) / 10; }
  function rank(e) { return e.boss ? 2 : e.elite ? 1 : 0; }
  function pickKnown(obj, table) {
    const out = {};
    Object.keys(obj || {}).forEach((k) => { if (table[k]) out[k] = obj[k]; });
    return out;
  }

  G.serializeRun = function (game) {
    const p = game.player;
    return {
      v: 1,
      stageId: game.stage.id,
      difficultyId: game.difficulty.id,
      time: game.time,
      kills: game.kills,
      runGold: game.runGold,
      pendingLevelUps: game.pendingLevelUps,
      chestQueue: game.chestQueue.slice(),
      rerollsLeft: game.rerollsLeft,
      director: Object.assign({}, game.director),
      player: {
        champion: p.champion, x: r1(p.x), y: r1(p.y), hp: p.hp,
        level: p.level, xp: p.xp, xpNext: p.xpNext, revivesUsed: p.revivesUsed,
        passives: Object.assign({}, p.passives), fusions: p.fusions.slice(),
        weapons: p.weapons.map((w) => ({ key: w.key, level: w.level, timer: w.timer })),
      },
      // 잘라낼 때 보스·엘리트가 빠지지 않게 앞으로 (sort는 같은 순위의 순서를 지킨다)
      enemies: game.enemies.filter((e) => !e.dead).sort((a, b) => rank(b) - rank(a)).slice(0, MAX_SAVED_ENEMIES).map((e) => ({
        type: e.type, x: r1(e.x), y: r1(e.y), hp: Math.round(e.hp), maxHp: Math.round(e.maxHp),
        speed: r1(e.speed), damage: r1(e.damage), xp: e.xp, r: e.r, scale: e.scale,
        elite: e.elite || undefined, boss: e.boss || undefined, index: e.index, name: e.name,
      })),
      gems: game.gems.map((g) => [r1(g.x), r1(g.y), r1(g.value)]),
      items: game.items.map((it) => [r1(it.x), r1(it.y), it.kind, it.value]),
    };
  };

  G.saveRun = function (game) {
    if (!game.player || !game.stage) return false;
    return G.storage.set(G.RUN_KEY, G.serializeRun(game));
  };

  G.clearRun = function () { G.storage.remove(G.RUN_KEY); };

  G.loadRunData = function () {
    const d = G.storage.get(G.RUN_KEY);
    if (!d || d.v !== 1 || !d.player || !G.CHAMPIONS[d.player.champion] || !Array.isArray(d.player.weapons)) return null;
    // 숫자가 깨진 저장은 화면 그리기에서 멈추므로 버린다
    if (![d.time, d.player.x, d.player.y, d.player.hp, d.player.level].every(Number.isFinite)) return null;
    // 판 시간이 난이도별로 줄기 전의 저장은 이미 끝난 시간일 수 있다
    if (G.difficultyById && d.time >= G.difficultyById(d.difficultyId).time) return null;
    ['enemies', 'gems', 'items'].forEach((k) => { if (!Array.isArray(d[k])) d[k] = []; });
    return d;
  };

  G.savedRunSummary = function () {
    const d = G.loadRunData();
    if (!d) return null;
    return {
      stageName: G.stageById(d.stageId).name + (d.difficultyId && d.difficultyId !== 'normal' ? ' ' + G.difficultyById(d.difficultyId).name : ''),
      championName: G.CHAMPIONS[d.player.champion].name,
      time: d.time,
      level: d.player.level,
    };
  };

  // 저장된 판을 game에 되살린다 (game.newRun과 같은 초기화 뒤에 부른다)
  G.restoreRun = function (game, d) {
    const p = game.player;
    Object.assign(p, {
      x: d.player.x, y: d.player.y, level: d.player.level, xp: d.player.xp,
      xpNext: d.player.xpNext, revivesUsed: d.player.revivesUsed || 0,
      // 이름이 바뀌거나 빠진 패시브·조합은 건너뛴다(예전 저장도 읽히게)
      passives: pickKnown(d.player.passives, G.PASSIVES), fusions: (d.player.fusions || []).filter((k) => G.FUSIONS[k]),
    });
    p.weapons = [];
    d.player.weapons.forEach((w) => {
      if (G.WEAPONS[w.key]) G.addWeapon(p, w.key, w.level).timer = w.timer || 0.3;
    });
    G.recalcStats(game);
    p.hp = Math.min(p.maxHp, d.player.hp);

    game.time = d.time;
    game.kills = d.kills;
    game.runGold = d.runGold || 0;
    game.pendingLevelUps = d.pendingLevelUps || 0;
    game.chestQueue = Array.isArray(d.chestQueue) ? d.chestQueue.slice() : Array(d.pendingChests || 0).fill('elite');
    if (typeof d.rerollsLeft === 'number') game.rerollsLeft = d.rerollsLeft;
    Object.assign(game.director, d.director);

    d.enemies.forEach((s) => {
      if (s.boss) {
        if (!G.BOSS_TYPES[s.type]) return;
        const e = G.spawnBoss(game, s.index || 0, true);
        Object.assign(e, { x: s.x, y: s.y, hp: s.hp, maxHp: s.maxHp });
        return;
      }
      if (!G.ENEMY_TYPES[s.type]) return;
      const e = G.spawnEnemy(game, s.type, s.x, s.y, !!s.elite);
      Object.assign(e, { hp: s.hp, maxHp: s.maxHp, speed: s.speed, damage: s.damage, xp: s.xp, r: s.r, scale: s.scale });
    });
    d.gems.forEach((g) => G.dropGem(game, g[0], g[1], g[2]));
    d.items.forEach((it) => G.dropItem(game, it[0], it[1], it[2], it[3]));
    game.banner = null;
    game.cam.x = p.x;
    game.cam.y = p.y;
  };
})(window.G);
