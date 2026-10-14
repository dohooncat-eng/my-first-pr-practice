"""Find every neuron that ever spikes while the brain plays Snake.

In the LIF model a neuron that never spikes has no effect on any other neuron,
so the sub-network of neurons that spike under the game's inputs behaves like
the full 138k-neuron brain for those inputs. Runs the full model over a grid of
food/danger inputs (several seeds) and saves the union of spiking neurons.
"""
import itertools
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from brain import FlyBrain  # noqa: E402
from snake import MAX_RATE, load_neurons  # noqa: E402

data = Path(__file__).resolve().parents[1] / "data"
brain = FlyBrain(data / "Drosophila_brain_model")
neurons, _ = load_neurons(
    brain, data / "flywire_annotations/supplemental_files/Supplemental_file1_neuron_annotations.tsv")
food = [(0, 0), (1, 0), (0, 1), (.5, .5), (.3, .8), (.8, .3)]
danger = [(0, 0), (1, 0), (0, 1), (.5, .5), (1, .5), (.5, 1), (1, 1)]
seen = np.zeros(brain.n, np.int64)
for seed, (f, d) in enumerate(itertools.product(food, danger)):
    brain.rng = np.random.default_rng(seed)
    brain.reset()
    stim = {}
    for key, lvl in [("food_left", f[0]), ("food_right", f[1]), ("danger_left", d[0]), ("danger_right", d[1])]:
        if lvl:
            stim.setdefault(MAX_RATE * lvl, []).append(neurons[key])
    c = brain.run(300, {r: np.concatenate(v) for r, v in stim.items()})
    seen += c
    print(f, d, "active", (c > 0).sum(), "union", (seen > 0).sum(), flush=True)
keep = np.flatnonzero(seen > 0)
for k, ix in neurons.items():
    keep = np.union1d(keep, ix)
np.save(Path(__file__).with_name("active_set.npy"), brain.ids[keep])
sub = brain.W[keep][:, keep]
print("neurons", len(keep), "synapse pairs", sub.nnz)
