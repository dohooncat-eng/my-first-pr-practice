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

  class Brain {
    constructor(data, seed = 1, dt = 0.1) {
      this.n = data.n;
      this.indptr = b64(data.indptr, Int32Array);
      this.post = b64(data.post, Uint16Array);
      this.syn = b64(data.syn, Int16Array);           // signed synapse counts
      this.groups = {};
      for (const k in data.groups) this.groups[k] = Uint16Array.from(data.groups[k]);
      this.w = new Float32Array(this.syn.length);
      for (let k = 0; k < this.w.length; k++) this.w[k] = this.syn[k] * W_SYN;
      this.w0 = this.w.slice();
      // plastic synapses: excitatory inputs onto the steering neurons
      const steer = new Uint8Array(this.n);
      for (const i of this.groups.steer_left) steer[i] = 1;
      for (const i of this.groups.steer_right) steer[i] = 1;
      const pk = [], pre = [];
      for (let j = 0; j < this.n; j++)
        for (let k = this.indptr[j]; k < this.indptr[j + 1]; k++)
          if (steer[this.post[k]] && this.syn[k] > 0) { pk.push(k); pre.push(j); }
      this.plastic = Int32Array.from(pk);
      this.plasticPre = Int32Array.from(pre);
      this.elig = new Float32Array(pk.length);
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
    resetLearning() { this.w.set(this.w0); this.elig.fill(0); }
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
  function brainMove(brain, snake) {
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
    const turn = R - L > CFG.TURN_THRESHOLD ? 1 : L - R > CFG.TURN_THRESHOLD ? -1 : 0;
    return { senses: s, L, R, turn };
  }

  const api = { Brain, Snake, brainMove, mulberry32, CFG };
  if (typeof module !== "undefined") module.exports = api; else root.FlyBrain = api;
})(this);
