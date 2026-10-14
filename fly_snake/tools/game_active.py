"""Union of neurons that spike during full-model Snake games (continuous brain state)."""
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from brain import FlyBrain  # noqa: E402
from snake import Snake, brain_step, load_neurons  # noqa: E402

seed = int(sys.argv[1])
data = Path(__file__).resolve().parents[1] / "data"
brain = FlyBrain(data / "Drosophila_brain_model", seed=seed)
neurons, _ = load_neurons(
    brain, data / "flywire_annotations/supplemental_files/Supplemental_file1_neuron_annotations.tsv")
seen = np.zeros(brain.n, np.int64)
moves = 0
rng = np.random.default_rng(seed)
while moves < 80:
    snake = Snake(rng)
    while snake.alive and moves < 80:
        turn, l, r, c = brain_step(brain, neurons, snake.senses())
        seen += c
        snake.step(turn)
        moves += 1
    print(seed, "moves", moves, "union", (seen > 0).sum(), flush=True)
np.save(Path(__file__).with_name(f"game_active_{seed}.npy"), brain.ids[seen > 0])
