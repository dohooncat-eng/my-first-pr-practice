// 중간 보스: 등장, 스테이지별 공격 패턴, 경고 표시, 보스 탄막, 처치 보상(상자)
(function (G) {
  'use strict';

  G.spawnBoss = function (game, index, silent) {
    const st = game.stage;
    const type = st.boss;
    const bt = G.BOSS_TYPES[type];
    const pt = G.spawnPoint(game, 40);
    const hp = bt.hp * st.hpMul * G.BOSS_HP_SCALE[Math.min(index, G.BOSS_HP_SCALE.length - 1)];
    const e = {
      id: G.nextEnemyId(), type, boss: true, index, name: bt.name,
      x: pt.x, y: pt.y, scale: 1, r: bt.r,
      hp, maxHp: hp,
      speed: bt.speed * st.speedMul,
      damage: bt.damage * st.dmgMul * (1 + index * 0.25),
      xp: 0, elite: false,
      flash: 0, kx: 0, ky: 0, slow: 0, stun: 0,
      phase: Math.random() * 10, hitUntil: {}, dead: false,
      ai: { timerA: 3, timerB: 6, mode: 'walk', t: 0 },
    };
    game.enemies.push(e);
    game.boss = e;
    if (silent) return e;
    const hasBatchim = (bt.name.charCodeAt(bt.name.length - 1) - 0xac00) % 28 !== 0;
    G.announce(game, bt.name + (hasBatchim ? '이' : '가') + ' 나타났습니다!');
    G.addShake(game, 10);
    if (G.sfx) G.sfx.play('boss');
    return e;
  };

  // ---------- 경고 표시와 보스 탄 ----------
  function telegraphCircle(game, x, y, r, delay, dmg, onEnd) {
    game.telegraphs.push({ kind: 'circle', x, y, r, life: delay, max: delay, dmg, onEnd });
  }
  function telegraphLine(game, x, y, angle, len, width, delay) {
    game.telegraphs.push({ kind: 'line', x, y, angle, len, width, life: delay, max: delay });
  }

  G.fireEnemyBullet = function (game, x, y, angle, speed, dmg, color) {
    if (game.enemyBullets.length > 300) return;
    game.enemyBullets.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 8, dmg, life: 5, color: color || 'rgba(255, 90, 90, 0.9)' });
  };

  function ring(game, e, n, speed, dmg, color, offset) {
    for (let i = 0; i < n; i++) G.fireEnemyBullet(game, e.x, e.y - 10, (offset || 0) + (i / n) * Math.PI * 2, speed, dmg, color);
  }

  // ---------- 패턴 ----------
  const PATTERNS = {
    // 고목 수호자: 부하 소환 + 뿌리 내려찍기
    treant(game, e, dt, p) {
      const ai = e.ai;
      ai.timerA -= dt;
      ai.timerB -= dt;
      if (ai.timerA <= 0) {
        ai.timerA = 6;
        const kind = game.stage.enemies.basic;
        for (let i = 0; i < 6 + e.index * 2; i++) {
          const a = (i / (6 + e.index * 2)) * Math.PI * 2;
          G.spawnEnemy(game, kind, e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70, false);
        }
      }
      if (ai.timerB <= 0) {
        ai.timerB = 8;
        const tx = p.x, ty = p.y;
        telegraphCircle(game, tx, ty, 120, 1.1, e.damage * 1.3, () => {
          G.burst(game, tx, ty, 'rgba(160, 200, 110, 0.9)', 24, 260);
          G.addShake(game, 7);
        });
      }
      return 1;
    },
    // 늪의 여왕: 플레이어 자리로 뛰어올라 내려앉으며 독 탄을 뿌린다
    marshqueen(game, e, dt, p) {
      const ai = e.ai;
      if (ai.mode === 'leap') {
        ai.t += dt;
        const k = Math.min(1, ai.t / 0.9);
        e.x = ai.sx + (ai.tx - ai.sx) * k;
        e.y = ai.sy + (ai.ty - ai.sy) * k;
        e.lift = Math.sin(k * Math.PI) * 90;
        if (k >= 1) {
          ai.mode = 'walk';
          e.lift = 0;
          ring(game, e, 10 + e.index * 4, 150, e.damage * 0.5, 'rgba(182, 227, 90, 0.95)');
          G.burst(game, e.x, e.y, 'rgba(182, 227, 90, 0.9)', 26, 260);
          G.addShake(game, 9);
        }
        return 0;
      }
      ai.timerA -= dt;
      if (ai.timerA <= 0) {
        ai.timerA = 5;
        ai.mode = 'leap';
        ai.t = 0;
        ai.sx = e.x; ai.sy = e.y;
        ai.tx = p.x; ai.ty = p.y;
        telegraphCircle(game, p.x, p.y, 110, 0.9, e.damage * 1.2);
      }
      return 1;
    },
    // 잿빛 기사: 경고선 후 돌진, 불씨 탄 원
    ashknight(game, e, dt, p) {
      const ai = e.ai;
      if (ai.mode === 'aim') {
        ai.t -= dt;
        if (ai.t <= 0) { ai.mode = 'charge'; ai.t = 0.75; }
        return 0;
      }
      if (ai.mode === 'charge') {
        ai.t -= dt;
        e.x += Math.cos(ai.angle) * 620 * dt;
        e.y += Math.sin(ai.angle) * 620 * dt;
        if (game.time % 0.1 < dt) G.burst(game, e.x, e.y, 'rgba(255, 120, 60, 0.8)', 2, 60, true);
        if (ai.t <= 0) ai.mode = 'walk';
        return 0;
      }
      ai.timerA -= dt;
      ai.timerB -= dt;
      if (ai.timerA <= 0) {
        ai.timerA = 5.5;
        ai.mode = 'aim';
        ai.t = 0.8;
        ai.angle = Math.atan2(p.y - e.y, p.x - e.x);
        telegraphLine(game, e.x, e.y, ai.angle, 470, e.r * 2, 0.8);
      }
      if (ai.timerB <= 0) {
        ai.timerB = 7;
        ring(game, e, 16 + e.index * 4, 190, e.damage * 0.55, 'rgba(255, 120, 60, 0.95)');
      }
      return 1;
    },
    // 월식의 군주: 나선 탄막과 순간 이동
    eclipse(game, e, dt, p) {
      const ai = e.ai;
      ai.timerA -= dt;
      ai.timerB -= dt;
      if (ai.mode === 'spiral') {
        ai.t -= dt;
        ai.spin = (ai.spin || 0) + dt * 2.4;
        ai.shot = (ai.shot || 0) - dt;
        if (ai.shot <= 0) {
          ai.shot = 0.16;
          const arms = 3 + e.index;
          for (let i = 0; i < arms; i++) G.fireEnemyBullet(game, e.x, e.y - 20, ai.spin + (i / arms) * Math.PI * 2, 150, e.damage * 0.5, 'rgba(190, 170, 255, 0.95)');
        }
        if (ai.t <= 0) ai.mode = 'walk';
        return 0.3;
      }
      if (ai.timerA <= 0) {
        ai.timerA = 7;
        ai.mode = 'spiral';
        ai.t = 2.6;
      }
      if (ai.timerB <= 0) {
        ai.timerB = 9;
        const a = Math.random() * Math.PI * 2;
        G.burst(game, e.x, e.y, 'rgba(190, 170, 255, 0.9)', 20, 200, true);
        e.x = p.x + Math.cos(a) * 260;
        e.y = p.y + Math.sin(a) * 260;
        G.burst(game, e.x, e.y, 'rgba(190, 170, 255, 0.9)', 20, 200, true);
      }
      return 1;
    },
  };

  G.updateBoss = function (game, e, dt) {
    const p = game.player;
    if (e.stun > 0) e.stun -= dt * 3; // 보스는 기절이 짧다
    const dx = p.x - e.x, dy = p.y - e.y;
    const d = Math.hypot(dx, dy) || 1;
    if (d > game.despawnDist * 1.4) {
      const pt = G.spawnPoint(game);
      e.x = pt.x;
      e.y = pt.y;
      return;
    }
    const move = e.stun > 0 ? 0 : PATTERNS[G.BOSS_TYPES[e.type].pattern](game, e, dt, p);
    if (move > 0) {
      const sp = e.speed * move * (e.slow > 0 ? 0.8 : 1);
      e.x += (dx / d) * sp * dt;
      e.y += (dy / d) * sp * dt;
    }
    e.x += e.kx * dt;
    e.y += e.ky * dt;
    e.kx -= e.kx * Math.min(1, dt * 9);
    e.ky -= e.ky * Math.min(1, dt * 9);
    if (!e.lift && d < e.r + p.r) G.damagePlayer(game, e.damage, e);
  };

  G.updateBossFx = function (game, dt) {
    const p = game.player;
    for (const t of game.telegraphs) {
      t.life -= dt;
      if (t.life <= 0) {
        t.dead = true;
        if (t.kind === 'circle' && t.dmg) {
          const dx = p.x - t.x, dy = p.y - t.y;
          if (dx * dx + dy * dy < (t.r + p.r) * (t.r + p.r)) G.damagePlayer(game, t.dmg);
        }
        if (t.onEnd) t.onEnd();
      }
    }
    G.compact(game.telegraphs);
    for (const b of game.enemyBullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      const dx = p.x - b.x, dy = p.y - b.y;
      if (dx * dx + dy * dy < (b.r + p.r * 0.8) * (b.r + p.r * 0.8)) {
        G.damagePlayer(game, b.dmg);
        b.dead = true;
      }
      if (b.life <= 0) b.dead = true;
    }
    G.compact(game.enemyBullets);
  };

  G.onBossKilled = function (game, e) {
    if (game.boss === e) game.boss = null;
    const st = game.stage;
    G.dropItem(game, e.x, e.y + 10, 'chest');
    G.dropItem(game, e.x + 30, e.y, 'coin', Math.round(30 * st.goldMul));
    G.dropItem(game, e.x - 30, e.y, 'heal');
    G.dropGem(game, e.x, e.y - 20, 40);
    G.burst(game, e.x, e.y, G.BOSS_TYPES[e.type].color, 50, 340);
    G.burst(game, e.x, e.y, 'rgba(255, 210, 120, 0.95)', 40, 300, true);
    G.addShake(game, 14);
    G.announce(game, e.name + ' 처치! 상자를 떨어뜨렸습니다');
    if (G.sfx) G.sfx.play('kill');
  };

  // ---------- 그리기 ----------
  G.drawTelegraphs = function (ctx, game) {
    for (const t of game.telegraphs) {
      const k = 1 - t.life / t.max;
      ctx.save();
      if (t.kind === 'circle') {
        ctx.fillStyle = 'rgba(255, 70, 70, ' + (0.08 + k * 0.14) + ')';
        ctx.strokeStyle = 'rgba(255, 90, 80, ' + (0.5 + k * 0.4) + ')';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r * k, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 90, 80, 0.18)';
        ctx.fill();
      } else {
        ctx.translate(t.x, t.y);
        ctx.rotate(t.angle);
        ctx.fillStyle = 'rgba(255, 80, 60, ' + (0.1 + k * 0.2) + ')';
        ctx.fillRect(0, -t.width / 2, t.len, t.width);
        ctx.strokeStyle = 'rgba(255, 110, 70, ' + (0.5 + k * 0.4) + ')';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, -t.width / 2, t.len, t.width);
      }
      ctx.restore();
    }
  };

  G.drawEnemyBullets = function (ctx, game) {
    for (const b of game.enemyBullets) {
      if (!G.inView(game, b.x, b.y, 30)) continue;
      ctx.fillStyle = '#fff3e6';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  };

  G.drawEnemyBulletGlow = function (ctx, game) {
    for (const b of game.enemyBullets) {
      if (G.inView(game, b.x, b.y, 30)) G.drawGlow(ctx, b.color, b.x, b.y, 22, 0.8);
    }
  };
})(window.G);
