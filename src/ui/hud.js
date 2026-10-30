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
    const d = G.WEAPONS[key];
    if (d && d.icon) key = d.icon;
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

  // 금테 두른 어두운 알약(시간·금화 칩)
  function pill(ctx, x, y, w, h) {
    G.roundRect(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = 'rgba(7, 18, 14, 0.82)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(214, 180, 104, 0.55)';
    ctx.stroke();
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
    ctx.fillStyle = 'rgba(5, 9, 8, 0.94)';
    ctx.fillRect(0, T, w, 12);
    ctx.fillStyle = 'rgba(214, 180, 104, 0.6)';
    ctx.fillRect(0, T + 12, w, 1.5);
    const ratio = G.clamp(p.xp / p.xpNext, 0, 1);
    const xg = ctx.createLinearGradient(0, 0, w, 0);
    xg.addColorStop(0, '#2c6f9a');
    xg.addColorStop(1, '#9fe4ff');
    ctx.fillStyle = xg;
    ctx.fillRect(0, T + 2, w * ratio, 8);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.fillRect(0, T + 2, w * ratio, 2);
    if (ratio > 0) {
      ctx.globalCompositeOperation = 'lighter';
      G.drawGlow(ctx, 'rgba(160, 230, 255, 0.9)', w * ratio, T + 6, 14 + (game.gemSparkle || 0) * 60, 0.8);
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 6;

    // 레벨: 금테 원형 배지
    const bx0 = L + 22, by0 = T + 42;
    ctx.beginPath();
    ctx.arc(bx0, by0, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#10261e';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#e6bc66';
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e6bc66';
    ctx.font = '600 9px ' + FONT_BODY;
    ctx.fillText('LV', bx0, by0 - 8);
    ctx.fillStyle = '#fff3d6';
    ctx.font = (p.level >= 100 ? 15 : 20) + 'px ' + FONT_DISPLAY;
    ctx.fillText(String(p.level), bx0, by0 + 12);

    // 버틴 시간 / 목표 시간, 처치 수, 금화
    const win = G.runTime(game);
    ctx.textAlign = 'center';
    ctx.font = (narrow ? 26 : 30) + 'px ' + FONT_DISPLAY;
    const timeText = G.formatTime(game.time);
    const tw = ctx.measureText(timeText).width + 36;
    ctx.shadowBlur = 0;
    pill(ctx, w / 2 - tw / 2, T + 20, tw, narrow ? 36 : 40);
    ctx.fillStyle = game.time >= win - 60 ? '#ffd27a' : '#fff3d6';
    ctx.fillText(timeText, w / 2, T + (narrow ? 48 : 51));
    const mul = G.speedMul();
    if (mul > 1) {
      const sx = w / 2 + tw / 2 + 4;
      G.roundRect(ctx, sx, T + 27, 34, 22, 6);
      ctx.fillStyle = '#f5c467';
      ctx.fill();
      ctx.fillStyle = '#31210d';
      ctx.font = '15px ' + FONT_DISPLAY;
      ctx.fillText('×' + mul, sx + 17, T + 44);
    }
    ctx.shadowBlur = 6;
    ctx.font = '600 12px ' + FONT_BODY;
    ctx.fillStyle = '#a3aea7';
    const line = '/ ' + G.formatTime(win) + '  ·  처치 ' + game.kills.toLocaleString('ko-KR');
    ctx.fillText(line, w / 2, T + 72);
    ctx.restore();

    // 금화 (레벨 오른쪽)
    const gold = Math.floor(game.runGold || 0);
    const coin = G.art && G.art.get('coin');
    const gx = L + 50, gy = T + 33;
    ctx.font = '14px ' + FONT_DISPLAY;
    pill(ctx, gx - 4, gy - 4, ctx.measureText(String(gold)).width + 34, 24);
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

    // 미니맵: 오른쪽 위, 일시정지 단추 아래
    const mR = narrow ? 40 : 48;
    const mX = R - mR, mY = T + 74 + mR;
    G.drawMinimap(ctx, game, mX, mY, mR);

    // 무기 6칸 + 패시브 6칸 (조합하면 칸이 늘어난다). 미니맵 왼쪽까지만 쓴다
    const wslots = G.weaponSlots(p);
    const gap = narrow ? 5 : 6;
    const big = Math.min(narrow ? 36 : 40, Math.floor((mX - mR - 10 - L - gap * (wslots - 1)) / wslots));
    const slotsY = T + 78;
    for (let i = 0; i < wslots; i++) {
      const wpn = p.weapons[i];
      const def = wpn && G.WEAPONS[wpn.key];
      const combo = def && def.kind !== 'base';
      slot(ctx, L + i * (big + gap), slotsY, big, wpn ? wpn.key : null, wpn ? wpn.level : 0, combo ? 0 : G.WEAPON_MAX, combo);
    }
    const small = Math.min(narrow ? 26 : 28, Math.floor((mX - mR - 10 - L - 5 * (G.passiveSlots(p) - 1)) / G.passiveSlots(p)));
    const py = slotsY + big + 6;
    const pslots = G.passiveSlots(p);
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

    // 화면 밖 보스: 가장자리에 붉은 화살표
    if (boss && !boss.dead) {
      const sx = (boss.x - game.cam.x) * game.zoom + w / 2, sy = (boss.y - game.cam.y) * game.zoom + game.h / 2;
      const m = 34;
      if (sx < 0 || sx > w || sy < 0 || sy > game.h) {
        const a = Math.atan2(sy - game.h / 2, sx - w / 2);
        const ex = G.clamp(sx, m, w - m), ey = G.clamp(sy, m + T + 120, game.h - m - s.b);
        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(a);
        ctx.globalAlpha = 0.75 + Math.sin(game.clock * 8) * 0.25;
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
      ctx.fillText(Math.round(game.fps || 0) + ' FPS', R, mY + mR + 16);
    }

    // 터치 조이스틱
    const st = G.input && G.input.stick;
    if (st && st.active && game.state === 'playing') {
      const Rr = G.input.STICK_RADIUS;
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(214, 180, 104, 0.45)';
      ctx.fillStyle = 'rgba(7, 18, 14, 0.38)';
      ctx.beginPath();
      ctx.arc(st.ox, st.oy, Rr, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // 네 방향 눈금
      ctx.fillStyle = 'rgba(214, 180, 104, 0.5)';
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        const cx = st.ox + Math.cos(a) * (Rr - 9), cy = st.oy + Math.sin(a) * (Rr - 9);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 5, cy + Math.sin(a) * 5);
        ctx.lineTo(cx + Math.cos(a + 2.2) * 5, cy + Math.sin(a + 2.2) * 5);
        ctx.lineTo(cx + Math.cos(a - 2.2) * 5, cy + Math.sin(a - 2.2) * 5);
        ctx.fill();
      }
      let dx = st.x - st.ox, dy = st.y - st.oy;
      const l = Math.hypot(dx, dy);
      if (l > Rr) { dx = (dx / l) * Rr; dy = (dy / l) * Rr; }
      const kx = st.ox + dx, ky = st.oy + dy;
      const kg = ctx.createRadialGradient(kx - 6, ky - 7, 2, kx, ky, 24);
      kg.addColorStop(0, '#fff1bb');
      kg.addColorStop(0.55, '#f0b552');
      kg.addColorStop(1, '#9a6328');
      ctx.fillStyle = kg;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(kx, ky, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  };
})(window.G);
