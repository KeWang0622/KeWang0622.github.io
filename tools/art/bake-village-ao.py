"""Append gentle Cycles-baked vertex AO without re-exporting a GLB's geometry.

Run with Blender --background --factory-startup --python this_file --
  --input ORIGINAL.glb --output REVIEW.glb --report REPORT.json

Input must be the unbaked source from git. Only COLOR_0 data is appended; the
original material definitions, topology, transforms and binary data are retained.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import sys

import bpy
from mathutils import Matrix, Quaternion, Vector


def read_glb(path):
    data = path.read_bytes()
    magic, version, size = struct.unpack_from('<III', data)
    assert magic == 0x46546C67 and version == 2 and size == len(data)
    json_size, json_type = struct.unpack_from('<II', data, 12)
    assert json_type == 0x4E4F534A
    doc = json.loads(data[20:20 + json_size])
    offset = 20 + json_size
    binary_size, binary_type = struct.unpack_from('<II', data, offset)
    assert binary_type == 0x004E4942
    binary = data[offset + 8:offset + 8 + binary_size]
    assert len(doc['buffers']) == 1
    return doc, binary, data


def accessor(doc, binary, index):
    item = doc['accessors'][index]
    assert 'sparse' not in item
    view = doc['bufferViews'][item['bufferView']]
    assert view['buffer'] == 0
    fmt = {5120: 'b', 5121: 'B', 5122: 'h', 5123: 'H', 5125: 'I', 5126: 'f'}[item['componentType']]
    components = {'SCALAR': 1, 'VEC3': 3, 'VEC4': 4}[item['type']]
    layout = struct.Struct('<' + fmt * components)
    offset = view.get('byteOffset', 0) + item.get('byteOffset', 0)
    stride = view.get('byteStride', layout.size)
    rows = [layout.unpack_from(binary, offset + i * stride) for i in range(item['count'])]
    if item.get('normalized'):
        denominator = {5120: 127, 5121: 255, 5122: 32767, 5123: 65535}[item['componentType']]
        rows = [tuple(max(-1., value / denominator) for value in row) for row in rows]
    return rows


def local_matrix(node):
    if 'matrix' in node:
        return Matrix([node['matrix'][column * 4:column * 4 + 4] for column in range(4)]).transposed()
    translation = Matrix.Translation(Vector(node.get('translation', [0, 0, 0])))
    x, y, z, w = node.get('rotation', [0, 0, 0, 1])
    rotation = Quaternion((w, x, y, z)).to_matrix().to_4x4()
    scale = Matrix.Diagonal((*node.get('scale', [1, 1, 1]), 1))
    return translation @ rotation @ scale


def world_matrices(doc):
    parents = {child: i for i, node in enumerate(doc['nodes']) for child in node.get('children', [])}
    result = {}
    def world(i):
        if i not in result:
            result[i] = (world(parents[i]) if i in parents else Matrix.Identity(4)) @ local_matrix(doc['nodes'][i])
        return result[i]
    return [world(i) for i in range(len(doc['nodes']))]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    assert args.input.resolve() != args.output.resolve(), 'Never overwrite the source.'
    doc, original_binary, original_file = read_glb(args.input)
    original_json = json.loads(json.dumps(doc))
    matrices = world_matrices(doc)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 32
    scene.cycles.use_denoising = False
    scene.render.bake.target = 'VERTEX_COLORS'
    scene.render.bake.use_selected_to_active = False
    scene.render.bake.use_clear = True
    scene.render.bake.margin = 0
    # An AO node through emission makes the sample distance explicit. No light
    # or world colour enters the bake. Other meshes remain AO occluders.
    material = bpy.data.materials.new('Temporary 0.8 m cavity bake')
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    ao = nodes.new('ShaderNodeAmbientOcclusion')
    ao.inputs['Distance'].default_value = .8
    ao.inputs['Color'].default_value = (1, 1, 1, 1)
    ao.samples = 32
    ao.only_local = False
    emission = nodes.new('ShaderNodeEmission')
    emission.inputs['Strength'].default_value = 1
    output = nodes.new('ShaderNodeOutputMaterial')
    material.node_tree.links.new(ao.outputs['AO'], emission.inputs['Color'])
    material.node_tree.links.new(emission.outputs['Emission'], output.inputs['Surface'])

    meshes = []
    used_meshes = set()
    bounds_min, bounds_max = [math.inf] * 3, [-math.inf] * 3
    for node_index, node in enumerate(doc['nodes']):
        if 'mesh' not in node:
            continue
        mesh_index = node['mesh']
        # A shared glTF mesh could be placed in different occlusion conditions.
        # Fail explicitly instead of silently writing one instance's AO to all.
        assert mesh_index not in used_meshes, 'Shared mesh instances need an authored bake policy.'
        used_meshes.add(mesh_index)
        for primitive_index, primitive in enumerate(doc['meshes'][mesh_index]['primitives']):
            assert primitive.get('mode', 4) == 4
            assert 'COLOR_0' not in primitive['attributes'], 'Use the original, unbaked asset.'
            vertices = accessor(doc, original_binary, primitive['attributes']['POSITION'])
            indices = [row[0] for row in accessor(doc, original_binary, primitive['indices'])]
            assert len(indices) % 3 == 0
            triangles = [indices[i:i + 3] for i in range(0, len(indices), 3)]
            mesh = bpy.data.meshes.new(f'AO {mesh_index}:{primitive_index}')
            mesh.from_pydata(vertices, [], triangles)
            mesh.update()
            if 'NORMAL' in primitive['attributes']:
                normals = accessor(doc, original_binary, primitive['attributes']['NORMAL'])
                mesh.normals_split_custom_set_from_vertices(normals)
            colors = mesh.color_attributes.new(name='Baked cavity', type='FLOAT_COLOR', domain='CORNER')
            mesh.color_attributes.active_color = colors
            obj = bpy.data.objects.new(node.get('name', mesh.name), mesh)
            scene.collection.objects.link(obj)
            obj.matrix_world = matrices[node_index]
            obj.data.materials.append(material)
            obj.select_set(True)
            for vertex in vertices:
                world_vertex = matrices[node_index] @ Vector(vertex)
                for axis in range(3):
                    bounds_min[axis] = min(bounds_min[axis], world_vertex[axis])
                    bounds_max[axis] = max(bounds_max[axis], world_vertex[axis])
            meshes.append((obj, primitive, colors, len(vertices)))
    bpy.context.view_layer.objects.active = meshes[0][0]
    print(f'Baking {len(meshes)} meshes, {sum(item[3] for item in meshes)} original vertices.', flush=True)
    bpy.ops.object.bake(type='EMIT')

    binary = bytearray(original_binary)
    report = {'source': args.input.name, 'blender': bpy.app.version_string,
              'samples': 32, 'ao_distance_m': .8, 'remap': '.65 + .35 * AO',
              'source_sha256': hashlib.sha256(original_file).hexdigest(),
              'world_bounds': {'min': bounds_min, 'max': bounds_max}, 'meshes': []}
    for obj, primitive, colors, count in meshes:
        sums, counts = [0.] * count, [0] * count
        for loop in obj.data.loops:
            # FLOAT_COLOR reads linear RGB. No display gamma is applied.
            value = sum(colors.data[loop.index].color[:3]) / 3
            assert math.isfinite(value)
            sums[loop.vertex_index] += min(1., max(0., value))
            counts[loop.vertex_index] += 1
        assert all(counts), 'All original vertices must have a baked corner.'
        ao_values = [s / n for s, n in zip(sums, counts)]
        rgb = [round(255 * (.65 + .35 * value)) for value in ao_values]
        while len(binary) % 4:
            binary.append(0)
        offset = len(binary)
        binary.extend(bytes(channel for value in rgb for channel in (value, value, value, 255)))
        view_index = len(doc['bufferViews'])
        doc['bufferViews'].append({'buffer': 0, 'byteOffset': offset, 'byteLength': count * 4, 'target': 34962})
        accessor_index = len(doc['accessors'])
        doc['accessors'].append({'bufferView': view_index, 'componentType': 5121, 'normalized': True,
                                 'count': count, 'type': 'VEC4'})
        primitive['attributes']['COLOR_0'] = accessor_index
        report['meshes'].append({'name': obj.name, 'vertices': count, 'ao_min': min(ao_values),
                                'ao_mean': sum(ao_values) / count, 'ao_max': max(ao_values),
                                'color_min': min(rgb) / 255, 'color_max': max(rgb) / 255})
    doc['buffers'][0]['byteLength'] = len(binary)
    encoded = json.dumps(doc, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    encoded += b' ' * (-len(encoded) % 4)
    result = struct.pack('<III', 0x46546C67, 2, 28 + len(encoded) + len(binary))
    result += struct.pack('<II', len(encoded), 0x4E4F534A) + encoded
    result += struct.pack('<II', len(binary), 0x004E4942) + binary
    # Prove the only JSON changes are the new vertex colour references/data.
    check = json.loads(json.dumps(doc))
    check['buffers'] = original_json['buffers']
    check['accessors'] = check['accessors'][:len(original_json['accessors'])]
    check['bufferViews'] = check['bufferViews'][:len(original_json['bufferViews'])]
    for mesh in check['meshes']:
        for primitive in mesh['primitives']:
            primitive['attributes'].pop('COLOR_0', None)
    assert check == original_json
    assert binary[:len(original_binary)] == original_binary
    report.update({'output_sha256': hashlib.sha256(result).hexdigest(),
                   'original_bytes': len(original_file), 'output_bytes': len(result),
                   'original_binary_preserved': True, 'original_json_preserved_except_color': True,
                   'vertex_count': sum(item[3] for item in meshes)})
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(result)
    args.report.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({key: report[key] for key in ['vertex_count', 'original_bytes', 'output_bytes',
                     'original_binary_preserved', 'original_json_preserved_except_color']}), flush=True)


if __name__ == '__main__':
    main()
