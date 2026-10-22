'use strict';
/* 세포막을 통한 물질 이동 — 삼투와 확산 */
(() => {
  const OSM_PER_PCT = 318.3;   // NaCl 1% (10 g/L ÷ 58.44 g/mol × 2 × 삼투 계수 0.93) ≈ 318 mOsm/L
  const RBC_IN = 286.5;        // 0.9% 생리 식염수와 같은 삼투 농도
  const PLANT_IN = 400;        // 양파 표피 세포 세포액 (모형값)
  const rbcVol = osm => osm <= 0 ? Infinity : 0.4 + 0.6 * RBC_IN / osm;   // 보일–반트호프 관계, 비삼투 부피 40%
  const plantVol = osm => osm <= 0 ? 2 : 0.25 + 0.75 * PLANT_IN / osm;

  registerModule({
    id: 'osmosis', subject: 'life', title: '세포막과 삼투', short: '세포막과 삼투',
    unit: '통합과학1 · 시스템과 상호작용',
    lead: '세포막은 물은 잘 통과시키지만 많은 물질은 골라서 통과시킵니다. 소금물의 농도를 바꾸며 적혈구와 식물 세포가 어떻게 변하는지 보고, 선택적 투과성 막을 사이에 둔 확산을 관찰합니다.',
    desc: '저장액·등장액·고장액, 적혈구 용혈, 원형질 분리, 확산과 선택적 투과성',
    icon: '<ellipse cx="12" cy="12" rx="9.5" ry="7"/><circle cx="13.5" cy="11" r="2.5"/><path d="M5 8.5l-2.5-1.5M19 15.5l2.5 1.5"/>',
    mount(root, S) {
      tabs(root, [
        { id: 'cells', label: '세포와 소금물 농도', mount: mountCells },
        { id: 'diffusion', label: '확산과 선택적 투과성', mount: mountDiffusion },
      ], S);
    },
  });

  function mountCells(root, S) {
    const st = { c: 0.9, rbc: 1, plant: 1, burst: 0 };
    root.innerHTML = `
      <div class="lab">
        <aside class="panel controls" aria-label="실험 조건">
          <h2 class="ph">바깥 용액</h2>
          ${Ctl.range('os-c', '소금물(NaCl) 농도', { min: 0, max: 3.5, step: 0.05, value: st.c })}
          <div class="chips" id="os-pre">${[[0, '증류수'], [0.45, '0.45%'], [0.9, '생리 식염수 0.9%'], [2, '2%'], [3.5, '바닷물 3.5%']].map(([c, n]) => `<button type="button" class="chip" data-c="${c}">${n}</button>`).join('')}</div>
          <p class="ctl-hint">세포 안팎의 물은 용질 입자가 적은(묽은) 쪽에서 많은(진한) 쪽으로 세포막을 지나 이동한다.</p>
        </aside>
        <div class="stack">
          <div class="panel stage-panel"><canvas class="stage" id="os-cv" style="aspect-ratio: 16 / 9" aria-label="적혈구와 양파 표피 세포"></canvas></div>
          <div id="os-msg"></div>
          <div class="meters">
            <div class="meter"><span class="lbl">바깥 용액 삼투 농도</span><b id="os-osm">—</b><span class="sub">mOsm/L</span></div>
            <div class="meter"><span class="lbl">적혈구 부피</span><b id="os-rv">—</b><span class="sub" id="os-rs"></span></div>
            <div class="meter"><span class="lbl">식물 세포 (원형질체)</span><b id="os-pv">—</b><span class="sub" id="os-ps"></span></div>
          </div>
        </div>
      </div>
      <div class="charts">
        <div class="panel"><h3 class="ch">소금물 농도에 따른 적혈구 부피</h3><div id="os-c1"></div></div>
        <div class="panel"><h3 class="ch">소금물 농도에 따른 식물 세포 원형질체 부피</h3><div id="os-c2"></div></div>
      </div>
      <section class="notes">${notesCells()}</section>`;
    const $ = s => root.querySelector(s);
    const stg = S.stage($('#os-cv'), () => {});
    const sl = bindRange(root, 'os-c', { digits: 2, unit: '%' }, v => { st.c = v; update(); });
    $('#os-pre').addEventListener('click', e => { const b = e.target.closest('[data-c]'); if (b) sl.set(+b.dataset.c); });
    const waters = [];
    let spawn = 0;
    const rbcState = v => v >= 1.65 ? ['용혈 (세포막이 터짐)', 'bad'] : v >= 1.08 ? ['부풂', ''] : v > 0.93 ? ['정상 (원반 모양)', 'good'] : ['쭈그러짐', ''];
    const plantState = v => v >= 1 ? ['팽윤 (세포벽을 밀어냄)', 'good'] : v > 0.96 ? ['정상', 'good'] : ['원형질 분리', 'bad'];
    function update() {
      const osm = st.c * OSM_PER_PCT, rv = rbcVol(osm), pv = plantVol(osm);
      $('#os-osm').textContent = Math.round(osm);
      $('#os-rv').textContent = isFinite(rv) && rv < 1.65 ? Math.round(rv * 100) + '%' : '터짐';
      $('#os-rs').textContent = rbcState(rv)[0];
      $('#os-pv').textContent = Math.round(Math.min(1, pv) * 100) + '%';
      $('#os-ps').textContent = plantState(pv)[0];
      const kind = osm < RBC_IN * 0.97 ? ['저장액', '적혈구 안보다 묽다. 물이 세포 안으로 들어간다.'] : osm > RBC_IN * 1.03 ? ['고장액', '적혈구 안보다 진하다. 물이 세포 밖으로 빠져나간다.'] : ['등장액', '적혈구 안과 농도가 같다. 들어오고 나가는 물의 양이 같다.'];
      $('#os-msg').innerHTML = `<div class="callout"><span class="badge acc">${kind[0]}</span><span>${kind[1]} 식물 세포의 세포액(약 ${PLANT_IN} mOsm/L) 기준으로는 ${osm < PLANT_IN ? '저장액이라 물이 들어가 세포가 팽팽해진다.' : '고장액이라 물이 빠져 원형질 분리가 일어난다.'}</span></div>`;
      const xs = Array.from({ length: 141 }, (_, i) => 0.05 + i * 0.025);
      chart($('#os-c1'), {
        x: [0, 3.5], y: [0, 180], height: 220, xLabel: 'NaCl 농도 (%)', yLabel: '처음 대비 부피 (%)', cursor: st.c, xFmt: v => `NaCl ${U.fmt(v, 2)}%`, yFmt: v => Math.round(v) + '%',
        series: [{ name: '적혈구 부피', color: 'var(--bad)', width: 2.5, data: xs.map(c => [c, Math.min(170, rbcVol(c * OSM_PER_PCT) * 100)]) }],
        bands: [{ x0: 0, x1: 0.432, color: 'var(--bad)', opacity: .1, label: '용혈' }],
        hlines: [{ y: 100, label: '정상 부피' }], vlines: [{ x: 0.9, label: '0.9% 등장액' }],
      });
      chart($('#os-c2'), {
        x: [0, 3.5], y: [0, 110], height: 220, xLabel: 'NaCl 농도 (%)', yLabel: '세포벽 안 부피 대비 (%)', cursor: st.c, xFmt: v => `NaCl ${U.fmt(v, 2)}%`, yFmt: v => Math.round(v) + '%',
        series: [{ name: '원형질체 부피', color: 'var(--life)', width: 2.5, data: xs.map(c => [c, Math.min(100, plantVol(c * OSM_PER_PCT) * 100)]) }],
        bands: [{ x0: PLANT_IN / OSM_PER_PCT, x1: 3.5, color: 'var(--life)', opacity: .1, label: '원형질 분리' }],
      });
    }
    function rbcShape(ctx, x, y, R, v, t) {
      const bad = Theme.v('--bad');
      if (v >= 1.65) {
        ctx.strokeStyle = U.rgba(bad, 0.45); ctx.lineWidth = 1.5; ctx.setLineDash([5, 6]);
        ctx.beginPath(); ctx.arc(x, y, R * 1.15, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        const g = ctx.createRadialGradient(x, y, 0, x, y, R * 2.4);
        g.addColorStop(0, U.rgba(bad, 0.28)); g.addColorStop(1, U.rgba(bad, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, R * 2.4, 0, 7); ctx.fill();
        return;
      }
      const r = R * Math.cbrt(Math.min(v, 1.6)) * (v > 1 ? 0.92 : 1);
      ctx.beginPath();
      const spikes = v < 0.93 ? (0.93 - v) * 0.9 : 0;
      for (let i = 0; i <= 72; i++) {
        const a = i / 72 * Math.PI * 2, rr = r * (1 + spikes * Math.max(0, Math.sin(a * 14 + t * 0.4)) ** 3);
        i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath();
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const pallor = U.clamp(1 - (v - 1) * 2.2, 0, 1);
      g.addColorStop(0, U.rgba(U.mix(bad, '#ffffff', 0.45 * pallor), 1)); g.addColorStop(0.45, U.rgba(U.mix(bad, '#ffffff', 0.2 * pallor), 1)); g.addColorStop(1, U.mix(bad, '#000000', 0.15));
      ctx.fillStyle = g; ctx.fill();
    }
    S.loop((dt, t) => {
      const { ctx, W, H } = stg;
      if (!W) return;
      const osm = st.c * OSM_PER_PCT, targetR = rbcVol(osm), targetP = plantVol(osm);
      st.rbc += (Math.min(targetR, 1.7) - st.rbc) * Math.min(1, dt * 1.5);
      st.plant += (Math.min(targetP, 1.08) - st.plant) * Math.min(1, dt * 1.2);
      const ink = Theme.v('--ink'), muted = Theme.v('--muted'), water = Theme.v('--water'), life = Theme.v('--life');
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = U.rgba(water, 0.12 + Math.min(0.25, st.c * 0.06)); ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = U.rgba(ink, 0.15); ctx.beginPath(); ctx.moveTo(W / 2, 14); ctx.lineTo(W / 2, H - 14); ctx.stroke();
      // 적혈구
      const rx = W * 0.25, ry = H * 0.5, R = Math.min(W * 0.11, H * 0.24);
      rbcShape(ctx, rx, ry, R, st.rbc >= 1.64 ? 1.7 : st.rbc, t);
      Draw.text(ctx, '적혈구 (동물 세포)', rx, H - 16, { size: 12.5, weight: 600, align: 'center', color: ink });
      // 식물 세포
      const px = W * 0.75, py = H * 0.5, cw = Math.min(W * 0.32, H * 0.9), chh = cw * 0.55;
      const bulge = st.plant > 1 ? (st.plant - 1) * 30 : 0;
      ctx.strokeStyle = U.mix(life, '#000000', 0.25); ctx.lineWidth = 5;
      ctx.beginPath(); ctx.roundRect(px - cw / 2 - bulge / 2, py - chh / 2 - bulge / 4, cw + bulge, chh + bulge / 2, 8); ctx.stroke();
      const s = Math.sqrt(Math.min(1, st.plant));
      const iw = (cw - 10) * (st.plant >= 1 ? 1 : s), ih = (chh - 10) * (st.plant >= 1 ? 1 : s);
      ctx.fillStyle = U.rgba(life, 0.18); ctx.strokeStyle = life; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(px - iw / 2, py - ih / 2, iw, ih, st.plant >= 0.96 ? 6 : Math.min(iw, ih) / 2.2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(150, 70, 160, 0.35)';
      ctx.beginPath(); ctx.roundRect(px - iw * 0.4, py - ih * 0.36, iw * 0.8, ih * 0.72, Math.min(iw, ih) * 0.3); ctx.fill();
      ctx.fillStyle = U.rgba(ink, 0.45); ctx.beginPath(); ctx.arc(px - iw * 0.42, py + ih * 0.1, Math.max(3, ih * 0.08), 0, 7); ctx.fill();
      Draw.text(ctx, '양파 표피 세포 (식물 세포)', px, H - 16, { size: 12.5, weight: 600, align: 'center', color: ink });
      Draw.text(ctx, '세포벽', px + cw / 2 + 4, py - chh / 2 - 6, { size: 10.5, color: muted, align: 'right' });
      Draw.text(ctx, '액포', px, py + 4, { size: 10.5, color: muted, align: 'center' });
      // 물 분자 이동
      spawn += dt;
      const flowR = (RBC_IN - osm) / RBC_IN, flowP = (PLANT_IN - osm) / PLANT_IN;
      if (spawn > 0.08) {
        spawn = 0;
        for (const [cx, cy, rad, f] of [[rx, ry, R * Math.cbrt(Math.min(st.rbc, 1.6)), flowR], [px, py, Math.min(cw, chh) * 0.5, flowP]]) {
          if (st.rbc >= 1.64 && cx === rx) continue;
          const inward = Math.random() < 0.5 + U.clamp(f, -1, 1) * 0.5;
          const a = Math.random() * Math.PI * 2;
          waters.push({ cx, cy, a, r0: inward ? rad + 26 : rad - 10, r1: inward ? rad - 10 : rad + 26, t: 0 });
        }
      }
      for (let i = waters.length - 1; i >= 0; i--) {
        const w = waters[i]; w.t += dt * 0.9;
        if (w.t >= 1) { waters.splice(i, 1); continue; }
        const rr = U.lerp(w.r0, w.r1, w.t);
        ctx.fillStyle = U.rgba(Theme.v('--phys'), 0.8 * Math.sin(w.t * Math.PI));
        ctx.beginPath(); ctx.arc(w.cx + Math.cos(w.a) * rr, w.cy + Math.sin(w.a) * rr * 0.8, 2.6, 0, 7); ctx.fill();
      }
      Draw.text(ctx, `NaCl ${U.fmt(st.c, 2)}% · 파란 점 = 물 분자의 이동`, 14, 20, { size: 11.5, color: muted, weight: 600 });
    });
    update();
  }

  function mountDiffusion(root, S) {
    const st = { mode: 'select', T: 25, t: 0 };
    root.innerHTML = `
      <div class="lab">
        <aside class="panel controls">
          <h2 class="ph">막과 온도</h2>
          ${Ctl.seg('df-m', '가운데 막', [['none', '막 없음'], ['select', '선택적 투과성 막'], ['wall', '막힌 벽']], st.mode)}
          ${Ctl.range('df-t', '온도', { min: 0, max: 60, step: 1, value: st.T })}
          <div class="btn-row"><button class="btn primary" id="df-reset" type="button">${ICON.reset}<span>다시 시작</span></button></div>
          <p class="ctl-hint">작은 입자(물, 산소)는 막의 구멍을 지나가지만 큰 입자(포도당 같은 큰 분자)는 지나가지 못한다. 온도가 높을수록 입자가 빨리 움직여 확산이 빨라진다.</p>
        </aside>
        <div class="stack">
          <div class="panel stage-panel">
            <canvas class="stage" id="df-cv" style="aspect-ratio: 16 / 9" aria-label="막을 사이에 둔 입자의 확산"></canvas>
            <div class="stage-key right"><span><i style="background:var(--phys)"></i>작은 입자</span><span><i style="background:var(--earth)"></i>큰 입자</span></div>
          </div>
          <div class="panel"><h3 class="ch">오른쪽 칸으로 옮겨 간 입자 수</h3><div id="df-c"></div></div>
        </div>
      </div>
      <section class="notes">${notesDiff()}</section>`;
    const $ = s => root.querySelector(s);
    const stg = S.stage($('#df-cv'), () => {});
    let P = [], hist = [], acc = 0;
    function reset() {
      P = []; hist = []; st.t = 0;
      for (let i = 0; i < 70; i++) P.push({ big: false, x: Math.random() * 0.46 + 0.02, y: Math.random() * 0.94 + 0.03, a: Math.random() * 7 });
      for (let i = 0; i < 30; i++) P.push({ big: true, x: Math.random() * 0.44 + 0.03, y: Math.random() * 0.9 + 0.05, a: Math.random() * 7 });
    }
    bindSeg(root, 'df-m', v => { st.mode = v; reset(); });
    bindRange(root, 'df-t', { unit: ' °C' }, v => { st.T = v; });
    $('#df-reset').addEventListener('click', reset);
    const pores = y => (y * 10) % 1 < 0.45;
    S.loop(dt => {
      const { ctx, W, H } = stg;
      if (!W) return;
      st.t += dt;
      const speed = 0.12 * Math.sqrt((st.T + 273) / 298);
      for (const p of P) {
        const v = speed * (p.big ? 0.45 : 1);
        p.a += (Math.random() - 0.5) * 2.2 * dt * 3;
        let nx = p.x + Math.cos(p.a) * v * dt, ny = p.y + Math.sin(p.a) * v * dt * (W / H);
        const crosses = (p.x - 0.5) * (nx - 0.5) < 0;
        if (crosses && st.mode !== 'none') {
          const pass = st.mode === 'select' && !p.big && pores(ny);
          if (!pass) { nx = p.x; p.a = Math.PI - p.a; }
        }
        if (nx < 0.01 || nx > 0.99) { p.a = Math.PI - p.a; nx = U.clamp(nx, 0.01, 0.99); }
        if (ny < 0.02 || ny > 0.98) { p.a = -p.a; ny = U.clamp(ny, 0.02, 0.98); }
        p.x = nx; p.y = ny;
      }
      acc += dt;
      if (acc > 0.25) {
        acc = 0;
        hist.push([st.t, P.filter(p => !p.big && p.x > 0.5).length, P.filter(p => p.big && p.x > 0.5).length]);
        if (hist.length > 400) hist.shift();
        const t1 = Math.max(30, st.t);
        chart($('#df-c'), {
          x: [Math.max(0, t1 - 60), t1], y: [0, 70], height: 200, xLabel: '시간 (s)', yLabel: '오른쪽 입자 수', hover: false,
          series: [
            { name: '작은 입자 (70개 중)', color: 'var(--phys)', width: 2.4, data: hist.map(h => [h[0], h[1]]) },
            { name: '큰 입자 (30개 중)', color: 'var(--earth)', width: 2.4, data: hist.map(h => [h[0], h[2]]) },
          ],
          hlines: [{ y: 35, label: '작은 입자가 고르게 퍼졌을 때 (35개)' }, { y: 15, label: '큰 입자 15개' }],
        });
      }
      const ink = Theme.v('--ink'), phys = Theme.v('--phys'), earth = Theme.v('--earth');
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = U.rgba(ink, 0.3); ctx.lineWidth = 2; ctx.strokeRect(6, 6, W - 12, H - 12);
      if (st.mode !== 'none') {
        ctx.strokeStyle = U.rgba(ink, 0.65); ctx.lineWidth = 4;
        for (let i = 0; i < 10; i++) {
          const y0 = (i / 10) * H, y1 = ((i + (st.mode === 'select' ? 0.55 : 1)) / 10) * H;
          ctx.beginPath(); ctx.moveTo(W / 2, y0 + (st.mode === 'select' ? 0.45 * H / 10 : 0)); ctx.lineTo(W / 2, y1 + (st.mode === 'select' ? 0.45 * H / 10 : 0)); ctx.stroke();
        }
      }
      for (const p of P) {
        ctx.beginPath(); ctx.arc(p.x * W, p.y * H, p.big ? 7 : 3.6, 0, 7); ctx.fillStyle = p.big ? earth : phys; ctx.fill();
      }
      const left = P.filter(p => p.x < 0.5), right = P.filter(p => p.x >= 0.5);
      Draw.text(ctx, `왼쪽 ${left.length}개`, 16, 24, { size: 12, weight: 600, color: ink });
      Draw.text(ctx, `오른쪽 ${right.length}개`, W - 16, 24, { size: 12, weight: 600, color: ink, align: 'right' });
    });
    reset();
  }

  function notesCells() {
    return U.notesHead('이론 노트', '세포막의 선택적 투과성 · 삼투 · 생활 속 예') +
      U.note('세포막의 구조와 기능', `
        <p>세포막은 <strong>인지질 2중층</strong>에 여러 단백질이 박혀 있는 구조이다. 산소, 이산화 탄소처럼 작고 극성이 없는 분자는 인지질 사이로 확산하고, 이온이나 포도당은 막단백질(통로, 운반체)을 통해 이동한다. 물은 인지질 사이와 아쿠아포린이라는 통로 단백질로 지나간다.</p>
        <p>이처럼 물질에 따라 통과 정도가 다른 성질을 <strong>선택적 투과성</strong>이라 한다.</p>`) +
      U.note('삼투', `
        <p>용질은 통과하지 못하고 물만 통과하는 막을 사이에 두고 농도가 다른 용액이 있으면, <strong>물이 농도가 낮은 쪽에서 높은 쪽으로</strong> 이동한다. 이를 삼투라 한다.</p>
        <div class="tbl"><table class="data"><thead><tr><th>바깥 용액</th><th>물의 이동</th><th>적혈구</th><th>식물 세포</th></tr></thead><tbody>
          <tr><td>저장액 (더 묽음)</td><td>세포 안으로</td><td>부풀다가 터짐 (용혈)</td><td>팽팽해짐 (세포벽 때문에 터지지 않음)</td></tr>
          <tr><td>등장액</td><td>같음</td><td>그대로</td><td>그대로</td></tr>
          <tr><td>고장액 (더 진함)</td><td>세포 밖으로</td><td>쭈그러짐</td><td>원형질 분리</td></tr>
        </tbody></table></div>`) +
      U.note('생활 속 삼투', `
        <ul><li>병원 수액과 렌즈 세척액은 0.9% 생리 식염수(등장액)를 쓴다.</li>
        <li>배추를 소금에 절이면 세포의 물이 빠져나가 숨이 죽는다.</li>
        <li>바닷물을 마시면 몸의 물이 오히려 빠져나가 갈증이 심해진다.</li>
        <li>시든 채소를 맹물에 담가 두면 다시 싱싱해진다.</li></ul>`) +
      U.note('생각해 보기', `
        ${U.qa('적혈구를 증류수에 넣으면 터지지만 양파 세포는 터지지 않는 까닭은?', '식물 세포에는 단단한 세포벽이 있어 물이 들어와 부풀어도 세포벽이 버텨 주기 때문이다. 이때 세포는 팽팽해진다(팽압).')}
        ${U.qa('0.9% 소금물이 적혈구의 등장액인 까닭은?', 'NaCl은 물에서 Na⁺와 Cl⁻로 나뉘어 0.9%이면 용질 입자 농도가 약 290 mOsm/L로 혈장과 비슷하기 때문이다.')}`) +
      `<p class="src note full">적혈구 부피는 보일–반트호프 관계(삼투 활성이 없는 부피 40%)로, 용혈은 처음 부피의 약 1.65배에서 일어난다고 두었다. 실제로 적혈구는 NaCl 약 0.45% 부근에서 용혈되기 시작한다. 양파 세포액 농도 400 mOsm/L은 모형값이다.</p>`;
  }
  function notesDiff() {
    return U.notesHead('이론 노트', '확산 · 온도 · 막의 종류') +
      U.note('확산', `<p>입자가 스스로 움직여 농도가 높은 곳에서 낮은 곳으로 퍼져 나가는 현상이다. 따로 에너지를 쓰지 않으며, 양쪽 농도가 같아지면 알짜 이동이 멈춘다(입자는 계속 움직이지만 양쪽으로 오가는 수가 같다). 폐포와 모세 혈관 사이의 산소·이산화 탄소 교환이 대표적이다.</p>`) +
      U.note('확산 속도에 영향을 주는 것', `<ul><li>온도가 높을수록 빠르다 (입자의 운동이 활발).</li><li>입자가 작을수록 빠르다.</li><li>농도 차이가 클수록, 막의 면적이 넓을수록, 막이 얇을수록 많이 이동한다.</li></ul>`) +
      `<p class="src note full">입자의 속력은 절대 온도의 제곱근에 비례하게, 큰 입자는 작은 입자의 0.45배로 두었다.</p>`;
  }
})();
