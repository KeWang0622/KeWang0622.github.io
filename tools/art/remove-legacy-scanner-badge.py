"""Remove only the old shallow scanner emblem from the AO-baked workshop GLB.

Original position/normal/color buffers, materials and transforms stay unchanged.
The runtime displays the same long-bore MRI GLB used by the walking companion.
Run on the original published arrival.glb; this operation is idempotent.
"""
from pathlib import Path
import struct, json, math
p=Path(__file__).resolve().parents[2]/'pokemon/3d/assets/arrival.glb'
b=p.read_bytes(); n=struct.unpack_from('<I',b,12)[0]; doc=json.loads(b[20:20+n]); off=20+n
binary=bytearray(b[off+8:]); old_len=len(binary)
fmt={5120:'b',5121:'B',5122:'h',5123:'H',5125:'I',5126:'f'}
def values(i):
 a=doc['accessors'][i];v=doc['bufferViews'][a['bufferView']];c={'SCALAR':1,'VEC3':3,'VEC4':4}[a['type']];s=struct.Struct('<'+fmt[a['componentType']]*c);o=v.get('byteOffset',0)+a.get('byteOffset',0);d=v.get('byteStride',s.size)
 rows=[s.unpack_from(binary,o+j*d) for j in range(a['count'])]
 if a.get('normalized'):
  denominator={5120:127,5121:255,5122:32767,5123:65535}[a['componentType']]
  rows=[tuple(max(-1.,v/denominator) for v in row) for row in rows]
 return rows
removed=0
for node in doc['nodes']:
 if 'mesh' not in node:continue
 assert not node.get('matrix') and not node.get('children'), 'Unexpected source transform'
 t=node.get('translation',[0,0,0]);s=node.get('scale',[1,1,1]);qx,qy,qz,qw=node.get('rotation',[0,0,0,1])
 def world(v):
  x,y,z=[v[i]*s[i] for i in range(3)]
  tx,ty,tz=2*(qy*z-qz*y),2*(qz*x-qx*z),2*(qx*y-qy*x)
  return x+qw*tx+qy*tz-qz*ty+t[0],y+qw*ty+qz*tx-qx*tz+t[1],z+qw*tz+qx*ty-qy*tx+t[2]
 for primitive in doc['meshes'][node['mesh']]['primitives']:
  pos=values(primitive['attributes']['POSITION']); idx=[r[0] for r in values(primitive['indices'])]
  target=[abs(v[0])<.565 and 3.61<v[1]<4.79 and 2.64<v[2]<3.19 for v in map(world,pos)]
  triangles=[idx[i:i+3] for i in range(0,len(idx),3)]
  kept=[tri for tri in triangles if not all(target[j] for j in tri)]
  kept=[i for tri in kept for i in tri];count=(len(idx)-len(kept))//3
  if not count:continue
  removed+=count
  while len(binary)%4:binary.append(0)
  offset=len(binary);binary.extend(struct.pack('<'+'I'*len(kept),*kept));view=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':len(kept)*4,'target':34963})
  primitive['indices']=len(doc['accessors']);doc['accessors'].append({'bufferView':view,'componentType':5125,'count':len(kept),'type':'SCALAR','min':[min(kept)],'max':[max(kept)]})
  print(node['name'],count)
if removed:
 while len(binary)%4:binary.append(0)
 doc['buffers'][0]['byteLength']=len(binary)
 raw=json.dumps(doc,separators=(',',':')).encode();raw+=b' '*((-len(raw))%4)
 p.write_bytes(struct.pack('<III',0x46546c67,2,12+8+len(raw)+8+len(binary))+struct.pack('<II',len(raw),0x4e4f534a)+raw+struct.pack('<II',len(binary),0x004e4942)+binary)
print(json.dumps({'removed_triangles':removed,'original_binary_preserved_bytes':old_len,'new_bytes':p.stat().st_size}))
