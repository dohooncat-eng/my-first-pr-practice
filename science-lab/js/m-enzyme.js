'use strict';
/* 효소와 활성화 에너지 */
(() => {
  const R = 8.314;
  const ENZ = {
    amylase: { name: '아밀레이스', where: '침, 이자액', sub: '녹말', prod: '엿당', pH: 7.0 },
    pepsin: { name: '펩신', where: '위액', sub: '단백질', prod: '펩타이드', pH: 2.0 },
    trypsin: { name: '트립신', where: '이자액 (작은창자에서 작용)', sub: '단백질', prod: '펩타이드', pH: 8.0 },
  };
  const fTraw = T => Math.exp(0.07 * (T - 37)) / (1 + Math.exp((T - 45) / 2.5));
  const fTmax = Math.max(...Array.from({ length: 701 }, (_, i) => fTraw(i / 10)));
  const fT = T => fTraw(T) / fTmax;
  const fpH = (pH, opt) => Math.exp(-(((pH - opt) / 1.5) ** 2));

  registerModule({
    id: 'enzyme', subject: 'life', title: '효소와 활성화 에너지', short: '효소',
    unit: '통합과학1 · 시스템과 상호작용',
    lead: '효소는 활성화 에너지를 낮춰 생명체 안의 화학 반응을 빠르게 하는 생체 촉매입니다. 에너지 그래프로 효소의 역할을 확인하고, 기질 농도·온도·pH에 따라 효소 반응이 어떻게 달라지는지 모형으로 관찰합니다.',
    desc: '활성화 에너지, 효소–기질 복합체, 기질 특이성, 온도와 pH에 따른 효소 활성',
    icon: '<path d="M3 7h7v3.5a2 2 0 0 0 4 0V7h7v11H3z"/><path d="M10.5 2.5h3v4h-3z"/>',
    mount(root, S) {
      tabs(root, [
        { id: 'energy', label: '활성화 에너지', mount: mountEnergy },
        { id: 'model', label: '효소 반응 모형', mount: mountModel },
      ], S);
    },
  });

  function profile(Ea, dH) {
    const ss = x => { const u = U.clamp((x - 0.2) / 0.6, 0, 1); return u * u * (3 - 2 * u); };
    let B = Ea - dH / 2;
    const E = x => dH * ss(x) + B * Math.exp(-(((x - 0.5) / 0.13) ** 2));
    const xs = Array.from({ length: 201 }, (_, i) => i / 200);
    for (let k = 0; k < 4; k++) { const pk = Math.max(...xs.map(E)); B += Ea - pk; }
    const pts = xs.map(x => [x, E(x)]);
    const top = pts.reduce((b, p) => p[1] > b[1] ? p : b);
    return { pts, top };
  }

  function mountEnergy(root, S) {
    void S;
    const p = { Ea: 75, Eac: 23, dH: -98 };
    root.innerHTML = `
      <div class="lab">
        <aside class="panel controls">
          <h2 class="ph">반응 조건</h2>
          <div class="chips" id="en-pre">
            <button type="button" class="chip" data-p="h2o2">과산화 수소 분해 (카탈레이스)</button>
            <button type="button" class="chip" data-p="endo">흡열 반응 예시</button>
          </div>
          ${Ctl.range('en-ea', '효소가 없을 때 활성화 에너지', { min: 20, max: 140, step: 1, value: p.Ea })}
          ${Ctl.range('en-eac', '효소가 있을 때 활성화 에너지', { min: 5, max: 140, step: 1, value: p.Eac })}
          ${Ctl.range('en-dh', '반응열 ΔH (생성물 − 반응물)', { min: -120, max: 60, step: 1, value: p.dH })}
          <p class="ctl-hint" id="en-hint"></p>
        </aside>
        <div class="stack">
          <div class="panel"><h3 class="ch">반응 경로에 따른 에너지</h3><div id="en-c"></div></div>
          <div class="meters">
            <div class="meter"><span class="lbl">낮아진 활성화 에너지</span><b id="en-d">—</b><span class="sub">kJ/mol</span></div>
            <div class="meter"><span class="lbl">반응 속도 (체온 37 °C)</span><b id="en-k">—</b><span class="sub">효소가 없을 때의 몇 배</span></div>
            <div class="meter"><span class="lbl">반응열</span><b id="en-h">—</b><span class="sub" id="en-hk"></span></div>
          </div>
        </div>
      </div>
      <section class="notes">${notesEnergy()}</section>`;
    const $ = s => root.querySelector(s);
    const rea = bindRange(root, 'en-ea', { unit: ' kJ/mol' }, v => { p.Ea = v; fix(); update(); });
    const rec = bindRange(root, 'en-eac', { unit: ' kJ/mol' }, v => { p.Eac = v; fix(); update(); });
    const rdh = bindRange(root, 'en-dh', { format: v => U.sign(v, 0) + ' kJ/mol' }, v => { p.dH = v; fix(); update(); });
    function fix() {
      const min = Math.max(0, p.dH) + 5;
      if (p.Ea < min) { p.Ea = min; rea.set(min, true); }
      if (p.Eac < min) { p.Eac = min; rec.set(min, true); }
      if (p.Eac > p.Ea) { p.Eac = p.Ea; rec.set(p.Ea, true); }
    }
    $('#en-pre').addEventListener('click', e => {
      const b = e.target.closest('[data-p]'); if (!b) return;
      const q = b.dataset.p === 'h2o2' ? { Ea: 75, Eac: 23, dH: -98 } : { Ea: 110, Eac: 70, dH: 40 };
      Object.assign(p, q); rea.set(q.Ea, true); rec.set(q.Eac, true); rdh.set(q.dH, true); update();
    });
    function update() {
      const a = profile(p.Ea, p.dH), b = profile(p.Eac, p.dH);
      const ratio = Math.exp((p.Ea - p.Eac) * 1000 / (R * 310.15));
      $('#en-d').textContent = U.fmt(p.Ea - p.Eac, 0);
      $('#en-k').textContent = ratio > 1e6 ? ratio.toExponential(1).replace('e+', ' × 10^') : U.fmt(ratio, ratio < 10 ? 1 : 0);
      $('#en-h').textContent = U.sign(p.dH, 0);
      $('#en-hk').textContent = p.dH < 0 ? '발열 반응 · 효소가 있어도 같다' : p.dH > 0 ? '흡열 반응 · 효소가 있어도 같다' : '효소가 있어도 같다';
      $('#en-hint').textContent = '카탈레이스는 간과 감자 등에 들어 있으며, 과산화 수소(2H₂O₂ → 2H₂O + O₂)의 활성화 에너지를 약 75에서 약 23 kJ/mol로 낮춘다.';
      const lo = Math.min(0, p.dH), hi = p.Ea;
      chart($('#en-c'), {
        x: [0, 1], y: [lo - 20, hi + 30], height: 300, xLabel: '반응 진행 →', yLabel: '에너지 (kJ/mol)', xTicks: [], hover: false,
        series: [
          { name: '효소가 없을 때', color: 'var(--muted)', width: 2.5, dash: '6 4', data: a.pts },
          { name: '효소가 있을 때', color: 'var(--acc)', width: 3, data: b.pts },
        ],
        hlines: [{ y: 0, label: '반응물' }, { y: p.dH, label: '생성물' }],
        points: [
          { x: a.top[0], y: a.top[1], color: 'var(--muted)', label: `활성화 에너지 ${p.Ea}`, dy: -10 },
          { x: b.top[0], y: b.top[1], color: 'var(--acc)', label: `효소가 있을 때 ${p.Eac}`, dy: -12, side: 'left' },
        ],
      });
    }
    update();
  }

  function mountModel(root, S) {
    const st = { enz: 'amylase', T: 37, pH: 7, nS: 30, nE: 4 };
    root.innerHTML = `
      <div class="lab">
        <aside class="panel controls">
          <h2 class="ph">조건</h2>
          ${Ctl.seg('ez-e', '효소', Object.entries(ENZ).map(([k, v]) => [k, v.name]), st.enz)}
          <p class="ctl-hint" id="ez-info"></p>
          ${Ctl.range('ez-t', '온도', { min: 0, max: 70, step: 1, value: st.T })}
          ${Ctl.range('ez-ph', 'pH', { min: 1, max: 12, step: 0.5, value: st.pH })}
          ${Ctl.range('ez-s', '기질 수', { min: 5, max: 60, step: 1, value: st.nS })}
          ${Ctl.range('ez-n', '효소 수', { min: 1, max: 8, step: 1, value: st.nE })}
          <div class="btn-row"><button class="btn ghost" id="ez-reset" type="button">${ICON.reset}<span>기질 다시 넣기</span></button></div>
        </aside>
        <div class="stack">
          <div class="panel stage-panel">
            <canvas class="stage" id="ez-cv" style="aspect-ratio: 16 / 9" aria-label="효소와 기질의 결합 모형"></canvas>
            <div class="stage-key right"><span><i style="background:var(--life)"></i>효소</span><span><i style="background:var(--earth)"></i>기질</span><span><i style="background:var(--phys)"></i>생성물</span></div>
          </div>
          <div class="meters">
            <div class="meter"><span class="lbl">효소 활성 (모형)</span><b id="ez-act">—</b><span class="sub" id="ez-why"></span></div>
            <div class="meter"><span class="lbl">반응 속도</span><b id="ez-rate">—</b><span class="sub">생성물 개수 / 초</span></div>
            <div class="meter"><span class="lbl">남은 기질</span><b id="ez-left">—</b><span class="sub" id="ez-made"></span></div>
          </div>
        </div>
      </div>
      <div class="charts three">
        <div class="panel"><h3 class="ch">기질 농도와 반응 속도</h3><div id="ez-c1"></div></div>
        <div class="panel"><h3 class="ch">온도와 효소 활성</h3><div id="ez-c2"></div></div>
        <div class="panel"><h3 class="ch">pH와 효소 활성</h3><div id="ez-c3"></div></div>
      </div>
      <section class="notes">${notesModel()}</section>`;
    const $ = s => root.querySelector(s);
    const stg = S.stage($('#ez-cv'), () => {});
    let E = [], Sub = [], Prod = [], made = 0, events = [];
    const rnd = () => Math.random();
    function reset() {
      Sub = Array.from({ length: st.nS }, () => ({ x: rnd(), y: rnd(), a: rnd() * 7 }));
      Prod = []; made = 0; events = [];
      E = Array.from({ length: st.nE }, (_, i) => ({ x: (i + 0.5) / st.nE, y: 0.3 + 0.4 * rnd(), a: rnd() * 7, busy: 0, rot: rnd() * 7 }));
    }
    bindSeg(root, 'ez-e', v => { st.enz = v; charts(); });
    bindRange(root, 'ez-t', { unit: ' °C' }, v => { st.T = v; charts(); });
    bindRange(root, 'ez-ph', { digits: 1 }, v => { st.pH = v; charts(); });
    bindRange(root, 'ez-s', { unit: '개' }, v => { st.nS = v; reset(); charts(); });
    bindRange(root, 'ez-n', { unit: '개' }, v => { st.nE = v; reset(); charts(); });
    $('#ez-reset').addEventListener('click', reset);
    const act = () => fT(st.T) * fpH(st.pH, ENZ[st.enz].pH);
    function charts() {
      const e = ENZ[st.enz], a = act();
      $('#ez-info').textContent = `${e.where}에서 ${e.sub}을(를) ${e.prod}(으)로 분해한다. 가장 활발한 pH 약 ${e.pH}`;
      $('#ez-act').textContent = Math.round(a * 100) + '%';
      $('#ez-why').textContent = st.T > 47 ? '높은 온도로 효소 단백질이 변성됨' : fpH(st.pH, e.pH) < 0.5 ? '알맞은 pH에서 벗어나 활성이 낮음' : st.T < 20 ? '온도가 낮아 분자 운동이 느림' : '최적 조건에 가까움';
      const Km = 15, Vmax = st.nE * 0.9 * a;
      chart($('#ez-c1'), {
        x: [0, 60], height: 200, xLabel: '기질 수', yLabel: '속도', cursor: st.nS, yInclude: [0, 1], xFmt: v => `기질 ${Math.round(v)}개`, yFmt: v => U.fmt(v, 2),
        series: [
          { name: '효소 있음', color: 'var(--acc)', width: 2.5, data: Array.from({ length: 61 }, (_, s) => [s, Vmax * s / (Km + s)]) },
          { name: '최대 속도', color: 'var(--muted)', dash: '4 4', width: 1.4, data: [[0, Vmax], [60, Vmax]] },
        ],
      });
      chart($('#ez-c2'), {
        x: [0, 70], y: [0, 105], height: 200, xLabel: '온도 (°C)', yLabel: '활성 (%)', cursor: st.T, xFmt: v => `${Math.round(v)} °C`, yFmt: v => Math.round(v) + '%',
        series: [{ name: '사람의 효소', color: 'var(--heat)', width: 2.5, data: Array.from({ length: 71 }, (_, t) => [t, fT(t) * 100]) }],
        vlines: [{ x: 37, label: '체온' }],
      });
      chart($('#ez-c3'), {
        x: [1, 12], y: [0, 105], height: 200, xLabel: 'pH', yLabel: '활성 (%)', cursor: st.pH, xFmt: v => `pH ${U.fmt(v, 1)}`, yFmt: v => Math.round(v) + '%',
        series: Object.entries(ENZ).map(([k, v], i) => ({ name: v.name, color: ['var(--life)', 'var(--bad)', 'var(--phys)'][i], width: k === st.enz ? 3 : 1.5, opacity: k === st.enz ? 1 : 0.5, data: Array.from({ length: 111 }, (_, j) => { const x = 1 + j / 10; return [x, fpH(x, v.pH) * 100]; }) })),
      });
    }
    S.loop((dt, now) => {
      const { ctx, W, H } = stg;
      if (!W) return;
      const a = act(), speed = 0.05 + 0.13 * Math.sqrt((st.T + 273) / 310);
      const aspect = W / H;
      for (const s of Sub) {
        s.a += (rnd() - 0.5) * 6 * dt; s.x += Math.cos(s.a) * speed * dt; s.y += Math.sin(s.a) * speed * dt * aspect;
        if (s.x < 0.02 || s.x > 0.98) { s.a = Math.PI - s.a; s.x = U.clamp(s.x, 0.02, 0.98); }
        if (s.y < 0.04 || s.y > 0.96) { s.a = -s.a; s.y = U.clamp(s.y, 0.04, 0.96); }
      }
      for (const p of Prod) { p.x += p.vx * dt; p.y += p.vy * dt * aspect; p.vx *= 0.995; p.vy *= 0.995; if (p.x < 0.02 || p.x > 0.98) p.vx *= -1; if (p.y < 0.04 || p.y > 0.96) p.vy *= -1; p.x = U.clamp(p.x, 0.02, 0.98); p.y = U.clamp(p.y, 0.04, 0.96); }
      if (Prod.length > 80) Prod.splice(0, Prod.length - 80);
      const er = Math.min(W, H) * 0.075, sr = er * 0.42;
      for (const e of E) {
        e.a += (rnd() - 0.5) * 2 * dt; e.x += Math.cos(e.a) * 0.03 * dt; e.y += Math.sin(e.a) * 0.03 * dt * aspect;
        e.x = U.clamp(e.x, 0.08, 0.92); e.y = U.clamp(e.y, 0.12, 0.88);
        if (e.busy > 0) {
          e.busy -= dt;
          if (e.busy <= 0) {
            made++; events.push(now);
            for (const sgn of [-1, 1]) Prod.push({ x: e.x + Math.cos(e.rot) * 0.03, y: e.y + Math.sin(e.rot) * 0.03, vx: Math.cos(e.rot + sgn * 0.7) * 0.08, vy: Math.sin(e.rot + sgn * 0.7) * 0.08 });
          }
          continue;
        }
        // 활성 부위 (효소 테두리의 홈) 가까이 온 기질과 결합
        const sx = e.x + Math.cos(e.rot) * er / W, sy = e.y + Math.sin(e.rot) * er / H;
        for (let i = 0; i < Sub.length; i++) {
          const s = Sub[i];
          if (Math.hypot((s.x - sx) * W, (s.y - sy) * H) < sr * 1.6 && rnd() < a) { Sub.splice(i, 1); e.busy = 0.5; break; }
        }
        e.rot += dt * 0.6;
      }
      while (events.length && events[0] < now - 3) events.shift();
      // 그리기
      const ink = Theme.v('--ink'), life = Theme.v('--life'), earth = Theme.v('--earth'), phys = Theme.v('--phys'), stage = Theme.v('--stage');
      ctx.clearRect(0, 0, W, H);
      const denat = U.clamp((st.T - 45) / 15, 0, 1);
      for (const e of E) {
        const x = e.x * W, y = e.y * H;
        ctx.save(); ctx.translate(x, y); ctx.rotate(e.rot);
        ctx.beginPath();
        const notch = 0.42 * (1 - denat);
        for (let i = 0; i <= 60; i++) {
          const t = i / 60 * Math.PI * 2;
          const wob = 1 + denat * 0.18 * Math.sin(t * 5 + e.x * 20);
          const dent = Math.abs(((t + Math.PI) % (Math.PI * 2)) - Math.PI) < notch ? 0.55 : 1;
          const rr = er * wob * (dent < 1 ? 1 - (1 - dent) * (1 - denat) : 1);
          i ? ctx.lineTo(Math.cos(t) * rr, Math.sin(t) * rr) : ctx.moveTo(Math.cos(t) * rr, Math.sin(t) * rr);
        }
        ctx.closePath(); ctx.fillStyle = U.rgba(life, 0.85); ctx.fill();
        if (e.busy > 0) { ctx.beginPath(); ctx.arc(er * 0.72, 0, sr, 0, 7); ctx.fillStyle = earth; ctx.fill(); ctx.strokeStyle = stage; ctx.lineWidth = 1.5; ctx.stroke(); }
        ctx.restore();
      }
      for (const s of Sub) { ctx.beginPath(); ctx.arc(s.x * W, s.y * H, sr, 0, 7); ctx.fillStyle = earth; ctx.fill(); }
      for (const p of Prod) { ctx.beginPath(); ctx.arc(p.x * W, p.y * H, sr * 0.7, 0, 7); ctx.fillStyle = phys; ctx.fill(); }
      Draw.text(ctx, denat > 0.3 ? '높은 온도로 효소의 입체 구조가 바뀌어 활성 부위가 망가짐' : '기질이 효소의 활성 부위(홈)에 맞으면 결합해 분해된다', 14, 22, { size: 12, weight: 600, color: ink });
      $('#ez-rate').textContent = U.fmt(events.length / 3, 1);
      $('#ez-left').textContent = `${Sub.length}개`;
      $('#ez-made').textContent = `분해된 기질 ${made}개`;
    });
    reset(); charts();
  }

  function notesEnergy() {
    return U.notesHead('이론 노트', '활성화 에너지 · 촉매로서의 효소') +
      U.note('활성화 에너지', `<p>반응물이 생성물로 바뀌려면 넘어야 하는 최소한의 에너지 언덕이 있는데, 이를 <strong>활성화 에너지</strong>라 한다. 활성화 에너지가 클수록 반응이 느리다. 반응 속도는 활성화 에너지가 줄어든 만큼 지수적으로 빨라진다.</p>
        <div class="formula">속도 비 = e^(ΔEa ÷ RT) &nbsp;&nbsp;(R = 8.314 J/mol·K)</div>`) +
      U.note('효소는 생체 촉매', `<ul><li>효소는 주로 <strong>단백질</strong>로 이루어진 생체 촉매로, 활성화 에너지를 낮춰 체온(약 37 °C)에서도 반응이 빠르게 일어나게 한다.</li>
        <li>효소는 <strong>반응열(ΔH)을 바꾸지 않는다</strong>. 반응물과 생성물의 에너지는 그대로이다.</li>
        <li>반응이 끝나도 효소는 변하지 않아 다시 쓰인다.</li></ul>`) +
      `<p class="src note full">에너지 곡선의 모양은 개념을 보여 주기 위한 그림이다. 과산화 수소 분해의 활성화 에너지(효소 없이 약 75, 카탈레이스 약 23 kJ/mol)와 반응열(약 −98 kJ/mol)은 교과서 및 일반 화학 자료의 대표값이다.</p>`;
  }
  function notesModel() {
    return U.notesHead('이론 노트', '효소–기질 복합체 · 기질 특이성 · 효소 활성에 영향을 주는 요인') +
      U.note('효소–기질 복합체와 기질 특이성', `<p>효소에는 기질이 결합하는 <strong>활성 부위</strong>가 있다. 기질이 활성 부위에 결합해 효소–기질 복합체를 만들고, 반응 뒤 생성물이 떨어져 나간다. 활성 부위의 입체 구조에 맞는 기질만 결합하므로 한 효소는 특정 기질하고만 반응한다(<strong>기질 특이성</strong>). 아밀레이스는 녹말만, 펩신과 트립신은 단백질만 분해한다.</p>`) +
      U.note('기질 농도', `<p>기질이 적을 때는 기질이 늘수록 반응 속도가 빨라지지만, 모든 효소가 기질과 결합해 쉴 틈이 없어지면 더 늘려도 속도가 일정해진다(최대 속도). 이때 속도를 높이려면 효소의 양을 늘려야 한다.</p>`) +
      U.note('온도와 pH', `<p>온도가 오르면 분자 운동이 활발해져 반응이 빨라지지만, 약 40 °C를 넘으면 단백질인 효소의 입체 구조가 바뀌어(<strong>변성</strong>) 활성 부위가 망가지고 활성이 급격히 떨어진다. 사람 효소의 최적 온도는 체온 부근이다.</p>
        <p>효소마다 가장 잘 작용하는 <strong>최적 pH</strong>가 있다. 위에서 일하는 펩신은 pH 2, 침의 아밀레이스는 pH 7, 작은창자에서 일하는 트립신은 pH 8 부근이다.</p>`) +
      U.note('생각해 보기', `
        ${U.qa('펩신이 작은창자에서 거의 작용하지 못하는 까닭은?', '작은창자는 이자액 때문에 약한 염기성(pH 약 8)이라 펩신의 최적 pH(약 2)와 크게 달라 활성이 낮기 때문이다.')}
        ${U.qa('기질을 계속 늘려도 반응 속도가 더 빨라지지 않는 까닭은?', '모든 효소의 활성 부위가 기질로 차 있어서(포화) 효소가 한 번에 처리할 수 있는 양이 정해져 있기 때문이다.')}`) +
      `<p class="src note full">이 모형의 온도·pH 곡선은 경향을 보여 주기 위한 모형값이며 실제 효소마다 다르다. 반응 속도는 최근 3초 동안 만들어진 생성물 수로 계산한다.</p>`;
  }
})();
