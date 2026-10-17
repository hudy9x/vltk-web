import type { CombatCast } from '../types';

export const VANISHING_DART_SPLASH_RADIUS = 96;

/** The level-11 collision event splashes nearby bodies through the existing
 * contact resolver. Share the cast hit quota so overlap never doubles damage.
 * Configure before sprite checks: hidden/missing FX must still deal damage. */
export function configureVanishingDartSplash(cast: CombatCast | null): void {
  if (!cast || Number(cast.skill.id) !== 1069 || (cast.skill.L || 1) < 11) return;
  cast.skill = { ...cast.skill, geo: {
    ...cast.skill.geo, k: 'line', pierce: true, area: VANISHING_DART_SPLASH_RADIUS,
  } };
  cast.maxTargets = Infinity;
}
