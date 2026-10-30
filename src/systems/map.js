// 맵 모양: 스테이지마다 다른 지형. game.stage.map = { type, ... }
//   open      끝없는 들판(제약 없음)
//   corridor  1자 길. axis 'x'면 가로로 긴 협곡(y가 ±half 안), 'y'면 세로 탑(x가 ±half 안)
//   arena     원형 경기장. 반지름 r에서 판 끝까지 shrink 비율만큼 줄어든다
//   pillars   부서지지 않는 기둥·바위(작은 원)가 격자마다 흩어져 있다
//   ponds     건널 수 없는 연못(큰 원) 사이의 좁은 땅
// 장애물은 플레이어와 적만 막는다(투사체·경험치는 지나간다). 같은 칸에는 항상 같은 장애물(고정 난수).
(function (G) {
  'use strict';

  const TAU = Math.PI * 2;
  const OPEN = { type: 'open' };

  function spec(game) { return (game.stage && game.stage.map) || OPEN; }

  // 원형 경기장의 지금 반지름 (판 시간에 따라 줄어든다)
  G.arenaRadius = function (game) {
    const m = spec(game);
    const k = Math.min(1, game.time / G.runTime(game));
    return m.r * (1 - (m.shrink || 0) * k);
  };

  // 격자 칸 (cx, cy)의 장애물. 시작 지점 근처는 비운다
  function cellObstacle(m, cx, cy) {
    if (Math.abs(cx) <= 1 && Math.abs(cy) <= 1) return null;
    if (G.hash2(cx * 7 + 3, cy * 13 + 5) > m.chance) return null;
    const c = m.cell;
    const r = m.r[0] + G.hash2(cx + 31, cy - 17) * (m.r[1] - m.r[0]);
    const pad = r + 30;
    return {
      x: cx * c + pad + G.hash2(cx * 5 - 1, cy * 3 + 9) * Math.max(0, c - pad * 2),
      y: cy * c + pad + G.hash2(cx * 11 + 4, cy * 7 - 2) * Math.max(0, c - pad * 2),
      r,
    };
  }

  // (x, y) 주변 칸의 장애물을 out에 담는다
  const near = [];
  G.obstaclesNear = function (game, x, y, out) {
    out.length = 0;
    const m = spec(game);
    if (m.type !== 'pillars' && m.type !== 'ponds') return out;
    const cx = Math.floor(x / m.cell), cy = Math.floor(y / m.cell);
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const o = cellObstacle(m, cx + i, cy + j);
        if (o) out.push(o);
      }
    }
    return out;
  };

  // 몸 반지름 r인 것을 걸어 다닐 수 있는 곳 안으로 밀어 넣는다
  G.mapConstrain = function (game, ent, r) {
    const m = spec(game);
    if (m.type === 'open') return;
    if (m.type === 'corridor') {
      const lim = m.half - r;
      if (m.axis === 'y') ent.x = G.clamp(ent.x, -lim, lim);
      else ent.y = G.clamp(ent.y, -lim, lim);
      return;
    }
    if (m.type === 'arena') {
      const R = G.arenaRadius(game) - r;
      const d = Math.hypot(ent.x, ent.y);
      if (d > R) { ent.x *= R / d; ent.y *= R / d; }
      return;
    }
    G.obstaclesNear(game, ent.x, ent.y, near);
    for (const o of near) {
      const dx = ent.x - o.x, dy = ent.y - o.y;
      const rr = o.r + r;
      const d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr) continue;
      const d = Math.sqrt(d2) || 0.01;
      ent.x = o.x + (dx / d) * rr;
      ent.y = o.y + (dy / d) * rr;
    }
  };

  // 등장 지점을 맵 안으로: 1자 길은 길의 양 끝 쪽, 경기장은 원 안쪽 가장자리
  G.mapSpawnPoint = function (game, pt) {
    const m = spec(game);
    const p = game.player;
    if (m.type === 'corridor') {
      const along = m.axis === 'y' ? 'y' : 'x', across = along === 'x' ? 'y' : 'x';
      const half = (along === 'x' ? game.viewW : game.viewH) / 2 + 50;
      pt[along] = p[along] + (Math.random() < 0.5 ? -1 : 1) * (half + Math.random() * 120);
      pt[across] = G.rand(-m.half + 30, m.half - 30);
    } else if (m.type === 'arena') {
      const R = G.arenaRadius(game) - 30;
      if (Math.hypot(pt.x, pt.y) > R) {
        // 플레이어 반대편 가장자리 근처
        const a = Math.atan2(-p.y, -p.x) + G.rand(-1.2, 1.2);
        pt.x = Math.cos(a) * R * G.rand(0.75, 1);
        pt.y = Math.sin(a) * R * G.rand(0.75, 1);
      }
    }
    G.mapConstrain(game, pt, 20);
    return pt;
  };

  // ---------- 그리기 (바닥 위, 캐릭터 아래) ----------
  G.drawMap = function (ctx, game, x0, y0, x1, y1) {
    const m = spec(game);
    const look = m.look || {};
    if (m.type === 'corridor') {
      ctx.fillStyle = look.wall || 'rgba(3, 6, 8, 0.92)';
      ctx.strokeStyle = look.edge || 'rgba(160, 200, 230, 0.55)';
      ctx.lineWidth = 4;
      if (m.axis === 'y') {
        ctx.fillRect(x0, y0, -m.half - x0, y1 - y0);
        ctx.fillRect(m.half, y0, x1 - m.half, y1 - y0);
        ctx.beginPath(); ctx.moveTo(-m.half, y0); ctx.lineTo(-m.half, y1); ctx.moveTo(m.half, y0); ctx.lineTo(m.half, y1); ctx.stroke();
      } else {
        ctx.fillRect(x0, y0, x1 - x0, -m.half - y0);
        ctx.fillRect(x0, m.half, x1 - x0, y1 - m.half);
        ctx.beginPath(); ctx.moveTo(x0, -m.half); ctx.lineTo(x1, -m.half); ctx.moveTo(x0, m.half); ctx.lineTo(x1, m.half); ctx.stroke();
      }
      return;
    }
    if (m.type === 'arena') {
      const R = G.arenaRadius(game);
      ctx.fillStyle = look.wall || 'rgba(2, 3, 8, 0.94)';
      ctx.beginPath();
      ctx.rect(x0, y0, x1 - x0, y1 - y0);
      ctx.arc(0, 0, R, 0, TAU, true);
      ctx.fill('evenodd');
      ctx.strokeStyle = look.edge || 'rgba(255, 210, 122, 0.6)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, TAU);
      ctx.stroke();
      return;
    }
    if (m.type !== 'pillars' && m.type !== 'ponds') return;
    const c = m.cell;
    for (let cx = Math.floor(x0 / c) - 1; cx <= Math.floor(x1 / c) + 1; cx++) {
      for (let cy = Math.floor(y0 / c) - 1; cy <= Math.floor(y1 / c) + 1; cy++) {
        const o = cellObstacle(m, cx, cy);
        if (!o || o.x + o.r < x0 || o.x - o.r > x1 || o.y + o.r < y0 || o.y - o.r > y1) continue;
        if (m.type === 'ponds') drawPond(ctx, o, look, game.clock);
        else drawPillar(ctx, o, look);
      }
    }
  };

  function drawPillar(ctx, o, look) {
    // 그림자 → 몸 → 윗면 밝은 테
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(o.x + 6, o.y + o.r * 0.35, o.r * 1.05, o.r * 0.55, 0, 0, TAU);
    ctx.fill();
    const g = ctx.createRadialGradient(o.x - o.r * 0.35, o.y - o.r * 0.45, o.r * 0.1, o.x, o.y, o.r);
    g.addColorStop(0, look.top || '#5d574e');
    g.addColorStop(1, look.body || '#24211d');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0a1110';
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = look.rim || 'rgba(255, 200, 140, 0.35)';
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r - 3, Math.PI * 1.05, Math.PI * 1.75);
    ctx.stroke();
  }

  function drawPond(ctx, o, look, clock) {
    const g = ctx.createRadialGradient(o.x, o.y, o.r * 0.2, o.x, o.y, o.r);
    g.addColorStop(0, look.deep || '#05090f');
    g.addColorStop(0.85, look.water || '#0c1826');
    g.addColorStop(1, look.shore || '#2a3a3a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = look.rim || 'rgba(170, 220, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(o.x, o.y, o.r * (0.55 + Math.sin(clock * 1.3 + o.x) * 0.04), 0.4, 2.2);
    ctx.stroke();
  }

  // ---------- 미니맵 (HUD) ----------
  const MINI_RANGE = 700; // 미니맵 반지름이 보여 주는 월드 거리
  const nearMini = [];
  G.drawMinimap = function (ctx, game, cx, cy, R) {
    const p = game.player;
    const k = R / MINI_RANGE;
    const m = spec(game);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.fillStyle = 'rgba(6, 14, 11, 0.78)';
    ctx.fill();
    ctx.clip();
    // 지형
    ctx.fillStyle = 'rgba(120, 140, 130, 0.35)';
    if (m.type === 'corridor') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      if (m.axis === 'y') {
        ctx.fillRect(cx - R, cy - R, (-m.half - p.x) * k + R, R * 2);
        ctx.fillRect(cx + (m.half - p.x) * k, cy - R, R * 2, R * 2);
      } else {
        ctx.fillRect(cx - R, cy - R, R * 2, (-m.half - p.y) * k + R);
        ctx.fillRect(cx - R, cy + (m.half - p.y) * k, R * 2, R * 2);
      }
    } else if (m.type === 'arena') {
      ctx.strokeStyle = 'rgba(255, 210, 122, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx - p.x * k, cy - p.y * k, G.arenaRadius(game) * k, 0, TAU);
      ctx.stroke();
    } else if (m.type === 'pillars' || m.type === 'ponds') {
      ctx.fillStyle = m.type === 'ponds' ? 'rgba(90, 140, 200, 0.45)' : 'rgba(150, 140, 120, 0.5)';
      const c = m.cell;
      for (let i = Math.floor((p.x - MINI_RANGE) / c); i <= Math.floor((p.x + MINI_RANGE) / c); i++) {
        for (let j = Math.floor((p.y - MINI_RANGE) / c); j <= Math.floor((p.y + MINI_RANGE) / c); j++) {
          const o = cellObstacle(m, i, j);
          if (!o) continue;
          ctx.beginPath();
          ctx.arc(cx + (o.x - p.x) * k, cy + (o.y - p.y) * k, Math.max(1.2, o.r * k), 0, TAU);
          ctx.fill();
        }
      }
    }
    // 적(빨간 점), 엘리트(주황), 보스(크게)
    ctx.fillStyle = 'rgba(255, 90, 90, 0.75)';
    let n = 0;
    for (const e of game.enemies) {
      if (e.dead || e.boss || e.elite) continue;
      const dx = (e.x - p.x) * k, dy = (e.y - p.y) * k;
      if (dx * dx + dy * dy > R * R) continue;
      ctx.fillRect(cx + dx - 0.75, cy + dy - 0.75, 1.5, 1.5);
      if (++n > 500) break;
    }
    for (const e of game.enemies) {
      if (e.dead || !(e.boss || e.elite)) continue;
      let dx = (e.x - p.x) * k, dy = (e.y - p.y) * k;
      const d = Math.hypot(dx, dy);
      if (d > R - 4) { dx *= (R - 4) / d; dy *= (R - 4) / d; }
      ctx.fillStyle = e.boss ? '#ff3b4f' : '#ff9a3d';
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, e.boss ? 4 : 2.6, 0, TAU);
      ctx.fill();
    }
    // 상자·아이템(금빛)
    ctx.fillStyle = '#ffd27a';
    for (const it of game.items || []) {
      if (it.kind !== 'chest' && it.kind !== 'heal' && it.kind !== 'magnet') continue;
      const dx = (it.x - p.x) * k, dy = (it.y - p.y) * k;
      if (dx * dx + dy * dy > R * R) continue;
      ctx.fillRect(cx + dx - 2, cy + dy - 2, 4, 4);
    }
    ctx.restore();
    // 플레이어(가운데)와 테두리
    ctx.fillStyle = '#fff3d6';
    ctx.beginPath();
    ctx.arc(cx, cy, 2.6, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(214, 180, 104, 0.75)';
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.stroke();
    nearMini.length = 0;
  };
})(window.G);
