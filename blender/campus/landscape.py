"""Đế diorama, đường sá, khu dân cư, cảnh quan (hồ, sân bóng, bể bơi, quảng trường, bãi xe), lối đi, cây và đèn."""
import math
import random
from mathutils import Matrix, Vector
from .core import Group, empty, rounded_rect, blob, sample_polyline, offset_polyline, to_three
from . import layout as L


# ------------------------------------------------------------ vùng chiếm chỗ (để rải cây không đè lên công trình)
class Occupancy:
    def __init__(self):
        self.rects = []     # (x0, y0, x1, y1)
        self.ellipses = []  # (cx, cy, rx, ry)
        self.segments = []  # (ax, ay, bx, by, r)

    def rect(self, x, y, w, d, pad=0.0):
        self.rects.append((x - w / 2 - pad, y - d / 2 - pad, x + w / 2 + pad, y + d / 2 + pad))

    def free(self, x, y):
        for x0, y0, x1, y1 in self.rects:
            if x0 <= x <= x1 and y0 <= y <= y1:
                return False
        for cx, cy, rx, ry in self.ellipses:
            if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1:
                return False
        p = Vector((x, y))
        for ax, ay, bx, by, r in self.segments:
            a, b = Vector((ax, ay)), Vector((bx, by))
            ab = b - a
            t = max(0.0, min(1.0, (p - a).dot(ab) / max(ab.length_squared, 1e-6)))
            if (a + ab * t - p).length < r:
                return False
        return True


def build_occupancy():
    oc = Occupancy()
    t = L.TOWER
    oc.rect(t['x'], t['y'], t['w'] + 14, t['d'] + 16)
    for a in L.ACADEMIC:
        oc.rect(a['x'], a['y'], a['w'] + 6, a['d'] + 8)
    for dm in L.DORMS:
        for dx, dy in dm['modules']:
            oc.rect(dm['x'] + dx, dm['y'] + dy, dm['size'] + 6, dm['size'] + 6)
    for s in (L.SPORTS_HALL, L.SMALL_BLOCK):
        oc.rect(s['x'], s['y'], s['w'] + 6, s['d'] + 6)
    oc.rect(L.PITCHES['x'], L.PITCHES['y'], L.PITCHES['w'] + 4, L.PITCHES['d'] + 4)
    oc.rect(L.POOL['x'], L.POOL['y'], L.POOL['w'] + 8, L.POOL['d'] + 8)
    oc.rect(L.PARKING['x'], L.PARKING['y'], L.PARKING['w'] + 2, L.PARKING['d'] + 2)
    oc.rect(148, -4, 52, 46)                                    # quảng trường
    oc.rect(L.SIGN['x'], L.SIGN['y'], 44, 6)
    for lk in L.LAKES:
        oc.ellipses.append((lk['cx'], lk['cy'], lk['rx'] * 1.3 + 2, lk['ry'] * 1.3 + 2))
    for a, b in L.EDGES:
        (ax, ay), (bx, by) = L.NODES[a], L.NODES[b]
        oc.segments.append((ax, ay, bx, by, L.PATH_W / 2 + 1.5))
    for i in range(len(L.ROAD_LOOP)):
        (ax, ay), (bx, by) = L.ROAD_LOOP[i], L.ROAD_LOOP[(i + 1) % len(L.ROAD_LOOP)]
        oc.segments.append((ax, ay, bx, by, L.ROAD_W / 2 + L.SIDEWALK_W + 1))
    for road in L.OUTER_ROADS:
        for i in range(len(road) - 1):
            (ax, ay), (bx, by) = road[i], road[i + 1]
            oc.segments.append((ax, ay, bx, by, L.ROAD_W / 2 + 3))
    return oc


def inside_base(x, y, margin=6.0):
    b = L.BASE
    hx, hy = b['w'] / 2 - margin, b['h'] / 2 - margin
    dx, dy = abs(x - b['cx']), abs(y - b['cy'])
    if dx > hx or dy > hy:
        return False
    r = b['r']
    if dx > hx - r and dy > hy - r:
        return math.hypot(dx - (hx - r), dy - (hy - r)) <= r
    return True


def inside_campus(x, y):
    return -140 <= x <= 170 and -70 <= y <= 70


# ------------------------------------------------------------ đế + mặt đất
def base(coll):
    b = L.BASE
    g = Group('BASE')
    outline = rounded_rect(b['cx'], b['cy'], b['w'], b['h'], b['r'], seg=8)
    t = b['thickness']
    g.prism(outline, -t, 4.0, 'SoilDark')
    g.prism(outline, -t + 4.0, t - 4.6, 'Soil')
    g.prism(outline, -0.6, 0.6, 'GrassDark')
    g.prism(L.CAMPUS_INNER, 0.0, 0.06, 'Grass')
    g.finish(coll)


# ------------------------------------------------------------ đường
def roads(coll):
    g = Group('ROADS')
    loop = L.ROAD_LOOP
    g.ribbon(loop, L.ROAD_W, 0.0, 0.12, 'Asphalt', closed=True)
    off = L.ROAD_W / 2 + L.SIDEWALK_W / 2
    g.ribbon(offset_polyline(loop, off), L.SIDEWALK_W, 0.0, 0.22, 'Curb', closed=True)
    g.ribbon(offset_polyline(loop, -off), L.SIDEWALK_W, 0.0, 0.22, 'Curb', closed=True)
    for x, y, a in sample_polyline(loop, 9.0, closed=True):
        g.box(3.2, 0.28, 0.03, x, y, 0.12, 'RoadLine', rz=a)
    for road in L.OUTER_ROADS:
        g.ribbon(road, L.ROAD_W, 0.0, 0.12, 'Asphalt')
        for x, y, a in sample_polyline(road, 9.0, offset=4.0):
            g.box(3.2, 0.28, 0.03, x, y, 0.12, 'RoadLine', rz=a)
    rx, ry, rr = L.ROUNDABOUT
    g.cyl(rr + 6, 0.12, rx, ry, 0.0, 'Asphalt', seg=28)
    g.cyl(rr - 1.5, 0.5, rx, ry, 0.0, 'Curb', seg=24)
    g.cyl(rr - 2.2, 0.56, rx, ry, 0.0, 'Grass', seg=24)
    g.finish(coll)


# ------------------------------------------------------------ khu dân cư + văn phòng lân cận
def neighbourhood(coll, rng, trees):
    g = Group('NEIGHBOURHOOD')
    xs = [-245, -95, -20, 55, 140, 275]
    for i in range(len(xs) - 1):
        x0, x1 = xs[i] + 9, xs[i + 1] - 9
        for row_y, facing in ((-98, 0), (-122, math.pi), (-146, 0), (-168, math.pi)):
            x = x0
            while x < x1 - 7:
                w = rng.choice((7.0, 7.5, 8.0))
                d = rng.uniform(10, 13)
                hh = rng.choice((6.5, 7.5, 9.5))
                if not inside_base(x + w / 2, row_y, 10):
                    x += w + 0.4
                    continue
                if rng.random() < 0.12:            # khoảng sân trống có cây
                    trees.append(('round', x + w / 2, row_y, rng.uniform(0.8, 1.1)))
                    x += w + 1.0
                    continue
                g.box(w, d, hh, x + w / 2, row_y, 0, 'HouseWall')
                roof = 'RoofTile' if rng.random() < 0.7 else 'RoofTileDark'
                g.gable(d + 0.8, w + 0.6, 2.6, x + w / 2, row_y, hh, roof, rz=math.pi / 2)
                g.box(w * 0.6, 0.2, 1.2, x + w / 2, row_y - d / 2 if facing == 0 else row_y + d / 2, 2.6, 'Window')
                x += w + 0.4
    # cụm văn phòng phía Đông (FPT City)
    for (x, y, w, d, h) in ((225, 40, 30, 22, 26), (230, 90, 26, 26, 18), (228, -40, 34, 20, 14)):
        g.box(w, d, h, x, y, 0, 'WhiteWarm', bevel=0.3)
        for f in range(int(h / 3.6)):
            g.box(w + 0.2, d - 3, 1.6, x, y, 1.2 + f * 3.6, 'Window')
        g.box(w - 2, d - 2, 0.4, x, y, h, 'Concrete')
    g.finish(coll)


# ------------------------------------------------------------ hồ, bể bơi, sân bóng, quảng trường, bãi xe
def amenities(coll, meta):
    from .core import empty as _empty
    # Hồ (J)
    pj = _empty(f'BLD_{L.LAKE_ID}', coll)
    pj['buildingId'] = L.LAKE_ID
    w = Group('WATER_lake', pj)
    bank = Group('BLD_J_bank', pj)
    for lk in L.LAKES:
        pts = blob(lk['cx'], lk['cy'], lk['rx'], lk['ry'], seed=lk['seed'])
        outer = blob(lk['cx'], lk['cy'], lk['rx'] + 2.2, lk['ry'] + 2.2, seed=lk['seed'])
        bank.prism(outer, 0.0, 0.18, 'PavingWarm')
        w.prism(pts, 0.0, 0.24, 'Water')
        rng = random.Random(int(lk['seed'] * 100))
        for i in range(0, len(outer), 3):     # đá kè ven hồ
            x, y = outer[i]
            bank.ico(rng.uniform(0.5, 0.9), x, y, 0.2, 'Concrete', sz=0.6)
    w.finish(coll)
    bank.finish(coll)

    # Bể bơi (I)
    s = L.POOL
    pi = _empty(f"BLD_{s['id']}", coll)
    pi['buildingId'] = s['id']
    g = Group('BLD_I_body', pi)
    g.box(s['w'] + 7, s['d'] + 7, 0.3, s['x'], s['y'], 0, 'Paving')
    g.box(s['w'], s['d'], 0.34, s['x'], s['y'], 0, 'PoolWater')
    for k in range(1, 6):
        g.box(s['w'] - 1, 0.15, 0.02, s['x'], s['y'] - s['d'] / 2 + k * s['d'] / 6, 0.34, 'White')
    for k in range(5):                          # ô dù
        x = s['x'] - s['w'] / 2 + 3 + k * 6
        g.cyl(0.08, 2.4, x, s['y'] + s['d'] / 2 + 2.2, 0.3, 'Metal', seg=6)
        g.cone(1.6, 0.8, x, s['y'] + s['d'] / 2 + 2.2, 2.5, 'Orange' if k % 2 else 'White', seg=8)
    g.finish(coll)

    # Sân bóng (H): 4 sân
    s = L.PITCHES
    ph = _empty(f"BLD_{s['id']}", coll)
    ph['buildingId'] = s['id']
    g = Group('BLD_H_body', ph)
    g.box(s['w'] + 2, s['d'] + 2, 0.2, s['x'], s['y'], 0, 'GrassDark')
    fw, fd = s['w'] / 2 - 1.5, s['d'] / 2 - 1.5
    for sx in (-1, 1):
        for sy in (-1, 1):
            cx, cy = s['x'] + sx * (fw / 2 + 0.75), s['y'] + sy * (fd / 2 + 0.75)
            g.box(fw, fd, 0.26, cx, cy, 0, 'Pitch')
            lw = 0.18
            g.box(fw - 1, lw, 0.03, cx, cy - fd / 2 + 0.5, 0.26, 'PitchLine')
            g.box(fw - 1, lw, 0.03, cx, cy + fd / 2 - 0.5, 0.26, 'PitchLine')
            g.box(lw, fd - 1, 0.03, cx - fw / 2 + 0.5, cy, 0.26, 'PitchLine')
            g.box(lw, fd - 1, 0.03, cx + fw / 2 - 0.5, cy, 0.26, 'PitchLine')
            g.box(lw, fd - 1, 0.03, cx, cy, 0.26, 'PitchLine')
            g.cyl(2.6, 0.03, cx, cy, 0.26, 'PitchLine', seg=20)
            g.cyl(2.4, 0.035, cx, cy, 0.26, 'Pitch', seg=20)
            for gx in (-1, 1):                  # khung thành
                g.box(0.15, 3.0, 1.2, cx + gx * (fw / 2 - 0.7), cy, 0.26, 'White')
    for k in range(0, int(s['w']) + 1, 6):      # cột lưới rào
        for yy in (s['y'] - s['d'] / 2 - 1, s['y'] + s['d'] / 2 + 1):
            g.cyl(0.08, 4.0, s['x'] - s['w'] / 2 + k, yy, 0.2, 'Metal', seg=5)
    g.finish(coll)

    # Quảng trường (K) + cột cờ 3 màu FPT
    s = L.PLAZA
    pk = _empty(f"BLD_{s['id']}", coll)
    pk['buildingId'] = s['id']
    g = Group('BLD_K_body', pk)
    g.prism(s['pts'], 0.0, 0.14, 'PavingWarm')
    for i, col in enumerate(('Orange', 'Blue', 'Green')):
        x, y = 160 + i * 4, 12
        g.cyl(0.12, 11, x, y, 0.14, 'Metal', seg=6)
        g.box(2.8, 0.08, 1.7, x + 1.45, y, 9.1, col)
    g.cyl(4.0, 0.6, 150, -8, 0.14, 'Curb', seg=24)          # đài phun nước
    g.cyl(3.4, 0.55, 150, -8, 0.3, 'PoolWater', seg=24)
    g.cyl(0.5, 2.2, 150, -8, 0.3, 'White', seg=10)
    g.finish(coll)

    # Bãi xe (L) + mái che
    s = L.PARKING
    pl = _empty(f"BLD_{s['id']}", coll)
    pl['buildingId'] = s['id']
    g = Group('BLD_L_body', pl)
    g.box(s['w'], s['d'], 0.14, s['x'], s['y'], 0, 'Asphalt')
    rng = random.Random(5)
    cars = ('CarRed', 'CarBlue', 'CarWhite', 'CarDark', 'CarWhite')
    for side in (-1, 1):
        for k in range(10):
            y = s['y'] - s['d'] / 2 + 3 + k * 5.2
            x = s['x'] + side * (s['w'] / 2 - 5)
            g.box(5.5, 0.15, 0.02, x, y - 2.6, 0.14, 'RoadLine')
            if rng.random() < 0.7:
                c = rng.choice(cars)
                g.box(4.2, 1.9, 0.8, x, y, 0.45, c, bevel=0.15)
                g.box(2.3, 1.7, 0.6, x - 0.2, y, 1.25, 'Window', bevel=0.1)
            if k % 2 == 0:
                g.cyl(0.12, 3.2, x + side * 3.2, y, 0.14, 'Metal', seg=6)
        g.box(9, s['d'] - 2, 0.15, s['x'] + side * (s['w'] / 2 - 4.2), s['y'], 3.35, 'Canopy')
    g.finish(coll)

    meta['banner'] = {'pos': to_three(150, -27, 0), 'rotY': 0.0}


# ------------------------------------------------------------ lối đi bộ (từ đồ thị waypoint)
def walkways(coll):
    g = Group('WALKWAYS')
    for a, b in L.EDGES:
        g.ribbon([L.NODES[a], L.NODES[b]], L.PATH_W, 0.0, 0.1, 'Paving')
    for name, (x, y) in L.NODES.items():
        g.cyl(L.PATH_W * 0.75, 0.11, x, y, 0.0, 'Paving', seg=14)
    g.finish(coll)


# ------------------------------------------------------------ chữ FPT UNIVERSITY
def sign(coll):
    import bpy
    s = L.SIGN
    cu = bpy.data.curves.new('SIGN_text', 'FONT')
    cu.body = s['text']
    cu.size = s['size']
    cu.extrude = 0.45
    cu.align_x = 'CENTER'
    tmp = bpy.data.objects.new('SIGN_tmp', cu)
    coll.objects.link(tmp)
    tmp.rotation_euler = (math.pi / 2, 0, s['rz'])
    tmp.location = (s['x'], s['y'], 0.6)
    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(deps))
    me.transform(tmp.matrix_world)
    from .core import get_mat
    me.materials.clear()
    me.materials.append(get_mat('Orange'))
    ob = bpy.data.objects.new('SIGN_FPT', me)
    coll.objects.link(ob)
    bpy.data.objects.remove(tmp)
    bpy.data.curves.remove(cu)
    g = Group('SIGN_base')
    g.box(len(s['text']) * s['size'] * 0.72, 2.0, 0.6, s['x'], s['y'] + 0.2, 0, 'White', bevel=0.15)
    g.finish(coll)


# ------------------------------------------------------------ cây + đèn
def plant_trees(coll, rng, occ, extra):
    trees = list(extra)
    # cây đường phố quanh đường bao
    for side in (1, -1):
        line = offset_polyline(L.ROAD_LOOP, side * (L.ROAD_W / 2 + L.SIDEWALK_W + 1.8))
        for x, y, _ in sample_polyline(line, 10.0, closed=True, offset=3.0 if side > 0 else 8.0):
            kind = 'flower' if (side < 0 and rng.random() < 0.25) else 'round'
            trees.append((kind, x, y, rng.uniform(0.8, 1.0)))
    # rừng phía Bắc + rải rác ngoài khuôn viên
    for _ in range(4200):
        x = rng.uniform(-255, 275)
        y = rng.uniform(-185, 170)
        if not inside_base(x, y, 5) or inside_campus(x, y) or not occ.free(x, y):
            continue
        north = y > 95
        if not north and rng.random() > 0.18:
            continue
        if -180 < y < -88 and rng.random() > 0.35:
            continue
        kind = 'pine' if (north and rng.random() < 0.35) else ('dark' if north else 'round')
        trees.append((kind, x, y, rng.uniform(0.85, 1.35) if north else rng.uniform(0.7, 1.0)))
    # cây trong khuôn viên
    for _ in range(1400):
        x, y = rng.uniform(-142, 170), rng.uniform(-72, 72)
        if not occ.free(x, y):
            continue
        r = rng.random()
        kind = 'flower' if r < 0.18 else ('pink' if r < 0.24 else 'round')
        trees.append((kind, x, y, rng.uniform(0.7, 1.05)))
    # bỏ cây quá sát nhau
    kept, grid = [], {}
    for t in trees:
        cx, cy = int(t[1] // 3.2), int(t[2] // 3.2)
        if any((cx + i, cy + j) in grid for i in (-1, 0, 1) for j in (-1, 0, 1)):
            continue
        grid[(cx, cy)] = True
        kept.append(t)

    leaf = Group('TREES_foliage')
    trunk = Group('TREES_trunks')
    for kind, x, y, s in kept:
        if kind == 'pine':
            trunk.cyl(0.3 * s, 2.0 * s, x, y, 0, 'Trunk', seg=5)
            leaf.cone(2.6 * s, 4.2 * s, x, y, 1.6 * s, 'FoliageDark', seg=7)
            leaf.cone(1.9 * s, 3.4 * s, x, y, 4.0 * s, 'FoliageDark', seg=7)
        else:
            mat = {'round': 'Foliage', 'dark': 'FoliageDark', 'flower': 'FoliageOrange', 'pink': 'FoliagePink'}[kind]
            trunk.cyl(0.28 * s, 3.0 * s, x, y, 0, 'Trunk', seg=5)
            leaf.ico(2.3 * s, x, y, 4.2 * s, mat, sub=1, sz=rng.uniform(0.8, 1.0))
            if rng.random() < 0.4:
                leaf.ico(1.4 * s, x + rng.uniform(-1, 1), y + rng.uniform(-1, 1), 5.6 * s, mat, sub=1)
    leaf.finish(coll)
    trunk.finish(coll)
    return len(kept)


def lamps(coll):
    g = Group('LAMPS')
    pos = []

    def lamp(x, y):
        g.cyl(0.12, 4.6, x, y, 0, 'Metal', seg=6)
        g.box(1.2, 0.25, 0.2, x + 0.5, y, 4.5, 'Metal')
        g.ico(0.38, x + 1.0, y, 4.35, 'LampBulb', sub=1)
        pos.append(to_three(x + 1.0, y, 4.2))

    for a, b in L.EDGES:
        (ax, ay), (bx, by) = L.NODES[a], L.NODES[b]
        length = math.dist((ax, ay), (bx, by))
        n = max(1, int(length // 22))
        dx, dy = (bx - ax) / length, (by - ay) / length
        for k in range(n):
            t = (k + 0.5) / n
            lamp(ax + (bx - ax) * t - dy * 3.0, ay + (by - ay) * t + dx * 3.0)
    inner = offset_polyline(L.ROAD_LOOP, L.ROAD_W / 2 + L.SIDEWALK_W - 0.6)
    for x, y, _ in sample_polyline(inner, 26.0, closed=True, offset=6.0):
        lamp(x, y)
    g.finish(coll)
    return pos
