// Equipment commands resolve catalog entries and owned UIDs on the server.
// Never accept item rolls, prices, stats or a replacement inventory from clients.
const fail=message=>{throw Object.assign(new Error(message),{status:400});};
exports.apply=function(s,action){
  const p=s.o,space=n=>{if(p.inv.length+n>s.INV_MAX)fail('Hành trang đầy.');};
  switch(action.kind){
    case 'equipmentTrader':{
      const method={item:'trade',compatible:'tradeCompatible',rings:'grantRings'}[action.operation];
      if(!method)fail('Giao dịch trang bị không hợp lệ.');
      // Native catalogs validate every selection and roll attributes on the server.
      try{s.equipmentTrader[method](action.selection);}catch(error){fail(error.message);}
      break;
    }
    case 'horseBuy':{
      const template=s.S.items[10].list.find(t=>`${t.k}:${t.lvl}`===action.offer&&s.Mc[t.k]==null&&s.st({...t,d:10})>=0);
      if(!template)fail('Ngựa không còn trong danh sách bán.');
      space(1);if(!(p.knb>=10))fail('Không đủ 10 KNB.');
      const item=s._A(10,template.k,template.lvl,0);if(!item)fail('Không tạo được ngựa.');
      item.stOut=1;p.inv.unshift(item);p.knb-=10;break;
    }
    case 'shopBuy':{
      const rows=Object.hasOwn(s.S.shops,action.shop)?s.S.shops[action.shop]?.items:null;
      const offer=Array.isArray(rows)&&rows.find(t=>['g','d','k','lvl','s'].every(key=>(t[key]??null)===(action.offer?.[key]??null)));
      if(!offer)fail('Mặt hàng không hợp lệ.');
      const price=s.io(offer)*(offer.g===1?s.At:1);
      if(!Number.isFinite(price)||price<0||p.gold<price)fail('Không đủ ngân lượng.');
      if(offer.g===1){const potion=s.tc(offer);if(!potion)fail('Thuốc không hợp lệ.');const stock=s.C1(potion.kind);stock[potion.tier]=(stock[potion.tier]||0)+s.At;}
      else{space(1);const item=s._A(offer.d,offer.k,offer.lvl,0);if(!item)fail('Không tạo được trang bị.');item.s=s.ac(offer,item);p.inv.unshift(item);if(p.autoEquip&&s.FA(item))s.J1(item,true);}
      p.gold-=price;break;
    }
    case 'equip':{
      if(!Number.isSafeInteger(action.uid))fail('Mã trang bị không hợp lệ.');
      const item=p.inv.find(t=>t.uid===action.uid);
      if(!item||!s.p0(item)||item.pack||item.ktc)fail('Không sở hữu hoặc chưa đủ điều kiện mặc trang bị.');
      s.J1(item,true);break;
    }
    case 'unequip':{
      if(!Object.hasOwn(p.eq,action.slot))fail('Ô trang bị trống.');
      space(1);p.inv.unshift(p.eq[action.slot]);delete p.eq[action.slot];break;
    }
    case 'mount':
      if(typeof action.enabled!=='boolean')fail('Trạng thái cưỡi ngựa không hợp lệ.');
      if(action.enabled&&!s.xe())fail('Chưa đủ điều kiện cưỡi ngựa.');
      p.onlineMounted=action.enabled;break;
    default:return false;
  }
  if(!s.xe())p.onlineMounted=false;
  return true;
};
