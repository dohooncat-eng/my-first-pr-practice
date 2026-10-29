// 적: 종류 정의, 추적 이동, 피해·처치, 그리기
(function (G) {
  'use strict';

  // feet: 몸 중심에서 발까지 거리 (스프라이트 기준점 위치)
  G.ENEMY_TYPES = {
    slime: { name: '이끼 슬라임', hp: 12, speed: 62, r: 13, damage: 8, xp: 1, feet: 12, fps: 6, shadow: 14, color: '#6fbf73' },
    bat: { name: '그림자 박쥐', hp: 6, speed: 112, r: 11, damage: 5, xp: 1, feet: -4, fps: 12, shadow: 9, fly: true, color: '#9b7fd1' },
    golem: { name: '바위 골렘', hp: 55, speed: 36, r: 21, damage: 14, xp: 3, feet: 22, fps: 4, shadow: 22, color: '#a39a8c' },
  };

  let nextId = 1;
  const near = [];

  G.spawnEnemy = function (game, type, x, y, elite) {
    const t = G.ENEMY_TYPES[type];
    const minutes = game.time / 60;
    const scale = elite ? 1.8 : 1;
    const hp = t.hp * (1 + minutes * 0.28) * (elite ? 14 : 1);
    const e = {
      id: nextId++, type, x, y, scale,
      r: t.r * scale,
      hp, maxHp: hp,
      speed: t.speed * (1 + minutes * 0.025) * (elite ? 0.85 : 1),
      damage: t.damage * (1 + minutes * 0.06) * (elite ? 1.6 : 1),
      xp: elite ? 25 : t.xp,
      elite: !!elite,
      flash: 0, kx: 0, ky: 0, slow: 0,
      phase: Math.random() * 10,
      hitUntil: {},
      dead: false,
    };
    game.enemies.push(e);
    return e;
  };

  // 화면 바로 바깥 무작위 지점
  G.spawnPoint = function (game, extra) {
    const a = Math.random() * Math.PI * 2;
    const d = game.viewRadius + 40 + (extra || 0);
    return { x: game.player.x + Math.cos(a) * d, y: game.player.y + Math.sin(a) * d };
  };

  // soft: 지속 피해(오라)라서 번쩍이지 않고 숫자도 작게 보인다
  G.damageEnemy = function (game, e, base, kx, ky, soft) {
    if (e.dead) return;
    const dmg = Math.max(1, Math.round(base * game.player.stats.damage * G.rand(0.9, 1.1)));
    e.hp -= dmg;
    if (!soft) e.flash = 0.1;
    const resist = e.elite ? 0.2 : e.type === 'golem' ? 0.45 : 1;
    e.kx += kx * resist;
    e.ky += ky * resist;
    G.addDamageNumber(game, e.x, e.y - e.r - 4, dmg, dmg >= 30, soft);
    if (e.hp <= 0) G.killEnemy(game, e);
  };

  G.killEnemy = function (game, e) {
    e.dead = true;
    game.kills++;
    const t = G.ENEMY_TYPES[e.type];
    const gemScale = 1 + Math.floor(game.time / 120) * 0.25;
    G.dropGem(game, e.x, e.y, e.xp * gemScale);
    G.burst(game, e.x, e.y, t.color, e.elite ? 26 : 7, e.elite ? 260 : 150);
    if (e.elite) {
      G.burst(game, e.x, e.y, 'rgba(255, 150, 70, 0.9)', 16, 220, true);
      G.dropItem(game, e.x + 14, e.y, 'heal');
      G.addShake(game, 8);
    } else {
      const r = Math.random();
      if (r < 0.003) G.dropItem(game, e.x, e.y, 'magnet');
      else if (r < 0.011) G.dropItem(game, e.x, e.y, 'heal');
    }
  };

  G.updateEnemies = function (game, dt) {
    const p = game.player;
    const grid = game.grid;
    for (const e of game.enemies) {
      if (e.dead) continue;
      const dx = p.x - e.x, dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;

      // 너무 멀어진 적은 화면 근처로 다시 데려온다
      if (d > game.despawnDist) {
        const pt = G.spawnPoint(game);
        e.x = pt.x;
        e.y = pt.y;
        continue;
      }

      const sp = e.speed * (e.slow > 0 ? 0.55 : 1);
      let vx = (dx / d) * sp, vy = (dy / d) * sp;
      if (e.type === 'bat') {
        // 박쥐는 좌우로 흔들리며 날아온다
        const w = Math.sin(game.time * 5 + e.phase) * 0.7;
        vx += (-dy / d) * sp * w;
        vy += (dx / d) * sp * w;
      }

      // 서로 겹치지 않게 밀어내기
      grid.query(e.x, e.y, e.r + 26, near);
      let sx = 0, sy = 0;
      for (let i = 0; i < near.length; i++) {
        const o = near[i];
        if (o === e) continue;
        const ox = e.x - o.x, oy = e.y - o.y;
        const rr = (e.r + o.r) * 0.9;
        const dd = ox * ox + oy * oy;
        if (dd < rr * rr && dd > 0.0001) {
          const dl = Math.sqrt(dd);
          const push = (rr - dl) / rr;
          sx += (ox / dl) * push;
          sy += (oy / dl) * push;
        }
      }
      const sepK = e.elite ? 25 : 70;
      vx += sx * sepK;
      vy += sy * sepK;

      e.x += (vx + e.kx) * dt;
      e.y += (vy + e.ky) * dt;
      const decay = Math.min(1, dt * 9);
      e.kx -= e.kx * decay;
      e.ky -= e.ky * decay;
      e.flash -= dt;
      e.slow -= dt;

      if (d < e.r + p.r) G.damagePlayer(game, e.damage);
    }
  };

  function inView(game, e) {
    return Math.abs(e.x - game.cam.x) < game.viewW / 2 + 80 &&
      Math.abs(e.y - game.cam.y) < game.viewH / 2 + 80;
  }

  G.drawEnemies = function (ctx, game) {
    const p = game.player;
    const list = game.enemies;
    // 아래쪽에 있는 적이 앞에 보이도록 y 순서로 그린다
    const vis = game._visEnemies || (game._visEnemies = []);
    vis.length = 0;
    for (const e of list) if (!e.dead && inView(game, e)) vis.push(e);
    vis.sort((a, b) => a.y - b.y);

    // 그림자 먼저 한 번에
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    for (const e of vis) {
      const t = G.ENEMY_TYPES[e.type];
      const sy = e.y + (t.fly ? 18 : t.feet) * e.scale;
      const rx = t.shadow * e.scale;
      ctx.moveTo(e.x + rx, sy);
      ctx.ellipse(e.x, sy, rx, rx * 0.36, 0, 0, Math.PI * 2);
    }
    ctx.fill();

    for (const e of vis) {
      const t = G.ENEMY_TYPES[e.type];
      if (e.elite) {
        // 엘리트 발밑의 붉은 고리
        const pulse = 0.6 + Math.sin(game.clock * 6 + e.phase) * 0.25;
        ctx.strokeStyle = 'rgba(255, 107, 61, ' + pulse + ')';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(e.x, e.y + t.feet * e.scale, e.r * 1.25, e.r * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      const frame = Math.floor(game.clock * t.fps + e.phase) % 4;
      const spr = G.art.get(e.type, frame);
      const bob = t.fly ? Math.sin(game.clock * 4 + e.phase) * 3 : 0;
      if (spr) {
        // 엘리트는 계속 맞으므로 번쩍임을 약하게
        const flash = e.flash > 0 ? (e.flash / 0.1) * (e.elite ? 0.3 : 0.55) : 0;
        G.drawSprite(ctx, spr, e.x, e.y + t.feet * e.scale + bob, e.scale, p.x < e.x, flash);
      } else {
        ctx.fillStyle = e.flash > 0 ? '#fff' : t.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y + bob, e.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  // 엘리트 체력 막대와 눈빛 (어둠 위에 그림)
  G.drawEnemyOverlay = function (ctx, game) {
    for (const e of game._visEnemies || []) {
      if (!e.elite || e.dead) continue;
      const w = e.r * 2.2, x = e.x - w / 2, y = e.y - e.r - 16;
      ctx.fillStyle = 'rgba(8, 12, 11, 0.85)';
      ctx.fillRect(x - 1.5, y - 1.5, w + 3, 7);
      ctx.fillStyle = '#ff6b3d';
      ctx.fillRect(x, y, w * Math.max(0, e.hp / e.maxHp), 4);
    }
  };

  G.drawEnemyGlow = function (ctx, game) {
    for (const e of game._visEnemies || []) {
      if (e.dead) continue;
      if (e.elite) G.drawGlow(ctx, 'rgba(255, 90, 50, 0.5)', e.x, e.y, e.r * 2.4, 0.7);
      else if (e.type === 'golem') G.drawGlow(ctx, 'rgba(255, 140, 60, 0.35)', e.x, e.y - 4, e.r * 1.2, 0.5);
    }
  };
})(window.G);
