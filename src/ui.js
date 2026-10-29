// 화면 UI: 캔버스 HUD + HTML 화면(타이틀, 레벨업, 일시정지, 결과)
(function (G) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const SCREENS = ['title', 'levelup', 'pause', 'end'];
  const FONT_DISPLAY = '"Black Han Sans", "IBM Plex Sans KR", sans-serif';
  const FONT_BODY = '"IBM Plex Sans KR", system-ui, sans-serif';

  G.roundRect = function (ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  // ---------- 캔버스 HUD ----------

  function slot(ctx, x, y, size, iconKey, level, max) {
    G.roundRect(ctx, x, y, size, size, 7);
    ctx.fillStyle = 'rgba(9, 15, 13, 0.82)';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = iconKey ? 'rgba(255, 210, 140, 0.32)' : 'rgba(236, 228, 210, 0.1)';
    ctx.stroke();
    if (!iconKey) return;
    const icon = G.art.get('icon_' + iconKey);
    const pad = size * 0.14;
    const iconSize = size - pad * 2;
    if (icon) ctx.drawImage(icon.img, x + pad, y + pad - (max ? 3 : 0), iconSize, iconSize);
    if (!max) return;
    // 레벨 눈금
    const pw = (size - 12) / max;
    for (let i = 0; i < max; i++) {
      ctx.fillStyle = i < level ? '#ffb547' : 'rgba(236, 228, 210, 0.16)';
      ctx.fillRect(x + 6 + i * pw + 0.5, y + size - 6, pw - 1.5, 2.5);
    }
  }

  G.drawHUD = function (ctx, game) {
    const p = game.player;
    const w = game.w, s = game.safe;
    const L = Math.max(16, s.l + 12);
    const T = s.t;

    // 경험치 막대 (화면 맨 위 전체)
    ctx.fillStyle = 'rgba(5, 9, 8, 0.92)';
    ctx.fillRect(0, T, w, 10);
    const ratio = G.clamp(p.xp / p.xpNext, 0, 1);
    const xg = ctx.createLinearGradient(0, 0, w, 0);
    xg.addColorStop(0, '#2c6f9a');
    xg.addColorStop(1, '#9fe4ff');
    ctx.fillStyle = xg;
    ctx.fillRect(0, T + 1, w * ratio, 7);
    if (ratio > 0) {
      ctx.globalCompositeOperation = 'lighter';
      G.drawGlow(ctx, 'rgba(160, 230, 255, 0.9)', w * ratio, T + 4, 14 + (game.gemSparkle || 0) * 60, 0.8);
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 6;

    // 레벨
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8f9c94';
    ctx.font = '600 11px ' + FONT_BODY;
    ctx.fillText('LEVEL', L, T + 30);
    ctx.fillStyle = '#ece4d2';
    ctx.font = '30px ' + FONT_DISPLAY;
    ctx.fillText(String(p.level), L, T + 60);

    // 버틴 시간, 처치 수, 목표 시간
    ctx.textAlign = 'center';
    ctx.font = '34px ' + FONT_DISPLAY;
    ctx.fillStyle = game.time >= G.WIN_TIME - 60 ? '#ffd27a' : '#ece4d2';
    ctx.fillText(G.formatTime(game.time), w / 2, T + 52);
    ctx.font = '600 12px ' + FONT_BODY;
    ctx.fillStyle = '#8f9c94';
    ctx.fillText('처치 ' + game.kills.toLocaleString('ko-KR') + '  ·  목표 ' + G.formatTime(G.WIN_TIME), w / 2, T + 72);
    ctx.restore();

    // 무기 칸 4개 + 패시브 칸 5개
    const keys = Object.keys(G.WEAPONS);
    const big = 40, gap = 6;
    for (let i = 0; i < keys.length; i++) {
      const wpn = p.weapons[i];
      slot(ctx, L + i * (big + gap), T + 74, big, wpn ? wpn.key : null, wpn ? wpn.level : 0, G.WEAPON_MAX);
    }
    const pk = Object.keys(p.passives);
    const small = 28;
    const pkCount = Object.keys(G.PASSIVES).length;
    for (let i = 0; i < pkCount; i++) {
      const key = pk[i];
      const x = L + i * (small + 5), y = T + 74 + big + 6;
      slot(ctx, x, y, small, key || null, 0, 0);
      if (key) {
        ctx.font = '11px ' + FONT_DISPLAY;
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffd27a';
        ctx.fillText(String(p.passives[key]), x + small - 3, y + small - 3);
      }
    }

    // 알림 문구
    if (game.banner) {
      const b = game.banner;
      const t = b.life / b.max;
      const a = Math.min(1, t * 4, (1 - t) * 8 + 0.2);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      ctx.font = '22px ' + FONT_DISPLAY;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ff9a6b';
      ctx.fillText(b.text, w / 2, T + 112);
      ctx.restore();
    }

    // 터치 조이스틱
    const st = G.input.stick;
    if (st.active && game.state === 'playing') {
      const R = G.input.STICK_RADIUS;
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(236, 228, 210, 0.22)';
      ctx.fillStyle = 'rgba(9, 15, 13, 0.3)';
      ctx.beginPath();
      ctx.arc(st.ox, st.oy, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      let dx = st.x - st.ox, dy = st.y - st.oy;
      const l = Math.hypot(dx, dy);
      if (l > R) { dx = (dx / l) * R; dy = (dy / l) * R; }
      ctx.fillStyle = 'rgba(255, 181, 71, 0.55)';
      ctx.beginPath();
      ctx.arc(st.ox + dx, st.oy + dy, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // ---------- HTML 화면 ----------

  let cardHandler = null;
  let cardsReady = false;

  function iconImg(key) {
    const img = document.createElement('img');
    img.src = G.spriteUrl('icon_' + key);
    img.alt = '';
    img.width = 56;
    img.height = 56;
    return img;
  }

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  G.ui = {
    init(game) {
      $('btn-start').addEventListener('click', () => game.start());
      $('btn-resume').addEventListener('click', () => game.resume());
      $('btn-quit').addEventListener('click', () => game.toTitle());
      $('btn-retry').addEventListener('click', () => game.start());
      $('btn-title').addEventListener('click', () => game.toTitle());
      $('pause-btn').addEventListener('click', () => game.pause());
    },

    show(name) {
      SCREENS.forEach((s) => { $('screen-' + s).hidden = s !== name; });
      $('pause-btn').hidden = name !== null;
      if (name === 'title') this.renderBest();
    },

    setLoading(progress, done) {
      const btn = $('btn-start');
      btn.disabled = !done;
      $('start-label').textContent = done ? '밤 속으로' : '등불을 켜는 중 ' + Math.round(progress * 100) + '%';
      if (done) btn.focus();
    },

    renderBest() {
      const best = G.storage.get(G.BEST_KEY);
      const box = $('best');
      if (!best) { box.hidden = true; return; }
      box.hidden = false;
      $('best-text').textContent = G.formatTime(best.time) + ' 생존 · Lv ' + best.level + ' · 처치 ' + best.kills.toLocaleString('ko-KR');
    },

    showLevelUp(game, choices, onPick) {
      this.show('levelup');
      $('lv-number').textContent = game.player.level;
      const box = $('cards');
      box.textContent = '';
      cardsReady = false;
      box.classList.add('arming');
      choices.forEach((c, i) => {
        const d = G.describeChoice(c);
        const btn = el('button', 'card' + (d.isNew ? ' is-new' : ''));
        btn.type = 'button';
        btn.id = 'card-' + i;
        btn.appendChild(el('span', 'card-key', String(i + 1)));
        const ic = el('span', 'card-icon');
        ic.appendChild(iconImg(d.icon));
        btn.appendChild(ic);
        const body = el('span', 'card-body');
        body.appendChild(el('span', 'card-tag', d.tag));
        body.appendChild(el('span', 'card-title', d.title));
        body.appendChild(el('span', 'card-text', d.text));
        if (c.kind !== 'heal') {
          const max = c.kind === 'weapon' ? G.WEAPON_MAX : G.PASSIVE_MAX;
          const pips = el('span', 'pips');
          pips.setAttribute('aria-label', '레벨 ' + c.level + ' / ' + max);
          for (let k = 1; k <= max; k++) {
            pips.appendChild(el('i', k < c.level ? 'on' : k === c.level ? 'next' : ''));
          }
          body.appendChild(pips);
        }
        btn.appendChild(body);
        btn.addEventListener('click', () => G.ui.pickCard(i));
        box.appendChild(btn);
      });
      cardHandler = (i) => onPick(choices[i]);
      // 레벨업 순간의 실수 클릭을 막으려고 잠깐 기다린다
      setTimeout(() => {
        cardsReady = true;
        box.classList.remove('arming');
        const first = $('card-0');
        if (first) first.focus({ preventScroll: true });
      }, 350);
    },

    pickCard(i) {
      if (!cardsReady || !cardHandler || !$('card-' + i)) return;
      cardsReady = false;
      const h = cardHandler;
      cardHandler = null;
      h(i);
    },

    showPause(game) {
      this.show('pause');
      const list = $('build');
      list.textContent = '';
      const p = game.player;
      p.weapons.forEach((w) => list.appendChild(buildRow(w.key, G.WEAPONS[w.key].name, w.level, G.WEAPON_MAX)));
      Object.keys(p.passives).forEach((k) => list.appendChild(buildRow(k, G.PASSIVES[k].name, p.passives[k], G.PASSIVE_MAX)));
      $('btn-resume').focus();
    },

    showEnd(game, result, isBest) {
      this.show('end');
      const screen = $('screen-end');
      screen.classList.toggle('is-win', result.win);
      $('end-eyebrow').textContent = result.win ? '10:00 생존' : G.formatTime(result.time) + '에 쓰러짐';
      $('end-title').textContent = result.win ? '새벽이 밝았습니다' : '등불이 꺼졌습니다';
      $('end-time').textContent = G.formatTime(result.time);
      $('end-level').textContent = result.level;
      $('end-kills').textContent = result.kills.toLocaleString('ko-KR');
      $('end-best').textContent = isBest ? '최고 기록입니다!' : '';
      $('btn-retry').focus();
    },
  };

  function buildRow(key, name, level, max) {
    const li = el('li', 'build-row');
    li.appendChild(iconImg(key));
    li.appendChild(el('span', 'build-name', name));
    li.appendChild(el('span', 'build-lv', 'Lv ' + level + (level >= max ? ' MAX' : '')));
    return li;
  }
})(window.G);
