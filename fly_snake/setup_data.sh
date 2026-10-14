#!/usr/bin/env bash
# Download the FlyWire v783 connectome (Shiu et al. model files) and neuron annotations.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p data
[ -d data/Drosophila_brain_model ] || git clone --depth 1 https://github.com/philshiu/Drosophila_brain_model data/Drosophila_brain_model
[ -d data/flywire_annotations ] || git clone --depth 1 https://github.com/flyconnectome/flywire_annotations data/flywire_annotations
pip install -r requirements.txt
