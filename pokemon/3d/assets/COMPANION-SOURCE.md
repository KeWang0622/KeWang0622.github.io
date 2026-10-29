# MRFoundry MRI Scout

Original Blender geometry, authored for Ke Wang’s MRFoundry portfolio.
The 2026-10-29 revision replaces the shallow annular shell with a long MRI magnet,
a continuous open bore, axial illumination strips and an integrated patient table.
The friendly face, cream/blue palette, height and +Z front convention are retained.
No third-party mesh or texture is used.

Rebuild with Blender 5.2.3:

```sh
MRFOUNDRY_ART_OUTPUT=/absolute/preview/folder Blender --background --python tools/art/build-mri-companion.py
```

The script writes `pokemon/3d/assets/companion.glb`; the output folder contains
the editable `.blend`, preview PNG and geometry report. The game and backpack use
the same GLB. The scanner in the MRFoundry room is an open extruded annular mesh
in `interiors.js`, using the same deep-bore design.

The gable emblem is a scaled runtime clone of this same model.
`tools/art/remove-legacy-scanner-badge.py` removes only the superseded badge's
3,484 triangles from the previously baked workshop. It appends new index views;
all original vertex/normal/AO data, materials and transforms stay intact.

The current room cards and `world-teaser.webp` are browser captures of this
updated geometry, not generated architecture. The existing gameplay, motion,
collision envelopes and camera behavior are unchanged.
