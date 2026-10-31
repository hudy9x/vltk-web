// Presentation/prediction adapter. Every combat/reward mutation arrives from Rust/SQLite.
var onlineWorld = (() => {
  let moveTimer = null,
    lastMove = 0;
  let client,
    state = null,
    goal = null,
    lastCommand = 0,
    lastEvent = 0,
    lastRevision = -1,
    currentSlot = -1,
    imported = false;
  let selectedSkill, blockedSkill, pendingMode = null;
  const motion=new GameWebTransport.LocalMotion();
  const visuals=OnlineSkillVisuals((event,target)=>{
    if(active()&&!state?.battlefield)send(16,{target,skill:event.skill,x:event.id&65535,y:event.id>>>16});
  });
  const monsters = new Map();
  const mapId = () => (typeof Z0.key === 'number' ? Z0.key : E0.town.id);
  const active = () =>
    !!client?.authoritative &&
    !window.localGameConfig?.combatSandbox &&
    !l.battlefield &&
    !l.dg &&
    !l.tower;
  const mainSkill = () => o.mainLock&&o.main!=='basic' ? Number(o.main) || 0 : Number(l.P?.main?.id) || 0;
  function displayMode(enabled) {
    const mode = enabled ? 'auto' : 'manual';
    if (o.ctrl !== mode) { o.ctrl = mode; qA(); }
  }
  function send(kind, extra = {}) {
    const seq=client?.command({ kind, map: mapId(), ...extra })||0;
    if(seq)lastCommand=seq;
    return seq;
  }
  function target(id) {
    return id === state?.self ? v : monsters.get(id) || state?.actors.find((a) => a.id === id);
  }
  function reset() {
    clearTimeout(moveTimer);
    moveTimer = null;
    state = null;
    goal = null;
    motion.clear();
    visuals.reset();
    if(typeof OnlineLifecycle!=='undefined')OnlineLifecycle.reset();
    if(v._onlineCast){v._onlineCast=false;v.castT=0;v.speedCastDuration=undefined;}
    if(typeof OnlineSupport!=='undefined')OnlineSupport.reset();
    if(typeof OnlinePvp!=='undefined')OnlinePvp.reset();
    monsters.clear();
    if(typeof OnlineBattlefield!=='undefined')OnlineBattlefield.reset();
    lastEvent = 0;
    lastCommand = 0;
    selectedSkill = undefined;
    blockedSkill = undefined;
    pendingMode = null;
    if (!l.battlefield && !l.dg && !l.tower) {
      l.enemies = [];
      l.ground = [];
      l.fx = [];
      l.combatProjectiles = [];
    }
  }
  function snapshot(next) {
    const trace=typeof onlineTrace!=='undefined'?onlineTrace:null;
    trace?.world(next);
    if (!active()) {trace?.once('drop:'+next.map+':'+mapId(),'world-ignored',{map:next.map,currentMap:mapId(),active:active()});return;}
    if(next.map!==mapId()){
      if(typeof OnlineLifecycle==='undefined')return;
      motion.clear();visuals.reset();monsters.clear();goal=null;pendingMode=null;lastEvent=0;
    }
    if(typeof OnlineBattlefield!=='undefined')OnlineBattlefield.sync(next,send);
    if(typeof OnlineLifecycle!=='undefined')OnlineLifecycle.sync(next,send);
    state = next;
    if(typeof OnlineSupport!=='undefined')OnlineSupport.sync(next);
    if(typeof OnlinePvp!=='undefined')OnlinePvp.sync(next,send);
    motion.receive(next);
    visuals.sync(next);
    const self = next.actors.find(a => a.id === next.self);
    if (self && (!pendingMode || (pendingMode.seq && !GameWebTransport.newer(pendingMode.seq, next.ack)))) {
      pendingMode = null;
      displayMode(self.farming);
    }
    const ids = new Set();
    for (const m of next.monsters) {
      const definition = r0[m.definition];
      if (!definition) continue;
      ids.add(m.id);
      let actor = monsters.get(m.id);
      if (!actor) {
        actor = {
          id: m.id,
          onlineMonster: true,
          tid: m.definition,
          n: definition.n,
          img: definition.img ? bA(definition.img) : null,
          sz: definition.sz,
          L: m.level,
          cls: 'normal',
          series: j2(m.definition),
          r: us.normal.r,
          x: m.x,
          y: m.y,
          face: 1,
          born: l.clock || 0,
          res: {},
          spd: 30 + (definition.run || 6) * 4,
        };
        monsters.set(m.id, actor);
      }
      // A new incarnation starts exactly at spawn, even if the death snapshot
      // was lost. Never interpolate from the previous corpse's coordinates.
      if (actor._netLife !== m.life || (actor.dead && m.hp > 0)) {
        Object.assign(actor,{x:m.x,y:m.y,act:'st',actT:0,hitT:0,hurtT:0,born:l.clock||0});
      }
      Object.assign(actor, {
        _netLife: m.life,
        slowPower: m.coldPower,
        max: m.maxHp,
        hp: m.hp,
        curse:Object.fromEntries((m.curses||[]).map(c=>[c.skill,(l.clock||0)+c.remaining])),
        curseL:Object.fromEntries((m.curses||[]).map(c=>[c.skill,c.level])),
        dead: m.hp <= 0,
        slowT: m.cold,
        stun: m.stun,
        poison: m.poison,
        dir: m.dir,
        moving: m.moving,
        _netX: m.x,
        _netY: m.y,
      });
    }
    for (const id of monsters.keys()) if (!ids.has(id)) monsters.delete(id);
    l.enemies = [...monsters.values()];
    l.ground = [];
    for (const event of next.events) {
      if (!GameWebTransport.newer(event.id, lastEvent)) continue;
      lastEvent = event.id;
      const from = target(event.source),
        to = target(event.target);
      if (event.kind === 1 && event.cast) {
        const unit=next.battlefield?.units.find(u=>u.id===event.source);
      const look=unit?.faction?{faction:unit.faction,sex:unit.sex}:event.source===next.self?{faction:o.fac,sex:o.sex}:client.players().find(p=>p.id===event.source)?.appearance;
        visuals.play(event,look?{faction:typeof look.faction==='number'?Object.keys(I)[look.faction]:look.faction,sex:look.sex}:null);
        if(from===v&&!motion.goal){ps(v,'at');v.dir=kn(event.cast.targetX-event.cast.x,event.cast.targetY-event.cast.y);}
      }
      if (event.kind === 2 && to) {
        const hit=event.hit||{element:'phys',critical:false,hurt:false,dot:false};
        showDamageNumber(next.actors.some(a=>a.id===event.target&&(!next.battlefield||a.battlefieldKind<2))?{...to,playerDamage:true}:to, event.value, hit.element, hit.critical);
        if (to.onlineMonster && !hit.dot) {
          to.hitT = 0.15;
          if (hit.hurt && !to.dead) {to.hurtT=.5;ps(to,'hurt');}
        }
      }
      if (event.kind === 3 && to) MP(to.x, to.y, '#c5a25b');
      if(event.kind===6 && from && typeof $A==='function')$A(from.x,from.y-60,(event.value>0?'✚ ':'')+(T[event.skill]?.n||''),'#8f8',12);
      if(event.kind===5 && event.source===next.self && typeof OnlineConsumables!=='undefined')OnlineConsumables.received(event);
      if (event.kind === 4 && event.source === next.self) k(`Nhặt được ${event.value} lượng`);
      if (event.kind === 7 && event.source === next.self) k(`Nhặt được ${event.value.toLocaleString('vi-VN')} kim nguyên bảo`);
    }
  }
  function simulate(dt) {
    l.clock = (l.clock || 0) + dt;
    if(typeof OnlineSupport!=='undefined'){OnlineSupport.settings(send);if(l.dirty)D0();}
    advanceConsumableCooldowns(l, dt);
    mapNavigation.beginTick();
    // Never allow projectiles left over from offline mode to apply a hit online.
    l.combatProjectiles = [];
    l.ground = [];
    const self = state?.map === mapId() ? state.actors.find((a) => a.id === state.self) : null;
    if (!self) {
      l.enemies = [];
      return;
    }
    l.life = self.hp;
    l.mana = self.mp;
    l.deadT = self.hp <= 0 ? 1 : 0;
    if(typeof OnlineConsumables!=='undefined')OnlineConsumables.auto(dt,send);
    l.slowT = self.cold;
    l.stunT = self.stun;
    l.hurtT=self.hurt||0;v.hurtT=self.hurt||0;l.slowPower=self.coldPower||0;l.hpDotT=self.poison||0;
    if(self.hp<=0)Y.target=null;
    if (l.P) {
      l.P.life = self.maxHp;
      l.P.mana = self.maxMp;
    }
    motion.step(v,dt,performance.now(),(actor,x,y,distance)=>mapNavigation.moveAlongPath(actor,x,y,distance),150*Ra());
    if(goal&&Math.hypot(goal.x-v.x,goal.y-v.y)<.1)Y.target=null;
    for (const m of monsters.values()) {
      const factor = Math.min(1, dt * 15);
      m.x += (m._netX - m.x) * factor;
      m.y += (m._netY - m.y) * factor;
      m.hitT = Math.max(0, (m.hitT || 0) - dt);
      m.hurtT = Math.max(0, (m.hurtT || 0) - dt);
    }
    visuals.advance(dt);
    const pose=visuals.pose?.(state.self);
    if(pose&&!motion.goal&&self.hp>0&&!self.stun&&!self.hurt){
      v._onlineCast=true;v.castT=pose.atT;v.speedCastDuration=pose.atD;v.speedCastProgress=1-pose.atT/pose.atD;ps(v,'at');
    }else if(v._onlineCast){v._onlineCast=false;v.castT=0;v.speedCastDuration=undefined;if(v.act==='at')ps(v,'st');}
    if(typeof onlineTrace!=='undefined')onlineTrace.advance();
    if(typeof OnlineLifecycle!=='undefined')OnlineLifecycle.remember();
  }
  function profile(saved) {
    if (currentSlot !== m0) {
      currentSlot = m0;
      lastRevision = -1;
      imported = false;
    }
    if (saved.revision <= lastRevision && imported) return;
    lastRevision = saved.revision;
    const p = saved.profile;
    if (!p || !o) return;
    const previousLevel=o.lvl;
    // Revision-based progression; initial/full commands also include canonical inventory.
    const fields = imported&&!saved.full
      ? (window.localGameConfig?.progressionFields||['lvl','xp','gold','attrPts','skPts','attr','sk','fac','skL','bkOk','main','mainLock','secondarySkill','slots','skillRoute','potStock','potUsed','onlinePotionSpent'])
      : ['lvl', 'xp', 'gold', 'knb', 'attrPts', 'skPts', 'attr', 'sk', 'eq', 'inv', 'fac', 'sex', 'name', 'skL', 'bkOk', 'sk150Training', 'mats', 'main', 'mainLock', 'secondarySkill', 'slots', 'skillRoute', 'auraOff', 'autoBuff', 'autoCurse', 'supportAutoOff', 'potStock', 'potUsed', 'onlinePotionSpent', 'uid', 'onlineMounted'];
    for (const field of fields) if (p[field] !== undefined) o[field] = structuredClone(p[field]);
    if(p.onlineMounted!==undefined)l.mounted=!!p.onlineMounted;
    imported = true;
    l.dirty = true;
    D0();
    if(typeof secondarySkill!=='undefined')secondarySkill.render();
    if(previousLevel!==o.lvl&&typeof Xe==='function')Xe();
    if(o.lvl>previousLevel&&o.autoPts===true){if(typeof Pt==='function')Pt();if(typeof yt==='function')yt();}
  }
  return {
    joinBattlefield(team){return OnlineBattlefield.join(team,send);},
    leaveBattlefield(){return OnlineBattlefield.leave(send);},
    support(id,actor=l.manTgt||l.tgt){
      if(T[id]&&wn(T[id])==='curse'&&T[id].f!=='wudu'){k('Bùa hại của môn phái này chưa được mở trong bản online.');return 0;}
      if(T[id]&&wn(T[id])==='curse'&&!actor){k('Hãy chọn mục tiêu để thi triển bùa hại');return 0;}
      return send(8,{skill:+id,target:actor?.id||0});
    },
    setPvp(enabled){clearTimeout(moveTimer);moveTimer=null;goal=null;motion.cancel();Y.target=null;return OnlinePvp.select(enabled,send);},
    potion(kind){return OnlineConsumables.use(kind,send);},
    bind(value) {
      client = value;
    },
    get active() {
      return active();
    },
    get state() {
      return state;
    },
    reset,
    snapshot,
    profile,
    simulate,
    move(x, y) {
      goal = { x, y };
      motion.begin(x,y,performance.now());
      visuals.cancelPose(state?.self);
      pendingMode = { enabled: o.ctrl==='auto', seq: 0 };
      clearTimeout(moveTimer);
      const emit = () => {
        moveTimer = null;
        if (goal && active()) {
          lastMove = performance.now();
          const seq=send(2, { x: goal.x, y: goal.y });
          if(seq)motion.sent(seq);
          if(seq)pendingMode = { enabled: o.ctrl==='auto', seq };
        }
      };
      const delay = Math.max(0, 100 - (performance.now() - lastMove));
      if (delay) moveTimer = setTimeout(emit, delay);
      else emit();
    },
    secondary(actor,skill){
      if(!client?.online||!active())return;
      if(T[skill]&&!UA(T[skill])){
        this.support(skill,actor);return;
      }
      if(!l.P?.actives?.some(s=>s.id===skill)){k('Chiêu phụ chưa dùng được với trang bị hiện tại.');return;}
      if(!actor)return;
      clearTimeout(moveTimer);moveTimer=null;goal=null;motion.cancel();Y.target=null;
      send(18,{target:actor.id,skill});
    },
    attack(actor, skill) {
      if ((skill ?? mainSkill()) !== (Number(l.P?.main?.id) || 0)) {
        k('Chiêu đã chọn chưa dùng được với trang bị hiện tại.'); return;
      }
      clearTimeout(moveTimer);
      moveTimer = null;
      goal = null;
      motion.cancel();
      if (pendingMode && !pendingMode.seq) pendingMode = null;
      Y.target = null;
      send(actor?.onlinePlayer?11:3, { target: actor?.id || 0, skill: skill ?? mainSkill() });
    },
    cast(skill, persisted = false) {
      if(T[skill]&&!UA(T[skill])&&['buff','aura'].includes(wn(T[skill]))){this.support(skill);return;}
      if(T[skill]&&wn(T[skill])==='curse'&&T[skill].f==='wudu'){Y.pendingSupport=skill;qA();k('Chọn mục tiêu để thi triển: '+T[skill].n);return;}
      if (!T[skill] || !UA(T[skill])) {
        k('Chiêu bùa hại chưa được mở trong bản online này.');
        return;
      }
      if(!persisted&&typeof OnlineProgression!=='undefined'&&OnlineProgression.enabled()){
        const slot=m0;
        OnlineProgression.run({kind:'mainSkill',skill})
          .then(()=>{if(m0===slot)this.cast(skill,true);})
          .catch(error=>k(error.message));
        return;
      }
      o.main = skill;
      o.mainLock = true;
      l.dirty = true;
      D0();
      qA();
      $();
      if (Number(l.P?.main?.id) !== Number(skill)) {
        blockedSkill = skill;
        this.farm(false);
        k('Đã chọn ' + T[skill].n + ': chưa dùng được với trang bị hiện tại.');
        return;
      }
      this.syncControls();
      if (o.ctrl !== 'auto' && !l.town) {
        const peers=typeof OnlinePvp!=='undefined'?OnlinePvp.targets(state):[];
        const enemies = o.mode==='slaughter'?peers:l.enemies.filter(m => !m.dead && m.hp > 0).concat(peers);
        if(l.manTgt?.onlinePlayer)l.manTgt=peers.find(p=>p.id===l.manTgt.id)||null;
        const target = l.manTgt && enemies.includes(l.manTgt) ? l.manTgt :
          enemies.sort((a,b)=>Math.hypot(a.x-v.x,a.y-v.y)-Math.hypot(b.x-v.x,b.y-v.y))[0];
        if (target) { l.manTgt = target; this.attack(target, skill); }
      }
      k('Chiêu chính: ' + T[skill].n);
    },
    syncControls() {
      if (!active() || !client?.online) return;
      const skill = mainSkill();
      if (skill !== (Number(l.P?.main?.id) || 0)) {
        if (blockedSkill !== skill) {
          blockedSkill = skill;
          this.farm(false);
          k('Chiêu đã chọn chưa dùng được với trang bị hiện tại.');
        }
        return;
      }
      blockedSkill = undefined;
      if (skill === selectedSkill) return;
      const seq = send(4, { skill });
      if (seq) selectedSkill = skill;
    },
    farm(enabled) {
      if (!client?.online) { k('Đang chờ kết nối online.'); return; }
      if (enabled && mainSkill() !== (Number(l.P?.main?.id) || 0)) {
        k('Chiêu đã chọn chưa dùng được với trang bị hiện tại.'); return;
      }
      clearTimeout(moveTimer);
      moveTimer = null;
      goal = null;
      motion.cancel();
      Y.target = null;
      Y.tmp = false;
      l.clickHold = false;
      l.moveTo = null;
      const skill = mainSkill(), seq = send(5, { target: +enabled, skill });
      if (seq) {
        selectedSkill = skill;
        pendingMode = { enabled, seq };
        displayMode(enabled);
      }
    },
    pickAt(x, y) {
      const player=typeof OnlinePvp!=='undefined'?OnlinePvp.pick(state,x,y):null;
      if(player){l.manTgt=player;this.attack(player);return true;}
      clearTimeout(moveTimer);
      moveTimer = null;
      const drop = state?.loot.find((d) => d.mine && Math.hypot(d.x - x, d.y - y) < 24);
      if (!drop) return false;
      goal = null;
      motion.cancel();
      send(6, { target: drop.id });
      return true;
    },
    drawDamageAreas(context){if(active()&&state)visuals.drawDamageAreas(context);},
    pose(id){return visuals.pose(id);},
    entities() {
      if (!active() || !state) return [];
      return state.loot.map((drop) => ({ onlineLoot: drop, x: drop.x, y: drop.y }));
    },
    draw(ctx, entity) {
      const d = entity.onlineLoot;
      goldLootVisuals.draw(ctx, d.knb||d.gold, d.x, d.y, d.mine,d.knb?'KNB':'lượng');
    },

  };
})();
