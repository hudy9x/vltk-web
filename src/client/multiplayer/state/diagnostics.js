// Opt-in, bounded diagnostics. Never records tickets, account IDs, chat or saves.
var onlineTrace = (() => {
  const watchedImages=new WeakSet();
  const revision='skill-trace-20261028-1', entries=[], onceKeys=new Set(), received=new Set(), records=new Map();
  let enabled=!!window.localGameConfig?.development;
  try { enabled=enabled||new URLSearchParams(location.search).get('onlineDebug')==='1'||localStorage.getItem('onlineDebug')==='1'; } catch {}
  function log(stage,details={}) {
    if(!enabled)return;
    const entry={time:new Date().toISOString(),side:'client',revision,stage,...details};
    entries.push(entry);if(entries.length>500)entries.shift();
    console[stage.includes('error')||stage.includes('missing')||stage.includes('stalled')?'warn':'info']('[online:client] '+JSON.stringify(entry));
  }
  function once(key,stage,details){if(!enabled||onceKeys.has(key))return;onceKeys.add(key);if(onceKeys.size>2000)onceKeys.delete(onceKeys.values().next().value);log(stage,details);}
  function ref(event){return {event:event.id,tick:event.tick,skill:event.skill,source:event.source,target:event.target};}
  function world(state){
    if(!enabled)return;
    for(const event of state.events){if(received.has(event.id))continue;received.add(event.id);
      if(received.size>1000)received.delete(received.values().next().value);
      if(event.kind===1||event.kind===2)log(event.kind===1?'cast-received':'hit-received',{...ref(event),map:state.map,self:state.self,value:event.value,cast:event.cast,hit:event.hit});
    }
  }
  function asset(url,image,trace,required){
    if(!enabled||!image||watchedImages.has(image))return;watchedImages.add(image);
    const details=()=>({...trace,url,required,complete:image.complete,width:image.naturalWidth,height:image.naturalHeight});
    log('asset-state',details());
    if(!image.complete){image.addEventListener('load',()=>log('asset-loaded',details()),{once:true});image.addEventListener('error',()=>log('asset-error',details()),{once:true});}
    else if(!image.naturalWidth)log('asset-error',details());
  }
  function release(trace,effects){
    if(!enabled)return;
    log('visual-release',{...trace,count:effects.length,effects:effects.map(e=>({kind:e.k,sprite:e.s?.f||e.m?.fly?.f,x:e.x,y:e.y,age:e.age,t:e.t,life:e.life,zone:e.combat?.zone}))});
    records.set(trace.event,{trace,at:performance.now(),drawn:false,warned:false,expectedSprite:effects.some(e=>e.s?.f||e.m?.fly?.f)});
    if(records.size>200)records.delete(records.keys().next().value);
  }
  function render(effect,draw){
    const trace=effect._onlineTrace||effect.combat?.onlineTrace;
    if(!enabled||!trace)return draw();
    let count=0;const original=W.drawImage;
    W.drawImage=function(...args){count++;return original.apply(this,args);};
    try{return draw();}
    catch(error){log('render-error',{...trace,error:String(error)});throw error;}
    finally {
      W.drawImage=original;
      const sprite=effect.s||effect.m?.fly,image=sprite?.f&&of[sprite.f];
      const detail={...trace,kind:effect.k,sprite:sprite?.f,complete:image?.complete,width:image?.naturalWidth,age:effect.age,t:effect.t,x:effect.x,y:effect.y,camera:{x:B0.x,y:B0.y,w:M0.w,h:M0.h},alpha:W.globalAlpha,reason:!sprite?'no-sprite':!image?.complete?'asset-pending':!image?.naturalWidth?'asset-error':(effect.age??effect.t??0)<0?'windup-or-delay':'culled-or-transparent'};
      if(count){const record=records.get(trace.event);if(record)record.drawn=true;once(trace.event+':draw','canvas-draw',{...detail,count});}
      else once(trace.event+':skip:'+effect.k,'render-no-draw',detail);
    }
  }
  function advance(){
    if(!enabled)return;
    const now=performance.now();for(const record of records.values())if(!record.drawn&&!record.warned&&now-record.at>2000){record.warned=true;log(record.expectedSprite?'visual-missing':'visual-contact-only',{...record.trace,elapsed:now-record.at,hidden:document.hidden});}
  }
  const api={get enabled(){return enabled;},revision,log,once,ref,world,asset,release,render,advance,
    setEnabled(value){enabled=!!value;log('debug-enabled');},
    report(){return {revision,enabled,origin:location.origin,serviceWorker:navigator.serviceWorker?.controller?.scriptURL||null,entries:entries.slice()};},
    async inspectCache(){
      const cacheNames=typeof caches!=='undefined'?await caches.keys():[];
      const workers=navigator.serviceWorker?.getRegistrations?await navigator.serviceWorker.getRegistrations():[];
      const details={cacheNames,workers:workers.map(w=>({scope:w.scope,active:w.active?.scriptURL,state:w.active?.state})),
        scripts:performance.getEntriesByType?.('resource').filter(r=>/\/(?:app\/game|data|setvi|jxlook)\.js(?:\?|$)/.test(r.name)).map(r=>({url:r.name,transferSize:r.transferSize,duration:r.duration}))||[]};
      log('cache-inventory',details);return details;
    },
    clear(){entries.length=0;onceKeys.clear();received.clear();records.clear();},
  };
  window.onlineDebug=api;
  log('boot',{origin:location.origin,development:!!window.localGameConfig?.development,serviceWorker:navigator.serviceWorker?.controller?.scriptURL||null,memorySprites:Object.keys(of).length});
  if(enabled)void api.inspectCache().catch(error=>log('cache-inspect-error',{error:String(error)}));
  return api;
})();
