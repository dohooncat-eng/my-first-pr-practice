// 줍는 것들: 경험치 결정, 약초(회복), 끌림의 부적(모든 결정 끌어오기)
(function (G) {
  'use strict';

  const MAX_GEMS = 450;

  function gemTier(value) { return value >= 10 ? 2 : value >= 2.5 ? 1 : 0; }

  G.dropGem = function (game, x, y, value) {
    if (game.gems.length >= MAX_GEMS) {
      // 너무 많으면 기존 결정에 합친다
      const g = G.pick(game.gems);
      g.value += value;
      g.tier = gemTier(g.value);
      return;
    }
    game.gems.push({ x: x + G.rand(-5, 5), y: y + G.rand(-5, 5), value, tier: gemTier(value), pull: false, sp: 0, phase: Math.random() * 6 });
  };

  G.dropItem = function (game, x, y, kind) {
    game.items.push({ x, y, kind, pull: false, sp: 0, phase: Math.random() * 6 });
  };

  // 플레이어 쪽으로 빨려 들어가는 움직임. 닿으면 true
  function pull(obj, p, dt) {
    obj.sp = Math.min(900, obj.sp + 1400 * dt);
    const dx = p.x - obj.x, dy = p.y - obj.y;
    const d = Math.hypot(dx, dy) || 1;
    const step = Math.min(d, obj.sp * dt);
    obj.x += (dx / d) * step;
    obj.y += (dy / d) * step;
    return d < p.r + 10;
  }

  G.updatePickups = function (game, dt) {
    const p = game.player;
    const mag2 = p.stats.magnet * p.stats.magnet;
    for (const g of game.gems) {
      const dx = p.x - g.x, dy = p.y - g.y;
      if (!g.pull && dx * dx + dy * dy < mag2) g.pull = true;
      if (g.pull && pull(g, p, dt)) {
        g.dead = true;
        G.gainXp(game, g.value);
        game.gemSparkle = 0.12;
      }
    }
    G.compact(game.gems);

    for (const it of game.items) {
      const dx = p.x - it.x, dy = p.y - it.y;
      if (!it.pull && dx * dx + dy * dy < mag2 * 0.5) it.pull = true;
      if (it.pull && pull(it, p, dt)) {
        it.dead = true;
        if (it.kind === 'heal') G.healPlayer(game, 30);
        else {
          for (const g of game.gems) g.pull = true;
          G.announce(game, '끌림의 부적! 결정이 모여듭니다');
        }
      }
    }
    G.compact(game.items);
    game.gemSparkle = Math.max(0, (game.gemSparkle || 0) - dt);
  };

  function inView(game, o) {
    return Math.abs(o.x - game.cam.x) < game.viewW / 2 + 30 && Math.abs(o.y - game.cam.y) < game.viewH / 2 + 30;
  }

  G.drawPickups = function (ctx, game) {
    for (const g of game.gems) {
      if (!inView(game, g)) continue;
      const spr = G.art.get('gem_' + g.tier);
      const bob = Math.sin(game.clock * 3 + g.phase) * 2;
      if (spr) G.drawSprite(ctx, spr, g.x, g.y + bob, 1, false, false);
      else {
        ctx.fillStyle = ['#7fd4ff', '#5ef0b4', '#c78bff'][g.tier];
        ctx.fillRect(g.x - 4, g.y - 5 + bob, 8, 10);
      }
    }
    for (const it of game.items) {
      if (!inView(game, it)) continue;
      const spr = G.art.get('item_' + it.kind);
      const bob = Math.sin(game.clock * 2.5 + it.phase) * 3;
      if (spr) G.drawSprite(ctx, spr, it.x, it.y + bob, 1, false, false);
      else {
        ctx.fillStyle = it.kind === 'heal' ? '#e0445a' : '#7fd4ff';
        ctx.beginPath();
        ctx.arc(it.x, it.y + bob, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const GEM_GLOW = ['rgba(127, 212, 255, 0.7)', 'rgba(94, 240, 180, 0.7)', 'rgba(199, 139, 255, 0.8)'];
  G.drawPickupGlow = function (ctx, game) {
    for (const g of game.gems) {
      if (!inView(game, g)) continue;
      G.drawGlow(ctx, GEM_GLOW[g.tier], g.x, g.y, 10 + g.tier * 4, 0.55);
    }
    for (const it of game.items) {
      if (!inView(game, it)) continue;
      const pulse = 0.5 + Math.sin(game.clock * 4 + it.phase) * 0.2;
      G.drawGlow(ctx, it.kind === 'heal' ? 'rgba(255, 120, 120, 0.7)' : 'rgba(127, 212, 255, 0.8)', it.x, it.y, 30, pulse);
    }
  };
})(window.G);
