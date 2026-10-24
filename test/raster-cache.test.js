const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const acorn=require('acorn');
const {compileTypeScriptEntry}=require('../tools/build-app');
const scope={};vm.runInNewContext(compileTypeScriptEntry('render/raster-cache.ts','Raster').code,scope);
const {createRasterCache}=scope.Raster;
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const image=(src='sheet',width=4,height=4)=>({src,complete:true,naturalWidth:width,naturalHeight:height});
function environment(){
 const state={bitmaps:[],surfaces:[],draws:[],transforms:[]};
 state.bitmap=async(source,options)=>{const bitmap={source,options,width:options?.resizeWidth||source.naturalWidth,height:options?.resizeHeight||source.naturalHeight,closed:false,close(){this.closed=true;}};state.bitmaps.push(bitmap);return bitmap;};
 state.canvas=(width,height)=>{const canvas={width,height,getContext:()=>({save(){},restore(){},translate(...args){state.transforms.push(args);},scale(){},drawImage(...args){state.draws.push(args);}})};state.surfaces.push(canvas);return canvas;};return state;
}
test('decoded sheets are retained once and reused with the original sprite coordinates',async()=>{
 const env=environment(),cache=createRasterCache({environment:env,maxBytes:1024}),sheet=image();
 assert.equal(cache.source(sheet),sheet);await flush();const bitmap=cache.source(sheet);
 assert.notEqual(bitmap,sheet);for(let i=0;i<100;i++){cache.beginFrame();assert.equal(cache.source(sheet),bitmap);}
 assert.equal(env.bitmaps.length,1);assert.equal(cache.stats.bytes,64);cache.clear();assert.equal(bitmap.closed,true);assert.equal(cache.stats.bytes,0);
});
test('pixel budget includes in-flight work, evicts idle sheets and does not churn an active working set',async()=>{
 const env=environment(),cache=createRasterCache({environment:env,maxBytes:128,maxEntries:2}),a=image('a'),b=image('b'),c=image('c');
 cache.beginFrame();cache.source(a);cache.source(b);cache.source(c);await flush();
 assert.equal(env.bitmaps.length,2);assert.equal(cache.source(c),c);assert.equal(cache.stats.bytes,128);
 for(let i=0;i<61;i++){cache.beginFrame();cache.source(b);}
 cache.source(c);await flush();assert.equal(env.bitmaps[0].closed,true);assert.equal(env.bitmaps[1].closed,false);
 assert.equal(cache.stats.bytes,128);assert.equal(env.bitmaps.length,3);cache.clear();
});
test('clearing or replacing a sheet cannot publish an obsolete in-flight bitmap',async()=>{
 const env=environment(),pending=[];env.bitmap=(source)=>new Promise(resolve=>pending.push(resolve));
 const cache=createRasterCache({environment:env,maxBytes:1024}),sheet=image();cache.source(sheet);cache.clear();
 const stale={width:4,height:4,closed:false,close(){this.closed=true;}};pending.shift()(stale);await flush();assert.equal(stale.closed,true);assert.equal(cache.stats.entries,0);
 cache.source(sheet);sheet.src='new';cache.source(sheet);
 const old={width:4,height:4,close(){this.closed=true;}};pending.shift()(old);await flush();assert.equal(old.closed,true);
 const current={width:4,height:4,close(){}};pending.shift()(current);await flush();assert.equal(cache.source(sheet),current);cache.clear();
});
test('minimap resizes the source once, reuses a small surface and rebuilds for resolution/map changes',async()=>{
 const env=environment(),cache=createRasterCache({environment:env}),map=image('ground',3584,3584);
 const options={size:192,resolution:2,worldWidth:3584,tileSize:512,tiled:false};
 assert.equal(cache.minimap(map,options),null);await flush();const canvas=cache.minimap(map,options);
 assert.equal(canvas.width,384);assert.equal(canvas.height,384);assert.equal(env.bitmaps[0].options.resizeWidth,384);assert.equal(env.bitmaps[0].closed,true);
 for(let i=0;i<100;i++)assert.equal(cache.minimap(map,options),canvas);
 assert.equal(env.draws.length,1);assert.equal(env.bitmaps.length,1);
 cache.minimap(map,{...options,resolution:1});await flush();assert.equal(env.surfaces[1].width,192);
 cache.minimap(image('other-map'),options);await flush();assert.equal(canvas.width,0,'old surfaces are released');cache.clear();
});
test('legacy mirrored tiles are baked once and remain available without ImageBitmap support',async()=>{
 const env=environment();env.bitmap=undefined;
 const cache=createRasterCache({environment:env}),tile=image('tile');let decodes=0;tile.decode=async()=>{decodes++;};
 const options={size:128,resolution:1,worldWidth:1024,tileSize:256,tiled:true};
 cache.minimap(tile,options);await flush();assert.ok(cache.minimap(tile,options));assert.equal(env.draws.length,16);assert.equal(decodes,1);
 assert.ok(env.transforms.some(([x,y])=>x===64&&y===0));assert.equal(cache.source(tile),tile);cache.clear();
});
test('failed bitmap creation is bounded and changing the URL permits a fresh attempt',async()=>{
 const env=environment();let attempts=0;env.bitmap=async()=>{attempts++;throw Error('decode failed');};
 const cache=createRasterCache({environment:env,maxBytes:1024}),sheet=image();cache.source(sheet);await flush();
 for(let i=0;i<20;i++){cache.beginFrame();cache.source(sheet);}assert.equal(attempts,1);
 sheet.src='replacement';cache.source(sheet);await flush();assert.equal(attempts,2);assert.equal(cache.stats.bytes,0);
 const options={size:128,resolution:1,worldWidth:1024,tileSize:256,tiled:false};
 cache.minimap(sheet,options);await flush();for(let i=0;i<20;i++)cache.minimap(sheet,options);assert.equal(attempts,3);cache.clear();
});
function declaration(context,file,name){const source=fs.readFileSync(file,'utf8'),node=acorn.parse(source,{ecmaVersion:'latest'}).body.find(s=>s.type==='VariableDeclaration'&&s.declarations.some(d=>d.id.name===name));vm.runInContext(source.slice(node.start,node.end),context);}
test('offscreen effects skip image fetches; intersecting and anchored edge sprites retain frame/direction and handling',()=>{
 let loads=0;const draws=[],s={q3:1,B0:{x:0,y:0},M0:{w:100,h:100},bA(){loads++;return image();},W:{drawImage(...args){draws.push(args);}},renderImage:()=>({decoded:true})};vm.createContext(s);
 declaration(s,'src/client/render/arena-01.js','Fa');const sprite={f:'fx',w:20,h:20,ax:10,ay:10,n:4,d:16,ms:100};
 assert.equal(s.Fa(sprite,4,.25,200,200,true),true);assert.equal(loads,0);
 assert.equal(s.Fa(sprite,4,.25,109,50,true),true);assert.equal(loads,1);assert.equal(draws.length,1);assert.equal(draws[0][0].decoded,true);
 assert.deepEqual(draws[0].slice(1),[40,80,20,20,99,40,20,20]);
 s.E0={anim:{body:{st:{f:'body',w:20,h:30,ax:10,ay:20,n:4,d:8,ms:100}}}};s.ff={};declaration(s,'src/client/render/arena-01.js','Va');
 assert.equal(s.Va('body','st',2,.25,200,200,1),30);assert.equal(loads,1);
 assert.equal(s.Va('body','st',2,.25,50,50,1),30);assert.equal(loads,2);assert.deepEqual(draws[1].slice(1),[40,60,20,30,40,30,20,30]);
});

test('minimap reuses its static surface while camera and team markers continue updating every frame',async()=>{
 const env=environment(),cache=createRasterCache({environment:env}),map=image('ground',3584,3584),draws=[],outlines=[],dots=[];
 const context={save(){},restore(){},fillRect(){},drawImage(...args){draws.push(args);},strokeRect(...args){outlines.push(args);},beginPath(){},arc(...args){dots.push(args);},fill(){},stroke(){},moveTo(){},lineTo(){},closePath(){},fillText(){}};
 const s={renderImages:cache,dA:{s:160,m:10,top:10},M0:{w:1000,h:700},O0:{w:3584,h:3584},B0:{x:0,y:0},H1:2,cf:512,
  l:{battlefield:true,bgImg:map,ground:[],enemies:[{x:200,y:300,series:0}]},o:{},v:{x:100,y:100},Z0:{g:true,key:9003},
  mapScene:{hasMap:()=>true},MapsEngine:{getMap:()=>({name:'Hoang Nguyen'})},w0:['yellow']};
 vm.createContext(s);declaration(s,'src/client/render/arena-01.js','SP');
 s.SP(context);await flush();s.SP(context);const before=outlines.at(-2)[0];
 s.B0.x=100;s.v.x=250;s.l.enemies[0].x=400;s.SP(context);
 assert.equal(draws.length,2);assert.equal(draws[0][0],draws[1][0]);assert.notEqual(draws[0][0],map);
 assert.equal(env.bitmaps.length,1);assert.notEqual(outlines.at(-2)[0],before);assert.equal(dots.at(-1)[0],830+400*160/3584);cache.clear();
});

test('Retina pixel budget caps backing storage without changing CSS or pointer coordinates',()=>{
 const scale=scope.Raster.backingScale;
 assert.equal(scale(1000,700,2),2);assert.equal(scale(1000,700,.8),.8);
 const large=scale(3418,2430,2);assert.ok(large<1.01);assert.ok(3418*2430*large*large<=8*1024*1024+1);
 const s={m:()=>({offsetWidth:3418,offsetHeight:2430}),window:{devicePixelRatio:2},$8:()=>1,RasterAssets:scope.Raster,lA:{},M0:{},M1(){this.called=true;}};
 vm.createContext(s);declaration(s,'src/client/render/arena-01.js','St');s.St();
 assert.equal(s.M0.w,3418);assert.equal(s.M0.h,2430);assert.equal(s.H1,large);
 assert.equal(s.lA.width,Math.round(3418*large));assert.equal(s.lA.height,Math.round(2430*large));
});


test('production defaults never duplicate full sheets while retaining the small minimap cache',async()=>{
 const env=environment(),cache=createRasterCache({environment:env});
 const sheets=Array.from({length:240},(_,i)=>image(`sheet-${i}`,4096,4096));
 for(let frame=0;frame<180;frame++){
  cache.beginFrame();for(const sheet of sheets)assert.equal(cache.source(sheet),sheet);
 }
 await flush();assert.equal(env.bitmaps.length,0);assert.equal(cache.stats.bytes,0);assert.equal(cache.stats.entries,0);
 const options={size:160,resolution:2,worldWidth:3584,tileSize:512,tiled:false};
 cache.minimap(sheets[0],options);await flush();const surface=cache.minimap(sheets[0],options);
 assert.ok(surface);assert.equal(surface.width,320);assert.equal(env.bitmaps.length,1);
 assert.equal(env.bitmaps[0].options.resizeWidth,320);assert.equal(env.bitmaps[0].closed,true);
 cache.clear();assert.equal(surface.width,0);
});
