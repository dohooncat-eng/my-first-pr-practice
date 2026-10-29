// 스프라이트: assets/sprites의 SVG 그림을 불러와 미리 캔버스로 래스터화해 둔다.
// 크기·기준점은 docs/art-style.md의 표와 같다.
(function (G) {
  'use strict';

  const BASE = 'assets/sprites/';
  const RES = 3; // 게임 크기의 몇 배 해상도로 굽는지 (확대·고해상도 화면 대비)

  // 이름: { frames, w, h (월드 단위), ax, ay (기준점 비율) }
  const LIST = {
    player: { frames: 4, w: 60, h: 60, ax: 0.5, ay: 116 / 128 },
    slime: { frames: 4, w: 42, h: 42, ax: 0.5, ay: 86 / 96 },
    bat: { frames: 4, w: 50, h: 43, ax: 0.5, ay: 0.5 },
    golem: { frames: 4, w: 66, h: 66, ax: 0.5, ay: 118 / 128 },
    bolt: { w: 34, h: 17, ax: 48 / 64, ay: 0.5 },
    orb: { w: 26, h: 26 },
    slash: { w: 128, h: 128 },
    gem_0: { w: 13, h: 16 },
    gem_1: { w: 15, h: 19 },
    gem_2: { w: 18, h: 22 },
    item_heal: { w: 28, h: 28 },
    item_magnet: { w: 28, h: 28 },
    ground_tile: { w: 256, h: 256, res: 2 },
    decal_grass_0: { w: 40, h: 40 },
    decal_grass_1: { w: 40, h: 40 },
    decal_stone: { w: 40, h: 40 },
    decal_mushroom: { w: 40, h: 40 },
    decal_flowers: { w: 40, h: 40 },
    decal_roots: { w: 40, h: 40 },
  };
  G.ICONS = ['bolt', 'sword', 'orb', 'aura', 'vitality', 'swift', 'might', 'haste', 'magnet', 'heal'];
  G.ICONS.forEach((k) => { LIST['icon_' + k] = { w: 32, h: 32, res: 2 }; });
  G.DECALS = ['decal_grass_0', 'decal_grass_1', 'decal_stone', 'decal_mushroom', 'decal_flowers', 'decal_roots'];

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
    const res = def.res || RES;
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

  // 기준점이 (x, y)에 오도록 그린다. flash(0~1)만큼 흰 실루엣을 겹친다.
  G.drawSprite = function (ctx, spr, x, y, scale, flipX, flash) {
    const w = spr.w * scale, h = spr.h * scale;
    ctx.save();
    ctx.translate(x, y);
    if (flipX) ctx.scale(-1, 1);
    ctx.drawImage(spr.img, -spr.ax * w, -spr.ay * h, w, h);
    if (flash > 0) {
      ctx.globalAlpha *= Math.min(1, flash);
      ctx.drawImage(spr.flash, -spr.ax * w, -spr.ay * h, w, h);
    }
    ctx.restore();
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
