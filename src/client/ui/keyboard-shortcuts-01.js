// Capture dialog shortcuts before movement, consumables and modal Escape handlers.
var dialogHotkeys = (()=>{
  const panels={escape:'more',q:'char',w:'inv',e:'skill',r:'forge',t:'quest',p:'party'};
  function handle(event){
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
      if(typeof developerTools!=='undefined')developerTools.closeOpen();
    }
    if(modal&&!modal.classList.contains('hidden'))n0(true);
    const party=document.getElementById('online-party'),partyButton=document.getElementById('online-party-toggle');
    if(panel==='party'){
      if(partyButton)partyButton.click();else if(typeof ui==='function')ui();
      return;
    }
    if(party&&!party.hidden)partyButton?.click();
    if(Bm())bB(panel);
    else if(PA===panel&&(panel!=='more'||Vt==='sys'))fA('log');
    else {if(panel==='more')Vt='sys';mi(panel);}
  }
  window.addEventListener('keydown',handle,true);
  return {handle};
})();
