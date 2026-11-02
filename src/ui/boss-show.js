// 보스의 표시용 이야기와 연출. 전투 수치·판정과 독립적으로 그림이 교체되어도 같은 무대를 쓴다.
(function (G) {
  'use strict';
  const TAU = Math.PI * 2;
  const DISPLAY = '"Black Han Sans", "IBM Plex Sans KR", sans-serif';
  const BODY = '"IBM Plex Sans KR", sans-serif';
  G.BOSS_PRESENTATION = {
    treant: { title: '첫 번째 밤의 뿌리', pattern: '부하를 부르고, 발밑에 거대한 뿌리를 내려찍습니다.', omen: '숲의 가장 오래된 밤이 눈을 뜬다.', color: '#b1ce83' },
    marshqueen: { title: '가라앉은 자들의 왕관', pattern: '등불을 향해 도약한 뒤 사방으로 독 탄을 흩뿌립니다.', omen: '물 아래 잠든 왕국이 떠오른다.', color: '#c5dc81' },
    ashknight: { title: '재가 되어도 꺾이지 않는 맹세', pattern: '경고선을 따라 돌진하고, 잿불 탄을 둥글게 쏩니다.', omen: '꺼진 성채에서 마지막 맹세가 울린다.', color: '#f4a176' },
    eclipse: { title: '떨어진 달을 삼킨 자', pattern: '나선 탄막을 펼치며 등불 주위로 순간 이동합니다.', omen: '별빛이 지고, 군주의 밤이 열린다.', color: '#c6b6f1' },
    wintermaw: { title: '불빛을 끄는 겨울의 숨', pattern: '얼음 숨결을 부채꼴로 뿜고, 경고선 위로 돌진합니다.', omen: '협곡의 모든 숨이 얼어붙는다.', color: '#bde9f6' },
    forgeheart: { title: '빛 없이 타오르는 심장', pattern: '쇳물 장판을 떨어뜨리고 불씨 부하들을 불러냅니다.', omen: '산 아래 삼켜진 불들이 고동친다.', color: '#f5b36d' },
    lakemother: { title: '거울 아래 잠든 달', pattern: '물 위로 도약한 뒤 원형 탄막으로 퇴로를 막습니다.', omen: '비친 달이 수면 너머에서 눈을 뜬다.', color: '#a8d9f2' },
    tempestlord: { title: '새벽으로 가는 길의 파수꾼', pattern: '나선 탄막과 순간 이동으로 등불을 에워쌉니다.', omen: '해가 진 쪽에서 폭풍이 내려온다.', color: '#c8e6e7' },
    witheredqueen: { title: '마지막 햇살의 가시 왕좌', pattern: '여러 갈래 경고선에서 가시를 한꺼번에 솟게 합니다.', omen: '시든 꽃 속 마지막 햇살이 몸부림친다.', color: '#dfb6eb' },
    nightless: { title: '모든 등불의 종말', pattern: '가시·나선 탄막·숨결을 번갈아 펼쳐 전장을 잠식합니다.', omen: '세상의 끝에서, 밤이 이름을 얻는다.', color: '#c0b2ef' },
  };
  G.bossPresentation = function (type) { return G.BOSS_PRESENTATION[type] || G.BOSS_PRESENTATION.treant; };

  let scene = null, portrait, title, epithet, omen, band, place, skip;
  function makeScene() {
    if (scene) return;
    scene = document.createElement('section');
    scene.id = 'boss-intro'; scene.className = 'boss-intro'; scene.hidden = true;
    scene.setAttribute('role', 'dialog'); scene.setAttribute('aria-modal', 'true');
    scene.setAttribute('aria-labelledby', 'boss-intro-name');
    scene.setAttribute('aria-describedby', 'boss-intro-title');
    scene.innerHTML = '<img class="boss-intro-land" alt=""><div class="boss-intro-shade"></div>' +
      '<header class="boss-intro-head"><span class="boss-intro-place"></span><button type="button" class="boss-intro-pause" aria-label="일시정지">Ⅱ</button></header>' +
      '<div class="boss-intro-band"></div><div class="boss-intro-stage" aria-hidden="true"><img class="boss-intro-seal" src="assets/sprites/ui_boss_seal.svg" alt=""><span class="boss-intro-fallback"></span><img class="boss-intro-art" alt=""></div>' +
      '<div class="boss-intro-copy"><h2 id="boss-intro-name"></h2><p id="boss-intro-title"></p><p class="boss-intro-omen"></p></div>' +
      '<footer class="boss-intro-foot"><span>화면을 터치하면 바로 시작</span><button type="button" class="boss-intro-skip">전투 시작 <span aria-hidden="true">›</span></button><div class="boss-intro-time" aria-hidden="true"><i></i></div></footer>';
    document.body.appendChild(scene);
    portrait = scene.querySelector('.boss-intro-art'); title = scene.querySelector('h2');
    epithet = scene.querySelector('#boss-intro-title'); omen = scene.querySelector('.boss-intro-omen');
    band = scene.querySelector('.boss-intro-band'); place = scene.querySelector('.boss-intro-place');
    skip = scene.querySelector('.boss-intro-skip');
    portrait.addEventListener('error', () => { portrait.hidden = true; });
    scene.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (ev.target.closest('.boss-intro-pause')) { G.game.pause(); return; }
      G.endBossIntro(G.game);
    });
    // 이동 중 누른 키를 컷신 끝으로 넘기지 않는다. Esc/P는 일시정지, Enter/Space는 건너뛰기.
    window.addEventListener('keydown', (ev) => {
      if (scene.hidden || !G.game.bossIntro || G.game.state !== 'playing') return;
      ev.stopImmediatePropagation();
      if (ev.key === 'Tab') {
        ev.preventDefault();
        (document.activeElement === skip ? scene.querySelector('button') : skip).focus({ preventScroll: true });
      } else if (ev.key === 'Escape' || ev.code === 'KeyP') { ev.preventDefault(); G.game.pause(); }
      else if ((ev.key === 'Enter' || ev.code === 'Space') && !ev.repeat) { ev.preventDefault(); G.endBossIntro(G.game); }
    }, true);
  }
  G.beginBossIntro = function (game, e) {
    makeScene();
    const info = G.bossPresentation(e.type), quiet = G.fx.quiet(game);
    game.bossIntro = { e, t: 0, max: quiet ? 0.75 : e.final ? 3.4 : 2.6 };
    game.banner = null; G.input.clear();
    scene.className = 'boss-intro' + (e.final ? ' is-final' : '') + (quiet ? ' is-quiet' : '');
    scene.style.setProperty('--boss-color', info.color);
    scene.querySelector('.boss-intro-land').src = G.spriteUrl(game.stage.thumb);
    portrait.hidden = false; portrait.src = G.spriteUrl('boss_' + e.type + '_0');
    title.textContent = G.BOSS_TYPES[e.type].name; epithet.textContent = info.title;
    omen.textContent = info.omen; place.textContent = game.stage.name;
    band.textContent = e.final ? '최종 보스 · 이 밤의 끝' : '보스 출현 · ' + (e.index + 1) + '번째 조우';
    G.syncBossIntro(game); paintIntro(game);
    if (!scene.hidden) skip.focus({ preventScroll: true });
    if (G.music) { G.music.setBoss(true); G.music.duck(true); }
    if (G.sfx) G.sfx.play(e.final ? 'bossFinalArrival' : 'bossArrival');
  };
  G.syncBossIntro = function (game) {
    if (!scene) return;
    const visible = !!game.bossIntro && game.state === 'playing';
    const wasHidden = scene.hidden;
    scene.hidden = !visible;
    if (visible) {
      document.getElementById('pause-btn').hidden = true;
      if (wasHidden && skip) skip.focus({ preventScroll: true });
    }
  };
  G.endBossIntro = function (game) {
    if (!game.bossIntro || game.state !== 'playing') return;
    game.bossIntro = null;
    if (scene) scene.hidden = true;
    G.input.clear();
    if (document.activeElement && scene && scene.contains(document.activeElement)) document.activeElement.blur();
    if (G.music) G.music.duck(false);
    document.getElementById('pause-btn').hidden = false;
    G.fx.boss(game, game.boss);
  };
  function paintIntro(game) {
    const d = game.bossIntro, quiet = G.fx.quiet(game), t = d.t;
    const reveal = quiet ? 1 : 1 - Math.pow(1 - G.clamp((t - 0.18) / 1.05, 0, 1), 4);
    scene.style.setProperty('--boss-reveal', reveal.toFixed(3));
    scene.style.setProperty('--boss-progress', Math.min(1, t / d.max).toFixed(3));
    scene.style.setProperty('--boss-leave', quiet ? '1' : String(Math.min(1, (d.max - t) / 0.3)));
  }
  G.updateBossIntro = function (game, dt) {
    if (!game.bossIntro || game.state !== 'playing') return;
    if (G.fx.quiet(game)) game.bossIntro.max = Math.min(game.bossIntro.max, 0.75);
    game.bossIntro.t += dt;
    if (game.bossIntro.t >= game.bossIntro.max) G.endBossIntro(game);
    else paintIntro(game);
  };

  // 표시용 잔상 체력. 실제 체력은 읽기만 한다.
  G.updateBossPresentation = function (game, dt) {
    const e = game.boss;
    if (!e || e.dead) return;
    const hp = G.clamp(e.hp / e.maxHp, 0, 1);
    if (e.showHp === undefined || hp > e.showHp) e.showHp = hp;
    if (e.lastShowHp !== undefined && hp < e.lastShowHp) e.hpHold = 0.24;
    e.lastShowHp = hp; e.hpHold = Math.max(0, (e.hpHold || 0) - dt);
    if (!e.hpHold) e.showHp = Math.max(hp, e.showHp - dt * Math.max(0.12, (e.showHp - hp) * 2));
    e.cueLife = Math.max(0, (e.cueLife || 0) - dt);
    e.rageLife = Math.max(0, (e.rageLife || 0) - dt);
  };
  G.bossCue = function (game, e, kind, fired) {
    if (!e || e.dead) return;
    e.cueKind = kind; e.cueLife = fired ? 0.32 : 0.55; e.cueFired = !!fired;
    if (fired) {
      const c = G.bossPresentation(e.type).color;
      if (!G.fx.quiet(game)) G.ring(game, e.x, e.y, e.r * 0.7, e.r * 2.7, 0.45, c, 3);
      if (G.sfx) G.sfx.play(kind === 'nova' ? 'bossPulse' : kind === 'charge' ? 'bossRush' : 'bossCast');
      if (kind === 'nova' || kind === 'charge') G.addShake(game, 3);
    } else if (G.sfx) G.sfx.play('bossGather');
  };
  G.drawBossGround = function (ctx, game) {
    const e = game.boss || (game.bossDeath && game.bossDeath.e);
    if (!e) return;
    const info = G.bossPresentation(e.type), r = e.r * (e.final ? 2.1 : 1.8);
    const pulse = game.fx.quiet ? 0 : Math.sin(game.fx.anim * 1.8) * 0.06;
    ctx.save(); ctx.translate(e.x, e.y + 20);
    G.fx.shadow(ctx, 0, 8, r * 1.25, 0.9);
    ctx.scale(1, 0.48);
    G.fx.disc(ctx, 'boss-ground-' + e.type, 0, 0, r * 1.45, 0.55 + pulse, info.color + '08', info.color + '65', true);
    ctx.strokeStyle = info.color; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.45;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    if (!game.fx.low) {
      ctx.beginPath(); ctx.arc(0, 0, r * 1.12, 0.2, 2.7); ctx.arc(0, 0, r * 1.12, 3.3, 5.9); ctx.stroke();
      for (let i = 0; i < 9; i++) {
        const a = i * 2.39996, l = r * (1.2 + i % 3 * 0.13);
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5);
        ctx.lineTo(Math.cos(a + 0.12) * r * 0.87, Math.sin(a + 0.12) * r * 0.87);
        ctx.lineTo(Math.cos(a) * l, Math.sin(a) * l); ctx.stroke();
      }
    }
    if (e.cueLife > 0 || e.rageLife > 0) {
      ctx.globalAlpha = Math.min(0.8, e.cueLife + (e.rageLife || 0));
      ctx.strokeStyle = '#fff0c6'; ctx.lineWidth = e.rageLife > 0 ? 4 : 2;
      ctx.beginPath(); ctx.arc(0, 0, r * (e.cueFired ? 1.25 : 0.85), 0, TAU); ctx.stroke();
    }
    ctx.restore();
  };

  const crackCache = Object.create(null);
  G.drawBossFractures = function (ctx, game, e, spr, x, y, scale, flip, alpha) {
    if (!spr) return;
    let crack = crackCache[e.type];
    if (!crack) {
      const c = document.createElement('canvas'); c.width = c.height = 384;
      const cg = c.getContext('2d');
      cg.strokeStyle = '#fff1bf'; cg.lineWidth = 3; cg.lineJoin = 'bevel';
      for (let i = 0; i < 8; i++) {
        const a = i * 2.39996;
        cg.beginPath(); cg.moveTo(192, 183);
        cg.lineTo(192 + Math.cos(a + 0.18) * 55, 183 + Math.sin(a + 0.18) * 55);
        cg.lineTo(192 + Math.cos(a - 0.13) * 112, 183 + Math.sin(a - 0.13) * 112);
        cg.lineTo(192 + Math.cos(a) * 206, 183 + Math.sin(a) * 206); cg.stroke();
      }
      cg.globalCompositeOperation = 'destination-in'; cg.drawImage(spr.img, 0, 0, 384, 384);
      crack = crackCache[e.type] = { img: c, w: spr.w, h: spr.h, ax: spr.ax, ay: spr.ay, flash: c };
    }
    const old = ctx.globalAlpha; ctx.globalAlpha = alpha;
    G.drawSprite(ctx, crack, x, y, scale, flip, 0); ctx.globalAlpha = old;
  };
  G.drawBossDeathTitle = function (ctx, game) {
    const d = game.bossDeath; if (!d || d.t < d.max * 0.57) return;
    const k = G.clamp((d.t / d.max - 0.57) / 0.15, 0, 1), e = d.e;
    const w = game.w, flat = game.h < 500, y = flat ? game.safe.t + 120 : game.h * 0.3;
    const width = Math.min(w - 32, 430), x = (w - width) / 2;
    ctx.save(); ctx.globalAlpha = k;
    ctx.fillStyle = '#091310ef'; ctx.fillRect(x, y - 45, width, 107);
    ctx.fillStyle = '#c3a469'; ctx.fillRect(x, y - 45, width, 1); ctx.fillRect(x, y + 61, width, 1);
    ctx.textAlign = 'center'; ctx.fillStyle = '#ffe4a2'; ctx.font = '34px ' + DISPLAY;
    ctx.fillText(e.final ? '밤의 주인 처치' : '보스 처치', w / 2, y);
    ctx.font = '600 13px ' + BODY; ctx.fillStyle = '#dccca7';
    ctx.fillText(G.BOSS_TYPES[e.type].name + ' · ' + (e.final ? '새벽이 밝아옵니다' : '보상이 내려옵니다'), w / 2, y + 31);
    ctx.restore();
  };
})(window.G);
