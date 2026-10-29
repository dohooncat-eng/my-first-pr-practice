// 게임 상태와 메인 루프: 업데이트 순서, 그리기 순서(땅 → 캐릭터 → 어둠 → 빛 → HUD)
(function (G) {
  'use strict';

  G.BEST_KEY = 'deungbul.best';

  const game = G.game = {
    state: 'loading', // loading | title | playing | levelup | paused | dying | end
    canvas: null, ctx: null,
    w: 0, h: 0, dpr: 1, zoom: 1,
    viewW: 0, viewH: 0, viewRadius: 0, despawnDist: 0,
    safe: { t: 0, r: 0, b: 0, l: 0 },
    cam: { x: 0, y: 0 },
    clock: 0, time: 0, kills: 0,
    player: null,
    debug: false, xpMul: 1, reducedMotion: false,
    shake: 0,
  };

  G.resetRun = function () {
    game.player = G.createPlayer();
    G.addWeapon(game.player, 'bolt');
    game.enemies = [];
    game.projectiles = [];
    game.gems = [];
    game.items = [];
    game.particles = [];
    game.numbers = [];
    game._visEnemies = [];
    game.grid = new G.SpatialGrid(64);
    game.director = G.createDirector();
    game.time = 0;
    game.kills = 0;
    game.pendingLevelUps = 0;
    game.shake = 0;
    game.banner = null;
    game.cam.x = 0;
    game.cam.y = 0;
  };

  game.start = function () {
    if (game.state === 'loading') return;
    G.resetRun();
    G.input.clear();
    game.state = 'playing';
    G.ui.show(null);
    G.announce(game, '어둠이 몰려옵니다. 10분을 버티세요');
  };

  game.pause = function () {
    if (game.state !== 'playing') return;
    game.state = 'paused';
    G.input.clear();
    G.ui.showPause(game);
  };

  game.resume = function () {
    if (game.state !== 'paused') return;
    game.state = 'playing';
    G.ui.show(null);
  };

  game.toTitle = function () {
    game.state = 'title';
    G.ui.show('title');
    G.ui.setLoading(1, true);
  };

  function openLevelUp() {
    game.state = 'levelup';
    G.input.clear();
    const choices = G.buildChoices(game.player, 3);
    G.ui.showLevelUp(game, choices, (c) => {
      G.applyChoice(game, c);
      game.pendingLevelUps--;
      if (game.pendingLevelUps > 0) openLevelUp();
      else {
        game.state = 'playing';
        G.ui.show(null);
      }
    });
  }

  function endRun(win) {
    game.state = 'end';
    const p = game.player;
    const result = { win, time: Math.floor(game.time), level: p.level, kills: game.kills };
    const best = G.storage.get(G.BEST_KEY);
    const isBest = !best || result.time > best.time || (result.time === best.time && result.kills > best.kills);
    if (isBest) G.storage.set(G.BEST_KEY, result);
    G.ui.showEnd(game, result, isBest);
  }

  function update(dt) {
    game.time += dt;
    G.updatePlayer(game, dt);
    game.grid.clear();
    for (const e of game.enemies) game.grid.insert(e);
    G.updateSpawner(game, dt);
    G.updateEnemies(game, dt);
    G.updateWeapons(game, dt);
    G.updateProjectiles(game, dt);
    G.compact(game.enemies);
    G.updatePickups(game, dt);
    G.updateEffects(game, dt);

    const p = game.player;
    const k = Math.min(1, dt * 8);
    game.cam.x += (p.x - game.cam.x) * k;
    game.cam.y += (p.y - game.cam.y) * k;

    if (p.hp <= 0) {
      game.state = 'dying';
      game.dieTimer = 1.3;
      G.burst(game, p.x, p.y, 'rgba(255, 181, 71, 0.9)', 40, 260, true);
      G.addShake(game, 12);
      return;
    }
    if (game.time >= G.WIN_TIME) {
      game.time = G.WIN_TIME;
      endRun(true);
      return;
    }
    if (game.pendingLevelUps > 0) openLevelUp();
  }

  // ---------- 그리기 ----------

  const DECAL_CELL = 110;
  let groundPattern = null;

  function drawGround(ctx) {
    const x0 = game.cam.x - game.viewW / 2 - 40, y0 = game.cam.y - game.viewH / 2 - 40;
    const x1 = x0 + game.viewW + 80, y1 = y0 + game.viewH + 80;
    const tile = G.art.get('ground_tile');
    if (tile) {
      if (!groundPattern) {
        groundPattern = ctx.createPattern(tile.img, 'repeat');
        const s = tile.w / tile.img.width;
        if (groundPattern.setTransform) groundPattern.setTransform(new DOMMatrix().scaleSelf(s, s));
      }
      ctx.fillStyle = groundPattern;
    } else {
      ctx.fillStyle = '#111a17';
    }
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);

    // 고정 난수로 흩뿌린 장식 (같은 자리엔 항상 같은 풀)
    const cx0 = Math.floor(x0 / DECAL_CELL), cx1 = Math.floor(x1 / DECAL_CELL);
    const cy0 = Math.floor(y0 / DECAL_CELL), cy1 = Math.floor(y1 / DECAL_CELL);
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const h = G.hash2(cx, cy);
        if (h > 0.42) continue;
        const name = G.DECALS[Math.floor(G.hash2(cy + 7, cx - 3) * G.DECALS.length)];
        const spr = G.art.get(name);
        if (!spr) continue;
        const ox = G.hash2(cx * 3 + 1, cy) * DECAL_CELL, oy = G.hash2(cx, cy * 3 + 2) * DECAL_CELL;
        const sc = 0.8 + G.hash2(cx + 11, cy + 5) * 0.5;
        G.drawSprite(ctx, spr, cx * DECAL_CELL + ox, cy * DECAL_CELL + oy, sc, h < 0.2, false);
      }
    }
  }

  function toScreen(x, y, sx, sy) {
    return {
      x: (x - game.cam.x) * game.zoom + game.w / 2 + sx,
      y: (y - game.cam.y) * game.zoom + game.h / 2 + sy,
    };
  }

  function render() {
    const ctx = game.ctx;
    const { w, h, dpr, zoom } = game;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0d1513';
    ctx.fillRect(0, 0, w, h);
    const p = game.player;
    if (!p) return;

    const sx = game.shake ? G.rand(-game.shake, game.shake) : 0;
    const sy = game.shake ? G.rand(-game.shake, game.shake) : 0;
    const world = () => ctx.setTransform(
      dpr * zoom, 0, 0, dpr * zoom,
      dpr * (w / 2 - game.cam.x * zoom + sx),
      dpr * (h / 2 - game.cam.y * zoom + sy),
    );

    world();
    drawGround(ctx);
    G.drawPickups(ctx, game);
    G.drawWeaponsUnder(ctx, game);
    G.drawEnemies(ctx, game);
    if (game.state !== 'dying' && game.state !== 'end') G.drawPlayer(ctx, game);
    G.drawWeaponsOver(ctx, game);
    G.drawParticles(ctx, game, false);

    // 어둠: 등불에서 멀어질수록 짙어진다
    const lp = G.lanternPos(p);
    const ls = toScreen(lp.x, lp.y, sx, sy);
    const flicker = 1 + Math.sin(game.clock * 11) * 0.015 + Math.sin(game.clock * 23.7) * 0.01;
    const dying = game.state === 'dying' || game.state === 'end';
    const inner = (dying ? 30 : 80) * zoom * flicker;
    const outer = Math.max(w, h) * (dying ? 0.45 : 0.62);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const dark = ctx.createRadialGradient(ls.x, ls.y, inner, ls.x, ls.y, outer);
    dark.addColorStop(0, 'rgba(3, 7, 10, 0)');
    dark.addColorStop(0.4, 'rgba(3, 7, 10, 0.32)');
    dark.addColorStop(1, 'rgba(2, 5, 8, 0.84)');
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, w, h);

    // 빛: 가산 합성
    world();
    ctx.globalCompositeOperation = 'lighter';
    if (!dying) {
      G.drawGlow(ctx, 'rgba(255, 160, 70, 0.5)', lp.x, lp.y, 170 * flicker, 0.55);
      G.drawGlow(ctx, 'rgba(255, 226, 160, 0.9)', lp.x, lp.y, 18 * flicker, 0.9);
    }
    G.drawPickupGlow(ctx, game);
    G.drawWeaponGlow(ctx, game);
    G.drawEnemyGlow(ctx, game);
    G.drawParticles(ctx, game, true);
    ctx.globalCompositeOperation = 'source-over';

    G.drawEnemyOverlay(ctx, game);
    if (!dying) G.drawPlayerBar(ctx, game);
    G.drawNumbers(ctx, game);

    // 맞았을 때·체력이 낮을 때 붉은 테두리
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const low = p.hp / p.maxHp < 0.3 && !dying ? 0.35 + Math.sin(game.clock * 6) * 0.15 : 0;
    const red = Math.max(p.hurt * 2.4, low);
    if (red > 0) {
      const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
      v.addColorStop(0, 'rgba(224, 68, 90, 0)');
      v.addColorStop(1, 'rgba(224, 68, 90, ' + Math.min(0.6, red) + ')');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);
    }

    if (game.state !== 'title' && game.state !== 'end') G.drawHUD(ctx, game);
  }

  // ---------- 화면 크기와 루프 ----------

  game.resize = function () {
    const w = window.innerWidth, h = window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    game.w = w;
    game.h = h;
    game.dpr = dpr;
    game.canvas.width = Math.round(w * dpr);
    game.canvas.height = Math.round(h * dpr);
    // 작은 화면에서도 주변이 충분히 보이게 확대 비율을 정한다
    game.zoom = G.clamp(Math.min(w, h) / 560, 0.6, 1.6);
    game.viewW = w / game.zoom;
    game.viewH = h / game.zoom;
    game.viewRadius = Math.hypot(game.viewW, game.viewH) / 2;
    game.despawnDist = game.viewRadius + 320;
    const probe = getComputedStyle(document.getElementById('safe-probe'));
    game.safe = {
      t: parseFloat(probe.paddingTop) || 0,
      r: parseFloat(probe.paddingRight) || 0,
      b: parseFloat(probe.paddingBottom) || 0,
      l: parseFloat(probe.paddingLeft) || 0,
    };
    game.ctx.imageSmoothingQuality = 'high';
  };

  let last = 0;
  function frame(ts) {
    const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0;
    last = ts;
    game.clock += dt;
    if (game.state === 'playing') update(dt);
    else if (game.state === 'dying') {
      game.dieTimer -= dt;
      G.updateEffects(game, dt * 0.5);
      if (game.dieTimer <= 0) endRun(false);
    }
    render();
    requestAnimationFrame(frame);
  }

  game.onKey = function (e) {
    if (game.debug) {
      if (e.code === 'KeyL' && game.state === 'playing') game.pendingLevelUps++;
      if (e.code === 'KeyK' && game.state === 'playing') game.time += 60;
      if (e.code === 'KeyH' && game.player) game.player.hp = game.player.maxHp;
    }
    const st = game.state;
    if (st === 'title' && (e.key === 'Enter' || e.code === 'Space')) game.start();
    else if (st === 'playing' && (e.key === 'Escape' || e.code === 'KeyP')) game.pause();
    else if (st === 'paused' && (e.key === 'Escape' || e.code === 'KeyP')) game.resume();
    else if (st === 'levelup' && /^Digit[1-3]$/.test(e.code)) G.ui.pickCard(Number(e.code.slice(5)) - 1);
    else if (st === 'end' && e.key === 'Enter') game.start();
    else if (st === 'end' && e.key === 'Escape') game.toTitle();
  };

  game.run = function () {
    requestAnimationFrame(frame);
  };

  // 테스트·디버그용: 고정 시간 간격으로 직접 진행
  game.step = function (dt, n) {
    for (let i = 0; i < (n || 1); i++) if (game.state === 'playing') update(dt);
  };
})(window.G);
