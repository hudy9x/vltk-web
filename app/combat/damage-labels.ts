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

interface LabelTarget { x: number; y: number }

/** Optional fields let the same queue retain legacy loot/healing notifications. */
export interface FloatingCombatLabel {
  x: number;
  y: number;
  t: string;
  color: string;
  size: number;
  life: number;
  target?: LabelTarget;
  amount?: number;
  status?: string;
  kind?: string;
  critical?: boolean;
  suffix?: string;
  hits?: number;
  age?: number;
  index?: number;
  rise?: number;
  ascent?: number;
  descent?: number;
}

interface LabelOptions {
  quiet?: boolean;
  lowFx?: boolean;
  critical?: boolean;
  suffix?: string;
  context?: CanvasRenderingContext2D;
}

let nextIndex = 0;

function measureDamageLabel(label: FloatingCombatLabel, context: CanvasRenderingContext2D, metrics: Map<number, TextMetrics>): void {
  let measured = metrics.get(label.size);
  if (!measured) {
    context.save();
    context.font = `${label.size}px "IBM Plex Mono", monospace`;
    measured = context.measureText('0123456789!');
    context.restore();
    metrics.set(label.size, measured);
  }
  label.ascent = Number.isFinite(measured.actualBoundingBoxAscent) ? measured.actualBoundingBoxAscent : label.size;
  label.descent = Number.isFinite(measured.actualBoundingBoxDescent) ? measured.actualBoundingBoxDescent : 0;
}

function formatDamageLabel(label: FloatingCombatLabel): string {
  // Sum raw values first. Round once, so tiny simultaneous hits keep their total.
  const value = label.status ?? String(Math.round(label.amount || 0));
  return value + (label.suffix || '') + (label.critical ? '!' : '');
}

function positionTargetLabels(labels: FloatingCombatLabel[], target: LabelTarget): void {
  const stack = labels.filter(label => label.target === target && label.life > 0);
  // Baselines rise continuously. Reserve only the measured ink + outline + 2px
  // between rows; critical digits can be taller than ordinary damage.
  // Queue order is paint order, so older numbers stay behind newer ones.
  let below: FloatingCombatLabel | undefined;
  for (let row = 0; row < stack.length; row++) {
    const label = stack[stack.length - 1 - row];
    const minimumRise = below ? (below.rise || 0) +
      (below.ascent ?? below.size) + (label.descent ?? 0) + 3 + DAMAGE_LABEL_LAYOUT.gap : 0;
    label.rise = Math.max(label.rise || 0, minimumRise);
    label.x = target.x;
    label.y = target.y - DAMAGE_LABEL_LAYOUT.bodyOffset - label.rise;
    below = label;
  }
}

/**
 * Called with the damaged entity, never the attacker or the projectile position.
 * Each entity owns its stack even when multiple monsters share a coordinate.
 * Only compatible hits inside a short, fixed window are summed into one row.
 */
export function enqueueDamageLabel(
  labels: FloatingCombatLabel[], target: LabelTarget, amount: number | string,
  kind = 'phys', options: LabelOptions = {},
): FloatingCombatLabel | undefined {
  if (options.quiet || (typeof amount === 'number' && (!Number.isFinite(amount) || amount <= 0))) return;
  const status = typeof amount === 'string' ? amount : undefined;
  const critical = !!options.critical;
  const suffix = options.suffix || '';
  const stack = labels.filter(label => label.target === target && label.life > 0);
  let label = stack.slice().reverse().find(candidate =>
    candidate.kind === kind && candidate.critical === critical && candidate.suffix === suffix &&
    candidate.status === status && (candidate.age || 0) <= DAMAGE_LABEL_LAYOUT.mergeWindow);

  if (label) {
    label.amount = (label.amount || 0) + (typeof amount === 'number' ? amount : 0);
    label.hits = (label.hits || 1) + 1;
    // A refreshed group becomes the newest row; do not restart its merge window.
    labels.splice(labels.indexOf(label), 1);
  } else {
    const limit = options.lowFx ? DAMAGE_LABEL_LAYOUT.lowFxRows : DAMAGE_LABEL_LAYOUT.rows;
    while (stack.length >= limit) {
      const oldest = stack.shift()!;
      labels.splice(labels.indexOf(oldest), 1);
    }
    label = {
      x: target.x, y: target.y, t: '', color: options.critical ? DAMAGE_LABEL_COLORS.critical :
        status ? DAMAGE_LABEL_COLORS.status :
          DAMAGE_LABEL_COLORS[kind as keyof typeof DAMAGE_LABEL_COLORS] || DAMAGE_LABEL_COLORS.phys,
      size: options.critical ? 16 : 14, life: 0, target,
      amount: typeof amount === 'number' ? amount : 0,
      status, kind, critical, suffix, hits: 1, age: 0,
    };
  }
  label.index = ++nextIndex;
  label.rise = 0;
  label.life = options.lowFx ? DAMAGE_LABEL_LAYOUT.lowFxLifetime : DAMAGE_LABEL_LAYOUT.lifetime;
  label.t = formatDamageLabel(label);
  if (options.context) measureDamageLabel(label, options.context, new Map());
  labels.push(label);
  positionTargetLabels(labels, target);
  return label;
}

/** Re-anchor to moving entities each frame. Generic notifications keep their old animation. */
export function updateDamageLabels(labels: FloatingCombatLabel[], dt: number, context?: CanvasRenderingContext2D): void {
  const targets = new Set<LabelTarget>();
  const metrics = new Map<number, TextMetrics>();
  for (const label of labels) {
    if (!label.target) continue;
    label.life -= dt;
    label.age = (label.age || 0) + dt;
    label.rise = (label.rise || 0) + DAMAGE_LABEL_LAYOUT.riseSpeed * dt;
    if (context && label.life > 0) measureDamageLabel(label, context, metrics);
    if (label.life > 0) targets.add(label.target);
  }
  for (const target of targets) positionTargetLabels(labels, target);
}
