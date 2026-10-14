// node tools/test_learning.js <games> <learn 0|1> <seed> [lr] — same rules as the web page
const fs = require("fs");
const { Brain, Snake, brainMove, mulberry32 } = require("../web/brain.js");
const net = JSON.parse(fs.readFileSync(__dirname + "/../web/network.json"));
const [games, learn, seed, lr] = [+process.argv[2], process.argv[3] === "1", +process.argv[4], +(process.argv[5] || 0.6)];
const brain = new Brain(net, seed), rand = mulberry32(seed + 100);
const scores = [];
for (let g = 0; g < games; g++) {
  const s = new Snake(12, rand); brain.reset(); brain.elig.fill(0);
  while (s.alive && s.moves < 300) {
    const { turn } = brainMove(brain, s);
    if (learn) brain.updateEligibility(0.5);
    const d0 = s.foodDist(), res = s.step(turn);
    const r = res === "eat" ? 1 : res === "crash" ? -1 : s.foodDist() < d0 ? 0.1 : -0.1;
    if (learn) brain.reward(r, lr);
  }
  scores.push(s.score);
  console.log(`game ${g} score ${s.score} moves ${s.moves} weights ${(brain.weightChange() * 100).toFixed(0)}%`);
}
const avg = (a) => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2);
console.log(`learn=${learn} lr=${lr} seed=${seed} mean ${avg(scores)} first10 ${avg(scores.slice(0, 10))} last10 ${avg(scores.slice(-10))}`);
