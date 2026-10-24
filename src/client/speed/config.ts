import type { SpeedConfiguration } from './types';

/** Balance ONLY speed thresholds, movement distance and reference sprite FPS here.
 * Actual sprite sheets are normalized to referenceFrames, so different sheets
 * complete the same action in the same time. No item/skill IDs belong here.
 */
export const SPEED_CONFIG: SpeedConfiguration = {
  minPercent: 25,
  maxPercent: 300,
  run: {
    // Distance traveled per second only; 1.15 = 15% farther, with the same FPS.
    distanceScale: 1.15,
    referenceFrames: 8,
    phases: [
      { minPercent: 25, fps: 3 }, { minPercent: 50, fps: 6 },
      { minPercent: 75, fps: 9 }, { minPercent: 100, fps: 12 },
      { minPercent: 120, fps: 14.4 }, { minPercent: 150, fps: 18 },
      { minPercent: 200, fps: 24 }, { minPercent: 250, fps: 30 },
      { minPercent: 300, fps: 36 },
    ],
  },
  attack: {
    referenceFrames: 20,
    phases: [
      { minPercent: 25, fps: 5 }, { minPercent: 50, fps: 15 },
      { minPercent: 75, fps: 20 }, { minPercent: 100, fps: 25 },
      { minPercent: 125, fps: 35 }, { minPercent: 150, fps: 40 },
      { minPercent: 200, fps: 50 }, { minPercent: 250, fps: 60 },
      { minPercent: 300, fps: 70 },
    ],
  },
};
