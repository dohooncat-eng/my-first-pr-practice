// 스폰 디렉터: 스테이지의 적 3역할(기본·빠른·단단)을 시간에 따라 내보내고, 엘리트·떼·중간 보스를 부른다
(function (G) {
  'use strict';

  const MAX_ENEMIES = 420;

  G.createDirector = function () {
    return { acc: 0, nextElite: 60, nextSwarm: 90, bossIndex: 0, finalWave: false };
  };

  function pickRole(m) {
    const w = {
      basic: 1,
      fast: m >= 1 ? 0.45 + m * 0.05 : 0,
      tank: m >= 2 ? 0.2 + m * 0.035 : 0,
    };
    let r = Math.random() * (w.basic + w.fast + w.tank);
    if ((r -= w.basic) < 0) return 'basic';
    if ((r -= w.fast) < 0) return 'fast';
    return 'tank';
  }

  G.updateSpawner = function (game, dt) {
    const d = game.director;
    const roster = game.stage.enemies;
    const t = game.time, m = t / 60;

    // 1초에 나오는 적 수: 처음 1마리 남짓 → 10분 7마리 → 20분 13마리, 마지막 2분은 더 몰려온다
    const rate = 0.7 + m * 0.62 + (m >= 18 ? 2.5 : 0);
    if (game.enemies.length < MAX_ENEMIES) d.acc += rate * dt;
    while (d.acc >= 1) {
      d.acc -= 1;
      const pt = G.spawnPoint(game);
      G.spawnEnemy(game, roster[pickRole(m)], pt.x, pt.y, false);
    }

    if (t >= d.nextElite) {
      d.nextElite += 60;
      const role = m < 3 ? 'basic' : G.pick(['basic', 'tank', 'fast']);
      const pt = G.spawnPoint(game);
      G.spawnEnemy(game, roster[role], pt.x, pt.y, true);
      const name = G.ENEMY_TYPES[roster[role]].name;
      const hasBatchim = (name.charCodeAt(name.length - 1) - 0xac00) % 28 !== 0;
      G.announce(game, '강한 ' + name + (hasBatchim ? '이' : '가') + ' 다가옵니다');
    }

    if (t >= d.nextSwarm) {
      d.nextSwarm += 90;
      // 빠른 적 떼가 사방에서 원을 그리며 조여 온다
      const count = Math.min(70, 18 + Math.floor(m * 3));
      const r = game.viewRadius + 20;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        G.spawnEnemy(game, roster.fast, game.player.x + Math.cos(a) * r, game.player.y + Math.sin(a) * r, false);
      }
      G.announce(game, G.ENEMY_TYPES[roster.fast].name + ' 떼가 몰려옵니다!');
    }

    if (d.bossIndex < G.BOSS_TIMES.length && t >= G.BOSS_TIMES[d.bossIndex]) {
      G.spawnBoss(game, d.bossIndex);
      d.bossIndex++;
    }

    if (!d.finalWave && t >= G.WIN_TIME - 60) {
      d.finalWave = true;
      G.announce(game, '새벽까지 1분! 버티세요');
    }
  };
})(window.G);
