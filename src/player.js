// 플레이어(챔피언): 스탯 계산, 이동, 체력·회복·부활, 경험치, 그리기
(function (G) {
  'use strict';

  // 필요 경험치: Lv 10 약 160 · Lv 30 약 900 · Lv 50 약 2,100 (레벨이 높을수록 가파르게)
  // 초반엔 적이 적게 나오므로 Lv 10까지는 덜 필요하다 (Lv 1은 절반)
  G.xpToNext = function (level) {
    const early = Math.min(1, 0.45 + 0.055 * level);
    return Math.max(2, Math.floor((5 + (level - 1) * 10 + Math.pow(level - 1, 1.9)) * early));
  };

  G.baseStats = function () {
    return {
      maxHp: 100, speed: 1, damage: 1, cooldown: 1, magnet: 85, area: 1, amount: 0,
      armor: 0, regen: 0, luck: 1, crit: 0.05, critMult: 1.5, xpMul: 1, revive: 0,
      choices: 3, retaliate: 0, extraWeapon: 0,
      goldMul: 1, startLevel: 0, rerolls: 0, chestBonus: 0, duration: 1, dodge: 0, rage: 0,
      barrier: 0, barrierRegen: 0,
      // 영웅 빌드 궁합 (src/systems/heroes.js)
      affinity: {}, globalFx: {}, frozenBonus: 0, burnBonus: 0, comboDmg: 0,
    };
  };

  G.createPlayer = function (championId) {
    const champ = G.CHAMPIONS[championId] || G.CHAMPIONS.keeper;
    const p = {
      champion: G.CHAMPIONS[championId] ? championId : 'keeper',
      x: 0, y: 0, r: 14,
      hp: champ.base.maxHp, maxHp: champ.base.maxHp,
      baseSpeed: champ.base.speed,
      face: { x: 1, y: 0 }, flip: false, moving: false, walk: 0,
      invuln: 0, hurt: 0, revivesUsed: 0, retaliateCd: 0,
      level: 1, xp: 0, xpNext: G.xpToNext(1),
      stats: G.baseStats(),
      weapons: [],
      passives: {},
      fusions: [],
    };
    return p;
  };

  // 챔피언 기본값 + 챔피언 능력 업그레이드 + 가챠 + 패시브 + 패시브 조합으로 스탯을 처음부터 다시 계산
  G.recalcStats = function (game) {
    const p = game.player;
    const champ = G.CHAMPIONS[p.champion];
    const s = G.baseStats();
    s.maxHp = champ.base.maxHp;
    champ.apply(s, (G.meta.champLv && G.meta.champLv[p.champion]) || 0);
    if (G.applyGachaStats) G.applyGachaStats(s);
    Object.keys(p.passives).forEach((k) => G.PASSIVES[k].apply(s, p.passives[k]));
    p.fusions.forEach((k) => G.FUSIONS[k].apply(s));
    s.armor = Math.min(0.75, s.armor);
    s.crit = Math.min(0.9, s.crit);
    s.dodge = Math.min(0.4, s.dodge);
    const oldMax = p.maxHp;
    p.stats = s;
    p.baseSpeed = champ.base.speed;
    p.maxHp = Math.round(s.maxHp);
    // 최대 체력이 늘어난 만큼 현재 체력도 채운다
    if (p.maxHp > oldMax) p.hp += p.maxHp - oldMax;
    p.hp = Math.min(p.hp, p.maxHp);
  };

  G.updatePlayer = function (game, dt) {
    const p = game.player;
    const mv = G.input.getMove();
    const speed = p.baseSpeed * p.stats.speed;
    p.x += mv.x * speed * dt;
    p.y += mv.y * speed * dt;
    G.mapConstrain(game, p, p.r);
    const m = Math.hypot(mv.x, mv.y);
    p.moving = m > 0.05;
    if (p.moving) {
      p.face.x = mv.x / m;
      p.face.y = mv.y / m;
      if (Math.abs(mv.x) > 0.1) p.flip = mv.x < 0;
      p.walk += dt * 9 * Math.max(0.6, m);
    }
    p.invuln = Math.max(0, p.invuln - dt);
    p.hurt = Math.max(0, p.hurt - dt);
    p.retaliateCd = Math.max(0, p.retaliateCd - dt);
    if (p.stats.regen > 0 && p.hp > 0) p.hp = Math.min(p.maxHp, p.hp + p.stats.regen * dt);
    // 방어막: 마지막으로 맞은 뒤 4초가 지나면 초당 barrierRegen씩 차오른다
    if (p.stats.barrier > 0) {
      p.shieldWait = Math.max(0, (p.shieldWait || 0) - dt);
      if (p.shieldWait <= 0) p.shield = Math.min(p.stats.barrier, (p.shield || 0) + p.stats.barrierRegen * dt);
    }
  };

  G.damagePlayer = function (game, amount, source) {
    const p = game.player;
    if (p.invuln > 0 || p.hp <= 0) return;
    // 그림자 망토: 확률로 피한다 (잠깐 무적)
    if (p.stats.dodge > 0 && Math.random() < p.stats.dodge) {
      p.invuln = 0.3;
      G.addDamageNumber(game, p.x, p.y - 34, 'MISS', 'soft');
      return;
    }
    let dmg = amount * (1 - p.stats.armor);
    if (p.stats.barrier > 0) {
      p.shieldWait = 4;
      if (p.shield > 0) {
        const took = Math.min(p.shield, dmg);
        p.shield -= took;
        dmg -= took;
        if (p.shield <= 0) {
          G.burst(game, p.x, p.y - 6, 'rgba(140, 210, 255, 0.95)', 14, 220, true);
          if (G.sfx) G.sfx.play('w_frost');
        }
        if (dmg <= 0) { p.invuln = 0.3; G.burst(game, p.x, p.y - 6, 'rgba(140, 210, 255, 0.9)', 5, 140, true); return; }
      }
    }
    p.hp = Math.max(0, p.hp - dmg);
    p.invuln = 0.45;
    p.hurt = 0.25;
    game.hurtAt = game.clock; // 화면 가장자리 붉은 번쩍임
    G.addShake(game, 7, source ? p.x - source.x : -p.face.x, source ? p.y - source.y : -p.face.y);
    G.burst(game, p.x, p.y - 6, '#e0445a', 7, 140);
    if (G.sfx) G.sfx.play('hurt');
    // 은빛 기사 각성: 맞으면 주변을 반격해 벤다
    if (p.stats.retaliate && p.retaliateCd <= 0) {
      p.retaliateCd = 0.6;
      game.retaliateFx = 0.25;
      G.hitCircle(game, p.x, p.y, G.area(game, 115), 45, { knock: 320 });
    }
    if (p.hp <= 0 && p.revivesUsed < p.stats.revive) {
      // 불멸의 심장·불사조 깃털: 하나에 한 번씩 되살아난다
      p.revivesUsed++;
      p.hp = p.maxHp * 0.5;
      p.invuln = 2.5;
      G.burst(game, p.x, p.y, 'rgba(255, 120, 140, 0.9)', 40, 280, true);
      G.hitCircle(game, p.x, p.y, 260, 200, { knock: 600 });
      G.announce(game, p.fusions.indexOf('heart') !== -1 ? '불멸의 심장이 다시 뜁니다!' : '불사조 깃털이 타오릅니다!');
      if (G.sfx) G.sfx.play('evolve');
    }
  };

  G.healPlayer = function (game, amount) {
    const p = game.player;
    const before = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + amount);
    const healed = Math.round(p.hp - before);
    if (healed > 0) {
      G.addDamageNumber(game, p.x, p.y - 34, '+' + healed, 'heal');
      G.burst(game, p.x, p.y - 8, 'rgba(120, 255, 170, 0.8)', 10, 90, true);
    }
  };

  G.gainXp = function (game, value) {
    const p = game.player;
    p.xp += value * game.xpMul * p.stats.xpMul;
    while (p.xp >= p.xpNext) {
      p.xp -= p.xpNext;
      p.level++;
      p.xpNext = G.xpToNext(p.level);
      game.pendingLevelUps++;
      if (game.fx) { game.fx.xp = 1; game.fx.level = 0.65; }
    }
  };

  // 등불(빛의 중심) 위치
  G.lanternPos = function (p) {
    return { x: p.x + (p.flip ? -15 : 15), y: p.y - 1 };
  };

  G.drawPlayer = function (ctx, game) {
    const p = game.player;
    G.fx.shadow(ctx, p.x, p.y + 14, 17);

    const blink = !game.fx.quiet && p.invuln > 0 && Math.floor(game.clock * 16) % 2 === 0;
    ctx.globalAlpha = blink ? 0.32 : 1;
    const frame = p.moving ? Math.floor(p.walk) % 4 : 0;
    const sprite = G.CHAMPIONS[p.champion].sprite;
    const spr = G.art.get(sprite, frame) || G.art.get('player', frame);
    const breathe = p.moving || game.fx.quiet ? 0 : Math.sin(game.clock * 2.6) * 0.02;
    if (spr) {
      ctx.save();
      ctx.translate(p.x, p.y + 14);
      ctx.scale(1, 1 + breathe);
      G.drawSprite(ctx, spr, 0, 0, 1, p.flip, p.hurt > 0.12 ? 0.75 : 0);
      ctx.restore();
    } else {
      ctx.fillStyle = p.hurt > 0.12 ? '#fff' : '#ece4d2';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (p.invuln > 0) {
      ctx.strokeStyle = '#fff0c4'; ctx.globalAlpha = game.fx.quiet ? 0.6 : 0.35;
      ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(p.x, p.y + 12, 21, 8, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }

    // 반격 베기 효과
    if (game.retaliateFx > 0) {
      G.drawSlash(ctx, p.x, p.y - 4, game.clock * 9, G.area(game, 115), 1 - game.retaliateFx / 0.25);
    }
  };

  // 발밑 체력 막대 (어둠 위에 그려서 항상 보이게)
  G.drawPlayerBar = function (ctx, game) {
    const p = game.player;
    const w = 40, h = 5, x = p.x - w / 2, y = p.y + 22;
    const ratio = Math.max(0, p.hp / p.maxHp);
    ctx.fillStyle = 'rgba(8, 12, 11, 0.85)';
    ctx.fillRect(x - 1.5, y - 1.5, w + 3, h + 3);
    ctx.fillStyle = '#4a1822';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = ratio < 0.3 ? '#ff5a5a' : '#e0445a';
    ctx.fillRect(x, y, w * ratio, h);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(x, y, w * ratio, 1.5);
    // 방어막: 체력 막대 위 하늘색 막대
    if (p.stats.barrier > 0) {
      const sr = Math.max(0, (p.shield || 0) / p.stats.barrier);
      ctx.fillStyle = 'rgba(8, 12, 11, 0.85)';
      ctx.fillRect(x - 1.5, y - 5.5, w + 3, 4.5);
      ctx.fillStyle = '#7fd4ff';
      ctx.fillRect(x, y - 4.5, w * sr, 2.5);
    }
  };
})(window.G);
