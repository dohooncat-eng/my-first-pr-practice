// 캔버스 HUD: 황동 눈금과 숲색 판. 그림이 없으면 도형으로 읽히게 한다.
(function (G) {
  'use strict';
  const DISPLAY = '"Black Han Sans", "IBM Plex Sans KR", sans-serif';
  const BODY = '"IBM Plex Sans KR", sans-serif';
  const SAFE = { t: 0, r: 0, b: 0, l: 0 };
  const TAU = Math.PI * 2;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const icons = {};
  // 조합 아이콘은 원본 무기의 그림을 빌린다. 미리 굽는 목록에도 같은 주소를 쓴다.
  const spriteUrl = G.spriteUrl;
  G.spriteUrl = function (file) {
    if (file.indexOf('icon_') === 0) {
      const key = file.slice(5), def = G.WEAPONS[key];
      if (key === 'barrier') return spriteUrl('ui_barrier');
      if (def && def.icon) return spriteUrl('icon_' + def.icon);
    }
    return spriteUrl(file);
  };
  G.roundRect = function (ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  };
  function icon(key) {
    const def = G.WEAPONS[key];
    key = def && def.icon || key;
    const baked = G.art && G.art.get('icon_' + key);
    if (baked) return baked.img;
    let im = icons[key];
    if (!im) { im = icons[key] = new Image(); im.src = G.spriteUrl('icon_' + key); }
    return im.complete && im.naturalWidth ? im : null;
  }
  function plate(ctx, x, y, w, h, color) {
    G.roundRect(ctx, x, y, w, h, 4);
    ctx.fillStyle = '#10251eec'; ctx.fill();
    ctx.strokeStyle = color || '#aa915c'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#d8c68c22'; ctx.fillRect(x + 4, y + 2, w - 8, 1);
  }
  function diamond(ctx, x, y, r, color) {
    ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  }
  function slot(ctx, x, y, size, key, level, max, special) {
    plate(ctx, x, y, size, size, special ? '#dcc180' : key ? '#829969' : '#52634477');
    if (!key) { diamond(ctx, x + size / 2, y + size / 2, 2, '#61745066'); return; }
    const im = icon(key);
    if (im) ctx.drawImage(im, x + 3, y + 2, size - 6, size - 6);
    else diamond(ctx, x + size / 2, y + size / 2, size / 4, special ? '#e5c27a' : '#9cc4a5');
    if (max) {
      const step = (size - 6) / max;
      for (let i = 0; i < max; i++) { ctx.fillStyle = i < level ? '#e7ca85' : '#09160d'; ctx.fillRect(x + 3 + i * step, y + size - 5, Math.max(1, step - 1), 2); }
    } else if (level) {
      ctx.fillStyle = '#0b1710'; ctx.fillRect(x + size - 12, y + size - 12, 11, 11);
      ctx.fillStyle = '#e5ce94'; ctx.font = '10px ' + DISPLAY; ctx.textAlign = 'center'; ctx.fillText(String(level), x + size - 6, y + size - 3);
    }
    if (special) diamond(ctx, x + size - 4, y + 4, 3, '#ffe6a4');
  }
  function compact(n) { return n >= 10000 ? (Math.floor(n / 1000) / 10).toFixed(1) + '만' : String(n); }
  // 딜량 표: 무기별 누적 피해, 초당 피해, 비율 (오른쪽, 많이 준 순서로 최대 6개)
  const dpsRows = [];
  function drawDps(ctx, game, R, y, narrow, flat) {
    const stats = game._dmgOwner === game.player && game.dmgStats;
    const mode = (game.settings && game.settings.dps) || 'both'; // both | rate | total | off
    if (!stats || flat || mode === 'off') return;
    dpsRows.length = 0;
    let total = 0;
    for (const k in stats) { total += stats[k]; dpsRows.push(k); }
    if (!total) return;
    dpsRows.sort((a, b) => stats[b] - stats[a]);
    const n = Math.min(narrow ? 4 : 6, dpsRows.length);
    const bw = (narrow ? 128 : 168) + (mode === 'both' ? (narrow ? 26 : 34) : 0), rowH = narrow ? 20 : 24, x = R - bw;
    const secs = Math.max(1, game.time);
    plate(ctx, x, y, bw, 20 + n * rowH + 4, '#7f7650');
    ctx.font = '600 9px ' + BODY; ctx.textAlign = 'left'; ctx.fillStyle = '#c7b47e';
    ctx.fillText('딜량', x + 8, y + 14);
    ctx.textAlign = 'right'; ctx.fillStyle = '#9fae92';
    ctx.fillText('총 ' + compact(Math.round(total)) + ' · 초당 ' + compact(Math.round(total / secs)), x + bw - 8, y + 14);
    for (let i = 0; i < n; i++) {
      const k = dpsRows[i], v = stats[k], ry = y + 20 + i * rowH;
      const share = v / total;
      const isz = rowH - 6;
      const im = k !== 'etc' && icon(k);
      if (im) ctx.drawImage(im, x + 6, ry + 2, isz, isz);
      else { ctx.fillStyle = '#3a4a3c'; ctx.fillRect(x + 6, ry + 2, isz, isz); }
      const tx = x + 10 + isz, barW = bw - (tx - x) - 8;
      ctx.fillStyle = '#06120e'; ctx.fillRect(tx, ry + rowH - 8, barW, 4);
      ctx.fillStyle = i === 0 ? '#e9b45c' : '#8fb39a'; ctx.fillRect(tx, ry + rowH - 8, barW * share, 4);
      const def = G.WEAPONS[k];
      const name = k === 'etc' ? '기타' : (def && def.name) || k;
      ctx.font = '600 ' + (narrow ? 9 : 10) + 'px ' + BODY; ctx.textAlign = 'left'; ctx.fillStyle = '#e8dcb6';
      ctx.fillText(name, tx, ry + rowH - 11, barW * 0.55);
      ctx.textAlign = 'right'; ctx.fillStyle = '#f1d49a';
      const rate = compact(Math.round(v / secs)) + '/초', sum = compact(Math.round(v));
      const val = mode === 'rate' ? rate : mode === 'total' ? sum : sum + ' · ' + rate;
      ctx.fillText(val + ' · ' + Math.round(share * 100) + '%', x + bw - 8, ry + rowH - 11);
    }
  }

  G.drawHUD = function (ctx, game) {
    const p = game.player; if (!p) return;
    const w = game.w, s = game.safe || SAFE, T = s.t;
    const L = Math.max(12, s.l + 10), R = w - Math.max(12, s.r + 10);
    const narrow = w < 840, flat = game.h < 500;
    const quiet = motion.matches || !!(G.meta && G.meta.settings.reducedMotion) || document.documentElement.classList.contains('reduce-motion');
    ctx.save(); ctx.textBaseline = 'alphabetic';
    // 경험치: 얇은 유리 홈, 가득 찰수록 밝아지는 달빛.
    const xp = G.clamp(p.xp / p.xpNext, 0, 1), xpW = R - L;
    ctx.fillStyle = '#06120ef2'; ctx.fillRect(L, T + 3, xpW, 8);
    ctx.strokeStyle = '#8d875944'; ctx.lineWidth = 1; ctx.strokeRect(L, T + 3, xpW, 8);
    ctx.fillStyle = '#538b8c'; ctx.fillRect(L + 1, T + 4, (xpW - 2) * xp, 6);
    ctx.fillStyle = '#a1e0d8'; ctx.fillRect(L + 1, T + 4, (xpW - 2) * xp, 2);
    for (let i = 1; i < 10; i++) { ctx.fillStyle = '#08171088'; ctx.fillRect(L + xpW * i / 10, T + 4, 1, 6); }
    if (xp > 0) diamond(ctx, L + (xpW - 2) * xp, T + 7, 3, '#d5f5e3');
    if (game.fx && game.fx.xp > 0) {
      ctx.globalAlpha = game.fx.xp * (quiet ? 0.3 : 0.7);
      ctx.fillStyle = '#d5ffe9'; ctx.fillRect(L + 1, T + 4, (xpW - 2) * xp, 2);
      if (xp > 0) diamond(ctx, L + (xpW - 2) * xp, T + 7, quiet ? 3 : 3 + game.fx.xp * 2, '#fff9d7');
      ctx.globalAlpha = 1;
    }
    // 레벨 인장과 시간판은 서로 독립된 폭을 갖는다.
    plate(ctx, L, T + 20, 44, 43, '#c5a86d');
    ctx.fillStyle = '#c7b47e'; ctx.font = '600 8px ' + BODY; ctx.textAlign = 'center'; ctx.fillText('레벨', L + 22, T + 32);
    ctx.font = (p.level > 99 ? 18 : 23) + 'px ' + DISPLAY; ctx.fillStyle = '#f4e6ba'; ctx.fillText(String(p.level), L + 22, T + 56);
    diamond(ctx, L + 22, T + 20, 3, '#e9c888');
    if (game.fx && game.fx.level > 0) {
      ctx.globalAlpha = game.fx.level / 0.65;
      ctx.strokeStyle = '#ffe5a0'; ctx.lineWidth = 2;
      G.roundRect(ctx, L - 2, T + 18, 48, 47, 5); ctx.stroke(); ctx.globalAlpha = 1;
    }
    const win = G.runTime(game);
    plate(ctx, w / 2 - 58, T + 19, 116, 43, '#8d9867');
    ctx.textAlign = 'center'; ctx.fillStyle = game.time >= win - 60 ? '#f5ca83' : '#f0e8cd';
    ctx.font = '28px ' + DISPLAY; ctx.fillText(G.formatTime(game.time), w / 2, T + 51);
    ctx.font = '600 9px ' + BODY; ctx.fillStyle = '#a5b79b';
    ctx.fillText('/ ' + G.formatTime(win) + '  ·  처치 ' + compact(game.kills), w / 2, T + 75);
    const speed = G.speedMul();
    if (speed > 1) { ctx.fillStyle = '#e4c17a'; ctx.font = '11px ' + DISPLAY; ctx.fillText('×' + speed, w / 2 + 72, T + 46); }
    const gold = Math.floor(game.runGold || 0), coin = G.art && G.art.get('coin');
    const gx = L + 1, gy = T + 70;
    if (coin) ctx.drawImage(coin.img, gx, gy - 9, 14, 14); else diamond(ctx, gx + 7, gy - 2, 6, '#e4b65c');
    ctx.font = '11px ' + DISPLAY; ctx.textAlign = 'left'; ctx.fillStyle = '#dfc180'; ctx.fillText(compact(gold), gx + 18, gy + 2);
    // 작은 화면에서도 조합으로 늘어난 칸이 겹치지 않도록 여러 줄로 놓는다.
    const mapR = flat ? 28 : narrow ? 33 : 42;
    const mapX = R - mapR, mapY = T + 75 + mapR;
    G.drawMinimap(ctx, game, mapX, mapY, mapR);
    ctx.strokeStyle = '#a69d6355'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(mapX, mapY, mapR + 3, 0, TAU); ctx.stroke();
    diamond(ctx, mapX, mapY - mapR - 3, 2, '#cebf89');
    const wc = G.weaponSlots(p), pc = G.passiveSlots(p);
    const cols = narrow ? 6 : 10, gap = 4;
    const available = narrow && !flat ? R - L - mapR * 2 - 14 : Math.min(400, w * 0.38);
    const size = Math.max(20, Math.min(flat ? 27 : 34, Math.floor((available - gap * (cols - 1)) / cols)));
    const small = flat ? 22 : 25;
    const rows = Math.ceil(wc / cols), prows = Math.ceil(pc / cols);
    const slotsY = flat ? game.h - s.b - 10 - rows * (size + gap) - prows * (small + gap) : T + 87;
    for (let i = 0; i < wc; i++) {
      const weapon = p.weapons[i], def = weapon && G.WEAPONS[weapon.key], special = def && def.kind !== 'base';
      slot(ctx, L + (i % cols) * (size + gap), slotsY + Math.floor(i / cols) * (size + gap), size, weapon ? weapon.key : null, weapon ? weapon.level : 0, special ? 0 : G.WEAPON_MAX, special);
    }
    const py = slotsY + rows * (size + gap), fusions = p.fusions;
    let pi = 0;
    if (fusions) for (; pi < fusions.length; pi++) slot(ctx, L + (pi % cols) * (small + gap), py + Math.floor(pi / cols) * (small + gap), small, fusions[pi], 0, 0, true);
    for (const key in p.passives) { slot(ctx, L + (pi % cols) * (small + gap), py + Math.floor(pi / cols) * (small + gap), small, key, p.passives[key], 0, false); pi++; }
    for (; pi < pc; pi++) slot(ctx, L + (pi % cols) * (small + gap), py + Math.floor(pi / cols) * (small + gap), small, null, 0, 0, false);
    const inventoryEnd = py + prows * (small + gap);
    let bannerY = flat ? T + 111 : narrow ? Math.max(inventoryEnd, mapY + mapR) + 20 : T + 125;
    const boss = game.boss;
    if (boss && !boss.dead) {
      const bw = flat ? Math.min(270, w - 250) : narrow ? R - L : 400;
      const bx = (w - bw) / 2, by = flat ? T + 99 : narrow ? bannerY + 4 : T + 103;
      const name = boss.name || (G.BOSS_TYPES && G.BOSS_TYPES[boss.type] && G.BOSS_TYPES[boss.type].name) || '보스';
      ctx.font = (flat ? 12 : 14) + 'px ' + DISPLAY; ctx.textAlign = 'center'; ctx.fillStyle = '#efb3a0'; ctx.fillText(name, w / 2, by - 7, bw);
      plate(ctx, bx, by, bw, 10, '#a66b59');
      const ratio = G.clamp(boss.hp / boss.maxHp, 0, 1);
      ctx.fillStyle = '#b54f52'; ctx.fillRect(bx + 2, by + 2, (bw - 4) * ratio, 6);
      ctx.fillStyle = '#ed9c88'; ctx.fillRect(bx + 2, by + 2, (bw - 4) * ratio, 2);
      diamond(ctx, bx, by + 5, 4, '#d6ab81'); diamond(ctx, bx + bw, by + 5, 4, '#d6ab81');
      bannerY = by + 34;
    }
    // 화면 밖 보스: 가장자리에 붉은 화살표
    if (boss && !boss.dead) {
      const sx = (boss.x - game.cam.x) * game.zoom + w / 2, sy = (boss.y - game.cam.y) * game.zoom + game.h / 2;
      const m = 34;
      if (sx < 0 || sx > w || sy < 0 || sy > game.h) {
        const a = Math.atan2(sy - game.h / 2, sx - w / 2);
        const ex = G.clamp(sx, m, w - m), ey = G.clamp(sy, m + T + (flat ? 70 : 140), game.h - m - s.b);
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(a);
        ctx.globalAlpha = quiet ? 0.9 : 0.75 + Math.sin(game.clock * 8) * 0.25;
        ctx.fillStyle = '#ff4d5e';
        ctx.strokeStyle = '#1a0306';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(16, 0);
        ctx.lineTo(-10, -12);
        ctx.lineTo(-4, 0);
        ctx.lineTo(-10, 12);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
        ctx.restore();
      }
    }


    // 알림은 줄 길이를 제한한 작은 리본에 놓는다.
    if (game.banner) {
      const b = game.banner, life = b.life / b.max;
      const alpha = Math.min(1, life * 4, (1 - life) * 8 + 0.2);
      ctx.globalAlpha = alpha;
      ctx.font = (narrow ? 12 : 15) + 'px ' + DISPLAY;
      const bw = Math.min(R - L - 8, ctx.measureText(b.text).width + 34);
      plate(ctx, w / 2 - bw / 2, bannerY - 16, bw, 26, '#827c50');
      ctx.fillStyle = '#f1d49a'; ctx.textAlign = 'center'; ctx.fillText(b.text, w / 2, bannerY + 2, bw - 18);
      ctx.globalAlpha = 1;
    }
    if (game.settings && game.settings.fps) {
      ctx.font = '600 10px ' + BODY; ctx.textAlign = 'right'; ctx.fillStyle = '#afbf9a'; ctx.fillText(Math.round(game.fps || 0) + ' FPS', R, mapY + mapR + 16);
    }
    drawDps(ctx, game, R, Math.max(mapY + mapR + 24, narrow ? bannerY + 18 : 0), narrow, flat);
    const st = G.input && G.input.stick;
    if (st && st.active && game.state === 'playing') {
      const radius = G.input.STICK_RADIUS;
      ctx.fillStyle = '#10291f66'; ctx.strokeStyle = '#c0b77e88'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(st.ox, st.oy, radius, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#adc09a55'; ctx.beginPath(); ctx.arc(st.ox, st.oy, radius - 7, 0, TAU); ctx.stroke();
      for (let i = 0; i < 4; i++) diamond(ctx, st.ox + Math.cos(i * Math.PI / 2) * (radius - 13), st.oy + Math.sin(i * Math.PI / 2) * (radius - 13), 3, '#c7c28c99');
      let dx = st.x - st.ox, dy = st.y - st.oy; const len = Math.hypot(dx, dy);
      if (len > radius) { dx = dx / len * radius; dy = dy / len * radius; }
      const x = st.ox + dx, y = st.oy + dy;
      ctx.beginPath(); ctx.arc(x, y, 21, 0, TAU); ctx.fillStyle = '#244438db'; ctx.fill(); ctx.strokeStyle = '#e1c789'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y - 2, 15, Math.PI * 1.1, Math.PI * 1.9); ctx.strokeStyle = '#f4e4b466'; ctx.lineWidth = 1; ctx.stroke();
      diamond(ctx, x, y, 6, '#dec382'); diamond(ctx, x, y, 2, '#fff1bb');
    }
    ctx.restore();
  };
})(window.G);
