'use strict';
/* 방사성 붕괴와 절대 연령 */
(() => {
  const ISO = {
    C14: { p: '¹⁴C', d: '¹⁴N', name: '탄소-14', T: 5730, use: '나무, 뼈, 숯 같은 유기물 (약 5만 년 이내)' },
    K40: { p: '⁴⁰K', d: '⁴⁰Ar', name: '칼륨-40', T: 1.25e9, use: '화성암, 화산재' },
    U235: { p: '²³⁵U', d: '²⁰⁷Pb', name: '우라늄-235', T: 7.04e8, use: '오래된 화성암의 지르콘' },
    U238: { p: '²³⁸U', d: '²⁰⁶Pb', name: '우라늄-238', T: 4.468e9, use: '지구와 운석의 나이' },
  };
  const N = 400;
  const fmtY = y => {
    if (y >= 1e8) { const eok = Math.floor(y / 1e8), man = Math.round((y - eok * 1e8) / 1e6) * 100; return `${eok}억${man ? ' ' + man + '만' : ''} 년`; }
    if (y >= 1e4) return `${Math.round(y / 1e4).toLocaleString('ko-KR')}만 년`;
    return `${Math.round(y).toLocaleString('ko-KR')}년`;
  };

  registerModule({
    id: 'decay', subject: 'earth', title: '방사성 붕괴와 절대 연령', short: '방사성 연대',
    unit: '심화 · 지구과학Ⅰ 연계',
    lead: '방사성 원소는 일정한 비율로 붕괴해 다른 원소로 바뀝니다. 원자 400개가 붕괴하는 모습을 관찰하고, 남은 모원소의 비율로 암석과 화석의 나이를 계산합니다.',
    desc: '반감기, 확률적 붕괴, 모원소·자원소 비율, 절대 연령 계산',
    icon: '<path d="M6 3h12M6 21h12"/><path d="M7 3c0 6 10 6 10 9s-10 3-10 9"/><path d="M17 3c0 6-10 6-10 9s10 3 10 9"/>',
    mount(root, S) {
      const st = { iso: 'C14', t: 0, playing: false, speed: 0.5 };
      root.innerHTML = `
      <div class="lab">
        <aside class="panel controls" aria-label="실험 조건">
          <h2 class="ph">방사성 동위 원소</h2>
          ${Ctl.seg('dc-iso', '', Object.entries(ISO).map(([k, v]) => [k, `${v.p} → ${v.d}`]), st.iso)}
          <p class="ctl-hint" id="dc-use"></p>
          ${Ctl.seg('dc-sp', '빠르기 (1초에 지나는 반감기 수)', [['0.25', '0.25번'], ['0.5', '0.5번'], ['1', '1번']], '0.5')}
          <div class="btn-row">
            <button class="btn primary" id="dc-play" type="button">${ICON.play}<span>붕괴 시작</span></button>
            <button class="btn ghost" id="dc-reset" type="button">${ICON.reset}<span>처음으로</span></button>
          </div>
          <hr>
          <h2 class="ph">나이 계산기</h2>
          ${Ctl.range('dc-pct', '시료에 남은 모원소 비율', { min: 1, max: 100, step: 1, value: 25 })}
          <div class="readouts" id="dc-calc" style="grid-template-columns:1fr"></div>
        </aside>
        <div class="stack">
          <div class="panel stage-panel">
            <canvas class="stage" id="dc-cv" style="aspect-ratio: 16 / 10" aria-label="모원소와 자원소 원자 400개"></canvas>
            <div class="stage-key right" id="dc-key"></div>
          </div>
          <div class="meters">
            <div class="meter"><span class="lbl">경과 시간</span><b id="dc-time">—</b><span class="sub" id="dc-hl"></span></div>
            <div class="meter"><span class="lbl">남은 모원소</span><b id="dc-left">—</b><span class="sub" id="dc-theory"></span></div>
            <div class="meter"><span class="lbl">자원소 ÷ 모원소</span><b id="dc-ratio">—</b><span class="sub">D ÷ P</span></div>
          </div>
        </div>
      </div>
      <div class="panel"><h3 class="ch">모원소와 자원소의 양 – 시간</h3><div id="dc-c"></div></div>
      <section class="notes">${notes()}</section>`;
      const $ = s => root.querySelector(s);
      const stg = S.stage($('#dc-cv'), () => draw());
      let atoms = new Uint8Array(N), when = new Float32Array(N), hist = [[0, N]];
      const reset = () => { atoms = new Uint8Array(N); when = new Float32Array(N).fill(-1); st.t = 0; hist = [[0, N]]; setPlaying(false); update(true); };
      bindSeg(root, 'dc-iso', v => { st.iso = v; reset(); calc(); });
      bindSeg(root, 'dc-sp', v => { st.speed = +v; });
      bindRange(root, 'dc-pct', { unit: '%' }, () => calc());
      const playBtn = $('#dc-play');
      function setPlaying(p) { st.playing = p; playBtn.innerHTML = p ? `${ICON.pause}<span>멈춤</span>` : `${ICON.play}<span>붕괴 시작</span>`; }
      playBtn.addEventListener('click', () => { if (st.t >= 6) reset(); setPlaying(!st.playing); });
      $('#dc-reset').addEventListener('click', reset);
      let lastChart = 0;

      function calc() {
        const I = ISO[st.iso], p = +$('#dc-pct').value / 100;
        const n = Math.log2(1 / p), age = n * I.T;
        const tooOld = age > 4.6e9;
        $('#dc-calc').innerHTML = [
          ['지난 반감기 수', `log₂(1 ÷ ${U.fmt(p, 2)}) = ${U.fmt(n, 2)}번`],
          ['절대 연령', `${U.fmt(n, 2)} × ${fmtY(I.T)} ≈ ${fmtY(age)}`],
        ].map(([a, b]) => `<div class="ro"><span>${a}</span><b>${b}</b></div>`).join('') +
          (tooOld ? '<p class="ctl-hint" style="color:var(--bad)">지구 나이(약 46억 년)보다 많다. 이 동위 원소로는 이렇게 적게 남은 시료가 지구에 있을 수 없다.</p>' : st.iso === 'C14' && age > 5e4 ? '<p class="ctl-hint">탄소-14는 약 5만 년이 넘으면 남은 양이 너무 적어 측정하기 어렵다.</p>' : '');
      }
      function update(force) {
        const I = ISO[st.iso], left = atoms.reduce((t, a) => t + (a ? 0 : 1), 0);
        $('#dc-use').textContent = `반감기 ${fmtY(I.T)} · 쓰임: ${I.use}`;
        $('#dc-time').textContent = fmtY(st.t * I.T);
        $('#dc-hl').textContent = `반감기 ${U.fmt(st.t, 2)}번`;
        $('#dc-left').textContent = `${left}개 (${U.fmt(left / N * 100, 1)}%)`;
        $('#dc-theory').textContent = `이론값 ${U.fmt(100 * Math.pow(0.5, st.t), 1)}%`;
        $('#dc-ratio').textContent = left ? U.fmt((N - left) / left, 2) : '∞';
        $('#dc-key').innerHTML = `<span><i style="background:var(--earth)"></i>${I.p} 모원소</span><span><i style="background:var(--muted)"></i>${I.d} 자원소</span>`;
        const now = performance.now();
        if (force || now - lastChart > 120) {
          lastChart = now;
          const xs = Array.from({ length: 121 }, (_, i) => i * 6 / 120);
          chart($('#dc-c'), {
            x: [0, 6], y: [0, N], yTicks: [0, 50, 100, 200, 300, 400], height: 250, xLabel: `시간 (반감기 수, 반감기 1번 = ${fmtY(I.T)})`, yLabel: '원자 수', cursor: st.t,
            xTicks: [0, 1, 2, 3, 4, 5, 6], xFmt: v => `반감기 ${U.fmt(v, 2)}번 (${fmtY(v * I.T)})`, yFmt: v => Math.round(v) + '개',
            series: [
              { name: '모원소 (이론)', color: 'var(--earth)', dash: '5 4', data: xs.map(x => [x, N * Math.pow(0.5, x)]) },
              { name: '자원소 (이론)', color: 'var(--muted)', dash: '5 4', data: xs.map(x => [x, N - N * Math.pow(0.5, x)]) },
              { name: '모원소 (이번 실험)', color: 'var(--earth)', width: 2.5, step: true, data: hist.concat([[st.t, left]]) },
            ],
            points: [1, 2, 3].map(k => ({ x: k, y: N / 2 ** k, color: 'var(--earth)', r: 4, label: `${100 / 2 ** k}%`, dy: -8 })),
          });
        }
        draw();
      }
      function draw() {
        const { ctx, W, H } = stg;
        if (!W) return;
        const earth = Theme.v('--earth'), muted = Theme.v('--muted'), panel = Theme.v('--panel');
        ctx.clearRect(0, 0, W, H);
        const cols = 25, rows = 16, pad = 18;
        const cw = (W - pad * 2) / cols, ch = (H - pad * 2 - 14) / rows, r = Math.min(cw, ch) * 0.36;
        const nowS = performance.now() / 1000;
        for (let i = 0; i < N; i++) {
          const x = pad + (i % cols + 0.5) * cw, y = pad + 14 + (Math.floor(i / cols) + 0.5) * ch;
          if (atoms[i]) {
            const age = nowS - when[i];
            if (age < 0.6) { ctx.beginPath(); ctx.arc(x, y, r * (1 + age * 2.5), 0, 7); ctx.strokeStyle = U.rgba(earth, 0.7 - age); ctx.lineWidth = 1.5; ctx.stroke(); }
            ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, 7); ctx.fillStyle = U.rgba(muted, 0.55); ctx.fill();
          } else {
            ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = earth; ctx.fill();
            ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.28, 0, 7); ctx.fillStyle = U.rgba(panel, 0.45); ctx.fill();
          }
        }
        Draw.text(ctx, '원자 400개 · 각 원자가 언제 붕괴할지는 알 수 없지만, 전체의 절반이 붕괴하는 시간은 일정하다', pad, 16, { size: 11.5, color: muted, weight: 600 });
      }
      S.loop(dt => {
        if (st.playing) {
          const dh = dt * st.speed;
          const p = 1 - Math.pow(0.5, dh), nowS = performance.now() / 1000;
          for (let i = 0; i < N; i++) if (!atoms[i] && Math.random() < p) { atoms[i] = 1; when[i] = nowS; }
          st.t += dh;
          const left = atoms.reduce((t, a) => t + (a ? 0 : 1), 0);
          if (!hist.length || hist[hist.length - 1][1] !== left) hist.push([st.t, left]);
          if (st.t >= 6) { st.t = 6; setPlaying(false); }
          update();
        } else draw();
      });
      reset(); calc();
    },
  });

  function notes() {
    return U.notesHead('이론 노트', '방사성 붕괴 · 반감기 · 절대 연령 측정') +
      U.note('방사성 붕괴와 반감기', `
        <p>불안정한 원자핵(모원소)은 방사선을 내며 안정한 원자핵(자원소)으로 바뀐다. 개별 원자가 언제 붕괴할지는 확률적이지만, 원자가 많으면 처음 양의 절반이 붕괴하는 시간이 일정하다. 이 시간이 <strong>반감기</strong>이다.</p>
        <div class="formula">N = N₀ × (1/2)^(t ÷ T) &nbsp;&nbsp;→&nbsp;&nbsp; t = T × log₂(N₀ ÷ N)</div>
        <p>반감기는 온도, 압력 같은 바깥 조건에 거의 영향을 받지 않아 시계처럼 쓸 수 있다.</p>`) +
      U.note('절대 연령과 상대 연령', `
        <p><strong>상대 연령</strong>은 지층 누중, 관입, 부정합 같은 원리로 사건의 선후 관계만 정한다. <strong>절대 연령</strong>은 방사성 동위 원소의 붕괴를 이용해 몇 년 전인지 수치로 나타낸다.</p>
        <p>예: 화성암 속 ⁴⁰K가 처음 양의 25%만 남았다면 반감기 2번이 지난 것이므로 약 2 × 12.5억 = 25억 년 전에 굳은 암석이다.</p>`) +
      U.note('동위 원소 고르기', `
        <div class="tbl"><table class="data"><thead><tr><th>모원소 → 자원소</th><th class="num">반감기</th><th>쓰임</th></tr></thead><tbody>
          ${Object.values(ISO).map(i => `<tr><td>${i.p} → ${i.d}</td><td class="num">${fmtY(i.T)}</td><td>${i.use}</td></tr>`).join('')}
        </tbody></table></div>
        <p>측정하려는 시간과 비슷한 반감기를 가진 원소를 골라야 정확하다.</p>`) +
      U.note('생각해 보기', `
        ${U.qa('반감기 3번이 지나면 모원소는 처음의 몇 %가 남을까?', '(1/2)³ = 1/8, 즉 12.5%가 남고 자원소 : 모원소 = 7 : 1이 된다.')}
        ${U.qa('공룡 뼈의 나이를 탄소-14로 잴 수 없는 까닭은?', '공룡은 6600만 년보다 전에 살았는데, 탄소-14의 반감기는 5730년이라 1만 번 넘게 반으로 줄어 남은 양이 사실상 0이기 때문이다. 대신 화석 위아래 화산재층을 칼륨–아르곤법 등으로 측정한다.')}`) +
      `<p class="src note full">반감기: ¹⁴C 5730년, ⁴⁰K 12.5억 년(실제로는 약 11%만 ⁴⁰Ar로 붕괴), ²³⁵U 7.04억 년, ²³⁸U 44.68억 년. 이 내용은 지구과학Ⅰ과 연계된 심화 내용이다.</p>`;
  }
})();
