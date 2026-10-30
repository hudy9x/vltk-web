// Server-owned recruitment. Equipment, allocation and skills use native formulas.
const vm = require('node:vm');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{createHash}=require('node:crypto');
const root=path.resolve(__dirname,'../../../..');
function cachePath(){
  const hash=createHash('sha256');
  function visit(directory){
    for(const item of fs.readdirSync(path.join(root,directory),{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
      if(['node_modules','target','.git','dist'].includes(item.name))continue;
      const file=directory+'/'+item.name;
      if(item.isDirectory())visit(file);
      else if(/\.(js|cjs|ts|json)$/.test(file)){hash.update(file);hash.update(fs.readFileSync(path.join(root,file)));}
    }
  }
  for(const folder of ['src/client','src/shared','src/server/multiplayer/definitions'])visit(folder);
  for(const file of ['tools/build-app.js','tools/potential-worker.js','tools/maps/catalog.ts']){hash.update(file);hash.update(fs.readFileSync(path.join(root,file)));}
  hash.update(fs.readFileSync(path.join(root,'public/data.js')));hash.update(fs.readFileSync(path.join(root,'public/jxlook.js')));
  return path.join(os.tmpdir(),'vltk-public-war-'+hash.digest('hex')+'.json');
}
const native = require('./runtime.cjs');
const { compileTypeScriptEntry } = require('../../../../tools/build-app.js');
function library(file, name) {
  const scope = {};
  vm.runInNewContext(compileTypeScriptEntry(file, name).code, scope);
  return scope[name];
}
let cached;
exports.definition = function () {
  if (cached) return cached;
  const cache=cachePath();
  try {cached=JSON.parse(fs.readFileSync(cache,'utf8'));if(cached.templates?.length===10&&cached.templates.every(t=>t.appearance&&t.equipment)&&cached.simSupport?.length)return cached;cached=undefined;} catch {}
  const { createArmyEquipment } = library('simulator/equipment.ts', 'ArmyGear');
  const { applyArmySetEquipment } = library('simulator/set-equipment.ts', 'ArmySets');
  const lookScope={};lookScope.window=lookScope;vm.runInNewContext(fs.readFileSync(path.join(root,'public/jxlook.js'),'utf8'),lookScope);
  const { prioritizeLevel60Support } = library('simulator/support-skills.ts', 'ArmySupport');
  const { DEFAULT_SOLDIERS, SOLDIER_TITLES, soldierSpawnPlan } = library('simulator/soldier-config.ts', 'SoldierConfig');
  const { SOLDIER_RANK_SKINS } = library('simulator/soldiers.ts', 'SoldierSkins');
  const layout = require('../../../client/maps/content/9003/layout.json');
  const catalog = require('./catalog.cjs');
  const factions = ['shaolin','tianwang','tangmen','wudu','emei','cuiyan','gaibang','tianren','wudang','kunlun'];
  const templates = factions.map(faction => {
    const build = native.withProgression({fac:faction,lvl:200}, scope => {
      const p = scope.o;
      Object.assign(p, {lvl:200,sex:scope.Zt[faction]||0,attr:{str:0,dex:0,vit:0,eng:0},attrPts:199*scope.z2,
        sk:{},skL:{},bkOk:{},skPts:199,eq:{},inv:[],mainLock:true});
      const rows = scope.I[faction].skills.map(id=>scope.T[id]).filter(s=>s&&s.req<=200);
      for (const s of rows) if ([90,150].includes(s.tier)) {
        p.sk[s.id]=s.max;p.skL[s.id]={lv:s.max,xp:0};p.bkOk[s.id]=1;
      }
      const main=rows.find(s=>s.tier===150&&scope.UA(s))||rows.find(s=>s.tier===90&&scope.UA(s));
      if (!main) throw new Error(`No battlefield attack for ${faction}`);
      p.main=main.id;p.slots=rows.filter(s=>[90,150].includes(s.tier)&&scope.UA(s)&&scope.j1(s)===scope.j1(main)).map(s=>s.id);
      const code=scope.j1(main),weapon=code===null?scope.Kr(scope.I[faction]):[code>=100?1:0,code>=100?code-100:code===-1?6:code];
      const trader={blueCatalog:(...args)=>scope.equipmentTrader.blueCatalog(...args),affixes:(...args)=>scope.equipmentTrader.affixes(...args)};
      // The native trader is bundled for browsers; expose its pure catalog here.
      p.eq=createArmyEquipment(trader,{sex:p.sex||0,level:200,factionId:scope.I[faction].id,series:scope.I[faction].series||0,weapon,points:p.attrPts,enh:0,strength:'normal'},scope.G5,scope.V2);
      p.eq=applyArmySetEquipment({goldCatalog:key=>scope.equipmentTrader.goldCatalog(key),canUpgrade:()=>false,make(template){const item=scope.Ta('gold',template,10);if(item)Object.assign(item,{lock:true,enh:0});return item;}},p.eq,{faction,sex:p.sex||0,level:200,weapon,kind:'gold'});
      scope.l.sim=true;scope.j5();
      if(Object.values(p.eq).some(item=>!scope.p0(item)))throw new Error(`SIM ${faction}: requirements for equipped set not met`);
      prioritizeLevel60Support(p,rows,s=>scope.wn(s));
      scope.l.sim=true;scope.Pt();
      // Evaluate the native score in bounded batches; golden set bonuses make
      // the one-point allocator too costly during room initialization.
      while(p.attrPts>0){
        const amount=Math.min(10,p.attrPts);let best='vit',score=-Infinity;
        for(const key of ['str','dex','vit','eng']){p.attr[key]+=amount;const next=scope.G0(scope.j0());p.attr[key]-=amount;if(next>score){score=next;best=key;}}
        p.attr[best]+=amount;p.attrPts-=amount;
      }
      scope.l.sim=false;
      scope.P0=lookScope.JXLOOK;scope.l.mounted=false;scope.l.P=scope.j0();
      const look=scope.N8();
      return {profile:p,skills:p.slots,name:scope.I[faction].n,sex:p.sex||0,appearance:{sx:look.sx,rows:look.rows,ride:0,mg:scope.l.P.main.phys===false}};
    });
    return {faction,name:build.name,sex:build.sex,skills:build.skills,equipment:build.profile.eq,appearance:build.appearance,profile:catalog.character(build.profile)};
  });
  const base=native.monsterStats(120),monsters=native.catalog().monsters;
  const soldiers=soldierSpawnPlan(DEFAULT_SOLDIERS).map((s,i)=>({
    damage:base.dmg,defense:base.def,speed:30+(monsters[SOLDIER_RANK_SKINS[s.rank][0]]?.run||6)*4,
    ...s,name:SOLDIER_TITLES[s.rank],skin:SOLDIER_RANK_SKINS[s.rank][i%SOLDIER_RANK_SKINS[s.rank].length],
  }));
  const potions=native.potions().filter(p=>p.kind==='life'||p.kind==='mana').map(p=>({level:p.level,hp:p.kind==='life'?p.total:0,mp:p.kind==='mana'?p.total:0}));
  cached={templates,soldiers,potions,simSupport:templates.find(t=>t.faction==='emei').profile.support.skills.filter(s=>s.shared),camps:layout.camps,armySpawns:layout.armySpawns,marshals:layout.marshals};
  try {const temporary=cache+'.'+process.pid+'.tmp';fs.writeFileSync(temporary,JSON.stringify(cached));fs.renameSync(temporary,cache);}catch {}
  return cached;
};
