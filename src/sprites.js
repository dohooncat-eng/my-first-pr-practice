// 스프라이트: assets/sprites의 SVG 그림을 불러와 미리 캔버스로 래스터화해 둔다.
// 크기·기준점은 docs/art-style.md의 표와 같다.
(function (G) {
  'use strict';

  const BASE = 'assets/sprites/';
  // 게임 크기의 몇 배 해상도로 굽는지. 화면에서 월드 1단위가 차지하는 픽셀 수에 맞춰 1.5~3배로 정한다
  // (휴대폰처럼 작게 그려지는 화면은 작게 구워서 그리기가 가볍고, 거의 1:1로 그려지므로 빠른 보간으로도 깨끗하다)
  const RES_MAX = 3;
  G.spriteRes = RES_MAX;

  function pickRes() {
    const g = G.game;
    const px = g && g.dpr && g.zoom ? g.dpr * g.zoom : RES_MAX;
    return Math.max(1.5, Math.min(RES_MAX, px * 1.15));
  }

  // 이름: { frames, w, h (월드 단위), ax, ay (기준점 비율), res(굽기 배율) }
  const LIST = {
    bolt: { w: 28, h: 14, ax: 48 / 64, ay: 0.5 },
    orb: { w: 22, h: 22 },
    slash: { w: 128, h: 128 },
    scythe: { w: 28, h: 28 },
    meteor: { w: 25, h: 38, ay: 72 / 96 },
    poison_pool: { w: 128, h: 128, res: 2 },
    spark: { w: 20, h: 20 },
    sun: { w: 40, h: 40 },
    trap: { w: 30, h: 30 },
    moth: { w: 24, h: 24 },
    frost: { w: 22, h: 22 },
    shield: { w: 30, h: 30 },
    tornado: { w: 64, h: 80, ay: 0.85 },
    gem_0: { w: 13, h: 16 },
    gem_1: { w: 15, h: 19 },
    gem_2: { w: 18, h: 22 },
    item_heal: { w: 28, h: 28 },
    item_magnet: { w: 28, h: 28 },
    chest: { w: 44, h: 44, ay: 86 / 96 },
    chest_boss: { w: 52, h: 52, ay: 86 / 96 },
    coin: { w: 14, h: 14 },
  };
  // 데이터 파일(적·스테이지·무기)은 이 파일보다 늦게 불러오므로, 목록은 불러오기 직전에 채운다
  function addDataSprites() {
    // 챔피언 (오른쪽을 보는 걷기 4프레임)
    ['player', 'knight', 'witch', 'hunter'].forEach((k) => {
      LIST[k] = { frames: 4, w: 60, h: 60, ax: 0.5, ay: 116 / 128 };
    });
    // 적: 역할별 규격
    const ROLE_SPEC = {
      basic: { frames: 4, w: 42, h: 42, ax: 0.5, ay: 86 / 96 },
      fast: { frames: 4, w: 50, h: 43, ax: 0.5, ay: 0.5 },
      tank: { frames: 4, w: 66, h: 66, ax: 0.5, ay: 118 / 128 },
      ranged: { frames: 4, w: 44, h: 48, ax: 0.5, ay: 0.9 },
    };
    Object.keys(G.ENEMY_TYPES || {}).forEach((k) => { LIST[k] = ROLE_SPEC[G.ENEMY_TYPES[k].role]; });
    Object.keys(G.BOSS_TYPES || {}).forEach((k) => {
      LIST['boss_' + k] = { frames: 4, w: 120, h: 120, ax: 0.5, ay: 180 / 192, res: 2.5 };
    });
    // 바닥 타일과 장식
    (G.STAGES || []).forEach((st) => {
      LIST[st.ground] = { w: 256, h: 256, res: 2 };
      st.decals.forEach((d) => { LIST[d] = { w: 40, h: 40 }; });
    });
    // 아이콘: 무기·패시브·조합·회복
    G.ICONS = Object.keys(G.WEAPONS || {}).concat(Object.keys(G.PASSIVES || {}), Object.keys(G.FUSIONS || {}), ['heal']);
    G.ICONS.forEach((k) => { LIST['icon_' + k] = { w: 32, h: 32, res: 2 }; });
  }

  const store = {};

  G.spriteUrl = function (file) { return BASE + file + '.svg'; };

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function bake(img, def) {
    const res = (def.res || RES_MAX) * (G.spriteRes / RES_MAX);
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(def.w * res));
    c.height = Math.max(1, Math.round(def.h * res));
    const cx = c.getContext('2d');
    cx.imageSmoothingQuality = 'high';
    cx.drawImage(img, 0, 0, c.width, c.height);
    // 맞았을 때 번쩍이는 흰 실루엣
    const f = document.createElement('canvas');
    f.width = c.width;
    f.height = c.height;
    const fx = f.getContext('2d');
    fx.drawImage(c, 0, 0);
    fx.globalCompositeOperation = 'source-atop';
    fx.fillStyle = 'rgba(255, 246, 228, 0.9)';
    fx.fillRect(0, 0, f.width, f.height);
    return {
      img: c, flash: f, w: def.w, h: def.h,
      ax: def.ax === undefined ? 0.5 : def.ax,
      ay: def.ay === undefined ? 0.5 : def.ay,
    };
  }

  // 모든 그림을 불러온다. 없는 그림은 건너뛰고 게임은 대체 도형으로 그린다.
  G.loadSprites = function (onProgress) {
    addDataSprites();
    G.spriteRes = pickRes();
    const jobs = [];
    Object.keys(LIST).forEach((name) => {
      const def = LIST[name];
      const files = def.frames ? Array.from({ length: def.frames }, (_, i) => name + '_' + i) : [name];
      files.forEach((file) => jobs.push({ name, def, file }));
    });
    let done = 0;
    return Promise.all(jobs.map((job) => loadImage(G.spriteUrl(job.file)).then((img) => {
      if (img) {
        try { store[job.file] = bake(img, job.def); } catch (e) { /* 굽기 실패 시 대체 도형 */ }
      }
      done++;
      if (onProgress) onProgress(done / jobs.length);
    })));
  };

  G.art = {
    get(name, frame) {
      return store[frame === undefined ? name : name + '_' + frame] || null;
    },
  };

  // 좌우 반전 그림은 처음 쓸 때 한 번 구워 둔다 (매번 save·scale·restore 하지 않게)
  function mirror(src) {
    const c = document.createElement('canvas');
    c.width = src.width;
    c.height = src.height;
    const cx = c.getContext('2d');
    cx.translate(c.width, 0);
    cx.scale(-1, 1);
    cx.drawImage(src, 0, 0);
    return c;
  }

  // 유닛의 부드러운 바닥 그림자도 걷기 프레임에 함께 굽는다.
  // 수백 마리의 그림자를 별도 drawImage로 찍지 않고 본체와 한 번에 그린다.
  G.unitSprite = function (spr, spec) {
    if (spr.unit) return spr.unit;
    const res = spr.img.width / spr.w, offset = spec.fly ? 18 - spec.feet : 0;
    const left = Math.max(spr.w * spr.ax, spec.shadow * 1.25);
    const right = Math.max(spr.w * (1 - spr.ax), spec.shadow * 1.25);
    const top = spr.h * spr.ay;
    const bottom = Math.max(spr.h * (1 - spr.ay), offset + spec.shadow * 0.5);
    const w = left + right, h = top + bottom;
    const c = document.createElement('canvas'); c.width = Math.ceil(w * res); c.height = Math.ceil(h * res);
    const cx = c.getContext('2d'); cx.scale(res, res);
    G.fx.shadow(cx, left, top + offset, spec.shadow, spec.fly ? 0.65 : 1);
    cx.drawImage(spr.img, left - spr.ax * spr.w, 0, spr.w, spr.h);
    const f = document.createElement('canvas'); f.width = c.width; f.height = c.height;
    const fc = f.getContext('2d'); fc.scale(res, res); fc.drawImage(spr.flash, left - spr.ax * spr.w, 0, spr.w, spr.h);
    return spr.unit = { img: c, flash: f, w, h, ax: left / w, ay: top / h };
  };

  // 기준점이 (x, y)에 오도록 그린다. flash(0~1)만큼 흰 실루엣을 겹친다.
  G.drawSprite = function (ctx, spr, x, y, scale, flipX, flash, stretchX, stretchY) {
    const w = spr.w * scale * (stretchX || 1), h = spr.h * scale * (stretchY || 1);
    let img = spr.img, fl = spr.flash, ax = spr.ax;
    if (flipX) {
      if (!spr.imgFlip) { spr.imgFlip = mirror(spr.img); spr.flashFlip = mirror(spr.flash); }
      img = spr.imgFlip;
      fl = spr.flashFlip;
      ax = 1 - ax;
    }
    const dx = x - ax * w, dy = y - spr.ay * h;
    ctx.drawImage(img, dx, dy, w, h);
    if (flash > 0) {
      const a = ctx.globalAlpha;
      ctx.globalAlpha = a * Math.min(1, flash);
      ctx.drawImage(fl, dx, dy, w, h);
      ctx.globalAlpha = a;
    }
  };

  // 빛 번짐용 원형 그라디언트 (가산 합성으로 그린다)
  const glowCache = {};
  G.glow = function (color) {
    if (glowCache[color]) return glowCache[color];
    const size = 128;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const cx = c.getContext('2d');
    const g = cx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, color);
    g.addColorStop(0.25, color.replace(/[\d.]+\)$/, (a) => (parseFloat(a) * 0.55) + ')'));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = g;
    cx.fillRect(0, 0, size, size);
    glowCache[color] = c;
    return c;
  };

  G.drawGlow = function (ctx, color, x, y, radius, alpha) {
    const img = G.glow(color);
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2);
    ctx.globalAlpha = 1;
  };
})(window.G);
