'use strict';
/* 자유 낙하와 수평으로 던진 물체 — 다중 섬광 사진 */
(() => {
  const PLANETS = { earth: ['지구', 9.8], mars: ['화성', 3.71], moon: ['달', 1.62] };

  registerModule({
    id: 'motion', subject: 'phys', title: '자유 낙하와 수평으로 던진 물체', short: '낙하 운동',
    unit: '통합과학1 · 시스템과 상호작용',
    lead: '같은 높이에서 공 하나는 가만히 떨어뜨리고 다른 하나는 수평으로 던집니다. 다중 섬광 사진처럼 일정한 시간 간격으로 위치를 찍어 두 운동을 비교합니다.',
    desc: '다중 섬광 사진, 수평·연직 방향 운동의 분리, 속도 성분, 위치·속도 그래프',
    icon: '<circle cx="5" cy="5" r="1.6"/><path d="M5 5c6 0 10.5 5 13.5 15"/><circle cx="10" cy="6.2" r="1.1"/><circle cx="14.2" cy="9.6" r="1.1"/><path d="M3 21h18"/>',
    mount(root, S) {
      const st = { planet: 'earth', g: 9.8, h: 20, v0: 6, flash: 0.1, free: true, vec: true, slow: 1, t: 0, playing: false };
      root.innerHTML = `
      <div class="lab">
        <aside class="panel controls" aria-label="실험 조건">
          <h2 class="ph">실험 조건</h2>
          ${Ctl.seg('mo-g', '장소 (중력 가속도)', Object.entries(PLANETS).map(([k, [n, g]]) => [k, `${n} ${g}`]), st.planet)}
          ${Ctl.range('mo-h', '처음 높이', { min: 5, max: 80, step: 1, value: st.h })}
          ${Ctl.range('mo-v', 'A를 수평으로 던진 속력', { min: 0, max: 20, step: 0.5, value: st.v0 })}
          ${Ctl.seg('mo-f', '섬광 간격', [['0.1', '0.1초'], ['0.2', '0.2초'], ['0.5', '0.5초']], '0.1')}
          ${Ctl.seg('mo-s', '재생 속도', [['1', '실제'], ['0.5', '½ 느리게'], ['0.25', '¼ 느리게']], '1')}
          ${Ctl.check('mo-free', 'B 공 (자유 낙하) 같이 보기', true)}
          ${Ctl.check('mo-vec', '속도 화살표 보기', true)}
          <p class="ctl-hint">공기 저항은 무시한다. 공의 질량은 결과에 영향을 주지 않는다.</p>
        </aside>
        <div class="stack">
          <div class="panel stage-panel">
            <canvas class="stage" id="mo-cv" aria-label="수평으로 던진 공과 자유 낙하하는 공의 다중 섬광 사진"></canvas>
            <div class="stage-key right"><span><i style="background:var(--phys)"></i>A 수평으로 던짐</span><span><i style="background:var(--ink-2)"></i>B 자유 낙하</span></div>
          </div>
          <div class="panel controls">
            ${Ctl.range('mo-t', '시간', { min: 0, max: 2, step: 0.01, value: 0 })}
            <div class="btn-row">
              <button class="btn primary" id="mo-play" type="button">${ICON.play}<span>떨어뜨리기</span></button>
              <button class="btn" id="mo-step" type="button">섬광 한 번</button>
              <button class="btn ghost" id="mo-reset" type="button">${ICON.reset}<span>처음으로</span></button>
            </div>
          </div>
          <div class="meters">
            <div class="meter"><span class="lbl">STOPWATCH</span><b id="mo-tm">0.00 s</b><span class="sub" id="mo-tf"></span></div>
            <div class="meter"><span class="lbl">A 위치 (x, 높이)</span><b id="mo-pos">—</b><span class="sub">m</span></div>
            <div class="meter"><span class="lbl">A 속력</span><b id="mo-sp">—</b><span class="sub" id="mo-comp"></span></div>
          </div>
          <div class="readouts" id="mo-ro"></div>
        </div>
      </div>
      <div class="charts">
        <div class="panel"><h3 class="ch">수평 위치 – 시간</h3><div id="mo-c1"></div></div>
        <div class="panel"><h3 class="ch">높이 – 시간</h3><div id="mo-c2"></div></div>
        <div class="panel"><h3 class="ch">수평 방향 속도 – 시간</h3><div id="mo-c3"></div></div>
        <div class="panel"><h3 class="ch">연직 방향 속력 – 시간</h3><div id="mo-c4"></div></div>
      </div>
      <section class="notes">${notes()}</section>`;
      const $ = s => root.querySelector(s);
      const stg = S.stage($('#mo-cv'), () => draw());
      const tf = () => Math.sqrt(2 * st.h / st.g);
      let lastChart = 0;
      const tr = bindRange(root, 'mo-t', { format: v => U.fmt(v, 2) + ' s' }, v => { setPlaying(false); st.t = Math.min(v, tf()); update(); });
      bindSeg(root, 'mo-g', v => { st.planet = v; st.g = PLANETS[v][1]; restart(); });
      bindRange(root, 'mo-h', { unit: ' m' }, v => { st.h = v; restart(); });
      bindRange(root, 'mo-v', { digits: 1, unit: ' m/s' }, v => { st.v0 = v; restart(); });
      bindSeg(root, 'mo-f', v => { st.flash = +v; update(true); });
      bindSeg(root, 'mo-s', v => { st.slow = +v; });
      bindCheck(root, 'mo-free', v => { st.free = v; draw(); });
      bindCheck(root, 'mo-vec', v => { st.vec = v; draw(); });
      const playBtn = $('#mo-play');
      function setPlaying(p) { st.playing = p; playBtn.innerHTML = p ? `${ICON.pause}<span>멈춤</span>` : `${ICON.play}<span>떨어뜨리기</span>`; }
      playBtn.addEventListener('click', () => { if (!st.playing && st.t >= tf() - 1e-6) st.t = 0; setPlaying(!st.playing); });
      $('#mo-step').addEventListener('click', () => { setPlaying(false); st.t = Math.min(tf(), (Math.floor(st.t / st.flash + 1e-6) + 1) * st.flash); update(); });
      $('#mo-reset').addEventListener('click', () => { setPlaying(false); st.t = 0; update(); });
      function restart() { setPlaying(false); st.t = 0; tr.setMax(tf().toFixed(2)); update(true); }

      function update(full) {
        const T = tf(), t = Math.min(st.t, T);
        tr.set(t, true);
        const x = st.v0 * t, y = st.h - 0.5 * st.g * t * t, vy = st.g * t, sp = Math.hypot(st.v0, vy);
        $('#mo-tm').textContent = U.fmt(t, 2) + ' s';
        $('#mo-tf').textContent = `착지까지 ${U.fmt(T, 2)} s`;
        $('#mo-pos').textContent = `${U.fmt(x, 1)}, ${U.fmt(Math.max(0, y), 1)}`;
        $('#mo-sp').textContent = U.fmt(sp, 1) + ' m/s';
        $('#mo-comp').textContent = `vₓ ${U.fmt(st.v0, 1)} · v_y ${U.fmt(vy, 1)} m/s`;
        $('#mo-ro').innerHTML = [
          ['낙하 시간 √(2h/g)', U.fmt(T, 2) + ' s'],
          ['수평 도달 거리 v₀t', U.fmt(st.v0 * T, 2) + ' m'],
          ['착지 속력', U.fmt(Math.hypot(st.v0, st.g * T), 2) + ' m/s'],
          ['B 착지 속력 gt', U.fmt(st.g * T, 2) + ' m/s'],
          ['찍힌 섬광 수', `${Math.floor(t / st.flash + 1e-6) + 1}번`],
          ['중력 가속도', `${st.g} m/s²`],
        ].map(([a, b]) => `<div class="ro"><span>${a}</span><b>${b}</b></div>`).join('');
        const now = performance.now();
        if (full || !st.playing || now - lastChart > 100) { charts(); lastChart = now; }
        draw();
      }
      function charts() {
        const T = tf(), n = 80, ts = Array.from({ length: n + 1 }, (_, i) => T * i / n);
        const base = { x: [0, T], height: 200, xLabel: '시간 (s)', cursor: Math.min(st.t, T), xFmt: v => `t = ${U.fmt(v, 2)} s` };
        const A = 'var(--phys)', B = 'var(--ink-2)';
        chart($('#mo-c1'), { ...base, yLabel: 'x (m)', yInclude: [0, 1], yFmt: v => U.fmt(v, 2) + ' m', series: [
          { name: 'A', color: A, width: 2.5, data: ts.map(t => [t, st.v0 * t]) },
          { name: 'B', color: B, dash: '5 4', data: ts.map(t => [t, 0]) }] });
        chart($('#mo-c2'), { ...base, yLabel: '높이 (m)', yInclude: [0], yFmt: v => U.fmt(v, 2) + ' m', series: [
          { name: 'A와 B (같음)', color: A, width: 2.5, data: ts.map(t => [t, st.h - 0.5 * st.g * t * t]) }] });
        chart($('#mo-c3'), { ...base, yLabel: 'vₓ (m/s)', yInclude: [0, 1], yFmt: v => U.fmt(v, 2) + ' m/s', series: [
          { name: 'A', color: A, width: 2.5, data: ts.map(t => [t, st.v0]) },
          { name: 'B', color: B, dash: '5 4', data: ts.map(t => [t, 0]) }] });
        chart($('#mo-c4'), { ...base, yLabel: 'v_y (m/s)', yInclude: [0], yFmt: v => U.fmt(v, 2) + ' m/s', series: [
          { name: 'A와 B (같음, 기울기 = g)', color: A, width: 2.5, area: true, base: 0, data: ts.map(t => [t, st.g * t]) }] });
      }

      function draw() {
        const { ctx, W, H } = stg;
        if (!W) return;
        const ink = Theme.v('--ink'), muted = Theme.v('--muted'), phys = Theme.v('--phys'), ink2 = Theme.v('--ink-2'), line = Theme.v('--line-2'), earth = Theme.v('--earth');
        ctx.clearRect(0, 0, W, H);
        const T = tf(), R = st.v0 * T, t = Math.min(st.t, T);
        const towerW = Math.max(1.5, st.h * 0.08);
        const xMin = -towerW * 1.25, xMax = Math.max(R * 1.1, st.h * 0.6, 5);
        const pl = 52, pr = 22, pt = 30, pb = 36;
        const k = Math.min((W - pl - pr) / (xMax - xMin), (H - pt - pb) / (st.h * 1.08));
        const X = x => pl + (x - xMin) * k, Y = y => H - pb - y * k;
        const br = U.clamp(k * 0.25, 5, 8);
        // 땅
        ctx.fillStyle = U.rgba(earth, 0.12); ctx.fillRect(0, Y(0), W, H - Y(0));
        ctx.strokeStyle = U.rgba(earth, 0.6); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, Y(0)); ctx.lineTo(W, Y(0)); ctx.stroke();
        // 건물
        ctx.fillStyle = U.rgba(ink, 0.12); ctx.fillRect(X(xMin + towerW * 0.25), Y(st.h), X(0) - br - X(xMin + towerW * 0.25), Y(0) - Y(st.h));
        ctx.strokeStyle = U.rgba(ink, 0.35); ctx.lineWidth = 1; ctx.strokeRect(X(xMin + towerW * 0.25), Y(st.h), X(0) - br - X(xMin + towerW * 0.25), Y(0) - Y(st.h));
        // 높이 자
        const hy = niceTicks(0, st.h, 5);
        Draw.font(ctx, 10, 500, true); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for (const v of hy.ticks) {
          ctx.strokeStyle = line; ctx.beginPath(); ctx.moveTo(pl - 6, Y(v)); ctx.lineTo(pl, Y(v)); ctx.stroke();
          ctx.fillStyle = muted; ctx.fillText(v + ' m', pl - 9, Y(v));
        }
        // 거리 자
        const hx = niceTicks(0, xMax, W < 500 ? 3 : 7);
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        for (const v of hx.ticks) {
          if (v > xMax) continue;
          ctx.strokeStyle = U.rgba(earth, 0.6); ctx.beginPath(); ctx.moveTo(X(v), Y(0)); ctx.lineTo(X(v), Y(0) + 5); ctx.stroke();
          ctx.fillStyle = muted; ctx.fillText(v === 0 ? '0 m' : String(v), X(v), Y(0) + 8);
        }
        // 이론 궤적
        if (st.v0 > 0) {
          ctx.strokeStyle = U.rgba(phys, 0.25); ctx.setLineDash([3, 5]); ctx.lineWidth = 1.2;
          ctx.beginPath();
          for (let i = 0; i <= 60; i++) { const s = T * i / 60; const px = X(st.v0 * s), py = Y(st.h - 0.5 * st.g * s * s); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
          ctx.stroke(); ctx.setLineDash([]);
        }
        // 섬광 기록
        const nF = Math.floor(t / st.flash + 1e-6);
        for (let i = 0; i <= nF; i++) {
          const s = i * st.flash, ya = Y(st.h - 0.5 * st.g * s * s), xa = X(st.v0 * s);
          if (st.free) {
            ctx.strokeStyle = U.rgba(ink, 0.18); ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
            ctx.beginPath(); ctx.moveTo(X(0), ya); ctx.lineTo(xa, ya); ctx.stroke(); ctx.setLineDash([]);
            ctx.beginPath(); ctx.arc(X(0), ya, br * 0.85, 0, 7); ctx.fillStyle = U.rgba(ink2, 0.3); ctx.fill();
          }
          ctx.beginPath(); ctx.arc(xa, ya, br * 0.85, 0, 7); ctx.fillStyle = U.rgba(phys, 0.32); ctx.fill();
          ctx.strokeStyle = U.rgba(phys, 0.25); ctx.beginPath(); ctx.moveTo(xa, Y(0)); ctx.lineTo(xa, Y(0) - 6); ctx.stroke();
        }
        // 현재 공
        const xa = X(st.v0 * t), ya = Y(Math.max(0, st.h - 0.5 * st.g * t * t)) - (t >= T ? br : 0);
        if (st.free) { ctx.beginPath(); ctx.arc(X(0), ya, br, 0, 7); ctx.fillStyle = ink2; ctx.fill(); Draw.text(ctx, 'B', X(0) - br - 4, ya - br - 2, { size: 11, weight: 700, color: ink2, align: 'right' }); }
        ctx.beginPath(); ctx.arc(xa, ya, br, 0, 7); ctx.fillStyle = phys; ctx.fill();
        Draw.text(ctx, 'A', xa + br + 3, ya - br - 2, { size: 11, weight: 700, color: phys });
        if (st.vec && t < T) {
          const vmax = Math.hypot(st.v0, st.g * T) || 1, sc = Math.min(W, H) * 0.2 / vmax, vy = st.g * t;
          if (st.v0 > 0) { Draw.arrow(ctx, xa, ya, xa + st.v0 * sc, ya, U.rgba(phys, 0.9), 2, 8); Draw.text(ctx, 'vₓ', xa + st.v0 * sc + 4, ya - 4, { size: 11, color: phys, weight: 600 }); }
          if (vy > 0.05) { Draw.arrow(ctx, xa, ya, xa, ya + vy * sc, U.rgba(Theme.v('--bad'), 0.9), 2, 8); Draw.text(ctx, 'v_y', xa + 5, ya + vy * sc, { size: 11, color: Theme.v('--bad'), weight: 600 }); }
          if (st.v0 > 0 && vy > 0.05) Draw.arrow(ctx, xa, ya, xa + st.v0 * sc, ya + vy * sc, U.rgba(ink, 0.8), 2.4, 9);
        }
        if (t >= T - 1e-6) {
          Draw.text(ctx, `착지: ${U.fmt(T, 2)} s, ${U.fmt(R, 1)} m`, Math.min(W - 10, xa + 8), Y(0) - 12, { size: 12, weight: 700, color: ink, align: xa > W * 0.7 ? 'right' : 'left' });
        }
        Draw.text(ctx, `${PLANETS[st.planet][0]} · g = ${st.g} m/s² · 섬광 ${st.flash}초 간격`, 12, 18, { size: 11.5, color: muted, weight: 600 });
      }

      S.loop(dt => {
        if (st.playing) {
          st.t += dt * st.slow;
          if (st.t >= tf()) { st.t = tf(); setPlaying(false); }
          update();
        }
      });
      S.on(document, 'labtheme', () => draw());
      restart();
    },
  });

  function notes() {
    return U.notesHead('이론 노트', '자유 낙하 · 수평으로 던진 물체의 운동 · 다중 섬광 사진 읽기') +
      U.note('자유 낙하 운동', `
        <p>공기 저항이 없을 때 물체에는 중력만 작용해 질량과 관계없이 <strong>중력 가속도 g</strong>로 속력이 일정하게 증가한다 (지구 표면에서 약 9.8 m/s²).</p>
        <div class="formula">v = g t &nbsp;&nbsp;&nbsp; s = ½ g t² &nbsp;&nbsp;&nbsp; 낙하 시간 t = √(2h ÷ g)</div>
        <p>다중 섬광 사진에서 같은 시간 동안 이동한 거리는 1 : 3 : 5 : 7 …처럼 홀수비로 늘어난다.</p>`) +
      U.note('수평으로 던진 물체', `
        <p>수평 방향으로는 힘이 작용하지 않으므로 <strong>등속 직선 운동</strong>을, 연직 방향으로는 중력을 받아 <strong>자유 낙하 운동</strong>을 한다. 두 방향의 운동은 서로 영향을 주지 않는다.</p>
        <div class="formula">x = v₀ t &nbsp;&nbsp;&nbsp; y = h − ½ g t² &nbsp;&nbsp;&nbsp; 경로: y = h − g x² ÷ (2v₀²)</div>
        <p>그래서 같은 높이에서 동시에 출발한 A와 B는 언제나 같은 높이에 있고, 땅에 <strong>동시에</strong> 떨어진다. 던지는 속력은 수평 도달 거리만 바꾼다.</p>`) +
      U.note('다중 섬광 사진 읽기', `
        <ul>
          <li>A의 그림자를 땅에 비추면 간격이 일정하다 → 수평 방향 등속 운동.</li>
          <li>A와 B를 잇는 점선이 수평이다 → 연직 방향 운동이 같다.</li>
          <li>위아래 간격이 점점 넓어진다 → 연직 방향으로 가속된다.</li>
        </ul>`) +
      U.note('생각해 보기', `
        ${U.qa('지구에서 20 m 높이에서 공을 떨어뜨리면 몇 초 뒤에 땅에 닿을까?', 't = √(2 × 20 ÷ 9.8) ≈ 2.02초. 수평으로 몇 m/s로 던져도 이 시간은 같다.')}
        ${U.qa('달에서 같은 실험을 하면 무엇이 달라질까?', '중력 가속도가 지구의 약 1/6이므로 낙하 시간은 약 2.5배 길어지고, 같은 속력으로 던져도 수평 도달 거리가 2.5배 늘어난다.')}
        ${U.qa('무거운 공과 가벼운 공을 같은 높이에서 떨어뜨리면?', '공기 저항이 없다면 가속도가 g로 같아 동시에 떨어진다. 실제로 깃털이 늦게 떨어지는 것은 공기 저항 때문이다.')}`) +
      `<p class="src note full">중력 가속도: 지구 9.8 m/s²(교과서 값), 화성 3.71 m/s², 달 1.62 m/s² (NASA 행성 자료). 공기 저항과 지구 자전 효과는 무시했다.</p>`;
  }
})();
