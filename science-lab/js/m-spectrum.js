'use strict';
/* 스펙트럼과 우주의 원소 — 선 스펙트럼, 수소 에너지 준위, 별의 스펙트럼 분석 */
(() => {
  // 공기 중 파장(nm), 상대 세기 — NIST Atomic Spectra Database의 대표 가시광선
  const LINES = {
    H: { name: '수소', lines: [[656.28, 1], [486.13, .6], [434.05, .35], [410.17, .25], [397.01, .15]] },
    He: { name: '헬륨', lines: [[706.52, .3], [667.82, .5], [587.56, 1], [501.57, .4], [492.19, .2], [471.31, .25], [447.15, .5]] },
    Na: { name: '나트륨', lines: [[588.995, 1], [589.592, .8], [568.82, .15], [615.42, .12], [498.28, .08]] },
    Ca: { name: '칼슘', lines: [[393.37, 1], [396.85, .9], [422.67, .6], [445.48, .25]] },
    Mg: { name: '마그네슘', lines: [[516.73, .5], [517.27, .7], [518.36, 1], [470.30, .2], [552.84, .2]] },
    Fe: { name: '철', lines: [[404.58, .3], [406.36, .3], [438.35, .6], [440.48, .5], [495.76, .4], [527.04, .6], [532.80, .5], [537.15, .3]] },
    Hg: { name: '수은', lines: [[404.66, .5], [407.78, .2], [435.83, 1], [546.07, 1], [576.96, .6], [579.07, .6]] },
    Ne: { name: '네온', lines: [[585.25, .7], [588.19, .4], [594.48, .5], [603.0, .3], [607.43, .5], [609.62, .5], [614.31, .6], [616.36, .4], [621.73, .4], [626.65, .5], [633.44, .6], [638.3, .6], [640.22, 1], [650.65, .7], [659.9, .4], [692.95, .6], [703.24, .7]] },
    Li: { name: '리튬', lines: [[670.78, 1], [610.36, .4], [460.29, .15]] },
  };
  const L0 = 380, L1 = 750, C = 299792.458, H0 = 70;
  function wl2rgb(l) {
    let r = 0, g = 0, b = 0;
    if (l >= 380 && l < 440) { r = -(l - 440) / 60; b = 1; }
    else if (l >= 440 && l < 490) { g = (l - 440) / 50; b = 1; }
    else if (l >= 490 && l < 510) { g = 1; b = -(l - 510) / 20; }
    else if (l >= 510 && l < 580) { r = (l - 510) / 70; g = 1; }
    else if (l >= 580 && l < 645) { r = 1; g = -(l - 645) / 65; }
    else if (l >= 645 && l <= 780) { r = 1; }
    const f = l < 420 ? 0.3 + 0.7 * (l - 380) / 40 : l > 700 ? Math.max(0, 0.3 + 0.7 * (780 - l) / 80) : 1;
    return [r, g, b].map(c => Math.round(255 * Math.pow(Math.max(0, c * f), 0.8)));
  }
  // 스펙트럼 띠 그리기
  function strip(ctx, x, y, w, h, mode, els, z = 0, highlight = null) {
    const px = l => x + (l - L0) / (L1 - L0) * w;
    if (mode === 'emission') { ctx.fillStyle = '#05070a'; ctx.fillRect(x, y, w, h); }
    else {
      for (let i = 0; i < w; i++) { const [r, g, b] = wl2rgb(L0 + (L1 - L0) * i / w); ctx.fillStyle = `rgb(${r},${g},${b})`; ctx.fillRect(x + i, y, 1.2, h); }
    }
    if (mode !== 'continuous') {
      for (const e of els) for (const [l, a] of LINES[e].lines) {
        const lz = l * (1 + z);
        if (lz < L0 || lz > L1) continue;
        const X = px(lz);
        if (mode === 'emission') {
          const [r, g, b] = wl2rgb(lz);
          ctx.fillStyle = `rgba(${r},${g},${b},${0.35 + 0.65 * a})`; ctx.fillRect(X - 1.2, y, 2.4, h);
          ctx.fillStyle = `rgba(${r},${g},${b},${0.25 * a})`; ctx.fillRect(X - 3, y, 6, h);
        } else {
          ctx.fillStyle = `rgba(0,0,0,${0.55 + 0.4 * a})`; ctx.fillRect(X - 1.1, y, 2.2, h);
        }
      }
    }
    if (highlight != null) { const X = px(highlight * (1 + z)); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.strokeRect(X - 5, y - 3, 10, h + 6); ctx.setLineDash([]); }
    ctx.strokeStyle = U.rgba(Theme.v('--ink'), 0.3); ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
  }
  function axis(ctx, x, y, w) {
    const muted = Theme.v('--muted');
    Draw.font(ctx, 10, 500, true); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let l = 400; l <= 750; l += 50) {
      const X = x + (l - L0) / (L1 - L0) * w;
      ctx.strokeStyle = U.rgba(muted, 0.8); ctx.beginPath(); ctx.moveTo(X, y); ctx.lineTo(X, y + 5); ctx.stroke();
      ctx.fillStyle = muted; ctx.fillText(String(l), X, y + 7);
    }
    ctx.textAlign = 'right'; ctx.fillText('nm', x + w, y + 20);
  }

  registerModule({
    id: 'spectrum', subject: 'earth', title: '스펙트럼과 우주의 원소', short: '스펙트럼',
    unit: '통합과학1 · 물질과 규칙성',
    lead: '원소마다 고유한 선 스펙트럼이 있어 멀리 있는 별의 빛만으로도 그 별을 이루는 원소를 알 수 있습니다. 방출·흡수 스펙트럼, 수소의 에너지 준위, 별빛의 적색 편이를 탐구합니다.',
    desc: '연속·방출·흡수 스펙트럼, 수소 에너지 준위, 별의 원소 찾기, 적색 편이와 빅뱅',
    icon: '<rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="M7.5 6v12M10 6v12M15 6v12M17.2 6v12"/>',
    mount(root, S) {
      tabs(root, [
        { id: 'lines', label: '원소의 선 스펙트럼', mount: mountLines },
        { id: 'hydrogen', label: '수소 원자의 에너지 준위', mount: mountHydrogen },
        { id: 'star', label: '별의 스펙트럼 분석', mount: mountStar },
      ], S);
    },
  });

  function mountLines(root, S) {
    const st = { mode: 'emission', els: new Set(['H']), z: 0 };
    root.innerHTML = `
      <div class="lab">
        <aside class="panel controls" aria-label="실험 조건">
          <h2 class="ph">분광기 설정</h2>
          ${Ctl.seg('sp-mode', '스펙트럼 종류', [['continuous', '연속'], ['emission', '방출'], ['absorption', '흡수']], st.mode)}
          <div class="ctl"><span class="ctl-label">원소 (여러 개 선택 가능)</span><div class="chips" id="sp-els">${Object.entries(LINES).map(([k, v]) => `<button type="button" class="chip" data-e="${k}" aria-pressed="${st.els.has(k)}">${k} ${v.name}</button>`).join('')}</div></div>
          <hr>
          ${Ctl.range('sp-z', '적색 편이 z (광원이 멀어지는 정도)', { min: 0, max: 0.06, step: 0.001, value: 0 })}
          <p class="ctl-hint" id="sp-zinfo"></p>
        </aside>
        <div class="stack">
          <div class="panel stage-panel"><canvas class="stage" id="sp-cv" style="aspect-ratio: 16 / 9" aria-label="분광기와 스펙트럼"></canvas></div>
          <div class="panel"><h3 class="ch">선 목록</h3><div class="tbl" id="sp-tbl"></div></div>
        </div>
      </div>
      <section class="notes">${notesLines()}</section>`;
    const $ = s => root.querySelector(s);
    const stg = S.stage($('#sp-cv'), () => draw());
    bindSeg(root, 'sp-mode', v => { st.mode = v; draw(); info(); });
    bindRange(root, 'sp-z', { digits: 3 }, v => { st.z = v; draw(); info(); });
    $('#sp-els').addEventListener('click', e => {
      const b = e.target.closest('[data-e]'); if (!b) return;
      const k = b.dataset.e;
      if (st.els.has(k)) st.els.delete(k); else st.els.add(k);
      b.setAttribute('aria-pressed', String(st.els.has(k)));
      draw(); info();
    });
    function info() {
      const v = C * ((1 + st.z) ** 2 - 1) / ((1 + st.z) ** 2 + 1);
      $('#sp-zinfo').textContent = st.z === 0 ? '광원이 정지해 있으면 선의 위치가 실험실 값과 같다.' :
        `파장이 ${U.fmt(st.z * 100, 1)}% 길어짐 → 멀어지는 속도 약 ${Math.round(v).toLocaleString('ko-KR')} km/s, 허블 법칙(H₀ = ${H0} km/s/Mpc)으로 약 ${Math.round(v / H0).toLocaleString('ko-KR')} Mpc (${U.fmt(v / H0 * 0.0326, 1)}억 광년)`;
      const rows = [];
      for (const k of st.els) for (const [l] of LINES[k].lines) rows.push([k, l]);
      rows.sort((a, b) => a[1] - b[1]);
      $('#sp-tbl').innerHTML = st.mode === 'continuous' ? '<p class="ctl-hint">연속 스펙트럼에는 선이 없다. 뜨거운 고체나 짙은 기체(별의 내부)가 모든 파장의 빛을 낸다.</p>' : rows.length ? `<table class="data"><thead><tr><th>원소</th><th class="num">실험실 파장 (nm)</th>${st.z ? '<th class="num">관측 파장 (nm)</th>' : ''}<th>색</th></tr></thead><tbody>${rows.map(([k, l]) => {
        const [r, g, b] = wl2rgb(l * (1 + st.z));
        return `<tr><td>${k} ${LINES[k].name}</td><td class="num">${U.fmt(l, 2)}</td>${st.z ? `<td class="num">${U.fmt(l * (1 + st.z), 2)}</td>` : ''}<td><i style="display:inline-block;width:28px;height:10px;border-radius:2px;background:rgb(${r},${g},${b})"></i></td></tr>`;
      }).join('')}</tbody></table>` : '<p class="ctl-hint">원소를 하나 이상 고르세요.</p>';
    }
    function draw() {
      const { ctx, W, H } = stg;
      if (!W) return;
      const ink = Theme.v('--ink'), muted = Theme.v('--muted'), glass = Theme.v('--glass');
      ctx.clearRect(0, 0, W, H);
      // 장치 그림
      const sy = H * 0.2, els = [...st.els];
      const lampX = W * 0.08, cellX = W * 0.3, prX = W * 0.5;
      if (st.mode === 'emission') {
        const [r, g, b] = els.length ? wl2rgb(LINES[els[0]].lines[0][0]) : [200, 200, 200];
        ctx.fillStyle = `rgba(${r},${g},${b},0.35)`; ctx.beginPath(); ctx.roundRect(lampX - 8, sy - 16, W * 0.2, 32, 16); ctx.fill();
        ctx.strokeStyle = glass; ctx.lineWidth = 1.5; ctx.stroke();
        Draw.text(ctx, '방전관 (뜨거운 기체)', lampX - 6, sy + 34, { size: 11, color: muted });
      } else {
        ctx.fillStyle = 'rgba(255, 220, 140, 0.9)'; ctx.beginPath(); ctx.arc(lampX + 10, sy, 14, 0, 7); ctx.fill();
        Draw.text(ctx, '백열등', lampX - 6, sy + 34, { size: 11, color: muted });
        if (st.mode === 'absorption') {
          ctx.strokeStyle = glass; ctx.lineWidth = 1.5; ctx.strokeRect(cellX - 26, sy - 18, 52, 36);
          ctx.fillStyle = U.rgba(glass, 0.15); ctx.fillRect(cellX - 26, sy - 18, 52, 36);
          Draw.text(ctx, '차가운 기체', cellX, sy + 34, { size: 11, color: muted, align: 'center' });
        }
      }
      ctx.strokeStyle = U.rgba(ink, 0.35); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lampX + 30, sy); ctx.lineTo(prX - 18, sy); ctx.stroke();
      ctx.fillStyle = U.rgba(glass, 0.3); ctx.strokeStyle = glass; ctx.beginPath(); ctx.moveTo(prX, sy - 26); ctx.lineTo(prX + 24, sy + 18); ctx.lineTo(prX - 24, sy + 18); ctx.closePath(); ctx.fill(); ctx.stroke();
      Draw.text(ctx, '프리즘', prX, sy + 34, { size: 11, color: muted, align: 'center' });
      for (let i = 0; i < 7; i++) { const [r, g, b] = wl2rgb(400 + i * 50); ctx.strokeStyle = `rgba(${r},${g},${b},0.6)`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(prX + 14, sy); ctx.lineTo(W * 0.9, sy - 30 + i * 10); ctx.stroke(); }
      Draw.text(ctx, '스크린', W * 0.9, sy + 34, { size: 11, color: muted, align: 'center' });
      // 스펙트럼
      const x = 30, w = W - 60, h = Math.max(38, H * (st.z > 0 && st.mode !== 'continuous' ? 0.2 : 0.3));
      const y1 = H * 0.44;
      Draw.text(ctx, st.mode === 'continuous' ? '연속 스펙트럼' : st.mode === 'emission' ? '방출 스펙트럼 (밝은 선)' : '흡수 스펙트럼 (검은 선)', x, y1 - 8, { size: 12, weight: 600, color: ink });
      strip(ctx, x, y1, w, h, st.mode, els, st.z);
      if (st.z > 0 && st.mode !== 'continuous') {
        const y2 = y1 + h + 32;
        Draw.text(ctx, '실험실 기준 (z = 0)', x, y2 - 8, { size: 12, weight: 600, color: muted });
        strip(ctx, x, y2, w, h * 0.55, st.mode, els, 0);
        ctx.strokeStyle = U.rgba(ink, 0.35); ctx.setLineDash([2, 3]); ctx.lineWidth = 1;
        for (const e of els) for (const [l] of LINES[e].lines) {
          const a = x + (l - L0) / (L1 - L0) * w, b = x + (l * (1 + st.z) - L0) / (L1 - L0) * w;
          if (l * (1 + st.z) > L1) continue;
          ctx.beginPath(); ctx.moveTo(b, y1 + h); ctx.lineTo(a, y2); ctx.stroke();
        }
        ctx.setLineDash([]);
        axis(ctx, x, y2 + h * 0.55 + 2, w);
      } else axis(ctx, x, y1 + h + 2, w);
    }
    S.on(document, 'labtheme', () => draw());
    info();
  }

  function mountHydrogen(root, S) {
    const RH = 1.0967758e7; // 수소의 뤼드베리 상수 (m⁻¹)
    const st = { n: 3 };
    const E = n => -13.6 / (n * n);
    const lamVac = (ni, nf) => 1e9 / (RH * (1 / (nf * nf) - 1 / (ni * ni)));
    const lamAir = (ni, nf) => lamVac(ni, nf) / 1.000277;
    root.innerHTML = `
      <div class="lab">
        <aside class="panel controls">
          <h2 class="ph">발머 계열 (가시광선)</h2>
          ${Ctl.seg('hy-n', '처음 전자 껍질 n → 2', [['3', 'n = 3'], ['4', 'n = 4'], ['5', 'n = 5'], ['6', 'n = 6'], ['7', 'n = 7']], '3')}
          <div class="readouts" id="hy-ro" style="grid-template-columns:1fr 1fr"></div>
          <div class="formula" id="hy-f" style="white-space:normal"></div>
          <p class="ctl-hint">전자가 바깥 껍질에서 안쪽 껍질로 떨어질 때 두 에너지 준위의 차이만큼 빛(광자)을 낸다. 에너지 준위가 띄엄띄엄(불연속) 있기 때문에 선 스펙트럼이 나타난다.</p>
        </aside>
        <div class="stack">
          <div class="panel stage-panel"><canvas class="stage" id="hy-cv" style="aspect-ratio: 16 / 11" aria-label="수소 원자의 에너지 준위와 전자 전이"></canvas></div>
        </div>
      </div>
      <section class="notes">${notesHydrogen()}</section>`;
    const $ = s => root.querySelector(s);
    const stg = S.stage($('#hy-cv'), () => {});
    let t0 = performance.now();
    bindSeg(root, 'hy-n', v => { st.n = +v; t0 = performance.now(); info(); });
    function info() {
      const l = lamAir(st.n, 2), dE = E(2) - E(st.n);
      $('#hy-ro').innerHTML = [['방출 에너지', U.fmt(-dE, 3) + ' eV'], ['파장 (공기 중)', U.fmt(l, 1) + ' nm']].map(([a, b]) => `<div class="ro"><span>${a}</span><b>${b}</b></div>`).join('');
      $('#hy-f').innerHTML = `1/λ = R (1/2² − 1/${st.n}²)<br>= 1.097×10⁷ × ${U.fmt(1 / 4 - 1 / (st.n * st.n), 4)} m⁻¹<br>λ ≈ ${U.fmt(lamVac(st.n, 2), 1)} nm (진공)`;
    }
    S.loop(() => {
      const { ctx, W, H } = stg;
      if (!W) return;
      const ink = Theme.v('--ink'), muted = Theme.v('--muted'), line = Theme.v('--line-2');
      ctx.clearRect(0, 0, W, H);
      const top = 26, bot = H * 0.62, left = 70, right = W - 20;
      const Y = e => top + (0 - e) / 13.6 * (bot - top);
      for (let n = 1; n <= 7; n++) {
        const y = Y(E(n));
        ctx.strokeStyle = n === 2 ? U.rgba(ink, 0.7) : line; ctx.lineWidth = n === 2 ? 2 : 1.2;
        ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
        if (n <= 4 || n === 7) Draw.text(ctx, `n=${n}  ${U.fmt(E(n), 2)} eV`, left - 6, y + 4, { size: 10.5, color: muted, align: 'right', data: true });
      }
      Draw.text(ctx, 'n=∞  0 eV', left - 6, Y(0) + 4, { size: 10.5, color: muted, align: 'right', data: true });
      ctx.setLineDash([3, 4]); ctx.strokeStyle = line; ctx.beginPath(); ctx.moveTo(left, Y(0)); ctx.lineTo(right, Y(0)); ctx.stroke(); ctx.setLineDash([]);
      // 전이 화살표
      const groups = [[1, '라이먼 계열 (자외선)', 2], [2, '발머 계열 (가시광선)', 3], [3, '파셴 계열 (적외선)', 4]];
      const colW = (right - left) / 3;
      groups.forEach(([nf, label], gi) => {
        const x0 = left + colW * gi + 20;
        Draw.text(ctx, label, x0 - 6, bot + 18, { size: 11.5, weight: 600, color: nf === 2 ? ink : muted });
        for (let ni = nf + 1, k = 0; ni <= 7; ni++, k++) {
          const x = x0 + k * Math.min(22, (colW - 40) / 5);
          const l = lamAir(ni, nf);
          const vis = l >= 380 && l <= 750;
          const [r, g, b] = vis ? wl2rgb(l) : [0, 0, 0];
          const sel = nf === 2 && ni === st.n;
          const col = vis ? `rgb(${r},${g},${b})` : U.rgba(ink, 0.3);
          Draw.arrow(ctx, x, Y(E(ni)), x, Y(E(nf)) - 1, col, sel ? 3.5 : 1.6, sel ? 10 : 6);
        }
      });
      // 광자
      const p = ((performance.now() - t0) / 1600) % 1;
      const l = lamAir(st.n, 2), [r, g, b] = wl2rgb(l);
      const sx = left + colW + 20 + (st.n - 3) * Math.min(22, (colW - 40) / 5), sy = Y(E(2));
      ctx.strokeStyle = `rgb(${r},${g},${b})`; ctx.lineWidth = 2; ctx.beginPath();
      for (let i = 0; i <= 40; i++) { const xx = sx + 10 + i * 3 * p * 1.4, yy = sy - 6 + Math.sin(i * 0.9) * 5; i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
      ctx.stroke();
      // 수소 방출 스펙트럼
      const yS = H * 0.78, hS = H * 0.1;
      Draw.text(ctx, '수소의 방출 스펙트럼 (발머 계열)', 30, yS - 8, { size: 12, weight: 600, color: ink });
      strip(ctx, 30, yS, W - 60, hS, 'emission', ['H'], 0, l);
      axis(ctx, 30, yS + hS + 2, W - 60);
    });
    info();
  }

  function mountStar(root, S) {
    const POOL = ['H', 'He', 'Na', 'Ca', 'Mg', 'Fe'];
    const st = { star: [], guess: new Set(), checked: false, name: '', round: 0 };
    root.innerHTML = `
      <div class="panel">
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center">
          <div><h3 class="ch" style="margin:0" id="st-name"></h3><p class="ch-sub" style="margin:2px 0 0">별빛이 별의 대기를 지나며 생긴 흡수선을 아래 원소들의 방출선과 비교해 이 별에 있는 원소를 모두 찾으세요.</p></div>
          <div class="btn-row"><button class="btn" id="st-sun" type="button">태양 스펙트럼 보기</button><button class="btn primary" id="st-new" type="button">새 별 관측</button></div>
        </div>
        <canvas class="stage" id="st-cv" style="aspect-ratio: 16 / 9;margin-top:10px;border-radius:10px" aria-label="별의 흡수 스펙트럼과 원소별 방출 스펙트럼"></canvas>
      </div>
      <div class="panel controls">
        <div class="ctl"><span class="ctl-label">이 별에 있는 원소</span><div class="chips" id="st-g">${POOL.map(k => `<button type="button" class="chip" data-e="${k}" aria-pressed="false">${k} ${LINES[k].name}</button>`).join('')}</div></div>
        <div class="btn-row"><button class="btn primary" id="st-check" type="button">확인하기</button><span id="st-res" style="font-size:14px"></span></div>
      </div>
      <section class="notes">${notesStar()}</section>`;
    const $ = s => root.querySelector(s);
    const stg = S.stage($('#st-cv'), () => draw());
    function newStar(sun) {
      st.round++;
      if (sun) { st.star = ['H', 'Na', 'Ca', 'Mg', 'Fe']; st.name = '태양 (G형 별): 프라운호퍼선'; }
      else {
        const rnd = U.rng(Date.now() % 100000 + st.round);
        const pick = POOL.filter(() => rnd() < 0.45);
        if (!pick.includes('H') && rnd() < 0.8) pick.push('H');
        while (pick.length < 2) { const k = POOL[Math.floor(rnd() * POOL.length)]; if (!pick.includes(k)) pick.push(k); }
        st.star = pick; st.name = `관측 대상: 별 ${String.fromCharCode(65 + (st.round % 26))}-${100 + st.round}`;
      }
      st.guess.clear(); st.checked = false;
      root.querySelectorAll('#st-g [data-e]').forEach(b => b.setAttribute('aria-pressed', 'false'));
      $('#st-name').textContent = st.name; $('#st-res').textContent = '';
      draw();
    }
    $('#st-new').addEventListener('click', () => newStar(false));
    $('#st-sun').addEventListener('click', () => newStar(true));
    $('#st-g').addEventListener('click', e => {
      const b = e.target.closest('[data-e]'); if (!b) return;
      const k = b.dataset.e; if (st.guess.has(k)) st.guess.delete(k); else st.guess.add(k);
      b.setAttribute('aria-pressed', String(st.guess.has(k)));
    });
    $('#st-check').addEventListener('click', () => {
      const ok = st.star.length === st.guess.size && st.star.every(k => st.guess.has(k));
      const miss = st.star.filter(k => !st.guess.has(k)), extra = [...st.guess].filter(k => !st.star.includes(k));
      $('#st-res').innerHTML = ok ? `<span class="badge good">정답</span> 이 별에는 ${st.star.map(k => LINES[k].name).join(', ')}이(가) 있다.`
        : `<span class="badge bad">다시 보기</span> ${miss.length ? `빠진 원소 ${miss.length}개` : ''}${miss.length && extra.length ? ', ' : ''}${extra.length ? `없는 원소 ${extra.length}개 포함` : ''}. 흡수선과 방출선의 위치를 하나씩 맞대어 보자.`;
      st.checked = true; draw();
    });
    function draw() {
      const { ctx, W, H } = stg;
      if (!W) return;
      const ink = Theme.v('--ink'), muted = Theme.v('--muted');
      ctx.clearRect(0, 0, W, H);
      const lx = Math.min(120, W * 0.2), x = lx, w = W - lx - 16;
      const rows = POOL.length + 1, gap = 8, h = (H - 40 - gap * rows) / rows;
      Draw.text(ctx, '별빛', 8, 16 + h / 2 + 4, { size: 12.5, weight: 700, color: ink });
      strip(ctx, x, 16, w, h, 'absorption', st.star, 0);
      POOL.forEach((k, i) => {
        const y = 16 + (h + gap) * (i + 1) + 6;
        const inStar = st.checked && st.star.includes(k);
        Draw.text(ctx, `${k} ${LINES[k].name}`, 8, y + h / 2 + 4, { size: 12, weight: inStar ? 700 : 500, color: inStar ? Theme.v('--good') : muted });
        strip(ctx, x, y, w, h * 0.8, 'emission', [k], 0);
      });
      axis(ctx, x, H - 22, w);
    }
    S.on(document, 'labtheme', () => draw());
    newStar(false);
  }

  function notesLines() {
    return U.notesHead('이론 노트', '스펙트럼의 종류 · 원소의 지문 · 빅뱅의 증거') +
      U.note('스펙트럼의 세 종류', `
        <ul><li><strong>연속 스펙트럼</strong>: 뜨거운 고체·액체나 밀도가 큰 기체가 내는 빛. 모든 색이 끊김 없이 이어진다 (백열등, 햇빛).</li>
        <li><strong>방출 스펙트럼</strong>: 뜨겁고 밀도가 낮은 기체가 내는 빛. 특정 파장에서만 밝은 선이 나타난다 (네온사인, 방전관).</li>
        <li><strong>흡수 스펙트럼</strong>: 연속 스펙트럼의 빛이 차가운 기체를 지날 때 생긴다. 기체가 흡수한 파장이 검은 선으로 나타난다 (별빛).</li></ul>
        <p>같은 원소의 방출선과 흡수선은 <strong>파장이 같다</strong>.</p>`) +
      U.note('원소의 지문, 선 스펙트럼', `
        <p>원자 속 전자는 정해진 에너지 준위에만 있을 수 있어서 원소마다 내거나 흡수하는 빛의 파장이 정해져 있다. 그래서 선 스펙트럼은 사람의 지문처럼 원소를 구별하는 기준이 된다.</p>
        <p>헬륨은 1868년 지구가 아닌 태양 스펙트럼의 587.6 nm 노란 선에서 처음 발견되었다.</p>`) +
      U.note('적색 편이와 팽창하는 우주', `
        <p>멀어지는 광원의 빛은 파장이 길어져 스펙트럼선이 빨간 쪽으로 이동한다(적색 편이). 허블은 멀리 있는 은하일수록 더 빨리 멀어진다는 것을 발견했다.</p>
        <div class="formula">z = Δλ ÷ λ ≈ v ÷ c &nbsp;&nbsp;&nbsp; v = H₀ × d</div>
        <p>모든 은하가 서로 멀어진다는 것은 우주가 팽창하고 있다는 뜻이며, 과거로 거슬러 가면 한 점에서 시작했다는 <strong>빅뱅 우주론</strong>의 증거가 된다.</p>`) +
      U.note('빅뱅과 원소의 생성', `
        <ul><li><strong>빅뱅 직후 약 3분</strong>: 양성자와 중성자가 결합해 수소와 헬륨 원자핵이 만들어졌다. 그 결과 우주의 질량비는 수소 약 75%, 헬륨 약 25%이며, 이 값은 관측과 잘 맞는다.</li>
        <li><strong>약 38만 년 뒤</strong>: 원자핵이 전자와 결합해 원자가 되면서 빛이 자유롭게 퍼졌다. 이 빛이 지금의 <strong>우주 배경 복사</strong>(약 2.7 K)이다.</li>
        <li><strong>별의 내부</strong>: 핵융합으로 헬륨, 탄소, 산소, … 철까지 만들어진다.</li>
        <li><strong>초신성 폭발, 중성자별 충돌</strong>: 철보다 무거운 원소가 만들어져 우주로 퍼진다.</li></ul>`) +
      `<p class="src note full">자료: 스펙트럼선 파장(NIST Atomic Spectra Database, 공기 중 값), 허블 상수 H₀ = 70 km/s/Mpc(대략값). 파장의 색은 근삿값으로 표시했다.</p>`;
  }
  function notesHydrogen() {
    return U.notesHead('이론 노트', '보어 모형 · 에너지 준위 · 수소 스펙트럼 계열') +
      U.note('보어의 원자 모형', `
        <p>전자는 원자핵 주위의 특정한 궤도(전자 껍질)에서만 돌고, 각 궤도는 정해진 에너지를 가진다. 수소 원자의 에너지 준위는 다음과 같다.</p>
        <div class="formula">Eₙ = −13.6 eV ÷ n² &nbsp;&nbsp;(n = 1, 2, 3, …)</div>
        <p>전자가 높은 준위에서 낮은 준위로 옮겨 가면 그 차이만큼의 에너지를 빛으로 내놓는다. 파장은 λ = hc ÷ ΔE이다.</p>`) +
      U.note('수소 스펙트럼 계열', `
        <div class="tbl"><table class="data"><thead><tr><th>계열</th><th>도착 껍질</th><th>빛의 영역</th></tr></thead><tbody>
          <tr><td>라이먼</td><td>n = 1</td><td>자외선</td></tr><tr><td>발머</td><td>n = 2</td><td>가시광선 (656, 486, 434, 410 nm …)</td></tr><tr><td>파셴</td><td>n = 3</td><td>적외선</td></tr>
        </tbody></table></div>`);
  }
  function notesStar() {
    return U.notesHead('이론 노트', '별의 대기와 흡수선') +
      U.note('별의 흡수 스펙트럼', `
        <p>별의 내부에서 나온 연속 스펙트럼의 빛이 비교적 차가운 별의 대기를 지나며 대기 속 원소가 특정 파장을 흡수한다. 그래서 별빛에는 검은 흡수선이 나타나고, 그 위치를 실험실의 방출선과 비교하면 별의 대기 성분을 알 수 있다.</p>
        <p>태양 스펙트럼의 검은 선은 처음 연구한 프라운호퍼의 이름을 따 프라운호퍼선이라 부른다. 수소(656.3, 486.1 nm), 나트륨(589 nm 두 줄), 마그네슘(517 nm 부근), 철, 칼슘(393, 397 nm)의 선이 뚜렷하다.</p>`) +
      U.note('별의 구성 원소', `
        <p>대부분의 별은 질량의 약 70% 이상이 수소, 25% 정도가 헬륨이고 나머지 원소는 2% 정도이다. 그런데 태양 정도 온도의 별에서는 헬륨 흡수선이 거의 보이지 않는다. 헬륨 선은 표면 온도가 매우 높은 별(O형, B형)에서 뚜렷하므로, 흡수선의 세기는 원소의 양뿐 아니라 별의 표면 온도에도 영향을 받는다.</p>`);
  }
})();
