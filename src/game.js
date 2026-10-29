// 게임 상태와 메인 루프: 판 시작·이어하기·일시정지·레벨업·상자·정산, 그리기 순서(땅 → 캐릭터 → 어둠 → 빛 → HUD)
(function (G) {
  'use strict';

  const game = G.game = {
    state: 'loading', // loading | menu | playing | levelup | chest | paused | dying | end
    canvas: null, ctx: null,
    w: 0, h: 0, dpr: 1, zoom: 1,
    viewW: 0, viewH: 0, viewRadius: 0, despawnDist: 0,
    safe: { t: 0, r: 0, b: 0, l: 0 },
    cam: { x: 0, y: 0 },
    clock: 0, time: 0, kills: 0, runGold: 0, fps: 60,
    player: null, stage: null, boss: null,
    debug: false, xpMul: 1, reducedMotion: false,
    shake: 0, settings: { sfx: 0.7, music: 0.5, shake: true, numbers: true, fps: false },
    lastRun: { stageId: 'forest', championId: 'keeper', difficultyId: 'normal' },
    difficulty: null, pickedDifficulty: 'normal',
  };

  const AUTOSAVE_EVERY = 10;

  // 배경 음악 (오디오가 없거나 막혀 있어도 게임은 그대로)
  function music(fn, arg) {
    if (G.music && typeof G.music[fn] === 'function') {
      try { G.music[fn](arg); } catch (e) { /* 소리 실패는 무시 */ }
    }
  }
  const SAVE_STATES = ['playing', 'paused', 'levelup', 'chest'];

  function resetWorld(stageId, championId, difficultyId) {
    game.stage = G.stageById(stageId);
    game.difficulty = G.difficultyById(difficultyId);
    game.player = G.createPlayer(championId);
    game.enemies = [];
    game.projectiles = [];
    game.enemyBullets = [];
    game.telegraphs = [];
    game.gems = [];
    game.items = [];
    game.particles = [];
    game.numbers = [];
    game.rings = [];
    game.flash = null;
    game.heartbeat = 0;
    game._visEnemies = [];
    game.grid = new G.SpatialGrid(64);
    game.director = G.createDirectorFor(game.difficulty);
    game.time = 0;
    game.kills = 0;
    game.runGold = 0;
    game.pendingLevelUps = 0;
    game.chestQueue = []; // 주운 상자의 출처 'elite' | 'boss'
    game.currentChoices = null;
    game.lastSettle = null;
    game.shake = 0;
    game.banner = null;
    game.boss = null;
    game.bossMusic = false;
    game.retaliateFx = 0;
    game.autosave = AUTOSAVE_EVERY;
    game.cam.x = 0;
    game.cam.y = 0;
    game.lastRun = { stageId: game.stage.id, championId: game.player.champion, difficultyId: game.difficulty.id };
    G.recalcStats(game);
    game.player.hp = game.player.maxHp;
    game.rerollsLeft = game.player.stats.rerolls;
  }

  game.newRun = function (stageId, championId, difficultyId) {
    if (game.state === 'loading') return;
    let diffId = difficultyId || game.pickedDifficulty || 'normal';
    if (!G.isDifficultyUnlocked(G.stageById(stageId).id, diffId)) diffId = 'normal';
    resetWorld(stageId, championId, diffId);
    const p = game.player;
    const champ = G.CHAMPIONS[p.champion];
    G.addWeapon(p, champ.weapon, champ.weaponLevel || 1);
    // 반딧불 마녀 각성: 무기 하나를 더 들고 시작
    if (p.stats.extraWeapon) {
      const options = Object.keys(G.WEAPONS).filter((k) => G.isBaseWeapon(k) && G.isItemUnlocked('weapon', k) && !p.weapons.some((w) => w.key === k));
      G.addWeapon(p, G.pick(options), 1);
    }
    // 가챠 첫걸음: 높은 레벨로 시작하고, 그만큼 카드를 먼저 고른다
    const startLevels = Math.floor(p.stats.startLevel || 0);
    if (startLevels > 0) {
      p.level += startLevels;
      p.xpNext = G.xpToNext(p.level);
      game.pendingLevelUps += startLevels;
    }
    G.clearRun();
    G.input.clear();
    game.state = 'playing';
    G.ui.hideAll();
    music('play', game.stage.id);
    music('setBoss', false);
    music('duck', false);
    G.announce(game, game.stage.name + (game.difficulty.id === 'normal' ? '' : ' · ' + game.difficulty.name) + ' · 20분을 버티세요');
    G.saveRun(game);
  };

  game.continueRun = function () {
    const d = G.loadRunData();
    if (!d || game.state === 'loading') return false;
    resetWorld(d.stageId, d.player.champion, d.difficultyId);
    G.restoreRun(game, d);
    G.input.clear();
    game.state = 'paused';
    music('play', game.stage.id);
    music('duck', true);
    G.ui.showPause(game);
    return true;
  };

  game.retry = function () {
    leaveEnd();
    game.newRun(game.lastRun.stageId, game.lastRun.championId, game.lastRun.difficultyId);
  };

  // 결과 화면을 떠날 때: 3판에 1번 전면 광고 (구글 플레이 앱에서만, 광고 제거 시 없음)
  function leaveEnd() {
    if (game.state === 'end' && G.ads) G.ads.maybeInterstitial();
  }

  // 결과 화면 "광고 보고 금화 2배"
  game.claimDoubleGold = function () {
    const s = game.lastSettle;
    if (!s || s.doubled || game.state !== 'end' || !G.ads.rewardedReady()) return Promise.resolve(0);
    s.doubled = true;
    return G.ads.rewarded('double_gold').then((ok) => {
      if (!ok) { s.doubled = false; return 0; }
      G.addCurrency('gold', s.gold);
      G.saveMeta();
      return s.gold;
    });
  };

  // 레벨업 카드 다시 뽑기 (가챠 운명 바꾸기)
  game.rerollChoices = function () {
    if (game.state !== 'levelup' || !(game.rerollsLeft > 0)) return null;
    game.rerollsLeft--;
    game.currentChoices = G.buildChoices(game, game.player.stats.choices);
    return game.currentChoices;
  };

  game.pause = function () {
    if (game.state !== 'playing') return;
    game.state = 'paused';
    G.input.clear();
    G.saveRun(game);
    music('duck', true);
    G.ui.showPause(game);
  };

  game.resume = function () {
    if (game.state !== 'paused') return;
    continueAfterModal();
  };

  game.saveAndQuit = function () {
    if (game.player && SAVE_STATES.indexOf(game.state) !== -1) G.saveRun(game);
    game.toTitle();
  };

  game.giveUp = function () {
    if (game.state === 'paused' || game.state === 'playing') endRun(false);
  };

  game.toTitle = function () {
    leaveEnd();
    game.state = 'menu';
    G.input.clear();
    music('setBoss', false);
    music('duck', false);
    music('play', 'title');
    G.ui.showTitle();
  };

  // 레벨업·상자 창이 닫힌 뒤: 남은 상자 → 남은 레벨업 → 플레이 순서
  function continueAfterModal() {
    if (game.chestQueue.length) openChest();
    else if (game.pendingLevelUps > 0) openLevelUp();
    else {
      game.state = 'playing';
      music('duck', false);
      G.ui.hideAll();
    }
  }

  function openLevelUp() {
    game.state = 'levelup';
    G.input.clear();
    music('duck', true);
    const choices = game.currentChoices = G.buildChoices(game, game.player.stats.choices);
    G.ui.showLevelUp(game, choices, (c) => {
      game.currentChoices = null;
      G.applyChoice(game, c);
      game.pendingLevelUps--;
      // 선택하고 돌아오면 금빛 충격파가 주변 적을 밀어낸다
      if (game.pendingLevelUps === 0) G.levelUpBlast(game);
      continueAfterModal();
    });
  }

  function openChest() {
    game.state = 'chest';
    G.input.clear();
    music('duck', true);
    const result = G.openChest(game, game.chestQueue.shift());
    G.ui.showChest(game, result, continueAfterModal);
  }

  function endRun(win) {
    game.state = 'end';
    music('setBoss', false);
    music('stinger', win ? 'victory' : 'defeat');
    const settle = G.settleRun(game, win);
    game.lastSettle = { gold: settle.gold, doubled: false };
    G.clearRun();
    const p = game.player;
    G.ui.showEnd(game, {
      win, time: Math.floor(game.time), level: p.level, kills: game.kills,
      gold: settle.gold, isBest: settle.isBest, crystals: settle.crystals,
      canDoubleGold: settle.gold > 0 && G.ads.rewardedReady(), unlockedDifficulty: settle.unlockedDifficulty,
      stageId: game.stage.id, championId: p.champion, difficultyId: game.difficulty.id, newlyUnlocked: settle.newlyUnlocked,
    });
  }

  function update(dt) {
    game.time += dt;
    const p = game.player;
    G.updatePlayer(game, dt);
    game.grid.clear();
    for (const e of game.enemies) game.grid.insert(e);
    G.updateSpawner(game, dt);
    G.updateEnemies(game, dt);
    G.updateWeapons(game, dt);
    G.updateProjectiles(game, dt);
    G.updateBossFx(game, dt);
    G.compact(game.enemies);
    G.updatePickups(game, dt);
    G.updateEffects(game, dt);
    game.retaliateFx = Math.max(0, game.retaliateFx - dt);

    music('setIntensity', game.time / G.WIN_TIME);
    const bossNow = !!game.boss;
    if (bossNow !== game.bossMusic) { game.bossMusic = bossNow; music('setBoss', bossNow); }
    if (p.hp > 0 && p.hp / p.maxHp < 0.3) {
      game.heartbeat -= dt;
      if (game.heartbeat <= 0) { game.heartbeat = 0.85; if (G.sfx) G.sfx.play('lowhp'); }
    }

    const k = Math.min(1, dt * 8);
    game.cam.x += (p.x - game.cam.x) * k;
    game.cam.y += (p.y - game.cam.y) * k;

    game.autosave -= dt;
    if (game.autosave <= 0) {
      game.autosave = AUTOSAVE_EVERY;
      G.saveRun(game);
    }

    if (p.hp <= 0) {
      game.state = 'dying';
      G.clearRun(); // 쓰러진 판은 이어할 수 없다
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
    if (game.chestQueue.length) openChest();
    else if (game.pendingLevelUps > 0) openLevelUp();
  }

  // ---------- 그리기 ----------

  const DECAL_CELL = 110;
  const patterns = {};

  function drawGround(ctx) {
    const st = game.stage;
    const x0 = game.cam.x - game.viewW / 2 - 40, y0 = game.cam.y - game.viewH / 2 - 40;
    const x1 = x0 + game.viewW + 80, y1 = y0 + game.viewH + 80;
    const tile = G.art.get(st.ground);
    if (tile) {
      if (!patterns[st.ground]) {
        const pat = ctx.createPattern(tile.img, 'repeat');
        const s = tile.w / tile.img.width;
        if (pat.setTransform) pat.setTransform(new DOMMatrix().scaleSelf(s, s));
        patterns[st.ground] = pat;
      }
      ctx.fillStyle = patterns[st.ground];
    } else {
      ctx.fillStyle = st.groundColor;
    }
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);

    // 고정 난수로 흩뿌린 장식 (같은 자리엔 항상 같은 장식)
    const decals = st.decals;
    const cx0 = Math.floor(x0 / DECAL_CELL), cx1 = Math.floor(x1 / DECAL_CELL);
    const cy0 = Math.floor(y0 / DECAL_CELL), cy1 = Math.floor(y1 / DECAL_CELL);
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const h = G.hash2(cx, cy);
        if (h > 0.42) continue;
        const spr = G.art.get(decals[Math.floor(G.hash2(cy + 7, cx - 3) * decals.length)]);
        if (!spr) continue;
        const ox = G.hash2(cx * 3 + 1, cy) * DECAL_CELL, oy = G.hash2(cx, cy * 3 + 2) * DECAL_CELL;
        const sc = 0.8 + G.hash2(cx + 11, cy + 5) * 0.5;
        G.drawSprite(ctx, spr, cx * DECAL_CELL + ox, cy * DECAL_CELL + oy, sc, h < 0.2, 0);
      }
    }
  }

  function toScreen(x, y, sx, sy) {
    return {
      x: (x - game.cam.x) * game.zoom + game.w / 2 + sx,
      y: (y - game.cam.y) * game.zoom + game.h / 2 + sy,
    };
  }

  // 레벨업·상자·일시정지 화면이 떠 있을 때는 HUD 글자가 겹쳐 보이지 않게 그리지 않는다
  const HUD_STATES = ['playing', 'dying'];

  function render() {
    const ctx = game.ctx;
    const { w, h, dpr, zoom } = game;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#0d1513';
    ctx.fillRect(0, 0, w, h);
    const p = game.player;
    if (!p || game.state === 'menu' || game.state === 'loading') return;

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
    G.drawTelegraphs(ctx, game);
    G.drawWeaponsUnder(ctx, game);
    G.drawEnemies(ctx, game);
    const dying = game.state === 'dying' || game.state === 'end';
    if (!dying) G.drawPlayer(ctx, game);
    G.drawProjectiles(ctx, game);
    G.drawWeaponsOver(ctx, game);
    G.drawEnemyBullets(ctx, game);
    G.drawParticles(ctx, game, false);

    // 어둠: 등불에서 멀어질수록 짙어진다 (스테이지마다 어둠의 색이 다르다)
    const lp = G.lanternPos(p);
    const ls = toScreen(lp.x, lp.y, sx, sy);
    const flicker = 1 + Math.sin(game.clock * 11) * 0.015 + Math.sin(game.clock * 23.7) * 0.01;
    const inner = (dying ? 30 : 80) * zoom * flicker;
    const outer = Math.max(w, h) * (dying ? 0.45 : 0.62);
    const c = game.stage.dark.join(', ');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const dark = ctx.createRadialGradient(ls.x, ls.y, inner, ls.x, ls.y, outer);
    dark.addColorStop(0, 'rgba(' + c + ', 0)');
    dark.addColorStop(0.4, 'rgba(' + c + ', 0.32)');
    dark.addColorStop(1, 'rgba(' + c + ', 0.84)');
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
    G.drawProjectileGlow(ctx, game);
    G.drawWeaponGlow(ctx, game);
    G.drawEnemyGlow(ctx, game);
    G.drawEnemyBulletGlow(ctx, game);
    G.drawRings(ctx, game);
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

    G.drawScreenFlash(ctx, game);
    if (HUD_STATES.indexOf(game.state) !== -1) G.drawHUD(ctx, game);
  }

  // ---------- 화면 크기와 루프 ----------

  // 그래픽 품질 = 그리기 해상도(기기 픽셀 비율) 상한. 자동은 플레이 중 FPS를 보고 단계를 내리거나 올린다.
  const QUALITY_DPR = { high: 2, medium: 1.5, low: 1 };
  const AUTO_DPR = [2, 1.5, 1];
  let autoStep = 0, slowFor = 0, fastFor = 0;

  function quality() { return (game.settings && game.settings.quality) || 'auto'; }
  function dprCap() { return quality() === 'auto' ? AUTO_DPR[autoStep] : QUALITY_DPR[quality()] || 2; }

  G.applyQuality = function () {
    autoStep = 0;
    slowFor = fastFor = 0;
    if (game.canvas) game.resize();
  };

  function autoQuality(dt) {
    if (quality() !== 'auto' || game.state !== 'playing') { slowFor = fastFor = 0; return; }
    if (game.fps < 48) { slowFor += dt; fastFor = 0; } else if (game.fps > 58) { fastFor += dt; slowFor = 0; } else { slowFor = fastFor = 0; }
    if (slowFor > 2.5 && autoStep < AUTO_DPR.length - 1) { autoStep++; slowFor = 0; game.resize(); }
    else if (fastFor > 20 && autoStep > 0) { autoStep--; fastFor = 0; game.resize(); }
  }

  game.resize = function () {
    const w = window.innerWidth, h = window.innerHeight;
    const dpr = Math.min(dprCap(), window.devicePixelRatio || 1);
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
    // 그림은 화면 배율에 맞춰 구워 두므로 보통은 빠른 보간으로 충분하다. 많이 줄여 그릴 때만 한 단계 높인다.
    game.ctx.imageSmoothingQuality = (dpr * game.zoom) / G.spriteRes < 0.6 ? 'medium' : 'low';
  };

  let last = 0;
  function frame(ts) {
    const raw = last ? (ts - last) / 1000 : 0;
    const dt = Math.min(0.05, raw);
    last = ts;
    if (raw > 0) game.fps = game.fps * 0.93 + (1 / raw) * 0.07;
    game.clock += dt;
    autoQuality(dt);
    if (game.state === 'playing') update(dt);
    else if (game.state === 'dying') {
      game.dieTimer -= dt;
      G.updateEffects(game, dt * 0.5);
      if (game.dieTimer <= 0) endRun(false);
    }
    render();
    requestAnimationFrame(frame);
  }

  // 플레이 중 단축키. 메뉴 화면의 키는 UI가 처리한다.
  game.onKey = function (e) {
    if (game.debug && game.player && (game.state === 'playing' || game.state === 'paused')) debugKey(e);
    if (game.state === 'playing' && (e.key === 'Escape' || e.code === 'KeyP')) game.pause();
  };

  // ?debug: L 레벨업 · K 60초 넘기기 · H 회복 · B 보스 · C 상자 · V 보스 상자 · M 가진 것 모두 만렙 · G 금화 1000
  function debugKey(e) {
    const p = game.player;
    switch (e.code) {
      case 'KeyL': game.pendingLevelUps++; break;
      case 'KeyK': game.time += 60; break;
      case 'KeyH': p.hp = p.maxHp; break;
      case 'KeyB': G.spawnBoss(game, Math.min(2, game.director.bossIndex)); break;
      case 'KeyC': G.dropItem(game, p.x + 40, p.y, 'chest', 'elite'); break;
      case 'KeyV': G.dropItem(game, p.x + 40, p.y, 'chest', 'boss'); break;
      case 'KeyM':
        p.weapons.forEach((w) => { if (G.isBaseWeapon(w.key)) w.level = G.WEAPON_MAX; });
        Object.keys(p.passives).forEach((k) => { p.passives[k] = G.PASSIVE_MAX; });
        G.recalcStats(game);
        break;
      case 'KeyG': G.addCurrency('gold', 1000); G.saveMeta(); break;
      default: break;
    }
  }

  game.run = function () { requestAnimationFrame(frame); };

  // 테스트용: 고정 시간 간격으로 직접 진행
  game.step = function (dt, n) {
    for (let i = 0; i < (n || 1); i++) if (game.state === 'playing') update(dt);
  };

  game.render = render; // 테스트·성능 측정용

  game.canSave = function () { return !!game.player && SAVE_STATES.indexOf(game.state) !== -1; };
})(window.G);
