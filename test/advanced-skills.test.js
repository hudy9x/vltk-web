const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const acorn = require('acorn');
const { loadCombatEngine } = require('./helpers/combat-engine');
const ROOT = path.resolve(__dirname, '..');
const manifest = require('../docs/skill_assets_manifest.json');
function load(s, file) { vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), s, { filename: file }); }
function declaration(s, file, name) {
  const source = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const node = acorn.parse(source, {ecmaVersion:'latest'}).body.find(node => node.type === 'VariableDeclaration' && node.declarations.some(d => d.id.name === name));
  vm.runInContext(source.slice(node.start, node.end), s);
}
function catalog() {
  const s = { Math, Set, Map, setTimeout() {}, performance: {now: () => 0},
    E: (n, lo, hi) => Math.max(lo, Math.min(hi, n)), Z: (lo, hi) => (lo + hi) / 2,
    o: {lvl:150,sk:{},skPts:500,mainLock:false},
    l: {fx:[],P:{main:{id:0}},life:100,zoneShown:1}, v: {x:0,y:0},
    QA:.81, Z0:{g:false}, R2:()=>true, mt:()=>true, Hi:{phys:'#fff'},
    Ya(){}, x8(){}, yn:sprite=>sprite.n*sprite.ms/1000, b0:()=>null,
    h4:{}, Df:{}, B8(){}, Q0:['phys','cold','fire','poison','light'],
  };
  s.window=s;vm.createContext(s);
  for (const file of ['public/data.js','src/client/data/projectile-effects-01.js','src/client/data/projectile-effects-02.js','src/client/data/advanced-skills-01.js','src/client/data/skill-150-details-01.js']) load(s,file);
  s.T=s.JX.skills;s.I=Object.fromEntries(s.JX.factions.map(f=>[f.key,f]));s.A0=s.JFX;
  declaration(s,'src/client/render/arena-01.js','TP');
  return s;
}
test('all 34 advanced skills register once with their faction, icons and usable primary FX', () => {
  const s=catalog();
  for (const entry of Object.values(manifest)) {
    const skill=s.T[entry.id];assert.ok(skill,entry.id);
    assert.equal(skill.tier,entry.tier);assert.equal(skill.req,entry.req);assert.equal(skill.f,entry.faction);
    assert.equal(s.I[skill.f].skills.filter(id=>id===skill.id).length,1);
    assert.ok(fs.existsSync(path.join(ROOT,'public',skill.ic)));
    if (skill.tier===150) {
      assert.ok(['physicsenhance_p','poisondamage_v','colddamage_v','firedamage_v','lightingdamage_v'].some(key=>skill.attr[key]),skill.n);
      const fx=s.JFX.f[skill.id];assert.ok(s.JFX.m[fx.c],skill.n);
      for (const value of Object.values(s.JFX.m[fx.c])) if(value?.f) assert.ok(fs.existsSync(path.join(ROOT,'public',value.f)),value.f);
    } else { assert.equal(skill.enemy,0);assert.match(skill.d,/chưa được áp dụng/); }
  }
  load(s,'src/client/data/advanced-skills-01.js');
  for(const entry of Object.values(manifest))assert.equal(s.I[entry.faction].skills.filter(id=>id===entry.id).length,1);
});

// Real catalog -> F2 -> G3 -> physical update, shared by the world and arena.
function advancedCombat() {
  const s=catalog();loadCombatEngine(s);load(s,'src/client/render/projectiles-01.js');
  Object.assign(s,{mw:/^(skill_|missle_)/,ww:10,s7:0,Fw:{},w4:.82,J5:.75,y5:2,
    Rr:{phys:'physicsdamage_v',poison:'poisondamage_v',cold:'colddamage_v',fire:'firedamage_v',light:'lightingdamage_v'},
    Cw:()=>1,n7:()=>false,j1:()=>null,Zw:()=>0,q5:()=>1});
  for(const name of ['r4','U2','t7','i4','r7','Y5','e7','a7'])declaration(s,'src/client/combat/skills-01.js',name);
  declaration(s,'src/client/core/attributes-01.js','N5');
  declaration(s,'src/client/core/helpers-and-config-01.js','b0');
  for(const name of ['Li','F2'])declaration(s,'src/client/core/attributes-02.js',name);
  const stats={skillBonus:{},seriesSkill:0,wmin:100,wmax:100,physPct:0,add:{},enh:{},crit:0,ignoreDef:0,aspd:2,series:0};
  return {s, skill:(id,level=25)=>s.F2(stats,s.T[id],level)};
}

test('Tạo Hóa Thái Thanh deals seven timed hits with native, hidden and missing FX at different frame rates',()=>{
  for(const mode of ['native','quiet','missing'])for(const dt of [1/60,1/30,.05,.4,2]) {
    const {s,skill}=advancedCombat();
    const actor={x:0,y:0,hp:100},target={x:180,y:110,hp:1000,r:12};
    s.l.quiet=mode==='quiet';
    if(mode==='missing')delete s.A0.m[s.A0.f[1078].c];
    const hits=[];
    const cast=s.queueSkillContact(actor,target,skill(1078),hit=>{hit.hp-=10;hits.push(cast.elapsed);},
      {targets:()=>[target]});
    assert.equal(target.hp,1000,'no immediate damage on cast');
    s.advanceSkillContacts(.1);assert.equal(target.hp,1000,'respect cast windup');
    for(let time=0;time<3;time+=dt)s.advanceSkillContacts(dt);
    assert.equal(hits.length,7,`${mode}, dt=${dt}`);
    assert.equal(target.hp,930);
    if(dt<.1)assert.equal(new Set(hits).size,7,'damage occurs on seven separate beats');
    assert.equal(s.l.combatProjectiles.length,0,'no lingering damage after field expires');
  }
});

test('Thái Thanh damage fits its visible footprint at every level without shortening cast range',()=>{
  for(const level of [1,25])for(const mode of ['native','quiet','missing']) {
    const {s,skill}=advancedCombat(),ability=skill(1078,level);
    const target={x:400,y:200,hp:1000,r:12};
    const inside={x:target.x+100,y:target.y,hp:1000,r:12};
    const outside={x:target.x+180,y:target.y,hp:1000,r:12};
    const above={x:target.x,y:target.y-100,hp:1000,r:12};
    const far={x:target.x+350,y:target.y,hp:1000,r:12};
    s.l.quiet=mode==='quiet';
    if(mode==='missing')delete s.A0.m[s.A0.f[1078].c];
    const range=ability.rad;
    const cast=s.queueSkillContact(s.v,target,ability,hit=>hit.hp-=10,
      {targets:()=>[target,inside,outside,above,far]});
    assert.equal(cast.skill.rad,range,'cast range remains unchanged');
    assert.equal(ability.geo.r,range,'input skill is not mutated');
    assert.equal(cast.skill.geo.r,150,'keep the configured 150-unit footprint');
    for(let i=0;i<180;i++)s.advanceSkillContacts(1/60);
    assert.equal(target.hp,930);assert.equal(inside.hp,930);
    for(const enemy of [outside,above,far])assert.equal(enemy.hp,1000,`${mode}, level ${level}: outside footprint`);
    const ellipses=[];
    // GM reads the same reduced geometry as real damage.
    s.l.combatProjectiles=[{k:'contact',age:0,x:target.x,y:target.y-14,staticArea:true,combat:cast}];
    s.CombatEngine.drawSkillDamageAreas({save(){},restore(){},setLineDash(){},beginPath(){},fill(){},stroke(){},
      ellipse(...args){ellipses.push(args);}});
    assert.deepEqual(ellipses[0].slice(0,4),[target.x,target.y,150*s.QA,150*s.QA/2]);
  }
});

test('Thái Thanh and Thiên Lôi play complete animations without rewinding on damage beats',()=>{
  for(const id of [365,1076,1078,1081])for(const level of [1,25]) {
    const {s,skill}=advancedCombat(),target={x:180,y:110,hp:1000,r:12};
    // Exercise the real world renderer, not YP alone: its pulse phase used to
    // rewind this animation every ~238ms before YP ever saw its actual age.
    const source=fs.readFileSync(path.join(ROOT,'src/client/render/arena-02.js'),'utf8');
    const np=acorn.parse(source,{ecmaVersion:'latest'}).body.find(node=>
      node.type==='VariableDeclaration'&&node.declarations.some(item=>item.id.name==='NP')).declarations[0].init;
    const renderLoop=np.body.body.find(node=>node.type==='ForOfStatement'&&
      source.slice(node.start,node.end).includes('const repeating'));
    assert.ok(renderLoop,'world FX render loop');
    const render=()=>vm.runInContext(source.slice(renderLoop.start,renderLoop.end),s);
    const draws=[],hits=[];s.Fa=(sprite,dir,time)=>draws.push({sprite,time});
    const cast=s.queueSkillContact(s.v,target,skill(id,level),()=>hits.push(cast.elapsed),{targets:()=>[target]});
    const field=s.l.combatProjectiles[0];
    assert.equal(field.loop,false);
    assert.ok(field.visualLifetime>0);
    assert.equal(cast.emitted,1);
    for(let i=0;i<150;i++) {
      s.advanceSkillContacts(1/60);
      render();
    }
    assert.equal(hits.length,id===1076?3:id===1078?7:5);
    assert.ok(draws.length>1);
    assert.ok(draws.every((draw,index)=>draw.sprite===field.m.fly&&(!index||draw.time>=draws[index-1].time)),
      'one sheet plays forward, never wraps back to its opening');
    const frames=new Set(draws.map(draw=>Math.floor(draw.time*1000/field.m.fly.ms)));
    assert.equal(frames.size,field.m.fly.n,'world renderer displays every frame, including the ending');
    assert.ok(frames.has(field.m.fly.n-1),'the final sprite frame must actually be drawn');
    assert.equal(cast.emitted,1,'damage beats never spawn another skill animation');
    assert.equal(s.l.fx.length,0,'no impact copies or lingering visual fields');
    const count=draws.length;field.age=field.visualLifetime;s.YP(field);
    field.age=field.visualLifetime*2;s.YP(field);
    assert.equal(draws.length,count,'animation ends independently of contact lifetime');
  }
});

test('SIM Thái Thanh uses the same seven-hit field and stops hitting removed opponents',()=>{
  for(const remove of [false,true]) {
    const {s,skill}=advancedCombat(),actor={x:0,y:0,hp:100},target={x:180,y:110,hp:1000,r:12};
    Object.assign(s,{F5:()=>[],l8:()=>0,nD:()=>[],skillCastDistance:()=>200});
    const {compileTypeScriptEntry}=require('../tools/build-app');
    vm.runInContext(compileTypeScriptEntry('simulator/skill-cast.ts','SkillCastTest').code,s);
    let valid=true;
    s.SkillCastTest.castSimulatorSkill(actor,target,skill(1078),()=>valid,()=>[target],
      (_ability,hit)=>{hit.hp-=10;return 10;},fn=>fn());
    for(let i=0;i<10;i++)s.advanceSkillContacts(1/60);
    assert.equal(target.hp,990);
    if(remove)valid=false;
    for(let i=0;i<180;i++)s.advanceSkillContacts(1/60);
    assert.equal(target.hp,remove?990:930);
  }
});

test('Thái Thanh checks live occupants on each beat and deduplicates overlapping visual contacts',()=>{
  const {s,skill}=advancedCombat();
  const target={x:180,y:110,hp:1000,r:12},entering={x:1000,y:110,hp:1000,r:12};
  s.queueSkillContact(s.v,target,skill(1078),hit=>hit.hp-=10,{targets:()=>[target,entering],windup:0});
  const field=s.l.combatProjectiles[0];
  s.l.combatProjectiles.push({...field,contactHits:new Set()});
  s.advanceSkillContacts(.01);assert.equal(target.hp,990);assert.equal(entering.hp,1000);
  target.x=1000;entering.x=180;
  for(let time=0;time<3;time+=.05)s.advanceSkillContacts(.05);
  assert.equal(target.hp,990,'leaving the field avoids later strikes');
  assert.equal(entering.hp,940,'late entrant receives only remaining six strikes');
});

test('Thái Thanh cancels before release and cannot damage across maps',()=>{
  for(const reason of ['interrupt','map']) {
    const {s,skill}=advancedCombat(),target={x:180,y:110,hp:1000,r:12};
    s.queueSkillContact(s.v,target,skill(1078),hit=>hit.hp-=10,{targets:()=>[target]});
    if(reason==='interrupt')s.v.actionRevision=1;else s.l.zoneShown=2;
    s.advanceSkillContacts(2);
    assert.equal(target.hp,1000,reason);
  }
});

test('Thiên Vương uses the swapped sheets and manifest tracks the corrected FX',()=>{
  const s=catalog();
  for(const [id,mid] of [[1059,350],[1060,349]]) {
    assert.equal(s.JFX.f[id].c,`advanced-${mid}`);
    assert.ok(manifest[id].assets.includes(`fx/advanced/m${mid}_fly.webp`));
  }
  assert.ok(manifest[1067].assets.includes(s.JFX.m['advanced-329'].hit.f));
});

test('150 fields play one sheet at a fixed caster/target anchor at every skill level',()=>{
  for(const id of [1056,1062,1066,1070,1076,1078,1079,1081,1114])for(const level of [1,25]) {
    const {s,skill}=advancedCombat();s.v.x=50;s.v.y=70;
    const target={x:180,y:110,hp:100,r:12};
    const cast=s.queueSkillContact(s.v,target,skill(id,level),()=>{},{targets:()=>[],windup:0});
    assert.equal(cast.emitted,1,`${id} level ${level}`);
    const effect=s.l.combatProjectiles[0];
    const anchor=id===1056?s.v:target;
    assert.equal(effect.x,anchor.x);assert.equal(effect.y,anchor.y-14);assert.equal(effect.kind,0);
    const initial={x:effect.x,y:effect.y};
    for(let i=0;i<12;i++)s.advanceSkillContacts(1/60);
    assert.equal(effect.x,initial.x);assert.equal(effect.y,initial.y);
    assert.equal(effect.m.fly,s.JFX.m[s.JFX.f[id].c].fly,'preserve sheet/frame metadata');
  }
});

test('Thiết Liên Tứ Sát emits eight secondary rays at the enemy field, with original level and timing gates',()=>{
  for(const level of [10,11,25]) {
    const {s,skill}=advancedCombat();
    const caster={x:30,y:50,hp:100},target={x:240,y:180,hp:100,r:12};let hits=0;
    const cast=s.queueSkillContact(caster,target,skill(1070,level),()=>hits++,{targets:()=>[target],windup:0});
    const field=s.l.combatProjectiles[0];
    const rays=()=>s.l.fx.filter(fx=>fx.k==='mis'&&fx.s?.f==='fx/advanced/m360_fly.webp');
    s.advanceSkillContacts(.99);assert.equal(rays().length,0);
    s.advanceSkillContacts(.01);
    assert.equal(rays().length,level<11?0:8);
    if(level>=11) {
      assert.equal(new Set(rays().map(fx=>fx.dir)).size,8);
      for(const fx of rays()) {
        assert.equal(fx.x1,target.x);assert.equal(fx.y1,target.y-14);
        assert.ok(fx.cosmetic&&!fx.combat);
        assert.equal(fx.hit,s.JFX.m['advanced-360'].hit);
        assert.ok(Math.abs(Math.hypot(fx.x2-fx.x1,(fx.y2-fx.y1)*2)-576*.67)<1e-9);
      }
    }
    // Main field stays where cast even if its target subsequently moves.
    target.x+=100;target.y+=100;
    for(let i=0;i<41;i++)s.advanceSkillContacts(1/60);
    const impacts=s.l.fx.filter(fx=>fx.k==='boom'&&fx.s?.f==='fx/advanced/m360_hit.webp');
    assert.equal(impacts.length,level<11?0:8);
    assert.equal(field.x,240);assert.equal(field.y,166);
    assert.equal(cast.emitted,1);assert.equal(hits,1,'secondary visual must not duplicate primary damage');
    s.advanceSkillContacts(.32);
    assert.equal(rays().length,level===25?8:0,'second event requires the parent to live 36 frames');
    for(let i=0;i<180;i++)s.advanceSkillContacts(1/60);
    assert.equal(s.l.fx.length,0);
  }
});

test('Thiết Liên Tứ Sát suppresses secondary visuals under budget, quiet, cancellation and zone guards',()=>{
  for(const guard of ['quiet','budget','interrupted','zone']) {
    const {s,skill}=advancedCombat();
    const caster={x:0,y:0,hp:100,actionRevision:0},target={x:180,y:0,hp:100,r:12};
    s.queueSkillContact(caster,target,skill(1070),()=>{},{targets:()=>[],windup:guard==='interrupted'?2:0});
    if(guard==='quiet')s.l.quiet=true;
    if(guard==='budget')for(let i=0;i<160;i++)s.l.fx.push({k:'boom',t:0,life:5,x:0,y:0});
    if(guard==='interrupted')caster.actionRevision++;
    if(guard==='zone')s.l.zoneShown=99;
    for(let i=0;i<65;i++)s.advanceSkillContacts(1/60);
    assert.equal(s.l.fx.filter(fx=>fx.s?.f==='fx/advanced/m360_fly.webp').length,0,guard);
  }
});

test('Thiết Liên Tứ Sát emits one burst per interval at different frame rates',()=>{
  for(const fps of [10,20,30,60,144]) {
    const {s,skill}=advancedCombat();
    s.queueSkillContact(s.v,{x:180,y:50,hp:100},skill(1070),()=>{},{targets:()=>[],windup:0});
    for(let i=0;i<Math.ceil(1.1*fps);i++)s.advanceSkillContacts(1/fps);
    assert.equal(s.l.fx.filter(fx=>fx.k==='mis'&&fx.s?.f==='fx/advanced/m360_fly.webp').length,8,`${fps} FPS`);
  }
});

test('Vi Đà hits the enlarged area around the caster, with a matching displayed radius',()=>{
  const {s,skill}=advancedCombat();const sk=skill(1056);
  const near={x:160,y:0,hp:100,r:1},far={x:240,y:0,hp:100,r:1},hits=[];
  assert.equal(sk.rad,256);assert.equal(s.T[1056].radius,256);
  s.queueSkillContact(s.v,far,sk,target=>hits.push(target),{targets:()=>[near,far],windup:0});
  s.advanceSkillContacts(1/60);
  assert.deepEqual(hits,[near]);
});

test('Kiếm Thùy Tinh Hà plays the full caster aura without turning it into another damaging field',()=>{
  for(const quiet of [false,true]) {
    const {s,skill}=advancedCombat();s.l.quiet=quiet;
    // Distinct from global v: arena SIM must use the actual casting actor.
    const caster={x:500,y:200,hp:100},target={x:700,y:200,hp:100,r:1};
    const besideCaster={x:500,y:210,hp:100,r:1},hits=[];
    const cast=s.queueSkillContact(caster,target,skill(1079),hit=>hits.push(hit),{
      targets:()=>[target,besideCaster],windup:0,
    });
    assert.equal(cast.emitted,1);
    assert.equal(s.l.combatProjectiles.length,1);
    const auras=s.l.fx.filter(fx=>fx.s?.f==='fx/advanced/m369_fly.webp');
    assert.equal(auras.length,quiet?0:1);
    if(!quiet) {
      const aura=auras[0];
      assert.equal(aura.x,caster.x);assert.equal(aura.y,caster.y-14);
      assert.equal(aura.life,36*56/1000);
      assert.ok(aura.cosmetic&&!aura.combat&&!aura.follow);
      assert.ok(manifest[1079].assets.includes(aura.s.f));
    }
    for(let i=0;i<90;i++)s.advanceSkillContacts(1/60);
    assert.deepEqual(hits,[target]);
    assert.equal(s.l.fx.filter(fx=>fx.s?.f==='fx/advanced/m369_fly.webp').length,quiet?0:1);
    for(let i=0;i<40;i++)s.advanceSkillContacts(1/60);
    assert.equal(s.l.fx.filter(fx=>fx.s?.f==='fx/advanced/m369_fly.webp').length,0);
  }
});

test('U Hồn emits separated homing hands and one cosmetic impact per hand without extra damage',()=>{
  for(const quiet of [false,true]) {
    const {s,skill}=advancedCombat();s.l.quiet=quiet;
    const target={x:180,y:0,hp:100,r:12};let hits=0,previousImpacts=0;
    s.queueSkillContact(s.v,target,skill(1067),()=>hits++,{
      targets:()=>[target],windup:0,onImpact:()=>previousImpacts++,
    });
    const hands=s.l.combatProjectiles.slice();assert.equal(hands.length,2);
    const gap=Math.hypot(hands[0].x-hands[1].x,(hands[0].y-hands[1].y)*2);
    assert.equal(gap,96);assert.ok(hands.every(hand=>hand.kind===5));
    for(let i=0;i<60;i++)s.advanceSkillContacts(1/60);
    assert.equal(hits,1);assert.equal(previousImpacts,2);
    const impacts=s.l.fx.filter(fx=>fx.k==='boom'&&fx.s?.f==='fx/advanced/m357_fly.webp');
    assert.equal(impacts.length,quiet?0:2);
    assert.ok(impacts.every(fx=>fx.cosmetic&&!fx.combat&&fx.x===target.x&&fx.y===target.y-14));
  }
});
test('Vô Ảnh Xuyên plays its original impact once at the struck enemy from level 11',()=>{
  for(const level of [1,10,11,25])for(const quiet of [false,true]) {
    const {s,skill}=advancedCombat();s.l.quiet=quiet;
    const target={x:140,y:0,hp:100,r:12};let hits=0,impacts=0;
    s.queueSkillContact(s.v,target,skill(1069,level),()=>hits++,{
      targets:()=>[target],windup:0,onImpact:()=>impacts++,
    });
    const visible=()=>s.l.fx.filter(fx=>fx.s?.f==='fx/advanced/m359_fly.webp');
    assert.equal(visible().length,0,'no impact when cast starts');
    for(let i=0;i<30;i++)s.advanceSkillContacts(1/60);
    assert.equal(hits,1);assert.equal(impacts,1);
    assert.equal(visible().length,!quiet&&level>=11?1:0);
    for(const fx of visible()) {
      assert.equal(fx.x,target.x);assert.equal(fx.y,target.y-14);
      assert.equal(fx.life,20*53/1000);assert.ok(fx.cosmetic&&!fx.combat);
      assert.ok(manifest[1069].assets.includes(fx.s.f));
      assert.ok(fs.existsSync(path.join(ROOT,'public',fx.s.f)));
    }
    for(let i=0;i<120;i++)s.advanceSkillContacts(1/60);
    assert.equal(visible().length,0);assert.equal(hits,1);
  }
  const {s,skill}=advancedCombat();
  s.queueSkillContact(s.v,{x:140,y:0,hp:100},skill(1069),()=>assert.fail('missed projectile'),{targets:()=>[],windup:0});
  for(let i=0;i<90;i++)s.advanceSkillContacts(1/60);
  assert.equal(s.l.fx.filter(fx=>fx.s?.f==='fx/advanced/m359_fly.webp').length,0);
});

test('Vô Ảnh Xuyên releases at body height and splashes nearby enemies without duplicate damage',()=>{
  for(const mode of ['normal','quiet','budget','missing-impact'])for(const level of [10,11,25]) {
    const {s,skill}=advancedCombat();
    const caster={x:500,y:300,hp:100},target={x:680,y:300,hp:100,r:12};
    const near={x:672,y:328,hp:100,r:12},far={x:680,y:390,hp:100,r:12};
    const hits=[],sk=skill(1069,level),originalGeo=sk.geo;
    if(mode==='quiet')s.l.quiet=true;
    if(mode==='budget')for(let i=0;i<165;i++)s.l.fx.push({k:'boom',t:0,life:5,x:0,y:0});
    if(mode==='missing-impact')delete s.JFX.m['advanced-359'];
    const cast=s.queueSkillContact(caster,target,sk,hit=>hits.push(hit),{targets:()=>[target,near,far],windup:0});
    const missile=s.l.combatProjectiles[0];
    assert.equal(missile.x,caster.x);assert.equal(missile.y,caster.y-8);
    assert.equal(missile.spd,(s.b0(s.T[1069],'missle_speed_v',level)||[])[0]);
    assert.equal(sk.geo,originalGeo,'per-cast geometry must not mutate the selected skill');
    assert.equal(hits.length,0,'splash waits for a projectile collision');
    for(let i=0;i<90;i++)s.advanceSkillContacts(1/60);
    assert.equal(hits.filter(hit=>hit===target).length,1,`${mode} level ${level}`);
    assert.equal(hits.filter(hit=>hit===near).length,level>=11?1:0,`${mode} level ${level} nearby`);
    assert.equal(hits.filter(hit=>hit===far).length,0);
    assert.equal(cast.hits.get(target),1);
  }
});

test('Đại Lực Kim Cang Chưởng and Tam Giới Quy Thiền damage clustered enemies once per cast',()=>{
  for(const id of [1055,1057])for(const level of [1,25])for(const mode of ['normal','quiet','budget']) {
    const {s,skill}=advancedCombat();
    const target={x:140,y:0,hp:100,r:12},near={x:135,y:26,hp:100,r:12};
    const far={x:140,y:100,hp:100,r:12},hits=[],sk=skill(id,level),originalGeo=sk.geo;
    if(mode==='quiet')s.l.quiet=true;
    if(mode==='budget')for(let i=0;i<165;i++)s.l.fx.push({k:'boom',t:0,life:5,x:0,y:0});
    const cast=s.queueSkillContact(s.v,target,sk,hit=>hits.push(hit),{targets:()=>[target,near,far],windup:0});
    assert.equal(sk.geo,originalGeo,'area settings belong only to this cast');
    assert.equal(hits.length,0);
    for(let i=0;i<90;i++)s.advanceSkillContacts(1/60);
    assert.equal(hits.filter(hit=>hit===target).length,1,`${id} ${level} ${mode} primary`);
    assert.equal(hits.filter(hit=>hit===near).length,1,`${id} ${level} ${mode} nearby`);
    assert.equal(hits.filter(hit=>hit===far).length,0,`${id} ${level} ${mode} outside`);
    assert.equal(cast.hits.get(target),1);assert.equal(cast.hits.get(near),1);
  }
});

test('all three Tianwang 150 skills splash clustered enemies within radius 96 once per cast',()=>{
  for(const id of [1058,1059,1060])for(const level of [1,25])for(const mode of ['normal','quiet','budget']) {
    const {s,skill}=advancedCombat();
    const target={x:90,y:0,hp:100,r:12},near={x:85,y:26,hp:100,r:12};
    const far={x:90,y:100,hp:100,r:12},hits=[],sk=skill(id,level),originalGeo=sk.geo;
    if(mode==='quiet')s.l.quiet=true;
    if(mode==='budget')for(let i=0;i<165;i++)s.l.fx.push({k:'boom',t:0,life:5,x:0,y:0});
    const cast=s.queueSkillContact(s.v,target,sk,hit=>hits.push(hit),{targets:()=>[target,near,far],windup:0});
    assert.equal(sk.geo,originalGeo);assert.equal(cast.skill.geo.area,96);
    assert.equal(hits.length,0,'area damage waits for contact');
    for(let i=0;i<90;i++)s.advanceSkillContacts(1/60);
    assert.equal(hits.filter(hit=>hit===target).length,1,`${id} ${level} ${mode} primary`);
    assert.equal(hits.filter(hit=>hit===near).length,1,`${id} ${level} ${mode} nearby`);
    assert.equal(hits.filter(hit=>hit===far).length,0,`${id} ${level} ${mode} outside`);
    assert.equal(cast.hits.get(target),1);assert.equal(cast.hits.get(near),1);
  }
});

test('Băng Tước Hoạt Kỳ sends exactly three blades from one origin in a narrow symmetric fan',()=>{
  for(const level of [1,25])for(const angle of [0,Math.PI/2,-Math.PI*.7]) {
    const {s,skill}=advancedCombat(),caster={x:500,y:300,hp:100};
    const target={x:caster.x+Math.cos(angle)*300,y:caster.y+Math.sin(angle)*150,hp:100};
    const cast=s.queueSkillContact(caster,target,skill(1063,level),()=>{},{targets:()=>[],windup:0});
    const blades=s.l.combatProjectiles.slice();assert.equal(cast.emitted,3);
    for(const [index,blade] of blades.entries()) {
      assert.equal(blade.x,caster.x);assert.equal(blade.y,caster.y-14);assert.equal(blade.kind,1);
      assert.ok(Math.abs(blade.ang-angle-[-.10,0,.10][index])<1e-9);
    }
    s.advanceSkillContacts(1/18);
    for(const blade of blades) {
      assert.ok(Math.abs(blade.x-caster.x-Math.cos(blade.ang)*blade.spd)<1e-9);
      assert.ok(Math.abs(blade.y-(caster.y-14)-Math.sin(blade.ang)*blade.spd/2)<1e-9);
    }
    const gap=Math.hypot(blades[0].x-blades[2].x,(blades[0].y-blades[2].y)*2);
    assert.ok(gap>0&&gap<blades[1].spd*.21,'the outer rays separate gradually, within a narrow fan');
  }
});

test('Băng Tước Hoạt Kỳ splashes within 96 without multiplying damage from overlapping blades',()=>{
  for(const mode of ['normal','quiet','budget']) {
    const {s,skill}=advancedCombat(),target={x:140,y:0,hp:100,r:12};
    const near={x:135,y:26,hp:100,r:12},far={x:140,y:110,hp:100,r:12},hits=[];
    if(mode==='quiet')s.l.quiet=true;
    if(mode==='budget')for(let i=0;i<165;i++)s.l.fx.push({k:'boom',t:0,life:5,x:0,y:0});
    const cast=s.queueSkillContact(s.v,target,skill(1063),hit=>hits.push(hit),{targets:()=>[target,near,far],windup:0});
    assert.equal(cast.emitted,3);assert.equal(cast.skill.geo.area,96);assert.equal(hits.length,0);
    for(let i=0;i<90;i++)s.advanceSkillContacts(1/60);
    assert.equal(hits.filter(hit=>hit===target).length,1,mode);
    assert.equal(hits.filter(hit=>hit===near).length,1,mode);
    assert.equal(hits.filter(hit=>hit===far).length,0,mode);
  }
});

test('Giang Hải Nộ Lan hits every body in its forward rectangle once in world and SIM',()=>{
  for(const level of [1,25])for(const mode of ['native','quiet','missing','sim']) {
    const {s,skill}=advancedCombat(),ability=skill(1075,level);
    const targets=[30,65,100,135].map(x=>({x,y:0,hp:100,r:12}));
    const offPath={x:100,y:60,hp:100,r:12},hits=[];
    s.l.quiet=mode==='quiet';
    if(mode==='missing')delete s.A0.m[s.A0.f[1075].c];
    let cast;
    if(mode==='sim') {
      Object.assign(s,{F5:()=>[],l8:()=>0,nD:()=>[],skillCastDistance:()=>200});
      const {compileTypeScriptEntry}=require('../tools/build-app');
      vm.runInContext(compileTypeScriptEntry('simulator/skill-cast.ts','SkillCastTest').code,s);
      cast=s.SkillCastTest.castSimulatorSkill({x:0,y:0,hp:100},targets[1],ability,()=>true,()=>[...targets,offPath],
        (_skill,target)=>{hits.push(target);return 10;},fn=>fn());
    } else cast=s.queueSkillContact(s.v,targets[1],ability,target=>hits.push(target),{targets:()=>[...targets,offPath]});
    assert.equal(cast.skill.geo.pierce,true);assert.equal(cast.skill.geo.area||0,0);
    assert.equal(cast.skill.geo.shape,'rect');assert.equal(cast.skill.geo.width,24);
    assert.equal(hits.length,0,'no damage before a physical contact');
    for(let i=0;i<120;i++)s.advanceSkillContacts(1/60);
    for(const target of targets)assert.equal(hits.filter(hit=>hit===target).length,1,`${level}/${mode}`);
    assert.ok(!hits.includes(offPath),'no damage beside the flight path');
    assert.deepEqual(hits,targets,'the forward rectangle includes all bodies beyond the selected target');
  }
});

test('Giang Hải rushes a short distance in 167ms, plays its full sprite once and disappears',()=>{
  for(const level of [1,25]) {
    const {s,skill}=advancedCombat(),ability=skill(1075,level);
    declaration(s,'src/client/render/arena-02.js','Ds');
    const target={x:100,y:0,hp:100,r:12};
    // G3 with the unmodified skill is the original animation generator.
    s.G3(s.v,target,ability);
    const original=s.l.fx.find(effect=>effect.k==='jm');assert.ok(original);
    const snapshot=effect=>Object.fromEntries(['mid','kind','x','y','z','vz','za','hz','cv','ae','ang','sh']
      .map(key=>[key,effect[key]]));
    const expected=snapshot(original);s.l.fx=[];
    const targets=[30,65,100,135].map(x=>({x,y:0,hp:100,r:12}));
    const unchanged=JSON.stringify(ability);let received;
    const generator=s.G3;s.G3=(actor,selected,input)=>{received=input;return generator(actor,selected,input);};
    const cast=s.queueSkillContact(s.v,target,ability,hit=>hit.hp-=10,{targets:()=>targets});
    const missile=s.l.combatProjectiles[0];
    assert.equal(received,ability,'pass the exact original skill to the renderer');
    assert.equal(JSON.stringify(ability),unchanged);
    assert.deepEqual(snapshot(missile),expected,'keep the original sprite origin and direction');
    assert.equal(missile.lf,3);assert.equal(missile.loop,false);
    assert.ok(missile.spd>original.spd,'the short thrust must be faster, not slowed to fill the old lifetime');
    assert.equal(missile.m,original.m);
    const frames=[];s.Fa=(sprite,dir,time)=>frames.push({sprite,dir,time});
    let impacts=0;const impact=s.gf;s.gf=(effect,x,y)=>{
      const before=(s.l.fxQ||[]).length;impact(effect,x,y);
      impacts+=(s.l.fxQ||[]).length-before;
    };
    let endedAt;
    for(let tick=1;tick<=120;tick++) {
      s.advanceSkillContacts(1/120);
      if(missile.contactAlive)s.YP(missile);
      else if(endedAt==null)endedAt=tick/120;
    }
    assert.ok(endedAt<=cast.windup+.18,'disappear promptly after the 167ms thrust');
    const shown=new Set(frames.map(frame=>Math.floor(frame.time*1000/missile.m.fly.ms)));
    assert.equal(shown.size,missile.m.fly.n,'play the entire sprite within the short thrust');
    assert.ok(!s.l.fx.includes(missile),'no lingering or restarted wave');
    assert.ok(targets.every(actor=>actor.hp===90));
    assert.equal(impacts,targets.length,'each recipient uses the normal contact FX, like Vân Long');
  }
});

test('Giang Hải and Vân Long use identical rectangle rules for stacked, side, rear and out-of-range bodies',()=>{
  for(const id of [361,1075]) {
    const {s,skill}=advancedCombat(),selected={x:100,y:0,hp:100,r:12};
    const packed=Array.from({length:25},()=>({...selected}));
    const side={x:100,y:45,hp:100,r:12},rear={x:-60,y:0,hp:100,r:12},far={x:230,y:0,hp:100,r:12};
    const ability=skill(id);
    const cast=s.queueSkillContact(s.v,selected,{...ability,rad:198,geo:{...ability.geo,len:198}},target=>target.hp-=10,
      {targets:()=>[selected,...packed,side,rear,far],maxTargets:1});
    for(let i=0;i<90;i++)s.advanceSkillContacts(1/60);
    assert.equal(cast.skill.geo.width,24);assert.equal(cast.skill.geo.len,198);
    assert.equal(selected.hp,90);assert.ok(packed.every(target=>target.hp===90));
    assert.ok([side,rear,far].every(target=>target.hp===100));
  }
});

test('Giang Hải visual travel ends at its damage range in every direction and at low FPS',()=>{
  for(const level of [1,25])for(const dt of [1/60,.05,.4])for(let direction=0;direction<8;direction++) {
    const {s,skill}=advancedCombat(),angle=direction*Math.PI/4;
    const selected={x:Math.cos(angle)*100,y:Math.sin(angle)*50,hp:100,r:12};
    const cast=s.queueSkillContact(s.v,selected,skill(1075,level),()=>{},{targets:()=>[selected]});
    const missile=s.l.combatProjectiles[0],origin={x:missile.x,y:missile.y};
    const length=cast.skill.geo.len*s.QA;
    for(let tick=0;tick<Math.ceil(2/dt);tick++) {
      s.advanceSkillContacts(dt);
      assert.ok(Math.hypot(missile.x-origin.x,(missile.y-origin.y)*2)<=length+1e-8,
        `level ${level}, direction ${direction}, dt ${dt}: visible wave must not exceed the attack length`);
    }
    assert.equal(missile.contactAlive,false);
    assert.ok(!s.l.fx.includes(missile),'expired wave cannot keep flying in the renderer');
  }
});

test('Giang Hải rectangle keeps the release origin and heading after caster and selected target move',()=>{
  for(const mode of ['native','quiet','missing']) {
    const {s,skill}=advancedCombat(),selected={x:0,y:-60,hp:100,r:12},onPath={x:0,y:-70,hp:100,r:12},side={x:80,y:-70,hp:100,r:12};
    s.l.quiet=mode==='quiet';if(mode==='missing')delete s.A0.m[s.A0.f[1075].c];
    s.queueSkillContact(s.v,selected,skill(1075),target=>target.hp-=10,{targets:()=>[selected,onPath,side]});
    s.v.x=500;selected.x=500;
    for(let i=0;i<90;i++)s.advanceSkillContacts(1/60);
    assert.equal(onPath.hp,90,mode);assert.equal(selected.hp,100);assert.equal(side.hp,100);
  }
});

test('Tật Hỏa only hits inside radius 150 while preserving three beats and its original cast range',()=>{
  for(const mode of ['native','quiet','missing','sim']) {
    const {s,skill}=advancedCombat(),ability=skill(1076);
    const target={x:180,y:100,hp:1000,r:10},near={x:280,y:100,hp:1000,r:10},far={x:340,y:100,hp:1000,r:10};
    s.l.quiet=mode==='quiet';if(mode==='missing')delete s.A0.m[s.A0.f[1076].c];
    let cast;
    if(mode==='sim') {
      Object.assign(s,{F5:()=>[],l8:()=>0,nD:()=>[],skillCastDistance:()=>200});
      const {compileTypeScriptEntry}=require('../tools/build-app');
      vm.runInContext(compileTypeScriptEntry('simulator/skill-cast.ts','SkillCastTest').code,s);
      cast=s.SkillCastTest.castSimulatorSkill({x:0,y:0,hp:100},target,ability,()=>true,()=>[target,near,far],
        (_skill,hit)=>{hit.hp-=10;return 10;},fn=>fn());
    } else cast=s.queueSkillContact(s.v,target,ability,hit=>hit.hp-=10,{targets:()=>[target,near,far]});
    assert.equal(cast.skill.geo.r,150);assert.equal(cast.skill.rad,ability.rad);
    for(let i=0;i<180;i++)s.advanceSkillContacts(1/60);
    assert.equal(target.hp,970);assert.equal(near.hp,970);assert.equal(far.hp,1000,mode);
  }
});

test('Thời Thặng Lục Long pierces and damages every enemy along its path once',()=>{
  for(const level of [1,25])for(const quiet of [false,true]) {
    const {s,skill}=advancedCombat();s.l.quiet=quiet;
    const targets=[100,180,260].map(x=>({x,y:0,hp:100,r:12}));
    const offPath={x:180,y:70,hp:100,r:12},hits=[];
    const cast=s.queueSkillContact(s.v,targets[2],skill(1073,level),hit=>hits.push(hit),{
      targets:()=>[...targets,offPath],windup:0,
    });
    assert.equal(cast.skill.geo.pierce,true);assert.equal(cast.skill.geo.area,0);
    for(let i=0;i<90;i++)s.advanceSkillContacts(1/60);
    for(const target of targets)assert.equal(hits.filter(hit=>hit===target).length,1,`level ${level}`);
    assert.ok(!hits.includes(offPath),'do not widen the dragon into an unrelated area attack');
  }
});

test('Cửu Thiên Cương Phong pierces every body and leaves one Ngạo Tuyết column per contact',()=>{
  for(const level of [1,25,27])for(const mode of ['normal','quiet','lowFx','missing','budget']) {
    const {s,skill}=advancedCombat();load(s,'src/client/data/status-effects-01.js');
    const sprite=s.A0.m[179].fly;
    assert.ok(manifest[1080].assets.includes(sprite.f));
    if(mode==='quiet')s.l.quiet=true;
    if(mode==='lowFx')s.o.lowFx=true;
    if(mode==='missing')delete s.A0.m[179];
    const caster={x:500,y:300,hp:100};
    const targets=[100,180,260].map(dx=>({x:caster.x+dx,y:caster.y,hp:100,r:12}));
    const offPath={x:680,y:370,hp:100,r:12},hits=[],columns=[];
    const cast=s.queueSkillContact(caster,targets[0],skill(1080,level),hit=>hits.push(hit),{
      targets:()=>[...targets,offPath],windup:0,
    });
    assert.equal(cast.skill.geo.pierce,true);assert.equal(cast.skill.geo.area,0);
    assert.equal(hits.length,0,'no damage or column before physical contact');
    if(mode==='budget')for(let i=0;i<200;i++)s.l.fx.push({k:'boom',t:0,life:5,x:0,y:0});
    s.l.fxQ=[];
    s.l.fxQ.push=function(...effects) {
      columns.push(...effects.filter(effect=>effect.s===sprite));
      return Array.prototype.push.apply(this,effects);
    };
    for(let i=0;i<90;i++)s.advanceSkillContacts(1/60);
    for(const target of targets)assert.equal(hits.filter(hit=>hit===target).length,1,`${level} ${mode}`);
    assert.ok(!hits.includes(offPath),'only physically contacted monsters take damage');
    const visible=mode==='normal'||mode==='lowFx';
    assert.equal(columns.length,visible?3:0,`${level} ${mode}`);
    if(visible)for(const [index,column] of columns.entries()) {
      assert.equal(column.x,targets[index].x);assert.equal(column.y,targets[index].y-14);
      assert.equal(column.cosmetic,true);assert.ok(!column.combat);
      assert.equal(column.life,15/s.K3);
      assert.ok(Math.abs(column.sp*column.life-sprite.n*sprite.ms/1000)<1e-9);
    }
    assert.equal(s.l.combatProjectiles.length,0);
    if(visible)assert.equal(s.l.fx.filter(effect=>effect.s===sprite).length,0,'columns expire');
  }
});

test('Bổng Huýnh Lược Địa emits three abreast and steers toward a moving target',()=>{
  for(const angle of [0,Math.PI/2,-Math.PI*.7]) {
    const {s,skill}=advancedCombat(),caster={x:500,y:300,hp:100};
    const target={x:caster.x+Math.cos(angle)*300,y:caster.y+Math.sin(angle)*150,hp:100};
    const cast=s.queueSkillContact(caster,target,skill(1074),()=>{},{targets:()=>[],windup:0});
    const rays=s.l.combatProjectiles.slice();assert.equal(cast.emitted,3);
    for(const [index,ray] of rays.entries()) {
      const side=[-24,0,24][index];
      assert.equal(ray.kind,5);assert.equal(ray.tgt,target);
      assert.ok(Math.abs(ray.x-(caster.x-Math.sin(angle)*side))<1e-9);
      assert.ok(Math.abs(ray.y-(caster.y-14+Math.cos(angle)*side/2))<1e-9);
      assert.ok(Math.abs(ray.ang-angle)<1e-9);
    }
    s.advanceSkillContacts(1/18);
    const center=rays[1],before=center.ang;
    target.x-=Math.sin(angle)*80;target.y+=Math.cos(angle)*40;
    s.advanceSkillContacts(1/18);
    assert.ok(center.ang>before,'center ray follows the moved target instead of flying straight');
  }
});

test('Bổng Huýnh Lược Địa splashes nearby bodies once with three physical homing rays',()=>{
  for(const level of [1,25])for(const mode of ['normal','quiet','budget']) {
    const {s,skill}=advancedCombat(),target={x:140,y:0,hp:100,r:12};
    const near={x:135,y:26,hp:100,r:12},far={x:140,y:110,hp:100,r:12},hits=[];
    if(mode==='quiet')s.l.quiet=true;
    if(mode==='budget')for(let i=0;i<165;i++)s.l.fx.push({k:'boom',t:0,life:5,x:0,y:0});
    const cast=s.queueSkillContact(s.v,target,skill(1074,level),hit=>hits.push(hit),{targets:()=>[target,near,far],windup:0});
    assert.equal(cast.emitted,3);assert.equal(cast.skill.geo.area,96);
    assert.equal(cast.skill.geo.pierce,false);assert.equal(hits.length,0);
    for(let i=0;i<90;i++)s.advanceSkillContacts(1/60);
    assert.equal(hits.filter(hit=>hit===target).length,1,`${level} ${mode}`);
    assert.equal(hits.filter(hit=>hit===near).length,1,`${level} ${mode}`);
    assert.equal(hits.filter(hit=>hit===far).length,0,`${level} ${mode}`);
    assert.equal(s.l.combatProjectiles.length,0,'rays expire or stop after contact');
  }
});

test('Thời Thặng Lục Long flies first, followed by its delayed fire core and flame trail',()=>{
  const {s,skill}=advancedCombat(),target={x:300,y:0,hp:100,r:12};let hits=0;
  const cast=s.queueSkillContact(s.v,target,skill(1073),()=>hits++,{targets:()=>[target],windup:0});
  const dragon=s.l.combatProjectiles[0];
  s.advanceSkillContacts(1/18);
  const flames=s.l.fx.filter(fx=>fx.s?.f==='fx/advanced/m344_fly.webp');
  assert.equal(flames.length,1);assert.equal(flames[0].x,dragon.x);
  assert.equal(flames[0].y,dragon.y-(dragon.z+dragon.hz)*s.wf+12);
  assert.equal(flames[0].life,6*56/1000);assert.ok(flames[0].cosmetic&&!flames[0].combat);
  const core=s.l.fx.find(fx=>fx.s?.f==='fx/advanced/m363_fly.webp');
  assert.ok(core&&core.cosmetic&&!core.combat);assert.ok(core.t<0&&flames[0].t<0);
  const draws=[];s.Fa=(...args)=>draws.push(args);s.W={globalAlpha:1};
  declaration(s,'src/client/render/arena-02.js','Ds');declaration(s,'src/client/render/arena-01.js','CP');
  s.YP(dragon);s.CP(core);s.CP(flames[0]);
  assert.ok(draws.some(args=>args[0].f==='fx/advanced/m335_fly.webp'));
  assert.ok(!draws.some(args=>args[0].f==='fx/advanced/m363_fly.webp'||args[0].f==='fx/advanced/m344_fly.webp'),
    'only the dragon is visible at first');
  s.advanceSkillContacts(3/18);assert.equal(s.CP(core),false,'fire still waits behind the leading dragon');
  s.advanceSkillContacts(2/18);draws.length=0;s.CP(core);
  assert.equal(draws.length,1);assert.ok(draws[0][3]<dragon.x-90,'fire follows well behind the head');
  assert.equal(draws[0][5],true);
  assert.ok(manifest[1073].assets.includes(flames[0].s.f));
  assert.equal(cast.emitted,1,'additional layers do not register extra combat missiles');
  while(dragon.contactAlive!==false)s.advanceSkillContacts(1/60);
  assert.ok(s.l.fx.includes(core),'delayed fire finishes its path after the dragon expires');
  for(let i=0;i<120;i++)s.advanceSkillContacts(1/60);
  assert.equal(hits,1);assert.equal(s.l.fx.filter(fx=>fx.s?.f==='fx/advanced/m344_fly.webp').length,0);
});

test('dragon fire respects quiet, FX budget, windup and cast cancellation',()=>{
  for(const mode of ['quiet','budget','windup','zone']) {
    const {s,skill}=advancedCombat();
    const cast=s.queueSkillContact(s.v,{x:300,y:0,hp:100},skill(1073),()=>{},
      {targets:()=>[],windup:mode==='windup'?1:0});
    if(mode==='quiet')s.l.quiet=true;
    if(mode==='budget')for(let i=0;i<165;i++)s.l.fx.push({k:'boom',t:0,life:5,x:0,y:0});
    if(mode==='zone')s.l.zoneShown=99;
    for(let i=0;i<12;i++)s.advanceSkillContacts(1/60);
    assert.equal(s.l.fx.filter(fx=>fx.s?.f==='fx/advanced/m344_fly.webp').length,0,mode);
    assert.equal(cast.emitted,1);
  }
});

test('every faction skill grid exposes Lv120 and Lv150 while preserving level gates', () => {
  const s=catalog(),nodes=new Map();s.m=id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);};
  Object.assign(s,{document:{querySelectorAll:()=>[]},D:String,N:()=>0,z1:()=>0,SA:()=>false,GA:()=>s.o.lvl,
    W2:skill=>s.o.lvl>=skill.req,m4:()=>false,P4:()=>true,D2(){},Ri(){}});
  for(const name of ['Ni','Q1'])declaration(s,'src/client/core/attributes-02.js',name);
  declaration(s,'src/client/ui/world-panels-01.js','$B');
  for(const faction of Object.values(s.I).filter(f=>Object.values(manifest).some(sk=>sk.faction===f.key))) {
    s.o.fac=faction.key;s.$B();const html=nodes.get('#t-skill').innerHTML;
    assert.match(html,/Lv120/);assert.match(html,/Lv150/);
    for(const entry of Object.values(manifest).filter(sk=>sk.faction===faction.key)) {
      assert.match(html,new RegExp(`data-id="${entry.id}"`));
      s.o.lvl=entry.req-1;assert.equal(s.Q1(s.T[entry.id]),false);
      s.o.lvl=entry.req;assert.equal(s.Q1(s.T[entry.id]),true);
    }
  }
});
test('all 24 level-150 primary skills register physical contacts within their cast quotas', () => {
  const s=catalog();loadCombatEngine(s);load(s,'src/client/render/projectiles-01.js');
  Object.assign(s, {mw:/^(skill_|missle_)/,ww:10,s7:0,Fw:{},w4:.82,J5:.75,y5:2,
    Rr:{phys:'physicsdamage_v',poison:'poisondamage_v',cold:'colddamage_v',fire:'firedamage_v',light:'lightingdamage_v'},
    Cw:()=>1,n7:()=>false,j1:()=>null,Zw:()=>0,q5:()=>1});
  for(const name of ['r4','U2','t7','i4','r7','Y5','e7','a7'])declaration(s,'src/client/combat/skills-01.js',name);
  declaration(s,'src/client/core/attributes-01.js','N5');
  declaration(s,'src/client/core/helpers-and-config-01.js','b0');
  for(const name of ['Li','F2'])declaration(s,'src/client/core/attributes-02.js',name);
  const stats={skillBonus:{},seriesSkill:0,wmin:100,wmax:100,physPct:0,add:{},enh:{},crit:0,ignoreDef:0,aspd:2,series:0};
  for(const entry of Object.values(manifest).filter(sk=>sk.tier===150)) {
    s.l.fx=[];s.l.combatProjectiles=[];s.v.actionRevision=0;s.v.actionState=null;
    const target={x:45,y:0,hp:100,r:30}, def=s.T[entry.id];let hits=0;
    const skill=s.F2(stats,def,25);
    assert.ok(skill.tot>0,def.n);
    const cast=s.queueSkillContact(s.v,target,skill,()=>{hits++;},{targets:()=>[target],windup:0});
    assert.ok(cast.emitted>0,entry.name);
    assert.ok(s.l.combatProjectiles.filter(effect=>effect.combat===cast).every(effect=>effect.k==='jm'),entry.name);
    const missile=s.l.combatProjectiles[0];
    const sprite=s.JFX.m[s.JFX.f[entry.id].c];
    if(!sprite.spd)assert.equal(missile.kind,0,entry.name+' must remain stationary');
    for(let t=0;t<2;t+=1/60)s.advanceSkillContacts(1/60);
    if(entry.id===1078)assert.equal(cast.pulse,6,'seven Thái Thanh pulses');
    else if(entry.id===1081)assert.equal(cast.pulse,4,'five Thiên Lôi pulses');
    else if(entry.id===1076)assert.equal(cast.pulse,2,'three Tật Hỏa pulses');
    else assert.equal(cast.hits.get(target),1,`${entry.id} ${def.n} primary quota`);
    assert.equal(hits,entry.id===1078?7:entry.id===1081?5:entry.id===1076?3:entry.id===1061?2:1,`${entry.id} ${def.n}`);
  }
});

test('Kiếm Hoa launches exactly five swords in a rotated arrow formation and keeps it while flying straight',()=>{
  for(const [dx,dy] of [[300,0],[0,150],[-300,0],[180,-90]]) {
    const {s,skill}=advancedCombat();s.o.lowFx=true;
    const caster={x:500,y:500,hp:100},target={x:500+dx,y:500+dy,hp:100,r:1};
    const cast=s.queueSkillContact(caster,target,skill(1061),()=>{},{targets:()=>[],windup:0});
    const swords=s.l.combatProjectiles.filter(fx=>fx.combat===cast);
    assert.equal(swords.length,5);assert.equal(cast.emitted,5);
    assert.ok(swords.every(fx=>fx.k==='jm'&&fx.kind===1&&fx.ang===swords[0].ang));
    const angle=swords[0].ang,c=Math.cos(angle),sn=Math.sin(angle);
    const local=swords.map(fx=>{
      const x=fx.x-caster.x,y=(fx.y-(caster.y-14))*2;
      return {forward:x*c+y*sn,side:-x*sn+y*c};
    });
    assert.ok(local[0].forward>local[1].forward+40);
    assert.ok(local[1].forward>local[3].forward+40);
    assert.ok(Math.abs(local[0].side)<1e-8);
    for(const [left,right] of [[1,2],[3,4]]) {
      assert.ok(Math.abs(local[left].forward-local[right].forward)<1e-8);
      assert.ok(Math.abs(local[left].side+local[right].side)<1e-8);
    }
    assert.ok(Math.abs(local[3].side)>Math.abs(local[1].side));
    const before=swords.map(fx=>({x:fx.x,y:fx.y}));target.x+=100;target.y+=90;
    for(let i=0;i<12;i++)s.advanceSkillContacts(1/60);
    const vx=swords[0].x-before[0].x,vy=swords[0].y-before[0].y;
    assert.ok(Math.hypot(vx,vy)>0);
    for(let i=0;i<5;i++) {
      assert.ok(Math.abs(swords[i].x-before[i].x-vx)<1e-8);
      assert.ok(Math.abs(swords[i].y-before[i].y-vy)<1e-8);
      assert.equal(swords[i].ang,angle);
    }
  }
});

test('Kiếm Hoa charge damages around the actual caster once, including quiet, low FX and missing sprites',()=>{
  for(const mode of ['normal','quiet','lowFx','missing','budget']) {
    const {s,skill}=advancedCombat();
    s.l.quiet=mode==='quiet';s.o.lowFx=mode==='lowFx';
    if(mode==='missing')delete s.JFX.c['advanced-6'];
    if(mode==='budget')s.l.fx=Array.from({length:170},()=>({k:'ring'}));
    const caster={x:500,y:500,hp:100},near={x:500,y:555,hp:100,r:1},
      far={x:800,y:500,hp:100,r:1},outside={x:500,y:650,hp:100,r:1};
    const hits=new Map(),cast=s.queueSkillContact(caster,far,skill(1061),hit=>{
      hits.set(hit,(hits.get(hit)||0)+1);hit.hp-=10;
    },{targets:()=>[near,far,outside],windup:0});
    const areas=s.l.combatProjectiles.filter(fx=>fx.combat!==cast);
    assert.equal(areas.length,1);
    const area=areas[0];assert.equal(area.k,'boom');assert.equal(area.combat.actor,caster);
    assert.equal(area.x,caster.x);assert.equal(area.y,caster.y-14);
    assert.equal(area.combat.skill.geo.k,'self');assert.equal(area.combat.skill.geo.r,170);
    assert.equal(area.combat.skill.ev2,true);
    assert.equal(s.l.fx.includes(area),!['quiet','missing','budget'].includes(mode));
    for(let i=0;i<90;i++)s.advanceSkillContacts(1/60);
    assert.equal(hits.get(near),1,mode);assert.equal(hits.get(far),1,mode);
    assert.equal(hits.get(outside),undefined,mode);
    assert.equal(area.combat.hits.get(near),1);assert.equal(cast.hits.get(near),undefined);
    assert.equal(near.hp,90);assert.equal(far.hp,90);assert.equal(outside.hp,100);
    assert.ok(!s.l.combatProjectiles.includes(area),'charge must expire');
  }
});

test('Kiếm Hoa charge and main sword have independent hit quotas and obey terrain and cast cancellation',()=>{
  for(const mode of ['normal','terrain','interrupted']) {
    const {s,skill}=advancedCombat(),target={x:100,y:0,hp:100,r:1};let hits=0;
    if(mode==='terrain')s.mt=()=>false;
    const cast=s.queueSkillContact(s.v,target,skill(1061),()=>hits++,{targets:()=>[target],windup:.12});
    if(mode==='interrupted')s.v.actionRevision=(s.v.actionRevision||0)+1;
    for(let i=0;i<90;i++)s.advanceSkillContacts(1/60);
    assert.equal(hits,mode==='normal'?2:0,mode);
    assert.equal(cast.hits.get(target),mode==='normal'?1:undefined);
  }
});

test('Kiếm Hoa uses the documented p6 charge once, not the secondary missile impact sheet',()=>{
  const {s,skill}=advancedCombat();s.j3=160;
  // Exercise real generic pre-cast rendering to catch a duplicate p6 layer.
  declaration(s,'src/client/render/arena-01.js','Ya');
  const caster={x:500,y:500,hp:100},target={x:800,y:500,hp:100,r:1};
  const cast=s.queueSkillContact(caster,target,skill(1061),()=>{},{targets:()=>[],windup:0});
  const charge=s.l.combatProjectiles.find(fx=>fx.combat!==cast);
  assert.equal(charge.s.f,'fx/advanced/p6.webp');
  assert.equal(charge.s,s.JFX.c[s.JFX.f[1061].pre]);
  assert.equal(charge.s.n,5);assert.equal(charge.life,5*56/1000);
  assert.equal(s.l.fx.filter(fx=>fx.s?.f==='fx/advanced/p6.webp').length,1);
  assert.equal(s.l.fx.filter(fx=>fx.s?.f==='fx/advanced/m325_hit.webp').length,0);
  assert.ok(manifest[1061].assets.includes(charge.s.f));
  for(let i=0;i<12;i++)s.advanceSkillContacts(1/60);
  assert.ok(s.l.fx.includes(charge));
  for(let i=0;i<6;i++)s.advanceSkillContacts(1/60);
  assert.ok(!s.l.fx.includes(charge));
});

// Execute the real j0 support-aggregation loop, followed by the real F2 formula.
function supportStats(s, levels) {
  const text=fs.readFileSync(path.join(ROOT,'src/client/core/attributes-01.js'),'utf8');
  const tree=acorn.parse(text,{ecmaVersion:'latest'});
  const j0=tree.body.find(node=>node.type==='VariableDeclaration'&&node.declarations[0].id.name==='j0').declarations[0].init;
  const loop=j0.body.body.find(node=>node.type==='ForInStatement'&&text.slice(node.start,node.end).includes('u.skillBonus'));
  assert.ok(loop);
  s.o.sk=levels;s.u={skillBonus:{},seriesSkill:0,wmin:100,wmax:100,physPct:0,add:{},enh:{},crit:0,ignoreDef:0,aspd:2,series:0};
  s.w=id=>levels[id]||0;
  vm.runInContext(text.slice(loop.start,loop.end),s);
  return s.u;
}

test('24 detail entries and all 82 exact support curves cover the document without changing level 120',()=>{
  const s=catalog(),details=s.SKILL_150_DETAILS;
  assert.equal(Object.keys(details).length,24);
  let links=0;
  for(const [id,entry]of Object.entries(details)) {
    assert.equal(s.T[id].tier,150);assert.ok(entry.mechanics.length);assert.ok(entry.samples.length);
    for(const link of entry.support) {
      links++;assert.equal(link.coefficients.length,20);
      assert.equal(link.coefficients.at(-1),link.maximum);
      const matches=Object.values(s.T[link.id].attr).filter(rows=>Array.isArray(rows[0])&&rows[0][0]===link.target);
      assert.equal(matches.length,1,`${link.id} -> ${link.target} must not double count`);
      assert.deepEqual(Array.from(matches[0],row=>row[2]),Array.from(link.coefficients));
    }
  }
  assert.equal(links,82);
  for(const [id,total]of [[1055,395],[1056,114],[1076,305],[1081,197]])
    assert.equal(details[id].support.reduce((n,link)=>n+link.maximum,0),total);
  const before=JSON.stringify(s.T);
  load(s,'src/client/data/skill-150-details-01.js');assert.equal(JSON.stringify(s.T),before,'reload must be idempotent');
  const base={window:null,JFX:{m:{},f:{},c:{}}};base.window=base;vm.createContext(base);
  load(base,'public/data.js');load(base,'src/client/data/advanced-skills-01.js');
  for(const skill of Object.values(base.JX.skills)) {
    if(skill.tier===120)assert.equal(JSON.stringify(s.T[skill.id]),JSON.stringify(skill));
    for(const [key,value]of Object.entries(skill.attr))assert.equal(JSON.stringify(s.T[skill.id].attr[key]),JSON.stringify(value),`${skill.id}.${key}`);
  }
});

test('150 support bonuses change real damage, use exact intermediate levels and keep secondary bonuses separate',()=>{
  const {s,skill}=advancedCombat();
  const base=s.F2(supportStats(s,{}),s.T[1055],25).tot;
  let stats=supportStats(s,{14:2});assert.equal(stats.skillBonus[1055],7);
  assert.ok(Math.abs(s.F2(stats,s.T[1055],25).tot/base-1.07)<1e-10);
  stats=supportStats(s,{14:20,218:20,271:20,318:20});assert.equal(stats.skillBonus[1055],395);
  assert.ok(Math.abs(s.F2(stats,s.T[1055],25).tot/base-4.95)<1e-10);
  stats=supportStats(s,{172:20,179:20,182:20,375:20});
  assert.equal(stats.skillBonus[1109],197);assert.equal(stats.skillBonus[1081],undefined);
  assert.ok(skill(1114).tot>0);assert.equal(s.SKILL_150_DETAILS[1114].support.length,0);
});

test('150 skill details use the same compact current/next-level layout as 90 without reference tables',()=>{
  const s=catalog();s.D=text=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  Object.assign(s,{z1:()=>0,UA:skill=>skill.tier===150,wn:()=> 'passive',_7:{passive:'Hỗ trợ'},
    g0:['Kim','Mộc','Thủy','Hỏa','Thổ'],j1:()=>null,Ci:()=>true,B5:{},i4:()=>false,
    xv:()=>['Thông số chiêu'],Gf:()=>[],l1:{},f4:()=>0,Ev:String,Xf:{},
    mw:/^(skill_|missle_)/,ww:10,y7:()=>'',D7:()=>'',v0:()=>0});
  declaration(s,'src/client/core/helpers-and-config-01.js','b0');
  for(const name of ['Bv','Qf'])declaration(s,'src/client/ui/legacy-panels-and-audio-01.js',name);
  declaration(s,'src/client/ui/legacy-panels-and-audio-02.js','Kf');
  for(const id of Object.keys(s.SKILL_150_DETAILS)) {
    const html=s.Kf(+id,10,0,10,10,11);
    assert.match(html,/Cấp hiện tại: 10/);assert.match(html,/Cấp kế tiếp: 11/);
    assert.match(html,/Thông số chiêu/);assert.match(html,/Tiêu hao nội lực:/);
    assert.match(html,/Phạm vi tấn công:/);
    assert.doesNotMatch(html,/<table|<details|skill150-details|Cơ chế tham khảo|Hệ số gốc|Chi tiết tuyệt kỹ 150/);
    assert.ok(!html.includes('undefined'));assert.ok(!html.includes('NaN'));
  }
  s.o.sk={14:20};s.z1=id=>id===14?1:0;
  assert.match(s.Kf(1055,25,0,25,25,0),/Hàng Long Bất Vũ cấp 21: \+132%/);
  assert.doesNotMatch(s.Kf(1055,25,0,25,25,0),/Cấp kế tiếp/);
  s.o.sk={172:20};s.z1=()=>0;
  assert.match(s.Kf(1081,10,0,10,10,11),/Thiên Tế Tấn Lôi → Thiên Lôi Chấn Nhạc \(tầng 2\) cấp 20: \+54%/);
  for(const skill of Object.values(s.T).filter(skill=>skill.tier===120)) {
    const before=s.Kf(skill.id,20,0,20,20,0),details=s.SKILL_150_DETAILS;
    s.SKILL_150_DETAILS=undefined;
    assert.equal(s.Kf(skill.id,20,0,20,20,0),before);s.SKILL_150_DETAILS=details;
  }
  assert.equal(s.Qf(1055,s.T[14]),'Đại Lực Kim Cang Chưởng');
  assert.match(s.Qf(1109,s.T[172]),/Thiên Lôi Chấn Nhạc.*tầng phụ/);
});

function normalizedSkillUi() {
  const s={Math,Set,Map,JFX:{m:{},c:{},f:{}},o:{lvl:150,sk:{}},l:{},
    E:(n,a,b)=>Math.max(a,Math.min(b,n)),mw:/^(skill_|missle_)/,ww:10,
    z1:()=>0,Ci:()=>true,i4:()=>false,wn:()=> 'passive',_7:{passive:'Hỗ trợ'},
    Ev:String,v0:()=>0,D7:()=>'',y7:()=>'',Ti:key=>key,f4:()=>0};
  s.window=s;vm.createContext(s);load(s,'public/data.js');s.T=s.JX.skills;s.S=s.JX;
  const source=fs.readFileSync(path.join(ROOT,'src/client/core/helpers-and-config-01.js'),'utf8');
  const normalize=acorn.parse(source,{ecmaVersion:'latest'}).body.find(node=>
    node.type==='IfStatement'&&source.slice(node.test.start,node.test.end)==='window.SK_STD');
  assert.ok(normalize);
  // Follow the actual manifest order, including the attr replacement that used
  // to erase all imported 150 support links after isolated catalog tests passed.
  for(const {file}of require('../src/client/modules.json').modules) {
    if(/^data\/skill-tables-|^data\/advanced-skills-|^data\/skill-150-details-/.test(file))load(s,'src/client/'+file);
    if(file==='core/helpers-and-config-01.js')vm.runInContext(source.slice(normalize.start,normalize.end),s);
  }
  s.I=Object.fromEntries(s.JX.factions.map(f=>[f.key,f]));
  s.D=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  for(const name of ['b0','i1','pw','UA','j1','B5','g0'])declaration(s,'src/client/core/helpers-and-config-01.js',name);
  declaration(s,'src/client/combat/skills-01.js','l1');
  for(const name of ['Cv','X8','Sv','Iv','Xf'])declaration(s,'src/client/ui/legacy-panels-and-audio-03.js',name);
  for(const name of ['xv','Bv','Qf'])declaration(s,'src/client/ui/legacy-panels-and-audio-01.js',name);
  load(s,'src/client/ui/skill-150-effects-01.js');
  for(const name of ['Gf','Kf'])declaration(s,'src/client/ui/legacy-panels-and-audio-02.js',name);
  return s;
}

test('actual startup normalization preserves all 82 support links and both directions in real skill modals',()=>{
  const s=normalizedSkillUi();let count=0;
  for(const detail of Object.values(s.SKILL_150_DETAILS))for(const link of detail.support) {
    const attrs=Object.values(s.T[link.id].attr).filter(rows=>Array.isArray(rows[0])&&rows[0][0]===link.target);
    assert.equal(attrs.length,1,`${link.id} -> ${link.target} after SK_STD`);
    assert.equal(attrs[0][19][2],link.maximum);count++;
    assert.ok(s.Qf(link.target,s.T[link.id]).includes(detail.name));
  }
  assert.equal(count,82);
  const main=s.Kf(1063,25,0,25,25,0);
  assert.match(main,/Tầng 2: Băng Ngưng Hàn Yên/);assert.match(main,/Số tia: 5/);
  assert.match(main,/Được hỗ trợ/);assert.match(main,/Băng Tung Vô ảnh/);
  assert.match(main,/Băng sát: 1370 đến 2383 điểm/);
  assert.doesNotMatch(main,/<table|<details|Cơ chế tham khảo/);
  const support=s.Kf(102,0,0,0,1,1);
  assert.match(support,/Hỗ trợ sát thương cho:/);assert.match(support,/Thủy Anh Man Tú: \+1%/);
  s.o.sk={99:20};s.z1=id=>id===99?1:0;
  assert.ok(s.Kf(1063,25,0,25,25,0).includes(`${s.T[99].n} cấp 21: +48%`));
});

test('150 tiers use source coefficients and gates while legacy 90 tier tables remain unchanged',()=>{
  const s=normalizedSkillUi();
  const locked=s.Gf(s.T[1079],10);assert.match(locked[0][1],/từ cấp 11/);assert.equal(locked.length,1);
  const unlocked=s.Gf(s.T[1079],25);assert.ok(unlocked.some(row=>row[0]==='ev'&&row[1].includes('Kiếm Minh Thương Khung')));
  assert.ok(unlocked.some(row=>row[1]==='Lôi sát: 35% sát thương chiêu chính'));
  assert.ok(unlocked.some(row=>row[1]==='Độ trễ: 0.18 giây'));
  const legacy=s.Gf(s.T[337],20);assert.ok(legacy.some(row=>row[1].includes('Phong Tuyết Băng Thiên')));
  const previous=s.skill150EffectRows;s.skill150EffectRows=undefined;
  assert.deepEqual(s.Gf(s.T[337],20),legacy);s.skill150EffectRows=previous;
  assert.equal(s.skill150EffectRows(s.T[713],20),null);
});

function kunlunThunderCombat(level=27, options={}) {
  const {s}=advancedCombat();
  for(const name of ['l1','l4','d4','A7','Uw','Jw','F5','f4','n7','Qi'])
    declaration(s,'src/client/combat/skills-01.js',name);
  for(const name of ['Tw','I5','S5']) declaration(s,'src/client/core/attributes-01.js',name);
  for(const name of ['tD','eD']) declaration(s,'src/client/core/state-and-save-01.js',name);
  const stats=supportStats(s,options.support?{172:25,179:25,182:25,375:25}:{});
  s.l.P=stats;s.l.quiet=!!options.quiet;s.o.lowFx=!!options.lowFx;
  s.q0=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)*2);
  const targets=(options.positions||[[180,100],[195,100],[210,100]]).map(([x,y])=>({x,y,hp:100000,r:10}));
  s._1=()=>targets;const hits=[];
  s.hs=(ability,target)=>{hits.push({id:ability.id,secondary:!!ability.ev2,damage:ability.parts.light,target});return ability.parts.light;};
  s.Ls=()=>{};
  if(options.budget)s.l.fx=Array.from({length:170},()=>({k:'ring'}));
  if(options.missing)s.A0.m['advanced-343']={};
  const ability=s.F2(stats,s.T[1081],level);let triggered=false;
  const context=options.sim?{actor:{x:40,y:40,hp:100},targets:()=>targets,hit:s.hs,visual:fn=>fn()}:null;
  const selected=targets[options.selected||0];
  if(options.world) {
    Object.assign(s,{hA:()=>true,iD:()=>selected,Z9:()=>ability,gs:-1,aD:()=>0,S3:()=>false,
      tP:()=>false,o4(){},nD:(_skill,target,list)=>list.filter(other=>other!==target),l8:()=>0,
      G8(){},kn:()=>0,$1:()=>false});
    s.l.manTgt=selected;
    declaration(s,'src/client/core/state-and-save-01.js','oD');s.oD();
  } else if(options.sim) {
    s.nD=(_skill,target,list)=>list.filter(other=>other!==target);s.l8=()=>0;
    const {compileTypeScriptEntry}=require('../tools/build-app');
    vm.runInContext(compileTypeScriptEntry('simulator/skill-cast.ts','SkillCastTest').code,s);
    s.SkillCastTest.castSimulatorSkill(context.actor,selected,ability,()=>true,()=>targets,s.hs,fn=>fn());
  } else s.queueSkillContact(s.v,selected,ability,target=>{
    s.hs(ability,target);
    if(ability.ev&&!triggered){triggered=true;
      for(const event of s.F5(ability))s.eD(ability,target,targets,targets,event,context);
    }
  },{targets:()=>targets,windup:0});
  return {s,ability,hits,targets,selected,advance(seconds){for(let t=0;t<seconds-1e-9;t+=1/60)s.advanceSkillContacts(1/60);}};
}

test('Thiên Địa and Tật Hỏa deliver exactly five/three beats in world and SIM despite low FPS or missing FX',()=>{
  for(const id of [365,1076])for(const mode of ['native','quiet','missing','sim'])for(const dt of [1/60,.05,.4,2]) {
    const {s,skill}=advancedCombat(),ability=skill(id,20),target={x:180,y:100,hp:1000,r:10};
    let hits=0;const hit=contact=>{contact.hp-=10;hits++;};
    s.l.quiet=mode==='quiet';
    if(mode==='missing')delete s.A0.m[s.A0.f[id].c];
    if(mode==='sim') {
      Object.assign(s,{F5:()=>[],l8:()=>0,nD:()=>[],skillCastDistance:()=>200});
      const {compileTypeScriptEntry}=require('../tools/build-app');
      vm.runInContext(compileTypeScriptEntry('simulator/skill-cast.ts','SkillCastTest').code,s);
      s.SkillCastTest.castSimulatorSkill({x:0,y:0,hp:100},target,ability,()=>true,()=>[target],(_skill,contact)=>{hit(contact);return 10;},fn=>fn());
    } else s.queueSkillContact(s.v,target,ability,hit,{targets:()=>[target]});
    s.advanceSkillContacts(.1);assert.equal(hits,0,'wait for release');
    for(let time=0;time<3;time+=dt)s.advanceSkillContacts(dt);
    assert.equal(hits,id===365?5:3,`${id}/${mode}/${dt}`);
    assert.equal(s.l.combatProjectiles.length,0);
  }
});

test('Thiên Lôi delivers five timed primary strikes inside radius 150 at different frame rates and FX settings',()=>{
  for(const level of [1,25])for(const mode of ['native','quiet','missing'])for(const dt of [1/60,.05,.4,2]) {
    const {s,skill}=advancedCombat(),ability=skill(1081,level);
    const target={x:180,y:100,hp:1000,r:10},near={x:280,y:100,hp:1000,r:10},far={x:340,y:100,hp:1000,r:10};
    const hits=[];s.l.quiet=mode==='quiet';
    if(mode==='missing')delete s.A0.m[s.A0.f[1081].c];
    const cast=s.queueSkillContact(s.v,target,ability,hit=>{hit.hp-=10;hits.push(cast.elapsed);},
      {targets:()=>[target,near,far]});
    assert.equal(cast.skill.geo.r,150);assert.equal(cast.skill.rad,ability.rad);
    s.advanceSkillContacts(.1);assert.equal(hits.length,0,'respect windup');
    for(let time=0;time<3;time+=dt)s.advanceSkillContacts(dt);
    assert.equal(target.hp,950);assert.equal(near.hp,950);assert.equal(far.hp,1000);
    if(dt<.1)assert.equal(new Set(hits).size,5,'five separate damage beats');
    assert.equal(s.l.combatProjectiles.length,0);
  }
});

test('world and SIM Thiên Lôi keep primary and secondary recipients inside the reduced field',()=>{
  for(const mode of [{world:true},{sim:true},{world:true,quiet:true},{sim:true,quiet:true}]) {
    const game=kunlunThunderCombat(25,{...mode,positions:[[180,100],[280,100],[340,100]]});
    game.advance(3);
    for(const target of game.targets.slice(0,2))assert.equal(game.hits.filter(hit=>!hit.secondary&&hit.target===target).length,5);
    assert.equal(game.hits.filter(hit=>hit.secondary).length,2,'one original tier-2 strike for each paired recipient');
    assert.ok(game.hits.every(hit=>hit.target!==game.targets[2]),'wide legacy target lists cannot leak secondary damage outside radius 150');
  }
});

test('Thiên Lôi Chấn Nhạc unlocks its real secondary at 11 and max level casts sky lightning after 0.3s',()=>{
  const locked=kunlunThunderCombat(10);locked.advance(2);
  assert.equal(locked.hits.filter(hit=>hit.secondary).length,0);
  for(const level of [11,25,27]) {
    const game=kunlunThunderCombat(level),{s,ability,hits}=game;
    assert.equal(s.F5(ability).length,1,'runtime must register the tier advertised by the tooltip');
    assert.equal(s.F5(ability)[0].sid,1109);
    game.advance(.2);assert.equal(hits.filter(hit=>hit.secondary).length,0);
    const bolts=s.l.combatProjectiles.filter(fx=>fx.combat.skill.ev2);
    assert.equal(bolts.length,2,'pair the follow-up with at most two primary recipients');
    assert.ok(bolts.every(fx=>fx.s===s.A0.m['advanced-343'].fly&&fx.t<0));
    assert.ok(bolts.every(fx=>Math.abs(fx.sp*fx.life-60*.056)<1e-9),'play the entire lightning sheet');
    game.advance(.15);assert.equal(hits.filter(hit=>hit.secondary).length,2,'secondary lands after 0.3s, not a double windup');
    game.advance(4);assert.equal(hits.filter(hit=>hit.secondary).length,2,'animation must not multiply damage');
  }
});

test('Kunlun tier 2 applies its own +252% support and retains damage with quiet, low FX or missing sprites',()=>{
  for(const options of [{},{quiet:true},{lowFx:true},{budget:true},{missing:true},{sim:true}]) {
    const game=kunlunThunderCombat(27,{...options,support:true});game.advance(.7);
    const secondary=game.hits.filter(hit=>hit.secondary);
    assert.equal(secondary.length,2,JSON.stringify(options));
    assert.ok(secondary.every(hit=>Math.abs(hit.damage/game.ability.parts.light-.55*3.52)<1e-9));
    assert.ok(secondary.every(hit=>game.targets.includes(hit.target)));
  }
});

test('Kunlun tier 2 respects cast interruption, zone changes and dead recipients',()=>{
  const interrupted=kunlunThunderCombat();interrupted.s.v.actionRevision=(interrupted.s.v.actionRevision||0)+1;
  // A new cast with a windup can be interrupted before its primary contact.
  interrupted.s.l.combatProjectiles[0].combat.windup=.12;
  interrupted.advance(1);assert.equal(interrupted.hits.length,0);
  const changed=kunlunThunderCombat();changed.advance(.2);changed.s.l.zoneShown=2;changed.advance(1);
  assert.equal(changed.hits.filter(hit=>hit.secondary).length,0);
  const dead=kunlunThunderCombat();dead.advance(.2);dead.targets.forEach(target=>{target.hp=0;target.dead=true;});dead.advance(1);
  assert.equal(dead.hits.filter(hit=>hit.secondary).length,0);
});

test('Kunlun tooltip distinguishes primary support from the +252% secondary support',()=>{
  const s=normalizedSkillUi();s.o.sk={172:20,179:20,182:20,375:20};s.z1=()=>5;
  const html=s.Kf(1081,25,2,27,27,0);
  assert.match(html,/Được hỗ trợ \(chiêu chính: \+0%, tầng 2: \+252%\)/);
});

test('Kunlun ring and lightning share the chosen target when an offset neighbour is contacted first',()=>{
  for(const mode of [{world:true},{sim:true}]) {
    const game=kunlunThunderCombat(27,{...mode,selected:1,positions:[[180,100],[260,130]]}),{s,selected}=game;
    game.advance(.2);
    const main=s.l.combatProjectiles.find(fx=>!fx.combat.skill.ev2);
    assert.equal(main.x,selected.x);assert.equal(main.y,selected.y-14);
    assert.equal(game.hits[0].target,game.targets[0],'neighbour reaches the hit callback before the selected target');
    const sky=s.l.fx.filter(fx=>fx.s===s.A0.m['advanced-343'].fly);
    assert.equal(sky.length,1,'draw one lightning storm, not one at each recipient');
    const draws=[];s.Fa=(sprite,dir,time,x,y)=>{draws.push({sprite,x,y});return true;};
    declaration(s,'src/client/render/arena-01.js','CP');
    s.CP({...sky[0],t:0});
    assert.deepEqual(draws.map(({x,y})=>[x,y]),[[main.x,main.y]]);
    game.advance(.3);
    assert.equal(game.hits.filter(hit=>hit.secondary).length,2,'visual placement does not change secondary damage recipients');
    const impact=s.l.fx.filter(fx=>fx.s===s.A0.m['advanced-343'].hit);
    assert.ok(impact.length<=1);assert.ok(impact.every(fx=>fx.x===main.x&&fx.y===main.y));
  }
});

test('Kiếm Hoa plays eight cosmetic opening rays then ice pillars at every skill level',()=>{
  for(const level of [1,10,11,25]) {
    const {s,skill}=advancedCombat(),caster={x:500,y:500,hp:100},target={x:800,y:500,hp:100,r:10};
    const cast=s.queueSkillContact(caster,target,skill(1061,level),()=>{},{targets:()=>[],windup:0});
    const rays=s.l.fx.filter(fx=>fx.s===s.A0.m['advanced-325'].fly);
    assert.equal(rays.length,8,'opening event 1089 is independent of damage-tier unlock');
    assert.ok(rays.every(fx=>fx.cosmetic&&!fx.combat&&fx.x1===caster.x&&fx.y1===caster.y-20));
    assert.equal(s.l.combatProjectiles.filter(fx=>fx.combat!==cast).length,1,'opening adds no damaging fields');
    for(let i=0;i<12;i++)s.advanceSkillContacts(1/60);
    assert.equal(s.l.fx.filter(fx=>fx.s===s.A0.m['advanced-353'].fly).length,8);
    for(let i=0;i<75;i++)s.advanceSkillContacts(1/60);
    assert.ok(rays.every(fx=>!s.l.fx.includes(fx)),'opening chain must expire');
  }
});

test('Kiếm Hoa opening obeys windup, interruption, quiet, FX budget and zone changes',()=>{
  for(const mode of ['quiet','budget','interrupted','zone']) {
    const {s,skill}=advancedCombat(),caster={x:500,y:500,hp:100};
    if(mode==='quiet')s.l.quiet=true;
    if(mode==='budget')s.l.fx=Array.from({length:170},()=>({k:'ring'}));
    s.queueSkillContact(caster,{x:800,y:500,hp:100,r:10},skill(1061),()=>{},{targets:()=>[],windup:.12});
    if(mode==='interrupted')caster.actionRevision=(caster.actionRevision||0)+1;
    if(mode==='zone')s.l.zoneShown=2;
    s.advanceSkillContacts(1/60);
    assert.equal(s.l.fx.filter(fx=>fx.s===s.A0.m['advanced-325'].fly).length,0,mode);
  }
});

test('Kiếm Hoa registers tier 1091 from level 11 and applies one delayed 30% cold hit per paired recipient',()=>{
  for(const level of [10,11,25])for(const quiet of [false,true]) {
    const {s,skill}=advancedCombat();
    for(const name of ['l1','l4','d4','A7','Uw','Jw','F5','f4','n7','Qi'])declaration(s,'src/client/combat/skills-01.js',name);
    for(const name of ['Tw','I5','S5'])declaration(s,'src/client/core/attributes-01.js',name);
    declaration(s,'src/client/core/state-and-save-01.js','eD');
    s.l.P=supportStats(s,{});s.l.quiet=quiet;
    const ability=skill(1061,level),events=s.F5(ability);
    assert.equal(events.length,level<11?0:1);
    if(level<11)continue;
    assert.equal(events[0].sid,1091);
    const targets=[180,200,220,240].map(x=>({x,y:100,hp:10000,r:10})),hits=[];
    s._1=()=>targets;s.hs=(a,t)=>{hits.push({a,t});return 1;};s.Ls=()=>{};
    s.eD(ability,targets[0],targets,targets,events[0]);
    for(let i=0;i<12;i++)s.advanceSkillContacts(1/60);
    assert.equal(hits.length,0,'respect the 0.22s secondary delay');
    for(let i=0;i<90;i++)s.advanceSkillContacts(1/60);
    assert.equal(hits.length,3,'secondary hits at most three paired targets once');
    assert.ok(hits.every(({a})=>a.ev2&&a.id===1091&&Math.abs(a.parts.cold/ability.tot-.3)<1e-9));
  }
});
