interface SkillDefenseStats {
  mana: number;
  dmgShield?: number;
  sorb?: number;
  from?: Record<number, number>;
  dmg2mana?: number;
  manaShield?: number;
}

/** Resolve skill defense AFTER hs has applied resistance/element relations.
 * Follow native U9 order: flat shield → absorption → MP refund → mana shield.
 * Refunded MP can fund the current shield, but overflow beyond maximum MP is lost.
 * Legacy attribute keys are kept here to match the native stat catalog.
 */
export function skillDefense(damageAfterResistance: number, defenseStats: SkillDefenseStats, currentMana: number, attackerElement: number, shieldDamageLimit: number) {
  const shieldAbsorbed = Math.min(defenseStats.dmgShield || 0, damageAfterResistance * shieldDamageLimit);
  const generalAbsorption = Math.max(0, 1 - (defenseStats.sorb || 0) / 100);
  const elementalAbsorption = Math.max(0, 1 - (defenseStats.from?.[attackerElement] || 0) / 100);
  const incomingDamage = Math.max(0, damageAfterResistance - shieldAbsorbed) * generalAbsorption * elementalAbsorption;
  const refundedMana = Math.min(Math.max(0, defenseStats.mana - currentMana), incomingDamage * Math.max(0, defenseStats.dmg2mana || 0) / 100);
  const availableMana = currentMana + refundedMana;
  const manaShieldPercent = Math.max(0, Math.min(90, defenseStats.manaShield || 0));
  const manaAbsorbed = Math.min(availableMana, incomingDamage * manaShieldPercent / 100);
  // Preserve the diagnostic payload keys consumed by runtime/log viewers.
  return { shield: shieldAbsorbed, incoming: incomingDamage, refunded: refundedMana,
    absorbed: manaAbsorbed, mana: availableMana - manaAbsorbed, damage: incomingDamage - manaAbsorbed };
}

/** A reduction shortens only the new status application, never an older pool. */
export const statusDuration = (durationSeconds: number, reductionPercent: number = 0) => durationSeconds * Math.max(0, 1 - Math.min(100, reductionPercent) / 100);
