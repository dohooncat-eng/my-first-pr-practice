// Parallel learning batch:
//   node tools/batch.js <seeds> <games> [threads] [modes=off,hebb,rpe] [KEY=value ...]
// Every seed is played once per learning mode with the same snake RNG, one job per worker thread.
// KEY=value overrides LEARN constants in web/brain.js, e.g. RPE_LR=0.05.
const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");
const fs = require("fs");
const os = require("os");
const path = require("path");

// network.json if it was exported locally, otherwise the copy embedded in web/fly_snake.html
function loadNet() {
  const j = path.join(__dirname, "../web/network.json");
  if (fs.existsSync(j)) return JSON.parse(fs.readFileSync(j));
  const html = fs.readFileSync(path.join(__dirname, "../web/fly_snake.html"), "utf8");
  const m = html.match(/<script id="net" type="application\/json">([\s\S]*?)<\/script>/);
  return JSON.parse(m[1].replace(/<\\\//g, "</"));
}

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const sd = (a) => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / Math.max(1, a.length - 1)); };

if (isMainThread) {
  const seeds = +(process.argv[2] || 8), games = +(process.argv[3] || 50);
  const threads = +(process.argv[4] || os.cpus().length);
  const modes = (process.argv[5] || "off,hebb,rpe").split(",");
  const overrides = Object.fromEntries(process.argv.slice(6).map((a) => a.split("=")).map(([k, v]) => [k, +v]));
  const jobs = [];
  for (let s = 1; s <= seeds; s++) for (const learn of modes) jobs.push({ seed: s, learn, games, overrides });
  const results = [];
  let next = 0, running = 0;
  const t0 = Date.now();
  console.log(`${jobs.length} jobs on ${threads} threads, modes ${modes.join("/")}`, overrides);
  const report = () => {
    fs.writeFileSync(path.join(__dirname, "batch_results.json"), JSON.stringify({ seeds, games, modes, overrides, results }));
    for (const learn of modes) {
      const g = results.filter((r) => r.learn === learn);
      const per = g.map((r) => mean(r.scores));
      const curve = [];
      for (let i = 0; i < games; i += 10) curve.push(mean(g.map((r) => mean(r.scores.slice(i, i + 10)))).toFixed(2));
      console.log(`${learn.padEnd(5)} mean ${mean(per).toFixed(2)} ± ${sd(per).toFixed(2)} (sd over seeds), ` +
        `moves ${mean(g.map((r) => mean(r.moves))).toFixed(1)}, per 10 games ${curve.join(" → ")}`);
    }
    for (const learn of modes.slice(1)) {
      const diffs = [];
      for (let s = 1; s <= seeds; s++) {
        const a = results.find((r) => r.seed === s && r.learn === modes[0]);
        const b = results.find((r) => r.seed === s && r.learn === learn);
        diffs.push(mean(b.scores) - mean(a.scores));
      }
      const t = mean(diffs) / (sd(diffs) / Math.sqrt(diffs.length));
      console.log(`paired ${learn} - ${modes[0]}: ${mean(diffs).toFixed(2)} food/game, ` +
        `better in ${diffs.filter((d) => d > 0).length}/${seeds} seeds, t=${t.toFixed(2)}`);
    }
  };
  const launch = () => {
    while (running < threads && next < jobs.length) {
      const job = jobs[next++]; running++;
      const w = new Worker(__filename, { workerData: job });
      w.on("message", (r) => {
        results.push(r);
        console.log(`seed ${r.seed} ${r.learn} mean ${mean(r.scores).toFixed(2)} (${((Date.now() - t0) / 1000) | 0}s)`);
      });
      w.on("error", (e) => { console.error(e); process.exit(1); });
      w.on("exit", () => {
        running--;
        if (next < jobs.length) launch(); else if (running === 0) report();
      });
    }
  };
  launch();
} else {
  const { Brain, Snake, playMove, mulberry32, LEARN } = require("../web/brain.js");
  const { seed, learn, games, overrides } = workerData;
  Object.assign(LEARN, overrides);
  const net = loadNet();
  const brain = new Brain(net, seed), rand = mulberry32(seed + 100);
  const scores = [], moves = [];
  for (let g = 0; g < games; g++) {
    const s = new Snake(12, rand); brain.reset(); brain.elig.fill(0);
    while (s.alive && s.moves < 300) playMove(brain, s, learn);
    scores.push(s.score); moves.push(s.moves);
  }
  parentPort.postMessage({ seed, learn, scores, moves, weight: brain.weightChange() });
}
