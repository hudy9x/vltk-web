import { createQuartermaster, WAR_PRICES } from './model';
import { WAR_ITEMS, warItemStacks } from '../../simulator/war-rewards';
import type { WarItem } from '../../simulator/war-rewards';
import type { LegacyRecord } from '../../simulator/types';
declare const module:{exports:unknown};
declare var o:LegacyRecord,l:LegacyRecord,v:LegacyRecord,R:boolean,INV_MAX:number,Z0:LegacyRecord;
declare const MapsEngine:{getMap(id:number):LegacyRecord;mapNpcs(map:LegacyRecord):{npcId:string;team?:string;position:{x:number;y:number}}[]};
declare const arenaSimulator:{battlefield:{active:boolean;state:{mapId:number;team:string}}}|null;
declare function $():void;
declare function V():void;
declare function J(html:string,ready:()=>void):void;
declare function D(text:string):string;
const storage=()=>{o.mats||={};return o.mats.misc||={};};
function available() {
  if(!o?.fac||l.life<=0||l.deadT>0)return false;
  const battle=typeof arenaSimulator!=='undefined'&&arenaSimulator?.battlefield.active?arenaSimulator.battlefield.state:null;
  const id=battle?battle.mapId:l.dg||l.tower?0:l.town?37:Number(Z0.key),map=MapsEngine.getMap(id);
  return !!map&&MapsEngine.mapNpcs(map).some(npc=>npc.npcId==='quartermaster'&&(!battle||!npc.team||npc.team===battle.team)&&Math.hypot(v.x-npc.position.x,(v.y-npc.position.y)*2)<=180);
}
const shop=createQuartermaster({storage,available,freeSlots(){
  const store=storage(), inventory=Object.fromEntries((Object.keys(WAR_ITEMS) as WarItem[]).map(kind=>[kind,store[`tk_${kind}`]||0]));
  return INV_MAX-o.inv.length-['vlmt','ttk','rngua','ldt'].filter(key=>(store[key]||0)>0).length-warItemStacks(inventory).length;
},changed(){R=true;l.dirty=true;$();V();}});
function open() {
  let message='';
  function render() {
    J(`<section class="quartermaster-shop"><h3>Quan Quân Nhu</h3><p><b>Quân trạng tích lũy: ${shop.balance.toLocaleString('vi-VN')}</b></p><p class="desc">Chỉ thanh toán bằng quân trạng tích lũy của nhân vật. Mua hàng không giảm quân trạng xét danh hiệu trong trận.</p><p role="status">${D(message)}</p><div class="shoplist">${(Object.keys(WAR_ITEMS) as WarItem[]).map(kind=>{
      const item=WAR_ITEMS[kind];
      const controls=[1,10].map(quantity=>{
        let error='';try{shop.quote(kind,quantity);}catch(reason){error=reason instanceof Error?reason.message:String(reason);}
        return `<button class="btn" data-quartermaster-buy="${kind}" data-quantity="${quantity}" ${error?'disabled':''} title="${D(error||`Mua ${quantity} ${item.name}`)}">${quantity===1?'Mua':'×10'}</button>`;
      }).join('');
      return `<div class="shoprow quartermaster-product"><img src="${item.icon}" width="24" height="24" alt="${item.name}"><span><b>${item.name}</b><small>${item.description} · ${kind.endsWith('Trap')?'Bẫy tồn tại 30 giây':'Hiệu lực 180 giây'}<br>${WAR_PRICES[kind].toLocaleString('vi-VN')} điểm/món · Đang có ${storage()[`tk_${kind}`]||0}</small></span><div class="quartermaster-actions">${controls}</div></div>`;
    }).join('')}</div></section>`,()=>{
      document.querySelectorAll<HTMLButtonElement>('[data-quartermaster-buy]').forEach(button=>button.onclick=()=>{
        const kind=button.dataset.quartermasterBuy as WarItem,quantity=Number(button.dataset.quantity);
        try{shop.buy(kind,quantity);message=`Đã mua ${quantity} ${WAR_ITEMS[kind].name}.`;}catch(error){message=error instanceof Error?error.message:String(error);}
        render();
      });
    });
  }
  render();
}
module.exports={open};
