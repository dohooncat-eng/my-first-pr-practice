// HTML 화면: 타이틀, 스테이지 선택, 챔피언 선택, 업그레이드, 설정, 레벨업, 상자, 일시정지, 결과, 확인 창
(function (G) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const SCREENS = ['title', 'stage', 'champion', 'shop', 'settings', 'levelup', 'chest', 'pause', 'end'];

  let game = null;
  let current = null;        // 지금 보이는 화면 이름
  let settingsFrom = null;   // 설정을 연 곳 (title | pause)
  let shopFrom = null;
  let pickedStage = null;
  let pickedChampion = null;
  let loaded = false;

  // ---------- 작은 도우미 ----------

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  function img(src, cls, size, alt) {
    const i = document.createElement('img');
    i.src = src;
    i.alt = alt || '';
    if (cls) i.className = cls;
    if (size) { i.width = size; i.height = size; }
    i.decoding = 'async';
    return i;
  }

  function iconUrl(key) { return G.spriteUrl('icon_' + key); }

  // 한국어 조사: 마지막 글자의 받침으로 을/를, 으로/로를 고른다
  function batchim(word) {
    const code = word.charCodeAt(word.length - 1) - 0xac00;
    return code >= 0 && code <= 11171 ? code % 28 : 0;
  }
  function eulReul(word) { return word + (batchim(word) ? '을' : '를'); }
  function euroRo(word) { const b = batchim(word); return word + (b && b !== 8 ? '으로' : '로'); }

  function fmtNum(n) { return Math.floor(n || 0).toLocaleString('ko-KR'); }

  function pips(level, max, cls) {
    const box = el('span', 'pips' + (cls ? ' ' + cls : ''));
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', '레벨 ' + level + ' / ' + max);
    for (let k = 1; k <= max; k++) box.appendChild(el('i', k <= level ? 'on' : ''));
    return box;
  }

  function sfx(name) { if (G.sfx) G.sfx.play(name); }

  function meta() { return G.meta || { gold: 0, unlocked: { keeper: true }, champLv: {}, cleared: {}, best: {}, settings: {} }; }

  function refreshGold() {
    const g = fmtNum(meta().gold);
    document.querySelectorAll('.js-gold').forEach((n) => { n.textContent = g; });
    $('title-gold').textContent = g;
  }

  function focusFirst(container) {
    const target = container.querySelector('[data-autofocus]:not([disabled])') ||
      container.querySelector('button:not([disabled]):not([hidden]), input:not([disabled])');
    if (target) target.focus({ preventScroll: true });
  }

  function show(name) {
    current = name;
    SCREENS.forEach((s) => { $('screen-' + s).hidden = s !== name; });
    $('pause-btn').hidden = !(name === null && game && game.state === 'playing');
  }

  // ---------- 확인 창 ----------

  let dialogYes = null;
  let dialogReturnFocus = null;

  function confirmDialog(title, text, yesLabel, onYes) {
    dialogReturnFocus = document.activeElement;
    $('dialog-title').textContent = title;
    $('dialog-text').textContent = text;
    $('dialog-yes').textContent = yesLabel;
    dialogYes = onYes;
    $('dialog').hidden = false;
    $('dialog-no').focus({ preventScroll: true });
  }

  function closeDialog() {
    $('dialog').hidden = true;
    dialogYes = null;
    if (dialogReturnFocus && dialogReturnFocus.focus) dialogReturnFocus.focus({ preventScroll: true });
  }

  // ---------- 타이틀 ----------

  function renderTitle() {
    refreshGold();
    const summary = G.savedRunSummary ? G.savedRunSummary() : null;
    const cont = $('btn-continue');
    const btnNew = $('btn-new');
    if (summary && loaded) {
      cont.hidden = false;
      $('continue-info').textContent = summary.stageName + ' · ' + summary.championName + ' · ' +
        G.formatTime(summary.time) + ' · Lv ' + summary.level;
      btnNew.classList.remove('btn-primary');
      btnNew.classList.add('btn-ghost');
    } else {
      cont.hidden = true;
      btnNew.classList.add('btn-primary');
      btnNew.classList.remove('btn-ghost');
    }
  }

  // ---------- 스테이지 선택 ----------

  const LOCK_SVG = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><rect x="4" y="9" width="12" height="8" rx="2" fill="currentColor"/><path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

  function renderStages() {
    const list = $('stage-list');
    list.textContent = '';
    const m = meta();
    G.STAGES.forEach((st, i) => {
      const unlocked = G.isStageUnlocked ? G.isStageUnlocked(st.id) : i === 0;
      const btn = el('button', 'stage-card' + (unlocked ? '' : ' is-locked'));
      btn.type = 'button';
      btn.id = 'stage-' + st.id;
      btn.disabled = !unlocked;
      const thumb = el('span', 'stage-thumb');
      thumb.appendChild(img(G.spriteUrl(st.thumb), '', 0, ''));
      btn.appendChild(thumb);
      const body = el('span', 'stage-body');
      const top = el('span', 'stage-top');
      top.appendChild(el('span', 'stage-num', 'STAGE ' + (i + 1)));
      if (m.cleared && m.cleared[st.id]) top.appendChild(el('span', 'badge badge-clear', '클리어'));
      body.appendChild(top);
      body.appendChild(el('span', 'stage-name', st.name));
      body.appendChild(el('span', 'stage-desc', st.desc));
      const best = m.best && m.best[st.id];
      if (!unlocked) {
        const lock = el('span', 'stage-lock');
        lock.innerHTML = LOCK_SVG;
        lock.appendChild(el('span', '', eulReul(G.STAGES[i - 1].name) + ' 깨면 열립니다'));
        body.appendChild(lock);
      } else if (best) {
        const champ = G.CHAMPIONS[best.champion];
        body.appendChild(el('span', 'stage-best', '최고 ' + G.formatTime(best.time) + ' · Lv ' + best.level +
          ' · 처치 ' + fmtNum(best.kills) + (champ ? ' · ' + champ.name : '')));
      } else {
        body.appendChild(el('span', 'stage-best', '아직 기록 없음'));
      }
      btn.appendChild(body);
      if (unlocked) {
        btn.addEventListener('click', () => {
          sfx('select');
          pickedStage = st.id;
          openChampion();
        });
      }
      list.appendChild(btn);
    });
  }

  function openStage() {
    renderStages();
    show('stage');
    const first = document.querySelector('#stage-list .stage-card:not([disabled])');
    const prev = pickedStage && $('stage-' + pickedStage);
    (prev && !prev.disabled ? prev : first).focus({ preventScroll: true });
  }

  // ---------- 챔피언 선택 ----------

  function renderChampions() {
    const list = $('champion-list');
    list.textContent = '';
    refreshGold();
    const m = meta();
    if (!pickedChampion || !(m.unlocked && m.unlocked[pickedChampion])) pickedChampion = 'keeper';
    G.CHAMPION_ORDER.forEach((key) => {
      const ch = G.CHAMPIONS[key];
      const unlocked = !!(m.unlocked && m.unlocked[key]);
      const lv = (m.champLv && m.champLv[key]) || 0;
      const card = el('div', 'champ-card' + (unlocked ? '' : ' is-locked') + (key === pickedChampion ? ' is-picked' : ''));
      const pick = el('button', 'champ-pick');
      pick.type = 'button';
      pick.id = 'champ-' + key;
      pick.setAttribute('aria-pressed', String(key === pickedChampion));
      pick.disabled = !unlocked;
      const portrait = el('span', 'champ-portrait');
      portrait.appendChild(img(G.spriteUrl(ch.sprite + '_0'), '', 0, ch.name));
      pick.appendChild(portrait);
      const body = el('span', 'champ-body');
      body.appendChild(el('span', 'champ-name', ch.name));
      body.appendChild(el('span', 'champ-desc', ch.desc));
      const weapon = el('span', 'champ-weapon');
      weapon.appendChild(img(iconUrl(ch.weapon), '', 22, ''));
      weapon.appendChild(el('span', '', euroRo(G.WEAPONS[ch.weapon].name) + ' 시작'));
      body.appendChild(weapon);
      body.appendChild(el('span', 'champ-trait', ch.trait));
      const ab = el('span', 'champ-ability');
      ab.appendChild(el('span', 'champ-ab-name', ch.ability.name));
      ab.appendChild(pips(lv, G.ABILITY_MAX || 5, 'pips-small'));
      body.appendChild(ab);
      pick.appendChild(body);
      card.appendChild(pick);
      if (unlocked) {
        pick.addEventListener('click', () => {
          sfx('select');
          pickedChampion = key;
          renderChampions();
          const again = $('champ-' + key);
          if (again) again.focus({ preventScroll: true });
        });
        pick.addEventListener('dblclick', startRun);
      } else {
        const price = G.championPrice ? G.championPrice(key) : ch.price;
        const buy = el('button', 'btn btn-primary btn-small champ-buy');
        buy.type = 'button';
        buy.id = 'buy-' + key;
        const affordable = meta().gold >= price;
        buy.disabled = !affordable;
        buy.innerHTML = '';
        buy.appendChild(el('span', 'coin', ''));
        buy.appendChild(el('span', '', fmtNum(price) + ' 금화로 해금'));
        buy.addEventListener('click', () => {
          if (G.buyChampion && G.buyChampion(key)) {
            sfx('coin');
            pickedChampion = key;
            renderChampions();
            const b = $('champ-' + key);
            if (b) b.focus({ preventScroll: true });
          }
        });
        card.appendChild(buy);
      }
      list.appendChild(card);
    });
    const ch = G.CHAMPIONS[pickedChampion];
    const st = G.stageById ? G.stageById(pickedStage) : G.STAGES[0];
    $('champion-pick').textContent = st.name + ' · ' + ch.name;
  }

  function openChampion() {
    renderChampions();
    show('champion');
    const b = $('champ-' + pickedChampion);
    if (b) b.focus({ preventScroll: true });
  }

  function startRun() {
    if (!pickedStage || !pickedChampion) return;
    sfx('select');
    game.newRun(pickedStage, pickedChampion);
  }

  // ---------- 업그레이드 상점 ----------

  function renderShop() {
    const list = $('shop-list');
    list.textContent = '';
    refreshGold();
    const m = meta();
    const max = G.ABILITY_MAX || 5;
    G.CHAMPION_ORDER.forEach((key) => {
      const ch = G.CHAMPIONS[key];
      const unlocked = !!(m.unlocked && m.unlocked[key]);
      const lv = (m.champLv && m.champLv[key]) || 0;
      const row = el('div', 'shop-row' + (unlocked ? '' : ' is-locked') + (lv >= max ? ' is-max' : ''));
      const portrait = el('span', 'shop-portrait');
      portrait.appendChild(img(G.spriteUrl(ch.sprite + '_0'), '', 0, ch.name));
      row.appendChild(portrait);
      const body = el('div', 'shop-body');
      const head = el('div', 'shop-head');
      head.appendChild(el('span', 'shop-name', ch.name));
      head.appendChild(el('span', 'shop-ab', ch.ability.name));
      body.appendChild(head);
      const lvRow = el('div', 'shop-lv');
      lvRow.appendChild(pips(lv, max));
      lvRow.appendChild(el('span', 'shop-lv-text', 'Lv ' + lv + ' / ' + max));
      body.appendChild(lvRow);
      body.appendChild(el('p', 'shop-per', 'Lv 1~4: ' + ch.ability.perLevel));
      const awaken = el('p', 'shop-awaken' + (lv >= max ? ' is-on' : ''));
      awaken.appendChild(el('span', 'badge badge-awaken', 'Lv 5 각성'));
      awaken.appendChild(el('span', '', ch.ability.awaken));
      body.appendChild(awaken);
      row.appendChild(body);

      const act = el('div', 'shop-act');
      if (!unlocked) {
        const price = G.championPrice ? G.championPrice(key) : ch.price;
        const buy = el('button', 'btn btn-ghost btn-small');
        buy.type = 'button';
        buy.disabled = m.gold < price;
        buy.appendChild(el('span', 'coin', ''));
        buy.appendChild(el('span', '', fmtNum(price) + ' 해금'));
        buy.addEventListener('click', () => {
          if (G.buyChampion && G.buyChampion(key)) { sfx('coin'); renderShop(); focusShop(key); }
        });
        buy.id = 'shop-buy-' + key;
        act.appendChild(buy);
      } else if (lv >= max) {
        act.appendChild(el('span', 'shop-max', '각성 완료'));
      } else {
        const cost = G.abilityCost ? G.abilityCost(key) : G.ABILITY_COSTS[lv];
        const up = el('button', 'btn btn-primary btn-small');
        up.type = 'button';
        up.id = 'shop-up-' + key;
        up.disabled = cost === null || m.gold < cost;
        up.appendChild(el('span', 'coin', ''));
        up.appendChild(el('span', '', fmtNum(cost) + (lv + 1 === max ? ' 각성' : ' 강화')));
        up.addEventListener('click', () => {
          if (G.upgradeAbility && G.upgradeAbility(key)) {
            sfx(lv + 1 >= max ? 'evolve' : 'levelup');
            renderShop();
            focusShop(key);
          }
        });
        act.appendChild(up);
      }
      row.appendChild(act);
      list.appendChild(row);
    });
  }

  function focusShop(key) {
    const b = $('shop-up-' + key) || $('shop-buy-' + key);
    if (b && !b.disabled) b.focus({ preventScroll: true });
    else focusFirst($('screen-shop'));
  }

  function openShop(from) {
    shopFrom = from || 'title';
    renderShop();
    show('shop');
    focusFirst($('shop-list'));
  }

  // ---------- 설정 ----------

  function settingsObj() {
    const m = meta();
    m.settings = m.settings || {};
    const s = m.settings;
    if (typeof s.sfx !== 'number') s.sfx = 0.7;
    if (typeof s.music !== 'number') s.music = 0.5;
    if (typeof s.shake !== 'boolean') s.shake = true;
    if (typeof s.numbers !== 'boolean') s.numbers = true;
    if (typeof s.fps !== 'boolean') s.fps = false;
    return s;
  }

  function saveSettings() { if (G.saveMeta) G.saveMeta(); }

  function renderSettings() {
    const s = settingsObj();
    const v = Math.round(s.sfx * 100);
    $('set-sfx').value = v;
    $('set-sfx-out').textContent = v;
    const mv = Math.round(s.music * 100);
    $('set-music').value = mv;
    $('set-music-out').textContent = mv;
    $('set-shake').checked = s.shake;
    $('set-numbers').checked = s.numbers;
    $('set-fps').checked = s.fps;
    $('set-fullscreen').textContent = document.fullscreenElement ? '창 모드로' : '전체 화면으로';
    // 판 진행 중에는 데이터를 지울 수 없게
    $('set-reset').disabled = settingsFrom === 'pause';
  }

  function openSettings(from) {
    settingsFrom = from || 'title';
    renderSettings();
    show('settings');
    $('set-sfx').focus({ preventScroll: true });
  }

  function closeSettings() {
    if (settingsFrom === 'pause') {
      show('pause');
      $('btn-pause-settings').focus({ preventScroll: true });
    } else {
      showTitleScreen();
      $('btn-settings').focus({ preventScroll: true });
    }
  }

  function bindSettings() {
    const s = () => settingsObj();
    $('set-sfx').addEventListener('input', (e) => {
      s().sfx = Number(e.target.value) / 100;
      $('set-sfx-out').textContent = e.target.value;
    });
    $('set-sfx').addEventListener('change', () => { saveSettings(); sfx('gem'); });
    // 배경 음악은 끌어도 바로 들리게 input에서 반영하고, 놓았을 때 저장
    $('set-music').addEventListener('input', (e) => {
      s().music = Number(e.target.value) / 100;
      $('set-music-out').textContent = e.target.value;
      if (G.music) G.music.refreshVolume();
    });
    $('set-music').addEventListener('change', () => { saveSettings(); });
    $('set-shake').addEventListener('change', (e) => { s().shake = e.target.checked; saveSettings(); sfx('click'); });
    $('set-numbers').addEventListener('change', (e) => { s().numbers = e.target.checked; saveSettings(); sfx('click'); });
    $('set-fps').addEventListener('change', (e) => { s().fps = e.target.checked; saveSettings(); sfx('click'); });
    $('set-fullscreen').addEventListener('click', () => {
      sfx('click');
      const done = () => setTimeout(renderSettings, 150);
      try {
        if (document.fullscreenElement) document.exitFullscreen().then(done, done);
        else document.documentElement.requestFullscreen().then(done, done);
      } catch (e) { /* 전체 화면을 쓸 수 없는 환경 */ }
    });
    $('set-reset').addEventListener('click', () => {
      confirmDialog('저장 데이터를 모두 지울까요?', '금화, 해금한 챔피언, 업그레이드, 기록, 이어하기가 모두 사라지고 되돌릴 수 없습니다.', '모두 지우기', () => {
        if (G.resetAllData) G.resetAllData();
        closeDialog();
        renderSettings();
        refreshGold();
        $('set-reset').focus({ preventScroll: true });
      });
    });
  }

  // ---------- 레벨업 ----------

  let cardHandler = null;
  let cardsReady = false;
  let cardCount = 0;

  function choiceIcon(c, d) {
    if (c.kind === 'gold') return G.spriteUrl('coin');
    return iconUrl(d.icon);
  }

  function showLevelUp(g, choices, onPick) {
    show('levelup');
    $('lv-number').textContent = g.player.level;
    const box = $('cards');
    box.textContent = '';
    box.classList.toggle('is-four', choices.length >= 4);
    cardsReady = false;
    cardCount = choices.length;
    box.classList.add('arming');
    choices.forEach((c, i) => {
      const d = G.describeChoice(c);
      const btn = el('button', 'card' + (d.isNew ? ' is-new' : '') + (d.comboHint ? ' has-combo' : ''));
      btn.type = 'button';
      btn.id = 'card-' + i;
      btn.appendChild(el('span', 'card-key', String(i + 1)));
      const ic = el('span', 'card-icon');
      ic.appendChild(img(choiceIcon(c, d), '', 56, ''));
      btn.appendChild(ic);
      const body = el('span', 'card-body');
      body.appendChild(el('span', 'card-tag', d.tag));
      body.appendChild(el('span', 'card-title', d.title));
      body.appendChild(el('span', 'card-text', d.text));
      if (d.max) {
        const pp = el('span', 'pips');
        pp.setAttribute('role', 'img');
        pp.setAttribute('aria-label', '레벨 ' + d.level + ' / ' + d.max);
        for (let k = 1; k <= d.max; k++) pp.appendChild(el('i', k < d.level ? 'on' : k === d.level ? 'next' : ''));
        body.appendChild(pp);
      }
      if (d.comboHint) body.appendChild(el('span', 'card-combo', d.comboHint));
      btn.appendChild(body);
      btn.addEventListener('click', () => G.ui.pickCard(i));
      box.appendChild(btn);
    });
    cardHandler = (i) => onPick(choices[i]);
    sfx('levelup');
    // 레벨업 순간의 실수 클릭을 막으려고 잠깐 기다린다
    setTimeout(() => {
      cardsReady = true;
      box.classList.remove('arming');
      const first = $('card-0');
      if (first && current === 'levelup') first.focus({ preventScroll: true });
    }, 350);
  }

  function pickCard(i) {
    if (!cardsReady || !cardHandler || !$('card-' + i)) return;
    cardsReady = false;
    sfx('select');
    const h = cardHandler;
    cardHandler = null;
    h(i);
  }

  // ---------- 상자 ----------

  let chestClose = null;
  let chestTimer = null;
  let chestRevealed = false;

  function chestItem(iconKey, name, detail, cls) {
    const li = el('li', 'chest-item' + (cls ? ' ' + cls : ''));
    const ic = el('span', 'chest-item-icon');
    ic.appendChild(img(iconUrl(iconKey), '', 44, ''));
    li.appendChild(ic);
    const body = el('span', 'chest-item-body');
    body.appendChild(el('span', 'chest-item-name', name));
    body.appendChild(el('span', 'chest-item-detail', detail));
    li.appendChild(body);
    return li;
  }

  function revealChest(result) {
    if (chestRevealed) return;
    chestRevealed = true;
    clearTimeout(chestTimer);
    const stage = $('chest-stage');
    stage.classList.remove('is-shaking');
    stage.classList.add('is-open');
    const list = $('chest-list');
    list.textContent = '';
    if (result.combo) {
      const c = result.combo;
      const label = (G.COMBO_TYPE_LABEL && G.COMBO_TYPE_LABEL[c.type]) || '조합';
      list.appendChild(chestItem(c.result, c.name, label + '!', 'is-combo'));
    }
    (result.upgrades || []).forEach((u) => {
      const detail = u.from > 0 ? 'Lv ' + u.from + ' → ' + u.to : '새로 얻음 · Lv ' + u.to;
      list.appendChild(chestItem(u.key, u.name, detail, ''));
    });
    if (!list.children.length) list.appendChild(chestItem('heal', '빈 상자', '더 올릴 무기나 패시브가 없습니다', ''));
    [...list.children].forEach((li, i) => { li.style.animationDelay = (0.12 + i * 0.12) + 's'; });
    const count = result.count || list.children.length;
    $('chest-eyebrow').textContent = result.combo ? '조합 성공' : '상자';
    $('chest-title').textContent = result.combo ? '강해졌습니다 · ' + count + '개' : '강화 ' + count + '개';
    $('chest-result').hidden = false;
    sfx(result.combo ? 'evolve' : 'chest');
    setTimeout(() => { if (current === 'chest') $('btn-chest-ok').focus({ preventScroll: true }); }, 250);
  }

  function showChest(g, result, onClose) {
    show('chest');
    chestClose = onClose;
    chestRevealed = false;
    const stage = $('chest-stage');
    stage.classList.remove('is-open');
    stage.classList.add('is-shaking');
    stage.classList.toggle('is-combo', !!result.combo);
    $('chest-result').hidden = true;
    stage.onclick = () => revealChest(result);
    stage.focus({ preventScroll: true });
    sfx('chest');
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    chestTimer = setTimeout(() => revealChest(result), reduced ? 150 : 1100);
  }

  function closeChest() {
    if (!chestRevealed) return;
    const h = chestClose;
    chestClose = null;
    if (h) { sfx('click'); h(); }
  }

  // ---------- 일시정지 ----------

  function buildItem(key, name, levelText, cls) {
    const li = el('li', 'build-item' + (cls ? ' ' + cls : ''));
    li.appendChild(img(iconUrl(key), '', 36, ''));
    const body = el('span', 'build-body');
    body.appendChild(el('span', 'build-name', name));
    body.appendChild(el('span', 'build-lv', levelText));
    li.appendChild(body);
    return li;
  }

  function renderBuild(g) {
    const p = g.player;
    const wl = $('build-weapons');
    const pl = $('build-passives');
    wl.textContent = '';
    pl.textContent = '';
    p.weapons.forEach((w) => {
      const def = G.WEAPONS[w.key];
      const combo = def.kind !== 'base';
      wl.appendChild(buildItem(w.key, def.name, combo ? (def.kind === 'evolved' ? '진화' : '무기 조합') : 'Lv ' + w.level + (w.level >= G.WEAPON_MAX ? ' MAX' : ''), combo ? 'is-combo' : ''));
    });
    for (let i = p.weapons.length; i < G.WEAPON_SLOTS; i++) wl.appendChild(el('li', 'build-item is-empty', '빈 칸'));
    (p.fusions || []).forEach((f) => pl.appendChild(buildItem(f, G.FUSIONS[f].name, '패시브 조합', 'is-combo')));
    Object.keys(p.passives).forEach((k) => {
      const lv = p.passives[k];
      pl.appendChild(buildItem(k, G.PASSIVES[k].name, 'Lv ' + lv + (lv >= G.PASSIVE_MAX ? ' MAX' : ''), ''));
    });
    const used = Object.keys(p.passives).length + (p.fusions || []).length;
    for (let i = used; i < G.PASSIVE_SLOTS; i++) pl.appendChild(el('li', 'build-item is-empty', '빈 칸'));
    $('build-wcount').textContent = p.weapons.length + ' / ' + G.WEAPON_SLOTS;
    $('build-pcount').textContent = used + ' / ' + G.PASSIVE_SLOTS;
  }

  function renderComboBook(g) {
    const book = $('combo-book');
    book.textContent = '';
    const status = G.comboStatus ? G.comboStatus(g.player) : [];
    const groups = { evolve: [], union: [], fusion: [] };
    status.forEach((s) => { (groups[s.combo.type] || (groups[s.combo.type] = [])).push(s); });
    const labels = G.COMBO_TYPE_LABEL || { evolve: '진화', union: '무기 조합', fusion: '패시브 조합' };
    const rules = {
      evolve: '무기 Lv 5 + 패시브 보유 → 상자에서 진화',
      union: '두 무기 모두 Lv 5 → 상자에서 하나로',
      fusion: '두 패시브 모두 Lv 5 → 상자에서 하나로',
    };
    Object.keys(groups).forEach((type) => {
      if (!groups[type].length) return;
      const sec = el('section', 'combo-group');
      const head = el('div', 'combo-group-head');
      head.appendChild(el('h3', 'combo-group-title', labels[type]));
      head.appendChild(el('span', 'combo-group-rule', rules[type]));
      sec.appendChild(head);
      const ul = el('ul', 'combo-list');
      groups[type].forEach((s) => {
        const li = el('li', 'combo-row' + (s.ready ? ' is-ready' : '') + (s.done ? ' is-done' : ''));
        const parts = el('span', 'combo-parts');
        s.parts.forEach((pt, i) => {
          if (i > 0) parts.appendChild(el('span', 'combo-plus', '+'));
          const part = el('span', 'combo-part' + (pt.ok ? ' is-ok' : pt.level > 0 ? ' is-partial' : ''));
          part.title = pt.name;
          part.appendChild(img(iconUrl(pt.key), '', 30, pt.name));
          const need = pt.kind === 'weapon' || pt.need > 1 ? (pt.level || 0) + '/' + pt.need : pt.level > 0 ? '보유' : '없음';
          part.appendChild(el('span', 'combo-part-lv', need));
          parts.appendChild(part);
        });
        li.appendChild(parts);
        li.appendChild(el('span', 'combo-arrow', '→'));
        const res = el('span', 'combo-result');
        res.appendChild(img(iconUrl(s.result.key), '', 34, ''));
        const rb = el('span', 'combo-result-body');
        rb.appendChild(el('span', 'combo-result-name', s.result.name));
        rb.appendChild(el('span', 'combo-result-desc', s.ready ? '조건 충족 · 다음 상자에서 조합' : s.done ? '완성' : s.result.desc));
        res.appendChild(rb);
        li.appendChild(res);
        ul.appendChild(li);
      });
      sec.appendChild(ul);
      book.appendChild(sec);
    });
  }

  function setTab(tab) {
    const build = tab === 'build';
    $('tab-build').setAttribute('aria-selected', String(build));
    $('tab-combo').setAttribute('aria-selected', String(!build));
    $('pane-build').hidden = !build;
    $('pane-combo').hidden = build;
  }

  function showPause(g) {
    show('pause');
    const st = g.stage || G.STAGES[0];
    const ch = G.CHAMPIONS[g.player.champion];
    $('pause-eyebrow').textContent = '일시정지 · ' + st.name + ' · ' + G.formatTime(g.time);
    $('pause-title').textContent = (ch ? ch.name : '지금') + '의 등불';
    renderBuild(g);
    renderComboBook(g);
    setTab('build');
    $('btn-resume').focus({ preventScroll: true });
  }

  // ---------- 결과 ----------

  function showEnd(g, r) {
    show('end');
    const screen = $('screen-end');
    screen.classList.toggle('is-win', !!r.win);
    const st = G.stageById ? G.stageById(r.stageId) : G.STAGES[0];
    $('end-eyebrow').textContent = st.name + ' · ' + (r.win ? '20:00 생존' : G.formatTime(r.time) + '에 쓰러짐');
    $('end-title').textContent = r.win ? '새벽이 밝았습니다' : '등불이 꺼졌습니다';
    $('end-time').textContent = G.formatTime(r.time);
    $('end-level').textContent = r.level;
    $('end-kills').textContent = fmtNum(r.kills);
    $('end-gold').textContent = '+' + fmtNum(r.gold);
    const ul = $('end-unlocked');
    ul.textContent = '';
    (r.newlyUnlocked || []).forEach((t) => ul.appendChild(el('li', 'end-unlock', t)));
    ul.hidden = !ul.children.length;
    pickedStage = r.stageId || pickedStage;
    pickedChampion = r.championId || pickedChampion;
    sfx(r.win ? 'evolve' : 'hurt');
    $('btn-retry').focus({ preventScroll: true });
  }

  // ---------- 화면 전환 ----------

  function showTitleScreen() {
    renderTitle();
    show('title');
  }

  function back() {
    if (!$('dialog').hidden) { closeDialog(); return true; }
    switch (current) {
      case 'stage': showTitleScreen(); $('btn-new').focus({ preventScroll: true }); return true;
      case 'champion': openStage(); return true;
      case 'shop':
        showTitleScreen();
        $('btn-shop').focus({ preventScroll: true });
        return true;
      case 'settings': closeSettings(); return true;
      case 'pause':
        if (!$('pane-combo').hidden) { setTab('build'); $('tab-build').focus({ preventScroll: true }); return true; }
        if (game && game.resume) game.resume();
        return true;
      default: return false;
    }
  }

  // 방향키로 보이는 화면 안의 버튼 사이를 이동
  function moveFocus(dir) {
    const root = !$('dialog').hidden ? $('dialog') : current && $('screen-' + current);
    if (!root) return false;
    const items = [...root.querySelectorAll('button:not([disabled]), input:not([disabled])')]
      .filter((n) => n.offsetParent !== null && !n.closest('[hidden]'));
    if (!items.length) return false;
    const i = items.indexOf(document.activeElement);
    const next = i === -1 ? 0 : (i + dir + items.length) % items.length;
    items[next].focus({ preventScroll: false });
    return true;
  }

  function onKeyDown(e) {
    if (!game) return;
    const tag = e.target && e.target.tagName;
    if (e.key === 'Escape') {
      // 화면이 처리한 Esc는 게임 쪽(일시정지 토글)으로 넘기지 않는다
      if (back()) { e.preventDefault(); e.stopPropagation(); }
      return;
    }
    if (current === 'levelup' && /^Digit[1-4]$/.test(e.code)) {
      const i = Number(e.code.slice(5)) - 1;
      if (i < cardCount) { pickCard(i); e.preventDefault(); }
      return;
    }
    if (current === 'chest' && (e.key === 'Enter' || e.key === ' ')) {
      if (tag === 'BUTTON' && e.target.id === 'btn-chest-ok') return; // 버튼이 직접 처리
      e.preventDefault();
      if (!chestRevealed) $('chest-stage').click();
      else closeChest();
      return;
    }
    if (current === 'champion' && e.key === 'Enter' && tag !== 'BUTTON') { startRun(); e.preventDefault(); return; }
    if (current === 'end' && e.key === 'Enter' && tag !== 'BUTTON') { game.retry(); e.preventDefault(); return; }
    if (tag === 'INPUT' && e.target.type === 'range') return;
    const visible = current && current !== null && $('screen-' + current) && !$('screen-' + current).hidden;
    if (!visible && $('dialog').hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { if (moveFocus(1)) e.preventDefault(); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { if (moveFocus(-1)) e.preventDefault(); }
  }

  // ---------- 공개 함수 ----------

  G.ui = {
    init(g) {
      game = g;
      // 로고 그림이 없으면 글자 로고로
      const logo = $('logo-img');
      const markLogo = () => $('logo').classList.toggle('has-img', !!(logo.complete && logo.naturalWidth));
      logo.addEventListener('load', markLogo);
      logo.addEventListener('error', markLogo);
      markLogo();

      $('btn-continue').addEventListener('click', () => { sfx('select'); game.continueRun(); });
      $('btn-new').addEventListener('click', () => { sfx('select'); openStage(); });
      $('btn-shop').addEventListener('click', () => { sfx('click'); openShop('title'); });
      $('btn-settings').addEventListener('click', () => { sfx('click'); openSettings('title'); });
      $('btn-start').addEventListener('click', startRun);
      document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => { sfx('click'); back(); }));
      bindSettings();

      $('btn-chest-ok').addEventListener('click', closeChest);

      $('tab-build').addEventListener('click', () => { sfx('click'); setTab('build'); });
      $('tab-combo').addEventListener('click', () => { sfx('click'); setTab('combo'); });
      $('btn-resume').addEventListener('click', () => { sfx('click'); game.resume(); });
      $('btn-pause-settings').addEventListener('click', () => { sfx('click'); openSettings('pause'); });
      $('btn-save-quit').addEventListener('click', () => { sfx('click'); game.saveAndQuit(); });
      $('btn-giveup').addEventListener('click', () => {
        confirmDialog('이번 판을 포기할까요?', '지금까지 버틴 시간과 모은 금화로 결과가 정해지고, 이어하기 기록은 지워집니다.', '포기하기', () => {
          closeDialog();
          game.giveUp();
        });
      });
      $('pause-btn').addEventListener('click', () => game.pause());

      $('btn-retry').addEventListener('click', () => { sfx('select'); game.retry(); });
      $('btn-end-stage').addEventListener('click', () => {
        sfx('click');
        if (game.toTitle) game.toTitle();
        openStage();
      });
      $('btn-title').addEventListener('click', () => { sfx('click'); game.toTitle(); });

      $('dialog-yes').addEventListener('click', () => { if (dialogYes) dialogYes(); });
      $('dialog-no').addEventListener('click', closeDialog);

      // 화면 쪽 키 처리: Esc(뒤로), 1~4(레벨업), Enter, 방향키.
      // 캡처 단계에서 먼저 받아, 처리한 Esc가 게임의 일시정지 키로 다시 쓰이지 않게 한다.
      window.addEventListener('keydown', onKeyDown, true);
      document.addEventListener('fullscreenchange', () => { if (current === 'settings') renderSettings(); });
    },

    setLoading(progress, done) {
      loaded = !!done;
      const btn = $('btn-new');
      btn.disabled = !done;
      $('new-label').textContent = done ? '새 게임' : '등불을 켜는 중 ' + Math.round((progress || 0) * 100) + '%';
      $('btn-continue').disabled = !done;
      if (done) {
        renderTitle();
        if (current === 'title') ($('btn-continue').hidden ? btn : $('btn-continue')).focus({ preventScroll: true });
      }
    },

    showTitle() { showTitleScreen(); focusFirst($('screen-title')); },
    hideAll() { if (!$('dialog').hidden) closeDialog(); show(null); },
    show(name) { if (name === 'title') showTitleScreen(); else show(name); },
    showStageSelect: openStage,
    showLevelUp,
    pickCard,
    showChest,
    showPause,
    showEnd,
    openSettings,
    openShop,
    current() { return current; },
  };
})(window.G);
