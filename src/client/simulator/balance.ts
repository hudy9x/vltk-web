// Experimental local balance, not a claim about VNG's original PvP formula.
// Applied once per contact, to all damage parts (including poison), before hs.
// Golden bosses and NPC soldiers retain their PvE damage rules.
import balance from '../../shared/combat-balance.json';
export const BATTLEFIELD_PVP_DAMAGE = balance.battlefieldPvpDamage;
