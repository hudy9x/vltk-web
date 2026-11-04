// GM test profiles use the same equipment and native stat builder as public Tống Kim.
const native=require('./runtime.cjs');
const catalog=require('./catalog.cjs');
const fail=message=>{throw Object.assign(new Error(message),{status:400});};
exports.options=()=>native.withProgression({fac:'wudang',lvl:200},s=>Object.values(s.I).filter(f=>!f.novice&&f.skills?.length).map(f=>({key:f.key,name:f.n,skills:f.skills.map(id=>s.T[id]).filter(r=>r&&s.UA(r)&&r.req>=80&&r.tier<=150).map(r=>({id:r.id,name:r.n,tier:r.tier,required:r.req}))})));
exports.configure=function(input,faction,skill,equipped=true,preserve=false){
  if(typeof faction!=='string'||!Number.isSafeInteger(skill)||typeof equipped!=='boolean')fail('Cấu hình không hợp lệ.');
  const template=equipped&&!preserve?require('./battlefield.cjs').definition().templates.find(t=>t.faction===faction):null;
  return native.withProgression(input,s=>{
    const f=s.I[faction],r=s.T[skill],p=s.o;
    if(!f||f.novice||!f.skills.includes(skill)||!r||!s.UA(r)||r.req<80||r.tier>150)fail('Chọn chiêu tấn công cấp 80–150 thuộc môn phái.');
    p.fac=faction;p.sex=s.Zt[faction]||0;p.sexSet=1;p.lvl=Math.max(150,p.lvl);p.xp=0;
    p.sk={};p.skL={};p.bkOk={};p.skPts=0;p.sk150Training=1;
    for(const id of f.skills){const row=s.T[id];if(row&&row.req<=p.lvl){p.sk[id]=row.max;p.skL[id]={lv:row.max,xp:0};p.bkOk[id]=1;}}
    p.main=skill;p.mainLock=true;p.rot=false;p.slots=[skill];p.autoEquip=false;p.onlineMounted=false;
    p.eq=!preserve&&equipped&&template?structuredClone(template.equipment):{};
    const code=s.j1(r);if(code!==null){const item=s._A(code>=100?1:0,code>=100?code-100:code===-1?6:code,p.lvl,0);if(item)p.eq.weapon=item;}
    const budget=preserve?Math.max((p.lvl-1)*s.z2,(input.attrPts||0)+Object.values(input.attr||{}).reduce((a,b)=>a+b,0)):(p.lvl-1)*s.z2;
    p.attr={str:0,dex:0,vit:0,eng:0};p.attrPts=budget;
    s.l.sim=true;s.j5();
    while(p.attrPts>0){const n=Math.min(10,p.attrPts);let best='vit',score=-Infinity;for(const key of ['str','dex','vit','eng']){p.attr[key]+=n;const v=s.G0(s.j0());p.attr[key]-=n;if(v>score){score=v;best=key;}}p.attr[best]+=n;p.attrPts-=n;}
    return structuredClone(p);
  },30000);
};
exports.sim=function(faction,skill,hp,equipped){
  if(!Number.isSafeInteger(hp)||hp<1||hp>1000000000)fail('HP phải từ 1 đến 1.000.000.000.');
  const raw=exports.configure({fac:faction,lvl:200},faction,skill,equipped);
  raw.potStock={mana:Object.fromEntries(native.potions().filter(p=>p.kind==='mana').map(p=>[p.tier,1000000]))};
  // Rebuild every support variant so activating a buff cannot discard the HP override.
  const profile=catalog.character(raw);profile.hp=hp;for(const v of profile.support?.variants||[])v.profile.hp=hp;
  const look=native.withProgression(raw,s=>{const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');const l={};l.window=l;vm.runInNewContext(fs.readFileSync(path.resolve(__dirname,'../../../../public/jxlook.js'),'utf8'),l);s.P0=l.JXLOOK;s.l.mounted=false;s.l.P=s.j0();const a=s.N8();return {sx:a.sx,rows:a.rows,ride:0,mg:s.l.P.main.phys===false};});
  return {profile,appearance:look,faction,sex:raw.sex,name:'SIM',skill};
};
exports.monster=function(hp,dummy=false){
  if(!Number.isSafeInteger(hp)||hp<1||hp>1000000000)fail('HP không hợp lệ.');
  const row=native.catalog().monsters[602],stats=native.monsterStats(150);
  return {id:dummy?999001:602,name:dummy?'Bao cát':row.n,level:150,hp,damage:dummy?0:stats.dmg*0.75,defense:stats.def,speed:dummy?0:30+(row.run||6)*4,res:['phys','poison','cold','fire','light'].map(()=>Math.min(75,150*0.35)),series:native.monsterSeries(602),xp:0,gold:0};
};
exports.tokens=function(p,s){for(const key of ['sim_token','test_token'])if(!p.inv.some(i=>i.ktc?.k===key)){if(p.inv.length>=s.INV_MAX)fail('Cần hai ô hành trang trống.');s.B4(key,1);const item=p.inv.find(i=>i.ktc?.k===key);if(item)item.lock=true;}return p;};
