/** Slow intensity and duration are independent; damage here is the cold part after resistance. */
interface ColdStatus { slowT?: number; slowPower?: number }

export function coldSlowPower(damage: number): number {
  if (!(damage > 0) || !Number.isFinite(damage)) return 0;
  return 0.75 * (damage / (damage + 200));
}

export function coldSpeedFactor(status: ColdStatus): number {
  if (!(status.slowT! > 0)) return 1;
  // Older explicit slow sources and existing saves retain their 50% slow.
  return 1 - Math.max(0, Math.min(0.75, status.slowPower ?? 0.5));
}

export function applyColdSlow(status: ColdStatus, damage: number, seconds: number): boolean {
  return applyColdPower(status, coldSlowPower(damage), seconds);
}

/** Used when transferring a resolved hit from the SIM's temporary player target. */
export function applyColdPower(status: ColdStatus, power: number, seconds: number): boolean {
  if (!(power > 0) || power > .75 || !(seconds > 0) || !Number.isFinite(seconds)) return false;
  // A weaker hit must neither overwrite nor extend a stronger active slow.
  if (status.slowT! > 0 && power < (status.slowPower ?? 0.5)) return false;
  status.slowT = seconds;
  status.slowPower = power;
  return true;
}
