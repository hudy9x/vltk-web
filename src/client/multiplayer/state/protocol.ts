/** PvE wire records contain IDs and runtime state; never textures or computed damage from a client. */
export interface SupportState {shared?:boolean;level?:number;skill:number;remaining:number;cooldown:number;active:boolean;aura:boolean}
export interface CurseState {skill:number;level:number;remaining:number}
export interface ActorState {
  battlefieldTeam?:number; battlefieldKind?:number; battlefieldReady?:boolean;
  curses?:CurseState[];
  supports?:SupportState[];
  alignment?:number;pk?:boolean;life?:number;coldPower?:number;hurt?:number;poison?:number;
  id: number;
  x: number;
  y: number;
  hp: number;
  mp: number;
  maxHp: number;
  maxMp: number;
  cold: number;
  stun: number;
  farming: boolean;
}
export interface MonsterState {
  curses?:CurseState[];
  life: number;
  coldPower: number;
  id: number;
  definition: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  cold: number;
  stun: number;
  poison: number;
  level: number;
  dir: number;
  moving: boolean;
}
export interface LootState {
  knb?:number;
  id: number;
  x: number;
  y: number;
  gold: number;
  mine: boolean;
}
export interface CastVisual {level:number;missiles:number;flags:number;range:number;x:number;y:number;targetX:number;targetY:number}
export interface MovementState {commandTick:number;speed:number;x:number;y:number;motion:number}
export interface HitVisual {
  element: 'phys'|'poison'|'cold'|'fire'|'light';
  critical: boolean;
  hurt: boolean;
  dot: boolean;
}
export interface WorldEvent {
  id: number;
  source: number;
  target: number;
  skill: number;
  kind: number;
  value: number;
  tick:number;
  cast?:CastVisual;
  hit?:HitVisual;
}
export interface PartyMember {id:number;map:number;hp:number;maxHp:number;alignment:number;name:string}
export interface PartyInvitation {id:number;from:number;remaining:number;name:string}
export interface PartyState {leader:number;reply:{seq:number;code:number};members:PartyMember[];invitations:PartyInvitation[]}
export interface BattlefieldUnit {appearance?:{sx:'m'|'f';rows:{helm:number;armor:number;weapon:number;horse:number};ride:number;mg:boolean};id:number;name:string;faction:string;sex:number;skin:number;team:number;kind:number;tier:number;points:number;kills:number;playerKills?:number;online:boolean;moving:boolean;ready:boolean;level:number}
export interface BattlefieldState {itemBuffs?:Record<string,number>;itemTraps?:{kind:string;x:number;y:number;team:number;expires:number}[];id:number;starts:number;ends:number;now:number;phase:'waiting'|'running'|'finished';score:number[];team:number;entryRemaining:number;respawnRemaining:number;deaths:number;potions:number[];selected?:number[];inventory?:{id:number;slot:number;count:number}[];units:BattlefieldUnit[]}
export interface WorldState {
  battlefield?:BattlefieldState;
  death?:{killer:number;name:string;player:boolean};
  party?:PartyState;
  type: 'world';
  tick: number;
  map: number;
  self: number;
  ack: number;
  movement:MovementState;
  actors: ActorState[];
  monsters: MonsterState[];
  loot: LootState[];
  events: WorldEvent[];
}
export interface Command {
  kind: number;
  map: number;
  target?: number;
  skill?: number;
  x?: number;
  y?: number;
}
export function encodeCommand(version: number, seq: number, c: Command): Uint8Array {
  if (!Number.isFinite(c.x ?? 0) || !Number.isFinite(c.y ?? 0) || c.kind < 1 || c.kind > 20)
    throw new Error('Invalid command');
  const b = new Uint8Array(25),
    v = new DataView(b.buffer);
  b.set([version, 16]);
  v.setUint32(2, seq, true);
  b[6] = c.kind;
  v.setUint32(7, c.map, true);
  v.setUint32(11, c.target ?? 0, true);
  v.setUint16(15, c.skill ?? 0, true);
  v.setFloat32(17, c.x ?? 0, true);
  v.setFloat32(21, c.y ?? 0, true);
  return b;
}
export function decodeWorld(bytes: Uint8Array): WorldState {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 43) throw new Error('Truncated world');
  const counts = [18, 20, 22, 24].map((o) => v.getUint16(o, true));
  if (
    counts[0] > 128 ||
    counts[1] > 64 ||
    counts[2] > 64 ||
    counts[3] > 128 ||
    bytes.length < 43 + counts[0] * 55 + counts[1] * 48 + counts[2] * 17 + counts[3] * 23
  )
    throw new Error('Invalid world size');
  let at = 26;
  const u32 = () => {
    const n = v.getUint32(at, true);
    at += 4;
    return n;
  };
  const f32 = () => {
    const n = v.getFloat32(at, true);
    at += 4;
    if (!Number.isFinite(n)) throw new Error('Invalid world float');
    return n;
  };
  const u16 = () => {
    const n = v.getUint16(at, true);
    at += 2;
    return n;
  };
  const flag = () => {
    const n = bytes[at++];
    if (n > 1) throw new Error('Invalid flag');
    return !!n;
  };
  const movement={commandTick:u32(),speed:f32(),x:f32(),y:f32(),motion:bytes[at++]};
  if(movement.speed<0||movement.motion>2)throw new Error('Invalid movement');
  const actors = Array.from({ length: counts[0] }, () => ({
    id: u32(),
    x: f32(),
    y: f32(),
    hp: f32(),
    mp: f32(),
    maxHp: f32(),
    maxMp: f32(),
    cold: f32(),
    stun: f32(),
    farming: flag(),
    alignment:bytes[at++],pk:flag(),life:u32(),coldPower:f32(),hurt:f32(),poison:f32(),
  }));
  const monsters = Array.from({ length: counts[1] }, () => ({
    id: u32(),
    definition: u32(),
    x: f32(),
    y: f32(),
    hp: f32(),
    maxHp: f32(),
    cold: f32(),
    stun: f32(),
    poison: f32(),
    level: u16(),
    dir: bytes[at++],
    moving: flag(),
    life: u32(),
    coldPower: f32(),
  }));
  const loot:LootState[] = Array.from({ length: counts[2] }, () => {
    const id=u32(),x=f32(),y=f32(),amount=u32(),flags=bytes[at++];
    if(flags>3)throw new Error('Invalid loot flags');
    return {id,x,y,gold:flags&2?0:amount,mine:!!(flags&1),...(flags&2?{knb:amount}:{})};
  });
  const events = Array.from({length:counts[3]},()=>{
    const event:WorldEvent={id:u32(),source:u32(),target:u32(),skill:u16(),kind:bytes[at++],value:f32(),tick:u32()};
    if(event.kind===2){
      if(at>=bytes.length)throw new Error('Invalid world size');
      const flags=bytes[at++],elements:HitVisual['element'][]=['phys','poison','cold','fire','light'];
      if((flags&7)>4||flags>63)throw new Error('Invalid hit visual');
      event.hit={element:elements[flags&7],critical:!!(flags&8),hurt:!!(flags&16),dot:!!(flags&32)};
    }
    if(event.kind===1){event.cast={level:u16(),missiles:bytes[at++],flags:bytes[at++],range:f32(),x:f32(),y:f32(),targetX:f32(),targetY:f32()};
      if(event.cast.level<1||event.cast.missiles<1||event.cast.missiles>16||event.cast.flags>3||event.cast.range<0)throw new Error('Invalid cast visual');}
    if(event.kind<1||event.kind>7)throw new Error('Invalid world event');return event;
  });
  if(at+2>bytes.length)throw new Error('Invalid world size');
  const supportCount=u16();
  if(supportCount>2048||at+supportCount*15+11>bytes.length)throw new Error('Invalid support size');
  const supportKeys=new Set<string>();
  for(let i=0;i<supportCount;i++){
    const owner=u32(),skill=u16(),remaining=f32(),cooldown=f32(),flags=bytes[at++];
    const actor=actors.find(a=>a.id===owner),key=owner+':'+skill;
    if(!actor||remaining<0||cooldown<0||flags>3||supportKeys.has(key))throw new Error('Invalid support state');
    supportKeys.add(key);
    const record=actor as ActorState;(record.supports ||= []).push({skill,remaining,cooldown,active:!!(flags&1),aura:!!(flags&2)});
  }
  if(at+11>bytes.length)throw new Error('Invalid party size');
  const leader=u32(),reply={seq:u32(),code:bytes[at++]},memberCount=bytes[at++],inviteCount=bytes[at++];
  if(memberCount>8||inviteCount>1||reply.code>10)throw new Error('Invalid party state');
  const readName=()=>{
    if(at>=bytes.length)throw new Error('Invalid party size');
    const size=bytes[at++];
    if(size>96||at+size>bytes.length)throw new Error('Invalid party name');
    const name=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(at,at+size));at+=size;return name;
  };
  const members:PartyMember[]=Array.from({length:memberCount},()=>{
    if(at+18>bytes.length)throw new Error('Invalid party size');
    return {id:u32(),map:u32(),hp:f32(),maxHp:f32(),alignment:bytes[at++],name:readName()};
  });
  const invitations:PartyInvitation[]=Array.from({length:inviteCount},()=>{
    if(at+13>bytes.length)throw new Error('Invalid party size');
    return {id:u32(),from:u32(),remaining:f32(),name:readName()};
  });
  if(at<bytes.length&&bytes[at]===0xb1){
    at++;if(at+2>bytes.length)throw new Error('Invalid shared support size');
    const count=u16();if(count>2048||at+count*8>bytes.length)throw new Error('Invalid shared support size');
    for(let i=0;i<count;i++){
      const owner=u32(),skill=u16(),level=u16(),actor=actors.find(a=>a.id===owner) as ActorState|undefined;
      if(!actor||!level||actor.supports?.some(s=>s.skill===skill&&s.active))throw new Error('Invalid shared support state');
      if(actor.supports?.some(s=>s.skill===skill&&s.shared))throw new Error('Duplicate shared support state');
      (actor.supports ||= []).push({skill,level,shared:true,active:true,aura:true,remaining:0,cooldown:0});
    }
  }
  if(at<bytes.length&&bytes[at]===0xc1){
    at++;if(at+2>bytes.length)throw new Error('Invalid curse size');
    const count=u16();if(count>2048||at+count*12>bytes.length)throw new Error('Invalid curse size');
    const keys=new Set<string>();
    for(let i=0;i<count;i++){
      const owner=u32(),skill=u16(),level=u16(),remaining=f32(),key=owner+':'+skill;
      const actor=actors.find(a=>a.id===owner)||monsters.find(m=>m.id===owner);
      if(!actor||!level||remaining<=0||remaining>60||keys.has(key))throw new Error('Invalid curse state');
      keys.add(key);((actor as ActorState|MonsterState).curses ||= []).push({skill,level,remaining});
    }
  }
  let death:WorldState['death'];
  if(at<bytes.length&&bytes[at]===0xd1){
    if(at+7>bytes.length||bytes[at++]!==0xd1)throw new Error('Invalid death state');
    const killer=u32(),player=flag(),name=readName();death={killer,player,name};
  }
  let battlefield:BattlefieldState|undefined;
  if(at<bytes.length&&bytes[at]===0xe1){
    at++;if(at+4>bytes.length)throw new Error('Invalid battlefield size');
    const size=u32();if(size>100000||at+size!==bytes.length)throw new Error('Invalid battlefield size');
    battlefield=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(at,at+size)));at+=size;
    const s=battlefield;
    if(!s||!Number.isSafeInteger(s.id)||s.id<1||!['waiting','running','finished'].includes(s.phase)||
      ![s.starts,s.ends,s.now,s.entryRemaining,s.respawnRemaining].every(Number.isFinite)||s.ends<=s.starts||s.entryRemaining<0||s.respawnRemaining<0||
      ![0,1].includes(s.team)||!Array.isArray(s.score)||s.score.length!==2||s.score.some(n=>!Number.isSafeInteger(n)||n<0)||
      !Array.isArray(s.potions)||s.potions.length!==2||s.potions.some(n=>!Number.isSafeInteger(n)||n<0||n>40)||
      !Array.isArray(s.units)||s.units.length>160||new Set(s.units.map(u=>u.id)).size!==s.units.length||
      s.units.some(u=>!Number.isSafeInteger(u.id)||u.id<1||typeof u.name!=='string'||u.name.length>96||typeof u.faction!=='string'||
        ![0,1].includes(u.team)||![0,1,2,3].includes(u.kind)||!Number.isSafeInteger(u.points)||u.points<0||typeof u.ready!=='boolean'))throw new Error('Invalid battlefield state');
    if(s.itemBuffs&&(typeof s.itemBuffs!=='object'||Object.values(s.itemBuffs).some(t=>!Number.isFinite(t)||t<0||t>180)))throw new Error('Invalid item buffs');
    if(s.itemTraps&&(!Array.isArray(s.itemTraps)||s.itemTraps.length>128||s.itemTraps.some(t=>
      !['freezeTrap','stunTrap','slowTrap'].includes(t.kind)||![t.x,t.y,t.expires].every(Number.isFinite)||t.team!==s.team)))throw new Error('Invalid item traps');
    for(const actor of actors){const u=s.units.find(u=>u.id===actor.id);if(u)Object.assign(actor,{battlefieldTeam:u.team,battlefieldKind:u.kind,battlefieldReady:u.ready});}
  }
  if(at!==bytes.length)throw new Error('Invalid world size');
  const self=v.getUint32(10,true);
  if((leader===0)!==(members.length===0)||members.length===1||
    members.length&&(!members.some(m=>m.id===self)||members[0].id!==leader)||
    new Set(members.map(m=>m.id)).size!==members.length||
    members.some(m=>!m.id||m.hp<0||m.maxHp<=0||m.alignment>3)||
    invitations.some(i=>!i.id||!i.from||i.from===self||i.remaining<=0||i.remaining>60))throw new Error('Invalid party state');
  const party={leader,reply,members,invitations};
  if (
    actors.some((a) => a.hp < 0 || a.maxHp <= 0 || a.alignment>3 || a.life<1 || a.coldPower<0 || a.coldPower>.75 || a.hurt<0 || a.poison<0) ||
    monsters.some((m) => m.dir > 7 || m.hp < 0 || m.maxHp <= 0 || m.coldPower < 0 || m.coldPower > .75)
  )
    throw new Error('Invalid entity state');
  return {
    type: 'world',
    ...(battlefield?{battlefield}:{}),
    ...(death?{death}:{}),
    party,
    movement,
    tick: v.getUint32(2, true),
    map: v.getUint32(6, true),
    self: v.getUint32(10, true),
    ack: v.getUint32(14, true),
    actors,
    monsters,
    loot,
    events,
  };
}
