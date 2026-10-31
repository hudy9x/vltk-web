// Load the same prices, stack limits and item list as the client.
const vm=require('node:vm');
const {compileTypeScriptEntry}=require('../../../../tools/build-app.js');
let model,items;
function catalog(){
  if(!model){const scope={};vm.runInNewContext(compileTypeScriptEntry('gameplay/quartermaster/model.ts','Model').code,scope);model=scope.Model;
    vm.runInNewContext(compileTypeScriptEntry('simulator/war-rewards.ts','Items').code,scope);items=scope.Items;}
  return {model,items};
}
exports.apply=function(p,action,capacity=60){
  const {model,items}=catalog(),kind=action.item;
  if(!Object.hasOwn(items.WAR_ITEMS,kind))throw new Error('Vật phẩm Quân Nhu không hợp lệ.');
  const room=action.room;
  if(!room||!Number.isSafeInteger(room.matchId)||room.matchId<1||!Number.isFinite(room.starts)||
    !Number.isFinite(room.now)||!room.ready||!room.alive||room.map!==9003)throw new Error('Chỉ dùng Quân Nhu khi đang sống trong trận Tống Kim.');
  p.mats||={};p.mats.misc||={};const store=p.mats.misc;
  if(action.kind==='warItemBuy'){
    const map=require('../../../client/maps/content/9003/map.json');
    const near=(map.npcs||[]).some(n=>n.npcId==='quartermaster'&&n.team===(room.team===0?'song':'jin')&&Math.hypot(room.x-n.position.x,(room.y-n.position.y)*2)<=180);
    const inventory=Object.fromEntries(Object.keys(items.WAR_ITEMS).map(k=>[k,store[`tk_${k}`]||0]));
    const slots=capacity-(p.inv||[]).length-['vlmt','ttk','rngua','ldt'].filter(k=>store[k]>0).length-items.warItemStacks(inventory).length;
    model.createQuartermaster({storage:()=>store,freeSlots:()=>slots,available:()=>near,changed(){}}).buy(kind,action.quantity??1);
  }else{
    const key=`tk_${kind}`;
    if(!Number.isSafeInteger(store[key])||store[key]<1)throw new Error('Chưa có loại vật phẩm này.');
    if(!p.warSupplies||p.warSupplies.matchId!==room.matchId||p.warSupplies.starts!==room.starts)
      p.warSupplies={matchId:room.matchId,starts:room.starts,bought:[{},{}],selected:[0,0]};
    const bag=p.warSupplies;
    bag.itemUses=(bag.itemUses||[]).filter(use=>use.at+180>room.now);
    if(bag.itemUses.length>=128)throw new Error('Quá nhiều vật phẩm đang có hiệu lực.');
    bag.itemSequence=(bag.itemSequence||0)+1;
    bag.itemUses.push({seq:bag.itemSequence,kind,at:room.now,x:room.x,y:room.y});
    store[key]--;
  }
};
