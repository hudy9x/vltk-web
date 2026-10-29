// Snapshot durations are authoritative. The native stat/FX code only presents them.
var OnlineSupport = (()=>{
  let stateKey='',settings=new Map();
  return {
    reset(){stateKey='';settings.clear();if(l.sks){l.sks.buff={};l.sks.cd={};}l.stKey=null;l.dirty=true;},
    sync(state){
      const self=state.actors.find(a=>a.id===state.self);if(!self)return;
      const records=self.supports||[],now=l.clock||0;
      l.sks ||= {buff:{},cd:{}};l.sks.buff={};l.sks.cd={};
      for(const s of records){
        if(s.aura){o.auraOff ||= {};if(s.active)delete o.auraOff[s.skill];else o.auraOff[s.skill]=1;}
        else if(s.active)l.sks.buff[s.skill]=now+s.remaining;
        l.sks.cd[s.skill]=now+s.cooldown;
      }
      const key=records.map(s=>s.skill+':'+s.active).join(',');
      if(key!==stateKey){stateKey=key;l.stKey=null;l.dirty=true;if(typeof onlineTrace!=='undefined')onlineTrace.log('support-state',{player:state.self,supports:records});}
    },
    settings(send){
      for(const id of Object.keys(o.sk||{})){
        if(!o.sk[id]||!T[id]||wn(T[id])!=='buff')continue;
        const enabled=o.autoBuff!==false&&!o.supportAutoOff?.[id];
        if(settings.get(id)!==enabled&&send(9,{skill:+id,target:+enabled}))settings.set(id,enabled);
      }
    },
  };
})();
