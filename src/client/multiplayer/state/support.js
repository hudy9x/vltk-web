// Snapshot durations are authoritative. The native stat/FX code only presents them.
var OnlineSupport = (()=>{
  let stateKey='',settings=new Map(),allies=[],harmful=[];
  return {
    shared(){return allies;},
    harmful(){return harmful;},
    reset(){allies=[];harmful=[];if(typeof v!=='undefined'){v.curse={};v.curseL={};}stateKey='';settings.clear();if(l.sks){l.sks.buff={};l.sks.cd={};}l.stKey=null;l.dirty=true;},
    sync(state){
      const self=state.actors.find(a=>a.id===state.self);if(!self)return;
      const records=self.supports||[],now=l.clock||0;
      harmful=self.curses||[];
      if(typeof v!=='undefined'){v.curse={};v.curseL={};for(const c of harmful){v.curse[c.skill]=now+c.remaining;v.curseL[c.skill]=c.level;}}
      allies=records.filter(s=>s.shared&&s.active).map(s=>[s.skill,s.level]);
      l.sks ||= {buff:{},cd:{}};l.sks.buff={};l.sks.cd={};
      for(const s of records){
        if(s.shared)continue;
        if(s.aura){o.auraOff ||= {};if(s.active)delete o.auraOff[s.skill];else o.auraOff[s.skill]=1;}
        else if(s.active)l.sks.buff[s.skill]=now+s.remaining;
        l.sks.cd[s.skill]=now+s.cooldown;
      }
      const key=records.map(s=>s.skill+':'+s.active+':'+(s.level||0)+':'+!!s.shared).join(',');
      if(key!==stateKey){stateKey=key;l.stKey=null;l.dirty=true;if(typeof onlineTrace!=='undefined')onlineTrace.log('support-state',{player:state.self,supports:records});}
    },
    settings(send){
      for(const id of Object.keys(o.sk||{})){
        if(!o.sk[id]||!T[id]||!['buff','curse'].includes(wn(T[id])))continue;
        const enabled=(wn(T[id])==='curse'?o.autoCurse:o.autoBuff)!==false&&!o.supportAutoOff?.[id];
        if(settings.get(id)!==enabled&&send(9,{skill:+id,target:+enabled}))settings.set(id,enabled);
      }
    },
  };
})();
