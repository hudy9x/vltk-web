// Server-generated equipment receipts. Item rolls and replacement inventories never come from clients.
const native=require('../definitions/runtime.cjs');
const {randomUUID}=require('node:crypto');
const fail=message=>{throw Object.assign(new Error(message),{status:400});};
function nextUid(profile){
  const used=[...(profile.inv||[]),...Object.values(profile.eq||{}),...(profile.itemDrops||[]).map(d=>d.it)];
  return Math.max(Number.isSafeInteger(profile.uid)?profile.uid:1,1+Math.max(0,...used.map(it=>it.uid).filter(Number.isSafeInteger)));
}
exports.roll=function(profile,monster,receipt){
  if(!monster||!Number.isInteger(monster.level)||monster.level<1||monster.level>200||!['normal','elite','boss'].includes(monster.cls)||
    !Number.isFinite(monster.x)||!Number.isFinite(monster.y)||Math.abs(monster.x)>1e6||Math.abs(monster.y)>1e6||
    typeof monster.scene!=='string'||monster.scene.length>80)fail('Nguồn vật phẩm không hợp lệ.');
  return native.withProgression(profile,s=>{
    if(!s.r0[monster.tid])fail('Quái vật không hợp lệ.');
    s.o.uid=nextUid(s.o);
    const enemy={L:monster.level,cls:monster.cls,series:s.j2(monster.tid)};
    const items=s.P6(enemy),gold=s.jp(enemy);if(gold)items.push(gold);
    const drops=(s.o.itemDrops||[]).filter(d=>d.expires>Date.now());
    if(drops.length+items.length>500)fail('Có quá nhiều vật phẩm chưa nhặt.');
    for(const [index,it]of items.entries())drops.push({id:receipt+':'+index,it,scene:monster.scene,map:monster.map,x:monster.x,y:monster.y,range:monster.range||26,source:monster.source||'legacy',expires:Date.now()+120000});
    s.o.itemDrops=drops;
    return s.o;
  });
};
exports.createStashes=function(db){
  db.exec('CREATE TABLE IF NOT EXISTS multiplayer_stashes(account TEXT PRIMARY KEY,data TEXT NOT NULL)');
  function read(account){
    const row=db.prepare('SELECT data FROM multiplayer_stashes WHERE account=?').get(account);
    if(row)return JSON.parse(row.data);
    const old=db.prepare('SELECT value FROM account_storage WHERE account_id=? AND key=?').get(account,'jxidle_stash');
    const wrapper=old?JSON.parse(old.value):{},saved=typeof wrapper.d==='string'?JSON.parse(wrapper.d):wrapper;
    const data={v:1,id:randomUUID(),rev:0,gold:saved.gold||0,mats:saved.mats||{ht:{},ore:{},shard:{},misc:{}},items:(saved.items||[]).map(it=>({...it,stashId:randomUUID()}))};
    db.prepare('INSERT INTO multiplayer_stashes VALUES(?,?)').run(account,JSON.stringify(data));
    return data;
  }
  function transfer(account,p,action){
    const stash=read(account);p.inv||=[];
    if(action.kind==='stashDeposit'){
      if(!Array.isArray(action.uids)||!action.uids.length||action.uids.length>60||new Set(action.uids).size!==action.uids.length)fail('Danh sách gửi kho không hợp lệ.');
      const items=action.uids.map(uid=>Number.isSafeInteger(uid)&&p.inv.find(it=>it.uid===uid));
      if(items.some(it=>!it||['newbie_token','sim_token','test_token'].includes(it.ktc?.k)))fail('Không sở hữu vật phẩm gửi kho.');
      if(stash.items.length+items.length>60)fail('Kho đầy (60 món).');
      for(const it of items)stash.items.push({...it,stashId:randomUUID()});
      p.inv=p.inv.filter(it=>!action.uids.includes(it.uid));
    }else{
      const at=stash.items.findIndex(it=>it.stashId===action.stashId);if(at<0)fail('Món không còn trong kho.');
      const limit=native.withProgression(p,s=>s.INV_MAX);if(p.inv.length>=limit)fail('Hành trang đầy.');
      const item=stash.items.splice(at,1)[0];delete item.stashId;
      p.uid=nextUid(p);
      item.uid=p.uid++;p.inv.unshift(item);
    }
    stash.rev++;db.prepare('UPDATE multiplayer_stashes SET data=? WHERE account=?').run(JSON.stringify(stash),account);
    return p;
  }
  return {read,transfer};
};
function sweep(s){
  const before=s.o.inv.slice();s.Of();
  return before.filter(it=>!s.o.inv.includes(it));
}
function receipt(s,sold,id,previousGold){
  if(!Number.isSafeInteger(s.o.gold)||s.o.gold<0)fail('Số dư vượt giới hạn lưu trữ.');
  if(sold.length)s.o.lastAutoSale={id,count:sold.length,amount:s.o.gold-previousGold,items:sold.map(it=>({uid:it.uid,name:it.n,price:s.x0(it)}))};
  return s.o;
}
exports.autoSell=function(p,id,enabled){
  return native.withProgression({...p,autoJunk:enabled},s=>{
    const previous=s.o.gold;return receipt(s,sweep(s),id,previous);
  });
};
// A manual sale names owned UIDs only. The server supplies prices and commits
// the debit and credit together; clients cannot upload replacement inventories.
exports.sell=function(p,action){
  return native.withProgression(p,s=>{
    const {uids,bulk}=action;
    if(typeof bulk!=='boolean'||!Array.isArray(uids)||!uids.length||uids.length>s.INV_MAX||new Set(uids).size!==uids.length||uids.some(uid=>!Number.isSafeInteger(uid)))fail('Danh sách bán không hợp lệ.');
    if(!bulk&&uids.length!==1)fail('Chỉ bán một món mỗi lần.');
    const sold=uids.map(uid=>s.o.inv.find(it=>it.uid===uid));
    if(sold.some(it=>!it))fail('Không sở hữu vật phẩm bán.');
    if(sold.some(it=>it.lock||['newbie_token','sim_token','test_token'].includes(it.ktc?.k)||bulk&&s.Ja(it)))fail('Vật phẩm được bảo vệ không thể bán.');
    const amount=sold.reduce((total,it)=>total+s.x0(it),0),gold=s.o.gold+amount;
    if(!Number.isSafeInteger(amount)||amount<0||!Number.isSafeInteger(gold)||gold<0)fail('Số dư vượt giới hạn lưu trữ.');
    s.o.gold=gold;s.o.inv=s.o.inv.filter(it=>!uids.includes(it.uid));
    return s.o;
  });
};
exports.pickup=function(p,id,commandId,enabled=false){
  return native.withProgression({...p,autoJunk:enabled},s=>{
    const at=(s.o.itemDrops||[]).findIndex(d=>d.id===id&&d.expires>Date.now());
    if(at<0)fail('Vật phẩm không còn dưới đất.');
    const drop=s.o.itemDrops[at],previous=s.o.gold,sold=sweep(s);
    if(enabled&&s.Cf(drop.it)){s.o.gold+=s.x0(drop.it);sold.push(drop.it);}
    else{
      if(s.o.inv.length>=s.INV_MAX)fail('Hành trang đầy.');
      s.o.inv.unshift(drop.it);
    }
    s.o.itemDrops.splice(at,1);
    return receipt(s,sold,commandId,previous);
  });
};
