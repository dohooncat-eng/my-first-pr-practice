// Fruit fly brain sub-network (LIF, Shiu et al. 2024 parameters) + Snake + reward learning.
// Shared by the web page and the node test (module.exports at the bottom).
(function (root) {
  const V_0 = -52, V_RST = -52, V_TH = -45, T_MBR = 20, TAU = 5, T_RFC = 2.2, T_DLY = 1.8;
  const W_SYN = 0.275, POI_KICK = 0.275 * 250;

  function b64(s, Type) {
    const bin = typeof atob === "function" ? atob(s) : Buffer.from(s, "base64").toString("binary");
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return new Type(u8.buffer);
  }

  // small seeded RNG so runs are reproducible
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Decode the network once per data object: CSR connectivity, groups, plastic synapse list.
  function decode(data) {
    const d = { n: data.n };
    d.indptr = b64(data.indptr, Int32Array);
    d.post = b64(data.post, Uint16Array);
    d.syn = b64(data.syn, Int16Array);           // signed synapse counts
    d.groups = {};
    for (const k in data.groups) d.groups[k] = Uint16Array.from(data.groups[k]);
    d.w0 = new Float32Array(d.syn.length);
    for (let k = 0; k < d.w0.length; k++) d.w0[k] = d.syn[k] * W_SYN;
    // plastic synapses: excitatory inputs onto the steering neurons
    d.side = new Uint8Array(d.n); // 1 = left steering neuron, 2 = right
    for (const i of d.groups.steer_left) d.side[i] = 1;
    for (const i of d.groups.steer_right) d.side[i] = 2;
    const pk = [], pre = [];
    for (let j = 0; j < d.n; j++)
      for (let k = d.indptr[j]; k < d.indptr[j + 1]; k++)
        if (d.side[d.post[k]] && d.syn[k] > 0) { pk.push(k); pre.push(j); }
    d.plastic = Int32Array.from(pk);
    d.plasticPre = Int32Array.from(pre);
    return d;
  }

  class Brain {
    // ownWeights=false shares the (never modified) weights with other brains built from the
    // same data object, so many instinct-only flies in one worker cost almost no memory.
    constructor(data, seed = 1, dt = 0.1, ownWeights = true) {
      if (!data._shared) data._shared = decode(data);
      Object.assign(this, data._shared);
      this.w = ownWeights ? this.w0.slice() : this.w0;
      this.elig = new Float32Array(this.plastic.length);
      this.baseline = 0;
      this.dt = dt;
      this.dv = Math.exp(-dt / T_MBR);
      this.dg = Math.exp(-dt / TAU);
      this.gv = (TAU / (TAU - T_MBR)) * (this.dg - this.dv);
      this.nRfc = Math.round(T_RFC / dt);
      this.nDly = Math.round(T_DLY / dt);
      this.rand = mulberry32(seed);
      this.v = new Float32Array(this.n);
      this.g = new Float32Array(this.n);
      this.rfc = new Int32Array(this.n);
      this.count = new Int32Array(this.n);
      this.isStim = new Uint8Array(this.n);
      this.reset();
    }
    reset() {
      this.v.fill(V_0); this.g.fill(0); this.rfc.fill(0);
      this.pending = Array.from({ length: this.nDly }, () => []);
      this.t = 0;
    }
    resetLearning() { if (this.w !== this.w0) this.w.set(this.w0); this.elig.fill(0); this.baseline = 0; }
    // stim: array of [rateHz, Uint16Array indices]
    run(ms, stim) {
      const { n, v, g, rfc, indptr, post, w, count, isStim } = this;
      isStim.fill(0);
      for (const [, ix] of stim) for (const i of ix) isStim[i] = 1;
      const steps = Math.round(ms / this.dt);
      for (let s = 0; s < steps; s++) {
        const slot = this.t % this.nDly;
        const arrived = this.pending[slot];
        for (let a = 0; a < arrived.length; a++) {
          const j = arrived[a];
          for (let k = indptr[j]; k < indptr[j + 1]; k++) g[post[k]] += w[k];
        }
        const spk = [];
        for (let i = 0; i < n; i++) {
          if (rfc[i] > 0 && !isStim[i]) { rfc[i]--; continue; }
          v[i] = V_0 + (v[i] - V_0) * this.dv + g[i] * this.gv;
          g[i] *= this.dg;
        }
        for (const [rate, ix] of stim) {
          const p = rate * this.dt * 1e-3;
          for (let q = 0; q < ix.length; q++) if (this.rand() < p) v[ix[q]] += POI_KICK;
        }
        for (let i = 0; i < n; i++) {
          if (v[i] > V_TH) {
            v[i] = V_RST; g[i] = 0; rfc[i] = this.nRfc; count[i]++; spk.push(i);
          }
        }
        this.pending[slot] = spk;
        this.t++;
      }
    }
    // three-factor rule: eligibility = pre spikes x post spikes of the last move,
    // reward (dopamine-like) then scales the change of plastic weights
    updateEligibility(decay) {
      const { plastic, plasticPre, post, count, elig } = this;
      for (let m = 0; m < plastic.length; m++) {
        elig[m] = elig[m] * decay + count[plasticPre[m]] * count[post[plastic[m]]] / 100;
      }
    }
    reward(r, lr) {
      const { plastic, elig, w, w0 } = this;
      for (let m = 0; m < plastic.length; m++) {
        const k = plastic[m];
        w[k] = Math.min(4 * w0[k], Math.max(0, w[k] + lr * r * elig[m] * W_SYN));
      }
    }
    updateEligibilityRPE(decay, m) {
      const { plastic, plasticPre, post, count, elig, side } = this;
      const gL = (m.turn === -1 ? 1 : 0) - m.pL, gR = (m.turn === 1 ? 1 : 0) - m.pR;
      for (let q = 0; q < plastic.length; q++) {
        elig[q] = elig[q] * decay + count[plasticPre[q]] * (side[post[plastic[q]]] === 1 ? gL : gR);
      }
    }
    rewardRPE(delta, lr) {
      const { plastic, elig, w, w0 } = this;
      for (let q = 0; q < plastic.length; q++) {
        const k = plastic[q];
        w[k] = Math.min(4 * w0[k], Math.max(0, w[k] + lr * delta * elig[q] * W_SYN));
      }
    }
    // learned state = the plastic weights (+ the reward baseline), so learning can be saved and continued
    exportLearning() {
      return { plastic: this.plastic.length, baseline: this.baseline,
        w: Array.from(this.plastic, (k) => +this.w[k].toFixed(5)) };
    }
    importLearning(saved) {
      if (!saved || saved.plastic !== this.plastic.length) throw new Error("저장된 뇌가 이 네트워크와 맞지 않습니다");
      if (this.w === this.w0) this.w = this.w0.slice();
      this.plastic.forEach((k, q) => { this.w[k] = saved.w[q]; });
      this.baseline = saved.baseline || 0;
    }
    weightChange() {
      let s = 0, s0 = 0;
      for (const k of this.plastic) { s += this.w[k]; s0 += this.w0[k]; }
      return s / s0;
    }
  }

  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  class Snake {
    constructor(grid, rand) {
      this.grid = grid; this.rand = rand;
      const c = grid >> 1;
      this.body = [[c, c], [c, c + 1], [c, c + 2]];
      this.heading = 0; this.score = 0; this.alive = true; this.moves = 0;
      this.placeFood();
    }
    placeFood() {
      const free = [];
      for (let x = 0; x < this.grid; x++) for (let y = 0; y < this.grid; y++)
        if (!this.body.some(([a, b]) => a === x && b === y)) free.push([x, y]);
      this.food = free[Math.floor(this.rand() * free.length)];
    }
    blocked([x, y]) {
      if (x < 0 || y < 0 || x >= this.grid || y >= this.grid) return true;
      for (let i = 0; i < this.body.length - 1; i++)
        if (this.body[i][0] === x && this.body[i][1] === y) return true;
      return false;
    }
    cellToward(turn) {
      const [dx, dy] = DIRS[(this.heading + turn + 4) % 4];
      return [this.body[0][0] + dx, this.body[0][1] + dy];
    }
    foodDist() {
      return Math.hypot(this.food[0] - this.body[0][0], this.food[1] - this.body[0][1]);
    }
    senses() {
      const [hx, hy] = this.body[0];
      const fx = this.food[0] - hx, fy = this.food[1] - hy;
      const [dx, dy] = DIRS[this.heading];
      const ahead = fx * dx + fy * dy, right = -fx * dy + fy * dx;
      const angle = Math.atan2(right, ahead), near = 1 / (1 + 0.15 * Math.hypot(fx, fy));
      const clip = (x) => Math.min(1, Math.max(0, x));
      let dl = this.blocked(this.cellToward(-1)) ? 1 : 0;
      let dr = this.blocked(this.cellToward(1)) ? 1 : 0;
      if (this.blocked(this.cellToward(0))) { dl = Math.max(dl, 0.5); dr = Math.max(dr, 0.5); }
      return {
        food_left: near * clip(0.5 - (angle / Math.PI) * 1.5),
        food_right: near * clip(0.5 + (angle / Math.PI) * 1.5),
        danger_left: dl, danger_right: dr,
      };
    }
    step(turn) {
      this.heading = (this.heading + turn + 4) % 4;
      const nxt = this.cellToward(0);
      this.moves++;
      if (this.blocked(nxt)) { this.alive = false; return "crash"; }
      this.body.unshift(nxt);
      if (nxt[0] === this.food[0] && nxt[1] === this.food[1]) {
        this.score++; this.placeFood(); return "eat";
      }
      this.body.pop();
      return "move";
    }
  }

  const CFG = { STEP_MS: 200, READ_MS: 120, MAX_RATE: 150, TURN_THRESHOLD: 20 };

  // One snake move: senses -> brain -> turn. Returns everything the UI shows.
  // stochastic=true: the turn is sampled from the steering difference (behavioural variability),
  // used by the reward-prediction-error rule so it can try alternatives and learn from them.
  const sigmoid = (x) => 1 / (1 + Math.exp(-x));
  function brainMove(brain, snake, stochastic = false) {
    const s = snake.senses();
    const stim = [];
    for (const k of ["food_left", "food_right", "danger_left", "danger_right"])
      if (s[k] > 0) stim.push([CFG.MAX_RATE * s[k], brain.groups[k]]);
    brain.count.fill(0);
    brain.run(CFG.STEP_MS - CFG.READ_MS, stim);
    const early = brain.count.slice();
    brain.run(CFG.READ_MS, stim);
    const hz = (ix) => { let c = 0; for (const i of ix) c += brain.count[i] - early[i]; return c / (CFG.READ_MS / 1000); };
    const L = hz(brain.groups.steer_left), R = hz(brain.groups.steer_right);
    let turn, pL, pR;
    if (stochastic) {
      pL = sigmoid((L - R - CFG.TURN_THRESHOLD) / LEARN.TEMP);
      pR = sigmoid((R - L - CFG.TURN_THRESHOLD) / LEARN.TEMP);
      const u = brain.rand();
      turn = u < pL ? -1 : u < pL + pR ? 1 : 0;
    } else {
      turn = R - L > CFG.TURN_THRESHOLD ? 1 : L - R > CFG.TURN_THRESHOLD ? -1 : 0;
      pL = turn === -1 ? 1 : 0; pR = turn === 1 ? 1 : 0;
    }
    return { senses: s, L, R, turn, pL, pR };
  }

  // Learning rules (learn = "off" | "hebb" | "rpe"):
  //  hebb: eligibility = pre x post spikes, weight change = reward x eligibility (first version)
  //  rpe:  dopamine-like reward prediction error (reward - running average) times
  //        pre spikes x (chosen side - probability of choosing it), so a crash after turning
  //        left weakens exactly the inputs that pushed it left in that situation.
  const LEARN = { LR: 0.6, ELIG_DECAY: 0.5, R_EAT: 1, R_CRASH: -1, R_CLOSER: 0.1, R_FARTHER: -0.1,
    RPE_LR: 0.6, RPE_DECAY: 0.6, R_ALIVE: 0.02, BASELINE: 0.05, TEMP: 6 };
  function playMove(brain, snake, learn) {
    if (learn === true) learn = "hebb";
    if (!learn) learn = "off";
    const m = brainMove(brain, snake, learn === "rpe");
    if (learn === "hebb") brain.updateEligibility(LEARN.ELIG_DECAY);
    if (learn === "rpe") brain.updateEligibilityRPE(LEARN.RPE_DECAY, m);
    const d0 = snake.foodDist();
    m.res = snake.step(m.turn);
    m.reward = m.res === "eat" ? LEARN.R_EAT : m.res === "crash" ? LEARN.R_CRASH
      : snake.foodDist() < d0 ? LEARN.R_CLOSER : LEARN.R_FARTHER;
    if (learn === "hebb") brain.reward(m.reward, LEARN.LR);
    if (learn === "rpe") {
      const r = m.reward + (m.res === "move" ? LEARN.R_ALIVE : 0);
      brain.rewardRPE(r - brain.baseline, LEARN.RPE_LR);
      brain.baseline += LEARN.BASELINE * (r - brain.baseline);
    }
    return m;
  }

  const api = { Brain, Snake, brainMove, playMove, mulberry32, CFG, LEARN };
  if (typeof module !== "undefined") module.exports = api; else root.FlyBrain = api;
})(this);
