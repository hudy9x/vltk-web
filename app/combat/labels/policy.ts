/** Floating numbers only: never changes HP, collision, hit counts or the combat log. */
export const DAMAGE_LABEL_COLORS = {
  phys: '#f01a1aff',
  fire: '#f01a1aff',
  cold: '#f01a1aff',
  light: '#f01a1aff',
  poison: '#f01a1aff',
  critical: '#fa7676ff',
  status: '#d5d9df',
} as const;

export const DAMAGE_LABEL_LAYOUT = {
  mergeWindow: 0.12,
  rows: 4,
  lowFxRows: 3,
  gap: 2,
  riseSpeed: 40,
  bodyOffset: 30,
  lifetime: 2.5,
  lowFxLifetime: 0.5,
} as const;


/** Limits apply only to floating damage, never to HP or combat events. */
export const DAMAGE_LABEL_BUDGET = {
  normal: 96, lowFx: 48, denseTargets: 24, denseLabels: 48,
  denseRows: 2, denseMergeWindow: 0.4, denseLifetime: 0.8, viewportMargin: 64,
} as const;
