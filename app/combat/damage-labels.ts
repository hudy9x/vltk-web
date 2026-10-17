/** Stable public API; implementation is split by responsibility under labels/. */
export { enqueueDamageLabel, updateDamageLabels } from './labels/queue';
export { DAMAGE_LABEL_COLORS, DAMAGE_LABEL_LAYOUT, DAMAGE_LABEL_BUDGET } from './labels/policy';
export type { FloatingCombatLabel } from './labels/types';
