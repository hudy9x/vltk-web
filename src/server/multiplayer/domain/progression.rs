//! Apply canonical profile revisions without resetting combat state on every XP grant.
use super::*;
impl Game {
    pub fn refresh_profile(&mut self,id:u32,profile:Profile,revision:u64){
        let Some(a)=self.actors.get_mut(&id) else{return;};
        if revision<=a.profile_revision{return;}
        support::replace_base(a,profile);
        a.profile_revision=revision;
        a.cooldowns.retain(|id,_|a.profile.skills.iter().any(|s|s.id==*id));
        if !a.profile.skills.iter().any(|s|s.id==a.skill){a.skill=a.profile.skills.first().map_or(0,|s|s.id);a.target=0;}
    }
}
