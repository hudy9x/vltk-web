/** PvE wire records contain IDs and runtime state; never textures or computed damage from a client. */
export interface SupportState {skill:number;remaining:number;cooldown:number;active:boolean;aura:boolean}
export interface ActorState {
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
export interface WorldState {
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
  if (!Number.isFinite(c.x ?? 0) || !Number.isFinite(c.y ?? 0) || c.kind < 1 || c.kind > 17)
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
    counts[0] > 32 ||
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
  if(supportCount>512||at+supportCount*15+11>bytes.length)throw new Error('Invalid support size');
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
  let death:WorldState['death'];
  if(at<bytes.length){
    if(at+7>bytes.length||bytes[at++]!==0xd1)throw new Error('Invalid death state');
    const killer=u32(),player=flag(),name=readName();death={killer,player,name};
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
