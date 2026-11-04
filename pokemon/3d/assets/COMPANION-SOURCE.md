# MRFoundry MRI Scout

## Current approved identity — 2026-11-03

The follower, backpack preview and workshop facade use the same owner-approved
transparent MRI mascot as the websites. `../mrfoundry-companion.js` loads
`../../../assets/img/mri-mascot-trimmed.png`, a crop of empty alpha padding only,
and displays it as a camera-facing sprite. The image retains its aspect ratio and
original colors. Following, collision envelopes, deployment and bobbing are
unchanged; the backpack lets this flat character tilt while other models rotate.
Canonical artwork and prompts are documented in `../../../assets/img/mrfoundry-artwork.md`.

The room’s full-size scanner is physical workshop furniture, not the agent avatar,
and remains unchanged. Existing room cards and the world teaser are historical
browser captures; they are not new renders or generated scientific evidence.

## Historical editable geometry — 2026-10-29

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
the editable `.blend`, preview PNG and geometry report. The former game and backpack used
the same GLB; it is retained as editable historical source, not loaded by the current avatar. The scanner in the MRFoundry room is an open extruded annular mesh
in `interiors.js`, using the same deep-bore design.

The former gable emblem was a scaled runtime clone of this same model.
`tools/art/remove-legacy-scanner-badge.py` removes only the superseded badge's
3,484 triangles from the previously baked workshop. It appends new index views;
all original vertex/normal/AO data, materials and transforms stay intact.

The retained room cards and `world-teaser.webp` are browser captures of this
updated geometry, not generated architecture. The existing gameplay, motion,
collision envelopes and camera behavior are unchanged.
