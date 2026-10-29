// 적: 생성(스테이지 배율 적용), 추적 이동, 피해·치명타·처치, 그리기. 중간 보스도 같은 목록에 들어간다(e.boss).
(function (G) {
  'use strict';

  let nextId = 1;
  const near = [];

  function stage(game) { return game.stage || G.STAGES[0]; }

  G.spawnEnemy = function (game, type, x, y, elite) {
    const t = G.ENEMY_TYPES[type];
    const st = stage(game);
    const minutes = game.time / 60;
    const scale = elite ? 1.8 : 1;
    // 체력 배율: 5분 2.6배 · 10분 9배 · 15분 24배 · 20분 50배 (뒤 스테이지는 더 가파르게)
    const growth = (0.06 * minutes + 0.03 * minutes * minutes + 0.0045 * minutes * minutes * minutes) * st.growth;
    const diff = game.difficulty || G.DIFFICULTIES[0];
    // 난이도 체력 배율은 처음엔 1/4만 걸리고 8분에 걸쳐 끝까지 오른다 (첫 무기로도 시작할 수 있게)
    const diffHp = 1 + (diff.hp - 1) * (0.25 + 0.75 * Math.min(1, minutes / 8));
    const hp = t.hp * st.hpMul * diffHp * (1 + growth) * (elite ? 14 : 1);
    const e = {
      id: nextId++, type, x, y, scale,
      r: t.r * scale,
      hp, maxHp: hp,
      speed: t.speed * st.speedMul * diff.speed * (1 + minutes * 0.015) * (elite ? 0.85 : 1),
      damage: t.damage * st.dmgMul * diff.dmg * (1 + minutes * 0.07) * (elite ? 1.6 : 1),
      xp: elite ? 25 : t.xp,
      elite: !!elite,
      flash: 0, kx: 0, ky: 0, slow: 0, stun: 0,
      phase: Math.random() * 10,
      hitUntil: {},
      dead: false,
    };
    game.enemies.push(e);
    return e;
  };

  G.nextEnemyId = function () { return nextId++; };

  // 화면 바로 바깥 무작위 지점
  G.spawnPoint = function (game, extra) {
    const a = Math.random() * Math.PI * 2;
    const d = game.viewRadius + 40 + (extra || 0);
    return { x: game.player.x + Math.cos(a) * d, y: game.player.y + Math.sin(a) * d };
  };

  // 피해를 주고, 처치했으면 true. soft: 지속 피해(번쩍임 없음, 작은 숫자)
  G.damageEnemy = function (game, e, base, kx, ky, soft) {
    if (e.dead) return false;
    const s = game.player.stats;
    let dmg = base * s.damage * G.rand(0.9, 1.1);
    const crit = !soft && Math.random() < s.crit;
    if (crit) dmg *= s.critMult;
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg;
    if (!soft) e.flash = 0.1;
    const resist = e.boss ? 0.05 : e.elite ? 0.2 : G.ENEMY_TYPES[e.type] && G.ENEMY_TYPES[e.type].role === 'tank' ? 0.45 : 1;
    e.kx += (kx || 0) * resist;
    e.ky += (ky || 0) * resist;
    G.addDamageNumber(game, e.x, e.y - e.r - 4, dmg, crit ? 'crit' : soft ? 'soft' : dmg >= 30 ? 'big' : '');
    if (!soft) {
      if (crit) {
        G.burst(game, e.x, e.y - e.r * 0.4, 'rgba(255, 170, 110, 0.95)', 5, 200, true);
        if (G.sfx) G.sfx.play('crit');
      } else if (Math.random() < 0.35) {
        G.burst(game, e.x, e.y - e.r * 0.4, 'rgba(255, 240, 210, 0.9)', 2, 140, true);
      }
      if (G.sfx) G.sfx.play('hit');
    }
    if (e.hp <= 0) {
      G.killEnemy(game, e);
      return true;
    }
    return false;
  };

  G.killEnemy = function (game, e) {
    e.dead = true;
    game.kills++;
    if (e.boss) { G.onBossKilled(game, e); return; }
    const t = G.ENEMY_TYPES[e.type];
    const gemScale = 1 + Math.floor(game.time / 180) * 0.25;
    G.dropGem(game, e.x, e.y, e.xp * gemScale);
    G.burst(game, e.x, e.y, t.color, e.elite ? 26 : 7, e.elite ? 260 : 150);
    if (game.rings.length < 30) G.ring(game, e.x, e.y, e.r * 0.4, e.r * (e.elite ? 3.2 : 1.9), e.elite ? 0.45 : 0.28, 'rgba(255, 236, 200, 0.7)', e.elite ? 5 : 2.5);
    if (G.sfx) G.sfx.play('kill');
    if (e.elite) {
      G.burst(game, e.x, e.y, 'rgba(255, 150, 70, 0.9)', 16, 220, true);
      G.dropItem(game, e.x + 14, e.y, 'heal');
      G.dropItem(game, e.x - 14, e.y, 'coin', 5);
      // 엘리트도 가끔 상자를 떨어뜨린다
      if (Math.random() < 0.15) G.dropItem(game, e.x, e.y + 16, 'chest');
      G.addShake(game, 8);
    } else {
      const r = Math.random();
      if (r < 0.003) G.dropItem(game, e.x, e.y, 'magnet');
      else if (r < 0.011) G.dropItem(game, e.x, e.y, 'heal');
      else if (r < 0.026) G.dropItem(game, e.x, e.y, 'coin', 1);
    }
    if (game.onKill) game.onKill(e);
  };

  G.updateEnemies = function (game, dt) {
    const p = game.player;
    const grid = game.grid;
    for (const e of game.enemies) {
      if (e.dead) continue;
      e.flash -= dt;
      e.slow -= dt;
      if (e.boss) { G.updateBoss(game, e, dt); continue; }
      const dx = p.x - e.x, dy = p.y - e.y;
      const d = Math.hypot(dx, dy) || 1;

      // 너무 멀어진 적은 화면 근처로 다시 데려온다
      if (d > game.despawnDist) {
        const pt = G.spawnPoint(game);
        e.x = pt.x;
        e.y = pt.y;
        continue;
      }

      const t = G.ENEMY_TYPES[e.type];
      let vx = 0, vy = 0;
      if (e.stun > 0) {
        e.stun -= dt;
      } else {
        if (e.slow <= 0) e.slowMul = 0;
        let sp = e.speed * (e.slow > 0 ? (e.slowMul || 0.55) : 1);
        if (t.hop) sp *= 0.55 + Math.max(0, Math.sin(game.time * 5 + e.phase)) * 1.1;
        vx = (dx / d) * sp;
        vy = (dy / d) * sp;
        if (t.wobble) {
          const wv = Math.sin(game.time * 5 + e.phase) * 0.7;
          vx += (-dy / d) * sp * wv;
          vy += (dx / d) * sp * wv;
        }
      }

      // 서로 겹치지 않게 밀어내기
      grid.query(e.x, e.y, e.r + 26, near);
      let sx = 0, sy = 0;
      for (let i = 0; i < near.length; i++) {
        const o = near[i];
        if (o === e) continue;
        const ox = e.x - o.x, oy = e.y - o.y;
        const rr = (e.r + o.r) * 0.9;
        const dd = ox * ox + oy * oy;
        if (dd < rr * rr && dd > 0.0001) {
          const dl = Math.sqrt(dd);
          const push = (rr - dl) / rr;
          sx += (ox / dl) * push;
          sy += (oy / dl) * push;
        }
      }
      const sepK = e.elite ? 25 : 70;
      vx += sx * sepK;
      vy += sy * sepK;

      e.x += (vx + e.kx) * dt;
      e.y += (vy + e.ky) * dt;
      const decay = Math.min(1, dt * 9);
      e.kx -= e.kx * decay;
      e.ky -= e.ky * decay;

      if (d < e.r + p.r) G.damagePlayer(game, e.damage, e);
    }
  };

  function inView(game, e) {
    return Math.abs(e.x - game.cam.x) < game.viewW / 2 + 120 &&
      Math.abs(e.y - game.cam.y) < game.viewH / 2 + 120;
  }

  function spec(e) {
    return e.boss ? G.BOSS_SPRITE : G.ENEMY_ROLES[G.ENEMY_TYPES[e.type].role];
  }

  function spriteName(e) { return e.boss ? 'boss_' + e.type : e.type; }

  G.drawEnemies = function (ctx, game) {
    const p = game.player;
    const vis = game._visEnemies || (game._visEnemies = []);
    vis.length = 0;
    for (const e of game.enemies) if (!e.dead && inView(game, e)) vis.push(e);
    vis.sort((a, b) => a.y - b.y);

    // 그림자 먼저 한 번에
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    for (const e of vis) {
      const sp = spec(e);
      const sy = e.y + (sp.fly ? 18 : sp.feet) * e.scale;
      const rx = sp.shadow * e.scale;
      ctx.moveTo(e.x + rx, sy);
      ctx.ellipse(e.x, sy, rx, rx * 0.36, 0, 0, Math.PI * 2);
    }
    ctx.fill();

    for (const e of vis) {
      const sp = spec(e);
      if (e.elite || e.boss) {
        const pulse = 0.6 + Math.sin(game.clock * 6 + e.phase) * 0.25;
        ctx.strokeStyle = e.boss ? 'rgba(255, 70, 90, ' + pulse + ')' : 'rgba(255, 107, 61, ' + pulse + ')';
        ctx.lineWidth = e.boss ? 3.5 : 2.5;
        ctx.beginPath();
        ctx.ellipse(e.x, e.y + sp.feet * e.scale, e.r * 1.25, e.r * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      const frame = Math.floor(game.clock * sp.fps + e.phase) % 4;
      const spr = G.art.get(spriteName(e), frame);
      const bob = sp.fly ? Math.sin(game.clock * 4 + e.phase) * 3 : 0;
      const stunWobble = e.stun > 0 ? Math.sin(game.clock * 30) * 2 : 0;
      if (spr) {
        // 엘리트·보스는 계속 맞으므로 번쩍임을 약하게
        const flash = e.flash > 0 ? (e.flash / 0.1) * (e.boss || e.elite ? 0.3 : 0.55) : 0;
        G.drawSprite(ctx, spr, e.x + stunWobble, e.y + sp.feet * e.scale + bob - (e.lift || 0), e.scale, p.x < e.x, flash);
      } else {
        const t = e.boss ? G.BOSS_TYPES[e.type] : G.ENEMY_TYPES[e.type];
        ctx.fillStyle = e.flash > 0 ? '#fff' : t.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y + bob, e.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  // 엘리트 체력 막대 (어둠 위에 그림). 보스 막대는 HUD가 그린다.
  G.drawEnemyOverlay = function (ctx, game) {
    for (const e of game._visEnemies || []) {
      if (!e.elite || e.dead) continue;
      const w = e.r * 2.2, x = e.x - w / 2, y = e.y - e.r - 16;
      ctx.fillStyle = 'rgba(8, 12, 11, 0.85)';
      ctx.fillRect(x - 1.5, y - 1.5, w + 3, 7);
      ctx.fillStyle = '#ff6b3d';
      ctx.fillRect(x, y, w * Math.max(0, e.hp / e.maxHp), 4);
    }
  };

  G.drawEnemyGlow = function (ctx, game) {
    for (const e of game._visEnemies || []) {
      if (e.dead) continue;
      if (e.boss) G.drawGlow(ctx, 'rgba(255, 80, 90, 0.45)', e.x, e.y, e.r * 2.6, 0.6);
      else if (e.elite) G.drawGlow(ctx, 'rgba(255, 90, 50, 0.5)', e.x, e.y, e.r * 2.4, 0.7);
      else if (G.ENEMY_TYPES[e.type].role === 'tank') G.drawGlow(ctx, 'rgba(255, 140, 60, 0.3)', e.x, e.y - 4, e.r * 1.2, 0.45);
    }
  };
})(window.G);
