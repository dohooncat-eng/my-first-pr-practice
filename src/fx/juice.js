// 전투 연출 전용. 판 시간·스탯·판정과 분리된 시계, 카메라, 미리 구운 빛과 잔상.
(function (G) {
  'use strict';

  const TAU = Math.PI * 2;
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const FX = G.fx = {};
  const COLORS = ['#ffb45f', '#a5edff', '#c7c3ff', '#b8e776', '#ffe6a6', '#bf92ef'];
  const GLOWS = ['rgba(255, 142, 55, 0.8)', 'rgba(125, 215, 255, 0.8)', 'rgba(175, 155, 255, 0.8)', 'rgba(155, 210, 75, 0.7)', 'rgba(255, 215, 130, 0.8)', 'rgba(160, 105, 230, 0.8)'];
  const FAMILY = { bolt: 0, inferno: 0, meteor: 0, starfall: 0, whip: 0, dragonwhip: 0, helltrap: 0,
    frost: 1, winter: 1, sword: 1, moonblade: 1, twinmoon: 1, chain: 2, storm: 2, thunderbolt: 2,
    poison: 3, garden: 3, orb: 3, queen: 3, aura: 4, holylamp: 4, sun: 4, lance: 4, judgment: 4,
    bell: 4, earthbell: 4, shield: 4, bulwark: 4, scythe: 5, reaper: 5, trap: 5, moth: 5, mothswarm: 5, tornado: 1, tempest: 2 };
  const GRADE = { forest: '#316957', marsh: '#63762e', ruins: '#8d5940', abyss: '#51408d', frost: '#568fc0',
    mine: '#a34e20', lake: '#557c9e', tower: '#65818c', garden: '#7b427e', lighthouse: '#665483' };
  // 연출용 난수는 전투의 치명타·드롭 난수열을 소비하지 않는다.
  let seed = 0x63a421;
  FX.random = function () { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return (seed >>> 0) / 4294967296; };
  FX.quiet = function (game) {
    return media.matches || !!(game.settings && game.settings.reducedMotion) || document.documentElement.classList.contains('reduce-motion');
  };
  FX.motion = function (game) { return !FX.quiet(game) && !(game.settings && game.settings.shake === false); };
  FX.low = function (game) { return !!(game.settings && game.settings.fxQuality === 'low'); };
  FX.family = function (key) {
    if (!key) return 4;
    if (FAMILY[key] !== undefined) return FAMILY[key];
    const d = G.WEAPONS[key], from = d && d.from;
    return FAMILY[key] = from ? FX.family(Array.isArray(from) ? from[0] : from) : 4;
  };

  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  const impact = [], fragments = [], beams = [];
  let shadow, hurt, atmosphere = null, atmosphereKey = '';
  const surfaces = Object.create(null);
  function bake() {
    if (shadow) return;
    shadow = canvas(96, 40);
    let c = shadow.getContext('2d'); c.scale(1, 40 / 96);
    let g = c.createRadialGradient(48, 48, 0, 48, 48, 48);
    g.addColorStop(0, '#02090888'); g.addColorStop(0.45, '#02090855'); g.addColorStop(1, '#02090800');
    c.fillStyle = g; c.fillRect(0, 0, 96, 96);
    hurt = canvas(256, 256); c = hurt.getContext('2d');
    g = c.createRadialGradient(128, 128, 40, 128, 128, 166);
    g.addColorStop(0, '#cc203b00'); g.addColorStop(0.55, '#cc203b18'); g.addColorStop(1, '#d62a48d9');
    c.fillStyle = g; c.fillRect(0, 0, 256, 256);
    for (let f = 0; f < 6; f++) {
      const im = canvas(96, 96); c = im.getContext('2d'); c.translate(48, 48);
      c.fillStyle = COLORS[f];
      c.beginPath();
      const rays = f === 2 ? 6 : f === 3 ? 5 : 8;
      for (let j = 0; j < rays * 2; j++) {
        const a = j * Math.PI / rays, r = j % 2 ? 7 : 29 + (j % 3) * 6;
        c.lineTo(Math.cos(a) * r, Math.sin(a) * r * (f === 0 ? 0.7 : 1));
      }
      c.closePath(); c.fill();
      c.fillStyle = '#fff9e9'; c.beginPath();
      c.moveTo(-25, 0); c.lineTo(-4, -4); c.lineTo(0, -26); c.lineTo(4, -4); c.lineTo(29, 0); c.lineTo(4, 4); c.lineTo(0, 25); c.lineTo(-4, 4); c.closePath(); c.fill();
      impact.push(im);
      const bit = canvas(24, 24); c = bit.getContext('2d'); c.translate(12, 12);
      c.fillStyle = COLORS[f]; c.strokeStyle = COLORS[f]; c.lineWidth = 2;
      c.beginPath();
      if (f === 3) { c.arc(0, 0, 5, 0, TAU); c.stroke(); }
      else if (f === 2) { c.moveTo(2, -10); c.lineTo(-5, 1); c.lineTo(1, 0); c.lineTo(-2, 10); c.lineTo(6, -3); c.lineTo(1, -2); c.fill(); }
      else if (f === 0) { c.moveTo(9, 0); c.quadraticCurveTo(-9, -9, -7, 1); c.quadraticCurveTo(-6, 8, 9, 0); c.fill(); }
      else if (f === 4) { c.moveTo(-10, 0); c.lineTo(-2, -2); c.lineTo(0, -10); c.lineTo(2, -2); c.lineTo(10, 0); c.lineTo(2, 2); c.lineTo(0, 10); c.lineTo(-2, 2); c.closePath(); c.fill(); }
      else if (f === 5) { c.moveTo(-10, -5); c.lineTo(9, 0); c.lineTo(-2, 7); c.lineTo(0, 1); c.closePath(); c.fill(); }
      else { c.moveTo(-9, 0); c.lineTo(0, -4); c.lineTo(9, 0); c.lineTo(0, 4); c.closePath(); c.fill(); }
      c.fillStyle = '#fffbe4'; c.fillRect(-1, -2, 2, 3); fragments.push(bit);
      const beam = canvas(48, 192); c = beam.getContext('2d');
      g = c.createLinearGradient(0, 0, 0, 192); g.addColorStop(0, '#ffffff00'); g.addColorStop(0.65, COLORS[f] + '28'); g.addColorStop(1, COLORS[f] + 'b0');
      c.fillStyle = g; c.beginPath(); c.moveTo(5, 0); c.lineTo(43, 0); c.lineTo(34, 192); c.lineTo(14, 192); c.closePath(); c.fill();
      c.fillStyle = '#fff9df55'; c.fillRect(23, 110, 2, 82); beams.push(beam);
      G.glow(GLOWS[f]);
    }
  }

  // 무기의 넓은 면은 고정된 128px 판을 늘려 쓴다. 색·형태별 캐시는 크기와 무관하다.
  FX.surface = function (key, inner, edge, ring) {
    if (surfaces[key]) return surfaces[key];
    const im = canvas(128, 128), c = im.getContext('2d');
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, inner); g.addColorStop(ring ? 0.78 : 0.45, edge); g.addColorStop(1, '#00000000');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128); return surfaces[key] = im;
  };
  FX.disc = function (ctx, key, x, y, r, alpha, inner, edge, ring) {
    const a = ctx.globalAlpha; ctx.globalAlpha = a * alpha;
    ctx.drawImage(FX.surface(key, inner, edge, ring), x - r, y - r, r * 2, r * 2); ctx.globalAlpha = a;
  };
  let rayImage = null;
  const beamImages = [], bulletImages = Object.create(null);
  FX.rays = function (ctx, r, alpha) {
    if (!rayImage) {
      rayImage = canvas(256, 256); const c = rayImage.getContext('2d'); c.translate(128, 128);
      const g = c.createRadialGradient(0, 0, 0, 0, 0, 128); g.addColorStop(0, '#fff0c83d'); g.addColorStop(1, '#fff0c800'); c.fillStyle = g;
      for (let i = 0; i < 8; i++) { c.rotate(TAU / 8); c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 128, -0.1, 0.1); c.closePath(); c.fill(); }
    }
    const a = ctx.globalAlpha; ctx.globalAlpha *= alpha; ctx.drawImage(rayImage, -r, -r, r * 2, r * 2); ctx.globalAlpha = a;
  };
  FX.beam = function (ctx, gold, length, width, alpha) {
    const i = gold ? 1 : 0;
    if (!beamImages[i]) {
      const im = beamImages[i] = canvas(256, 16), c = im.getContext('2d'), g = c.createLinearGradient(0, 0, 256, 0);
      g.addColorStop(0, gold ? '#ffecaa' : '#dcf0ff'); g.addColorStop(0.7, gold ? '#ffc85acc' : '#8cd2ffcc'); g.addColorStop(1, '#ffffff00'); c.fillStyle = g; c.fillRect(0, 0, 256, 16);
    }
    const a = ctx.globalAlpha; ctx.globalAlpha *= alpha; ctx.drawImage(beamImages[i], 0, -width / 2, length, width); ctx.globalAlpha = a;
  };
  FX.enemyBullet = function (ctx, b) {
    let im = bulletImages[b.color];
    if (!im) {
      im = bulletImages[b.color] = canvas(40, 40); const c = im.getContext('2d');
      c.fillStyle = '#21040d'; c.beginPath(); c.arc(20, 20, 16, 0, TAU); c.fill();
      c.fillStyle = b.color; c.beginPath(); c.arc(20, 20, 12, 0, TAU); c.fill();
      c.strokeStyle = '#ffe6dc'; c.lineWidth = 1.2; c.beginPath(); c.arc(20, 20, 12, -2.8, -0.8); c.stroke();
      c.fillStyle = '#fff8f0'; c.beginPath(); c.arc(20, 20, 5, 0, TAU); c.fill();
    }
    const r = b.r * 1.6; ctx.drawImage(im, b.x - r, b.y - r, r * 2, r * 2);
  };
  FX.shadow = function (ctx, x, y, r, alpha) {
    bake(); const a = ctx.globalAlpha; ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.drawImage(shadow, x - r * 1.25, y - r * 0.5, r * 2.5, r); ctx.globalAlpha = a;
  };
  FX.fragment = function (f) { bake(); return fragments[f]; };

  // 소멸 실루엣·충격 섬광은 고정 슬롯을 재사용한다. 한 프레임의 대량 처치도 상한 안에서 처리한다.
  function slots(n) { const a = []; for (let i = 0; i < n; i++) a.push({ life: 0, max: 0, x: 0, y: 0, r: 0, f: 0, angle: 0, spr: null, flip: false, scale: 1 }); return a; }
  function tickSlots(a, dt) {
    for (const v of a) if (v.life > 0) { v.life = Math.max(0, v.life - dt); if (!v.life) v.spr = null; }
  }
  FX.reset = function (game) {
    bake();
    let s = game.fx;
    if (!s) s = game.fx = { hits: slots(32), ghosts: slots(40) };
    for (const a of [s.hits, s.ghosts]) for (const v of a) { v.life = 0; v.spr = null; }
    s.real = 0; s.anim = game.clock; s.hit = 0; s.hitCd = 0; s.slow = 0; s.slowCd = 0;
    s.trauma = 0; s.dx = 1; s.dy = 0; s.sx = 0; s.sy = 0; s.zoom = 1; s.intro = 0;
    s.hitIndex = 0; s.ghostIndex = 0; s.impactBudget = 0; s.muzzleCd = 0; s.xp = 0; s.level = 0; s.collectCd = 0;
    s.low = FX.low(game); s.quiet = FX.quiet(game); s.motion = FX.motion(game);
    game.hurtAt = -Infinity; game.gemSparkle = 0;
  };
  FX.prepare = function (game) {
    if (!game.fx) FX.reset(game);
    const s = game.fx; s.low = FX.low(game); s.quiet = FX.quiet(game); s.motion = FX.motion(game);
    if (!s.motion) { s.hit = s.slow = s.trauma = s.sx = s.sy = s.intro = 0; s.zoom = 1; game.shake = 0; }
    return s;
  };
  // 원래 dt를 적분해 정지 시간이 50~65ms를 넘지 않게 한다. 판 시계는 호출자가 원래 dt로 진행한다.
  FX.tick = function (game, dt) {
    const s = FX.prepare(game); s.real += dt; s.impactBudget = s.low ? 4 : 12;
    const held = Math.min(s.hit, dt); s.hit = Math.max(0, s.hit - dt);
    const slowPart = Math.min(s.slow, dt - held); s.slow = Math.max(0, s.slow - (dt - held));
    const sim = dt - held - slowPart * 0.5;
    s.anim += sim;
    s.hitCd = Math.max(0, s.hitCd - dt); s.slowCd = Math.max(0, s.slowCd - dt);
    s.muzzleCd = Math.max(0, s.muzzleCd - dt); s.collectCd = Math.max(0, s.collectCd - dt);
    s.xp = Math.max(0, s.xp - dt * 3); s.level = Math.max(0, s.level - dt);
    s.intro = Math.max(0, s.intro - dt); s.trauma = Math.max(0, s.trauma - dt * 2.8);
    tickSlots(s.hits, dt); tickSlots(s.ghosts, dt);
    if (s.motion) {
      const t = s.real, power = s.trauma * s.trauma * (s.low ? 4 : 6);
      const n = Math.sin(t * 83) * 0.65 + Math.sin(t * 137 + 1.7) * 0.35;
      s.sx = power * (s.dx * n + Math.sin(t * 101) * 0.3);
      s.sy = power * (s.dy * n + Math.sin(t * 113 + 2) * 0.3);
      const intro = s.intro > 0 ? Math.sin(Math.PI * (1 - s.intro / 1.25)) : 0;
      s.zoom = 1 + Math.max(0, intro) * 0.035;
    }
    return sim;
  };
  FX.camera = function (game, dt) {
    const p = game.player, s = game.fx, k = 1 - Math.exp(-dt * 9);
    const lead = s.motion && p.moving ? 22 : 0;
    game.cam.x += (p.x + p.face.x * lead - game.cam.x) * k;
    game.cam.y += (p.y + p.face.y * lead - game.cam.y) * k;
  };
  FX.shake = function (game, amount, dx, dy) {
    if (!FX.motion(game)) return;
    const s = game.fx; if (!s) return;
    s.trauma = Math.min(1, s.trauma + amount * 0.055);
    const len = Math.hypot(dx || 0, dy || 0);
    if (len) { s.dx = dx / len; s.dy = dy / len; }
  };
  FX.slow = function (game, duration) {
    const s = game.fx; if (!s || !FX.motion(game) || s.slowCd > 0) return;
    s.slow = Math.min(0.3, duration); s.slowCd = 3;
  };
  function stamp(game, x, y, f, r, angle, life) {
    const s = game.fx; if (!s || !G.inView(game, x, y, 100) || s.impactBudget <= 0) return;
    s.impactBudget--;
    const v = s.hits[s.hitIndex++ % (s.low ? 10 : s.hits.length)];
    v.x = x; v.y = y; v.f = f; v.r = r; v.angle = angle; v.life = v.max = life;
  }
  FX.hit = function (game, e, dmg, crit, kx, ky, soft) {
    const s = game.fx; if (!s || soft) return;
    const f = FX.family(G.curWeaponKey), dx = kx || e.x - game.player.x, dy = ky || e.y - game.player.y;
    const len = Math.hypot(dx, dy) || 1;
    // 아래 값은 그림에만 쓰며 판정 좌표·넉백 속도에는 쓰지 않는다.
    e.fxHit = s.real; e.fxDX = dx / len; e.fxDY = dy / len; e.fxFamily = f;
    const strong = crit || dmg >= 80 || dmg >= e.maxHp * (e.boss ? 0.012 : 0.12);
    if (strong || (e.id & 1) === 0) stamp(game, e.x, e.y - e.r * 0.45, f, strong ? 29 : 18, Math.atan2(dy, dx), 0.16);
    if ((e.boss || e.elite) && strong && s.hitCd <= 0 && FX.motion(game)) {
      s.hit = e.boss ? 0.065 : 0.05; s.hitCd = 1.7;
      FX.shake(game, e.boss ? 5 : 3, dx, dy);
    }
  };
  FX.death = function (game, e) {
    const s = game.fx; if (!s || !G.inView(game, e.x, e.y, 140)) return;
    const important = e.boss || e.elite;
    const f = e.fxFamily === undefined ? 4 : e.fxFamily;
    if (!s.low || important) {
      const v = s.ghosts[s.ghostIndex++ % (s.low ? 6 : s.ghosts.length)];
      const sp = e.boss ? G.BOSS_SPRITE : G.ENEMY_ROLES[G.ENEMY_TYPES[e.type].role];
      v.spr = G.art.get(e.boss ? 'boss_' + e.type : e.type, Math.floor(s.anim * sp.fps + e.phase) % 4);
      v.x = e.x; v.y = e.y + sp.feet * e.scale; v.r = e.r; v.scale = e.scale;
      v.flip = game.player.x < e.x; v.life = v.max = important ? 0.42 : 0.24; v.f = f;
    }
    G.burst(game, e.x, e.y - e.r * 0.4, COLORS[f], important ? 18 : 5, important ? 210 : 115, true, f);
    if (important) {
      FX.slow(game, 0.3); FX.shake(game, e.boss ? 12 : 7, e.x - game.player.x, e.y - game.player.y);
      G.ring(game, e.x, e.y, 8, e.boss ? 290 : 140, 0.55, COLORS[f], e.boss ? 5 : 3);
    }
  };
  FX.muzzle = function (game, b) {
    const s = game.fx; if (!s || s.muzzleCd > 0) return;
    stamp(game, b.x, b.y, FX.family(b.wkey), 23, b.angle || 0, 0.1); s.muzzleCd = 0.07;
  };
  FX.area = function (game, x, y, r, f) {
    if (!game.fx || !G.inView(game, x, y, r)) return;
    G.ring(game, x, y, r * 0.1, r, 0.32, COLORS[f], 3);
    stamp(game, x, y, f, 35, 0, 0.14);
  };
  FX.boss = function (game, e) { if (game.fx && FX.motion(game)) game.fx.intro = 1.25; };
  FX.level = function (game) {
    if (!game.fx) return; game.fx.level = 0.65; game.fx.xp = 1;
    FX.slow(game, 0.16);
  };
  FX.collect = function (game, tier) {
    const s = game.fx; if (!s) return; s.xp = Math.min(1, s.xp + 0.28);
    if (s.collectCd > 0) return; s.collectCd = s.low ? 0.12 : 0.045;
    const p = game.player, f = tier === 2 ? 5 : tier === 1 ? 3 : 1;
    G.burst(game, p.x, p.y - 6, COLORS[f], s.low ? 1 : 3, 65, true, f);
  };

  FX.drawGhosts = function (ctx, game) {
    const s = game.fx;
    for (const v of s.ghosts) {
      if (v.life <= 0) continue;
      const t = 1 - v.life / v.max, a = 1 - t;
      ctx.globalAlpha = a * a * 0.65;
      if (v.spr) G.drawSprite(ctx, v.spr, v.x, v.y - t * 15, v.scale * (1 + t * 0.14), v.flip, t < 0.2 ? 0.8 : 0);
      else { ctx.fillStyle = COLORS[v.f]; ctx.fillRect(v.x - v.r * a, v.y - v.r * 2 * a, v.r * 2 * a, v.r * 2 * a); }
    }
    ctx.globalAlpha = 1;
  };
  FX.drawHits = function (ctx, game) {
    for (const v of game.fx.hits) {
      if (v.life <= 0) continue;
      const t = v.life / v.max, r = v.r * (1.45 - t * 0.45);
      ctx.save(); ctx.translate(v.x, v.y); ctx.rotate(v.angle);
      ctx.globalAlpha = Math.min(1, t * 2) * (game.fx.quiet ? 0.55 : 0.9);
      ctx.drawImage(impact[v.f], -r, -r, r * 2, r * 2); ctx.restore();
    }
  };
  FX.trail = function (ctx, game, x, y, vx, vy, speed, f, alpha) {
    if (game.fx.low || game.fx.quiet) return;
    const d = Math.hypot(vx, vy); if (d < 1) return;
    const len = Math.min(46, speed * 0.055), nx = -vy / d * 2.2, ny = vx / d * 2.2;
    ctx.globalAlpha = alpha || 0.5; ctx.fillStyle = COLORS[f]; ctx.beginPath();
    ctx.moveTo(x + nx, y + ny); ctx.lineTo(x - vx / d * len, y - vy / d * len); ctx.lineTo(x - nx, y - ny); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  };
  FX.beacon = function (ctx, game, it) {
    if (game.fx.low || (it.kind !== 'chest' && it.kind !== 'heal')) return;
    const f = it.kind === 'heal' ? 3 : 4, h = it.kind === 'chest' ? 100 : 65;
    ctx.globalAlpha = game.fx.quiet ? 0.5 : 0.48 + Math.sin(game.clock * 2 + it.phase) * 0.07;
    ctx.drawImage(beams[f], it.x - 17, it.y - h, 34, h);
    ctx.strokeStyle = COLORS[f]; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(it.x, it.y + 3, 20, 7, 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
  };
  FX.drawAtmosphere = function (ctx, game, lx, ly, dying) {
    const key = game.stage.id + ':' + game.w + ':' + game.h + ':' + game.fx.low;
    const w = game.w, h = game.h, pad = 96;
    if (key !== atmosphereKey) {
      atmosphereKey = key;
      const scale = Math.min(0.5, 640 / Math.max(w + pad * 2, h + pad * 2));
      atmosphere = canvas(Math.ceil((w + pad * 2) * scale), Math.ceil((h + pad * 2) * scale));
      const c = atmosphere.getContext('2d'); c.scale(scale, scale);
      c.fillStyle = (GRADE[game.stage.id] || GRADE.forest) + (game.fx.low ? '0a' : '12'); c.fillRect(0, 0, w + pad * 2, h + pad * 2);
      const g = c.createRadialGradient(w / 2 + pad, h / 2 + pad, Math.min(w, h) * 0.12, w / 2 + pad, h / 2 + pad, Math.hypot(w, h) * 0.64);
      const dark = game.stage.dark.join(',');
      g.addColorStop(0, 'rgba(' + dark + ',0)'); g.addColorStop(0.45, 'rgba(' + dark + ',0.2)'); g.addColorStop(1, 'rgba(' + dark + ',0.79)');
      c.fillStyle = g; c.fillRect(0, 0, w + pad * 2, h + pad * 2);
    }
    ctx.globalAlpha = dying ? 1 : 0.92;
    ctx.drawImage(atmosphere, -pad + G.clamp(lx - w / 2, -pad + 2, pad - 2), -pad + G.clamp(ly - h / 2, -pad + 2, pad - 2), w + pad * 2, h + pad * 2);
    ctx.globalAlpha = 1;
  };
  // 화면 효과는 이 한 장에 합쳐 찍는다. 화면 전체 합성은 분위기 + 피격의 두 번 이하.
  const overlay = canvas(256, 256), overlayCtx = overlay.getContext('2d');
  FX.drawScreen = function (ctx, game) {
    const p = game.player, s = game.fx;
    const hit = Math.max(0, 1 - (game.clock - game.hurtAt) / 0.45);
    const low = p.hp > 0 && p.hp / p.maxHp < 0.3 ? (s.quiet ? 0.24 : 0.24 + Math.sin(game.clock * 6) * 0.07) : 0;
    const a = Math.max(hit * 0.8, low) * (s.quiet ? 0.6 : 1), f = game.flash;
    if (a > 0.001 || f) {
      overlayCtx.clearRect(0, 0, 256, 256);
      if (a > 0.001) { overlayCtx.globalAlpha = a; overlayCtx.drawImage(hurt, 0, 0); overlayCtx.globalAlpha = 1; }
      if (f) { overlayCtx.fillStyle = 'rgba(' + f.rgb + ',' + f.alpha * f.life / f.max + ')'; overlayCtx.fillRect(0, 0, 256, 256); }
      ctx.drawImage(overlay, 0, 0, game.w, game.h);
    }
    if (s.intro > 0 && s.motion) {
      const k = Math.min(1, (1.25 - s.intro) / 0.16, s.intro / 0.35), h = Math.min(25, game.h * 0.03) * k;
      ctx.fillStyle = '#03080be6'; ctx.fillRect(0, 0, game.w, h); ctx.fillRect(0, game.h - h, game.w, h);
      ctx.fillStyle = '#c58c6955'; ctx.fillRect(0, h - 1, game.w, 1); ctx.fillRect(0, game.h - h, game.w, 1);
    }
  };
})(window.G);
