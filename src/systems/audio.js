// 소리: 효과음(G.sfx)과 배경 음악(G.music). 파일 없이 WebAudio로 합성한다.
// 첫 사용자 입력 전에는 아무 소리도 내지 않는다. 입력이 들어오면 그때 원하던 곡을 시작한다.
//
// 신호 흐름
//   효과음 ─ sfxBus ─ sfxComp ──────────────┐
//   곡(트랙마다 out) ─ musicIn ─ duck ─ musicBus ┼─ limiter ─ 스피커
//   곡의 리버브·딜레이 ─────────── duck ┘     │
//   스팅어(짧은 악절) ─ stingerBus ─ musicBus ─┘
(function (G) {
  'use strict';

  let ctx = null;
  let unlocked = false;
  let noiseBuf = null;
  let limiter, sfxBus, musicIn, duckFilter, duckGain, musicBus, stingerBus, reverbIn, delayIn, delayNode;

  // 설정 100%일 때 버스 크기 (최종 리미터가 봉우리를 잡는다)
  const SFX_LEVEL = 1.25;
  const MUSIC_LEVEL = 1.5;

  function settings() { return (G.meta && G.meta.settings) || {}; }
  function sfxVolume() { const v = settings().sfx; return typeof v === 'number' ? v : 0.7; }
  function musicVolume() { const v = settings().music; return typeof v === 'number' ? v : 0.5; }

  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch (e) {
      return null;
    }
    limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -9;
    limiter.knee.value = 4;
    limiter.ratio.value = 14;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.18;
    limiter.connect(ctx.destination);

    const sfxComp = ctx.createDynamicsCompressor();
    sfxComp.threshold.value = -16;
    sfxComp.ratio.value = 5;
    sfxComp.connect(limiter);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = SFX_LEVEL * sfxVolume();
    sfxBus.connect(sfxComp);

    musicBus = ctx.createGain();
    musicBus.gain.value = MUSIC_LEVEL * musicVolume();
    musicBus.connect(limiter);
    duckGain = ctx.createGain();
    duckGain.connect(musicBus);
    duckFilter = ctx.createBiquadFilter();
    duckFilter.type = 'lowpass';
    duckFilter.frequency.value = 18000;
    duckFilter.Q.value = 0.5;
    duckFilter.connect(duckGain);
    musicIn = ctx.createGain();
    musicIn.connect(duckFilter);
    stingerBus = ctx.createGain();
    stingerBus.gain.value = 0.9;
    stingerBus.connect(musicBus);

    // 리버브: 만든 잔향 응답으로 컨볼루션
    const reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(2.8, 2.6);
    const reverbOut = ctx.createGain();
    reverbOut.gain.value = 0.85;
    reverb.connect(reverbOut);
    reverbOut.connect(duckFilter);
    reverbIn = ctx.createGain();
    reverbIn.connect(reverb);

    // 딜레이: 되먹임 안에 저역 통과 필터를 둬서 점점 어두워지게
    delayIn = ctx.createGain();
    delayNode = ctx.createDelay(2);
    delayNode.delayTime.value = 0.36;
    const delayTone = ctx.createBiquadFilter();
    delayTone.type = 'lowpass';
    delayTone.frequency.value = 2600;
    const delayFb = ctx.createGain();
    delayFb.gain.value = 0.34;
    delayIn.connect(delayNode);
    delayNode.connect(delayTone);
    delayTone.connect(delayFb);
    delayFb.connect(delayNode);
    delayTone.connect(duckFilter);
    delayTone.connect(reverbIn);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function makeImpulse(seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function unlock() {
    // 안드로이드 크롬은 손을 뗄 때(touchend·click)만 재생을 허락한다. 실패했으면 다음 터치에서 다시 깨운다.
    if (unlocked) {
      if (ctx && ctx.state !== 'running' && !document.hidden) ctx.resume().catch(() => {});
      return;
    }
    if (!ensure()) return;
    unlocked = true;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    startScheduler();
    if (music.desired) startTrack(music.desired);
  }
  ['pointerdown', 'keydown', 'touchstart', 'touchend', 'pointerup', 'click'].forEach((ev) => {
    window.addEventListener(ev, unlock, { capture: true, passive: true });
  });
  // 탭이 가려지면 소리를 멈추고, 돌아오면 다시 켠다
  document.addEventListener('visibilitychange', () => {
    if (!ctx || !unlocked) return;
    if (document.hidden) ctx.suspend().catch(() => {});
    else ctx.resume().catch(() => {});
  });

  // ---------- 합성 부품 (효과음·음악 공통) ----------
  // 모든 소리는 "정해진 시각 t에 시작하는 한 음"으로 만든다. dests: [[노드, 양], ...]

  let sfxVoices = 0;
  let musicVoices = 0;
  const MAX_SFX_VOICES = 28;
  const MAX_MUSIC_VOICES = 56;

  function track(node, kind) {
    if (kind === 'music') musicVoices++; else sfxVoices++;
    node.onended = () => {
      if (kind === 'music') musicVoices = Math.max(0, musicVoices - 1);
      else sfxVoices = Math.max(0, sfxVoices - 1);
    };
  }

  function route(src, dests) {
    for (const [node, amt] of dests) {
      if (amt === 1) src.connect(node);
      else if (amt > 0) {
        const g = ctx.createGain();
        g.gain.value = amt;
        src.connect(g);
        g.connect(node);
      }
    }
  }

  // 발진기 한 음. o: { type, f, f1(미끄러짐 끝), glide, detune, gain, attack, hold, release, filter: {type, f, f1, q, time}, dests, kind }
  function osc(t, o) {
    const s = ctx.createOscillator();
    s.type = o.type || 'sine';
    s.frequency.setValueAtTime(o.f, t);
    if (o.f1 && o.f1 !== o.f) s.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + (o.glide || o.release || 0.1));
    if (o.detune) s.detune.value = o.detune;
    const end = shape(s, t, o);
    s.start(t);
    s.stop(end + 0.05);
    track(s, o.kind);
    return s;
  }

  // 잡음 한 음. o: { filter: {type, f, f1, q, time}, gain, attack, hold, release, dests, kind }
  function noise(t, o) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    const end = shape(s, t, o);
    s.start(t, Math.random() * 0.8);
    s.stop(end + 0.05);
    track(s, o.kind);
    return s;
  }

  // 필터 → 엔벨로프 → 목적지. 끝나는 시각을 돌려준다
  function shape(src, t, o) {
    let node = src;
    if (o.filter) {
      const fl = ctx.createBiquadFilter();
      fl.type = o.filter.type;
      fl.Q.value = o.filter.q || 0.7;
      fl.frequency.setValueAtTime(o.filter.f, t);
      if (o.filter.f1) fl.frequency.exponentialRampToValueAtTime(Math.max(30, o.filter.f1), t + (o.filter.time || o.release || 0.2));
      node.connect(fl);
      node = fl;
    }
    const g = ctx.createGain();
    const a = o.attack || 0.005, h = o.hold || 0, r = o.release || 0.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.gain), t + a);
    if (h) g.gain.setValueAtTime(Math.max(0.0002, o.gain), t + a + h);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + h + r);
    node.connect(g);
    route(g, o.dests);
    return t + a + h + r;
  }

  // ---------- 효과음 ----------

  const GAP = {
    shoot: 0.07, slash: 0.09, hit: 0.045, kill: 0.05, gem: 0.03, coin: 0.06,
    levelup: 0.3, chest: 0.5, evolve: 0.5, boss: 1, hurt: 0.2, heal: 0.25, select: 0.04, click: 0.03,
    killBig: 0.08,
    zap: 0.08, whoosh: 0.1, impact: 0.12, gong: 0.4, bubble: 0.15, warn: 0.5, bossShot: 0.2, bossDie: 1,
    elite: 0.8, crit: 0.06, pickupChest: 0.4, lowhp: 0.7, victory: 2, defeat: 2, swarm: 1.5,
  };
  // 동시 소리가 많을 때 먼저 버리는 자잘한 소리
  const MINOR = { hit: 1, gem: 1, shoot: 1, kill: 1, zap: 1, whoosh: 1, crit: 1, bubble: 1 };
  // 무기 발사음은 자잘한 소리로 친다(동시 소리가 많으면 먼저 버린다)
  const lastPlayed = {};
  let gemStreak = 0;
  let gemStreakAt = 0;

  const S = [[null, 1]]; // 효과음 목적지 (play 때 sfxBus로 채움)
  const v = (x) => x * rnd(0.96, 1.04); // 음높이 살짝 흔들기

  const SOUNDS = {
    shoot(t) {
      osc(t, { type: 'triangle', f: v(980), f1: 520, release: 0.09, gain: 0.05, dests: S });
      osc(t, { type: 'sine', f: v(1960), f1: 900, release: 0.05, gain: 0.02, dests: S });
      noise(t, { filter: { type: 'bandpass', f: 3200, f1: 1600, q: 2 }, release: 0.06, gain: 0.035, dests: S });
    },
    slash(t) {
      noise(t, { filter: { type: 'bandpass', f: 1400, f1: 5200, q: 1.2, time: 0.14 }, attack: 0.02, release: 0.15, gain: 0.11, dests: S });
      osc(t, { type: 'sawtooth', f: v(620), f1: 260, release: 0.12, gain: 0.025, filter: { type: 'lowpass', f: 2400 }, dests: S });
      osc(t + 0.02, { type: 'sine', f: v(2600), f1: 2200, release: 0.18, gain: 0.015, dests: S });
    },
    hit(t) {
      osc(t, { type: 'square', f: v(230), f1: 110, release: 0.05, gain: 0.022, filter: { type: 'lowpass', f: 1800 }, dests: S });
      noise(t, { filter: { type: 'lowpass', f: 2600, f1: 700 }, release: 0.045, gain: 0.04, dests: S });
    },
    crit(t) {
      osc(t, { type: 'sine', f: v(2400), release: 0.16, gain: 0.04, dests: S });
      osc(t, { type: 'sine', f: v(3620), release: 0.12, gain: 0.025, dests: S });
      noise(t, { filter: { type: 'highpass', f: 5000 }, release: 0.03, gain: 0.05, dests: S });
      osc(t, { type: 'square', f: v(180), f1: 90, release: 0.07, gain: 0.03, filter: { type: 'lowpass', f: 1200 }, dests: S });
    },
    // 적이 죽는 소리: 작은 적은 터지는 "퐁", 단단한 적·엘리트는 묵직한 "쿵"
    kill(t) {
      const p = rnd(0.85, 1.2);
      osc(t, { type: 'triangle', f: 420 * p, f1: 70, release: 0.13, gain: 0.09, dests: S });
      noise(t, { filter: { type: 'bandpass', f: 1500 * p, f1: 300, q: 1.6 }, release: 0.1, gain: 0.08, dests: S });
      osc(t + 0.012, { type: 'sine', f: 1600 * p, f1: 2300 * p, release: 0.05, gain: 0.02, dests: S });
    },
    killBig(t) {
      osc(t, { type: 'sine', f: v(150), f1: 40, release: 0.3, gain: 0.16, dests: S });
      noise(t, { filter: { type: 'lowpass', f: 1600, f1: 160, time: 0.25 }, release: 0.28, gain: 0.12, dests: S });
      osc(t, { type: 'square', f: v(90), f1: 45, release: 0.12, gain: 0.03, filter: { type: 'lowpass', f: 900 }, dests: S });
    },
    gem(t) {
      const now = performance.now();
      gemStreak = now - gemStreakAt < 400 ? Math.min(gemStreak + 1, 16) : 0;
      gemStreakAt = now;
      const f = 1050 * Math.pow(1.0595, gemStreak); // 연속으로 주우면 반음씩 올라간다
      osc(t, { type: 'sine', f, f1: f * 1.5, release: 0.08, gain: 0.045, dests: S });
      osc(t + 0.015, { type: 'sine', f: f * 2, release: 0.07, gain: 0.015, dests: S });
    },
    coin(t) {
      osc(t, { type: 'square', f: 1480, release: 0.05, gain: 0.025, filter: { type: 'lowpass', f: 5000 }, dests: S });
      osc(t + 0.055, { type: 'square', f: 1975, release: 0.18, gain: 0.025, filter: { type: 'lowpass', f: 5000 }, dests: S });
      osc(t + 0.055, { type: 'sine', f: 3950, release: 0.2, gain: 0.012, dests: S });
    },
    levelup(t) {
      [523, 659, 784, 1047, 1319].forEach((f, i) => {
        osc(t + i * 0.06, { type: 'triangle', f, release: 0.35, gain: 0.06, dests: S });
        osc(t + i * 0.06, { type: 'sine', f: f * 2, release: 0.25, gain: 0.015, dests: S });
      });
      noise(t, { filter: { type: 'highpass', f: 3000, f1: 9000, time: 0.4 }, attack: 0.1, release: 0.35, gain: 0.03, dests: S });
    },
    chest(t) {
      osc(t, { type: 'sine', f: 72, f1: 48, release: 0.5, gain: 0.14, dests: S });
      noise(t, { filter: { type: 'lowpass', f: 380, f1: 120 }, release: 0.45, gain: 0.1, dests: S });
      [784, 988, 1175, 1568, 1976].forEach((f, i) => osc(t + 0.18 + i * 0.08, { type: 'triangle', f, release: 0.7, gain: 0.05, dests: S }));
      noise(t + 0.18, { filter: { type: 'highpass', f: 4000, f1: 10000, time: 0.8 }, attack: 0.3, release: 0.6, gain: 0.035, dests: S });
    },
    pickupChest(t) {
      osc(t, { type: 'sine', f: 110, f1: 60, release: 0.2, gain: 0.1, dests: S });
      noise(t, { filter: { type: 'lowpass', f: 900, f1: 200 }, release: 0.15, gain: 0.07, dests: S });
      [1319, 1760, 2349].forEach((f, i) => osc(t + 0.08 + i * 0.05, { type: 'sine', f, release: 0.25, gain: 0.03, dests: S }));
    },
    evolve(t) {
      osc(t, { type: 'sawtooth', f: 220, f1: 880, glide: 0.6, release: 0.7, gain: 0.04, filter: { type: 'lowpass', f: 800, f1: 5000, time: 0.6 }, dests: S });
      noise(t, { filter: { type: 'bandpass', f: 600, f1: 6000, q: 3, time: 0.7 }, attack: 0.2, release: 0.6, gain: 0.06, dests: S });
      [659, 831, 988, 1319, 1661, 1976].forEach((f, i) => {
        osc(t + 0.3 + i * 0.07, { type: 'triangle', f, release: 1.0, gain: 0.05, dests: S });
        osc(t + 0.3 + i * 0.07, { type: 'sine', f: f * 2.01, release: 0.8, gain: 0.012, dests: S });
      });
    },
    boss(t) {
      osc(t, { type: 'sawtooth', f: 62, f1: 46, release: 1.4, gain: 0.12, filter: { type: 'lowpass', f: 700, f1: 160, time: 1.3 }, dests: S });
      osc(t, { type: 'sawtooth', f: 93, f1: 69, detune: 9, release: 1.4, gain: 0.07, filter: { type: 'lowpass', f: 700, f1: 160, time: 1.3 }, dests: S });
      noise(t, { filter: { type: 'lowpass', f: 600, f1: 80 }, release: 1.4, gain: 0.12, dests: S });
      osc(t + 0.45, { type: 'sine', f: 55, f1: 40, release: 0.8, gain: 0.12, dests: S });
    },
    bossDie(t) {
      osc(t, { type: 'sine', f: 90, f1: 30, release: 1.4, gain: 0.18, dests: S });
      noise(t, { filter: { type: 'lowpass', f: 2400, f1: 90, time: 1.2 }, release: 1.3, gain: 0.16, dests: S });
      noise(t + 0.3, { filter: { type: 'bandpass', f: 500, f1: 7000, q: 2, time: 1.2 }, attack: 0.3, release: 1.0, gain: 0.05, dests: S });
      [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => osc(t + 0.5 + i * 0.09, { type: 'triangle', f, release: 1.2, gain: 0.045, dests: S }));
    },
    hurt(t) {
      osc(t, { type: 'square', f: v(190), f1: 70, release: 0.18, gain: 0.06, filter: { type: 'lowpass', f: 1500 }, dests: S });
      noise(t, { filter: { type: 'lowpass', f: 1400, f1: 300 }, release: 0.14, gain: 0.07, dests: S });
      osc(t, { type: 'sine', f: 70, f1: 45, release: 0.2, gain: 0.08, dests: S });
    },
    lowhp(t) {
      // 심장 박동: 쿵-쿵
      osc(t, { type: 'sine', f: 62, f1: 40, release: 0.18, gain: 0.16, dests: S });
      osc(t + 0.2, { type: 'sine', f: 55, f1: 38, release: 0.22, gain: 0.12, dests: S });
    },
    heal(t) {
      [660, 880, 1320, 1760].forEach((f, i) => osc(t + i * 0.05, { type: 'sine', f, release: 0.35, gain: 0.04, dests: S }));
      noise(t, { filter: { type: 'highpass', f: 5000 }, attack: 0.1, release: 0.3, gain: 0.015, dests: S });
    },
    select(t) {
      osc(t, { type: 'sine', f: 660, f1: 990, release: 0.07, gain: 0.05, dests: S });
      osc(t + 0.03, { type: 'triangle', f: 1320, release: 0.08, gain: 0.02, dests: S });
    },
    click(t) {
      osc(t, { type: 'sine', f: 900, release: 0.035, gain: 0.04, dests: S });
      noise(t, { filter: { type: 'highpass', f: 6000 }, release: 0.015, gain: 0.02, dests: S });
    },
    zap(t) {
      for (let i = 0; i < 4; i++) {
        noise(t + i * 0.025, { filter: { type: 'bandpass', f: rnd(2500, 6000), q: 4 }, release: 0.03, gain: 0.05, dests: S });
      }
      osc(t, { type: 'square', f: v(1400), f1: 260, release: 0.12, gain: 0.025, filter: { type: 'lowpass', f: 4000 }, dests: S });
      osc(t, { type: 'sawtooth', f: v(70), release: 0.1, gain: 0.03, dests: S });
    },
    whoosh(t) {
      noise(t, { filter: { type: 'bandpass', f: 400, f1: 2600, q: 1.5, time: 0.14 }, attack: 0.06, release: 0.18, gain: 0.16, dests: S });
      noise(t + 0.12, { filter: { type: 'bandpass', f: 2600, f1: 600, q: 1.5, time: 0.14 }, release: 0.14, gain: 0.09, dests: S });
    },
    impact(t) {
      osc(t, { type: 'sine', f: v(110), f1: 34, release: 0.5, gain: 0.16, dests: S });
      noise(t, { filter: { type: 'lowpass', f: 2200, f1: 120, time: 0.5 }, release: 0.55, gain: 0.13, dests: S });
      noise(t, { filter: { type: 'highpass', f: 3000 }, release: 0.05, gain: 0.06, dests: S });
    },
    gong(t) {
      const f = v(196);
      [1, 2.4, 3.9, 5.4, 6.8].forEach((m, i) => osc(t, { type: 'sine', f: f * m, release: 1.6 - i * 0.2, gain: 0.05 / (i + 1), dests: S }));
      noise(t, { filter: { type: 'bandpass', f: 900, q: 2 }, release: 0.08, gain: 0.05, dests: S });
    },
    bubble(t) {
      for (let i = 0; i < 3; i++) {
        const f = rnd(280, 520);
        osc(t + i * rnd(0.05, 0.09), { type: 'sine', f, f1: f * 2.2, release: 0.07, gain: 0.04, dests: S });
      }
    },
    warn(t) {
      for (let i = 0; i < 2; i++) {
        osc(t + i * 0.16, { type: 'square', f: 330, f1: 300, release: 0.12, gain: 0.035, filter: { type: 'lowpass', f: 1600 }, dests: S });
        osc(t + i * 0.16, { type: 'sawtooth', f: 110, release: 0.14, gain: 0.03, filter: { type: 'lowpass', f: 600 }, dests: S });
      }
    },
    bossShot(t) {
      osc(t, { type: 'sawtooth', f: 240, f1: 90, release: 0.22, gain: 0.05, filter: { type: 'lowpass', f: 1800, f1: 300 }, dests: S });
      noise(t, { filter: { type: 'bandpass', f: 700, f1: 250, q: 1.5 }, release: 0.2, gain: 0.06, dests: S });
    },
    elite(t) {
      osc(t, { type: 'sawtooth', f: 110, release: 0.6, attack: 0.15, gain: 0.06, filter: { type: 'lowpass', f: 300, f1: 1200, time: 0.3 }, dests: S });
      osc(t, { type: 'sawtooth', f: 165, detune: 8, release: 0.6, attack: 0.15, gain: 0.04, filter: { type: 'lowpass', f: 300, f1: 1200, time: 0.3 }, dests: S });
      osc(t, { type: 'sine', f: 82, f1: 55, release: 0.4, gain: 0.08, dests: S });
    },
    swarm(t) {
      // 날갯짓처럼 떨리는 잡음이 커진다
      for (let i = 0; i < 14; i++) {
        noise(t + i * 0.05, { filter: { type: 'bandpass', f: 900 + i * 60, q: 3 }, release: 0.04, gain: 0.04 + i * 0.008, dests: S });
      }
    },
    victory(t) {
      const notes = [523, 659, 784, 1047, 784, 1047, 1319];
      notes.forEach((f, i) => osc(t + i * 0.12, { type: 'triangle', f, release: i === notes.length - 1 ? 1.6 : 0.3, gain: 0.06, dests: S }));
      osc(t + 0.84, { type: 'sine', f: 131, release: 1.6, gain: 0.08, dests: S });
    },
    defeat(t) {
      [440, 392, 349, 294].forEach((f, i) => osc(t + i * 0.28, { type: 'triangle', f, release: i === 3 ? 1.6 : 0.5, gain: 0.05, filter: { type: 'lowpass', f: 1600 }, dests: S }));
      noise(t, { filter: { type: 'lowpass', f: 500, f1: 150 }, attack: 0.4, release: 1.4, gain: 0.04, dests: S });
    },
  };

  // ---------- 무기마다 다른 발사음 ----------
  // b: 진화·조합 무기(낮고 크게). 기본 무기 키와 같은 이름(w_키)으로 부른다
  const WEAPON_SOUNDS = {
    bolt(t, b) { // 불씨가 치익 하고 날아감
      noise(t, { filter: { type: 'highpass', f: 2400 * b.p }, release: 0.07, gain: 0.05 * b.g, dests: S });
      osc(t, { type: 'triangle', f: v(700) * b.p, f1: 1300 * b.p, release: 0.07, gain: 0.04 * b.g, dests: S });
    },
    sword(t, b) { // 쇳소리 섞인 휘두름
      noise(t, { filter: { type: 'bandpass', f: 900 * b.p, f1: 4200 * b.p, q: 1.4, time: 0.12 }, attack: 0.015, release: 0.13, gain: 0.1 * b.g, dests: S });
      osc(t + 0.03, { type: 'sine', f: v(3100) * b.p, release: 0.22, gain: 0.018 * b.g, dests: S });
      osc(t + 0.03, { type: 'sine', f: v(4650) * b.p, release: 0.16, gain: 0.01 * b.g, dests: S });
    },
    aura(t, b) { // 낮게 웅 하고 맥박
      osc(t, { type: 'sine', f: 82 * b.p, f1: 70 * b.p, attack: 0.03, release: 0.25, gain: 0.05 * b.g, dests: S });
      osc(t, { type: 'triangle', f: 164 * b.p, attack: 0.03, release: 0.18, gain: 0.015 * b.g, dests: S });
    },
    chain(t, b) { // 지지직 하고 갈라지는 전기
      for (let i = 0; i < 5; i++) noise(t + i * 0.018, { filter: { type: 'bandpass', f: rnd(3000, 7000) * b.p, q: 6 }, release: 0.025, gain: 0.06 * b.g, dests: S });
      osc(t, { type: 'sawtooth', f: v(1800) * b.p, f1: 180, release: 0.1, gain: 0.025 * b.g, filter: { type: 'lowpass', f: 5000 }, dests: S });
    },
    scythe(t, b) { // 휘이잉 도는 날
      for (let i = 0; i < 3; i++) noise(t + i * 0.06, { filter: { type: 'bandpass', f: (1300 + i * 500) * b.p, q: 3 }, attack: 0.02, release: 0.07, gain: 0.05 * b.g, dests: S });
    },
    poison(t, b) { // 꿀렁 하는 독
      for (let i = 0; i < 2; i++) { const f = rnd(160, 260) * b.p; osc(t + i * 0.07, { type: 'sine', f, f1: f * 2.6, release: 0.09, gain: 0.05 * b.g, dests: S }); }
      noise(t, { filter: { type: 'lowpass', f: 700 }, release: 0.12, gain: 0.03 * b.g, dests: S });
    },
    meteor(t, b) { // 휘이익 떨어지는 소리
      osc(t, { type: 'sine', f: 2200 * b.p, f1: 380 * b.p, glide: 0.35, release: 0.38, gain: 0.03 * b.g, dests: S });
      noise(t, { filter: { type: 'bandpass', f: 3000, f1: 600, q: 2, time: 0.35 }, release: 0.36, gain: 0.03 * b.g, dests: S });
    },
    bell(t, b) { // 맑은 종
      const f = v(660) * b.p;
      [1, 2.76, 5.4].forEach((m, i) => osc(t, { type: 'sine', f: f * m, release: 0.9 - i * 0.25, gain: 0.05 / (i + 1) * b.g, dests: S }));
    },
    trap(t, b) { // 철컥 놓는 소리
      osc(t, { type: 'square', f: v(1900) * b.p, release: 0.02, gain: 0.03 * b.g, filter: { type: 'highpass', f: 1200 }, dests: S });
      osc(t + 0.035, { type: 'square', f: v(1300) * b.p, release: 0.03, gain: 0.03 * b.g, filter: { type: 'highpass', f: 900 }, dests: S });
    },
    lance(t, b) { // 위로 차오르는 빛줄기
      osc(t, { type: 'sawtooth', f: 400 * b.p, f1: 2600 * b.p, glide: 0.12, release: 0.16, gain: 0.03 * b.g, filter: { type: 'lowpass', f: 6000 }, dests: S });
      osc(t + 0.05, { type: 'sine', f: v(3300) * b.p, release: 0.25, gain: 0.02 * b.g, dests: S });
    },
    moth(t, b) { // 파르르 날갯짓
      for (let i = 0; i < 4; i++) noise(t + i * 0.03, { filter: { type: 'bandpass', f: 2200 * b.p, q: 2.5 }, release: 0.02, gain: 0.035 * b.g, dests: S });
    },
    tornado(t, b) { // 바람이 감겨 올라감
      noise(t, { filter: { type: 'bandpass', f: 300 * b.p, f1: 1500 * b.p, q: 2, time: 0.35 }, attack: 0.08, release: 0.32, gain: 0.12 * b.g, dests: S });
    },
    whip(t, b) { // 짝 하고 터지는 채찍
      noise(t, { filter: { type: 'bandpass', f: 600, f1: 3000, q: 1, time: 0.08 }, attack: 0.04, release: 0.03, gain: 0.07 * b.g, dests: S });
      noise(t + 0.07, { filter: { type: 'highpass', f: 3500 * b.p }, release: 0.03, gain: 0.12 * b.g, dests: S });
    },
    frost(t, b) { // 쨍 하는 얼음
      osc(t, { type: 'sine', f: v(2900) * b.p, release: 0.18, gain: 0.03 * b.g, dests: S });
      osc(t, { type: 'sine', f: v(4370) * b.p, release: 0.12, gain: 0.02 * b.g, dests: S });
      noise(t, { filter: { type: 'highpass', f: 6000 }, release: 0.04, gain: 0.03 * b.g, dests: S });
    },
  };
  const SMALL = { p: 1, g: 1 }, BIG = { p: 0.72, g: 1.45 };
  Object.keys(WEAPON_SOUNDS).forEach((k) => {
    SOUNDS['w_' + k] = (t) => WEAPON_SOUNDS[k](t, SMALL);
    SOUNDS['w_' + k + '_big'] = (t) => WEAPON_SOUNDS[k](t, BIG);
    GAP['w_' + k] = GAP['w_' + k + '_big'] = k === 'aura' ? 0.3 : 0.06;
    MINOR['w_' + k] = MINOR['w_' + k + '_big'] = 1;
  });

  G.sfx = {
    muted: false, // 무기가 자기 발사음을 낼 때 안쪽의 공용 소리를 막는다
    play(name) {
      if (G.sfx.muted || !unlocked || !ctx || ctx.state !== 'running') return;
      const fn = SOUNDS[name];
      if (!fn) return;
      const vol = sfxVolume();
      if (vol <= 0) return;
      const now = ctx.currentTime;
      if (now - (lastPlayed[name] || -1) < (GAP[name] || 0.05)) return;
      if (sfxVoices > MAX_SFX_VOICES && MINOR[name]) return;
      lastPlayed[name] = now;
      sfxBus.gain.setTargetAtTime(SFX_LEVEL * vol, now, 0.01);
      S[0][0] = sfxBus;
      try { fn(now + 0.005); } catch (e) { /* 소리 실패는 게임에 영향 없음 */ }
    },
    unlock,
    names: Object.keys(SOUNDS),
  };

  // ---------- 배경 음악 ----------

  const SCALES = {
    aeolian: [0, 2, 3, 5, 7, 8, 10],
    dorian: [0, 2, 3, 5, 7, 9, 10],
    phrygian: [0, 1, 3, 5, 7, 8, 10],
    harmonic: [0, 2, 3, 5, 7, 8, 11],
    hungarian: [0, 2, 3, 6, 7, 8, 11],
  };

  // 곡마다: 빠르기, 으뜸음(MIDI), 음계, 화음 진행 후보(음계 도수), 악기 성격
  const TRACKS = {
    title: {
      bpm: 60, root: 50, scale: 'dorian', barsPerChord: 2,
      progs: [[0, 5, 2, 6], [0, 3, 5, 4], [0, 6, 3, 4]],
      pad: { cutoff: 1500, gain: 0.04, octave: 0 }, arp: { rate: 4, gain: 0.04, octave: 24, from: 0.0 },
      lead: { octave: 24, gain: 0.045, density: 0.5 }, bass: { gain: 0.07, from: 0 }, drums: null, delay: 0.75,
    },
    forest: {
      bpm: 84, root: 45, scale: 'aeolian', barsPerChord: 2,
      progs: [[0, 5, 2, 6], [0, 3, 6, 4], [0, 5, 3, 4], [5, 3, 0, 6]],
      pad: { cutoff: 1700, gain: 0.028, octave: 12 }, arp: { rate: 2, gain: 0.03, octave: 24, from: 0.15 },
      lead: { octave: 36, gain: 0.032, density: 0.6 }, bass: { gain: 0.07, from: 0.3 },
      drums: { kit: 'soft', from: 0.3 }, delay: 0.536,
    },
    marsh: {
      bpm: 70, root: 40, scale: 'phrygian', barsPerChord: 2,
      progs: [[0, 1, 0, 6], [0, 5, 1, 0], [0, 3, 1, 6]],
      pad: { cutoff: 900, gain: 0.032, octave: 12, wobble: true }, arp: { rate: 4, gain: 0.028, octave: 24, from: 0.35 },
      lead: { octave: 24, gain: 0.03, density: 0.35 }, bass: { gain: 0.08, from: 0, drone: true },
      drums: { kit: 'swamp', from: 0.25 }, drops: true, delay: 0.643,
    },
    ruins: {
      bpm: 100, root: 38, scale: 'harmonic', barsPerChord: 1,
      progs: [[0, 3, 4, 0], [0, 5, 3, 4], [0, 6, 4, 4], [0, 3, 0, 4]],
      pad: { cutoff: 1300, gain: 0.024, octave: 12 }, arp: { rate: 2, gain: 0.028, octave: 24, from: 0.2 },
      lead: { octave: 36, gain: 0.03, density: 0.55 }, bass: { gain: 0.08, from: 0.15 },
      drums: { kit: 'march', from: 0.1 }, brass: true, delay: 0.45,
    },
    frost: {
      bpm: 72, root: 43, scale: 'dorian', barsPerChord: 2,
      progs: [[0, 5, 3, 6], [0, 2, 5, 4], [0, 6, 5, 3]],
      pad: { cutoff: 2400, gain: 0.024, octave: 24, glass: true }, arp: { rate: 2, gain: 0.022, octave: 36, from: 0.2, glass: true },
      lead: { octave: 36, gain: 0.028, density: 0.4 }, bass: { gain: 0.07, from: 0.2 },
      drums: { kit: 'soft', from: 0.3 }, delay: 0.62,
    },
    mine: {
      bpm: 108, root: 36, scale: 'harmonic', barsPerChord: 1,
      progs: [[0, 4, 3, 4], [0, 5, 4, 0], [0, 3, 4, 4]],
      pad: { cutoff: 1100, gain: 0.026, octave: 12 }, arp: { rate: 2, gain: 0.026, octave: 24, from: 0.15 },
      lead: { octave: 36, gain: 0.03, density: 0.5 }, bass: { gain: 0.09, from: 0, pulse: true },
      drums: { kit: 'march', from: 0.05 }, brass: true, delay: 0.42,
    },
    lake: {
      bpm: 66, root: 41, scale: 'aeolian', barsPerChord: 2,
      progs: [[0, 5, 6, 4], [0, 3, 5, 6], [5, 6, 0, 0]],
      pad: { cutoff: 2000, gain: 0.03, octave: 12, glass: true }, arp: { rate: 4, gain: 0.02, octave: 36, from: 0.25, glass: true },
      lead: { octave: 36, gain: 0.03, density: 0.35 }, bass: { gain: 0.07, from: 0.1, drone: true },
      drums: { kit: 'cosmic', from: 0.4 }, drops: true, delay: 0.7,
    },
    tower: {
      bpm: 96, root: 45, scale: 'dorian', barsPerChord: 1,
      progs: [[0, 6, 5, 6], [0, 3, 4, 6], [0, 5, 3, 4]],
      pad: { cutoff: 1800, gain: 0.024, octave: 12 }, arp: { rate: 2, gain: 0.03, octave: 24, from: 0.1 },
      lead: { octave: 36, gain: 0.032, density: 0.6 }, bass: { gain: 0.08, from: 0.15 },
      drums: { kit: 'soft', from: 0.15 }, delay: 0.5,
    },
    garden: {
      bpm: 74, root: 39, scale: 'phrygian', barsPerChord: 2,
      progs: [[0, 1, 3, 1], [0, 5, 1, 0], [0, 6, 1, 3]],
      pad: { cutoff: 1000, gain: 0.03, octave: 12, wobble: true }, arp: { rate: 4, gain: 0.024, octave: 24, from: 0.3 },
      lead: { octave: 24, gain: 0.03, density: 0.4 }, bass: { gain: 0.08, from: 0, drone: true },
      drums: { kit: 'swamp', from: 0.3 }, delay: 0.6,
    },
    lighthouse: {
      bpm: 88, root: 38, scale: 'hungarian', barsPerChord: 1,
      progs: [[0, 1, 5, 4], [0, 6, 4, 1], [0, 3, 4, 0]],
      pad: { cutoff: 1600, gain: 0.026, octave: 12 }, arp: { rate: 2, gain: 0.026, octave: 24, from: 0.15 },
      lead: { octave: 36, gain: 0.034, density: 0.55 }, bass: { gain: 0.09, from: 0, pulse: true },
      drums: { kit: 'march', from: 0.1 }, brass: true, delay: 0.55,
    },
    abyss: {
      bpm: 76, root: 37, scale: 'hungarian', barsPerChord: 2,
      progs: [[0, 1, 5, 3], [0, 6, 5, 1], [0, 3, 2, 1]],
      pad: { cutoff: 2600, gain: 0.022, octave: 24, glass: true }, arp: { rate: 1, gain: 0.018, octave: 36, from: 0.25, glass: true },
      lead: { octave: 36, gain: 0.03, density: 0.45 }, bass: { gain: 0.08, from: 0, pulse: true },
      drums: { kit: 'cosmic', from: 0.35 }, delay: 0.592,
    },
  };

  const music = {
    desired: null,
    current: null,
    fading: [],
    intensity: 0,
    boss: false,
    ducked: false,
  };

  // 곡 하나의 연주 상태
  function makeInstance(id) {
    const def = TRACKS[id];
    const out = ctx.createGain();
    out.gain.value = 0.0001;
    out.connect(musicIn);
    const wet = ctx.createGain();
    wet.gain.value = 1;
    wet.connect(reverbIn);
    const echo = ctx.createGain();
    echo.gain.value = 1;
    echo.connect(delayIn);
    const bossBus = ctx.createGain();
    bossBus.gain.value = music.boss ? 1 : 0.0001;
    bossBus.connect(out);
    const t0 = ctx.currentTime + 0.06;
    out.gain.setValueAtTime(0.0001, t0);
    out.gain.exponentialRampToValueAtTime(1, t0 + 1.5);
    delayNode.delayTime.setTargetAtTime((60 / def.bpm) * def.delay, t0, 0.3);
    return {
      id, def, out, wet, echo, bossBus,
      stepDur: 60 / def.bpm / 4,
      next: t0, step: 0,
      prog: pickOne(def.progs), section: 'intro', sectionBars: 4, barInSection: 0,
      motif: null, motifUses: 0, padEnds: 0, arpDir: 1,
    };
  }

  function fadeOut(inst, time) {
    const t = ctx.currentTime;
    inst.out.gain.cancelScheduledValues(t);
    inst.out.gain.setValueAtTime(Math.max(0.0001, inst.out.gain.value), t);
    inst.out.gain.exponentialRampToValueAtTime(0.0001, t + (time || 1.5));
    inst.wet.gain.setTargetAtTime(0.0001, t, (time || 1.5) / 3);
    inst.echo.gain.setTargetAtTime(0.0001, t, (time || 1.5) / 3);
    inst.endAt = t + (time || 1.5) + 0.1;
    music.fading.push(inst);
  }

  function startTrack(id) {
    if (!ctx || !unlocked) return;
    if (music.current && music.current.id === id) return;
    if (music.current) fadeOut(music.current);
    music.current = TRACKS[id] ? makeInstance(id) : null;
  }

  // 음계 도수 → MIDI 음
  function degreeNote(def, deg) {
    const sc = SCALES[def.scale];
    const o = Math.floor(deg / 7);
    const i = ((deg % 7) + 7) % 7;
    return def.root + sc[i] + 12 * o;
  }

  function chordDegrees(chordRoot) { return [chordRoot, chordRoot + 2, chordRoot + 4]; }

  // 동기(2마디짜리 짧은 선율): 박자 위치와 화음 기준 도수
  function makeMotif() {
    const notes = [];
    const slots = [0, 4, 6, 8, 12, 16, 18, 20, 24, 28];
    const count = 4 + Math.floor(Math.random() * 3);
    const chosen = slots.slice().sort(() => Math.random() - 0.5).slice(0, count).sort((a, b) => a - b);
    let deg = pickOne([0, 2, 4]);
    for (const s of chosen) {
      notes.push({ step: s, deg, len: pickOne([2, 4, 4, 6]) });
      deg += pickOne([-2, -1, 1, 1, 2, 3, -3]);
      deg = Math.max(-2, Math.min(7, deg));
    }
    notes[notes.length - 1].deg = pickOne([0, 2, 4, 7]); // 화음음으로 끝맺기
    return notes;
  }

  function varyMotif(m) {
    const r = Math.random();
    if (r < 0.35) return m;
    const copy = m.map((n) => Object.assign({}, n));
    if (r < 0.6) copy.slice(-2).forEach((n) => { n.deg += pickOne([-2, -1, 1, 2]); });
    else if (r < 0.8) copy.forEach((n) => { n.deg = 4 - n.deg; }); // 뒤집기
    else copy.forEach((n) => { n.step = (n.step + 2) % 32; });
    return copy;
  }

  const SECTIONS = ['intro', 'A', 'B', 'break'];

  function nextSection(inst) {
    const I = music.intensity;
    const w = { intro: 0.6 - I * 0.4, A: 1, B: 0.3 + I * 1.6, break: 0.45 };
    if (music.boss) w.B += 1.5;
    let r = Math.random() * SECTIONS.reduce((s, k) => s + Math.max(0.05, w[k]), 0);
    for (const k of SECTIONS) {
      r -= Math.max(0.05, w[k]);
      if (r <= 0) return k;
    }
    return 'A';
  }

  // ---------- 악기 ----------
  function dests(inst, dry, wet, echo) {
    const d = [[inst.out, dry]];
    if (wet) d.push([inst.wet, wet]);
    if (echo) d.push([inst.echo, echo]);
    return d;
  }

  function pad(inst, notes, t, dur) {
    const def = inst.def;
    const cut = def.pad.cutoff * (0.75 + music.intensity * 0.6);
    for (const n of notes) {
      const f = mtof(n);
      const filter = { type: 'lowpass', f: cut * 0.6, f1: cut, q: 0.8, time: dur * 0.5 };
      if (def.pad.glass) {
        osc(t, { type: 'sine', f, attack: dur * 0.35, hold: dur * 0.4, release: 1.8, gain: def.pad.gain, dests: dests(inst, 0.5, 0.9), kind: 'music' });
        osc(t, { type: 'sine', f: f * 2.003, attack: dur * 0.5, hold: dur * 0.2, release: 1.6, gain: def.pad.gain * 0.35, dests: dests(inst, 0.3, 1, 0.3), kind: 'music' });
      } else {
        osc(t, { type: 'sawtooth', f, detune: -7, attack: dur * 0.3, hold: dur * 0.45, release: 1.6, gain: def.pad.gain, filter, dests: dests(inst, 0.6, 0.7), kind: 'music' });
        osc(t, { type: 'sawtooth', f, detune: 8, attack: dur * 0.3, hold: dur * 0.45, release: 1.6, gain: def.pad.gain, filter, dests: dests(inst, 0.6, 0.7), kind: 'music' });
      }
    }
    if (def.pad.wobble) {
      // 늪: 낮은 음 하나가 천천히 흔들리며 웅웅거린다
      const f = mtof(notes[0] - 12);
      osc(t, { type: 'triangle', f, f1: f * 0.985, glide: dur, attack: dur * 0.4, hold: dur * 0.3, release: 1.2, gain: def.pad.gain * 1.3, filter: { type: 'lowpass', f: 300, f1: 700, q: 4, time: dur }, dests: dests(inst, 0.8, 0.4), kind: 'music' });
    }
  }

  function pluck(inst, n, t, gain, glass) {
    const f = mtof(n);
    if (glass) {
      osc(t, { type: 'sine', f, release: 0.9, gain, dests: dests(inst, 0.5, 0.8, 0.6), kind: 'music' });
      osc(t, { type: 'sine', f: f * 3.01, release: 0.3, gain: gain * 0.3, dests: dests(inst, 0.3, 0.8, 0.4), kind: 'music' });
      return;
    }
    osc(t, { type: 'triangle', f, release: 0.9, gain, filter: { type: 'lowpass', f: 4200, f1: 900, time: 0.5 }, dests: dests(inst, 0.8, 0.5, 0.35), kind: 'music' });
    osc(t, { type: 'sine', f: f * 2, release: 0.35, gain: gain * 0.35, dests: dests(inst, 0.7, 0.4), kind: 'music' });
  }

  // 종·유리 같은 선율 악기: 비정수 배음을 섞어 맑게
  function bell(inst, n, t, dur, gain) {
    const f = mtof(n);
    osc(t, { type: 'sine', f, attack: 0.01, release: Math.max(0.8, dur * 2), gain, dests: dests(inst, 0.7, 0.8, 0.5), kind: 'music' });
    osc(t, { type: 'sine', f: f * 2.76, attack: 0.005, release: 0.45, gain: gain * 0.28, dests: dests(inst, 0.5, 0.8, 0.4), kind: 'music' });
    osc(t, { type: 'triangle', f: f * 0.5, attack: 0.02, release: Math.max(0.5, dur), gain: gain * 0.25, dests: dests(inst, 0.6, 0.4), kind: 'music' });
  }

  function bass(inst, n, t, dur, gain) {
    const f = mtof(n);
    osc(t, { type: 'sine', f, attack: 0.02, hold: dur * 0.6, release: dur * 0.5 + 0.1, gain, dests: dests(inst, 1, 0.08), kind: 'music' });
    osc(t, { type: 'triangle', f, attack: 0.02, hold: dur * 0.4, release: dur * 0.4, gain: gain * 0.35, filter: { type: 'lowpass', f: 480 }, dests: dests(inst, 1), kind: 'music' });
  }

  function kick(inst, t, gain, bus) {
    const d = bus ? [[bus, 1]] : dests(inst, 1, 0.05);
    osc(t, { type: 'sine', f: 150, f1: 42, glide: 0.12, release: 0.32, gain, dests: d, kind: 'music' });
    noise(t, { filter: { type: 'lowpass', f: 1200 }, release: 0.02, gain: gain * 0.25, dests: d, kind: 'music' });
  }

  function hat(inst, t, gain, open) {
    noise(t, { filter: { type: 'highpass', f: 7500 }, release: open ? 0.18 : 0.035, gain, dests: dests(inst, 1, 0.15), kind: 'music' });
  }

  function tom(inst, t, f, gain, bus) {
    const d = bus ? [[bus, 1]] : dests(inst, 1, 0.3);
    osc(t, { type: 'sine', f, f1: f * 0.55, glide: 0.25, release: 0.35, gain, dests: d, kind: 'music' });
    noise(t, { filter: { type: 'bandpass', f: f * 3, q: 1.5 }, release: 0.05, gain: gain * 0.3, dests: d, kind: 'music' });
  }

  function snare(inst, t, gain) {
    noise(t, { filter: { type: 'bandpass', f: 1900, q: 0.8 }, release: 0.16, gain, dests: dests(inst, 1, 0.35), kind: 'music' });
    osc(t, { type: 'triangle', f: 200, f1: 150, release: 0.09, gain: gain * 0.6, dests: dests(inst, 1, 0.2), kind: 'music' });
  }

  // 금관 같은 찌르기: 톱니파 둘 + 열렸다 닫히는 필터
  function brass(inst, notes, t, dur, gain, bus) {
    const d = bus ? [[bus, 1], [inst.wet, 0.4]] : dests(inst, 0.9, 0.5);
    for (const n of notes) {
      const f = mtof(n);
      [-6, 6].forEach((det) => osc(t, {
        type: 'sawtooth', f, detune: det, attack: 0.06, hold: dur * 0.5, release: dur * 0.5,
        gain, filter: { type: 'lowpass', f: 400, f1: 1900, q: 1.5, time: 0.12 }, dests: d, kind: 'music',
      }));
    }
  }

  function drop(inst, t, gain) {
    const f = rnd(1300, 2600);
    osc(t, { type: 'sine', f, f1: f * 0.55, glide: 0.07, release: 0.12, gain, dests: dests(inst, 0.4, 0.9, 0.8), kind: 'music' });
  }

  // ---------- 한 칸(16분음표) 연주 ----------
  function playStep(inst, i, t) {
    const def = inst.def;
    const I = music.intensity;
    const stepInBar = i % 16;
    const bar = Math.floor(i / 16);
    const sec = inst.section;
    const busy = musicVoices > MAX_MUSIC_VOICES;

    // 마디 시작: 구간과 화음 정하기
    if (stepInBar === 0) {
      if (bar > 0) inst.barInSection++;
      if (inst.barInSection >= inst.sectionBars) {
        inst.barInSection = 0;
        inst.section = nextSection(inst);
        inst.sectionBars = inst.section === 'break' || inst.section === 'intro' ? 4 : 8;
        if (Math.random() < 0.45) inst.prog = pickOne(def.progs);
        if (!inst.motif || inst.motifUses > 3) { inst.motif = makeMotif(); inst.motifUses = 0; }
      }
    }
    const chordIdx = Math.floor(bar / def.barsPerChord) % inst.prog.length;
    const chordRoot = inst.prog[chordIdx];
    const chordStart = stepInBar === 0 && bar % def.barsPerChord === 0;
    const degs = chordDegrees(chordRoot);
    const barDur = inst.stepDur * 16;

    // 패드: 화음이 바뀔 때마다
    if (chordStart) {
      const base = def.pad.octave;
      const notes = degs.map((d) => degreeNote(def, d) + base);
      if (sec !== 'intro' || Math.random() < 0.7) notes.push(degreeNote(def, chordRoot + 7) + base);
      pad(inst, notes, t, barDur * def.barsPerChord);
    }

    // 베이스
    const bassOn = I >= def.bass.from || sec === 'B';
    if (bassOn && def.bass) {
      const root = degreeNote(def, chordRoot) - 12 + (def.root < 42 ? 12 : 0);
      if (def.bass.drone) {
        if (chordStart) bass(inst, root, t, barDur * def.barsPerChord * 0.9, def.bass.gain);
      } else if (def.bass.pulse) {
        if (stepInBar % 4 === 0) bass(inst, root, t, inst.stepDur * 3, def.bass.gain * (stepInBar === 0 ? 1 : 0.6));
      } else if (stepInBar === 0 || (stepInBar === 8 && I > 0.4) || (stepInBar === 14 && I > 0.7 && Math.random() < 0.5)) {
        bass(inst, stepInBar === 14 ? root + 7 : root, t, inst.stepDur * (stepInBar === 0 ? 6 : 4), def.bass.gain);
      }
    }

    // 아르페지오
    const arpOn = (sec === 'A' || sec === 'B' || I > 0.55) && I >= def.arp.from && !busy;
    const rate = I > 0.65 && def.arp.rate > 1 ? def.arp.rate / 2 : def.arp.rate;
    if (arpOn && stepInBar % rate === 0) {
      const tones = degs.concat([chordRoot + 7, chordRoot + 9]);
      inst.arpPos = ((inst.arpPos || 0) + inst.arpDir + tones.length) % tones.length;
      if (inst.arpPos === 0 || inst.arpPos === tones.length - 1) inst.arpDir *= -1;
      const d = def.arp.glass ? pickOne(tones) + (Math.random() < 0.3 ? 7 : 0) : tones[inst.arpPos];
      const accent = stepInBar % 8 === 0 ? 1.25 : 1;
      if (!def.arp.glass || Math.random() < 0.55) pluck(inst, degreeNote(def, d) + def.arp.octave - 12, t, def.arp.gain * accent, def.arp.glass);
    }

    // 선율: 2마디짜리 동기를 화음에 맞춰 되풀이하며 조금씩 바꾼다
    const leadOn = (sec === 'A' || sec === 'break' || (sec === 'B' && Math.random() < 0.85)) && !busy;
    if (leadOn && inst.motif) {
      const pos = i % 32;
      if (pos === 0) {
        inst.motifUses++;
        inst.liveMotif = varyMotif(inst.motif);
      }
      const motif = inst.liveMotif || inst.motif;
      for (const n of motif) {
        if (n.step === pos && Math.random() < 0.5 + def.lead.density * 0.6) {
          bell(inst, degreeNote(def, chordRoot + n.deg) + def.lead.octave - 12, t, inst.stepDur * n.len, def.lead.gain);
        }
      }
    }

    // 물방울 (늪)
    if (def.drops && Math.random() < 0.035 && !busy) drop(inst, t, 0.03);

    // 금관 찌르기 (폐허는 평소에도 조용히)
    if (def.brass && chordStart && (sec === 'B' || I > 0.5)) {
      brass(inst, degs.map((d) => degreeNote(def, d) + 12), t, inst.stepDur * 3, 0.012 + I * 0.008);
    }

    // 타악기
    if (def.drums && I >= def.drums.from) drums(inst, def.drums.kit, stepInBar, t, I, sec);

    // 보스 층: 낮게 몰아치는 맥박과 불길한 금관
    if (music.boss) {
      const root = degreeNote(def, chordRoot) - 12 + (def.root < 42 ? 12 : 0);
      if (stepInBar % 2 === 0) {
        osc(t, {
          type: 'sawtooth', f: mtof(root), attack: 0.005, release: inst.stepDur * 1.6,
          gain: stepInBar % 4 === 0 ? 0.045 : 0.03, filter: { type: 'lowpass', f: 650, f1: 180, time: inst.stepDur * 1.5, q: 3 },
          dests: [[inst.bossBus, 1]], kind: 'music',
        });
      }
      if (stepInBar % 4 === 0) kick(inst, t, stepInBar === 0 ? 0.16 : 0.11, inst.bossBus);
      if (stepInBar === 0 && bar % 2 === 0) brass(inst, degs.map((d) => degreeNote(def, d) + (def.root < 42 ? 12 : 0)), t, inst.stepDur * 6, 0.02, inst.bossBus);
      if (stepInBar >= 12 && bar % 4 === 3) tom(inst, t, 180 - (stepInBar - 12) * 18, 0.07, inst.bossBus);
    }
  }

  function drums(inst, kit, s, t, I, sec) {
    const full = sec === 'B' ? 1 : 0.6;
    if (kit === 'soft') {
      if (s % 4 === 2 && I > 0.3) hat(inst, t, 0.012 * full, false);
      if ((s === 0 || (s === 10 && I > 0.6)) && I > 0.45) kick(inst, t, 0.1 * full);
      if (s === 8 && I > 0.6) tom(inst, t, 140, 0.05 * full);
    } else if (kit === 'swamp') {
      if (s === 0) tom(inst, t, 90, 0.07 * full);
      if (s === 10 && I > 0.5) tom(inst, t, 120, 0.05 * full);
      if (s % 4 === 3 && I > 0.6) hat(inst, t, 0.008 * full, s === 15);
    } else if (kit === 'march') {
      if (s === 0 || s === 8) kick(inst, t, 0.12 * full);
      if (s === 4 || s === 12) snare(inst, t, 0.05 * full);
      if (I > 0.5 && (s === 14 || s === 15)) snare(inst, t, 0.025 * full);
      if (s % 2 === 0 && I > 0.35) hat(inst, t, 0.01 * full, false);
      if (I > 0.7 && s >= 12 && Math.random() < 0.4) tom(inst, t, 160 - (s - 12) * 15, 0.05);
    } else if (kit === 'cosmic') {
      if (s === 0) kick(inst, t, 0.1 * full);
      if (s === 8 && I > 0.55) kick(inst, t, 0.07 * full);
      if (s % 4 === 2 && I > 0.45) noise(t, { filter: { type: 'bandpass', f: 5000, q: 6 }, attack: 0.03, release: 0.12, gain: 0.012 * full, dests: dests(inst, 0.6, 0.8, 0.5), kind: 'music' });
    }
  }

  // ---------- 스케줄러 ----------
  let timer = null;
  let lastMusicVol = -1;
  const LOOKAHEAD = 0.12;

  function startScheduler() {
    if (timer) return;
    timer = setInterval(tick, 25);
  }

  function tick() {
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const vol = musicVolume();
    if (vol !== lastMusicVol) {
      lastMusicVol = vol;
      musicBus.gain.setTargetAtTime(MUSIC_LEVEL * vol, now, 0.05);
    }
    for (let k = music.fading.length - 1; k >= 0; k--) {
      const f = music.fading[k];
      if (now > f.endAt + 3) {
        try { f.out.disconnect(); f.wet.disconnect(); f.echo.disconnect(); f.bossBus.disconnect(); } catch (e) { /* 이미 끊김 */ }
        music.fading.splice(k, 1);
      }
    }
    const inst = music.current;
    if (!inst) return;
    // 탭이 오래 멈춰 있었으면 박자를 지금으로 다시 맞춘다
    if (inst.next < now - 0.25) inst.next = now + 0.05;
    while (inst.next < now + LOOKAHEAD) {
      if (vol > 0.001) {
        try { playStep(inst, inst.step, inst.next); } catch (e) { /* 음 하나 실패는 무시 */ }
      }
      inst.next += inst.stepDur;
      inst.step++;
    }
  }

  // ---------- 스팅어: 음악 위에 얹는 짧은 악절 ----------
  const STINGERS = {
    levelup(t, r) {
      [0, 4, 7, 12, 16].forEach((x, i) => sting('triangle', mtof(r + 24 + x), t + i * 0.055, 0.35, 0.05));
    },
    evolve(t, r) {
      [0, 7, 12, 16, 19, 24].forEach((x, i) => {
        sting('sine', mtof(r + 24 + x), t + i * 0.08, 1.4, 0.04);
        sting('triangle', mtof(r + 12 + x), t + i * 0.08, 0.9, 0.02);
      });
    },
    victory(t, r) {
      const seq = [[0, 0.0], [4, 0.18], [7, 0.36], [12, 0.54], [7, 0.9], [12, 1.08], [16, 1.26]];
      seq.forEach(([x, d], i) => sting('triangle', mtof(r + 24 + x), t + d, i === seq.length - 1 ? 2.2 : 0.4, 0.06));
      [0, 4, 7].forEach((x) => sting('sawtooth', mtof(r + 12 + x), t + 1.26, 2.2, 0.018, 1800));
      sting('sine', mtof(r), t + 1.26, 2.2, 0.08);
    },
    defeat(t, r) {
      [12, 10, 7, 3, 0].forEach((x, i) => sting('triangle', mtof(r + 24 + x), t + i * 0.32, i === 4 ? 2.4 : 0.6, 0.045, 1800));
      sting('sawtooth', mtof(r), t, 3, 0.02, 500);
    },
  };

  function sting(type, f, t, dur, gain, cutoff) {
    osc(t, {
      type, f, attack: 0.01, release: dur, gain,
      filter: cutoff ? { type: 'lowpass', f: cutoff } : null,
      dests: [[stingerBus, 1], [reverbIn, 0.5]], kind: 'music',
    });
  }

  G.music = {
    // 곡을 바꾼다(1.5초 교차). 첫 입력 전이면 기억해 뒀다가 입력이 들어오면 시작
    play(id) {
      music.desired = id;
      if (unlocked) startTrack(id);
    },
    stop() {
      music.desired = null;
      if (music.current && ctx) fadeOut(music.current);
      music.current = null;
    },
    // 0~1: 판이 진행될수록 층이 쌓이고 타악기가 촘촘해진다
    setIntensity(x) { music.intensity = Math.max(0, Math.min(1, Number(x) || 0)); },
    // 보스가 살아 있는 동안 긴박한 층을 더한다
    setBoss(on) {
      on = !!on;
      if (music.boss === on) return;
      music.boss = on;
      if (!ctx || !music.current) return;
      music.current.bossBus.gain.setTargetAtTime(on ? 1 : 0.0001, ctx.currentTime, on ? 0.3 : 0.8);
    },
    // 일시정지·레벨업·상자: 먹먹하고 작게
    duck(on) {
      on = !!on;
      music.ducked = on;
      if (!ctx) return;
      const t = ctx.currentTime;
      duckFilter.frequency.setTargetAtTime(on ? 750 : 18000, t, on ? 0.12 : 0.25);
      duckGain.gain.setTargetAtTime(on ? 0.45 : 1, t, on ? 0.12 : 0.25);
    },
    // levelup | evolve | victory | defeat. victory·defeat는 흐르던 곡을 함께 끝낸다
    stinger(name) {
      if (!unlocked || !ctx || ctx.state !== 'running' || musicVolume() <= 0) return;
      const fn = STINGERS[name];
      if (!fn) return;
      const root = music.current ? music.current.def.root : 50;
      if ((name === 'victory' || name === 'defeat') && music.current) {
        fadeOut(music.current, 1.2);
        music.current = null;
        music.desired = null;
      }
      try { fn(ctx.currentTime + 0.02, root); } catch (e) { /* 무시 */ }
    },
    refreshVolume() {
      if (!ctx) return;
      lastMusicVol = musicVolume();
      musicBus.gain.setTargetAtTime(MUSIC_LEVEL * lastMusicVol, ctx.currentTime, 0.05);
    },
    get track() { return music.current ? music.current.id : null; },
    tracks: Object.keys(TRACKS),
  };
})(window.G);
