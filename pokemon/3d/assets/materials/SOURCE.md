# Meadow ground material

`meadow-painted-v1.png` is an original image generated on 2026-10-23 with the built-in OpenAI image-generation tool for this portfolio. No game textures or third-party reference images were supplied. It is a subtle ground-albedo layer beneath the original instanced meadow geometry; terrain colours, light, shadows and all motion are rendered live.

## Generation prompt

Use case: stylized-concept.
Asset type: seamless tileable square albedo texture for the grassy ground of an actual real-time 3D adventure game.
Primary request: an original refined hand-painted temperate meadow ground texture, inspired by the natural gouache art direction of open-air adventure games.
Composition: perfectly orthographic top-down flat material, edge-to-edge surface, no horizon, no objects, no trees, no individual flowers, no perspective.
Materials: softly interleaved sage and spring-olive mossy grass patches, fine understated short grass strokes, irregular rounded brushwork, subtle warm ochre-green dry patches; large calm shapes with small delicately painted details.
Palette: restrained fresh spring greens, subtle jade undertones and warm green highlights. Medium-light overall, low contrast, not dark forest, not fluorescent, no blue blobs.
Lighting: completely even diffuse light, no baked shadows, no directional shading or vignette. No border, text, watermark, grid. The four edges should tile seamlessly. Beautiful polished game material, not a photographed lawn and not a decorative illustration.

## Runtime treatment

The original PNG is served locally, decoded as sRGB and sampled in world space at an 8 m repeat. Its luminance modulates the terrain by a limited amount; it does not replace terrain geometry, lighting or navigation. Fine procedural detail and coherent pigment washes sit beneath it. A separate shader animates the original grass and flower geometry with a shared, pausable wind clock.
