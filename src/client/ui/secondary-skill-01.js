// A separate mouse binding; choosing or casting it never changes the primary/F slots.
var secondarySkill = (()=>{
  function select(id){
    if(id===-1)id=0;
    if(id&&!canSlotSkill(id))return;
    if(typeof OnlineProgression!=='undefined'&&OnlineProgression.dispatch({kind:'secondarySkill',skill:id||null}))return;
    o.secondarySkill=id;l.dirty=true;qA();$();
  }
  function render(){
    const button=m('#bSecondary');if(!button)return;
    const id=o.secondarySkill,skill=T[id],valid=skill&&canSlotSkill(id);
    button.querySelector('i').style.backgroundImage=valid&&skill.ic?`url('${skill.ic}')`:'';
    button.title='Chiêu phụ · Chuột phải: '+(valid?skill.n:'Bấm để chọn');
    button.classList.toggle('empty',!valid);
  }
  function use(target){
    const id=o.secondarySkill,skill=T[id];
    if(!skill||!canSlotSkill(id)){k('Bấm ô chiêu phụ (R) để chọn chiêu dùng chuột phải.');return;}
    if(l.town||l.deadT>0||l.life<=0)return;
    if(UA(skill)){
      const attack=l.P.actives.find(s=>s.id===id);
      if(!attack){k('Chiêu phụ chưa dùng được với trang bị hiện tại.');return;}
      if(!ji(attack))return;
    }
    if(typeof gameMultiplayer!=='undefined'&&gameMultiplayer.pve){onlineWorld.secondary(target,id);return;}
    if(!UA(skill)){
      if(wn(skill)==='curse'&&!target)return;
      if(target)l.manTgt=target;
      castSupportSkill(id);return;
    }
    if(!target||target.dead||target.hp<=0)return;
    Y.target=null;Y.mouse=false;l.clickHold=false;l.manTgt=target;
    l.secondaryCast={skill:id,target};
  }
  return {select,render,use};
})();
