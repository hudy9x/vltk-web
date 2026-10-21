import type { ArmyEquipmentKind } from './set-equipment';
import { BATTLEFIELD_ROUTES } from './routes';
import { distributeArmy } from './composition';
import type { LegacyEntity, SimulatorActor } from './types';

export type Team = 'song' | 'jin';
export type Strength = 'weak' | 'normal' | 'strong';
export interface ArmyBuild { team: Team; faction: string; level: number; strength: Strength; count: number; composition?: Record<string, number>; equipped?: boolean; skillTier?: 90 | 150; equipmentKind?: ArmyEquipmentKind }
export interface BothArmyBuild extends Omit<ArmyBuild, 'team' | 'composition'> { compositions?: Record<Team, Record<string, number>> }
export function splitArmyTotal(count: number) {
  if (!Number.isSafeInteger(count) || count < 2 || count > 200 || count % 2) throw new Error('Tổng SIM phải là số chẵn từ 2 đến 200 để chia đều hai phe.');
  return { song: count / 2, jin: count / 2 };
}
export const BATTLE_DURATION = 20 * 60;
export const RESPAWN_SECONDS = 5;
export const MIN_BOSS_SECONDS = 10 * 60;
export const BATTLE_MAP = 9001;
export const TEAM_NAMES = { song: 'Tống', jin: 'Kim' } as const;
export const CAMPS = { song: { x: 450, y: 1792 }, jin: { x: 3134, y: 1792 } } as const;
export const ELEMENT_FACTIONS = [ ['shaolin', 'tianwang'], ['tangmen', 'wudu'], ['emei', 'cuiyan'], ['gaibang', 'tianren'], ['wudang', 'kunlun'] ] as const;
export const otherTeam = (team: Team): Team => team === 'song' ? 'jin' : 'song';
export const isTeam = (value: unknown): value is Team => value === 'song' || value === 'jin';
export const isStrength = (value: unknown): value is Strength => ['weak', 'normal', 'strong'].includes(String(value));
export interface BattlefieldHost {
  actors(): SimulatorActor[];
  monsters?(): LegacyEntity[];
  player(): LegacyEntity;
  playerAlive(): boolean;
  playerDPS(): number;
  create(build: ArmyBuild, bossElement?: number): SimulatorActor;
  cancel(actor: SimulatorActor): void;
  remove(actor: SimulatorActor): void;
  enter(team: Team): void;
  leave(): void;
  respawnPlayer(team: Team): void;
  setPlayerDead(team: Team): void;
  position(actor: SimulatorActor, x: number, y: number): void;
  restore(actor: SimulatorActor): void;
}

/** Match state is transient, separate from character saves and training spawns. */
export function createBattlefield(host: BattlefieldHost) {
  let phase: 'idle' | 'running' | 'finished' = 'idle';
  let elapsed = 0, team: Team = 'song', playerDue: number | null = null;
  let generation = 0, adding = false;
  let result = '', elements = { song: 3, jin: 2 };
  const score = { song: 0, jin: 0 };
  const respawns = new Map<SimulatorActor, number>();
  const bosses = new Map<Team, SimulatorActor>();
  const owns = (actor: LegacyEntity) => isTeam(actor.battlefieldTeam);
  const alive = (actor: LegacyEntity) => !actor.dead && actor.hp > 0;
  function canHit(source: LegacyEntity, target: LegacyEntity): boolean {
    if (phase === 'idle') return true;
    if (phase !== 'running') return false;
    const from = source === host.player() ? team : source.battlefieldTeam;
    const to = target === host.player() || target.battlefieldPlayer ? team : target.battlefieldTeam;
    const targetAlive = target === host.player() || target.battlefieldPlayer ? host.playerAlive() && playerDue === null : alive(target);
    if (source.battlefieldMonster && !alive(source)) return false;
    return isTeam(from) && isTeam(to) && from !== to && targetAlive;
  }
  function targets(actor: SimulatorActor): LegacyEntity[] {
    if (phase !== 'running' || !alive(actor)) return [];
    const candidates: LegacyEntity[] = [...host.actors(), ...(host.monsters?.() || [])].filter(target => canHit(actor, target));
    if (playerDue === null && host.playerAlive() && canHit(actor, host.player())) candidates.push(host.player());
    // Fighters engage nearby threats first, then advance on the enemy commander.
    const near = candidates.filter(target => Math.hypot(target.x - actor.x, (target.y - actor.y) * 2) < (actor.battlefieldBoss ? 650 : 500));
    return actor.battlefieldBoss ? near : near.length ? near : candidates.filter(target => target.battlefieldBoss);
  }
  function place(actor: SimulatorActor, index = 0) {
    const camp = CAMPS[actor.battlefieldTeam as Team];
    if (!actor.battlefieldSpawn) {
      if (!actor.battlefieldBoss) actor.battlefieldLane = index % BATTLEFIELD_ROUTES.length;
      const direction = actor.battlefieldTeam === 'song' ? 1 : -1;
      // Distinct camp slots, also retained for this actor's subsequent respawns.
      actor.battlefieldSpawn = actor.battlefieldBoss ? { ...camp } : {
        x: camp.x + direction * (130 + Math.floor(index / 25) * 40),
        y: camp.y + ((index % 25) - 12) * 28,
      };
    }
    host.position(actor, actor.battlefieldSpawn.x, actor.battlefieldSpawn.y);
  }
  function updateBossHealth() {
    for (const [side, boss] of bosses) {
      if (!alive(boss)) continue;
      const attackers = host.actors().filter(actor => actor.battlefieldTeam === otherTeam(side) && !actor.battlefieldBoss);
      const dps = attackers.reduce((sum, actor) => sum + estimateDPS(actor), 0) + (team !== side ? host.playerDPS() : 0);
      // Conservative HP estimate, updated when reinforcements join. Never heal damage already dealt.
      const maximum = Math.max(100_000_000, Math.ceil(dps * MIN_BOSS_SECONDS * 4));
      if (maximum > boss.max) { boss.hp += maximum - boss.max; boss.max = maximum; boss.stats.life = maximum; }
    }
  }
  function validateBuild(build: ArmyBuild) {
    if (!isTeam(build.team) || !isStrength(build.strength) || !Number.isSafeInteger(build.level) || build.level < 1 || build.level > 200 ||
      !Number.isSafeInteger(build.count) || build.count < 1 || build.count > 100) throw new Error('Cấu hình quân: cấp 1–200, số lượng 1–100, phe và sức mạnh hợp lệ.');
    if (build.skillTier !== undefined && ![90,150].includes(build.skillTier)) throw new Error('Chọn chiêu cấp 90 hoặc 150.');
    if (build.equipmentKind && !['blue','gold','thientu'].includes(build.equipmentKind)) throw new Error('Loại trang bị SIM không hợp lệ.');
    if (host.actors().filter(owns).length + build.count > 502) throw new Error('Tối đa 500 SIM và hai boss trên chiến trường.');
  }
  function add(build: ArmyBuild) {
    if (phase !== 'running') throw new Error('Hãy bắt đầu trận trước khi bổ sung quân.');
    validateBuild(build);
    const composition = build.composition ? distributeArmy(build.count, build.composition) : { [build.faction]: build.count };
    const plan = Object.entries(composition).flatMap(([faction, count]) => Array.from({ length: count }, () => faction));
    const created: SimulatorActor[] = [];
    try {
      for (let i = 0; i < build.count; i++) {
        const actor = host.create({ ...build, faction: plan[i], count: 1 });
        actor.battlefieldTeam = build.team; actor.battlefieldBoss = false;
        actor.n = `${TEAM_NAMES[build.team]} · ${actor.n}`;
        place(actor, host.actors().filter(a => a.battlefieldTeam === build.team && !a.battlefieldBoss).length - 1);
        created.push(actor);
      }
    } catch (error) { created.forEach(actor => host.remove(actor)); throw error; }
    updateBossHealth(); return created;
  }
  function buildPlan(build: ArmyBuild) {
    validateBuild(build);
    const composition = build.composition ? distributeArmy(build.count, build.composition) : { [build.faction]: build.count };
    return Object.entries(composition).flatMap(([faction, count]) => Array.from({ length: count }, () => ({ ...build, faction, count: 1, composition: undefined })));
  }
  async function createPlan(plan: ArmyBuild[], progress: (added: number, total: number) => void, yieldFrame: () => Promise<void>) {
    if (adding) throw new Error('Đang tạo quân, vui lòng chờ.');
    if (phase !== 'running') throw new Error('Hãy bắt đầu trận trước khi bổ sung quân.');
    if (host.actors().filter(owns).length + plan.length > 502) throw new Error('Tối đa 500 SIM và hai boss trên chiến trường.');
    const token = generation, created: SimulatorActor[] = []; adding = true;
    try {
      for (const build of plan) {
        progress(created.length, plan.length); await yieldFrame();
        if (token !== generation || phase !== 'running') throw new Error('Đã hủy bổ sung quân.');
        created.push(...add(build));
      }
      progress(created.length, plan.length); return created;
    } catch (error) { for (const actor of created) if (host.actors().includes(actor)) host.remove(actor); throw error; }
    finally { adding = false; }
  }
  const yieldFrame = () => new Promise<void>(resolve => setTimeout(resolve, 0));
  function addAsync(build: ArmyBuild, progress: (added: number, total: number) => void = () => {}, schedule = yieldFrame) {
    return createPlan(buildPlan(build), progress, schedule);
  }
  function addBothAsync(build: BothArmyBuild, progress: (added: number, total: number) => void = () => {}, schedule = yieldFrame) {
    const counts = splitArmyTotal(build.count);
    const plans = (['song', 'jin'] as const).map(team => buildPlan({ ...build, team, count: counts[team], composition: build.compositions?.[team] }));
    // Alternate sides so a long creation batch never gives one army an early advantage.
    return createPlan(plans[0].flatMap((item,index) => [item, plans[1][index]]), progress, schedule);
  }
  function reset() {
    generation++;
    for (const actor of host.actors().filter(owns)) host.remove(actor);
    bosses.clear(); respawns.clear(); playerDue = null; elapsed = 0; phase = 'idle'; result = '';
    score.song = score.jin = 0;
    host.leave();
  }
  function start(playerTeam: Team, bossElements = { song: 3, jin: 2 }) {
    if (!isTeam(playerTeam) || ![bossElements.song, bossElements.jin].every(value => Number.isInteger(value) && value >= 0 && value <= 4)) throw new Error('Phe hoặc hệ boss không hợp lệ.');
    reset(); team = playerTeam; elements = { ...bossElements };
    try {
      host.enter(team); phase = 'running';
      for (const side of ['song', 'jin'] as const) {
        const actor = host.create({ team: side, faction: ELEMENT_FACTIONS[elements[side]][0], level: 150, strength: 'strong', count: 1 }, elements[side]);
        actor.battlefieldTeam = side; actor.battlefieldBoss = true;
        actor.n = `${TEAM_NAMES[side]} · Hoàng Kim · ${actor.n}`;
        actor.max = actor.hp = actor.stats.life = 100_000_000;
        bosses.set(side, actor); place(actor);
      }
      updateBossHealth();
    } catch (error) { reset(); throw error; }
  }
  function died(actor: SimulatorActor) {
    if (!owns(actor) || respawns.has(actor) || actor.battlefieldDeathCounted) return;
    actor.battlefieldDeathCounted = true; actor.dead = true; actor.hp = 0;
    host.cancel(actor); actor.poison = actor.poisonDmg = 0;
    score[otherTeam(actor.battlefieldTeam)] += actor.battlefieldBoss ? 1000 : 1;
    if (!actor.battlefieldBoss) {
      actor.moving = false; actor.target = null;
      place(actor); // Return home immediately; stay untargetable until the timer expires.
      respawns.set(actor, elapsed + RESPAWN_SECONDS);
    }
  }
  function playerDied() {
    if (phase !== 'running' || playerDue !== null) return;
    playerDue = elapsed + RESPAWN_SECONDS; score[otherTeam(team)]++;
    host.setPlayerDead(team);
  }
  function tick(dt: number) {
    if (phase !== 'running' || !Number.isFinite(dt) || dt <= 0) return;
    elapsed = Math.min(BATTLE_DURATION, elapsed + dt);
    for (const actor of host.actors().filter(owns)) if (!alive(actor)) died(actor);
    if (!host.playerAlive() && playerDue === null) playerDied();
    if (elapsed >= BATTLE_DURATION) {
      phase = 'finished';
      const songAlive = !!bosses.get('song') && alive(bosses.get('song')!);
      const jinAlive = !!bosses.get('jin') && alive(bosses.get('jin')!);
      result = songAlive !== jinAlive ? `${songAlive ? 'Tống' : 'Kim'} thắng · Bảo vệ Nguyên Soái` : 'Hòa · ' + (songAlive ? 'Hai boss còn sống' : 'Hai boss đều bị hạ');
      for (const actor of host.actors().filter(owns)) { host.cancel(actor); actor.moving = false; }
      return;
    }
    for (const [actor, due] of respawns) if (elapsed + 1e-9 >= due) {
      if (host.actors().includes(actor)) { host.restore(actor); actor.battlefieldDeathCounted = false; place(actor); }
      respawns.delete(actor);
    }
    if (playerDue !== null && elapsed + 1e-9 >= playerDue) { host.respawnPlayer(team); playerDue = null; }
  }
  return { start, reset, add, addAsync, addBothAsync, targets, canHit, died, playerDied, tick, owns,
    get active() { return phase !== 'idle'; }, get running() { return phase === 'running'; },
    get state() { return { monsters: { count: host.monsters?.().length || 0, alive: (host.monsters?.() || []).filter(alive).length }, phase, elapsed, remaining: BATTLE_DURATION - elapsed, team, result, score: { ...score }, elements: { ...elements }, playerRespawn: playerDue === null ? 0 : Math.max(0, playerDue - elapsed),
      armies: Object.fromEntries((['song', 'jin'] as const).map(side => [side, { count: host.actors().filter(a => a.battlefieldTeam === side && !a.battlefieldBoss).length, alive: host.actors().filter(a => a.battlefieldTeam === side && !a.battlefieldBoss && alive(a)).length, bossHP: Math.max(0, bosses.get(side)?.hp || 0), bossMax: bosses.get(side)?.max || 0 }])) }; },
  };
}
export function estimateDPS(actor: SimulatorActor): number {
  const skill = actor.stats.main;
  return Object.values(skill.parts).reduce((sum, value) => sum + Math.max(0, value), 0) * Math.max(1, skill.rate || 1) * Math.max(1, skill.targets || 1) * 2;
}
