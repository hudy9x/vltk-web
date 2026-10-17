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
    assert.ok(s.l.combatProjectiles.every(effect=>effect.k==='jm'),entry.name);
    const missile=s.l.combatProjectiles[0];
    const sprite=s.JFX.m[s.JFX.f[entry.id].c];
    if(!sprite.spd)assert.equal(missile.kind,0,entry.name+' must remain stationary');
    for(let t=0;t<2;t+=1/60)s.advanceSkillContacts(1/60);
    assert.equal(hits,1,`${entry.id} ${def.n}`);
  }
});
