// 타격감 효과: 데미지 숫자, 파티클, 화면 흔들림, 알림 문구
(function (G) {
  'use strict';

  const MAX_NUMBERS = 60;
  const MAX_PARTICLES = 300;

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

  // 흔들림은 약하게: 들어온 세기의 0.4배, 최대 6px, 빨리 가라앉는다
  G.addShake = function (game, amount) {
    if (game.settings && !game.settings.shake) return;
    amount *= game.reducedMotion ? 0.15 : 0.4;
    game.shake = Math.min(6, game.shake + amount);
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
  const blastList = [];
  G.levelUpBlast = function (game) {
    const p = game.player;
    G.ring(game, p.x, p.y, 10, 240, 0.55, 'rgba(255, 214, 130, 0.95)', 7);
    G.ring(game, p.x, p.y, 10, 150, 0.4, 'rgba(255, 245, 210, 0.9)', 3);
    G.burst(game, p.x, p.y - 10, 'rgba(255, 210, 120, 0.95)', 24, 260, true);
    G.screenFlash(game, '255, 214, 140', 0.18, 0.35);
    for (const e of G.enemiesInCircle(game, p.x, p.y, 200, blastList)) {
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

    game.shake = Math.max(0, game.shake - dt * 40);
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

  // 데미지 숫자: 글자를 스타일마다 한 번 그려 둔 판에서 잘라 찍는다 (매 프레임 글자를 그리면 느리다)
  const GLYPHS = '0123456789+GMIS';
  const NUM_STYLES = ['', 'big', 'soft', 'crit', 'heal'];
  const NUM_COLORS = ['#fff6e4', '#ffd27a', '#ffcf8a', '#ff8a5c', '#8affb0'];
  const BAKE = 40, PAD = 6;
  const FONT_CHECK = BAKE + 'px "Black Han Sans"';
  let atlas = null, atlasFont = false, fontPoll = 0;

  function buildAtlas() {
    atlasFont = !document.fonts || document.fonts.check(FONT_CHECK);
    const font = BAKE + 'px "Black Han Sans", "IBM Plex Sans KR", sans-serif';
    const c = document.createElement('canvas');
    const cx = c.getContext('2d');
    cx.font = font;
    const cellH = Math.ceil(BAKE * 1.3) + PAD * 2;
    const widths = GLYPHS.split('').map((ch) => Math.ceil(cx.measureText(ch).width) + PAD * 2);
    c.width = widths.reduce((a, b) => a + b, 0);
    c.height = cellH * NUM_STYLES.length;
    cx.font = font;
    cx.textBaseline = 'middle';
    cx.lineJoin = 'round';
    cx.lineWidth = 3.5 * BAKE / 15;
    cx.strokeStyle = 'rgba(8, 12, 11, 0.9)';
    const map = {};
    NUM_STYLES.forEach((st, row) => {
      map[st] = {};
      let x = 0;
      GLYPHS.split('').forEach((ch, i) => {
        const y = row * cellH;
        cx.fillStyle = NUM_COLORS[row];
        cx.strokeText(ch, x + PAD, y + cellH / 2);
        cx.fillText(ch, x + PAD, y + cellH / 2);
        map[st][ch] = { x, y, w: widths[i], h: cellH };
        x += widths[i];
      });
    });
    atlas = { canvas: c, map };
  }

  G.drawNumbers = function (ctx, game) {
    if (!atlas || (!atlasFont && ++fontPoll % 60 === 0 && document.fonts.check(FONT_CHECK))) buildAtlas();
    const img = atlas.canvas;
    for (const d of game.numbers) {
      const t = d.life / d.max;
      // 처음에 살짝 커졌다 작아지는 팝
      const pop = t > 0.8 ? 1 + (t - 0.8) * 2.5 : 1;
      const st = d.style || '';
      const size = (st === 'crit' ? 20 : st === 'big' || st === 'heal' ? 17 : st === 'soft' ? 10 : 13) * pop;
      const k = size / BAKE;
      const glyphs = atlas.map[st] || atlas.map[''];
      const str = String(d.n);
      let total = 0;
      for (let i = 0; i < str.length; i++) {
        const g = glyphs[str[i]];
        if (g) total += (g.w - PAD * 2) * k;
      }
      ctx.globalAlpha = Math.min(1, t * 2.2) * (st === 'soft' ? 0.6 : 1);
      let x = d.x - total / 2;
      for (let i = 0; i < str.length; i++) {
        const g = glyphs[str[i]];
        if (!g) continue;
        ctx.drawImage(img, g.x, g.y, g.w, g.h, x - PAD * k, d.y - (g.h * k) / 2, g.w * k, g.h * k);
        x += (g.w - PAD * 2) * k;
      }
    }
    ctx.globalAlpha = 1;
  };
})(window.G);
