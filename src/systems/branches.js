// 무기 분기·조합 로직 (데이터는 src/data/branches.js)
// - Lv 6~10 수치를 Lv 5에서 만들어 붙인다
// - G.weaponStats: 갈래(b5·b10) 수치·효과를 얹고, 조합 무기는 메인 Lv 10 + 갈래 + 조합 보너스 + 상대의 힘
// - 맞힐 때 효과(fx): 무기가 움직이는 동안 G.curFx에 담겨 G.damageEnemy가 G.applyHitFx를 부른다
// - 화상·중독은 G.updateDots가 0.5초마다 피해를 준다
(function (G) {
  'use strict';

  G.WEAPON_MAX = 10;
  G.BRANCH_LEVELS = [5, 10];
  const INT_FIELDS = { count: 1, pierce: 1, targets: 1, jumps: 1, hits: 1, freezeAt: 1 };
  const AREA_FIELDS = ['radius', 'range', 'length', 'spread'];

  // ---------- Lv 6~10 ----------
  Object.keys(G.WEAPONS).forEach((k) => {
    const def = G.WEAPONS[k];
    if (def.kind !== 'base' || def.levels.length !== 5) return;
    const l5 = def.levels[4];
    for (let n = 1; n <= 5; n++) {
      const s = Object.assign({}, l5);
      if (typeof s.dmg === 'number') s.dmg = Math.round(l5.dmg * Math.pow(1.15, n) * 10) / 10;
      if (typeof s.cd === 'number') s.cd = Math.round(l5.cd * Math.pow(0.96, n) * 1000) / 1000;
      AREA_FIELDS.forEach((f) => { if (typeof s[f] === 'number') s[f] = Math.round(l5[f] * Math.pow(1.03, n)); });
      if (typeof s.count === 'number' && n >= 2) s.count = l5.count + (n >= 5 ? 2 : 1);
      def.levels.push(s);
    }
    def.notes = def.notes.concat(['피해 +15%, 더 자주', '피해 +15%, 하나 더', '피해 +15%, 범위 증가', '피해 +15%, 더 자주', '피해 +15%, 하나 더']);
  });

  // ---------- 갈래 ----------
  G.branchesFor = function (key) { return G.BRANCHES[key] || null; };
  G.branchById = function (key, tier, id, b5) {
    const br = G.BRANCHES[key];
    if (!br || !id) return null;
    const list = tier === 5 ? br.b5 : (br.b10[b5] || []);
    return list.find((x) => x.id === id) || null;
  };
  // 이 레벨에서 고를 갈래가 남았는지
  G.needsBranch = function (w) {
    if (!G.BRANCHES[w.key] || G.WEAPONS[w.key].kind !== 'base') return false;
    return (w.level >= 5 && !w.b5) || (w.level >= 10 && !w.b10);
  };
  G.branchChoices = function (w) {
    const br = G.BRANCHES[w.key];
    const list = !w.b5 ? br.b5 : br.b10[w.b5] || [];
    const tier = !w.b5 ? 5 : 10;
    return list.map((x) => ({ kind: 'branch', key: w.key, tier, id: x.id, level: w.level }));
  };
  G.applyBranch = function (w, c) {
    if (c.tier === 5) w.b5 = c.id; else w.b10 = c.id;
    w._sk = null;
  };

  function mergeMods(out, m) {
    if (!m) return out;
    if (m.mul) for (const f in m.mul) if (typeof out[f] === 'number') out[f] *= m.mul[f];
    if (m.add) for (const f in m.add) if (typeof out[f] === 'number') out[f] += m.add[f];
    if (m.fx) {
      out.fx = Object.assign({}, out.fx);
      for (const f in m.fx) out.fx[f] = (out.fx[f] || 0) + m.fx[f];
    }
    return out;
  }
  function finish(s) {
    for (const f in INT_FIELDS) if (typeof s[f] === 'number') s[f] = Math.max(1, Math.round(s[f]));
    return s;
  }

  const baseStats = function (w) {
    const levels = G.WEAPONS[w.key].levels;
    return levels[Math.min(w.level, levels.length) - 1];
  };

  // 수치는 무기마다 한 번 만들어 두고, 레벨·갈래가 바뀌면 다시 만든다
  G.weaponStats = function (w) {
    const def = G.WEAPONS[w.key];
    if (def.kind === 'xcombo') {
      const sk = 'x' + w.b5 + w.b10;
      if (w._sk !== sk) {
        const main = G.WEAPONS[def.main];
        let s = Object.assign({}, main.levels[main.levels.length - 1]);
        s = mergeMods(s, G.branchById(def.main, 5, def.b5));
        s = mergeMods(s, G.branchById(def.main, 10, w.b10, def.b5));
        s = mergeMods(s, G.COMBO_BOOST);
        s = mergeMods(s, { fx: G.COMBO_SIG[def.sub].fx });
        w._s = finish(s);
        w._sk = sk;
      }
      return w._s;
    }
    if (!w.b5 && !w.b10) return baseStats(w);
    const sk = w.level + ':' + w.b5 + ':' + w.b10;
    if (w._sk !== sk) {
      let s = Object.assign({}, baseStats(w));
      s = mergeMods(s, G.branchById(w.key, 5, w.b5));
      s = mergeMods(s, G.branchById(w.key, 10, w.b10, w.b5));
      w._s = finish(s);
      w._sk = sk;
    }
    return w._s;
  };

  // ---------- 효과 글 ----------
  const FX_NAME = { burn: '화상', poison: '중독', chill: '냉기', stun: '기절', knock: '밀쳐냄', lifesteal: '흡혈', execute: '처형', explode: '폭발', chain: '연쇄' };
  G.fxText = function (fx) {
    return Object.keys(fx || {}).filter((k) => FX_NAME[k]).map((k) => FX_NAME[k]).join('·');
  };

  // ---------- 조합 (메인 + 상대 → 새 무기 하나) ----------
  G.XCOMBOS = [];
  Object.keys(G.BRANCHES).forEach((main) => {
    G.BRANCHES[main].b5.forEach((br) => {
      (br.subs || []).forEach((sub) => {
        if (!G.WEAPONS[sub] || !G.COMBO_SIG[sub]) return;
        const key = 'x_' + main + '_' + br.id + '_' + sub;
        const name = G.COMBO_SIG[sub].adj + ' ' + br.name;
        G.WEAPONS[key] = {
          kind: 'xcombo', main, sub, b5: br.id, from: [main, sub], icon: main, name,
          desc: br.name + '에 ' + G.WEAPONS[sub].name + '의 힘이 깃듭니다: ' + G.fxText(G.COMBO_SIG[sub].fx) + ', 피해 +60%',
          levels: [{}],
        };
        G.XCOMBOS.push({ key, main, b5: br.id, sub });
      });
    });
  });
  // 동작은 메인 무기 것을 그대로 쓴다 (동작 파일이 모두 불린 뒤라 여기서 연결)
  G.XCOMBOS.forEach((c) => { G.WEAPON_BEHAVIORS[c.key] = G.WEAPON_BEHAVIORS[c.main]; });

  // 이 무기(다음 레벨 lv)가 지금 빌드에서 어떤 조합에 이어지는지 한 줄
  G.xcomboHint = function (p, key, lv) {
    const own = p.weapons.find((w) => w.key === key);
    const lines = [];
    G.XCOMBOS.forEach((c) => {
      const def = G.WEAPONS[c.key];
      if (c.main === key && own && own.b5 === c.b5) {
        const s = p.weapons.find((w) => w.key === c.sub);
        if (s) lines.push(def.name + ' 메인까지 Lv ' + lv + '/10 · ' + G.WEAPONS[c.sub].name + ' Lv ' + s.level + '/5');
      }
      if (c.sub === key) {
        const m = p.weapons.find((w) => w.key === c.main && w.b5 === c.b5);
        if (m) lines.push(def.name + '의 재료 (' + G.WEAPONS[c.main].name + ' Lv ' + m.level + '/10, 이것 Lv ' + lv + '/5)');
      }
    });
    if (!lines.length && own && !own.b5 && lv < 5) return 'Lv 5 갈래에 따라 조합 상대가 정해집니다';
    return lines[0] || '';
  };

  // 지금 빌드와 관련된 조합들(선택창의 조합 도감): 준비됨 → 재료 일부 → 나머지
  G.xcomboBook = function (p, all) {
    const rows = G.XCOMBOS.map((c) => {
      const m = p.weapons.find((w) => w.key === c.main);
      const s = p.weapons.find((w) => w.key === c.sub);
      const mainOk = !!m && m.level >= 10 && m.b5 === c.b5 && !!m.b10;
      const subOk = !!s && s.level >= 5;
      const related = (m && (!m.b5 || m.b5 === c.b5)) || !!s;
      return { c, def: G.WEAPONS[c.key], m, s, ready: mainOk && subOk, related, score: (mainOk ? 2 : m ? 1 : 0) + (subOk ? 2 : s ? 1 : 0) };
    });
    return rows.filter((x) => all || x.related).sort((a, b) => (b.ready - a.ready) || (b.score - a.score));
  };

  // 지금 만들 수 있는 조합: 메인 Lv 10(두 갈래 고름) + 상대 Lv 5 이상
  G.xcomboOptions = function (p) {
    const out = [];
    G.XCOMBOS.forEach((c) => {
      const m = p.weapons.find((w) => w.key === c.main);
      const s = p.weapons.find((w) => w.key === c.sub);
      if (m && s && m.level >= 10 && m.b5 === c.b5 && m.b10 && s.level >= 5) out.push({ kind: 'xcombo', key: c.key, main: c.main, sub: c.sub });
    });
    return out;
  };

  G.applyXcombo = function (game, opt) {
    const p = game.player;
    const m = p.weapons.find((w) => w.key === opt.main);
    const idx = p.weapons.indexOf(m);
    const b10 = m.b10;
    p.weapons = p.weapons.filter((w) => w.key !== opt.main && w.key !== opt.sub);
    const nw = { key: opt.key, level: 1, timer: 0.2, state: {}, b5: G.WEAPONS[opt.key].b5, b10 };
    p.weapons.splice(Math.min(idx, p.weapons.length), 0, nw);
    const def = G.WEAPONS[opt.key];
    G.announce(game, '무기 조합! ' + def.name);
    G.burst(game, p.x, p.y, 'rgba(255, 210, 120, 0.95)', 46, 320, true);
    G.ring(game, p.x, p.y, 10, 300, 0.8, 'rgba(255, 214, 130, 0.95)', 8);
    G.screenFlash(game, '255, 220, 150', 0.35, 0.6);
    G.addShake(game, 6);
    return { key: opt.key, result: opt.key, name: def.name, desc: def.desc, type: 'union', typeLabel: '무기 조합' };
  };

  // ---------- 맞힐 때 효과 ----------
  G.curFx = null;
  let inFx = false;
  const near = [];
  G.applyHitFx = function (game, e, dmg, fx) {
    if (inFx || !fx) return;
    inFx = true;
    const p = game.player;
    if (fx.burn) { e.burnDps = Math.max(e.burnDps || 0, dmg * fx.burn * (1 + p.stats.burnBonus)); e.burnT = 3; }
    if (fx.poison) { e.poisonDps = Math.min((e.poisonDps || 0) + dmg * fx.poison * 0.5, dmg * fx.poison * 4); e.poisonT = 4; }
    if (fx.chill) {
      e.slow = Math.max(e.slow || 0, 1.5);
      e.slowMul = Math.min(e.slowMul || 1, 0.6);
      if (!e.boss) {
        e.chillN = (e.chillN || 0) + fx.chill;
        if (e.chillN >= 4) { e.chillN = 0; e.stun = Math.max(e.stun || 0, 1); e.frozenUntil = game.time + 1; }
      }
    }
    if (fx.stun && !e.boss && Math.random() < 0.5) e.stun = Math.max(e.stun || 0, fx.stun);
    if (fx.knock) {
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
      const res = e.boss ? 0.05 : e.elite ? 0.2 : 1;
      e.kx += (dx / d) * fx.knock * res;
      e.ky += (dy / d) * fx.knock * res;
    }
    if (fx.lifesteal && p.hp > 0) {
      const now = game.time;
      if (game.lsSec !== Math.floor(now)) { game.lsSec = Math.floor(now); game.lsLeft = 6; } // 1초에 최대 6 회복
      const h = Math.min(game.lsLeft, dmg * fx.lifesteal);
      if (h > 0) { p.hp = Math.min(p.maxHp, p.hp + h); game.lsLeft -= h; }
    }
    if (fx.execute && !e.boss && !e.dead && e.hp > 0 && e.hp < e.maxHp * fx.execute) {
      e.hp = 0;
      G.addDamageNumber(game, e.x, e.y - e.r - 14, '처형', 'crit');
      G.killEnemy(game, e);
    }
    const budget = game.fxBudget > 0;
    if (fx.explode && budget) {
      game.fxBudget--;
      const r = G.area(game, fx.explode);
      G.hitCircle(game, e.x, e.y, r, dmg * 0.45 / p.stats.damage, { soft: true });
      if (game.rings.length < 30) G.ring(game, e.x, e.y, r * 0.2, r, 0.3, 'rgba(255, 170, 90, 0.85)', 3);
    }
    if (fx.chain && budget) {
      game.fxBudget--;
      G.enemiesInCircle(game, e.x, e.y, 150, near);
      let n = 0;
      for (const o of near) {
        if (o === e || o.dead) continue;
        G.damageEnemy(game, o, dmg * 0.5 / p.stats.damage, 0, 0, true);
        if (game.particles.length < 250) G.burst(game, o.x, o.y, 'rgba(160, 210, 255, 0.95)', 3, 120, true);
        if (++n >= fx.chain) break;
      }
    }
    inFx = false;
  };

  // 화상·중독: 0.5초마다
  G.updateDots = function (game, dt) {
    const dmgMul = game.player.stats.damage;
    for (const e of game.enemies) {
      if (e.dead || !(e.burnT > 0 || e.poisonT > 0)) continue;
      e.burnT = (e.burnT || 0) - dt;
      e.poisonT = (e.poisonT || 0) - dt;
      if (e.burnT <= 0) e.burnDps = 0;
      if (e.poisonT <= 0) e.poisonDps = 0;
      e.dotT = (e.dotT || 0) - dt;
      if (e.dotT <= 0) {
        e.dotT = 0.5;
        const amt = ((e.burnDps || 0) + (e.poisonDps || 0)) * 0.5;
        if (amt > 0) G.damageEnemy(game, e, amt / dmgMul, 0, 0, true);
      }
    }
  };

  // 불타는 적은 주황, 중독된 적은 연두, 얼어붙은 적은 하늘빛
  G.drawDotGlow = function (ctx, game) {
    for (const e of game.enemies) {
      if (e.dead) continue;
      const col = e.frozenUntil > game.time ? 'rgba(150, 225, 255, 0.7)' : e.burnT > 0 ? 'rgba(255, 140, 60, 0.6)' : e.poisonT > 0 ? 'rgba(150, 230, 90, 0.55)' : null;
      if (col && G.inView(game, e.x, e.y, 30)) G.drawGlow(ctx, col, e.x, e.y, e.r * 1.6, 0.5);
    }
  };
})(window.G);
