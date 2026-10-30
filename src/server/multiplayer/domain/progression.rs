//! Apply canonical profile revisions without resetting combat state on every XP grant.
use super::*;
impl Game {
    pub fn refresh_profile(&mut self,id:u32,mut profile:Profile,revision:u64){
        let Some(a)=self.actors.get_mut(&id) else{return;};
        if revision<=a.profile_revision{return;}
        // Canonical purchases replenish stock; pending debits still take precedence.
        recovery::reconcile(&mut profile,&self.outbox,&a.account,a.slot);
        let potions=profile.potions.clone();
        support::replace_base(a,profile);
        a.profile.potions=potions;
        a.profile_revision=revision;
        a.cooldowns.retain(|id,_|*id==ATTACK_COOLDOWN||a.profile.skills.iter().any(|s|s.id==*id));
        if !a.profile.skills.iter().any(|s|s.id==a.skill){a.skill=a.profile.skills.first().map_or(0,|s|s.id);a.target=0;}
        self.party_colors();
    }
}
