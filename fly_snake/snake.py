"""Snake played by a simulated fruit fly brain.

Every move the game is turned into sensory input for the whole-brain model
(food seen on the left or right -> left or right visual neurons, an obstacle
right in front -> looming-detector neurons), the brain runs for STEP_MS, and
the snake turns toward the side whose steering descending neurons
(DNa01 + DNa02) fire more. The game code never looks at where the food is
when choosing a move; only the brain does.
"""
import argparse
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import imageio.v2 as imageio

from brain import FlyBrain

HERE = Path(__file__).parent
GRID = 12
STEP_MS = 200          # brain time per snake move
READ_MS = 120          # steering is read from the last part of the step
MAX_RATE = 150.0       # Hz, strongest sensory drive (Shiu et al. use 150-200 Hz)
TURN_THRESHOLD = 20.0  # Hz difference needed to turn instead of going straight
DIRS = [(0, -1), (1, 0), (0, 1), (-1, 0)]  # up, right, down, left (clockwise)

# Which neurons are the "eyes" and the "steering wheel".
FOOD_SENSOR = ["LC10"]           # small-object detectors (all LC10 subtypes)
DANGER_SENSOR = ["LC4", "LPLC2"]  # looming detectors
STEER = ["DNa01", "DNa02"]       # steering descending neurons


def load_neurons(brain, annot_path):
    a = pd.read_csv(annot_path, sep="\t", low_memory=False)
    ct = a.cell_type.fillna("")

    def pick(types, side=None):
        m = ct.isin(types) | ct.str.match("|".join(f"{t}[a-z]" for t in types))
        if side:
            m &= a.side == side
        return brain.idx(a[m].root_id)

    n = {}
    for s in ["left", "right"]:
        n[f"food_{s}"] = pick(FOOD_SENSOR, s)
        n[f"danger_{s}"] = pick(DANGER_SENSOR, s)
        n[f"steer_{s}"] = pick(STEER, s)
    pos = a.set_index("root_id").reindex(brain.ids)[["pos_x", "pos_y"]].to_numpy(float)
    return n, pos


class Snake:
    def __init__(self, rng):
        self.rng = rng
        c = GRID // 2
        self.body = [(c, c), (c, c + 1), (c, c + 2)]
        self.heading = 0
        self.score = 0
        self.alive = True
        self.place_food()

    def place_food(self):
        free = [(x, y) for x in range(GRID) for y in range(GRID) if (x, y) not in self.body]
        self.food = free[self.rng.integers(len(free))]

    def blocked(self, cell):
        x, y = cell
        return not (0 <= x < GRID and 0 <= y < GRID) or cell in self.body[:-1]

    def cell_toward(self, turn):
        dx, dy = DIRS[(self.heading + turn) % 4]
        hx, hy = self.body[0]
        return hx + dx, hy + dy

    def senses(self):
        """What the fly sees, as left/right drive in [0, 1]. Head-centred."""
        hx, hy = self.body[0]
        fx, fy = self.food[0] - hx, self.food[1] - hy
        dx, dy = DIRS[self.heading]
        ahead = fx * dx + fy * dy
        right = fx * -dy + fy * dx            # screen y points down
        angle = np.arctan2(right, ahead)      # 0 = straight ahead, +pi/2 = right
        dist = np.hypot(fx, fy)
        near = 1.0 / (1.0 + 0.15 * dist)
        # each eye covers its own side plus a little binocular overlap in front
        food_r = near * np.clip(0.5 + angle / np.pi * 1.5, 0, 1)
        food_l = near * np.clip(0.5 - angle / np.pi * 1.5, 0, 1)
        # looming: obstacle about to be hit, seen by the eye on that side
        dl = 1.0 if self.blocked(self.cell_toward(-1)) else 0.0
        dr = 1.0 if self.blocked(self.cell_toward(+1)) else 0.0
        if self.blocked(self.cell_toward(0)):  # wall ahead looms in both eyes
            dl, dr = max(dl, 0.5), max(dr, 0.5)
        return dict(food_left=food_l, food_right=food_r, danger_left=dl, danger_right=dr)

    def step(self, turn):
        self.heading = (self.heading + turn) % 4
        nxt = self.cell_toward(0)
        if self.blocked(nxt):
            self.alive = False
            return
        self.body.insert(0, nxt)
        if nxt == self.food:
            self.score += 1
            self.place_food()
        else:
            self.body.pop()


def brain_step(brain, neurons, senses):
    stim = {}
    for key, level in senses.items():
        if level > 0:
            stim.setdefault(MAX_RATE * level, []).append(neurons[key])
    stim = {r: np.concatenate(ix) for r, ix in stim.items()}
    # let activity from the previous move fade and the new input propagate first
    counts = brain.run(STEP_MS - READ_MS, stim)
    late = brain.run(READ_MS, stim)
    counts += late
    hz = late / (READ_MS / 1000)
    left = hz[neurons["steer_left"]].sum()
    right = hz[neurons["steer_right"]].sum()
    if right - left > TURN_THRESHOLD:
        turn = +1
    elif left - right > TURN_THRESHOLD:
        turn = -1
    else:
        turn = 0
    return turn, left, right, counts


def draw(snake, senses, left, right, counts, pos, hist, moves):
    fig = plt.figure(figsize=(11, 5), dpi=80, facecolor="#111")
    gs = fig.add_gridspec(2, 2, width_ratios=[1, 1.35], height_ratios=[4, 1])
    ax = fig.add_subplot(gs[:, 0])
    ax.set_facecolor("#1b1b1b")
    ax.set_xlim(-0.5, GRID - 0.5); ax.set_ylim(GRID - 0.5, -0.5)
    ax.set_xticks([]); ax.set_yticks([]); ax.set_aspect("equal")
    for s in ax.spines.values():
        s.set_color("#666")
    bx, by = zip(*snake.body)
    ax.scatter(bx[1:], by[1:], s=260, marker="s", c="#5ab552")
    ax.scatter(bx[:1], by[:1], s=320, marker="s", c="#b6f2a8")
    ax.scatter([snake.food[0]], [snake.food[1]], s=260, c="#f2c14e", marker="o")
    ax.set_title(f"score {snake.score}   move {moves}", color="w", fontsize=13)

    bx_ = fig.add_subplot(gs[0, 1])
    bx_.set_facecolor("#111")
    ok = ~np.isnan(pos[:, 0])
    bx_.scatter(pos[ok, 0], pos[ok, 1], s=0.2, c="#333", rasterized=True)
    act = ok & (counts > 0)
    bx_.scatter(pos[act, 0], pos[act, 1], s=2 + 3 * np.minimum(counts[act], 10),
                c=np.minimum(counts[act], 10), cmap="inferno", vmin=0, vmax=10, rasterized=True)
    bx_.invert_yaxis(); bx_.set_aspect("equal"); bx_.axis("off")
    bx_.set_title(f"fly brain: {act.sum():,} of {len(pos):,} neurons spiking (front view)",
                  color="w", fontsize=11)

    cx = fig.add_subplot(gs[1, 1])
    cx.set_facecolor("#111")
    labels = ["see food L", "see food R", "looming L", "looming R", "steer L", "steer R"]
    vals = [senses["food_left"] * MAX_RATE, senses["food_right"] * MAX_RATE,
            senses["danger_left"] * MAX_RATE, senses["danger_right"] * MAX_RATE, left, right]
    cols = ["#f2c14e", "#f2c14e", "#e05d5d", "#e05d5d", "#6fb7ff", "#6fb7ff"]
    cx.barh(labels[::-1], vals[::-1], color=cols[::-1])
    cx.set_xlim(0, max(MAX_RATE, max(vals) * 1.1))
    cx.tick_params(colors="w", labelsize=8)
    for s in cx.spines.values():
        s.set_color("#444")
    cx.set_xlabel("Hz", color="w", fontsize=8)
    fig.tight_layout()
    fig.canvas.draw()
    img = np.asarray(fig.canvas.buffer_rgba())[..., :3].copy()
    plt.close(fig)
    return img


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(HERE / "data"))
    ap.add_argument("--moves", type=int, default=200)
    ap.add_argument("--seed", type=int, default=1)
    ap.add_argument("--out", default=str(HERE / "results"))
    ap.add_argument("--no-gif", action="store_true")
    args = ap.parse_args()

    data = Path(args.data)
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    brain = FlyBrain(data / "Drosophila_brain_model", seed=args.seed)
    neurons, pos = load_neurons(
        brain, data / "flywire_annotations/supplemental_files/Supplemental_file1_neuron_annotations.tsv")
    print({k: len(v) for k, v in neurons.items()})

    rng = np.random.default_rng(args.seed)
    snake = Snake(rng)
    frames, log = [], []
    for move in range(args.moves):
        senses = snake.senses()
        turn, left, right, counts = brain_step(brain, neurons, senses)
        log.append(dict(move=move, score=snake.score, turn=turn, steer_left=float(left),
                        steer_right=float(right), active=int((counts > 0).sum()),
                        **{k: float(v) for k, v in senses.items()}))
        if not args.no_gif:
            frames.append(draw(snake, senses, left, right, counts, pos, log, move))
        print(f"move {move:3d} score {snake.score} steer L={left:6.1f} R={right:6.1f} "
              f"-> {'LSR'[turn + 1]}", flush=True)
        snake.step(turn)
        if not snake.alive:
            print("crashed")
            break
    print(f"final score {snake.score} after {len(log)} moves")
    (out / f"log_seed{args.seed}.json").write_text(json.dumps(log, indent=1))
    if frames:
        imageio.mimsave(out / f"snake_seed{args.seed}.gif", frames, duration=0.25, loop=0)


if __name__ == "__main__":
    main()
