'use strict';
/* 첫 화면, 실험 목록, 주소(#) 따라 화면 바꾸기 */
(() => {
  const side = document.getElementById('side');
  const main = document.getElementById('main');
  const ORDER = ['chem', 'phys', 'earth', 'life'];
  const SUBJECT_DESC = {
    chem: '물질의 규칙성과 화학 반응',
    phys: '운동과 에너지, 전자기',
    earth: '지구의 역사와 우주, 기후',
    life: '세포와 생명 시스템',
  };
  const LOGO = `<svg viewBox="0 0 36 36" aria-hidden="true">
    <rect x="1" y="1" width="34" height="34" rx="9" fill="var(--chem)"/>
    <path d="M14 8h8M15.2 8v7.4L9.6 25.2a2 2 0 0 0 1.7 3h13.4a2 2 0 0 0 1.7-3L20.8 15.4V8" fill="none" stroke="var(--on-acc)" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="15.5" cy="23.5" r="1.6" fill="var(--on-acc)"/><circle cx="20" cy="21" r="1.1" fill="var(--on-acc)"/>
  </svg>`;
  const icon = m => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${m.icon}</svg>`;
  const ordered = () => ORDER.flatMap(g => LAB.modules.filter(m => m.subject === g));

  side.innerHTML = `
    <a class="brand" href="#home">${LOGO}<span><b>통합과학</b><small>가상 실험실</small></span></a>
    <nav aria-label="실험 목록">
      ${ORDER.map(g => `<div class="nav-group" style="--acc: var(${SUBJECTS[g].token})">
        <div class="nav-h">${SUBJECTS[g].name}</div>
        ${LAB.modules.filter(m => m.subject === g).map(m => `<a href="#${m.id}" data-id="${m.id}"><span class="dot"></span>${m.short || m.title}</a>`).join('')}
      </div>`).join('')}
    </nav>
    <div class="side-foot">2022 개정 교육과정<br>통합과학 1 · 2 탐구 시뮬레이션</div>`;

  function home() {
    const n = LAB.modules.length;
    return U.html(`<div class="home">
      <section class="hero">
        <div>
          <div class="kicker">INTEGRATED SCIENCE LAB</div>
          <h1>통합과학 <span>가상 실험실</span></h1>
          <p>실험 기구가 없어도 조건을 바꿔 가며 반응과 운동을 직접 관찰하는 시뮬레이션 ${n}가지입니다. 화면 속 모든 수치는 화학·물리 법칙과 표준 자료(IUPAC, 국제층서위원회, NOAA, IPCC 등)로 계산합니다.</p>
          <div class="subject-bar" aria-hidden="true">${ORDER.map(g => `<i style="background:var(${SUBJECTS[g].token})"></i>`).join('')}</div>
        </div>
        <div class="howto">
          <h2>실험하는 순서</h2>
          <ol>
            <li><span><b>조건을 바꾼다.</b> 농도, 높이, 질량, 온도 같은 변인을 왼쪽 패널에서 조절합니다.</span></li>
            <li><span><b>장치와 계기판을 본다.</b> 입자 모형과 측정값이 바로 따라 움직입니다.</span></li>
            <li><span><b>그래프와 이론 노트로 확인한다.</b> 결과가 왜 그런지 식과 자료로 설명하고, 생각해 보기 문제를 풉니다.</span></li>
          </ol>
        </div>
      </section>
      ${ORDER.map(g => `<section class="home-group" style="--acc: var(${SUBJECTS[g].token})">
        <h2>${SUBJECTS[g].name} <small>${SUBJECT_DESC[g]}</small></h2>
        <div class="cards" style="--n: ${LAB.modules.filter(m => m.subject === g).length}">${LAB.modules.filter(m => m.subject === g).map(m => `
          <a class="card" href="#${m.id}">
            <span class="ic">${icon(m)}</span>
            <h3>${m.title}</h3>
            <p>${m.desc}</p>
            <span class="unit">${m.unit}</span>
          </a>`).join('')}</div>
      </section>`).join('')}
      <p class="home-foot">이 실험실은 실제 실험을 대신하기보다 실험 전에 결과를 예상하고, 실험 뒤에 원리를 확인하는 데 쓰도록 만들었습니다. 계산에 쓴 가정과 자료 출처는 각 실험의 이론 노트 끝에 적었습니다.</p>
    </div>`);
  }

  let scope = null;
  function route() {
    const id = location.hash.replace(/^#/, '');
    const m = LAB.modules.find(x => x.id === id);
    if (scope) scope.dispose();
    scope = makeScope();
    main.textContent = '';
    side.querySelectorAll('nav a').forEach(a => {
      if (m && a.dataset.id === m.id) { a.setAttribute('aria-current', 'page'); a.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
      else a.removeAttribute('aria-current');
    });
    if (!m) { main.appendChild(home()); document.title = '통합과학 가상 실험실'; return; }
    const page = modulePage(m);
    main.appendChild(page);
    const list = ordered(), i = list.indexOf(m);
    const prev = list[i - 1], next = list[i + 1];
    page.insertAdjacentHTML('beforeend', `<nav class="pager" aria-label="다른 실험">
      ${prev ? `<a href="#${prev.id}"><small>이전 실험</small><b>${prev.title}</b></a>` : '<span></span>'}
      ${next ? `<a class="next" href="#${next.id}"><small>다음 실험</small><b>${next.title}</b></a>` : `<a class="next" href="#home"><small>처음으로</small><b>실험 목록</b></a>`}
    </nav>`);
    try { m.mount(page.querySelector('.mod-body'), scope); } catch (e) { console.error(e); }
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', route);
  route();
})();
