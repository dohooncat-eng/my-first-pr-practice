'use strict';
/* 통합과학 가상 실험실 — 공통 도구: 테마 색, 캔버스, 그래프, 조작 장치, 실험 등록 */

const LAB = { modules: [] };
const SUBJECTS = {
  chem: { name: '화학', token: '--chem' },
  phys: { name: '물리', token: '--phys' },
  earth: { name: '지구·우주', token: '--earth' },
  life: { name: '생명', token: '--life' },
};
function registerModule(m) { LAB.modules.push(m); }

/* ---------- 테마 색 (캔버스에서 읽기) ---------- */
const Theme = {
  cache: new Map(),
  v(name) {
    let c = this.cache.get(name);
    if (c === undefined) {
      c = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      this.cache.set(name, c);
    }
    return c;
  },
  reset() { this.cache.clear(); document.dispatchEvent(new Event('labtheme')); },
};
try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => Theme.reset()); } catch (e) { /* 오래된 브라우저 */ }
new MutationObserver(() => Theme.reset()).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

/* ---------- 작은 도구 ---------- */
const U = {
  clamp: (v, a, b) => Math.min(b, Math.max(a, v)),
  lerp: (a, b, t) => a + (b - a) * t,
  fmt(v, d = 1) {
    if (v == null || !isFinite(v)) return '—';
    return v.toLocaleString('ko-KR', { minimumFractionDigits: d, maximumFractionDigits: d });
  },
  sign(v, d = 1) { return (v > 0.0000001 ? '+' : v < -0.0000001 ? '−' : '±') + U.fmt(Math.abs(v), d); },
  html(s) { const t = document.createElement('template'); t.innerHTML = s.trim(); return t.content.firstElementChild; },
  rgb(c) {
    c = (c || '').trim();
    if (c[0] === '#') {
      if (c.length === 4) c = '#' + [...c.slice(1)].map(x => x + x).join('');
      return [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
    }
    const m = c.match(/[\d.]+/g);
    return m ? m.slice(0, 3).map(Number) : [128, 128, 128];
  },
  rgba(c, a) { const [r, g, b] = U.rgb(c); return `rgba(${r},${g},${b},${a})`; },
  mix(c1, c2, t) { const a = U.rgb(c1), b = U.rgb(c2); return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`; },
  rng(seed) {
    return () => {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  },
  gcd(a, b) { return b ? U.gcd(b, a % b) : a; },
  lcm(a, b) { return a / U.gcd(a, b) * b; },
  note(title, body, cls = '') { return `<div class="note ${cls}"><h3>${title}</h3>${body}</div>`; },
  qa(q, a) { return `<details class="qa"><summary>${q}</summary><p>${a}</p></details>`; },
  notesHead(title = '이론 노트', sub = '') { return `<div class="notes-head"><h2>${title}</h2>${sub ? `<span>${sub}</span>` : ''}</div>`; },
};

const ICON = {
  play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z" fill="currentColor"/></svg>',
  reset: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8a5 5 0 1 0 1.6-3.7M3 2.5v3h3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

/* ---------- 캔버스 그리기 ---------- */
const Draw = {
  font(ctx, size, weight = 500, data = false) {
    ctx.font = `${weight} ${size}px ${data ? '"IBM Plex Mono", ui-monospace, monospace' : '"IBM Plex Sans KR", "Apple SD Gothic Neo", sans-serif'}`;
  },
  text(ctx, s, x, y, o = {}) {
    Draw.font(ctx, o.size || 12, o.weight || 500, o.data);
    ctx.fillStyle = o.color || Theme.v('--ink');
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.base || 'alphabetic';
    ctx.fillText(s, x, y);
  },
  arrow(ctx, x1, y1, x2, y2, color, w = 2, head = 8) {
    const a = Math.atan2(y2 - y1, x2 - x1), len = Math.hypot(x2 - x1, y2 - y1);
    if (len < 1) return;
    const hh = Math.min(head, len * 0.6);
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * hh * 0.7, y2 - Math.sin(a) * hh * 0.7); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(a - 0.42) * hh, y2 - Math.sin(a - 0.42) * hh);
    ctx.lineTo(x2 - Math.cos(a + 0.42) * hh, y2 - Math.sin(a + 0.42) * hh);
    ctx.closePath(); ctx.fill();
  },
  // 이온·입자: 색 원 + 글자
  ion(ctx, x, y, r, color, label, textColor = '#fff') {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
    if (label) {
      Draw.font(ctx, Math.max(8, r * (label.length > 3 ? 0.62 : 0.82)), 700);
      ctx.fillStyle = textColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, x, y + 0.5);
    }
  },
  pill(ctx, x, y, h, color, label, textColor = '#fff') {
    Draw.font(ctx, h * 0.52, 700);
    const w = ctx.measureText(label).width + h * 0.7;
    ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, h / 2); ctx.fillStyle = color; ctx.fill();
    ctx.fillStyle = textColor; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, x, y + 0.5);
    return w;
  },
};

/* ---------- 범위 (반복 루프, 캔버스, 이벤트 정리) ---------- */
function makeScope() {
  const fns = [];
  const s = {
    add(fn) { fns.push(fn); },
    on(target, ev, fn, opt) { target.addEventListener(ev, fn, opt); fns.push(() => target.removeEventListener(ev, fn, opt)); },
    loop(fn) {
      let alive = true, last = performance.now(), id = 0;
      const tick = t => {
        if (!alive) return;
        const dt = Math.min(0.05, Math.max(0, (t - last) / 1000)); last = t;
        try { fn(dt, t / 1000); } catch (e) { console.error(e); alive = false; return; }
        id = requestAnimationFrame(tick);
      };
      id = requestAnimationFrame(tick);
      fns.push(() => { alive = false; cancelAnimationFrame(id); });
    },
    stage(canvas, onResize) {
      const ctx = canvas.getContext('2d');
      const st = { ctx, W: 0, H: 0, canvas };
      const fit = quiet => {
        const r = canvas.getBoundingClientRect();
        if (r.width < 2) return;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        st.W = r.width; st.H = r.height;
        if (onResize && quiet !== true) onResize();
      };
      const ro = new ResizeObserver(() => fit()); ro.observe(canvas); fit(true);
      fns.push(() => ro.disconnect());
      return st;
    },
    child() { const c = makeScope(); fns.push(() => c.dispose()); return c; },
    dispose() { while (fns.length) { try { fns.pop()(); } catch (e) { console.error(e); } } },
  };
  return s;
}

/* ---------- 조작 장치 ---------- */
const Ctl = {
  range(id, label, o) {
    return `<div class="ctl"><div class="ctl-top"><label for="${id}">${label}</label><output id="${id}-o" for="${id}"></output></div>` +
      `<input type="range" id="${id}" min="${o.min}" max="${o.max}" step="${o.step}" value="${o.value}">` +
      (o.hint ? `<p class="ctl-hint">${o.hint}</p>` : '') + '</div>';
  },
  seg(id, label, opts, value) {
    return `<div class="ctl">${label ? `<span class="ctl-label" id="${id}-l">${label}</span>` : ''}` +
      `<div class="seg" id="${id}" role="group"${label ? ` aria-labelledby="${id}-l"` : ''}>` +
      opts.map(([v, t]) => `<button type="button" data-v="${v}" aria-pressed="${String(v) === String(value)}">${t}</button>`).join('') +
      '</div></div>';
  },
  check(id, label, checked) {
    return `<label class="switch" for="${id}"><input type="checkbox" id="${id}"${checked ? ' checked' : ''}>${label}</label>`;
  },
  select(id, label, opts, value) {
    return `<div class="ctl"><label for="${id}" class="ctl-label">${label}</label><select id="${id}">` +
      opts.map(([v, t]) => `<option value="${v}"${String(v) === String(value) ? ' selected' : ''}>${t}</option>`).join('') + '</select></div>';
  },
};
function bindRange(root, id, o, fn) {
  const el = root.querySelector('#' + id), out = root.querySelector('#' + id + '-o');
  const show = () => { out.textContent = o.format ? o.format(+el.value) : U.fmt(+el.value, o.digits ?? 0) + (o.unit || ''); };
  el.addEventListener('input', () => { show(); fn(+el.value); });
  show();
  return {
    el,
    get value() { return +el.value; },
    set(v, silent) { el.value = v; show(); if (!silent) fn(+el.value); },
    setMax(m) { el.max = m; show(); },
    refresh: show,
  };
}
function bindSeg(root, id, fn) {
  const g = root.querySelector('#' + id);
  const ui = v => g.querySelectorAll('button[data-v]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === String(v))));
  g.addEventListener('click', e => {
    const b = e.target.closest('button[data-v]');
    if (!b || !g.contains(b)) return;
    ui(b.dataset.v); fn(b.dataset.v);
  });
  return { set(v, silent) { ui(v); if (!silent) fn(String(v)); } };
}
function bindCheck(root, id, fn) {
  const el = root.querySelector('#' + id);
  el.addEventListener('change', () => fn(el.checked));
  return el;
}
function tabs(root, defs, scope, initial) {
  root.insertAdjacentHTML('beforeend',
    `<div class="tabs" role="tablist">${defs.map(d => `<button role="tab" type="button" data-t="${d.id}" aria-selected="false">${d.label}</button>`).join('')}</div><div class="tab-body"></div>`);
  const bar = root.querySelector('.tabs'), body = root.querySelector('.tab-body');
  let child = null;
  const open = id => {
    if (child) child.dispose();
    child = scope.child();
    body.innerHTML = '';
    bar.querySelectorAll('[role="tab"]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.t === id)));
    const d = defs.find(x => x.id === id) || defs[0];
    d.mount(body, child, open);
  };
  bar.addEventListener('click', e => { const b = e.target.closest('[data-t]'); if (b) open(b.dataset.t); });
  open(initial || defs[0].id);
  return open;
}

/* ---------- 그래프 (SVG) ---------- */
const SVGNS = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs, parent) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) if (attrs[k] != null) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function niceTicks(a, b, n = 5) {
  if (!(b > a)) { a -= 1; b += 1; }
  const raw = (b - a) / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
  const step = (f >= 7.5 ? 10 : f >= 3.5 ? 5 : f >= 1.5 ? 2 : 1) * mag;
  const ticks = [];
  for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + step * 1e-6; v += step) ticks.push(Math.abs(v) < step * 1e-6 ? 0 : +v.toPrecision(12));
  return { ticks, step };
}
function interpY(data, x, step) {
  const n = data.length;
  if (!n) return null;
  if (x <= data[0][0]) return data[0][1];
  if (x >= data[n - 1][0]) return data[n - 1][1];
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (data[mid][0] <= x) lo = mid; else hi = mid; }
  const [x0, y0] = data[lo], [x1, y1] = data[hi];
  if (step) return y0;
  if (y0 == null || y1 == null) return null;
  return x1 === x0 ? y1 : y0 + (y1 - y0) * (x - x0) / (x1 - x0);
}
function tickText(v) {
  const a = Math.abs(v);
  if (a >= 1e5 || (a > 0 && a < 1e-3)) return v.toExponential(0).replace('e+', 'e');
  return String(+v.toPrecision(6));
}
let chartUid = 0;
function chart(box, cfg) {
  if (!box._chart) {
    box.classList.add('chart');
    box.innerHTML = '<div class="legend"></div><div class="plot"><svg role="img"></svg><div class="tip" hidden></div></div>';
    const C = box._chart = {
      id: 'ch' + (++chartUid), svg: box.querySelector('svg'), tip: box.querySelector('.tip'),
      legend: box.querySelector('.legend'), plot: box.querySelector('.plot'), w: 0,
    };
    C.svg.addEventListener('pointermove', e => chartHover(box, e));
    C.svg.addEventListener('pointerleave', () => chartHide(box));
    let raf = 0;
    new ResizeObserver(() => {
      const w = Math.round(C.plot.clientWidth);
      if (w === C.w) return;
      cancelAnimationFrame(raf); raf = requestAnimationFrame(() => box._cfg && chartDraw(box));
    }).observe(C.plot);
  }
  box._cfg = cfg;
  chartDraw(box);
}
function chartDraw(box) {
  const cfg = box._cfg, C = box._chart, svg = C.svg;
  const W = Math.max(240, Math.round(C.plot.clientWidth || 480)), H = cfg.height || 220;
  C.w = Math.round(C.plot.clientWidth);
  const M = { t: 12, r: 16, b: cfg.xLabel ? 44 : 28, l: cfg.yLabel ? 62 : 46 };
  if (cfg.margin) Object.assign(M, cfg.margin);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.style.height = H + 'px';
  svg.setAttribute('aria-label', cfg.title || cfg.yLabel || '그래프');
  const series = cfg.series || [];
  const [x0, x1] = cfg.x;
  let y0, y1, yt;
  if (cfg.y) {
    [y0, y1] = cfg.y;
    yt = cfg.yTicks || niceTicks(y0, y1, cfg.yCount || 5).ticks.filter(t => t >= y0 - 1e-9 && t <= y1 + 1e-9);
  } else {
    let lo = Infinity, hi = -Infinity;
    for (const s of series) for (const p of s.data) {
      const [x, y] = p;
      if (y != null && isFinite(y) && x >= x0 - 1e-9 && x <= x1 + 1e-9) { if (y < lo) lo = y; if (y > hi) hi = y; }
    }
    for (const v of cfg.yInclude || []) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
    if (!isFinite(lo)) { lo = 0; hi = 1; }
    const minSpan = cfg.yMinSpan || 1e-9;
    if (hi - lo < minSpan) { const c = (hi + lo) / 2; lo = c - minSpan / 2; hi = c + minSpan / 2; }
    const st = niceTicks(lo, hi, cfg.yCount || 5).step;
    y0 = Math.floor(lo / st + 1e-9) * st; y1 = Math.ceil(hi / st - 1e-9) * st;
    if (y1 <= y0) y1 = y0 + st;
    yt = niceTicks(y0, y1, cfg.yCount || 5).ticks;
  }
  const pw = W - M.l - M.r, ph = H - M.t - M.b;
  const sx = x => M.l + (x - x0) / (x1 - x0) * pw;
  const sy = y => M.t + (y1 - y) / (y1 - y0) * ph;
  C.sc = { sx, sy, x0, x1, y0, y1, M, W, H };
  svg.textContent = '';
  const defs = svgEl('defs', {}, svg);
  const cp = svgEl('clipPath', { id: C.id + 'c' }, defs);
  svgEl('rect', { x: M.l, y: M.t - 3, width: pw, height: ph + 6 }, cp);

  // 띠
  for (const b of cfg.bands || []) {
    if (b.x0 != null) {
      const a = sx(Math.max(x0, b.x0)), z = sx(Math.min(x1, b.x1));
      if (z > a) svgEl('rect', { x: a, y: M.t, width: z - a, height: ph, style: `fill:${b.color};fill-opacity:${b.opacity ?? .12}` }, svg);
      if (b.label && z - a > 30) { const t = svgEl('text', { x: (a + z) / 2, y: M.t + 12, 'text-anchor': 'middle', class: 'reflbl' }, svg); t.textContent = b.label; }
    } else {
      const a = sy(Math.min(y1, b.y1)), z = sy(Math.max(y0, b.y0));
      if (z > a) svgEl('rect', { x: M.l, y: a, width: pw, height: z - a, style: `fill:${b.color};fill-opacity:${b.opacity ?? .12}` }, svg);
      if (b.label) { const t = svgEl('text', { x: M.l + 6, y: a + 12, class: 'reflbl' }, svg); t.textContent = b.label; }
    }
  }
  // 격자와 눈금
  const yf = cfg.yFmtTick || tickText, xf = cfg.xFmtTick || tickText;
  for (const t of yt) {
    svgEl('line', { x1: M.l, x2: M.l + pw, y1: sy(t), y2: sy(t), class: 'gridline' }, svg);
    const tx = svgEl('text', { x: M.l - 7, y: sy(t) + 3.5, 'text-anchor': 'end' }, svg); tx.textContent = yf(t);
  }
  const xt = cfg.xTicks || niceTicks(x0, x1, W < 420 ? 4 : 6).ticks.filter(t => t >= x0 - 1e-9 && t <= x1 + 1e-9);
  svgEl('line', { x1: M.l, x2: M.l + pw, y1: M.t + ph, y2: M.t + ph, class: 'axisline' }, svg);
  for (const t of xt) {
    svgEl('line', { x1: sx(t), x2: sx(t), y1: M.t + ph, y2: M.t + ph + 4, class: 'axisline' }, svg);
    const tx = svgEl('text', { x: sx(t), y: M.t + ph + 16, 'text-anchor': 'middle' }, svg); tx.textContent = xf(t);
  }
  if (cfg.xLabel) { const t = svgEl('text', { x: M.l + pw / 2, y: H - 6, 'text-anchor': 'middle', class: 'axl' }, svg); t.textContent = cfg.xLabel; }
  if (cfg.yLabel) {
    const t = svgEl('text', { x: 0, y: 0, 'text-anchor': 'middle', class: 'axl', transform: `translate(13 ${M.t + ph / 2}) rotate(-90)` }, svg);
    t.textContent = cfg.yLabel;
  }
  // 기준선
  for (const h of cfg.hlines || []) {
    if (h.y < y0 || h.y > y1) continue;
    svgEl('line', { x1: M.l, x2: M.l + pw, y1: sy(h.y), y2: sy(h.y), class: 'ref', style: h.color ? `stroke:${h.color}` : null }, svg);
    if (h.label) { const t = svgEl('text', { x: M.l + pw - 4, y: sy(h.y) - 5, 'text-anchor': 'end', class: 'reflbl' }, svg); t.textContent = h.label; }
  }
  for (const v of cfg.vlines || []) {
    if (v.x < x0 || v.x > x1) continue;
    svgEl('line', { x1: sx(v.x), x2: sx(v.x), y1: M.t, y2: M.t + ph, class: 'ref', style: v.color ? `stroke:${v.color}` : null }, svg);
    if (v.label) {
      const right = sx(v.x) < M.l + pw - 70;
      const t = svgEl('text', { x: sx(v.x) + (right ? 5 : -5), y: M.t + 11, 'text-anchor': right ? 'start' : 'end', class: 'reflbl' }, svg);
      t.textContent = v.label;
    }
  }
  // 계열
  const g = svgEl('g', { 'clip-path': `url(#${C.id}c)` }, svg);
  for (const s of series) {
    const segs = []; let cur = [];
    for (const p of s.data) {
      if (p[1] == null || !isFinite(p[1])) { if (cur.length) segs.push(cur); cur = []; continue; }
      cur.push(p);
    }
    if (cur.length) segs.push(cur);
    for (const seg of segs) {
      let d = '';
      seg.forEach((p, i) => {
        const X = sx(p[0]).toFixed(1), Y = sy(p[1]).toFixed(1);
        d += i === 0 ? `M${X},${Y}` : s.step ? `H${X}V${Y}` : `L${X},${Y}`;
      });
      if (s.area) {
        const base = sy(U.clamp(s.base ?? y0, y0, y1)).toFixed(1);
        svgEl('path', { d: `${d}L${sx(seg[seg.length - 1][0]).toFixed(1)},${base}L${sx(seg[0][0]).toFixed(1)},${base}Z`, style: `fill:${s.color};fill-opacity:${s.areaOpacity ?? .13};stroke:none` }, g);
      }
      if (seg.length > 1 || s.step) {
        svgEl('path', { d, style: `fill:none;stroke:${s.color};stroke-width:${s.width ?? 2};stroke-linejoin:round;stroke-linecap:round;${s.dash ? 'stroke-dasharray:' + s.dash + ';' : ''}${s.opacity != null ? 'opacity:' + s.opacity : ''}` }, g);
      }
    }
    if (s.dots) for (const p of s.data) if (p[1] != null) svgEl('circle', { cx: sx(p[0]), cy: sy(p[1]), r: s.dots, style: `fill:${s.color};stroke:var(--panel);stroke-width:1.5` }, g);
    if (s.bars) {
      const bw = s.barWidth || 14;
      for (const p of s.data) if (p[1] != null) {
        const top = sy(Math.max(p[1], y0)), base = sy(U.clamp(s.base ?? 0, y0, y1));
        svgEl('path', { d: roundTopBar(sx(p[0]) - bw / 2, Math.min(top, base), bw, Math.abs(base - top), 4), style: `fill:${p[2] || s.color}` }, g);
      }
    }
  }
  for (const p of cfg.points || []) {
    if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
    svgEl('circle', { cx: sx(p.x), cy: sy(p.y), r: p.r || 5, style: `fill:${p.fill || 'var(--panel)'};stroke:${p.color || 'var(--ink)'};stroke-width:2` }, svg);
    if (p.label) {
      const right = p.side ? p.side === 'right' : sx(p.x) < M.l + pw - 90;
      const t = svgEl('text', { x: sx(p.x) + (right ? 9 : -9), y: sy(p.y) + (p.dy ?? -8), 'text-anchor': right ? 'start' : 'end', class: 'reflbl' }, svg);
      t.textContent = p.label;
    }
  }
  if (cfg.cursor != null && cfg.cursor >= x0 && cfg.cursor <= x1) {
    const X = sx(cfg.cursor);
    svgEl('line', { x1: X, x2: X, y1: M.t, y2: M.t + ph, class: 'cursor' }, svg);
    for (const s of series) {
      if (s.cursor === false) continue;
      const y = interpY(s.data, cfg.cursor, s.step);
      if (y == null || y < y0 || y > y1) continue;
      svgEl('circle', { cx: X, cy: sy(y), r: 4.5, style: `fill:${s.color};stroke:var(--panel);stroke-width:2` }, svg);
    }
  }
  C.hover = svgEl('line', { x1: 0, x2: 0, y1: M.t, y2: M.t + ph, class: 'hover', visibility: 'hidden' }, svg);
  const items = series.filter(s => s.name && s.legend !== false);
  C.legend.innerHTML = items.map(s => `<span><i style="border-top-color:${s.color};${s.dash ? 'border-top-style:dashed;' : ''}"></i>${s.name}</span>`).join('') + (cfg.legendExtra || '');
  C.legend.hidden = !C.legend.innerHTML;
}
function roundTopBar(x, y, w, h, r) {
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}
function chartHide(box) {
  const C = box._chart; if (!C) return;
  C.tip.hidden = true;
  if (C.hover) C.hover.setAttribute('visibility', 'hidden');
}
function chartHover(box, e) {
  const C = box._chart, cfg = box._cfg, sc = C.sc;
  if (!sc || cfg.hover === false) return;
  const r = C.svg.getBoundingClientRect(), k = r.width / sc.W;
  const px = (e.clientX - r.left) / k;
  if (px < sc.M.l - 4 || px > sc.W - sc.M.r + 4) return chartHide(box);
  let x = sc.x0 + (px - sc.M.l) / (sc.W - sc.M.l - sc.M.r) * (sc.x1 - sc.x0);
  x = U.clamp(x, sc.x0, sc.x1);
  if (cfg.snap) x = cfg.snap(x);
  const html = cfg.tip ? cfg.tip(x) : defaultTip(cfg, x);
  if (!html) return chartHide(box);
  const X = sc.sx(x);
  C.hover.setAttribute('x1', X); C.hover.setAttribute('x2', X); C.hover.setAttribute('visibility', 'visible');
  C.tip.innerHTML = html; C.tip.hidden = false;
  const tw = C.tip.offsetWidth;
  let left = X * k + 12;
  if (left + tw > r.width) left = X * k - 12 - tw;
  C.tip.style.left = Math.max(0, left) + 'px';
  C.tip.style.top = (sc.M.t * k) + 'px';
}
function defaultTip(cfg, x) {
  const xs = cfg.xFmt ? cfg.xFmt(x) : U.fmt(x, 1);
  const rows = (cfg.series || []).filter(s => s.name && s.tip !== false).map(s => {
    const y = interpY(s.data, x, s.step);
    if (y == null) return '';
    const f = s.fmt || cfg.yFmt || (v => U.fmt(v, 2));
    return `<div><i style="background:${s.color}"></i>${s.name}<b>${f(y)}</b></div>`;
  }).join('');
  return `<div class="tip-x">${xs}</div>${rows}`;
}

/* ---------- 실험 페이지 틀 ---------- */
function modulePage(m) {
  const sub = SUBJECTS[m.subject];
  return U.html(`<article class="module" style="--acc: var(${sub.token})">
    <header class="mod-head">
      <div class="eyebrow"><span class="sq"></span>${sub.name}<span class="sep">·</span>${m.unit}</div>
      <h1>${m.title}</h1>
      <p class="lead">${m.lead}</p>
    </header>
    <div class="mod-body"></div>
  </article>`);
}
