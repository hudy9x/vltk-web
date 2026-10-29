const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function fixture(enabled=true){
 let time=0;const logs=[];
 const s={window:{localGameConfig:{development:enabled}},location:{origin:'http://localhost',search:''},navigator:{},localStorage:{getItem:()=>null},
  Date,URLSearchParams,WeakSet,performance:{now:()=>time},console:{info:line=>logs.push(JSON.parse(line.slice(16))),warn:line=>logs.push(JSON.parse(line.slice(16)))},
  of:{'fx/test.webp':{complete:true,naturalWidth:32}},W:{drawImage(){},globalAlpha:1},B0:{x:0,y:0},M0:{w:800,h:600},document:{hidden:false}};
 vm.createContext(s);vm.runInContext(fs.readFileSync('src/client/multiplayer/state/diagnostics.js','utf8'),s);
 return {s,trace:s.onlineTrace,logs,time(value){time=value;}};
}
test('diagnostics correlate event IDs with actual drawImage calls and restore the renderer',()=>{
 const f=fixture(),info={event:7,skill:1063,source:1,target:2},effect={k:'jm',m:{fly:{f:'fx/test.webp'}},combat:{onlineTrace:info}};
 f.trace.release(info,[effect]);const original=f.s.W.drawImage;
 f.trace.render(effect,()=>f.s.W.drawImage('sprite'));
 assert.equal(f.s.W.drawImage,original);assert.ok(f.logs.some(e=>e.stage==='canvas-draw'&&e.event===7));
 f.time(3000);f.trace.advance();assert.ok(!f.logs.some(e=>e.stage==='visual-missing'));
 assert.throws(()=>f.trace.render(effect,()=>{throw Error('bad sprite');}),/bad sprite/);
 assert.equal(f.s.W.drawImage,original);assert.ok(f.logs.some(e=>e.stage==='render-error'));
});
test('world logs deduplicate repeats, omit unrelated secrets, and bound the ring buffer',()=>{
 const f=fixture(),world={map:56,self:1,ticket:'do-not-log',events:[{id:3,kind:1,source:1,target:2,skill:1063,tick:20,value:0,secret:'do-not-log'}]};
 f.trace.world(world);f.trace.world(world);assert.equal(f.logs.filter(e=>e.stage==='cast-received').length,1);
 assert.ok(!JSON.stringify(f.logs).includes('do-not-log'));
 for(let i=0;i<600;i++)f.trace.log('test',{i});assert.equal(f.trace.report().entries.length,500);
});
test('disabled diagnostics delegate drawing without wrapping drawImage or logging',()=>{
 const f=fixture(false),original=f.s.W.drawImage;let drawn=false;
 f.trace.render({},()=>{drawn=true;assert.equal(f.s.W.drawImage,original);});
 assert.equal(drawn,true);assert.equal(f.logs.length,0);
});
