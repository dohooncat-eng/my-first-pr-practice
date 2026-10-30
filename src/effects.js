// 타격감 효과: 데미지 숫자, 파티클, 화면 흔들림, 알림 문구
(function (G) {
  'use strict';

  const MAX_NUMBERS = 54;
  const MAX_PARTICLES = 220;
  const MAX_RINGS = 24;
  // 활성 목록과 빈 슬롯을 분리한다. 처치가 몰려도 새 효과 객체를 만들지 않는다.
  function bank(n) { const a = []; for (let i = 0; i < n; i++) a.push({}); return a; }
  const numberBank = bank(MAX_NUMBERS), particleBank = bank(MAX_PARTICLES), ringBank = bank(MAX_RINGS);
  const freeNumbers = [], freeParticles = [], freeRings = [];
  const flashSlot = {};
  function rand(lo, hi) { return lo + G.fx.random() * (hi - lo); }
  function take(list, free, cap) {
    if (list.length >= cap || !free.length) return null;
    const v = free.pop(); v.dead = false; list.push(v); return v;
  }
  function sweep(list, free, dt) {
    let n = 0;
    for (let i = 0; i < list.length; i++) {
      const v = list[i]; v.life -= dt;
      if (v.life <= 0 || v.dead) { v.sprite = null; free.push(v); }
      else list[n++] = v;
    }
    list.length = n;
  }
  G.resetEffects = function (game) {
    freeNumbers.length = freeParticles.length = freeRings.length = 0;
    for (const v of numberBank) freeNumbers.push(v);
    for (const v of particleBank) { v.sprite = null; freeParticles.push(v); }
    for (const v of ringBank) freeRings.push(v);
    game.dustTimer = 0;
  };

  // style: '' 보통, 'big' 큰 피해, 'soft' 지속 피해, 'crit' 치명타, 'heal' 회복
  G.addDamageNumber = function (game, x, y, n, style) {
    if (game.settings && !game.settings.numbers && style !== 'heal') return;
    if (!G.inView(game, x, y, 60)) return;
    const arr = game.numbers, cap = G.fx.low(game) ? 26 : MAX_NUMBERS;
    // 작은 지속 피해가 치명타·회복 숫자를 밀어내지 않게 여유를 남긴다.
    if (style === 'soft' && arr.length > cap * 0.55) return;
    let d = take(arr, freeNumbers, cap);
    if (!d && (style === 'crit' || style === 'heal')) {
      for (const v of arr) if (v.style !== 'crit' && v.style !== 'heal') { d = v; break; }
    }
    if (!d) return;
    const life = style === 'soft' ? 0.45 : style === 'heal' ? 0.9 : 0.65;
    d.x = x + rand(-8, 8); d.y = y; d.n = String(n); d.style = style; d.life = d.max = life;
    d.vx = style === 'crit' ? rand(-30, 30) : rand(-10, 10);
    d.vy = style === 'crit' ? -100 : style === 'big' ? -75 : -42;
  };

  // 한 점에서 사방으로 튀는 파티클. glow면 가산 합성으로 빛난다.
  G.burst = function (game, x, y, color, count, speed, glow, family) {
    if (!G.inView(game, x, y, 100)) return;
    const arr = game.particles, low = G.fx.low(game), quiet = game.fx && game.fx.quiet;
    const cap = low ? 56 : MAX_PARTICLES;
    if (low) count = Math.ceil(count * 0.3);
    if (quiet) { count = Math.ceil(count * 0.45); speed *= 0.45; }
    for (let i = 0; i < count; i++) {
      const p = take(arr, freeParticles, cap); if (!p) break;
      const a = rand(0, Math.PI * 2), s = speed * rand(0.3, 1), life = rand(0.22, 0.48);
      p.x = x; p.y = y; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s - speed * 0.15;
      p.life = p.max = life; p.size = rand(2, 4.5); p.color = color; p.glow = !!glow;
      p.sprite = glow ? G.fx.fragment(family === undefined ? G.fx.family(G.curWeaponKey) : family) : null;
    }
  };

  G.addShake = function (game, amount, dx, dy) { G.fx.shake(game, amount, dx, dy); };

  // 퍼져 나가는 빛 고리 (가산 합성으로 그린다)
  G.ring = function (game, x, y, r0, r1, life, color, width) {
    if (!G.inView(game, x, y, r1)) return;
    const r = take(game.rings, freeRings, G.fx.low(game) ? 8 : MAX_RINGS); if (!r) return;
    r.x = x; r.y = y; r.r0 = r0; r.r1 = r1; r.life = r.max = life; r.color = color; r.width = width || 4;
  };

  // 화면 전체가 잠깐 물드는 효과 (rgb는 '255, 210, 120' 형식)
  G.screenFlash = function (game, rgb, alpha, life) {
    if (G.fx.quiet(game)) alpha *= 0.25;
    const f = game.flash = flashSlot;
    f.rgb = rgb; f.alpha = Math.min(0.24, alpha); f.life = f.max = life;
  };

  // 레벨업 선택 직후: 금빛 충격파가 주변 적을 밀어낸다
  const blastList = [];
  G.levelUpBlast = function (game) {
    const p = game.player;
    G.fx.level(game);
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
    sweep(game.numbers, freeNumbers, dt);
    for (const d of game.numbers) {
      d.x += d.vx * dt; d.y += d.vy * dt;
      d.vy += (d.style === 'crit' || d.style === 'big' ? 155 : 25) * dt;
    }
    sweep(game.particles, freeParticles, dt);
    for (const p of game.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - Math.min(1, dt * 4);
      p.vy *= 1 - Math.min(1, dt * 4);
    }
    sweep(game.rings, freeRings, dt);
    if (game.flash) {
      game.flash.life -= dt;
      if (game.flash.life <= 0) game.flash = null;
    }

    // 발걸음 먼지
    const p = game.player;
    if (p && p.moving && !G.fx.low(game) && !game.fx.quiet) {
      game.dustTimer = (game.dustTimer || 0) - dt;
      if (game.dustTimer <= 0 && game.particles.length < MAX_PARTICLES - 40) {
        game.dustTimer = 0.16;
        const dust = game.stage && game.stage.dust || 'rgba(120, 110, 90, 0.5)';
        G.burst(game, p.x, p.y + 13, dust, 2, 25, false);
      }
    }

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

  G.drawScreenFlash = function (ctx, game) { G.fx.drawScreen(ctx, game); };

  G.drawParticles = function (ctx, game, glowPass) {
    for (const p of game.particles) {
      if (p.glow !== glowPass) continue;
      const a = p.life / p.max;
      if (!G.inView(game, p.x, p.y, 15)) continue;
      if (glowPass && p.sprite) {
        ctx.globalAlpha = Math.min(1, a * 1.7);
        const r = p.size * (0.65 + a * 0.35) * 2;
        ctx.drawImage(p.sprite, p.x - r, p.y - r, r * 2, r * 2);
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
      const pop = game.fx.quiet ? 1 : t > 0.8 ? 1 + Math.sin((1 - t) * Math.PI / 0.2) * 0.35 : 1;
      const st = d.style || '';
      const size = (st === 'crit' ? 23 : st === 'big' || st === 'heal' ? 17 : st === 'soft' ? 10 : 13) * pop;
      const k = size / BAKE;
      const glyphs = atlas.map[st] || atlas.map[''];
      const str = d.n;
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
