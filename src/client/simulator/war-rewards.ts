import type { LegacyEntity, LegacyRecord } from './types';
import type { Team } from './battlefield';
export const WAR_RANKS = [
  { points:0, name:'Binh sĩ', bonus:0 },
  { points:3000, name:'Hiệu úy', bonus:.05 },
  { points:9000, name:'Thống lĩnh', bonus:.10 },
  { points:18000, name:'Phó tướng', bonus:.15 },
  { points:30000, name:'Đại tướng', bonus:.20 },
] as const;
const pill = 'img/tong-kim/pill.png';
const command = 'img/tong-kim/command.png';
const drum = 'img/tong-kim/drum.png';
export const WAR_ITEMS = {
  resistance: { name:'Hộ Thể Hoàn', description:'+20 điểm kháng mọi loại', color:'#7bc6ff', icon:pill },
  attack: { name:'Thần Lực Hoàn', description:'+25% tốc độ đánh/thi triển', color:'#ffc56e', icon:pill },
  movement: { name:'Thần Hành Hoàn', description:'+25% tốc độ di chuyển', color:'#96e7a1', icon:pill },
  drum: { name:'Chiến Cổ', description:'+30% sinh lực tối đa và 30 điểm kháng mọi loại cho bản thân và đồng đội trong bán kính 410', color:'#ff8585', icon:drum },
  command: { name:'Lệnh Bài', description:'+30% di chuyển, +50% tốc độ đánh/thi triển cho bản thân và đồng đội trong bán kính 410', color:'#ffd06e', icon:command },
  external: { name:'Ngoại Phổ Hoàn', description:'+50% sát thương vật lý ngoại công', color:'#ffd06e', icon:pill },
  externalCold: { name:'Ngoại Băng Hoàn', description:'+100 băng sát ngoại công', color:'#83dcff', icon:pill },
  internal: { name:'Nội Phổ Hoàn', description:'+100 sát thương vật lý nội công', color:'#eac8ff', icon:pill },
  internalPoison: { name:'Nội Độc Hoàn', description:'+50 độc sát nội công', color:'#9ee978', icon:pill },
  internalCold: { name:'Nội Băng Hoàn', description:'+100 băng sát nội công', color:'#83dcff', icon:pill },
  internalFire: { name:'Nội Hỏa Hoàn', description:'+100 hỏa sát nội công', color:'#ff9875', icon:pill },
  internalLight: { name:'Nội Lôi Hoàn', description:'+100 lôi sát nội công', color:'#d7b3ff', icon:pill },
  life: { name:'Trường Mệnh Hoàn', description:'+500 sinh lực tối đa', color:'#ff8585', icon:pill },
  sprint: { name:'Gia Bào Hoàn', description:'+20% tốc độ di chuyển', color:'#96e7a1', icon:pill },
  evasion: { name:'Cao Thiểm Hoàn', description:'+500 né tránh', color:'#a1e6dc', icon:pill },
  accuracy: { name:'Cao Trung Hoàn', description:'+500 chính xác', color:'#ffd06e', icon:pill },
  haste: { name:'Phi Tốc Hoàn', description:'+50% tốc độ đánh/thi triển', color:'#ffc56e', icon:pill },
  horn: { name:'Kháng Đơn Chi Giác', description:'Giảm 20% phản đòn của đối thủ trong bán kính 410', color:'#eac8ff', icon:command },
  poisonRes: { name:'Độc Phòng Hoàn', description:'+50 điểm kháng độc', color:'#9ee978', icon:pill },
  coldRes: { name:'Băng Phòng Hoàn', description:'+50 điểm kháng băng', color:'#83dcff', icon:pill },
  lightRes: { name:'Lôi Phòng Hoàn', description:'+50 điểm kháng lôi', color:'#d7b3ff', icon:pill },
  physicalRes: { name:'Phổ Phòng Hoàn', description:'+50 điểm phòng thủ vật lý', color:'#e3d1a0', icon:pill },
  fireRes: { name:'Hỏa Phòng Hoàn', description:'+50 điểm kháng hỏa', color:'#ff9875', icon:pill },
  freezeTrap: { name:'Bẫy băng', description:'Đặt bẫy tại chỗ, đối thủ đến gần bị đóng băng 3 giây; bẫy tồn tại 30 giây', color:'#83dcff', icon:command },
  stunTrap: { name:'Bẫy choáng', description:'Đặt bẫy tại chỗ, đối thủ đến gần bị choáng 3 giây; bẫy tồn tại 30 giây', color:'#ffd06e', icon:command },
  slowTrap: { name:'Bẫy làm chậm', description:'Đặt bẫy tại chỗ, đối thủ đến gần bị giảm 50% tốc độ di chuyển trong 5 giây; bẫy tồn tại 30 giây', color:'#96e7a1', icon:command },
} as const;
export type WarItem = keyof typeof WAR_ITEMS;
export const WAR_BUFF_SECONDS = 180;
export const WAR_STACK_SIZE = 50;
const itemKinds = Object.keys(WAR_ITEMS) as WarItem[];
export function warItemStacks(inventory: Partial<Record<WarItem, number>>) {
  return itemKinds.flatMap(kind => {
    const count = Math.max(0, Math.floor(inventory[kind] || 0));
    return Array.from({length: Math.ceil(count / WAR_STACK_SIZE)}, (_, index) => ({kind, count:Math.min(WAR_STACK_SIZE, count-index*WAR_STACK_SIZE)}));
  });
}
export function warRank(points: number) { return [...WAR_RANKS].reverse().find(rank => points >= rank.points)!; }
interface Credit { source: LegacyEntity; at: number; player: boolean; team: Team }
export function createWarRewards(host: { player(): LegacyEntity; team(): Team; running(): boolean; alive(): boolean; changed(): void; earned?(points:number):void; bonusesChanged?(): void; promoted?(actor: LegacyEntity): void; event?(message: string, kind?: 'kill' | 'sim-kill'): void; name?(actor: LegacyEntity): string; storage?(): Record<string,number>; canCollect?(kind:WarItem): boolean; actors?(): LegacyEntity[]; trapPlaced?(kind:WarItem):void; trapTriggered?(trap:{kind:WarItem;x:number;y:number;age:number;expires:number}):void; trap?(actor:LegacyEntity, kind:WarItem): void }, random = () => Math.random()) {
  let elapsed=0, nextId=0, credits=new WeakMap<LegacyEntity,Credit>(), defeated=new WeakSet<LegacyEntity>();
  let merits=new WeakMap<LegacyEntity,number>(), soldierKills=new WeakMap<LegacyEntity,number>();
  const totals: Record<Team,number> = {song:0,jin:0};
  const inventory = Object.fromEntries(itemKinds.map(kind => [kind,0])) as Record<WarItem,number>;
  function stock(kind:WarItem, value?:number) {
    const store:Record<string,number> = host.storage?.() || inventory, key = host.storage ? `tk_${kind}` : kind;
    if(value!==undefined)store[key]=value;
    return Math.max(0,Math.floor(store[key]||0));
  }
  const until = Object.fromEntries(itemKinds.map(kind => [kind,0])) as Record<WarItem,number>;
  let shared = new Map<LegacyEntity,Partial<Record<WarItem,number>>>();
  const traps: {kind:WarItem;x:number;y:number;age:number;expires:number}[] = [];
  const drops: { id:number; kind:WarItem; x:number; y:number; expires:number }[] = [];
  function reset() {
    elapsed=0; nextId=0; credits=new WeakMap(); defeated=new WeakSet(); merits=new WeakMap(); soldierKills=new WeakMap(); totals.song=totals.jin=0; drops.length=0; traps.length=0; shared=new Map();
    for(const kind of Object.keys(WAR_ITEMS) as WarItem[]) { until[kind]=0; if(!host.storage)inventory[kind]=0; }
    host.changed();
  }
  function record(source: LegacyEntity,target: LegacyEntity) {
    if(target.battlefieldPlayer)target=host.player();
    if(!host.running() || !(target.battlefieldMonster||target.arenaSim||target===host.player())) return;
    const player=source===host.player(), team=player?host.team():source.battlefieldTeam;
    if ((team==='song'||team==='jin') && team!==(target===host.player()?host.team():target.battlefieldTeam)) credits.set(target,{source,player,team,at:elapsed});
  }
  function killed(target: LegacyEntity) {
    if(target.battlefieldPlayer)target=host.player();
    if(!host.running() || !(target.battlefieldMonster||target.arenaSim||target===host.player()) || defeated.has(target)) return;
    defeated.add(target);
    const credit=credits.get(target);
    if(!credit || elapsed-credit.at>15 || credit.team===(target===host.player()?host.team():target.battlefieldTeam)) return;
    const victimTitle = target.battlefieldBoss ? 'Nguyên soái' : target.battlefieldMonster ? target.battlefieldRank || 'Binh sĩ' : warRank(merits.get(target)||0).name;
    const tier = Math.max(0, WAR_RANKS.findIndex(rank => rank.name === victimTitle)) + 1;
    const before = merits.get(credit.source)||0, points = target.battlefieldBoss ? 1000 : (target.battlefieldMonster ? 50 : 150) * tier;
    merits.set(credit.source,before+points); totals[credit.team]+=points;
    if(target.battlefieldMonster) soldierKills.set(credit.source,(soldierKills.get(credit.source)||0)+1);
    const name = (actor:LegacyEntity) => host.name?.(actor) || actor.n || (actor===host.player()?'Người chơi':'SIM');
    if (credit.player || target === host.player()) {
      const opponent = credit.player ? target : credit.source;
      const sim = opponent.arenaSim && !opponent.battlefieldBoss && !opponent.battlefieldMonster;
      host.event?.(`${credit.team==='song'?'Tống':'Kim'} · ${name(credit.source)} tiêu diệt ${name(target)} <${victimTitle}> (+${points} quân trạng)`, sim ? 'sim-kill' : 'kill');
    }
    const title = warRank(before+points).name;
    if(title!==warRank(before).name) {
      host.promoted?.(credit.source);
      host.event?.(`${name(credit.source)} đạt danh hiệu mới: <${title}> (${before+points} quân trạng · +${Math.round(warRank(before+points).bonus*100)}% sát thương vật lý ngoại/nội công, tốc độ đánh và kháng)`);
    }
    if(credit.player) { host.earned?.(points);host.changed(); }
    if(target.battlefieldMonster && random()<.35 && credit.team===host.team()) {
      const kinds=Object.keys(WAR_ITEMS) as WarItem[], kind=kinds[Math.floor(random()*kinds.length)];
      if(drops.length>=40)drops.shift();
      drops.push({id:++nextId,kind,x:target.x,y:target.y,expires:elapsed+90});
    }
  }
  function tick(dt:number) {
    if(!host.running()) { if(shared.size || traps.length || Object.values(until).some(value=>value>elapsed)) { for(const kind of itemKinds)until[kind]=0; shared.clear();traps.length=0;host.bonusesChanged?.();host.changed(); } return; }
    elapsed+=dt;
    let expired=false;
    for(const kind of itemKinds)if(until[kind]>0&&until[kind]<=elapsed) { until[kind]=0;expired=true; }
    for(const [actor,buffs] of shared) {
      for(const kind of itemKinds)if(buffs[kind] && buffs[kind]!<=elapsed) { delete buffs[kind];expired=true; }
      if(!Object.keys(buffs).length)shared.delete(actor);
    }
    if(expired) { host.bonusesChanged?.();host.changed(); }
    const player=host.player();
    for(let i=traps.length-1;i>=0;i--) {
      const trap=traps[i];trap.age+=dt;
      if(trap.expires<=trap.age) { traps.splice(i,1);continue; }
      const targets=(host.actors?.()||[]).filter(actor => actor.battlefieldTeam && actor.battlefieldTeam!==host.team() && actor.hp>0 && !actor.dead && Math.hypot(actor.x-trap.x,(actor.y-trap.y)*2)<=90);
      if(targets.length) { host.trapTriggered?.({...trap});for(const target of targets)host.trap?.(target,trap.kind); traps.splice(i,1); }

    }
    for(let i=drops.length-1;i>=0;i--) {
      const drop=drops[i];
      if(drop.expires<=elapsed) { drops.splice(i,1);continue; }
      if(host.alive()&&Math.hypot(player.x-drop.x,(player.y-drop.y)*2)<=80) { if(host.canCollect?.(drop.kind)===false)continue; stock(drop.kind,stock(drop.kind)+1); drops.splice(i,1); host.event?.(`Nhặt ${WAR_ITEMS[drop.kind].name} (${stock(drop.kind)})`); host.changed(); }

    }
  }
  function use(kind:WarItem) {
    if(!host.running()||!host.alive())throw new Error('Chỉ dùng vật phẩm Tống Kim khi đang sống trong trận.');
    if(!Object.prototype.hasOwnProperty.call(WAR_ITEMS,kind)||stock(kind)<1)throw new Error('Chưa có loại vật phẩm này.');
    stock(kind,stock(kind)-1);
    if(kind==='freezeTrap'||kind==='stunTrap'||kind==='slowTrap') {
      const player=host.player(); if(traps.length>=40)traps.shift();
      traps.push({kind,x:player.x,y:player.y,age:0,expires:30});host.trapPlaced?.(kind);
    } else if(kind==='drum'||kind==='command'||kind==='horn') {
      if(kind==='horn')until.horn=elapsed+WAR_BUFF_SECONDS;
      const player=host.player();
      for(const actor of [player,...(host.actors?.()||[])]) {
        const friendly=actor===player||actor.battlefieldTeam===host.team();
        if((kind==='horn'?friendly:!friendly)||actor.battlefieldMonster||actor.battlefieldBoss||actor.dead||(actor!==player&&actor.hp<=0)||Math.hypot(actor.x-player.x,(actor.y-player.y)*2)>410)continue;
        const buffs=shared.get(actor)||{};buffs[kind]=elapsed+WAR_BUFF_SECONDS;shared.set(actor,buffs);
      }
    } else until[kind]=elapsed+WAR_BUFF_SECONDS;
    host.event?.(`Dùng ${WAR_ITEMS[kind].name}`);host.bonusesChanged?.();host.changed();
  }
  function apply(stats:LegacyRecord, actor:LegacyEntity = host.player()) {
    if(!host.running())return;
    if(actor.battlefieldBoss || actor.battlefieldMonster || (actor!==host.player() && actor.battlefieldTeam!=='song' && actor.battlefieldTeam!=='jin'))return;
    const multiplier=1+Math.min(.20,Math.max(0,warRank(merits.get(actor)||0).bonus));
    stats.warPhysicalMultiplier=multiplier;
    for(const key of ['phys','cold','fire','poison','light']) {
      const resistance=stats.res[key]||0;
      // Negative resistance must not become a larger penalty when promoted.
      stats.res[key]=resistance>0?resistance*multiplier:resistance;
    }
    stats.aspdP*=multiplier;stats.aspdC*=multiplier;stats.aspd=stats.aspdP;
    const active=(kind:WarItem) => (actor===host.player()?until[kind]:0)>elapsed || (shared.get(actor)?.[kind]||0)>elapsed;
    if(active('drum')) { stats.life*=1.3; for(const key of ['phys','cold','fire','poison','light'])stats.res[key]=(stats.res[key]||0)+30; }
    if(active('resistance'))for(const key of ['phys','cold','fire','poison','light'])stats.res[key]=(stats.res[key]||0)+20;
    for(const [kind,key] of [['poisonRes','poison'],['coldRes','cold'],['lightRes','light'],['physicalRes','phys'],['fireRes','fire']] as const)if(active(kind))stats.res[key]=(stats.res[key]||0)+50;
    const attackBonus=Math.max(active('attack') ? .25 : 0,(active('haste')||active('command')) ? .5 : 0);
    stats.aspdP*=1+attackBonus;stats.aspdC*=1+attackBonus;stats.aspd=stats.aspdP;
    const movementBonus=Math.max(active('movement') ? .25 : 0,active('sprint') ? .2 : 0,active('command') ? .3 : 0);
    stats.speed*=1+movementBonus;stats.speedFoot=(stats.speedFoot||stats.speed/(1+movementBonus))*(1+movementBonus);
    if(active('life'))stats.life+=500;
    if(active('evasion'))stats.def=(stats.def||0)+500;
    if(active('accuracy')) { stats.ar=(stats.ar||0)+500;stats.arBase=(stats.arBase||0)+500; }
    if(active('external'))stats.warExternalMultiplier=1.5;
    stats.warExternalCold=active('externalCold')?100:0;
    stats.warInternalAdd={phys:active('internal')?100:0,poison:active('internalPoison')?50:0,cold:active('internalCold')?100:0,fire:active('internalFire')?100:0,light:active('internalLight')?100:0};
    if(actor!==host.player()&&active('horn')) { stats.retMelee=(stats.retMelee||0)*.8;stats.retMeleeP=(stats.retMeleeP||0)*.8;stats.retRangeP=(stats.retRangeP||0)*.8; }

  }
  return {reset,record,killed,tick,use,apply,get totals(){return {...totals};},revived(actor:LegacyEntity){defeated.delete(actor);credits.delete(actor);}, get traps(){return traps.map(trap=>({...trap}));}, get drops(){return drops.map(drop=>({...drop}));},
    rank(actor:LegacyEntity){const points=merits.get(actor)||0;return{...warRank(points),points,soldierKills:soldierKills.get(actor)||0,next:WAR_RANKS.find(rank=>rank.points>points)?.points||null};},
    get state(){const points=merits.get(host.player())||0;return{points,title:warRank(points).name,next:WAR_RANKS.find(rank=>rank.points>points)?.points||null,inventory:Object.fromEntries(itemKinds.map(kind=>[kind,stock(kind)])) as Record<WarItem,number>,buffs:Object.fromEntries(itemKinds.map(kind=>[kind,Math.max(0,Math.max(until[kind],shared.get(host.player())?.[kind]||0)-elapsed)])) as Record<WarItem,number>};} };
}
export type WarRewards = ReturnType<typeof createWarRewards>;
