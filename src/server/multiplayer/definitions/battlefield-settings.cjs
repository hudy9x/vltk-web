// Global public-room configuration. Only validated native skill IDs cross the API.
const native=require('./runtime.cjs');
const simRecovery=require('../../../shared/sim-recovery.json');
const simRoutes=require('../../../shared/sim-routes.json');
const defaultDrops=require('../../../shared/war-drop-rates.json');
const marshalDefaults=require('../../../shared/marshal-settings.json');
const catalog=require('./catalog.cjs');
const ranks=['soldier','captain','commander','general','grandGeneral'];
const titles=['Binh Sĩ','Hiệu úy','Thống lĩnh','Phó tướng','Đại tướng'];
const resistances=['phys','poison','cold','fire','light'];
let options;
function skillOptions(){
  return options ||= native.withProgression({fac:'shaolin',lvl:200},s=>Object.values(s.I).flatMap(f=>f.skills.map(id=>s.T[id]).filter(row=>row&&s.UA(row)&&((row.req>=50&&row.req<=70)||[90,150].includes(row.tier))).map(row=>({id:row.id,name:f.n+' · '+row.n,element:f.series,level:row.req,tier:row.tier,faction:f.key,icon:row.ic||''}))));
}
function defaults(){return {simPerTeam:10,simRoster:[],simRecovery:structuredClone(simRecovery),durationSeconds:1200,privateDurationSeconds:1200,dropRates:{...defaultDrops},soldiers:Object.fromEntries(ranks.map((rank,i)=>[rank,{count:[50,10,6,4,0][i],hp:[50000,60000,80000,100000,120000][i],skills:[],respawnSeconds:20,patrolRadius:180,leashRadius:800}])),marshals:{song:{...marshalDefaults,hp:200000,res:[35,35,35,35,35]},jin:{...marshalDefaults,hp:200000,res:[35,35,35,35,35]}}};}
function validate(value){
  const result=defaults(),valid=(x,min,max)=>Number.isFinite(x)&&x>=min&&x<=max;
  if(!value||!value.soldiers||!value.marshals)throw new Error('Thiếu cấu hình chiến trường.');
  const simPerTeam=value.simPerTeam??10;
  if(!Number.isSafeInteger(simPerTeam)||simPerTeam<0||simPerTeam>100)throw new Error('SIM mỗi bên: số nguyên từ 0 đến 100.');
  result.simPerTeam=simPerTeam;
  const roster=value.simRoster??[];
  if(!Array.isArray(roster)||roster.length>simPerTeam||roster.some(id=>!simRoutes.some(route=>route.id===id)))throw new Error('Đội hình SIM không hợp lệ hoặc vượt số SIM mỗi bên.');
  result.simRoster=[...roster];
  const recovery=value.simRecovery??simRecovery;
  if(!recovery||!valid(recovery.interval,0.3,60))throw new Error('Khoảng cách bơm SIM: từ 0,3 đến 60 giây.');
  result.simRecovery={interval:recovery.interval};
  for(const key of ['life','mana']){
    const row=recovery[key];
    if(!row||typeof row.enabled!=='boolean'||!Number.isInteger(row.start)||!Number.isInteger(row.stop)||!Number.isInteger(row.urgent)||!valid(row.urgent,1,row.start)||!valid(row.start,1,99)||!valid(row.stop,row.start+1,100))throw new Error('Ngưỡng bơm SIM: liên tục ≤ bắt đầu < mức dừng ≤ 100%.');
    result.simRecovery[key]={enabled:row.enabled,start:row.start,stop:row.stop,urgent:row.urgent};
  }
  for(const key of ['durationSeconds','privateDurationSeconds']){
    const seconds=value[key]??1200;
    if(!Number.isSafeInteger(seconds)||seconds<10||seconds>7200)throw new Error('Thời lượng trận: từ 10 đến 7.200 giây.');
    result[key]=seconds;
  }
  for(const key of Object.keys(defaultDrops)){
    const rate=(value.dropRates??defaultDrops)[key];
    if(!Number.isFinite(rate)||rate<0||rate>100)throw new Error('Tỉ lệ rơi Quân Nhu phải từ 0 đến 100%.');
    result.dropRates[key]=rate;
  }
  let total=0;
  for(const rank of ranks){
    const row=value.soldiers[rank];
    if(!row||!Number.isInteger(row.count)||!valid(row.count,0,100)||!Number.isSafeInteger(row.hp)||!valid(row.hp,1,1e12)||![10,20,30].includes(row.respawnSeconds)||!valid(row.patrolRadius,40,1200)||!valid(row.leashRadius,row.patrolRadius,1600))throw new Error('Cấu hình binh sĩ không hợp lệ.');
    if(!Array.isArray(row.skills)||row.skills.length>2||row.skills.some(id=>!skillOptions().some(s=>s.id===id&&s.level>=50&&s.level<=70)))throw new Error('Binh sĩ chỉ dùng tối đa 2 chiêu cấp 50–70.');
    result.soldiers[rank]={count:row.count,hp:row.hp,skills:[...new Set(row.skills)],respawnSeconds:row.respawnSeconds,patrolRadius:row.patrolRadius,leashRadius:row.leashRadius};total+=row.count;
  }
  if(total>200)throw new Error('Tối đa 200 binh sĩ cả hai phe.');
  for(const team of ['song','jin']){
    const row=value.marshals[team];
    if(!row||!Number.isSafeInteger(row.hp)||!valid(row.hp,1,1e12)||!Array.isArray(row.res)||row.res.length!==5||row.res.some(x=>!valid(x,-100,100)))throw new Error('Nguyên soái: HP hoặc kháng không hợp lệ.');
    const extra={...marshalDefaults,...Object.fromEntries(Object.keys(marshalDefaults).map(key=>[key,row[key]??marshalDefaults[key]]))};
    if(['stunReduction','poisonReduction','coldReduction','hurtReduction'].some(key=>!valid(extra[key],0,100))||!valid(extra.attackSpeedPercent,25,300)||!valid(extra.movementRadius,0,1600))throw new Error('Nguyên soái: giảm thời gian 0–100%, tốc độ đánh 25–300%, phạm vi 0–1.600.');
    result.marshals[team]={hp:row.hp,res:[...row.res],...extra};
  }
  return result;
}
const attackCache=new Map();
function attackProfile(ids){
  const skills=ids.map(id=>{
    if(attackCache.has(id))return structuredClone(attackCache.get(id));
    const option=skillOptions().find(s=>s.id===id);
    const raw=native.withProgression({fac:option.faction,lvl:200},s=>{
      const row=s.T[id],p=s.o;
      Object.assign(p,{lvl:200,sk:{[id]:row.max},skL:{[id]:{lv:row.max,xp:0}},bkOk:{[id]:1},main:id,mainLock:true,slots:[id],eq:{},attr:{str:1000,dex:1000,vit:1000,eng:1000}});
      const code=s.j1(row);
      if(code!==null){
        const weapon=code>=100?[1,code-100]:[0,code===-1?6:code];
        const item=s.equipmentTrader.blueCatalog(p.sex||0).find(item=>item.d===weapon[0]&&item.k===weapon[1]);
        if(item)p.eq.weapon={...structuredClone(item),s:s.I[option.faction].series,r:1,enh:0,mag:[],req:[]};
      }
      return structuredClone(p);
    });
    const skill=catalog.character(raw,[],false).skills.find(s=>s.id===id);
    if(!skill)throw new Error('Không dựng được chiêu '+id);
    const result={...skill,cost:0};attackCache.set(id,result);return structuredClone(result);
  });
  return skills;
}
function configure(base,value){
  const settings=validate(value),definition=structuredClone(base);
  definition.durationSeconds=settings.durationSeconds;
  definition.simPerTeam=settings.simPerTeam;
  definition.simRecovery=settings.simRecovery;
  definition.simRoster=settings.simRoster.map(id=>require('./battlefield.cjs').template(simRoutes.find(route=>route.id===id)));
  definition.dropRates=settings.dropRates;
  const itemScope={};require('node:vm').runInNewContext(require('../../../../tools/build-app.js').compileTypeScriptEntry('simulator/war-rewards.ts','Items').code,itemScope);
  definition.itemKinds=Object.keys(itemScope.Items.WAR_ITEMS);
  const vm=require('node:vm'),{compileTypeScriptEntry}=require('../../../../tools/build-app.js');
  const scope={};vm.runInNewContext(compileTypeScriptEntry('simulator/soldier-config.ts','Config').code,scope);
  const configuration={...Object.fromEntries(ranks.map(rank=>[rank,{...settings.soldiers[rank],skills:[]}])),marshal:{count:0,hp:200000}};
  const skinScope={};vm.runInNewContext(compileTypeScriptEntry('simulator/soldiers.ts','Skins').code,skinScope);
  const skins=skinScope.Skins.SOLDIER_RANK_SKINS;
  definition.soldiers=scope.Config.soldierSpawnPlan(configuration).map(s=>{
    const original=base.soldiers.find(row=>row.rank===s.rank)||base.soldiers[0];
    return {...original,...s,name:titles[ranks.indexOf(s.rank)],skin:skins[s.rank][0],attackSkills:attackProfile(settings.soldiers[s.rank].skills)};
  });
  definition.marshalProfiles={};definition.marshalVariants={};
  definition.marshalMovementRadius=Object.fromEntries(['song','jin'].map(team=>[team,settings.marshals[team].movementRadius]));
  const loadoutScope={};vm.runInNewContext(compileTypeScriptEntry('simulator/marshal-loadout.ts','Marshal').code,loadoutScope);
  const variants=[];
  for(let element=0;element<5;element++){
    const raw=native.withProgression({fac:'shaolin',lvl:200},s=>{
      const loadout=loadoutScope.Marshal.marshalLoadout(s.T,Object.values(s.I),element,s.UA,s.wn,s.j1);
      const p=s.o;Object.assign(p,{fac:loadout.faction,sex:s.Zt[loadout.faction]||0,lvl:200,sk:{},skL:{},bkOk:{},eq:{},inv:[],main:loadout.attacks[0],mainLock:true,slots:loadout.attacks,attr:{str:1000,dex:1000,vit:1000,eng:1000}});
      for(const id of [...loadout.attacks,loadout.support]){p.sk[id]=s.T[id].max;p.skL[id]={lv:p.sk[id],xp:0};p.bkOk[id]=1;}
      const code=s.j1(s.T[loadout.attacks[0]]);
      if(code!==null){const weapon=code>=100?[1,code-100]:[0,code===-1?6:code];const item=s.equipmentTrader.blueCatalog(p.sex).find(item=>item.d===weapon[0]&&item.k===weapon[1]);if(item)p.eq.weapon={...structuredClone(item),s:element,r:1,enh:0,mag:[],req:[]};}
      return {profile:structuredClone(p),attacks:loadout.attacks};
    });
    const profile=catalog.character(raw.profile);
    profile.skills=profile.skills.filter(skill=>raw.attacks.includes(skill.id));
    if(profile.skills.length!==2||profile.support.skills.length!==1)throw new Error('Bộ chiêu Nguyên soái không hợp lệ.');
    variants.push(profile);
  }
  for(const team of ['song','jin']){
    const row=settings.marshals[team];
    definition.marshalVariants[team]=variants.map(source=>{
      const profile=structuredClone(source);
      const normalize=p=>{
        Object.assign(p,{hp:row.hp,res:[...row.res],allyScaling:null,regen:0,manaRegen:0,speed:150});
        p.protection={...p.protection,stunReduction:row.stunReduction,poisonReduction:row.poisonReduction,coldReduction:row.coldReduction,hurtReduction:row.hurtReduction};
        if(p.timing)p.timing.runPercent=100;
        p.skills=p.skills.filter(skill=>profile.skills.some(s=>s.id===skill.id)).map(s=>({...s,cost:0,attackPercent:row.attackSpeedPercent}));
      };
      normalize(profile);
      for(const skill of profile.support.skills){skill.cost=0;skill.lifeCost=false;}
      for(const variant of profile.support.variants)normalize(variant.profile);
      return profile;
    });
  }
  const monsters=native.catalog().monsters;
  definition.marshalSkins=Array.from({length:5},(_,element)=>skins.marshal.find(id=>monsters[id]&&native.monsterSeries(id)===element)||skins.marshal[0]);
  return definition;
}
exports.defaults=defaults;exports.validate=validate;exports.configure=configure;exports.options=()=>({ranks,titles,resistances,skills:skillOptions(),simRoutes});
