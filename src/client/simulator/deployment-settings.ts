export interface DeploymentSettings {
  respawnSeconds: number;
  soldierAppearanceSeconds: number;
}
export const SOLDIER_APPEARANCE_SECONDS = 5;
export const DEFAULT_DEPLOYMENT: DeploymentSettings = { respawnSeconds:30, soldierAppearanceSeconds:SOLDIER_APPEARANCE_SECONDS };
export const PLAYER_DEATH_PENALTY_THRESHOLD = 5;
export function validateDeploymentSettings(settings: DeploymentSettings): DeploymentSettings {
  if (![30,50,60].includes(settings.respawnSeconds)) throw new Error('Thời gian tái xuất chiến: chọn 30, 50 hoặc 60 giây.');
  if (!Number.isSafeInteger(settings.soldierAppearanceSeconds) || settings.soldierAppearanceSeconds < 0 || settings.soldierAppearanceSeconds > 1200)
    throw new Error('Thời gian xuất hiện binh sĩ: 0–1.200 giây từ lúc bắt đầu trận.');
  // Old saved appearance times migrate to the fixed five-second opening.
  return { ...settings, soldierAppearanceSeconds: SOLDIER_APPEARANCE_SECONDS };
}
