// Presentation/input only. Rust owns inventory availability, cooldowns and recovery.
var OnlineConsumables = (()=>{
  let autoAt=0;
  const id=p=>({life:0,mana:100,both:200})[p.kind]+p.tier;
  const stock=p=>o.potStock?.[p.kind]?.[p.tier]||0;
  function use(kind,send,quiet=false){
    if(l.deadT>0 || (l.potCd?.[kind]||0)>0)return false;
    const index=kind==='mana'?1:0,selected=typeof co==='function'?co(index):null;
    const potion=selected&&stock(selected)>0?selected:S.potions.filter(p=>p.kind===kind&&stock(p)>0&&o.lvl>=(be[p.tier]||1)).sort((a,b)=>b.tier-a.tier)[0];
    if(!potion){if(!quiet)k('Không có thuốc trong túi nhân vật online.');return false;}
    if((potion.kind==='mana'?l.mana>=l.P.mana:potion.kind==='life'?l.life>=l.P.life:l.life>=l.P.life&&l.mana>=l.P.mana))return false;
    if(!send(7,{skill:id(potion)}))return false;
    l.potCd ||= {life:0,mana:0};
    if(potion.kind==='both')l.potCd.life=l.potCd.mana=.3;else l.potCd[kind]=.3;
    return true;
  }
  return {use,
    auto(dt,send){autoAt-=dt;if(autoAt>0||o.potOff)return;autoAt=.3;
      if(l.life<l.P.life*Math.max(.05,Math.min(.95,(o.potHp??50)/100)))use('life',send,true);
      const main=l.P.main;
      if(l.mana<l.P.mana*Math.max(.05,Math.min(.95,(o.potMp??50)/100)) || (main?.cost>0&&!main.costLife&&l.mana<main.cost*2))use('mana',send,true);
    },
    received(event){const kind=['life','mana','both'][Math.floor(event.skill/100)],tier=event.skill%100;if(!kind)return;
      o.potStock ||= {};o.potStock[kind] ||= {};o.potStock[kind][tier]=event.value;
      l.dirty=true;
      if(typeof onlineTrace!=='undefined')onlineTrace.log('potion-applied',{event:event.id,potion:event.skill,remaining:event.value});
    },
  };
})();
