import type { LegacyEntity } from './types';

/** Keep the final battlefield in place until acknowledgement; never teleport a unit. */
export function createBattlefieldPause() {
  const frozen = new Set<LegacyEntity>();
  return {
    freeze(actors:LegacyEntity[]) {
      for(const actor of actors) {
        frozen.add(actor);actor.battlefieldFrozen=true;
        actor.actionRevision=(actor.actionRevision||0)+1;
        actor.moving=actor.mv=false;actor.castT=actor.hurtT=actor.atT=0;
        actor.target=null;actor._pp=null;actor._pk='';
        if(!actor.dead && (actor.hp ?? 1)>0) {actor.act='st';actor.actT=0;}
      }
    },
    reset() { for(const actor of frozen)delete actor.battlefieldFrozen;frozen.clear(); },
  };
}
