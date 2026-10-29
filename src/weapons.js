// 무기 4종: 레벨별 수치, 자동 공격, 투사체, 그리기
(function (G) {
  'use strict';

  G.WEAPON_MAX = 5;

  G.WEAPONS = {
    bolt: {
      name: '불씨 화살',
      desc: '가장 가까운 적에게 불씨를 쏩니다.',
      levels: [
        { dmg: 12, cd: 0.85, count: 1, pierce: 1, speed: 430 },
        { dmg: 12, cd: 0.85, count: 2, pierce: 1, speed: 430 },
        { dmg: 17, cd: 0.8, count: 2, pierce: 2, speed: 460 },
        { dmg: 17, cd: 0.7, count: 3, pierce: 2, speed: 460 },
        { dmg: 24, cd: 0.6, count: 4, pierce: 3, speed: 500 },
      ],
      notes: ['', '화살 +1', '피해 +40%, 관통 +1', '화살 +1, 더 빠르게 쏩니다', '피해 +40%, 화살 +1, 관통 +1'],
    },
    sword: {
      name: '은빛 검',
      desc: '가장 가까운 적 쪽을 크게 베고 밀어냅니다.',
      levels: [
        { dmg: 16, cd: 1.35, range: 95, arc: 1.9, back: false },
        { dmg: 22, cd: 1.35, range: 100, arc: 2.0, back: false },
        { dmg: 22, cd: 1.15, range: 118, arc: 2.1, back: false },
        { dmg: 30, cd: 1.15, range: 118, arc: 2.1, back: true },
        { dmg: 42, cd: 0.95, range: 138, arc: 2.3, back: true },
      ],
      notes: ['', '피해 +35%', '범위 증가, 더 빠르게 벱니다', '피해 +35%, 뒤쪽도 함께 벱니다', '피해 +40%, 범위·속도 증가'],
    },
    orb: {
      name: '반딧불',
      desc: '반딧불이 주위를 돌며 닿는 적을 밀어냅니다.',
      levels: [
        { dmg: 9, count: 2, radius: 72, spin: 3.0 },
        { dmg: 9, count: 3, radius: 76, spin: 3.0 },
        { dmg: 13, count: 3, radius: 84, spin: 3.4 },
        { dmg: 13, count: 4, radius: 90, spin: 3.6 },
        { dmg: 19, count: 5, radius: 100, spin: 4.0 },
      ],
      notes: ['', '반딧불 +1', '피해 +45%, 더 넓고 빠르게', '반딧불 +1', '피해 +45%, 반딧불 +1'],
    },
    aura: {
      name: '등불 오라',
      desc: '주변 적을 계속 태우고 느리게 만듭니다.',
      levels: [
        { dmg: 4, radius: 64, tick: 0.5 },
        { dmg: 5, radius: 76, tick: 0.5 },
        { dmg: 6, radius: 88, tick: 0.45 },
        { dmg: 8, radius: 100, tick: 0.4 },
        { dmg: 11, radius: 118, tick: 0.35 },
      ],
      notes: ['', '피해·범위 증가', '피해·범위 증가, 더 자주 태웁니다', '피해 +33%, 범위 증가', '피해 +38%, 범위 크게 증가'],
    },
  };

  const ORB_HIT_CD = 0.45;
  const near = [];

  G.addWeapon = function (player, key) {
    player.weapons.push({ key, level: 1, timer: 0.2, angle: 0, orbs: [], slashes: [], pulse: 0 });
  };

  function stats(w) { return G.WEAPONS[w.key].levels[w.level - 1]; }

  function nearestEnemy(game, maxDist) {
    const p = game.player;
    let best = null, bestD = maxDist * maxDist;
    for (const e of game.enemies) {
      if (e.dead) continue;
      const dx = e.x - p.x, dy = e.y - p.y;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  const update = {
    bolt(game, w, s, dt) {
      w.timer -= dt;
      if (w.timer > 0) return;
      const p = game.player;
      const target = nearestEnemy(game, 640);
      if (!target) { w.timer = 0.1; return; }
      const base = Math.atan2(target.y - p.y, target.x - p.x);
      for (let i = 0; i < s.count; i++) {
        const a = base + (i - (s.count - 1) / 2) * 0.16;
        game.projectiles.push({
          x: p.x, y: p.y - 6, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
          angle: a, r: 7, dmg: s.dmg, pierce: s.pierce, life: 1.5, hits: [],
        });
      }
      w.timer = s.cd * game.player.stats.cooldown;
    },

    sword(game, w, s, dt) {
      for (const sl of w.slashes) sl.life -= dt;
      w.slashes = w.slashes.filter((sl) => sl.life > 0);
      w.timer -= dt;
      if (w.timer > 0) return;
      const p = game.player;
      const target = nearestEnemy(game, s.range + 160);
      const dirs = [target ? Math.atan2(target.y - p.y, target.x - p.x) : Math.atan2(p.face.y, p.face.x)];
      if (s.back) dirs.push(dirs[0] + Math.PI);
      game.grid.query(p.x, p.y, s.range + 40, near);
      for (const angle of dirs) {
        w.slashes.push({ angle, range: s.range, arc: s.arc, life: 0.22, max: 0.22 });
        for (const e of near) {
          if (e.dead) continue;
          const dx = e.x - p.x, dy = e.y - p.y;
          const d = Math.hypot(dx, dy);
          if (d > s.range + e.r) continue;
          if (d > e.r && Math.abs(G.angleDiff(Math.atan2(dy, dx), angle)) > s.arc / 2) continue;
          const k = 260 / (d || 1);
          G.damageEnemy(game, e, s.dmg, dx * k, dy * k);
        }
      }
      w.timer = s.cd * game.player.stats.cooldown;
    },

    orb(game, w, s, dt) {
      const p = game.player;
      w.angle += s.spin * dt;
      w.orbs.length = s.count;
      for (let i = 0; i < s.count; i++) {
        const a = w.angle + (i / s.count) * Math.PI * 2;
        const ox = p.x + Math.cos(a) * s.radius;
        const oy = p.y - 4 + Math.sin(a) * s.radius;
        w.orbs[i] = { x: ox, y: oy, a };
        game.grid.query(ox, oy, 12 + 40, near);
        for (const e of near) {
          if (e.dead) continue;
          const dx = e.x - ox, dy = e.y - oy;
          if (dx * dx + dy * dy > (e.r + 11) * (e.r + 11)) continue;
          if ((e.hitUntil.orb || 0) > game.time) continue;
          e.hitUntil.orb = game.time + ORB_HIT_CD;
          const px = e.x - p.x, py = e.y - p.y;
          const k = 200 / (Math.hypot(px, py) || 1);
          G.damageEnemy(game, e, s.dmg, px * k, py * k);
        }
      }
    },

    aura(game, w, s, dt) {
      const p = game.player;
      w.pulse = Math.max(0, w.pulse - dt * 3);
      w.timer -= dt;
      game.grid.query(p.x, p.y, s.radius + 40, near);
      const tick = w.timer <= 0;
      if (tick) { w.timer = s.tick * game.player.stats.cooldown; w.pulse = 1; }
      for (const e of near) {
        if (e.dead) continue;
        const dx = e.x - p.x, dy = e.y - p.y;
        if (dx * dx + dy * dy > (s.radius + e.r) * (s.radius + e.r)) continue;
        e.slow = 0.15;
        if (tick) G.damageEnemy(game, e, s.dmg, 0, 0, true);
      }
    },
  };

  G.updateWeapons = function (game, dt) {
    for (const w of game.player.weapons) update[w.key](game, w, stats(w), dt);
  };

  G.updateProjectiles = function (game, dt) {
    for (const b of game.projectiles) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0) { b.dead = true; continue; }
      game.grid.query(b.x, b.y, b.r + 40, near);
      for (const e of near) {
        if (e.dead || b.hits.indexOf(e.id) !== -1) continue;
        const dx = e.x - b.x, dy = e.y - b.y;
        if (dx * dx + dy * dy > (e.r + b.r) * (e.r + b.r)) continue;
        b.hits.push(e.id);
        G.damageEnemy(game, e, b.dmg, b.vx * 0.3, b.vy * 0.3);
        G.burst(game, b.x, b.y, 'rgba(255, 170, 80, 0.9)', 4, 120, true);
        if (--b.pierce <= 0) { b.dead = true; break; }
      }
    }
    G.compact(game.projectiles);
  };

  // 바닥에 깔리는 오라 (캐릭터보다 먼저 그림)
  G.drawWeaponsUnder = function (ctx, game) {
    const p = game.player;
    for (const w of p.weapons) {
      if (w.key !== 'aura') continue;
      const s = stats(w);
      const r = s.radius * (1 + w.pulse * 0.04);
      const g = ctx.createRadialGradient(p.x, p.y, r * 0.2, p.x, p.y, r);
      g.addColorStop(0, 'rgba(255, 181, 71, 0.02)');
      g.addColorStop(0.75, 'rgba(255, 181, 71, ' + (0.09 + w.pulse * 0.06) + ')');
      g.addColorStop(1, 'rgba(255, 181, 71, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.setLineDash([3, 14]);
      ctx.lineDashOffset = -game.clock * 22;
      ctx.lineCap = 'round';
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255, 210, 122, ' + (0.35 + w.pulse * 0.3) + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.96, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  };

  G.drawWeaponsOver = function (ctx, game) {
    const p = game.player;
    const boltSpr = G.art.get('bolt');
    for (const b of game.projectiles) {
      if (boltSpr) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.angle);
        G.drawSprite(ctx, boltSpr, 0, 0, 1, false, false);
        ctx.restore();
      } else {
        ctx.fillStyle = '#ffd27a';
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const orbSpr = G.art.get('orb');
    const slashSpr = G.art.get('slash');
    for (const w of p.weapons) {
      if (w.key === 'orb') {
        for (const o of w.orbs) {
          if (!o) continue;
          if (orbSpr) {
            ctx.save();
            ctx.translate(o.x, o.y);
            ctx.rotate(o.a + Math.PI / 2);
            G.drawSprite(ctx, orbSpr, 0, 0, 1, false, false);
            ctx.restore();
          } else {
            ctx.fillStyle = '#e9ff9e';
            ctx.beginPath();
            ctx.arc(o.x, o.y, 7, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      } else if (w.key === 'sword') {
        for (const sl of w.slashes) {
          const t = 1 - sl.life / sl.max; // 0 → 1
          ctx.save();
          ctx.translate(p.x, p.y - 4);
          // 휘두르는 방향으로 살짝 돌며 퍼진다
          ctx.rotate(sl.angle - 0.35 + t * 0.7);
          ctx.globalAlpha = Math.min(1, (1 - t) * 1.6);
          if (slashSpr) {
            const size = (sl.range / (118 / 256)) * (0.88 + t * 0.14);
            ctx.drawImage(slashSpr.img, -size / 2, -size / 2, size, size);
          } else {
            ctx.strokeStyle = '#e6f0ff';
            ctx.lineWidth = 8;
            ctx.beginPath();
            ctx.arc(0, 0, sl.range * 0.85, -sl.arc / 2, sl.arc / 2);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
    }
    ctx.globalAlpha = 1;
  };

  // 어둠 위에 가산 합성으로 그리는 빛
  G.drawWeaponGlow = function (ctx, game) {
    for (const b of game.projectiles) {
      G.drawGlow(ctx, 'rgba(255, 150, 60, 0.9)', b.x, b.y, 22, 0.7);
    }
    for (const w of game.player.weapons) {
      if (w.key !== 'orb') continue;
      for (const o of w.orbs) if (o) G.drawGlow(ctx, 'rgba(200, 255, 120, 0.8)', o.x, o.y, 26, 0.65);
    }
  };
})(window.G);
