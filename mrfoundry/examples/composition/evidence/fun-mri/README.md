# A fun MRI sequence

This experiment writes exactly three letters, **MRI**, in acquired k-space. M has four strokes, R six, and I three. Acquisition is off during repositioning. Each stroke contains 100 samples at 10 µs dwell, for 1,300 samples per word.

`source.py` designs the sequence with PyPulseq, exports and re-imports the `.seq` files, runs timing and per-axis gradient/slew checks, and obtains the actual ADC trajectory. It then uses SigPy's established NUFFT and conjugate-gradient solver to reconstruct a 64 × 64 Shepp–Logan synthetic phantom at those coordinates. Twenty shots rotate the complete word using a golden-angle increment. Original MIKI outputs are preserved elsewhere and are not input data for this run.

## Reproduce

Use an isolated Python environment, install `requirements.txt`, then run:

```sh
python source.py
```

The source fixes the settings before reconstruction: a single unit-sensitivity coil, noiseless static data, unregularized least squares, 800 CG iterations, tolerance 1e-8. Both cases use the same absolute magnitude display window (0–1), without fitted intensity scaling. Numerical arrays and objective histories are retained; iteration-limit termination is explicitly reported.

## Outputs

- `MRI_1shot.seq`, `MRI_20shot.seq`: exported sequence definitions.
- `trajectory_1shot.npz`, `trajectory_20shot.npz`: actual exported ADC coordinates in cycles/m and acquisition times.
- `trajectory.json`, `trajectory.png`: the three-letter geometry for visualization.
- `sequence.png`: RF and gradient diagram; recovery delay omitted.
- `reference.png`, `reconstruction_1shot.png`, `reconstruction_20shot.png`: separate lossless images with matching windows.
- `comparison.png`: reference and reconstruction comparison.
- `recon_1shot.npz`, `recon_20shot.npz`: complex images, synthetic signals, and SigPy coordinates.
- `checks.json`, `results.json`: numerical checks, scope, metrics, versions, and source hash.

## Scope

This is a fun geometry and reconstruction demonstration, not a clinically useful acquisition or a proposed reconstruction method. The simulation uses a static Fourier/NUFFT model; it is **not** a Bloch simulation or a scanner measurement. There is no relaxation, noise, motion, off-resonance, or hardware-response model. The same discrete operator generates and inverts the data, so this is not an independent validation of the forward model. Twenty shots take twenty times the sequence time; this is not an equal-time comparison. Low data residual alone does not establish faithful image recovery.

PyPulseq timing and per-axis gradient/slew checks do not establish scanner safety: PNS, SAR, and scanner-specific approval were not evaluated.

Methods/software: [Pulseq, Layton et al.](https://doi.org/10.1002/mrm.26235), [PyPulseq](https://github.com/imr-framework/pypulseq), [SigPy](https://github.com/mikgroup/sigpy), [Shepp and Logan](https://doi.org/10.1109/TNS.1974.6499235).

Development note: the first attempt hit PyPulseq's empty-sequence `duration()` edge case before writing a sequence. The source now uses zero elapsed time before the first block; no scientific result was produced by that attempt.
