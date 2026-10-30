// 무기 시스템 공통: 동작 등록, 스탯 적용 도우미, 적 찾기·범위 피해, 공용 투사체
// 무기 하나의 동작 = G.defineWeapon(키, { update, under, over, glow })
//   update(game, w, s, dt): s는 현재 레벨 수치(G.WEAPONS[키].levels[레벨-1])
//   적 감속: e.slow(남은 초) 동안 속도 × e.slowMul(기본 0.55)
//   under/over(ctx, game, w, s): 캐릭터 아래/위에 그리기 (월드 좌표)
//   glow(ctx, game, w, s): 어둠 위 가산 합성 빛 (월드 좌표)
//   w.state: 무기가 자유롭게 쓰는 객체 (저장되지 않음)
(function (G) {
  'use strict';

  G.WEAPON_BEHAVIORS = {};
  G.defineWeapon = function (key, behavior) { G.WEAPON_BEHAVIORS[key] = behavior; };

  G.weaponStats = function (w) {
    const levels = G.WEAPONS[w.key].levels;
    return levels[Math.min(w.level, levels.length) - 1];
  };

  G.addWeapon = function (player, key, level) {
    const w = { key, level: level || 1, timer: 0.3, state: {} };
    player.weapons.push(w);
    return w;
  };

  // ---------- 스탯 도우미 ----------
  G.cd = function (game, base) { return base * game.player.stats.cooldown; };
  // 무기 크기: 모든 범위·반지름에 G.WEAPON_SIZE를 곱한다 (화면에서 무기가 너무 크지 않게)
  G.WEAPON_SIZE = 0.8;
  G.areaMul = function (game) { return game.player.stats.area * G.WEAPON_SIZE; };
  G.area = function (game, r) { return r * G.areaMul(game); };
  // 지속 시간(덫·웅덩이·회오리 등)에 오래 타는 심지를 반영
  G.dur = function (game, t) { return t * (game.player.stats.duration || 1); };
  G.amount = function (game, n) { return n + game.player.stats.amount; };

  G.inView = function (game, x, y, margin) {
    const m = margin || 0;
    return Math.abs(x - game.cam.x) < game.viewW / 2 + m && Math.abs(y - game.cam.y) < game.viewH / 2 + m;
  };

  // ---------- 적 찾기 ----------
  const near = [];
  const projNear = [];

  // (x, y) 반경 r 안(적의 몸 반지름 포함)에 있는 살아 있는 적을 out에 담는다
  G.enemiesInCircle = function (game, x, y, r, out) {
    out.length = 0;
    game.grid.query(x, y, r + 50, near);
    for (let i = 0; i < near.length; i++) {
      const e = near[i];
      if (e.dead) continue;
      const dx = e.x - x, dy = e.y - y, rr = r + e.r;
      if (dx * dx + dy * dy <= rr * rr) out.push(e);
    }
    return out;
  };

  G.nearestEnemy = function (game, maxDist, x, y, exclude) {
    const px = x === undefined ? game.player.x : x;
    const py = y === undefined ? game.player.y : y;
    let best = null, bestD = maxDist * maxDist;
    for (const e of game.enemies) {
      if (e.dead || (exclude && exclude.indexOf(e) !== -1)) continue;
      const dx = e.x - px, dy = e.y - py;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  };

  // 화면 안의 적 중 n마리를 무작위로 (겹치지 않게)
  G.randomEnemies = function (game, n) {
    const pool = [];
    for (const e of game.enemies) if (!e.dead && G.inView(game, e.x, e.y, -20)) pool.push(e);
    G.shuffle(pool);
    return pool.slice(0, n);
  };

  // 원 안의 적 모두에게 피해. opts: { knock(바깥으로 미는 힘), soft, cdKey, cd(같은 적 재타격 간격), stun, slow(초), slowMul(속도 배율) }
  // 맞힌 적 수를 돌려준다
  const hitList = [];
  G.hitCircle = function (game, x, y, r, dmg, opts) {
    const o = opts || {};
    G.enemiesInCircle(game, x, y, r, hitList);
    let count = 0;
    for (const e of hitList) {
      if (o.cdKey) {
        if ((e.hitUntil[o.cdKey] || 0) > game.time) continue;
        e.hitUntil[o.cdKey] = game.time + (o.cd || 0.4);
      }
      let kx = 0, ky = 0;
      if (o.knock) {
        const dx = e.x - x, dy = e.y - y;
        const k = o.knock / (Math.hypot(dx, dy) || 1);
        kx = dx * k;
        ky = dy * k;
      }
      if (o.stun) e.stun = Math.max(e.stun || 0, o.stun);
      if (o.slow) {
        e.slow = Math.max(e.slow || 0, o.slow);
        if (o.slowMul) e.slowMul = Math.min(e.slowMul || 1, o.slowMul);
      }
      G.damageEnemy(game, e, dmg, kx, ky, o.soft);
      count++;
    }
    return count;
  };

  // ---------- 공용 투사체 ----------
  // p: { x, y, angle, speed, dmg, pierce, life, r, sprite, scale, spin, glow, glowR, knock,
  //      onHit(game, p, e), update(game, p, dt) }  update가 있으면 이동은 update가 맡는다
  G.fireProjectile = function (game, p) {
    const b = Object.assign({
      r: 7, pierce: 1, life: 1.5, sprite: 'bolt', scale: 1, spin: 0, knock: 0.3,
      glow: 'rgba(255, 150, 60, 0.9)', glowR: 22, hits: [], age: 0, fx: G.curFx, wkey: G.curWeaponKey,
    }, p);
    if (b.vx === undefined) {
      b.vx = Math.cos(b.angle || 0) * (b.speed || 400);
      b.vy = Math.sin(b.angle || 0) * (b.speed || 400);
    }
    if (b.angle === undefined) b.angle = Math.atan2(b.vy, b.vx);
    game.projectiles.push(b);
    G.fx.muzzle(game, b);
    return b;
  };

  G.updateProjectiles = function (game, dt) {
    for (const b of game.projectiles) {
      if (b.dead) continue;
      b.age += dt;
      if (b.update) b.update(game, b, dt);
      else {
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        if (b.life <= 0) b.dead = true;
      }
      if (b.spin) b.angle += b.spin * dt;
      if (b.dead) continue;
      // near는 onHit 안의 범위 공격(enemiesInCircle)이 덮어쓰므로 따로 쓴다
      game.grid.query(b.x, b.y, b.r + 50, projNear);
      for (const e of projNear) {
        if (e.dead || b.hits.indexOf(e.id) !== -1) continue;
        const dx = e.x - b.x, dy = e.y - b.y;
        if (dx * dx + dy * dy > (e.r + b.r) * (e.r + b.r)) continue;
        b.hits.push(e.id);
        G.curFx = b.fx;
        G.curWeaponKey = b.wkey;
        G.damageEnemy(game, e, b.dmg, b.vx * b.knock, b.vy * b.knock);
        if (b.onHit) b.onHit(game, b, e);
        G.curFx = null;
        G.curWeaponKey = null;
        if (--b.pierce <= 0) { b.dead = true; break; }
      }
    }
    G.compact(game.projectiles);
  };

  G.drawProjectiles = function (ctx, game) {
    for (const b of game.projectiles) {
      if (!G.inView(game, b.x, b.y, 60)) continue;
      G.fx.trail(ctx, game, b.x, b.y, b.vx, b.vy, Math.hypot(b.vx, b.vy), G.fx.family(b.wkey), 0.55);
      const spr = b.sprite && G.art.get(b.sprite);
      if (spr) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);
        if (b.alpha !== undefined) ctx.globalAlpha = b.alpha;
        G.drawSprite(ctx, spr, 0, 0, b.scale, false, 0);
        ctx.restore();
      } else {
        ctx.fillStyle = '#ffd27a';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  G.drawProjectileGlow = function (ctx, game) {
    if (game.fx.low) return;
    for (const b of game.projectiles) {
      if (b.glow && G.inView(game, b.x, b.y, 60)) G.drawGlow(ctx, b.glow, b.x, b.y, b.glowR * b.scale, 0.7);
    }
  };

  // 은빛 검기 그림 (검·월광검·쌍월이 함께 쓴다). t: 0→1 진행도
  G.drawSlash = function (ctx, x, y, angle, range, t, tint) {
    const spr = G.art.get('slash');
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle - 0.35 + t * 0.7);
    ctx.globalAlpha = Math.min(1, (1 - t) * 1.6);
    if (spr) {
      const size = (range / (118 / 256)) * (0.88 + t * 0.14);
      ctx.drawImage(spr.img, -size / 2, -size / 2, size, size);
      if (tint) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha *= 0.5;
        ctx.drawImage(spr.img, -size / 2, -size / 2, size, size);
      }
    } else {
      ctx.strokeStyle = tint || '#e6f0ff';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(0, 0, range * 0.85, -1, 1);
      ctx.stroke();
    }
    ctx.restore();
  };

  // ---------- 매 프레임 ----------
  // 무기마다 다른 발사음: 진화·조합 무기는 재료(첫 재료) 무기의 소리를 낮고 크게 쓴다
  function soundOf(key) {
    const def = G.WEAPONS[key];
    const fam = def.kind === 'base' ? key : Array.isArray(def.from) ? def.from[0] : def.from;
    return 'w_' + fam + (def.kind === 'base' ? '' : '_big');
  }

  G.updateWeapons = function (game, dt) {
    game.fxBudget = 60; // 폭발·연쇄 효과는 한 프레임에 이만큼까지
    for (const w of game.player.weapons) {
      const b = G.WEAPON_BEHAVIORS[w.key];
      if (!b || !b.update) continue;
      const name = soundOf(w.key);
      const own = G.sfx && G.sfx.names.indexOf(name) !== -1;
      const before = w.timer;
      const s = G.weaponStats(w);
      if (own) G.sfx.muted = true;
      G.curFx = s.fx || null;
      G.curWeaponKey = w.key;
      b.update(game, w, s, dt);
      G.curFx = null;
      G.curWeaponKey = null;
      if (own) G.sfx.muted = false;
      // 쿨다운이 다시 채워졌으면 = 방금 쐈다
      if (own && w.timer > before + 0.02) G.sfx.play(name);
    }
  };

  function drawPass(pass) {
    return function (ctx, game) {
      for (const w of game.player.weapons) {
        const b = G.WEAPON_BEHAVIORS[w.key];
        if (b && b[pass]) b[pass](ctx, game, w, G.weaponStats(w));
      }
    };
  }
  G.drawWeaponsUnder = drawPass('under');
  G.drawWeaponsOver = drawPass('over');
  G.drawWeaponGlow = drawPass('glow');
})(window.G);
