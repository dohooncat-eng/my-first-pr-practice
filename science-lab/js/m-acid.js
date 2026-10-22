'use strict';
/* 산·염기 중화 반응 — 산 수용액에 염기를 떨어뜨리는 중화 적정 */
(() => {
  const KW = 1.0e-14;            // 25 °C 물의 이온곱
  const DH = 55.8e3;             // H⁺ + OH⁻ → H₂O 반응열 크기 (J/mol, 25 °C)
  const CP = 4.18;               // 묽은 수용액의 비열 J/(g·°C), 밀도 1 g/mL 가정
  const L_H = 349.6, L_OH = 199.1; // 무한 희석 몰전도도 (S·cm²/mol)

  const ACIDS = {
    HCl: { name: '염산', f: 'HCl', an: 'Cl⁻', anName: '염화', strong: true, lam: 76.3 },
    HNO3: { name: '질산', f: 'HNO₃', an: 'NO₃⁻', anName: '질산', strong: true, lam: 71.4 },
    CH3COOH: { name: '아세트산', f: 'CH₃COOH', an: 'CH₃COO⁻', anName: '아세트산', strong: false, Ka: 1.75e-5, lam: 40.9 },
  };
  const BASES = {
    NaOH: { name: '수산화 나트륨', f: 'NaOH', cat: 'Na⁺', el: 'Na', elName: '나트륨', lam: 50.1 },
    KOH: { name: '수산화 칼륨', f: 'KOH', cat: 'K⁺', el: 'K', elName: '칼륨', lam: 73.5 },
  };
  const IND = {
    btb: { name: 'BTB', range: [6.0, 7.6], text: '산성 노란색 → 중성 초록색 → 염기성 파란색 (변색 범위 pH 6.0~7.6)',
      stops: [[6.0, [226, 190, 34, .74]], [6.8, [70, 158, 84, .74]], [7.6, [36, 90, 196, .8]]] },
    php: { name: '페놀프탈레인', range: [8.2, 10.0], text: '산성·중성 무색 → 염기성 붉은색 (변색 범위 pH 8.2~10.0)',
      stops: [[8.2, [255, 255, 255, 0]], [9.0, [236, 120, 190, .5]], [10.0, [205, 25, 135, .8]]] },
    mo: { name: '메틸 오렌지', range: [3.1, 4.4], text: '산성 붉은색 → 주황색 → 노란색 (변색 범위 pH 3.1~4.4)',
      stops: [[3.1, [214, 48, 40, .8]], [3.8, [236, 118, 36, .8]], [4.4, [240, 196, 50, .76]]] },
    univ: { name: '만능 지시약', range: null, text: 'pH에 따라 빨강 → 주황 → 노랑 → 초록 → 파랑 → 보라로 연속해서 변함',
      stops: [[1, [214, 40, 40, .8]], [3, [236, 104, 36, .8]], [5, [242, 180, 40, .8]], [6, [226, 220, 60, .8]], [7, [78, 168, 72, .8]], [8, [36, 148, 136, .8]], [9, [40, 98, 196, .82]], [11, [72, 58, 168, .82]], [13, [110, 40, 140, .82]]] },
    none: { name: '없음', range: null, text: '지시약을 넣지 않으면 색 변화가 없어 중화점을 눈으로 알 수 없다.', stops: null },
  };
  function indRGBA(key, pH) {
    const s = IND[key].stops;
    if (!s) return null;
    if (pH <= s[0][0]) return s[0][1];
    if (pH >= s[s.length - 1][0]) return s[s.length - 1][1];
    for (let i = 1; i < s.length; i++) {
      if (pH <= s[i][0]) {
        const t = (pH - s[i - 1][0]) / (s[i][0] - s[i - 1][0]);
        return s[i - 1][1].map((v, j) => v + (s[i][1][j] - v) * t);
      }
    }
    return s[s.length - 1][1];
  }
  function indName(key, pH) {
    switch (key) {
      case 'btb': return pH < 6.0 ? '노란색' : pH <= 7.6 ? '초록색' : '파란색';
      case 'php': return pH < 8.2 ? '무색' : pH < 9.4 ? '연분홍색' : '붉은색';
      case 'mo': return pH < 3.1 ? '붉은색' : pH <= 4.4 ? '주황색' : '노란색';
      case 'univ': return pH < 3 ? '빨간색' : pH < 5 ? '주황색' : pH < 6.5 ? '노란색' : pH < 7.5 ? '초록색' : pH < 10 ? '파란색' : '보라색';
      default: return '변화 없음';
    }
  }

  // 전하 균형식 [H⁺] + [M⁺] = [OH⁻] + [A⁻] 을 [H⁺]에 대해 풀기
  function solve(st, Vb) {
    const A = ACIDS[st.acid], B = BASES[st.base];
    const Vml = st.Va + Vb, V = Vml / 1000;
    const nA = st.Ca * st.Va / 1000, nB = st.Cb * Vb / 1000;
    const CA = nA / V, CB = nB / V;
    const an = h => A.strong ? CA : CA * A.Ka / (A.Ka + h);
    let lo = -15, hi = 1;
    for (let i = 0; i < 70; i++) {
      const m = (lo + hi) / 2, h = Math.pow(10, m);
      if (h + CB - KW / h - an(h) > 0) hi = m; else lo = m;
    }
    const h = Math.pow(10, (lo + hi) / 2), oh = KW / h, a = an(h), ha = CA - a;
    const reacted = Math.min(nA, nB);
    return {
      Vb, pH: -Math.log10(h), nA, nB, reacted,
      T: st.T0 + reacted * DH / (Vml * CP),
      kappa: L_H * h + L_OH * oh + B.lam * CB + A.lam * a,
      mmol: { h: h * V * 1e3, oh: oh * V * 1e3, cat: nB * 1e3, an: a * V * 1e3, ha: ha * V * 1e3 },
    };
  }

  const KEYS = ['an', 'ha', 'h', 'cat', 'oh', 'w'];

  registerModule({
    id: 'acid', subject: 'chem', title: '산·염기 중화 반응', short: '산·염기 중화',
    unit: '통합과학2 · 변화와 다양성',
    lead: '산 수용액에 뷰렛으로 염기를 떨어뜨리며 혼합 용액 속 이온의 수, pH, 온도, 전기 전도도가 어떻게 달라지는지 관찰합니다.',
    desc: '이온 입자 모형, 중화 적정 곡선, 중화열, 전기 전도도, 지시약 색 변화',
    icon: '<path d="M9 3h6M10 3v6.2L4.6 18.4A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.4-2.6L14 9.2V3"/><path d="M6.8 15h10.4"/>',
    mount(root, S) {
      const st = { acid: 'HCl', base: 'NaOH', Ca: 0.1, Va: 20, Cb: 0.1, Vb: 0, ind: 'btb', T0: 20, playing: false, VbMax: 40 };
      root.innerHTML = `
      <div class="lab">
        <aside class="panel controls" aria-label="실험 조건">
          <h2 class="ph">실험 조건</h2>
          ${Ctl.seg('ab-acid', '산 (비커)', [['HCl', 'HCl'], ['HNO3', 'HNO₃'], ['CH3COOH', 'CH₃COOH']], st.acid)}
          ${Ctl.range('ab-ca', '산의 몰 농도', { min: 0.05, max: 1, step: 0.05, value: st.Ca })}
          ${Ctl.range('ab-va', '산의 부피', { min: 10, max: 50, step: 5, value: st.Va })}
          <hr>
          ${Ctl.seg('ab-base', '염기 (뷰렛)', [['NaOH', 'NaOH'], ['KOH', 'KOH']], st.base)}
          ${Ctl.range('ab-cb', '염기의 몰 농도', { min: 0.05, max: 1, step: 0.05, value: st.Cb })}
          <hr>
          ${Ctl.seg('ab-ind', '지시약', [['btb', 'BTB'], ['php', '페놀프탈레인'], ['mo', '메틸 오렌지'], ['univ', '만능'], ['none', '없음']], st.ind)}
          <p class="ctl-hint" id="ab-ind-desc"></p>
          ${Ctl.range('ab-t0', '처음 온도 (두 용액 같음)', { min: 10, max: 30, step: 1, value: st.T0 })}
        </aside>
        <div class="stack">
          <div class="panel stage-panel">
            <canvas class="stage" id="ab-cv" style="aspect-ratio: 16 / 11" aria-label="뷰렛, 비커와 혼합 용액 속 이온 입자 모형"></canvas>
            <div class="stage-key right" id="ab-key"></div>
          </div>
          <div class="panel controls">
            ${Ctl.range('ab-vb', '넣은 염기의 부피', { min: 0, max: st.VbMax, step: 0.05, value: 0 })}
            <div class="btn-row">
              <button class="btn primary" id="ab-play" type="button">${ICON.play}<span>자동 적정</span></button>
              <button class="btn" type="button" data-d="-1">−1 mL</button>
              <button class="btn" type="button" data-d="0.1">+0.1 mL</button>
              <button class="btn" type="button" data-d="1">+1 mL</button>
              <button class="btn" type="button" id="ab-eq">중화점으로</button>
              <button class="btn ghost" type="button" id="ab-reset">${ICON.reset}<span>처음으로</span></button>
            </div>
          </div>
          <div class="meters">
            <div class="meter"><span class="lbl">PH METER</span><b id="ab-ph">—</b><span class="sub" id="ab-nature"></span></div>
            <div class="meter"><span class="lbl">THERMOMETER</span><b id="ab-temp">—</b><span class="sub" id="ab-dt"></span></div>
            <div class="meter"><span class="lbl">CONDUCTIVITY</span><b id="ab-k">—</b><span class="sub">mS/cm</span></div>
          </div>
          <div class="readouts" id="ab-ro"></div>
        </div>
      </div>
      <div class="panel eqs" id="ab-eqs"></div>
      <div class="charts">
        <div class="panel"><h3 class="ch">혼합 용액 속 이온의 양</h3><div id="ab-c1"></div></div>
        <div class="panel"><h3 class="ch">pH 변화 (중화 적정 곡선)</h3><div id="ab-c2"></div></div>
        <div class="panel"><h3 class="ch">온도 변화 (중화열)</h3><div id="ab-c3"></div></div>
        <div class="panel"><h3 class="ch">전기 전도도 변화</h3><div id="ab-c4"></div></div>
      </div>
      <section class="notes">${notes()}</section>`;

      const $ = s => root.querySelector(s);
      const cv = $('#ab-cv');
      const stg = S.stage(cv, () => draw());
      let curves = [], cur = null, Veq = 20, unit = 1;
      let lastChart = 0;
      const P = {}; KEYS.forEach(k => { P[k] = []; });
      const flashes = [], drops = [];
      let dropAcc = 0;

      const vb = bindRange(root, 'ab-vb', { format: v => U.fmt(v, 2) + ' mL' }, v => setVb(v, false));
      bindSeg(root, 'ab-acid', v => { st.acid = v; rebuild(); });
      bindSeg(root, 'ab-base', v => { st.base = v; rebuild(); });
      bindRange(root, 'ab-ca', { digits: 2, unit: ' M' }, v => { st.Ca = v; rebuild(); });
      bindRange(root, 'ab-va', { unit: ' mL' }, v => { st.Va = v; rebuild(); });
      bindRange(root, 'ab-cb', { digits: 2, unit: ' M' }, v => { st.Cb = v; rebuild(); });
      bindSeg(root, 'ab-ind', v => { st.ind = v; update(true); });
      bindRange(root, 'ab-t0', { unit: ' °C' }, v => { st.T0 = v; computeCurves(); update(true); });

      const playBtn = $('#ab-play');
      const setPlaying = p => {
        st.playing = p;
        playBtn.innerHTML = p ? `${ICON.pause}<span>멈춤</span>` : `${ICON.play}<span>자동 적정</span>`;
      };
      playBtn.addEventListener('click', () => {
        if (!st.playing && st.Vb >= st.VbMax - 1e-6) setVb(0, false);
        setPlaying(!st.playing);
      });
      root.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => {
        const d = +b.dataset.d;
        setPlaying(false);
        setVb(U.clamp(st.Vb + d, 0, st.VbMax), true);
      }));
      $('#ab-eq').addEventListener('click', () => { setPlaying(false); setVb(Veq, true); });
      $('#ab-reset').addEventListener('click', () => { setPlaying(false); setVb(0, false); });

      function setVb(v, withDrops) {
        const dv = v - st.Vb;
        if (withDrops && dv > 0) for (let i = 0; i < Math.min(4, Math.ceil(dv / 0.3)); i++) drops.push({ y: -i * 14, vy: 0 });
        st.Vb = v;
        vb.set(v, true);
        update(false);
      }

      function rebuild() {
        Veq = st.Ca * st.Va / st.Cb;
        st.VbMax = U.clamp(Math.ceil(Veq * 2 / 5) * 5, 10, 100);
        vb.setMax(st.VbMax);
        if (st.Vb > st.VbMax) st.Vb = st.VbMax;
        vb.set(st.Vb, true);
        unit = st.Ca * st.Va / 10; // 입자 하나가 나타내는 양 (mmol)
        computeCurves();
        KEYS.forEach(k => { P[k].length = 0; });
        flashes.length = 0;
        update(true, true);
        renderStatic();
      }
      function computeCurves() {
        const xs = [];
        for (let i = 0; i <= 260; i++) xs.push(st.VbMax * i / 260);
        [Veq - 0.03, Veq - 0.005, Veq, Veq + 0.005, Veq + 0.03].forEach(v => { if (v > 0 && v < st.VbMax) xs.push(v); });
        xs.sort((a, b) => a - b);
        curves = xs.map(v => solve(st, v));
      }

      function targets() {
        const A = ACIDS[st.acid];
        const nA = st.Ca * st.Va, nB = st.Cb * st.Vb; // mmol
        const r = k => Math.min(40, Math.round(k / unit));
        return {
          an: A.strong ? 10 : r(Math.min(nA, nB)),
          ha: A.strong ? 0 : r(Math.max(nA - nB, 0)),
          h: A.strong ? r(Math.max(nA - nB, 0)) : 0,
          cat: r(nB),
          oh: r(Math.max(nB - nA, 0)),
          w: r(Math.min(nA, nB)),
        };
      }
      function reconcile(animate) {
        const tg = targets();
        const freed = [];
        for (const k of KEYS) {
          const arr = P[k];
          while (arr.length > tg[k]) {
            const i = Math.floor(Math.random() * arr.length);
            const p = arr.splice(i, 1)[0];
            if (k === 'h' || k === 'ha') freed.push(p);
          }
        }
        for (const k of KEYS) {
          const arr = P[k];
          while (arr.length < tg[k]) {
            let p;
            if (animate && (k === 'cat' || k === 'oh')) p = { x: 0.5 + (Math.random() - 0.5) * 0.12, y: 0.06, vx: (Math.random() - 0.5) * 0.15, vy: 0.35 };
            else if (animate && k === 'w' && freed.length) { const q = freed.pop(); p = { x: q.x, y: q.y, vx: 0, vy: 0 }; flashes.push({ x: q.x, y: q.y, t: 0 }); }
            else { const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * 0.44; p = { x: 0.5 + Math.cos(a) * rr, y: 0.5 + Math.sin(a) * rr, vx: 0, vy: 0 }; }
            arr.push(p);
          }
        }
      }

      function update(forceCharts, noAnim) {
        cur = solve(st, st.Vb);
        reconcile(!noAnim);
        const A = ACIDS[st.acid], B = BASES[st.base];
        const pH = cur.pH;
        $('#ab-ph').textContent = U.fmt(pH, 2);
        $('#ab-nature').textContent = pH < 6.95 ? '산성' : pH > 7.05 ? '염기성' : '중성';
        $('#ab-temp').textContent = U.fmt(cur.T, 2) + ' °C';
        $('#ab-dt').textContent = '처음보다 ' + U.sign(cur.T - st.T0, 2) + ' °C';
        $('#ab-k').textContent = U.fmt(cur.kappa, 2);
        $('#ab-ind-desc').textContent = IND[st.ind].text;
        const left = st.Vb < Veq - 1e-9 ? (A.strong ? `남은 H⁺ ${U.fmt(cur.mmol.h, 3)} mmol` : `남은 CH₃COOH ${U.fmt(cur.mmol.ha, 3)} mmol`)
          : st.Vb > Veq + 1e-9 ? `남은 OH⁻ ${U.fmt(cur.mmol.oh, 3)} mmol` : '남은 H⁺·OH⁻ 없음';
        const ionSum = cur.mmol.h + cur.mmol.oh + cur.mmol.cat + cur.mmol.an;
        $('#ab-ro').innerHTML = [
          ['중화점 부피', U.fmt(Veq, 2) + ' mL'],
          ['생성된 물', U.fmt(cur.reacted * 1e3, 3) + ' mmol'],
          ['남은 반응물', left],
          ['전체 이온의 양', U.fmt(ionSum, 3) + ' mmol'],
          ['지시약 색', IND[st.ind].stops ? `${IND[st.ind].name} ${indName(st.ind, pH)}` : '지시약 없음'],
          ['혼합 용액 부피', U.fmt(st.Va + st.Vb, 2) + ' mL'],
        ].map(([a, b]) => `<div class="ro"><span>${a}</span><b>${b}</b></div>`).join('');
        const salt = st.acid === 'CH3COOH' ? 'CH₃COO' + B.el : B.el + A.f.slice(1);
        const saltName = `${A.anName} ${B.elName}`;
        $('#ab-eqs').innerHTML = `
          <div class="eq-row"><span>화학 반응식</span><div class="eq">${A.f} + ${B.f} → ${salt} + H₂O</div></div>
          <div class="eq-row"><span>알짜 이온 반응식</span><div class="eq">${A.strong ? 'H⁺ + OH⁻ → H₂O' : 'CH₃COOH + OH⁻ → CH₃COO⁻ + H₂O'}</div></div>
          <div class="eq-row"><span>구경꾼 이온</span><div class="eq">${A.strong ? `${B.cat}, ${A.an}` : `${B.cat}`} <span style="color:var(--muted);font-size:13px">— 반응에 참여하지 않고 용액에 그대로 남는다 (생성되는 염: ${saltName} ${salt})</span></div></div>
          <div class="eq-row"><span>중화점 조건</span><div class="eq">${U.fmt(st.Ca, 2)} M × ${st.Va} mL = ${U.fmt(st.Cb, 2)} M × V → V = ${U.fmt(Veq, 2)} mL</div></div>`;
        const now = performance.now();
        if (forceCharts || !st.playing || now - lastChart > 110) { drawCharts(); lastChart = now; }
      }

      function renderStatic() {
        const A = ACIDS[st.acid], B = BASES[st.base];
        const items = [
          ['h', 'H⁺', A.strong], ['an', A.an, true], ['ha', A.f + ' 분자', !A.strong],
          ['cat', B.cat, true], ['oh', 'OH⁻', true], ['w', 'H₂O', true],
        ].filter(x => x[2]);
        $('#ab-key').innerHTML = items.map(([k, t]) => `<span><i style="background:var(--ion-${k === 'ha' ? 'mol' : k})"></i>${t}</span>`).join('');
      }

      function drawCharts() {
        const A = ACIDS[st.acid], B = BASES[st.base];
        const X = [0, st.VbMax], xLabel = '넣은 염기의 부피 (mL)', xFmt = v => `염기 ${U.fmt(v, 2)} mL`;
        const pick = f => curves.map(c => [c.Vb, f(c)]);
        const vl = [{ x: Veq, label: '중화점' }];
        const ions = [
          { name: A.strong ? 'H⁺' : 'H⁺ (매우 적음)', color: 'var(--ion-h)', data: pick(c => c.mmol.h) },
          { name: A.an, color: 'var(--ion-an)', data: pick(c => c.mmol.an) },
          { name: B.cat, color: 'var(--ion-cat)', data: pick(c => c.mmol.cat) },
          { name: 'OH⁻', color: 'var(--ion-oh)', data: pick(c => c.mmol.oh) },
        ];
        if (!A.strong) ions.push({ name: 'CH₃COOH 분자', color: 'var(--ion-mol)', dash: '6 4', data: pick(c => c.mmol.ha) });
        ions.push({ name: '전체 이온', color: 'var(--muted)', dash: '2 4', width: 1.6, data: pick(c => c.mmol.h + c.mmol.oh + c.mmol.cat + c.mmol.an) });
        chart($('#ab-c1'), {
          x: X, height: 240, xLabel, yLabel: '양 (mmol)', cursor: st.Vb, series: ions, vlines: vl, xFmt,
          yFmt: v => U.fmt(v, 3) + ' mmol',
        });
        const rng = IND[st.ind].range;
        const eqPt = solve(st, Veq);
        chart($('#ab-c2'), {
          x: X, y: [0, 14], yTicks: [0, 2, 4, 6, 7, 8, 10, 12, 14], height: 240, xLabel, yLabel: 'pH', cursor: st.Vb, xFmt,
          series: [{ name: 'pH', color: 'var(--acc)', width: 2.5, data: pick(c => c.pH) }],
          bands: rng ? [{ y0: rng[0], y1: rng[1], color: 'var(--acc)', opacity: .12, label: `${IND[st.ind].name} 변색 범위` }] : [],
          hlines: [{ y: 7, label: '중성 (pH 7)' }], vlines: vl,
          points: [{ x: Veq, y: eqPt.pH, color: 'var(--acc)', label: `중화점 pH ${U.fmt(eqPt.pH, 2)}`, dy: 16 }],
          yFmt: v => U.fmt(v, 2),
        });
        chart($('#ab-c3'), {
          x: X, height: 220, xLabel, yLabel: '온도 (°C)', cursor: st.Vb, xFmt, yMinSpan: 0.5, yInclude: [st.T0],
          series: [{ name: '혼합 용액 온도', color: 'var(--heat)', width: 2.5, area: true, data: pick(c => c.T) }],
          vlines: vl, yFmt: v => U.fmt(v, 2) + ' °C',
        });
        chart($('#ab-c4'), {
          x: X, height: 220, xLabel, yLabel: '전도도 (mS/cm)', cursor: st.Vb, xFmt, yInclude: [0],
          series: [{ name: '전기 전도도', color: 'var(--earth)', width: 2.5, data: pick(c => c.kappa) }],
          vlines: vl, yFmt: v => U.fmt(v, 2) + ' mS/cm',
        });
      }

      /* ----- 그리기 ----- */
      function geom() {
        const { W, H } = stg;
        const narrow = W < 560;
        const cx = W * (narrow ? 0.27 : 0.29);
        const buTop = 16, buBot = H * 0.36, buW = U.clamp(W * 0.022, 11, 18);
        const tipY = buBot + H * 0.075;
        const bBot = H - 14, bH = H * 0.46, bW = Math.min(W * (narrow ? 0.4 : 0.34), bH * 1.45), bL = cx - bW / 2, bTop = bBot - bH;
        const cap = Math.ceil((st.Va + st.VbMax) / 0.86 / 10) * 10;
        const level = bBot - 4 - (bH - 8) * ((st.Va + st.Vb) / cap);
        const zR = Math.min(W * (narrow ? 0.25 : 0.235), H * 0.37);
        const zx = W - zR - (narrow ? 10 : W * 0.06), zy = H * 0.52;
        return { W, H, cx, buTop, buBot, buW, tipY, bBot, bH, bW, bL, bTop, cap, level, zR, zx, zy, narrow };
      }
      function draw() {
        const { ctx, W, H } = stg;
        if (!W || !cur) return;
        const g = geom();
        const ink = Theme.v('--ink'), muted = Theme.v('--muted'), glass = Theme.v('--glass'), panel = Theme.v('--panel'), water = Theme.v('--water');
        const A = ACIDS[st.acid], B = BASES[st.base];
        ctx.clearRect(0, 0, W, H);

        // 스탠드
        const rodX = g.bL - 22;
        ctx.fillStyle = U.rgba(muted, 0.35);
        ctx.fillRect(rodX - 3, 8, 6, g.bBot - 8);
        ctx.fillRect(rodX - 24, g.bBot - 6, g.bW * 0.5 + 40, 8);
        ctx.fillRect(rodX, g.buTop + (g.buBot - g.buTop) * 0.35 - 3, g.cx - rodX - g.buW / 2, 6);

        // 뷰렛
        const yZero = g.buTop + 10, yFull = g.buBot - 6;
        const lvl = yZero + (yFull - yZero) * (st.Vb / st.VbMax);
        ctx.fillStyle = U.rgba(water, 0.4);
        ctx.fillRect(g.cx - g.buW / 2 + 2, lvl, g.buW - 4, g.buBot - lvl);
        ctx.beginPath();
        ctx.moveTo(g.cx - g.buW / 2 + 2, g.buBot); ctx.lineTo(g.cx - 2, g.tipY - 4); ctx.lineTo(g.cx + 2, g.tipY - 4); ctx.lineTo(g.cx + g.buW / 2 - 2, g.buBot);
        ctx.fill();
        ctx.strokeStyle = glass; ctx.lineWidth = 1.6;
        ctx.strokeRect(g.cx - g.buW / 2, g.buTop, g.buW, g.buBot - g.buTop);
        ctx.beginPath();
        ctx.moveTo(g.cx - g.buW / 2, g.buBot); ctx.lineTo(g.cx - 2.5, g.tipY); ctx.moveTo(g.cx + g.buW / 2, g.buBot); ctx.lineTo(g.cx + 2.5, g.tipY);
        ctx.stroke();
        const tk = niceTicks(0, st.VbMax, 4);
        Draw.font(ctx, 10, 500, true); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        for (let v = 0; v <= st.VbMax + 1e-9; v += tk.step / 5) {
          const y = yZero + (yFull - yZero) * (v / st.VbMax);
          const major = Math.abs(v / tk.step - Math.round(v / tk.step)) < 1e-6;
          ctx.strokeStyle = U.rgba(ink, major ? 0.55 : 0.25); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(g.cx + g.buW / 2, y); ctx.lineTo(g.cx + g.buW / 2 - (major ? 7 : 4), y); ctx.stroke();
          if (major) { ctx.fillStyle = muted; ctx.fillText(String(Math.round(v)), g.cx + g.buW / 2 + 4, y); }
        }
        const ckY = g.buBot + (g.tipY - g.buBot) * 0.42;
        ctx.save(); ctx.translate(g.cx, ckY); ctx.rotate(st.playing ? Math.PI / 2 : 0);
        ctx.fillStyle = U.rgba(ink, 0.7); ctx.beginPath(); ctx.roundRect(-11, -2.5, 22, 5, 2.5); ctx.fill(); ctx.restore();
        if (!g.narrow) {
          Draw.text(ctx, `${B.f} ${U.fmt(st.Cb, 2)} M`, g.cx + g.buW / 2 + 26, g.buTop + 14, { size: 12, weight: 600, color: ink });
          Draw.text(ctx, '뷰렛 (위가 0 mL)', g.cx + g.buW / 2 + 26, g.buTop + 30, { size: 11, color: muted });
        }

        // 비커 액체
        const rgba = indRGBA(st.ind, cur.pH);
        const tint = rgba ? `rgba(${rgba[0] | 0},${rgba[1] | 0},${rgba[2] | 0},${rgba[3]})` : null;
        const liqL = g.bL + 3, liqR = g.bL + g.bW - 3;
        ctx.save();
        ctx.beginPath(); ctx.roundRect(liqL, g.level, liqR - liqL, g.bBot - 3 - g.level, [0, 0, 9, 9]); ctx.clip();
        ctx.fillStyle = U.rgba(water, 0.3); ctx.fillRect(liqL, g.level, liqR - liqL, g.bBot - g.level);
        if (tint) { ctx.fillStyle = tint; ctx.fillRect(liqL, g.level, liqR - liqL, g.bBot - g.level); }
        ctx.restore();
        ctx.strokeStyle = U.rgba(glass, 0.9); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(liqL, g.level); ctx.lineTo(liqR, g.level); ctx.stroke();
        ctx.strokeStyle = glass; ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(g.bL - 6, g.bTop); ctx.lineTo(g.bL, g.bTop + 6); ctx.lineTo(g.bL, g.bBot - 10);
        ctx.quadraticCurveTo(g.bL, g.bBot, g.bL + 10, g.bBot); ctx.lineTo(g.bL + g.bW - 10, g.bBot);
        ctx.quadraticCurveTo(g.bL + g.bW, g.bBot, g.bL + g.bW, g.bBot - 10); ctx.lineTo(g.bL + g.bW, g.bTop);
        ctx.stroke();
        const ct = niceTicks(0, g.cap, 4);
        Draw.font(ctx, 10, 500, true); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for (let v = ct.step; v < g.cap; v += ct.step) {
          const y = g.bBot - 4 - (g.bH - 8) * (v / g.cap);
          ctx.strokeStyle = U.rgba(ink, 0.35); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(g.bL + g.bW - 12, y); ctx.lineTo(g.bL + g.bW - 2, y); ctx.stroke();
          ctx.fillStyle = muted; ctx.fillText(`${v}`, g.bL + g.bW - 15, y);
        }
        // 방울
        ctx.fillStyle = U.rgba(water, 0.9);
        for (const d of drops) {
          if (d.y < 0) continue;
          const y = g.tipY + 2 + d.y;
          ctx.beginPath(); ctx.arc(g.cx, y, 3.2, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.moveTo(g.cx - 2.6, y - 1.5); ctx.lineTo(g.cx, y - 7); ctx.lineTo(g.cx + 2.6, y - 1.5); ctx.fill();
        }

        // 확대 원 (입자 모형)
        const fx = g.bL + g.bW * 0.62, fy = (g.level + g.bBot) / 2;
        ctx.strokeStyle = U.rgba(ink, 0.25); ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(fx, fy - 6); ctx.lineTo(g.zx - g.zR * 0.7, g.zy - g.zR * 0.71); ctx.moveTo(fx, fy + 6); ctx.lineTo(g.zx - g.zR * 0.7, g.zy + g.zR * 0.71); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(fx, fy, 6, 0, Math.PI * 2); ctx.strokeStyle = U.rgba(ink, 0.45); ctx.stroke();
        ctx.save();
        ctx.beginPath(); ctx.arc(g.zx, g.zy, g.zR, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = panel; ctx.fillRect(g.zx - g.zR, g.zy - g.zR, g.zR * 2, g.zR * 2);
        ctx.fillStyle = U.rgba(water, 0.22); ctx.fillRect(g.zx - g.zR, g.zy - g.zR, g.zR * 2, g.zR * 2);
        if (tint) { ctx.globalAlpha = 0.35; ctx.fillStyle = tint; ctx.fillRect(g.zx - g.zR, g.zy - g.zR, g.zR * 2, g.zR * 2); ctx.globalAlpha = 1; }
        const r = U.clamp(g.zR / 11, 8, 13.5);
        const zx0 = g.zx - g.zR + r, zs = (g.zR - r) * 2;
        const labels = { h: 'H⁺', oh: 'OH⁻', cat: B.cat, an: A.an, ha: 'CH₃COOH', w: 'H₂O' };
        for (const f of flashes) {
          const x = zx0 + f.x * zs, y = g.zy - g.zR + r + f.y * zs;
          ctx.strokeStyle = U.rgba(Theme.v('--chem'), Math.max(0, 0.75 - f.t)); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(x, y, r * (1 + f.t * 2.2), 0, Math.PI * 2); ctx.stroke();
        }
        for (const k of ['w', 'an', 'ha', 'cat', 'h', 'oh']) {
          const col = Theme.v(k === 'ha' ? '--ion-mol' : '--ion-' + k);
          for (const p of P[k]) {
            const x = zx0 + p.x * zs, y = g.zy - g.zR + r + p.y * zs;
            if (k === 'w') Draw.ion(ctx, x, y, r * 0.8, col, 'H₂O', panel);
            else if (k === 'ha' || (k === 'an' && labels.an.length > 4)) Draw.pill(ctx, x, y, r * 1.45, col, labels[k]);
            else Draw.ion(ctx, x, y, r, col, labels[k]);
          }
        }
        ctx.restore();
        ctx.beginPath(); ctx.arc(g.zx, g.zy, g.zR, 0, Math.PI * 2);
        ctx.strokeStyle = U.rgba(ink, 0.55); ctx.lineWidth = 2.5; ctx.stroke();
        Draw.text(ctx, `입자 모형 · 1개 = ${U.fmt(unit, 2)} mmol`, g.zx, Math.min(H - 6, g.zy + g.zR + 17), { size: 11.5, weight: 600, color: muted, align: 'center' });
      }

      S.loop(dt => {
        if (st.playing) {
          const near = Math.abs(st.Vb - Veq) < Math.max(0.6, Veq * 0.06);
          const rate = (near ? 0.25 : 1.6) * Math.max(0.5, st.VbMax / 40);
          const nv = Math.min(st.VbMax, st.Vb + rate * dt);
          dropAcc += nv - st.Vb;
          if (dropAcc > Math.max(0.12, st.VbMax / 300)) { drops.push({ y: 0, vy: 0 }); dropAcc = 0; }
          setVb(nv, false);
          if (nv >= st.VbMax - 1e-9) setPlaying(false);
        }
        // 입자 운동
        for (const k of KEYS) for (const p of P[k]) {
          p.vx += (Math.random() - 0.5) * 0.9 * dt; p.vy += (Math.random() - 0.5) * 0.9 * dt;
          p.vx *= 0.985; p.vy *= 0.985;
          const sp = Math.hypot(p.vx, p.vy), mx = 0.22;
          if (sp > mx) { p.vx *= mx / sp; p.vy *= mx / sp; }
          p.x += p.vx * dt; p.y += p.vy * dt;
          const dx = p.x - 0.5, dy = p.y - 0.5, d = Math.hypot(dx, dy);
          if (d > 0.47) { p.x = 0.5 + dx / d * 0.47; p.y = 0.5 + dy / d * 0.47; const dot = p.vx * dx / d + p.vy * dy / d; if (dot > 0) { p.vx -= 2 * dot * dx / d; p.vy -= 2 * dot * dy / d; } }
        }
        for (let i = flashes.length - 1; i >= 0; i--) { flashes[i].t += dt * 1.4; if (flashes[i].t > 0.7) flashes.splice(i, 1); }
        if (stg.W) {
          const g = geom();
          for (let i = drops.length - 1; i >= 0; i--) {
            const d = drops[i];
            d.vy += 900 * dt; d.y += d.vy * dt;
            if (g.tipY + d.y > g.level) drops.splice(i, 1);
          }
        }
        draw();
      });
      S.on(document, 'labtheme', () => drawCharts());
      rebuild();
    },
  });

  function notes() {
    return U.notesHead('이론 노트', '아레니우스 정의 · 중화 반응의 양적 관계 · 중화열 · 전기 전도도') +
      U.note('산과 염기', `
        <p><strong>산</strong>은 물에 녹아 수소 이온(H⁺)을 내놓는 물질이고, <strong>염기</strong>는 물에 녹아 수산화 이온(OH⁻)을 내놓는 물질이다(아레니우스 정의).</p>
        <div class="formula">HCl → H⁺ + Cl⁻ &nbsp;&nbsp; NaOH → Na⁺ + OH⁻</div>
        <p>염산·질산처럼 거의 모두 이온화하는 산을 강산, 아세트산처럼 일부만 이온화하는 산을 약산이라고 한다. 0.1 M 아세트산은 약 1.3%만 이온화하므로 입자 모형에서 대부분 분자 상태로 그렸다.</p>`) +
      U.note('중화 반응과 양적 관계', `
        <p>산의 H⁺와 염기의 OH⁻가 1 : 1의 개수비로 반응해 물이 생긴다. 이것이 중화 반응의 본질이며, 나머지 이온은 반응하지 않는 <strong>구경꾼 이온</strong>이다.</p>
        <div class="formula">H⁺(aq) + OH⁻(aq) → H₂O(l)</div>
        <p>H⁺와 OH⁻의 몰수가 같아지는 지점이 <strong>중화점</strong>이다. 가수를 n, 몰 농도를 M, 부피를 V라 하면</p>
        <div class="formula">n × M × V (산) = n′ × M′ × V′ (염기)</div>
        <p>아세트산처럼 약산이어도 OH⁻가 들어가면 분자가 계속 이온화하며 반응하므로, 중화에 필요한 염기의 양은 같은 농도·부피의 강산과 같다.</p>`) +
      U.note('혼합 용액 속 이온 수의 변화', `
        <ul>
          <li><strong>H⁺</strong>: 넣은 OH⁻와 반응해 줄어들고 중화점에서 거의 0이 된다.</li>
          <li><strong>Cl⁻ (구경꾼 이온)</strong>: 반응하지 않으므로 처음 양이 그대로 유지된다.</li>
          <li><strong>Na⁺ (구경꾼 이온)</strong>: 넣은 염기의 양에 비례해 계속 늘어난다.</li>
          <li><strong>OH⁻</strong>: 중화점까지는 모두 반응해 없고, 중화점 이후 늘어난다.</li>
          <li><strong>전체 이온 수</strong>: 중화점까지는 H⁺ 하나가 Na⁺ 하나로 바뀌어 일정하고, 중화점 이후 증가한다.</li>
        </ul>`) +
      U.note('중화열과 온도', `
        <p>중화 반응은 열을 내는 발열 반응이다. 강산과 강염기가 반응해 물 1 mol이 생길 때 약 56 kJ의 열이 나온다(25 °C 기준 55.8 kJ).</p>
        <div class="formula">ΔT = (생성된 물의 몰수 × 55.8 kJ/mol) ÷ (용액 질량 × 4.18 J/(g·°C))</div>
        <p>온도는 <strong>중화점에서 가장 높다</strong>. 그 뒤로는 더 반응할 H⁺가 없는데 처음 온도의 염기가 계속 섞여 들어오므로 온도가 서서히 내려간다. 이 시뮬레이션은 열이 밖으로 빠져나가지 않고 용액의 밀도를 1 g/mL로 가정했다.</p>`) +
      U.note('전기 전도도', `
        <p>수용액은 이온이 움직이며 전류를 흘린다. H⁺와 OH⁻는 물 분자 사이를 뛰어넘듯 이동해 다른 이온보다 몇 배 빠르다.</p>
        <div class="tbl"><table class="data"><thead><tr><th>이온</th><th class="num">몰전도도 (S·cm²/mol)</th></tr></thead><tbody>
          <tr><td>H⁺</td><td class="num">349.6</td></tr><tr><td>OH⁻</td><td class="num">199.1</td></tr>
          <tr><td>Cl⁻</td><td class="num">76.3</td></tr><tr><td>K⁺</td><td class="num">73.5</td></tr>
          <tr><td>NO₃⁻</td><td class="num">71.4</td></tr><tr><td>Na⁺</td><td class="num">50.1</td></tr><tr><td>CH₃COO⁻</td><td class="num">40.9</td></tr>
        </tbody></table></div>
        <p>강산에 강염기를 넣으면 빠른 H⁺가 느린 Na⁺로 바뀌어 전도도가 줄다가 중화점에서 가장 작고, 이후 OH⁻가 늘며 다시 커진다. 값은 무한 희석 몰전도도로 계산한 근삿값이다.</p>`) +
      U.note('지시약', `
        <div class="tbl"><table class="data"><thead><tr><th>지시약</th><th>산성</th><th>변색 범위 (pH)</th><th>염기성</th></tr></thead><tbody>
          <tr><td>메틸 오렌지</td><td>붉은색</td><td class="num">3.1 ~ 4.4</td><td>노란색</td></tr>
          <tr><td>BTB</td><td>노란색</td><td class="num">6.0 ~ 7.6</td><td>파란색</td></tr>
          <tr><td>페놀프탈레인</td><td>무색</td><td class="num">8.2 ~ 10.0</td><td>붉은색</td></tr>
        </tbody></table></div>
        <p>강산–강염기 적정은 중화점 부근에서 pH가 3~11 사이를 한 방울 만에 뛰어넘으므로 세 지시약 모두 쓸 수 있다. 약산–강염기 적정은 중화점 pH가 약 8.7로 염기성이므로 페놀프탈레인이 알맞다.</p>`) +
      U.note('생활 속 중화 반응', `
        <ul>
          <li>위산이 너무 많을 때 수산화 마그네슘 같은 제산제를 먹는다.</li>
          <li>산성화된 토양에 석회(산화 칼슘, 수산화 칼슘)를 뿌린다.</li>
          <li>생선 비린내(염기성 아민)를 레몬즙이나 식초로 줄인다.</li>
          <li>벌레에 물려 생긴 산성 물질에 묽은 암모니아수를 바른다.</li>
          <li>공장의 산성 폐수를 염기로 중화한 뒤 내보낸다.</li>
        </ul>`) +
      U.note('생각해 보기', `
        ${U.qa('0.1 M 염산 20 mL를 완전히 중화하려면 0.2 M 수산화 나트륨 수용액이 몇 mL 필요할까?', '0.1 × 20 = 0.2 × V 이므로 V = 10 mL. 위에서 염기 농도를 0.20 M으로 바꾸면 중화점이 10 mL로 옮겨 가는 것을 확인할 수 있다.')}
        ${U.qa('중화점 이후 전체 이온 수가 늘어나는 까닭은?', '중화점 이후에는 넣은 Na⁺와 OH⁻가 반응할 상대가 없어 그대로 용액에 쌓이기 때문이다. 중화점 이전에는 H⁺ 1개가 사라지는 대신 Na⁺ 1개가 들어와 개수가 일정하다.')}
        ${U.qa('같은 농도의 염산과 아세트산을 같은 양 중화할 때 무엇이 같고 무엇이 다를까?', '필요한 염기의 부피(중화점)는 같다. 하지만 처음 pH(염산 1.0, 아세트산 약 2.9), 중화점 pH(7.0과 약 8.7), 전기 전도도는 다르다. 산을 바꿔 가며 그래프를 비교해 보자.')}
        ${U.qa('중화열을 측정할 때 농도를 높이면 온도 변화는 어떻게 될까?', '생성되는 물의 몰수가 늘어 방출되는 열이 커지므로 온도가 더 많이 올라간다. 1 M 용액끼리 섞으면 약 6.7 °C 오른다.')}`) +
      `<p class="src note full">자료: 몰전도도·이온화 상수(CRC Handbook of Chemistry and Physics), 중화 엔탈피 ΔH = −55.8 kJ/mol(25 °C), 아세트산 Kₐ = 1.75 × 10⁻⁵. pH는 전하 균형식을 수치로 풀어 계산했고 온도에 따른 물의 이온곱 변화는 무시했다.</p>`;
  }
})();
