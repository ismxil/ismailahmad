"""Regenerate the avatar using Blender 5 and Pillow.
Usage: python3 scripts/render-avatar.py /path/to/ahmad.blend
"""
import os, sys
if '--render-frames' not in sys.argv:
    import subprocess
    from pathlib import Path
    from PIL import Image
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    Path('.context/avatar').mkdir(parents=True, exist_ok=True)
    blender = os.environ.get('BLENDER_BIN', '/Applications/Blender.app/Contents/MacOS/Blender')
    subprocess.run([blender, '--background', sys.argv[1], '--python', __file__, '--', '--render-frames'], check=True)
    output = Path('assets/avatar')
    output.mkdir(parents=True, exist_ok=True)
    atlas = Image.new('RGBA', (128 * 13, 128 * 9))
    for row in range(9):
        for col in range(13):
            with Image.open(f'.context/avatar/{row:02}-{col:02}.png') as frame:
                atlas.paste(frame, (col * 128, row * 128))
    atlas.save(output / 'ahmad-directions.webp', quality=88, method=6)
    with Image.open('.context/avatar/04-06.png') as front:
        front.save(output / 'ahmad.webp', quality=92, method=6)
    raise SystemExit()

import bpy, math
from mathutils import Vector
s=bpy.context.scene
s.render.engine='CYCLES'
s.render.use_persistent_data=True
for o in list(s.objects):
 if o.type=='MESH' and not o.hide_render:
  for m in list(o.modifiers): o.modifiers.remove(m)
  if len(o.data.vertices)>100000:
   bpy.context.view_layer.objects.active=o
   mod=o.modifiers.new('Web resolution','DECIMATE'); mod.ratio=.12
   bpy.ops.object.modifier_apply(modifier=mod.name)
s.cycles.samples=12
s.cycles.use_denoising=True
s.render.resolution_x=s.render.resolution_y=128
s.render.resolution_percentage=100
s.render.film_transparent=True
s.render.image_settings.file_format='PNG'
s.view_settings.view_transform='AgX'
world=bpy.data.worlds.new('Studio'); s.world=world; world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.22,.24,.27,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.12
pivot=bpy.data.objects.new('Head pivot',None); s.collection.objects.link(pivot); pivot.location=(0,0,.5)
bpy.context.view_layer.update()
for o in list(s.objects):
 if o.type=='MESH' and not o.hide_render:
  matrix=o.matrix_world.copy(); o.parent=pivot; o.matrix_world=matrix
cam=bpy.data.objects.new('Camera',bpy.data.cameras.new('Camera')); s.collection.objects.link(cam)
cam.location=(0,-1.8,.5); cam.rotation_euler=(Vector((0,0,.5))-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.type='ORTHO'; cam.data.ortho_scale=.82; s.camera=cam
for name,loc,power,size,size_y in [('Key',(-.65,-.9,1.1),3,.32,1.5),('Right',(.7,-.35,.65),5,.18,1.4),('Top',(0,.15,1.4),4,.65,.5)]:
 light=bpy.data.lights.new(name,'AREA'); light.energy=power; light.shape='RECTANGLE'; light.size=size; light.size_y=size_y
 o=bpy.data.objects.new(name,light); s.collection.objects.link(o); o.location=loc; o.rotation_euler=(Vector((0,0,.5))-o.location).to_track_quat('-Z','Y').to_euler()
frames=True
for row in (range(9) if frames else [4]):
 for col in (range(13) if frames else [6]):
  pivot.rotation_euler=(math.radians((row-4)*5),0,math.radians((col-6)*5))
  s.render.filepath=os.path.abspath(f'.context/avatar/{row:02}-{col:02}.png'); bpy.ops.render.render(write_still=True)
