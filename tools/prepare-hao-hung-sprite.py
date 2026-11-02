"""Repack the archived Hào Hùng directions without changing their pixels.

Run with Python + Pillow. The source has 16 horizontal directions followed
by an empty tile; the renderer expects one animation frame per vertical row.
"""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = Image.open(root / 'public/fx/advanced/m320_fly.webp').convert('RGBA')
assert source.size == (3400, 185)
assert source.crop((3200, 0, 3400, 185)).getbbox() is None
sheet = Image.new('RGBA', (200, 185 * 16))
for direction in range(16):
    tile = source.crop((direction * 200, 0, (direction + 1) * 200, 185))
    assert tile.getbbox() is not None
    sheet.paste(tile, (0, direction * 185))
target = root / 'public/fx/advanced/m320_directional.webp'
sheet.save(target, lossless=True, exact=True)
assert Image.open(target).convert('RGBA').tobytes() == sheet.tobytes()
print(target)
