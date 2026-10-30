// 진화 경로 표시 전용. 갈래·조합 조건은 기존 데이터와 시스템에서 읽는다.
(function (G) {
  'use strict';

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function button(cls, text, action) {
    const b = el('button', cls, text);
    b.type = 'button';
    b.addEventListener('click', action);
    return b;
  }
  function name(key) { return (G.WEAPONS[key] || G.PASSIVES[key] || G.FUSIONS[key] || {}).name || key; }
  function icon(key) {
    const wrap = el('span', 'evo-icon');
    const d = G.WEAPONS[key];
    const i = el('img');
    i.src = G.spriteUrl('icon_' + (d && d.icon || key));
    i.alt = '';
    i.width = i.height = 40;
    i.addEventListener('error', () => { i.hidden = true; wrap.classList.add('no-art'); wrap.textContent = name(key).slice(0, 1); });
    wrap.appendChild(i);
    if (d && d.kind === 'xcombo') {
      const sub = el('img', 'evo-sub-icon');
      sub.src = G.spriteUrl('icon_' + d.sub);
      sub.alt = '';
      sub.addEventListener('error', () => { sub.hidden = true; });
      wrap.appendChild(sub);
    }
    return wrap;
  }
  function own(p, key) { return p && p.weapons.find((w) => w.key === key); }
  function combos(p, key, b5) {
    return G.xcomboBook(p || { weapons: [] }, true).filter((x) => x.c.main === key && (!b5 || x.c.b5 === b5));
  }
  function requirement(p, key, b5, sub, catalog) {
    if (catalog) return '메인 Lv 10 + 짝 Lv 5 → 상자에서 조합';
    const m = own(p, key), s = own(p, sub);
    if (!m) return '메인: ' + name(key) + ' 먼저 획득';
    if (m.b5 && m.b5 !== b5) return '다른 갈래의 조합 · 이번 판에는 선택할 수 없음';
    if (!m.b5) return '다음: Lv 5에서 갈래 선택 — 지금 Lv ' + m.level;
    if (m.level < 10) return '메인: Lv 10 필요 — 지금 Lv ' + m.level;
    if (!m.b10) return '다음: Lv 10 끝 형태 선택';
    if (!s || s.level < 5) return '짝: ' + name(sub) + ' Lv 5 필요 — ' + (s ? '지금 Lv ' + s.level : '미보유');
    return '준비 완료 · 다음 상자에서 조합 선택';
  }
  function formula(c) {
    const row = el('span', 'evo-formula');
    const parts = c.parts || [[c.main, '메인', 'Lv 10'], [c.sub, '재료', 'Lv 5 이상'], [c.key, '결과', '두 무기 → 하나']];
    parts.forEach((part, i) => {
      if (i) row.appendChild(el('span', 'evo-sign', i === 1 ? '+' : '='));
      const term = el('span', 'evo-term');
      term.appendChild(el('small', 'evo-role', part[1]));
      term.appendChild(icon(part[0]));
      term.appendChild(el('strong', '', name(part[0])));
      term.appendChild(el('small', '', part[2]));
      row.appendChild(term);
    });
    return row;
  }
  function steps(key, w, ready, complete) {
    const list = el('ol', 'evo-steps');
    const current = complete ? 3 : !w ? 0 : !w.b5 ? (w.level >= 5 ? 1 : 0) : !w.b10 ? (w.level >= 10 ? 2 : 1) : ready ? 3 : 2;
    const stages = [['Lv 1', '기본 무기'], ['Lv 5', '갈래 선택'], ['Lv 10', '끝 형태'], ['상자', '짝과 조합']];
    const b5 = w && G.branchById(key, 5, w.b5);
    const b10 = w && G.branchById(key, 10, w.b10, w.b5);
    if (b5) stages[1][1] = b5.name;
    if (b10) stages[2][1] = b10.name;
    stages.forEach((s, i) => {
      const li = el('li', 'evo-step' + (w && i < current ? ' is-done' : '') + (w && i === current ? ' is-current' : '') + (i > current || !w ? ' is-locked' : ''));
      if (w && i === current) li.setAttribute('aria-current', 'step');
      li.appendChild(el('span', 'evo-step-num', String(i + 1)));
      if (i === 3) {
        const chest = el('img', 'evo-chest');
        chest.src = G.spriteUrl('ui_combo_chest');
        chest.alt = '';
        li.appendChild(chest);
      } else li.appendChild(icon(key));
      li.appendChild(el('strong', '', s[0]));
      li.appendChild(el('span', '', s[1]));
      li.appendChild(el('small', 'evo-step-state', !w ? '미획득' : i === current ? (complete ? '완성' : ready && i === 3 ? '조합 가능' : '현재') : i < current ? '완료 ✓' : '잠김'));
      list.appendChild(li);
    });
    return list;
  }
  function path(p, weaponKey, catalog) {
    const def = G.WEAPONS[weaponKey];
    const complete = def.kind === 'xcombo';
    const key = complete ? def.main : weaponKey;
    const w = own(p, weaponKey);
    const brs = G.BRANCHES[key];
    const card = el('article', 'evo-path');
    card.dataset.weapon = weaponKey;
    if (!brs) {
      const h = el('h3', 'evo-path-title', name(weaponKey));
      card.append(icon(weaponKey), h, el('p', 'evo-next', '완성된 무기 · ' + def.desc));
      return card;
    }
    const ready = !catalog && combos(p, key).some((x) => x.ready);
    if (ready) card.classList.add('is-ready');
    const head = el('header', 'evo-path-head');
    head.appendChild(icon(weaponKey));
    const title = el('div');
    title.appendChild(el('small', 'evo-kicker', complete ? '조합 완성' : '메인 무기'));
    title.appendChild(el('h3', 'evo-path-title', name(weaponKey)));
    head.appendChild(title);
    head.appendChild(el('span', 'evo-badge', complete ? '완성' : ready ? '조합 가능' : w ? 'Lv ' + w.level : catalog ? '경로 도감' : '미보유'));
    card.append(head, steps(key, w, ready, complete));
    const note = el('p', 'evo-next');
    card.appendChild(note);
    const label = el('p', 'evo-section-label', '② Lv 5 · 갈래를 눌러 경로 보기');
    card.appendChild(label);
    const tabs = el('div', 'evo-branches');
    card.appendChild(tabs);
    const detail = el('div', 'evo-route');
    card.appendChild(detail);
    let selected = w && w.b5 || brs.b5[0].id;
    const buttons = [];
    function render() {
      const br = G.branchById(key, 5, selected);
      const alternate = !!(w && w.b5 && w.b5 !== selected);
      buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(brs.b5[i].id === selected)));
      detail.textContent = '';
      const rows = combos(p, key, selected);
      note.textContent = complete ? '두 무기가 하나로 합쳐져 무기 칸 1개가 비었어요' : catalog ? '갈래와 메인 방향에 따라 조합 결과가 달라져요' : rows.length ? requirement(p, key, selected, rows[0].c.sub, false) : 'Lv 5 갈래 → Lv 10 끝 형태 → 상자에서 조합';
      if (alternate) detail.appendChild(el('p', 'evo-preview', '다른 갈래 미리보기 · 현재 선택은 ' + G.branchById(key, 5, w.b5).name));
      detail.appendChild(el('p', 'evo-branch-desc', br.desc));
      detail.appendChild(el('p', 'evo-section-label', '③ Lv 10 · 끝 형태 중 하나 선택'));
      const ends = el('div', 'evo-ends');
      (brs.b10[selected] || []).forEach((end) => {
        const picked = w && !alternate && w.b10 === end.id;
        const item = el('div', 'evo-end' + (picked ? ' is-picked' : ''));
        item.appendChild(icon(key));
        const body = el('span');
        body.appendChild(el('strong', '', end.name + (picked ? ' ✓' : '')));
        body.appendChild(el('small', '', end.desc));
        item.appendChild(body);
        ends.appendChild(item);
      });
      detail.appendChild(ends);
      if (!catalog && w && w.b10 && !alternate) {
        ends.hidden = true;
        const expand = button('evo-end-toggle', '끝 형태 ' + ends.children.length + '개 보기 ▾', () => {
          ends.hidden = !ends.hidden;
          expand.setAttribute('aria-expanded', String(!ends.hidden));
          expand.textContent = ends.hidden ? '끝 형태 ' + ends.children.length + '개 보기 ▾' : '끝 형태 접기 ▴';
        });
        expand.setAttribute('aria-expanded', 'false');
        detail.insertBefore(expand, ends);
      }
      detail.appendChild(el('p', 'evo-section-label', '④ 상자 · 짝 무기 → 조합 결과'));
      rows.filter((x) => !complete || alternate || x.c.key === weaponKey).forEach((x) => {
        const result = el('div', 'evo-result' + (x.ready || complete && !alternate ? ' is-ready' : ''));
        const line = el('div', 'evo-pair');
        line.appendChild(icon(x.c.sub));
        const sub = el('span');
        sub.append(el('small', '', '짝 · Lv 5 이상'), el('strong', '', name(x.c.sub)));
        line.append(sub, el('span', 'evo-sign', '→'), icon(x.c.key));
        const output = el('span');
        output.append(el('small', '', '결과 · ' + G.fxText(G.COMBO_SIG[x.c.sub].fx)), el('strong', '', name(x.c.key)));
        line.appendChild(output);
        result.append(line, el('p', 'evo-requirement', complete && !alternate ? '조합 완료 ✓' : requirement(p, key, selected, x.c.sub, catalog || complete)));
        if (w && w.level < 10 && !alternate && !catalog) {
          const s = own(p, x.c.sub);
          result.appendChild(el('small', 'evo-pair-level', '짝: ' + name(x.c.sub) + ' Lv 5 필요 — ' + (s ? '지금 Lv ' + s.level : '미보유')));
        }
        detail.appendChild(result);
      });
    }
    brs.b5.forEach((br, i) => {
      const b = button('evo-branch', '', () => { selected = br.id; render(); });
      b.append(el('span', 'evo-letter', String.fromCharCode(65 + i)), el('span', '', br.name + (w && w.b5 === br.id ? ' ✓' : '')));
      b.setAttribute('aria-label', br.name + ' 경로 보기' + (w && w.b5 === br.id ? ', 현재 갈래' : ''));
      tabs.appendChild(b);
      buttons.push(b);
    });
    render();
    return card;
  }

  // 전투 도감·로비 도감·일시정지에서 같은 경로를 쓴다.
  function library(box, p, all, catalog) {
    box.textContent = '';
    const root = el('div', 'evo-library');
    box.appendChild(root);
    const intro = el('div', 'evo-intro');
    intro.append(el('strong', '', 'Lv 10 + 짝 Lv 5 → 상자에서 조합'), el('span', '', '메인·Lv 5 갈래마다 다른 결과 · 합치면 빈 칸 +1'));
    root.appendChild(intro);
    const body = el('div', 'evo-library-body');
    root.appendChild(body);
    const ready = catalog ? [] : G.xcomboOptions(p);
    if (!all) {
      if (ready.length) {
        const sec = el('section', 'evo-ready');
        sec.appendChild(el('h3', '', '상자에서 조합 가능 · ' + ready.length));
        ready.forEach((c) => sec.appendChild(formula(c)));
        body.appendChild(sec);
      }
      const owned = p.weapons.slice().sort((a, b) => Number(ready.some((c) => c.main === b.key)) - Number(ready.some((c) => c.main === a.key)));
      if (!owned.length) body.appendChild(el('p', 'evo-empty', '아직 무기가 없어요. 전체 탭에서 경로를 살펴보세요.'));
      owned.forEach((w) => body.appendChild(path(p, w.key, false)));
      return;
    }
    function grid(focusKey) {
      body.textContent = '';
      body.appendChild(el('p', 'evo-section-label', '메인 무기를 고르세요'));
      const list = el('div', 'evo-weapon-grid');
      const keys = Object.keys(G.BRANCHES).sort((a, b) => Number(ready.some((c) => c.main === b)) - Number(ready.some((c) => c.main === a)));
      keys.forEach((key) => {
        const w = own(p, key), unlocked = G.isItemUnlocked('weapon', key);
        const canCombine = ready.some((c) => c.main === key);
        const b = button('evo-weapon' + (w ? ' is-owned' : '') + (canCombine ? ' is-ready' : ''), '', () => detail(key));
        b.dataset.weapon = key;
        b.append(icon(key), el('strong', '', name(key)), el('small', '', canCombine ? '조합 가능' : w ? 'Lv ' + w.level : unlocked ? '경로 보기' : '미해금 · 미리보기'));
        list.appendChild(b);
      });
      body.appendChild(list);
      if (focusKey) list.querySelector('[data-weapon="' + focusKey + '"]').focus({ preventScroll: true });
    }
    function detail(key) {
      body.textContent = '';
      const back = button('btn btn-small evo-back', '‹ 무기 목록', () => grid(key));
      body.appendChild(back);
      if (!G.isItemUnlocked('weapon', key)) body.appendChild(el('p', 'evo-preview', '아직 미해금 · 다음 스테이지를 열면 획득할 수 있어요'));
      body.appendChild(path(p, key, catalog));
      back.focus({ preventScroll: true });
      back.scrollIntoView({ block: 'nearest' });
    }
    grid();
  }

  // 선택 카드의 큰 행동 문구와 작은 상세를 분리한다. 게임 선택 데이터는 그대로 둔다.
  function choice(p, c, d, body) {
    let action = d.tag, detail = d.text, hint = d.comboHint;
    if (c.kind === 'weapon') {
      action = c.level === 1 ? '새 무기 획득' : c.level === 5 ? 'Lv 5 → 갈래 선택' : c.level === 10 ? 'Lv 10 → 끝 형태 선택' : 'Lv ' + (c.level - 1) + ' → ' + c.level + ' 강화';
      const w = own(p, c.key);
      hint = c.level < 5 ? '다음: Lv 5 갈래까지 ' + (5 - c.level) + '레벨' : c.level < 10 ? '다음: Lv 10 끝 형태까지 ' + (10 - c.level) + '레벨' : '끝 형태 + 짝 Lv 5 → 상자에서 조합';
      const match = G.xcomboBook(p, true).find((x) => x.c.sub === c.key && x.m && x.m.level >= 10 && x.m.b10 && x.m.b5 === x.c.b5);
      if (match && c.level >= 5) hint = '이 무기를 짝으로 → ' + name(match.c.main) + '와 조합 가능';
      else if (w && w.b5 && c.level >= 10) {
        const x = combos(p, c.key, w.b5)[0];
        if (x) hint = '짝: ' + name(x.c.sub) + ' Lv 5 필요 — ' + (x.s ? '지금 Lv ' + x.s.level : '미보유');
      }
    } else if (c.kind === 'branch') {
      const w = own(p, c.key), br = G.branchById(c.key, c.tier, c.id, w && w.b5);
      action = c.tier === 5 ? 'Lv 5 → 이 갈래로 성장' : 'Lv 10 → 끝 형태 완성';
      detail = br.desc;
      hint = c.tier === 5 ? '다음: Lv 10에서 끝 형태 선택' : '짝 Lv 5를 모아 상자에서 조합';
    } else if (c.kind === 'xcombo') {
      action = '두 무기를 합쳐 빈 칸 +1';
      detail = '메인 갈래: ' + G.branchById(c.main, 5, G.WEAPONS[c.key].b5).name + ' · ' + G.fxText(G.COMBO_SIG[c.sub].fx) + ' · 피해 +60%';
      hint = '';
    } else if (c.kind === 'nocombo') { action = '무기를 유지하고 상자 강화만 받기'; hint = ''; }
    else if (c.kind === 'passive') action = c.level === 1 ? '새 패시브 획득' : '패시브 Lv ' + (c.level - 1) + ' → ' + c.level;
    else if (c.kind === 'heal') action = '체력 25 회복';
    else if (c.kind === 'gold') action = '금화 25 획득';
    else if (c.kind === 'oldcombo') action = '상자에서 ' + d.tag;
    body.appendChild(el('strong', 'card-action', action));
    if (c.kind === 'xcombo') body.appendChild(formula(c));
    if (c.kind === 'oldcombo') {
      const status = G.comboStatus(p).find((x) => x.combo.result === c.combo.result);
      if (status) {
        const parts = status.parts.map((x) => [x.key, x.kind === 'weapon' ? '무기' : '패시브', x.need > 1 ? 'Lv ' + x.need : '보유']);
        parts.push([status.result.key, '결과', d.tag]);
        body.appendChild(formula({ parts }));
      }
    }
    body.appendChild(el('span', 'card-text', detail));
    if (c.kind === 'branch') {
      const w = own(p, c.key), br = G.branchById(c.key, 5, c.tier === 5 ? c.id : w.b5);
      const partners = el('span', 'card-partners');
      partners.appendChild(el('small', '', '열리는 짝'));
      (br.subs || []).forEach((key) => {
        const term = el('span');
        term.append(icon(key), el('span', '', name(key)));
        partners.appendChild(term);
      });
      body.appendChild(partners);
    }
    if (hint) body.appendChild(el('span', 'card-combo', hint));
  }

  // lore는 기존 저장기가 그대로 보존하는 안내 기록이다. 예전 저장에는 키가 없어도 된다.
  function lesson(g, choices) {
    const branch = choices && choices.some((c) => c.kind === 'branch' && c.tier === 5);
    const ready = g.player && G.xcomboOptions(g.player).length > 0;
    const key = branch ? 'uiEvolutionBranch' : ready ? 'uiEvolutionCombo' : null;
    if (!key || G.meta.lore[key]) return null;
    G.meta.lore[key] = true;
    G.saveMeta();
    const tip = el('aside', 'evo-tip');
    tip.setAttribute('role', 'status');
    const words = el('span');
    const atChest = choices && choices.some((c) => c.kind === 'xcombo');
    words.append(el('strong', '', branch ? '갈래를 고르면 조합 짝이 정해져요' : atChest ? '조합 준비 완료! 합칠 무기를 고르세요' : '조합 준비 완료! 상자를 찾아보세요'), el('span', '', 'Lv 10 + 짝 무기 Lv 5 → 상자에서 조합'));
    const close = button('evo-tip-close', '확인', () => {
      tip.hidden = true;
      const next = document.querySelector('#screen-levelup:not([hidden]) #card-0') || document.getElementById('pause-btn');
      if (next && document.activeElement === close) next.focus({ preventScroll: true });
    });
    close.setAttribute('aria-label', '진화 안내 닫기');
    tip.append(words, close);
    return tip;
  }

  G.evolution = { path, library, choice, lesson };
})(window.G);
