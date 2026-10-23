"""Build only map 9003: native earth texture, worn roads and independent props.

Run from any directory: python3 tools/maps/generate-wilderness-battlefield.py
Requires Pillow. Source images are local; no network or image generation at build time.
"""
from collections import deque
from pathlib import Path
import base64
import json
import math
import random

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageOps


ROOT = Path(__file__).resolve().parents[2] / 'src/client/maps/content/9003'
ASSETS = Path(__file__).resolve().parents[2] / 'public/app/maps/content/9003/assets'
SOURCE = ASSETS / 'source'
SIZE = 3584
SEED = 9003
CAMPS = {'song': {'x': 680, 'y': 2784}, 'jin': {'x': 2904, 'y': 800}}
CONTROL_PATHS = [
    [(680, 2784), (1000, 2700), (1260, 2444), (1792, 1792), (2324, 1140), (2584, 884), (2904, 800)],
    [(680, 2784), (650, 2600), (540, 2444), (460, 2364), (600, 1900), (1100, 1400), (1792, 900), (2120, 520), (2232, 599), (2324, 660), (2416, 721), (2600, 800), (2904, 800)],
    [(680, 2784), (1124, 2864), (1260, 2924), (1792, 2684), (2484, 2184), (2984, 1684), (3124, 1220), (3044, 1140), (2934, 984), (2904, 800)],
]
CONTROL_PATHS[2] = [(SIZE-x, SIZE-y) for x, y in reversed(CONTROL_PATHS[1])]
MARSHALS = {'song': {'x': 1000, 'y': 2610}, 'jin': {'x': 2584, 'y': 974}}
COMPOUNDS = {}
ARMY_SPAWNS = {}
for team in CAMPS:
    mirror = lambda x, y: (x, y) if team == 'song' else (SIZE-x, SIZE-y)
    cx, cy = mirror(900, 2684)
    vertices = {'N': (cx, cy-480), 'E': (cx+720, cy), 'S': (cx, cy+480), 'W': (cx-720, cy)}
    gate_directions = ['NE', 'SE', 'NW'] if team == 'song' else ['SW', 'SE', 'NW']
    gates = {}
    for direction in gate_directions:
        a, b = [vertices[d] for d in direction]
        x, y = (a[0]+b[0])/2, (a[1]+b[1])/2
        length = math.hypot(x-cx, y-cy)
        dx, dy = (x-cx)/length*110, (y-cy)/length*110
        gates[direction] = {'position': {'x': x, 'y': y},
                            'inside': {'x': x-dx, 'y': y-dy},
                            'outside': {'x': x+dx, 'y': y+dy}, 'width': 260}
    COMPOUNDS[team] = {'center': {'x': cx, 'y': cy}, 'radius': {'x': 720, 'y': 480},
                       'vertices': vertices, 'gates': gates,
                       'musterArea': {'left': 350 if team == 'song' else SIZE-1110,
                                      'right': 1110 if team == 'song' else SIZE-350,
                                      'top': 2720 if team == 'song' else SIZE-3120,
                                      'bottom': 3120 if team == 'song' else SIZE-2720},
                       'combatPlaza': {'center': MARSHALS[team], 'radius': {'x': 250, 'y': 150}}}
    ARMY_SPAWNS[team] = [dict(zip(('x', 'y'), mirror(620+(i%10)*24, 2780+(i//10)*18))) for i in range(100)]


def smooth_path(points):
    """Catmull-Rom centerline shared by road painting and route validation."""
    result = []
    for index in range(len(points) - 1):
        a, b, c, d = [points[max(0, min(len(points) - 1, j))]
                      for j in (index - 1, index, index + 1, index + 2)]
        steps = math.ceil(math.dist(b, c) / 7)
        for step in range(steps):
            t = step / steps
            result.append(tuple(round(.5 * (2*b[k] + (-a[k]+c[k])*t +
                (2*a[k]-5*b[k]+4*c[k]-d[k])*t*t +
                (-a[k]+3*b[k]-3*c[k]+d[k])*t*t*t), 2) for k in (0, 1)))
    return result + [points[-1]]


def texture_field(rng, size, strength):
    """Deterministic organic mask without a directional stroke or tile border."""
    noise = Image.frombytes('L', (size, size), bytes(rng.randrange(256) for _ in range(size*size)))
    return ImageEnhance.Contrast(noise.resize((SIZE, SIZE), Image.Resampling.BICUBIC)).enhance(strength)


def earth_surface(rng):
    texture = Image.open(SOURCE / 'neutral-earth.png').convert('RGB')
    # Overlapping, feathered native-resolution patches avoid a shared repeated border.
    ground = Image.new('RGB', (SIZE, SIZE), '#a28a66')
    patch_size, overlap = 640, 160
    feather = Image.new('L', (patch_size, patch_size), 255)
    for y in range(patch_size):
        for x in range(patch_size):
            edge = min(x, y, patch_size-1-x, patch_size-1-y)
            feather.putpixel((x, y), round(255 * min(1, edge / overlap)))
    for y in range(-overlap, SIZE, patch_size-overlap):
        for x in range(-overlap, SIZE, patch_size-overlap):
            left = rng.randrange(texture.width-patch_size+1)
            top = rng.randrange(texture.height-patch_size+1)
            patch = texture.crop((left, top, left+patch_size, top+patch_size))
            patch = patch.transpose(rng.choice([Image.Transpose.FLIP_LEFT_RIGHT,
                Image.Transpose.FLIP_TOP_BOTTOM, Image.Transpose.ROTATE_180]))
            ground.paste(patch, (x, y), feather)
    tone = texture_field(rng, 32, .25)
    ground = Image.composite(ImageEnhance.Brightness(ground).enhance(.93), ground, tone)
    return ground


def paint_roads(ground, paths, rng):
    core = Image.new('L', (SIZE, SIZE))
    draw = ImageDraw.Draw(core)
    for lane, route in enumerate(paths):
        for index, (x, y) in enumerate(route):
            radius = 92 + 7*math.sin(index*.11 + lane) + 6*math.sin(index*.037)
            draw.ellipse((x-radius, y-radius*.65, x+radius, y+radius*.65), fill=255)
    for camp in CAMPS.values():
        x, y = camp['x'], camp['y']
        draw.ellipse((x-130, y-125, x+160, y+125), fill=255)
    for compound in COMPOUNDS.values():
        draw.polygon(list(compound['vertices'].values()), fill=190)
    rough = texture_field(rng, 320, .85)
    # Preserve small-scale earth detail; change wear/material rather than overlay a flat color.
    worn = ImageOps.colorize(ImageEnhance.Contrast(ground.convert('L')).enhance(.84),
                            black='#755c3e', white='#d1b78e')
    edge = core.filter(ImageFilter.GaussianBlur(18))
    edge = ImageChops.multiply(edge, rough.point(lambda v: 165 + v*90//255))
    ground = Image.composite(worn, ground, edge)
    # Irregular gravel around the shoulders, not repeated wheel tracks across the terrain.
    shore = ImageChops.subtract(core.filter(ImageFilter.MaxFilter(31)), core.filter(ImageFilter.MinFilter(31)))
    detail = ImageDraw.Draw(ground)
    for _ in range(16000):
        x, y = rng.randrange(SIZE), rng.randrange(SIZE)
        if shore.getpixel((x, y)) > 100:
            radius = rng.choice([1, 1, 2, 3])
            detail.ellipse((x, y, x+radius*2, y+radius), fill=rng.choice(['#928064', '#c1ac88', '#aa9574']))
    return ground


def build():
    rng = random.Random(SEED)
    paths = [smooth_path(points) for points in CONTROL_PATHS]
    objects, footprints, occupied, fence_lines = [], [], [], []
    shadows = Image.new('RGBA', (SIZE, SIZE))
    shadow_draw = ImageDraw.Draw(shadows)
    # Bounds are ground-space extents from the anchor, not fractions of sprite height.
    specs = {
        'command': (260, (.5, .96), (-80, -42, 80, 8), (90, 30)),
        'tower': (180, (.52, .91), (-44, -26, 44, 8), (56, 18)),
        'platform': (400, (.5, .62), None, (170, 65)),
        'rock': (160, (.5, .92), (-52, -26, 52, 10), (63, 20)),
        'tree': (190, (.5, .91), (-22, -14, 22, 10), (35, 13)),
        'ruin': (175, (.5, .9), (-56, -24, 56, 12), (65, 19)),
        'brush-rock': (170, (.5, .91), (-51, -23, 51, 10), (60, 18)),
        'shrub': (95, (.5, .92), None, (30, 10)),
        'cart': (170, (.5, .9), (-52, -30, 52, 14), (60, 19)),
        'wall': (125, (.5, .9), None, (48, 14)),
        'brazier': (60, (.5, .95), None, (16, 7)),
    }

    def clear_route(x, y, radius=180):
        return all(math.hypot(x-px, y-py) >= radius for route in paths for px, py in route)

    def place(kind, image_name, name, x, y, reserve=True, depth_offset=0):
        width, anchor_ratio, bounds, shadow = specs[kind]
        sprite = Image.open(SOURCE / image_name).convert('RGBA')
        target = ASSETS / image_name
        sprite.save(target)
        scale = width / sprite.width
        anchor = {'x': round(sprite.width*anchor_ratio[0], 2), 'y': round(sprite.height*anchor_ratio[1], 2)}
        objects.append({'id': name, 'image': './assets/'+image_name, 'position': {'x': x, 'y': y},
                        'anchor': anchor, 'scale': scale, 'depthOffsetY': depth_offset})
        if bounds:
            l, t, r, b = bounds
            footprints.append((x+l, y+t, x+r, y+b))
        if reserve:
            occupied.append((x, y, width*.5))
        sx, sy = shadow
        shadow_draw.ellipse((x-sx, y-sy, x+sx, y+sy), fill=(40, 31, 20, 40))

    platform_atlas = Image.open(SOURCE / 'ceremonial-platforms.png').convert('RGBA')
    for index, side in enumerate(CAMPS):
        sprite = platform_atlas.crop((index*platform_atlas.width//2, 0, (index+1)*platform_atlas.width//2, platform_atlas.height))
        sprite = sprite.crop(sprite.getchannel('A').getbbox())
        sprite.save(SOURCE / f'{side}-platform.png')

    for side, camp in CAMPS.items():
        song = side == 'song'
        mirror = lambda x: x if song else SIZE-x
        mirror_y = lambda y: y if song else SIZE-y
        compound = COMPOUNDS[side]
        marshal = MARSHALS[side]
        place('platform', f'{side}-platform.png', side+'-platform', marshal['x'], marshal['y'], depth_offset=-160)
        for index, (x, y) in enumerate([(470, 2760), (950, 3040)]):
            place('command', f'camp-atlas-{0 if song else 1}-0.png', f'{side}-muster-tent-{index}', mirror(x), mirror_y(y))
        for index, (x, y) in enumerate(compound['vertices'].values()):
            place('tower', f'camp-atlas-{2 if song else 3}-0.png', f'{side}-tower-{index}', x, y)
        # Continuous collision follows the same four edges as the art; only three gate intervals are omitted.
        for direction, start_name, end_name in [('NE', 'N', 'E'), ('SE', 'E', 'S'), ('SW', 'S', 'W'), ('NW', 'W', 'N')]:
            a, b = compound['vertices'][start_name], compound['vertices'][end_name]
            intervals = [(0, .35), (.65, 1)] if direction in compound['gates'] else [(0, 1)]
            for section, (lo, hi) in enumerate(intervals):
                start = (a[0]+(b[0]-a[0])*lo, a[1]+(b[1]-a[1])*lo)
                end = (a[0]+(b[0]-a[0])*hi, a[1]+(b[1]-a[1])*hi)
                fence_lines.append({'team': side, 'direction': direction, 'start': start, 'end': end})
                count = math.ceil(math.dist(start, end)/90)
                for index in range(count):
                    t = (index+.5)/count
                    x, y = start[0]+(end[0]-start[0])*t, start[1]+(end[1]-start[1])*t
                    flip = int((end[0]-start[0])*(end[1]-start[1]) < 0)
                    place('wall', f'terrain-props-6-{flip}.png', f'{side}-wall-{direction}-{section}-{index}', x, y)
        for index, (x, y) in enumerate([(1150, 2470), (1210, 2720)]):
            place('brazier', 'terrain-props-7-0.png', f'{side}-brazier-{index}', mirror(x), mirror_y(y), False)

    kinds = ['rock', 'tree', 'ruin', 'brush-rock', 'shrub', 'cart']
    # Each pair mirrors across the map center; avoid roads, camp formation slots and NPCs.
    for index in range(24):
        kind = kinds[index % len(kinds)]
        for attempt in range(1000):
            x, y = rng.randrange(220, 1730), rng.randrange(260, SIZE-240)
            pair = [(x, y), (SIZE-x, SIZE-y)]
            if any(not clear_route(px, py, 225) or
                   any(abs(px-c['center']['x'])/720 + abs(py-c['center']['y'])/480 < 1.35 for c in COMPOUNDS.values()) or
                   any(math.hypot(px-ox, py-oy) < radius+110 for ox, oy, radius in occupied)
                   for px, py in pair):
                continue
            for side, (px, py) in enumerate(pair):
                place(kind, f'terrain-props-{index%6}-0.png', f'flank-{index}-{side}', px, py)
            break
        else:
            raise RuntimeError('Could not place mirrored landmark pair')

    def wall_distance(x, y, line):
        (ax, ay), (bx, by) = line['start'], line['end']
        dx, dy = bx-ax, by-ay
        t = max(0, min(1, ((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy)))
        return math.hypot(x-ax-t*dx, y-ay-t*dy)

    def blocked(x, y):
        return x < 128 or y < 128 or x >= SIZE-128 or y >= SIZE-128 or any(
            l <= x <= r and t <= y <= b for l, t, r, b in footprints) or any(wall_distance(x, y, line) < 22 for line in fence_lines)

    columns, rows = SIZE//32, SIZE//16
    bits = bytearray(math.ceil(columns*rows/8))
    for row in range(rows):
        for col in range(columns):
            if blocked(col*32+16, row*16+8):
                index = row*columns+col
                bits[index//8] |= 1 << (index%8)

    def free(x, y):
        col, row = int(x//32), int(y//16)
        index = row*columns+col
        return 0 <= col < columns and 0 <= row < rows and not bits[index//8] & (1 << (index%8))

    # Fail generation instead of silently shipping a painted road through a collider.
    for route in paths:
        for x, y in route:
            for dx, dy in [(0, 0), (32, 0), (-32, 0), (0, 16), (0, -16)]:
                if not free(x+dx, y+dy):
                    raise RuntimeError(f'Blocked route clearance at {x}, {y}')
    start = (int(CAMPS['song']['x']//32), int(CAMPS['song']['y']//16))
    queue, seen = deque([start]), {start}
    while queue:
        col, row = queue.popleft()
        for dc, dr in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
            cell = (col+dc, row+dr)
            if cell not in seen and free(cell[0]*32+16, cell[1]*16+8):
                seen.add(cell)
                queue.append(cell)
    for camp in CAMPS.values():
        if (int(camp['x']//32), int(camp['y']//16)) not in seen:
            raise RuntimeError('Disconnected camp')
    for side in CAMPS:
        required = [MARSHALS[side], *ARMY_SPAWNS[side]]
        for gate in COMPOUNDS[side]['gates'].values():
            required.extend([gate['position'], gate['inside'], gate['outside']])
        for point in required:
            x, y = point['x'], point['y']
            if not all(free(x+dx, y+dy) for dx, dy in [(0, 0), (-9, 0), (9, 0)]) or (int(x//32), int(y//16)) not in seen:
                raise RuntimeError(f'Blocked camp/gate/formation point: {side} {point}')
        cx, cy = MARSHALS[side].values()
        for index in range(120):
            angle = math.tau*index/120
            if not free(cx+250*math.cos(angle), cy+150*math.sin(angle)):
                raise RuntimeError(f'Blocked combat plaza: {side} {index}')
    patrol = []
    candidates = [(col*32+16, row*16+8) for col, row in sorted(seen)
                  if 800 < col*32+16 < 2600 and 700 < row*16+8 < 3100
                  and math.dist((col*32+16, row*16+8), tuple(CAMPS['song'].values())) + 180
                      < math.dist((col*32+16, row*16+8), tuple(CAMPS['jin'].values()))]
    rng.shuffle(candidates)
    for x, y in candidates:
        if free(SIZE-x, SIZE-y) and all(free(x+dx, y+dy) and free(SIZE-x+dx, SIZE-y+dy)
                                  for dx, dy in [(32, 0), (-32, 0), (0, 16), (0, -16)]):
            patrol.append({'x': x, 'y': y})
        if len(patrol) == 100:
            break
    if len(patrol) != 100:
        raise RuntimeError('Insufficient safe patrol points')
    ground = paint_roads(earth_surface(rng), paths, rng)
    shadow_layer = shadows.filter(ImageFilter.GaussianBlur(9))
    ground.save(ASSETS / 'ground.webp', quality=88, method=6)
    shadow_layer.save(ASSETS / 'shadows.webp', lossless=True, method=6)
    document = {'schemaVersion': 1, 'id': 9003, 'name': 'Tống Kim · Hoang Nguyên',
        'status': 'available', 'size': {'width': SIZE, 'height': SIZE}, 'entry': CAMPS['song'],
        'layers': [{'id': 'ground', 'type': 'ground', 'image': './assets/ground.webp'},
                   {'id': 'contact-shadows', 'type': 'shadow', 'image': './assets/shadows.webp'},
                   {'id': 'world', 'type': 'world', 'objects': objects}],
        'navigation': {'kind': 'grid', 'cellSize': {'width': 32, 'height': 16}, 'columns': columns,
                       'rows': rows, 'blockedBase64': base64.b64encode(bits).decode()},
        'spawnMode': 'fixed', 'spawns': [],
        'npcs': [{'id': f'{team}-{npc}', 'npcId': npc, 'team': team,
                  'position': {'x': camp['x']+dx, 'y': camp['y']+dy}}
                 for team, camp in CAMPS.items()
                 for npc, dx, dy in [('tongkim', 105, 50), ('pharmacy', 145, -45), ('horse', -120, -65)]]}
    (ROOT / 'map.json').write_text(json.dumps(document, ensure_ascii=False, indent=2)+'\n')
    (ROOT / 'layout.json').write_text(json.dumps({'camps': CAMPS, 'paths': paths,
        'marshals': MARSHALS, 'armySpawns': ARMY_SPAWNS, 'compounds': COMPOUNDS, 'fenceSegments': fence_lines,
        'patrolPoints': patrol, 'patrolMirror': 'center', 'seed': SEED}, indent=2)+'\n')
    preview = Image.alpha_composite(ground.convert('RGBA'), shadow_layer)
    for obj in sorted(objects, key=lambda obj: obj['position']['y'] + obj['depthOffsetY']):
        sprite = Image.open(ASSETS.parent / obj['image']).convert('RGBA')
        scale = obj['scale']
        sprite = sprite.resize((round(sprite.width*scale), round(sprite.height*scale)), Image.Resampling.LANCZOS)
        preview.alpha_composite(sprite, (round(obj['position']['x']-obj['anchor']['x']*scale),
                                         round(obj['position']['y']-obj['anchor']['y']*scale)))
    preview.save(ASSETS / 'preview.webp', quality=90, method=6)
    preview.thumbnail((1200, 1200), Image.Resampling.LANCZOS)
    preview.save(ASSETS / 'preview-small.webp', quality=88, method=6)
    print(json.dumps({'map': 9003, 'objects': len(objects), 'routes': len(paths),
                      'patrolPoints': len(patrol), 'reachableCells': len(seen)}))


if __name__ == '__main__':
    build()
