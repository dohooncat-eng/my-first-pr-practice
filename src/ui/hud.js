// 캔버스 HUD: 경험치 막대, 시간, 처치·금화, 레벨, 무기 6칸·패시브 6칸, 보스 체력, 알림, FPS, 터치 조이스틱
(function (G) {
  'use strict';

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

  // 아이콘: 미리 구워 둔 그림이 있으면 쓰고, 없으면 SVG를 직접 불러 둔다
  const iconCache = {};
  function icon(key) {
    const baked = G.art && G.art.get('icon_' + key);
    if (baked) return baked.img;
    let img = iconCache[key];
    if (!img) {
      img = iconCache[key] = new Image();
      img.src = G.spriteUrl('icon_' + key);
    }
    return img.complete && img.naturalWidth ? img : null;
  }

  // 칸 하나. gold: 조합 결과물(금빛 테두리)
  function slot(ctx, x, y, size, key, level, max, gold) {
    G.roundRect(ctx, x, y, size, size, 7);
    ctx.fillStyle = 'rgba(9, 15, 13, 0.82)';
    ctx.fill();
    ctx.lineWidth = gold ? 1.6 : 1;
    ctx.strokeStyle = gold ? 'rgba(255, 210, 122, 0.85)' : key ? 'rgba(255, 210, 140, 0.32)' : 'rgba(236, 228, 210, 0.1)';
    ctx.stroke();
    if (!key) return;
    const img = icon(key);
    const pad = size * 0.14;
    const iconSize = size - pad * 2;
    if (img) ctx.drawImage(img, x + pad, y + pad - (max ? 3 : 0), iconSize, iconSize);
    if (gold) {
      ctx.globalCompositeOperation = 'lighter';
      G.drawGlow(ctx, 'rgba(255, 200, 110, 0.5)', x + size / 2, y + size / 2, size * 0.7, 0.35);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (!max) return;
    // 레벨 눈금
    const pw = (size - 12) / max;
    for (let i = 0; i < max; i++) {
      ctx.fillStyle = i < level ? '#ffb547' : 'rgba(236, 228, 210, 0.16)';
      ctx.fillRect(x + 6 + i * pw + 0.5, y + size - 6, pw - 1.5, 2.5);
    }
  }

  function smallLevel(ctx, x, y, size, text, color) {
    ctx.font = '11px ' + FONT_DISPLAY;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color || '#ffd27a';
    ctx.fillText(text, x + size - 3, y + size - 3);
  }

  G.drawHUD = function (ctx, game) {
    const p = game.player;
    if (!p) return;
    const w = game.w, s = game.safe || { t: 0, r: 0, b: 0, l: 0 };
    const L = Math.max(16, s.l + 12);
    const R = w - Math.max(16, s.r + 12);
    const T = s.t;
    const narrow = w < 720;

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
    ctx.fillStyle = '#a3aea7';
    ctx.font = '600 11px ' + FONT_BODY;
    ctx.fillText('LEVEL', L, T + 30);
    ctx.fillStyle = '#ece4d2';
    ctx.font = '30px ' + FONT_DISPLAY;
    ctx.fillText(String(p.level), L, T + 60);

    // 버틴 시간 / 목표 시간, 처치 수, 금화
    const win = G.WIN_TIME || 1200;
    ctx.textAlign = 'center';
    ctx.font = (narrow ? 30 : 34) + 'px ' + FONT_DISPLAY;
    ctx.fillStyle = game.time >= win - 60 ? '#ffd27a' : '#ece4d2';
    ctx.fillText(G.formatTime(game.time), w / 2, T + 50);
    ctx.font = '600 12px ' + FONT_BODY;
    ctx.fillStyle = '#a3aea7';
    const line = '/ ' + G.formatTime(win) + '  ·  처치 ' + game.kills.toLocaleString('ko-KR');
    ctx.fillText(line, w / 2, T + 70);
    ctx.restore();

    // 금화 (레벨 오른쪽)
    const gold = Math.floor(game.runGold || 0);
    const coin = G.art && G.art.get('coin');
    const gx = L + 54, gy = T + 44;
    if (coin) ctx.drawImage(coin.img, gx, gy, 16, 16);
    else {
      ctx.fillStyle = '#ffcf5a';
      ctx.beginPath();
      ctx.arc(gx + 8, gy + 8, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = '14px ' + FONT_DISPLAY;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffd27a';
    ctx.fillText(String(gold), gx + 20, gy + 14);

    // 무기 6칸 + 패시브 6칸
    const big = narrow ? 36 : 40, gap = narrow ? 5 : 6;
    const slotsY = T + 78;
    const wslots = G.WEAPON_SLOTS || 6;
    for (let i = 0; i < wslots; i++) {
      const wpn = p.weapons[i];
      const def = wpn && G.WEAPONS[wpn.key];
      const combo = def && def.kind !== 'base';
      slot(ctx, L + i * (big + gap), slotsY, big, wpn ? wpn.key : null, wpn ? wpn.level : 0, combo ? 0 : G.WEAPON_MAX, combo);
    }
    const small = narrow ? 26 : 28;
    const py = slotsY + big + 6;
    const pslots = G.PASSIVE_SLOTS || 6;
    const pk = Object.keys(p.passives || {});
    const fusions = p.fusions || [];
    for (let i = 0; i < pslots; i++) {
      const x = L + i * (small + 5);
      if (i < fusions.length) {
        slot(ctx, x, py, small, fusions[i], 0, 0, true);
      } else {
        const key = pk[i - fusions.length];
        slot(ctx, x, py, small, key || null, 0, 0, false);
        if (key) smallLevel(ctx, x, py, small, String(p.passives[key]));
      }
    }

    // 보스 체력 막대: 넓은 화면은 시간 아래, 좁은 화면은 칸들 아래
    let bannerY = T + 112;
    const boss = game.boss;
    if (boss && !boss.dead) {
      const bw = Math.min(520, w - 32);
      const bx = (w - bw) / 2;
      const by = narrow ? py + small + 26 : T + 100;
      const name = boss.name || (G.BOSS_TYPES && G.BOSS_TYPES[boss.type] && G.BOSS_TYPES[boss.type].name) || '보스';
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 8;
      ctx.font = '16px ' + FONT_DISPLAY;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff9a8a';
      ctx.fillText(name, w / 2, by - 6);
      ctx.restore();
      G.roundRect(ctx, bx, by, bw, 12, 4);
      ctx.fillStyle = 'rgba(8, 10, 10, 0.9)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 120, 110, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
      const hr = G.clamp(boss.hp / boss.maxHp, 0, 1);
      const hg = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      hg.addColorStop(0, '#a3203a');
      hg.addColorStop(1, '#ff5a6a');
      ctx.fillStyle = hg;
      ctx.fillRect(bx + 2, by + 2, (bw - 4) * hr, 8);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fillRect(bx + 2, by + 2, (bw - 4) * hr, 2);
      bannerY = by + 40;
    }

    // 알림 문구
    if (game.banner) {
      const b = game.banner;
      const t = b.life / b.max;
      const a = Math.min(1, t * 4, (1 - t) * 8 + 0.2);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.textAlign = 'center';
      ctx.font = (narrow ? 18 : 22) + 'px ' + FONT_DISPLAY;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#ff9a6b';
      ctx.fillText(b.text, w / 2, Math.max(bannerY, narrow ? py + small + 30 : 0));
      ctx.restore();
    }

    // FPS (오른쪽 위, 일시정지 버튼 아래)
    if (game.settings && game.settings.fps) {
      ctx.font = '600 12px ' + FONT_BODY;
      ctx.textAlign = 'right';
      ctx.fillStyle = '#a3aea7';
      ctx.fillText(Math.round(game.fps || 0) + ' FPS', R, T + 86);
    }

    // 터치 조이스틱
    const st = G.input && G.input.stick;
    if (st && st.active && game.state === 'playing') {
      const Rr = G.input.STICK_RADIUS;
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(236, 228, 210, 0.22)';
      ctx.fillStyle = 'rgba(9, 15, 13, 0.3)';
      ctx.beginPath();
      ctx.arc(st.ox, st.oy, Rr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      let dx = st.x - st.ox, dy = st.y - st.oy;
      const l = Math.hypot(dx, dy);
      if (l > Rr) { dx = (dx / l) * Rr; dy = (dy / l) * Rr; }
      ctx.fillStyle = 'rgba(255, 181, 71, 0.55)';
      ctx.beginPath();
      ctx.arc(st.ox + dx, st.oy + dy, 20, 0, Math.PI * 2);
      ctx.fill();
    }
  };
})(window.G);
