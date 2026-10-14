// node tools/test_web.js — speed + fidelity check of the browser sub-network
const fs = require("fs");
const { Brain } = require("../web/brain.js");
const net = JSON.parse(fs.readFileSync(__dirname + "/../web/network.json"));
const b = new Brain(net, 3);
const conds = [["food_left"], ["food_right"], ["danger_left"], ["danger_right"]];
for (const c of conds) {
  let L = 0, R = 0; const reps = 3;
  for (let r = 0; r < reps; r++) {
    b.reset(); b.count.fill(0);
    const t = Date.now();
    b.run(300, c.map((k) => [100, b.groups[k]]));
    if (r === 0) process.stdout.write(`${c} 300ms brain in ${Date.now() - t} ms wall; `);
    for (const i of b.groups.steer_left) L += b.count[i];
    for (const i of b.groups.steer_right) R += b.count[i];
  }
  console.log(`steer L=${(L / reps / 0.3).toFixed(1)} R=${(R / reps / 0.3).toFixed(1)}`);
}
