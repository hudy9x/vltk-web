// Low-frequency character intents use the authenticated persistence API, never a profile upload.
var OnlineProgression=(()=>{
  let chain=Promise.resolve(),queued=new Set();
  const enabled=()=>!!window.localGameConfig?.onlineProgression&&!window.localGameConfig?.combatSandbox&&new URLSearchParams(location.search).get('multiplayer')!=='off'&&!l.sim;
  async function request(action,slot,id){
    const body=JSON.stringify({id,slot,action});
    for(let attempt=0;attempt<3;attempt++){
      try{
        const response=await fetch('/api/multiplayer/progression',{method:'POST',keepalive:true,headers:{'content-type':'application/json'},body,signal:AbortSignal.timeout(15000)});
        const saved=await response.json();
        if(!response.ok){const error=new Error(saved.error||'Không lưu được nhân vật online.');error.retry=response.status>=500;throw error;}
        if(slot===m0){onlineWorld.profile(saved);R=true;$();V();qA();}
        return saved;
      }catch(error){if(error.retry===false||attempt===2)throw error;await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)));}
    }
  }
  function run(action){
    action=structuredClone(action);
    const slot=m0,id=crypto.randomUUID();
    const task=chain.then(()=>request(action,slot,id));chain=task.catch(()=>{});return task;
  }
  function dispatch(action){
    if(!enabled())return false;
    const key=action.kind==='autoPotential'||action.kind==='autoSkill'?action.kind:null;
    if(key&&queued.has(key))return true;
    if(key)queued.add(key);
    run(action).then(()=>{if(['join','changeFaction','reset','equipWithPotential'].includes(action.kind))n0(true);k('Đã lưu nhân vật online.');}).catch(e=>k(e.message)).finally(()=>{if(key)queued.delete(key);});
    return true;
  }
  return {enabled,dispatch,run,flush:()=>chain};
})();
