/** Shared by the editor and the authoritative catalog. Values are at the range's first level. */
import type { MonsterBalance } from './types';
export type { MonsterBalance } from './types';
export const MONSTER_ELEMENTS = ['phys', 'poison', 'cold', 'fire', 'light'] as const;
export function validateMonsterBalance(value: unknown, path = 'monster'): asserts value is MonsterBalance {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path}: invalid settings`);
  const p = value as MonsterBalance;
  const number = (v: unknown, name: string, min: number, max: number) => {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw new Error(`${path}.${name}: expected ${min}..${max}`);
  };
  number(p.hp, 'hp', 1, 1e12); number(p.damage, 'damage', 0, 1e9);
  number(p.defense, 'defense', 0, 1e9); number(p.speed, 'speed', 0, 1000);
  number(p.xp, 'xp', 0, 1e8);
  if (!Number.isSafeInteger(p.xp)) throw new Error(`${path}.xp: expected integer`);
  if (!Array.isArray(p.res) || p.res.length !== 5) throw new Error(`${path}.res: expected five resistances`);
  p.res.forEach((r, i) => number(r, `res.${i}`, -50, 90));
  if (!p.attack || !MONSTER_ELEMENTS.includes(p.attack.element)) throw new Error(`${path}.attack: invalid element`);
  number(p.attack.range, 'attack.range', 1, 1500); number(p.attack.cooldown, 'attack.cooldown', .1, 120);
  if (!p.growth || typeof p.growth !== 'object') throw new Error(`${path}.growth: required`);
  for (const key of ['hp', 'damage', 'defense', 'xp'] as const) number(p.growth[key], `growth.${key}`, 0, key === 'hp' ? 1e12 : 1e8);
  if (!Number.isSafeInteger(p.growth.xp)) throw new Error(`${path}.growth.xp: expected integer`);
}
export function resolveMonsterBalance(base: MonsterBalance, firstLevel: number, level: number): MonsterBalance {
  validateMonsterBalance(base);
  const delta = Math.max(0, level - firstLevel), result = structuredClone(base);
  for (const key of ['hp', 'damage', 'defense', 'xp'] as const) result[key] += delta * base.growth[key];
  validateMonsterBalance(result);
  return result;
}

/** Same direct-hit armor, resistance and protection rules as Rust's monster path. */
export function configuredMonsterHit(damage: number, element: MonsterBalance['attack']['element'], stats: {
  def?: number; res?: Partial<Record<MonsterBalance['attack']['element'], number>>;
  dmgShield?: number; sorb?: number; dmg2mana?: number; manaShield?: number; mana?: number;
  retMelee?: number; retMeleeP?: number;
}, hp: number, mana: number): { amount: number; mana: number; reflected: number; absorbed: number } {
  const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
  let amount=Math.max(1,Math.max(0,damage)*(element==='phys'?100/(100+Math.max(0,stats.def||0)):1)*(1-clamp(stats.res?.[element]||0,-50,90)/100));
  amount=Math.max(0,amount-Math.min(amount,amount*.35,Math.max(0,stats.dmgShield||0)));
  amount*=1-clamp(stats.sorb||0,0,60)/100;
  mana=Math.min(stats.mana||0,mana+amount*Math.max(0,stats.dmg2mana||0)/100);
  const shield=Math.min(mana,amount*clamp(stats.manaShield||0,0,100)/100);
  mana-=shield;amount-=shield;
  return {amount:Math.min(hp,amount),mana,absorbed:shield,reflected:Math.max(0,stats.retMelee||0)+amount*Math.max(0,stats.retMeleeP||0)/100};
}
