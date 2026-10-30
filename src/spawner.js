// 스폰 디렉터: 스테이지의 적 4역할(기본·빠른·단단·원거리)을 시간에 따라 내보내고, 엘리트·떼·중간 보스를 부른다
(function (G) {
  'use strict';

  G.MAX_ENEMIES = 800;

  G.createDirector = function () {
    return { acc: 0, nextElite: 60, nextSwarm: 90, bossIndex: 0, finalWave: false };
  };

  G.createDirectorFor = function (diff) {
    const d = G.createDirector();
    d.nextElite = diff.eliteEvery;
    return d;
  };

  function pickRole(m) {
    const w = {
      basic: 1,
      fast: m >= 1 ? 0.45 + m * 0.05 : 0,
      tank: m >= 3 ? 0.12 + m * 0.035 : 0,
      ranged: m >= 2 ? 0.2 + m * 0.012 : 0,
    };
    let r = Math.random() * (w.basic + w.fast + w.tank + w.ranged);
    if ((r -= w.basic) < 0) return 'basic';
    if ((r -= w.fast) < 0) return 'fast';
    if ((r -= w.tank) < 0) return 'tank';
    return 'ranged';
  }

  G.updateSpawner = function (game, dt) {
    const d = game.director;
    const roster = game.stage.enemies;
    const t = G.curveTime(game), m = t / 60; // 20분 곡선 위의 위치

    // 1초에 나오는 적 수(보통): 처음엔 적게, 중반에 가파르게, 후반엔 완만하게(S자).
    // 0분 0.5 → 2분 1.9 → 4분 4.6 → 6분 8.3 → 8분 13 → 10분 18 → 15분 31 → 20분 43마리(× crowd), 마지막 2분은 더 몰려온다
    // 짧은 판은 곡선을 빨리 지나가므로 1초에 그만큼 더 내보내, 한 판에 만나는 적 수를 20분 판과 맞춘다. 그 위에 1.4배.
    const diff = game.difficulty;
    // 최종 보스와 싸우는 동안은 절반만
    const crowd = 1.8 * G.WIN_TIME / G.runTime(game) * (game.boss && game.boss.final ? 0.5 : 1);
    const rate = (0.5 + m * 0.3 + m * m * 0.2 - m * m * m * 0.0055 + (m >= 18 ? 3 : 0)) * diff.spawn * crowd;
    if (game.enemies.length < G.MAX_ENEMIES) d.acc += rate * dt;
    while (d.acc >= 1) {
      d.acc -= 1;
      const pt = G.spawnPoint(game);
      G.spawnEnemy(game, roster[pickRole(m)], pt.x, pt.y, false);
    }

    if (t >= d.nextElite) {
      const at = d.nextElite;
      d.nextElite += diff.eliteEvery;
      // 중간 보스가 나오는 때에는 엘리트를 쉬게 한다
      if (G.BOSS_TIMES.indexOf(at) === -1) {
        const role = m < 3 ? 'basic' : G.pick(['basic', 'tank', 'fast']);
        const pt = G.spawnPoint(game);
        G.spawnEnemy(game, roster[role], pt.x, pt.y, true);
        const name = G.ENEMY_TYPES[roster[role]].name;
        const hasBatchim = (name.charCodeAt(name.length - 1) - 0xac00) % 28 !== 0;
        G.announce(game, '강한 ' + name + (hasBatchim ? '이' : '가') + ' 다가옵니다');
        if (G.sfx) G.sfx.play('elite');
      }
    }

    if (t >= d.nextSwarm) {
      d.nextSwarm += 90;
      // 빠른 적 떼가 사방에서 원을 그리며 조여 온다
      const count = Math.max(0, Math.min(G.MAX_ENEMIES - game.enemies.length, Math.round(Math.min(160, (18 + Math.floor(m * 7)) * diff.spawn))));
      const r = game.viewRadius + 20;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        G.spawnEnemy(game, roster.fast, game.player.x + Math.cos(a) * r, game.player.y + Math.sin(a) * r, false);
      }
      G.announce(game, G.ENEMY_TYPES[roster.fast].name + ' 떼가 몰려옵니다!');
      if (G.sfx) G.sfx.play('swarm');
    }

    if (d.bossIndex < G.BOSS_TIMES.length && t >= G.BOSS_TIMES[d.bossIndex]) {
      G.spawnBoss(game, d.bossIndex);
      d.bossIndex++;
    }

    if (!d.finalWave && game.time >= G.runTime(game) - 60) {
      d.finalWave = true;
      G.announce(game, '1분 뒤, 이 땅의 주인이 깨어납니다');
    }
  };
})(window.G);
