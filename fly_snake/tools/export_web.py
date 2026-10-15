"""Export the game's active sub-network of the FlyWire brain for the browser page.

Keeps every neuron that spiked in the full-model screens/games (tools/active_set.py,
tools/game_active.py) plus the sensor and steering neurons, and writes
web/network.json with CSR connectivity encoded as base64 typed arrays.
"""
import base64
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from brain import FlyBrain  # noqa: E402
from snake import load_neurons  # noqa: E402

data = ROOT / "data"
annot_path = data / "flywire_annotations/supplemental_files/Supplemental_file1_neuron_annotations.tsv"
brain = FlyBrain(data / "Drosophila_brain_model")
neurons, pos = load_neurons(brain, annot_path)

keep_ids = set()
for f in (ROOT / "tools").glob("*active*.npy"):
    keep_ids |= set(np.load(f).tolist())
keep = np.array(sorted(brain.id2i[i] for i in keep_ids), dtype=np.int64)
for ix in neurons.values():
    keep = np.union1d(keep, ix)
remap = -np.ones(brain.n, np.int64)
remap[keep] = np.arange(len(keep))

con = pd.read_parquet(data / "Drosophila_brain_model/Connectivity_783.parquet")
pre, post = remap[con.Presynaptic_Index.to_numpy()], remap[con.Postsynaptic_Index.to_numpy()]
m = (pre >= 0) & (post >= 0)
pre, post = pre[m], post[m]
syn = con["Excitatory x Connectivity"].to_numpy()[m]
order = np.lexsort((post, pre))
pre, post, syn = pre[order], post[order], syn[order]
indptr = np.zeros(len(keep) + 1, np.int32)
np.add.at(indptr, pre + 1, 1)
indptr = np.cumsum(indptr).astype(np.int32)
assert len(keep) < 65536 and np.abs(syn).max() < 32768

ok = ~np.isnan(pos[:, 0])
lo, hi = pos[ok].min(0), pos[ok].max(0)


def norm(p):
    return np.round((p - lo) / (hi - lo) * 1000).astype(np.int32).tolist()


rng = np.random.default_rng(0)
bg = rng.choice(np.flatnonzero(ok), 9000, replace=False)
a = pd.read_csv(annot_path, sep="\t", low_memory=False).set_index("root_id")
types = a.reindex(brain.ids[keep]).cell_type.fillna("").tolist()
sub_pos = pos[keep]
sub_pos[np.isnan(sub_pos[:, 0])] = (lo + hi) / 2

b64 = lambda arr: base64.b64encode(arr.tobytes()).decode()  # noqa: E731
out = dict(
    n=int(len(keep)),
    n_full=int(brain.n),
    nsyn=int(len(syn)),
    indptr=b64(indptr),
    post=b64(post.astype(np.uint16)),
    syn=b64(syn.astype(np.int16)),
    groups={k: remap[v].tolist() for k, v in neurons.items()},
    pos=norm(sub_pos),
    bg=norm(pos[bg]),
    types=types,
)
(ROOT / "web").mkdir(exist_ok=True)
(ROOT / "web/network.json").write_text(json.dumps(out, separators=(",", ":")))
print("neurons", len(keep), "synapse pairs", len(syn),
      "MB", round((ROOT / "web/network.json").stat().st_size / 1e6, 2))
