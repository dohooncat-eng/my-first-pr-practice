'use strict';
/* 전자기 유도 — 자석과 코일, 발전기 */
(() => {
  const MU0 = 4 * Math.PI * 1e-7;
  const RC = 0.02, LC = 0.06; // 코일 반지름, 길이 (m)

  // 축 위의 자기 쌍극자(모멘트 m, +x 방향 성분 s)가 만드는, 코일 전체를 지나는 자기 선속
  const g = u => u / Math.sqrt(RC * RC + u * u);
  const gp = u => RC * RC / Math.pow(RC * RC + u * u, 1.5);
  const flux = (z, N, m, s) => s * (N / LC) * (MU0 * m / 2) * (g(z + LC / 2) - g(z - LC / 2));
  const dflux = (z, N, m, s) => s * (N / LC) * (MU0 * m / 2) * (gp(z + LC / 2) - gp(z - LC / 2));

  registerModule({
    id: 'induction', subject: 'phys', title: '전자기 유도와 발전기', short: '전자기 유도',
    unit: '통합과학2 · 환경과 에너지',
    lead: '코일에 자석을 넣었다 뺐다 하면 검류계 바늘이 움직입니다. 자석을 직접 끌어 보며 유도 전류의 세기와 방향이 무엇에 따라 달라지는지 찾고, 같은 원리로 전기를 만드는 발전기를 살펴봅니다.',
    desc: '패러데이 법칙, 렌츠 법칙, 검류계, 자기 선속 그래프, 교류 발전기',
    icon: '<path d="M6 4v8a6 6 0 0 0 12 0V4"/><path d="M6 4h3.2v8a2.8 2.8 0 0 0 5.6 0V4H18"/><path d="M6 7.5h3.2M14.8 7.5H18"/>',
    mount(root, S) {
      tabs(root, [
        { id: 'coil', label: '자석과 코일', mount: mountCoil },
        { id: 'gen', label: '발전기', mount: mountGen },
      ], S);
    },
  });

  function mountCoil(root, S) {
    const st = { N: 200, m: 1.0, pole: 'N', mode: 'auto', f: 0.6, z: 0.14, v: 0, t: 0, drag: false };
    root.innerHTML = `
      <div class="lab">
        <aside class="panel controls" aria-label="실험 조건">
          <h2 class="ph">실험 조건</h2>
          ${Ctl.seg('ei-mode', '자석 움직이기', [['auto', '자동 왕복'], ['drag', '직접 끌기'], ['stop', '멈춤']], st.mode)}
          ${Ctl.range('ei-f', '왕복 빠르기 (진동수)', { min: 0.2, max: 2, step: 0.1, value: st.f })}
          ${Ctl.range('ei-n', '코일 감은 수', { min: 50, max: 500, step: 50, value: st.N })}
          ${Ctl.range('ei-m', '자석의 세기 (자기 모멘트)', { min: 0.5, max: 2, step: 0.25, value: st.m })}
          ${Ctl.seg('ei-p', '코일 쪽을 향한 극', [['N', 'N극'], ['S', 'S극']], st.pole)}
          <p class="ctl-hint">직접 끌기: 그림 속 자석을 좌우로 끌어 코일에 넣었다 빼 보세요.</p>
        </aside>
        <div class="stack">
          <div class="panel stage-panel">
            <canvas class="stage drag" id="ei-cv" style="aspect-ratio: 16 / 8" aria-label="코일, 자석, 검류계"></canvas>
          </div>
          <div id="ei-msg" class="callout"></div>
          <div class="meters">
            <div class="meter"><span class="lbl">유도 기전력</span><b id="ei-emf">—</b><span class="sub">mV</span></div>
            <div class="meter"><span class="lbl">코일 속 자기 선속</span><b id="ei-phi">—</b><span class="sub">mWb (감은 수 전체)</span></div>
            <div class="meter"><span class="lbl">자석 속도</span><b id="ei-v">—</b><span class="sub">m/s (오른쪽 +)</span></div>
          </div>
        </div>
      </div>
      <div class="charts">
        <div class="panel"><h3 class="ch">코일을 지나는 자기 선속 – 시간</h3><div id="ei-c1"></div></div>
        <div class="panel"><h3 class="ch">유도 기전력 – 시간</h3><p class="ch-sub">자기 선속 그래프의 기울기가 클수록(빨리 변할수록) 크다.</p><div id="ei-c2"></div></div>
      </div>
      <section class="notes">${notesCoil()}</section>`;
    const $ = s => root.querySelector(s);
    const cv = $('#ei-cv');
    const stg = S.stage(cv, () => {});
    const hist = [];
    let lastChart = 0, emf = 0, phi = 0;
    bindSeg(root, 'ei-mode', v => { st.mode = v; });
    bindRange(root, 'ei-f', { digits: 1, unit: ' Hz' }, v => { st.f = v; });
    bindRange(root, 'ei-n', { unit: '회' }, v => { st.N = v; });
    bindRange(root, 'ei-m', { digits: 2, unit: ' A·m²' }, v => { st.m = v; });
    bindSeg(root, 'ei-p', v => { st.pole = v; });

    // 화면 배치: 코일 중심 x = 0. 자석은 코일 오른쪽에서 들어온다.
    const view = () => { const { W, H } = stg; const k = Math.min(W / 0.44, H / 0.2); return { W, H, k, X: x => W * 0.3 + x * k, cy: H * 0.38 }; };
    const toZ = px => { const v = view(); return (px - v.W * 0.3) / v.k; };
    const ptr = e => { const r = cv.getBoundingClientRect(); return e.clientX - r.left; };
    S.on(cv, 'pointerdown', e => {
      const v = view(), mx = v.X(st.z);
      if (Math.abs(ptr(e) - mx) < 0.08 * v.k) { st.drag = true; st.mode = 'drag'; root.querySelector('#ei-mode [data-v="drag"]').click(); cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; }
    });
    S.on(cv, 'pointermove', e => { if (st.drag) st.zTarget = U.clamp(toZ(ptr(e)), -0.13, 0.27); });
    S.on(cv, 'pointerup', () => { st.drag = false; cv.style.cursor = ''; });

    S.loop(dt => {
      const s = st.pole === 'N' ? -1 : 1; // 코일 쪽(왼쪽)이 N극이면 자기 모멘트는 −x 방향
      const z0 = st.z;
      if (st.mode === 'auto') { st.t += dt; st.z = 0.11 + 0.09 * Math.cos(2 * Math.PI * st.f * st.t); }
      else if (st.mode === 'drag' && st.zTarget != null) st.z += (st.zTarget - st.z) * Math.min(1, dt * 14);
      const v = dt > 0 ? (st.z - z0) / dt : 0;
      st.v = st.v * 0.6 + v * 0.4;
      phi = flux(st.z, st.N, st.m, s);
      emf = -dflux(st.z, st.N, st.m, s) * st.v;
      const now = performance.now() / 1000;
      hist.push([now, phi * 1000, emf * 1000]);
      while (hist.length && hist[0][0] < now - 6) hist.shift();
      $('#ei-emf').textContent = U.sign(emf * 1000, 1);
      $('#ei-phi').textContent = U.fmt(phi * 1000, 3);
      $('#ei-v').textContent = U.sign(st.v, 2);
      draw(s);
      if (now * 1000 - lastChart > 90) { charts(now); message(s); lastChart = now * 1000; }
    });

    function message(s) {
      const el = $('#ei-msg');
      if (Math.abs(emf) < 0.002) { el.innerHTML = '<span>자석이 멈춰 있거나 자기 선속이 변하지 않으면 유도 전류가 흐르지 않는다.</span>'; return; }
      const approaching = st.v < 0 === st.z > 0; // 코일 중심 쪽으로 움직이는 중
      const indN = emf > 0 ? '오른쪽' : '왼쪽';
      el.innerHTML = `<span><b>${approaching ? '자석이 다가오는 중' : '자석이 멀어지는 중'}</b> · 코일의 ${indN} 끝이 N극이 되도록 전류가 흘러 자석의 운동을 ${approaching ? '밀어내며 방해한다' : '끌어당기며 방해한다'} (렌츠 법칙).</span>`;
      void s;
    }
    function charts(now) {
      const d1 = hist.map(h => [h[0] - now, h[1]]), d2 = hist.map(h => [h[0] - now, h[2]]);
      const pmax = Math.abs(flux(0, st.N, st.m, 1)) * 1000 * 1.1;
      chart($('#ei-c1'), { x: [-6, 0], y: [-pmax, pmax], height: 200, xLabel: '시간 (s, 0 = 지금)', yLabel: '선속 (mWb)', hover: false, series: [{ name: '자기 선속', color: 'var(--acc)', width: 2.2, data: d1 }], hlines: [{ y: 0 }] });
      const emax = Math.max(20, ...d2.map(p => Math.abs(p[1]))) * 1.1;
      chart($('#ei-c2'), { x: [-6, 0], y: [-emax, emax], height: 200, xLabel: '시간 (s, 0 = 지금)', yLabel: '기전력 (mV)', hover: false, series: [{ name: '유도 기전력', color: 'var(--heat)', width: 2.2, area: true, base: 0, data: d2 }], hlines: [{ y: 0 }] });
    }
    function draw(s) {
      const { ctx, W, H } = stg;
      if (!W) return;
      const v = view(), ink = Theme.v('--ink'), muted = Theme.v('--muted'), phys = Theme.v('--phys'), bad = Theme.v('--bad'), metal = Theme.v('--earth');
      ctx.clearRect(0, 0, W, H);
      const cy = v.cy, rr = Math.min(RC * v.k * 1.5, H * 0.2), x0 = v.X(-LC / 2), x1 = v.X(LC / 2);
      // 도선과 검류계
      const gx = v.X(0), gy = H * 0.86, gr = Math.min(H * 0.16, 58);
      ctx.strokeStyle = U.rgba(metal, 0.9); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x0, cy + rr); ctx.lineTo(x0, gy); ctx.lineTo(gx - gr, gy); ctx.moveTo(gx + gr, gy); ctx.lineTo(x1, gy); ctx.lineTo(x1, cy + rr); ctx.stroke();
      // 전류 점
      const I = emf;
      if (Math.abs(I) > 0.001) {
        const speed = U.clamp(I * 40, -6, 6), ph = (performance.now() / 1000 * speed) % 1;
        const pts = [[x0, cy + rr], [x0, gy], [gx - gr, gy]];
        ctx.fillStyle = Theme.v('--chem');
        for (let i = 0; i < 6; i++) {
          let f = (i / 6 + ph + 1) % 1; const L1 = gy - cy - rr, L2 = gx - gr - x0, tot = L1 + L2; let d = f * tot;
          const p = d < L1 ? [pts[0][0], pts[0][1] + d] : [pts[1][0] + (d - L1), gy];
          ctx.beginPath(); ctx.arc(p[0], p[1], 2.6, 0, 7); ctx.fill();
        }
      }
      ctx.beginPath(); ctx.arc(gx, gy, gr, Math.PI, 0); ctx.closePath();
      ctx.fillStyle = Theme.v('--panel'); ctx.fill(); ctx.strokeStyle = U.rgba(ink, 0.5); ctx.lineWidth = 1.5; ctx.stroke();
      for (let a = -60; a <= 60; a += 15) {
        const rad = (a - 90) * Math.PI / 180;
        ctx.strokeStyle = U.rgba(ink, a === 0 ? 0.7 : 0.35); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(gx + Math.cos(rad) * gr * 0.78, gy + Math.sin(rad) * gr * 0.78); ctx.lineTo(gx + Math.cos(rad) * gr * 0.92, gy + Math.sin(rad) * gr * 0.92); ctx.stroke();
      }
      const full = 0.1; // ±100 mV에서 바늘이 끝까지
      const ang = U.clamp(emf / full, -1, 1) * 60;
      const rad = (ang - 90) * Math.PI / 180;
      ctx.strokeStyle = bad; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(rad) * gr * 0.86, gy + Math.sin(rad) * gr * 0.86); ctx.stroke();
      ctx.beginPath(); ctx.arc(gx, gy, 4, 0, 7); ctx.fillStyle = ink; ctx.fill();
      Draw.text(ctx, 'G 검류계', gx, gy + 16, { size: 11.5, weight: 600, align: 'center', color: muted });
      // 코일
      const turns = Math.round(8 + st.N / 25);
      ctx.strokeStyle = U.rgba(metal, 0.95); ctx.lineWidth = 2;
      for (let i = 0; i <= turns; i++) {
        const x = x0 + (x1 - x0) * i / turns;
        ctx.beginPath(); ctx.ellipse(x, cy, rr * 0.28, rr, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke();
      }
      ctx.strokeStyle = U.rgba(metal, 0.35); ctx.lineWidth = 1.5;
      for (let i = 0; i <= turns; i++) { const x = x0 + (x1 - x0) * i / turns; ctx.beginPath(); ctx.ellipse(x, cy, rr * 0.28, rr, 0, Math.PI / 2, Math.PI * 1.5); ctx.stroke(); }
      Draw.text(ctx, `코일 ${st.N}회`, (x0 + x1) / 2, cy - rr - 10, { size: 11.5, weight: 600, align: 'center', color: muted });
      // 유도된 극
      if (Math.abs(emf) > 0.002) {
        const rightN = emf > 0;
        Draw.text(ctx, rightN ? 'S' : 'N', x0 - 12, cy + 5, { size: 15, weight: 700, align: 'right', color: rightN ? phys : bad });
        Draw.text(ctx, rightN ? 'N' : 'S', x1 + 12, cy + 5, { size: 15, weight: 700, color: rightN ? bad : phys });
      }
      // 자석
      const mlen = 0.09 * v.k, mh = rr * 0.85, mx = v.X(st.z);
      const leftCol = st.pole === 'N' ? bad : phys, rightCol = st.pole === 'N' ? phys : bad;
      ctx.fillStyle = leftCol; ctx.beginPath(); ctx.roundRect(mx - mlen / 2, cy - mh / 2, mlen / 2, mh, [4, 0, 0, 4]); ctx.fill();
      ctx.fillStyle = rightCol; ctx.beginPath(); ctx.roundRect(mx, cy - mh / 2, mlen / 2, mh, [0, 4, 4, 0]); ctx.fill();
      Draw.text(ctx, st.pole, mx - mlen / 4, cy + 1, { size: 14, weight: 700, align: 'center', base: 'middle', color: '#ffffff' });
      Draw.text(ctx, st.pole === 'N' ? 'S' : 'N', mx + mlen / 4, cy + 1, { size: 14, weight: 700, align: 'center', base: 'middle', color: '#ffffff' });
      if (Math.abs(st.v) > 0.01) Draw.arrow(ctx, mx, cy - mh / 2 - 14, mx + U.clamp(st.v * 120, -70, 70), cy - mh / 2 - 14, U.rgba(ink, 0.7), 2, 8);
      // 코일 앞쪽 반
      ctx.strokeStyle = U.rgba(metal, 0.95); ctx.lineWidth = 2;
      for (let i = 0; i <= turns; i++) { const x = x0 + (x1 - x0) * i / turns; ctx.beginPath(); ctx.ellipse(x, cy, rr * 0.28, rr, 0, -Math.PI / 2, Math.PI / 2); ctx.stroke(); }
      Draw.text(ctx, st.mode === 'drag' ? '자석을 끌어 보세요' : st.mode === 'stop' ? '자석이 멈춰 있음' : '자동 왕복 중', W - 14, 22, { size: 12, color: muted, align: 'right', weight: 600 });
      void s;
    }
  }

  function mountGen(root, S) {
    const st = { N: 100, B: 0.3, A: 50, rpm: 600, th: 0 };
    root.innerHTML = `
      <div class="lab">
        <aside class="panel controls" aria-label="발전기 조건">
          <h2 class="ph">발전기 조건</h2>
          ${Ctl.range('gn-n', '코일 감은 수 N', { min: 10, max: 300, step: 10, value: st.N })}
          ${Ctl.range('gn-b', '자기장 세기 B', { min: 0.05, max: 1, step: 0.05, value: st.B })}
          ${Ctl.range('gn-a', '코일 단면적 A', { min: 10, max: 100, step: 5, value: st.A })}
          ${Ctl.range('gn-r', '회전 빠르기', { min: 30, max: 3600, step: 30, value: st.rpm })}
          <p class="ctl-hint">우리나라 전기는 1초에 60번 방향이 바뀌는 60 Hz 교류이다. 자석 극이 한 쌍인 발전기는 1분에 3600번 돌아야 60 Hz가 된다.</p>
        </aside>
        <div class="stack">
          <div class="panel stage-panel"><canvas class="stage" id="gn-cv" style="aspect-ratio: 16 / 8" aria-label="자석 사이에서 회전하는 코일"></canvas></div>
          <div class="meters">
            <div class="meter"><span class="lbl">최대 기전력</span><b id="gn-max">—</b><span class="sub">V = N B A ω</span></div>
            <div class="meter"><span class="lbl">진동수</span><b id="gn-f">—</b><span class="sub">Hz</span></div>
            <div class="meter"><span class="lbl">지금 기전력</span><b id="gn-now">—</b><span class="sub">V</span></div>
          </div>
        </div>
      </div>
      <div class="panel"><h3 class="ch">발전기의 기전력 – 시간 (교류)</h3><div id="gn-c"></div></div>
      <section class="notes">${notesGen()}</section>`;
    const $ = s => root.querySelector(s);
    const stg = S.stage($('#gn-cv'), () => {});
    bindRange(root, 'gn-n', { unit: '회' }, v => { st.N = v; });
    bindRange(root, 'gn-b', { digits: 2, unit: ' T' }, v => { st.B = v; });
    bindRange(root, 'gn-a', { unit: ' cm²' }, v => { st.A = v; });
    bindRange(root, 'gn-r', { format: v => `${v} rpm (${U.fmt(v / 60, 1)} Hz)` }, v => { st.rpm = v; });
    let lastChart = 0;
    S.loop(dt => {
      const f = st.rpm / 60, w = 2 * Math.PI * f, Emax = st.N * st.B * st.A * 1e-4 * w;
      // 화면에서는 빠른 회전을 느리게 보여 준다
      st.th += 2 * Math.PI * Math.min(f, 1.2) * dt * 0.5;
      const e = Emax * Math.sin(st.th);
      $('#gn-max').textContent = U.fmt(Emax, 2);
      $('#gn-f').textContent = U.fmt(f, 1);
      $('#gn-now').textContent = U.sign(e, 2);
      const { ctx, W, H } = stg;
      if (W) {
        const ink = Theme.v('--ink'), bad = Theme.v('--bad'), phys = Theme.v('--phys'), metal = Theme.v('--earth'), muted = Theme.v('--muted');
        ctx.clearRect(0, 0, W, H);
        const cx = W * 0.4, cy = H * 0.48, pw = W * 0.11, ph = H * 0.62;
        ctx.fillStyle = bad; ctx.beginPath(); ctx.roundRect(cx - W * 0.3, cy - ph / 2, pw, ph, 6); ctx.fill();
        ctx.fillStyle = phys; ctx.beginPath(); ctx.roundRect(cx + W * 0.3 - pw, cy - ph / 2, pw, ph, 6); ctx.fill();
        Draw.text(ctx, 'N', cx - W * 0.3 + pw / 2, cy + 6, { size: 22, weight: 700, align: 'center', color: '#fff' });
        Draw.text(ctx, 'S', cx + W * 0.3 - pw / 2, cy + 6, { size: 22, weight: 700, align: 'center', color: '#fff' });
        ctx.strokeStyle = U.rgba(ink, 0.18); ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
        for (let i = -2; i <= 2; i++) Draw.arrow(ctx, cx - W * 0.3 + pw + 4, cy + i * ph * 0.18, cx + W * 0.3 - pw - 6, cy + i * ph * 0.18, U.rgba(ink, 0.16), 1, 6);
        ctx.setLineDash([]);
        const half = W * 0.13 * Math.abs(Math.cos(st.th)), hh = ph * 0.36;
        ctx.strokeStyle = metal; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.rect(cx - half, cy - hh, 2 * half, 2 * hh); ctx.stroke();
        ctx.strokeStyle = U.rgba(ink, 0.5); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(cx, cy - hh - 24); ctx.lineTo(cx, cy + hh + 30); ctx.stroke();
        Draw.text(ctx, '회전축', cx + 8, cy - hh - 14, { size: 11, color: muted });
        // 슬립 링과 전구
        const by = cy + hh + 30;
        ctx.fillStyle = U.rgba(metal, 0.8); ctx.fillRect(cx - 10, by, 20, 6); ctx.fillRect(cx - 10, by + 10, 20, 6);
        const bx = W * 0.86, bulbY = cy;
        const glow = Math.min(1, Math.abs(e) / Math.max(1, Emax)) * Math.min(1, Emax / 3);
        ctx.strokeStyle = U.rgba(metal, 0.8); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx + 10, by + 3); ctx.lineTo(bx, by + 3); ctx.lineTo(bx, bulbY + 22); ctx.stroke();
        ctx.beginPath(); ctx.arc(bx, bulbY, 20, 0, 7);
        ctx.fillStyle = `rgba(255, 196, 60, ${0.15 + glow * 0.8})`; ctx.fill(); ctx.strokeStyle = U.rgba(ink, 0.5); ctx.lineWidth = 1.5; ctx.stroke();
        Draw.text(ctx, '전구', bx, bulbY - 28, { size: 11, color: muted, align: 'center' });
        Draw.text(ctx, `코일 면과 자기장이 이루는 각 ${Math.round((st.th * 180 / Math.PI) % 360)}°`, 14, 22, { size: 12, color: muted, weight: 600 });
        Draw.text(ctx, f > 1.2 ? '실제로는 더 빠르게 돌고 있음 (화면은 느리게 표시)' : '', 14, 40, { size: 11, color: muted });
      }
      const now = performance.now();
      if (now - lastChart > 120) {
        lastChart = now;
        const T = 3 / f, xs = Array.from({ length: 301 }, (_, i) => T * i / 300);
        chart($('#gn-c'), {
          x: [0, T * 1000], height: 220, xLabel: '시간 (ms)', yLabel: '기전력 (V)', y: [-Math.max(Emax, 0.1) * 1.15, Math.max(Emax, 0.1) * 1.15],
          xFmt: v => `${U.fmt(v, 1)} ms`, yFmt: v => U.fmt(v, 2) + ' V',
          series: [{ name: `e = ${U.fmt(Emax, 2)} sin(2π × ${U.fmt(f, 1)} t)`, color: 'var(--acc)', width: 2.4, area: true, base: 0, data: xs.map(t => [t * 1000, Emax * Math.sin(w * t)]) }],
          hlines: [{ y: 0 }],
        });
      }
    });
  }

  function notesCoil() {
    return U.notesHead('이론 노트', '자기 선속 · 패러데이 법칙 · 렌츠 법칙') +
      U.note('전자기 유도', `
        <p>코일을 지나는 자기 선속(Φ = B × A)이 변하면 코일에 전압(유도 기전력)이 생겨 전류가 흐른다. 이 현상을 <strong>전자기 유도</strong>, 흐르는 전류를 <strong>유도 전류</strong>라고 한다.</p>
        <div class="formula">V = −N × ΔΦ ÷ Δt &nbsp;&nbsp;(패러데이 법칙)</div>
        <ul><li>자석을 빨리 움직일수록</li><li>자석이 셀수록</li><li>코일을 많이 감을수록</li></ul>
        <p>유도 전류가 세다. 자석이 멈춰 있으면 코일 안에 있더라도 전류가 흐르지 않는다.</p>`) +
      U.note('렌츠 법칙: 유도 전류의 방향', `
        <p>유도 전류는 <strong>자기 선속의 변화를 방해하는 방향</strong>으로 흐른다.</p>
        <ul><li>N극이 다가오면 코일의 가까운 끝이 N극이 되어 밀어낸다.</li>
        <li>N극이 멀어지면 가까운 끝이 S극이 되어 끌어당긴다.</li>
        <li>자석의 극을 바꾸거나 움직이는 방향을 바꾸면 전류 방향(검류계 바늘)도 반대가 된다.</li></ul>
        <p>자석을 움직이려면 이 방해하는 힘을 이기는 일을 해야 하고, 그 일이 전기 에너지로 바뀐다(에너지 보존).</p>`) +
      U.note('생활 속 전자기 유도', `
        <ul><li>발전소의 발전기, 자전거 발전기</li><li>교통 카드와 무선 충전기</li><li>인덕션 레인지 (냄비 바닥에 유도 전류가 흘러 열이 남)</li><li>전기 기타의 픽업, 금속 탐지기</li></ul>`) +
      U.note('생각해 보기', `
        ${U.qa('자석을 코일 속에 넣은 채 가만히 두면 검류계는?', '0을 가리킨다. 자기 선속이 크더라도 변하지 않으면 유도 기전력이 생기지 않는다.')}
        ${U.qa('자석을 코일에 넣을 때와 뺄 때 검류계 바늘은?', '서로 반대 방향으로 움직인다. 넣을 때는 선속이 늘고, 뺄 때는 선속이 줄기 때문이다.')}`) +
      `<p class="src note full">코일은 반지름 ${RC * 100} cm, 길이 ${LC * 100} cm인 솔레노이드, 자석은 중심에 놓인 점 자기 쌍극자로 계산했다. 코일 안 한 점의 자기 선속은 μ₀mR²/[2(R²+z²)^(3/2)]이며 이를 코일 길이에 걸쳐 더했다.</p>`;
  }
  function notesGen() {
    return U.notesHead('이론 노트', '발전기 · 교류 · 에너지 전환') +
      U.note('발전기의 원리', `
        <p>자석 사이에서 코일을 돌리면 코일 면을 지나는 자기 선속이 계속 바뀌어 유도 전류가 흐른다. 회전할 때마다 전류 방향이 바뀌므로 <strong>교류</strong>가 만들어진다.</p>
        <div class="formula">Φ = N B A cos ωt &nbsp;&nbsp;→&nbsp;&nbsp; e = N B A ω sin ωt</div>
        <p>감은 수, 자기장, 면적이 크고 빠르게 돌릴수록 기전력의 최댓값이 크다.</p>`) +
      U.note('에너지 전환', `
        <p>발전기는 터빈을 돌리는 <strong>역학적 에너지</strong>를 <strong>전기 에너지</strong>로 바꾼다. 터빈을 돌리는 에너지원에 따라 화력(화학 에너지), 원자력(핵에너지), 수력(위치 에너지), 풍력(바람의 운동 에너지) 발전으로 나뉜다. 태양광 발전은 발전기 없이 빛에너지를 직접 전기 에너지로 바꾼다.</p>`) +
      `<p class="src note full">코일이 일정한 각속도로 회전하고 자기장은 균일하다고 가정했다.</p>`;
  }
})();
