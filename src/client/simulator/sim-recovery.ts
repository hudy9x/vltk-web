import defaults from '../../shared/sim-recovery.json';
export interface SimRecoveryThreshold { enabled: boolean; start: number; stop: number; urgent: number }
export interface SimRecoverySettings { life: SimRecoveryThreshold; mana: SimRecoveryThreshold; interval: number }
export const DEFAULT_SIM_RECOVERY: SimRecoverySettings = defaults;
