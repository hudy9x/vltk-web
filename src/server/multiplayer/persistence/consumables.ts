/** Apply an absolute per-item counter, so replay/order cannot consume twice. */
export function applyPotionDebit(profile:Record<string,any>,debit:{id:number;spent:number}):void{
  if(!Number.isInteger(debit.id)||!Number.isSafeInteger(debit.spent)||debit.spent<1)
    throw new Error('Invalid potion debit');
  const kind=['life','mana','both'][Math.floor(debit.id/100)],tier=debit.id%100;
  if(!kind||tier<1||tier>20)throw new Error('Invalid potion item');
  const counters=profile.onlinePotionSpent ||= {};
  const counts=counters[kind] ||= {};
  const previous=counts[tier]||0,difference=Math.max(0,debit.spent-previous);
  if(!difference)return;
  const stock=(profile.potStock ||= {})[kind] ||= {};
  if(!Number.isSafeInteger(stock[tier])||stock[tier]<difference)throw new Error('Insufficient canonical potion stock');
  stock[tier]-=difference;
  counts[tier]=debit.spent;
  profile.potUsed=(profile.potUsed||0)+difference;
}
