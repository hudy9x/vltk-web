// Server-selected map/reconnect position and explicit recovery after an online death.
var OnlineLifecycle=(()=>{
  let initialized=false,life=null,panel=null,detail=null,button=null,pending=0,latest=null,lastSaved=0,sender=()=>0;
  function reset(){initialized=false;life=null;pending=0;latest=null;panel?.remove();panel=detail=button=null;}
  function cacheKey(){
    const account=typeof window!=='undefined'&&window.localGameAuth?.user?.id;
    return account&&typeof m0==='number'&&m0>=0&&m0<=2?`__volam_position_v1:${account}:${m0}`:null;
  }
  function read(){
    try{
      const key=cacheKey(),value=key&&JSON.parse(window.localStorage.getItem(key)||'null');
      if(value?.version!==1||!Number.isInteger(value.map)||!Number.isInteger(value.actor?.life)||value.actor.life<1||
        ![value.actor.x,value.actor.y,value.actor.hp,value.actor.mp].every(Number.isFinite))return null;
      if(typeof MapsEngine!=='undefined'&&!MapsEngine.isMapAvailable(value.map))return null;
      return value;
    }catch{return null;}
  }
  function hint(){const value=read();return value?{map:value.map,x:value.actor.x,y:value.actor.y,life:value.actor.life}:undefined;}
  function remember(force=false){
    if(!latest||l.dg||l.tower||l.battlefield||Date.now()-lastSaved<250&&!force)return;
    const actor=latest.actors.find(a=>a.id===latest.self),key=cacheKey();
    const map=typeof Z0.key==='number'?Z0.key:E0.town.id;
    if(!key||!actor||map!==latest.map)return;
    const x=actor.hp<=0?actor.x:v.x,y=actor.hp<=0?actor.y:v.y;
    if(![x,y].every(Number.isFinite))return;
    try{window.localStorage.setItem(key,JSON.stringify({version:1,map,self:latest.self,actor:{...actor,x,y},death:latest.death,savedAt:Date.now()}));lastSaved=Date.now();}catch{}
  }
  function restore(){
    if(typeof o==='undefined'||!o.fac||l.dg||l.tower||l.battlefield||window.localGameConfig?.combatSandbox||
      new URLSearchParams(window.location?.search||'').get('multiplayer')==='off')return false;
    const value=read();if(!value)return false;
    sync({map:value.map,self:value.self,actors:[value.actor],death:value.death,ack:0},()=>0);
    l.life=value.actor.hp;l.mana=value.actor.mp;l.deadT=value.actor.hp<=0?1:0;
    latest=null;return true;
  }
  function sync(state,send){
    latest=state;sender=send;
    const actor=state.actors.find(a=>a.id===state.self);if(!actor)return;
    const town=state.map===E0.town.id;
    // A missing map is not a loaded town: reconnect must mount its scene/ground.
    const current=Z0.key==='town'?E0.town.id:Z0.key;
    l.town=town;l.zoneShown=state.map;
    document.getElementById('bBack')?.classList.toggle('hidden',!town);
    if(current!==state.map){
      l.enemies=[];l.ground=[];l.fx=[];l.combatProjectiles=[];Y.target=null;
      ma(town?'town':state.map);
      let zone=town?E0.town:JW.zones.find(z=>z.id===state.map);
      if(!town&&typeof k0!=='undefined'&&typeof o!=='undefined'){
        const routes=typeof Un!=='undefined'?Un:{};
        const index=k0.findIndex((base,i)=>base.id===state.map||routes[i]?.some(z=>z.id===state.map));
        if(index>=0){
          const choices=[k0[index],...(routes[index]||[])],selected=choices.findIndex(z=>z.id===state.map);
          (o.zalt||(o.zalt={}))[index]=selected;o.stage=ol(index);zone=choices[selected];
        }
      }
      l.bgImg=zone?.bg?bA(zone.bg):null;
      l.banner={t:2.2,text:zone?.n||'Bản đồ',sub:town?'Biện Kinh · Về thành dưỡng sức':''};
      if(typeof M1==='function')M1();
      if(typeof _e==='function')_e(state.map);
    }
    if(!initialized||life!==actor.life||current!==state.map){
      Object.assign(v,{x:actor.x,y:actor.y,_px:actor.x,_py:actor.y,act:actor.hp<=0?'die':'st',actT:0});
      initialized=true;life=actor.life;
    }
    if(actor.hp>0){panel?.remove();panel=detail=button=null;pending=0;return;}
    const battle=document.getElementById('battle');if(!battle)return;
    if(!panel){
      if(!document.getElementById('onlineDeathStyle')){
        const style=document.createElement('style');style.id='onlineDeathStyle';
        style.textContent=`
@font-face{font-family:OnlineDeathCharm;src:url('/fonts/charm-bold.ttf') format('truetype');font-weight:700;font-style:normal;font-display:swap}
#onlineDeath{position:fixed;inset:0;z-index:100010;display:grid;place-items:center;padding:20px;box-sizing:border-box;overflow:auto;background:radial-gradient(ellipse at center,#20060875 12%,#190204d9 72%,#080102f2);animation:online-death-shade .6s ease-out both}
#onlineDeath .online-death-card{position:relative;isolation:isolate;box-sizing:border-box;width:min(480px,100%);padding:48px 30px 32px;text-align:center;border:1px solid #7c3332;border-radius:3px;background:linear-gradient(160deg,#271314f5,#140b0df7 70%);color:#d7bdb0;box-shadow:0 24px 80px #000c,inset 0 1px #e69b6c24;animation:online-death-reveal .65s ease-out both}
#onlineDeath .online-death-card:before{content:'';position:absolute;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(ellipse 90px 30px at 12% 0%,#9e202b99,transparent),radial-gradient(ellipse 55px 95px at 6% 0%,#6c111c70,transparent 75%),radial-gradient(circle 5px at 18% 13%,#a8293670 70%,transparent),radial-gradient(circle 3px at 23% 7%,#bb344180 70%,transparent),radial-gradient(ellipse 100px 65px at 100% 100%,#75142177,transparent),linear-gradient(110deg,transparent 88%,#7f1d2733 89%,transparent 90%)}
#onlineDeathTitle{font:700 clamp(29px,5vw,40px)/1.4 OnlineDeathCharm,Georgia,serif;margin:0 0 18px;color:#e5b4a0;text-shadow:0 2px 16px #ba182e66}
#onlineDeath .online-death-detail{font:13px/1.9 'IBM Plex Mono',monospace;margin:0 0 25px;color:#c2a9a0;overflow-wrap:anywhere}
#onlineDeath .online-death-killer{display:block;margin:5px 0 9px;font:700 clamp(25px,4vw,32px)/1.45 OnlineDeathCharm,Georgia,serif;color:#ff737b;text-shadow:0 0 18px #d7274560}
#onlineDeath .online-death-return{min-width:168px;min-height:46px;padding:9px 28px;border:1px solid #ab5651;border-radius:3px;background:linear-gradient(#64262b,#3e171e);box-shadow:inset 0 1px #f9c2a333,0 5px 18px #0006;color:#f0d4bf;font:700 23px/1.3 OnlineDeathCharm,Georgia,serif;cursor:pointer;transition:background .2s,box-shadow .2s}
#onlineDeath .online-death-return:hover{background:#75313a;box-shadow:0 0 22px #9c203c44}
#onlineDeath .online-death-return:focus-visible{outline:2px solid #efab91;outline-offset:4px}
#onlineDeath .online-death-return:disabled{opacity:.6;cursor:wait}
@keyframes online-death-shade{from{opacity:0}to{opacity:1}}
@keyframes online-death-reveal{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@media(max-width:420px){#onlineDeath{padding:12px}#onlineDeath .online-death-card{padding:32px 18px 24px}}
@media(prefers-reduced-motion:reduce){#onlineDeath,#onlineDeath .online-death-card{animation:none}}
`;
        document.head.appendChild(style);
      }
      panel=document.createElement('section');panel.id='onlineDeath';panel.setAttribute('role','dialog');panel.setAttribute('aria-labelledby','onlineDeathTitle');
      panel.setAttribute('aria-modal','true');panel.setAttribute('aria-describedby','onlineDeathDetail');
      const card=document.createElement('div');card.className='online-death-card';
      const heading=document.createElement('h2');heading.id='onlineDeathTitle';heading.textContent='Về thành dưỡng sức';
      detail=document.createElement('p');detail.id='onlineDeathDetail';detail.className='online-death-detail';
      button=document.createElement('button');button.type='button';button.className='online-death-return';button.textContent='Về thành';
      button.onclick=()=>{pending=sender(17)||0;button.disabled=!!pending;};
      card.append(heading,detail,button);panel.appendChild(card);document.body.appendChild(panel);
    }
    const death=state.death;
    if(death){
      const killer=document.createElement('strong');killer.className='online-death-killer';killer.textContent=death.name;
      detail.replaceChildren(`Bạn đã bị ${death.player?'nhân vật':'quái'}`,killer,'hạ gục. Trở về Biện Kinh để dưỡng sức.');
    }else detail.textContent='Bạn đã trọng thương. Trở về Biện Kinh để dưỡng sức.';
    button.disabled=!!pending&&GameWebTransport.newer(pending,state.ack);
  }
  if(typeof window!=='undefined'){
    window.addEventListener?.('pagehide',()=>remember(true));
    // Modules finish synchronously before the first scheduled animation frame.
    restore();
  }
  return {sync,reset,remember,restore,hint};
})();
