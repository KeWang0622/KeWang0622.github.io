"""Author the MRFoundry scanner companion; no external assets or scripts required.

Blender axes: Z up, -Y front. GLB exports Y up, +Z front. Origin is ground center.
"""
from pathlib import Path
import math
import json
import os
import bpy
from mathutils import Vector

REPO = Path(__file__).resolve().parents[2]
ART = Path(os.environ.get("MRFOUNDRY_ART_OUTPUT", str(REPO / "work" / "mri-companion")))
ASSET = REPO / "pokemon" / "3d" / "assets" / "companion.glb"
ART.mkdir(parents=True, exist_ok=True)
ASSET.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
parts = []

def srgb(h):
    rgb = tuple(int(h[i:i+2],16)/255 for i in (0,2,4))
    return tuple(v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in rgb)

def material(name, color, rough=.4, metal=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*srgb(color),1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*srgb(color),1)
    p.inputs['Roughness'].default_value = rough
    p.inputs['Metallic'].default_value = metal
    return m

ivory = material('Warm ceramic shell','E9E6DB',.32)
ivory_edge = material('Ceramic edge and bed','D9D9D2',.36)
blue = material('Powder blue bore','67A7C5',.28,.08)
blue_dark = material('Inner bore blue','2F6687',.36)
cushion = material('Bed cushion','83B7CB',.58)
teal = material('Foundry teal','329788',.34)
teal_dark = material('Deep teal joints','2B5E5F',.44)
navy = material('Eyes and dark details','213442',.24)
white = material('Soft white highlights','FFF9E9',.25)
metal = material('Brushed warm metal','9CAEB0',.38,.55)
groundmat = material('Studio paper','E9EAE4',.8)

def finish(obj, mat, name=None):
    if name: obj.name = name
    obj.data.materials.append(mat)
    for p in obj.data.polygons: p.use_smooth = True
    parts.append(obj)
    return obj

def rounded(name, loc, dims, radius, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o=bpy.context.object
    o.dimensions=dims
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    bevel=o.modifiers.new('Machined rounded casing','BEVEL')
    bevel.width=radius; bevel.segments=5
    bevel.affect='EDGES'
    bevel.profile=.5
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    # Flat main panels with smooth edge normals, as a molded manufactured object.
    normal=o.modifiers.new('Weighted panel normals','WEIGHTED_NORMAL')
    normal.keep_sharp=True; normal.weight=50
    return finish(o,mat,name)

def ellipsoid(name, loc, scale, mat, segments=24, rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=loc)
    o=bpy.context.object; o.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(o,mat,name)

def ring(name, profile, mat, center_z=.46, segments=96, smooth=1):
    # Closed rounded annular cross-section revolved around the bore axis.
    verts=[]; faces=[]; count=len(profile)
    for i in range(segments):
        a=2*math.pi*i/segments
        for r,y in profile: verts.append((r*math.cos(a),y,center_z+r*math.sin(a)))
    for i in range(segments):
        ni=(i+1)%segments
        for j in range(count): faces.append((i*count+j,i*count+(j+1)%count,ni*count+(j+1)%count,ni*count+j))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);scene.collection.objects.link(o)
    finish(o,mat)
    if smooth:
        m=o.modifiers.new('Continuous sculpted shell','SUBSURF');m.levels=smooth;m.render_levels=smooth
    return o

def line(name, points, thickness, mat):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=16
    c.bevel_depth=thickness;c.bevel_resolution=3;c.resolution_u=18
    s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
    for p,co in zip(s.bezier_points,points):
        p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c);scene.collection.objects.link(o)
    c.materials.append(mat);parts.append(o)
    return o

# A long, cylindrical magnet housing distinguishes MRI from a thin CT gantry.
# The straight open bore traverses the full magnet, with no disk/backpack cap.
ring('Scanner | long cylindrical MRI magnet',[
    (.145,-.112),(.150,-.140),(.181,-.150),(.254,-.150),
    (.287,-.137),(.306,-.109),(.312,-.058),(.312,.285),
    (.306,.329),(.287,.356),(.254,.370),(.181,.370),
    (.150,.357),(.143,.330),(.143,-.065)
],ivory)
ring('Scanner | rear magnet casing seam',[
    (.308,.268),(.314,.272),(.315,.278),(.313,.285),(.308,.289)
],teal_dark, smooth=1)
ring('Scanner | sky blue sculpted aperture',[
    (.140,-.110),(.142,-.139),(.151,-.159),(.166,-.171),
    (.184,-.169),(.195,-.158),(.195,-.150),(.184,-.145),
    (.160,-.140),(.150,-.111)
],blue)
ring('Scanner | continuous deep MRI tunnel',[
    (.140,-.132),(.144,-.135),(.146,-.125),(.146,.329),
    (.142,.354),(.135,.355),(.133,.330),(.133,-.113)
],blue_dark)
ring('Scanner | rear bore rim',[
    (.133,.319),(.135,.315),(.144,.319),(.146,.330),(.142,.342),(.134,.342)
],blue, smooth=1)
# Two axial strips emphasize the tunnel's length at the portfolio camera scale.
for side in (-1,1):
    rounded('Bore | longitudinal illumination',(side*.113,.098,.516),(.009,.437,.009),.003,white)
# A broad pedestal continues under the magnet; it is not a freestanding ring.
rounded('Magnet | long support plinth',(0,.111,.182),(.418,.486,.095),.035,ivory_edge)
# A character face lives on the upper ceramic arc; it does not obstruct the bore.
for sign in (-1,1):
    ellipsoid('Face | left eye' if sign<0 else 'Face | right eye', (sign*.065,-.153,.692),(.013,.0075,.0185),navy)
    ellipsoid('Face | eye catchlight',(sign*.065-.003,-.160,.699),(.0035,.002,.004),white,16,8)
    line('Face | friendly eyebrow',[(sign*.074,-.148,.729),(sign*.065,-.152,.733),(sign*.057,-.150,.730)],.0024,navy)
line('Face | quiet smile',[(-.023,-.157,.662),(-.012,-.163,.654),(0,-.165,.651),(.012,-.163,.654),(.023,-.157,.662)],.0030,navy)

# Bed nose: separate molded tray, cushion, lip, and inset indicator.
rounded('Bed | ceramic tray',(0,-.035,.363),(.179,.800,.043),.018,ivory_edge)
rounded('Bed | upholstered blue cushion',(0,-.037,.391),(.147,.770,.025),.012,cushion)
rounded('Bed | raised front cap',(0,-.427,.363),(.172,.032,.044),.012,ivory)
rounded('Bed | inset front indicator',(0,-.445,.364),(.072,.005,.013),.005,teal_dark)
rounded('Bed | mounting cradle',(0,-.112,.326),(.135,.109,.044),.015,blue_dark)

rounded('Bed | table support column',(0,-.350,.193),(.108,.118,.298),.024,ivory)
rounded('Bed | table base',(0,-.350,.049),(.166,.196,.052),.018,ivory_edge)

# Small robot feet stabilize the silhouette; split soles and inset ankle joints.
for side in (-1,1):
    x=side*.161
    rounded('Leg | teal ankle joint',(x,.115,.136),(.070,.087,.115),.023,teal_dark)
    rounded('Leg | ivory ankle guard',(x,.107,.164),(.091,.098,.071),.024,ivory)
    rounded('Foot | blue rubber sole',(x,.086,.020),(.127,.180,.040),.018,teal_dark)
    rounded('Foot | ceramic sneaker',(x,.080,.048),(.123,.177,.060),.025,ivory_edge)
    rounded('Foot | small blue toe',(x,-.002,.045),(.079,.014,.022),.008,blue)

# Teal service backpack and little vents give the back a designed identity too.
rounded('Backpack | outer shell',(0,.174,.459),(.272,.132,.319),.055,teal)
rounded('Backpack | recessed panel',(0,.245,.457),(.205,.018,.225),.028,teal_dark)
rounded('Backpack | service face',(0,.254,.468),(.182,.017,.187),.024,teal)
for z in (.419,.444,.469):
    rounded('Backpack | horizontal air grille',(0,.265,z),(.109,.005,.009),.004,teal_dark)
rounded('Backpack | white service tab',(0,.266,.522),(.048,.006,.014),.005,ivory)
line('Backpack | carrying handle',[(-.067,.168,.613),(-.062,.175,.651),(.062,.175,.651),(.067,.168,.613)],.011,teal_dark)
# Keep the service pack on the outer right flank, leaving the bore unobstructed.
for o in parts:
    if o.name.startswith('Backpack |'):
        o.location.x=o.location.x*.5+.22
        o.location.z=.46+(o.location.z-.46)*.85
        o.scale.x*=.5;o.scale.z*=.85

# Edge hardware: tiny inset ports on the face, with restrained metallic trim.
for side in (-1,1):
    p=rounded('Shell | side access inset',(side*.267,-.154,.461),(.025,.010,.096),.010,metal)
    p.rotation_euler[1]=side*.09
    for z in (.429,.442,.455):
        rounded('Shell | vent slit',(side*.241,-.155,z),(.018,.005,.004),.0015,teal_dark)

rounded('Badge | teal cartouche',(0,-.148,.236),(.095,.012,.035),.012,teal)
bpy.ops.object.text_add(location=(0,-.156,.225),rotation=(math.pi/2,0,0))
badge=bpy.context.object;badge.name='Badge | MR monogram'
badge.data.body='MR';badge.data.align_x='CENTER';badge.data.size=.026
badge.data.extrude=.0005;badge.data.bevel_depth=.0002
badge.data.materials.append(ivory);parts.append(badge)

# Apply geometry, join by material to reduce draw calls, retain semantic material names.
bpy.ops.object.select_all(action='DESELECT')
for o in parts: o.select_set(True)
bpy.context.view_layer.objects.active=parts[0]
bpy.ops.object.convert(target='MESH')
parts=list(bpy.context.selected_objects)
for o in parts:
    bpy.context.view_layer.objects.active=o
    for modifier in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=modifier.name)

# Precisely normalize authoring height to 0.8 m, base at z=0.
coords=[o.matrix_world @ Vector(c) for o in parts for c in o.bound_box]
zmin=min(p.z for p in coords); zmax=max(p.z for p in coords)
factor=.8/(zmax-zmin)
for o in parts:
    o.location.z-=zmin
    o.location*=factor;o.scale*=factor
    bpy.context.view_layer.objects.active=o
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)

for mat in (ivory,ivory_edge,blue,blue_dark,cushion,teal,teal_dark,navy,white,metal):
    group=[o for o in scene.objects if o.type=='MESH' and o.data.materials and o.data.materials[0]==mat]
    if not group: continue
    bpy.ops.object.select_all(action='DESELECT')
    for o in group:o.select_set(True)
    bpy.context.view_layer.objects.active=group[0]
    bpy.ops.object.join()
    group[0].name='MRFoundry | '+mat.name
parts=[o for o in scene.objects if o.type=='MESH']
root=bpy.data.objects.new('MRFoundry companion · 0.8m · front +Z in glTF',None)
scene.collection.objects.link(root)
for o in parts:o.parent=root
root['authoring']='Original modeled asset for Ke Wang’s portfolio; Blender 5.2.3'
root['front_axis_gltf']='+Z'
root['height_m']=.8
root['scanner_type']='MRI: long cylindrical magnet, deep straight open bore, integrated patient table'
root['magnet_axial_depth_m']=.520*factor
root['bore_diameter_m']=.266*factor
bpy.ops.object.select_all(action='DESELECT')
root.select_set(True)
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=root
ASSET.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(ASSET),export_format='GLB',use_selection=True,export_yup=True,export_apply=True,export_extras=True)

coords=[o.matrix_world @ Vector(c) for o in parts for c in o.bound_box]
triangles=0
for o in parts:o.data.calc_loop_triangles();triangles+=len(o.data.loop_triangles)
report={'asset':str(ASSET),'blender_version':bpy.app.version_string,'materials':len({m.name for o in parts for m in o.data.materials}),
        'mesh_objects':len(parts),'triangles':triangles,'height_m':.8,'front_gltf':'+Z','scanner_type':'MRI','magnet_depth_to_bore_diameter':.520/.266,
        'blender_bounds':{'min':[min(getattr(v,k) for v in coords) for k in 'xyz'],'max':[max(getattr(v,k) for v in coords) for k in 'xyz']},
        'glb_bytes':ASSET.stat().st_size}
(ART/'companion-report.json').write_text(json.dumps(report,indent=2)+'\n')

# Editable asset file includes a separate studio setup for reproducible previews.
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.001))
ground=bpy.context.object;ground.name='STUDIO | ground';ground.data.materials.append(groundmat)
def aim(obj,target):obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
def area(name,loc,energy,size,color=(1,1,1)):
    bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name
    o.data.energy=energy;o.data.shape='DISK';o.data.size=size;o.data.color=color;aim(o,(0,0,.4))
area('STUDIO | large warm key',(-1.5,-2,2.8),180,2,(1,.94,.84))
area('STUDIO | cool fill',(1.8,-.5,1.4),90,1.7,(.77,.9,1))
area('STUDIO | rim',(.3,1.6,2.2),180,1.5)
bpy.ops.object.camera_add(location=(1.28,-2.3,1.28))
camera=bpy.context.object;camera.name='STUDIO | camera';camera.data.type='ORTHO';camera.data.ortho_scale=1.25
aim(camera,(0,-.05,.4));scene.camera=camera
scene.world=bpy.data.worlds.new('STUDIO | soft world');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.65,.7,.73,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.45
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=48
scene.cycles.use_denoising=True
scene.render.resolution_x=1024;scene.render.resolution_y=1024;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.view_settings.view_transform='AgX'
scene.render.filepath=str(ART/'companion-preview.png')
bpy.ops.wm.save_as_mainfile(filepath=str(ART/'companion.blend'))
bpy.ops.render.render(write_still=True)
print('COMPANION_READY '+json.dumps(report))
