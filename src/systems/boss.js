// 보스: 등장, 스테이지별 공격 패턴 + 공통 패턴(부채꼴·원형 탄·장판 비·소환), 체력에 따른 단계, 경고 표시, 보스 탄막, 처치 보상
// index 0·1 = 중간 보스, index 2 = 최종 보스(e.final)
(function (G) {
  'use strict';

  // 전장을 비운다: 잡몹은 보상 없이 흩어지고, 적 탄과 경고도 사라진다
  function clearField(game) {
    let shown = 0;
    for (const m of game.enemies) {
      if (m.dead || m.boss) continue;
      m.dead = true;
      if (shown++ < 30 && G.inView(game, m.x, m.y, 40)) G.burst(game, m.x, m.y, G.ENEMY_TYPES[m.type].color, 3, 110);
    }
    game.enemyBullets.length = 0;
    game.telegraphs.length = 0;
  }

  G.spawnBoss = function (game, index, silent) {
    const st = game.stage;
    const type = st.boss;
    const bt = G.BOSS_TYPES[type];
    const pt = G.spawnPoint(game, 40);
    const diff = game.difficulty || G.DIFFICULTIES[0];
    const hp = bt.hp * st.hpMul * diff.bossHp * G.BOSS_HP_SCALE[Math.min(index, G.BOSS_HP_SCALE.length - 1)];
    const final = index >= 2;
    if (!silent) clearField(game);
    const e = {
      id: G.nextEnemyId(), type, boss: true, index, final, name: (final ? '최종 보스 · ' : '') + bt.name,
      x: pt.x, y: pt.y, r: bt.r * (final ? 1.5 : 1.15),
      hp, maxHp: hp,
      speed: bt.speed * st.speedMul * diff.speed * (final ? 1.1 : 1),
      scale: final ? 1.6 : 1.25,
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
    G.fx.boss(game, e);
    G.beginBossIntro(game, e);
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

  // reach: 이 거리만큼 날아가면 사라진다 (없으면 5초 동안)
  G.fireEnemyBullet = function (game, x, y, angle, speed, dmg, color, reach) {
    if (game.enemyBullets.length > 300) return;
    game.enemyBullets.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 8, dmg, life: reach ? reach / speed : 5, color: color || 'rgba(255, 90, 90, 0.95)' });
  };

  function ring(game, e, n, speed, dmg, color, offset) {
    G.bossCue(game, e, 'nova', true);
    for (let i = 0; i < n; i++) G.fireEnemyBullet(game, e.x, e.y - 10, (offset || 0) + (i / n) * Math.PI * 2, speed, dmg, color);
    if (G.sfx) G.sfx.play('bossShot');
  }

  // ---------- 공통 패턴 (돌려주는 값 = 다음까지 걸리는 초) ----------
  const EXTRA_SETS = [['aimed'], ['aimed', 'nova'], ['aimed', 'nova', 'rain', 'summon']];
  const EXTRAS = {
    // 부채꼴 조준 탄
    aimed(game, e, p) {
      G.bossCue(game, e, 'aimed', true);
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
      G.bossCue(game, e, 'rain', true);
      for (let i = 0; i < 5; i++) {
        const x = p.x + G.rand(-170, 170), y = p.y + G.rand(-170, 170);
        telegraphCircle(game, x, y, 62, 1.1 + i * 0.12, e.damage * 0.9, () => G.burst(game, x, y, 'rgba(255, 120, 90, 0.9)', 10, 200));
      }
      return 8;
    },
    // 빠른 부하를 둥글게 부른다
    summon(game, e) {
      G.bossCue(game, e, 'summon', true);
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
      e.rageLife = 1.6;
      G.bossCue(game, e, 'nova', true);
      G.announce(game, stage === 2 ? '최후의 격노 · 패턴 가속' : '분노 · 패턴 가속');
      G.screenFlash(game, '235, 170, 110', 0.16, 0.55);
      G.addShake(game, 9);
      if (G.sfx) G.sfx.play('bossRage');
    }
    return [1, 1.35, 1.75][e.stage];
  }

  // ---------- 스테이지 보스 고유 패턴 ----------
  // 부채꼴로 탄을 뿌린다 (가운데가 플레이어 쪽)
  function cone(game, e, p, n, spread, speed, dmg, color) {
    G.bossCue(game, e, 'aimed', true);
    const a = Math.atan2(p.y - e.y, p.x - e.x);
    for (let i = 0; i < n; i++) G.fireEnemyBullet(game, e.x, e.y - 10, a + (i / (n - 1) - 0.5) * spread, speed * G.rand(0.9, 1.1), dmg, color);
    if (G.sfx) G.sfx.play('bossShot');
  }
  const PATTERNS = {
    // 겨울 아귀: 경고선 뒤 얼음 숨결(넓은 부채꼴), 그리고 돌진
    frostbreath(game, e, dt, p) {
      const ai = e.ai;
      if (ai.mode === 'breath') {
        ai.t -= dt;
        ai.shot = (ai.shot || 0) - dt;
        if (ai.shot <= 0) { ai.shot = 0.12; cone(game, e, p, 3, 1.1, 260, e.damage * 0.4, 'rgba(180, 230, 255, 0.95)'); }
        if (ai.t <= 0) ai.mode = 'walk';
        return 0;
      }
      if (ai.mode === 'charge') {
        ai.t -= dt;
        e.x += Math.cos(ai.angle) * 560 * dt;
        e.y += Math.sin(ai.angle) * 560 * dt;
        if (ai.t <= 0) ai.mode = 'walk';
        return 0;
      }
      ai.timerA -= dt;
      ai.timerB -= dt;
      if (ai.timerA <= 0) { ai.timerA = 6; ai.mode = 'breath'; ai.t = 1.2; telegraphLine(game, e.x, e.y, Math.atan2(p.y - e.y, p.x - e.x), 360, 120, 0.5); }
      else if (ai.timerB <= 0) {
        ai.timerB = 7.5;
        ai.angle = Math.atan2(p.y - e.y, p.x - e.x);
        telegraphLine(game, e.x, e.y, ai.angle, 440, e.r * 2, 0.7);
        ai.mode = 'aimc'; ai.t = 0.7;
      }
      if (ai.mode === 'aimc') { ai.t -= dt; if (ai.t <= 0) { ai.mode = 'charge'; ai.t = 0.7; } return 0; }
      return 1;
    },
    // 대장간 심장: 플레이어 주위에 쇳물 장판을 떨어뜨리고, 불씨 부하를 부른다
    forge(game, e, dt, p) {
      const ai = e.ai;
      ai.timerA -= dt;
      ai.timerB -= dt;
      if (ai.timerA <= 0) {
        ai.timerA = 5;
        for (let i = 0; i < 4; i++) {
          const x = p.x + G.rand(-130, 130), y = p.y + G.rand(-130, 130);
          telegraphCircle(game, x, y, 70, 1.0 + i * 0.15, e.damage, () => {
            G.burst(game, x, y, 'rgba(255, 140, 60, 0.95)', 16, 240, true);
            for (let k = 0; k < 6; k++) G.fireEnemyBullet(game, x, y, (k / 6) * Math.PI * 2, 150, e.damage * 0.35, 'rgba(255, 150, 60, 0.95)');
          });
        }
      }
      if (ai.timerB <= 0) {
        ai.timerB = 9;
        const kind = game.stage.enemies.basic;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          G.spawnEnemy(game, kind, e.x + Math.cos(a) * 80, e.y + Math.sin(a) * 80, false);
        }
      }
      return 0.8;
    },
    // 시든 여왕: 플레이어를 가로지르는 가시 줄 여러 개(경고 뒤 탄이 줄을 따라 솟음)
    thorns(game, e, dt, p) {
      const ai = e.ai;
      ai.timerA -= dt;
      if (ai.timerA <= 0) {
        ai.timerA = 5.5;
        const base = Math.random() * Math.PI;
        for (let i = 0; i < 3; i++) {
          const a = base + (i / 3) * Math.PI;
          const sx = p.x - Math.cos(a) * 260, sy = p.y - Math.sin(a) * 260;
          // 경고가 끝나는 순간(게임 시간 기준) 줄을 따라 가시가 솟는다
          game.telegraphs.push({ kind: 'line', x: sx, y: sy, angle: a, len: 520, width: 34, life: 0.9, max: 0.9, onEnd: () => {
            for (let k = 0; k <= 10; k++) {
              const x = sx + Math.cos(a) * 52 * k, y = sy + Math.sin(a) * 52 * k;
              const dx = p.x - x, dy = p.y - y;
              if (dx * dx + dy * dy < 30 * 30) G.damagePlayer(game, e.damage * 0.8);
              if (game.particles.length < 250) G.burst(game, x, y, 'rgba(200, 140, 255, 0.9)', 3, 120);
            }
          } });
        }
      }
      return 1;
    },
    // 끝없는 밤: 가시 줄 + 나선 탄막 + 순간 이동을 번갈아
    nightfall(game, e, dt, p) {
      const ai = e.ai;
      ai.phaseT = (ai.phaseT || 0) + dt;
      const which = Math.floor(ai.phaseT / 9) % 3;
      if (which === 0) return PATTERNS.thorns(game, e, dt, p);
      if (which === 1) return PATTERNS.eclipse(game, e, dt, p);
      return PATTERNS.frostbreath(game, e, dt, p);
    },
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
        if (game.clock % 0.1 < dt) G.burst(game, e.x, e.y, 'rgba(255, 120, 60, 0.8)', 2, 60, true);
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
    // 기존 쿨다운의 끝만 읽어 예고 자세를 만든다. 발사 시각과 탄 수에는 관여하지 않는다.
    const modeBefore = e.ai.mode, timerA = e.ai.timerA, timerB = e.ai.timerB;
    if (e.ai.mode === 'walk') {
      const next = Math.min(timerA, timerB);
      if (next > 0 && next < 0.55 * tempo && !e.cuePreparing) {
        e.cuePreparing = true; G.bossCue(game, e, 'gather', false);
      }
      if (next > tempo) e.cuePreparing = false;
    }
    const move = e.stun > 0 ? 0 : PATTERNS[G.BOSS_TYPES[e.type].pattern](game, e, dt * tempo, p);
    if (e.ai.mode !== modeBefore) G.bossCue(game, e, e.ai.mode === 'charge' ? 'charge' : e.ai.mode, e.ai.mode !== 'aim' && e.ai.mode !== 'aimc');
    else if (e.ai.timerA > timerA || e.ai.timerB > timerB) G.bossCue(game, e, 'cast', true);
    if (e.stun <= 0 && !e.lift) {
      for (const x of e.extras || []) {
        if (!x.cue && x.cd > 0 && x.cd <= 0.55 * tempo) { x.cue = true; G.bossCue(game, e, x.k, false); }
        x.cd -= dt * tempo;
        if (x.cd <= 0) { x.cd = EXTRAS[x.k](game, e, p); x.cue = false; }
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

  // 보스 쓰러짐: 몸을 떨며 곳곳이 터지고, 마지막에 크게 터지며 보상을 떨어뜨린다
  // shortcut: 연출 도중 앱을 끄면 중간 보스 상자가 사라진다. 저장 형식을 늘릴 만큼 잦지 않아 그대로 둔다.
  G.onBossKilled = function (game, e) {
    if (game.boss === e) game.boss = null;
    if (e.final) game.finalBossDown = true; // 저장돼도 이어하면 바로 클리어로 끝나게 먼저 표시한다
    clearField(game);
    game.banner = null;
    for (const n of game.numbers) n.life = 0; // 효과 풀로 정상 반납되도록 수명만 끝낸다
    const sp = G.BOSS_SPRITE;
    game.bossIntro = null;
    G.syncBossIntro(game);
    if (!game.defeatedBosses) game.defeatedBosses = [];
    game.defeatedBosses.push({ type: e.type, index: e.index, final: e.final });
    game.bossDeath = { e, t: 0, max: G.fx.quiet(game) ? 1.15 : e.final ? 3.6 : 2.8, next: 0, feet: sp.feet * e.scale, frame: Math.floor(game.fx.anim * sp.fps + e.phase) % 4, flip: game.player.x < e.x };
    G.screenFlash(game, '255, 240, 210', 0.35, 0.4);
    G.addShake(game, 8);
    if (G.sfx) G.sfx.play('bossBreak');
  };

  G.updateBossDeath = function (game, dt) {
    const d = game.bossDeath, e = d.e;
    d.t += dt;
    d.next -= dt;
    if (d.next <= 0 && d.t < d.max * 0.57 && !game.fx.quiet) {
      const k = d.t / d.max;
      d.next = 0.26 - k * 0.16; // 끝으로 갈수록 빠르게
      const x = e.x + (G.fx.random() * 2 - 1) * e.r, y = e.y + (G.fx.random() * 1.8 - 1.4) * e.r;
      G.burst(game, x, y, G.BOSS_TYPES[e.type].color, 8, 200);
      G.burst(game, x, y, 'rgba(255, 215, 130, 0.95)', 6, 170, true);
      G.ring(game, x, y, 6, 50 + k * 50, 0.3, 'rgba(255, 225, 160, 0.9)', 3);
      G.addShake(game, 2 + k * 3);
      if (G.sfx) G.sfx.play('killBig');
    }
    if (!d.exploded && d.t >= d.max * 0.57) {
      d.exploded = true;
      const color = G.bossPresentation(e.type).color;
      if (!game.fx.quiet) {
        G.burst(game, e.x, e.y - 20, color, game.fx.low ? 22 : 55, 310, true);
        G.ring(game, e.x, e.y, 15, e.final ? 440 : 320, 0.85, color, 8);
        G.ring(game, e.x, e.y, 10, 240, 0.6, '#fff0c9', 3);
      }
      G.screenFlash(game, '255, 235, 190', game.fx.quiet ? 0.08 : 0.32, 0.4);
      G.addShake(game, 13);
      if (G.sfx) G.sfx.play('bossDie');
    }
    if (d.t >= d.max) {
      game.bossDeath = null;
      finishBoss(game, e);
    }
  };

  function finishBoss(game, e) {
    const st = game.stage;
    if (!e.final) G.dropItem(game, e.x, e.y + 10, 'chest', 'boss');
    G.dropItem(game, e.x + 30, e.y, 'coin', Math.round(30 * st.goldMul));
    G.dropItem(game, e.x - 30, e.y, 'heal');
    G.dropGem(game, e.x, e.y - 20, 40);
    if (!game.fx.quiet) G.ring(game, e.x, e.y, 15, 100, 0.5, '#e9ca86', 2);
    G.announce(game, e.final ? '새벽이 밝아옵니다!' : e.name + ' 처치! 상자를 떨어뜨렸습니다');
  }

  G.drawBossDeath = function (ctx, game) {
    const d = game.bossDeath;
    if (!d) return;
    const e = d.e, k = d.t / d.max;
    const spr = G.art.get('boss_' + e.type, d.frame);
    ctx.save();
    const visible = G.clamp((0.64 - k) / 0.1, 0, 1), quiet = game.fx.quiet;
    const shake = quiet ? 0 : Math.sin(d.t * 41) * k * 5;
    const scale = e.scale * (quiet ? 1 : 1 + k * 0.1);
    ctx.globalAlpha = visible;
    if (spr) {
      G.drawSprite(ctx, G.unitSprite(spr, G.BOSS_SPRITE), e.x + shake, e.y + d.feet, scale, d.flip, quiet ? 0 : Math.max(0, k - 0.4) * 2);
      G.drawBossFractures(ctx, game, e, spr, e.x + shake, e.y + d.feet, scale, d.flip, Math.min(1, k * 3) * visible);
    } else {
      ctx.fillStyle = G.BOSS_TYPES[e.type].color; ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
    }
    if (k > 0.57) {
      // 실제 보상은 finishBoss에서 한 번만 생성. 낙하하는 그림은 보상 미리보기다.
      const fall = G.clamp((k - 0.57) / 0.43, 0, 1);
      ctx.globalAlpha = Math.min(1, fall * 5);
      const gold = G.art.get('coin'), heal = G.art.get('item_heal'), chest = G.art.get('chest_boss');
      const lift = quiet ? 0 : (1 - fall) * 105;
      if (gold) G.drawSprite(ctx, gold, e.x + 30 * fall, e.y - lift, 1.4, false, 0);
      if (heal) G.drawSprite(ctx, heal, e.x - 30 * fall, e.y - lift * 0.8, 1, false, 0);
      if (chest && !e.final) G.drawSprite(ctx, chest, e.x, e.y + 10 - lift * 1.2, 1, false, 0);
    }
    ctx.restore();
  };

  // ---------- 그리기 ----------
  const WARNING_DASH = [7, 5];
  const SOLID_LINE = [];
  G.drawTelegraphs = function (ctx, game) {
    for (const t of game.telegraphs) {
      const k = 1 - t.life / t.max;
      ctx.save();
      if (t.kind === 'circle') {
        ctx.fillStyle = 'rgba(255, 55, 81, ' + (0.06 + k * 0.08) + ')';
        ctx.strokeStyle = '#210a16';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = '#ff6675'; ctx.lineWidth = 2.5; ctx.setLineDash(WARNING_DASH); ctx.stroke(); ctx.setLineDash(SOLID_LINE);
        ctx.strokeStyle = '#ffe3cb'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(t.x, t.y, t.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); ctx.stroke();
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r * k, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 90, 100, 0.09)';
        ctx.fill();
        ctx.strokeStyle = '#ffced2'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(t.x - 6, t.y); ctx.lineTo(t.x + 6, t.y); ctx.moveTo(t.x, t.y - 6); ctx.lineTo(t.x, t.y + 6); ctx.stroke();
      } else {
        ctx.translate(t.x, t.y);
        ctx.rotate(t.angle);
        // 원거리 잡몹의 가는 조준선: 길이와 사거리·판정은 그대로다.
        if (t.width <= 5) {
          ctx.strokeStyle = 'rgba(255, 137, 144, ' + (0.18 + k * 0.22) + ')'; ctx.lineWidth = 0.9;
          ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(t.len, 0); ctx.stroke();
          ctx.strokeStyle = 'rgba(255, 224, 196, ' + (0.25 + k * 0.2) + ')'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(t.len - 5, -3); ctx.lineTo(t.len, 0); ctx.lineTo(t.len - 5, 3); ctx.stroke();
          ctx.restore(); continue;
        }
        ctx.fillStyle = 'rgba(255, 65, 90, ' + (0.12 + k * 0.16) + ')';
        ctx.fillRect(0, -t.width / 2, t.len, t.width);
        ctx.strokeStyle = '#240915'; ctx.lineWidth = 5;
        ctx.strokeRect(0, -t.width / 2, t.len, t.width);
        ctx.strokeStyle = '#ff8a91'; ctx.lineWidth = 1.5; ctx.strokeRect(0, -t.width / 2, t.len, t.width);
        ctx.fillStyle = '#ffe3cb'; ctx.fillRect(0, -1, t.len * k, 2);
      }
      ctx.restore();
    }
  };

  G.drawEnemyBullets = function (ctx, game) {
    for (const b of game.enemyBullets) {
      if (!G.inView(game, b.x, b.y, 30)) continue;
      G.fx.enemyBullet(ctx, b);
    }
  };

  G.drawEnemyBulletGlow = function (ctx, game) {
    for (const b of game.enemyBullets) {
      if (G.inView(game, b.x, b.y, 30)) G.drawGlow(ctx, b.color, b.x, b.y, 30, 0.9);
    }
  };
})(window.G);
