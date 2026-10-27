"""Công cụ dựng hình dùng chung: vật liệu, nhóm lưới (gom nhiều khối vào một mesh) và các khối cơ bản.

Quy ước tọa độ Blender: X = Đông, Y = Bắc, Z = lên, 1 đơn vị = 1 mét.
Khi xuất glTF, Blender tự đổi sang Y-up của Three.js: (x, y, z)_blender -> (x, z, -y)_three.
"""
import math
import bpy
import bmesh
from mathutils import Matrix, Vector

# ---------------------------------------------------------------- vật liệu
# Tên vật liệu là "hợp đồng" với web: web tìm theo tên để gắn shader gió, nước, đèn đêm...
PALETTE = {
    'White':       ((0.95, 0.95, 0.93), 0.65, 0.0),
    'WhiteWarm':   ((0.93, 0.90, 0.85), 0.70, 0.0),
    'Concrete':    ((0.78, 0.77, 0.75), 0.85, 0.0),
    'Orange':      ((0.953, 0.439, 0.129), 0.45, 0.0),   # cam FPT #F37021
    'Blue':        ((0.0, 0.40, 0.70), 0.45, 0.0),       # xanh FPT #0066B3
    'Green':       ((0.427, 0.702, 0.247), 0.70, 0.0),   # xanh lá FPT #6DB33F
    'RoofGrass':   ((0.45, 0.70, 0.30), 0.95, 0.0),
    'RoofLine':    ((0.86, 0.90, 0.80), 0.80, 0.0),
    'RoofGray':    ((0.55, 0.57, 0.60), 0.60, 0.2),
    'Glass':       ((0.55, 0.78, 0.90), 0.08, 0.1),
    'Window':      ((0.42, 0.62, 0.78), 0.10, 0.1),       # web cho phát sáng ban đêm
    'Wood':        ((0.70, 0.48, 0.30), 0.70, 0.0),
    'Grass':       ((0.50, 0.74, 0.32), 1.00, 0.0),
    'GrassDark':   ((0.36, 0.60, 0.25), 1.00, 0.0),
    'Pitch':       ((0.30, 0.66, 0.30), 0.95, 0.0),
    'PitchLine':   ((0.97, 0.97, 0.97), 0.80, 0.0),
    'Paving':      ((0.88, 0.86, 0.82), 0.90, 0.0),
    'PavingWarm':  ((0.85, 0.78, 0.68), 0.90, 0.0),
    'Asphalt':     ((0.28, 0.30, 0.34), 0.90, 0.0),
    'RoadLine':    ((0.98, 0.98, 0.95), 0.70, 0.0),
    'Curb':        ((0.80, 0.80, 0.78), 0.85, 0.0),
    'Water':       ((0.20, 0.62, 0.70), 0.05, 0.0),       # web thay bằng shader nước
    'PoolWater':   ((0.25, 0.75, 0.90), 0.05, 0.0),
    'Foliage':     ((0.36, 0.66, 0.30), 0.90, 0.0),       # web gắn shader gió
    'FoliageDark': ((0.22, 0.48, 0.24), 0.90, 0.0),
    'FoliageOrange': ((0.98, 0.55, 0.20), 0.90, 0.0),
    'FoliagePink': ((0.96, 0.62, 0.72), 0.90, 0.0),
    'Trunk':       ((0.45, 0.32, 0.22), 0.90, 0.0),
    'Soil':        ((0.55, 0.40, 0.28), 1.00, 0.0),
    'SoilDark':    ((0.40, 0.28, 0.20), 1.00, 0.0),
    'Metal':       ((0.35, 0.37, 0.40), 0.40, 0.8),
    'LampBulb':    ((1.00, 0.92, 0.70), 0.30, 0.0),       # web cho phát sáng ban đêm
    'RoofTile':    ((0.72, 0.36, 0.26), 0.85, 0.0),
    'RoofTileDark': ((0.45, 0.30, 0.28), 0.85, 0.0),
    'HouseWall':   ((0.93, 0.88, 0.78), 0.85, 0.0),
    'Canopy':      ((0.85, 0.92, 0.96), 0.20, 0.0),
    'CarRed':      ((0.85, 0.20, 0.20), 0.35, 0.3),
    'CarBlue':     ((0.20, 0.40, 0.80), 0.35, 0.3),
    'CarWhite':    ((0.92, 0.92, 0.92), 0.35, 0.3),
    'CarDark':     ((0.15, 0.16, 0.18), 0.35, 0.3),
}


def get_mat(name):
    m = bpy.data.materials.get(name)
    if m:
        return m
    color, rough, metal = PALETTE[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if name in ('Glass', 'Canopy'):
        bsdf.inputs['Alpha'].default_value = 0.55
        if hasattr(m, 'surface_render_method'):
            m.surface_render_method = 'BLENDED'
    m.diffuse_color = (*color, 1.0)
    return m


# ---------------------------------------------------------------- nhóm lưới
class Group:
    """Gom nhiều khối hình vào một mesh duy nhất (nhiều material slot) để giảm draw call trên web."""

    def __init__(self, name, parent=None):
        self.name = name
        self.parent = parent
        self.bm = bmesh.new()
        self.mats = []

    def _mi(self, mat):
        if mat not in self.mats:
            self.mats.append(mat)
        return self.mats.index(mat)

    def _paint(self, verts, mat):
        idx = self._mi(mat)
        faces = {f for v in verts for f in v.link_faces}
        for f in faces:
            f.material_index = idx
        return faces

    # --- khối hộp; (x, y, z) là tâm đáy
    def box(self, sx, sy, sz, x, y, z, mat, rz=0.0, bevel=0.0):
        M = Matrix.Translation((x, y, z + sz / 2)) @ Matrix.Rotation(rz, 4, 'Z') @ Matrix.Diagonal((sx, sy, sz, 1))
        verts = bmesh.ops.create_cube(self.bm, size=1.0, matrix=M)['verts']
        if bevel > 0:
            edges = list({e for v in verts for e in v.link_edges})
            try:
                res = bmesh.ops.bevel(self.bm, geom=edges, offset=min(bevel, sx / 3, sy / 3, sz / 3),
                                      offset_type='OFFSET', segments=1, profile=0.5, affect='EDGES')
                verts = [v for v in set(verts) | set(res.get('verts', [])) if v.is_valid]
                verts += [v for f in res.get('faces', []) if f.is_valid for v in f.verts]
            except Exception:  # bevel chỉ để trang trí — lỗi thì bỏ qua
                verts = [v for v in verts if v.is_valid]
        self._paint(verts, mat)
        return self

    def boxm(self, M, mat):
        """Khối hộp đơn vị biến đổi bởi ma trận M (dùng cho mặt nghiêng, mái dốc)."""
        verts = bmesh.ops.create_cube(self.bm, size=1.0, matrix=M)['verts']
        self._paint(verts, mat)
        return self

    def gable(self, w, d, h, x, y, z, mat, rz=0.0):
        """Mái dốc hai mái (lăng trụ tam giác); nóc chạy dọc theo trục X cục bộ, đáy tại z."""
        M = Matrix.Translation((x, y, z)) @ Matrix.Rotation(rz, 4, 'Z')
        raw = [(-w / 2, -d / 2, 0), (w / 2, -d / 2, 0), (w / 2, 0, h), (-w / 2, 0, h),
               (-w / 2, d / 2, 0), (w / 2, d / 2, 0)]
        v = [self.bm.verts.new(M @ Vector(p)) for p in raw]
        idx = self._mi(mat)
        for f in [(v[0], v[1], v[2], v[3]), (v[5], v[4], v[3], v[2]), (v[0], v[3], v[4]),
                  (v[1], v[5], v[2]), (v[0], v[4], v[5], v[1])]:
            self.bm.faces.new(f).material_index = idx
        return self

    def cyl(self, r, h, x, y, z, mat, seg=12, r2=None):
        M = Matrix.Translation((x, y, z + h / 2))
        verts = bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=seg,
                                      radius1=r, radius2=r if r2 is None else r2, depth=h, matrix=M)['verts']
        self._paint(verts, mat)
        return self

    def cone(self, r, h, x, y, z, mat, seg=8):
        return self.cyl(r, h, x, y, z, mat, seg=seg, r2=0.0)

    def ico(self, r, x, y, z, mat, sub=1, sz=1.0):
        M = Matrix.Translation((x, y, z)) @ Matrix.Diagonal((r, r, r * sz, 1))
        verts = bmesh.ops.create_icosphere(self.bm, subdivisions=sub, radius=1.0, matrix=M)['verts']
        self._paint(verts, mat)
        return self

    def prism(self, pts, z0, h, mat):
        """Đa giác 2D (x, y) đùn lên theo trục Z."""
        # bảo đảm thứ tự ngược chiều kim đồng hồ (mặt trên hướng lên)
        area = sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1]
                   for i in range(len(pts)))
        if area < 0:
            pts = list(reversed(pts))
        idx = self._mi(mat)
        if h <= 0:
            f = self.bm.faces.new([self.bm.verts.new((x, y, z0)) for x, y in pts])
            f.material_index = idx
            return self
        bot = [self.bm.verts.new((x, y, z0)) for x, y in pts]
        top = [self.bm.verts.new((x, y, z0 + h)) for x, y in pts]
        faces = [self.bm.faces.new(top), self.bm.faces.new(list(reversed(bot)))]
        n = len(pts)
        for i in range(n):
            j = (i + 1) % n
            faces.append(self.bm.faces.new((bot[i], bot[j], top[j], top[i])))
        for f in faces:
            f.material_index = idx
        return self

    def ribbon(self, pts, width, z, h, mat, closed=False):
        """Dải băng (đường, lối đi) chạy theo polyline."""
        n = len(pts)
        left, right = [], []
        for i in range(n):
            p = Vector(pts[i])
            a = Vector(pts[i - 1]) if (i > 0 or closed) else None
            b = Vector(pts[(i + 1) % n]) if (i < n - 1 or closed) else None
            d1 = (p - a).normalized() if a is not None else None
            d2 = (b - p).normalized() if b is not None else None
            d = (d1 + d2) if (d1 is not None and d2 is not None) else (d1 if d1 is not None else d2)
            if d.length < 1e-6:
                d = d2 if d2 is not None else d1
            d.normalize()
            nrm = Vector((-d.y, d.x))
            scale = 1.0
            if d1 is not None and d2 is not None:
                scale = 1.0 / max(0.35, nrm.dot(Vector((-d1.y, d1.x))))
            off = nrm * (width / 2 * scale)
            left.append(p + off)
            right.append(p - off)
        segs = n if closed else n - 1
        for i in range(segs):
            j = (i + 1) % n
            quad = [right[i], right[j], left[j], left[i]]
            self.prism([(v.x, v.y) for v in quad], z, h, mat)
        return self

    def finish(self, collection):
        if not self.bm.verts:
            self.bm.free()
            return None
        bmesh.ops.remove_doubles(self.bm, verts=self.bm.verts, dist=0.0005)
        me = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(me)
        self.bm.free()
        for m in self.mats:
            me.materials.append(get_mat(m))
        ob = bpy.data.objects.new(self.name, me)
        collection.objects.link(ob)
        if self.parent is not None:
            ob.parent = self.parent
        return ob


# ---------------------------------------------------------------- tiện ích hình học
def rounded_rect(cx, cy, w, h, r, seg=6):
    """Các điểm (ngược chiều kim đồng hồ) của hình chữ nhật bo góc."""
    r = min(r, w / 2, h / 2)
    pts = []
    corners = [(cx + w / 2 - r, cy - h / 2 + r, -90), (cx + w / 2 - r, cy + h / 2 - r, 0),
               (cx - w / 2 + r, cy + h / 2 - r, 90), (cx - w / 2 + r, cy - h / 2 + r, 180)]
    for ox, oy, a0 in corners:
        for k in range(seg + 1):
            a = math.radians(a0 + 90 * k / seg)
            pts.append((ox + r * math.cos(a), oy + r * math.sin(a)))
    return pts


def blob(cx, cy, rx, ry, seed=0, n=28, wobble=0.18):
    """Đa giác mềm (hồ nước) bằng tổng sin để có bờ tự nhiên, ổn định theo seed."""
    pts = []
    for i in range(n):
        a = 2 * math.pi * i / n
        k = 1 + wobble * (math.sin(3 * a + seed) * 0.6 + math.sin(5 * a + seed * 2.1) * 0.4)
        pts.append((cx + rx * k * math.cos(a), cy + ry * k * math.sin(a)))
    return pts


def polyline_length(pts, closed=False):
    total = 0.0
    n = len(pts)
    for i in range(n if closed else n - 1):
        a, b = pts[i], pts[(i + 1) % n]
        total += math.dist(a, b)
    return total


def sample_polyline(pts, step, closed=False, offset=0.0):
    """Lấy điểm đều nhau dọc polyline, trả về [(x, y, góc hướng)]."""
    out = []
    n = len(pts)
    t = offset
    acc = 0.0
    for i in range(n if closed else n - 1):
        a, b = Vector(pts[i]), Vector(pts[(i + 1) % n])
        seg = (b - a).length
        if seg < 1e-6:
            continue
        d = (b - a) / seg
        while t <= acc + seg:
            p = a + d * (t - acc)
            out.append((p.x, p.y, math.atan2(d.y, d.x)))
            t += step
        acc += seg
    return out


def offset_polyline(pts, dist, closed=True):
    """Dời polyline sang trái một khoảng dist (âm = sang phải)."""
    out = []
    n = len(pts)
    for i in range(n):
        p = Vector(pts[i])
        a = Vector(pts[i - 1]) if (i > 0 or closed) else p
        b = Vector(pts[(i + 1) % n]) if (i < n - 1 or closed) else p
        d = (b - a)
        if d.length < 1e-6:
            d = Vector((1, 0))
        d.normalize()
        out.append(tuple(p + Vector((-d.y, d.x)) * dist))
    return out


def empty(name, collection, loc=(0, 0, 0), parent=None):
    ob = bpy.data.objects.new(name, None)
    ob.location = loc
    ob.empty_display_size = 4
    collection.objects.link(ob)
    if parent is not None:
        ob.parent = parent
    return ob


def to_three(x, y, z=0.0):
    """Tọa độ Blender -> Three.js (Y-up)."""
    return [round(x, 2), round(z, 2), round(-y, 2)]
