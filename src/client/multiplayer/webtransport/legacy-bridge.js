// Small adapter into the legacy game IIFE. No remote actor can be selected or attacked.
var gameMultiplayer = (() => {
  const factions = Object.keys(I);
  let previous = null, nextAppearance = 0, appearance = null, movedAt = -Infinity, direction = 0;
  const client = GameWebTransport.createClient({ slot:()=>m0,
    position:()=>OnlineLifecycle.hint(),
    async prepare(){ $(); await window.localGameStorage?.flush(); },
    world:state=>onlineWorld.snapshot(state),profile:value=>onlineWorld.profile(value),reset:()=>{onlineWorld.reset();OnlineParty.reset();},
    status(text, online) {
      if(typeof onlineTrace!=='undefined')onlineTrace.once('status:'+text,'connection-status',{text,online});
  }});
  onlineWorld.bind(client);
  window.addEventListener("pagehide", () => client.close());
  return {
    get active() { return client.active || client.authoritative; },
    get pve(){return onlineWorld.active;},
    tick() {
      OnlineParty.update(onlineWorld.state,client.players(),(kind,target)=>client.command({kind,map:typeof Z0.key==='number'?Z0.key:E0.town.id,target}),client.online&&onlineWorld.active);
      if(l.battlefield||l.dg||l.tower){client.suspend();return;}
      if (!o?.fac || !Z0.key || window.localGameConfig?.combatSandbox) return;
      const now = performance.now();
      if (!appearance || now >= nextAppearance) {
        const j = l.jx, rows = j?.rows || {};
        appearance = { name: String(o.name || "Người chơi"), faction: Math.max(0, factions.indexOf(o.fac)), sex: o.sex ? 1 : 0,
          bodySex: j?.sx === "f" ? 1 : 0, ride: o.eq?.horse ? 1 : 0,
          helm: rows.helm ?? -1, armor: rows.armor ?? -1, weapon: rows.weapon ?? 0,
          horse: o.eq?.horse ? (rows.horse ?? -1) : -1,
          rebirth: o.lookFx === false ? 0 : Math.min(5, v0()),
          effects: JP().map(sprite => +Object.keys(U1).find(id => U1[id] === sprite)).filter(id => id > 0).slice(0, 12) };
        nextAppearance = now + 100;
      }
      const map = typeof Z0.key === "number" ? Z0.key : E0.town.id;
      // Match D_ without mutating simulation: sampling fixed-step positions causes a 30/20 Hz beat.
      const fraction = typeof N2 === "number" && typeof Lr === "number" ? Math.max(0, Math.min(1, N2 / Lr)) : 1;
      const interpolate = Number.isFinite(v._px) && Number.isFinite(v._py) &&
        Math.hypot(v.x - v._px, v.y - v._py) < (typeof __ === "number" ? __ : 250);
      const x = interpolate ? v._px + (v.x - v._px) * fraction : v.x;
      const y = interpolate ? v._py + (v.y - v._py) * fraction : v.y;
      const dx = previous?.map === map ? x - previous.x : 0;
      const dy = previous?.map === map ? y - previous.y : 0;
      if (Math.hypot(dx, dy) > 0.001) { movedAt = now; direction = kn(dx,dy); }
      client.update({ map, timestamp: Math.floor(now) >>> 0, effectTime: Math.max(0, l.clock || 0),
        x, y, dir: direction, moving: now - movedAt < 120 }, appearance);
      if (client.online) onlineWorld.syncControls?.();
      previous = { map, x, y };
    },
    entities() { return onlineWorld.entities().concat(client.players().filter(player=>!(onlineWorld.state?.actors.find(a=>a.id===player.id)?.hp<=0)).map(player => ({ remotePlayer: player, x: player.x, y: player.y }))); },
    draw(ctx, entity) {
      if(entity.onlineLoot){onlineWorld.draw(ctx,entity);return;}
      const p = entity.remotePlayer, look = p.appearance;
      const authoritative=onlineWorld.state?.actors.find(a=>a.id===p.id);
      if(authoritative?.hp<=0)return;
      const actor = { n: look.name, f: factions[look.faction] || factions[0], s: look.sex, x: p.x, y: p.y,
        dir: p.dir, mv: p.moving, t: p.animationTime, hurtT:authoritative?.hurt||0,poison:authoritative?.poison||0,slowT:authoritative?.cold||0,slowPower:authoritative?.coldPower||0,stun:authoritative?.stun||0,dead:authoritative?.hp===0,act:authoritative?.hp===0?'die':undefined, hp: onlineWorld.state?.actors.find(a=>a.id===p.id)?.hp??1, hpMax: onlineWorld.state?.actors.find(a=>a.id===p.id)?.maxHp??1,
        J: look.armor >= 0 ? lB({ sx: look.bodySex ? "f" : "m", ride: look.ride,
          r: { helm: look.helm, armor: look.armor, weapon: look.weapon, horse: look.horse } }) : null };
      const castPose=onlineWorld.pose?.(p.id);
      if(castPose){
        const nativeDuration=ws(Jt(actor.f,actor.s)?.anim,'at')||.4;
        Object.assign(actor,castPose,{atD:nativeDuration,atT:castPose.atT/castPose.atD*nativeDuration});
      }
      const drawEffects = layer => {
        actor.animKey = actor.gk;
        const phase = p.effectTime || 0;
        if (layer === "under" && look.rebirth && vf[look.rebirth])
          F3(ctx, vf[look.rebirth], actor.x, actor.y, 0, phase, Jn, 0.95, actor);
        const support=onlineWorld.state?.actors.find(a=>a.id===p.id)?.supports||[];
        const serverEffects=support.filter(s=>s.active&&U1[s.skill]).map(s=>s.skill).concat((authoritative?.curses||[]).map(c=>c.skill));
        const effects=[...new Set([...(look.effects||[]).filter(id=>!T[id]||!['buff','aura'].includes(wn(T[id]))),...serverEffects])];
        for (const id of effects) {
          const sprite = U1[id];
          if (sprite && (sprite.pos === "foot") === (layer === "under"))
            F3(ctx, sprite, actor.x, actor.y, 0, phase, Jn, sprite.pos === "foot" ? 0.85 : 0.9, actor);
        }
      };
      uB(ctx, actor, 0, { hpColor:OnlinePvp.healthColor(onlineWorld.state,authoritative), nameColor: authoritative?.alignment!==undefined&&typeof Gh!=='undefined'?Gh[['chinh','trung','ta','tan'][authoritative.alignment]].c:typeof Tb === "function" ? Tb(actor.f) : "#ececec",
        under: () => drawEffects("under"), over: () => drawEffects("over") });
    },
  };
})();
