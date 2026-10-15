import type { SimulatorActor } from './types';

export function renderSimulatorRoster(actors: readonly SimulatorActor[], selectedId: string | undefined,
  escape: (value: string) => string): string {
  if (!actors.length) return '<p>Chưa có SIM trên sân.</p>';
  return actors.map(actor => `<li data-sim-id="${escape(actor.simId)}" ${actor.simId === selectedId ? 'aria-current="true"' : ''}><button type="button" data-sim-select="${escape(actor.simId)}" aria-pressed="${actor.simId === selectedId}">${escape(actor.n)}</button><span>HP ${Math.ceil(Math.max(0, actor.hp))}/${Math.ceil(actor.max)} · ${actor.pk ? 'PK' : actor.farm ? 'Đánh quái' : 'Đứng chờ'}</span><button type="button" data-sim-delete="${escape(actor.simId)}" aria-label="Xóa ${escape(actor.n)}">Xóa</button></li>`).join('');
}
