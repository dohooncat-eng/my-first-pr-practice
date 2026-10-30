// 적: 생성(스테이지 배율 적용), 추적 이동, 피해·치명타·처치, 그리기. 중간 보스도 같은 목록에 들어간다(e.boss).
(function (G) {
  'use strict';

  let nextId = 1;
  const near = [];

  function stage(game) { return game.stage || G.STAGES[0]; }

  G.spawnEnemy = function (game, type, x, y, elite) {
    const t = G.ENEMY_TYPES[type];
    const st = stage(game);
    const minutes = G.curveTime(game) / 60;
    const scale = elite ? 1.8 : 1;
    // 체력 배율: 5분 3.3배 · 10분 11배 · 15분 26배 · 20분 51배 (예전보다 약 40% 낮추고 수·속도로 대신 어렵게)
    const growth = (0.06 * minutes + 0.065 * minutes * minutes + 0.003 * minutes * minutes * minutes) * st.growth;
    const diff = game.difficulty || G.DIFFICULTIES[0];
    // 난이도 체력 배율은 처음엔 1/4만 걸리고 8분에 걸쳐 끝까지 오른다 (첫 무기로도 시작할 수 있게)
    const diffHp = 1 + (diff.hp - 1) * (0.25 + 0.75 * Math.min(1, minutes / 8));
    const hp = t.hp * st.hpMul * diffHp * (1 + growth) * (elite ? 14 : 1);
    const e = {
      id: nextId++, type, x, y, scale,
      r: t.r * scale,
      hp, maxHp: hp,
      speed: t.speed * st.speedMul * diff.speed * (1 + Math.min(0.6, minutes * 0.03)) * (elite ? 0.85 : 1),
      damage: t.damage * st.dmgMul * diff.dmg * (1 + minutes * 0.09) * (elite ? 1.6 : 1),
      xp: elite ? 25 : t.xp,
      elite: !!elite,
      flash: 0, kx: 0, ky: 0, slow: 0, stun: 0,
      phase: Math.random() * 10,
      hitUntil: {},
      dead: false,
    };
    G.mapConstrain(game, e, e.r);
    game.enemies.push(e);
    return e;
  };

  G.nextEnemyId = function () { return nextId++; };

  // 화면 바로 바깥 무작위 지점
  G.spawnPoint = function (game, extra) {
    const a = Math.random() * Math.PI * 2;
    const d = game.viewRadius + 40 + (extra || 0);
    return G.mapSpawnPoint(game, { x: game.player.x + Math.cos(a) * d, y: game.player.y + Math.sin(a) * d });
  };

  // 피해를 주고, 처치했으면 true. soft: 지속 피해(번쩍임 없음, 작은 숫자)
  G.damageEnemy = function (game, e, base, kx, ky, soft) {
    if (e.dead) return false;
    const s = game.player.stats;
    let dmg = base * s.damage * G.rand(0.9, 1.1) * (G.heroDmgMul ? G.heroDmgMul(game, e) : 1);
    // 분노의 불씨: 체력이 절반 아래면 피해 증가
    if (s.rage > 0 && game.player.hp < game.player.maxHp * 0.5) dmg *= 1 + s.rage;
    const crit = !soft && Math.random() < s.crit;
    if (crit) dmg *= s.critMult;
    dmg = Math.max(1, Math.round(dmg));
    e.hp -= dmg;
    if (!soft) e.flash = 0.1;
    const resist = e.boss ? 0.05 : e.elite ? 0.2 : G.ENEMY_TYPES[e.type] && G.ENEMY_TYPES[e.type].role === 'tank' ? 0.45 : 1;
    e.kx += (kx || 0) * resist;
    e.ky += (ky || 0) * resist;
    G.addDamageNumber(game, e.x, e.y - e.r - 4, dmg, crit ? 'crit' : soft ? 'soft' : dmg >= 30 ? 'big' : '');
    G.fx.hit(game, e, dmg, crit, kx, ky, soft);
    // 무기 갈래·조합의 맞힐 때 효과 (처형으로 이미 쓰러졌으면 끝)
    if (G.curFx && G.applyHitFx) {
      G.applyHitFx(game, e, dmg, G.curFx);
      if (e.dead) return true;
    }
    // 영웅의 "모든 무기에" 효과
    if (G.curWeaponKey && G.applyHitFx && G.hasGlobalFx(s)) {
      G.applyHitFx(game, e, dmg, s.globalFx);
      if (e.dead) return true;
    }
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
    G.fx.death(game, e);
    if (e.boss) { G.onBossKilled(game, e); return; }
    const t = G.ENEMY_TYPES[e.type];
    const gemScale = 1 + Math.floor(G.curveTime(game) / 180) * 0.25;
    G.dropGem(game, e.x, e.y, e.xp * gemScale);
    if (!G.fx.low(game)) G.burst(game, e.x, e.y, t.color, e.elite ? 8 : 2, e.elite ? 140 : 70);
    if (G.sfx) G.sfx.play(e.elite || G.ENEMY_TYPES[e.type].role === 'tank' ? 'killBig' : 'kill');
    if (e.elite) {
      G.burst(game, e.x, e.y, 'rgba(255, 150, 70, 0.9)', 16, 220, true);
      if (Math.random() < 0.3) G.dropItem(game, e.x + 14, e.y, 'heal');
      G.dropItem(game, e.x - 14, e.y, 'coin', 5);
      // 엘리트는 항상 상자를 떨어뜨린다
      G.dropItem(game, e.x, e.y + 16, 'chest', 'elite');
      G.addShake(game, 8);
    } else {
      const r = Math.random();
      // 약초는 아주 드물게 (0.06%)
      if (r < 0.003) G.dropItem(game, e.x, e.y, 'magnet');
      else if (r < 0.0036) G.dropItem(game, e.x, e.y, 'heal');
      else if (r < 0.0186) G.dropItem(game, e.x, e.y, 'coin', 1);
    }
    if (game.onKill) game.onKill(e);
  };

  // 원거리 적: 사거리 밖이면 다가가고, 너무 가까우면 물러난다. 사거리 안에서 0.6초 조준(빨간 선) 뒤 그 방향으로 한 발
  const AIM = 0.6;
  function rangedAi(game, e, t, d, dt, setMove) {
    const p = game.player;
    setMove(d > t.range + 30 ? 1 : d < t.range - 70 ? -0.8 : 0.15);
    if (e.shot === undefined) e.shot = G.rand(1, t.cd);
    e.shot -= dt;
    if (!e.aiming && d > t.range + 90 && e.shot < AIM) e.shot = AIM; // 사거리 밖에서는 장전만 하고 기다린다
    if (!e.aiming && e.shot <= AIM) {
      e.aiming = true;
      e.aimA = Math.atan2(p.y - e.y, p.x - e.x);
      if (game.telegraphs.length < 80) game.telegraphs.push({ kind: 'line', x: e.x, y: e.y, angle: e.aimA, len: Math.min(d + 60, t.range + 120), width: 5, life: AIM, max: AIM });
    }
    if (e.aiming) {
      setMove(0);
      if (e.shot <= 0) {
        e.aiming = false;
        e.shot = t.cd * G.rand(0.85, 1.15);
        G.fireEnemyBullet(game, e.x, e.y - 14, e.aimA, 230, e.damage, t.shot);
      }
    }
  }

  G.updateEnemies = function (game, dt) {
    const p = game.player;
    const grid = game.grid;
    const tick = game._sepTick = ((game._sepTick || 0) + 1) & 1;
    const sepRange = game.viewRadius + 80;
    const mapOn = !!(game.stage.map && game.stage.map.type !== 'open');
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
        if (t.range) rangedAi(game, e, t, d, dt, (k) => { vx *= k; vy *= k; });
      }

      // 서로 겹치지 않게 밀어내기: 화면 근처 적만, 한 마리마다 2프레임에 한 번 계산하고 사이 프레임은 앞의 값을 쓴다
      if (d > sepRange) {
        e.sx = 0;
        e.sy = 0;
      } else if ((e.id & 1) === tick || e.sx === undefined) {
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
        e.sx = sx;
        e.sy = sy;
      }
      const sepK = e.elite ? 25 : 70;
      vx += e.sx * sepK;
      vy += e.sy * sepK;

      e.x += (vx + e.kx) * dt;
      e.y += (vy + e.ky) * dt;
      if (mapOn) G.mapConstrain(game, e, e.r * 0.8);
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
  function depth(a, b) { return a.y - b.y; }

  G.drawEnemies = function (ctx, game) {
    const p = game.player;
    const vis = game._visEnemies || (game._visEnemies = []);
    vis.length = 0;
    for (const e of game.enemies) if (!e.dead && inView(game, e)) vis.push(e);
    vis.sort(depth);

    for (const e of vis) {
      const sp = spec(e);
      if (e.elite || e.boss) {
        const pulse = game.fx.quiet ? 0.75 : 0.7 + Math.sin(game.fx.anim * 4 + e.phase) * 0.15;
        ctx.strokeStyle = e.boss ? 'rgba(255, 70, 90, ' + pulse + ')' : 'rgba(255, 107, 61, ' + pulse + ')';
        ctx.lineWidth = e.boss ? 3.5 : 2.5;
        ctx.beginPath();
        ctx.ellipse(e.x, e.y + sp.feet * e.scale, e.r * 1.25, e.r * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      const frame = Math.floor(game.fx.anim * sp.fps + e.phase) % 4;
      let spr = G.art.get(spriteName(e), frame);
      if (spr && (!game.fx.low || e.elite || e.boss)) spr = G.unitSprite(spr, sp);
      const bob = sp.fly && !game.fx.quiet ? Math.sin(game.fx.anim * 4 + e.phase) * 3 : 0;
      const stunWobble = e.stun > 0 && !game.fx.quiet ? Math.sin(game.fx.anim * 30) * 1.2 : 0;
      if (spr) {
        const age = e.fxHit === undefined ? 1 : game.fx.real - e.fxHit;
        const hit = Math.max(0, 1 - age / 0.15), squash = game.fx.quiet ? 0 : hit * (e.boss ? 0.045 : 0.12);
        const recoil = game.fx.quiet ? 0 : Math.sin(Math.min(1, age / 0.15) * Math.PI) * (e.boss ? 1.5 : 4);
        const flash = age < 0.065 ? (1 - age / 0.065) * (game.fx.quiet ? 0.35 : 0.92) : 0;
        G.drawSprite(ctx, spr, e.x + stunWobble + (e.fxDX || 0) * recoil,
          e.y + sp.feet * e.scale + bob - (e.lift || 0) + (e.fxDY || 0) * recoil,
          e.scale, p.x < e.x, flash, 1 + squash, 1 - squash);
      } else {
        const t = e.boss ? G.BOSS_TYPES[e.type] : G.ENEMY_TYPES[e.type];
        if (!game.fx.low || e.elite || e.boss) G.fx.shadow(ctx, e.x, e.y + sp.feet * e.scale, sp.shadow * e.scale);
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
      else if (!game.fx.low && G.ENEMY_TYPES[e.type].role === 'tank' && (e.id & 1) === 0) G.drawGlow(ctx, 'rgba(255, 140, 60, 0.3)', e.x, e.y - 4, e.r * 1.2, 0.3);
    }
  };
})(window.G);
