// 상자·등불의 빛비: 고정 입자 풀을 재사용하고, 살아 있는 빛이 없으면 멈춘다.
(function (G) {
  'use strict';
  const pool = [];
  for (let i = 0; i < 160; i++) pool.push({ life: 0, age: 0, x: 0, y: 0, vx: 0, vy: 0, size: 0, color: '', delay: 0, beam: false });
  let cv, ctx, raf = 0, last = 0, dpr = 1;
  const motions = [];
  const quiet = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = () => window.innerWidth < 600 || (G.meta && G.meta.settings.quality === 'low');
  function resize() {
    dpr = small() ? 1 : Math.min(1.5, window.devicePixelRatio || 1);
    cv.width = Math.round(innerWidth * dpr);
    cv.height = Math.round(innerHeight * dpr);
  }
  function ensure() {
    if (quiet()) return false;
    if (!cv) {
      cv = document.createElement('canvas');
      cv.className = 'celebrate-fx';
      cv.setAttribute('aria-hidden', 'true');
      ctx = cv.getContext('2d');
      if (!ctx) { cv = null; return false; }
      document.body.appendChild(cv);
      resize();
      window.addEventListener('resize', resize);
    }
    return true;
  }
  function slot() {
    const limit = small() ? 64 : 160;
    for (let i = 0; i < limit; i++) if (pool[i].life <= 0) return pool[i];
    return null;
  }
  function start() {
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
  }
  function tick(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    let alive = false;
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (p.life <= 0) continue;
      p.age += dt;
      if (p.age < p.delay) { alive = true; continue; }
      const t = p.age - p.delay;
      if (t >= p.life) { p.life = 0; continue; }
      alive = true;
      ctx.globalAlpha = Math.min(1, t * 8) * (1 - t / p.life);
      ctx.fillStyle = p.color;
      if (p.beam) {
        // 얇은 수직 빛결. 그라디언트 객체도 매 프레임 만들지 않는다.
        ctx.globalAlpha *= 0.24;
        ctx.fillRect(p.x - p.size / 2, 0, p.size, innerHeight);
        ctx.globalAlpha *= 2;
        ctx.fillRect(p.x - 1, 0, 2, innerHeight);
      } else {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 28 * dt;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(-0.32);
        ctx.fillRect(-p.size / 2, -p.size * 2, p.size, p.size * 4);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    raf = alive ? requestAnimationFrame(tick) : 0;
  }
  function emit(x, y, colors, count, speed, life, spread, delay) {
    if (!ensure()) return;
    const n = Math.min(count, small() ? 28 : 70);
    for (let i = 0; i < n; i++) {
      const p = slot(); if (!p) break;
      p.life = life; p.age = 0; p.delay = Math.random() * delay;
      p.x = x + (Math.random() - 0.5) * spread;
      p.y = y + Math.random() * 25;
      p.vx = (Math.random() - 0.5) * speed * 0.6;
      p.vy = -speed * (0.25 + Math.random() * 0.75);
      p.size = 1 + Math.random() * 2;
      p.color = 'rgb(' + colors[i % colors.length] + ')'; p.beam = false;
    }
    start();
  }
  G.celebrate = {
    centerOf(elm) { const r = elm.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; },
    charge(x, y, color, seconds, rate) { emit(x, y + 90, [color], Math.min(50, rate || 30), 100, seconds, 180, seconds * 0.65); },
    burst(x, y, o) { o = o || {}; emit(x, y, o.colors || ['255,226,160'], o.count || 30, o.speed || 220, o.life || 1.2, 80, 0); },
    pillar(x, color, width, life) {
      if (!ensure()) return;
      const p = slot(); if (!p) return;
      p.life = life || 1; p.age = 0; p.delay = 0; p.x = x;
      p.size = width || 40; p.color = 'rgb(' + color + ')'; p.beam = true; start();
    },
    confetti(colors, count) { emit(innerWidth / 2, innerHeight + 20, colors, count || 40, 360, 2.5, innerWidth, 0.5); },
    shake(elm, strong) {
      if (quiet() || (G.meta && !G.meta.settings.shake)) return;
      const target = elm.querySelector('.chest-stage, .pull-lantern') || elm;
      const a = strong ? 5 : 2;
      const motion = target.animate([{ translate: '0 0' }, { translate: -a + 'px 2px' }, { translate: a + 'px -2px' }, { translate: '0 0' }], { duration: 280 });
      motions.push(motion);
    },
    clear() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      for (let i = 0; i < pool.length; i++) pool[i].life = 0;
      for (let i = 0; i < motions.length; i++) motions[i].cancel();
      motions.length = 0;
      if (ctx) ctx.clearRect(0, 0, cv.width, cv.height);
    },
  };
})(window.G);
