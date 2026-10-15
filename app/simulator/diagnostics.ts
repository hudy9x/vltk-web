import type { DiagnosticEvent } from './types';

export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/** Session-only ordered evidence. Rendering and clipboard handling live elsewhere. */
export function createDiagnostics(ownerName: () => string, simulatorId?: (source: string, target: { n?: string }) => string | undefined) {
  let current: DiagnosticEvent | null = null;
  let events: DiagnosticEvent[] = [], sequence = 0, revision = 0, enabled = true;
  function step(formula: string, values: Record<string, unknown>): void {
    if (current) current.steps.push({ order: current.steps.length + 1, formula, values: clone(values) });
  }
  function capture<T>(source: string, target: { n?: string }, skill: Record<string, unknown>, run: () => T): T {
    if (!enabled) return run();
    const previous = current;
    const event: DiagnosticEvent = { sequence: ++sequence, timestamp: new Date().toISOString(), source, target: target.n || ownerName(),
      skill: String(skill.n || skill.id || 'Đòn đánh'), skillInput: clone(skill), steps: [], simId: simulatorId?.(source, target) };
    current = event;
    try { return run(); }
    finally {
      current = previous; events.push(event);
      if (events.length > 200) events.splice(0, events.length - 200);
      revision++;
    }
  }
  function clear(predicate?: (event: DiagnosticEvent) => boolean): void {
    if (predicate) events = events.filter(event => !predicate(event));
    else { events = []; sequence = 0; }
    revision++;
  }
  return { step, capture, clear,
    get entries(): readonly DiagnosticEvent[] { return events; },
    get revision(): number { return revision; },
    get enabled(): boolean { return enabled; },
    set enabled(value: boolean) { enabled = value; },
  };
}
