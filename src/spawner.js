// 시간에 따라 적을 내보내는 스폰 디렉터
(function (G) {
  'use strict';

  const MAX_ENEMIES = 420;
  G.WIN_TIME = 600; // 10분 버티면 클리어

  G.createDirector = function () {
    return { acc: 0, nextElite: 60, nextSwarm: 90, finalWave: false };
  };

  function pickType(m) {
    const w = {
      slime: 1,
      bat: m >= 1 ? 0.45 + m * 0.08 : 0,
      golem: m >= 2 ? 0.2 + m * 0.05 : 0,
    };
    const total = w.slime + w.bat + w.golem;
    let r = Math.random() * total;
    if ((r -= w.slime) < 0) return 'slime';
    if ((r -= w.bat) < 0) return 'bat';
    return 'golem';
  }

  G.updateSpawner = function (game, dt) {
    const d = game.director;
    const t = game.time, m = t / 60;

    // 1초에 나오는 적 수: 처음 1마리 남짓에서 10분쯤 12마리 정도
    const rate = 0.7 + m * 1.05 + (m >= 9 ? 2.5 : 0);
    if (game.enemies.length < MAX_ENEMIES) d.acc += rate * dt;
    while (d.acc >= 1) {
      d.acc -= 1;
      const pt = G.spawnPoint(game);
      G.spawnEnemy(game, pickType(m), pt.x, pt.y, false);
    }

    if (t >= d.nextElite) {
      d.nextElite += 60;
      const type = m < 3 ? 'slime' : m < 6 ? 'golem' : G.pick(['slime', 'golem', 'bat']);
      const pt = G.spawnPoint(game);
      G.spawnEnemy(game, type, pt.x, pt.y, true);
      const name = G.ENEMY_TYPES[type].name;
      const hasBatchim = (name.charCodeAt(name.length - 1) - 0xac00) % 28 !== 0;
      G.announce(game, '강한 ' + name + (hasBatchim ? '이' : '가') + ' 다가옵니다');
    }

    if (t >= d.nextSwarm) {
      d.nextSwarm += 90;
      // 박쥐 떼가 사방에서 원을 그리며 조여 온다
      const count = 18 + Math.floor(m * 4);
      const r = game.viewRadius + 20;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        G.spawnEnemy(game, 'bat', game.player.x + Math.cos(a) * r, game.player.y + Math.sin(a) * r, false);
      }
      G.announce(game, '박쥐 떼가 몰려옵니다!');
    }

    if (!d.finalWave && t >= G.WIN_TIME - 60) {
      d.finalWave = true;
      G.announce(game, '새벽까지 1분! 버티세요');
    }
  };
})(window.G);
