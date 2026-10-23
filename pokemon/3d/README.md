# Ke’s Pokémon World — 3D edition

A static, locally hosted Three.js portfolio. Career text and all seven destinations
come from `../data.js`; the renderer does not invent biographical facts.

## Files

- `index.html`, `style.css`: responsive full-screen scene, identity, field guide and dialogs.
- `interface.js`: accessible portfolio content, links, session-only discovery state and focus handling.
- `world.js`: terrain, water, asset loading, instanced foliage, lighting, ray picking,
  A* walking, animation and the follow/orbit/map camera.
- `ground.js`: batched paving, gravel paths, stone edges and planted arrival beds.
- `details.js`: material-batched benches, bicycle, drainage, compass and bridge-side reeds.
- `outdoor-extension.js`: connected walking trails, a third river bridge, and
  the Riverside Lookout, Pine Grove, Hilltop Terrace and Waterlily Pond scenic stops.
- `ambient-audio.js`: optional, locally served music with gentle fades and hidden-tab pause.
- `camera-companion.js`: the original modeled camera companion, with independent resources per instance.
- `companion-models.js`: original Macintosh, optical-prism and music companions.
- `companion-catalog.js`, `companion-preview.js`: the five-companion inventory and
  on-demand, rotatable 3D previews; thumbnails come from the actual scene models.
- `landmarks.js`: the smaller secondary destinations.
- `interiors.js`: seven furnished, walkable cutaway rooms, collision bounds and clickable displays.
- `exhibits.js`: the photographs, research figures and project links shown in those rooms.
- `assets/`: authored Blender buildings and scanner companion, a photo-inspired
  adaptation of a rigged CC0 trainer,
  and nine curated CC0 Quaternius foliage models. Models have embedded materials and textures.
- `lib/`: pinned Three.js 0.186.0 and official addons. Package imports are made relative
  for native browser loading; upstream MIT license and npm integrity record are retained.

There is no runtime CDN, analytics or account requirement. The scene uses the existing
portrait and favicon from `/assets/img/`. See `credits.html` and asset licenses for provenance.
The parent Jekyll build copies this route; no additional game bundler is needed.

## Interaction

Click or tap a landmark to walk to its door and enter. Each destination opens a
different room: a scanner workshop, research lab, creative studio, reading room,
garden studio, imaging observatory or summer camp. The MRI companion follows in
both the village and the rooms. Select a framed image to walk over and inspect the
complete photograph or project figure, with its caption and original link.

The exterior spans 128 world units across. Four scenic destinations extend the seven
research rooms with a riverside viewing deck, a pine-grove picnic clearing,
a hilltop terrace and a planted waterlily pond. Select a scenic label on the map to walk there.

Click open ground to wander. Drag to orbit, scroll/pinch or use +/− to zoom. Focus
the canvas for WASD / arrow movement. Walk through a doorway to enter or leave;
the camera follows the trainer. E or Enter opens a nearby exhibit. Village is an
optional shortcut outside. Map shows the larger village,
and Home base returns to the workshop court. **B** opens the companion backpack:
choose MRI Scout, Camera Buddy, Mac, Prism or Tempo. Drag a preview to turn it,
then take that companion along or put it away. The party row shows who is walking
with you; select a party member to recall it. Take everyone deploys all five, and
Let’s go returns keyboard focus to the village. They follow the traveled path in
a line, turn along that path, and join you in every room. Room entrances seed a
collision-checked curved queue so the complete party fits around the furniture.
Only MRI Scout follows on a fresh visit; the other companions start in the backpack.
Door crossings include a transition guard and a leave-the-door-region latch to
prevent an exit from immediately reopening the same room. Exhibits still open
only when selected, so walking around does not interrupt exploration.
**J** opens the field journal, with room previews, discovery filters, direct stories
and walking shortcuts. Exhibit windows offer previous/next arrows and thumbnails;
left/right keys browse the current room's collection. The HTML field guide opens every
chapter and image directly, without requiring gameplay.

Music starts only after selecting its control; it loads on demand, plays quietly,
and pauses when the tab is hidden. Credits and the track license are included.

Pause motion stops the ambient wind, water and idle animations. Reduced-motion devices
start with ambient animation paused. Rendering pauses in hidden tabs and when the scene
is offscreen. The same portfolio notes remain available if WebGL is unavailable.

## Verification

Serve the repository root over HTTP, then open `/pokemon/3d/`. `file://` does not support
these browser ES-module imports. A normal Jekyll build can be served the same way.

Checked in installed Chrome on 2026-10-23:

- All seven automatic walking routes reached and entered the correct room.
- Each room's first wall display was clicked, approached and opened; Village
  returned the trainer and MRI companion to the original exterior entrance.
- All 16 exhibit records have complete captions, credits, image paths and links.
- Full-image and nested chapter galleries restore focus correctly on closing.
- The real Jekyll production output loaded every module/model with no JavaScript
  errors or failed HTTP requests; there are no external network dependencies.
- All seven direct HTML notes opened and closed with Escape.
- Ambient pause, Map/Explore, and 390px mobile layout worked; no horizontal overflow.
- Reduced-motion starts paused; with WebGL disabled, the fallback and HTML notes remain usable.
- Desktop room, village and 390px mobile room/photo screenshots were inspected.

The public route is `/pokemon/3d/`. The homepage entrance uses a small static
scene preview; the 3D engine and models load only after a visitor enters the world.

Control calibration uses the visible face of the animated model, not its feet or
the direction claimed in metadata. Screen-direction movement is solved from the
camera projection at the actor's current position. Followers sample arc-length
history rather than interpolating toward a lateral offset.

The trainer is styled from Ke’s portfolio photograph: black hair, rectangular
glasses, a blue cable-knit sweater with white collar, black trousers and a watch.
The red cap is removed. The exported Idle/Walk/Run/Jump clips were round-trip
checked in Blender and the Idle/Walk states inspected in the browser. The rig’s
existing −60° visual-facing calibration is retained.

The 3D scene requires WebGL2. Mobile GPU performance varies; the complete HTML field
guide and classic portfolio remain available. Architecture and landscape are playful
interpretations, not exact reconstructions of the institutions or workplaces.
