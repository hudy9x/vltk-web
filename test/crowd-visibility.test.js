const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {compileTypeScriptEntry}=require('../tools/build-app');
function scene(){const s={};vm.createContext(s);vm.runInContext(compileTypeScriptEntry('render/crowd/index.ts','Crowd').code,s);return s.Crowd.createCrowdVisibility();}
function pack(count,offset=0){return Array.from({length:count},(_,i)=>({x:offset+(i%3)*2,y:Math.floor(i%9/3)*2,hp:100,cls:'normal'}));}
const view={x:-200,y:-200,width:1600,height:1200};
test('100 overlapping monsters use three bodies, five actual recipients and one count badge without changing actors',()=>{
 const controller=scene(),actors=pack(100),before=JSON.stringify(actors);
 const frame=controller.update(actors,.016,view);
 assert.equal(frame.bodies.size,3);assert.equal(frame.damageTargets.size,5);
 assert.equal(frame.counts.size,1);assert.equal([...frame.counts.values()][0],100);
 assert.equal(JSON.stringify(actors),before);
 const labels=actors.flatMap((target,index)=>[{target,life:1,amount:index,t:String(index)},{target,life:1,amount:index+.5,t:String(index+.5)}]);
 const drawn=frame.selectLabels(labels);
 assert.equal(drawn.length,5);assert.equal(new Set(drawn.map(l=>l.target)).size,5);
 for(const label of drawn)assert.equal(label.amount,actors.indexOf(label.target)+.5);
});
test('small groups retain every body and label; distant clusters have independent budgets',()=>{
 const controller=scene(),small=pack(3);
 const frame=controller.update(small,.016,view);assert.equal(frame.bodies.size,3);assert.equal(frame.counts.size,0);
 const labels=small.flatMap(target=>[{target,life:1},{target,life:1}]);assert.equal(frame.selectLabels(labels).length,6);
 const result=controller.update([...pack(40),...pack(40,300)],.016,view);
 assert.equal(result.bodies.size,6);assert.equal(result.damageTargets.size,10);assert.equal(result.counts.size,2);
});
test('bosses and the selected target stay visible and the front layer wins initially',()=>{
 const controller=scene(),actors=pack(30);actors[0].cls='boss';actors[1].goldBoss=true;
 const selected=new Set([actors[2]]);
 const frame=controller.update(actors,.016,view,selected);
 assert.equal(frame.bodies.size,3);for(const actor of actors.slice(0,3))assert.ok(frame.bodies.has(actor));
 const plain=scene().update(actors.slice(3),.016,view);
 assert.ok([...plain.bodies].every(actor=>actor.y===4));
});
test('all overlapping bosses remain visible even when they exceed the ambient budget',()=>{
 const actors=pack(7);for(const a of actors)a.cls='boss';
 const frame=scene().update(actors,.016,view);assert.equal(frame.bodies.size,7);assert.equal(frame.damageTargets.size,7);
});
test('tiny position/depth changes keep representatives stable, then depth selection refreshes after hold time',()=>{
 const controller=scene(),actors=pack(20);
 const first=controller.update(actors,.016,view),chosen=new Set(first.bodies);
 const hidden=actors.find(a=>!chosen.has(a));hidden.y=5;
 const next=controller.update([...actors].reverse(),.016,view);
 assert.deepEqual(new Set(next.bodies),chosen);
 const later=controller.update(actors,.4,view);assert.ok(later.bodies.has(hidden));
});
test('moving apart, dying and camera changes reveal bodies correctly; SIM and player labels are unaffected',()=>{
 const controller=scene(),actors=pack(20),first=controller.update(actors,.016,view);
 const hidden=actors.find(a=>!first.bodies.has(a));hidden.x=500;
 const chosen=[...first.bodies][0];chosen.dead=true;chosen.hp=0;
 const sim={x:0,y:0,hp:100,arenaSim:true,cls:'normal'};
 const result=controller.update([...actors,sim],.016,view);assert.ok(result.bodies.has(hidden));assert.ok(!result.bodies.has(chosen));
 const player={x:0,y:0},labels=[{target:player,life:1},{target:sim,life:1},{life:1}];
 assert.equal(result.selectLabels(labels).length,3);
 const far=controller.update(actors,.016,{x:5000,y:5000,width:500,height:500});assert.equal(far.bodies.size,0);
 const back=controller.update(actors,.016,view);assert.ok(back.bodies.has(hidden));
});
test('overlap chains spanning the screen do not collapse into a single giant cluster',()=>{
 const actors=Array.from({length:100},(_,i)=>({x:i*25,y:0,hp:100,cls:'normal'}));
 const result=scene().update(actors,.016,{x:0,y:0,width:3000,height:600});
 assert.equal(result.bodies.size,100);assert.equal(result.counts.size,0);
});
test('damage from a just-killed crowd is still limited to five actual recipients',()=>{
 const controller=scene(),actors=pack(50);
 controller.update(actors,.016,view);
 for(const actor of actors){actor.dead=true;actor.hp=0;}
 const labels=actors.map((target,index)=>({target,life:1,t:String(index),amount:index}));
 const frame=controller.update([], .016, view, new Set(), actors);
 assert.equal(frame.bodies.size,0);assert.equal(frame.selectLabels(labels).length,5);
});

test('damage representatives come from actual hit recipients even when body representatives received no hit',()=>{
 const controller=scene(),actors=pack(100),frame=controller.update(actors,.016,view);
 const hidden=actors.filter(actor=>!frame.damageTargets.has(actor)).slice(0,20);
 const labels=hidden.map((target,index)=>({target,life:1,amount:index+1}));
 const drawn=frame.selectLabels(labels);
 assert.equal(drawn.length,5);assert.ok(drawn.every(label=>hidden.includes(label.target)));
});
