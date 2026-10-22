'use strict';
/* 원소와 화학 결합 — 주기율표(1~20번), 보어 모형, 이온 결합과 공유 결합 */
(() => {
  // Z, 기호, 이름, 원자량, 족, 주기, 분류, 1차 이온화 에너지(kJ/mol), 공유 반지름(pm), 전기 음성도(폴링)
  const RAW = [
    [1, 'H', '수소', 1.008, 1, 1, 'non', 1312, 31, 2.20],
    [2, 'He', '헬륨', 4.0026, 18, 1, 'noble', 2372, 28, null],
    [3, 'Li', '리튬', 6.94, 1, 2, 'metal', 520, 128, 0.98],
    [4, 'Be', '베릴륨', 9.0122, 2, 2, 'metal', 900, 96, 1.57],
    [5, 'B', '붕소', 10.81, 13, 2, 'semi', 801, 84, 2.04],
    [6, 'C', '탄소', 12.011, 14, 2, 'non', 1086, 76, 2.55],
    [7, 'N', '질소', 14.007, 15, 2, 'non', 1402, 71, 3.04],
    [8, 'O', '산소', 15.999, 16, 2, 'non', 1314, 66, 3.44],
    [9, 'F', '플루오린', 18.998, 17, 2, 'non', 1681, 57, 3.98],
    [10, 'Ne', '네온', 20.180, 18, 2, 'noble', 2081, 58, null],
    [11, 'Na', '나트륨', 22.990, 1, 3, 'metal', 496, 166, 0.93],
    [12, 'Mg', '마그네슘', 24.305, 2, 3, 'metal', 738, 141, 1.31],
    [13, 'Al', '알루미늄', 26.982, 13, 3, 'metal', 578, 121, 1.61],
    [14, 'Si', '규소', 28.085, 14, 3, 'semi', 787, 111, 1.90],
    [15, 'P', '인', 30.974, 15, 3, 'non', 1012, 107, 2.19],
    [16, 'S', '황', 32.06, 16, 3, 'non', 1000, 105, 2.58],
    [17, 'Cl', '염소', 35.45, 17, 3, 'non', 1251, 102, 3.16],
    [18, 'Ar', '아르곤', 39.95, 18, 3, 'noble', 1521, 106, null],
    [19, 'K', '칼륨', 39.098, 1, 4, 'metal', 419, 203, 0.82],
    [20, 'Ca', '칼슘', 40.078, 2, 4, 'metal', 590, 176, 1.00],
  ];
  const EL = RAW.map(([Z, sym, name, mass, group, period, type, ie, rad, en]) => {
    const shells = [];
    let left = Z;
    for (const cap of [2, 8, 8, 8]) { if (left <= 0) break; shells.push(Math.min(cap, left)); left -= cap; }
    const val = group === 18 ? 0 : group <= 2 ? group : group - 10;
    let ionQ = null;
    if (type === 'metal') ionQ = val;
    else if (sym === 'H') ionQ = 1;
    else if (['N', 'O', 'F', 'P', 'S', 'Cl'].includes(sym)) ionQ = val - 8;
    return { Z, sym, name, mass, group, period, type, ie, rad, en, shells, val, ionQ };
  });
  const BY = Object.fromEntries(EL.map(e => [e.sym, e]));
  const TYPE = {
    metal: ['금속', '--earth'], semi: ['준금속', '--life'], non: ['비금속', '--chem'], noble: ['18족 (비활성 기체)', '--phys'],
  };
  const SUP = { '-3': '³⁻', '-2': '²⁻', '-1': '⁻', '1': '⁺', '2': '²⁺', '3': '³⁺' };
  const SUB = n => n === 1 ? '' : String(n).split('').map(d => '₀₁₂₃₄₅₆₇₈₉'[d]).join('');
  const ionSym = e => e.sym + SUP[e.ionQ];

  // 공유 결합 분자: [기호, x, y] 와 [i, j, 결합 차수]
  const VAL = { H: 1, C: 4, N: 5, O: 6, F: 7, Si: 4, P: 5, S: 6, Cl: 7 };
  const two = (a, b, o, f, name) => ({ f, name, atoms: [[a, 0, 0], [b, 1, 0]], bonds: [[0, 1, o]] });
  const bent = (c, t, f, name) => ({ f, name, atoms: [[c, 0, 0], [t, -1, 0], [t, 0, 1]], bonds: [[0, 1, 1], [0, 2, 1]] });
  const pyr = (c, t, f, name) => ({ f, name, atoms: [[c, 0, 0], [t, -1, 0], [t, 1, 0], [t, 0, 1]], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1]] });
  const tet = (c, t, f, name) => ({ f, name, atoms: [[c, 0, 0], [t, -1, 0], [t, 1, 0], [t, 0, -1], [t, 0, 1]], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]] });
  const lin = (c, t, f, name) => ({ f, name, atoms: [[c, 0, 0], [t, -1, 0], [t, 1, 0]], bonds: [[0, 1, 2], [0, 2, 2]] });
  const MOL = {
    '1-1': two('H', 'H', 1, 'H₂', '수소'),
    '9-9': two('F', 'F', 1, 'F₂', '플루오린'),
    '17-17': two('Cl', 'Cl', 1, 'Cl₂', '염소'),
    '8-8': two('O', 'O', 2, 'O₂', '산소'),
    '7-7': two('N', 'N', 3, 'N₂', '질소'),
    '1-9': two('H', 'F', 1, 'HF', '플루오린화 수소'),
    '1-17': two('H', 'Cl', 1, 'HCl', '염화 수소'),
    '1-8': bent('O', 'H', 'H₂O', '물'),
    '1-16': bent('S', 'H', 'H₂S', '황화 수소'),
    '8-9': bent('O', 'F', 'OF₂', '이플루오린화 산소'),
    '1-7': pyr('N', 'H', 'NH₃', '암모니아'),
    '1-15': pyr('P', 'H', 'PH₃', '포스핀'),
    '7-17': pyr('N', 'Cl', 'NCl₃', '삼염화 질소'),
    '7-9': pyr('N', 'F', 'NF₃', '삼플루오린화 질소'),
    '15-17': pyr('P', 'Cl', 'PCl₃', '삼염화 인'),
    '1-6': tet('C', 'H', 'CH₄', '메테인'),
    '1-14': tet('Si', 'H', 'SiH₄', '실레인'),
    '6-17': tet('C', 'Cl', 'CCl₄', '사염화 탄소'),
    '6-9': tet('C', 'F', 'CF₄', '사플루오린화 탄소'),
    '14-17': tet('Si', 'Cl', 'SiCl₄', '사염화 규소'),
    '9-14': tet('Si', 'F', 'SiF₄', '사플루오린화 규소'),
    '6-8': lin('C', 'O', 'CO₂', '이산화 탄소'),
    '6-16': lin('C', 'S', 'CS₂', '이황화 탄소'),
    '8-14': { f: 'SiO₂', name: '이산화 규소 (석영)', network: true, atoms: [['Si', 0, 0], ['O', -1, 0], ['O', 1, 0], ['O', 0, -1], ['O', 0, 1]], bonds: [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]] },
  };
  const ANION_NAME = { H: '수소화', N: '질화', O: '산화', F: '플루오린화', P: '인화', S: '황화', Cl: '염화' };
  const ATOM_COL = { H: '#9aa7ad', C: '#4b5563', N: '#3a5fd9', O: '#e0434b', F: '#4f9a2a', Cl: '#1f8f62', S: '#c9a227', P: '#d9771a', Si: '#a07d55' };

  function bondInfo(a, b) {
    const A = BY[a], B = BY[b];
    if (A.type === 'noble' || B.type === 'noble') return { kind: 'noble', A, B };
    const metal = x => x.type === 'metal';
    if (metal(A) && metal(B)) return { kind: 'metallic', A, B };
    if (metal(A) || metal(B)) {
      const C = metal(A) ? A : B, N = metal(A) ? B : A;
      if (!ANION_NAME[N.sym]) return { kind: 'none', A, B, why: `${N.name}(${N.sym})은 금속과 만나도 음이온이 되기보다 공유 결합을 만드는 경향이 있어 이 실험실에서는 다루지 않는다.` };
      const qc = C.val, qa = N.sym === 'H' ? -1 : N.val - 8;
      const g = U.gcd(qc, -qa), nc = -qa / g, na = qc / g;
      return { kind: 'ionic', A, B, C, N, qc, qa, nc, na, f: C.sym + SUB(nc) + N.sym + SUB(na), name: `${ANION_NAME[N.sym]} ${C.name}` };
    }
    const key = [A.Z, B.Z].sort((x, y) => x - y).join('-');
    if (MOL[key]) return { kind: 'covalent', A, B, mol: MOL[key] };
    if (key === '6-6' || key === '14-14') return { kind: 'none', A, B, why: `${A.name} 원자끼리는 분자가 아니라 원자가 끝없이 공유 결합한 공유 결정(${key === '6-6' ? '다이아몬드, 흑연' : '규소 결정'})을 만든다.` };
    return { kind: 'none', A, B, why: '이 조합은 이 실험실에서 다루지 않는다. H–O, C–O, N–H, C–H, Si–O 같은 조합을 골라 보자.' };
  }

  registerModule({
    id: 'bond', subject: 'chem', title: '원소와 화학 결합', short: '원소와 화학 결합',
    unit: '통합과학1 · 물질과 규칙성',
    lead: '1~20번 원소의 전자 배치를 보어 모형으로 살펴보고, 두 원소를 골라 이온 결합과 공유 결합이 어떻게 만들어지는지 확인합니다.',
    desc: '주기율표, 보어 모형, 주기적 성질 그래프, 이온 결합·공유 결합 만들기',
    icon: '<circle cx="12" cy="12" r="1.8"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(120 12 12)"/>',
    mount(root, S) {
      const shared = { Z: 11, a: 'Na', b: 'Cl' };
      tabs(root, [
        { id: 'table', label: '주기율표와 전자 배치', mount: (el, sc) => mountTable(el, sc, shared) },
        { id: 'bond', label: '화학 결합 만들기', mount: (el, sc) => mountBond(el, sc, shared) },
      ], S);
    },
  });

  function mountTable(root, S, shared) {
    const st = { Z: shared.Z, ion: false, prop: 'ie' };
    const cols = [1, 2, 13, 14, 15, 16, 17, 18];
    root.innerHTML = `
      <div class="two">
        <div class="panel">
          <h3 class="ch">주기율표 (1~20번)</h3>
          <p class="ch-sub">세로줄은 족(원자가 전자 수가 같음), 가로줄은 주기(전자 껍질 수가 같음)이다.</p>
          <div class="tbl"><div id="pt" style="display:grid;grid-template-columns:28px repeat(8, minmax(44px, 1fr));gap:4px;min-width:420px">
            <div></div>${cols.map(c => `<div style="text-align:center;font:600 11px var(--font-data);color:var(--muted)">${c}족</div>`).join('')}
            ${[1, 2, 3, 4].map(p => `<div style="align-self:center;font:600 11px var(--font-data);color:var(--muted)">${p}</div>` + cols.map(c => {
              const e = EL.find(x => x.period === p && x.group === c);
              if (!e) return '<div></div>';
              const col = TYPE[e.type][1];
              return `<button type="button" data-z="${e.Z}" class="pt-cell" style="--c: var(${col})" aria-label="${e.name}">
                <span style="font:500 10px var(--font-data);color:var(--muted)">${e.Z}</span><b style="font:700 18px/1.1 var(--font-body)">${e.sym}</b><span style="font-size:10px;color:var(--ink-2)">${e.name}</span></button>`;
            }).join('')).join('')}
          </div></div>
          <div class="chips" style="margin-top:10px">${Object.values(TYPE).map(([t, c]) => `<span class="badge"><i style="width:10px;height:10px;border-radius:3px;background:var(${c});display:inline-block"></i>${t}</span>`).join('')}</div>
        </div>
        <div class="panel stage-panel">
          <canvas class="stage" id="bd-bohr" style="aspect-ratio: 5 / 4" aria-label="보어 원자 모형"></canvas>
          <div class="stage-key" style="pointer-events:auto">${Ctl.check('bd-ion', '이온이 되었을 때', false)}</div>
        </div>
      </div>
      <div class="readouts" id="bd-info"></div>
      <div class="panel">
        <div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:10px;align-items:center">
          <h3 class="ch" style="margin:0">원자 번호에 따른 주기적 성질</h3>
          ${Ctl.seg('bd-prop', '', [['ie', '1차 이온화 에너지'], ['rad', '원자 반지름'], ['en', '전기 음성도']], st.prop)}
        </div>
        <div id="bd-trend" style="margin-top:8px"></div>
        <p class="ctl-hint" id="bd-trend-note"></p>
      </div>
      <section class="notes">${notesTable()}</section>`;
    const style = document.createElement('style');
    style.textContent = `.pt-cell{display:grid;justify-items:center;gap:0;padding:6px 2px 5px;border-radius:8px;border:1px solid color-mix(in srgb,var(--c) 40%,transparent);background:color-mix(in srgb,var(--c) 12%,var(--panel));cursor:pointer;color:var(--ink);min-width:0}
      .pt-cell:hover{border-color:var(--c)}.pt-cell[aria-pressed="true"]{background:var(--c);color:var(--on-acc)}.pt-cell[aria-pressed="true"] span{color:var(--on-acc)!important}`;
    root.prepend(style);
    const $ = s => root.querySelector(s);
    const stg = S.stage($('#bd-bohr'), () => {});
    let rot = 0;
    bindCheck(root, 'bd-ion', v => { st.ion = v; });
    bindSeg(root, 'bd-prop', v => { st.prop = v; trend(); });
    root.querySelectorAll('.pt-cell').forEach(b => b.addEventListener('click', () => select(+b.dataset.z)));

    function select(Z) {
      st.Z = Z; shared.Z = Z;
      root.querySelectorAll('.pt-cell').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.z === Z)));
      const e = EL[Z - 1];
      const ion = e.ionQ == null ? '만들지 않음 (공유 결합)' : e.type === 'noble' ? '안정 (이온이 되지 않음)' : `${ionSym(e)} (전자 ${Math.abs(e.ionQ)}개 ${e.ionQ > 0 ? '잃음' : '얻음'})`;
      $('#bd-info').innerHTML = [
        ['원소', `${e.sym} ${e.name}`], ['원자 번호 (양성자 수)', e.Z], ['원자량', U.fmt(e.mass, e.mass < 10 ? 3 : 2)],
        ['족 · 주기', `${e.group}족 ${e.period}주기`], ['전자 배치', e.shells.join(', ')], ['원자가 전자', `${e.val}개`],
        ['잘 만드는 이온', e.type === 'noble' ? '없음 (안정)' : e.ionQ == null ? '없음 (공유 결합)' : ion],
        ['분류', TYPE[e.type][0]], ['1차 이온화 에너지', `${e.ie} kJ/mol`], ['공유 반지름', `${e.rad} pm`],
        ['전기 음성도', e.en == null ? '—' : U.fmt(e.en, 2)],
      ].map(([a, b]) => `<div class="ro"><span>${a}</span><b>${b}</b></div>`).join('');
      trend();
    }
    function trend() {
      const P = { ie: ['1차 이온화 에너지 (kJ/mol)', e => e.ie, v => Math.round(v) + ' kJ/mol'], rad: ['공유 반지름 (pm)', e => e.rad, v => Math.round(v) + ' pm'], en: ['전기 음성도', e => e.en, v => U.fmt(v, 2)] }[st.prop];
      const data = EL.map(e => [e.Z, P[1](e)]);
      chart($('#bd-trend'), {
        x: [0.5, 20.5], xTicks: [1, 2, 3, 5, 8, 10, 11, 13, 15, 18, 19, 20], height: 240, xLabel: '원자 번호', yLabel: P[0], yInclude: [0],
        cursor: st.Z, series: [{ name: P[0], color: 'var(--acc)', width: 2, dots: 3.5, data }],
        bands: [{ x0: 2.5, x1: 10.5, color: 'var(--ink)', opacity: .04, label: '2주기' }, { x0: 18.5, x1: 20.5, color: 'var(--ink)', opacity: .04, label: '4주기' }, { x0: 10.5, x1: 18.5, color: 'var(--ink)', opacity: 0, label: '3주기' }],
        snap: x => U.clamp(Math.round(x), 1, 20),
        tip: x => { const e = EL[x - 1]; const v = P[1](e); return `<div class="tip-x">${e.Z} ${e.sym} ${e.name}</div><div>${v == null ? '값 없음 (18족)' : P[2](v)}</div>`; },
      });
      $('#bd-trend-note').textContent = {
        ie: '같은 주기에서는 오른쪽으로 갈수록(유효 핵전하 증가) 커지고, 같은 족에서는 아래로 갈수록 작아진다. 1족 원소가 가장 작아 양이온이 되기 쉽다.',
        rad: '같은 주기에서는 오른쪽으로 갈수록 핵이 전자를 강하게 당겨 작아지고, 새 주기가 시작되면(전자 껍질 추가) 크게 늘어난다.',
        en: '플루오린(3.98)이 가장 크다. 18족은 화합물을 거의 만들지 않아 값을 정하지 않는다.',
      }[st.prop];
    }
    S.loop(dt => {
      rot += dt;
      const { ctx, W, H } = stg;
      if (!W) return;
      const e = EL[st.Z - 1];
      const ink = Theme.v('--ink'), muted = Theme.v('--muted'), acc = Theme.v('--chem'), bad = Theme.v('--bad'), line = Theme.v('--line-2');
      ctx.clearRect(0, 0, W, H);
      let shells = e.shells.slice(), added = 0;
      const showIon = st.ion && e.ionQ != null && e.type !== 'noble';
      if (showIon) {
        if (e.ionQ > 0) shells.pop();
        else { added = -e.ionQ; shells[shells.length - 1] += added; }
      }
      const cx = W / 2, cy = H / 2 + 8, Rmax = Math.min(W, H) / 2 - 26, rN = Math.max(16, Rmax * 0.16);
      const n = e.shells.length;
      for (let k = 0; k < n; k++) {
        const rr = rN + (Rmax - rN) * (k + 1) / n;
        const gone = showIon && e.ionQ > 0 && k === n - 1;
        ctx.strokeStyle = gone ? U.rgba(line, 0.6) : line; ctx.lineWidth = 1.2;
        if (gone) ctx.setLineDash([4, 5]);
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
        const cnt = gone ? 0 : shells[k] || 0;
        const outer = k === n - 1;
        for (let i = 0; i < cnt; i++) {
          const a = -Math.PI / 2 + i * 2 * Math.PI / cnt + rot * (0.5 / (k + 1));
          const isAdded = outer && showIon && e.ionQ < 0 && i >= cnt - added;
          ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 5.5, 0, Math.PI * 2);
          ctx.fillStyle = isAdded ? bad : outer && e.type !== 'noble' ? acc : U.rgba(ink, 0.55); ctx.fill();
        }
      }
      ctx.beginPath(); ctx.arc(cx, cy, rN, 0, Math.PI * 2); ctx.fillStyle = U.rgba(bad, 0.18); ctx.fill();
      ctx.strokeStyle = bad; ctx.lineWidth = 1.5; ctx.stroke();
      Draw.text(ctx, `+${e.Z}`, cx, cy + 1, { size: Math.max(11, rN * 0.7), weight: 700, align: 'center', base: 'middle', color: ink, data: true });
      const title = showIon ? ionSym(e) : `${e.sym} ${e.name}`;
      Draw.text(ctx, title, 16, H - 36, { size: 22, weight: 700, color: ink });
      const nowShells = showIon ? shells.filter(x => x > 0) : e.shells;
      Draw.text(ctx, `전자 배치 ${nowShells.join(', ')}${showIon ? ` (${e.ionQ > 0 ? '바깥 껍질 전자를 잃음' : '전자 ' + added + '개를 얻음'})` : ''}`, 16, H - 14, { size: 12, color: muted });
      if (st.ion && (e.ionQ == null || e.type === 'noble')) Draw.text(ctx, e.type === 'noble' ? '이미 안정해서 이온이 되지 않는다' : '이온보다 공유 결합을 만든다', W - 14, H - 14, { size: 12, color: muted, align: 'right' });
    });
    select(st.Z);
  }

  function mountBond(root, S, shared) {
    const opts = EL.map(e => [e.sym, `${e.Z} ${e.sym} ${e.name}`]);
    const PRESETS = [['Na', 'Cl'], ['Mg', 'O'], ['Ca', 'Cl'], ['Al', 'O'], ['H', 'O'], ['C', 'O'], ['N', 'H'], ['C', 'H'], ['N', 'N'], ['Si', 'O'], ['Na', 'K']];
    root.innerHTML = `
      <div class="lab">
        <aside class="panel controls">
          <h2 class="ph">두 원소 고르기</h2>
          ${Ctl.select('bd-a', '원소 A', opts, shared.a)}
          ${Ctl.select('bd-b', '원소 B', opts, shared.b)}
          <div class="ctl"><span class="ctl-label">자주 쓰는 조합</span><div class="chips" id="bd-pre">${PRESETS.map(([a, b]) => `<button type="button" class="chip" data-a="${a}" data-b="${b}">${a}–${b}</button>`).join('')}</div></div>
          <hr>
          ${Ctl.check('bd-lines', '공유 전자쌍을 결합선으로 표시', false)}
          <p class="ctl-hint">결합선(구조식) 하나는 공유 전자쌍 하나를 뜻한다. 점은 원자가 전자이고, 색은 그 전자가 원래 어느 원자의 것이었는지를 나타낸다.</p>
        </aside>
        <div class="stack">
          <div class="panel stage-panel"><canvas class="stage" id="bd-cv" aria-label="화학 결합 모형"></canvas></div>
          <div id="bd-res"></div>
        </div>
      </div>
      <section class="notes">${notesBond()}</section>`;
    const $ = s => root.querySelector(s);
    const stg = S.stage($('#bd-cv'), () => {});
    let info = null, t0 = performance.now(), showLines = false;
    const selA = $('#bd-a'), selB = $('#bd-b');
    const update = () => {
      shared.a = selA.value; shared.b = selB.value;
      info = bondInfo(shared.a, shared.b); t0 = performance.now();
      render();
    };
    selA.addEventListener('change', update); selB.addEventListener('change', update);
    $('#bd-pre').addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b) return; selA.value = b.dataset.a; selB.value = b.dataset.b; update(); });
    bindCheck(root, 'bd-lines', v => { showLines = v; });

    function render() {
      const i = info, res = $('#bd-res');
      const kindBadge = { ionic: ['이온 결합', 'acc'], covalent: ['공유 결합', 'acc'], metallic: ['금속 결합', 'acc'], noble: ['결합하지 않음', ''], none: ['다루지 않는 조합', ''] }[i.kind];
      let body = '';
      if (i.kind === 'ionic') {
        const e = i.qc * i.nc;
        body = `<p><b>${i.f} ${i.name}</b>: ${i.C.name}(${i.C.sym}) 원자가 전자 ${i.qc}개를 잃고 ${ionSym(i.C)}이 되고, ${i.N.name}(${i.N.sym}) 원자가 전자 ${-i.qa}개를 얻어 ${ionSym(i.N)}이 된다. 두 이온이 정전기적 인력으로 결합한다.</p>
          <p>전하의 합이 0이 되도록 ${ionSym(i.C)} ${i.nc}개와 ${ionSym(i.N)} ${i.na}개가 만난다 (이동하는 전자 ${e}개). 두 이온 모두 18족 원소와 같은 전자 배치를 갖는다.</p>`;
      } else if (i.kind === 'covalent') {
        const m = i.mol;
        let shared2 = 0, lone = 0;
        m.bonds.forEach(b => { shared2 += b[2]; });
        m.atoms.forEach((a, k) => { const used = m.bonds.filter(b => b[0] === k || b[1] === k).reduce((t, b) => t + b[2], 0); lone += (VAL[a[0]] - used) / 2; });
        if (m.network) { shared2 = 4; lone = 8; }
        body = `<p><b>${m.f} ${m.name}</b>: 비금속 원자끼리 전자를 내놓아 전자쌍을 함께 쓴다. ${m.network ? '규소 1개가 산소 4개와, 산소 1개가 규소 2개와 결합하는 그물 구조(공유 결정)라서 분자가 따로 없다. 그림은 그 기본 단위인 SiO₄ 사면체이고, 규산염 광물도 이 사면체로 이루어져 있다.' : `각 원자는 ${m.atoms.some(a => a[0] === 'H') ? '수소는 전자 2개(헬륨), 나머지는 8개(옥텟)를' : '전자 8개(옥텟)를'} 채워 안정해진다.`}</p>
          <p>공유 전자쌍 ${shared2}개 · 비공유 전자쌍 ${lone}개${m.bonds.some(b => b[2] === 2) ? ' · 2중 결합 포함' : ''}${m.bonds.some(b => b[2] === 3) ? ' · 3중 결합 포함' : ''}</p>`;
      } else if (i.kind === 'metallic') {
        body = `<p>두 원소 모두 금속이다. 금속 원자는 원자가 전자를 내놓아 양이온이 되고, 내놓은 <b>자유 전자</b>가 양이온 사이를 자유롭게 움직이며 결합을 만든다(금속 결합). 두 금속을 섞어 녹이면 화합물이 아니라 합금이 된다.</p>`;
      } else if (i.kind === 'noble') {
        body = `<p>18족 원소는 가장 바깥 껍질이 전자로 가득 차 있어(헬륨 2개, 나머지 8개) 매우 안정하다. 그래서 다른 원자와 전자를 주고받거나 공유하지 않는다.</p>`;
      } else body = `<p>${i.why}</p>`;
      res.innerHTML = `<div class="panel"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px"><span class="badge ${kindBadge[1]}">${kindBadge[0]}</span><span style="font:600 14px var(--font-data);color:var(--muted)">${i.A.sym} (${TYPE[i.A.type][0]}) + ${i.B.sym} (${TYPE[i.B.type][0]})</span></div><div style="color:var(--ink-2);font-size:14.5px">${body}</div></div>`;
    }

    function drawAtomDots(ctx, x, y, R, n, col, start = 0) {
      // 루이스 순서: 위, 오른쪽, 아래, 왼쪽에 하나씩 놓은 뒤 짝을 채운다
      const slots = [];
      [[-Math.PI / 2, 0], [0, 0], [Math.PI / 2, 0], [Math.PI, 0], [-Math.PI / 2, 1], [0, 1], [Math.PI / 2, 1], [Math.PI, 1]].forEach(([a, s]) => slots.push(a + (s ? 0.22 : -0.22)));
      const out = [];
      for (let k = start; k < start + n && k < 8; k++) out.push([x + Math.cos(slots[k]) * R, y + Math.sin(slots[k]) * R]);
      if (col) for (const [px, py] of out) { ctx.beginPath(); ctx.arc(px, py, 3.6, 0, 7); ctx.fillStyle = col; ctx.fill(); }
      return out;
    }
    function drawIonic(ctx, W, H, t) {
      const i = info, ink = Theme.v('--ink'), acc = Theme.v('--chem'), muted = Theme.v('--muted'), panel = Theme.v('--panel');
      const phase = (t % 5.5);
      const move = U.clamp((phase - 1) / 1.6, 0, 1), done = phase > 2.7;
      const R = Math.min(W * 0.07, H * 0.11), gapY = Math.min(H / (Math.max(i.nc, i.na) + 0.6), R * 3.2);
      const cxC = W * 0.3, cxN = W * 0.7;
      const posC = Array.from({ length: i.nc }, (_, k) => [cxC, H / 2 + (k - (i.nc - 1) / 2) * gapY]);
      const posN = Array.from({ length: i.na }, (_, k) => [cxN, H / 2 + (k - (i.na - 1) / 2) * gapY]);
      // 전자 배정
      const moves = [];
      let an = 0, got = 0;
      posC.forEach((pc, ci) => {
        const src = drawAtomDots(ctx, pc[0], pc[1], R, i.qc, null);
        src.forEach(s => {
          const pn = posN[an];
          const dst = drawAtomDots(ctx, pn[0], pn[1], R * (done ? 1.12 : 1), 1, null, 8 + i.qa + got)[0];
          moves.push({ s, d: dst, ci });
          got++; if (got >= -i.qa) { got = 0; an++; }
        });
      });
      const cCol = U.mix(ink, '#ffffff', 0.0);
      posC.forEach(([x, y]) => {
        const r = done ? R * 0.72 : R;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = U.rgba(Theme.v('--earth'), 0.18); ctx.fill();
        ctx.strokeStyle = Theme.v('--earth'); ctx.lineWidth = 1.5; ctx.stroke();
        Draw.text(ctx, done ? ionSym(i.C) : i.C.sym, x, y + 1, { size: R * 0.5, weight: 700, align: 'center', base: 'middle', color: cCol });
      });
      posN.forEach(([x, y]) => {
        const r = done ? R * 1.12 : R;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fillStyle = U.rgba(Theme.v('--chem'), 0.14); ctx.fill();
        ctx.strokeStyle = Theme.v('--chem'); ctx.lineWidth = 1.5; ctx.stroke();
        Draw.text(ctx, done ? ionSym(i.N) : i.N.sym, x, y + 1, { size: R * 0.5, weight: 700, align: 'center', base: 'middle', color: ink });
        drawAtomDots(ctx, x, y, r, 8 + i.qa, U.rgba(ink, 0.6));
        if (done) {
          ctx.strokeStyle = U.rgba(ink, 0.5); ctx.lineWidth = 1.4;
          const b = r + 12;
          ctx.beginPath(); ctx.moveTo(x - b + 6, y - b); ctx.lineTo(x - b, y - b); ctx.lineTo(x - b, y + b); ctx.lineTo(x - b + 6, y + b);
          ctx.moveTo(x + b - 6, y - b); ctx.lineTo(x + b, y - b); ctx.lineTo(x + b, y + b); ctx.lineTo(x + b - 6, y + b); ctx.stroke();
        }
      });
      for (const m of moves) {
        const e = move < 1 ? move : 1;
        const x = U.lerp(m.s[0], m.d[0], e), y = U.lerp(m.s[1], m.d[1], e) - Math.sin(e * Math.PI) * 30;
        ctx.beginPath(); ctx.arc(x, y, 3.8, 0, 7); ctx.fillStyle = acc; ctx.fill();
        if (move > 0 && move < 1) { ctx.strokeStyle = U.rgba(acc, 0.25); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(m.s[0], m.s[1]); ctx.quadraticCurveTo((m.s[0] + m.d[0]) / 2, (m.s[1] + m.d[1]) / 2 - 60, m.d[0], m.d[1]); ctx.stroke(); }
      }
      Draw.text(ctx, done ? `${i.f}: 양이온과 음이온이 정전기적 인력으로 결합` : move > 0 ? '전자 이동 중…' : '원자 상태 (원자가 전자만 표시)', W / 2, H - 14, { size: 12.5, weight: 600, align: 'center', color: muted });
      Draw.text(ctx, '양이온', cxC, 22, { size: 12, align: 'center', color: muted });
      Draw.text(ctx, '음이온', cxN, 22, { size: 12, align: 'center', color: muted });
      void panel;
    }
    function drawCovalent(ctx, W, H) {
      const m = info.mol, ink = Theme.v('--ink'), acc = Theme.v('--chem'), ink2 = Theme.v('--ink-2'), muted = Theme.v('--muted');
      const xs = m.atoms.map(a => a[1]), ys = m.atoms.map(a => a[2]);
      const spanX = Math.max(...xs) - Math.min(...xs), spanY = Math.max(...ys) - Math.min(...ys);
      const L = Math.min((W - 140) / Math.max(1, spanX + (m.network ? 1.4 : 0.6)), (H - 110) / Math.max(1, spanY + (m.network ? 1.4 : 0.6)), 165);
      const ox = W / 2 - (Math.max(...xs) + Math.min(...xs)) / 2 * L, oy = H / 2 - 6 - (Math.max(...ys) + Math.min(...ys)) / 2 * L;
      const P = m.atoms.map(a => [ox + a[1] * L, oy + a[2] * L]);
      const R = Math.min(28, L * 0.24);
      const firstSym = m.atoms[0][0];
      const homo = m.atoms.every(a => a[0] === firstSym);
      const colOf = k => (homo ? k % 2 === 0 : m.atoms[k][0] === firstSym) ? acc : ink2;
      // 결합
      for (const [i, j, o] of m.bonds) {
        const [x1, y1] = P[i], [x2, y2] = P[j];
        const dx = x2 - x1, dy = y2 - y1, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d, nx = -uy, ny = ux;
        for (let k = 0; k < o; k++) {
          const off = (k - (o - 1) / 2) * 9;
          if (showLines) {
            ctx.strokeStyle = U.rgba(ink, 0.75); ctx.lineWidth = 2.2;
            ctx.beginPath(); ctx.moveTo(x1 + ux * R + nx * off, y1 + uy * R + ny * off); ctx.lineTo(x2 - ux * R + nx * off, y2 - uy * R + ny * off); ctx.stroke();
          } else {
            const mx = (x1 + x2) / 2 + nx * off, my = (y1 + y2) / 2 + ny * off;
            ctx.beginPath(); ctx.arc(mx - ux * 4.5, my - uy * 4.5, 3.6, 0, 7); ctx.fillStyle = colOf(i); ctx.fill();
            ctx.beginPath(); ctx.arc(mx + ux * 4.5, my + uy * 4.5, 3.6, 0, 7); ctx.fillStyle = colOf(j); ctx.fill();
          }
        }
        if (!showLines && o > 0) {
          ctx.strokeStyle = U.rgba(acc, 0.35); ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
          const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
          ctx.beginPath(); ctx.ellipse(mx, my, Math.max(12, d * 0.18), 6 + 6 * o, Math.atan2(dy, dx), 0, 7); ctx.stroke(); ctx.setLineDash([]);
        }
      }
      // 그물 구조의 바깥 결합
      if (m.network) {
        for (let k = 1; k < P.length; k++) {
          const [x, y] = P[k], dx = x - P[0][0], dy = y - P[0][1], d = Math.hypot(dx, dy);
          ctx.strokeStyle = U.rgba(ink, 0.4); ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(x + dx / d * R, y + dy / d * R); ctx.lineTo(x + dx / d * L * 0.7, y + dy / d * L * 0.7); ctx.stroke(); ctx.setLineDash([]);
          Draw.text(ctx, '…Si', x + dx / d * L * 0.82, y + dy / d * L * 0.82 + 4, { size: 12, color: muted, align: 'center' });
        }
      }
      // 원자와 비공유 전자쌍
      m.atoms.forEach((a, k) => {
        const [x, y] = P[k];
        const dirs = m.bonds.filter(b => b[0] === k || b[1] === k).map(b => { const o = b[0] === k ? b[1] : b[0]; const dx = P[o][0] - x, dy = P[o][1] - y, d = Math.hypot(dx, dy); return [dx / d, dy / d]; });
        if (m.network && k > 0) { const dx = x - P[0][0], dy = y - P[0][1], d = Math.hypot(dx, dy); dirs.push([dx / d, dy / d]); }
        const used = m.bonds.filter(b => b[0] === k || b[1] === k).reduce((t, b) => t + b[2], 0) + (m.network && k > 0 ? 1 : 0);
        const lp = Math.round((VAL[a[0]] - used) / 2);
        let cand = [[0, -1], [1, 0], [0, 1], [-1, 0]].filter(c => dirs.every(d => c[0] * d[0] + c[1] * d[1] < 0.7));
        const score = c => dirs.reduce((t, d) => t + c[0] * d[0] + c[1] * d[1], 0);
        if (lp === 2 && dirs.length === 1) cand = cand.filter(c => Math.abs(score(c)) < 0.3).concat(cand.filter(c => Math.abs(score(c)) >= 0.3));
        else cand.sort((p, q) => score(p) - score(q));
        ctx.beginPath(); ctx.arc(x, y, R, 0, 7);
        ctx.fillStyle = U.rgba(ATOM_COL[a[0]] || '#888888', 0.2); ctx.fill();
        ctx.strokeStyle = ATOM_COL[a[0]] || '#888888'; ctx.lineWidth = 1.5; ctx.stroke();
        Draw.text(ctx, a[0], x, y + 1, { size: R * 0.78, weight: 700, align: 'center', base: 'middle', color: ink });
        for (let q = 0; q < lp && q < cand.length; q++) {
          const [dx, dy] = cand[q], rx = x + dx * (R + 8), ry = y + dy * (R + 8);
          for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(rx + -dy * 4.5 * s, ry + dx * 4.5 * s, 3.4, 0, 7); ctx.fillStyle = colOf(k); ctx.fill(); }
        }
      });
      Draw.text(ctx, `${m.f} ${m.name}`, W / 2, H - 14, { size: 13, weight: 600, align: 'center', color: muted });
    }
    function drawMetal(ctx, W, H, t) {
      const ink = Theme.v('--ink'), acc = Theme.v('--chem'), earth = Theme.v('--earth');
      const cols = 6, rows = 4, gx = W / (cols + 1), gy = (H - 40) / (rows + 1);
      const r = Math.min(gx, gy) * 0.28;
      for (let i = 1; i <= cols; i++) for (let j = 1; j <= rows; j++) {
        const sym = (i + j) % 2 ? info.A.sym : info.B.sym;
        ctx.beginPath(); ctx.arc(i * gx, j * gy, r, 0, 7); ctx.fillStyle = U.rgba(earth, 0.2); ctx.fill(); ctx.strokeStyle = earth; ctx.lineWidth = 1.3; ctx.stroke();
        Draw.text(ctx, sym + '⁺', i * gx, j * gy + 1, { size: r * 0.62, weight: 700, align: 'center', base: 'middle', color: ink });
      }
      const rnd = U.rng(3);
      for (let k = 0; k < 34; k++) {
        const a = rnd() * 7, sp = 0.2 + rnd() * 0.4, bx = rnd(), by = rnd();
        const x = ((bx + Math.cos(a) * sp * t * 0.15) % 1 + 1) % 1 * W, y = 12 + ((by + Math.sin(a) * sp * t * 0.15) % 1 + 1) % 1 * (H - 50);
        ctx.beginPath(); ctx.arc(x, y, 3.4, 0, 7); ctx.fillStyle = acc; ctx.fill();
      }
      Draw.text(ctx, '금속 양이온 사이를 자유 전자(초록 점)가 움직인다', W / 2, H - 14, { size: 12.5, weight: 600, align: 'center', color: Theme.v('--muted') });
    }
    function drawNoble(ctx, W, H) {
      const ink = Theme.v('--ink'), line = Theme.v('--line-2'), phys = Theme.v('--phys'), muted = Theme.v('--muted');
      [info.A, info.B].forEach((e, k) => {
        const cx = W * (k ? 0.72 : 0.28), cy = H / 2 - 8, R = Math.min(W * 0.17, H * 0.36);
        e.shells.forEach((n, s) => {
          const rr = R * (s + 1) / e.shells.length;
          ctx.strokeStyle = line; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 7); ctx.stroke();
          for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / n; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 4, 0, 7); ctx.fillStyle = s === e.shells.length - 1 ? phys : U.rgba(ink, 0.5); ctx.fill(); }
        });
        Draw.text(ctx, `${e.sym} (${e.shells.join(', ')})`, cx, cy + R + 22, { size: 13, weight: 600, align: 'center', color: ink });
      });
      Draw.text(ctx, '어느 쪽이든 18족 원소가 끼면 결합이 만들어지지 않는다', W / 2, H - 12, { size: 12.5, align: 'center', color: muted });
    }
    S.loop(() => {
      const { ctx, W, H } = stg;
      if (!W || !info) return;
      ctx.clearRect(0, 0, W, H);
      const t = (performance.now() - t0) / 1000;
      if (info.kind === 'ionic') drawIonic(ctx, W, H, t);
      else if (info.kind === 'covalent') drawCovalent(ctx, W, H);
      else if (info.kind === 'metallic') drawMetal(ctx, W, H, t);
      else if (info.kind === 'noble') drawNoble(ctx, W, H);
      else Draw.text(ctx, '다른 조합을 골라 보세요', W / 2, H / 2, { size: 15, weight: 600, align: 'center', color: Theme.v('--muted') });
    });
    update();
  }

  function notesTable() {
    return U.notesHead('이론 노트', '원소의 생성 · 주기율표 · 원자가 전자') +
      U.note('주기율표의 규칙성', `
        <p>멘델레예프는 원소를 원자량 순으로 배열하면 성질이 비슷한 원소가 주기적으로 나타난다는 것을 발견했고, 오늘날의 주기율표는 원자 번호(양성자 수) 순으로 배열한다.</p>
        <ul><li><strong>족</strong>: 같은 세로줄. 원자가 전자 수가 같아 화학적 성질이 비슷하다 (1족 알칼리 금속, 17족 할로젠, 18족 비활성 기체).</li>
        <li><strong>주기</strong>: 같은 가로줄. 전자가 들어 있는 전자 껍질 수가 같다.</li></ul>`) +
      U.note('원자가 전자와 이온', `
        <p>가장 바깥 껍질의 전자(원자가 전자)가 화학 반응에 참여한다. 원자는 18족 원소처럼 바깥 껍질에 전자 8개(헬륨은 2개)를 채워 안정해지려 한다(옥텟 규칙).</p>
        <div class="formula">Na (2, 8, 1) → Na⁺ (2, 8) + e⁻<br>Cl (2, 8, 7) + e⁻ → Cl⁻ (2, 8, 8)</div>
        <p>금속은 전자를 잃어 양이온, 비금속은 전자를 얻어 음이온이 되기 쉽다.</p>`) +
      U.note('알칼리 금속과 할로젠', `
        <p><strong>알칼리 금속</strong>(Li, Na, K): 원자가 전자 1개. 무르고 반응성이 매우 커서 물과 반응해 수소 기체와 염기성 용액을 만든다. 아래로 갈수록 반응성이 크다.</p>
        <p><strong>할로젠</strong>(F, Cl, Br, I): 원자가 전자 7개. 이원자 분자로 존재하며 금속과 반응해 염을 만든다. 위로 갈수록 반응성이 크다.</p>`) +
      U.note('생각해 보기', `
        ${U.qa('나트륨과 칼륨의 화학적 성질이 비슷한 까닭은?', '둘 다 1족 원소로 원자가 전자가 1개라서 전자 1개를 잃고 +1 이온이 되는 반응을 똑같이 하기 때문이다.')}
        ${U.qa('3주기에서 이온화 에너지가 Mg(738)보다 Al(578)이 작은 까닭은?', 'Al의 세 번째 원자가 전자가 더 높은 에너지 상태(3p)에 들어가 떼어 내기 쉽기 때문이다. 이처럼 큰 경향 속에 작은 예외가 있다.')}`) +
      `<p class="src note full">자료: 원자량(IUPAC 2021 표준 원자량), 1차 이온화 에너지(NIST), 공유 반지름(Cordero 외, 2008), 전기 음성도(폴링 척도).</p>`;
  }
  function notesBond() {
    return U.notesHead('이론 노트', '이온 결합 · 공유 결합 · 지각과 생명체를 이루는 물질') +
      U.note('이온 결합', `
        <p>금속 원자가 잃은 전자를 비금속 원자가 얻어 생긴 양이온과 음이온이 <strong>정전기적 인력</strong>으로 결합한다. 이온들은 규칙적으로 배열해 결정을 이룬다.</p>
        <div class="formula">2Na + Cl₂ → 2NaCl</div>
        <p>화학식은 양이온과 음이온의 전하 합이 0이 되는 가장 간단한 정수비로 쓴다 (Mg²⁺ + Cl⁻ → MgCl₂, Al³⁺ + O²⁻ → Al₂O₃).</p>`) +
      U.note('공유 결합', `
        <p>비금속 원자끼리 서로 전자를 내놓아 <strong>전자쌍을 공유</strong>하며 결합한다. 공유하는 전자쌍이 1, 2, 3개이면 단일·2중·3중 결합이다.</p>
        <div class="formula">H₂O: H–O–H &nbsp;&nbsp; CO₂: O=C=O &nbsp;&nbsp; N₂: N≡N</div>`) +
      U.note('이온 결합 물질과 공유 결합 물질의 성질', `
        <div class="tbl"><table class="data"><thead><tr><th>성질</th><th>이온 결합 물질 (NaCl)</th><th>공유 결합 물질 (설탕, 물)</th></tr></thead><tbody>
          <tr><td>녹는점</td><td>높다 (NaCl 801 °C)</td><td>대체로 낮다 (물 0 °C)</td></tr>
          <tr><td>고체의 전기 전도성</td><td>없다</td><td>없다</td></tr>
          <tr><td>액체·수용액의 전기 전도성</td><td>있다 (이온이 움직임)</td><td>없다 (분자 상태)</td></tr>
          <tr><td>힘을 가하면</td><td>쪼개진다</td><td>—</td></tr>
        </tbody></table></div>`) +
      U.note('지각과 생명체를 이루는 물질', `
        <p><strong>지각</strong>: 산소(약 46%)와 규소(약 28%)가 가장 많다. 규소 1개와 산소 4개가 공유 결합한 <strong>규산염 사면체(SiO₄)</strong>가 기본 단위이며, 사면체가 연결되는 방식에 따라 감람석, 휘석, 각섬석, 운모, 석영 등이 된다.</p>
        <p><strong>생명체</strong>: 탄소는 원자가 전자 4개로 최대 4개의 원자와 공유 결합해 사슬, 고리 같은 다양한 골격을 만든다. 단백질(아미노산이 펩타이드 결합)과 핵산(뉴클레오타이드가 결합한 DNA, RNA)이 그 예이다.</p>`) +
      `<p class="src note full">결합 종류는 금속–비금속은 이온 결합, 비금속–비금속은 공유 결합으로 단순화했다. 실제로는 전기 음성도 차이에 따라 연속적으로 달라진다.</p>`;
  }
})();
