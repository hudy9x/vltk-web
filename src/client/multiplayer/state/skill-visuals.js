// Replay approved casts through the existing skill/impact pipeline. This world
// owns only FX and proxy bodies; no callback writes HP, MP, XP or inventory.
var OnlineSkillVisuals = function () {
  let world = null, generation = 0, frame = null;
  const bodies = new Map(), timers = new Set();
  const proxy = id => {
    let actor=bodies.get(id);
    if(!actor){actor={id,x:0,y:0,hp:1,max:1,r:17,dead:false,act:'st',actT:0,generation:0};bodies.set(id,actor);}
    return actor;
  };
  function run(actor,action,info=null) {
    const real={world:l,hero:v,profile:o,input:Y,context:skillVisualContext};
    if(!world)world={...l,combatProjectiles:[],fxQ:[],txt:[],life:1e9,mana:1e9,quiet:false,deadT:0,sim:true,sks:{buff:{},cd:{}}};
    world.fx=l.fx;world.zoneShown=l.zoneShown;world.town=l.town;world.P=l.P;
    l=world;v=actor;o=actor.profile||real.profile;Y={target:null,keys:{}};
    const token=generation,before=info?new Set(world.fx):null;
    skillVisualContext={actor,run:fn=>run(actor,fn,info),schedule(fn,delay){
      const handle=setTimeout(()=>{timers.delete(handle);if(token===generation)run(actor,fn,info);},delay);
      timers.add(handle);return handle;
    }};
    try{return action();}
    finally{if(before)for(const effect of world.fx)if(!before.has(effect))effect._onlineTrace=info;real.world.fx=world.fx;l=real.world;v=real.hero;o=real.profile;Y=real.input;skillVisualContext=real.context;}
  }
  return {
    sync(next){
      frame=next;
      for(const source of next.actors.concat(next.monsters)){const actor=proxy(source.id);actor.x=source.x;actor.y=source.y;}
    },
    play(event,appearance,assetsReady=false){
      const diag=typeof onlineTrace!=='undefined'?onlineTrace:null;
      const info=diag?.enabled?{...diag.ref(event),map:frame?.map,assetsReady}:null;
      if(!event.cast||!frame){diag?.log('visual-skipped',{...info,reason:!frame?'no-world':'no-cast-metadata'});return;}
      if(info)diag.log('visual-request',{...info,zone:l.zoneShown,town:l.town,knownSkill:!!T[event.skill]});
      // A cold remote skill can finish before its first sprite downloads. Wait
      // only in presentation; never delay the authoritative combat snapshot.
      if(!assetsReady){
        const urls=new Set(),primary=new Set(),seen=new Set();
        const addSprites=(id,required)=>{
          const effect=A0.f?.[id],missile=A0.m?.[effect?.c||A0.s?.[id]];
          for(const sprite of [A0.c?.[effect?.pre],...Object.values(missile||{})])
            if(sprite&&typeof sprite==='object'&&sprite.f){urls.add(sprite.f);if(required)primary.add(sprite.f);}
        };
        const collect=id=>{
          if(!id||seen.has(id))return;seen.add(id);
          addSprites(id,false);
          collect(T[id]?.child);
          if(T[id])for(const child of F5(F2(l.P,T[id],event.cast.level)))collect(child.sid);
        };
        collect(event.skill);
        addSprites(event.skill,true);
        // Form 12 renders its child as the primary projectile (the G3 rule).
        // Other event children are optional impacts: prefetch them, but a slow
        // secondary image must never hold the entire primary release hostage.
        const child=T[event.skill]?.child;
        if(A0.g?.[event.skill]?.[0]===12&&A0.g?.[child]&&A0.f?.[child]?.c)addSprites(child,true);
        const pending=[...urls].map(url=>{const image=bA(url);if(info)diag.asset(url,image,info,primary.has(url));return {url,image};})
          .filter(({url,image})=>primary.has(url)&&image&&!image.complete).map(({image})=>image);
        if(pending.length){
          const token=generation;
          let warning;
          if(info){diag.log('asset-wait',{...info,primary:[...primary],pending:pending.map(i=>i.src)});
            warning=setTimeout(()=>{timers.delete(warning);if(token===generation)diag.log('asset-stalled',{...info,pending:pending.filter(i=>!i.complete).map(i=>i.src)});},4000);timers.add(warning);}
          return Promise.all(pending.map(image=>new Promise(resolve=>{
            const done=()=>{image.removeEventListener('load',done);image.removeEventListener('error',done);if(info)diag.log(image.naturalWidth?'asset-ready':'asset-error',{...info,url:image.src,width:image.naturalWidth,height:image.naturalHeight});resolve();};
            image.addEventListener('load',done,{once:true});image.addEventListener('error',done,{once:true});
            if(image.complete)done();
          }))).then(()=>{if(warning){clearTimeout(warning);timers.delete(warning);}if(token===generation)this.play(event,appearance,true);});
        }
      }
      const caster=proxy(event.source),target=proxy(event.target),meta=event.cast;
      caster.x=meta.x;caster.y=meta.y;target.x=meta.targetX;target.y=meta.targetY;
      caster.profile={...o,fac:appearance?.faction||o.fac,sex:appearance?.sex??o.sex,sk:{...o.sk},eq:{...o.eq}};
      caster.stats=l.P;caster.animKey=Jt(caster.profile.fac,caster.profile.sex)?.anim;
      const source=frame.actors.find(a=>a.id===event.source);
      const peers=frame.actors.filter(a=>a.id!==event.source&&(a.id===event.target||source&&source.alignment!==a.alignment&&(source.pk||a.pk)));
      const targets=frame.monsters.concat(peers).filter(m=>m.hp>0||m.id===event.target).map(m=>proxy(m.id));
      const token=generation;
      const before=new Set(l.fx);
      try{run(caster,()=>{
        const skill=event.skill&&T[event.skill]?F2(l.P,T[event.skill],meta.level):{...l.P.basic};
        Object.assign(skill,{id:event.skill,L:meta.level,nMis:meta.missiles,rad:meta.range,melee:!!(meta.flags&1),phys:!!(meta.flags&2)});
        // The server has already approved this release; never add another local windup.
        delete skill.rate;delete skill.rawRate;
        const cast=GameWebTransport.castSkillVisual(caster,target,skill,()=>token===generation,()=>targets,()=>1,action=>run(caster,action,info));
        if(cast&&info)cast.onlineTrace=info;
      },info);}catch(error){diag?.log('visual-error',{...info,error:String(error)});throw error;}
      if(info)diag.release(info,l.fx.filter(effect=>!before.has(effect)));
      caster.dir=kn(meta.targetX-meta.x,meta.targetY-meta.y);
    },
    advance(dt){if(world&&frame){const actor=bodies.get(frame.self)||bodies.values().next().value;if(actor)run(actor,()=>advanceSkillContacts(dt));}},
    pose(id){const actor=bodies.get(id);return actor&&actor.castT>0?{atT:actor.castT,atD:.4,dir:actor.dir}:null;},
    cancelPose(id){const actor=bodies.get(id);if(actor){actor.castT=0;actor.actionRevision=(actor.actionRevision||0)+1;}},
    reset(){generation++;for(const timer of timers)clearTimeout(timer);timers.clear();for(const actor of bodies.values()){actor.castT=0;actor.actionRevision=(actor.actionRevision||0)+1;}bodies.clear();world=null;frame=null;},
  };
};
