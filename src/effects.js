// 타격감 효과: 데미지 숫자, 파티클, 화면 흔들림, 알림 문구
(function (G) {
  'use strict';

  const MAX_NUMBERS = 90;
  const MAX_PARTICLES = 500;

  G.addDamageNumber = function (game, x, y, n, big, soft) {
    const arr = game.numbers;
    if (arr.length >= MAX_NUMBERS) arr.shift();
    arr.push({ x: x + G.rand(-6, 6), y, n, big, soft, life: soft ? 0.45 : 0.65, max: soft ? 0.45 : 0.65 });
  };

  // 한 점에서 사방으로 튀는 파티클. glow면 가산 합성으로 빛난다.
  G.burst = function (game, x, y, color, count, speed, glow) {
    const arr = game.particles;
    for (let i = 0; i < count && arr.length < MAX_PARTICLES; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * G.rand(0.3, 1);
      const life = G.rand(0.3, 0.6);
      arr.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.2,
        life, max: life, size: G.rand(2, 4.5), color, glow: !!glow,
      });
    }
  };

  G.addShake = function (game, amount) {
    if (game.reducedMotion) amount *= 0.3;
    game.shake = Math.min(14, game.shake + amount);
  };

  G.announce = function (game, text) {
    game.banner = { text, life: 2.8, max: 2.8 };
  };

  G.updateEffects = function (game, dt) {
    for (const d of game.numbers) {
      d.life -= dt;
      d.y -= 38 * dt;
      if (d.life <= 0) d.dead = true;
    }
    G.compact(game.numbers);

    for (const p of game.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - Math.min(1, dt * 4);
      p.vy *= 1 - Math.min(1, dt * 4);
      if (p.life <= 0) p.dead = true;
    }
    G.compact(game.particles);

    game.shake = Math.max(0, game.shake - dt * 30);
    if (game.banner) {
      game.banner.life -= dt;
      if (game.banner.life <= 0) game.banner = null;
    }
  };

  G.drawParticles = function (ctx, game, glowPass) {
    for (const p of game.particles) {
      if (p.glow !== glowPass) continue;
      const a = p.life / p.max;
      if (glowPass) {
        G.drawGlow(ctx, p.color, p.x, p.y, p.size * 3.2, a);
      } else {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  };

  G.drawNumbers = function (ctx, game) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const d of game.numbers) {
      const t = d.life / d.max;
      // 처음에 살짝 커졌다 작아지는 팝
      const pop = t > 0.8 ? 1 + (t - 0.8) * 2.5 : 1;
      const size = (d.big ? 17 : d.soft ? 10 : 13) * pop;
      ctx.font = size + 'px "Black Han Sans", "IBM Plex Sans KR", sans-serif';
      ctx.globalAlpha = Math.min(1, t * 2.2) * (d.soft ? 0.6 : 1);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(8, 12, 11, 0.9)';
      ctx.strokeText(d.n, d.x, d.y);
      ctx.fillStyle = d.heal ? '#8affb0' : d.big ? '#ffd27a' : d.soft ? '#ffcf8a' : '#fff6e4';
      ctx.fillText(d.n, d.x, d.y);
    }
    ctx.globalAlpha = 1;
  };
})(window.G);
