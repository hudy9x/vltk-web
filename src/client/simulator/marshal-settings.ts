import defaults from '../../shared/marshal-settings.json';
export interface MarshalSettings {
  hp:number; res:number[];
  stunReduction?:number;poisonReduction?:number;coldReduction?:number;hurtReduction?:number;
  attackSpeedPercent?:number;movementRadius?:number;
}
export function normalizeMarshalSettings(row:MarshalSettings) {
  const result={...defaults,...row,res:[...row.res]};
  if(!Number.isSafeInteger(row.hp)||row.hp<1||row.hp>1e12||row.res.length!==5||row.res.some(n=>!Number.isFinite(n)||n< -100||n>100))throw new Error('Máu hoặc kháng Nguyên soái không hợp lệ.');
  if([result.stunReduction,result.poisonReduction,result.coldReduction,result.hurtReduction].some(n=>!Number.isFinite(n)||n<0||n>100)||!Number.isFinite(result.attackSpeedPercent)||result.attackSpeedPercent<25||result.attackSpeedPercent>300||!Number.isFinite(result.movementRadius)||result.movementRadius<0||result.movementRadius>1600)throw new Error('Chỉ số trạng thái, tốc độ hoặc phạm vi Nguyên soái không hợp lệ.');
  return result;
}
