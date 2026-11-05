// Show server-issued items immediately; durable pickup intents reconcile in the background.
var OnlineLoot=(()=>{
  const pending=new Set();
  let lastMove=0,sweepTime=0,selling=false,saleSlot=-1,saleId=null;
  const enabled=()=>typeof OnlineProgression!=='undefined'&&OnlineProgression.enabled();
  const scene=()=>l.dg?'dg:'+String(l.dg.id??l.dg.kind):l.tower?'tower:'+l.tower.floor:'map:'+String(Z0.key);
  function sync(){
    if(!enabled()||!o)return;
    if(saleSlot!==m0){saleSlot=m0;saleId=o.lastAutoSale?.id||null;}
    else if(o.lastAutoSale?.id&&o.lastAutoSale.id!==saleId){
      const sale=o.lastAutoSale;saleId=sale.id;
      C(`<span class="dim">Tự bán ${sale.count} món đồ thừa (+${q(sale.amount)} lượng): ${sale.items.slice(0,3).map(it=>D(it.name)).join(', ')}${sale.count>3?'…':''}</span>`);
    }
    window.localGameItemQueue?.project(o,m0);
    replay();
    const prior=new Map((l.ground||[]).filter(d=>d.serverDrop).map(d=>[d.serverDrop,d]));
    const drops=(o.itemDrops||[]).filter(d=>d.scene===scene()&&d.expires>Date.now());
    l.ground=drops.map(d=>Object.assign(prior.get(d.id)||{age:1},{serverDrop:d.id,it:d.it,x:d.x,y:d.y,range:d.range||xp}));
    if(l.pickTarget&&!l.ground.includes(l.pickTarget))l.pickTarget=null;
  }
  function drop(enemy){
    if(!enabled())return false;
    // Local dungeon/field combat is a development adapter; production world deaths
    // issue the same receipts through the durable Rust outbox instead.
    if(!window.localGameConfig?.development)return false;
    OnlineProgression.run({kind:'lootDrop',monster:{tid:enemy.tid,level:enemy.L,cls:enemy.cls,map:typeof Z0.key==='number'?Z0.key:0,scene:scene(),x:enemy.x,y:enemy.y}})
      .then(()=>{sync();}).catch(error=>k('Chưa lưu được vật phẩm rơi: '+error.message));
    return true;
  }
  function submit(entry){
    if(pending.has(entry.id))return;
    pending.add(entry.id);
    OnlineProgression.run(entry.action,{slot:entry.slot,id:entry.id,durable:true})
      .then(()=>{if(entry.slot===m0){_n('picked');sync();}})
      .catch(error=>{
        window.localGameItemQueue?.remove(entry.id);
        if(entry.slot===m0){
          o.inv=o.inv.filter(it=>it.uid!==entry.receipt.it.uid);
          if(entry.receipt.expires>Date.now()&&!(o.itemDrops||[]).some(d=>d.id===entry.receipt.id))(o.itemDrops||=[]).push(entry.receipt);
          sync();R=true;$();V();k('Chưa nhặt được vật phẩm: '+error.message);
        }
      }).finally(()=>pending.delete(entry.id));
  }
  function replay(){
    for(const entry of window.localGameItemQueue?.pending(m0)||[]){
      // World pickups need the actor reconnected before server-side distance validation.
      if(entry.receipt.source==='world'&&(!onlineWorld.active||!onlineWorld.state))continue;
      submit(entry);
    }
  }
  function pickup(drop){
    if(!drop.serverDrop||!enabled())return false;
    const receipt=(o.itemDrops||[]).find(d=>d.id===drop.serverDrop);
    if(!receipt)return true;
    if(o.inv.length>=INV_MAX&&!(o.autoJunk!==false&&(Cf(receipt.it)||o.inv.some(Cf)))){k('Hành trang đầy.');return false;}
    const entry={id:crypto.randomUUID(),slot:m0,action:{kind:'lootPickup',dropId:drop.serverDrop,autoJunk:o.autoJunk!==false},receipt:structuredClone(receipt)};
    try{
      if(!window.localGameItemQueue)throw Error('Chưa sẵn sàng lưu vật phẩm.');
      window.localGameItemQueue.put(entry);
    }catch(error){k(error.message);return false;}
    // Synchronous projection + render: no network response is needed to open the bag.
    window.localGameItemQueue.project(o,m0);sync();R=true;$();V();
    C(`Nhặt được <span style="color:${_0[drop.it.r||0]}">${D(drop.it.n)}</span>`);
    submit(entry);
    return true;
  }
  function advance(dt){
    sync();for(const d of l.ground)d.age+=dt;
    sweepTime+=dt;if(sweepTime>=30){sweepTime=0;autoSell();}
    if(l.life<=0)return;
    const manual=l.pickTarget;
    const drop=manual||WA().auto&&l.ground.find(d=>d.age>=.4&&(WA().pickAll||mA(d.it)||n3(d.it))&&Math.hypot(d.x-v.x,d.y-v.y)<=d.range);
    if(!drop)return;
    if(Math.hypot(drop.x-v.x,drop.y-v.y)<=drop.range)pickup(drop);
    else if(manual&&performance.now()-lastMove>500){lastMove=performance.now();onlineWorld.move(drop.x,drop.y);}
  }
  function autoSell(){
    if(!enabled()||o.autoJunk===false||selling||window.localGameItemQueue?.pending(m0).length||!o.inv.some(Cf))return;
    selling=true;
    OnlineProgression.run({kind:'autoSell',autoJunk:true}).then(sync).catch(error=>k(error.message)).finally(()=>{selling=false;});
  }
  function setAutoJunk(value){
    o.autoJunk=value;
    if(!enabled())return Promise.resolve();
    return OnlineProgression.run({kind:'inventoryAutomation',autoJunk:value}).then(sync).catch(error=>k(error.message));
  }
  function stash(){
    // Existing currency/material transfers keep their legacy storage; equipment
    // uses the transactional account stash and can never be overwritten by it.
    let legacy={};
    try{const raw=JSON.parse(localStorage.getItem(p1)||'{}');legacy=typeof raw.d==='string'?JSON.parse(raw.d):raw;}catch{}
    return {...(o.itemStash||Ai()),gold:legacy.gold||0,mats:legacy.mats||{ht:{},ore:{},shard:{},misc:{}},items:o.itemStash?.items||[]};
  }
  async function deposit(items){
    await OnlineProgression.run({kind:'stashDeposit',uids:items.map(it=>it.uid)});
    return {ok:true,msg:`Gửi ${items.length} món vào kho`};
  }
  async function withdraw(index){
    const item=o.itemStash?.items[index];if(!item)return {ok:false,msg:'Món không còn trong kho'};
    await OnlineProgression.run({kind:'stashWithdraw',stashId:item.stashId});
    return {ok:true,msg:'Lấy ra: '+item.n};
  }
  return {enabled,scene,sync,drop,pickup,advance,autoSell,setAutoJunk,stash,deposit,withdraw};
})();
