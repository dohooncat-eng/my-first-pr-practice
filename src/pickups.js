// 줍는 것들: 경험치 결정, 약초(회복), 끌림의 부적(모든 결정 끌어오기), 금화, 상자
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

  // kind: heal | magnet | coin(value=금화 수) | chest(value='elite'|'boss')
  const MAX_COINS = 80;
  G.dropItem = function (game, x, y, kind, value) {
    if (kind === 'coin' && game.items.length > MAX_COINS) {
      // 바닥에 금화가 너무 많으면 이미 있는 금화에 합친다
      const coins = game.items.filter((it) => it.kind === 'coin');
      if (coins.length >= MAX_COINS) { G.pick(coins).value += value || 0; return; }
    }
    game.items.push({ x, y, kind, value: value || 0, pull: false, sp: 0, phase: Math.random() * 6 });
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

  function collect(game, it) {
    if (it.kind === 'heal') {
      G.healPlayer(game, 20);
      if (G.sfx) G.sfx.play('heal');
    } else if (it.kind === 'coin') {
      game.runGold += it.value;
      G.addDamageNumber(game, game.player.x, game.player.y - 40, '+' + it.value + 'G', 'big');
      if (G.sfx) G.sfx.play('coin');
    } else if (it.kind === 'chest') {
      game.chestQueue.push(it.value === 'boss' ? 'boss' : 'elite');
      if (G.sfx) G.sfx.play('pickupChest');
    } else {
      for (const g of game.gems) g.pull = true;
      G.announce(game, '끌림의 부적! 결정이 모여듭니다');
    }
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
        G.fx.collect(game, g.tier);
        if (G.sfx) G.sfx.play('gem');
      }
    }
    G.compact(game.gems);

    for (const it of game.items) {
      const dx = p.x - it.x, dy = p.y - it.y;
      const reach = it.kind === 'chest' ? (p.r + 30) * (p.r + 30) : mag2 * 0.5;
      if (!it.pull && dx * dx + dy * dy < reach) it.pull = true;
      if (it.pull && pull(it, p, dt)) {
        it.dead = true;
        collect(game, it);
      }
    }
    G.compact(game.items);
    game.gemSparkle = Math.max(0, (game.gemSparkle || 0) - dt);
  };

  G.drawPickups = function (ctx, game) {
    for (const g of game.gems) {
      if (!G.inView(game, g.x, g.y, 30)) continue;
      const spr = G.art.get('gem_' + g.tier);
      const bob = game.fx.quiet || g.pull ? 0 : Math.sin(game.clock * 3 + g.phase) * 2;
      // 당김의 기존 가속·획득 시점은 보존하고 속도에 비례하는 꼬리만 더한다.
      if (g.pull) G.fx.trail(ctx, game, g.x, g.y, game.player.x - g.x, game.player.y - g.y, g.sp, g.tier === 2 ? 5 : g.tier === 1 ? 3 : 1, 0.55);
      if (spr) G.drawSprite(ctx, spr, g.x, g.y + bob, 1, false, 0);
      else {
        ctx.fillStyle = ['#7fd4ff', '#5ef0b4', '#c78bff'][g.tier];
        ctx.fillRect(g.x - 4, g.y - 5 + bob, 8, 10);
      }
    }
    for (const it of game.items) {
      if (!G.inView(game, it.x, it.y, 110)) continue;
      G.fx.beacon(ctx, game, it);
      if (it.kind !== 'coin' && !game.fx.low) G.fx.shadow(ctx, it.x, it.y + 5, it.kind === 'chest' ? 23 : 13, 0.7);
      const name = it.kind === 'heal' || it.kind === 'magnet' ? 'item_' + it.kind : it.kind === 'chest' && it.value === 'boss' ? 'chest_boss' : it.kind;
      const spr = G.art.get(name) || G.art.get(it.kind);
      const bob = it.kind === 'chest' || game.fx.quiet ? 0 : Math.sin(game.clock * 2.5 + it.phase) * 3;
      const scale = it.kind === 'coin' ? Math.min(1.8, 1 + it.value / 40) : 1;
      if (spr) G.drawSprite(ctx, spr, it.x, it.y + bob, scale, false, 0);
      else {
        ctx.fillStyle = { heal: '#e0445a', magnet: '#7fd4ff', coin: '#ffd27a', chest: '#b07a3a' }[it.kind];
        ctx.beginPath();
        ctx.arc(it.x, it.y + bob, it.kind === 'chest' ? 16 : 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const GEM_GLOW = ['rgba(127, 212, 255, 0.7)', 'rgba(94, 240, 180, 0.7)', 'rgba(199, 139, 255, 0.8)'];
  const ITEM_GLOW = {
    heal: 'rgba(255, 120, 120, 0.7)', magnet: 'rgba(127, 212, 255, 0.8)',
    coin: 'rgba(255, 210, 110, 0.7)', chest: 'rgba(255, 200, 90, 0.9)',
  };
  const MAX_GEM_GLOWS = 70;
  G.drawPickupGlow = function (ctx, game) {
    // 결정이 많을 때는 빛 번짐을 일부만 그린다 (큰 결정 먼저 보이게 뒤에서부터)
    let n = 0;
    for (let i = game.gems.length - 1; i >= 0 && n < (game.fx.low ? 14 : MAX_GEM_GLOWS); i--) {
      const g = game.gems[i];
      if (G.inView(game, g.x, g.y, 30)) { G.drawGlow(ctx, GEM_GLOW[g.tier], g.x, g.y, 10 + g.tier * 4, 0.55); n++; }
    }
    for (const it of game.items) {
      if (!G.inView(game, it.x, it.y, 40)) continue;
      const pulse = game.fx.quiet ? 0.5 : 0.5 + Math.sin(game.clock * 4 + it.phase) * 0.2;
      G.drawGlow(ctx, ITEM_GLOW[it.kind], it.x, it.y - (it.kind === 'chest' ? 14 : 0), it.kind === 'chest' ? 60 : it.kind === 'coin' ? 16 : 30, pulse);
    }
  };
})(window.G);
