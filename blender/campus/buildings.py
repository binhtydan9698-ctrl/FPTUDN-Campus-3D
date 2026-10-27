"""Các tòa nhà chính. Mỗi tòa là một Empty `BLD_<id>` chứa các mesh con — web dựa vào tên này để bấm chọn."""
import math
import random
from mathutils import Matrix
from .core import Group, empty
from . import layout as L

FLOOR = 3.8


def _rot(dx, dy, a):
    c, s = math.cos(a), math.sin(a)
    return dx * c - dy * s, dx * s + dy * c


def _parent(coll, bid, x, y, kind):
    ob = empty(f'BLD_{bid}', coll)
    ob['buildingId'] = bid
    ob['kind'] = kind
    ob['anchor'] = [x, y]
    return ob


def _facade_bands(g, x, y, z0, w, d, floors, fh, mat='Window', inset=1.2, band=0.55):
    """Dải cửa sổ theo từng tầng trên cả 4 mặt."""
    for f in range(floors):
        z = z0 + f * fh + fh * (1 - band) * 0.55
        h = fh * band
        g.box(w - 2 * inset, 0.3, h, x, y - d / 2, z, mat)
        g.box(w - 2 * inset, 0.3, h, x, y + d / 2, z, mat)
        g.box(0.3, d - 2 * inset, h, x - w / 2, y, z, mat)
        g.box(0.3, d - 2 * inset, h, x + w / 2, y, z, mat)


def _green_dots(g, rng, x, y, z0, w, d, h, n):
    """Bồn cây treo trên mặt đứng (giống phối cảnh: mảng xanh xen trên tường trắng)."""
    for _ in range(n):
        side = rng.randrange(4)
        zz = z0 + rng.uniform(2.0, h - 2.5)
        if side < 2:
            px = x + rng.uniform(-w / 2 + 2, w / 2 - 2)
            py = y + (-d / 2 - 0.35 if side == 0 else d / 2 + 0.35)
            g.box(1.6, 0.7, 0.9, px, py, zz, 'Green')
        else:
            px = x + (-w / 2 - 0.35 if side == 2 else w / 2 + 0.35)
            py = y + rng.uniform(-d / 2 + 2, d / 2 - 2)
            g.box(0.7, 1.6, 0.9, px, py, zz, 'Green')


def _roof_garden(g, x, y, z, w, d, grid=3, line=0.35):
    g.box(w - 1.0, d - 1.0, 0.5, x, y, z, 'RoofGrass')
    for i in range(1, grid):
        g.box(line, d - 1.0, 0.56, x - w / 2 + 0.5 + i * (w - 1) / grid, y, z, 'RoofLine')
        g.box(w - 1.0, line, 0.56, x, y - d / 2 + 0.5 + i * (d - 1) / grid, z, 'RoofLine')


def tower(coll):
    t = L.TOWER
    x, y, w, d = t['x'], t['y'], t['w'], t['d']
    p = _parent(coll, t['id'], x, y, 'tower')
    g = Group('BLD_A_body', p)
    plant = Group('BLD_A_plants', p)
    rng = random.Random(7)

    # khối đế: sảnh kính 2 tầng, khung trắng, mái đua màu gỗ
    g.box(w + 6, d + 6, 0.6, x, y, 0, 'Paving')
    g.box(w - 3, d - 3, t['podium_h'] - 1.2, x, y, 0.6, 'Window')
    for sx in (-1, 1):
        for sy in (-1, 1):
            g.box(1.4, 1.4, t['podium_h'] - 1.2, x + sx * (w / 2 - 2.2), y + sy * (d / 2 - 2.2), 0.6, 'White')
    g.box(w + 2, d + 2, 1.0, x, y, t['podium_h'] - 0.6, 'White', bevel=0.25)
    g.box(14, 5, 0.5, x, y - d / 2 - 3.5, 4.2, 'Orange')                 # mái sảnh cam FPT
    for sx in (-6, 6):
        g.cyl(0.25, 3.6, x + sx, y - d / 2 - 5.2, 0.6, 'White', seg=8)

    # các tầng xếp so le (đặc trưng tòa tháp trong ảnh 2)
    offs = [(0, 0), (4, -2), (-3, 3), (5, 1), (-4, -3), (3, 4), (-5, 0), (4, -3), (0, 2)]
    z = t['podium_h'] + 0.4
    sh = t['slab_h']
    for i in range(t['slabs']):
        rz = (math.pi / 2) if i % 2 else 0.0
        ox, oy = offs[i % len(offs)]
        cx, cy = x + ox, y + oy
        sw, sd = w, d * 0.82
        g.box(sw, sd, 0.35, cx, cy, z, 'Wood', rz=rz)                     # trần gỗ
        g.box(sw, sd, 0.8, cx, cy, z + 0.35, 'White', rz=rz, bevel=0.2)   # sàn
        g.box(sw - 2.4, sd - 2.4, sh - 1.6, cx, cy, z + 1.15, 'Window', rz=rz)
        g.box(sw, sd, 0.45, cx, cy, z + sh - 0.45, 'White', rz=rz)
        # tấm lam hoa văn che nắng trên mặt dài (xen kẽ trước/sau)
        side = 1 if i % 3 else -1
        px, py = _rot(0, side * (sd / 2 + 0.25), rz)
        g.box(sw * 0.62, 0.5, sh - 1.4, cx + px, cy + py, z + 1.15, 'WhiteWarm', rz=rz)
        if i % 4 == 1:  # dải nhấn cam
            px, py = _rot(0, -side * (sd / 2 + 0.2), rz)
            g.box(sw * 0.3, 0.4, 0.6, cx + px - 6, cy + py, z + sh - 1.2, 'Orange', rz=rz)
        # cây trên sân thượng ở các góc lộ ra
        if i < t['slabs'] - 1:
            for kx, ky in ((1, 1), (-1, -1), (1, -1), (-1, 1)):
                if rng.random() < 0.55:
                    lx, ly = _rot(kx * (sw / 2 - 2.0), ky * (sd / 2 - 2.0), rz)
                    plant.box(2.4, 2.4, 0.8, cx + lx, cy + ly, z + sh, 'Concrete')
                    plant.cyl(0.15, 1.2, cx + lx, cy + ly, z + sh + 0.8, 'Trunk', seg=6)
                    plant.ico(rng.uniform(1.2, 1.7), cx + lx, cy + ly, z + sh + 2.5, 'Foliage', sz=0.8)
        z += sh

    # vương miện + giếng trời
    g.box(w * 0.9, w * 0.9, 5.5, x, y, z, 'White', bevel=0.3)
    g.box(w * 0.9 - 2, w * 0.9 - 2, 3.6, x, y, z + 0.9, 'Window')
    g.box(w * 0.9 + 0.4, w * 0.9 + 0.4, 0.6, x, y, z + 5.5, 'Concrete')
    g.box(10, 10, 0.8, x, y, z + 6.1, 'Glass')
    g.box(3, 3, 3, x - 10, y + 8, z + 6.1, 'Concrete')                   # tum thang
    g.finish(coll)
    plant.finish(coll)
    return p, z + 7


def academic(coll, spec, seed):
    x, y, w, d, n = spec['x'], spec['y'], spec['w'], spec['d'], spec['floors']
    p = _parent(coll, spec['id'], x, y, 'academic')
    g = Group(f"BLD_{spec['id']}_body", p)
    rng = random.Random(seed)
    h = n * FLOOR
    g.box(w + 4, d + 4, 0.5, x, y, 0, 'Paving')
    g.box(w, d, h + 0.5, x, y, 0.5, 'White', bevel=0.4)
    _facade_bands(g, x, y, 0.5, w, d, n, FLOOR)
    _green_dots(g, rng, x, y, 0.5, w, d, h, 70)
    # sảnh vào + cột nhấn cam ở góc
    g.box(12, 4.5, 0.5, x, y - d / 2 - 2.2, 4.4, 'Orange')
    g.box(10, 0.4, 3.8, x, y - d / 2 - 0.1, 0.5, 'Glass')
    g.box(1.2, 1.2, h + 1.5, x + w / 2 - 0.4, y - d / 2 + 0.4, 0.5, 'Orange')
    # mái xanh chia ô + giếng trời kính dạng mái dốc
    top = h + 1.0
    _roof_garden(g, x, y, top, w, d)
    g.gable(w / 3 - 1, d / 3 - 1, 3.2, x, y, top + 0.5, 'Glass', rz=math.pi / 2)
    g.finish(coll)
    return p, top + 4


def dorm(coll, spec, seed):
    p = _parent(coll, spec['id'], spec['x'], spec['y'], 'dorm')
    g = Group(f"BLD_{spec['id']}_body", p)
    rng = random.Random(seed)
    s, n = spec['size'], spec['floors']
    fh = 3.4
    h = n * fh
    prev = None
    for dx, dy in spec['modules']:
        x, y = spec['x'] + dx, spec['y'] + dy
        g.box(s, s, h + 0.4, x, y, 0, 'White', bevel=0.3)
        _facade_bands(g, x, y, 0.4, s, s, n, fh, inset=1.0, band=0.5)
        _green_dots(g, rng, x, y, 0.4, s, s, h, 14)
        _roof_garden(g, x, y, h + 0.4, s, s, grid=2)
        g.box(5, 4, 2.6, x + rng.uniform(-4, 4), y + rng.uniform(-4, 4), h + 0.9, 'Concrete')
        if prev:  # khối nối thấp giữa hai module
            mx, my = (prev[0] + x) / 2, (prev[1] + y) / 2
            g.box(6, 8, 7.0, mx, my, 0, 'WhiteWarm')
            g.box(6.2, 8.2, 0.4, mx, my, 7.0, 'Orange')
        prev = (x, y)
    g.finish(coll)
    return p, h + 4


def sports_hall(coll):
    s = L.SPORTS_HALL
    x, y, w, d, h = s['x'], s['y'], s['w'], s['d'], s['h']
    p = _parent(coll, s['id'], x, y, 'sports')
    g = Group('BLD_F_body', p)
    g.box(w + 4, d + 4, 0.5, x, y, 0, 'Paving')
    g.box(w - 1.5, d - 1.5, h, x, y, 0.5, 'Window')
    # lam đứng trắng bao quanh (mặt đứng đục lỗ trong ảnh 3)
    step = 1.7
    for i in range(int(w / step) + 1):
        px = x - w / 2 + i * step
        g.box(0.6, 0.9, h - 2.5, px, y - d / 2, 2.5, 'White')
        g.box(0.6, 0.9, h - 2.5, px, y + d / 2, 2.5, 'White')
    for i in range(int(d / step) + 1):
        py = y - d / 2 + i * step
        g.box(0.9, 0.6, h - 2.5, x - w / 2, py, 2.5, 'White')
        g.box(0.9, 0.6, h - 2.5, x + w / 2, py, 2.5, 'White')
    g.box(w + 1.5, d + 1.5, 1.2, x, y, h + 0.5, 'White', bevel=0.3)
    g.box(w - 1, d - 1, 0.6, x, y, h + 1.7, 'RoofGray')
    g.box(8, 8, 0.9, x, y, h + 2.0, 'Glass')
    g.box(9, 0.5, 1.6, x, y - d / 2 - 0.6, h - 1.6, 'Orange')
    g.finish(coll)
    return p, h + 3


def small_block(coll):
    s = L.SMALL_BLOCK
    x, y, w, d, h = s['x'], s['y'], s['w'], s['d'], s['h']
    p = _parent(coll, s['id'], x, y, 'service')
    g = Group('BLD_G_body', p)
    g.box(w + 3, d + 3, 0.4, x, y, 0, 'Paving')
    # chữ U ôm sân trong
    g.box(w, 8, h, x, y + d / 2 - 4, 0.4, 'White', bevel=0.3)
    g.box(8, d - 8, h, x - w / 2 + 4, y - 4, 0.4, 'White', bevel=0.3)
    g.box(8, d - 8, h * 0.7, x + w / 2 - 4, y - 4, 0.4, 'White', bevel=0.3)
    _facade_bands(g, x, y + d / 2 - 4, 0.4, w, 8, 3, h / 3, inset=0.8)
    g.box(w - 1, 7, 0.5, x, y + d / 2 - 4, h + 0.4, 'RoofGrass')
    g.box(7, d - 9, 0.5, x - w / 2 + 4, y - 4, h + 0.4, 'RoofGrass')
    g.box(7, d - 9, 0.5, x + w / 2 - 4, y - 4, h * 0.7 + 0.4, 'RoofGrass')
    g.ico(2.2, x + 1, y - 2, 3.5, 'Foliage', sz=0.9)
    g.cyl(0.25, 2.5, x + 1, y - 2, 0.4, 'Trunk', seg=6)
    g.finish(coll)
    return p, h + 2


def build_all(coll):
    """Trả về {id: chiều cao gần đúng} để web đặt nhãn."""
    heights = {}
    _, heights['A'] = tower(coll)
    for i, spec in enumerate(L.ACADEMIC):
        _, heights[spec['id']] = academic(coll, spec, 11 + i)
    for i, spec in enumerate(L.DORMS):
        _, heights[spec['id']] = dorm(coll, spec, 21 + i)
    _, heights['F'] = sports_hall(coll)
    _, heights['G'] = small_block(coll)
    return heights
