interface RecoveryState {
  life: number;
  mana: number;
  P: { life: number; mana: number };
  hot?: unknown;
}
interface RecoveryPotion { kind: string; total: number; mtotal?: number }
interface ConsumableCooldowns { tpCd?: number; potCd?: { life: number; mana: number } }

export function advanceConsumableCooldowns(state: ConsumableCooldowns, dt: number): void {
  const remaining = (seconds: number) => seconds - dt > 1e-9 ? seconds - dt : 0;
  state.tpCd = remaining(state.tpCd || 0);
  if (state.potCd) {
    state.potCd.life = remaining(state.potCd.life);
    state.potCd.mana = remaining(state.potCd.mana);
  }
}

/** Potions resolve once on use. They never enqueue healing over time. */
export function applyPotionRecovery(state: RecoveryState, kind: 'life' | 'mana', potion: RecoveryPotion): void {
  delete state.hot;
  const restore = (resource: 'life' | 'mana', amount: number) => {
    state[resource] = Math.min(state.P[resource], state[resource] + Math.max(0, amount || 0));
  };
  if (potion.kind === 'both') {
    restore('life', potion.total);
    restore('mana', potion.mtotal || 0);
  } else restore(kind, potion.total);
}
