"""Bố cục khuôn viên (mét, tọa độ Blender: X = Đông, Y = Bắc).

Ước lượng từ mặt bằng tham khảo (ảnh 1). Muốn dời/đổi kích thước công trình: sửa ở đây rồi chạy `npm run model`.
"""
from .core import rounded_rect

# Đế diorama
BASE = dict(cx=10.0, cy=-8.0, w=520.0, h=350.0, r=34.0, thickness=14.0)

# Đường bao quanh khuôn viên (tim đường) và bề rộng
ROAD_LOOP = rounded_rect(15.0, 0.0, 336.0, 166.0, 22.0, seg=5)
ROAD_W = 11.0
SIDEWALK_W = 3.5

# Các tuyến đường phụ bên ngoài: polyline (tim đường)
OUTER_ROADS = [
    [(-245, -83), (275, -83)],                 # đường Nam chạy suốt đế
    [(-153, 83), (-153, 172 - 8)],             # nhánh Bắc phía Tây
    [(183, 83), (205, 150)],                   # nhánh Đông Bắc
    [(-95, -83), (-95, -183)],                 # các ngõ khu dân cư phía Nam
    [(-20, -83), (-20, -183)],
    [(55, -83), (55, -183)],
    [(140, -83), (140, -183)],
    [(183, 0), (275, 0)],                      # nhánh Đông
]
ROUNDABOUT = (183.0, -83.0, 9.0)

# Khung khuôn viên bên trong đường bao (thảm cỏ)
CAMPUS_INNER = rounded_rect(15.0, 0.0, 336.0 - ROAD_W - 2 * SIDEWALK_W, 166.0 - ROAD_W - 2 * SIDEWALK_W, 16.0)

# --- Công trình. id khớp cột "Mã" trong Excel; đối tượng 3D tên BLD_<id>
TOWER = dict(id='A', x=117.0, y=26.0, w=36.0, d=30.0, podium_h=9.0, slabs=9, slab_h=4.6)
ACADEMIC = [
    dict(id='B', x=27.0, y=-34.0, w=48.0, d=46.0, floors=5),
    dict(id='C', x=100.0, y=-42.0, w=48.0, d=46.0, floors=5),
]
DORMS = [
    # dãy module so le: (dx, dy) tương đối so với điểm gốc
    dict(id='D', x=-118.0, y=52.0, modules=[(0, 0), (19, -6), (38, 0), (57, -6), (76, 0)], size=18.0, floors=5),
    dict(id='E', x=-20.0, y=52.0, modules=[(0, -6), (19, 0), (38, -6), (57, 0)], size=18.0, floors=5),
]
SPORTS_HALL = dict(id='F', x=-116.0, y=-44.0, w=38.0, d=40.0, h=15.0)
SMALL_BLOCK = dict(id='G', x=-48.0, y=18.0, w=24.0, d=24.0, h=11.0)
PITCHES = dict(id='H', x=-54.0, y=-50.0, w=58.0, d=42.0)
POOL = dict(id='I', x=-40.0, y=-20.0, w=30.0, d=13.0)
LAKES = [
    dict(cx=-90.0, cy=8.0, rx=24.0, ry=21.0, seed=1.3),
    dict(cx=-8.0, cy=20.0, rx=17.0, ry=8.0, seed=2.7),
    dict(cx=60.0, cy=38.0, rx=7.0, ry=26.0, seed=0.4),
]
LAKE_ID = 'J'
PLAZA = dict(id='K', pts=[(136, 10), (166, 18), (172, -24), (128, -24), (128, -6)])
PARKING = dict(id='L', x=84.0, y=44.0, w=26.0, d=56.0)

# Chữ cảnh quan gần cổng Đông Nam
SIGN = dict(text='FPT UNIVERSITY', x=150.0, y=-66.0, size=3.2, rz=0.0)

# --- Mạng lối đi bộ (đồ thị waypoint): đỉnh và cạnh. Dùng để vừa dựng lối lát gạch vừa xuất cho người đi bộ trên web.
NODES = {
    'gateS':   (172, -50), 'plaza':   (146, -6), 'towerS':  (117, 6),  'parkE':  (84, 12),
    'midE':    (64, -10),  'acadB_N': (27, -8),  'acadC_N': (100, -16), 'acadBC': (64, -40),
    'poolE':   (-20, -8),  'lakeS':   (-68, -10), 'hallE':   (-92, -40), 'pitchN': (-54, -27),
    'dormDS':  (-90, 36),  'dormES':  (0, 36),   'lakeE':   (-48, 32), 'center': (20, 14),
    'gateW':   (-140, -8), 'acadB_NW': (-3, -8), 'acadB_W': (-6, -40), 'towerW': (93, 8),
    'hallN':   (-122, -20), 'dormDW':  (-136, 34),
}
EDGES = [
    ('gateS', 'plaza'), ('plaza', 'towerS'), ('towerS', 'towerW'), ('towerW', 'parkE'),
    ('towerW', 'midE'), ('midE', 'acadC_N'), ('midE', 'acadBC'), ('midE', 'center'),
    ('acadB_N', 'center'), ('acadB_N', 'acadB_NW'), ('acadB_NW', 'acadB_W'), ('acadB_NW', 'poolE'),
    ('center', 'dormES'), ('center', 'poolE'), ('poolE', 'lakeS'), ('lakeS', 'hallE'),
    ('lakeS', 'pitchN'), ('pitchN', 'poolE'), ('lakeS', 'hallN'), ('hallE', 'hallN'), ('hallN', 'gateW'),
    ('lakeE', 'dormES'), ('lakeE', 'dormDS'), ('dormDS', 'dormDW'), ('dormDW', 'gateW'),
    ('acadC_N', 'plaza'),
]
PATH_W = 4.0
