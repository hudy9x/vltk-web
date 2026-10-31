const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {loadMapsEngine}=require('./helpers/maps-engine');

test('waiting-room ground covers a larger viewport while map and object bounds stay unchanged',()=>{
 const scope=vm.createContext({});const engine=loadMapsEngine(scope),map=engine.getMap(9004);
 const original=JSON.stringify(map),image={complete:true,naturalWidth:1024,naturalHeight:768};
 const scene=engine.createMapScene(()=>image);scene.setMap(map);
 for(const view of [{x:0,y:0,width:1600,height:1300},{x:-200,y:-150,width:1800,height:1500},{x:0,y:0,width:800,height:600}]){
  const tiles=[],stack=[];let transform={x:0,y:0,sx:1,sy:1};
  const context={globalAlpha:1,save(){stack.push({...transform});},restore(){transform=stack.pop();},
   translate(x,y){transform.x+=x;transform.y+=y;},scale(x,y){transform.sx*=x;transform.sy*=y;},
   drawImage(source,x,y,w,h){assert.equal(source,image);tiles.push({left:Math.min(transform.x,transform.x+w*transform.sx),top:Math.min(transform.y,transform.y+h*transform.sy),w,h,...transform});}};
  assert.equal(scene.drawGround(context,image,view),true);
  for(let y=view.y;y<view.y+view.height;y+=32)for(let x=view.x;x<view.x+view.width;x+=32)
   assert.ok(tiles.some(t=>x>=t.left&&x<t.left+t.w&&y>=t.top&&y<t.top+t.h),`uncovered ${x},${y}`);
  assert.equal(stack.length,0);
  assert.deepEqual(transform,{x:0,y:0,sx:1,sy:1});
  assert.equal(tiles[0].w,1024);assert.equal(tiles[0].h,768);
  if(view.x===0&&view.width===1600){assert.equal(tiles.length,4);assert.equal(tiles[1].sx,-1);assert.equal(tiles[2].sy,-1);}
  assert.equal(JSON.stringify(map),original);
 }
});
