"""Regenerate the authored Song Doanh map (requires Pillow, no runtime dependency)."""
from pathlib import Path
import base64
import json
import random
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[2] / 'src/client/maps/content/9001'
layout = json.loads((root/'layout.json').read_text())
routes = layout['routes']
size = 3584
rng = random.Random(9001)
image = Image.new('RGB', (size, size), '#45513a')
draw = ImageDraw.Draw(image)
for _ in range(85000):
    x, y = rng.randrange(size), rng.randrange(size)
    color = rng.choice(['#48563c', '#4c583f', '#3d4935', '#50583c', '#414c37'])
    draw.ellipse((x, y, x + rng.randrange(3, 17), y + rng.randrange(2, 9)), fill=color)
# Three connected marching roads. Side roads branch beyond each camp's gate.
road_rects = [(256,1616,3328,1968), (960,routes[0]-176,1280,routes[-1]+176),
              (2304,routes[0]-176,2624,routes[-1]+176)]
road_rects += [(960,y-layout['roadHalfHeight'],2624,y+layout['roadHalfHeight']) for y in routes if y != 1792]
for left,top,right,bottom in road_rects:
    draw.rectangle((left,top,right,bottom),fill='#807357')
    for y in range(top+4,bottom,24):
        for x in range(left+(12 if y%48 else 0),right-44,48):
            draw.rectangle((x,y,x+44,y+20),fill=rng.choice(['#877b60','#8d8063','#796d55']))
draw.rectangle((1632, 0, 1952, size), fill='#465d59')
draw.rectangle((1664, 0, 1920, size), fill='#2c4948')
for _ in range(2500):
    x, y = rng.randrange(1664, 1910), rng.randrange(size)
    draw.line((x, y, x+rng.randrange(10, 50), y), fill='#375653', width=2)
for center_y in routes:
    top, bottom = center_y-layout['bridgeHalfHeight'], center_y+layout['bridgeHalfHeight']
    draw.rectangle((1600,top,1984,bottom),fill='#625d4d',outline='#a49a7c',width=12)
    for y in range(top+16,bottom-10,28):
        for x in range(1610,1970,48):
            draw.rectangle((x,y,x+44,y+24),fill=rng.choice(['#918a70','#a1987b','#827c66']))
# Water remains blocked between all three crossings, using the same bridge geometry.
blocked = [(0,0,128,size),(size-128,0,size,size),(0,0,size,128),(0,size-128,size,size)]
previous = 0
for center_y in routes:
    top, bottom = center_y-layout['bridgeHalfHeight'], center_y+layout['bridgeHalfHeight']
    blocked.append((layout['leftBank'],previous,layout['rightBank'],top))
    previous = bottom
blocked.append((layout['leftBank'],previous,layout['rightBank'],size))
for side, left, right, color in [('song',224,736,'#68a6a0'),('jin',2848,3360,'#b96d59')]:
    top, bottom = 1440, 2144
    draw.rectangle((left,top,right,bottom), fill='#77765f')
    for y in range(top+16,bottom-16,32):
        for x in range(left+16,right-16,48):
            draw.rectangle((x,y,x+44,y+28), fill=rng.choice(['#88856b','#817e65','#939076']))
    walls=[(left,top,right,top+32),(left,bottom-32,right,bottom)]
    outer=left if side=='song' else right-32
    inner=right-32 if side=='song' else left
    walls += [(outer,top,outer+32,bottom),(inner,top,inner+32,1664),(inner,1920,inner+32,bottom)]
    for rect in walls:
        blocked.append(rect); draw.rectangle(rect, fill='#42473f', outline='#a2a18a', width=5)
    for x in [left,right-64]:
        for y in [top,bottom-64]:
            draw.rectangle((x-16,y-16,x+80,y+80), fill='#41483f', outline='#a2a18a', width=7)
    center=(left+right)//2
    draw.ellipse((center-90,1702,center+90,1882),fill='#555f50',outline=color,width=6)
    draw.line((center,1705,center,1570),fill='#ccb98a',width=6)
    draw.polygon([(center,1570),(center+65,1590),(center,1620)],fill=color)
    for y in [1500,2050]:
        for x in range(left+60,right-60,95):
            draw.polygon([(x,y+40),(x+30,y),(x+60,y+40)],fill=color,outline='#d4c49b')
# Dark outer border makes the playable limits visible.
for rect in blocked[:4]: draw.rectangle(rect,fill='#303b2c')
(root/'assets').mkdir(parents=True,exist_ok=True)
image.save(root/'assets/ground.png',optimize=True)
columns, rows = size//32, size//16
mask=bytearray((columns*rows+7)//8)
for row in range(rows):
    for col in range(columns):
        x,y=col*32+16,row*16+8
        if any(a<=x<b and c<=y<d for a,c,b,d in blocked):
            index=row*columns+col; mask[index//8] |= 1 << (index%8)
map_doc={'schemaVersion':1,'id':9001,'name':'Tống Kim · Song Doanh','size':{'width':size,'height':size},
         'entry':{'x':450,'y':1792},'layers':[{'id':'ground','type':'ground','image':'./assets/ground.png'}],
         'navigation':{'kind':'grid','cellSize':{'width':32,'height':16},'columns':columns,'rows':rows,'blockedBase64':base64.b64encode(mask).decode()},
         'spawnMode':'fixed','spawns':[],'status':'available'}
(root/'map.json').write_text(json.dumps(map_doc,ensure_ascii=False,indent=2)+'\n')
