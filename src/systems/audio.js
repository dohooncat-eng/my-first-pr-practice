// 효과음: 파일 없이 WebAudio로 합성한다. 첫 사용자 입력 전에는 조용히 무시한다.
// 같은 소리가 너무 자주 겹치지 않도록 소리마다 최소 간격을 두고, 동시에 울리는 개수도 제한한다.
(function (G) {
  'use strict';

  let ctx = null;
  let master = null;
  let noiseBuf = null;
  let unlocked = false;
  let voices = 0;
  const MAX_VOICES = 24;
  const lastPlayed = {};
  let gemStreak = 0;
  let gemStreakAt = 0;

  // 소리마다 최소 간격(초)
  const GAP = {
    shoot: 0.07, slash: 0.09, hit: 0.045, kill: 0.05, gem: 0.03, coin: 0.06,
    levelup: 0.3, chest: 0.5, evolve: 0.5, boss: 1, hurt: 0.2, heal: 0.25, select: 0.04, click: 0.03,
  };

  function volume() {
    const s = G.meta && G.meta.settings;
    return s && typeof s.sfx === 'number' ? s.sfx : 0.7;
  }

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      ctx = new AC();
    } catch (e) {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = 0.5;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 6;
    master.connect(comp);
    comp.connect(ctx.destination);
    // 1초짜리 흰 잡음 버퍼 (타격·바람 소리용)
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return ctx;
  }

  function unlock() {
    if (unlocked) return;
    if (!ensure()) return;
    unlocked = true;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => {
    window.addEventListener(ev, unlock, { capture: true, passive: true });
  });

  // ---------- 합성 도우미 ----------

  function voiceDone(node, end) {
    voices++;
    node.onended = () => { voices = Math.max(0, voices - 1); };
    return end;
  }

  // 음높이가 f0 → f1로 미끄러지는 톤
  function tone(type, f0, f1, dur, gain, delay) {
    const t = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.012, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
    voiceDone(osc);
  }

  // 걸러낸 잡음. type: 필터 종류, f0 → f1 필터 주파수
  function noise(filterType, f0, f1, dur, gain, delay, q) {
    const t = ctx.currentTime + (delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.value = q || 1;
    filter.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) filter.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.01, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
    voiceDone(src);
  }

  function chord(freqs, type, dur, gain, step) {
    freqs.forEach((f, i) => tone(type, f, f, dur, gain, i * (step || 0)));
  }

  const SOUNDS = {
    shoot() {
      tone('sine', 880, 520, 0.08, 0.05);
      noise('bandpass', 3000, 1800, 0.06, 0.04, 0, 2);
    },
    slash() {
      noise('highpass', 1800, 6000, 0.16, 0.09, 0, 0.7);
      tone('triangle', 520, 300, 0.1, 0.03);
    },
    hit() {
      tone('square', 210 * (0.9 + Math.random() * 0.2), 120, 0.05, 0.025);
      noise('lowpass', 2400, 800, 0.04, 0.04);
    },
    kill() {
      tone('triangle', 320, 90, 0.12, 0.06);
      noise('bandpass', 900, 300, 0.1, 0.05, 0, 1.5);
    },
    gem() {
      const now = performance.now();
      gemStreak = now - gemStreakAt < 400 ? Math.min(gemStreak + 1, 12) : 0;
      gemStreakAt = now;
      const f = 1100 * Math.pow(1.06, gemStreak);
      tone('sine', f, f * 1.5, 0.07, 0.05);
    },
    coin() {
      tone('square', 1480, 1480, 0.05, 0.03);
      tone('square', 1980, 1980, 0.12, 0.03, 0.05);
    },
    levelup() {
      chord([523, 659, 784, 1047], 'triangle', 0.22, 0.08, 0.07);
      tone('sine', 1568, 2093, 0.4, 0.03, 0.28);
    },
    chest() {
      noise('lowpass', 300, 120, 0.5, 0.12);
      tone('sine', 70, 50, 0.45, 0.12);
      chord([784, 988, 1175, 1568], 'triangle', 0.6, 0.06, 0.09);
    },
    evolve() {
      tone('sawtooth', 220, 880, 0.6, 0.04);
      noise('bandpass', 800, 5000, 0.6, 0.05, 0, 3);
      chord([659, 830, 988, 1319, 1661], 'triangle', 0.7, 0.06, 0.08);
    },
    boss() {
      tone('sawtooth', 62, 48, 1.1, 0.12);
      tone('sawtooth', 93, 70, 1.1, 0.06);
      noise('lowpass', 500, 90, 1.2, 0.12);
    },
    hurt() {
      tone('square', 180, 80, 0.16, 0.07);
      noise('lowpass', 1200, 300, 0.12, 0.06);
    },
    heal() {
      chord([660, 880, 1320], 'sine', 0.25, 0.05, 0.06);
    },
    select() {
      tone('sine', 660, 990, 0.06, 0.05);
    },
    click() {
      tone('sine', 900, 900, 0.035, 0.04);
    },
  };

  G.sfx = {
    play(name) {
      if (!unlocked || !ctx || ctx.state !== 'running') return;
      const fn = SOUNDS[name];
      if (!fn) return;
      const vol = volume();
      if (vol <= 0) return;
      const now = ctx.currentTime;
      if (now - (lastPlayed[name] || -1) < (GAP[name] || 0.05)) return;
      // 동시 소리가 많으면 자잘한 소리부터 버린다
      if (voices > MAX_VOICES && (name === 'hit' || name === 'gem' || name === 'shoot' || name === 'kill')) return;
      lastPlayed[name] = now;
      master.gain.setValueAtTime(0.5 * vol, now);
      try { fn(); } catch (e) { /* 소리 실패는 게임에 영향 없음 */ }
    },
    unlock,
  };
})(window.G);
