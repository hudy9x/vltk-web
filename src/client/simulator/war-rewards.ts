import type { LegacyEntity, LegacyRecord } from './types';
import type { Team } from './battlefield';
export const WAR_RANKS = [{ points:0, name:'Binh sĩ' },{ points:100, name:'Hiệu úy' },{ points:300, name:'Thống lĩnh' },{ points:700, name:'Đại thống lĩnh' },{ points:1500, name:'Tướng quân' },{ points:3000, name:'Nguyên soái' }];
export const WAR_ITEMS = {
  resistance: { name:'Hộ Thể Hoàn', description:'+20 điểm kháng mọi loại', color:'#7bc6ff' },
  attack: { name:'Thần Lực Hoàn', description:'+25% tốc độ đánh/thi triển', color:'#ffc56e' },
  movement: { name:'Thần Hành Hoàn', description:'+25% tốc độ di chuyển', color:'#96e7a1' },
} as const;
export type WarItem = keyof typeof WAR_ITEMS;
export const WAR_BUFF_SECONDS = 180;
export function warRank(points: number) { return [...WAR_RANKS].reverse().find(rank => points >= rank.points)!; }
interface Credit { source: LegacyEntity; at: number; player: boolean; team: Team }
export function createWarRewards(host: { player(): LegacyEntity; team(): Team; running(): boolean; alive(): boolean; changed(): void }, random = () => Math.random()) {
  let elapsed=0, nextId=0, credits=new WeakMap<LegacyEntity,Credit>(), defeated=new WeakSet<LegacyEntity>();
  let merits=new WeakMap<LegacyEntity,number>();
  const inventory: Record<WarItem,number> = { resistance:0, attack:0, movement:0 };
  const until: Record<WarItem,number> = { resistance:0, attack:0, movement:0 };
  const drops: { id:number; kind:WarItem; x:number; y:number; expires:number }[] = [];
  function reset() {
    elapsed=0; nextId=0; credits=new WeakMap(); defeated=new WeakSet(); merits=new WeakMap(); drops.length=0;
    for(const kind of Object.keys(WAR_ITEMS) as WarItem[]) inventory[kind]=until[kind]=0;
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
    merits.set(credit.source,(merits.get(credit.source)||0)+(target.battlefieldBoss?1000:target.battlefieldMonster?10:50));
    if(credit.player) host.changed();
    if(target.battlefieldMonster && random()<.35 && credit.team===host.team()) {
      const kinds=Object.keys(WAR_ITEMS) as WarItem[], kind=kinds[Math.floor(random()*kinds.length)];
      if(drops.length>=40)drops.shift();
      drops.push({id:++nextId,kind,x:target.x,y:target.y,expires:elapsed+90});
    }
  }
  function tick(dt:number) {
    if(!host.running()) { if(Object.values(until).some(value=>value>elapsed)) { for(const kind of Object.keys(WAR_ITEMS) as WarItem[])until[kind]=0; host.changed(); } return; }
    elapsed+=dt;
    for(const kind of Object.keys(WAR_ITEMS) as WarItem[]) if(until[kind]>0&&until[kind]<=elapsed) { until[kind]=0;host.changed(); }
    const player=host.player();
    for(let i=drops.length-1;i>=0;i--) {
      const drop=drops[i];
      if(host.alive()&&Math.hypot(player.x-drop.x,(player.y-drop.y)*2)<=80) { inventory[drop.kind]++; drops.splice(i,1); host.changed(); }
      else if(drop.expires<=elapsed)drops.splice(i,1);
    }
  }
  function use(kind:WarItem) {
    if(!host.running()||!host.alive())throw new Error('Chỉ dùng hoàn khi đang sống trong trận.');
    if(!(kind in WAR_ITEMS)||inventory[kind]<1)throw new Error('Chưa có loại hoàn này.');
    inventory[kind]--;until[kind]=elapsed+WAR_BUFF_SECONDS;host.changed();
  }
  function apply(stats:LegacyRecord) {
    if(!host.running())return;
    if(until.resistance>elapsed)for(const key of ['phys','cold','fire','poison','light'])stats.res[key]=(stats.res[key]||0)+20;
    if(until.attack>elapsed) { stats.aspdP=Math.min(3,stats.aspdP*1.25);stats.aspdC=Math.min(2.7,stats.aspdC*1.25);stats.aspd=stats.aspdP; }
    if(until.movement>elapsed) { stats.speed*=1.25;stats.speedFoot=(stats.speedFoot||stats.speed/1.25)*1.25; }
  }
  return {reset,record,killed,tick,use,apply,revived(actor:LegacyEntity){defeated.delete(actor);credits.delete(actor);}, get drops(){return drops.map(drop=>({...drop}));},
    rank(actor:LegacyEntity){const points=merits.get(actor)||0;return{...warRank(points),points,next:WAR_RANKS.find(rank=>rank.points>points)?.points||null};},
    get state(){const points=merits.get(host.player())||0;return{points,title:warRank(points).name,next:WAR_RANKS.find(rank=>rank.points>points)?.points||null,inventory:{...inventory},buffs:Object.fromEntries(Object.entries(until).map(([kind,value])=>[kind,Math.max(0,value-elapsed)])) as Record<WarItem,number>};} };
}
export type WarRewards = ReturnType<typeof createWarRewards>;
