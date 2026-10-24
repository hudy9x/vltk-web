export type SpeedKind = 'run' | 'attack';
export interface SpeedPhase { minPercent: number; fps: number }
export interface SpeedTrack { referenceFrames: number; phases: readonly SpeedPhase[] }
export interface SpeedConfiguration {
  minPercent: number;
  maxPercent: number;
  run: SpeedTrack & { distanceScale: number };
  attack: SpeedTrack;
}
export interface ResolvedSpeed {
  percent: number;
  phasePercent: number;
  fps: number;
  multiplier: number;
  cycleSeconds: number;
}
