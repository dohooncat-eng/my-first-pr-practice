// 처음부터 있던 무기 4종의 동작: 불씨 화살, 은빛 검, 반딧불, 등불 오라
// 새 무기를 만들 때 참고할 예시이기도 하다.
(function (G) {
  'use strict';

  // 불씨 화살: 가장 가까운 적에게 부채꼴로 여러 발
  G.defineWeapon('bolt', {
    update(game, w, s, dt) {
      w.timer -= dt;
      if (w.timer > 0) return;
      const p = game.player;
      const target = G.nearestEnemy(game, 640);
      if (!target) { w.timer = 0.1; return; }
      const base = Math.atan2(target.y - p.y, target.x - p.x);
      const count = G.amount(game, s.count);
      for (let i = 0; i < count; i++) {
        G.fireProjectile(game, {
          x: p.x, y: p.y - 6, angle: base + (i - (count - 1) / 2) * 0.16, speed: s.speed,
          dmg: s.dmg, pierce: s.pierce, r: 7 * G.areaMul(game), life: 1.5,
        });
      }
      G.sfx && G.sfx.play('shoot');
      w.timer = G.cd(game, s.cd);
    },
  });

  // 은빛 검: 가장 가까운 적 쪽(없으면 바라보는 쪽)을 부채꼴로 벤다
  const slashList = [];
  G.slashAt = function (game, angle, range, arc, dmg) {
    const p = game.player;
    const list = G.enemiesInCircle(game, p.x, p.y, range, slashList);
    for (const e of list) {
      const dx = e.x - p.x, dy = e.y - p.y;
      const d = Math.hypot(dx, dy);
      if (arc < 6.28 && d > e.r && Math.abs(G.angleDiff(Math.atan2(dy, dx), angle)) > arc / 2) continue;
      const k = 260 / (d || 1);
      G.damageEnemy(game, e, dmg, dx * k, dy * k);
    }
  };

  G.defineWeapon('sword', {
    update(game, w, s, dt) {
      const st = w.state;
      st.slashes = (st.slashes || []).filter((sl) => (sl.life -= dt) > 0);
      w.timer -= dt;
      if (w.timer > 0) return;
      const p = game.player;
      const range = G.area(game, s.range);
      const target = G.nearestEnemy(game, range + 160);
      const first = target ? Math.atan2(target.y - p.y, target.x - p.x) : Math.atan2(p.face.y, p.face.x);
      const dirs = [first];
      if (s.back) dirs.push(first + Math.PI);
      for (const angle of dirs) {
        st.slashes.push({ angle, range, life: 0.22, max: 0.22 });
        G.slashAt(game, angle, range, s.arc, s.dmg);
      }
      G.sfx && G.sfx.play('slash');
      w.timer = G.cd(game, s.cd);
    },
    over(ctx, game, w) {
      const p = game.player;
      for (const sl of w.state.slashes || []) G.drawSlash(ctx, p.x, p.y - 4, sl.angle, sl.range, 1 - sl.life / sl.max);
    },
  });

  // 반딧불: 주위를 도는 구슬. key마다 재타격 간격을 따로 둔다
  G.orbitUpdate = function (game, w, s, dt, key) {
    const p = game.player;
    const st = w.state;
    st.angle = (st.angle || 0) + s.spin * dt;
    const count = G.amount(game, s.count);
    const radius = G.area(game, s.radius);
    st.orbs = st.orbs || [];
    st.orbs.length = count;
    for (let i = 0; i < count; i++) {
      const a = st.angle + (i / count) * Math.PI * 2;
      const ox = p.x + Math.cos(a) * radius;
      const oy = p.y - 4 + Math.sin(a) * radius;
      st.orbs[i] = { x: ox, y: oy, a };
      G.hitCircle(game, ox, oy, 11, s.dmg, { knock: 200, cdKey: key, cd: 0.45 });
    }
  };

  G.drawOrbs = function (ctx, w, sprite, scale) {
    const spr = G.art.get(sprite);
    for (const o of w.state.orbs || []) {
      if (!o) continue;
      if (spr) {
        ctx.save();
        ctx.translate(o.x, o.y);
        ctx.rotate(o.a + Math.PI / 2);
        G.drawSprite(ctx, spr, 0, 0, scale || 1, false, 0);
        ctx.restore();
      } else {
        ctx.fillStyle = '#e9ff9e';
        ctx.beginPath();
        ctx.arc(o.x, o.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  G.defineWeapon('orb', {
    update(game, w, s, dt) { G.orbitUpdate(game, w, s, dt, 'orb'); },
    over(ctx, game, w) { G.drawOrbs(ctx, w, 'orb'); },
    glow(ctx, game, w) {
      for (const o of w.state.orbs || []) if (o) G.drawGlow(ctx, 'rgba(200, 255, 120, 0.8)', o.x, o.y, 26, 0.65);
    },
  });

  // 등불 오라: 주변 원 안의 적을 주기적으로 태우고 느리게
  const auraList = [];
  G.auraUpdate = function (game, w, s, dt, radius, dmg, tick, onKill) {
    const p = game.player;
    const st = w.state;
    st.pulse = Math.max(0, (st.pulse || 0) - dt * 3);
    w.timer -= dt;
    const fire = w.timer <= 0;
    if (fire) { w.timer = G.cd(game, tick); st.pulse = 1; }
    const list = G.enemiesInCircle(game, p.x, p.y, radius, auraList);
    for (const e of list) {
      e.slow = Math.max(e.slow || 0, 0.15);
      if (fire && G.damageEnemy(game, e, dmg, 0, 0, true) && onKill) onKill(e);
    }
  };

  G.drawAuraRing = function (ctx, game, radius, pulse, rgb) {
    const p = game.player;
    const c = rgb || '255, 181, 71';
    const r = radius * (1 + pulse * 0.04);
    G.fx.disc(ctx, 'aura:' + c, p.x, p.y, r, 0.7 + pulse * 0.3, 'rgba(' + c + ',0.02)', 'rgba(' + c + ',0.16)', true);
    ctx.save();
    ctx.setLineDash([3, 14]);
    ctx.lineDashOffset = game.fx.quiet ? 0 : -game.fx.anim * 22;
    ctx.lineCap = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(' + c + ', ' + (0.35 + pulse * 0.3) + ')';
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 0.96, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };

  G.defineWeapon('aura', {
    update(game, w, s, dt) { G.auraUpdate(game, w, s, dt, G.area(game, s.radius), s.dmg, s.tick); },
    under(ctx, game, w, s) { G.drawAuraRing(ctx, game, G.area(game, s.radius), w.state.pulse || 0); },
  });
})(window.G);
