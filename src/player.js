// 플레이어(등불지기): 이동, 체력, 경험치, 그리기
(function (G) {
  'use strict';

  G.xpToNext = function (level) {
    return Math.floor(5 + (level - 1) * 7 + Math.pow(level - 1, 1.6));
  };

  G.createPlayer = function () {
    return {
      x: 0, y: 0, r: 14,
      hp: 100, maxHp: 100,
      baseSpeed: 155,
      face: { x: 1, y: 0 }, flip: false, moving: false, walk: 0,
      invuln: 0, hurt: 0,
      level: 1, xp: 0, xpNext: G.xpToNext(1),
      stats: { damage: 1, cooldown: 1, speed: 1, magnet: 85 },
      weapons: [],
      passives: {},
    };
  };

  G.updatePlayer = function (game, dt) {
    const p = game.player;
    const mv = G.input.getMove();
    const speed = p.baseSpeed * p.stats.speed;
    p.x += mv.x * speed * dt;
    p.y += mv.y * speed * dt;
    const m = Math.hypot(mv.x, mv.y);
    p.moving = m > 0.05;
    if (p.moving) {
      p.face.x = mv.x / m;
      p.face.y = mv.y / m;
      if (Math.abs(mv.x) > 0.1) p.flip = mv.x < 0;
      p.walk += dt * 9 * Math.max(0.6, m);
    }
    p.invuln = Math.max(0, p.invuln - dt);
    p.hurt = Math.max(0, p.hurt - dt);
  };

  G.damagePlayer = function (game, amount) {
    const p = game.player;
    if (p.invuln > 0 || p.hp <= 0) return;
    p.hp = Math.max(0, p.hp - amount);
    p.invuln = 0.45;
    p.hurt = 0.25;
    G.addShake(game, 5);
    G.burst(game, p.x, p.y - 6, '#e0445a', 7, 140);
  };

  G.healPlayer = function (game, amount) {
    const p = game.player;
    const before = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + amount);
    const healed = Math.round(p.hp - before);
    if (healed > 0) {
      game.numbers.push({ x: p.x, y: p.y - 34, n: '+' + healed, big: true, heal: true, life: 0.9, max: 0.9 });
      G.burst(game, p.x, p.y - 8, 'rgba(120, 255, 170, 0.8)', 10, 90, true);
    }
  };

  G.gainXp = function (game, value) {
    const p = game.player;
    p.xp += value * game.xpMul;
    while (p.xp >= p.xpNext) {
      p.xp -= p.xpNext;
      p.level++;
      p.xpNext = G.xpToNext(p.level);
      game.pendingLevelUps++;
    }
  };

  // 등불이 있는 위치 (빛의 중심)
  G.lanternPos = function (p) {
    return { x: p.x + (p.flip ? -15 : 15), y: p.y - 1 };
  };

  G.drawPlayer = function (ctx, game) {
    const p = game.player;
    // 발밑 그림자
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 14, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const blink = p.invuln > 0 && Math.floor(game.clock * 22) % 2 === 0;
    ctx.globalAlpha = blink ? 0.5 : 1;
    const frame = p.moving ? Math.floor(p.walk) % 4 : 0;
    const spr = G.art.get('player', frame);
    const breathe = p.moving ? 0 : Math.sin(game.clock * 2.6) * 0.02;
    if (spr) {
      ctx.save();
      ctx.translate(p.x, p.y + 14);
      ctx.scale(1, 1 + breathe);
      G.drawSprite(ctx, spr, 0, 0, 1, p.flip, p.hurt > 0.12 ? 0.75 : 0);
      ctx.restore();
    } else {
      ctx.fillStyle = p.hurt > 0.12 ? '#fff' : '#ece4d2';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  // 발밑 체력 막대 (어둠 위에 그려서 항상 보이게)
  G.drawPlayerBar = function (ctx, game) {
    const p = game.player;
    const w = 40, h = 5, x = p.x - w / 2, y = p.y + 22;
    ctx.fillStyle = 'rgba(8, 12, 11, 0.85)';
    ctx.fillRect(x - 1.5, y - 1.5, w + 3, h + 3);
    ctx.fillStyle = '#4a1822';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = p.hp / p.maxHp < 0.3 ? '#ff5a5a' : '#e0445a';
    ctx.fillRect(x, y, w * (p.hp / p.maxHp), h);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(x, y, w * (p.hp / p.maxHp), 1.5);
  };
})(window.G);
