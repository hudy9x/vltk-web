// Mouse targeting and mode UI only; permissions/damage are enforced again by Rust.
var OnlinePvp=(()=>{
  let initialized=false,pending=0,wanted=false;
  const self=state=>state?.actors.find(a=>a.id===state.self);
  const color=actor=>actor?.alignment;
  function hostile(state,other){const me=self(state);return !!me&&!!other&&other.id!==me.id&&me.hp>0&&other.hp>0&&color(me)!==color(other)&&(me.pk||other.pk)&&!l.town;}
  function targets(state){return (state?.actors||[]).filter(a=>hostile(state,a)).map(a=>({...a,onlinePlayer:true,max:a.maxHp,dead:a.hp<=0,r:17,n:'Người chơi'}));}
  function select(enabled,send){const seq=send(10,{target:+enabled});if(!seq)return false;wanted=enabled;pending=seq;o.mode=enabled?'slaughter':'farm';if(typeof cg==='function')cg();return true;}
  return {targets,hostile,
    nameColor(state,actor){const a=actor||self(state);return a&&typeof Gh!=='undefined'?Gh[['chinh','trung','ta','tan'][a.alignment]]?.c:null;},
    healthColor(state,actor){const a=actor||self(state),me=self(state);return a?.pk?(color(a)===color(me)?'#ff79b0':'#ef4242'):'#4fd04f';},
    select,
    reset(){initialized=false;pending=0;},
    sync(state,send){const me=self(state);if(!me)return;
      if(!initialized){initialized=true;if(o.mode==='slaughter'&&!me.pk){select(true,send);return;}}
      if(pending&&GameWebTransport.newer(pending,state.ack))return;
      pending=0;wanted=!!me.pk;
      if(wanted&&o.mode!=='slaughter'||!wanted&&o.mode==='slaughter'){o.mode=wanted?'slaughter':'farm';if(typeof cg==='function')cg();}
    },
    pick(state,x,y){return targets(state).sort((a,b)=>Math.hypot(a.x-x,a.y-22-y)-Math.hypot(b.x-x,b.y-22-y)).find(a=>Math.hypot(a.x-x,(a.y-22-y)*.8)<30)||null;},
  };
})();
