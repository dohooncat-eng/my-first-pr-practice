'use strict';
/* 산화·환원 — 금속과 금속 이온 수용액의 반응 */
(() => {
  const METALS = {
    Mg: { name: '마그네슘', ion: 'Mg²⁺', q: 2, E: -2.37, M: 24.305, color: '#c9ced2', ionColor: '#a0896b', dep: '회백색 마그네슘이' },
    Zn: { name: '아연', ion: 'Zn²⁺', q: 2, E: -0.76, M: 65.38, color: '#a8b2ba', ionColor: '#5f7f8f', dep: '회색 아연이' },
    Fe: { name: '철', ion: 'Fe²⁺', q: 2, E: -0.44, M: 55.845, color: '#727a81', ionColor: '#4f9a5c', dep: '검은색 철 가루가' },
    Cu: { name: '구리', ion: 'Cu²⁺', q: 2, E: 0.34, M: 63.546, color: '#c4723c', ionColor: '#2f78d0', dep: '붉은색 구리가' },
    Ag: { name: '은', ion: 'Ag⁺', q: 1, E: 0.80, M: 107.868, color: '#dfe3e7', ionColor: '#8d7fb0', dep: '은백색 은 결정이 나뭇가지 모양으로' },
  };
  const HYD = { name: '수소', ion: 'H⁺', q: 1, E: 0.0, ionColor: '#e0434b' };
  const SOLS = {
    Mg: { f: 'MgSO₄', name: '황산 마그네슘', an: 'SO₄²⁻', anq: 2 },
    Zn: { f: 'ZnSO₄', name: '황산 아연', an: 'SO₄²⁻', anq: 2 },
    Fe: { f: 'FeSO₄', name: '황산 철(Ⅱ)', an: 'SO₄²⁻', anq: 2, tint: [128, 182, 118], tintA: .38 },
    H: { f: 'HCl', name: '묽은 염산', an: 'Cl⁻', anq: 1 },
    Cu: { f: 'CuSO₄', name: '황산 구리(Ⅱ)', an: 'SO₄²⁻', anq: 2, tint: [38, 112, 210], tintA: .55 },
    Ag: { f: 'AgNO₃', name: '질산 은', an: 'NO₃⁻', anq: 1 },
  };
  const METAL_ORDER = ['Mg', 'Zn', 'Fe', 'Cu', 'Ag'];
  const SOL_ORDER = ['Mg', 'Zn', 'Fe', 'H', 'Cu', 'Ag'];
  const N0 = 10;        // 확대 모형의 처음 양이온 수 (= 10 mmol)
  const MOL0 = 0.010;   // 0.20 M 용액 50 mL 속 양이온 (mol)
  const cation = s => s === 'H' ? HYD : METALS[s];
  const josa = (w, a, b) => { const c = w.charCodeAt(w.length - 1); return w + ((c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28) ? a : b); };
  const co = n => n === 1 ? '' : String(n);

  function rx(metal, sol) {
    const M = METALS[metal], C = cation(sol), S = SOLS[sol];
    const same = metal === sol;
    const ok = !same && C.E > M.E;
    const L = U.lcm(M.q, C.q), a = L / M.q, b = L / C.q, gas = sol === 'H';
    const product = gas ? `${co(b / 2)}H₂` : `${co(b)}${sol}`;
    return {
      metal, sol, M, C, S, same, ok, L, a, b, gas,
      eq: `${co(a)}${metal} + ${co(b)}${C.ion} → ${co(a)}${M.ion} + ${product}`,
      ox: `${metal} → ${M.ion} + ${M.q}e⁻`,
      red: gas ? '2H⁺ + 2e⁻ → H₂' : `${C.ion} + ${C.q}e⁻ → ${sol}`,
      ratio: C.q / M.q, // 환원되는 양이온 1개당 생기는 금속 이온 수
    };
  }
  function massChange(r, p) {
    const gained = r.gas ? 0 : MOL0 * p * r.C.M;
    const lost = MOL0 * p * r.ratio * r.M.M;
    return gained - lost;
  }

  registerModule({
    id: 'redox', subject: 'chem', title: '산화·환원 반응', short: '산화·환원',
    unit: '통합과학2 · 변화와 다양성',
    lead: '금속판을 여러 금속 이온 수용액에 넣고 전자가 어느 쪽으로 이동하는지 관찰합니다. 반응성이 큰 금속은 전자를 잃고 산화되며, 용액 속 이온은 전자를 얻어 환원됩니다.',
    desc: '금속의 반응성, 전자 이동 모형, 금속판 질량과 이온 수 변화, 생활 속 산화 환원',
    icon: '<circle cx="6.5" cy="12" r="3.5"/><circle cx="17.5" cy="12" r="3.5"/><path d="M9.5 8.6c1.6-1.6 3.4-1.6 5 0"/><path d="m13.6 7.2 1 1.6-1.8.4"/>',
    mount(root, S) {
      const sel = { metal: 'Zn', sol: 'Cu' };
      tabs(root, [
        { id: 'lab', label: '금속과 이온 수용액', mount: (el, sc) => mountLab(el, sc, sel) },
        { id: 'table', label: '반응성 비교표', mount: (el, sc, open) => mountTable(el, sel, open) },
        { id: 'life', label: '생활 속 산화 환원', mount: el => mountLife(el) },
      ], S);
    },
  });

  function mountLab(root, S, sel) {
    const st = { p: 0, playing: false };
    root.innerHTML = `
      <div class="lab">
        <aside class="panel controls" aria-label="실험 조건">
          <h2 class="ph">실험 조건</h2>
          ${Ctl.seg('rx-m', '금속판', METAL_ORDER.map(k => [k, `${k} ${METALS[k].name}`]), sel.metal)}
          ${Ctl.seg('rx-s', '수용액 (0.20 M, 50 mL)', SOL_ORDER.map(k => [k, SOLS[k].f]), sel.sol)}
          <p class="ctl-hint" id="rx-sname"></p>
          <hr>
          ${Ctl.range('rx-p', '반응 진행 정도', { min: 0, max: 100, step: 1, value: 0 })}
          <div class="btn-row">
            <button class="btn primary" id="rx-play" type="button">${ICON.play}<span>반응시키기</span></button>
            <button class="btn ghost" id="rx-reset" type="button">${ICON.reset}<span>처음으로</span></button>
          </div>
        </aside>
        <div class="stack">
          <div class="panel stage-panel">
            <canvas class="stage" id="rx-cv" aria-label="금속판과 수용액, 전자 이동 확대 모형"></canvas>
            <div class="stage-key right" id="rx-key"></div>
            <div class="stage-note">입자 1개 = 1 mmol</div>
          </div>
          <div id="rx-result"></div>
          <div class="readouts" id="rx-ro"></div>
        </div>
      </div>
      <div class="panel eqs" id="rx-eqs"></div>
      <div class="charts">
        <div class="panel"><h3 class="ch">수용액 속 이온의 양</h3><div id="rx-c1"></div></div>
        <div class="panel"><h3 class="ch">금속판의 질량 변화</h3><p class="ch-sub">금속판을 충분히 넣었을 때, 0.20 M 용액 50 mL 기준</p><div id="rx-c2"></div></div>
      </div>
      <section class="notes">${notesLab()}</section>`;
    const $ = s => root.querySelector(s);
    const stg = S.stage($('#rx-cv'), () => draw());
    let r = rx(sel.metal, sel.sol);
    const ions = { orig: [], fresh: [], an: [] };
    const fx = { flashes: [], electrons: [], bubbles: [], h2: [] };
    let eTimer = 0, bubTimer = 0;

    const pr = bindRange(root, 'rx-p', { unit: '%' }, v => { setPlaying(false); setP(v / 100); });
    bindSeg(root, 'rx-m', v => { sel.metal = v; reset(); });
    bindSeg(root, 'rx-s', v => { sel.sol = v; reset(); });
    const playBtn = $('#rx-play');
    function setPlaying(p) {
      st.playing = p && r.ok;
      playBtn.innerHTML = st.playing ? `${ICON.pause}<span>멈춤</span>` : `${ICON.play}<span>반응시키기</span>`;
    }
    playBtn.addEventListener('click', () => { if (st.p > 0.995) setP(0); setPlaying(!st.playing); });
    $('#rx-reset').addEventListener('click', () => { setPlaying(false); setP(0); });

    function reset() {
      r = rx(sel.metal, sel.sol);
      setPlaying(false);
      ions.orig.length = ions.fresh.length = ions.an.length = 0;
      fx.flashes.length = fx.electrons.length = fx.bubbles.length = fx.h2.length = 0;
      st.p = 0; pr.set(0, true);
      reconcile(false);
      info(); drawCharts();
      const sp = r.S;
      $('#rx-sname').textContent = `${sp.name} 수용액: ${r.C.ion}과 ${sp.an} 이온이 들어 있다.`;
      $('#rx-key').innerHTML = [
        [r.C.ionColor, r.C.ion], [r.M.ionColor, r.M.ion], ['var(--ion-an)', sp.an], [r.M.color, `${r.metal} 원자`], ['var(--chem)', 'e⁻ 전자'],
      ].map(([c, t]) => `<span><i style="background:${c}"></i>${t}</span>`).join('');
    }
    function setP(p) {
      if (!r.ok) p = 0;
      const prev = st.p;
      st.p = U.clamp(p, 0, 1);
      pr.set(Math.round(st.p * 100), true);
      reconcile(st.p > prev);
      info();
      drawCharts();
    }
    function counts() {
      const p = r.ok ? st.p : 0;
      return {
        orig: Math.round(N0 * (1 - p)),
        fresh: Math.round(N0 * p * r.ratio),
        an: Math.round(N0 * r.C.q / r.S.anq),
        reduced: Math.round(N0 * p),
      };
    }
    // 이온 위치는 확대 원 기준 좌표 (u, v): 원 중심 0, 반지름 1. 금속 표면은 u = −0.36
    const U_MIN = 0.02, R_MAX = 0.86;
    function randIon() {
      for (let i = 0; i < 60; i++) {
        const u = U_MIN + Math.random() * (R_MAX - U_MIN), v = (Math.random() * 2 - 1) * R_MAX;
        if (u * u + v * v < R_MAX * R_MAX) return { u, v, vu: 0, vv: 0 };
      }
      return { u: 0.5, v: 0, vu: 0, vv: 0 };
    }
    function reconcile(animate) {
      const c = counts();
      while (ions.orig.length > c.orig) {
        // 표면에 가장 가까운 이온이 전자를 받아 환원된다
        let k = 0;
        ions.orig.forEach((q, i) => { if (q.u < ions.orig[k].u) k = i; });
        const q = ions.orig.splice(k, 1)[0];
        if (animate) {
          fx.flashes.push({ u: q.u, v: q.v, t: 0 });
          if (r.gas) fx.h2.push({ u: U_MIN + 0.05, v: q.v, t: 0 });
        }
      }
      while (ions.orig.length < c.orig) ions.orig.push(randIon());
      while (ions.fresh.length > c.fresh) ions.fresh.pop();
      while (ions.fresh.length < c.fresh) ions.fresh.push(animate ? { u: U_MIN, v: (Math.random() - 0.5) * 0.5, vu: 0.25, vv: 0 } : randIon());
      while (ions.an.length < c.an) ions.an.push(randIon());
      while (ions.an.length > c.an) ions.an.pop();
    }

    function info() {
      const c = counts(), M = r.M, C = r.C;
      const res = $('#rx-result');
      if (r.same) {
        res.innerHTML = `<div class="callout"><span class="badge">변화 없음</span><span>같은 금속과 그 이온 사이에서는 전자를 주고받아도 알짜 변화가 없다.</span></div>`;
      } else if (!r.ok) {
        res.innerHTML = `<div class="callout bad"><span class="badge bad">반응하지 않음</span><span>${josa(M.name, '은', '는')} ${C.name}보다 반응성이 작아 ${C.ion}에게 전자를 줄 수 없다. 금속판과 용액 모두 그대로다.</span></div>`;
      } else {
        const obs = [];
        obs.push(r.gas ? `${M.name}판 표면에서 수소 기체 거품이 생긴다.` : `${M.name}판 표면에 ${r.sol === 'Ag' ? METALS.Ag.dep : METALS[r.sol].dep} 붙는다.`);
        if (r.sol === 'Cu') obs.push('Cu²⁺가 줄어들어 용액의 푸른색이 점점 옅어진다.');
        if (r.metal === 'Cu') obs.push('Cu²⁺가 생겨 무색 용액이 점점 푸른색으로 변한다.');
        if (r.sol === 'Fe') obs.push('Fe²⁺가 줄어 연한 초록빛이 옅어진다.');
        if (r.metal === 'Fe') obs.push('Fe²⁺가 생겨 용액이 연한 초록빛을 띤다.');
        obs.push(r.ratio < 1 ? `${C.ion} ${1 / r.ratio}개가 ${M.ion} 1개로 바뀌므로 양이온 수가 줄어든다.` : `${C.ion} 1개가 ${M.ion} 1개로 바뀌므로 양이온 수는 일정하다.`);
        const dm = massChange(r, 1);
        obs.push(`금속판 질량은 ${dm >= 0 ? '늘어난다' : '줄어든다'} (모두 반응하면 ${U.sign(dm, 3)} g).`);
        res.innerHTML = `<div class="callout"><span class="badge good">반응함</span><span>${josa(M.name, '이', '가')} ${C.name}보다 반응성이 커서 전자를 잃고 <b>${M.ion}로 산화</b>되고, ${C.ion}는 전자를 얻어 <b>${r.gas ? 'H₂' : r.sol}로 환원</b>된다.</span></div>
          <div class="panel" style="margin-top:10px"><h3 class="ch">관찰 결과</h3><ul style="margin:4px 0 0;padding-left:20px;color:var(--ink-2);font-size:14.5px">${obs.map(o => `<li>${o}</li>`).join('')}</ul></div>`;
      }
      const moved = r.ok ? MOL0 * st.p * 1e3 * C.q : 0;
      $('#rx-ro').innerHTML = [
        [`남은 ${C.ion}`, U.fmt(r.ok ? 10 * (1 - st.p) : 10, 2) + ' mmol'],
        [`생긴 ${M.ion}`, U.fmt(r.ok ? 10 * st.p * r.ratio : 0, 2) + ' mmol'],
        ['이동한 전자', U.fmt(moved, 2) + ' mmol'],
        ['금속판 질량 변화', U.sign(r.ok ? massChange(r, st.p) : 0, 3) + ' g'],
        ['표준 환원 전위', `${M.ion}/${r.metal} ${U.fmt(M.E, 2)} V`],
        ['', `${C.ion}/${r.gas ? 'H₂' : r.sol} ${U.sign(C.E, 2)} V`],
      ].map(([a, b]) => `<div class="ro"><span>${a || '&nbsp;'}</span><b>${b}</b></div>`).join('');
      $('#rx-eqs').innerHTML = r.same ? `<div class="eq-row"><span>반응식</span><div class="eq">알짜 반응 없음</div></div>` : !r.ok
        ? `<div class="eq-row"><span>반응식</span><div class="eq">${r.metal} + ${C.ion} → 반응하지 않음</div></div>`
        : `<div class="eq-row"><span>전체 반응식</span><div class="eq">${r.eq}</div></div>
           <div class="eq-row"><span>산화 (전자를 잃음)</span><div class="eq"><span class="ox">${r.ox}</span></div></div>
           <div class="eq-row"><span>환원 (전자를 얻음)</span><div class="eq"><span class="red">${r.red}</span></div></div>
           <div class="eq-row"><span>구경꾼 이온</span><div class="eq">${r.S.an} <span style="color:var(--muted);font-size:13px">— 반응하지 않고 용액에 그대로 남는다</span></div></div>`;
    }

    function drawCharts() {
      const xs = Array.from({ length: 101 }, (_, i) => i / 100);
      const mk = f => xs.map(p => [p * 100, r.ok ? f(p) : f(0)]);
      chart($('#rx-c1'), {
        x: [0, 100], height: 230, xLabel: '반응 진행 정도 (%)', yLabel: '양 (mmol)', cursor: st.p * 100, yInclude: [0],
        xFmt: v => `진행 ${Math.round(v)}%`, yFmt: v => U.fmt(v, 2) + ' mmol',
        series: [
          { name: r.C.ion, color: r.C.ionColor, data: mk(p => 10 * (1 - p)) },
          { name: r.M.ion, color: r.M.ionColor, data: mk(p => 10 * p * r.ratio) },
          { name: r.S.an, color: 'var(--ion-an)', dash: '6 4', data: mk(() => 10 * r.C.q / r.S.anq) },
          { name: '전체 양이온', color: 'var(--muted)', dash: '2 4', width: 1.6, data: mk(p => 10 * (1 - p) + 10 * p * r.ratio) },
        ],
      });
      chart($('#rx-c2'), {
        x: [0, 100], height: 200, xLabel: '반응 진행 정도 (%)', yLabel: '질량 변화 (g)', cursor: st.p * 100, yInclude: [0, 0.05, -0.05],
        xFmt: v => `진행 ${Math.round(v)}%`, yFmt: v => U.sign(v, 3) + ' g',
        series: [{ name: `${r.M.name}판 질량 변화`, color: 'var(--acc)', width: 2.5, area: true, base: 0, data: mk(p => massChange(r, p)) }],
        hlines: [{ y: 0, label: '처음 질량' }],
      });
    }

    /* ----- 그리기 ----- */
    const rnd = U.rng(7);
    const SPOTS = Array.from({ length: 160 }, () => ({ u: rnd(), v: rnd(), s: 0.5 + rnd(), a: rnd() * Math.PI * 2, b: rnd() }));
    function geom() {
      const { W, H } = stg;
      const narrow = W < 560;
      const bL = W * 0.05, bW = W * (narrow ? 0.42 : 0.36), bBot = H - 14, bH = H * 0.64, bTop = bBot - bH;
      const level = bBot - bH * 0.74;
      const pw = bW * 0.2, px = bL + bW * 0.5 - pw / 2, pTop = H * 0.07, pBot = bBot - 16;
      const R = Math.min(W * (narrow ? 0.25 : 0.24), H * 0.43), zx = W - R - (narrow ? 10 : W * 0.07), zy = H * 0.52;
      return { W, H, bL, bW, bBot, bH, bTop, level, pw, px, pTop, pBot, R, zx, zy };
    }
    function draw() {
      const { ctx, W, H } = stg;
      if (!W) return;
      const g = geom();
      const ink = Theme.v('--ink'), muted = Theme.v('--muted'), glass = Theme.v('--glass'), water = Theme.v('--water'), panel = Theme.v('--panel');
      ctx.clearRect(0, 0, W, H);
      const p = r.ok ? st.p : 0;
      // 용액 색
      const layers = [];
      if (SOLS[r.sol].tint) layers.push([SOLS[r.sol].tint, SOLS[r.sol].tintA * (1 - p)]);
      if (SOLS[r.metal] && SOLS[r.metal].tint && p > 0) layers.push([SOLS[r.metal].tint, SOLS[r.metal].tintA * p * r.ratio]);
      let tint = null;
      const wsum = layers.reduce((t, l) => t + l[1], 0);
      if (wsum > 0.002) {
        const rgb = [0, 1, 2].map(i => Math.round(layers.reduce((t, l) => t + l[0][i] * l[1], 0) / wsum));
        const alpha = 1 - layers.reduce((t, l) => t * (1 - l[1]), 1);
        tint = `rgba(${rgb.join(',')},${alpha})`;
      }
      ctx.save();
      ctx.beginPath(); ctx.roundRect(g.bL + 3, g.level, g.bW - 6, g.bBot - 3 - g.level, [0, 0, 9, 9]); ctx.clip();
      ctx.fillStyle = U.rgba(water, 0.28); ctx.fillRect(g.bL, g.level, g.bW, g.bBot - g.level);
      if (tint) { ctx.fillStyle = tint; ctx.fillRect(g.bL, g.level, g.bW, g.bBot - g.level); }
      ctx.restore();
      // 금속판
      ctx.fillStyle = U.rgba(ink, 0.55); ctx.fillRect(g.px - 6, g.pTop - 6, g.pw + 12, 10);
      const grad = ctx.createLinearGradient(g.px, 0, g.px + g.pw, 0);
      grad.addColorStop(0, U.mix(r.M.color, '#000000', 0.18)); grad.addColorStop(0.45, U.mix(r.M.color, '#ffffff', 0.25)); grad.addColorStop(1, U.mix(r.M.color, '#000000', 0.25));
      ctx.fillStyle = grad; ctx.fillRect(g.px, g.pTop, g.pw, g.pBot - g.pTop);
      // 석출물
      if (p > 0 && !r.gas) {
        const dcol = METALS[r.sol].color, n = Math.floor(SPOTS.length * Math.min(1, p * 1.3));
        ctx.save(); ctx.beginPath(); ctx.rect(g.px - 30, g.level + 2, g.pw + 60, g.pBot - g.level); ctx.clip();
        for (let i = 0; i < n; i++) {
          const s = SPOTS[i], x = g.px + s.u * g.pw, y = g.level + 4 + s.v * (g.pBot - g.level - 6);
          if (r.sol === 'Ag') {
            const len = (6 + s.s * 10) * p, side = s.u < 0.5 ? -1 : 1, x0 = side < 0 ? g.px : g.px + g.pw;
            const ang = (side < 0 ? Math.PI : 0) + (s.b - 0.5) * 1.6;
            ctx.strokeStyle = U.mix(dcol, ink, 0.25); ctx.lineWidth = 1.3;
            ctx.beginPath(); ctx.moveTo(x0, y); const ex = x0 + Math.cos(ang) * len, ey = y + Math.sin(ang) * len; ctx.lineTo(ex, ey);
            ctx.moveTo(x0 + Math.cos(ang) * len * 0.5, y + Math.sin(ang) * len * 0.5); ctx.lineTo(x0 + Math.cos(ang + 0.7) * len * 0.85, y + Math.sin(ang + 0.7) * len * 0.85);
            ctx.stroke();
            ctx.fillStyle = U.mix(dcol, '#ffffff', 0.3); ctx.beginPath(); ctx.arc(x, y, 1.4 * s.s, 0, 7); ctx.fill();
          } else {
            ctx.fillStyle = U.mix(dcol, '#000000', s.b * 0.35);
            ctx.beginPath(); ctx.arc(x, y, (1.4 + s.s * 1.8) * Math.min(1, 0.4 + p), 0, 7); ctx.fill();
          }
        }
        ctx.restore();
      }
      // 거품
      for (const b of fx.bubbles) {
        ctx.strokeStyle = U.rgba(ink, 0.5); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.stroke();
      }
      // 비커
      ctx.strokeStyle = glass; ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(g.bL - 6, g.bTop); ctx.lineTo(g.bL, g.bTop + 6); ctx.lineTo(g.bL, g.bBot - 10);
      ctx.quadraticCurveTo(g.bL, g.bBot, g.bL + 10, g.bBot); ctx.lineTo(g.bL + g.bW - 10, g.bBot);
      ctx.quadraticCurveTo(g.bL + g.bW, g.bBot, g.bL + g.bW, g.bBot - 10); ctx.lineTo(g.bL + g.bW, g.bTop);
      ctx.stroke();
      ctx.strokeStyle = U.rgba(glass, 0.8); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(g.bL + 3, g.level); ctx.lineTo(g.bL + g.bW - 3, g.level); ctx.stroke();
      if (W >= 560) {
        Draw.text(ctx, `${r.metal}판`, g.px + g.pw + 10, g.pTop + 18, { size: 12, weight: 600 });
        Draw.text(ctx, `${r.S.f}(aq)`, g.bL + g.bW - 8, g.bBot - 12, { size: 12, weight: 600, align: 'right', color: muted });
      }

      // 확대 원
      const fxp = g.px + g.pw, fyp = (g.level + g.pBot) / 2;
      ctx.strokeStyle = U.rgba(ink, 0.25); ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(fxp, fyp - 6); ctx.lineTo(g.zx - g.R * 0.7, g.zy - g.R * 0.71); ctx.moveTo(fxp, fyp + 6); ctx.lineTo(g.zx - g.R * 0.7, g.zy + g.R * 0.71); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(fxp, fyp, 6, 0, 7); ctx.strokeStyle = U.rgba(ink, 0.45); ctx.stroke();
      ctx.save();
      ctx.beginPath(); ctx.arc(g.zx, g.zy, g.R, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = panel; ctx.fillRect(g.zx - g.R, g.zy - g.R, 2 * g.R, 2 * g.R);
      ctx.fillStyle = U.rgba(water, 0.22); ctx.fillRect(g.zx - g.R, g.zy - g.R, 2 * g.R, 2 * g.R);
      if (tint) { ctx.fillStyle = tint; ctx.globalAlpha = 0.5; ctx.fillRect(g.zx - g.R, g.zy - g.R, 2 * g.R, 2 * g.R); ctx.globalAlpha = 1; }
      const ra = g.R * 0.085, surf = g.zx - g.R * 0.36, gap = ra * 2.08;
      ctx.fillStyle = U.rgba(r.M.color, 0.35); ctx.fillRect(g.zx - g.R, g.zy - g.R, surf - (g.zx - g.R) + ra, 2 * g.R);
      const c = counts();
      // 녹아 나간 원자는 앞줄 가운데부터 비운다
      const rows = [];
      for (let k = -5; k <= 5; k++) rows.push(k);
      rows.sort((a, b) => Math.abs(a) - Math.abs(b));
      const gone = new Set();
      let left = c.fresh;
      for (let col = 0; col < 2 && left > 0; col++) for (const k of rows) { if (left <= 0) break; if (Math.abs(k) <= 3) { gone.add(col + ':' + k); left--; } }
      for (let col = 0; col < 6; col++) for (const k of rows) {
        if (gone.has(col + ':' + k)) continue;
        const x = surf - col * gap, y = g.zy + k * gap;
        Draw.ion(ctx, x, y, ra, r.M.color, r.metal, '#1d2a30');
      }
      // 석출된 원자
      if (!r.gas) {
        for (let i = 0; i < c.reduced; i++) {
          const layer = Math.floor(i / 7), k = rows[i % 7];
          const x = surf + gap + layer * gap, y = g.zy + k * gap;
          Draw.ion(ctx, x, y, ra, METALS[r.sol].color, r.sol, '#1d2a30');
        }
      }
      // 용액 속 이온
      const map = q => [g.zx + q.u * g.R, g.zy + q.v * g.R];
      for (const q of ions.an) { const [x, y] = map(q); Draw.pill(ctx, x, y, ra * 1.5, Theme.v('--ion-an'), r.S.an); }
      for (const q of ions.orig) { const [x, y] = map(q); Draw.ion(ctx, x, y, ra, r.C.ionColor, r.C.ion); }
      for (const q of ions.fresh) { const [x, y] = map(q); Draw.ion(ctx, x, y, ra, r.M.ionColor, r.M.ion); }
      for (const h of fx.h2) {
        const [x, y] = map(h);
        ctx.globalAlpha = Math.max(0, 1 - h.t / 2);
        Draw.pill(ctx, x, y - h.t * 30, ra * 1.4, HYD.ionColor, 'H₂');
        ctx.globalAlpha = 1;
      }
      for (const f of fx.flashes) {
        const [x, y] = map(f);
        ctx.strokeStyle = U.rgba(Theme.v('--chem'), Math.max(0, 0.8 - f.t)); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, ra * (1 + f.t * 2), 0, 7); ctx.stroke();
      }
      for (const e of fx.electrons) {
        const x = U.lerp(surf + ra, e.tx, e.t), y = U.lerp(e.sy, e.ty, e.t);
        Draw.ion(ctx, x, y, Math.max(5, ra * 0.5), Theme.v('--chem'), 'e⁻');
      }
      ctx.restore();
      ctx.beginPath(); ctx.arc(g.zx, g.zy, g.R, 0, Math.PI * 2);
      ctx.strokeStyle = U.rgba(ink, 0.55); ctx.lineWidth = 2.5; ctx.stroke();
      Draw.text(ctx, '금속 표면 확대', g.zx, Math.min(H - 6, g.zy + g.R + 16), { size: 11.5, weight: 600, color: muted, align: 'center' });
    }

    S.loop(dt => {
      if (st.playing) {
        const np = st.p + (1 - st.p) * dt / 5 + dt * 0.004;
        if (np >= 0.999) { setP(1); setPlaying(false); } else setP(np);
        eTimer += dt;
        if (eTimer > 0.35 && ions.orig.length && stg.W) {
          eTimer = 0;
          const g = geom(), q = ions.orig[Math.floor(Math.random() * ions.orig.length)];
          fx.electrons.push({ t: 0, sy: g.zy + (Math.random() - 0.5) * g.R * 0.6, tx: g.zx + q.u * g.R, ty: g.zy + q.v * g.R });
        }
        if (r.gas && stg.W) {
          bubTimer += dt;
          if (bubTimer > 0.06) {
            bubTimer = 0;
            const g = geom();
            fx.bubbles.push({ x: g.px + (Math.random() < 0.5 ? -2 : g.pw + 2) + (Math.random() - 0.5) * 4, y: g.pBot - Math.random() * (g.pBot - g.level - 10), r: 1.5 + Math.random() * 2.5, vy: 30 + Math.random() * 30 });
          }
        }
      }
      for (const arr of [ions.orig, ions.fresh, ions.an]) for (const q of arr) {
        q.vu += (Math.random() - 0.5) * 0.8 * dt; q.vv += (Math.random() - 0.5) * 0.8 * dt;
        q.vu *= 0.98; q.vv *= 0.98;
        q.u += q.vu * dt; q.v += q.vv * dt;
        if (q.u < U_MIN) { q.u = U_MIN; q.vu = Math.abs(q.vu); }
        const d = Math.hypot(q.u, q.v);
        if (d > R_MAX) { q.u *= R_MAX / d; q.v *= R_MAX / d; const dot = (q.vu * q.u + q.vv * q.v) / R_MAX; if (dot > 0) { q.vu -= 2 * dot * q.u / R_MAX; q.vv -= 2 * dot * q.v / R_MAX; } }
      }
      for (let i = fx.flashes.length - 1; i >= 0; i--) if ((fx.flashes[i].t += dt * 1.5) > 0.8) fx.flashes.splice(i, 1);
      for (let i = fx.electrons.length - 1; i >= 0; i--) if ((fx.electrons[i].t += dt * 1.8) > 1) fx.electrons.splice(i, 1);
      for (let i = fx.h2.length - 1; i >= 0; i--) if ((fx.h2[i].t += dt) > 2) fx.h2.splice(i, 1);
      if (stg.W) {
        const g = geom();
        for (let i = fx.bubbles.length - 1; i >= 0; i--) { const b = fx.bubbles[i]; b.y -= b.vy * dt; if (b.y < g.level) fx.bubbles.splice(i, 1); }
      }
      draw();
    });
    reset();
  }

  function mountTable(root, sel, open) {
    root.innerHTML = `
      <div class="panel">
        <h3 class="ch">금속판 × 수용액: 반응이 일어나는 조합</h3>
        <p class="ch-sub">칸을 누르면 그 조합으로 실험할 수 있다. 반응성이 큰 금속이 반응성이 작은 금속의 이온에게 전자를 준다.</p>
        <div class="tbl"><table class="data" id="rx-tbl"><thead><tr><th>금속판 ＼ 수용액</th>${SOL_ORDER.map(s => `<th>${SOLS[s].f}<br><span style="font-weight:400;color:var(--muted)">${cation(s).ion}</span></th>`).join('')}</tr></thead>
        <tbody>${METAL_ORDER.map(m => `<tr><th>${m} ${METALS[m].name}</th>${SOL_ORDER.map(s => {
          const r = rx(m, s);
          const label = r.same ? '<span class="badge">같은 금속</span>' : r.ok ? `<span class="badge good">반응</span>` : '<span class="badge">—</span>';
          return `<td><button type="button" class="chip" data-m="${m}" data-s="${s}" style="border:0;background:none;padding:0" aria-label="${m}판과 ${SOLS[s].f}">${label}</button></td>`;
        }).join('')}</tr>`).join('')}</tbody></table></div>
      </div>
      <div class="panel">
        <h3 class="ch">금속의 반응성 순서</h3>
        <p class="ch-sub">왼쪽일수록 전자를 잃기 쉽다 (산화되기 쉽다). 숫자는 25 °C 표준 환원 전위 E°(V)이다.</p>
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:stretch;margin-top:10px">
          ${[['Mg', -2.37], ['Zn', -0.76], ['Fe', -0.44], ['H', 0], ['Cu', 0.34], ['Ag', 0.80]].map(([k, e], i, a) => `
            <div class="ro" style="flex:1 1 90px;text-align:center"><b style="font-size:20px">${k === 'H' ? '(H)' : k}</b><span>${k === 'H' ? '수소' : METALS[k].name}</span><span style="font-family:var(--font-data)">${U.sign(e, 2)} V</span></div>${i < a.length - 1 ? '<div style="align-self:center;color:var(--muted);font-weight:700">&gt;</div>' : ''}`).join('')}
        </div>
        <p class="ctl-hint" style="margin-top:10px">수소(H)보다 반응성이 큰 금속(Mg, Zn, Fe)은 묽은 염산과 반응해 수소 기체를 내지만, 구리와 은은 반응하지 않는다.</p>
      </div>`;
    root.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => { sel.metal = b.dataset.m; sel.sol = b.dataset.s; open('lab'); }));
  }

  function mountLife(root) {
    const cards = [
      ['광합성', '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂', '물(H₂O)이 수소를 잃고 산소(O₂)가 된다', '이산화 탄소(CO₂)가 산소를 잃고 포도당이 된다', '빛에너지를 화학 에너지로 저장한다.'],
      ['세포 호흡', 'C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O', '포도당이 산소를 얻어 CO₂가 된다', '산소(O₂)가 수소를 얻어 물이 된다', '광합성의 반대 방향으로, 생명 활동에 쓸 에너지를 얻는다.'],
      ['메테인의 연소', 'CH₄ + 2O₂ → CO₂ + 2H₂O', '메테인(CH₄)이 산소를 얻는다', '산소(O₂)가 환원된다', '가스레인지 불꽃. 연소는 빠른 산화 반응이다.'],
      ['철의 제련', 'Fe₂O₃ + 3CO → 2Fe + 3CO₂', '일산화 탄소(CO)가 산소를 얻어 CO₂가 된다', '산화 철(Fe₂O₃)이 산소를 잃고 철(Fe)이 된다', '용광로에서 철광석을 코크스와 함께 가열해 철을 얻는다.'],
      ['철의 부식', '4Fe + 3O₂ → 2Fe₂O₃', '철(Fe)이 산소를 얻어 붉은 녹이 된다', '산소(O₂)가 환원된다', '물과 산소가 함께 있을 때 빨라진다. 페인트 칠, 도금으로 막는다.'],
      ['구리선 가열', '2Cu + O₂ → 2CuO', '붉은 구리가 산소를 얻어 검은 산화 구리(Ⅱ)가 된다', '산소(O₂)가 환원된다', '가열한 구리선 표면이 검게 변한다.'],
      ['손난로', '4Fe + 3O₂ + 6H₂O → 4Fe(OH)₃', '철 가루가 공기 중 산소와 천천히 반응한다', '산소(O₂)가 환원된다', '산화 반응에서 나오는 열을 이용한다.'],
      ['반딧불이·사과 갈변', '루시페린 + O₂ → 옥시루시페린 + 빛', '생체 물질이 효소의 도움으로 산소와 반응한다', '산소(O₂)가 환원된다', '깎은 사과가 갈색으로 변하는 것도 폴리페놀의 산화이다.'],
    ];
    root.innerHTML = `
      <div class="callout"><span><b>산화와 환원은 항상 동시에 일어난다.</b> 한 물질이 산소를 얻거나 전자를 잃으면(산화), 다른 물질은 반드시 산소를 잃거나 전자를 얻는다(환원).</span></div>
      <div class="notes">${cards.map(([t, eq, ox, red, d]) => U.note(t, `
        <div class="formula">${eq}</div>
        <p><span class="badge bad">산화</span> ${ox}</p>
        <p><span class="badge" style="color:var(--phys)">환원</span> ${red}</p>
        <p>${d}</p>`)).join('')}</div>`;
  }

  function notesLab() {
    return U.notesHead('이론 노트', '산소와 전자로 보는 산화 환원 · 금속의 반응성 · 양적 관계') +
      U.note('산화와 환원의 정의', `
        <div class="tbl"><table class="data"><thead><tr><th>기준</th><th>산화</th><th>환원</th></tr></thead><tbody>
          <tr><td>산소</td><td>산소를 얻음</td><td>산소를 잃음</td></tr>
          <tr><td>전자</td><td>전자를 잃음</td><td>전자를 얻음</td></tr>
        </tbody></table></div>
        <p>한 물질이 잃은 전자를 다른 물질이 얻으므로 산화와 환원은 <strong>동시에</strong> 일어나고, 잃은 전자 수와 얻은 전자 수는 같다.</p>`) +
      U.note('금속과 금속 이온의 반응', `
        <p>반응성이 큰 금속 A를 반응성이 작은 금속 B의 이온 수용액에 넣으면, A가 전자를 잃고 이온이 되며(산화) B 이온은 전자를 얻어 금속으로 석출된다(환원).</p>
        <div class="formula">Zn + Cu²⁺ → Zn²⁺ + Cu</div>
        <p>반대로 반응성이 작은 금속을 반응성이 큰 금속의 이온 수용액에 넣으면 아무 일도 일어나지 않는다.</p>`) +
      U.note('양적 관계와 질량 변화', `
        <p>이동한 전자 수가 같아야 하므로 이온의 전하가 다르면 개수가 달라진다.</p>
        <div class="formula">Cu + 2Ag⁺ → Cu²⁺ + 2Ag</div>
        <p>Ag⁺ 2개가 사라질 때 Cu²⁺ 1개가 생기므로 양이온 수가 줄어든다. 구리 63.5 g이 녹는 동안 은 215.7 g이 붙으므로 금속판의 질량은 늘어난다. 반대로 Zn + Cu²⁺ 반응은 아연(65.4)이 녹고 구리(63.5)가 붙어 질량이 조금 줄어든다.</p>`) +
      U.note('생각해 보기', `
        ${U.qa('질산 은 수용액에 구리판을 넣으면 용액 색이 어떻게 변할까?', '구리가 산화되어 Cu²⁺가 생기므로 무색 용액이 점점 푸른색으로 변하고, 구리판 표면에는 은이 나뭇가지 모양으로 자란다.')}
        ${U.qa('황산 구리(Ⅱ) 수용액을 철 그릇에 담아 두면 안 되는 까닭은?', '철이 구리보다 반응성이 커서 Fe + Cu²⁺ → Fe²⁺ + Cu 반응으로 그릇이 녹아 나가기 때문이다.')}
        ${U.qa('묽은 염산에 구리를 넣으면 수소 기체가 생길까?', '생기지 않는다. 구리는 수소보다 반응성이 작아 H⁺에게 전자를 줄 수 없다.')}`) +
      `<p class="src note full">자료: 표준 환원 전위(25 °C, CRC Handbook of Chemistry and Physics), 원자량(IUPAC 2021). 반응성 표는 표준 상태 기준이며 실제 반응 속도는 농도, 온도, 표면 상태에 따라 다르다.</p>`;
  }
})();
