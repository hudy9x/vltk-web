const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const acorn = require('acorn');
const { potentialBundle } = require('../../tools/potential-worker');
const root = path.resolve(__dirname,'../..');

function potentialFixture(faction='wudang', points=12, mainTier=90) {
  const bundle = potentialBundle(), declarations = new Map();
  const context = { Math, Date, console, PotentialAllocation: { config: JSON.parse(fs.readFileSync(path.join(root, 'src/client/config/potential-allocation.json'), 'utf8')) } }; context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,'public/data.js'),'utf8'),context);
  context.JFX={m:{},c:{},f:{}};
  vm.runInContext(fs.readFileSync(path.join(root,'src/client/data/advanced-skills-01.js'),'utf8'),context);
  for(const skill of Object.values(context.JX.skills)) if(skill.learn==='90')Object.assign(skill,{tier:90,req:80});
  context.S=context.JX; context.I=Object.fromEntries(context.JX.factions.filter(f=>f.skills?.length).map(f=>[f.key,f]));
  context.T=context.JX.skills; context.l={sim:true,quiet:true,buffAssume:true,mounted:false};
  for (const {file} of JSON.parse(fs.readFileSync(path.join(root,'src/client/modules.json'))).modules) if(file.endsWith('.js')) {
    const source=fs.readFileSync(path.join(root,'src/client',file),'utf8');
    for (const node of acorn.parse(source,{ecmaVersion:'latest'}).body) if(node.type==='VariableDeclaration')
      for(const declaration of node.declarations) if(declaration.id.type==='Identifier') declarations.set(declaration.id.name,'var '+source.slice(declaration.start,declaration.end)+';');
  }
  const loaded = new Set();
  function load(name) {
    if(loaded.has(name) || ['S','I','T'].includes(name))return;
    const source=declarations.get(name); if(!source)throw Error('Missing fixture declaration '+name);
    for(let attempt=0;attempt<100;attempt++) try { vm.runInContext(source,context);loaded.add(name);return; }
    catch(error){const match=error.message.match(/^([\w$]+) is not defined$/);if(!match)throw error;load(match[1]);}
  }
  for(const name of [...bundle.functions,...bundle.globals])load(name);
  const profile={fac:faction,lvl:150,sex:0,name:'Fixture',attr:{str:0,dex:0,vit:0,eng:0},attrPts:points,
    eq:{},inv:[],sk:{},skL:{},skPts:0,mainLock:true,slots:[],rw:{},battlefieldBuild:{equipped:false}};
  const factionSkills=context.I[faction].skills.filter(id=>context.T[id]?.enemy);
  const main=factionSkills.find(id=>context.T[id].tier===mainTier)||factionSkills[0];
  profile.main=main;profile.slots=[main];
  // No equipment requirement: a minimal native weapon lets each faction cast its own skill.
  context.o=profile;
  const code=context.j1(context.T[main]);
  if(code!==null)profile.eq.weapon={d:code>=100?1:0,k:code>=100?code-100:code===-1?6:code,s:context.I[faction].series,base:[],mag:[],req:[]};
  for(const id of context.I[faction].skills)profile.sk[id]=context.T[id].max||1;
  const external={title:{lifemax_p:[5,0,0]},collection:{lifemax_p:[3,0,0]},active:Object.keys(profile.sk).map(Number),party:[],luck:{},reborn:{dmg:0},newbie:false};
  // Boundary hooks are held constant in both calculations, as they are in the captured job.
  vm.runInContext(`var external, ne=null,J1;var add=(a,b)=>{for(const [k,v] of Object.entries(b)){if(!a[k])a[k]=[0,0,0];for(let i=0;i<3;i++)a[k][i]+=v[i]||0;}},Hb=a=>add(a,external.title),Qb=a=>add(a,external.collection),Vi=a=>external.active.includes(a.id),nm=()=>external.party,Lt=k=>external.luck[k]||0,mo=()=>external.reborn,a4=()=>external.newbie;`,context);
  context.external=external;
  const globals=Object.fromEntries(bundle.globals.map(name=>[name,bundle.serialized.includes(name)?JSON.parse(JSON.stringify(context[name])):context[name]]));
  const input=structuredClone({profile,world:context.l,globals,external,window:{}});
  return { input, bundle, native() { context.o=structuredClone(input.profile);context.l=structuredClone(input.world);if(input.autoSkills)context.Pt();if(input.autoPotential!==false)context.yt();return structuredClone({attr:context.o.attr,attrPts:context.o.attrPts,sk:context.o.sk,skL:context.o.skL,skPts:context.o.skPts,sk150Training:context.o.sk150Training}); } };
}
module.exports={potentialFixture};
