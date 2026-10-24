# Authored building contact shading

The `arrival.glb` and `adobe-lab.glb` buildings retain their original authored
geometry and materials. A light ambient-occlusion layer was baked with the
official portable Blender 5.2.3 LTS on 2026-10-24 to add depth beneath eaves,
around trim and between roof tiles.

- Source assets: these files from website commit
  `755f95b61361176750b8cd411639370b039a6bf6`, before vertex shading was added.
- Source script: [`tools/art/bake-village-ao.py`](../../../../tools/art/bake-village-ao.py).
- Engine: Cycles CPU, 32 samples, Ambient Occlusion shader through Emission,
  0.8 m sample distance, all building meshes included as occluders.
- Storage: corner bake averaged onto each existing source vertex, linear value
  remapped as `0.65 + 0.35 × AO`, then stored in normalized 8-bit RGBA `COLOR_0`.
  The alpha channel is always 1. No gamma transform is applied to vertex colors.
- Blender is used only for baking. The script appends color data to the original
  GLB instead of re-exporting it: original buffers, quantized geometry, indices,
  normals, node transforms, material factors, object names and text are preserved.
- No textures, models or third-party assets were downloaded for this treatment.

## Reproduce

Run from the website repository, using fresh files from the source commit above:

```sh
git show 755f95b61361176750b8cd411639370b039a6bf6:pokemon/3d/assets/arrival.glb > /tmp/arrival-original.glb
../website-art-tools/blender --background --factory-startup --python-exit-code 1 \
  --python tools/art/bake-village-ao.py -- \
  --input /tmp/arrival-original.glb --output /tmp/arrival-baked.glb \
  --report /tmp/arrival-ao-report.json
```

Repeat for `adobe-lab.glb`. Review the temporary asset before replacing the site
asset. The script rejects an already baked input so that shading cannot compound.

## Verification

Both assets were loaded through the site's actual Three.js `GLTFLoader` before
and after baking. Position, normal and index arrays; material color, roughness
and metalness; world matrices; mesh counts; and world bounds are identical.
Every resulting mesh has an active normalized vertex-color attribute. The baker
also verifies the original binary prefix byte-for-byte and checks that the only
JSON changes are added color accessors, buffer views and the buffer length.

| Asset | Meshes / vertices, before and after | Original size | Baked size |
| --- | ---: | ---: | ---: |
| arrival.glb | 21 / 77,240 | 2,047,176 bytes | 2,359,588 bytes |
| adobe-lab.glb | 21 / 89,555 | 2,369,676 bytes | 2,731,348 bytes |

This is static local cavity shading, not global illumination. Existing real-time
sun/tree shadows are retained. Vertex baking cannot resolve detail between widely
spaced vertices; it is deliberately bounded so broad wall faces remain readable.
