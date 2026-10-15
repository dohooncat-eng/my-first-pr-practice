"""Whole-brain leaky integrate-and-fire model of the adult fruit fly (FlyWire v783).

Same equations and parameters as Shiu et al. 2024 (Nature),
https://github.com/philshiu/Drosophila_brain_model , re-implemented in numpy
with exact exponential integration so it runs fast enough to drive a game.
"""
from pathlib import Path

import numpy as np
import pandas as pd
import scipy.sparse as sp

# Shiu et al. parameters (mV, ms)
V_0, V_RST, V_TH = -52.0, -52.0, -45.0
T_MBR, TAU = 20.0, 5.0
T_RFC, T_DLY = 2.2, 1.8
W_SYN = 0.275
F_POI = 250  # Poisson kick = W_SYN * F_POI = 68.75 mV -> always spikes


class FlyBrain:
    def __init__(self, data_dir, dt=0.1, seed=0):
        data_dir = Path(data_dir)
        comp = pd.read_csv(data_dir / "Completeness_783.csv", index_col=0)
        con = pd.read_parquet(data_dir / "Connectivity_783.parquet")
        self.ids = comp.index.to_numpy()
        self.id2i = {fid: i for i, fid in enumerate(self.ids)}
        n = self.n = len(self.ids)
        # row = presynaptic neuron, so W[spiking_rows].sum(0) is the input to every neuron
        self.W = sp.csr_matrix(
            (con["Excitatory x Connectivity"].to_numpy(np.float32) * W_SYN,
             (con["Presynaptic_Index"].to_numpy(), con["Postsynaptic_Index"].to_numpy())),
            shape=(n, n),
        )
        self.dt = dt
        self.decay_v = np.exp(-dt / T_MBR)
        self.decay_g = np.exp(-dt / TAU)
        self.g_to_v = TAU / (TAU - T_MBR) * (self.decay_g - self.decay_v)
        self.n_rfc = int(round(T_RFC / dt))
        self.n_dly = int(round(T_DLY / dt))
        self.rng = np.random.default_rng(seed)
        self.reset()

    def idx(self, flywire_ids):
        return np.array([self.id2i[f] for f in flywire_ids if f in self.id2i], dtype=np.int64)

    def reset(self):
        self.v = np.full(self.n, V_0, np.float32)
        self.g = np.zeros(self.n, np.float32)
        self.rfc = np.zeros(self.n, np.int32)  # remaining refractory steps
        self.pending = [np.zeros(0, np.int64) for _ in range(self.n_dly)]  # delayed spikes
        self.step_i = 0

    def run(self, ms, stim=None):
        """Simulate `ms` milliseconds.

        stim: dict {rate_hz: neuron indices} of Poisson-driven input neurons.
        Returns spike counts per neuron during this window.
        """
        stim = stim or {}
        counts = np.zeros(self.n, np.int32)
        for _ in range(int(round(ms / self.dt))):
            # synaptic input from spikes emitted T_DLY ago
            arrived = self.pending[self.step_i % self.n_dly]
            if arrived.size:
                self.g += np.asarray(self.W[arrived].sum(0)).ravel()
            # refractory neurons are frozen (Brian2 "unless refractory")
            frozen = self.rfc > 0
            v_new = V_0 + (self.v - V_0) * self.decay_v + self.g * self.g_to_v
            g_new = self.g * self.decay_g
            self.v = np.where(frozen, self.v, v_new)
            self.g = np.where(frozen, self.g, g_new)
            self.rfc[frozen] -= 1
            # Poisson input neurons (no refractory period, as in Shiu et al.)
            for rate, ix in stim.items():
                if rate > 0 and len(ix):
                    hit = ix[self.rng.random(len(ix)) < rate * self.dt * 1e-3]
                    self.v[hit] += W_SYN * F_POI
                    self.rfc[hit] = 0
            spk = np.flatnonzero(self.v > V_TH)
            self.v[spk] = V_RST
            self.g[spk] = 0
            self.rfc[spk] = self.n_rfc
            for rate, ix in stim.items():
                self.rfc[ix] = 0
            counts[spk] += 1
            self.pending[self.step_i % self.n_dly] = spk
            self.step_i += 1
        return counts
