"""Render the owner's detailed chrome finish on the full 3D head.

Usage: python3 scripts/render-avatar.py /path/to/ahmad.blend
Requires Blender 5 and Pillow. The reference texture is checked into assets/avatar.
"""
import os
import sys
from pathlib import Path

SIZE, COLUMNS, ROWS = 256, 13, 9
FRAMES = Path('.context/avatar')

if '--render-frames' not in sys.argv:
    import subprocess
    from PIL import Image

    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    FRAMES.mkdir(parents=True, exist_ok=True)
    blender = os.environ.get('BLENDER_BIN', '/Applications/Blender.app/Contents/MacOS/Blender')
    subprocess.run([blender, '--background', sys.argv[1], '--python', __file__, '--', '--render-frames'], check=True)
    output = Path('assets/avatar')
    output.mkdir(parents=True, exist_ok=True)
    atlas = Image.new('RGBA', (SIZE * COLUMNS, SIZE * ROWS))
    for row in range(ROWS):
        for col in range(COLUMNS):
            with Image.open(FRAMES / f'{row:02}-{col:02}.png') as frame:
                atlas.paste(frame, (col * SIZE, row * SIZE))
    atlas.save(output / 'ahmad-directions.webp', quality=95, method=6)
    with Image.open(FRAMES / '04-06.png') as front:
        front.save(output / 'ahmad.webp', quality=98, method=6)
    raise SystemExit()

import bpy
import math
from mathutils import Vector

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.render.use_persistent_data = True
scene.cycles.samples = 64
scene.cycles.use_denoising = True
scene.render.resolution_x = scene.render.resolution_y = SIZE
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
# Preserve the reference image's original color and highlight values.
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'

head = bpy.data.objects.new('Head pivot', None)
scene.collection.objects.link(head)
head.location = (0, 0, .5)
bpy.context.view_layer.update()
for obj in list(scene.objects):
    if obj.type == 'MESH' and not obj.hide_render:
        # Keep every original vertex; the earlier decimation lost hair and face detail.
        for modifier in list(obj.modifiers):
            obj.modifiers.remove(modifier)
        matrix = obj.matrix_world.copy()
        obj.parent = head
        obj.matrix_world = matrix

camera = bpy.data.objects.new('Camera', bpy.data.cameras.new('Camera'))
scene.collection.objects.link(camera)
camera.location = (0, -1.8, .5)
camera.rotation_euler = (Vector((0, 0, .5)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = .82
scene.camera = camera

# Project the owner's supplied render onto the original head. The image is
# attached to the same pivot as the geometry, retaining its dark chrome finish
# and detailed curls as the head turns. Studio lighting is baked into the image.
material = bpy.data.materials.new('Owner chrome reference projection')
material.use_nodes = True
nodes = material.node_tree.nodes
nodes.clear()
links = material.node_tree.links
coordinates = nodes.new('ShaderNodeTexCoord')
coordinates.object = head
separate = nodes.new('ShaderNodeSeparateXYZ')
links.new(coordinates.outputs['Object'], separate.inputs[0])
uv = nodes.new('ShaderNodeCombineXYZ')
for source, target in [('X', 'X'), ('Z', 'Y')]:
    scale = nodes.new('ShaderNodeMath')
    scale.operation = 'MULTIPLY_ADD'
    scale.inputs[1].default_value = 1 / camera.data.ortho_scale
    scale.inputs[2].default_value = .5
    links.new(separate.outputs[source], scale.inputs[0])
    links.new(scale.outputs[0], uv.inputs[target])
texture = nodes.new('ShaderNodeTexImage')
texture.image = bpy.data.images.load(str(Path('assets/avatar/ahmad-reference.png').resolve()))
texture.extension = 'CLIP'
links.new(uv.outputs[0], texture.inputs['Vector'])
emission = nodes.new('ShaderNodeEmission')
links.new(texture.outputs['Color'], emission.inputs['Color'])

# Only the saturated green background is transparent. White chrome highlights
# remain intact because all three of their channels are bright.
rgb = nodes.new('ShaderNodeSeparateColor')
links.new(texture.outputs['Color'], rgb.inputs[0])
other = nodes.new('ShaderNodeMath')
other.operation = 'MAXIMUM'
links.new(rgb.outputs['Red'], other.inputs[0])
links.new(rgb.outputs['Blue'], other.inputs[1])
difference = nodes.new('ShaderNodeMath')
difference.operation = 'SUBTRACT'
links.new(rgb.outputs['Green'], difference.inputs[0])
links.new(other.outputs[0], difference.inputs[1])
background = nodes.new('ShaderNodeMath')
background.operation = 'GREATER_THAN'
background.inputs[1].default_value = .12
links.new(difference.outputs[0], background.inputs[0])
transparent = nodes.new('ShaderNodeBsdfTransparent')
mix = nodes.new('ShaderNodeMixShader')
links.new(background.outputs[0], mix.inputs[0])
links.new(emission.outputs[0], mix.inputs[1])
links.new(transparent.outputs[0], mix.inputs[2])
output = nodes.new('ShaderNodeOutputMaterial')
links.new(mix.outputs[0], output.inputs['Surface'])
for obj in list(scene.objects):
    if obj.type == 'MESH' and not obj.hide_render:
        obj.data.materials.clear()
        obj.data.materials.append(material)

for row in range(ROWS):
    for col in range(COLUMNS):
        head.rotation_euler = (math.radians((row - 4) * 5), 0, math.radians((col - 6) * 5))
        scene.render.filepath = str((FRAMES / f'{row:02}-{col:02}.png').resolve())
        bpy.ops.render.render(write_still=True)
