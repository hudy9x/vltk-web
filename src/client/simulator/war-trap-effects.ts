import type { WarItem } from './war-rewards';

/** Native Đường Môn skills: Hàn Băng Thích, Lôi Kích Thuật, Xuyên Tâm Thích. */
export const WAR_TRAP_SKILLS = { freezeTrap:345, stunTrap:349, slowTrap:343 } as const;
export interface WarTrapVisual { kind:WarItem; x:number; y:number; age:number; expires:number }
export interface TrapEffectCatalog {
  f:Record<number,{c?:number}>;
  m:Record<number,{fly?:Record<string,any>;hit?:Record<string,any>}>;
}
function trapCode(kind:WarItem, effects:TrapEffectCatalog):number|undefined {
  const skill=WAR_TRAP_SKILLS[kind as keyof typeof WAR_TRAP_SKILLS];
  return skill ? effects.f[skill]?.c : undefined;
}
/** Use the same ground sprite, loop and final fade as native qm/Fa. */
export function drawWarTrap(context:CanvasRenderingContext2D, trap:WarTrapVisual, effects:TrapEffectCatalog,
  draw:(sprite:Record<string,any>,direction:number,age:number,x:number,y:number,loop:boolean)=>boolean) {
  const code=trapCode(trap.kind,effects),sprite=code===undefined?undefined:effects.m[code]?.fly;
  if(!sprite)return false;
  context.save();
  const remaining=Math.max(0,trap.expires-trap.age);
  context.globalAlpha=(remaining<2?Math.max(.2,Math.min(1,remaining/2)):1)*.9;
  try{return draw(sprite,0,trap.age,trap.x,trap.y,true);}finally{context.restore();}
}
/** Native d_ resolves the paired hit sprite (c+1). Emit once per trap, not per victim. */
export function triggerWarTrap(trap:WarTrapVisual,effects:TrapEffectCatalog,
  explode:(trap:{c:number;x:number;y:number})=>void) {
  const code=trapCode(trap.kind,effects);
  if(code!==undefined)explode({c:code,x:trap.x,y:trap.y});
}

/** Warm both sprites when placed, including for characters who never learned Đường Môn skills. */
export function preloadWarTrap(kind:WarItem,effects:TrapEffectCatalog,load:(file:string)=>unknown) {
  const code=trapCode(kind,effects);
  if(code===undefined)return;
  const ground=effects.m[code]?.fly,burst=effects.m[code+1]||effects.m[code];
  for(const sprite of [ground,burst?.hit||burst?.fly])if(sprite?.f)load(sprite.f);
}
