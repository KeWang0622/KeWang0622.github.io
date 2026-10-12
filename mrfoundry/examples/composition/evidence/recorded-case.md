# Recorded sequence-to-image research loop

This is an artifact-linked, retrospective case from September 23, 2026. It is not
a complete agent transcript and is not a baseline evaluation of a frozen skill
release. The current manuscript was reorganized around the case on October 7.

The user requested golden-angle radial GRE design and simulation, approved
prototype defaults, requested reconstruction, rejected the initial image quality,
and required use of established scientific tools. The recorded correction used
PyPulseq, KomaMRI and SigPy. It changed phantom sampling and reconstruction
assumptions, checked conventions and backend consistency, retained two failed
refinement comparisons and passed a limited fixed-map quadrature criterion.

`evidence.json` paths resolve from the manuscript-bundle root, one directory above
this folder. They link the original outputs in `../golden-angle-gre/`, not copies
of reconstructed or enhanced images. Checksums make the source of each main
scientific panel verifiable. The manuscript records the distinction between
anatomical sampling and within-native-voxel quadrature.

Display conventions: simulation x/y; array origin at lower left; nearest-neighbor
image display. Initial and final images have separate percentile-based windows;
their comparison is illustrative, not a controlled ablation or accuracy ranking.
Complete model settings, skill-retrieval traces and token costs were not logged.

Rebuild publication figures with `render_agent_figures.py` from the bundle root.
The original numerical reproduction commands are in the experiment READMEs.
