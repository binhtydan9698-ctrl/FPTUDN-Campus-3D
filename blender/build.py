"""Dựng campus 3D từ đầu → lưu .blend → xuất GLB + meta cho web → render ảnh xem trước (RTX/OptiX).

Chạy:  blender --background --factory-startup --python blender/build.py -- [--no-render]
(hoặc `npm run model` ở thư mục gốc dự án)
"""
import json
import math
import os
import random
import sys
import time

import bpy

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)

from campus import layout as L                      # noqa: E402
from campus.core import to_three, offset_polyline, sample_polyline  # noqa: E402
from campus import buildings, landscape             # noqa: E402

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT_MODEL = os.path.join(ROOT, 'public', 'models', 'campus.glb')
OUT_META = os.path.join(ROOT, 'public', 'models', 'campus.meta.json')
OUT_IDS = os.path.join(ROOT, 'public', 'models', 'campus.ids.json')
OUT_BLEND = os.path.join(HERE, 'campus.blend')
OUT_PREVIEW = os.path.join(HERE, 'preview.png')


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for c in list(bpy.data.collections):
        bpy.data.collections.remove(c)


def build():
    t0 = time.time()
    reset()
    coll = bpy.data.collections.new('Campus')
    bpy.context.scene.collection.children.link(coll)
    meta = {'version': 1}
    rng = random.Random(2027)

    landscape.base(coll)
    landscape.roads(coll)
    extra_trees = []
    landscape.neighbourhood(coll, rng, extra_trees)
    heights = buildings.build_all(coll)
    landscape.amenities(coll, meta)
    landscape.walkways(coll)
    landscape.sign(coll)
    occ = landscape.build_occupancy()
    n_trees = landscape.plant_trees(coll, rng, occ, extra_trees)
    meta['lamps'] = landscape.lamps(coll)

    # dữ liệu cho hoạt cảnh trên web (tọa độ Three.js)
    meta['walk'] = {
        'nodes': {k: to_three(x, y, 0.15) for k, (x, y) in L.NODES.items()},
        'edges': [list(e) for e in L.EDGES],
    }
    lane = offset_polyline(L.ROAD_LOOP, -L.ROAD_W / 4)            # làn bên phải (đi ngược chiều kim đồng hồ)
    meta['carLoop'] = [to_three(x, y, 0.15) for x, y, _ in sample_polyline(lane, 4.0, closed=True)]
    south = L.OUTER_ROADS[0]
    meta['carLines'] = [
        [to_three(x, y - L.ROAD_W / 4, 0.15) for x, y in south],
        [to_three(x, y + L.ROAD_W / 4, 0.15) for x, y in reversed(south)],
    ]
    meta['heights'] = heights
    b = L.BASE
    meta['base'] = {'center': to_three(b['cx'], b['cy']), 'size': [b['w'], b['h']]}
    meta['stats'] = {'trees': n_trees}
    print(f'[build] dựng xong trong {time.time() - t0:.1f}s, {n_trees} cây')
    return meta


def export(meta):
    os.makedirs(os.path.dirname(OUT_MODEL), exist_ok=True)
    common = dict(filepath=OUT_MODEL, export_format='GLB', export_yup=True, export_apply=True,
                  export_extras=True, export_cameras=False, export_lights=False, use_selection=False)
    try:
        bpy.ops.export_scene.gltf(**common, export_draco_mesh_compression_enable=True,
                                  export_draco_mesh_compression_level=6)
        meta['draco'] = True
    except Exception as e:  # thiếu thư viện Draco -> xuất không nén
        print('[export] Draco lỗi, xuất không nén:', e)
        bpy.ops.export_scene.gltf(**common)
        meta['draco'] = False
    with open(OUT_META, 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False)
    ids = sorted(o.name[4:] for o in bpy.data.objects if o.name.startswith('BLD_') and o.type == 'EMPTY')
    with open(OUT_IDS, 'w', encoding='utf-8') as f:
        json.dump(ids, f)
    size = os.path.getsize(OUT_MODEL) / 1e6
    print(f'[export] {OUT_MODEL} ({size:.2f} MB), tòa: {", ".join(ids)}')


def setup_render():
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    prefs = bpy.context.preferences.addons['cycles'].preferences
    try:
        prefs.compute_device_type = 'OPTIX'
        prefs.get_devices()
        for d in prefs.devices:
            d.use = d.type == 'OPTIX'
        sc.cycles.device = 'GPU'
    except Exception as e:
        print('[render] không bật được OptiX:', e)
    sc.cycles.samples = 96
    sc.cycles.use_denoising = True
    sc.render.resolution_x, sc.render.resolution_y = 1920, 1080
    sc.render.film_transparent = False
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = 'AgX - Medium High Contrast' if 'AgX - Medium High Contrast' in [
        i.identifier for i in sc.view_settings.bl_rna.properties['look'].enum_items] else 'None'

    world = bpy.data.worlds.new('Sky')
    sc.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.62, 0.78, 0.95, 1)
    bg.inputs['Strength'].default_value = 0.9

    sun_data = bpy.data.lights.new('Sun', 'SUN')
    sun_data.energy = 4.2
    sun_data.angle = math.radians(4)
    sun_data.color = (1.0, 0.95, 0.86)
    sun = bpy.data.objects.new('Sun', sun_data)
    sun.rotation_euler = (math.radians(48), math.radians(8), math.radians(-35))
    sc.collection.objects.link(sun)

    cam_data = bpy.data.cameras.new('Cam')
    cam_data.lens = 50
    cam_data.clip_end = 3000
    cam = bpy.data.objects.new('Cam', cam_data)
    sc.collection.objects.link(cam)
    cam.location = (250, -430, 330)
    target = bpy.data.objects.new('CamTarget', None)
    target.location = (10, -5, 0)
    sc.collection.objects.link(target)
    con = cam.constraints.new('TRACK_TO')
    con.target = target
    con.track_axis = 'TRACK_NEGATIVE_Z'
    con.up_axis = 'UP_Y'
    sc.camera = cam


def main():
    meta = build()
    export(meta)
    setup_render()
    bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND, compress=True)
    print('[save]', OUT_BLEND)
    if '--no-render' not in ARGS:
        t0 = time.time()
        bpy.context.scene.render.filepath = OUT_PREVIEW
        bpy.ops.render.render(write_still=True)
        print(f'[render] {OUT_PREVIEW} ({time.time() - t0:.1f}s)')


main()
