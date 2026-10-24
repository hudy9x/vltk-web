import { WAR_ITEMS, WAR_STACK_SIZE } from '../../simulator/war-rewards';
import type { WarItem } from '../../simulator/war-rewards';

/** Stored in the character's existing mats.misc payload, never match-local state. */
export const WAR_MERIT_KEY = 'tk_merit';
export function accumulatedMerit(store: Record<string, number>) {
  const value=store[WAR_MERIT_KEY];
  return Number.isSafeInteger(value) && value>0 ? value : 0;
}
export function addAccumulatedMerit(store: Record<string,number>, amount:number) {
  if(!Number.isSafeInteger(amount)||amount<=0)throw new Error('Điểm quân trạng không hợp lệ.');
  const next=accumulatedMerit(store)+amount;
  if(!Number.isSafeInteger(next))throw new Error('Điểm quân trạng vượt giới hạn lưu trữ.');
  store[WAR_MERIT_KEY]=next;
}
export const WAR_PRICES: Record<WarItem,number> = {
  resistance:150,attack:200,movement:150,drum:500,command:400,external:200,externalCold:200,
  internal:200,internalPoison:200,internalCold:200,internalFire:200,internalLight:200,
  life:150,sprint:150,evasion:150,accuracy:150,haste:200,horn:500,
  poisonRes:150,coldRes:150,lightRes:150,physicalRes:150,fireRes:150,
  freezeTrap:200,stunTrap:200,slowTrap:150,
};
export interface QuartermasterHost {
  storage():Record<string,number>;
  freeSlots():number;
  available():boolean;
  changed():void;
}
export function createQuartermaster(host:QuartermasterHost) {
  function quote(kind:WarItem, quantity:number) {
    if(!Object.prototype.hasOwnProperty.call(WAR_ITEMS,kind))throw new Error('Vật phẩm không hợp lệ.');
    if(!Number.isSafeInteger(quantity)||quantity<1||quantity>50)throw new Error('Số lượng phải từ 1 đến 50.');
    const store=host.storage(), before=Math.max(0,Math.floor(store[`tk_${kind}`]||0)), cost=WAR_PRICES[kind]*quantity;
    if(!Number.isSafeInteger(before+quantity))throw new Error('Số lượng vượt giới hạn lưu trữ.');
    if(accumulatedMerit(store)<cost)throw new Error('Không đủ điểm quân trạng tích lũy.');
    const slots=Math.ceil((before+quantity)/WAR_STACK_SIZE)-Math.ceil(before/WAR_STACK_SIZE);
    if(slots>host.freeSlots())throw new Error('Hành trang không đủ ô trống.');
    return {before,cost};
  }
  function buy(kind:WarItem, quantity=1) {
    if(!host.available())throw new Error('Hãy đến gần Quan Quân Nhu khi nhân vật còn sống.');
    const {before,cost}=quote(kind,quantity),store=host.storage();
    store[WAR_MERIT_KEY]=accumulatedMerit(store)-cost;
    store[`tk_${kind}`]=before+quantity;
    host.changed();
  }
  return {buy,quote,get balance(){return accumulatedMerit(host.storage());}};
}
