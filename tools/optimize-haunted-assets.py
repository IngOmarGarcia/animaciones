"""Run with Blender 5.2 --background --python tools/optimize-haunted-assets.py.
CC0 source remains untouched; web files are reproducible derivatives.
"""
import bpy, os, json, hashlib
from pathlib import Path
root=Path.cwd() / 'assets/haunted-night'
out=root/'web'
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(root/'source/dead_tree_trunk/dead_tree_trunk_1k.gltf'))
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
original=sum(len(o.data.polygons) for o in meshes)
for o in meshes:
    bpy.context.view_layer.objects.active=o
    modifier=o.modifiers.new('Web silhouette-preserving reduction','DECIMATE')
    modifier.ratio=min(1,18000/original)
    bpy.ops.object.modifier_apply(modifier=modifier.name)
for image in bpy.data.images:
    if image.size[0]>0 and image.source=='FILE':
        if image.packed_file: image.unpack(method='REMOVE')
        image.scale(512,512)
        image.file_format='JPEG'
        image.filepath_raw=str(out/(Path(image.filepath).stem+'.jpg'))
        image.save()
bpy.ops.export_scene.gltf(filepath=str(out/'dead-tree-trunk.glb'),export_format='GLB',export_image_format='JPEG',export_jpeg_quality=82,export_yup=True)
for size in [512,1024]:
    for channel in ['diff','nor_gl','rough']:
        if size==512 and channel!='diff': continue
        image=bpy.data.images.load(str(root/'source/forest_ground_04'/f'{channel}.jpg'),check_existing=False)
        image.scale(size,size)
        image.file_format='JPEG'
        image.filepath_raw=str(out/f'forest-{channel}-{size}.jpg')
        image.save()
        bpy.data.images.remove(image)
report={'tool':bpy.app.version_string,'sourcePolygons':original,'webPolygons':sum(len(o.data.polygons) for o in meshes),'changes':['Decimated scanned log to about 18k faces','Log PBR textures resized to 512px, embedded in GLB','Ground maps resized for 512/1024px quality tiers'],'files':[]}
for p in sorted(out.iterdir()):
    if p.suffix in ['.jpg','.glb']:
        report['files'].append({'path':str(p.relative_to(Path.cwd())).replace('\\','/'),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(root/'optimization.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
