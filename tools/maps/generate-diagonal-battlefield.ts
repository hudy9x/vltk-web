/** Compose native 120px tiles and depth-sorted props into a 3584px battlefield.
 * Run: node tools/maps/generate-diagonal-battlefield.ts
 * Offline authoring only: Python 3 + Pillow; no browser/runtime dependency.
 * Source art is retained so the map can be reproduced without image generation.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
const mapDirectory = path.resolve("src/client/maps/content/9002");
const compositor = String.raw`
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageStat
import base64, json, math, random, sys
root=Path(sys.argv[1]); assets=root/'assets'; source=assets/'source'
size=3584; tile_size=120; rng=random.Random(9002)
atlas=Image.open(source/'terrain-atlas.png').convert('RGB')
# Extract 16 native-sized swatches, never enlarge a 1024px image into a map.
tiles=[]
for row in range(4):
 for col in range(4):
  cx=round((col+.5)*atlas.width/4); cy=round((row+.5)*atlas.height/4)
  tiles.append(atlas.crop((cx-60,cy-60,cx+60,cy+60)))
# A common periodic border blends every swatch into its neighbours.
quarter=tiles[0].crop((0,0,60,60)); common=Image.new('RGB',(120,120))
common.paste(quarter,(0,0));common.paste(quarter.transpose(Image.Transpose.FLIP_LEFT_RIGHT),(60,0))
common.paste(common.crop((0,0,120,60)).transpose(Image.Transpose.FLIP_TOP_BOTTOM),(0,60))
mask=Image.new('L',(120,120)); pixels=mask.load()
for y in range(120):
 for x in range(120): pixels[x,y]=round(255*min(1,min(x,y,119-x,119-y)/18))
for index,tile in enumerate(tiles):
 tile=Image.composite(tile,common,mask); tiles[index]=tile;tile.save(assets/f'tile-{index:02}.png')
ground=Image.new('RGB',(size,size)); placements=[]
for y in range(0,size,tile_size):
 for x in range(0,size,tile_size):
  index=rng.randrange(len(tiles));ground.paste(tiles[index].crop((0,0,min(120,size-x),min(120,size-y))),(x,y))
  placements.append({'x':x,'y':y,'tile':index,'width':min(120,size-x),'height':min(120,size-y)})
# Three broad marching routes connect the diagonally opposed camps.
roads=Image.new('RGBA',(size,size));draw=ImageDraw.Draw(roads)
paths=[[(850,950),(1792,1792),(2734,2634)],[(850,950),(1792,950),(2634,1792),(2734,2634)],[(850,950),(950,1792),(1792,2634),(2734,2634)]]
for route in paths: draw.line(route,fill=(163,122,72,190),width=190,joint='curve')
ground=Image.alpha_composite(ground.convert('RGBA'),roads.filter(ImageFilter.GaussianBlur(9))).convert('RGB')
objects=[]; footprints=[]; walls=[]
def prop(image_path,cell,grid,name,x,y,width,footprint=True,flip=False):
 atlas=Image.open(image_path).convert('RGBA');col=cell%grid;row=cell//grid
 sprite=atlas.crop((round(col*atlas.width/grid),round(row*atlas.height/grid),round((col+1)*atlas.width/grid),round((row+1)*atlas.height/grid)))
 box=sprite.getchannel('A').getbbox()
 if not box: raise ValueError('Missing transparent prop '+name)
 sprite=sprite.crop(box)
 if flip:sprite=sprite.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
 filename=f'{image_path.stem}-{cell}-{int(flip)}.png';sprite.save(assets/filename)
 scale=width/sprite.width; height=sprite.height*scale
 objects.append({'id':name,'image':'./assets/'+filename,'position':{'x':x,'y':y},'anchor':{'x':sprite.width/2,'y':sprite.height},'scale':scale,'depthOffsetY':0})
 if footprint: footprints.append((x-width*.34,y-min(height*.28,95),x+width*.34,y-10))
for side,cx,cy,cell in [('song',720,620,0),('jin',2864,2540,1)]:
 prop(source/'camp-atlas.png',cell,2,side+'-command',cx,cy,530)
 for number,(dx,dy) in enumerate([(-600,160),(600,160),(0,-190),(0,510)]):
  prop(source/'camp-atlas.png',cell+2,2,f'{side}-tower-{number}',cx+dx,cy+dy,205)
decor=source/'terrain-props.png'
if decor.exists():
 points=[(400,1300),(650,1900),(1150,2950),(2900,1100),(3200,1750),(2300,450),(350,2800),(3000,3200),(1850,450),(450,3200),(3200,400),(2100,3120)]
 for index,(x,y) in enumerate(points):prop(decor,index%6,3,f'landmark-{index}',x,y,170+(index%3)*35)
 for index,(x,y) in enumerate([(1050,700),(630,1030),(2534,2884),(2954,2554)]):prop(decor,7,3,f'brazier-{index}',x,y,65,False)
 # Fortified diamond compounds; clear gates face the shared battlefield.
 for side,cx,cy,gate in [('song',720,780,(920,1015)),('jin',2864,2700,(2595,2510))]:
  vertices=[(cx-600,cy),(cx,cy-350),(cx+600,cy),(cx,cy+350)]
  for edge in range(4):
   start=vertices[edge];end=vertices[(edge+1)%4]
   for step in range(7):
    t=(step+.5)/7;x=start[0]+(end[0]-start[0])*t;y=start[1]+(end[1]-start[1])*t
    if math.hypot(x-gate[0],y-gate[1])<145:continue
    prop(decor,6,3,f'{side}-wall-{edge}-{step}',x,y,115,False,edge in [0,2])
    walls.append((start[0]+(end[0]-start[0])*step/7,start[1]+(end[1]-start[1])*step/7,start[0]+(end[0]-start[0])*(step+1)/7,start[1]+(end[1]-start[1])*(step+1)/7))
 # Landmark groups occupy the flanks while the three authored routes stay open.
 def distance_segment(x,y,a,b):
  dx=b[0]-a[0];dy=b[1]-a[1];t=max(0,min(1,((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy)))
  return math.hypot(x-a[0]-t*dx,y-a[1]-t*dy)
 for index in range(45):
  for attempt in range(100):
   x=rng.randrange(220,3364);y=rng.randrange(220,3364)
   if math.hypot(x-720,y-780)<820 or math.hypot(x-2864,y-2700)<820:continue
   if any(distance_segment(x,y,a,b)<240 for route in paths for a,b in zip(route,route[1:])):continue
   prop(decor,index%6,3,f'flank-{index}',x,y,rng.randrange(140,210));break

ground.save(assets/'ground.webp',quality=88,method=6)
columns=112;rows=224;bits=bytearray(math.ceil(columns*rows/8))
def near_wall(x,y,line):
 x1,y1,x2,y2=line;dx=x2-x1;dy=y2-y1;t=max(0,min(1,((x-x1)*dx+(y-y1)*dy)/(dx*dx+dy*dy)))
 return math.hypot(x-x1-t*dx,y-y1-t*dy)<18
def blocked(x,y):return x<128 or y<128 or x>=size-128 or y>=size-128 or any(l<=x<=r and t<=y<=b for l,t,r,b in footprints) or any(near_wall(x,y,line) for line in walls)
for row in range(rows):
 for col in range(columns):
  if blocked(col*32+16,row*16+8):bits[(row*columns+col)//8]|=1<<((row*columns+col)%8)
map_doc={'schemaVersion':1,'id':9002,'name':'Tống Kim · Chéo Doanh','size':{'width':size,'height':size},'entry':{'x':850,'y':950},'layers':[{'id':'ground','type':'ground','image':'./assets/ground.webp'},{'id':'camps','type':'world','objects':objects}],'navigation':{'kind':'grid','cellSize':{'width':32,'height':16},'columns':columns,'rows':rows,'blockedBase64':base64.b64encode(bits).decode()},'spawnMode':'fixed','spawns':[],'status':'available'}
(root/'map.json').write_text(json.dumps(map_doc,ensure_ascii=False,indent=2)+'\n')
patrol=[]
while len(patrol)<100:
 x=(rng.randrange(1000,2400)//32)*32+16;y=(rng.randrange(1000,2400)//16)*16+8
 if not blocked(x,y) and not blocked(size-x,size-y):patrol.append({'x':x,'y':y})
(root/'layout.json').write_text(json.dumps({'camps':{'song':{'x':850,'y':950},'jin':{'x':2734,'y':2634}},'patrolPoints':patrol,'paths':paths},indent=2)+'\n')
(root/'tiles.json').write_text(json.dumps({'tileSize':120,'width':size,'height':size,'columns':30,'rows':30,'placements':placements},separators=(',',':'))+'\n')
# Full composite preview; live game keeps props separate for proper actor occlusion.
preview=ground.convert('RGBA')
for obj in sorted(objects,key=lambda obj:obj['position']['y']):
 sprite=Image.open(root/obj['image']).convert('RGBA');sprite=sprite.resize((round(sprite.width*obj['scale']),round(sprite.height*obj['scale'])),Image.Resampling.LANCZOS)
 preview.alpha_composite(sprite,(round(obj['position']['x']-sprite.width*.5),round(obj['position']['y']-sprite.height)))
preview.save(assets/'preview.webp',quality=90,method=6)
used={Path(obj['image']).name for obj in objects}|{f'tile-{index:02}.png' for index in range(16)}
for filename in assets.glob('*.png'):
 if filename.name not in used:filename.unlink()
print(json.dumps({'map':9002,'size':size,'tileSize':tile_size,'tiles':len(placements),'objects':len(objects)}))
`;
const result = spawnSync("python3", ["-c", compositor, mapDirectory], {
  stdio: "inherit",
});
if (result.status !== 0)
  throw new Error("Map compositor failed. Requires Python 3 and Pillow.");
