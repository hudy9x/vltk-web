import type { DiagnosticEvent, SimulatorLogProvider } from './types';

/** Formula presentation for the shared Log channel; raw exports retain all steps. */
export function createSimulatorLogView(diagnostics: {
  readonly entries: readonly DiagnosticEvent[]; readonly revision: number; enabled: boolean;
}, text: (simOnly: boolean) => string, clear: (simOnly: boolean) => void,
escape: (value: string) => string): SimulatorLogProvider {
  return {
    get revision() { return diagnostics.revision; },
    get enabled() { return diagnostics.enabled; },
    set enabled(value) { diagnostics.enabled = value; },
    text, clear,
    render(container, simOnly) {
      const expanded = new Set(Array.from(container.querySelectorAll?.<HTMLDetailsElement>('details[open]') || []).map(row => row.dataset.sequence));
      container.innerHTML = this.html(simOnly);
      for (const row of container.querySelectorAll?.<HTMLDetailsElement>('details') || []) row.open = expanded.has(row.dataset.sequence);
    },
    html(simOnly) {
      const events = diagnostics.entries.filter(event => !simOnly || event.simId).slice(-50);
      if (!events.length) return '<div class="combat-empty">Chưa có log công thức phù hợp với bộ lọc.</div>';
      return events.map(event => `<details class="cl sim-formula-event" data-sequence="${event.sequence}"><summary>#${event.sequence} · ${escape(event.source)} → ${escape(event.target)} · ${escape(event.skill)}</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${escape(event.steps.map(step => `${step.order}. ${step.formula}\n${JSON.stringify(step.values)}`).join('\n\n'))}</pre></details>`).join('');
    },
  };
}
