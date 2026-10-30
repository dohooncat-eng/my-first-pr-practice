// HTML 화면: 타이틀, 스테이지 선택, 챔피언 선택, 업그레이드, 뽑기, 상점, 설정, 레벨업, 상자, 일시정지, 결과, 확인 창
(function (G) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const SCREENS = ['title', 'stage', 'champion', 'shop', 'codex', 'lore', 'gacha', 'store', 'settings', 'levelup', 'chest', 'pause', 'end'];

  let game = null;
  let current = null;        // 지금 보이는 화면 이름
  let settingsFrom = null;   // 설정을 연 곳 (title | pause)
  let shopFrom = null;
  let pickedStage = null;
  let pickedChampion = null;
  let championFrom = 'stage';
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

  // 조합 무기처럼 아이콘을 빌려 쓰는 것은 def.icon
  function iconUrl(key) { const d = G.WEAPONS[key]; return G.spriteUrl('icon_' + ((d && d.icon) || key)); }

  // 한국어 조사: 마지막 글자의 받침으로 을/를, 으로/로를 고른다
  function batchim(word) {
    const code = word.charCodeAt(word.length - 1) - 0xac00;
    return code >= 0 && code <= 11171 ? code % 28 : 0;
  }
  function eulReul(word) { return word + (batchim(word) ? '을' : '를'); }
  function iGa(word) { return word + (batchim(word) ? '이' : '가'); }
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
    const c = fmtNum(meta().crystals);
    document.querySelectorAll('.js-gold').forEach((n) => { n.textContent = g; });
    document.querySelectorAll('.js-crystal').forEach((n) => { n.textContent = c; });
    $('title-gold').textContent = g;
    $('title-crystal').textContent = c;
  }

  function reducedMotion() {
    return document.documentElement.classList.contains('reduce-motion') || !!meta().settings.reducedMotion || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  // 그림이 아직 없을 때 깨진 그림 대신 빈 자리를 보이게
  function hideOnError(i) {
    i.addEventListener('error', () => { i.style.visibility = 'hidden'; });
    return i;
  }

  function focusFirst(container) {
    const target = container.querySelector('[data-autofocus]:not([disabled])') ||
      container.querySelector('button:not([disabled]):not([hidden]), input:not([disabled])');
    if (target) target.focus({ preventScroll: true });
  }

  function show(name) {
    const changed = current !== name;
    current = name;
    document.documentElement.dataset.screen = name || 'playing';
    document.documentElement.classList.toggle('reduce-motion', !!meta().settings.reducedMotion);
    SCREENS.forEach((s) => { $('screen-' + s).hidden = s !== name; });
    if (changed && name) { const scroll = $('screen-' + name).querySelector('.menu-content'); if (scroll) scroll.scrollTop = 0; }
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
    $('dialog-yes').className = 'btn btn-danger';
    $('dialog-no').hidden = false;
    dialogYes = onYes;
    $('dialog').hidden = false;
    $('dialog').setAttribute('role', 'alertdialog');
    $('dialog-no').focus({ preventScroll: true });
  }

  // 버튼 하나짜리 안내 창
  function infoDialog(title, text) {
    dialogReturnFocus = document.activeElement;
    $('dialog-title').textContent = title;
    $('dialog-text').textContent = text;
    $('dialog-yes').textContent = '확인';
    $('dialog-yes').className = 'btn btn-primary';
    $('dialog-no').hidden = true;
    dialogYes = closeDialog;
    $('dialog').hidden = false;
    $('dialog').setAttribute('role', 'dialog');
    $('dialog-yes').focus({ preventScroll: true });
  }

  function closeDialog() {
    $('dialog').hidden = true;
    dialogYes = null;
    if (dialogReturnFocus && dialogReturnFocus.focus) dialogReturnFocus.focus({ preventScroll: true });
  }

  // ---------- 타이틀 ----------

  function renderTitle() {
    refreshGold();
    $('screen-title').classList.toggle('reduce-motion', !!meta().settings.reducedMotion);
    document.documentElement.classList.toggle('reduce-motion', !!meta().settings.reducedMotion);
    $('btn-gacha').classList.toggle('has-dot', !!(G.gachaFreeAvailable && G.gachaFreeAvailable()));
    const stages = G.STAGES.filter((st) => G.isStageUnlocked(st.id));
    const st = stages.find((s) => s.id === pickedStage) || stages[0];
    if (!st) { $('btn-new').disabled = true; return; }
    pickedStage = st.id;
    let diff = pickedDiff();
    if (!diffOpen(st.id, diff.id)) diff = G.difficultyById('normal');
    game.pickedDifficulty = diff.id;
    $('lobby-stage-name').textContent = st.name;
    $('lobby-stage-thumb').src = G.spriteUrl(st.thumb);
    $('lobby-rewards').textContent = '금화 ×' + diff.gold + '  ·  클리어 결정 ' + Math.round(diff.crystals * (1 + G.STAGES.indexOf(st) * 0.5));
    const hero = G.CHAMPIONS[pickedChampion || 'keeper'];
    $('lobby-hero-art').src = G.spriteUrl(hero.sprite + '_0');
    $('lobby-hero-name').textContent = hero.name;
    const box = $('lobby-difficulties');
    box.textContent = '';
    G.DIFFICULTIES.forEach((d) => {
      const open = diffOpen(st.id, d.id);
      const b = el('button', 'lobby-diff' + (d.id === diff.id ? ' is-picked' : '') + (d.id !== 'normal' ? ' is-bonus' : ''));
      b.type = 'button';
      b.disabled = !open;
      b.setAttribute('aria-pressed', String(d.id === diff.id));
      b.title = d.desc + (open ? '' : ' · ' + G.difficultyLockText(st.id, d.id));
      if (!open) b.innerHTML = LOCK_SVG;
      b.appendChild(el('span', '', d.name + ' · ' + G.difficultyById(d.id).time / 60 + '분'));
      b.appendChild(el('small', '', '금화 ' + d.gold + '배'));
      b.addEventListener('click', () => {
        game.pickedDifficulty = d.id;
        G.meta.lastDifficulty = d.id;
        G.saveMeta();
        sfx('click');
        renderTitle();
        box.querySelector('[aria-pressed="true"]').focus({ preventScroll: true });
      });
      box.appendChild(b);
    });
    const summary = G.savedRunSummary ? G.savedRunSummary() : null;
    const cont = $('btn-continue');
    if (summary && loaded) {
      cont.hidden = false;
      $('continue-info').textContent = summary.stageName + ' · ' + summary.championName + ' · ' +
        G.formatTime(summary.time) + ' · Lv ' + summary.level;
    } else {
      cont.hidden = true;
    }
  }

  // ---------- 스테이지 선택 ----------

  const LOCK_SVG = '<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><rect x="4" y="9" width="12" height="8" rx="2" fill="currentColor"/><path d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

  // 난이도: 보통 / 어려움 / MAX. 스테이지마다 앞 난이도를 깨야 열린다.
  function diffOpen(stageId, diffId) {
    return G.isDifficultyUnlocked ? G.isDifficultyUnlocked(stageId, diffId) : true;
  }

  // 어느 스테이지에서든 열린 난이도인지 (위쪽 난이도 버튼)
  function diffOpenAnywhere(diffId) {
    return G.STAGES.some((st) => G.isStageUnlocked(st.id) && diffOpen(st.id, diffId));
  }

  function pickedDiff() {
    let id = game.pickedDifficulty || (G.meta && G.meta.lastDifficulty) || 'normal';
    if (!diffOpenAnywhere(id)) id = 'normal';
    return G.difficultyById ? G.difficultyById(id) : { id: 'normal', name: '보통', desc: '' };
  }

  function diffLockLine(d) {
    const t = G.difficultyLockText ? G.difficultyLockText(G.STAGES[0].id, d.id) : null;
    return d.name + ' 잠김 · 스테이지마다 ' + (t || '앞 난이도를 깨면 열립니다');
  }

  function renderDifficulty() {
    const box = $('diff-list');
    if (!box || !G.DIFFICULTIES) return;
    box.textContent = '';
    const cur = pickedDiff();
    G.DIFFICULTIES.forEach((d) => {
      const open = diffOpenAnywhere(d.id);
      const b = el('button', 'diff-btn diff-' + d.id + (d.id === cur.id ? ' is-on' : '') + (open ? '' : ' is-locked'));
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', d.id === cur.id ? 'true' : 'false');
      if (!open) {
        b.setAttribute('aria-disabled', 'true');
        const lock = el('span', 'diff-lock');
        lock.innerHTML = LOCK_SVG;
        b.appendChild(lock);
      }
      b.appendChild(el('span', '', d.name));
      b.addEventListener('click', () => {
        sfx('click');
        if (!open) { $('diff-desc').textContent = diffLockLine(d); return; }
        game.pickedDifficulty = d.id;
        if (G.meta) { G.meta.lastDifficulty = d.id; if (G.saveMeta) G.saveMeta(); }
        renderDifficulty();
        renderStages();
      });
      box.appendChild(b);
    });
    $('diff-desc').textContent = cur.desc;
  }

  function renderStages() {
    const list = $('stage-list');
    list.textContent = '';
    const m = meta();
    const diff = pickedDiff();
    G.STAGES.forEach((st, i) => {
      const stageOpen = G.isStageUnlocked ? G.isStageUnlocked(st.id) : i === 0;
      if (!stageOpen) return; // 아직 열리지 않은 스테이지는 미리 보여주지 않는다
      const diffLocked = stageOpen && !diffOpen(st.id, diff.id);
      const unlocked = stageOpen && !diffLocked;
      const btn = el('button', 'stage-card' + (unlocked ? '' : ' is-locked') + (diffLocked ? ' is-difflocked' : ''));
      btn.type = 'button';
      btn.id = 'stage-' + st.id;
      btn.disabled = !unlocked;
      const thumb = el('span', 'stage-thumb');
      thumb.appendChild(img(G.spriteUrl(st.thumb), '', 0, ''));
      btn.appendChild(thumb);
      const body = el('span', 'stage-body');
      const top = el('span', 'stage-top');
      top.appendChild(el('span', 'stage-num', '제 ' + (i + 1) + ' 장'));
      if (m.cleared && m.cleared[st.id]) top.appendChild(el('span', 'badge badge-clear', '클리어'));
      (G.DIFFICULTIES || []).forEach((d) => {
        if (d.id !== 'normal' && m.cleared && m.cleared[st.id + ':' + d.id]) top.appendChild(el('span', 'badge badge-diff-' + d.id, d.name));
      });
      body.appendChild(top);
      body.appendChild(el('span', 'stage-name', st.name));
      body.appendChild(el('span', 'stage-desc', st.desc));
      const best = m.best && (m.best[st.id + ':' + diff.id] || (diff.id === 'normal' && m.best[st.id] && !m.best[st.id].difficulty ? m.best[st.id] : null));
      if (diffLocked) {
        const lock = el('span', 'stage-lock stage-lock-diff');
        lock.innerHTML = LOCK_SVG;
        lock.appendChild(el('span', '', diff.name + ' 잠김 · ' + (G.difficultyLockText(st.id, diff.id) || '')));
        body.appendChild(lock);
      } else if (best) {
        const champ = G.CHAMPIONS[best.champion];
        body.appendChild(el('span', 'stage-best', '최고 ' + G.formatTime(best.time) + ' · Lv ' + best.level +
          ' · 처치 ' + fmtNum(best.kills) + (champ ? ' · ' + champ.name : '')));
      } else {
        body.appendChild(el('span', 'stage-best', '아직 기록 없음'));
      }
      if (stageOpen && st.unlocks && st.unlocks.length) {
        body.appendChild(el('span', 'stage-unlocks is-open', '이 스테이지에서 열린 무기·패시브 ' + st.unlocks.length + '개'));
      }
      body.appendChild(el('span', 'stage-enter', '여정 선택  ›'));
      btn.appendChild(body);
      if (unlocked) {
        btn.addEventListener('click', () => {
          sfx('select');
          pickedStage = st.id;
          openChampion('stage');
        });
      }
      list.appendChild(btn);
    });
  }

  function openStage() {
    renderDifficulty();
    renderStages();
    show('stage');
    const first = document.querySelector('#stage-list .stage-card:not([disabled])');
    const prev = pickedStage && $('stage-' + pickedStage);
    const target = prev && !prev.disabled ? prev : first;
    if (target) target.focus({ preventScroll: true });
  }

  // ---------- 챔피언 선택 ----------

  function renderChampions() {
    const list = $('champion-list');
    list.textContent = '';
    refreshGold();
    const m = meta();
    if (!pickedChampion || !m.unlocked[pickedChampion]) pickedChampion = 'keeper';
    const selected = G.CHAMPIONS[pickedChampion];
    const lv = m.champLv[pickedChampion] || 0;
    const feature = $('hero-feature');
    feature.className = 'hero-feature star-' + selected.star;
    feature.textContent = '';
    const art = el('div', 'hero-art');
    art.appendChild(hideOnError(img(G.spriteUrl(selected.sprite + '_0'), '', 0, selected.name)));
    feature.appendChild(art);
    const info = el('div', 'hero-info');
    info.appendChild(el('p', 'hero-rarity', stars(selected.star) + ' · Lv ' + lv));
    info.appendChild(el('h3', 'hero-name', selected.name));
    info.appendChild(el('p', 'hero-desc', selected.desc));
    const weapon = el('p', 'hero-weapon');
    weapon.appendChild(img(iconUrl(selected.weapon), '', 32, ''));
    weapon.appendChild(el('span', '', G.WEAPONS[selected.weapon].name + ' · 시작 무기'));
    info.appendChild(weapon);
    info.appendChild(el('p', 'hero-trait', selected.trait));
    info.appendChild(el('p', 'hero-build', selected.build));
    const ability = el('div', 'hero-ability');
    ability.appendChild(el('strong', '', selected.ability.name));
    ability.appendChild(pips(lv, G.ABILITY_MAX));
    info.appendChild(ability);
    feature.appendChild(info);
    $('hero-owned').textContent = G.CHAMPION_ORDER.filter((k) => m.unlocked[k]).length + ' / ' + G.CHAMPION_ORDER.length;
    G.CHAMPION_ORDER.forEach((key) => {
      const ch = G.CHAMPIONS[key];
      const unlocked = !!m.unlocked[key];
      const card = el('div', 'champ-card star-' + ch.star + (unlocked ? '' : ' is-locked') + (key === pickedChampion ? ' is-picked' : ''));
      const pick = el('button', 'champ-pick');
      pick.type = 'button';
      pick.id = 'champ-' + key;
      pick.setAttribute('aria-pressed', String(key === pickedChampion));
      pick.setAttribute('aria-label', ch.name + (unlocked ? ' 선택' : ' · 영웅 소환에서 획득'));
      pick.disabled = !unlocked;
      const portrait = el('span', 'champ-portrait');
      portrait.appendChild(hideOnError(img(G.spriteUrl(ch.sprite + '_0'), '', 0, '')));
      pick.appendChild(portrait);
      pick.appendChild(el('span', 'champ-stars', stars(ch.star)));
      pick.appendChild(el('span', 'champ-name', ch.name));
      if (!unlocked) { const lock = el('span', 'champ-lock'); lock.innerHTML = LOCK_SVG; pick.appendChild(lock); }
      if (unlocked) {
        pick.addEventListener('click', () => { sfx('select'); pickedChampion = key; renderChampions(); $('champ-' + key).focus({ preventScroll: true }); });
        pick.addEventListener('dblclick', startRun);
      }
      card.appendChild(pick);
      list.appendChild(card);
    });
    const st = G.stageById(pickedStage);
    $('champion-pick').textContent = st.name + ' · ' + pickedDiff().name;
  }

  function openChampion(from) {
    championFrom = from || 'stage';
    renderChampions();
    show('champion');
    const b = $('champ-' + pickedChampion);
    if (b) b.focus({ preventScroll: true });
  }

  function startRun() {
    if (!pickedStage || !pickedChampion) return;
    sfx('select');
    const d = pickedDiff().id;
    const go = () => game.newRun(pickedStage, pickedChampion, diffOpen(pickedStage, d) ? d : 'normal');
    // 스테이지에 처음 들어갈 때 그 땅의 이야기를 한 번
    if (G.LORE[pickedStage] && !meta().lore[pickedStage]) openLore(pickedStage, go);
    else go();
  }

  // ---------- 세계관 설명 ----------
  let loreDone = null;
  let loreTimers = [];

  function openLore(key, onDone) {
    const lore = G.LORE[key];
    if (!lore) { if (onDone) onDone(); return; }
    loreDone = onDone || null;
    meta().lore[key] = true;
    if (G.saveMeta) G.saveMeta();
    loreTimers.forEach(clearTimeout); loreTimers = [];
    const art = $('lore-art');
    art.src = G.spriteUrl(lore.art);
    $('lore-title').textContent = lore.title;
    const box = $('lore-text');
    box.textContent = '';
    const paras = lore.paras.map((t) => box.appendChild(el('p', 'lore-para', t)));
    // 문단이 하나씩 떠오른다(누르면 한꺼번에)
    paras.forEach((p, i) => loreTimers.push(setTimeout(() => p.classList.add('is-in'), 400 + i * 1100)));
    show('lore');
    $('btn-lore').focus({ preventScroll: true });
  }

  function closeLore() {
    const hidden = [...$('lore-text').children].filter((p) => !p.classList.contains('is-in'));
    if (hidden.length) { loreTimers.forEach(clearTimeout); hidden.forEach((p) => p.classList.add('is-in')); return; }
    sfx('click');
    const done = loreDone;
    loreDone = null;
    if (done) done(); else showTitleScreen();
  }

  // ---------- 업그레이드 상점 ----------

  // readOnly: 도감에서 쓰는 보기 전용(단추 없이 상태만)
  function renderShop(target, readOnly) {
    const list = target || $('shop-list');
    list.textContent = '';
    refreshGold();
    const m = meta();
    const max = G.ABILITY_MAX || 10;
    G.CHAMPION_ORDER.forEach((key) => {
      const ch = G.CHAMPIONS[key];
      const unlocked = !!(m.unlocked && m.unlocked[key]);
      const lv = (m.champLv && m.champLv[key]) || 0;
      const row = el('div', 'shop-row star-' + ch.star + ' ' + (unlocked ? '' : ' is-locked') + (lv >= max ? ' is-max' : ''));
      const portrait = el('span', 'shop-portrait');
      portrait.appendChild(img(G.spriteUrl(ch.sprite + '_0'), '', 0, ch.name));
      row.appendChild(portrait);
      const body = el('div', 'shop-body');
      const head = el('div', 'shop-head');
      head.appendChild(el('span', 'shop-name', '★'.repeat(ch.star || 1) + ' ' + ch.name));
      head.appendChild(el('span', 'shop-ab', ch.ability.name));
      body.appendChild(head);
      const lvRow = el('div', 'shop-lv');
      lvRow.appendChild(pips(lv, max));
      lvRow.appendChild(el('span', 'shop-lv-text', 'Lv ' + lv + ' / ' + max));
      body.appendChild(lvRow);
      body.appendChild(el('p', 'shop-per', (ch.build ? '빌드: ' + ch.build + ' · ' : '') + 'Lv마다 ' + ch.ability.perLevel));
      [[5, ch.ability.awaken], [10, ch.ability.awaken2]].forEach(([at, txt]) => {
        if (!txt) return;
        const awaken = el('p', 'shop-awaken' + (lv >= at ? ' is-on' : ''));
        awaken.appendChild(el('span', 'badge badge-awaken', 'Lv ' + at + ' 각성'));
        awaken.appendChild(el('span', '', txt));
        body.appendChild(awaken);
      });
      if (unlocked) body.appendChild(el('p', 'shop-per', '조각 ' + fmtNum((m.shards && m.shards[key]) || 0) + '개'));
      row.appendChild(body);

      const act = el('div', 'shop-act');
      if (readOnly) {
        act.appendChild(el('span', 'shop-max', !unlocked ? '잠김' : lv >= max ? '각성 완료' : 'Lv ' + lv));
      } else if (!unlocked) {
        // 영웅은 소환으로만 얻는다
        const go = el('button', 'btn btn-ghost btn-small');
        go.type = 'button';
        go.id = 'shop-buy-' + key;
        go.textContent = '영웅 소환에서 얻기';
        go.addEventListener('click', () => { sfx('click'); openGacha('shop'); });
        act.appendChild(go);
      } else if (lv >= max) {
        act.appendChild(el('span', 'shop-max', '각성 완료'));
      } else {
        const cost = G.abilityCost(key);
        const up = el('button', 'btn btn-primary btn-small');
        up.type = 'button';
        up.id = 'shop-up-' + key;
        up.disabled = !G.canUpgradeHero(key);
        up.appendChild(el('span', '', '조각 ' + cost.shards + ' · '));
        up.appendChild(el('span', 'coin', ''));
        up.appendChild(el('span', '', fmtNum(cost.gold) + (lv + 1 === 5 || lv + 1 === max ? ' 각성' : ' 강화')));
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

  // ---------- 뽑기 (등불 제단) ----------

  const STAR_TITLE = { 3: '★★★ · 한 번만 얻으면 끝', 2: '★★ · 최대 Lv 5', 1: '★ · 최대 Lv 100' };
  let gachaTab = 'altar';
  let gachaFrom = null;
  let lastPull = null;     // { n, cur } 한 번 더 뽑기용
  let pullBusy = false;    // 광고를 기다리는 중
  let pullPhase = null;    // charge | burst | reveal | done
  let pullTimers = [];
  let pullReturnFocus = null;

  function stars(n) { return '★'.repeat(n); }

  function costLabel(n, cur) {
    if (cur === 'hero') return fmtNum(G.heroCost(n)) + ' 결정';
    return fmtNum(G.gachaCost(n, cur)) + (cur === 'gold' ? ' 금화' : ' 결정');
  }

  function gachaMsg(text, storeLink) {
    const box = $('gacha-msg');
    box.textContent = text || '';
    if (storeLink) {
      const b = el('button', 'link-btn', '상점 가기');
      b.type = 'button';
      b.addEventListener('click', () => { sfx('click'); openStore('gacha'); });
      box.appendChild(b);
    }
  }

  function renderAltar() {
    refreshGold();
    $('gacha-pity').textContent = G.gachaPityLeft();
    $('hero-pity').textContent = '★★★까지 ' + G.heroPityLeft() + '회';
    document.querySelectorAll('#pane-altar .pull-btn').forEach((b) => {
      const n = Number(b.dataset.n), cur = b.dataset.cur;
      const cost = b.querySelector('.js-cost');
      if (cost) {
        cost.textContent = '';
        cost.appendChild(el('span', cur === 'gold' ? 'coin' : 'crystal', ''));
        cost.appendChild(el('span', '', costLabel(n, cur)));
      }
      const ok = cur === 'hero' ? G.heroCanAfford(n) : G.gachaCanAfford(n, cur);
      b.classList.toggle('is-short', !ok);
      b.setAttribute('aria-disabled', String(!ok));
    });
    const t = (G.meta.gacha && G.meta.gacha.tickets2) || 0;
    $('pull-ticket').hidden = t <= 0;
    $('ticket-label').textContent = '★★ 확정권 사용 (' + t + '장)';
    $('pull-free').hidden = !G.gachaFreeAvailable();
    const col = G.gachaCollection();
    $('coll-count').textContent = col.filter((c) => c.level > 0).length + '/' + col.length;
  }

  function shortMsg(n, cur) {
    if (cur === 'gold') return '금화가 ' + fmtNum(G.gachaCost(n, 'gold') - meta().gold) + ' 모자랍니다. 판을 돌아 금화를 모으거나, 상점에서 별빛 결정을 금화로 바꿀 수 있습니다.';
    if (cur === 'crystal') return '별빛 결정이 ' + fmtNum(G.gachaCost(n, 'crystal') - meta().crystals) + ' 모자랍니다. 스테이지·난이도를 처음 깨면 결정을 받습니다.';
    if (cur === 'ticket2') return '★★ 확정권이 없습니다.';
    if (cur === 'hero') return '별빛 결정이 ' + fmtNum(G.heroCost(n) - meta().crystals) + ' 모자랍니다. 판을 깨면 결정을 받습니다.';
    return '오늘 무료 뽑기는 이미 썼습니다.';
  }

  function doPull(n, cur) {
    if (pullBusy || pullPhase) return;
    const can = cur === 'hero' ? G.heroCanAfford(n) : G.gachaCanAfford(n, cur);
    if (!can) {
      sfx('click');
      gachaMsg(shortMsg(n, cur), cur === 'gold' || cur === 'crystal' || cur === 'hero');
      return;
    }
    const go = () => {
      const res = cur === 'hero' ? G.heroPull(n) : G.gachaPull(n, cur);
      if (!res.ok) { gachaMsg(shortMsg(n, cur)); return; }
      lastPull = { n, cur };
      gachaMsg('');
      renderAltar();
      playPull(res);
    };
    if (cur === 'free') {
      pullBusy = true;
      G.ads.rewarded('free_pull').then((ok) => {
        pullBusy = false;
        if (ok) go();
        else gachaMsg('광고를 끝까지 보면 무료로 1회 뽑을 수 있습니다.');
      }, () => { pullBusy = false; });
      return;
    }
    go();
  }

  function pullCard(r, i) {
    const li = el('li', 'pcard star-' + r.star + (r.isNew ? ' is-new' : '') + (r.refund ? ' is-refund' : ''));
    li.style.setProperty('--i', i);
    let detail;
    if (r.hero) detail = r.isNew ? '새 영웅!' : '조각 +' + r.shards;
    else if (!r.key) detail = '모두 모았습니다 · 결정으로 돌려받음';
    else if (r.refund) detail = '최대 레벨 · ' + (r.refund.gold ? '금화 ' + fmtNum(r.refund.gold) : '결정 ' + fmtNum(r.refund.crystals)) + ' 돌려받음';
    else if (r.isNew) detail = '새로 얻음 · Lv ' + r.to;
    else detail = 'Lv ' + r.from + ' → ' + r.to;
    li.setAttribute('aria-label', stars(r.star) + ' ' + r.name + ', ' + detail);
    li.setAttribute('aria-hidden', 'true');
    const inner = el('span', 'pcard-inner');
    const back = el('span', 'pcard-back');
    back.appendChild(el('span', 'pcard-back-mark'));
    inner.appendChild(back);
    const front = el('span', 'pcard-front');
    front.appendChild(hideOnError(img(G.spriteUrl('card_frame_' + r.star), 'pcard-frame', 0, '')));
    const ic = el('span', 'pcard-icon');
    ic.appendChild(hideOnError(img(G.spriteUrl(r.icon || 'crystal'), '', 0, '')));
    front.appendChild(ic);
    const body = el('span', 'pcard-body');
    body.appendChild(el('span', 'pcard-stars', stars(r.star)));
    body.appendChild(el('span', 'pcard-name', r.name));
    body.appendChild(el('span', 'pcard-lv', detail));
    front.appendChild(body);
    if (r.isNew) front.appendChild(el('span', 'pcard-new', '신규'));
    inner.appendChild(front);
    li.appendChild(inner);
    return li;
  }

  function pullLater(ms, fn) { pullTimers.push(setTimeout(fn, ms)); }

  // 등급별 빛 색 (CSS의 .best-N --pc와 맞춘다)
  const STAR_RGB = { 1: '127,212,255', 2: '166,132,240', 3: '255,181,71' };
  const STAR_BURST = {
    1: ['127,212,255', '200,236,255'],
    2: ['166,132,240', '214,190,255', '127,212,255'],
    3: ['255,181,71', '255,226,160', '255,107,61', '255,255,235', '166,132,240'],
  };
  const TIER_RGB = { wood: '255,181,71', silver: '200,225,255', gold: '255,214,100' };
  const TIER_BURST = {
    wood: ['255,181,71', '255,214,150'],
    silver: ['200,225,255', '255,255,255', '127,212,255'],
    gold: ['255,214,100', '255,226,160', '255,107,61', '255,255,235'],
  };

  function playPull(res) {
    const fx = $('pull-fx');
    if (!fx.contains(document.activeElement)) pullReturnFocus = document.activeElement;
    pullTimers.forEach(clearTimeout); pullTimers = [];
    G.celebrate.clear();
    const ten = res.results.length > 1;
    fx.className = 'pull-fx ph-charge best-' + res.best + (ten ? ' is-ten' : ' is-one');
    fx.hidden = false;
    fx.focus({ preventScroll: true });
    const ul = $('pull-cards');
    ul.textContent = '';
    res.results.forEach((r, i) => ul.appendChild(pullCard(r, i)));
    $('pull-eyebrow').textContent = ten ? '열 개의 빛 · 하나씩 깨어나는 축복' : '숲이 간직한 빛';
    $('pull-title').textContent = res.best === 3 ? '★★★ 밤을 가르는 전설' : res.best === 2 ? '★★ 달빛에 새겨진 축복' : '★ 등불에 깃든 축복';
    $('pull-note').textContent = '★★★까지 ' + (lastPull.cur === 'hero' ? G.heroPityLeft() : res.pityLeft) + '회';
    $('pull-whisper').textContent = '숲의 기억이 등불에 모입니다';
    pullPhase = 'charge';
    if (reducedMotion()) { finishPull(); return; }
    sfx('pickupChest');
    const cel = G.celebrate;
    const c = cel.centerOf(fx.querySelector('.pull-lantern'));
    cel.charge(c.x, c.y, STAR_RGB[1], 1.5, 32);
    pullLater(900, () => {
      fx.classList.add('ph-awaken');
      $('pull-whisper').textContent = res.best === 3 ? '어둠 너머, 전설의 응답' : '잠든 빛이 눈을 뜹니다';
      sfx('gem');
    });
    const burstAt = res.best === 3 ? 2300 : res.best === 2 ? 1800 : 1500;
    if (res.best === 3) pullLater(1900, () => { fx.classList.add('ph-hush'); cel.clear(); });
    pullLater(burstAt, () => {
      pullPhase = 'burst';
      fx.classList.remove('ph-hush');
      fx.classList.add('ph-burst');
      sfx(res.best === 3 ? 'evolve' : res.best === 2 ? 'levelup' : 'chest');
      cel.burst(c.x, c.y, { count: 24 + res.best * 12, colors: STAR_BURST[res.best], speed: 240 + res.best * 65 });
      cel.pillar(c.x, STAR_RGB[res.best], res.best === 3 ? 90 : 32, 1.2);
      if (res.best === 3) {
        sfx('gong');
        cel.pillar(c.x - 100, STAR_RGB[3], 26, 1.5);
        cel.pillar(c.x + 100, STAR_RGB[3], 26, 1.5);
        cel.shake(fx, true);
      }
    });
    pullLater(burstAt + 650, () => {
      pullPhase = 'reveal'; fx.classList.add('ph-reveal');
      $('pull-whisper').textContent = '';
    });
    let at = burstAt + 1000;
    const cards = [...ul.children];
    cards.forEach((li, i) => {
      const r = res.results[i];
      if (r.star === 3) {
        pullLater(at, () => { li.classList.add('is-foretold'); sfx('pickupChest'); });
        at += 450;
      }
      pullLater(at, () => {
        li.classList.add('is-flipped');
        li.removeAttribute('aria-hidden');
        sfx(r.star === 3 ? 'gong' : r.star === 2 ? 'coin' : 'gem');
        const p = cel.centerOf(li);
        cel.burst(p.x, p.y, { count: r.star === 3 ? 28 : 10, colors: STAR_BURST[r.star], speed: 150, life: 0.7 });
        if (r.star === 3) cel.pillar(p.x, STAR_RGB[3], 30, 0.8);
      });
      at += r.star === 3 ? 850 : 500;
    });
    pullLater(at + 100, finishPull);
  }

  function finishPull() {
    pullTimers.forEach(clearTimeout);
    pullTimers = [];
    const fx = $('pull-fx');
    if (pullPhase !== 'done') { fx.classList.add('skip'); G.celebrate.clear(); }
    fx.classList.remove('ph-hush');
    fx.classList.add('ph-burst', 'ph-reveal', 'ph-done');
    [...$('pull-cards').children].forEach((li) => { li.classList.add('is-flipped'); li.removeAttribute('aria-hidden'); });
    pullPhase = 'done';
    const again = $('pull-again');
    const canAgain = lastPull && lastPull.cur !== 'free' && (lastPull.cur === 'hero' ? G.heroCanAfford(lastPull.n) : G.gachaCanAfford(lastPull.n, lastPull.cur));
    again.hidden = !canAgain;
    if (canAgain) {
      again.textContent = '';
      again.appendChild(el('span', '', (lastPull.n === 10 ? '10회 더' : '한 번 더')));
      if (lastPull.cur === 'gold' || lastPull.cur === 'crystal' || lastPull.cur === 'hero') {
        again.appendChild(el('span', lastPull.cur === 'gold' ? 'coin' : 'crystal', ''));
        again.appendChild(el('span', 'again-cost', fmtNum(lastPull.cur === 'hero' ? G.heroCost(lastPull.n) : G.gachaCost(lastPull.n, lastPull.cur))));
      }
    }
    pullLater(60, () => { if (pullPhase === 'done') $('pull-ok').focus({ preventScroll: true }); });
  }

  function closePull() {
    G.celebrate.clear();
    pullTimers.forEach(clearTimeout);
    pullTimers = [];
    $('pull-fx').hidden = true;
    pullPhase = null;
    renderAltar();
    if (gachaTab === 'coll') renderCollection(); else setGachaTab(gachaTab);
    const back = pullReturnFocus && pullReturnFocus.isConnected ? pullReturnFocus : $('pull-gold-1');
    back.focus({ preventScroll: true });
  }

  function pullAgain() {
    if (!lastPull || pullPhase !== 'done') return;
    sfx('select');
    G.celebrate.clear();
    pullTimers.forEach(clearTimeout); pullTimers = [];
    $('pull-fx').hidden = true;
    pullPhase = null;
    doPull(lastPull.n, lastPull.cur);
  }

  function renderCollection(target) {
    const box = target || $('gacha-coll');
    box.textContent = '';
    const items = G.gachaCollection();
    [3, 2, 1].forEach((star) => {
      const list = items.filter((it) => it.star === star);
      const sec = el('section', 'coll-group star-' + star);
      const head = el('div', 'coll-head');
      head.appendChild(el('h3', 'coll-title', STAR_TITLE[star]));
      head.appendChild(el('span', 'coll-owned', list.filter((it) => it.level > 0).length + ' / ' + list.length));
      sec.appendChild(head);
      const ul = el('ul', 'coll-grid');
      list.forEach((it) => {
        const owned = it.level > 0;
        const li = el('li', 'coll-card star-' + star + (owned ? ' is-owned' : '') + (it.level >= it.max ? ' is-max' : ''));
        const tile = el('span', 'coll-tile');
        tile.appendChild(hideOnError(img(G.spriteUrl('card_frame_' + star), 'coll-frame', 0, '')));
        tile.appendChild(hideOnError(img(G.spriteUrl(it.icon), 'coll-icon', 0, '')));
        li.appendChild(tile);
        const body = el('span', 'coll-body');
        const top = el('span', 'coll-top');
        top.appendChild(el('span', 'coll-name', it.name));
        top.appendChild(el('span', 'coll-lv', !owned ? '없음' : it.max === 1 ? '보유' : 'Lv ' + it.level + ' / ' + it.max));
        body.appendChild(top);
        if (it.max > 1) {
          const bar = el('span', 'coll-bar');
          bar.setAttribute('role', 'img');
          bar.setAttribute('aria-label', '레벨 ' + it.level + ' / ' + it.max);
          const fill = el('i');
          fill.style.width = Math.round((it.level / it.max) * 100) + '%';
          bar.appendChild(fill);
          body.appendChild(bar);
        }
        body.appendChild(el('span', 'coll-desc', (owned || it.max === 1 ? '' : 'Lv 1: ') + it.desc));
        if (owned && it.next) body.appendChild(el('span', 'coll-next', '다음: ' + it.next));
        li.appendChild(body);
        ul.appendChild(li);
      });
      sec.appendChild(ul);
      box.appendChild(sec);
    });
  }

  function setGachaTab(tab) {
    gachaTab = tab;
    $('screen-gacha').querySelector('.menu-content').scrollTop = 0;
    const altar = tab !== 'coll';
    const hero = tab === 'heroes';
    $('pane-altar').dataset.mode = hero ? 'hero' : 'gear';
    $('pane-altar').setAttribute('aria-labelledby', hero ? 'tab-heroes' : 'tab-altar');
    $('tab-heroes').setAttribute('aria-selected', String(hero));
    $('altar-kicker').textContent = hero ? '어둠을 함께 걸을 동료' : '모든 영웅에게 전해지는 축복';
    $('altar-title').textContent = hero ? '밤을 걷는 영웅들' : '작은 빛, 끝없는 가능성';
    $('gacha-pity').textContent = hero ? G.heroPityLeft() : G.gachaPityLeft();
    const rates = hero ? G.HERO_GACHA.rates : G.GACHA.rates;
    if (hero) $('pane-altar').querySelector('.altar-rates').textContent = '★★★ ' + (rates[3] * 100) + '% · ★★ ' + (rates[2] * 100) + '% · 10회 소환 시 ★★ 이상 1명 보장';
    else $('pane-altar').querySelector('.altar-rates').textContent = '★★★ ' + (rates[3] * 100) + '% · ★★ ' + (rates[2] * 100) + '% · 10회 뽑기 시 ★★ 이상 1개 보장';
    $('tab-altar').setAttribute('aria-selected', String(altar && !hero));
    $('tab-coll').setAttribute('aria-selected', String(!altar));
    $('pane-altar').hidden = !altar;
    $('pane-coll').hidden = altar;
    if (!altar) renderCollection();
  }

  function openGacha(from) {
    gachaFrom = from || 'title';
    gachaMsg('');
    renderAltar();
    setGachaTab(from === 'shop' ? 'heroes' : 'altar');
    show('gacha');
    $(from === 'shop' ? 'pull-hero-1' : 'pull-gold-1').focus({ preventScroll: true });
  }

  function openOdds() {
    const hero = gachaTab === 'heroes';
    const percent = (n) => (n * 100).toFixed(3).replace(/\.?0+$/, '') + '%';
    const o = hero ? {
      groups: [3, 2, 1].map((star) => {
        const keys = G.CHAMPION_ORDER.filter((k) => G.CHAMPIONS[k].star === star);
        return { star, rateLabel: percent(G.HERO_GACHA.rates[star]), items: keys.map((k) => ({ name: G.CHAMPIONS[k].name, rateLabel: percent(G.HERO_GACHA.rates[star] / keys.length) })) };
      }),
      rules: ['10회 소환은 ★★ 이상 영웅 1명을 보장합니다.', G.HERO_GACHA.pity + '회 안에 ★★★ 영웅을 보장합니다. ★★★ 획득 시 횟수가 초기화됩니다.', '이미 보유한 영웅은 등급에 따라 조각으로 받습니다. ★ ' + G.HERO_GACHA.dupShards[1] + '개 · ★★ ' + G.HERO_GACHA.dupShards[2] + '개 · ★★★ ' + G.HERO_GACHA.dupShards[3] + '개', '같은 등급 안에서 각 영웅의 확률은 같습니다. 보장 소환에서는 등급 확률이 달라집니다.'],
    } : G.gachaOdds();
    $('odds-title').textContent = hero ? '영웅 소환 확률' : '장비 뽑기 확률';
    const body = $('odds-body');
    body.textContent = '';
    const c = G.GACHA.costs;
    body.appendChild(el('p', 'odds-cost', hero ? '별빛 결정 · 1회 ' + fmtNum(G.heroCost(1)) + ' / 10회 ' + fmtNum(G.heroCost(10)) : '가격: 금화 1회 ' + fmtNum(c.gold.one) + ' · 10회 ' + fmtNum(c.gold.ten) +
      ' / 별빛 결정 1회 ' + fmtNum(c.crystal.one) + ' · 10회 ' + fmtNum(c.crystal.ten)));
    o.groups.forEach((g) => {
      const sec = el('section', 'odds-group star-' + g.star);
      const h = el('h3', 'odds-group-title');
      h.appendChild(el('span', 'odds-stars', stars(g.star)));
      h.appendChild(el('span', 'odds-rate', g.rateLabel));
      sec.appendChild(h);
      const table = el('table', 'odds-table');
      const thead = el('thead');
      const hr = el('tr');
      hr.appendChild(el('th', '', hero ? '영웅' : '업그레이드'));
      hr.appendChild(el('th', '', '1회 확률'));
      thead.appendChild(hr);
      table.appendChild(thead);
      const tb = el('tbody');
      g.items.forEach((it) => {
        const tr = el('tr');
        tr.appendChild(el('td', '', it.name));
        tr.appendChild(el('td', 'odds-num', it.rateLabel));
        tb.appendChild(tr);
      });
      table.appendChild(tb);
      sec.appendChild(table);
      body.appendChild(sec);
    });
    body.appendChild(el('h3', 'odds-rules-title', '뽑기 규칙'));
    const ul = el('ul', 'odds-rules');
    o.rules.forEach((r) => ul.appendChild(el('li', '', r)));
    body.appendChild(ul);
    $('odds').hidden = false;
    body.scrollTop = 0;
    $('odds-close').focus({ preventScroll: true });
  }

  function closeOdds() {
    $('odds').hidden = true;
    $('btn-odds').focus({ preventScroll: true });
  }

  // ---------- 상점 ----------

  let storeFrom = null;

  function grantText(g) {
    const parts = [];
    if (g.crystals) parts.push('별빛 결정 ' + fmtNum(g.crystals));
    if (g.gold) parts.push('금화 ' + fmtNum(g.gold));
    if (g.tickets2) parts.push('★★ 확정 뽑기권 ' + g.tickets2 + '장');
    if (g.noAds) parts.push('광고 제거');
    if (g.speedMode) parts.push('배속 2배·3배 (일시정지 화면에서 바꿉니다)');
    if (g.passDays) parts.push('등불 축복 ' + g.passDays + '일');
    return '받은 것: ' + parts.join(' · ');
  }

  function buy(id) {
    sfx('click');
    G.billing.purchase(id).then((r) => {
      if (r.ok) {
        sfx('coin');
        renderStore();
        infoDialog('구매 완료' + (r.debug ? ' (시험 지급)' : ''), grantText(r.granted || {}));
      } else if (r.reason === 'unavailable') {
        infoDialog('구글 플레이 앱에서 구매할 수 있습니다', '웹 버전에서는 결제를 할 수 없습니다. 구글 플레이에서 HOLLOWLIGHT 앱을 받으면 같은 상품을 살 수 있습니다.');
      } else if (r.reason === 'limit') {
        infoDialog('이미 구매했습니다', '이 상품은 더 살 수 없습니다.');
      } else if (r.reason !== 'cancelled') {
        infoDialog('구매하지 못했습니다', '잠시 뒤에 다시 시도해 주세요.');
      }
    });
  }

  function productCard(p) {
    const st = G.store.status(p.id);
    const card = el('article', 'prod prod-' + p.kind + (st.canBuy ? '' : ' is-soldout'));
    const art = el('span', 'prod-art');
    art.appendChild(hideOnError(img(G.spriteUrl(p.art), '', 0, '')));
    card.appendChild(art);
    const body = el('div', 'prod-body');
    const head = el('div', 'prod-head');
    head.appendChild(el('h3', 'prod-name', p.name));
    if (st.note) head.appendChild(el('span', 'badge prod-note' + (st.firstBonus ? ' is-bonus' : ''), st.note));
    body.appendChild(head);
    let desc = p.desc;
    if (p.kind === 'crystals') {
      const n = p.grant.crystals;
      desc = st.firstBonus ? '첫 구매는 2배: 별빛 결정 ' + fmtNum(n * 2) + '개' : '별빛 결정 ' + fmtNum(n) + '개';
    }
    if (desc) body.appendChild(el('p', 'prod-desc', desc));
    if (p.kind === 'pass') {
      const ps = G.store.passStatus();
      if (ps.active) body.appendChild(el('p', 'prod-status is-on', '사용 중 · ' + ps.daysLeft + '일 남음 · 오늘 ' + (ps.claimedToday ? '받음' : '받을 수 있음')));
    }
    card.appendChild(body);
    const act = el('div', 'prod-act');
    if (p.kind === 'pass') {
      const ps = G.store.passStatus();
      if (ps.active && !ps.claimedToday) {
        const claim = el('button', 'btn btn-crystal btn-small');
        claim.type = 'button';
        claim.id = 'pass-claim';
        claim.appendChild(el('span', 'crystal', ''));
        claim.appendChild(el('span', '', '오늘 받기 +' + G.STORE.passDaily));
        claim.addEventListener('click', () => {
          const got = G.store.claimPassDaily();
          if (got) { sfx('coin'); renderStore(); focusStore('buy-' + p.id); }
        });
        act.appendChild(claim);
      }
    }
    const btn = el('button', 'btn btn-primary btn-small prod-buy');
    btn.type = 'button';
    btn.id = 'buy-' + p.id;
    btn.disabled = !st.canBuy;
    btn.textContent = st.canBuy ? G.store.priceLabel(p) : '구매함';
    btn.setAttribute('aria-label', p.name + ' ' + (st.canBuy ? G.store.priceLabel(p) + '에 사기' : '구매함'));
    btn.addEventListener('click', () => buy(p.id));
    act.appendChild(btn);
    card.appendChild(act);
    return card;
  }

  function storeSection(title, note, cls) {
    const sec = el('section', 'store-sec' + (cls ? ' ' + cls : ''));
    const head = el('div', 'store-sec-head');
    head.appendChild(el('h3', 'store-sec-title', title));
    if (note) head.appendChild(el('span', 'store-sec-note', note));
    sec.appendChild(head);
    const grid = el('div', 'store-grid');
    sec.appendChild(grid);
    return { sec, grid };
  }

  function renderStore() {
    refreshGold();
    const body = $('store-body');
    body.textContent = '';
    if (!G.billing.available()) {
      body.appendChild(el('p', 'store-web', '웹에서는 결제할 수 없습니다. 상품은 구글 플레이 앱에서 구매할 수 있습니다.'));
    }
    const prods = G.STORE.products;
    const crystals = storeSection('별빛 결정', '각 묶음 첫 구매 2배', 'store-crystals');
    prods.filter((p) => p.kind === 'crystals').forEach((p) => crystals.grid.appendChild(productCard(p)));
    body.appendChild(crystals.sec);
    const packs = storeSection('패키지 · 혜택', '', 'store-packs');
    prods.filter((p) => p.kind !== 'crystals').forEach((p) => packs.grid.appendChild(productCard(p)));
    body.appendChild(packs.sec);

    const ex = G.STORE.exchange;
    const exSec = storeSection('교환', '별빛 결정을 금화로', 'store-exchange');
    const row = el('article', 'prod prod-exchange');
    const art = el('span', 'prod-art prod-art-ex');
    art.appendChild(el('span', 'crystal crystal-big', ''));
    art.appendChild(el('span', 'ex-arrow', '→'));
    art.appendChild(el('span', 'coin coin-big', ''));
    row.appendChild(art);
    const rb = el('div', 'prod-body');
    rb.appendChild(el('h3', 'prod-name', '결정 ' + fmtNum(ex.crystals) + ' → 금화 ' + fmtNum(ex.gold)));
    rb.appendChild(el('p', 'prod-desc', '뽑기나 챔피언 업그레이드에 쓸 금화가 모자랄 때'));
    row.appendChild(rb);
    const act = el('div', 'prod-act');
    const b = el('button', 'btn btn-ghost btn-small');
    b.type = 'button';
    b.id = 'store-exchange';
    b.disabled = meta().crystals < ex.crystals;
    b.appendChild(el('span', 'crystal', ''));
    b.appendChild(el('span', '', fmtNum(ex.crystals) + ' 바꾸기'));
    b.addEventListener('click', () => {
      if (G.store.exchange()) { sfx('coin'); renderStore(); focusStore('store-exchange'); }
    });
    act.appendChild(b);
    row.appendChild(act);
    exSec.grid.appendChild(row);
    body.appendChild(exSec.sec);
  }

  function focusStore(id) {
    const b = $(id);
    if (b && !b.disabled) b.focus({ preventScroll: true });
    else focusFirst($('store-body'));
  }

  function openStore(from) {
    storeFrom = from || 'title';
    renderStore();
    show('store');
    focusFirst($('store-body'));
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
    if (['auto', 'high', 'medium', 'low'].indexOf(s.quality) === -1) s.quality = 'auto';
    if (s.fxQuality !== 'low') s.fxQuality = 'high';
    return s;
  }

  function renderQuality() {
    const q = settingsObj().quality;
    document.querySelectorAll('#set-quality .seg-btn').forEach((b) => {
      const on = b.dataset.q === q;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', String(on));
    });
    document.querySelectorAll('#set-fx-quality .seg-btn').forEach((b) => {
      const on = b.dataset.q === settingsObj().fxQuality;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-checked', String(on));
    });
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
    $('set-motion').checked = !!s.reducedMotion;
    renderQuality();
    $('set-fullscreen').textContent = document.fullscreenElement ? '창 모드로' : '전체 화면으로';
    // 판 진행 중에는 데이터를 지울 수 없게
    $('set-reset').disabled = settingsFrom === 'pause';
  }

  function openSettings(from) {
    settingsFrom = from || 'title';
    renderSettings();
    $('coupon-msg').textContent = '';
    $('coupon-input').value = '';
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
    $('set-motion').addEventListener('change', (e) => { s().reducedMotion = e.target.checked; document.documentElement.classList.toggle('reduce-motion', e.target.checked); if (e.target.checked) G.celebrate.clear(); saveSettings(); });
    $('set-fps').addEventListener('change', (e) => { s().fps = e.target.checked; saveSettings(); sfx('click'); });
    document.querySelectorAll('#set-quality .seg-btn').forEach((b) => b.addEventListener('click', () => {
      s().quality = b.dataset.q;
      saveSettings();
      if (G.applyQuality) G.applyQuality();
      sfx('click');
      renderQuality();
    }));
    document.querySelectorAll('#set-fx-quality .seg-btn').forEach((b) => b.addEventListener('click', () => {
      s().fxQuality = b.dataset.q;
      saveSettings(); sfx('click'); renderQuality();
    }));
    $('set-fullscreen').addEventListener('click', () => {
      sfx('click');
      const done = () => setTimeout(renderSettings, 150);
      try {
        if (document.fullscreenElement) document.exitFullscreen().then(done, done);
        else document.documentElement.requestFullscreen().then(done, done);
      } catch (e) { /* 전체 화면을 쓸 수 없는 환경 */ }
    });
    // 쿠폰 코드
    const couponInput = $('coupon-input');
    // 입력 중 키가 게임 단축키(이동·디버그 등)로 새지 않게 (Esc는 화면 뒤로가기에 맡긴다)
    couponInput.addEventListener('keydown', (e) => { if (e.key !== 'Escape') e.stopPropagation(); });
    $('set-coupon').addEventListener('submit', (e) => {
      e.preventDefault();
      const msg = $('coupon-msg');
      const code = couponInput.value;
      if (!code.trim()) { msg.textContent = '쿠폰 코드를 입력하세요'; msg.dataset.state = 'error'; return; }
      const r = G.redeemCoupon ? G.redeemCoupon(code) : { ok: false, reason: 'invalid' };
      if (r.ok) {
        sfx('coin');
        msg.textContent = '금화 ' + Number(r.gold).toLocaleString('ko-KR') + ' · 별빛 결정 ' + Number(r.crystals).toLocaleString('ko-KR') + '가 되었습니다';
        msg.dataset.state = 'ok';
        couponInput.value = '';
        refreshGold();
      } else {
        sfx('click');
        msg.textContent = r.reason === 'used' ? '이미 사용한 쿠폰입니다' : '없는 쿠폰 코드입니다';
        msg.dataset.state = 'error';
      }
    });
    $('set-reset').addEventListener('click', () => {
      confirmDialog('저장 데이터를 모두 지울까요?', '금화, 별빛 결정, 해금한 챔피언, 업그레이드, 뽑기로 얻은 강화, 기록, 이어하기가 모두 사라지고 되돌릴 수 없습니다. 구매 기록은 구글 플레이 앱에서 복원할 수 있습니다.', '모두 지우기', () => {
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
  let lvOnPick = null;
  let armTimer = null;

  function choiceIcon(c, d) {
    if (c.kind === 'gold') return G.spriteUrl('coin');
    return iconUrl(d.icon);
  }

  // opts: { eyebrow, title, sub } 갈래·조합 선택 때 머리글을 바꾼다
  function showLevelUp(g, choices, onPick, opts) {
    show('levelup');
    const o = opts || {};
    $('lv-eyebrow').textContent = o.eyebrow || '레벨 업';
    $('lv-title').innerHTML = '';
    if (o.title) $('lv-title').textContent = o.title;
    else { $('lv-title').append('Lv '); const n = el('span', '', String(g.player.level)); n.id = 'lv-number'; $('lv-title').appendChild(n); }
    $('lv-sub').textContent = o.sub || '하나를 골라 등불을 키우세요';
    toggleLvBook(false);
    lvOnPick = onPick;
    renderCards(choices, 350);
    sfx('levelup');
  }

  function renderCards(choices, armMs) {
    const box = $('cards');
    box.textContent = '';
    box.className = 'cards n-' + choices.length + (choices.length >= 4 ? ' is-four' : '');
    cardsReady = false;
    cardCount = choices.length;
    box.classList.add('arming');
    choices.forEach((c, i) => {
      const d = G.describeChoice(c);
      const btn = el('button', 'card kind-' + c.kind + (d.isNew ? ' is-new' : '') + (d.comboHint ? ' has-combo' : ''));
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
    cardHandler = (i) => lvOnPick(choices[i]);
    renderReroll();
    // 레벨업 순간의 실수 클릭을 막으려고 잠깐 기다린다
    clearTimeout(armTimer);
    armTimer = setTimeout(() => {
      cardsReady = true;
      box.classList.remove('arming');
      const first = $('card-0');
      if (first && current === 'levelup') first.focus({ preventScroll: true });
    }, armMs);
  }

  // ---------- 선택창 안의 조합 도감 ----------
  let lvBookAll = false;
  function renderLvBook() {
    const p = game.player;
    $('lv-book-mine').setAttribute('aria-selected', String(!lvBookAll));
    $('lv-book-all').setAttribute('aria-selected', String(lvBookAll));
    const ul = $('lv-book-list');
    ul.textContent = '';
    const rows = G.xcomboBook(p, lvBookAll);
    if (!rows.length) ul.appendChild(el('li', 'lv-book-empty', '아직 이어지는 조합이 없습니다. 무기를 Lv 5까지 올려 갈래를 고르면 조합 상대가 정해집니다.'));
    rows.forEach((x) => {
      const li = el('li', 'lv-book-row' + (x.ready ? ' is-ready' : ''));
      li.appendChild(img(iconUrl(x.c.main), '', 32, ''));
      const body = el('span', 'lv-book-body');
      body.appendChild(el('span', 'lv-book-name', x.def.name + (x.ready ? ' · 다음 상자에서 조합!' : '')));
      const br = G.branchById(x.c.main, 5, x.c.b5);
      const need = '메인 ' + G.WEAPONS[x.c.main].name + '(' + br.name + ') ' + (x.m ? 'Lv ' + x.m.level : '없음') + '/10 + ' +
        G.WEAPONS[x.c.sub].name + ' ' + (x.s ? 'Lv ' + x.s.level : '없음') + '/5';
      body.appendChild(el('span', 'lv-book-need', need));
      body.appendChild(el('span', 'lv-book-fx', G.fxText(G.COMBO_SIG[x.c.sub].fx)));
      li.appendChild(body);
      ul.appendChild(li);
    });
  }
  function toggleLvBook(force) {
    const open = force !== undefined ? force : $('lv-book').hidden;
    $('lv-book').hidden = !open;
    $('cards').hidden = open;
    $('btn-lv-book').setAttribute('aria-expanded', String(open));
    $('btn-lv-book').textContent = open ? '카드로 돌아가기' : '조합 도감';
    if (open) renderLvBook();
  }

  function renderReroll() {
    const left = (game && game.rerollsLeft) || 0;
    $('btn-reroll').hidden = !(left > 0) || !!(game && game.noReroll);
    $('reroll-label').textContent = '다시 뽑기 (남은 ' + left + ')';
  }

  // 가챠 운명 바꾸기: 카드를 새로 받는다
  function reroll() {
    if (current !== 'levelup' || !cardsReady || !game.rerollChoices) return;
    const c = game.rerollChoices();
    if (!c) return;
    sfx('whoosh');
    renderCards(c, 200);
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
  // 연출: 떨어짐 → 흔들리며 틈새로 빛 → (등급 상승) → 자물쇠가 튕겨 나가고 뚜껑이 열리며 빛기둥 → 카드가 하나씩 솟아올라 뒤집힘
  // 컷신 길이를 지키고, 모든 보상이 나타난 뒤에만 받을 수 있다.

  const TIERS = ['wood', 'silver', 'gold'];
  const TIER_NAME = { wood: '나무 상자', silver: '은 상자', gold: '황금 상자' };
  const CHEST_PARTS = ['body', 'lid', 'lid_open', 'lock'];
  let chestClose = null;
  let chestTimers = [];
  let chestDone = true;
  let chestResult = null;

  function preloadChestArt() {
    TIERS.forEach((t) => CHEST_PARTS.forEach((part) => { const i = new Image(); i.src = G.spriteUrl('chest_' + t + '_' + part); }));
    const stage = $('chest-stage');
    // 부품 그림이 없으면 예전 상자와 CSS 도형으로 (no-art), 빠진 그림은 숨긴다
    stage.querySelectorAll('.cp:not(.cp-old)').forEach((i) => {
      i.addEventListener('error', () => {
        i.style.visibility = 'hidden';
        if (i.classList.contains('cp-body')) stage.classList.add('no-art');
      });
      i.addEventListener('load', () => {
        i.style.visibility = '';
        if (i.classList.contains('cp-body')) stage.classList.remove('no-art');
      });
    });
    stage.querySelectorAll('.cp-old').forEach((i) => {
      i.addEventListener('error', () => { i.style.visibility = 'hidden'; });
      if (i.complete && !i.naturalWidth) i.style.visibility = 'hidden';
    });
    stage.querySelector('.cp-beam').src = G.spriteUrl('chest_beam');
  }

  function setChestTier(tier) {
    const stage = $('chest-stage');
    stage.dataset.tier = tier;
    const q = (c) => stage.querySelector(c);
    q('.cp-body').src = G.spriteUrl('chest_' + tier + '_body');
    q('.cp-lid').src = G.spriteUrl('chest_' + tier + '_lid');
    q('.cp-lidopen').src = G.spriteUrl('chest_' + tier + '_lid_open');
    q('.cp-lock').src = G.spriteUrl('chest_' + tier + '_lock');
  }

  function chestCard(iconSrc, name, detail, cls) {
    const li = el('li', 'ccard' + (cls ? ' ' + cls : ''));
    li.setAttribute('aria-label', name + ', ' + detail);
    const inner = el('span', 'ccard-inner');
    const ic = el('span', 'ccard-icon');
    ic.appendChild(hideOnError(img(iconSrc, '', 48, '')));
    inner.appendChild(ic);
    const body = el('span', 'ccard-body');
    body.appendChild(el('span', 'ccard-name', name));
    body.appendChild(el('span', 'ccard-detail', detail));
    inner.appendChild(body);
    li.appendChild(inner);
    return li;
  }

  function chestSparks(n, cls) {
    const box = $('chest-stage').querySelector('.chest-sparks');
    n = Math.min(n, window.innerWidth < 600 ? 10 : 18);
    box.textContent = '';
    for (let i = 0; i < n; i++) {
      const sp = el('i', cls || '');
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const d = 90 + Math.random() * 90;
      sp.style.setProperty('--dx', Math.round(Math.cos(a) * d) + 'px');
      sp.style.setProperty('--dy', Math.round(Math.sin(a) * d * 0.8 - 40) + 'px');
      sp.style.setProperty('--d', (Math.random() * 0.15).toFixed(2) + 's');
      box.appendChild(sp);
    }
  }

  function chestLater(ms, fn) { chestTimers.push(setTimeout(fn, ms)); }

  function buildChestCards(result) {
    const list = $('chest-list');
    list.textContent = '';
    (result.upgrades || []).forEach((u) => {
      const detail = u.from > 0 ? 'Lv ' + u.from + ' → ' + u.to : '새로 얻음 · Lv ' + u.to;
      list.appendChild(chestCard(iconUrl(u.key), u.name, detail, ''));
    });
    if (result.combo) {
      const c = result.combo;
      const label = c.typeLabel || (G.COMBO_TYPE_LABEL && G.COMBO_TYPE_LABEL[c.type]) || '조합';
      list.appendChild(chestCard(iconUrl(c.result || c.key), c.name, label + '!', 'is-combo'));
    }
    if (!list.children.length) list.appendChild(chestCard(G.spriteUrl('coin'), '더 올릴 것이 없습니다', '대신 금화를 받습니다', 'is-empty'));
    const goldLine = $('chest-gold');
    goldLine.hidden = !result.gold;
    goldLine.textContent = result.gold ? '금화 +' + fmtNum(result.gold) : '';
    return [...list.children];
  }

  function chestTexts(result) {
    const n = result.count || 1;
    const up = TIERS.indexOf(result.tier) > TIERS.indexOf(result.startTier);
    $('chest-eyebrow').textContent = (result.source === 'boss' ? '보스 상자' : '엘리트 상자') + (up ? ' · 등급 상승' : '');
    $('chest-title').textContent = (result.combo ? '조합 성공 · ' : '') + (n >= 3 ? TIER_NAME[result.tier] : '강화 ' + n + '개');
  }

  function showChest(g, result, onClose) {
    show('chest');
    chestClose = onClose; chestResult = result; chestDone = false;
    chestTimers.forEach(clearTimeout); chestTimers = [];
    G.celebrate.clear();
    const tier = TIERS.includes(result.tier) ? result.tier : 'wood';
    const start = TIERS.includes(result.startTier) ? result.startTier : tier;
    const upgrade = TIERS.indexOf(tier) > TIERS.indexOf(start);
    const n = Math.max(1, Math.min(5, result.count || 1));
    const screen = $('screen-chest');
    screen.className = 'screen screen-chest cnt-' + n + ' tier-' + start + (result.combo ? ' has-combo' : '');
    setChestTier(start);
    const banner = $('chest-banner');
    banner.textContent = '숲이 품고 있던 보물'; banner.className = 'chest-banner is-on';
    chestTexts(result);
    const cards = buildChestCards(result);
    $('chest-result').setAttribute('aria-hidden', 'true');
    $('btn-chest-ok').classList.add('is-waiting');
    $('btn-chest-ok').disabled = true;
    $('chest-stage').setAttribute('aria-busy', 'true');
    $('chest-stage').focus({ preventScroll: true });
    const cel = G.celebrate;
    const box = () => cel.centerOf($('chest-stage').querySelector('.chest-box'));
    // 건너뛸 수 없는 컷신: 개수·등급·조합에 따라 3.4~4.8초. 마지막 카드의 등장까지 포함한다.
    const total = Math.min(4800, 3400 + (n - 1) * 200 + TIERS.indexOf(tier) * 200 + (upgrade ? 200 : 0) + (result.combo ? 200 : 0));
    const openAt = total - 1300 - (cards.length - 1) * 150;
    screen.classList.add('ch-cine', 'ch-drop');
    chestLater(650, () => { sfx('impact'); chestSparks(8, 'dust'); cel.shake(screen, false); });
    chestLater(850, () => {
      screen.classList.add('ch-shake');
      banner.textContent = '틈새로 새어 나오는 빛';
      sfx('pickupChest');
      const c = box(); cel.charge(c.x, c.y, TIER_RGB[start], 1.3, 32);
    });
    chestLater(1500, () => {
      screen.classList.add('ch-awaken');
      banner.textContent = upgrade ? '봉인 너머, 더 깊은 빛' : '잠든 축복이 깨어납니다';
      sfx('gem');
    });
    chestLater(openAt - 550, () => {
      setChestTier(tier);
      screen.classList.remove('tier-' + start);
      screen.classList.add('tier-' + tier, 'ch-upgraded', 'ch-flash');
      banner.textContent = upgrade ? '등급 상승 · ' + TIER_NAME[tier] : TIER_NAME[tier] + ' · 봉인 해제';
      sfx(upgrade ? 'gong' : 'coin');
      const c = box(); cel.pillar(c.x, TIER_RGB[tier], 40, 0.8);
    });
    chestLater(openAt, () => {
      screen.classList.remove('ch-shake');
      screen.classList.add('ch-open');
      banner.textContent = result.combo ? '새로운 힘이 탄생합니다' : '강화 ' + n + '개 · 숲의 선물';
      sfx('chest');
      const c = box();
      cel.burst(c.x, c.y, { count: 24 + n * 6, colors: TIER_BURST[tier], speed: 300, life: 1.4 });
      if (tier === 'gold') { cel.pillar(c.x, TIER_RGB.gold, 85, 1.5); cel.confetti(TIER_BURST.gold, 24); }
      cel.shake(screen, n >= 5);
    });
    chestLater(openAt + 550, () => {
      screen.classList.remove('ch-cine');
      screen.classList.add('ch-cards');
      $('chest-result').removeAttribute('aria-hidden');
    });
    cards.forEach((li, i) => chestLater(openAt + 650 + i * 150, () => {
      li.classList.add('is-in');
      const combo = li.classList.contains('is-combo');
      sfx(combo ? 'evolve' : 'gem');
      if (combo) {
        const c = cel.centerOf(li);
        cel.pillar(c.x, TIER_RGB.gold, 40, 0.8);
        cel.burst(c.x, c.y, { count: 24, colors: TIER_BURST.gold, speed: 200 });
      }
    }));
    chestLater(total, finishChest);
  }

  function finishChest() {
    if (chestDone) return;
    chestTimers.forEach(clearTimeout);
    chestTimers = [];
    chestDone = true;
    const r = chestResult;
    const screen = $('screen-chest');
    const skipping = !screen.classList.contains('ch-cards') || [...$('chest-list').children].some((li) => !li.classList.contains('is-in'));
    if (skipping) G.celebrate.clear();
    const n = (r && r.count) || 1;
    const tier = r && TIERS.indexOf(r.tier) >= 0 ? r.tier : 'wood';
    setChestTier(tier);
    screen.className = 'screen screen-chest cnt-' + Math.min(5, n) + ' tier-' + tier + (r && r.combo ? ' has-combo' : '') +
      ' ch-open ch-cards ch-final' + (skipping ? ' ch-skip' : '');
    [...$('chest-list').children].forEach((li) => li.classList.add('is-in'));
    const b = $('chest-banner');
    if (n >= 3) { b.textContent = n >= 5 ? '강화 5개!!' : '강화 ' + n + '개!'; b.className = 'chest-banner is-on is-count'; }
    else if (r && TIERS.indexOf(r.tier) > TIERS.indexOf(r.startTier)) { b.textContent = '등급 상승! ' + TIER_NAME[tier]; b.className = 'chest-banner is-on is-upgrade'; }
    if (skipping && r && r.combo) sfx('evolve');
    $('chest-result').removeAttribute('aria-hidden');
    $('btn-chest-ok').classList.remove('is-waiting');
    $('btn-chest-ok').disabled = false;
    $('chest-stage').setAttribute('aria-busy', 'false');
    chestLater(80, () => { if (current === 'chest' && chestDone) $('btn-chest-ok').focus({ preventScroll: true }); });
  }

  function closeChest() {
    if (!chestDone) return; // 컷신은 건너뛸 수 없다
    G.celebrate.clear();
    chestTimers.forEach(clearTimeout); chestTimers = [];
    const h = chestClose;
    chestClose = null;
    if (h) { sfx('click'); h(); }
  }

  // ---------- 일시정지 ----------

  // ---------- 도감: 뽑기·업그레이드·무기·패시브·조합을 한곳에서 ----------

  const CODEX_TABS = ['gacha', 'upgrade', 'weapon', 'passive', 'combo', 'world'];
  let codexTab = 'gacha';

  // 무기·패시브 한 장. 아직 열리지 않은 것은 이름·설명을 숨긴다
  function codexCard(key, name, desc, extra, locked) {
    const li = el('li', 'coll-card codex-card' + (locked ? ' is-locked' : ' is-owned'));
    const tile = el('span', 'coll-tile');
    tile.appendChild(hideOnError(img(iconUrl(key), 'coll-icon', 0, '')));
    li.appendChild(tile);
    const body = el('span', 'coll-body');
    const top = el('span', 'coll-top');
    top.appendChild(el('span', 'coll-name', locked ? '???' : name));
    body.appendChild(top);
    body.appendChild(el('span', 'coll-desc', locked ? '다음 스테이지에서 열립니다' : desc));
    if (!locked) extra.forEach((t) => body.appendChild(el('span', 'coll-next', t)));
    li.appendChild(body);
    return li;
  }

  function codexGrid(box, title, cards) {
    const sec = el('section', 'coll-group');
    const head = el('div', 'coll-head');
    head.appendChild(el('h3', 'coll-title', title));
    head.appendChild(el('span', 'coll-owned', cards.filter((c) => !c.classList.contains('is-locked')).length + ' / ' + cards.length));
    sec.appendChild(head);
    const ul = el('ul', 'coll-grid');
    cards.forEach((c) => ul.appendChild(c));
    sec.appendChild(ul);
    box.appendChild(sec);
  }

  function renderCodexWeapons(box) {
    const cards = Object.keys(G.WEAPONS).filter((k) => G.isBaseWeapon(k)).map((k) => {
      const w = G.WEAPONS[k];
      const extra = ['최대 Lv ' + G.WEAPON_MAX];
      const br = G.BRANCHES[k];
      if (br) extra.push('Lv 5 갈래: ' + br.b5.map((x) => x.name).join(' / '));
      if (br) br.b5.forEach((x) => extra.push(x.name + ' → Lv 10: ' + (br.b10[x.id] || []).map((y) => y.name).join(' / ') + ' · 조합: ' + (x.subs || []).map((s) => G.COMBO_SIG[s].adj + ' ' + x.name).join(', ')));
      G.COMBOS.forEach((c) => {
        if (c.type === 'evolve' && c.weapon === k) extra.push('진화: ' + G.WEAPONS[c.result].name + ' (+ ' + G.PASSIVES[c.passive].name + ')');
        if (c.type === 'union' && c.weapons.indexOf(k) !== -1) {
          const other = c.weapons.find((o) => o !== k);
          extra.push('조합: ' + G.WEAPONS[c.result].name + ' (+ ' + G.WEAPONS[other].name + ')');
        }
      });
      return codexCard(k, w.name, w.desc, extra, !G.isItemUnlocked('weapon', k));
    });
    codexGrid(box, '무기', cards);
  }

  function renderCodexPassives(box) {
    const cards = Object.keys(G.PASSIVES).map((k) => {
      const ps = G.PASSIVES[k];
      const extra = ['최대 Lv ' + G.PASSIVE_MAX];
      G.COMBOS.forEach((c) => {
        if (c.type === 'evolve' && c.passive === k) extra.push('진화 재료: ' + G.WEAPONS[c.weapon].name + ' → ' + G.WEAPONS[c.result].name);
        if (c.type === 'fusion' && c.passives.indexOf(k) !== -1) extra.push('조합: ' + G.FUSIONS[c.result].name);
      });
      return codexCard(k, ps.name, ps.desc, extra, !G.isItemUnlocked('passive', k));
    });
    codexGrid(box, '패시브', cards);
  }

  function setCodexTab(tab) {
    codexTab = tab;
    $('screen-codex').querySelector('.menu-content').scrollTop = 0;
    CODEX_TABS.forEach((t) => $('codex-tab-' + t).setAttribute('aria-selected', String(t === tab)));
    const box = $('codex-body');
    box.textContent = '';
    box.scrollTop = 0;
    box.setAttribute('aria-labelledby', 'codex-tab-' + tab);
    if (tab === 'gacha') { const c = el('div', 'coll'); box.appendChild(c); renderCollection(c); }
    else if (tab === 'upgrade') { const c = el('div', 'shop-list'); box.appendChild(c); renderShop(c, true); }
    else if (tab === 'weapon') { const c = el('div', 'coll'); box.appendChild(c); renderCodexWeapons(c); }
    else if (tab === 'passive') { const c = el('div', 'coll'); box.appendChild(c); renderCodexPassives(c); }
    else if (tab === 'combo') {
      const ul = el('ul', 'lv-book-list codex-xcombo');
      G.XCOMBOS.forEach((x) => {
        const locked = !G.isItemUnlocked('weapon', x.main) || !G.isItemUnlocked('weapon', x.sub);
        const li = el('li', 'lv-book-row' + (locked ? ' is-locked' : ''));
        li.appendChild(img(iconUrl(x.main), '', 32, ''));
        const body = el('span', 'lv-book-body');
        body.appendChild(el('span', 'lv-book-name', locked ? '???' : G.WEAPONS[x.key].name));
        body.appendChild(el('span', 'lv-book-need', locked ? '다음 스테이지에서 열립니다' : '메인 ' + G.WEAPONS[x.main].name + '(' + G.branchById(x.main, 5, x.b5).name + ') Lv 10 + ' + G.WEAPONS[x.sub].name + ' Lv 5'));
        if (!locked) body.appendChild(el('span', 'lv-book-fx', G.fxText(G.COMBO_SIG[x.sub].fx)));
        li.appendChild(body);
        ul.appendChild(li);
      });
      const h = el('h3', 'coll-title', '무기 조합 ' + G.XCOMBOS.length + '개');
      box.appendChild(h);
      box.appendChild(ul);
      const c = el('div', 'combo-book');
      box.appendChild(c);
      renderComboBook(game, c, true);
    }
    else renderCodexWorld(box);
  }

  function renderCodexWorld(box) {
    const ul = el('ul', 'codex-world');
    Object.keys(G.LORE).forEach((k) => {
      const seen = !!meta().lore[k];
      const b = el('button', 'codex-lore' + (seen ? '' : ' is-locked'));
      b.type = 'button';
      b.disabled = !seen;
      b.appendChild(hideOnError(img(G.spriteUrl(G.LORE[k].art), 'codex-lore-art', 0, '')));
      b.appendChild(el('span', 'codex-lore-title', seen ? G.LORE[k].title : '???'));
      if (seen) b.addEventListener('click', () => { sfx('click'); openLore(k, openCodex); });
      const li = el('li');
      li.appendChild(b);
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  function openCodex() {
    setCodexTab(codexTab);
    show('codex');
    $('codex-tab-' + codexTab).focus({ preventScroll: true });
  }

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
      const brName = [w.b5 && G.branchById(w.key, 5, w.b5), w.b10 && G.branchById(w.key, 10, w.b10, w.b5)].filter(Boolean).map((x) => x.name).join(' → ');
      wl.appendChild(buildItem(w.key, def.name, combo ? (def.kind === 'evolved' ? '진화' : '무기 조합') : 'Lv ' + w.level + (w.level >= G.WEAPON_MAX ? ' MAX' : '') + (brName ? ' · ' + brName : ''), combo ? 'is-combo' : ''));
    });
    for (let i = p.weapons.length; i < G.weaponSlots(p); i++) wl.appendChild(el('li', 'build-item is-empty', '빈 칸'));
    (p.fusions || []).forEach((f) => pl.appendChild(buildItem(f, G.FUSIONS[f].name, '패시브 조합', 'is-combo')));
    Object.keys(p.passives).forEach((k) => {
      const lv = p.passives[k];
      pl.appendChild(buildItem(k, G.PASSIVES[k].name, 'Lv ' + lv + (lv >= G.PASSIVE_MAX ? ' MAX' : ''), ''));
    });
    const used = Object.keys(p.passives).length + (p.fusions || []).length;
    for (let i = used; i < G.passiveSlots(p); i++) pl.appendChild(el('li', 'build-item is-empty', '빈 칸'));
    $('build-wcount').textContent = p.weapons.length + ' / ' + G.weaponSlots(p);
    $('build-pcount').textContent = used + ' / ' + G.passiveSlots(p);
  }

  // catalog: 도감에서 쓰는 목록(진행도 없이 조합법만)
  function renderComboBook(g, target, catalog) {
    const book = target || $('combo-book');
    book.textContent = '';
    const status = G.comboStatus ? G.comboStatus(catalog ? { weapons: [], passives: {}, fusions: [] } : g.player) : [];
    const groups = { evolve: [], union: [], fusion: [] };
    status.forEach((s) => { (groups[s.combo.type] || (groups[s.combo.type] = [])).push(s); });
    const labels = G.COMBO_TYPE_LABEL || { evolve: '진화', union: '무기 조합', fusion: '패시브 조합' };
    const rules = {
      evolve: '무기 Lv ' + G.WEAPON_MAX + ' + 패시브 보유 → 상자에서 진화',
      union: '두 무기 모두 Lv ' + G.WEAPON_MAX + ' → 상자에서 하나로, 칸 하나 더',
      fusion: '두 패시브 모두 Lv 5 → 상자에서 하나로, 칸 하나 더',
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
        // 아직 열리지 않은 재료가 있으면 잠김 표시
        const lockedPart = G.isItemUnlocked ? s.parts.find((pt) => !G.isItemUnlocked(pt.kind, pt.key)) : null;
        const lockStage = lockedPart && G.ITEM_UNLOCK_STAGE ? G.stageById(G.ITEM_UNLOCK_STAGE[lockedPart.kind + ':' + lockedPart.key]) : null;
        const li = el('li', 'combo-row' + (s.ready ? ' is-ready' : '') + (s.done ? ' is-done' : '') + (lockStage ? ' is-locked' : ''));
        const parts = el('span', 'combo-parts');
        s.parts.forEach((pt, i) => {
          if (i > 0) parts.appendChild(el('span', 'combo-plus', '+'));
          const part = el('span', 'combo-part' + (catalog || pt.ok ? ' is-ok' : pt.level > 0 ? ' is-partial' : ''));
          part.title = pt.name;
          part.appendChild(img(iconUrl(pt.key), '', 30, pt.name));
          const need = catalog ? (pt.need > 1 ? 'Lv ' + pt.need : '보유') : pt.kind === 'weapon' || pt.need > 1 ? (pt.level || 0) + '/' + pt.need : pt.level > 0 ? '보유' : '없음';
          part.appendChild(el('span', 'combo-part-lv', need));
          parts.appendChild(part);
        });
        li.appendChild(parts);
        li.appendChild(el('span', 'combo-arrow', '→'));
        const res = el('span', 'combo-result');
        res.appendChild(img(iconUrl(s.result.key), '', 34, ''));
        const rb = el('span', 'combo-result-body');
        const nameRow = el('span', 'combo-result-name', s.result.name);
        if (lockStage) {
          const badge = el('span', 'combo-lock');
          badge.innerHTML = LOCK_SVG;
          badge.setAttribute('aria-label', '잠김');
          nameRow.appendChild(badge);
        }
        rb.appendChild(nameRow);
        rb.appendChild(el('span', 'combo-result-desc', lockStage ? '다음 스테이지에서 열립니다' : s.ready ? '조건 충족 · 다음 상자에서 조합' : s.done ? '완성' : s.result.desc));
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

  function renderSpeedBtn() {
    const b = $('btn-speed');
    const owned = !!meta().speedMode;
    b.textContent = !owned ? '배속 (상점)' : '배속 ×' + G.speedMul();
    b.setAttribute('aria-pressed', owned && G.speedMul() > 1 ? 'true' : 'false');
  }

  function showPause(g) {
    show('pause');
    const st = g.stage || G.STAGES[0];
    const ch = G.CHAMPIONS[g.player.champion];
    $('pause-eyebrow').textContent = '일시정지 · ' + st.name + ' · ' + G.formatTime(g.time);
    $('pause-title').textContent = (ch ? ch.name : '지금') + '의 등불';
    $('btn-save-quit').textContent = '저장하고 나가기';
    renderSpeedBtn();
    renderBuild(g);
    renderComboBook(g);
    setTab('build');
    $('btn-resume').focus({ preventScroll: true });
  }

  // ---------- 결과 ----------

  let endResult = null;
  let endBonus = 0;

  function showEnd(g, r) {
    show('end');
    endResult = r;
    endBonus = 0;
    const screen = $('screen-end');
    const emblem = screen.querySelector('.end-emblem');
    emblem.alt = r.win ? '새벽의 등불' : '잠든 등불';
    screen.classList.toggle('is-win', !!r.win);
    const st = G.stageById ? G.stageById(r.stageId) : G.STAGES[0];
    const dName = r.difficultyId && r.difficultyId !== 'normal' && G.difficultyById ? ' ' + G.difficultyById(r.difficultyId).name : '';
    $('end-eyebrow').textContent = st.name + dName + ' · ' + (r.win ? G.formatTime(r.time) + ' 생존' : G.formatTime(r.time) + '에 쓰러짐');
    $('end-title').textContent = r.win ? '새벽이 밝았습니다' : '등불이 꺼졌습니다';
    $('end-time').textContent = G.formatTime(r.time);
    $('end-level').textContent = r.level;
    $('end-kills').textContent = fmtNum(r.kills);
    $('end-gold').textContent = '+' + fmtNum(r.gold);
    const ul = $('end-unlocked');
    ul.textContent = '';
    const unlocked = (r.newlyUnlocked || []).slice();
    if (r.unlockedDifficulty && !unlocked.some((t) => t.indexOf('난이도가 열렸습니다') !== -1)) unlocked.push(r.unlockedDifficulty + ' 난이도가 열렸습니다');
    unlocked.forEach((t) => ul.appendChild(el('li', 'end-unlock', t)));
    ul.hidden = !ul.children.length;
    // 첫 클리어 별빛 결정, 광고 보고 금화 2배
    const cr = r.crystals || 0;
    $('end-crystals').hidden = !cr;
    $('end-crystals-text').textContent = cr ? '+' + fmtNum(cr) + (r.firstClear ? ' 별빛 결정 (첫 클리어 덤 포함)' : ' 별빛 결정') : '';
    const dbl = $('btn-double');
    dbl.hidden = !r.canDoubleGold;
    dbl.disabled = false;
    $('double-label').textContent = '광고 보고 금화 2배 (+' + fmtNum(r.gold) + ')';
    $('end-rewards').hidden = !cr && !r.canDoubleGold;
    refreshGold();
    pickedStage = r.stageId || pickedStage;
    pickedChampion = r.championId || pickedChampion;
    $('btn-title').focus({ preventScroll: true });
  }

  // ---------- 화면 전환 ----------

  function claimDouble() {
    const dbl = $('btn-double');
    if (dbl.disabled || !endResult || !game.claimDoubleGold) return;
    dbl.disabled = true;
    sfx('click');
    game.claimDoubleGold().then((add) => {
      if (add > 0) {
        endBonus += add;
        $('end-gold').textContent = '+' + fmtNum(endResult.gold + endBonus);
        $('double-label').textContent = '금화 2배 받음';
        sfx('coin');
        refreshGold();
      } else {
        dbl.disabled = false;
        $('double-label').textContent = '광고를 끝까지 보면 2배 (+' + fmtNum(endResult.gold) + ')';
      }
    }, () => { dbl.disabled = false; });
  }

  function showTitleScreen() {
    renderTitle();
    show('title');
  }

  function back() {
    if (!$('dialog').hidden) { closeDialog(); return true; }
    if (!$('odds').hidden) { closeOdds(); return true; }
    if (!$('pull-fx').hidden) { if (pullPhase === 'done') closePull(); else finishPull(); return true; }
    switch (current) {
      case 'stage': showTitleScreen(); $('btn-new').focus({ preventScroll: true }); return true;
      case 'champion':
        if (championFrom === 'title') { showTitleScreen(); $('btn-new').focus({ preventScroll: true }); }
        else openStage();
        return true;
      case 'shop':
        showTitleScreen();
        $('btn-shop').focus({ preventScroll: true });
        return true;
      case 'gacha':
        if (gachaFrom === 'shop') { openShop(shopFrom); return true; }
        showTitleScreen();
        $('btn-gacha').focus({ preventScroll: true });
        return true;
      case 'codex':
        showTitleScreen();
        $('btn-codex').focus({ preventScroll: true });
        return true;
      case 'store':
        if (storeFrom === 'gacha') { openGacha(gachaFrom); return true; }
        if (storeFrom === 'pause') { showPause(game); return true; }
        showTitleScreen();
        $('btn-store').focus({ preventScroll: true });
        return true;
      case 'settings': closeSettings(); return true;
      case 'lore': closeLore(); return true;
      case 'pause':
        if (!$('pane-combo').hidden) { setTab('build'); $('tab-build').focus({ preventScroll: true }); return true; }
        if (game && game.resume) game.resume();
        return true;
      default: return false;
    }
  }

  // 방향키로 보이는 화면 안의 버튼 사이를 이동
  function moveFocus(dir) {
    const root = !$('dialog').hidden ? $('dialog') : !$('odds').hidden ? $('odds') : !$('pull-fx').hidden ? $('pull-fx') : current && $('screen-' + current);
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
    const modal = !$('dialog').hidden ? $('dialog') : !$('odds').hidden ? $('odds') : !$('pull-fx').hidden ? $('pull-fx') : null;
    if (modal && e.key === 'Tab') {
      const items = [...modal.querySelectorAll('button:not([disabled]), [tabindex="0"]')].filter((n) => n.getClientRects().length && getComputedStyle(n).visibility !== 'hidden');
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) { first.focus(); e.preventDefault(); }
    }
    if (modal && modal !== $('pull-fx') && e.key !== 'Escape' && !e.key.startsWith('Arrow')) return;
    // 글자 입력칸: Esc(뒤로)만 화면이 처리하고 나머지 키는 입력칸이 쓴다
    if (tag === 'INPUT' && e.target.type === 'text' && e.key !== 'Escape') return;
    if (e.key === 'Escape') {
      // 화면이 처리한 Esc는 게임 쪽(일시정지 토글)으로 넘기지 않는다
      if (back()) { e.preventDefault(); e.stopPropagation(); }
      return;
    }
    if (current === 'levelup' && /^(Digit|Numpad)[1-5]$/.test(e.code)) {
      const i = Number(e.code.slice(-1)) - 1;
      if (i < cardCount) { pickCard(i); e.preventDefault(); }
      return;
    }
    if (current === 'levelup' && e.code === 'KeyR') { reroll(); e.preventDefault(); return; }
    if (!$('pull-fx').hidden && (e.key === 'Enter' || e.key === ' ')) {
      if (pullPhase !== 'done') { e.preventDefault(); finishPull(); return; }
      if (tag === 'BUTTON') return;
      e.preventDefault();
      closePull();
      return;
    }
    if (current === 'chest' && (e.key === 'Enter' || e.key === ' ')) {
      if (chestDone && tag === 'BUTTON' && e.target.id === 'btn-chest-ok') return; // 버튼이 직접 처리
      e.preventDefault();
      closeChest();
      return;
    }
    if (current === 'lore' && e.key === 'Enter' && tag !== 'BUTTON') { closeLore(); e.preventDefault(); return; }
    if (current === 'title' && e.key === 'Enter' && tag !== 'BUTTON' && loaded) { $('btn-new').click(); e.preventDefault(); return; }
    if (current === 'champion' && e.key === 'Enter' && tag !== 'BUTTON') { startRun(); e.preventDefault(); return; }
    if (current === 'end' && e.key === 'Enter' && tag !== 'BUTTON') { game.toTitle(); e.preventDefault(); return; }
    if (tag === 'INPUT' && e.target.type === 'range') return;
    const visible = current && current !== null && $('screen-' + current) && !$('screen-' + current).hidden;
    if (!visible && $('dialog').hidden && $('odds').hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { if (moveFocus(1)) e.preventDefault(); }
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { if (moveFocus(-1)) e.preventDefault(); }
  }

  // ---------- 공개 함수 ----------

  G.ui = {
    init(g) {
      game = g;
      // 앱처럼: 길게 눌러 뜨는 메뉴와 그림 끌기를 막는다(글자 입력칸은 그대로)
      document.addEventListener('contextmenu', (e) => { if (!e.target.closest('input, textarea')) e.preventDefault(); });
      document.addEventListener('dragstart', (e) => e.preventDefault());
      // 로고 그림이 없으면 글자 로고로
      const logo = $('logo-img');
      const markLogo = () => $('logo').classList.toggle('has-img', !!(logo.complete && logo.naturalWidth));
      logo.addEventListener('load', markLogo);
      logo.addEventListener('error', markLogo);
      markLogo();

      $('btn-continue').addEventListener('click', () => { sfx('select'); game.continueRun(); });
      $('btn-new').addEventListener('click', () => { if (!loaded) return; renderTitle(); sfx('select'); openChampion('title'); });
      $('btn-lobby-stage').addEventListener('click', () => { sfx('click'); openStage(); });
      $('btn-crystal-add').addEventListener('click', () => { sfx('click'); openStore('title'); });
      $('btn-shop').addEventListener('click', () => { sfx('click'); openShop('title'); });
      $('btn-gacha').addEventListener('click', () => { sfx('click'); openGacha('title'); });
      $('btn-codex').addEventListener('click', () => { sfx('click'); openCodex(); });
      $('btn-lv-book').addEventListener('click', () => { sfx('click'); toggleLvBook(); });
      $('lv-book-mine').addEventListener('click', () => { sfx('click'); lvBookAll = false; renderLvBook(); });
      $('lv-book-all').addEventListener('click', () => { sfx('click'); lvBookAll = true; renderLvBook(); });
      $('btn-lore').addEventListener('click', (e) => { e.stopPropagation(); closeLore(); });
      $('screen-lore').addEventListener('click', closeLore);
      CODEX_TABS.forEach((t) => $('codex-tab-' + t).setAttribute('aria-controls', 'codex-body'));
      CODEX_TABS.forEach((t) => $('codex-tab-' + t).addEventListener('click', () => { sfx('click'); setCodexTab(t); }));
      $('btn-store').addEventListener('click', () => { sfx('click'); openStore('title'); });
      $('tab-altar').addEventListener('click', () => { sfx('click'); setGachaTab('altar'); });
      $('tab-heroes').addEventListener('click', () => { sfx('click'); setGachaTab('heroes'); });
      $('tab-coll').addEventListener('click', () => { sfx('click'); setGachaTab('coll'); });
      document.querySelectorAll('#pane-altar .pull-btn').forEach((b) => b.addEventListener('click', () => doPull(Number(b.dataset.n), b.dataset.cur)));
      $('btn-odds').addEventListener('click', () => { sfx('click'); openOdds(); });
      $('odds-close').addEventListener('click', () => { sfx('click'); closeOdds(); });
      $('odds').addEventListener('click', (e) => { if (e.target === $('odds')) closeOdds(); });
      $('pull-fx').addEventListener('click', (e) => {
        if (pullPhase && pullPhase !== 'done') { finishPull(); return; }
        if (e.target === $('pull-fx')) closePull();
      });
      $('pull-ok').addEventListener('click', (e) => { e.stopPropagation(); if (pullPhase === 'done') { sfx('click'); closePull(); } });
      $('pull-again').addEventListener('click', (e) => { e.stopPropagation(); pullAgain(); });
      $('btn-reroll').addEventListener('click', reroll);
      $('btn-double').addEventListener('click', claimDouble);
      preloadChestArt();
      $('btn-settings').addEventListener('click', () => { sfx('click'); openSettings('title'); });
      $('btn-start').addEventListener('click', startRun);
      document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => { sfx('click'); back(); }));
      bindSettings();

      $('btn-chest-ok').addEventListener('click', (e) => { e.stopPropagation(); closeChest(); });

      $('tab-build').addEventListener('click', () => { sfx('click'); setTab('build'); });
      $('tab-combo').addEventListener('click', () => { sfx('click'); setTab('combo'); });
      $('btn-resume').addEventListener('click', () => { sfx('click'); game.resume(); });
      $('btn-pause-settings').addEventListener('click', () => { sfx('click'); openSettings('pause'); });
      $('btn-speed').addEventListener('click', () => {
        sfx('click');
        if (!meta().speedMode) { openStore('pause'); return; }
        settingsObj().speed = G.SPEEDS[(G.SPEEDS.indexOf(G.speedMul()) + 1) % G.SPEEDS.length];
        G.saveMeta();
        renderSpeedBtn();
      });
      $('btn-save-quit').addEventListener('click', () => {
        sfx('click');
        if (!game.saveAndQuit()) $('btn-save-quit').textContent = '저장 실패 · 다시 시도';
      });
      $('btn-giveup').addEventListener('click', () => {
        confirmDialog('이번 판을 포기할까요?', '지금까지 버틴 시간과 모은 금화로 결과가 정해지고, 이어하기 기록은 지워집니다.', '포기하기', () => {
          closeDialog();
          game.giveUp();
        });
      });
      $('pause-btn').addEventListener('click', () => game.pause());

      $('btn-retry').addEventListener('click', () => { sfx('select'); game.retry(); });
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
      const pct = Math.round((done ? 1 : progress || 0) * 100);
      $('new-label').textContent = done ? '전투 시작' : '등불을 켜는 중 ' + pct + '%';
      $('splash-fill').style.width = pct + '%';
      $('splash-text').textContent = done ? '준비 완료' : '등불을 켜는 중 ' + pct + '%';
      if (done) setTimeout(() => $('splash').classList.add('is-done'), 250);
      $('btn-continue').disabled = !done;
      if (done && G.LORE.prologue && !meta().lore.prologue) setTimeout(() => openLore('prologue', showTitleScreen), 500);
      if (done) {
        renderTitle();
        if (current === 'title') ($('btn-continue').hidden ? btn : $('btn-continue')).focus({ preventScroll: true });
      }
    },

    showTitle() { if (current === 'lore') return; showTitleScreen(); focusFirst($('screen-title')); },
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
    openGacha,
    openStore,
    current() { return current; },
  };
})(window.G);
