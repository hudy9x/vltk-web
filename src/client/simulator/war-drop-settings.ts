import defaults from '../../shared/war-drop-rates.json';
import type { LegacyEntity } from './types';
export type WarDropRates = typeof defaults;
export const DEFAULT_WAR_DROP_RATES = defaults;
export function validateWarDropRates(value: WarDropRates = defaults): WarDropRates {
  const result={...defaults};
  for(const key of Object.keys(defaults) as (keyof WarDropRates)[]){
    const rate=value?.[key];
    if(!Number.isFinite(rate)||rate<0||rate>100)throw new Error('Tỉ lệ rơi Quân Nhu phải từ 0 đến 100%.');
    result[key]=rate;
  }
  return result;
}
export function warDropProbability(target:LegacyEntity,rates:WarDropRates=defaults):number {
  const titles:Record<string,keyof WarDropRates>={'Binh sĩ':'soldier','Binh Sĩ':'soldier','Hiệu úy':'captain','Thống lĩnh':'commander','Phó tướng':'general','Đại tướng':'grandGeneral'};
  return rates[target.battlefieldBoss?'marshal':titles[target.battlefieldRank]||'soldier']/100;
}
