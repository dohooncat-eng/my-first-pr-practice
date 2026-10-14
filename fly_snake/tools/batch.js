// Parallel instinct-vs-learning batch: node tools/batch.js <seeds> <games> [threads]
// Every seed is played twice (learning off / on) with the same snake RNG, one job per worker thread.
const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");
const fs = require("fs");
const os = require("os");
const path = require("path");

if (isMainThread) {
  const seeds = +(process.argv[2] || 8), games = +(process.argv[3] || 50);
  const threads = +(process.argv[4] || os.cpus().length);
  const jobs = [];
  for (let s = 1; s <= seeds; s++) for (const learn of [false, true]) jobs.push({ seed: s, learn, games });
  const results = [];
  let next = 0, running = 0;
  const t0 = Date.now();
  const launch = () => {
    while (running < threads && next < jobs.length) {
      const job = jobs[next++]; running++;
      const w = new Worker(__filename, { workerData: job });
      w.on("message", (r) => {
        results.push(r);
        console.log(`seed ${r.seed} learn=${r.learn} mean ${mean(r.scores).toFixed(2)} (${((Date.now() - t0) / 1000) | 0}s)`);
      });
      w.on("error", (e) => { console.error(e); process.exit(1); });
      w.on("exit", () => { running--; next < jobs.length ? launch() : running === 0 && report(); });
    }
  };
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  const report = () => {
    const out = { seeds, games, results };
    fs.writeFileSync(path.join(__dirname, "batch_results.json"), JSON.stringify(out));
    for (const learn of [false, true]) {
      const g = results.filter((r) => r.learn === learn);
      const per = g.map((r) => mean(r.scores));
      const curve = [];
      for (let i = 0; i < games; i += 10) curve.push(mean(g.map((r) => mean(r.scores.slice(i, i + 10)))).toFixed(2));
      console.log(`${learn ? "learning" : "instinct"}: mean ${mean(per).toFixed(2)} ± ${sd(per).toFixed(2)} (sd over seeds), moves ${mean(g.map((r) => mean(r.moves))).toFixed(1)}, per 10 games ${curve.join(" → ")}`);
    }
    // paired comparison per seed
    const diffs = [];
    for (let s = 1; s <= seeds; s++) {
      const a = results.find((r) => r.seed === s && !r.learn), b = results.find((r) => r.seed === s && r.learn);
      diffs.push(mean(b.scores) - mean(a.scores));
    }
    const t = mean(diffs) / (sd(diffs) / Math.sqrt(diffs.length));
    console.log(`paired diff learning-instinct: ${mean(diffs).toFixed(2)} food/game, better in ${diffs.filter((d) => d > 0).length}/${seeds} seeds, t=${t.toFixed(2)}`);
  };
  const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
  launch();
} else {
  const { Brain, Snake, playMove, mulberry32 } = require("../web/brain.js");
  const net = JSON.parse(fs.readFileSync(path.join(__dirname, "../web/network.json")));
  const { seed, learn, games } = workerData;
  const brain = new Brain(net, seed), rand = mulberry32(seed + 100);
  const scores = [], moves = [];
  for (let g = 0; g < games; g++) {
    const s = new Snake(12, rand); brain.reset(); brain.elig.fill(0);
    while (s.alive && s.moves < 300) playMove(brain, s, learn);
    scores.push(s.score); moves.push(s.moves);
  }
  parentPort.postMessage({ seed, learn, scores, moves, weight: brain.weightChange() });
}
