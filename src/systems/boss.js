// 보스: 등장, 스테이지별 공격 패턴 + 공통 패턴(부채꼴·원형 탄·장판 비·소환), 체력에 따른 단계, 경고 표시, 보스 탄막, 처치 보상
// index 0·1 = 중간 보스, index 2 = 최종 보스(e.final)
(function (G) {
  'use strict';

  G.spawnBoss = function (game, index, silent) {
    const st = game.stage;
    const type = st.boss;
    const bt = G.BOSS_TYPES[type];
    const pt = G.spawnPoint(game, 40);
    const diff = game.difficulty || G.DIFFICULTIES[0];
    const hp = bt.hp * st.hpMul * diff.bossHp * G.BOSS_HP_SCALE[Math.min(index, G.BOSS_HP_SCALE.length - 1)];
    const final = index >= 2;
    const e = {
      id: G.nextEnemyId(), type, boss: true, index, final, name: (final ? '최종 보스 · ' : '') + bt.name,
      x: pt.x, y: pt.y, r: bt.r * (final ? 1.3 : 1),
      hp, maxHp: hp,
      speed: bt.speed * st.speedMul * diff.speed * (final ? 1.1 : 1),
      scale: final ? 1.35 : 1,
      damage: bt.damage * st.dmgMul * diff.dmg * (1 + index * 0.25),
      xp: 0, elite: false,
      flash: 0, kx: 0, ky: 0, slow: 0, stun: 0,
      phase: Math.random() * 10, hitUntil: {}, dead: false,
      ai: { timerA: 3, timerB: 6, mode: 'walk', t: 0 },
      // 공통 패턴: 중간 보스 1·2개, 최종 보스 4개. 처음 쿨다운은 엇갈리게
      extras: EXTRA_SETS[Math.min(index, 2)].map((k, i) => ({ k, cd: 2.5 + i * 1.7 })),
      stage: 0,
    };
    game.enemies.push(e);
    game.boss = e;
    if (silent) return e;
    const hasBatchim = (bt.name.charCodeAt(bt.name.length - 1) - 0xac00) % 28 !== 0;
    G.announce(game, final ? bt.name + (hasBatchim ? '이' : '가') + ' 깨어났습니다! 쓰러뜨리면 새벽이 옵니다' : bt.name + (hasBatchim ? '이' : '가') + ' 나타났습니다!');
    G.addShake(game, 10);
    G.screenFlash(game, '200, 40, 50', 0.28, 0.9);
    G.ring(game, e.x, e.y, 20, 260, 0.9, 'rgba(255, 80, 80, 0.9)', 6);
    if (G.sfx) G.sfx.play('boss');
    return e;
  };

  // ---------- 경고 표시와 보스 탄 ----------
  function telegraphCircle(game, x, y, r, delay, dmg, onEnd) {
    game.telegraphs.push({ kind: 'circle', x, y, r, life: delay, max: delay, dmg, onEnd });
    if (G.sfx) G.sfx.play('warn');
  }
  function telegraphLine(game, x, y, angle, len, width, delay) {
    game.telegraphs.push({ kind: 'line', x, y, angle, len, width, life: delay, max: delay });
    if (G.sfx) G.sfx.play('warn');
  }

  G.fireEnemyBullet = function (game, x, y, angle, speed, dmg, color) {
    if (game.enemyBullets.length > 300) return;
    game.enemyBullets.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 8, dmg, life: 5, color: color || 'rgba(255, 90, 90, 0.95)' });
  };

  function ring(game, e, n, speed, dmg, color, offset) {
    for (let i = 0; i < n; i++) G.fireEnemyBullet(game, e.x, e.y - 10, (offset || 0) + (i / n) * Math.PI * 2, speed, dmg, color);
    if (G.sfx) G.sfx.play('bossShot');
  }

  // ---------- 공통 패턴 (돌려주는 값 = 다음까지 걸리는 초) ----------
  const EXTRA_SETS = [['aimed'], ['aimed', 'nova'], ['aimed', 'nova', 'rain', 'summon']];
  const EXTRAS = {
    // 부채꼴 조준 탄
    aimed(game, e, p) {
      const n = e.final ? 7 : 5;
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      for (let i = 0; i < n; i++) G.fireEnemyBullet(game, e.x, e.y - 10, a + (i - (n - 1) / 2) * 0.15, 240, e.damage * 0.45, 'rgba(255, 150, 70, 0.95)');
      if (G.sfx) G.sfx.play('bossShot');
      return 3.6;
    },
    // 사방 원형 탄
    nova(game, e) {
      ring(game, e, 16 + e.index * 4, 175, e.damage * 0.45, 'rgba(255, 90, 120, 0.95)', Math.random() * 6);
      return 6.5;
    },
    // 플레이어 주위에 떨어지는 장판
    rain(game, e, p) {
      for (let i = 0; i < 5; i++) {
        const x = p.x + G.rand(-170, 170), y = p.y + G.rand(-170, 170);
        telegraphCircle(game, x, y, 62, 1.1 + i * 0.12, e.damage * 0.9, () => G.burst(game, x, y, 'rgba(255, 120, 90, 0.9)', 10, 200));
      }
      return 8;
    },
    // 빠른 부하를 둥글게 부른다
    summon(game, e) {
      const kind = game.stage.enemies.fast;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        G.spawnEnemy(game, kind, e.x + Math.cos(a) * 90, e.y + Math.sin(a) * 90, false);
      }
      return 11;
    },
  };

  // 체력 단계: 최종 보스는 50%·25%, 중간 보스는 50%에서 빨라진다
  function bossTempo(game, e) {
    const k = e.hp / e.maxHp;
    const stage = k < 0.25 && e.final ? 2 : k < 0.5 ? 1 : 0;
    if (stage > e.stage) {
      e.stage = stage;
      const bt = G.BOSS_TYPES[e.type];
      G.announce(game, bt.name + (stage === 2 ? '이(가) 마지막 힘을 끌어냅니다!' : '이(가) 분노합니다!'));
      G.screenFlash(game, '200, 40, 50', 0.25, 0.7);
      G.addShake(game, 9);
      if (G.sfx) G.sfx.play('elite');
    }
    return [1, 1.35, 1.75][e.stage];
  }

  // ---------- 스테이지 보스 고유 패턴 ----------
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
        telegraphCircle(game, tx, ty, 85, 1.2, e.damage * 1.3, () => {
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
        const k = Math.min(1, ai.t / 1.0);
        e.x = ai.sx + (ai.tx - ai.sx) * k;
        e.y = ai.sy + (ai.ty - ai.sy) * k;
        e.lift = Math.sin(k * Math.PI) * 90;
        if (k >= 1) {
          ai.mode = 'walk';
          e.lift = 0;
          ring(game, e, 8 + e.index * 3, 150, e.damage * 0.5, 'rgba(182, 227, 90, 0.95)');
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
        telegraphCircle(game, p.x, p.y, 80, 1.0, e.damage * 1.2);
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
        if (ai.t <= 0) { ai.mode = 'recover'; ai.t = 0.9; }
        return 0;
      }
      // 돌진 뒤 잠깐 멈춰 숨을 고른다 (그 사이 거리를 벌릴 수 있게)
      if (ai.mode === 'recover') {
        ai.t -= dt;
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
        ring(game, e, 12 + e.index * 3, 190, e.damage * 0.55, 'rgba(255, 120, 60, 0.95)');
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
          ai.shot = 0.2;
          const arms = 2 + e.index;
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
    const tempo = bossTempo(game, e);
    const move = e.stun > 0 ? 0 : PATTERNS[G.BOSS_TYPES[e.type].pattern](game, e, dt * tempo, p);
    if (e.stun <= 0 && !e.lift) {
      for (const x of e.extras || []) {
        x.cd -= dt * tempo;
        if (x.cd <= 0) x.cd = EXTRAS[x.k](game, e, p);
      }
    }
    if (move > 0) {
      const sp = e.speed * move * (e.slow > 0 ? 0.8 : 1) * (1 + (tempo - 1) * 0.5);
      e.x += (dx / d) * sp * dt;
      e.y += (dy / d) * sp * dt;
    }
    e.x += e.kx * dt;
    e.y += e.ky * dt;
    if (!e.lift) G.mapConstrain(game, e, e.r * 0.6);
    e.kx -= e.kx * Math.min(1, dt * 9);
    e.ky -= e.ky * Math.min(1, dt * 9);
    // 몸통 판정은 그림보다 조금 작게 (스치기만 해도 맞지 않게)
    if (!e.lift && d < e.r * 0.75 + p.r) G.damagePlayer(game, e.damage, e);
  };

  G.updateBossFx = function (game, dt) {
    const p = game.player;
    for (const t of game.telegraphs) {
      t.life -= dt;
      if (t.life <= 0) {
        t.dead = true;
        if (t.kind === 'circle') G.ring(game, t.x, t.y, t.r * 0.3, t.r * 1.15, 0.35, 'rgba(255, 120, 90, 0.85)', 5);
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
    if (e.final) game.finalBossDown = true;
    const st = game.stage;
    if (!e.final) G.dropItem(game, e.x, e.y + 10, 'chest', 'boss');
    G.dropItem(game, e.x + 30, e.y, 'coin', Math.round(30 * st.goldMul));
    G.dropItem(game, e.x - 30, e.y, 'heal');
    G.dropGem(game, e.x, e.y - 20, 40);
    G.burst(game, e.x, e.y, G.BOSS_TYPES[e.type].color, 50, 340);
    G.burst(game, e.x, e.y, 'rgba(255, 210, 120, 0.95)', 40, 300, true);
    G.addShake(game, 14);
    G.screenFlash(game, '255, 240, 210', 0.45, 0.6);
    G.ring(game, e.x, e.y, 20, 340, 0.8, 'rgba(255, 220, 150, 0.95)', 8);
    G.ring(game, e.x, e.y, 10, 200, 0.6, 'rgba(255, 255, 240, 0.9)', 4);
    G.announce(game, e.final ? '새벽이 밝아옵니다!' : e.name + ' 처치! 상자를 떨어뜨렸습니다');
    if (G.sfx) G.sfx.play('bossDie');
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
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r + 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#1a0306';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = '#fff6ee';
      ctx.fill();
    }
  };

  G.drawEnemyBulletGlow = function (ctx, game) {
    for (const b of game.enemyBullets) {
      if (G.inView(game, b.x, b.y, 30)) G.drawGlow(ctx, b.color, b.x, b.y, 30, 0.9);
    }
  };
})(window.G);
