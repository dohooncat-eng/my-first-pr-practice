// 상자·뽑기 연출용 화면 전체 입자 캔버스: 빨려드는 빛, 폭발 불꽃, 충격파 고리, 빛기둥, 별 색종이
// 입자가 있을 때만 그리고, 없으면 멈춘다. 화면 터치는 막지 않는다.
(function (G) {
  'use strict';

  const MAX = 900;
  let cv = null, ctx = null, dpr = 1, running = false, last = 0;
  const parts = [];   // 불꽃·별·빨려드는 빛
  const rings = [];   // 충격파
  const pillars = []; // 빛기둥
  const pulls = [];   // 계속 빛을 빨아들이는 곳

  function ensure() {
    if (cv) return true;
    cv = document.createElement('canvas');
    cv.className = 'celebrate-fx';
    cv.setAttribute('aria-hidden', 'true');
    ctx = cv.getContext('2d');
    if (!ctx) { cv = null; return false; }
    document.body.appendChild(cv);
    resize();
    window.addEventListener('resize', resize);
    return true;
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(window.innerWidth * dpr);
    cv.height = Math.round(window.innerHeight * dpr);
  }

  function rgba(c, a) { return 'rgba(' + c + ',' + a.toFixed(3) + ')'; }

  function add(p) {
    if (parts.length >= MAX) parts.shift();
    parts.push(p);
  }

  function start() {
    if (running) return;
    running = true;
    last = 0;
    requestAnimationFrame(tick);
  }

  // 요소의 화면 중심
  function centerOf(elm) {
    const r = elm.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function drawStar(x, y, r, rot) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = rot + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fill();
  }

  function tick(ts) {
    const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
    last = ts;
    const w = cv.width / dpr, h = cv.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';

    // 빨려드는 빛 만들기
    for (let i = pulls.length - 1; i >= 0; i--) {
      const s = pulls[i];
      s.life -= dt;
      if (s.life <= 0) { pulls.splice(i, 1); continue; }
      s.acc += dt * s.rate;
      while (s.acc >= 1) {
        s.acc--;
        const a = Math.random() * Math.PI * 2;
        const d = 140 + Math.random() * Math.max(w, h) * 0.35;
        add({ kind: 'in', x: s.x + Math.cos(a) * d, y: s.y + Math.sin(a) * d, tx: s.x, ty: s.y, t: 0, life: 0.55 + Math.random() * 0.35, c: s.c, size: 1.5 + Math.random() * 2.5, sx: 0, sy: 0 });
      }
    }

    for (let i = pillars.length - 1; i >= 0; i--) {
      const p = pillars[i];
      p.t += dt;
      if (p.t >= p.life) { pillars.splice(i, 1); continue; }
      const k = p.t / p.life;
      const a = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
      const pw = p.w * (0.6 + 0.4 * Math.sin(Math.min(1, k * 3) * Math.PI / 2));
      const g = ctx.createLinearGradient(p.x - pw, 0, p.x + pw, 0);
      g.addColorStop(0, rgba(p.c, 0));
      g.addColorStop(0.5, rgba(p.c, 0.55 * a));
      g.addColorStop(1, rgba(p.c, 0));
      ctx.fillStyle = g;
      ctx.fillRect(p.x - pw, 0, pw * 2, h);
      const core = ctx.createLinearGradient(p.x - pw * 0.25, 0, p.x + pw * 0.25, 0);
      core.addColorStop(0, 'rgba(255,255,255,0)');
      core.addColorStop(0.5, rgba('255,255,255', 0.7 * a));
      core.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = core;
      ctx.fillRect(p.x - pw * 0.25, 0, pw * 0.5, h);
    }

    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.t += dt;
      if (r.t >= r.life) { rings.splice(i, 1); continue; }
      const k = r.t / r.life;
      const e = 1 - Math.pow(1 - k, 3);
      ctx.strokeStyle = rgba(r.c, (1 - k) * 0.9);
      ctx.lineWidth = r.width * (1 - k) + 1;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.max * e, 0, Math.PI * 2);
      ctx.stroke();
    }

    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt;
      if (p.t >= p.life) { parts.splice(i, 1); continue; }
      const k = p.t / p.life;
      if (p.kind === 'in') {
        // 바깥에서 중심으로 점점 빨라지며 빨려든다
        const e = k * k;
        const x = p.x + (p.tx - p.x) * e, y = p.y + (p.ty - p.y) * e;
        const px = p.x + (p.tx - p.x) * Math.max(0, e - 0.08), py = p.y + (p.ty - p.y) * Math.max(0, e - 0.08);
        ctx.strokeStyle = rgba(p.c, Math.min(1, k * 2) * 0.9);
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x, y);
        ctx.stroke();
        continue;
      }
      p.vx *= 1 - p.drag * dt;
      p.vy = p.vy * (1 - p.drag * dt) + p.grav * dt;
      const ox = p.x, oy = p.y;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const a = k < 0.1 ? k / 0.1 : 1 - (k - 0.1) / 0.9;
      if (p.kind === 'star') {
        p.rot += p.spin * dt;
        ctx.fillStyle = rgba(p.c, a);
        drawStar(p.x, p.y, p.size * (0.7 + 0.3 * Math.sin(p.t * 14 + p.size)), p.rot);
      } else {
        // 꼬리 달린 불꽃
        ctx.strokeStyle = rgba(p.c, a);
        ctx.lineWidth = p.size * (1 - k * 0.6);
        ctx.beginPath();
        ctx.moveTo(ox - p.vx * 0.03, oy - p.vy * 0.03);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    if (parts.length || rings.length || pillars.length || pulls.length) requestAnimationFrame(tick);
    else { running = false; ctx.clearRect(0, 0, w, h); }
  }

  G.celebrate = {
    centerOf,

    // (x, y)로 빛이 빨려든다
    charge(x, y, color, seconds, rate) {
      if (!ensure()) return;
      pulls.push({ x, y, c: color, life: seconds, rate: rate || 70, acc: 0 });
      start();
    },

    // 사방으로 터지는 불꽃 (colors 중에서 고른다)
    burst(x, y, opts) {
      if (!ensure()) return;
      const o = opts || {};
      const n = o.count || 60;
      const cols = o.colors || ['255,214,150'];
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = (o.speed || 520) * (0.35 + Math.random() * 0.65);
        add({
          kind: o.stars && Math.random() < 0.35 ? 'star' : 'spark',
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.lift || 0),
          t: 0, life: (o.life || 1.1) * (0.6 + Math.random() * 0.6),
          c: cols[(Math.random() * cols.length) | 0], size: (o.size || 3) * (0.6 + Math.random() * 0.8),
          drag: o.drag === undefined ? 2.2 : o.drag, grav: o.grav === undefined ? 320 : o.grav,
          rot: Math.random() * 6, spin: (Math.random() - 0.5) * 10,
        });
      }
      start();
    },

    ring(x, y, color, max, life, width) {
      if (!ensure()) return;
      rings.push({ x, y, c: color, max: max || 320, life: life || 0.7, width: width || 10, t: 0 });
      start();
    },

    pillar(x, color, width, life) {
      if (!ensure()) return;
      pillars.push({ x, c: color, w: width || 90, life: life || 1.6, t: 0 });
      start();
    },

    // 위에서 별 색종이가 흩날린다
    confetti(colors, count) {
      if (!ensure()) return;
      const w = window.innerWidth;
      for (let i = 0; i < (count || 80); i++) {
        add({
          kind: 'star', x: Math.random() * w, y: -20 - Math.random() * 200,
          vx: (Math.random() - 0.5) * 80, vy: 80 + Math.random() * 160,
          t: 0, life: 2.4 + Math.random() * 1.4, c: colors[(Math.random() * colors.length) | 0],
          size: 3 + Math.random() * 5, drag: 0.4, grav: 60, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 8,
        });
      }
      start();
    },

    // 화면 흔들기 (CSS 애니메이션 다시 걸기)
    shake(elm, strong) {
      const cls = strong ? 'fx-quake-big' : 'fx-quake';
      elm.classList.remove('fx-quake', 'fx-quake-big');
      void elm.offsetWidth;
      elm.classList.add(cls);
      setTimeout(() => elm.classList.remove(cls), 600);
    },

    clear() {
      parts.length = 0; rings.length = 0; pillars.length = 0; pulls.length = 0;
    },
  };
})(window.G);
