'use strict';
/* 지질 시대와 생물 대멸종 — 국제층서위원회(ICS) 연대표 2023/09 */
(() => {
  const EARTH = 4567; // 지구 나이 (백만 년)

  const FOSSIL_SVG = {
    삼엽충: '<path d="M18 5c6 0 9 3 9 6H9c0-3 3-6 9-6z"/><path d="M10 12h16l-1.5 15c-1 3-4 4-6.5 4s-5.5-1-6.5-4z"/><path d="M14.5 12v18M21.5 12v18M10.5 16h15M11 20h14M11.5 24h13"/>',
    필석: '<path d="M6 30L30 6"/><path d="M9 27l2-5M13 23l2-5M17 19l2-5M21 15l2-5M25 11l2-5"/>',
    방추충: '<path d="M4 18c4-6 24-6 28 0-4 6-24 6-28 0z"/><path d="M10 14.5v7M14 13.5v9M18 13v10M22 13.5v9M26 14.5v7"/>',
    암모나이트: '<path d="M18 18m-1.5 0a1.5 1.5 0 1 1 3 0a3.5 3.5 0 1 1-7 0a6 6 0 1 1 12 0a9 9 0 1 1-18 0a12.5 12.5 0 1 1 25 0"/>',
    화폐석: '<circle cx="18" cy="18" r="13"/><circle cx="18" cy="18" r="9.5"/><circle cx="18" cy="18" r="6"/><circle cx="18" cy="18" r="2.5"/>',
    고사리: '<path d="M18 32V6"/><path d="M18 10l-6-2M18 10l6-2M18 15l-8-2M18 15l8-2M18 20l-9-2M18 20l9-2M18 25l-8-2M18 25l8-2"/>',
  };
  const fossilChip = n => `<span class="badge" style="gap:6px">${FOSSIL_SVG[n] ? `<svg viewBox="0 0 36 36" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${FOSSIL_SVG[n]}</svg>` : ''}${n}</span>`;

  const EONS = [
    { id: 'hadean', name: '명왕누대', en: 'Hadean', s: 4567, e: 4031, c: '#AE027E',
      env: '갓 만들어진 지구는 마그마 바다로 덮여 있었고 운석 충돌이 잦았다. 식으면서 원시 지각과 원시 바다가 생겼다.',
      life: '생명의 흔적이 확인되지 않았다.', fossils: [], events: ['약 45억 6700만 년 전 지구 형성', '약 45억 년 전 거대 충돌로 달 형성', '약 44억 년 전 지르콘 광물 (가장 오래된 지구 물질)'] },
    { id: 'archean', name: '시생누대', en: 'Archean', s: 4031, e: 2500, c: '#F0047F',
      env: '대기에 산소가 거의 없었고, 대륙 지각이 조금씩 자랐다.', life: '원핵생물이 처음 나타났고, 광합성을 하는 남세균이 산소를 만들기 시작했다.',
      fossils: ['스트로마톨라이트'], events: ['약 40억 년 전 가장 오래된 암석', '약 35억 년 전 스트로마톨라이트 (남세균이 만든 층 구조)'] },
    { id: 'proterozoic', name: '원생누대', en: 'Proterozoic', s: 2500, e: 538.8, c: '#F73563',
      env: '남세균이 만든 산소가 대기에 쌓이기 시작했다(대산화 사건). 지구 전체가 얼어붙은 시기(눈덩이 지구)도 있었다.',
      life: '진핵생물, 다세포 생물이 나타났다. 말기에는 몸이 부드러운 에디아카라 동물군이 살았다.',
      fossils: ['에디아카라 동물군'], events: ['약 24억 년 전 대산화 사건', '약 21억~18억 년 전 진핵생물 출현', '약 7억 2000만~6억 3500만 년 전 눈덩이 지구', '약 5억 7000만 년 전 에디아카라 동물군'] },
    { id: 'phanerozoic', name: '현생누대', en: 'Phanerozoic', s: 538.8, e: 0, c: '#9AD9DD',
      env: '단단한 껍데기와 뼈를 가진 생물이 많아져 화석이 풍부하게 남은 시대이다.', life: '고생대, 중생대, 신생대로 나눈다.', fossils: [], events: ['아래 확대한 띠에서 대와 기를 눌러 보세요.'] },
  ];
  const ERAS = [
    { id: 'paleozoic', name: '고생대', en: 'Paleozoic', s: 538.8, e: 251.902, c: '#99C08D',
      env: '대체로 따뜻했으나 오르도비스기 말과 석탄기~페름기에 빙하기가 있었다. 말기에 대륙이 모여 판게아가 되었다.',
      life: '바다 무척추동물 → 어류 → 육상 식물 → 양서류 → 파충류 순으로 나타났다.', fossils: ['삼엽충', '필석', '갑주어', '방추충', '고사리'],
      events: ['캄브리아기 대폭발', '오존층 형성 뒤 생물의 육상 진출', '페름기 말 최대 규모 대멸종'] },
    { id: 'mesozoic', name: '중생대', en: 'Mesozoic', s: 251.902, e: 66.0, c: '#67C5CA',
      env: '전반적으로 따뜻했고 극지방에도 큰 빙하가 거의 없었다. 판게아가 갈라지며 대서양이 열렸다.',
      life: '공룡과 암모나이트가 번성했고, 겉씨식물(소철, 은행나무, 소나무)이 숲을 이루었다. 포유류, 시조새, 속씨식물이 나타났다.',
      fossils: ['암모나이트', '공룡', '시조새'], events: ['판게아 분리', '백악기 말 소행성 충돌과 대멸종'] },
    { id: 'cenozoic', name: '신생대', en: 'Cenozoic', s: 66.0, e: 0, c: '#F2F91D',
      env: '점점 추워져 제4기에는 빙기와 간빙기가 되풀이되었다. 히말라야산맥과 알프스산맥이 솟았다.',
      life: '포유류와 속씨식물이 번성했고, 인류가 나타났다.', fossils: ['화폐석', '매머드'], events: ['약 700만 년 전 인류 조상 출현', '약 30만 년 전 현생 인류 출현'] },
  ];
  const PERIODS = [
    { id: 'cambrian', name: '캄브리아기', en: 'Cambrian', s: 538.8, e: 486.85, c: '#7FA056', env: '얕고 따뜻한 바다가 넓게 퍼져 있었다.', life: '짧은 기간에 다양한 동물 무리가 한꺼번에 나타났다(캄브리아기 대폭발). 삼엽충이 번성했다.', fossils: ['삼엽충'], events: ['버제스 셰일, 청장 동물군 화석'], korea: '강원도 태백·영월의 석회암(조선 누층군)에서 삼엽충 화석이 나온다.' },
    { id: 'ordovician', name: '오르도비스기', en: 'Ordovician', s: 486.85, e: 443.8, c: '#009270', env: '따뜻하다가 말기에 남반구 곤드와나 대륙에 빙하가 발달했다.', life: '해양 무척추동물이 크게 다양해졌고 필석, 턱 없는 원시 어류(갑주어)가 살았다.', fossils: ['필석', '삼엽충'], events: ['말기 1차 대멸종'] },
    { id: 'silurian', name: '실루리아기', en: 'Silurian', s: 443.8, e: 419.2, c: '#B3E1B6', env: '대기 산소가 늘어 오존층이 자외선을 막아 주었다.', life: '최초의 육상 관다발 식물(쿡소니아)이 나타났고, 턱이 있는 어류가 등장했다.', fossils: ['갑주어'], events: ['생물의 육상 진출'] },
    { id: 'devonian', name: '데본기', en: 'Devonian', s: 419.2, e: 358.9, c: '#CB8C37', env: '따뜻하고 건조한 대륙이 많았다.', life: '어류가 크게 번성해 어류의 시대라 부른다. 최초의 숲이 생기고 양서류가 나타났다.', fossils: ['갑주어'], events: ['약 3억 7500만 년 전 틱타알릭 (물고기와 네발동물의 중간)', '후기 대멸종'] },
    { id: 'carboniferous', name: '석탄기', en: 'Carboniferous', s: 358.9, e: 298.9, c: '#67A599', env: '습한 늪지에 거대한 양치식물 숲이 있었다. 대기 산소 농도가 지금보다 훨씬 높았다.', life: '거대한 곤충(날개 편 길이 약 70 cm 메가네우라)과 최초의 파충류가 나타났다.', fossils: ['고사리', '방추충'], events: ['양치식물이 묻혀 석탄층이 됨'], korea: '강원도 삼척·태백 등의 석탄은 이 시기~페름기 지층(평안 누층군)에서 나온다.' },
    { id: 'permian', name: '페름기', en: 'Permian', s: 298.9, e: 251.902, c: '#F04028', env: '대륙이 모두 모여 초대륙 판게아가 되었고 내륙은 매우 건조했다.', life: '파충류가 다양해졌다. 바다에는 방추충이 살았다.', fossils: ['방추충'], events: ['말기 지구 역사상 최대 대멸종 (해양 종의 약 96%)'] },
    { id: 'triassic', name: '트라이아스기', en: 'Triassic', s: 251.902, e: 201.4, c: '#812B92', env: '덥고 건조했으며 판게아가 갈라지기 시작했다.', life: '대멸종 뒤 생물이 회복되며 공룡과 초기 포유류가 나타났다.', fossils: ['암모나이트'], events: ['약 2억 3300만 년 전 공룡 출현', '말기 대멸종'] },
    { id: 'jurassic', name: '쥐라기', en: 'Jurassic', s: 201.4, e: 143.1, c: '#34B2C9', env: '따뜻하고 습했으며 대서양이 열리기 시작했다.', life: '공룡이 번성하고 겉씨식물이 숲을 이루었다. 시조새가 나타났다.', fossils: ['암모나이트', '공룡', '시조새'], events: ['약 1억 5000만 년 전 시조새'] },
    { id: 'cretaceous', name: '백악기', en: 'Cretaceous', s: 143.1, e: 66.0, c: '#7FC64E', env: '매우 따뜻하고 해수면이 높았다.', life: '꽃이 피는 속씨식물이 나타났고 공룡이 가장 번성했다.', fossils: ['암모나이트', '공룡'], events: ['약 1억 3000만 년 전 속씨식물 출현', '말기 소행성 충돌로 공룡·암모나이트 멸종'], korea: '경남 고성, 전남 해남·화순 등 경상 누층군에서 공룡 발자국 화석이 많이 나온다.' },
    { id: 'paleogene', name: '팔레오기', en: 'Paleogene', s: 66.0, e: 23.04, c: '#FD9A52', env: '초기에 매우 더웠다가(약 5600만 년 전 극열 시기) 점점 식었다.', life: '빈자리를 포유류가 채우며 빠르게 다양해졌다. 바다에는 화폐석이 번성했다.', fossils: ['화폐석'], events: ['남극 빙상 형성 시작 (약 3400만 년 전)'] },
    { id: 'neogene', name: '네오기', en: 'Neogene', s: 23.04, e: 2.58, c: '#FFE619', env: '더 서늘하고 건조해져 초원이 넓어졌다. 히말라야산맥이 높이 솟았다.', life: '초원의 포유류가 번성했고 약 700만 년 전 인류의 조상이 나타났다.', fossils: [], events: ['약 700만 년 전 사헬란트로푸스', '약 320만 년 전 오스트랄로피테쿠스 루시'] },
    { id: 'quaternary', name: '제4기', en: 'Quaternary', s: 2.58, e: 0, c: '#F9F97F', env: '빙기와 간빙기가 약 10만 년 주기로 되풀이되었다. 약 1만 1700년 전부터 지금의 간빙기(홀로세)이다.', life: '매머드 같은 대형 포유류가 살았고, 약 30만 년 전 현생 인류가 나타났다.', fossils: ['매머드'], events: ['약 30만 년 전 호모 사피엔스', '약 1만 2000년 전 농경 시작'] },
  ];
  const EXT = [
    { name: '오르도비스기 말', age: 443.8, loss: 85, cause: '곤드와나 대륙에 빙하가 발달해 해수면이 낮아지고 바다가 차가워졌다.', after: '살아남은 무리가 실루리아기에 다시 번성했다.' },
    { name: '데본기 후기', age: 372.2, loss: 75, cause: '바닷속 산소가 부족해지는 일(해양 무산소 사건)이 여러 번 일어났다.', after: '갑주어 등 많은 어류가 사라지고 양서류가 육지로 퍼졌다.' },
    { name: '페름기 말', age: 251.902, loss: 96, cause: '시베리아의 대규모 화산 분출로 온난화, 해양 산성화, 무산소화가 겹쳤다.', after: '삼엽충, 방추충이 완전히 사라졌다. 이후 공룡과 포유류가 나타날 기회가 생겼다.' },
    { name: '트라이아스기 말', age: 201.4, loss: 80, cause: '판게아가 갈라질 때 대서양 중앙의 대규모 화산 활동이 기후를 바꾸었다.', after: '경쟁자가 사라져 쥐라기에 공룡이 번성했다.' },
    { name: '백악기 말', age: 66.0, loss: 76, cause: '멕시코 유카탄 반도에 지름 약 10 km의 소행성이 충돌했다(칙술루브 충돌구). 인도 데칸 고원의 화산 활동도 영향을 주었다.', after: '공룡과 암모나이트가 사라지고 포유류가 번성했다.' },
  ];
  const EVENTS = [
    [4567, '지구 탄생'], [4510, '달 형성 (거대 충돌)'], [4400, '가장 오래된 광물 지르콘'], [4000, '가장 오래된 암석'], [3480, '최초의 생명 흔적 (스트로마톨라이트)'],
    [2400, '대산화 사건'], [2100, '진핵생물 출현'], [720, '눈덩이 지구 시작'], [570, '에디아카라 동물군'], [538.8, '캄브리아기 대폭발'],
    [470, '육상 식물 출현'], [375, '양서류 출현'], [312, '파충류 출현'], [251.902, '페름기 말 대멸종'], [233, '공룡 출현'], [225, '포유류 출현'],
    [150, '시조새'], [130, '속씨식물 출현'], [66, '공룡 멸종'], [7, '인류 조상 출현'], [0.3, '현생 인류 출현'], [0.012, '농경 시작'], [0.0052, '문자 기록 시작'],
  ];

  function fmtYears(y) {
    if (y >= 1e6) y = Math.round(y / 1e4) * 1e4;
    if (y >= 1e8) { const eok = Math.floor(y / 1e8), man = Math.round((y - eok * 1e8) / 1e4); return `${eok}억${man ? ' ' + man + '만' : ''} 년`; }
    if (y >= 1e4) { const man = Math.floor(y / 1e4), rest = Math.round(y - man * 1e4); return `${man}만${rest >= 100 ? ' ' + rest : ''} 년`; }
    return `${Math.round(y)}년`;
  }
  const ago = ma => ma <= 0 ? '현재' : fmtYears(ma * 1e6) + ' 전';
  const MONTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  function calendar(ma, withTime = true) {
    const day = (1 - ma / EARTH) * 365; // 1월 1일 0시부터 지난 날 수
    let d = Math.min(day, 364.99999), m = 0;
    while (m < 11 && d >= MONTHS[m]) { d -= MONTHS[m]; m++; }
    const dd = Math.floor(d) + 1, frac = d - Math.floor(d);
    const sec = Math.round(frac * 86400), hh = Math.floor(sec / 3600), mm = Math.floor((sec % 3600) / 60), ss = sec % 60;
    const pad = n => String(n).padStart(2, '0');
    return `${m + 1}월 ${dd}일` + (withTime ? ` ${pad(hh)}:${pad(mm)}${ma < 0.5 ? ':' + pad(ss) : ''}` : '');
  }
  const textOn = hex => { const [r, g, b] = U.rgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#1a1a1a' : '#ffffff'; };

  registerModule({
    id: 'geo', subject: 'earth', title: '지질 시대와 생물 대멸종', short: '지질 시대',
    unit: '통합과학2 · 변화와 다양성',
    lead: '46억 년 지구 역사를 국제층서위원회의 지질 연대표로 살펴보고, 1년짜리 달력으로 줄여 시간의 크기를 느껴 봅니다. 다섯 번의 대멸종이 생물 다양성을 어떻게 바꾸었는지도 알아봅니다.',
    desc: '지질 연대표, 표준 화석과 시상 화석, 지구 역사 1년 달력, 5대 대멸종',
    icon: '<path d="M3 7l9-4 9 4-9 4z"/><path d="M3 12l9 4 9-4"/><path d="M3 17l9 4 9-4"/>',
    mount(root, S) {
      tabs(root, [
        { id: 'chart', label: '지질 연대표', mount: mountChart },
        { id: 'calendar', label: '지구 역사 1년 달력', mount: mountCalendar },
        { id: 'ext', label: '5대 대멸종', mount: mountExt },
      ], S);
    },
  });

  function segRow(list, total, start, label, minPct = 0) {
    return `<div class="geo-row" role="group" aria-label="${label}">${list.map(u => {
      const pct = (u.s - u.e) / total * 100;
      return `<button type="button" class="geo-seg" data-id="${u.id}" title="${u.name} (${ago(u.s)} ~ ${ago(u.e)})" style="flex:${Math.max(pct, minPct)} 1 0;background:${u.c};color:${textOn(u.c)}"><span>${u.name}</span></button>`;
    }).join('')}</div>`;
  }

  function mountChart(root, S) {
    void S;
    const all = [...EONS, ...ERAS, ...PERIODS];
    root.innerHTML = `
      <style>
        .geo-row{display:flex;gap:2px;height:46px;border-radius:8px;overflow:hidden}
        .geo-seg{border:0;padding:0 4px;cursor:pointer;min-width:0;font:600 12.5px var(--font-body);display:flex;align-items:center;justify-content:center;transition:filter .15s}
        .geo-seg span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .geo-seg:hover{filter:brightness(1.08)}
        .geo-seg[aria-pressed="true"]{box-shadow:inset 0 0 0 3px var(--ink)}
        .geo-lbl{display:flex;justify-content:space-between;font:500 11px var(--font-data);color:var(--muted);margin:4px 2px 0}
        .geo-ext{position:relative;height:18px;margin-bottom:2px}
        .geo-ext b{position:absolute;transform:translateX(-50%);color:var(--bad);font-size:13px;line-height:18px}
      </style>
      <div class="panel" style="display:grid;gap:6px">
        <h3 class="ch">지구 역사 전체 (46억 년) — 누대</h3>
        ${segRow(EONS, EARTH, EARTH, '누대')}
        <div class="geo-lbl"><span>46억 년 전</span><span>40억</span><span>25억</span><span>5.4억</span><span>현재</span></div>
        <svg viewBox="0 0 100 10" preserveAspectRatio="none" style="width:100%;height:26px;display:block" aria-hidden="true"><polygon points="${(1 - 538.8 / EARTH) * 100},0 100,0 100,10 0,10" style="fill:var(--ink);fill-opacity:.07"/></svg>
        <h3 class="ch">현생누대 확대 (5억 3880만 년) — 대</h3>
        ${segRow(ERAS, 538.8, 538.8, '대')}
        <h3 class="ch" style="margin-top:6px">기 <span style="font-weight:400;color:var(--muted);font-size:12.5px">▼ 5대 대멸종</span></h3>
        <div class="geo-ext">${EXT.map(x => `<b style="left:${(538.8 - x.age) / 538.8 * 100}%" title="${x.name} 대멸종">▼</b>`).join('')}</div>
        ${segRow(PERIODS, 538.8, 538.8, '기', 1.6)}
        <div class="geo-lbl"><span>5.39억</span><span>4억</span><span>3억</span><span>2억</span><span>1억</span><span>현재</span></div>
        <p class="ctl-hint">띠의 길이는 실제 기간에 비례한다. 제4기(258만 년)는 너무 짧아 조금 넓게 그렸다. 색은 국제층서위원회 공식 색이다.</p>
      </div>
      <div class="panel" id="geo-detail"></div>
      <section class="notes">${notesChart()}</section>`;
    const det = root.querySelector('#geo-detail');
    function show(id) {
      const u = all.find(x => x.id === id);
      root.querySelectorAll('.geo-seg').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.id === id)));
      const kind = EONS.includes(u) ? '누대' : ERAS.includes(u) ? '대' : '기';
      det.innerHTML = `
        <div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">
          <span style="width:46px;height:46px;border-radius:10px;background:${u.c};flex:none"></span>
          <div style="min-width:0;flex:1 1 280px">
            <div class="eyebrow" style="color:var(--muted)">${kind} · ${u.en}</div>
            <h2 style="margin:2px 0 4px;font:700 26px/1.2 var(--font-display)">${u.name}</h2>
            <div style="font:500 14px var(--font-data);color:var(--ink-2)">${ago(u.s)} ~ ${ago(u.e)} · 약 ${fmtYears((u.s - u.e) * 1e6)}</div>
            <div style="font-size:13px;color:var(--muted);margin-top:2px">지구 달력으로는 ${calendar(u.s, false)} ~ ${u.e > 0 ? calendar(u.e, false) : '12월 31일 자정'}</div>
          </div>
        </div>
        <div class="two" style="margin-top:14px">
          <div><h3 class="ch">환경과 기후</h3><p style="margin:0;color:var(--ink-2)">${u.env}</p></div>
          <div><h3 class="ch">생물</h3><p style="margin:0;color:var(--ink-2)">${u.life}</p></div>
          <div><h3 class="ch">대표 화석</h3><div class="chips">${u.fossils.length ? u.fossils.map(fossilChip).join('') : '<span style="color:var(--muted)">없음</span>'}</div></div>
          <div><h3 class="ch">주요 사건</h3><ul style="margin:0;padding-left:18px;color:var(--ink-2)">${u.events.map(e => `<li>${e}</li>`).join('')}</ul></div>
          ${u.korea ? `<div style="grid-column:1/-1"><h3 class="ch">우리나라에서는</h3><p style="margin:0;color:var(--ink-2)">${u.korea}</p></div>` : ''}
        </div>`;
    }
    root.querySelectorAll('.geo-seg').forEach(b => b.addEventListener('click', () => show(b.dataset.id)));
    show('cambrian');
  }

  function mountCalendar(root, S) {
    void S;
    const st = { ma: 66 };
    const pos = ma => (1 - ma / EARTH) * 100;
    root.innerHTML = `
      <style>
        .cal-bar{position:relative;height:54px;border-radius:8px;background:var(--panel-2);border:1px solid var(--line);overflow:hidden}
        .cal-m{position:absolute;top:0;bottom:0;border-left:1px solid var(--line);font:500 10.5px var(--font-data);color:var(--muted);padding:3px 4px}
        .cal-ev{position:absolute;top:24px;width:12px;height:12px;margin-left:-6px;border-radius:50%;background:var(--acc);border:2px solid var(--panel);cursor:pointer;padding:0}
        .cal-ev[aria-pressed="true"]{background:var(--bad);transform:scale(1.25)}
        .cal-now{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:var(--ink)}
      </style>
      <div class="meters">
        <div class="meter"><span class="lbl">지구 달력 날짜</span><b id="cal-date">—</b><span class="sub">1월 1일 0시 = 지구 탄생</span></div>
        <div class="meter"><span class="lbl">실제 시기</span><b id="cal-ago">—</b><span class="sub" id="cal-ev"></span></div>
        <div class="meter"><span class="lbl">달력 1초는</span><b>약 145년</b><span class="sub">하루는 약 1250만 년</span></div>
      </div>
      <div class="panel" style="display:grid;gap:12px">
        ${Ctl.range('cal-s', '달력 넘겨 보기', { min: 0, max: 1000, step: 1, value: 1000 * pos(66) / 100 })}
        <h3 class="ch" style="margin:0">1년 전체</h3>
        <div class="cal-bar" id="cal-year"></div>
        <h3 class="ch" style="margin:0">12월 확대</h3>
        <div class="cal-bar" id="cal-dec"></div>
        <h3 class="ch" style="margin:0">12월 31일 확대 (24시간)</h3>
        <div class="cal-bar" id="cal-day"></div>
      </div>
      <div class="panel"><h3 class="ch">사건으로 보는 지구 달력</h3><div class="tbl"><table class="data" id="cal-tbl"></table></div></div>
      <section class="notes">${U.notesHead('이론 노트', '시간의 크기 느끼기') +
        U.note('지구 역사를 1년으로 줄이면', `<p>지구가 탄생한 약 45억 6700만 년 전을 1월 1일 0시, 지금을 12월 31일 자정으로 두면 한 달은 약 3억 8000만 년, 하루는 약 1250만 년, 1초는 약 145년이다.</p>
          <p>생물이 단단한 껍데기를 갖고 화석으로 많이 남기 시작한 캄브리아기는 11월 중순에야 시작되고, 공룡이 사라진 날은 12월 26일, 현생 인류는 12월 31일 밤 11시 25분쯤 나타난다. 인류가 문자를 쓴 역사는 마지막 36초 남짓이다.</p>`) +
        U.note('선캄브리아 시대가 긴 까닭', `<p>명왕누대, 시생누대, 원생누대를 합친 선캄브리아 시대는 지구 역사의 약 88%를 차지한다. 이 시기 생물은 대부분 몸이 부드러워 화석으로 잘 남지 않았고, 오래된 암석은 변성 작용을 많이 받아 기록이 적다. 그래서 지질 시대는 화석이 풍부한 현생누대를 훨씬 자세히 나눈다.</p>`)}</section>`;
    const $ = s => root.querySelector(s);
    const months = MONTHS.reduce((a, d, i) => { a.push((a[i - 1] || 0) + (i ? MONTHS[i - 1] : 0)); return a; }, []);
    $('#cal-year').innerHTML = months.map((d, i) => `<span class="cal-m" style="left:${d / 365 * 100}%">${i + 1}월</span>`).join('') +
      EVENTS.map(([ma, n], i) => `<button type="button" class="cal-ev" data-i="${i}" style="left:${pos(ma)}%" title="${n}" aria-label="${n}"></button>`).join('') + '<span class="cal-now"></span>';
    const decStart = 334; // 12월 1일 = 334일 지난 시점
    const decPos = ma => ((1 - ma / EARTH) * 365 - decStart) / 31 * 100;
    const dayPos = ma => ((1 - ma / EARTH) * 365 - 364) * 100;
    $('#cal-dec').innerHTML = [1, 8, 15, 22, 29].map(d => `<span class="cal-m" style="left:${(d - 1) / 31 * 100}%">${d}일</span>`).join('') +
      EVENTS.filter(([ma]) => decPos(ma) >= 0).map(([ma, n]) => `<button type="button" class="cal-ev" data-i="${EVENTS.findIndex(e => e[0] === ma)}" style="left:${decPos(ma)}%" title="${n}" aria-label="${n}"></button>`).join('') + '<span class="cal-now"></span>';
    $('#cal-day').innerHTML = [0, 6, 12, 18].map(h => `<span class="cal-m" style="left:${h / 24 * 100}%">${h}시</span>`).join('') +
      EVENTS.filter(([ma]) => dayPos(ma) >= 0).map(([ma, n]) => `<button type="button" class="cal-ev" data-i="${EVENTS.findIndex(e => e[0] === ma)}" style="left:${Math.min(99.6, dayPos(ma))}%" title="${n}" aria-label="${n}"></button>`).join('') + '<span class="cal-now"></span>';
    $('#cal-tbl').innerHTML = `<thead><tr><th>사건</th><th>실제 시기</th><th>지구 달력</th></tr></thead><tbody>${EVENTS.map(([ma, n], i) => `<tr data-i="${i}" style="cursor:pointer"><td>${n}</td><td>${ago(ma)}</td><td style="font-family:var(--font-data)">${calendar(ma)}</td></tr>`).join('')}</tbody>`;
    const sl = bindRange(root, 'cal-s', { format: v => calendar(EARTH * (1 - v / 1000), false) }, v => { st.ma = EARTH * (1 - v / 1000); update(); });
    const pick = i => { st.ma = EVENTS[i][0]; sl.set(Math.round(1000 * pos(st.ma) / 100), true); update(i); };
    root.querySelectorAll('.cal-ev').forEach(b => b.addEventListener('click', () => pick(+b.dataset.i)));
    root.querySelectorAll('#cal-tbl tr[data-i]').forEach(r => r.addEventListener('click', () => pick(+r.dataset.i)));
    function update(sel) {
      if (sel == null) { let best = -1, bd = Infinity; EVENTS.forEach(([ma], i) => { const d = Math.abs(Math.log((ma + 0.001) / (st.ma + 0.001))); if (d < bd) { bd = d; best = i; } }); sel = bd < 0.15 ? best : -1; }
      $('#cal-date').textContent = calendar(st.ma);
      $('#cal-ago').textContent = ago(st.ma);
      $('#cal-ev').textContent = sel >= 0 ? EVENTS[sel][1] : '';
      root.querySelectorAll('.cal-ev').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.i === sel)));
      root.querySelectorAll('#cal-tbl tr[data-i]').forEach(r => r.classList.toggle('sel', +r.dataset.i === sel));
      const set = (id, p) => { const n = root.querySelector(`#${id} .cal-now`); n.hidden = p < 0 || p > 100; n.style.left = U.clamp(p, 0, 100) + '%'; };
      set('cal-year', pos(st.ma)); set('cal-dec', decPos(st.ma)); set('cal-day', dayPos(st.ma));
    }
    pick(EVENTS.findIndex(e => e[0] === 66));
  }

  function mountExt(root, S) {
    void S;
    root.innerHTML = `
      <div class="panel"><h3 class="ch">5대 대멸종 때 사라진 해양 생물 종의 비율 (추정)</h3><div id="ex-c"></div></div>
      <div class="notes" id="ex-cards"></div>
      <section class="notes">${notesExt()}</section>`;
    chart(root.querySelector('#ex-c'), {
      x: [0.4, 5.6], y: [0, 100], height: 260, yLabel: '사라진 종 (%)', xTicks: [1, 2, 3, 4, 5],
      xFmtTick: v => EXT[v - 1] ? EXT[v - 1].name : '', snap: x => U.clamp(Math.round(x), 1, 5),
      tip: x => { const e = EXT[x - 1]; return `<div class="tip-x">${e.name} 대멸종</div><div>${ago(e.age)}</div><div>사라진 종 약 <b>${e.loss}%</b></div>`; },
      series: [{ name: '사라진 종의 비율', color: 'var(--bad)', bars: true, barWidth: 38, base: 0, data: EXT.map((e, i) => [i + 1, e.loss]) }],
      legendExtra: '',
    });
    root.querySelector('#ex-cards').innerHTML = EXT.map(e => U.note(`${e.name} 대멸종`, `
      <div style="font:500 13.5px var(--font-data);color:var(--muted);margin-bottom:6px">${ago(e.age)} · 사라진 종 약 ${e.loss}%</div>
      <p><strong>원인</strong> ${e.cause}</p><p><strong>그 뒤</strong> ${e.after}</p>`)).join('');
  }

  function notesChart() {
    return U.notesHead('이론 노트', '지질 시대의 구분 · 표준 화석과 시상 화석') +
      U.note('지질 시대는 어떻게 나눌까', `
        <p>지층과 화석에 기록된 큰 변화, 특히 <strong>생물의 출현과 대멸종</strong>을 경계로 나눈다. 큰 단위부터 누대 → 대 → 기 → 세로 나눈다.</p>
        <p>화석이 드문 선캄브리아 시대(명왕·시생·원생누대)는 지구 역사의 약 88%를 차지하고, 화석이 풍부한 현생누대는 고생대·중생대·신생대로 나눈다.</p>`) +
      U.note('표준 화석과 시상 화석', `
        <p><strong>표준 화석</strong>: 짧은 기간 동안 넓은 지역에 살았던 생물의 화석. 지층의 <strong>시대</strong>를 알려 준다.</p>
        <div class="chips" style="margin:6px 0 10px">${['삼엽충', '필석', '방추충', '암모나이트', '화폐석'].map(fossilChip).join('')}</div>
        <p><strong>시상 화석</strong>: 특정 환경에서만 사는 생물의 화석. 지층이 쌓인 <strong>환경</strong>을 알려 준다. 예: 산호(따뜻하고 얕은 바다), 고사리(따뜻하고 습한 육지).</p>`) +
      `<p class="src note full">연대: 국제층서위원회(ICS) 국제 연대층서표 v2023/09. 교과서에 따라 고생대 시작을 약 5.41억 년 전, 쥐라기–백악기 경계를 약 1.45억 년 전으로 적기도 한다.</p>`;
  }
  function notesExt() {
    return U.notesHead('이론 노트', '대멸종과 생물 다양성') +
      U.note('대멸종이란', `<p>비교적 짧은 지질학적 기간에 지구 전체에서 많은 생물 종이 한꺼번에 사라지는 일이다. 현생누대에는 생물 종의 70% 이상이 사라진 대멸종이 다섯 번 있었고, 그중 페름기 말 대멸종이 가장 컸다.</p>`) +
      U.note('대멸종과 진화', `<p>대멸종은 많은 생물을 없앴지만, 살아남은 생물이 빈 생태적 지위를 차지하며 빠르게 다양해지는 계기가 되었다. 공룡이 사라진 뒤 포유류가 번성한 것이 대표적이다. 이렇게 환경 변화와 자연 선택이 되풀이되며 지금의 생물 다양성이 만들어졌다.</p>`) +
      U.note('지금은 여섯 번째 대멸종일까', `<p>서식지 파괴, 기후 변화, 남획, 외래종 도입 때문에 지금의 멸종 속도는 화석 기록으로 추정한 자연 상태의 속도보다 훨씬 빠르다는 연구가 많다. 그래서 많은 과학자가 인간 활동이 여섯 번째 대멸종을 일으키고 있을 수 있다고 경고한다.</p>`) +
      `<p class="src note full">사라진 종의 비율은 해양 무척추동물 화석을 바탕으로 한 추정치(Jablonski 1994, Raup 1979 등)로, 연구에 따라 차이가 있다.</p>`;
  }
})();
