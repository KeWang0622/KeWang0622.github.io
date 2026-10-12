# Evidence for the workflow demonstration

The workflow is mapped retrospectively to current MRFoundry skills. Historical artifacts establish that these scientific operations occurred; complete historical skill-read/model traces were not logged. `recorded-case.md` gives the original case scope. `original-evidence-map.json` preserves source hashes and original relative paths (those paths refer to the original manuscript archive, not this public folder).

## Recorded golden-angle run

- [Design source](golden-angle/design_sequence.py), [actual Pulseq sequence](golden-angle/golden_angle_radial_gre.seq), [design checks](golden-angle/design_report.json), [actual waveform and trajectory points](golden-angle/waveforms.json).
- [KomaMRI driver](golden-angle/simulate_koma.py), [simulator checks](golden-angle/koma_report.json), [displayed first-spoke complex signal](golden-angle/signal-first-spoke.json).
- [SigPy reconstruction](golden-angle/reconstruct_sigpy.py), [initial report](golden-angle/reconstruction_report.json).
- [Refinement and limits](golden-angle/dense/README.md), [scoped result](golden-angle/dense/reconstruction_report.json), [independent convention checks](golden-angle/dense/validation.json), [backend check](golden-angle/dense/backend_validation.json).

These are source/report/sequence artifacts, not a self-contained historical data bundle. Original anatomical inputs came from KomaMRI's BrainWeb-based phantom and are not redistributed. The first two grid comparisons (10.10%, 5.48%) and fixed-native-voxel quadrature comparison (1.60%) answer different questions. The narrow pass is not global physical validation. See original script assumptions and upstream terms before reproducing.

## New MRI-word experiment

[Source](fun-mri/source.py), [protocol](fun-mri/README.md), [checks](fun-mri/checks.json), [results](fun-mri/results.json), [one-shot sequence](fun-mri/MRI_1shot.seq), [20-shot sequence](fun-mri/MRI_20shot.seq). This self-contained geometric phantom example is static Fourier/NUFFT, with no Bloch physics or patient data. Both 800-iteration CG runs hit their budget; no convergence claim is made.

## Current guidance and original tools

- [Current instruction snapshots, hashes and mapping scope](guidance/README.md), [source provenance](guidance/guidance-provenance.json).
- [How Codex reads relevant skills](https://learn.chatgpt.com/docs/build-skills): skills provide metadata before full instructions are loaded when selected.
- [MRFoundry README](https://github.com/KeWang0622/MRFoundry): install and usage verified 2026-10-12.
- [Sequence-design skill](https://github.com/KeWang0622/MRFoundry/blob/main/skills/pulse-sequence-design/SKILL.md).
- [Reconstruction skill](https://github.com/KeWang0622/MRFoundry/blob/main/skills/mri-reconstruction/SKILL.md).
- [Research workflow](https://github.com/KeWang0622/MRFoundry/blob/main/skills/mri-research-workflow/SKILL.md).
- [Project memory](https://github.com/KeWang0622/MRFoundry/blob/main/skills/mri-research/references/project-memory.md).
- [Pulseq, Layton et al.](https://doi.org/10.1002/mrm.26235), [PyPulseq](https://github.com/pulseq/pypulseq), [KomaMRI](https://github.com/JuliaHealth/KomaMRI.jl), [komamripy](https://github.com/JuliaHealth/komamripy), [SigPy](https://github.com/mikgroup/sigpy), [Shepp and Logan](https://doi.org/10.1109/TNS.1974.6499235).

Skills supply guidance and references; agents reason and execute; established scientific tools compute the results. This presentation is not a controlled demonstration of superiority over agents without skills.
