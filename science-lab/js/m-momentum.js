'use strict';
/* 운동량과 충격량 — 수레 충돌, 달걀 떨어뜨리기 */
(() => {
  const TAU = 0.06;                 // 수레 충돌 시간 (s)
  const XA0 = 0.55, XB0 = 1.75, TRACK = 3;
  const width = m => 0.24 + 0.08 * m;

  registerModule({
    id: 'momentum', subject: 'phys', title: '운동량과 충격량', short: '운동량과 충격량',
    unit: '통합과학1 · 시스템과 상호작용',
    lead: '두 수레를 부딪쳐 충돌 전후의 운동량을 비교하고, 같은 충격량을 받더라도 충돌 시간이 길면 물체가 받는 힘이 작아진다는 것을 달걀 떨어뜨리기로 확인합니다.',
    desc: '운동량 보존, 작용 반작용, 반발 계수, 충격량과 평균 힘, 충돌 시간',
    icon: '<rect x="2" y="9" width="8" height="6" rx="1.2"/><rect x="14" y="9" width="8" height="6" rx="1.2"/><circle cx="4.5" cy="17" r="1.3"/><circle cx="7.5" cy="17" r="1.3"/><circle cx="16.5" cy="17" r="1.3"/><circle cx="19.5" cy="17" r="1.3"/><path d="M10 12h2"/>',
    mount(root, S) {
      tabs(root, [
        { id: 'cart', label: '수레 충돌과 운동량 보존', mount: mountCart },
        { id: 'egg', label: '충격량과 충돌 시간', mount: mountEgg },
      ], S);
    },
  });

  // 충돌 과정을 식으로 계산 (충돌 동안 힘은 반사인 모양)
  function model(p) {
    const wA = width(p.mA), wB = width(p.mB);
    const rel = p.vA - p.vB;
    const gap = (XB0 - wB / 2) - (XA0 + wA / 2);
    if (rel <= 1e-9) return { hit: false, wA, wB, end: 3 };
    const tc = gap / rel, J = p.mA * p.mB * (1 + p.e) * rel / (p.mA + p.mB);
    const vA2 = p.vA - J / p.mA, vB2 = p.vB + J / p.mB;
    const end = Math.min(tc + TAU + 2.2, 8);
    return { hit: true, wA, wB, tc, J, vA2, vB2, end };
  }
  function stateAt(p, md, t) {
    if (!md.hit || t <= md.tc) {
      return { xA: XA0 + p.vA * t, xB: XB0 + p.vB * t, vA: p.vA, vB: p.vB, F: 0, I: 0 };
    }
    const s = Math.min(t - md.tc, TAU);
    const I = md.J * (1 - Math.cos(Math.PI * s / TAU)) / 2;
    const integ = md.J * (s / 2 - TAU / (2 * Math.PI) * Math.sin(Math.PI * s / TAU));
    const xAc = XA0 + p.vA * md.tc, xBc = XB0 + p.vB * md.tc;
    let xA = xAc + p.vA * s - integ / p.mA, xB = xBc + p.vB * s + integ / p.mB;
    const F = t - md.tc < TAU ? md.J * Math.PI / (2 * TAU) * Math.sin(Math.PI * s / TAU) : 0;
    if (t - md.tc > TAU) { const r = t - md.tc - TAU; xA += md.vA2 * r; xB += md.vB2 * r; }
    return { xA, xB, vA: p.vA - I / p.mA, vB: p.vB + I / p.mB, F, I };
  }

  function mountCart(root, S) {
    const p = { mA: 1, vA: 2, mB: 1, vB: 0, e: 1 };
    const st = { t: 0, playing: false, slow: 0.25 };
    root.innerHTML = `
      <div class="lab">
        <aside class="panel controls" aria-label="실험 조건">
          <h2 class="ph">수레 A (왼쪽)</h2>
          ${Ctl.range('mc-ma', '질량', { min: 0.5, max: 3, step: 0.5, value: p.mA })}
          ${Ctl.range('mc-va', '처음 속도 (오른쪽 +)', { min: -1, max: 3, step: 0.1, value: p.vA })}
          <hr>
          <h2 class="ph">수레 B (오른쪽)</h2>
          ${Ctl.range('mc-mb', '질량', { min: 0.5, max: 3, step: 0.5, value: p.mB })}
          ${Ctl.range('mc-vb', '처음 속도 (오른쪽 +)', { min: -3, max: 2, step: 0.1, value: p.vB })}
          <hr>
          ${Ctl.range('mc-e', '반발 계수 e', { min: 0, max: 1, step: 0.05, value: p.e, hint: '1이면 탄성 충돌(운동 에너지 보존), 0이면 두 수레가 붙어서 함께 움직인다.' })}
          <div class="chips" id="mc-pre">
            <button type="button" class="chip" data-e="1">탄성 충돌</button>
            <button type="button" class="chip" data-e="0.5">비탄성 충돌</button>
            <button type="button" class="chip" data-e="0">완전 비탄성</button>
          </div>
        </aside>
        <div class="stack">
          <div class="panel stage-panel"><canvas class="stage" id="mc-cv" style="aspect-ratio: 16 / 6" aria-label="수레 충돌 실험"></canvas></div>
          <div class="panel controls">
            <div class="btn-row">
              <button class="btn primary" id="mc-play" type="button">${ICON.play}<span>출발</span></button>
              <button class="btn ghost" id="mc-reset" type="button">${ICON.reset}<span>처음으로</span></button>
              <span style="flex:1"></span>
              ${Ctl.seg('mc-slow', '', [['1', '실제 속도'], ['0.25', '¼ 느리게'], ['0.05', '1/20 느리게']], '0.25')}
            </div>
          </div>
          <div id="mc-msg"></div>
          <div class="meters">
            <div class="meter"><span class="lbl">운동량의 합</span><b id="mc-ptot">—</b><span class="sub">kg·m/s</span></div>
            <div class="meter"><span class="lbl">A가 받은 충격량</span><b id="mc-imp">—</b><span class="sub">N·s</span></div>
            <div class="meter"><span class="lbl">운동 에너지의 합</span><b id="mc-ke">—</b><span class="sub">J</span></div>
          </div>
          <div class="readouts" id="mc-ro"></div>
        </div>
      </div>
      <div class="charts">
        <div class="panel"><h3 class="ch">운동량 – 시간</h3><div id="mc-c1"></div></div>
        <div class="panel"><h3 class="ch">충돌하는 동안 받은 힘 – 시간</h3><p class="ch-sub">그래프 아래 넓이 = 충격량. 두 힘은 크기가 같고 방향이 반대이다.</p><div id="mc-c2"></div></div>
      </div>
      <div class="panel"><h3 class="ch">충돌 전후의 운동 에너지</h3><div id="mc-bars"></div></div>
      <section class="notes">${notesCart()}</section>`;
    const $ = s => root.querySelector(s);
    const stg = S.stage($('#mc-cv'), () => draw());
    let md = model(p);
    const set = (k, v) => { p[k] = v; restart(); };
    bindRange(root, 'mc-ma', { digits: 1, unit: ' kg' }, v => set('mA', v));
    bindRange(root, 'mc-va', { format: v => U.sign(v, 1) + ' m/s' }, v => set('vA', v));
    bindRange(root, 'mc-mb', { digits: 1, unit: ' kg' }, v => set('mB', v));
    bindRange(root, 'mc-vb', { format: v => U.sign(v, 1) + ' m/s' }, v => set('vB', v));
    const er = bindRange(root, 'mc-e', { digits: 2 }, v => set('e', v));
    $('#mc-pre').addEventListener('click', e => { const b = e.target.closest('[data-e]'); if (b) er.set(+b.dataset.e); });
    bindSeg(root, 'mc-slow', v => { st.slow = +v; });
    const playBtn = $('#mc-play');
    function setPlaying(v) { st.playing = v; playBtn.innerHTML = v ? `${ICON.pause}<span>멈춤</span>` : `${ICON.play}<span>출발</span>`; }
    playBtn.addEventListener('click', () => { if (!st.playing && st.t >= md.end - 1e-6) st.t = 0; setPlaying(!st.playing); });
    $('#mc-reset').addEventListener('click', () => { setPlaying(false); st.t = 0; update(true); });
    let lastChart = 0;

    function restart() { md = model(p); setPlaying(false); st.t = 0; update(true); }
    function update(full) {
      const s = stateAt(p, md, st.t);
      const pA = p.mA * s.vA, pB = p.mB * s.vB;
      const ke = 0.5 * p.mA * s.vA ** 2 + 0.5 * p.mB * s.vB ** 2;
      $('#mc-ptot').textContent = U.fmt(pA + pB, 2);
      $('#mc-imp').textContent = U.sign(-s.I, 3);
      $('#mc-ke').textContent = U.fmt(ke, 3);
      const ke0 = 0.5 * p.mA * p.vA ** 2 + 0.5 * p.mB * p.vB ** 2;
      if (md.hit) {
        const ke1 = 0.5 * p.mA * md.vA2 ** 2 + 0.5 * p.mB * md.vB2 ** 2;
        $('#mc-msg').innerHTML = '';
        $('#mc-ro').innerHTML = [
          ['A 나중 속도', U.sign(md.vA2, 2) + ' m/s'], ['B 나중 속도', U.sign(md.vB2, 2) + ' m/s'],
          ['충돌 전 운동량 합', U.fmt(p.mA * p.vA + p.mB * p.vB, 2) + ' kg·m/s'], ['충돌 후 운동량 합', U.fmt(p.mA * md.vA2 + p.mB * md.vB2, 2) + ' kg·m/s'],
          ['충격량 크기 J', U.fmt(md.J, 3) + ' N·s'], ['평균 힘 J ÷ Δt', U.fmt(md.J / TAU, 1) + ' N'],
          ['운동 에너지 손실', U.fmt(ke0 - ke1, 3) + ' J'], ['현재 시간', U.fmt(st.t, 3) + ' s'],
        ].map(([a, b]) => `<div class="ro"><span>${a}</span><b>${b}</b></div>`).join('');
        if (full) bars(ke0, ke1);
      } else {
        $('#mc-msg').innerHTML = `<div class="callout bad"><span class="badge bad">충돌하지 않음</span><span>A의 속도가 B보다 작거나 같아서 A가 B를 따라잡지 못한다. A를 더 빠르게 하거나 B가 A 쪽(−)으로 오게 해 보자.</span></div>`;
        $('#mc-ro').innerHTML = '';
        if (full) bars(ke0, ke0);
      }
      const now = performance.now();
      if (full || !st.playing || now - lastChart > 100) { charts(); lastChart = now; }
      draw();
    }
    function charts() {
      const n = 300, ts = [];
      for (let i = 0; i <= n; i++) ts.push(md.end * i / n);
      if (md.hit) for (let i = 0; i <= 40; i++) ts.push(md.tc + TAU * i / 40);
      ts.sort((a, b) => a - b);
      const ss = ts.map(t => [t, stateAt(p, md, t)]);
      chart($('#mc-c1'), {
        x: [0, md.end], height: 220, xLabel: '시간 (s)', yLabel: '운동량 (kg·m/s)', cursor: st.t, xFmt: v => `t = ${U.fmt(v, 3)} s`, yFmt: v => U.fmt(v, 2),
        series: [
          { name: 'A', color: 'var(--phys)', width: 2.5, data: ss.map(([t, s]) => [t, p.mA * s.vA]) },
          { name: 'B', color: 'var(--heat)', width: 2.5, data: ss.map(([t, s]) => [t, p.mB * s.vB]) },
          { name: 'A + B (보존)', color: 'var(--ink-2)', dash: '6 4', data: ss.map(([t, s]) => [t, p.mA * s.vA + p.mB * s.vB]) },
        ], hlines: [{ y: 0 }],
      });
      if (md.hit) {
        const a = md.tc - 0.02, b = md.tc + TAU + 0.02, fs = [];
        for (let i = 0; i <= 120; i++) { const t = a + (b - a) * i / 120; fs.push([(t - md.tc) * 1000, stateAt(p, md, t).F]); }
        chart($('#mc-c2'), {
          x: [(a - md.tc) * 1000, (b - md.tc) * 1000], height: 220, xLabel: '충돌 시작 후 시간 (ms)', yLabel: '힘 (N)',
          cursor: st.t >= a && st.t <= b ? (st.t - md.tc) * 1000 : null, xFmt: v => `${U.fmt(v, 1)} ms`, yFmt: v => U.fmt(v, 1) + ' N',
          series: [
            { name: 'B가 받은 힘', color: 'var(--heat)', width: 2.5, area: true, base: 0, data: fs },
            { name: 'A가 받은 힘', color: 'var(--phys)', width: 2.5, area: true, base: 0, data: fs.map(([x, y]) => [x, -y]) },
          ], hlines: [{ y: 0 }],
        });
      } else chart($('#mc-c2'), { x: [-20, 80], y: [-1, 1], height: 220, xLabel: '충돌 시작 후 시간 (ms)', yLabel: '힘 (N)', series: [], hlines: [{ y: 0, label: '충돌하지 않아 힘이 없다' }] });
    }
    function bars(k0, k1) {
      const mx = Math.max(k0, k1, 0.001);
      const row = (label, v, col) => `<div style="display:grid;grid-template-columns:72px minmax(0,1fr) 84px;gap:10px;align-items:center;margin:6px 0">
        <span style="font-size:13px;color:var(--ink-2)">${label}</span>
        <div style="height:16px;border-radius:4px;background:var(--panel-2);overflow:hidden"><div style="height:100%;width:${(v / mx * 100).toFixed(1)}%;background:${col};border-radius:4px"></div></div>
        <b style="font:600 13.5px var(--font-data);text-align:right">${U.fmt(v, 3)} J</b></div>`;
      $('#mc-bars').innerHTML = row('충돌 전', k0, 'var(--acc)') + row('충돌 후', k1, 'var(--heat)') +
        `<p class="ctl-hint">${Math.abs(k0 - k1) < 1e-6 ? '탄성 충돌: 운동 에너지가 보존된다.' : `잃은 ${U.fmt(k0 - k1, 3)} J은 소리, 열, 수레의 변형 에너지로 바뀐다. 운동량은 그래도 보존된다.`}</p>`;
    }
    function draw() {
      const { ctx, W, H } = stg;
      if (!W) return;
      const ink = Theme.v('--ink'), muted = Theme.v('--muted'), phys = Theme.v('--phys'), heat = Theme.v('--heat'), line = Theme.v('--line-2');
      ctx.clearRect(0, 0, W, H);
      const pl = 20, pr = 20, k = (W - pl - pr) / TRACK, X = x => pl + x * k;
      const ground = H - 34;
      ctx.strokeStyle = line; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(pl, ground); ctx.lineTo(W - pr, ground); ctx.stroke();
      Draw.font(ctx, 10, 500, true); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (let x = 0; x <= TRACK + 1e-9; x += 0.5) {
        ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(x), ground + 3); ctx.lineTo(X(x), ground + 8); ctx.stroke();
        ctx.fillStyle = muted; ctx.fillText(`${x} m`, X(x), ground + 11);
      }
      const s = stateAt(p, md, st.t);
      const cart = (x, w, m, col, label, v, bumperRight) => {
        const cw = w * k, ch = Math.min(H * 0.45, cw * (0.62 + m * 0.06)), x0 = X(x) - cw / 2, y0 = ground - 8 - ch;
        ctx.fillStyle = U.rgba(col, 0.18); ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(x0, y0, cw, ch, 6); ctx.fill(); ctx.stroke();
        for (const wx of [x0 + cw * 0.22, x0 + cw * 0.78]) { ctx.beginPath(); ctx.arc(wx, ground - 4, 5, 0, 7); ctx.fillStyle = U.rgba(ink, 0.7); ctx.fill(); }
        Draw.text(ctx, label, X(x), y0 + ch * 0.42, { size: 15, weight: 700, align: 'center', base: 'middle', color: ink });
        Draw.text(ctx, `${U.fmt(m, 1)} kg`, X(x), y0 + ch * 0.75, { size: 11, align: 'center', base: 'middle', color: muted, data: true });
        // 범퍼
        ctx.strokeStyle = U.rgba(ink, 0.5); ctx.lineWidth = 1.5;
        const bx = bumperRight ? x0 + cw : x0, dir = bumperRight ? 1 : -1;
        ctx.beginPath(); ctx.moveTo(bx, y0 + ch * 0.35); ctx.lineTo(bx + dir * 4, y0 + ch * 0.35); ctx.lineTo(bx + dir * 4, y0 + ch * 0.65); ctx.lineTo(bx, y0 + ch * 0.65); ctx.stroke();
        if (Math.abs(v) > 0.02) {
          const len = v * k * 0.35, ay = y0 - 14;
          Draw.arrow(ctx, X(x), ay, X(x) + len, ay, col, 2.5, 9);
          Draw.text(ctx, `${U.sign(v, 2)} m/s`, X(x) + len / 2, ay - 8, { size: 11.5, weight: 600, align: 'center', color: col, data: true });
        }
      };
      cart(s.xA, md.wA, p.mA, phys, 'A', s.vA, true);
      cart(s.xB, md.wB, p.mB, heat, 'B', s.vB, false);
      if (s.F > 0.01) {
        const cx = (s.xA + md.wA / 2 + s.xB - md.wB / 2) / 2;
        ctx.fillStyle = U.rgba(Theme.v('--bad'), 0.25); ctx.beginPath(); ctx.arc(X(cx), ground - 30, 16 + s.F / (md.J * 30) * 4, 0, 7); ctx.fill();
        Draw.text(ctx, `${U.fmt(s.F, 0)} N`, X(cx), ground - 58, { size: 12, weight: 700, align: 'center', color: Theme.v('--bad'), data: true });
      }
      Draw.text(ctx, `t = ${U.fmt(st.t, 3)} s`, 14, 20, { size: 12, weight: 600, color: muted, data: true });
    }
    S.loop(dt => {
      if (!st.playing) return;
      st.t += dt * st.slow;
      const s = stateAt(p, md, st.t);
      const out = s.xA < -0.3 || s.xB > TRACK + 0.3 || s.xB < -0.3 || s.xA > TRACK + 0.3;
      if (st.t >= md.end || out) { setPlaying(false); }
      update();
    });
    S.on(document, 'labtheme', () => draw());
    restart();
  }

  const SURF = [
    { id: 'concrete', name: '콘크리트 바닥', dt: 0.002, col: '#8f9499' },
    { id: 'wood', name: '나무 판', dt: 0.006, col: '#b0814f' },
    { id: 'towel', name: '접은 수건', dt: 0.02, col: '#d9a7b0' },
    { id: 'cushion', name: '방석', dt: 0.06, col: '#7aa6c9' },
    { id: 'mat', name: '에어 매트', dt: 0.15, col: '#8fc28a' },
  ];
  const EGG_M = 0.06, BREAK = 35, G = 9.8;

  function mountEgg(root, S) {
    const st = { h: 1, surf: 'cushion', t: 0, playing: false };
    root.innerHTML = `
      <div class="lab">
        <aside class="panel controls" aria-label="실험 조건">
          <h2 class="ph">달걀 떨어뜨리기</h2>
          ${Ctl.range('eg-h', '떨어뜨리는 높이', { min: 0.2, max: 2, step: 0.1, value: st.h })}
          ${Ctl.seg('eg-s', '바닥', SURF.map(s => [s.id, s.name]), st.surf)}
          <p class="ctl-hint">달걀 질량 60 g. 바닥에 닿은 뒤 튀어 오르지 않고 멈춘다고 가정한다. 달걀이 깨지는 힘은 모형값 ${BREAK} N으로 정했다.</p>
          <div class="btn-row">
            <button class="btn primary" id="eg-play" type="button">${ICON.play}<span>떨어뜨리기</span></button>
            <button class="btn ghost" id="eg-reset" type="button">${ICON.reset}<span>처음으로</span></button>
          </div>
        </aside>
        <div class="stack">
          <div class="panel stage-panel"><canvas class="stage" id="eg-cv" style="aspect-ratio: 16 / 8" aria-label="달걀 낙하 실험"></canvas></div>
          <div class="meters">
            <div class="meter"><span class="lbl">충격량 (= 운동량 변화)</span><b id="eg-j">—</b><span class="sub">N·s</span></div>
            <div class="meter"><span class="lbl">평균 힘</span><b id="eg-f">—</b><span class="sub" id="eg-dt"></span></div>
            <div class="meter"><span class="lbl">결과</span><b id="eg-res">—</b><span class="sub" id="eg-fmax"></span></div>
          </div>
        </div>
      </div>
      <div class="panel"><h3 class="ch">바닥에 따른 힘 – 시간 그래프</h3><p class="ch-sub">모든 곡선 아래 넓이(충격량)는 같다. 충돌 시간이 길수록 힘의 최댓값이 낮다.</p><div id="eg-c"></div></div>
      <section class="notes">${notesEgg()}</section>`;
    const $ = s => root.querySelector(s);
    const stg = S.stage($('#eg-cv'), () => draw());
    bindRange(root, 'eg-h', { digits: 1, unit: ' m' }, v => { st.h = v; reset(); });
    bindSeg(root, 'eg-s', v => { st.surf = v; reset(); });
    const playBtn = $('#eg-play');
    playBtn.addEventListener('click', () => { st.t = 0; st.playing = true; });
    $('#eg-reset').addEventListener('click', reset);
    const calc = () => {
      const sf = SURF.find(s => s.id === st.surf), v = Math.sqrt(2 * G * st.h), J = EGG_M * v;
      const Favg = J / sf.dt, Fmax = Favg * Math.PI / 2;
      return { sf, v, J, Favg, Fmax, broken: Fmax > BREAK, tfall: Math.sqrt(2 * st.h / G) };
    };
    function reset() { st.playing = false; st.t = 0; info(); draw(); }
    function info() {
      const c = calc();
      $('#eg-j').textContent = U.fmt(c.J, 3);
      $('#eg-f').textContent = U.fmt(c.Favg, 1) + ' N';
      $('#eg-dt').textContent = `충돌 시간 ${U.fmt(c.sf.dt * 1000, 0)} ms · 충돌 직전 ${U.fmt(c.v, 2)} m/s`;
      $('#eg-res').textContent = c.broken ? '깨짐' : '안 깨짐';
      $('#eg-fmax').textContent = `최대 힘 ${U.fmt(c.Fmax, 1)} N (기준 ${BREAK} N)`;
      const xs = Array.from({ length: 401 }, (_, i) => i * 0.5);
      chart($('#eg-c'), {
        x: [0, 200], height: 250, xLabel: '바닥에 닿은 뒤 시간 (ms)', yLabel: '힘 (N)', yInclude: [0, BREAK * 1.2],
        y: [0, Math.max(60, Math.min(c.Fmax * 1.15, 260))],
        xFmt: v => `${U.fmt(v, 1)} ms`, yFmt: v => U.fmt(v, 1) + ' N',
        series: SURF.map(s => {
          const fm = c.J / s.dt * Math.PI / 2, d = s.dt * 1000;
          return { name: s.name, color: s.col, width: s.id === st.surf ? 3 : 1.5, opacity: s.id === st.surf ? 1 : 0.6, area: s.id === st.surf, base: 0,
            data: xs.map(x => [x, x <= d ? fm * Math.sin(Math.PI * x / d) : 0]) };
        }),
        hlines: [{ y: BREAK, label: '달걀이 깨지는 힘 (모형값)', color: 'var(--bad)' }],
      });
    }
    function draw() {
      const { ctx, W, H } = stg;
      if (!W) return;
      const c = calc(), ink = Theme.v('--ink'), muted = Theme.v('--muted');
      ctx.clearRect(0, 0, W, H);
      const floorY = H - 40, topY = 30, cx = W * 0.42;
      const k = (floorY - topY - 30) / 2;
      // 높이 자
      ctx.strokeStyle = Theme.v('--line-2'); ctx.lineWidth = 1;
      Draw.font(ctx, 10, 500, true); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      for (let y = 0; y <= 2 + 1e-9; y += 0.5) { const py = floorY - y * k; ctx.beginPath(); ctx.moveTo(48, py); ctx.lineTo(54, py); ctx.stroke(); ctx.fillStyle = muted; ctx.fillText(`${y} m`, 44, py); }
      ctx.beginPath(); ctx.moveTo(54, floorY); ctx.lineTo(54, floorY - 2 * k); ctx.stroke();
      // 바닥
      const sw = Math.min(W * 0.36, 260);
      const thick = { concrete: 8, wood: 10, towel: 12, cushion: 18, mat: 26 }[st.surf];
      ctx.fillStyle = U.rgba(ink, 0.15); ctx.fillRect(0, floorY, W, H - floorY);
      ctx.fillStyle = c.sf.col; ctx.beginPath(); ctx.roundRect(cx - sw / 2, floorY - thick, sw, thick, 4); ctx.fill();
      Draw.text(ctx, c.sf.name, cx, floorY + 18, { size: 12, weight: 600, align: 'center', color: muted });
      // 달걀
      const t = st.t, fallen = t >= c.tfall;
      const y = fallen ? 0 : st.h - 0.5 * G * t * t;
      const ey = floorY - thick - y * k - 17;
      const squish = fallen && !c.broken ? 0.12 : 0;
      ctx.save(); ctx.translate(cx, ey + (squish ? 3 : 0)); ctx.scale(1 + squish, 1 - squish);
      if (fallen && c.broken) {
        ctx.fillStyle = '#f2c94c'; ctx.beginPath(); ctx.ellipse(0, 12, 34, 7, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#f7efe1'; ctx.strokeStyle = U.rgba(ink, 0.6); ctx.lineWidth = 1.2;
        for (const [dx, rot] of [[-16, -0.5], [14, 0.6]]) { ctx.save(); ctx.translate(dx, 4); ctx.rotate(rot); ctx.beginPath(); ctx.moveTo(-10, 6); ctx.lineTo(-8, -8); ctx.lineTo(-3, -2); ctx.lineTo(2, -10); ctx.lineTo(6, -3); ctx.lineTo(10, 6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
      } else {
        ctx.fillStyle = '#f7efe1'; ctx.strokeStyle = U.rgba(ink, 0.55); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.ellipse(0, 0, 13, 17, 0, 0, 7); ctx.fill(); ctx.stroke();
      }
      ctx.restore();
      if (!fallen && t > 0) Draw.arrow(ctx, cx + 30, ey - 10, cx + 30, ey + 10 + Math.min(40, G * t * 6), U.rgba(Theme.v('--phys'), 0.8), 2, 8);
      Draw.text(ctx, fallen ? (c.broken ? `깨짐 (최대 ${U.fmt(c.Fmax, 0)} N)` : `안 깨짐 (최대 ${U.fmt(c.Fmax, 0)} N)`) : `${st.h} m에서 출발`, cx + sw / 2 + 16, floorY - 40, { size: 14, weight: 700, color: fallen ? (c.broken ? Theme.v('--bad') : Theme.v('--good')) : ink });
    }
    S.loop(dt => {
      if (!st.playing) return;
      st.t += dt * 0.5;
      if (st.t > calc().tfall + 0.6) st.playing = false;
      draw();
    });
    S.on(document, 'labtheme', () => draw());
    reset();
  }

  function notesCart() {
    return U.notesHead('이론 노트', '운동량 · 운동량 보존 법칙 · 반발 계수') +
      U.note('운동량', `
        <p>운동량은 질량과 속도의 곱으로, 운동의 방향을 포함하는 양(벡터)이다.</p>
        <div class="formula">p = m v &nbsp;&nbsp;(단위: kg·m/s)</div>
        <p>질량이 크거나 빠를수록 운동량이 크고, 멈추게 하기 어렵다.</p>`) +
      U.note('운동량 보존 법칙', `
        <p>충돌할 때 두 물체가 주고받는 힘은 작용 반작용으로 크기가 같고 방향이 반대이며, 작용하는 시간도 같다. 그래서 한 물체가 얻은 운동량만큼 다른 물체가 잃는다.</p>
        <div class="formula">m₁v₁ + m₂v₂ = m₁v₁′ + m₂v₂′</div>
        <p>외부 힘이 작용하지 않으면 충돌 전후 운동량의 합은 항상 일정하다. 탄성 충돌이든 완전 비탄성 충돌이든 성립한다.</p>`) +
      U.note('반발 계수와 운동 에너지', `
        <div class="formula">e = −(v₁′ − v₂′) ÷ (v₁ − v₂)</div>
        <ul><li>e = 1: 탄성 충돌. 운동 에너지도 보존된다. 질량이 같으면 두 수레의 속도가 서로 바뀐다.</li>
        <li>0 &lt; e &lt; 1: 비탄성 충돌. 운동 에너지 일부가 열과 소리로 바뀐다.</li>
        <li>e = 0: 완전 비탄성 충돌. 두 물체가 붙어 같은 속도로 움직인다.</li></ul>`) +
      U.note('생각해 보기', `
        ${U.qa('1 kg 수레 A가 2 m/s로 정지한 1 kg 수레 B와 탄성 충돌하면?', 'A는 멈추고 B가 2 m/s로 움직인다. 질량이 같은 두 물체의 탄성 충돌에서는 속도가 서로 바뀐다.')}
        ${U.qa('같은 조건에서 두 수레가 붙어 버리면(완전 비탄성) 나중 속도는?', '운동량 보존: 1 × 2 = (1 + 1) × v 이므로 v = 1 m/s. 운동 에너지는 2 J에서 1 J로 절반이 줄어든다.')}`) +
      `<p class="src note full">충돌하는 동안의 힘은 반사인(sin) 모양, 충돌 시간은 ${TAU * 1000} ms로 가정했다. 마찰은 무시했다.</p>`;
  }
  function notesEgg() {
    return U.notesHead('이론 노트', '충격량 · 충돌 시간과 평균 힘 · 안전장치') +
      U.note('충격량', `
        <p>물체가 받은 충격의 정도로, 힘과 힘이 작용한 시간의 곱이다. 충격량은 운동량의 변화량과 같다.</p>
        <div class="formula">I = F Δt = Δp = m v′ − m v</div>
        <p>힘–시간 그래프 아래 넓이가 충격량이다.</p>`) +
      U.note('충돌 시간과 평균 힘', `
        <p>같은 높이에서 떨어진 달걀은 어느 바닥에 떨어지든 멈출 때까지 같은 충격량(= m v)을 받는다. 하지만 푹신한 바닥은 충돌 시간 Δt를 늘려 평균 힘 F = Δp ÷ Δt를 줄인다.</p>
        <div class="formula">1 m 낙하: v = 4.43 m/s, Δp = 0.266 N·s<br>콘크리트 2 ms → 133 N &nbsp;&nbsp; 방석 60 ms → 4.4 N</div>`) +
      U.note('생활 속 안전장치', `
        <ul>
          <li><strong>에어백</strong>: 탑승자가 멈추는 시간을 늘린다.</li>
          <li><strong>자동차의 찌그러지는 구간</strong>(크럼플 존): 앞부분이 찌그러지며 충돌 시간을 늘린다.</li>
          <li><strong>야구 글러브, 공 받을 때 손을 뒤로 빼기</strong>, 낙법, 번지 점프 줄, 운동장 우레탄 바닥.</li>
          <li>반대로 <strong>골프·야구 타격</strong>에서는 힘을 오래 가하도록 끝까지 휘둘러(팔로스루) 충격량을 키운다.</li>
        </ul>`) +
      U.note('생각해 보기', `
        ${U.qa('높이를 2배로 하면 충격량은 몇 배가 될까?', '충돌 직전 속력 v = √(2gh)이므로 √2배(약 1.41배)가 된다. 충돌 시간이 같다면 평균 힘도 √2배이다.')}
        ${U.qa('달걀이 깨지지 않게 하려면 무엇을 바꿀 수 있을까?', '높이를 낮춰 충격량을 줄이거나, 푹신한 바닥으로 충돌 시간을 늘려 평균 힘을 줄인다.')}`) +
      `<p class="src note full">바닥별 충돌 시간과 달걀이 깨지는 힘은 현상을 비교하기 위한 모형값이다. 실제 값은 달걀과 바닥 상태에 따라 다르다.</p>`;
  }
})();
