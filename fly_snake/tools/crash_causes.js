// node tools/crash_causes.js <games> <seed> — why does the instinct brain crash?
const fs = require("fs");
const { Brain, Snake, playMove, mulberry32 } = require("../web/brain.js");
const net = JSON.parse(fs.readFileSync(__dirname + "/../web/network.json"));
const games = +(process.argv[2] || 30), seed = +(process.argv[3] || 5);
const brain = new Brain(net, seed), rand = mulberry32(seed);
const causes = {};
for (let g = 0; g < games; g++) {
  const s = new Snake(12, rand); brain.reset();
  let last;
  while (s.alive && s.moves < 300) {
    const before = { blockedL: s.blocked(s.cellToward(-1)), blockedS: s.blocked(s.cellToward(0)), blockedR: s.blocked(s.cellToward(1)) };
    last = Object.assign(playMove(brain, s, false), before);
  }
  if (s.alive) { causes["survived 300"] = (causes["survived 300"] || 0) + 1; continue; }
  const free = ["L", "S", "R"].filter((k) => !last["blocked" + k]).length;
  const what = ["left", "straight", "right"][last.turn + 1];
  let c;
  if (free === 0) c = "trapped (no free cell)";
  else if (last.turn === 0 && last.blockedS) c = `went straight into obstacle ahead (|L-R| ${Math.abs(last.L - last.R) < 20 ? "<" : ">="} 20 Hz)`;
  else c = `turned ${what} into an obstacle`;
  causes[c] = (causes[c] || 0) + 1;
}
console.log(causes);
