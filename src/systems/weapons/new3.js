// 새 무기 2개(서리 방울·빛의 방패)와 진화(겨울밤·성벽)의 동작
// 서리: 맞을 때마다 느려지고, 서리가 freezeAt번 쌓이면 freeze초 동안 얼어붙는다(보스는 느려지기만).
// 방패: 주위를 돌며 닿는 적을 밀어내고, 적 탄환을 막는다. 성벽은 막을 때 체력을 회복한다.
(function (G) {
  'use strict';

  const TAU = Math.PI * 2;
  const tmp = [];

  // ---------- 서리 방울 / 겨울밤 ----------
  function chill(game, w, s, e) {
    e.slow = Math.max(e.slow || 0, s.slow);
    e.slowMul = Math.min(e.slowMul || 1, s.slowMul);
    if (e.boss || e.dead) return;
    e.frost = (e.frost || 0) + 1;
    if (e.frost < s.freezeAt) return;
    e.frost = 0;
    e.stun = Math.max(e.stun || 0, s.freeze);
    if (!(e.frozenUntil > game.time)) {
      const list = G.fxList(w, 'frozen');
      if (list.length < 120) list.push(e);
    }
    e.frozenUntil = game.time + s.freeze;
    if (game.particles.length < 250) G.burst(game, e.x, e.y, 'rgba(190, 240, 255, 0.9)', 6, 120, true);
  }

  function frostUpdate(game, w, s, dt) {
    const p = game.player;
    const st = w.state;
    w.timer -= dt;
    if (w.timer <= 0) {
      const target = G.nearestEnemy(game, 520);
      if (!target) w.timer = 0.2;
      else {
        w.timer = G.cd(game, s.cd);
        const n = G.amount(game, s.count);
        const base = Math.atan2(target.y - p.y, target.x - p.x);
        for (let i = 0; i < n; i++) {
          const a = base + (i - (n - 1) / 2) * 0.2;
          G.fireProjectile(game, {
            x: p.x, y: p.y - 6, angle: a, speed: s.speed, dmg: s.dmg, pierce: s.pierce, life: 1.6, r: 8,
            sprite: 'frost', scale: s.field ? 1.25 : 1, knock: 0.1, glow: 'rgba(140, 220, 255, 0.9)', glowR: 20,
            onHit(g, b, e) { chill(g, w, s, e); },
          });
        }
        if (G.sfx) G.sfx.play('shoot');
      }
    }
    // 겨울밤: 주변이 서리 장판이 된다
    if (s.field) {
      st.pulse = Math.max(0, (st.pulse || 0) - dt * 3);
      st.tick = (st.tick || 0) - dt;
      if (st.tick <= 0) {
        st.tick = G.cd(game, s.tick);
        st.pulse = 1;
        for (const e of G.enemiesInCircle(game, p.x, p.y, G.area(game, s.field), tmp)) {
          G.damageEnemy(game, e, s.fieldDmg, 0, 0, true);
          chill(game, w, s, e);
        }
      }
    }
    // 녹은 적은 목록에서 뺀다
    const frozen = st.frozen;
    if (frozen && frozen.length) {
      for (let i = frozen.length - 1; i >= 0; i--) {
        const e = frozen[i];
        if (e.dead || !(e.frozenUntil > game.time)) frozen.splice(i, 1);
      }
    }
  }

  function frostUnder(ctx, game, w, s) {
    if (s.field) G.drawAuraRing(ctx, game, G.area(game, s.field), w.state.pulse || 0, '140, 210, 255');
    // 얼어붙은 적 발밑의 얼음 자리
    ctx.fillStyle = 'rgba(170, 230, 255, 0.35)';
    ctx.strokeStyle = 'rgba(220, 248, 255, 0.8)';
    ctx.lineWidth = 1.5;
    for (const e of w.state.frozen || []) {
      if (!G.inView(game, e.x, e.y, 40)) continue;
      ctx.beginPath();
      ctx.ellipse(e.x, e.y + e.r * 0.6, e.r * 1.3, e.r * 0.5, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
  }

  function frostGlow(ctx, game, w) {
    for (const e of w.state.frozen || []) {
      if (G.inView(game, e.x, e.y, 40)) G.drawGlow(ctx, 'rgba(150, 225, 255, 0.8)', e.x, e.y, e.r * 2, 0.55);
    }
  }

  ['frost', 'winter'].forEach((k) => G.defineWeapon(k, { update: frostUpdate, under: frostUnder, glow: frostGlow }));

  // ---------- 빛의 방패 / 성벽 ----------
  function shieldUpdate(game, w, s, dt) {
    const p = game.player;
    const st = w.state;
    st.angle = (st.angle || 0) + s.spin * dt;
    st.healCd = Math.max(0, (st.healCd || 0) - dt);
    const count = G.amount(game, s.count);
    const radius = G.area(game, s.radius);
    const hitR = 14 * s.size;
    st.orbs = st.orbs || [];
    st.orbs.length = count;
    for (let i = 0; i < count; i++) {
      const a = st.angle + (i / count) * TAU;
      const ox = p.x + Math.cos(a) * radius;
      const oy = p.y - 4 + Math.sin(a) * radius;
      st.orbs[i] = { x: ox, y: oy, a };
      G.hitCircle(game, ox, oy, hitR, s.dmg, { knock: s.knock, cdKey: 'shield', cd: 0.5 });
      // 적 탄환 막기
      for (const b of game.enemyBullets) {
        if (b.dead) continue;
        const dx = b.x - ox, dy = b.y - oy, rr = b.r + hitR + 4;
        if (dx * dx + dy * dy > rr * rr) continue;
        b.dead = true;
        if (game.particles.length < 250) G.burst(game, b.x, b.y, 'rgba(255, 230, 160, 0.9)', 5, 140, true);
        if (s.heal && st.healCd <= 0) { G.healPlayer(game, s.heal); st.healCd = 0.25; }
      }
    }
  }

  function shieldOver(ctx, game, w, s) { G.drawOrbs(ctx, w, 'shield', s.size); }

  function shieldGlow(ctx, game, w, s) {
    const col = s.heal ? 'rgba(255, 240, 170, 0.85)' : 'rgba(255, 210, 120, 0.75)';
    for (const o of w.state.orbs || []) if (o) G.drawGlow(ctx, col, o.x, o.y, 24 * s.size, 0.55);
  }

  ['shield', 'bulwark'].forEach((k) => G.defineWeapon(k, { update: shieldUpdate, over: shieldOver, glow: shieldGlow }));
})(window.G);
