import rules from '../../shared/emei-healing.json';
import type { CombatCast, CombatTarget, WorldPoint } from './types';

export interface HealingRecipient {
  entity: CombatTarget;
  alignment: string;
  team?: string;
  alive(): boolean;
  heal(amount: number): void;
}
export interface EmeiHeal {
  cast: CombatCast;
  center: WorldPoint;
  remaining: number;
  firstStep?: number;
  amount: number;
  generation?: number;
}
declare const o: { fac: string };
declare function Kh(faction: string): string;
declare function G8(skill: number, actor: WorldPoint): void;
declare const skillVisualContext: unknown;
declare const arenaSimulator: { healingRecipients(): HealingRecipient[] } | null;

export function emeiHealingAmount(level: number): number {
  if (!Number.isFinite(level) || level < rules.unlockLevel) return 0;
  const points = rules.amounts;
  const clamped = Math.min(level, points[points.length - 1][0]);
  for (let i = 1; i < points.length; i++) {
    const [end, amount] = points[i], [start, previous] = points[i - 1];
    if (clamped <= end) return Math.round(previous + (amount - previous) * (clamped - start) / (end - start));
  }
  return 0;
}

/** Called once at release, independent of primary contacts and FX visibility. */
export function queueEmeiHealing(cast: CombatCast, target: WorldPoint, firstStep?: number): void {
  // Online replays own cosmetic proxy bodies; only the server may heal there.
  if (typeof skillVisualContext !== 'undefined' && skillVisualContext) return;
  if (+cast.skill.id! !== rules.skill || cast.skill.ev2) return;
  const amount = emeiHealingAmount(cast.skill.L || 1);
  if (!amount) return;
  (l.emeiHeals ||= []).push({ cast, center: { x: target.x, y: target.y },
    remaining: rules.delayFrames / rules.framesPerSecond, firstStep, amount,
    generation: (cast.actor as CombatTarget & { generation?: number }).generation });
}

/** Membership and positions are evaluated at the healing beat, never at cast time. */
export function advanceEmeiHealing(dt: number): void {
  if (typeof skillVisualContext !== 'undefined' && skillVisualContext) return;
  const pending = l.emeiHeals || [];
  l.emeiHeals = [];
  for (const effect of pending) {
    const { cast, center } = effect;
    if (l.town || cast.zone !== l.zoneShown ||
      effect.generation !== (cast.actor as CombatTarget & { generation?: number }).generation) continue;
    effect.remaining -= effect.firstStep ?? dt;
    delete effect.firstStep;
    if (effect.remaining > 1e-9) { l.emeiHeals.push(effect); continue; }
    const maximum = (l as typeof l & { P?: { life: number } }).P?.life;
    const recipients: HealingRecipient[] = typeof arenaSimulator !== 'undefined' && arenaSimulator
      ? arenaSimulator.healingRecipients() : typeof Kh === 'function' && typeof o !== 'undefined' && Number.isFinite(maximum) && maximum! > 0
        ? [{ entity: v, alignment: Kh(o.fac), alive: () => l.life > 0 && !(l.deadT > 0),
          heal: (amount: number) => { l.life = Math.min(maximum!, l.life + amount); } }] : [];
    const source = recipients.find(recipient => recipient.entity === cast.actor);
    if (!source?.alive()) continue;
    for (const recipient of recipients) {
      const allied = source.team !== undefined || recipient.team !== undefined
        ? source.team !== undefined && source.team === recipient.team
        : source.alignment === recipient.alignment;
      if (!allied || !recipient.alive() || Math.hypot(recipient.entity.x - center.x,
        (recipient.entity.y - center.y) * rules.yScale) > rules.radius) continue;
      recipient.heal(effect.amount);
    }
    if (!l.quiet && typeof G8 === 'function') G8(rules.effect, center);
  }
}
