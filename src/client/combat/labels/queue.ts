import type { FloatingCombatLabel, LabelOptions, LabelTarget } from './types';
import { DAMAGE_LABEL_COLORS, DAMAGE_LABEL_LAYOUT, DAMAGE_LABEL_BUDGET as BUDGET } from './policy';
import { measureDamageLabel, positionTargetLabels } from './layout';

interface QueueIndex {
  stacks: Map<LabelTarget, FloatingCombatLabel[]>;
  length: number;
  first?: FloatingCombatLabel;
  last?: FloatingCombatLabel;
}
const queues = new WeakMap<FloatingCombatLabel[], QueueIndex>();
let nextIndex = 0;

function indexQueue(labels: FloatingCombatLabel[]): QueueIndex {
  const cached = queues.get(labels);
  if (cached && cached.length === labels.length && cached.first === labels[0] && cached.last === labels[labels.length - 1]) return cached;
  const index: QueueIndex = { stacks: new Map(), length: labels.length, first: labels[0], last: labels[labels.length - 1] };
  for (const label of labels) if (label.target && label.life > 0) {
    let stack = index.stacks.get(label.target);
    if (!stack) index.stacks.set(label.target, stack = []);
    stack.push(label);
  }
  queues.set(labels, index);
  return index;
}
function stamp(labels: FloatingCombatLabel[], index: QueueIndex): void {
  index.length = labels.length; index.first = labels[0]; index.last = labels[labels.length - 1];
}
function remove(labels: FloatingCombatLabel[], index: QueueIndex, label: FloatingCombatLabel): void {
  const at = labels.indexOf(label);
  if (at >= 0) labels.splice(at, 1);
  if (label.target) {
    const stack = index.stacks.get(label.target);
    const row = stack?.indexOf(label) ?? -1;
    if (stack && row >= 0) stack.splice(row, 1);
    if (!stack?.length) index.stacks.delete(label.target);
  }
}
function dense(index: QueueIndex): boolean {
  return index.stacks.size >= BUDGET.denseTargets || index.length >= BUDGET.denseLabels;
}
function visible(target: LabelTarget, options: LabelOptions): boolean {
  const view = options.viewport, margin = BUDGET.viewportMargin;
  return !view || (target.x >= view.x - margin && target.x <= view.x + view.width + margin &&
    target.y >= view.y - margin && target.y <= view.y + view.height + margin);
}

/** Compatible hits are summed before rounding; combat HP/logs never enter this queue. */
export function enqueueDamageLabel(labels: FloatingCombatLabel[], target: LabelTarget, amount: number | string,
  kind = 'phys', options: LabelOptions = {}): FloatingCombatLabel | undefined {
  if (options.quiet || !visible(target, options) || (typeof amount === 'number' && (!Number.isFinite(amount) || amount <= 0))) return;
  const index = indexQueue(labels), crowded = dense(index);
  const status = typeof amount === 'string' ? amount : undefined;
  const critical = !!options.critical, suffix = options.suffix || '';
  let stack = index.stacks.get(target) || [];
  // Stale rows can remain in a legacy queue until its next render pass.
  for (const old of stack.slice()) if (old.life <= 0) remove(labels, index, old);
  stack = index.stacks.get(target) || [];
  const window = crowded ? BUDGET.denseMergeWindow : DAMAGE_LABEL_LAYOUT.mergeWindow;
  let label = stack.slice().reverse().find(candidate => candidate.kind === kind && candidate.critical === critical &&
    candidate.suffix === suffix && candidate.status === status && (candidate.age || 0) <= window);
  if (label) {
    label.amount = (label.amount || 0) + (typeof amount === 'number' ? amount : 0);
    label.hits = (label.hits || 1) + 1;
    remove(labels, index, label);
  } else {
    const rows = crowded ? BUDGET.denseRows : options.lowFx ? DAMAGE_LABEL_LAYOUT.lowFxRows : DAMAGE_LABEL_LAYOUT.rows;
    while (stack.length >= rows) remove(labels, index, stack[0]);
    const limit = options.lowFx ? BUDGET.lowFx : BUDGET.normal;
    while (labels.length >= limit) {
      // Protect incoming player damage / selected target / boss before ambient mobs.
      let victim: FloatingCombatLabel | undefined;
      for (const candidate of labels) if (!victim || (candidate.priority || 0) < (victim.priority || 0)) victim = candidate;
      if (!victim || (victim.priority || 0) > (options.priority || 0)) { stamp(labels, index); return; }
      remove(labels, index, victim);
    }
    label = { x: target.x, y: target.y, t: '', color: critical ? DAMAGE_LABEL_COLORS.critical : status ? DAMAGE_LABEL_COLORS.status :
      DAMAGE_LABEL_COLORS[kind as keyof typeof DAMAGE_LABEL_COLORS] || DAMAGE_LABEL_COLORS.phys,
      size: critical ? 16 : 14, life: 0, target, amount: typeof amount === 'number' ? amount : 0,
      status, kind, critical, suffix, hits: 1, age: 0, priority: options.priority || 0 };
  }
  label.index = ++nextIndex; label.rise = 0;
  label.life = options.lowFx ? DAMAGE_LABEL_LAYOUT.lowFxLifetime : crowded ? BUDGET.denseLifetime : DAMAGE_LABEL_LAYOUT.lifetime;
  label.t = (label.status ?? String(Math.round(label.amount || 0))) + suffix + (critical ? '!' : '');
  if (options.context) measureDamageLabel(label, options.context);
  labels.push(label);
  stack = index.stacks.get(target) || [];
  stack.push(label); index.stacks.set(target, stack);
  stamp(labels, index); positionTargetLabels(stack, target);
  return label;
}

/** One grouping pass per frame, independent of the number of recipients. */
export function updateDamageLabels(labels: FloatingCombatLabel[], dt: number, context?: CanvasRenderingContext2D): void {
  // Rebuild once: callers may expire/reset/filter generic notifications themselves.
  queues.delete(labels);
  const index = indexQueue(labels), crowded = dense(index);
  for (const label of labels) if (label.target) {
    label.life -= dt; label.age = (label.age || 0) + dt;
    if (crowded) label.life = Math.min(label.life, BUDGET.denseLifetime);
    label.rise = (label.rise || 0) + DAMAGE_LABEL_LAYOUT.riseSpeed * dt;
    if (context && label.life > 0) measureDamageLabel(label, context);
  }
  for (const [target, stack] of index.stacks) positionTargetLabels(stack, target);
}
