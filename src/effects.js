// 타격감 효과: 데미지 숫자, 파티클, 화면 흔들림, 알림 문구
(function (G) {
  'use strict';

  const MAX_NUMBERS = 90;
  const MAX_PARTICLES = 500;

  // style: '' 보통, 'big' 큰 피해, 'soft' 지속 피해, 'crit' 치명타, 'heal' 회복
  G.addDamageNumber = function (game, x, y, n, style) {
    if (game.settings && !game.settings.numbers && style !== 'heal') return;
    const arr = game.numbers;
    if (arr.length >= MAX_NUMBERS) arr.shift();
    const life = style === 'soft' ? 0.45 : style === 'heal' ? 0.9 : 0.65;
    arr.push({ x: x + G.rand(-6, 6), y, n, style, life, max: life });
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
    if (game.settings && !game.settings.shake) return;
    if (game.reducedMotion) amount *= 0.3;
    game.shake = Math.min(14, game.shake + amount);
  };

  // 퍼져 나가는 빛 고리 (가산 합성으로 그린다)
  const MAX_RINGS = 40;
  G.ring = function (game, x, y, r0, r1, life, color, width) {
    if (game.rings.length >= MAX_RINGS) game.rings.shift();
    game.rings.push({ x, y, r0, r1, life, max: life, color, width: width || 4 });
  };

  // 화면 전체가 잠깐 물드는 효과 (rgb는 '255, 210, 120' 형식)
  G.screenFlash = function (game, rgb, alpha, life) {
    if (game.reducedMotion) alpha *= 0.4;
    game.flash = { rgb, alpha, life, max: life };
  };

  // 레벨업 선택 직후: 금빛 충격파가 주변 적을 밀어낸다
  G.levelUpBlast = function (game) {
    const p = game.player;
    G.ring(game, p.x, p.y, 10, 240, 0.55, 'rgba(255, 214, 130, 0.95)', 7);
    G.ring(game, p.x, p.y, 10, 150, 0.4, 'rgba(255, 245, 210, 0.9)', 3);
    G.burst(game, p.x, p.y - 10, 'rgba(255, 210, 120, 0.95)', 24, 260, true);
    G.screenFlash(game, '255, 214, 140', 0.18, 0.35);
    for (const e of G.enemiesInCircle(game, p.x, p.y, 200, [])) {
      const dx = e.x - p.x, dy = e.y - p.y;
      const k = (e.boss ? 60 : 520) / (Math.hypot(dx, dy) || 1);
      e.kx += dx * k;
      e.ky += dy * k;
    }
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

    for (const r of game.rings) {
      r.life -= dt;
      if (r.life <= 0) r.dead = true;
    }
    G.compact(game.rings);
    if (game.flash) {
      game.flash.life -= dt;
      if (game.flash.life <= 0) game.flash = null;
    }

    // 발걸음 먼지
    const p = game.player;
    if (p && p.moving) {
      game.dustTimer = (game.dustTimer || 0) - dt;
      if (game.dustTimer <= 0 && game.particles.length < MAX_PARTICLES - 40) {
        game.dustTimer = 0.16;
        const dust = game.stage && game.stage.dust || 'rgba(120, 110, 90, 0.5)';
        for (let i = 0; i < 2; i++) {
          game.particles.push({
            x: p.x + G.rand(-6, 6), y: p.y + 13, vx: -p.face.x * G.rand(10, 40) + G.rand(-15, 15), vy: G.rand(-18, -4),
            life: 0.45, max: 0.45, size: G.rand(2, 3.5), color: dust, glow: false,
          });
        }
      }
    }

    game.shake = Math.max(0, game.shake - dt * 30);
    if (game.banner) {
      game.banner.life -= dt;
      if (game.banner.life <= 0) game.banner = null;
    }
  };

  G.drawRings = function (ctx, game) {
    for (const r of game.rings) {
      const t = 1 - r.life / r.max;
      const ease = 1 - (1 - t) * (1 - t);
      ctx.globalAlpha = (1 - t) * 0.9;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * (1 - t * 0.6);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r0 + (r.r1 - r.r0) * ease, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  };

  G.drawScreenFlash = function (ctx, game) {
    const f = game.flash;
    if (!f) return;
    ctx.fillStyle = 'rgba(' + f.rgb + ', ' + (f.alpha * f.life / f.max) + ')';
    ctx.fillRect(0, 0, game.w, game.h);
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
      const st = d.style;
      const size = (st === 'crit' ? 20 : st === 'big' || st === 'heal' ? 17 : st === 'soft' ? 10 : 13) * pop;
      ctx.font = size + 'px "Black Han Sans", "IBM Plex Sans KR", sans-serif';
      ctx.globalAlpha = Math.min(1, t * 2.2) * (st === 'soft' ? 0.6 : 1);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(8, 12, 11, 0.9)';
      ctx.strokeText(d.n, d.x, d.y);
      ctx.fillStyle = st === 'heal' ? '#8affb0' : st === 'crit' ? '#ff8a5c' : st === 'big' ? '#ffd27a' : st === 'soft' ? '#ffcf8a' : '#fff6e4';
      ctx.fillText(d.n, d.x, d.y);
    }
    ctx.globalAlpha = 1;
  };
})(window.G);
