const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const acorn = require('acorn');
const { loadCombatEngine } = require('./helpers/combat-engine');
const ROOT = path.resolve(__dirname, '..');
const manifest = require('../skill_assets_manifest.json');
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
  for (const file of ['data.js','app/data/projectile-effects-01.js','app/data/projectile-effects-02.js','app/data/advanced-skills-01.js']) load(s,file);
  s.T=s.JX.skills;s.I=Object.fromEntries(s.JX.factions.map(f=>[f.key,f]));s.A0=s.JFX;
  declaration(s,'app/render/arena-01.js','TP');
  return s;
}
test('all 34 advanced skills register once with their faction, icons and usable primary FX', () => {
  const s=catalog();
  for (const entry of Object.values(manifest)) {
    const skill=s.T[entry.id];assert.ok(skill,entry.id);
    assert.equal(skill.tier,entry.tier);assert.equal(skill.req,entry.req);assert.equal(skill.f,entry.faction);
    assert.equal(s.I[skill.f].skills.filter(id=>id===skill.id).length,1);
    assert.ok(fs.existsSync(path.join(ROOT,skill.ic)));
    if (skill.tier===150) {
      assert.ok(['physicsenhance_p','poisondamage_v','colddamage_v','firedamage_v','lightingdamage_v'].some(key=>skill.attr[key]),skill.n);
      const fx=s.JFX.f[skill.id];assert.ok(s.JFX.m[fx.c],skill.n);
      for (const value of Object.values(s.JFX.m[fx.c])) if(value?.f) assert.ok(fs.existsSync(path.join(ROOT,value.f)),value.f);
    } else { assert.equal(skill.enemy,0);assert.match(skill.d,/chưa được áp dụng/); }
  }
  load(s,'app/data/advanced-skills-01.js');
  for(const entry of Object.values(manifest))assert.equal(s.I[entry.faction].skills.filter(id=>id===entry.id).length,1);
});

// Real catalog -> F2 -> G3 -> physical update, shared by the world and arena.
function advancedCombat() {
  const s=catalog();loadCombatEngine(s);load(s,'app/render/projectiles-01.js');
  Object.assign(s,{mw:/^(skill_|missle_)/,ww:10,s7:0,Fw:{},w4:.82,J5:.75,y5:2,
    Rr:{phys:'physicsdamage_v',poison:'poisondamage_v',cold:'colddamage_v',fire:'firedamage_v',light:'lightingdamage_v'},
    Cw:()=>1,n7:()=>false,j1:()=>null,Zw:()=>0,q5:()=>1});
  for(const name of ['r4','U2','t7','i4','r7','Y5','e7','a7'])declaration(s,'app/combat/skills-01.js',name);
  declaration(s,'app/core/attributes-01.js','N5');
  declaration(s,'app/core/helpers-and-config-01.js','b0');
  for(const name of ['Li','F2'])declaration(s,'app/core/attributes-02.js',name);
  const stats={skillBonus:{},seriesSkill:0,wmin:100,wmax:100,physPct:0,add:{},enh:{},crit:0,ignoreDef:0,aspd:2,series:0};
  return {s, skill:(id,level=25)=>s.F2(stats,s.T[id],level)};
}

test('Thiên Vương uses the swapped sheets and manifest tracks the corrected FX',()=>{
  const s=catalog();
  for(const [id,mid] of [[1059,350],[1060,349]]) {
    assert.equal(s.JFX.f[id].c,`advanced-${mid}`);
    assert.ok(manifest[id].assets.includes(`fx/advanced/m${mid}_fly.webp`));
  }
  assert.ok(manifest[1067].assets.includes(s.JFX.m['advanced-329'].hit.f));
});

test('150 fields play one sheet at a fixed caster/target anchor at every skill level',()=>{
  for(const id of [1056,1062,1066,1076,1078,1079,1081,1114])for(const level of [1,25]) {
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
test('every faction skill grid exposes Lv120 and Lv150 while preserving level gates', () => {
  const s=catalog(),nodes=new Map();s.m=id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);};
  Object.assign(s,{document:{querySelectorAll:()=>[]},D:String,N:()=>0,z1:()=>0,SA:()=>false,GA:()=>s.o.lvl,
    W2:skill=>s.o.lvl>=skill.req,m4:()=>false,P4:()=>true,D2(){},Ri(){}});
  for(const name of ['Ni','Q1'])declaration(s,'app/core/attributes-02.js',name);
  declaration(s,'app/ui/world-panels-01.js','$B');
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
test('all 24 level-150 primary skills register physical contacts and hit once within the cast quota', () => {
  const s=catalog();loadCombatEngine(s);load(s,'app/render/projectiles-01.js');
  Object.assign(s, {mw:/^(skill_|missle_)/,ww:10,s7:0,Fw:{},w4:.82,J5:.75,y5:2,
    Rr:{phys:'physicsdamage_v',poison:'poisondamage_v',cold:'colddamage_v',fire:'firedamage_v',light:'lightingdamage_v'},
    Cw:()=>1,n7:()=>false,j1:()=>null,Zw:()=>0,q5:()=>1});
  for(const name of ['r4','U2','t7','i4','r7','Y5','e7','a7'])declaration(s,'app/combat/skills-01.js',name);
  declaration(s,'app/core/attributes-01.js','N5');
  declaration(s,'app/core/helpers-and-config-01.js','b0');
  for(const name of ['Li','F2'])declaration(s,'app/core/attributes-02.js',name);
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
    assert.equal(cast.hits.get(target),1,`${entry.id} ${def.n} primary quota`);
    assert.equal(hits,entry.id===1061?2:1,`${entry.id} ${def.n}`);
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
  declaration(s,'app/render/arena-01.js','Ya');
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
