import { SPEED_CONFIG } from './config';
import type { ResolvedSpeed, SpeedConfiguration, SpeedKind } from './types';

export function validateSpeedConfiguration(config: SpeedConfiguration): void {
  if (!Number.isFinite(config.minPercent) || !Number.isFinite(config.maxPercent) ||
      config.minPercent <= 0 || config.minPercent > 100 || config.maxPercent < 100)
    throw new Error('Speed limits must be positive and contain 100%.');
  for (const kind of ['run', 'attack'] as const) {
    const track = config[kind];
    if (!Number.isInteger(track.referenceFrames) || track.referenceFrames < 1 ||
        !track.phases.length || track.phases[0].minPercent !== config.minPercent ||
        track.phases[track.phases.length - 1].minPercent !== config.maxPercent ||
        !track.phases.some(phase => phase.minPercent === 100))
      throw new Error(`Invalid ${kind} speed phases or reference frame count.`);
    track.phases.forEach((phase, index) => {
      const previous = track.phases[index - 1];
      if (!Number.isFinite(phase.minPercent) || !Number.isFinite(phase.fps) || phase.fps <= 0 ||
          (previous && (phase.minPercent <= previous.minPercent || phase.fps < previous.fps)))
        throw new Error(`Invalid ${kind} speed phase at index ${index}.`);
    });
  }
}
validateSpeedConfiguration(SPEED_CONFIG);

/** Buffs and debuffs are composed BEFORE quantizing, with exactly one final cap. */
export function resolveSpeed(kind: SpeedKind, rawPercent: number, config = SPEED_CONFIG): ResolvedSpeed {
  const percent = Math.max(config.minPercent, Math.min(config.maxPercent,
    Number.isNaN(rawPercent) ? 100 : rawPercent));
  const track = config[kind];
  let selected = track.phases[0];
  for (const phase of track.phases) {
    if (phase.minPercent > percent + 1e-9) break;
    selected = phase;
  }
  const baseline = track.phases.find(phase => phase.minPercent === 100)!;
  return { percent, phasePercent: selected.minPercent, fps: selected.fps,
    multiplier: selected.fps / baseline.fps, cycleSeconds: track.referenceFrames / selected.fps };
}

/** Run clocks use baseline seconds; attack clocks use normalized native time. */
export function speedSpriteFrame(action: string, time: number, frames: number, nativeMs: number): number {
  if (!(frames > 0)) return 0;
  const fps = action === 'run'
    ? frames / SPEED_CONFIG.run.referenceFrames * resolveSpeed('run', 100).fps
    : 1000 / Math.max(1, nativeMs);
  return Math.max(0, Math.floor(time * fps + 1e-9));
}
