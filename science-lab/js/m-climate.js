'use strict';
/* 온실 효과와 지구 에너지 균형 — 1층 대기 복사 평형 모형, CO₂ 복사 강제력 */
(() => {
  const SIGMA = 5.670374e-8;
  // NOAA GML 마우나로아 연평균 CO₂ (ppm)
  const MLO = [[1959, 315.98], [1960, 316.91], [1965, 320.04], [1970, 325.68], [1975, 331.11], [1980, 338.76], [1985, 346.12], [1990, 354.39], [1995, 360.82], [2000, 369.71], [2005, 379.98], [2010, 389.90], [2015, 401.01], [2016, 404.41], [2017, 406.76], [2018, 408.72], [2019, 411.66], [2020, 414.24], [2021, 416.45], [2022, 418.56], [2023, 421.08], [2024, 424.61]];
  const PRESETS = [
    ['대기 없는 지구', { S: 1361, a: 0.30, e: 0 }],
    ['지금의 지구', { S: 1361, a: 0.30, e: 0.78 }],
    ['온실 효과 강화', { S: 1361, a: 0.30, e: 0.82 }],
    ['눈덩이 지구', { S: 1361, a: 0.60, e: 0.78 }],
  ];
  const K = t => t - 273.15;

  registerModule({
    id: 'climate', subject: 'earth', title: '온실 효과와 지구 에너지 균형', short: '온실 효과',
    unit: '통합과학2 · 환경과 에너지',
    lead: '지구가 받는 태양 에너지와 우주로 내보내는 에너지가 같아지는 온도를 계산합니다. 반사율과 대기의 적외선 흡수율을 바꾸며 온실 효과를 확인하고, 이산화 탄소 농도에 따른 기온 변화를 살펴봅니다.',
    desc: '복사 평형, 지구 에너지 흐름도, 반사율, 온실 기체, CO₂ 관측 자료와 서울 기온',
    icon: '<circle cx="7" cy="7" r="3"/><path d="M7 1.5V3M7 11v1.5M1.5 7H3M11 7h1.5"/><path d="M17 4v10.5a3 3 0 1 0 2 0V4a1 1 0 0 0-2 0z"/>',
    mount(root, S) {
      tabs(root, [
        { id: 'balance', label: '지구 에너지 균형', mount: mountBalance },
        { id: 'co2', label: '이산화 탄소와 기온', mount: mountCO2 },
      ], S);
    },
  });

  function solve(p) {
    const Fin = p.S / 4, abs = (1 - p.a) * Fin;
    const Te = Math.pow(abs / SIGMA, 0.25);
    const Ts = Te * Math.pow(2 / (2 - p.e), 0.25);
    const U = SIGMA * Ts ** 4, A = p.e * U / 2;
    return { Fin, refl: p.a * Fin, abs, Te, Ts, U, A, through: (1 - p.e) * U, out: (1 - p.e) * U + A };
  }

  function mountBalance(root, S) {
    const p = { S: 1361, a: 0.30, e: 0.78 };
    root.innerHTML = `
      <div class="lab">
        <aside class="panel controls" aria-label="모형 조건">
          <h2 class="ph">지구 조건</h2>
          ${Ctl.range('cl-s', '태양 상수 (대기 밖에서 받는 빛)', { min: 1100, max: 1600, step: 1, value: p.S })}
          ${Ctl.range('cl-a', '반사율 (알베도)', { min: 0.05, max: 0.8, step: 0.01, value: p.a, hint: '구름, 눈, 얼음이 많을수록 크다. 지금 지구는 약 0.30.' })}
          ${Ctl.range('cl-e', '대기의 적외선 흡수율 (온실 기체)', { min: 0, max: 1, step: 0.01, value: p.e, hint: '수증기, 이산화 탄소, 메테인이 많을수록 크다.' })}
          <div class="chips" id="cl-pre">${PRESETS.map(([n], i) => `<button type="button" class="chip" data-i="${i}">${n}</button>`).join('')}</div>
        </aside>
        <div class="stack">
          <div class="panel stage-panel"><canvas class="stage" id="cl-cv" style="aspect-ratio: 16 / 10" aria-label="지구 에너지 흐름도"></canvas></div>
          <div class="meters">
            <div class="meter"><span class="lbl">지표 평균 기온</span><b id="cl-ts">—</b><span class="sub" id="cl-tsk"></span></div>
            <div class="meter"><span class="lbl">온실 효과가 없을 때</span><b id="cl-te">—</b><span class="sub">복사 평형 온도</span></div>
            <div class="meter"><span class="lbl">온실 효과 크기</span><b id="cl-g">—</b><span class="sub">지표 기온 − 복사 평형 온도</span></div>
          </div>
        </div>
      </div>
      <div class="charts">
        <div class="panel"><h3 class="ch">대기의 적외선 흡수율에 따른 지표 기온</h3><div id="cl-c1"></div></div>
        <div class="panel"><h3 class="ch">반사율에 따른 지표 기온</h3><div id="cl-c2"></div></div>
      </div>
      <section class="notes">${notesBalance()}</section>`;
    const $ = s => root.querySelector(s);
    const stg = S.stage($('#cl-cv'), () => draw());
    const rs = bindRange(root, 'cl-s', { unit: ' W/m²' }, v => { p.S = v; update(); });
    const ra = bindRange(root, 'cl-a', { digits: 2 }, v => { p.a = v; update(); });
    const re = bindRange(root, 'cl-e', { digits: 2 }, v => { p.e = v; update(); });
    $('#cl-pre').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; const q = PRESETS[+b.dataset.i][1]; rs.set(q.S, true); ra.set(q.a, true); re.set(q.e, true); Object.assign(p, q); update(); });
    function update() {
      const r = solve(p);
      $('#cl-ts').textContent = U.fmt(K(r.Ts), 1) + ' °C';
      $('#cl-tsk').textContent = `${U.fmt(r.Ts, 1)} K · 실제 지구 평균 약 15 °C`;
      $('#cl-te').textContent = U.fmt(K(r.Te), 1) + ' °C';
      $('#cl-g').textContent = U.sign(r.Ts - r.Te, 1) + ' °C';
      const es = Array.from({ length: 101 }, (_, i) => i / 100);
      chart($('#cl-c1'), {
        x: [0, 1], height: 220, xLabel: '대기의 적외선 흡수율 ε', yLabel: '지표 기온 (°C)', cursor: p.e, xFmt: v => `ε = ${U.fmt(v, 2)}`, yFmt: v => U.fmt(v, 1) + ' °C',
        series: [{ name: '지표 기온', color: 'var(--heat)', width: 2.5, data: es.map(e => [e, K(solve({ ...p, e }).Ts)]) }],
        hlines: [{ y: 15, label: '실제 지구 평균 15 °C' }, { y: 0 }],
      });
      const as = Array.from({ length: 76 }, (_, i) => 0.05 + i / 100);
      chart($('#cl-c2'), {
        x: [0.05, 0.8], height: 220, xLabel: '반사율 α', yLabel: '지표 기온 (°C)', cursor: p.a, xFmt: v => `α = ${U.fmt(v, 2)}`, yFmt: v => U.fmt(v, 1) + ' °C',
        series: [{ name: '지표 기온', color: 'var(--phys)', width: 2.5, data: as.map(a => [a, K(solve({ ...p, a }).Ts)]) }],
        hlines: [{ y: 15, label: '15 °C' }, { y: 0, label: '물이 어는 온도' }],
      });
      draw();
    }
    function draw() {
      const { ctx, W, H } = stg;
      if (!W) return;
      const r = solve(p), ink = Theme.v('--ink'), muted = Theme.v('--muted'), heat = Theme.v('--heat'), earth = Theme.v('--earth'), water = Theme.v('--water');
      ctx.clearRect(0, 0, W, H);
      const spaceY = H * 0.17, atmTop = H * 0.4, atmBot = H * 0.55, ground = H * 0.84;
      // 대기층
      ctx.fillStyle = U.rgba(water, 0.12 + 0.35 * p.e); ctx.fillRect(0, atmTop, W, atmBot - atmTop);
      Draw.text(ctx, `대기 (적외선 흡수율 ${U.fmt(p.e, 2)})`, 12, atmTop + 16, { size: 12, weight: 600, color: ink });
      // 지표
      ctx.fillStyle = U.rgba(earth, 0.22); ctx.fillRect(0, ground, W, H - ground);
      Draw.text(ctx, `지표 ${U.fmt(K(r.Ts), 1)} °C`, 12, ground + 20, { size: 13, weight: 700, color: ink });
      Draw.text(ctx, '우주', 12, spaceY - 8, { size: 12, weight: 600, color: muted });
      ctx.strokeStyle = U.rgba(ink, 0.2); ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(0, spaceY); ctx.lineTo(W, spaceY); ctx.stroke(); ctx.setLineDash([]);
      const wOf = f => Math.max(2, f / 18);
      const sun = '#f5b301';
      const flow = (x1, y1, x2, y2, f, col, label, side = 1, at = 0.5) => {
        const w = wOf(f), lx = U.lerp(x1, x2, at) + side * (w / 2 + 6), ly = U.lerp(y1, y2, at);
        ctx.globalAlpha = 0.85; Draw.arrow(ctx, x1, y1, x2, y2, col, w, Math.max(10, w * 1.6)); ctx.globalAlpha = 1;
        Draw.text(ctx, `${Math.round(f)}`, lx, ly + 4, { size: 12, weight: 700, color: ink, align: side > 0 ? 'left' : 'right', data: true });
        if (label) Draw.text(ctx, label, lx, ly + 19, { size: 10.5, color: muted, align: side > 0 ? 'left' : 'right' });
      };
      const c1 = W * 0.3, c2 = W * 0.45, c3 = W * 0.63, c4 = W * 0.85;
      flow(c1, spaceY - 6, c1, ground - 2, r.abs, sun, '흡수된 햇빛', -1, 0.22);
      if (r.refl > 1) flow(c1 + wOf(r.abs) / 2 + 10, ground - 8, c2, spaceY - 6, r.refl, U.mix(sun, '#ffffff', 0.4), '반사', 1, 0.62);
      Draw.text(ctx, `들어오는 햇빛 ${Math.round(r.Fin)} W/m²`, 12, 20, { size: 12, weight: 700, color: ink });
      Draw.text(ctx, '(태양 상수 ÷ 4)', 12, 36, { size: 11, color: muted });
      flow(c3, ground - 2, c3, atmBot, r.U, heat, '지표 복사', -1);
      if (r.through > 1) flow(c3 + 4, atmBot, c3 + 4, spaceY - 6, r.through, U.rgba(heat, 0.8), '대기를 통과', 1, 0.3);
      if (r.A > 1) {
        flow(c4, atmTop, c4, spaceY - 6, r.A, U.mix(heat, '#7a3cff', 0.35), '대기 복사 (위)', -1);
        flow(c4, atmBot, c4, ground - 2, r.A, U.mix(heat, '#7a3cff', 0.35), '대기 복사 (아래)', -1);
      }
      Draw.text(ctx, `우주로 나가는 에너지 ${Math.round(r.out)} W/m²`, W - 12, 20, { size: 12, weight: 700, color: ink, align: 'right' });
      Draw.text(ctx, `= 흡수한 햇빛 ${Math.round(r.abs)} W/m² (복사 평형)`, W - 12, 36, { size: 11, color: muted, align: 'right' });
    }
    S.on(document, 'labtheme', () => draw());
    update();
  }

  function mountCO2(root, S) {
    void S;
    const st = { C: 424 };
    const lam = 3.0 / (5.35 * Math.log(2)), lamLo = 2.5 / (5.35 * Math.log(2)), lamHi = 4.0 / (5.35 * Math.log(2));
    const hasSeoul = Array.isArray(window.SEOUL_ANNUAL);
    root.innerHTML = `
      <div class="lab">
        <aside class="panel controls">
          <h2 class="ph">대기 중 이산화 탄소</h2>
          ${Ctl.range('co-c', 'CO₂ 농도', { min: 180, max: 1200, step: 1, value: st.C })}
          <div class="chips" id="co-pre">${[[180, '빙기'], [280, '산업화 이전'], [424, '2024년'], [560, '산업화 이전 2배'], [1120, '4배']].map(([c, n]) => `<button type="button" class="chip" data-c="${c}">${n} ${c}</button>`).join('')}</div>
          <p class="ctl-hint">빙기 값은 남극 빙하 코어 기록, 2024년 값은 하와이 마우나로아 관측소의 연평균이다.</p>
        </aside>
        <div class="stack">
          <div class="meters">
            <div class="meter"><span class="lbl">복사 강제력</span><b id="co-f">—</b><span class="sub">W/m², 산업화 이전 대비</span></div>
            <div class="meter"><span class="lbl">평형 기온 변화</span><b id="co-t">—</b><span class="sub" id="co-range"></span></div>
            <div class="meter"><span class="lbl">산업화 이전 대비</span><b id="co-x">—</b><span class="sub">배</span></div>
          </div>
          <div class="panel"><h3 class="ch">CO₂ 농도와 평형 기온 변화</h3><p class="ch-sub">띠: 기후 민감도의 가능성 높은 범위 (CO₂ 2배에 2.5~4 °C)</p><div id="co-c1"></div></div>
        </div>
      </div>
      <div class="charts">
        <div class="panel"><h3 class="ch">마우나로아 관측소 대기 CO₂ (연평균)</h3><div id="co-c2"></div></div>
        ${hasSeoul ? '<div class="panel"><h3 class="ch">서울 연평균 기온 (기상청 관측)</h3><div id="co-c3"></div></div>' : ''}
      </div>
      <section class="notes">${notesCO2()}</section>`;
    const $ = s => root.querySelector(s);
    const sl = bindRange(root, 'co-c', { unit: ' ppm' }, v => { st.C = v; update(); });
    $('#co-pre').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) sl.set(+b.dataset.c); });
    function update() {
      const F = 5.35 * Math.log(st.C / 280);
      $('#co-f').textContent = U.sign(F, 2);
      $('#co-t').textContent = U.sign(lam * F, 1) + ' °C';
      $('#co-range').textContent = `가능성 높은 범위 ${U.sign(lamLo * F, 1)} ~ ${U.sign(lamHi * F, 1)} °C`;
      $('#co-x').textContent = U.fmt(st.C / 280, 2);
      const cs = Array.from({ length: 103 }, (_, i) => 180 + i * 10);
      chart($('#co-c1'), {
        x: [180, 1200], height: 240, xLabel: 'CO₂ 농도 (ppm)', yLabel: '평형 기온 변화 (°C)', cursor: st.C, xFmt: v => `${Math.round(v)} ppm`, yFmt: v => U.sign(v, 1) + ' °C',
        series: [
          { name: '가능성 높은 범위 위', color: 'var(--heat)', width: 1, dash: '3 3', legend: false, data: cs.map(c => [c, lamHi * 5.35 * Math.log(c / 280)]) },
          { name: '가능성 높은 범위 아래', color: 'var(--heat)', width: 1, dash: '3 3', legend: false, data: cs.map(c => [c, lamLo * 5.35 * Math.log(c / 280)]) },
          { name: '최적 추정 (2배에 3 °C)', color: 'var(--heat)', width: 2.5, data: cs.map(c => [c, lam * 5.35 * Math.log(c / 280)]) },
        ],
        hlines: [{ y: 0 }, { y: 1.5, label: '파리 협정 목표 1.5 °C' }], vlines: [{ x: 280, label: '산업화 이전' }],
      });
    }
    chart($('#co-c2'), {
      x: [1958, 2025], height: 220, xLabel: '연도', yLabel: 'CO₂ (ppm)', xFmt: v => `${Math.round(v)}년`, snap: x => MLO.reduce((b, d) => Math.abs(d[0] - x) < Math.abs(b[0] - x) ? d : b)[0],
      yFmt: v => U.fmt(v, 2) + ' ppm', xFmtTick: v => String(v),
      series: [{ name: '연평균 CO₂', color: 'var(--acc)', width: 2.5, dots: 2.5, area: true, data: MLO }],
    });
    if (hasSeoul) {
      const d = window.SEOUL_ANNUAL.map(r => [r.year, r.avg]);
      const ma = d.map(([y]) => { const w = d.filter(([x, v]) => v != null && x >= y - 4 && x <= y + 5); return [y, w.length >= 7 && d.find(q => q[0] === y)[1] != null ? w.reduce((t, q) => t + q[1], 0) / w.length : null]; });
      chart($('#co-c3'), {
        x: [1904, 2025], height: 220, xLabel: '연도', yLabel: '기온 (°C)', xFmt: v => `${Math.round(v)}년`, snap: x => Math.round(x), xFmtTick: v => String(v),
        yFmt: v => U.fmt(v, 2) + ' °C',
        series: [
          { name: '연평균', color: 'var(--phys)', width: 1.5, data: d },
          { name: '10년 이동 평균', color: 'var(--heat)', width: 3, data: ma },
        ],
      });
    }
    update();
  }

  function notesBalance() {
    return U.notesHead('이론 노트', '복사 평형 · 온실 효과 · 되먹임') +
      U.note('복사 평형', `
        <p>지구는 햇빛을 흡수하고 그만큼을 적외선으로 우주에 내보내 평균 온도가 일정하게 유지된다(복사 평형). 지구가 받는 햇빛은 단면적(πR²)으로 받고 표면 전체(4πR²)로 내보내므로 표면 1 m²당 평균은 태양 상수의 1/4이다.</p>
        <div class="formula">(1 − α) × S ÷ 4 = σ T⁴ &nbsp;&nbsp;(σ = 5.67 × 10⁻⁸ W/m²·K⁴)</div>
        <p>지금 지구(S = 1361 W/m², α = 0.30)에 대기가 없다면 약 255 K, 즉 −18 °C가 된다.</p>`) +
      U.note('온실 효과', `
        <p>대기 속 수증기, 이산화 탄소, 메테인 같은 <strong>온실 기체</strong>는 햇빛(가시광선)은 대부분 통과시키지만 지표가 내는 적외선은 흡수했다가 다시 사방으로 내보낸다. 이 중 지표로 돌아오는 복사 때문에 지표는 대기가 없을 때보다 따뜻하다.</p>
        <div class="formula">T지표 = T평형 × [2 ÷ (2 − ε)]^(1/4)</div>
        <p>이 1층 대기 모형에서 ε ≈ 0.78이면 지표 평균이 실제와 비슷한 약 15 °C가 된다. 온실 효과 자체는 생명에 꼭 필요하고, 문제는 온실 기체가 늘어 온실 효과가 <strong>강화</strong>되는 것이다.</p>`) +
      U.note('되먹임 (피드백)', `
        <ul><li><strong>얼음–반사율 되먹임</strong>: 기온이 오르면 눈과 얼음이 녹아 반사율이 줄고, 더 많은 햇빛을 흡수해 기온이 더 오른다 (양의 되먹임).</li>
        <li><strong>수증기 되먹임</strong>: 기온이 오르면 증발이 늘어 온실 기체인 수증기가 많아진다 (양의 되먹임).</li></ul>
        <p>반사율 그래프에서 α가 0.1만 커져도 지표 기온이 10 °C 가까이 내려가는 것을 확인해 보자.</p>`) +
      `<p class="src note full">모형: 대기를 햇빛은 모두 통과시키고 적외선만 비율 ε만큼 흡수하는 한 층으로 단순화한 복사 평형 모형. 대류, 구름, 위도별 차이는 고려하지 않았다. 태양 상수 1361 W/m²(SORCE/TSIS).</p>`;
  }
  function notesCO2() {
    return U.notesHead('이론 노트', '복사 강제력 · 기후 민감도 · 관측 자료') +
      U.note('복사 강제력과 기후 민감도', `
        <p>CO₂가 늘면 지구가 우주로 내보내는 에너지가 줄어 에너지 균형이 깨진다. 이 불균형을 <strong>복사 강제력</strong>이라 하며 CO₂ 농도의 로그에 비례한다.</p>
        <div class="formula">ΔF = 5.35 × ln(C ÷ 280) W/m² &nbsp;&nbsp;&nbsp; ΔT = λ × ΔF</div>
        <p>CO₂가 산업화 이전의 2배가 될 때 결국 오르는 기온을 <strong>평형 기후 민감도</strong>라 하며, IPCC 6차 보고서의 최적 추정값은 3 °C(가능성 높은 범위 2.5~4 °C)이다.</p>`) +
      U.note('관측과 모형의 차이', `
        <p>2024년 CO₂ 농도(약 425 ppm)로 계산한 평형 기온 변화는 약 1.8 °C인데, 지금까지 관측된 지구 평균 기온 상승은 약 1.1~1.3 °C이다. 바다가 열을 흡수해 기온이 평형에 이르기까지 수십 년이 걸리고, 대기 오염 물질(에어로졸)이 햇빛을 가리는 효과가 있기 때문이다. 메테인, 아산화 질소 같은 다른 온실 기체는 이 계산에 넣지 않았다.</p>`) +
      U.note('관측 자료 읽기', `
        <p><strong>마우나로아 CO₂</strong>: 1959년 약 316 ppm에서 2024년 약 425 ppm으로 늘었고, 증가 속도도 빨라지고 있다 (1960년대 연 약 0.9 ppm → 2010년대 연 약 2.4 ppm).</p>
        <p><strong>서울 기온</strong>: 1910년대 평균 약 10.7 °C에서 최근 10년 약 13.7 °C로 올랐다. 지구 평균보다 상승 폭이 큰 것은 도시화에 따른 열섬 효과가 더해졌기 때문이다.</p>`) +
      `<p class="src note full">자료: NOAA Global Monitoring Laboratory 마우나로아 연평균 CO₂, 복사 강제력 식(Myhre 외, 1998), 기후 민감도(IPCC AR6 WG1, 2021), 서울 기온(기상청 기상자료개방포털, 서울 108 관측소 일별 자료로 계산).</p>`;
  }
})();
