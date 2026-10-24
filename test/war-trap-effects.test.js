const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),acorn=require('acorn');
const {compileTypeScriptEntry}=require('../tools/build-app');
const scope={};vm.runInNewContext(compileTypeScriptEntry('simulator/war-trap-effects.ts','Effects').code,scope);
const {WAR_TRAP_SKILLS,drawWarTrap,triggerWarTrap,preloadWarTrap}=scope.Effects;
function nativeEffects(){const s={window:{}};for(const name of ['projectile-effects-01.js','projectile-effects-02.js','status-effects-01.js'])vm.runInNewContext(fs.readFileSync('src/client/data/'+name,'utf8'),s);return s.window.JFX;}
function nativeDeclaration(name){const source=fs.readFileSync('src/client/core/game-loop-01.js','utf8'),node=acorn.parse(source,{ecmaVersion:'latest'}).body.find(n=>n.type==='VariableDeclaration'&&n.declarations.some(d=>d.id.name===name));return source.slice(node.start,node.end);}
test('item traps loop the actual Đường Môn ground sprites with their trap age and restore canvas state',()=>{
 const fx=nativeEffects();const expected={freezeTrap:[345,'fx/m155_fly.webp'],stunTrap:[349,'fx/m159_fly.webp'],slowTrap:[343,'fx/m153_fly.webp']};
 for(const [kind,[skill,file]]of Object.entries(expected)){
  assert.equal(WAR_TRAP_SKILLS[kind],skill);let args,saved=0,restored=0;
  const context={save(){saved++;},restore(){restored++;},globalAlpha:1};
  assert.equal(drawWarTrap(context,{kind,x:100,y:200,age:1.25,expires:30},fx,(...values)=>{args=values;return true;}),true);
  assert.equal(args[0].f,file);assert.equal(args[2],1.25);assert.deepEqual(args.slice(3),[100,200,true]);assert.equal(saved,1);assert.equal(restored,1);
 }
 let called=false;assert.equal(drawWarTrap({}, {kind:'freezeTrap'}, {m:{},f:{}},()=>{called=true;}),false);assert.equal(called,false);
});
test('activation invokes native d_ and produces each paired Đường Môn explosion at the trap position',()=>{
 const fx=nativeEffects();const s={A0:fx,l:{quiet:false,fx:[]},yn:sprite=>Math.min(1.2,sprite.n*sprite.ms/1000)};vm.createContext(s);vm.runInContext(nativeDeclaration('d_'),s);
 for(const [kind,file]of [['freezeTrap','fx/m156_hit.webp'],['stunTrap','fx/m160_hit.webp'],['slowTrap','fx/m154_hit.webp']]){
  triggerWarTrap({kind,x:123,y:456,age:3,expires:30},fx,s.d_);const effect=s.l.fx.at(-1);assert.equal(effect.k,'boom');assert.equal(effect.s.f,file);assert.equal(effect.x,123);assert.equal(effect.y,456);assert.equal(effect.t,0);assert.ok(effect.life>0);
 }
 assert.equal(s.l.fx.length,3);triggerWarTrap({kind:'life'},fx,s.d_);assert.equal(s.l.fx.length,3);
 s.l.quiet=true;triggerWarTrap({kind:'freezeTrap',x:0,y:0},fx,s.d_);assert.equal(s.l.fx.length,3);
});
test('a trap explodes once for multiple hostile targets and lasts 30 seconds even when placed late in the match',()=>{
 const s={};vm.runInNewContext(compileTypeScriptEntry('simulator/war-rewards.ts','Rewards').code,s);
 for(const kind of Object.keys(WAR_TRAP_SKILLS)){
  const storage={['tk_'+kind]:2},player={x:0,y:0},foes=[{x:1000,y:0,hp:100,battlefieldTeam:'jin'},{x:1000,y:0,hp:100,battlefieldTeam:'jin'}],ally={x:0,y:0,hp:100,battlefieldTeam:'song'};let bursts=0,hits=0;
  const reward=s.Rewards.createWarRewards({player:()=>player,team:()=> 'song',running:()=>true,alive:()=>true,storage:()=>storage,changed(){},actors:()=>[...foes,ally],trapTriggered(){bursts++;},trap(){hits++;}});
  reward.tick(300);reward.use(kind);reward.tick(29);assert.equal(reward.traps.length,1);assert.equal(reward.traps[0].age,29);
  foes.forEach(actor=>actor.x=0);reward.tick(.1);assert.equal(bursts,1);assert.equal(hits,2);assert.equal(reward.traps.length,0);
  reward.tick(.1);assert.equal(bursts,1);reward.use(kind);reward.tick(30);assert.equal(reward.traps.length,0);assert.equal(bursts,1,'expired traps do not explode');
 }
});

test('placing each trap preloads its native ground and burst sprites without requiring a learned skill',()=>{
 const fx=nativeEffects();for(const [kind,files]of [['freezeTrap',['fx/m155_fly.webp','fx/m156_hit.webp']],['stunTrap',['fx/m159_fly.webp','fx/m160_hit.webp']],['slowTrap',['fx/m153_fly.webp','fx/m154_hit.webp']]]){const loaded=[];preloadWarTrap(kind,fx,file=>loaded.push(file));assert.deepEqual(loaded,files);}
});
