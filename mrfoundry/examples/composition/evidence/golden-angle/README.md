# Golden-angle radial spoiled GRE — simulation prototype

## Design

- PyPulseq 1.5.0.post1; 2D slice-selective GRE, 220 mm FOV, 64 ADC samples per spoke (3.4375 mm nominal resolution), 5 mm slice, 10° flip.
- TE/TR = 5/15 ms; 128 acquired full spokes; 111.24611797° increment modulo 180°.
- 200 dummy excitations; 117° RF-spoiling increment with matched ADC phase; rotated in-plane spoiler and four cycles of z-spoiler phase across the nominal slice.
- 40 µs ADC dwell; sample index 32 lands at k-space center. Total duration 4.92 s (1.92 s acquired).
- Assumed per-axis limits: 32 mT/m and 130 T/m/s. Measured peaks, trajectory checks and export/readback checks are in `design_report.json`.

## Established tools only

`design_sequence.py` configures PyPulseq RF/gradient/ADC events and uses its timing, trajectory and Pulseq writer/reader APIs. `simulate_koma.py` runs the official KomaMRI EPI example first, then imports the exported sequence and performs full-train Bloch simulation in KomaMRI through its official Python interface. There is no custom Bloch solver or ideal-spoiling signal substitute in these delivered scripts.

The simulation uses KomaMRI's built-in brain phantom, coarsened in plane (ss=16) and replicated at 33 z positions over −4 to +4 mm. The simulator executes finite RF pulses, relaxation, default phantom off-resonance and applied gradients across dummy and acquired TRs. A second run halves the RF step from 10 to 5 µs. This checks temporal sensitivity, not spatial convergence of this coarse phantom.

## Reproduce

Python 3.12 was used. From this directory:

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.lock.txt
.venv/bin/python design_sequence.py
PYTHON_JULIACALL_HANDLE_SIGNALS=yes JULIA_NUM_THREADS=4 .venv/bin/python simulate_koma.py
```

The first KomaMRI use downloads Julia and compiles its dependencies. `requirements.lock.txt` records the tested Python packages; the Python interface specifies its Julia package dependencies. Logs and reports distinguish setup, upstream smoke testing and sequence simulation.

## Files

- `golden_angle_radial_gre.seq`: exported Pulseq sequence, marked simulation-only.
- `trajectory.npz`: PyPulseq-integrated ADC trajectory (cycles/m), timestamps and spoke angles.
- `koma_signal.npz`: complex KomaMRI ADC data, finer/coarser RF-step results and phantom properties.
- `design_report.json`, `koma_report.json`: checks and limitations.
- `koma_summary.png`: phantom, trajectory and simulated signal.

This is not a scanner-ready protocol. No PNS, SAR, gradient heating, vendor-interpreter validation, spatial-convergence study, receive-array model, gradient-delay or eddy-current model is included. No real scanner or patient data was used.

## Upstream references

- PyPulseq radial GRE example: https://github.com/pulseq/pypulseq/blob/master/examples/scripts/write_radial_gre.py
- KomaMRI: https://github.com/JuliaHealth/KomaMRI.jl
- Official Python interface and examples: https://github.com/JuliaHealth/komamripy

## Reconstruction

Run `python reconstruct_sigpy.py` in the same environment (SigPy 0.1.27).
The script consumes the saved KomaMRI complex data and PyPulseq trajectory,
converts cycles/m to SigPy coordinates as `(ky,kx)*0.220`, and uses a single
uniform receive channel. KomaMRI already compensates ADC phase.

Outputs: reconstruction.npz (complex image, gridding, trajectory, weights and
residual), reconstruction.png/PDF, reconstruction_report.json. Pipe–Menon
density compensation and the NUFFT/CG solver are from SigPy. L2 lambda=0.1
was chosen to stabilize this prototype, not optimized against ground truth.
The normalized signal residual is 6.82%, versus 10.28% for scaled gridding.
An additional 100 iterations did not change the converged regularized image.

The upstream SenseRecon test passed. A same-trajectory Shepp–Logan check had
0.066% data residual but 24.24% image error after 100 unregularized iterations:
this check does NOT certify image fidelity. The coarse point-spin simulation
produces a visibly sparse image; spatial convergence and model mismatch remain
unresolved. No noise was added and no SNR or g-factor has been measured.
