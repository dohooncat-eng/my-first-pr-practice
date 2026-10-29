// 새 기본 무기 5종: 번개 사슬, 회전 낫, 독 덩굴, 별똥별, 종소리 파동
// 여기 있는 도우미(번개, 던졌다 돌아오는 칼날, 독 웅덩이, 별똥별, 충격파)는 진화·조합 무기(combo.js)도 함께 쓴다.
// 이펙트는 무기마다 w.state의 목록에 담고, 목록마다 개수 상한을 둔다.
(function (G) {
  'use strict';

  const TAU = Math.PI * 2;
  const tmp = [];

  // 상한을 넘으면 가장 오래된 것을 버리고 넣는다
  function push(list, item, cap) {
    if (list.length >= cap) list.shift();
    list.push(item);
  }

  G.fxPush = push;

  // 색을 덧입힌 그림 (처음 쓸 때 한 번 만들어 둔다)
  const tintCache = {};
  G.tintedSprite = function (name, color) {
    const key = name + '|' + color;
    if (tintCache[key]) return tintCache[key];
    const spr = G.art.get(name);
    if (!spr) return null;
    const c = document.createElement('canvas');
    c.width = spr.img.width;
    c.height = spr.img.height;
    const x = c.getContext('2d');
    x.drawImage(spr.img, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = color;
    x.fillRect(0, 0, c.width, c.height);
    tintCache[key] = Object.assign({}, spr, { img: c });
    return tintCache[key];
  };
  G.fxList = function (w, name) { return w.state[name] || (w.state[name] = []); };

  // ---------- 번개 ----------
  const BOLT_STYLE = {
    chain: { glow: 'rgba(120, 180, 255, 0.45)', core: '#f2f8ff', width: 7, spark: 'rgba(150, 200, 255, 0.9)', branch: 0.25 },
    storm: { glow: 'rgba(175, 145, 255, 0.5)', core: '#ffffff', width: 11, spark: 'rgba(195, 175, 255, 0.95)', branch: 0.7 },
    thunder: { glow: 'rgba(255, 200, 110, 0.45)', core: '#fff6dc', width: 6, spark: 'rgba(255, 210, 140, 0.9)', branch: 0 },
  };

  // 번개 경로는 매 프레임 새로 흔들어서 전기처럼 떨린다. 바깥 번짐과 밝은 심이 같은 경로를 쓰도록 점을 한 번 만든다.
  const pts = [];
  function addJag(x1, y1, x2, y2, rough) {
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const n = Math.max(2, Math.min(9, Math.round(len / 20)));
    const nx = -dy / len, ny = dx / len;
    pts.push(NaN, NaN, x1, y1);
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const off = (Math.random() - 0.5) * rough;
      pts.push(x1 + dx * t + nx * off, y1 + dy * t + ny * off);
    }
    pts.push(x2, y2);
  }

  function strokePts(ctx) {
    ctx.beginPath();
    let start = true;
    for (let i = 0; i < pts.length; i += 2) {
      if (pts[i] !== pts[i]) { start = true; continue; } // NaN = 새 선 시작
      if (start) { ctx.moveTo(pts[i], pts[i + 1]); start = false; } else ctx.lineTo(pts[i], pts[i + 1]);
    }
    ctx.stroke();
  }

  // first를 맞히고 근처 적으로 jumps번 튄다. 처음 줄기는 하늘에서 내려친다.
  // skipFirst면 first는 이미 맞은 것으로 치고 거기서부터 튄다(뇌화살).
  G.chainStrike = function (game, fx, first, dmg, jumps, range, style, skipFirst) {
    const hit = [first];
    const nodes = skipFirst ? [first.x, first.y - 6] : [first.x + G.rand(-40, 40), first.y - 300, first.x, first.y - 6];
    if (!skipFirst) G.damageEnemy(game, first, dmg, 0, 0);
    let cur = first;
    for (let j = 0; j < jumps; j++) {
      G.enemiesInCircle(game, cur.x, cur.y, range, tmp);
      let next = null, best = Infinity;
      for (const e of tmp) {
        if (hit.indexOf(e) !== -1) continue;
        const d = (e.x - cur.x) * (e.x - cur.x) + (e.y - cur.y) * (e.y - cur.y);
        if (d < best) { best = d; next = e; }
      }
      if (!next) break;
      hit.push(next);
      nodes.push(next.x, next.y - 6);
      G.damageEnemy(game, next, dmg * 0.9, 0, 0);
      cur = next;
    }
    if (nodes.length >= 4) push(fx, { nodes, style, sky: !skipFirst, life: 0.26, max: 0.26 }, 36);
    return hit.length;
  };

  G.drawBolts = function (ctx, fx) {
    if (!fx.length) return;
    const spr = G.art.get('spark');
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const b of fx) {
      const st = BOLT_STYLE[b.style] || BOLT_STYLE.chain;
      const a = Math.max(0, b.life / b.max);
      const n = b.nodes;
      pts.length = 0;
      for (let i = 0; i + 3 < n.length; i += 2) {
        addJag(n[i], n[i + 1], n[i + 2], n[i + 3], i === 0 && b.sky ? 34 : 20);
        if (st.branch && Math.random() < st.branch) {
          const mx = (n[i] + n[i + 2]) / 2, my = (n[i + 1] + n[i + 3]) / 2;
          addJag(mx, my, mx + G.rand(-46, 46), my + G.rand(-16, 40), 12);
        }
      }
      ctx.globalAlpha = a;
      ctx.strokeStyle = st.glow;
      ctx.lineWidth = st.width * (0.7 + a * 0.6);
      strokePts(ctx);
      ctx.strokeStyle = st.core;
      ctx.lineWidth = 1.4 + a * 1.6;
      strokePts(ctx);
      // 맞은 자리 불꽃
      for (let i = b.sky ? 2 : 0; i < n.length; i += 2) {
        const sc = 0.8 + (1 - a) * 0.7;
        if (spr) {
          G.drawSprite(ctx, spr, n[i], n[i + 1], sc, i % 4 === 0, 0);
        } else {
          ctx.strokeStyle = st.core;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let k = 0; k < 4; k++) {
            const ang = k * Math.PI / 4 + i;
            ctx.moveTo(n[i] + Math.cos(ang) * 3, n[i + 1] + Math.sin(ang) * 3);
            ctx.lineTo(n[i] + Math.cos(ang) * 9 * sc, n[i + 1] + Math.sin(ang) * 9 * sc);
          }
          ctx.stroke();
        }
      }
    }
    ctx.restore();
  };

  G.drawBoltGlow = function (ctx, fx) {
    for (const b of fx) {
      const st = BOLT_STYLE[b.style] || BOLT_STYLE.chain;
      const a = Math.max(0, b.life / b.max);
      const n = b.nodes;
      for (let i = b.sky ? 2 : 0; i < n.length; i += 2) G.drawGlow(ctx, st.spark, n[i], n[i + 1], 30, a * 0.85);
    }
  };

  G.tickFx = function (fx, dt) {
    for (const f of fx) { f.life -= dt; if (f.life <= 0) f.dead = true; }
    G.compact(fx);
  };

  // ---------- 던졌다 돌아오는 칼날 (회전 낫, 사신의 낫, 쌍월) ----------
  // o: { angle, dmg, range, speed, scale, look: 'scythe' | 'reaper' | 'moon' }
  G.throwBlade = function (game, fx, o) {
    const p = game.player;
    push(fx, {
      x: p.x, y: p.y - 6, dir: o.angle, speed: o.speed, T: (2 * o.range) / o.speed,
      age: 0, back: 0, phase: 0, rot: Math.random() * TAU,
      dmg: o.dmg, r: 15 * o.scale, scale: o.scale, look: o.look, hit: {}, trail: [],
    }, 30);
  };

  G.updateBlades = function (game, fx, dt) {
    const p = game.player;
    for (const b of fx) {
      b.age += dt;
      b.rot += (b.look === 'moon' ? 12 : 16) * dt;
      b.trail.unshift(b.x, b.y, b.rot);
      if (b.trail.length > 15) b.trail.length = 15;
      const kx = Math.cos(b.dir), ky = Math.sin(b.dir);
      if (b.phase === 0) {
        // 나갈 때는 점점 느려지다 멈춘다 (이동 거리 = range)
        const k = 1 - b.age / b.T;
        if (k <= 0) b.phase = 1;
        else {
          b.x += kx * b.speed * k * dt;
          b.y += ky * b.speed * k * dt;
        }
      } else {
        // 돌아올 때는 플레이어를 따라오며 빨라진다
        const dx = p.x - b.x, dy = p.y - 6 - b.y;
        const d = Math.hypot(dx, dy) || 1;
        b.back = Math.min(b.speed * 1.5, b.back + b.speed * 2.4 * dt);
        const step = Math.min(d, b.back * dt);
        b.x += (dx / d) * step;
        b.y += (dy / d) * step;
        if (d < 20 || b.age > 6) b.dead = true;
      }
      G.enemiesInCircle(game, b.x, b.y, b.r, tmp);
      for (const e of tmp) {
        // 나갈 때 한 번, 돌아올 때 한 번
        if (b.hit[e.id] === b.phase + 1) continue;
        b.hit[e.id] = b.phase + 1;
        G.damageEnemy(game, e, b.dmg, kx * 150, ky * 150);
      }
    }
    G.compact(fx);
  };

  const BLADE_LOOK = {
    scythe: { sprite: 'scythe', glow: 'rgba(200, 228, 255, 0.7)', glowR: 22, light: '#eef3f8', dark: '#6f7d92', trail: 'rgba(214, 232, 255, ' },
    reaper: { sprite: 'scythe', tint: 'rgba(110, 8, 44, 0.5)', glow: 'rgba(255, 60, 110, 0.5)', glowR: 15, light: '#ffd6e0', dark: '#8a2a4a', trail: 'rgba(255, 70, 120, ' },
    moon: { sprite: null, glow: 'rgba(170, 210, 255, 0.85)', glowR: 20, light: '#ffffff', dark: '#9cbcff', trail: 'rgba(190, 220, 255, ' },
  };

  // 초승달 날: 바깥 호에서 안쪽 호를 파낸 모양
  function drawCrescent(ctx, r, look) {
    ctx.beginPath();
    ctx.arc(0, 0, r, -2.5, 2.5);
    ctx.arc(-r * 0.38, 0, r * 0.82, 2.15, -2.15, true);
    ctx.closePath();
    const g = ctx.createLinearGradient(-r, -r, r, r);
    g.addColorStop(0, look.light);
    g.addColorStop(1, look.dark);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, r * 0.1);
    ctx.strokeStyle = '#0a1110';
    ctx.stroke();
  }

  function drawBladeAt(ctx, b, look, spr, x, y, rot, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    if (spr) G.drawSprite(ctx, spr, 0, 0, b.scale, false, 0);
    else drawCrescent(ctx, 16 * b.scale, look);
    ctx.restore();
  }

  G.drawBlades = function (ctx, game, fx) {
    for (const b of fx) {
      if (!G.inView(game, b.x, b.y, 60)) continue;
      const look = BLADE_LOOK[b.look];
      const spr = look.sprite && (look.tint ? G.tintedSprite(look.sprite, look.tint) : G.art.get(look.sprite));
      // 지나간 궤적을 옅은 선으로
      const tr = b.trail;
      if (tr.length >= 6) {
        ctx.lineCap = 'round';
        for (let i = 0; i + 3 < tr.length; i += 3) {
          ctx.strokeStyle = look.trail + (0.5 * (1 - i / tr.length)) + ')';
          ctx.lineWidth = b.r * 0.9 * (1 - i / tr.length);
          ctx.beginPath();
          ctx.moveTo(tr[i], tr[i + 1]);
          ctx.lineTo(tr[i + 3], tr[i + 4]);
          ctx.stroke();
        }
      }
      drawBladeAt(ctx, b, look, spr, tr[6] === undefined ? b.x : tr[6], tr[7] === undefined ? b.y : tr[7], tr[8] || b.rot, 0.3);
      drawBladeAt(ctx, b, look, spr, b.x, b.y, b.rot, 1);
    }
  };

  G.drawBladeGlow = function (ctx, game, fx) {
    for (const b of fx) {
      if (!G.inView(game, b.x, b.y, 60)) continue;
      const look = BLADE_LOOK[b.look];
      G.drawGlow(ctx, look.glow, b.x, b.y, look.glowR * b.scale, 0.6);
    }
  };

  // ---------- 독 웅덩이 (독 덩굴, 맹독 정원) ----------
  // o: { radius, dmg, duration, tick, slow, look: 'poison' | 'garden' }
  G.spawnPools = function (game, fx, count, o) {
    const p = game.player;
    const near = G.randomEnemies(game, count * 3).filter((e) => (e.x - p.x) * (e.x - p.x) + (e.y - p.y) * (e.y - p.y) < 320 * 320);
    for (let i = 0; i < count; i++) {
      const t = near[i];
      let x, y;
      if (t) {
        x = t.x + G.rand(-14, 14);
        y = t.y + G.rand(-14, 14);
      } else {
        const a = Math.random() * TAU, d = G.rand(50, 170);
        x = p.x + Math.cos(a) * d;
        y = p.y + Math.sin(a) * d;
      }
      push(fx, {
        x, y, r: o.radius, dmg: o.dmg, tick: o.tick, t: 0.05, slow: o.slow || 0, look: o.look,
        life: o.duration, max: o.duration, rot: Math.random() * TAU, bubbles: [],
      }, 28);
    }
  };

  function poolGrow(pool) { return Math.min(1, 0.55 + (pool.max - pool.life) * 2.2); }
  function poolAlpha(pool) { return Math.max(0, Math.min(1, (pool.max - pool.life) * 5, pool.life / 0.6)); }

  G.updatePools = function (game, fx, dt) {
    for (const pool of fx) {
      pool.life -= dt;
      pool.t -= dt;
      if (pool.life <= 0) { pool.dead = true; continue; }
      if (pool.t <= 0) {
        pool.t = pool.tick;
        G.hitCircle(game, pool.x, pool.y, pool.r * poolGrow(pool), pool.dmg, {
          soft: true, slow: pool.slow ? pool.tick + 0.25 : 0, slowMul: pool.slow ? 1 - pool.slow * 1.4 : 0,
        });
      }
      if (pool.bubbles.length < 6 && Math.random() < dt * 6) {
        pool.bubbles.push({ x: G.rand(-0.6, 0.6) * pool.r, y: G.rand(-0.35, 0.35) * pool.r, life: 0.7, max: 0.7, s: G.rand(1.8, 4) });
      }
      for (const b of pool.bubbles) {
        b.life -= dt;
        b.y -= 10 * dt;
        if (b.life <= 0) b.dead = true;
      }
      G.compact(pool.bubbles);
    }
    G.compact(fx);
  };

  G.drawPools = function (ctx, game, fx) {
    const spr = G.art.get('poison_pool');
    for (const pool of fx) {
      if (!G.inView(game, pool.x, pool.y, pool.r + 30)) continue;
      const a = poolAlpha(pool);
      const r = pool.r * poolGrow(pool);
      const garden = pool.look === 'garden';
      ctx.save();
      ctx.translate(pool.x, pool.y);
      ctx.scale(1, 0.78);
      ctx.globalAlpha = a * (garden ? 0.95 : 0.85);
      ctx.save();
      ctx.rotate(pool.rot);
      if (spr) {
        const size = r * 2.35;
        ctx.drawImage(spr.img, -size / 2, -size / 2, size, size);
      } else {
        const g = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 1.05);
        g.addColorStop(0, garden ? 'rgba(200, 245, 90, 0.55)' : 'rgba(182, 227, 90, 0.45)');
        g.addColorStop(0.6, garden ? 'rgba(90, 160, 50, 0.45)' : 'rgba(79, 122, 58, 0.38)');
        g.addColorStop(1, 'rgba(40, 70, 30, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, r * 1.05, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      if (garden) {
        // 가장자리를 두르는 가시 덩굴과 독꽃
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(28, 58, 24, 0.85)';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.98, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = '#3f7a2a';
        ctx.beginPath();
        for (let k = 0; k < 9; k++) {
          const ang = pool.rot + (k / 9) * TAU;
          const lx = Math.cos(ang) * r * 0.98, ly = Math.sin(ang) * r * 0.98;
          ctx.moveTo(lx + 7, ly);
          ctx.ellipse(lx, ly, 7, 3, ang + 0.8, 0, TAU);
        }
        ctx.fill();
        ctx.fillStyle = '#d86cc0';
        ctx.beginPath();
        for (let k = 0; k < 9; k += 3) {
          const ang = pool.rot + (k / 9) * TAU;
          const lx = Math.cos(ang) * r * 0.98, ly = Math.sin(ang) * r * 0.98;
          ctx.moveTo(lx + 3.2, ly);
          ctx.arc(lx, ly, 3.2, 0, TAU);
        }
        ctx.fill();
      }
      // 거품
      ctx.lineWidth = 1.2;
      for (const b of pool.bubbles) {
        ctx.strokeStyle = 'rgba(214, 255, 150, ' + (b.life / b.max) * 0.8 + ')';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.s * (1.4 - b.life / b.max * 0.4), 0, TAU);
        ctx.stroke();
      }
      ctx.restore();
    }
  };

  G.drawPoolGlow = function (ctx, game, fx) {
    for (const pool of fx) {
      if (!G.inView(game, pool.x, pool.y, pool.r + 30)) continue;
      const color = pool.look === 'garden' ? 'rgba(190, 255, 90, 0.5)' : 'rgba(160, 230, 80, 0.45)';
      G.drawGlow(ctx, color, pool.x, pool.y, pool.r * 1.15, poolAlpha(pool) * 0.3);
    }
  };

  // ---------- 별똥별 (별똥별, 유성우) ----------
  const FALL_X = 110, FALL_Y = -380; // 착지점 기준으로 떨어지기 시작하는 곳
  const FALL_ROT = Math.atan2(-FALL_Y, -FALL_X) - Math.PI / 2;
  const BOOM = 0.45;

  // o: { radius, dmg, delay, look: 'meteor' | 'star' }
  G.dropMeteors = function (game, fx, count, o) {
    const p = game.player;
    const targets = G.randomEnemies(game, count);
    for (let i = 0; i < count; i++) {
      const t = targets[i];
      let x, y;
      if (t) {
        // 적은 플레이어 쪽으로 오므로 떨어질 때쯤 있을 곳을 노린다
        const dx = p.x - t.x, dy = p.y - t.y, d = Math.hypot(dx, dy) || 1;
        const lead = Math.min(d * 0.5, t.speed * o.delay * 0.8);
        x = t.x + (dx / d) * lead;
        y = t.y + (dy / d) * lead;
      } else {
        const a = Math.random() * TAU, d = G.rand(80, 260);
        x = p.x + Math.cos(a) * d;
        y = p.y + Math.sin(a) * d;
      }
      push(fx, {
        x, y, r: o.radius, dmg: o.dmg, delay: o.delay + i * 0.08, t: 0, done: false, boom: 0,
        look: o.look, blue: o.look === 'star' && Math.random() < 0.45,
      }, 40);
    }
  };

  G.updateMeteors = function (game, fx, dt) {
    for (const m of fx) {
      m.t += dt;
      if (!m.done) {
        if (m.t >= m.delay) {
          m.done = true;
          m.boom = BOOM;
          G.hitCircle(game, m.x, m.y, m.r, m.dmg, { knock: 260 });
          if (G.sfx) G.sfx.play('impact');
          G.burst(game, m.x, m.y, m.blue ? 'rgba(170, 210, 255, 0.95)' : 'rgba(255, 170, 80, 0.95)', 10, 260, true);
          G.burst(game, m.x, m.y, 'rgba(70, 58, 46, 0.85)', 6, 120, false);
          G.addShake(game, m.look === 'star' ? 2.2 : 3);
        }
      } else {
        m.boom -= dt;
        if (m.boom <= 0) m.dead = true;
      }
    }
    G.compact(fx);
  };

  // 땅: 떨어질 자리 예고 원과 폭발 자국
  G.drawMeteorsUnder = function (ctx, game, fx) {
    for (const m of fx) {
      if (!G.inView(game, m.x, m.y, m.r + 20)) continue;
      const rgb = m.blue ? '150, 200, 255' : '255, 120, 70';
      if (!m.done) {
        const k = Math.min(1, m.t / m.delay);
        ctx.fillStyle = 'rgba(' + rgb + ', ' + (0.05 + 0.1 * k) + ')';
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, TAU);
        ctx.fill();
        ctx.save();
        ctx.setLineDash([6, 8]);
        ctx.lineDashOffset = -game.clock * 30;
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(' + rgb + ', ' + (0.3 + 0.5 * k) + ')';
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, TAU);
        ctx.stroke();
        ctx.restore();
        // 안쪽 원이 줄어들며 남은 시간을 보여 준다
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = 'rgba(' + rgb + ', ' + (0.25 + 0.6 * k) + ')';
        ctx.beginPath();
        ctx.arc(m.x, m.y, Math.max(2, m.r * (1 - k)), 0, TAU);
        ctx.stroke();
      } else {
        const k = 1 - m.boom / BOOM;
        const a = 1 - k;
        const r = m.r * (0.75 + 0.45 * k);
        const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, r);
        g.addColorStop(0, m.blue ? 'rgba(235, 245, 255, ' + a + ')' : 'rgba(255, 240, 200, ' + a + ')');
        g.addColorStop(0.45, 'rgba(' + (m.blue ? '140, 180, 255' : '255, 140, 60') + ', ' + a * 0.6 + ')');
        g.addColorStop(1, 'rgba(60, 20, 10, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(m.x, m.y, r, 0, TAU);
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(255, 230, 190, ' + a * 0.7 + ')';
        ctx.beginPath();
        ctx.arc(m.x, m.y, r * 0.95, 0, TAU);
        ctx.stroke();
      }
    }
  };

  function meteorPos(m) {
    const k = Math.min(1, m.t / m.delay);
    const f = 1 - k * k; // 떨어질수록 빨라진다
    return { x: m.x + FALL_X * f, y: m.y + FALL_Y * f };
  }

  // 하늘: 떨어지는 별똥별
  G.drawMeteorsOver = function (ctx, game, fx) {
    const spr = G.art.get('meteor');
    for (const m of fx) {
      if (m.done) continue;
      const pos = meteorPos(m);
      if (!G.inView(game, pos.x, pos.y, 80)) continue;
      const sc = m.look === 'star' ? 1.15 : 1;
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(FALL_ROT);
      if (spr) {
        G.drawSprite(ctx, spr, 0, 0, sc, false, 0);
      } else {
        const g = ctx.createLinearGradient(0, 0, 0, -60 * sc);
        g.addColorStop(0, m.blue ? 'rgba(220, 235, 255, 0.95)' : 'rgba(255, 220, 150, 0.95)');
        g.addColorStop(1, 'rgba(255, 120, 60, 0)');
        ctx.strokeStyle = g;
        ctx.lineCap = 'round';
        ctx.lineWidth = 8 * sc;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -60 * sc);
        ctx.stroke();
        ctx.fillStyle = '#fff6dc';
        ctx.beginPath();
        ctx.arc(0, 0, 6 * sc, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  };

  G.drawMeteorGlow = function (ctx, game, fx) {
    for (const m of fx) {
      if (!m.done) {
        const pos = meteorPos(m);
        G.drawGlow(ctx, m.blue ? 'rgba(160, 200, 255, 0.9)' : 'rgba(255, 180, 100, 0.9)', pos.x, pos.y, 30, 0.75);
      } else {
        const a = m.boom / BOOM;
        G.drawGlow(ctx, m.blue ? 'rgba(150, 190, 255, 0.85)' : 'rgba(255, 160, 80, 0.85)', m.x, m.y, m.r * 1.6, a * 0.8);
      }
    }
  };

  // ---------- 충격파 (종소리 파동, 대지의 종) ----------
  // o: { x, y, radius, dmg, knock, width, stun, look: 'bell' | 'earth' }
  G.ringWave = function (fx, o) {
    const cracks = [];
    if (o.look === 'earth') for (let i = 0; i < 14; i++) cracks.push(Math.random() * TAU, G.rand(0.45, 0.95));
    push(fx, {
      x: o.x, y: o.y, r: 6, max: o.radius, width: o.width, dmg: o.dmg, knock: o.knock,
      stun: o.stun || 0, look: o.look, hit: {}, cracks,
    }, 12);
  };

  G.updateWaves = function (game, fx, dt) {
    for (const wv of fx) {
      wv.r += (wv.max / 0.55) * dt;
      if (wv.r >= wv.max) { wv.dead = true; continue; }
      G.enemiesInCircle(game, wv.x, wv.y, wv.r + wv.width * 0.5, tmp);
      for (const e of tmp) {
        if (wv.hit[e.id]) continue;
        const dx = e.x - wv.x, dy = e.y - wv.y;
        const d = Math.hypot(dx, dy) || 1;
        wv.hit[e.id] = 1;
        if (wv.stun) e.stun = Math.max(e.stun || 0, wv.stun);
        G.damageEnemy(game, e, wv.dmg, (dx / d) * wv.knock, (dy / d) * wv.knock);
      }
    }
    G.compact(fx);
  };

  const WAVE_RGB = {
    bell: { soft: '255, 226, 160', bright: '255, 246, 220', glow: 'rgba(255, 215, 140, 0.7)' },
    earth: { soft: '214, 150, 80', bright: '255, 222, 170', glow: 'rgba(255, 170, 90, 0.7)' },
  };

  G.drawWaves = function (ctx, game, fx) {
    for (const wv of fx) {
      const c = WAVE_RGB[wv.look] || WAVE_RGB.bell;
      const k = wv.r / wv.max;
      const a = 1 - k;
      if (wv.cracks.length) {
        // 땅이 갈라지는 금
        ctx.strokeStyle = 'rgba(30, 18, 8, ' + a * 0.55 + ')';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i < wv.cracks.length; i += 2) {
          const ang = wv.cracks[i], len = Math.min(wv.r, wv.max * wv.cracks[i + 1]);
          ctx.moveTo(wv.x + Math.cos(ang) * 14, wv.y + Math.sin(ang) * 14);
          ctx.lineTo(wv.x + Math.cos(ang + 0.08) * len * 0.55, wv.y + Math.sin(ang + 0.08) * len * 0.55);
          ctx.lineTo(wv.x + Math.cos(ang - 0.05) * len, wv.y + Math.sin(ang - 0.05) * len);
        }
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(' + c.soft + ', ' + a * 0.06 + ')';
      ctx.beginPath();
      ctx.arc(wv.x, wv.y, wv.r, 0, TAU);
      ctx.fill();
      ctx.lineWidth = wv.width * (1 - k * 0.5);
      ctx.strokeStyle = 'rgba(' + c.soft + ', ' + a * 0.3 + ')';
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(' + c.bright + ', ' + a * 0.9 + ')';
      ctx.beginPath();
      ctx.arc(wv.x, wv.y, wv.r + wv.width * 0.3, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(' + c.bright + ', ' + a * 0.4 + ')';
      ctx.beginPath();
      ctx.arc(wv.x, wv.y, Math.max(1, wv.r - wv.width * 0.6), 0, TAU);
      ctx.stroke();
    }
  };

  G.drawWaveGlow = function (ctx, game, fx) {
    for (const wv of fx) {
      const c = WAVE_RGB[wv.look] || WAVE_RGB.bell;
      const a = 1 - wv.r / wv.max;
      // 고리를 따라 빛 점 몇 개
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * TAU + wv.max;
        G.drawGlow(ctx, c.glow, wv.x + Math.cos(ang) * wv.r, wv.y + Math.sin(ang) * wv.r, wv.width * 1.3, a * 0.3);
      }
      if (wv.r < wv.max * 0.25) G.drawGlow(ctx, c.glow, wv.x, wv.y, 70, (1 - wv.r / (wv.max * 0.25)) * 0.7);
    }
  };

  // 플레이어 머리 위에서 흔들리는 종
  G.drawBell = function (ctx, x, y, s, swing, earth) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(swing);
    ctx.beginPath();
    ctx.moveTo(-4 * s, -8 * s);
    ctx.quadraticCurveTo(-5 * s, 2 * s, -9.5 * s, 6 * s);
    ctx.lineTo(9.5 * s, 6 * s);
    ctx.quadraticCurveTo(5 * s, 2 * s, 4 * s, -8 * s);
    ctx.quadraticCurveTo(0, -12.5 * s, -4 * s, -8 * s);
    ctx.closePath();
    const g = ctx.createLinearGradient(-9 * s, -12 * s, 9 * s, 6 * s);
    g.addColorStop(0, earth ? '#f0c88a' : '#ffe8b0');
    g.addColorStop(1, earth ? '#7a4a20' : '#c98a2a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = '#0a1110';
    ctx.stroke();
    ctx.fillStyle = '#5a3a14';
    ctx.beginPath();
    ctx.arc(0, 7.6 * s, 2.2 * s, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -11.5 * s, 2 * s, 0, TAU);
    ctx.stroke();
    ctx.restore();
  };

  // 종을 울린다: 파동 여러 번(투사체 수만큼), 대지의 종은 메아리 한 번 더
  G.bellUpdate = function (game, w, s, dt, look) {
    const st = w.state;
    const fx = G.fxList(w, 'waves');
    const queue = G.fxList(w, 'queue');
    G.updateWaves(game, fx, dt);
    st.ring = Math.max(0, (st.ring || 0) - dt);
    for (const q of queue) {
      q.life -= dt;
      if (q.life <= 0) {
        q.dead = true;
        G.ringWave(fx, q.o);
        st.ring = 0.45;
      }
    }
    G.compact(queue);
    w.timer -= dt;
    if (w.timer > 0) return;
    const p = game.player;
    const o = {
      x: p.x, y: p.y, radius: G.area(game, s.radius), dmg: s.dmg, knock: s.knock,
      width: s.width * game.player.stats.area, stun: s.stun || 0, look,
    };
    const count = G.amount(game, 1);
    G.ringWave(fx, o);
    for (let i = 1; i < count; i++) push(queue, { life: i * 0.22, o }, 12);
    if (s.echo) push(queue, { life: 0.35 + (count - 1) * 0.22, o }, 12);
    if (look === 'earth') G.burst(game, p.x, p.y + 10, 'rgba(120, 90, 60, 0.85)', 10, 180, false);
    st.ring = 0.5;
    G.addShake(game, look === 'earth' ? 3 : 1.5);
    G.sfx && G.sfx.play('gong');
    w.timer = G.cd(game, s.cd);
  };

  G.bellDrawOver = function (ctx, game, w, look) {
    const ring = w.state.ring || 0;
    if (ring <= 0) return;
    const p = game.player;
    ctx.save();
    ctx.globalAlpha = Math.min(1, ring * 4);
    G.drawBell(ctx, p.x, p.y - 50, look === 'earth' ? 1.25 : 1, Math.sin(game.clock * 28) * 0.5 * (ring / 0.5), look === 'earth');
    ctx.restore();
  };

  // ======================= 무기 정의 =======================

  G.defineWeapon('chain', {
    update(game, w, s, dt) {
      const fx = G.fxList(w, 'bolts');
      G.tickFx(fx, dt);
      w.timer -= dt;
      if (w.timer > 0) return;
      const targets = G.randomEnemies(game, G.amount(game, s.targets));
      if (!targets.length) { w.timer = 0.15; return; }
      for (const t of targets) {
        G.chainStrike(game, fx, t, s.dmg, s.jumps, G.area(game, s.range), 'chain');
        G.burst(game, t.x, t.y - 6, 'rgba(160, 210, 255, 0.9)', 4, 140, true);
      }
      G.addShake(game, 1);
      G.sfx && G.sfx.play('zap');
      w.timer = G.cd(game, s.cd);
    },
    over(ctx, game, w) { G.drawBolts(ctx, w.state.bolts || []); },
    glow(ctx, game, w) { G.drawBoltGlow(ctx, w.state.bolts || []); },
  });

  // 가장 가까운 적 쪽(없으면 바라보는 쪽)으로 부채꼴로 던진다
  G.scytheThrow = function (game, w, s, look, spread, around) {
    const p = game.player;
    const fx = G.fxList(w, 'blades');
    const count = G.amount(game, s.count);
    const scale = s.size * p.stats.area;
    let base;
    if (around) {
      w.state.spinBase = (w.state.spinBase || 0) + 0.45;
      base = w.state.spinBase;
    } else {
      const target = G.nearestEnemy(game, 420);
      base = target ? Math.atan2(target.y - p.y, target.x - p.x) : Math.atan2(p.face.y, p.face.x);
    }
    for (let i = 0; i < count; i++) {
      const a = around ? base + (i / count) * TAU : base + (i - (count - 1) / 2) * spread;
      G.throwBlade(game, fx, { angle: a, dmg: s.dmg, range: G.area(game, s.range), speed: s.speed, scale, look });
    }
    G.sfx && G.sfx.play('whoosh');
  };

  G.defineWeapon('scythe', {
    update(game, w, s, dt) {
      G.updateBlades(game, G.fxList(w, 'blades'), dt);
      w.timer -= dt;
      if (w.timer > 0) return;
      G.scytheThrow(game, w, s, 'scythe', 0.6, false);
      w.timer = G.cd(game, s.cd);
    },
    over(ctx, game, w) { G.drawBlades(ctx, game, w.state.blades || []); },
    glow(ctx, game, w) { G.drawBladeGlow(ctx, game, w.state.blades || []); },
  });

  G.poisonUpdate = function (game, w, s, dt, look) {
    const fx = G.fxList(w, 'pools');
    G.updatePools(game, fx, dt);
    w.timer -= dt;
    if (w.timer > 0) return;
    G.spawnPools(game, fx, G.amount(game, s.count), {
      radius: G.area(game, s.radius), dmg: s.dmg, duration: s.duration, tick: s.tick, slow: s.slow, look,
    });
    G.sfx && G.sfx.play('bubble');
    w.timer = G.cd(game, s.cd);
  };

  G.defineWeapon('poison', {
    update(game, w, s, dt) { G.poisonUpdate(game, w, s, dt, 'poison'); },
    under(ctx, game, w) { G.drawPools(ctx, game, w.state.pools || []); },
    glow(ctx, game, w) { G.drawPoolGlow(ctx, game, w.state.pools || []); },
  });

  G.meteorUpdate = function (game, w, s, dt, look) {
    const fx = G.fxList(w, 'meteors');
    G.updateMeteors(game, fx, dt);
    w.timer -= dt;
    if (w.timer > 0) return;
    G.dropMeteors(game, fx, G.amount(game, s.count), { radius: G.area(game, s.radius), dmg: s.dmg, delay: s.delay, look });
    w.timer = G.cd(game, s.cd);
  };

  G.defineWeapon('meteor', {
    update(game, w, s, dt) { G.meteorUpdate(game, w, s, dt, 'meteor'); },
    under(ctx, game, w) { G.drawMeteorsUnder(ctx, game, w.state.meteors || []); },
    over(ctx, game, w) { G.drawMeteorsOver(ctx, game, w.state.meteors || []); },
    glow(ctx, game, w) { G.drawMeteorGlow(ctx, game, w.state.meteors || []); },
  });

  G.defineWeapon('bell', {
    update(game, w, s, dt) { G.bellUpdate(game, w, s, dt, 'bell'); },
    under(ctx, game, w) { G.drawWaves(ctx, game, w.state.waves || []); },
    over(ctx, game, w) { G.bellDrawOver(ctx, game, w, 'bell'); },
    glow(ctx, game, w) { G.drawWaveGlow(ctx, game, w.state.waves || []); },
  });
})(window.G);
