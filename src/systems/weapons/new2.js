// 새 무기 5개(그림자 덫·빛의 창·달나방 떼·회오리·불꽃 채찍)와 진화 5개의 동작
// 이펙트는 무기마다 w.state의 목록에 담고, 목록마다 개수 상한을 둔다. 그림이 없으면 도형으로 그린다.
(function (G) {
  'use strict';

  const TAU = Math.PI * 2;
  const tmp = [];
  const tmp2 = [];

  function push(list, item, cap) {
    if (list.length >= cap) list.shift();
    list.push(item);
  }

  // 불길 자리: 잠시 남아 지속 피해 (지옥 덫·용의 채찍)
  function addFlame(fx, x, y, r, dmg, life) {
    push(fx, { x, y, r, dmg, life, max: life, tick: 0 }, 40);
  }

  function updateFlames(game, fx, dt) {
    for (const f of fx) {
      f.life -= dt;
      f.tick -= dt;
      if (f.tick <= 0) {
        f.tick = 0.4;
        G.hitCircle(game, f.x, f.y, f.r, f.dmg, { soft: true });
      }
      if (f.life <= 0) f.dead = true;
    }
    G.compact(fx);
  }

  function drawFlames(ctx, game, fx) {
    for (const f of fx) {
      if (!G.inView(game, f.x, f.y, f.r + 20)) continue;
      const a = Math.min(1, f.life / f.max * 2);
      const flick = 0.85 + Math.sin(game.clock * 18 + f.x) * 0.15;
      const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r * flick);
      g.addColorStop(0, 'rgba(255, 210, 120, ' + 0.5 * a + ')');
      g.addColorStop(0.5, 'rgba(255, 110, 50, ' + 0.35 * a + ')');
      g.addColorStop(1, 'rgba(120, 30, 20, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * flick, 0, TAU);
      ctx.fill();
    }
  }

  function flameGlow(ctx, game, fx) {
    for (const f of fx) {
      if (G.inView(game, f.x, f.y, f.r)) G.drawGlow(ctx, 'rgba(255, 120, 50, 0.6)', f.x, f.y, f.r * 1.3, Math.min(1, f.life / f.max * 2) * 0.6);
    }
  }

  // ---------- 그림자 덫 / 지옥 덫 ----------
  function trapUpdate(game, w, s, dt) {
    const p = game.player;
    const traps = G.fxList(w, 'traps');
    const booms = G.fxList(w, 'booms');
    const flames = G.fxList(w, 'flames');
    w.timer -= dt;
    if (w.timer <= 0) {
      w.timer = G.cd(game, s.cd);
      const n = G.amount(game, s.count);
      const spread = G.area(game, s.spread);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU;
        const d = G.rand(Math.max(40, spread * 0.3), spread);
        push(traps, { x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d, life: G.dur(game, s.life), age: 0, armed: 0.25 }, s.chain ? 24 : 14);
      }
    }
    const radius = G.area(game, s.radius);
    for (const t of traps) {
      t.age += dt;
      t.life -= dt;
      if (t.life <= 0) { t.dead = true; continue; }
      if (t.age < t.armed || t.boom) continue;
      G.enemiesInCircle(game, t.x, t.y, 12, tmp);
      if (tmp.length) t.boom = true;
    }
    // 폭발 (지옥 덫은 폭발 범위 안의 다른 덫도 터뜨린다)
    let guard = 0;
    for (let i = 0; i < traps.length && guard < 60; i++) {
      const t = traps[i];
      if (!t.boom || t.dead) continue;
      guard++;
      t.dead = true;
      G.hitCircle(game, t.x, t.y, radius, s.dmg, { knock: 240 });
      push(booms, { x: t.x, y: t.y, r: radius, life: 0.35, max: 0.35 }, 20);
      if (game.rings.length < 30) G.ring(game, t.x, t.y, radius * 0.2, radius * 1.05, 0.35, s.chain ? 'rgba(255, 120, 60, 0.9)' : 'rgba(190, 150, 255, 0.85)', 4);
      if (game.particles.length < 250) G.burst(game, t.x, t.y, s.chain ? 'rgba(255, 140, 70, 0.9)' : 'rgba(170, 130, 255, 0.9)', 10, 200, true);
      if (G.sfx) G.sfx.play('impact');
      if (s.chain) {
        addFlame(flames, t.x, t.y, radius * 0.7, s.dmg * 0.15, G.dur(game, 2));
        for (const o of traps) {
          if (o.dead || o.boom) continue;
          const dx = o.x - t.x, dy = o.y - t.y;
          if (dx * dx + dy * dy < radius * radius) { o.boom = true; i = -1; }
        }
      }
    }
    G.compact(traps);
    G.tickFx(booms, dt);
    if (flames.length) updateFlames(game, flames, dt);
  }

  function trapUnder(ctx, game, w, s) {
    const evo = !!s.chain;
    drawFlames(ctx, game, w.state.flames || []);
    const spr = G.art.get('trap');
    for (const t of w.state.traps || []) {
      if (!G.inView(game, t.x, t.y, 30)) continue;
      const fade = Math.min(1, t.life * 2) * Math.min(1, t.age / t.armed);
      ctx.globalAlpha = fade;
      if (spr) G.drawSprite(ctx, spr, t.x, t.y, evo ? 1.2 : 1, false, 0);
      else {
        ctx.fillStyle = evo ? '#5a2418' : '#2a2140';
        ctx.strokeStyle = evo ? '#ff8a4a' : '#a98be0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(t.x, t.y, 10, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * TAU;
          ctx.moveTo(t.x + Math.cos(a) * 10, t.y + Math.sin(a) * 10);
          ctx.lineTo(t.x + Math.cos(a) * 15, t.y + Math.sin(a) * 15);
        }
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  function trapGlow(ctx, game, w, s) {
    const col = s.chain ? 'rgba(255, 120, 60, 0.8)' : 'rgba(170, 130, 255, 0.7)';
    for (const t of w.state.traps || []) {
      if (G.inView(game, t.x, t.y, 30)) G.drawGlow(ctx, col, t.x, t.y, 16, 0.35 + Math.sin(game.clock * 6 + t.x) * 0.15);
    }
    for (const b of w.state.booms || []) {
      G.drawGlow(ctx, s.chain ? 'rgba(255, 150, 70, 0.9)' : 'rgba(190, 150, 255, 0.9)', b.x, b.y, b.r * 1.2, b.life / b.max);
    }
    flameGlow(ctx, game, w.state.flames || []);
  }

  G.defineWeapon('trap', { update: trapUpdate, under: trapUnder, glow: trapGlow });
  G.defineWeapon('helltrap', { update: trapUpdate, under: trapUnder, glow: trapGlow });

  // ---------- 빛의 창 / 심판의 창 ----------
  // 선분 (x, y) → 각도 a, 길이 len, 폭 width 안의 적에게 피해
  function beamHit(game, x, y, a, len, width, dmg) {
    const ca = Math.cos(a), sa = Math.sin(a);
    G.enemiesInCircle(game, x + ca * len / 2, y + sa * len / 2, len / 2 + width, tmp2);
    for (const e of tmp2) {
      const rx = e.x - x, ry = e.y - y;
      const along = rx * ca + ry * sa;
      if (along < -e.r || along > len + e.r) continue;
      const side = Math.abs(-rx * sa + ry * ca);
      if (side > width / 2 + e.r * 0.6) continue;
      G.damageEnemy(game, e, dmg, ca * 120, sa * 120);
    }
  }

  function lanceUpdate(game, w, s, dt) {
    const p = game.player;
    const beams = G.fxList(w, 'beams');
    G.tickFx(beams, dt);
    w.timer -= dt;
    if (w.timer > 0) return;
    const target = G.nearestEnemy(game, s.around ? 900 : 520);
    if (!target && !s.around) { w.timer = 0.1; return; }
    w.timer = G.cd(game, s.cd);
    const len = G.area(game, s.length), width = s.width * G.areaMul(game);
    const n = G.amount(game, s.count);
    const base = target ? Math.atan2(target.y - p.y, target.x - p.x) : (w.state.spin = (w.state.spin || 0) + 0.4);
    for (let i = 0; i < n; i++) {
      const a = s.around ? base + (i / n) * TAU : base + (i - (n - 1) / 2) * 0.25;
      beamHit(game, p.x, p.y - 6, a, len, width, s.dmg);
      push(beams, { x: p.x, y: p.y - 6, a, len, width, life: 0.25, max: 0.25 }, 16);
    }
    if (G.sfx) G.sfx.play('zap');
  }

  function lanceOver(ctx, game, w, s) {
    const gold = !!s.around;
    for (const b of w.state.beams || []) {
      const t = b.life / b.max;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.a);
      const g = ctx.createLinearGradient(0, 0, b.len, 0);
      g.addColorStop(0, gold ? 'rgba(255, 236, 170, ' + t + ')' : 'rgba(220, 240, 255, ' + t + ')');
      g.addColorStop(0.7, gold ? 'rgba(255, 200, 90, ' + t * 0.8 + ')' : 'rgba(140, 210, 255, ' + t * 0.8 + ')');
      g.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = g;
      const wd = b.width * (0.4 + t * 0.6);
      ctx.fillRect(0, -wd / 2, b.len, wd);
      ctx.fillStyle = 'rgba(255, 255, 255, ' + t + ')';
      ctx.fillRect(0, -wd * 0.15, b.len * 0.9, wd * 0.3);
      ctx.restore();
    }
  }

  function lanceGlow(ctx, game, w, s) {
    const col = s.around ? 'rgba(255, 210, 120, 0.7)' : 'rgba(140, 210, 255, 0.7)';
    for (const b of w.state.beams || []) {
      const t = b.life / b.max;
      const ca = Math.cos(b.a), sa = Math.sin(b.a);
      for (let k = 1; k <= 3; k++) {
        const d = (b.len * k) / 4;
        G.drawGlow(ctx, col, b.x + ca * d, b.y + sa * d, b.width * 1.6, t * 0.6);
      }
    }
  }

  G.defineWeapon('lance', { update: lanceUpdate, over: lanceOver, glow: lanceGlow });
  G.defineWeapon('judgment', { update: lanceUpdate, over: lanceOver, glow: lanceGlow });

  // ---------- 달나방 떼 / 달나방 군단 ----------
  function mothSteer(game, b, dt) {
    b.life -= dt;
    if (b.life <= 0) { b.dead = true; return; }
    if (!b.target || b.target.dead || b.retarget <= 0) {
      b.target = G.nearestEnemy(game, 420, b.x, b.y, null);
      b.retarget = 0.4;
    }
    b.retarget -= dt;
    let want = Math.atan2(b.vy, b.vx);
    if (b.target) want = Math.atan2(b.target.y - b.y, b.target.x - b.x);
    else want += Math.sin(b.age * 6 + b.seed) * 0.5;
    const cur = Math.atan2(b.vy, b.vx);
    const turn = G.angleDiff(want, cur);
    const na = cur + Math.max(-1, Math.min(1, turn)) * 7 * dt + Math.sin(b.age * 14 + b.seed) * 0.05;
    b.vx = Math.cos(na) * b.speed;
    b.vy = Math.sin(na) * b.speed;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.angle = na + Math.PI / 2;
    b.scale = b.baseScale * (0.85 + Math.abs(Math.sin(b.age * 22 + b.seed)) * 0.25);
  }

  function mothUpdate(game, w, s, dt) {
    w.timer -= dt;
    if (w.timer > 0) return;
    w.timer = G.cd(game, s.cd);
    const p = game.player;
    const n = G.amount(game, s.count);
    const big = !!s.pierce;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const spr = !!G.art.get('moth');
      G.fireProjectile(game, {
        x: p.x, y: p.y - 10, angle: a, speed: s.speed, dmg: s.dmg, pierce: s.pierce || s.hits || 1, life: s.life,
        r: big ? 10 : 8, sprite: spr ? 'moth' : null, baseScale: big ? 1.25 : 1, scale: 1, knock: 0.15,
        glow: big ? 'rgba(200, 180, 255, 0.8)' : 'rgba(170, 220, 255, 0.7)', glowR: 16,
        seed: Math.random() * 10, retarget: 0, update: mothSteer,
      });
    }
  }

  G.defineWeapon('moth', { update: mothUpdate });
  G.defineWeapon('mothswarm', { update: mothUpdate });

  // ---------- 회오리 / 폭풍 회랑 ----------
  function tornadoUpdate(game, w, s, dt) {
    const p = game.player;
    const list = G.fxList(w, 'twisters');
    w.timer -= dt;
    if (s.orbit) {
      // 폭풍 회랑: 큰 회오리가 플레이어 주위를 돈다 (늘 count개 유지)
      w.state.orbitA = (w.state.orbitA || 0) + dt * 1.2;
      if (w.timer <= 0) {
        w.timer = G.cd(game, s.cd);
        const n = G.amount(game, s.count);
        for (let i = list.length; i < n; i++) push(list, { x: p.x, y: p.y, life: G.dur(game, s.life), max: 1, tick: 0, spin: 0, slot: i }, 8);
        list.forEach((t, i) => { t.slot = i; t.life = Math.max(t.life, G.dur(game, s.life) * 0.5); t.max = G.dur(game, s.life); });
      }
      const n = list.length;
      for (const t of list) {
        const a = w.state.orbitA + (t.slot / Math.max(1, n)) * TAU;
        const tx = p.x + Math.cos(a) * 150 * G.areaMul(game), ty = p.y + Math.sin(a) * 150 * G.areaMul(game);
        t.x += (tx - t.x) * Math.min(1, dt * 6);
        t.y += (ty - t.y) * Math.min(1, dt * 6);
      }
    } else if (w.timer <= 0) {
      w.timer = G.cd(game, s.cd);
      const n = G.amount(game, s.count);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU;
        push(list, { x: p.x + Math.cos(a) * 60, y: p.y + Math.sin(a) * 60, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed, life: G.dur(game, s.life), max: G.dur(game, s.life), tick: 0, spin: 0, seek: 0 }, 8);
      }
    }
    const radius = G.area(game, s.radius);
    const pullR = radius * 2.2;
    for (const t of list) {
      t.life -= dt;
      t.spin += dt * 9;
      if (t.life <= 0) { t.dead = true; continue; }
      if (!s.orbit) {
        t.seek -= dt;
        if (t.seek <= 0) {
          t.seek = 0.5;
          const e = G.nearestEnemy(game, 360, t.x, t.y);
          const a = e ? Math.atan2(e.y - t.y, e.x - t.x) : Math.random() * TAU;
          t.tx = Math.cos(a) * s.speed;
          t.ty = Math.sin(a) * s.speed;
        }
        t.vx += ((t.tx || 0) - t.vx) * Math.min(1, dt * 2);
        t.vy += ((t.ty || 0) - t.vy) * Math.min(1, dt * 2);
        t.x += t.vx * dt;
        t.y += t.vy * dt;
        // 플레이어에게서 너무 멀어지지 않게
        const dx = p.x - t.x, dy = p.y - t.y;
        if (dx * dx + dy * dy > 380 * 380) { t.vx += dx * dt; t.vy += dy * dt; }
      }
      // 끌어당기기
      G.enemiesInCircle(game, t.x, t.y, pullR, tmp);
      for (const e of tmp) {
        const dx = t.x - e.x, dy = t.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d < 6) continue;
        const k = (e.boss ? 0.05 : e.elite ? 0.35 : 1) * s.pull * dt;
        e.x += (dx / d) * Math.min(k, d - 4);
        e.y += (dy / d) * Math.min(k, d - 4);
      }
      t.tick -= dt;
      if (t.tick <= 0) {
        t.tick = s.tick;
        G.hitCircle(game, t.x, t.y, radius, s.dmg, { soft: true, slow: 0.3, slowMul: 0.6 });
      }
    }
    G.compact(list);
  }

  function tornadoUnder(ctx, game, w, s) {
    const radius = G.area(game, s.radius);
    const spr = G.art.get('tornado');
    for (const t of w.state.twisters || []) {
      if (!G.inView(game, t.x, t.y, radius + 40)) continue;
      const fade = Math.min(1, t.life * 1.5);
      // 바닥의 소용돌이 자국
      ctx.globalAlpha = 0.5 * fade;
      ctx.strokeStyle = s.orbit ? 'rgba(170, 220, 255, 0.8)' : 'rgba(200, 230, 220, 0.7)';
      ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.arc(t.x, t.y + 4, radius * (0.5 + k * 0.25), t.spin + k * 2, t.spin + k * 2 + 2.4);
        ctx.stroke();
      }
      ctx.globalAlpha = fade;
      const sc = radius / 48;
      if (spr) {
        G.drawSprite(ctx, spr, t.x + Math.sin(t.spin * 0.7) * 3, t.y + 6, sc, Math.floor(t.spin * 2) % 2 === 0, 0);
      } else {
        // 그림이 없을 때: 겹친 타원으로 깔때기
        for (let k = 0; k < 6; k++) {
          const yy = t.y + 6 - k * 11 * sc;
          const rr = (8 + k * 6) * sc;
          ctx.strokeStyle = 'rgba(210, 235, 240, ' + (0.25 + k * 0.08) + ')';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(t.x + Math.sin(t.spin + k) * 4 * sc, yy, rr, rr * 0.3, 0, t.spin + k, t.spin + k + 4.5);
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function tornadoGlow(ctx, game, w, s) {
    const radius = G.area(game, s.radius);
    for (const t of w.state.twisters || []) {
      if (G.inView(game, t.x, t.y, radius)) G.drawGlow(ctx, s.orbit ? 'rgba(140, 200, 255, 0.5)' : 'rgba(160, 230, 210, 0.4)', t.x, t.y - radius * 0.4, radius * 1.4, 0.4 * Math.min(1, t.life));
    }
  }

  G.defineWeapon('tornado', { update: tornadoUpdate, under: tornadoUnder, glow: tornadoGlow });
  G.defineWeapon('tempest', { update: tornadoUpdate, under: tornadoUnder, glow: tornadoGlow });

  // ---------- 불꽃 채찍 / 용의 채찍 ----------
  function lash(game, w, s, dir) {
    const p = game.player;
    const len = G.area(game, s.length), width = s.width * G.areaMul(game);
    const y = p.y - 6;
    const x0 = p.x + dir * 8;
    G.enemiesInCircle(game, x0 + dir * len / 2, y, len / 2 + width, tmp);
    for (const e of tmp) {
      const along = (e.x - x0) * dir;
      if (along < -e.r || along > len + e.r) continue;
      if (Math.abs(e.y - y) > width / 2 + e.r * 0.6) continue;
      G.damageEnemy(game, e, s.dmg, dir * 220, 0);
    }
    push(G.fxList(w, 'lashes'), { x: x0, y, dir, len, width, life: 0.2, max: 0.2 }, 6);
    if (s.flame) {
      const flames = G.fxList(w, 'flames');
      for (let k = 1; k <= 3; k++) addFlame(flames, x0 + dir * len * (k / 3.4), y + G.rand(-6, 6), width * 0.55, s.dmg * 0.12, G.dur(game, 1.5));
    }
  }

  function whipUpdate(game, w, s, dt) {
    G.tickFx(G.fxList(w, 'lashes'), dt);
    const flames = w.state.flames;
    if (flames && flames.length) updateFlames(game, flames, dt);
    w.timer -= dt;
    if (w.timer > 0) return;
    w.timer = G.cd(game, s.cd);
    const p = game.player;
    const facing = p.flip ? -1 : 1;
    w.state.alt = !w.state.alt;
    if (s.both) { lash(game, w, s, facing); lash(game, w, s, -facing); }
    else lash(game, w, s, w.state.alt ? facing : -facing);
    if (G.sfx) G.sfx.play('slash');
  }

  function whipUnder(ctx, game, w) {
    drawFlames(ctx, game, w.state.flames || []);
  }

  function whipOver(ctx, game, w, s) {
    for (const l of w.state.lashes || []) {
      const t = 1 - l.life / l.max; // 0 → 1
      const a = 1 - t;
      const reach = l.len * Math.min(1, t * 2.2 + 0.2);
      ctx.lineCap = 'round';
      // 바깥 불길 → 안쪽 밝은 심
      const passes = [[l.width * 0.55, s.flame ? 'rgba(255, 90, 40, ' : 'rgba(255, 120, 50, ', 0.55], [l.width * 0.28, 'rgba(255, 190, 90, ', 0.85], [l.width * 0.1, 'rgba(255, 245, 210, ', 1]];
      for (const [lw, col, k] of passes) {
        ctx.strokeStyle = col + a * k + ')';
        ctx.lineWidth = lw;
        ctx.beginPath();
        ctx.moveTo(l.x, l.y);
        ctx.quadraticCurveTo(l.x + l.dir * reach * 0.5, l.y - l.width * 0.9 * (1 - t), l.x + l.dir * reach, l.y + Math.sin(t * 6) * 4);
        ctx.stroke();
      }
    }
    ctx.lineCap = 'butt';
  }

  function whipGlow(ctx, game, w) {
    for (const l of w.state.lashes || []) {
      const a = l.life / l.max;
      G.drawGlow(ctx, 'rgba(255, 130, 60, 0.7)', l.x + l.dir * l.len * 0.5, l.y, l.len * 0.45, a * 0.7);
    }
    flameGlow(ctx, game, w.state.flames || []);
  }

  G.defineWeapon('whip', { update: whipUpdate, under: whipUnder, over: whipOver, glow: whipGlow });
  G.defineWeapon('dragonwhip', { update: whipUpdate, under: whipUnder, over: whipOver, glow: whipGlow });
})(window.G);
