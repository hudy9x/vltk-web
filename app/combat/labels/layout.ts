import type { FloatingCombatLabel, LabelTarget } from './types';
import { DAMAGE_LABEL_LAYOUT } from './policy';

// Text metrics depend on the font/size, not on a hit's numeric value.
const measurements = new WeakMap<CanvasRenderingContext2D, Map<number, { ascent: number; descent: number }>>();
export function measureDamageLabel(label: FloatingCombatLabel, context: CanvasRenderingContext2D): void {
  let cache = measurements.get(context);
  if (!cache) measurements.set(context, cache = new Map());
  let measured = cache.get(label.size);
  if (!measured) {
    context.save();
    context.font = `${label.size}px "IBM Plex Mono", monospace`;
    const metrics = context.measureText('0123456789!');
    context.restore();
    measured = {
      ascent: Number.isFinite(metrics.actualBoundingBoxAscent) ? metrics.actualBoundingBoxAscent : label.size,
      descent: Number.isFinite(metrics.actualBoundingBoxDescent) ? metrics.actualBoundingBoxDescent : 0,
    };
    cache.set(label.size, measured);
  }
  label.ascent = measured.ascent; label.descent = measured.descent;
}

/** Receives only this target's rows; never scans the world queue. */
export function positionTargetLabels(stack: FloatingCombatLabel[], target: LabelTarget): void {
  let below: FloatingCombatLabel | undefined;
  for (let row = stack.length - 1; row >= 0; row--) {
    const label = stack[row];
    if (label.life <= 0) continue;
    const minimumRise = below ? (below.rise || 0) + (below.ascent ?? below.size) +
      (label.descent ?? 0) + 3 + DAMAGE_LABEL_LAYOUT.gap : 0;
    label.rise = Math.max(label.rise || 0, minimumRise);
    label.x = target.x;
    label.y = target.y - DAMAGE_LABEL_LAYOUT.bodyOffset - label.rise;
    below = label;
  }
}
