// 진화 무기 9종 + 무기 조합 3종.
// 기본 무기 동작(base.js)과 새 무기 도우미(new.js)를 바탕으로, 더 크고 자주, 더 화려하게.
(function (G) {
  'use strict';

  const TAU = Math.PI * 2;

  // 주위를 도는 구슬 (반딧불 여왕, 작은 태양). 맞는 반지름과 밀어내는 힘을 정할 수 있다.
  function orbit(game, w, s, dt, key, hitR, knock) {
    const p = game.player;
    const st = w.state;
    st.angle = (st.angle || 0) + s.spin * dt;
    const count = G.amount(game, s.count);
    const radius = G.area(game, s.radius);
    st.orbs = st.orbs || [];
    st.orbs.length = count;
    for (let i = 0; i < count; i++) {
      const a = st.angle + (i / count) * TAU;
      const ox = p.x + Math.cos(a) * radius;
      const oy = p.y - 4 + Math.sin(a) * radius;
      st.orbs[i] = { x: ox, y: oy, a };
      G.hitCircle(game, ox, oy, hitR, s.dmg, { knock, cdKey: key, cd: 0.4 });
    }
  }

  function aimAngle(game, target) {
    const p = game.player;
    return target ? Math.atan2(target.y - p.y, target.x - p.x) : Math.atan2(p.face.y, p.face.x);
  }

  function tickSlashes(st, dt) {
    st.slashes = (st.slashes || []).filter((sl) => (sl.life -= dt) > 0);
  }

  // ---------- 화염 폭풍: 불씨 화살 + 숙련 ----------
  G.defineWeapon('inferno', {
    update(game, w, s, dt) {
      const st = w.state;
      const booms = G.fxList(w, 'booms');
      G.tickFx(booms, dt);
      w.timer -= dt;
      if (w.timer > 0) return;
      const p = game.player;
      // 가장 가까운 적과 무작위 적을 번갈아 노려 화면 전체를 덮는다
      st.alt = !st.alt;
      const target = st.alt ? G.nearestEnemy(game, 700) : G.randomEnemies(game, 1)[0] || G.nearestEnemy(game, 700);
      if (!target) { w.timer = 0.1; return; }
      const base = aimAngle(game, target);
      const count = G.amount(game, s.count);
      const boomR = G.area(game, s.explode);
      for (let i = 0; i < count; i++) {
        G.fireProjectile(game, {
          x: p.x, y: p.y - 6, angle: base + (i - (count - 1) / 2) * 0.2, speed: s.speed,
          dmg: s.dmg, pierce: s.pierce, r: 9 * p.stats.area, scale: 1.35, life: 1.4,
          glow: 'rgba(255, 110, 40, 0.95)', glowR: 26,
          onHit(g, b, e) {
            G.hitCircle(g, e.x, e.y, boomR, s.dmg * 0.45, { soft: true, knock: 120 });
            G.fxPush(booms, { x: e.x, y: e.y, r: boomR, life: 0.3, max: 0.3 }, 40);
            G.burst(g, e.x, e.y, 'rgba(255, 140, 60, 0.9)', 3, 170, true);
          },
        });
      }
      G.sfx && G.sfx.play('shoot');
      w.timer = G.cd(game, s.cd);
    },
    under(ctx, game, w) {
      for (const b of w.state.booms || []) {
        const k = 1 - b.life / b.max;
        const r = b.r * (0.6 + 0.5 * k);
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r);
        g.addColorStop(0, 'rgba(255, 236, 190, ' + (1 - k) * 0.9 + ')');
        g.addColorStop(0.5, 'rgba(255, 110, 40, ' + (1 - k) * 0.55 + ')');
        g.addColorStop(1, 'rgba(120, 30, 10, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r, 0, TAU);
        ctx.fill();
      }
    },
    glow(ctx, game, w) {
      for (const b of w.state.booms || []) G.drawGlow(ctx, 'rgba(255, 130, 50, 0.9)', b.x, b.y, b.r * 1.4, (b.life / b.max) * 0.8);
    },
  });

  // ---------- 월광검: 은빛 검 + 불꽃 심지 ----------
  G.defineWeapon('moonblade', {
    update(game, w, s, dt) {
      const st = w.state;
      tickSlashes(st, dt);
      st.flash = Math.max(0, (st.flash || 0) - dt);
      w.timer -= dt;
      if (w.timer > 0) return;
      const p = game.player;
      const range = G.area(game, s.range);
      // 사방을 한 번에 베고
      G.slashAt(game, 0, range, s.arc, s.dmg);
      st.turn = (st.turn || 0) + 1.1;
      for (let k = 0; k < 3; k++) st.slashes.push({ angle: st.turn + (k * TAU) / 3, range, life: 0.26, max: 0.26 });
      // 가장 가까운 적 쪽으로 검기를 날린다
      const base = aimAngle(game, G.nearestEnemy(game, 640));
      const n = G.amount(game, 1);
      for (let i = 0; i < n; i++) {
        G.fireProjectile(game, {
          x: p.x, y: p.y - 6, angle: base + (i - (n - 1) / 2) * 0.3, speed: s.waveSpeed,
          dmg: s.waveDmg, pierce: 999, r: 24 * p.stats.area, sprite: 'slash', scale: 0.45 * p.stats.area,
          life: 0.9, glow: 'rgba(170, 210, 255, 0.85)', glowR: 60, knock: 0.35,
        });
      }
      st.flash = 0.2;
      st.range = range;
      G.addShake(game, 1.5);
      G.sfx && G.sfx.play('slash');
      w.timer = G.cd(game, s.cd);
    },
    over(ctx, game, w) {
      const p = game.player;
      for (const sl of w.state.slashes || []) G.drawSlash(ctx, p.x, p.y - 4, sl.angle, sl.range, 1 - sl.life / sl.max, '#bfe0ff');
    },
    glow(ctx, game, w) {
      const st = w.state;
      if (st.flash > 0) G.drawGlow(ctx, 'rgba(180, 215, 255, 0.8)', game.player.x, game.player.y, (st.range || 150) * 1.1, (st.flash / 0.2) * 0.5);
    },
  });

  // ---------- 반딧불 여왕: 반딧불 + 끌림 ----------
  G.defineWeapon('queen', {
    update(game, w, s, dt) {
      orbit(game, w, s, dt, 'queen', 15, 240);
      // 반딧불이 스친 경험치 결정을 끌어온다
      for (const o of w.state.orbs) {
        for (const g of game.gems) {
          if (g.pull) continue;
          const dx = g.x - o.x, dy = g.y - o.y;
          if (dx * dx + dy * dy < 48 * 48) g.pull = true;
        }
      }
    },
    under(ctx, game, w, s) {
      const p = game.player;
      ctx.save();
      ctx.setLineDash([2, 10]);
      ctx.lineDashOffset = -game.clock * 30;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(225, 255, 140, 0.16)';
      ctx.beginPath();
      ctx.arc(p.x, p.y - 4, G.area(game, s.radius), 0, TAU);
      ctx.stroke();
      ctx.restore();
    },
    over(ctx, game, w, s) {
      const p = game.player;
      const radius = G.area(game, s.radius);
      // 지나간 자리에 남는 빛 꼬리
      for (const o of w.state.orbs || []) {
        if (!o) continue;
        for (let k = 1; k <= 5; k++) {
          const a = o.a - k * 0.09;
          ctx.fillStyle = 'rgba(232, 255, 160, ' + 0.42 * (1 - k / 6) + ')';
          ctx.beginPath();
          ctx.arc(p.x + Math.cos(a) * radius, p.y - 4 + Math.sin(a) * radius, 5.5 - k * 0.7, 0, TAU);
          ctx.fill();
        }
      }
      G.drawOrbs(ctx, w, 'orb', 1.45);
    },
    glow(ctx, game, w) {
      for (const o of w.state.orbs || []) if (o) G.drawGlow(ctx, 'rgba(225, 255, 130, 0.9)', o.x, o.y, 38, 0.75);
    },
  });

  // ---------- 성스러운 등불: 등불 오라 + 튼튼한 몸 ----------
  G.defineWeapon('holylamp', {
    update(game, w, s, dt) {
      const st = w.state;
      st.heal = st.heal || 0;
      st.healT = (st.healT || 0) - dt;
      G.auraUpdate(game, w, s, dt, G.area(game, s.radius), s.dmg, s.tick, () => { st.heal += s.healOnKill; });
      // 처치마다 바로 회복하면 숫자가 너무 많아서 모아서 회복한다
      if (st.healT <= 0) {
        st.healT = 0.6;
        const p = game.player;
        if (st.heal > 0 && p.hp < p.maxHp) G.healPlayer(game, st.heal);
        st.heal = 0;
      }
    },
    under(ctx, game, w, s) {
      const p = game.player;
      const r = G.area(game, s.radius);
      const pulse = w.state.pulse || 0;
      // 천천히 도는 빛줄기
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(game.clock * 0.35);
      const g = ctx.createLinearGradient(0, 0, r, 0);
      g.addColorStop(0, 'rgba(255, 240, 200, ' + (0.16 + pulse * 0.08) + ')');
      g.addColorStop(1, 'rgba(255, 236, 190, 0)');
      ctx.fillStyle = g;
      for (let k = 0; k < 8; k++) {
        ctx.rotate(TAU / 8);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, r, -0.1, 0.1);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
      G.drawAuraRing(ctx, game, r, pulse, '255, 236, 190');
    },
    glow(ctx, game, w, s) {
      const p = game.player;
      G.drawGlow(ctx, 'rgba(255, 230, 170, 0.5)', p.x, p.y, G.area(game, s.radius) * 1.05, 0.28 + (w.state.pulse || 0) * 0.15);
    },
  });

  // ---------- 뇌우: 번개 사슬 + 넓은 빛 ----------
  G.defineWeapon('storm', {
    update(game, w, s, dt) {
      const fx = G.fxList(w, 'bolts');
      G.tickFx(fx, dt);
      const st = w.state;
      st.flash = Math.max(0, (st.flash || 0) - dt);
      w.timer -= dt;
      if (w.timer > 0) return;
      const targets = G.randomEnemies(game, G.amount(game, s.targets));
      if (!targets.length) { w.timer = 0.15; return; }
      for (const t of targets) {
        G.chainStrike(game, fx, t, s.dmg, s.jumps, G.area(game, s.range), 'storm');
        G.burst(game, t.x, t.y - 6, 'rgba(190, 170, 255, 0.95)', 5, 180, true);
      }
      st.flash = 0.14;
      G.addShake(game, 1.8);
      G.sfx && G.sfx.play('shoot');
      w.timer = G.cd(game, s.cd);
    },
    over(ctx, game, w) { G.drawBolts(ctx, w.state.bolts || []); },
    glow(ctx, game, w) {
      G.drawBoltGlow(ctx, w.state.bolts || []);
      // 번개가 칠 때 주변이 잠깐 밝아진다
      if (w.state.flash > 0) G.drawGlow(ctx, 'rgba(170, 150, 255, 0.5)', game.player.x, game.player.y, 420, w.state.flash * 2);
    },
  });

  // ---------- 사신의 낫: 회전 낫 + 가벼운 발 ----------
  G.defineWeapon('reaper', {
    update(game, w, s, dt) {
      G.updateBlades(game, G.fxList(w, 'blades'), dt);
      w.timer -= dt;
      if (w.timer > 0) return;
      G.scytheThrow(game, w, s, 'reaper', 0, true);
      G.addShake(game, 1);
      w.timer = G.cd(game, s.cd);
    },
    over(ctx, game, w) { G.drawBlades(ctx, game, w.state.blades || []); },
    glow(ctx, game, w) { G.drawBladeGlow(ctx, game, w.state.blades || []); },
  });

  // ---------- 맹독 정원: 독 덩굴 + 재생의 이끼 ----------
  G.defineWeapon('garden', {
    update(game, w, s, dt) { G.poisonUpdate(game, w, s, dt, 'garden'); },
    under(ctx, game, w) { G.drawPools(ctx, game, w.state.pools || []); },
    glow(ctx, game, w) { G.drawPoolGlow(ctx, game, w.state.pools || []); },
  });

  // ---------- 유성우: 별똥별 + 별의 가호 ----------
  G.defineWeapon('starfall', {
    update(game, w, s, dt) { G.meteorUpdate(game, w, s, dt, 'star'); },
    under(ctx, game, w) { G.drawMeteorsUnder(ctx, game, w.state.meteors || []); },
    over(ctx, game, w) { G.drawMeteorsOver(ctx, game, w.state.meteors || []); },
    glow(ctx, game, w) { G.drawMeteorGlow(ctx, game, w.state.meteors || []); },
  });

  // ---------- 대지의 종: 종소리 파동 + 바위 갑옷 ----------
  G.defineWeapon('earthbell', {
    update(game, w, s, dt) { G.bellUpdate(game, w, s, dt, 'earth'); },
    under(ctx, game, w) { G.drawWaves(ctx, game, w.state.waves || []); },
    over(ctx, game, w) { G.bellDrawOver(ctx, game, w, 'earth'); },
    glow(ctx, game, w) { G.drawWaveGlow(ctx, game, w.state.waves || []); },
  });

  // ---------- 뇌화살: 불씨 화살 + 번개 사슬 ----------
  G.defineWeapon('thunderbolt', {
    update(game, w, s, dt) {
      const fx = G.fxList(w, 'bolts');
      G.tickFx(fx, dt);
      w.timer -= dt;
      if (w.timer > 0) return;
      const p = game.player;
      const target = G.nearestEnemy(game, 700);
      if (!target) { w.timer = 0.1; return; }
      const base = aimAngle(game, target);
      const count = G.amount(game, s.count);
      const range = G.area(game, s.range);
      for (let i = 0; i < count; i++) {
        G.fireProjectile(game, {
          x: p.x, y: p.y - 6, angle: base + (i - (count - 1) / 2) * 0.14, speed: s.speed,
          dmg: s.dmg, pierce: s.pierce, r: 8 * p.stats.area, scale: 1.25, life: 1.3,
          glow: 'rgba(140, 190, 255, 0.95)', glowR: 26, owner: w,
          onHit(g, b, e) {
            // 화살 하나당 처음 두 번 맞힐 때 번개가 튄다
            if (b.hits.length <= 2) G.chainStrike(g, fx, e, s.dmg * 0.6, s.jumps, range, 'thunder', true);
          },
        });
      }
      G.sfx && G.sfx.play('shoot');
      w.timer = G.cd(game, s.cd);
    },
    over(ctx, game, w) {
      G.drawBolts(ctx, w.state.bolts || []);
      // 화살 둘레에 튀는 작은 전기
      ctx.save();
      ctx.strokeStyle = 'rgba(205, 228, 255, 0.9)';
      ctx.lineWidth = 1.3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (const b of game.projectiles) {
        if (b.owner !== w || b.dead) continue;
        for (let k = 0; k < 2; k++) {
          const a = Math.random() * TAU;
          const x1 = b.x + Math.cos(a) * 4, y1 = b.y + Math.sin(a) * 4;
          const x2 = b.x + Math.cos(a + 0.5) * 9, y2 = b.y + Math.sin(a + 0.5) * 9;
          ctx.moveTo(x1, y1);
          ctx.lineTo((x1 + x2) / 2 + G.rand(-3, 3), (y1 + y2) / 2 + G.rand(-3, 3));
          ctx.lineTo(x2 + Math.cos(a) * 4, y2 + Math.sin(a) * 4);
        }
      }
      ctx.stroke();
      ctx.restore();
    },
    glow(ctx, game, w) { G.drawBoltGlow(ctx, w.state.bolts || []); },
  });

  // ---------- 쌍월: 은빛 검 + 회전 낫 ----------
  G.defineWeapon('twinmoon', {
    update(game, w, s, dt) {
      const st = w.state;
      G.updateBlades(game, G.fxList(w, 'blades'), dt);
      tickSlashes(st, dt);
      w.timer -= dt;
      if (w.timer > 0) return;
      G.scytheThrow(game, w, s, 'moon', 0, true);
      // 던지는 순간 주위를 크게 한 바퀴 벤다
      const range = G.area(game, 115);
      G.slashAt(game, 0, range, 6.3, s.dmg * 0.6);
      st.turn = (st.turn || 0) + 0.9;
      for (let k = 0; k < 2; k++) st.slashes.push({ angle: st.turn + k * Math.PI, range, life: 0.24, max: 0.24 });
      G.addShake(game, 1);
      w.timer = G.cd(game, s.cd);
    },
    over(ctx, game, w) {
      const p = game.player;
      for (const sl of w.state.slashes || []) G.drawSlash(ctx, p.x, p.y - 4, sl.angle, sl.range, 1 - sl.life / sl.max, '#d6e6ff');
      G.drawBlades(ctx, game, w.state.blades || []);
    },
    glow(ctx, game, w) { G.drawBladeGlow(ctx, game, w.state.blades || []); },
  });

  // ---------- 작은 태양: 반딧불 + 등불 오라 ----------
  function drawSunFallback(ctx, x, y, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t);
    ctx.fillStyle = '#ff8a3d';
    ctx.beginPath();
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU;
      const r = k % 2 ? 22 : 27;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    const g = ctx.createRadialGradient(-5, -5, 2, 0, 0, 20);
    g.addColorStop(0, '#fff6d0');
    g.addColorStop(0.5, '#ffc766');
    g.addColorStop(1, '#ff6b3d');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 19, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0a1110';
    ctx.stroke();
    ctx.restore();
  }

  G.defineWeapon('sun', {
    update(game, w, s, dt) {
      orbit(game, w, s, dt, 'sun', 26, 160);
      G.auraUpdate(game, w, s, dt, G.area(game, s.auraRadius), s.auraDmg, s.tick);
      // 태양에서 튀는 불티
      if (Math.random() < dt * 10) {
        const o = G.pick(w.state.orbs);
        if (o) G.burst(game, o.x, o.y, 'rgba(255, 170, 70, 0.9)', 1, 70, true);
      }
    },
    under(ctx, game, w, s) { G.drawAuraRing(ctx, game, G.area(game, s.auraRadius), w.state.pulse || 0, '255, 140, 60'); },
    over(ctx, game, w) {
      const spr = G.art.get('sun');
      for (const o of w.state.orbs || []) {
        if (!o) continue;
        if (spr) {
          ctx.save();
          ctx.translate(o.x, o.y);
          ctx.rotate(game.clock * 1.5);
          G.drawSprite(ctx, spr, 0, 0, 1, false, 0);
          ctx.restore();
        } else {
          drawSunFallback(ctx, o.x, o.y, game.clock * 1.5);
        }
      }
    },
    glow(ctx, game, w) {
      for (const o of w.state.orbs || []) {
        if (!o) continue;
        G.drawGlow(ctx, 'rgba(255, 160, 60, 0.95)', o.x, o.y, 72, 0.75);
        G.drawGlow(ctx, 'rgba(255, 236, 170, 0.95)', o.x, o.y, 28, 0.9);
      }
    },
  });
})(window.G);
