# Animated trainer provenance

The human mesh, skinning, clothing palette and animation clips are by **Quaternius**,
from **Animated Human Low Poly** (3 November 2017), released under **CC0 1.0**.

- Creator upload: https://opengameart.org/content/animated-human-low-poly
- Original archive: https://opengameart.org/sites/default/files/Animated%20Human%20by%20%40Quaternius_0.zip
- Creator: https://quaternius.com/
- License: https://creativecommons.org/publicdomain/zero/1.0/
- Original license text is preserved in `QUATERNIUS-TRAINER-LICENSE.txt`.
- Downloaded and inspected: 23 October 2026.
- Original FBX SHA-256: `edd4fde3a73afe2a22ddb5a10a215373a0880d9a4ee32a0815879a260b8e8445`.

`trainer.glb` retains the original rig and the `Idle`, `Walk`, `Run`, and `Jump`
animation clips. The portrait-inspired adaptation uses the public photo
[`assets/img/kw_ws.jpg`](../../../assets/img/kw_ws.jpg), with the subject's permission,
as visual reference: short black hair, thin rectangular glasses, a blue cable-knit
sweater with white collar, black trousers, a black watch, and understated sneakers.
The result is a stylized 3D likeness; the photograph is not used as a face texture.
There is no hat or backpack.

Original glasses, collar, cuffs, knit details, watch, hair accents, and sneaker
geometry were modeled in Blender and attached to the source skeleton. The original
skin weights and motion clips are retained, with modest head and sleeve proportion
adjustments and new materials. All materials are self-contained; no external
textures or image dependencies are required. Export uses glTF's four primary skin
weights per vertex, normalized by Blender.

Converted in Blender 5.2.3 LTS, with embedded script execution disabled. The character
is Y-up and stands 1.8 m tall in its idle reference pose, with its base at Y=0.
Its face points approximately 60 degrees clockwise from +Z; the renderer applies
`-Math.PI / 3` to the visual model container, independently of navigation heading.
The root orientation is retained across the portrait adaptation. Glasses, collar and other accessories use rigid skin weights; cable-knit details
interpolate the underlying torso skin weights. Shared detail geometry is consolidated
into one skinned mesh to keep draw calls modest. Idle, Walk,
Run and Jump were reimported and rendered to check the result.

The web deployment ships the optimized, self-contained `trainer.glb`. The
editable Blender scene and authoring script are maintained separately from the
published website assets.
