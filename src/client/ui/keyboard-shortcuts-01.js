// Capture dialog shortcuts before movement, consumables and modal Escape handlers.
var dialogHotkeys = (()=>{
  const panels={escape:'more',q:'char',w:'inv',e:'skill',r:'forge',t:'quest',p:'party'};
  function handle(event){
    if(event.key==='Escape'&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
      const result=document.getElementById('battlefield-result'),modal=document.getElementById('modal');
      if(document.getElementById('csel')||(result&&!result.hidden)||(modal&&!modal.classList.contains('hidden')&&modal.dataset.locked))return;
      const dialogs=[];
      const add=(node,close)=>{const existing=dialogs.find(dialog=>node&&dialog.node===node);if(existing)existing.close=close;else dialogs.push({node,close});};
      for(const node of document.querySelectorAll('[role="dialog"],.war-dialog')){
        if(node.hidden||node.classList.contains('hidden')||!node.getClientRects().length)continue;
        const close=node.querySelector('.war-close,[data-dialog-close],button[aria-label^="Đóng"]');
        if(close)add(node,()=>close.click());
      }
      // O2 describes desktop layout support; dn describes whether the bag is open.
      if(typeof Bm==='function'&&Bm()&&document.body.classList.contains('u20win'))add(document.getElementById('panel'),()=>_r());
      if(typeof dn==='function'&&dn())add(document.getElementById('u2bagw'),()=>A5());
      const party=document.getElementById('online-party'),partyButton=document.getElementById('online-party-toggle');
      if(party&&!party.hidden&&partyButton)add(party,()=>partyButton.click());
      if(modal&&!modal.classList.contains('hidden'))add(modal,()=>n0(true));
      const focused=event.target?.closest?.('[role="dialog"],.war-dialog,#panel,#u2bagw,#online-party,#modal');
      const z=dialog=>dialog.node&&typeof getComputedStyle==='function'?Number(getComputedStyle(dialog.node).zIndex)||0:0;
      const dialog=dialogs.find(dialog=>dialog.node&&dialog.node===focused)||dialogs.sort((a,b)=>z(a)-z(b)).at(-1);
      if(dialog){event.preventDefault();event.stopImmediatePropagation();if(!event.repeat){event.target?.blur?.();dialog.close();}return;}
    }
    if(typeof OnlineBattlefield!=='undefined'&&OnlineBattlefield.handleKey?.(event))return;
    const key=event.key?.toLowerCase(),panel=panels[key];
    if(!panel||event.ctrlKey||event.metaKey||event.altKey||typeof o==='undefined'||!o?.fac)return;
    const target=event.target,editing=/^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName)||target?.isContentEditable;
    if(editing&&key!=='escape')return;
    if(document.getElementById('csel'))return;
    const result=document.getElementById('battlefield-result');
    if(result&&!result.hidden)return;
    const modal=document.getElementById('modal');
    if(modal&&!modal.classList.contains('hidden')&&modal.dataset.locked)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(event.repeat)return;
    if(key==='escape'){
      target?.blur?.();
      if(typeof developerTools!=='undefined'&&developerTools.closeOpen())return;
    }
    if(modal&&!modal.classList.contains('hidden')){n0(true);if(key==='escape')return;}
    const party=document.getElementById('online-party'),partyButton=document.getElementById('online-party-toggle');
    if(panel==='party'){
      if(partyButton)partyButton.click();else if(typeof ui==='function')ui();
      return;
    }
    if(party&&!party.hidden){partyButton?.click();if(key==='escape')return;}
    if(key==='escape'&&Bm()){
      if(document.body.classList.contains('u20win')){_r();return;}
    }
    if(key==='escape'&&!Bm()&&PA&&PA!=='log'){fA('log');return;}
    if(Bm())bB(panel);
    else if(PA===panel&&(panel!=='more'||Vt==='sys'))fA('log');
    else {if(panel==='more')Vt='sys';mi(panel);}
  }
  window.addEventListener('keydown',handle,true);
  return {handle};
})();
