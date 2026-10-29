//! Recovery is authoritative; a durable debit precedes every bottle's benefit.
use super::*;
pub(super) fn leech(actor:&mut Actor, skill:&Skill, damage:f32){
    if actor.hp<=0.0 || damage<=0.0{return;}
    let before=(actor.hp,actor.mp);
    actor.hp=(actor.hp+damage*skill.leech.clamp(0.0,100.0)/100.0).min(actor.profile.hp);
    actor.mp=(actor.mp+damage*skill.mana_leech.clamp(0.0,100.0)/100.0).min(actor.profile.mp);
    if crate::diagnostics::enabled() && (actor.hp>before.0 || actor.mp>before.1){
        crate::diagnostics::log("leech-applied",serde_json::json!({"slot":actor.slot,"skill":skill.id,"damage":damage,"manaPercent":skill.mana_leech,"hpBefore":before.0,"hpAfter":actor.hp,"mpBefore":before.1,"mpAfter":actor.mp}));
    }
}
// Absolute per-item counters tolerate delayed/out-of-order SQLite delivery and
// joining while a previous session's committed debit is awaiting ACK.
pub(super) fn reconcile(profile:&mut Profile,outbox:&Outbox,account:&str,slot:u8){
    for grant in outbox.pending.values().filter(|g|g.account==account&&g.slot==slot){
        if let Some(debit)=&grant.potion {
            if let Some(p)=profile.potions.iter_mut().find(|p|p.id==debit.id){
                let difference=debit.spent.saturating_sub(p.spent);
                p.count=p.count.saturating_sub(difference);
                p.spent=p.spent.max(debit.spent);
            }
        }
    }
}
impl Game {
    pub(super) fn consume_potion(&mut self,id:u32,potion:u16)->Result<()>{
        let a=self.actors.get_mut(&id).unwrap();
        let Some(index)=a.profile.potions.iter().position(|p|p.id==potion)else{return Ok(());};
        let p=&a.profile.potions[index];
        let life=p.hp>0.0;let mana=p.mp>0.0;
        if a.hp<=0.0 || p.count==0 || a.profile.level<p.level ||
            (!life || a.hp>=a.profile.hp) && (!mana || a.mp>=a.profile.mp) ||
            life&&*a.cooldowns.get(&65000).unwrap_or(&0.0)>0.0 ||
            mana&&*a.cooldowns.get(&65001).unwrap_or(&0.0)>0.0 {return Ok(());}
        let spent=p.spent.checked_add(1).ok_or_else(||anyhow::anyhow!("potion counter overflow"))?;
        self.outbox.consume(a.account.clone(),a.slot,outbox::PotionDebit{id:p.id,spent})?;
        let before=(a.hp,a.mp);
        a.hp=(a.hp+p.hp.max(0.0)).min(a.profile.hp);
        a.mp=(a.mp+p.mp.max(0.0)).min(a.profile.mp);
        if life{a.cooldowns.insert(65000,0.3);}
        if mana{a.cooldowns.insert(65001,0.3);}
        a.profile.potions[index].count-=1;
        a.profile.potions[index].spent=spent;
        let remaining=a.profile.potions[index].count;
        let map=a.map;
        if crate::diagnostics::enabled(){crate::diagnostics::log("potion-applied",serde_json::json!({"player":id,"slot":a.slot,"potion":potion,"remaining":remaining,"hpBefore":before.0,"hpAfter":a.hp,"mpBefore":before.1,"mpAfter":a.mp}));}
        self.event(map,5,id,id,potion,remaining as f32,0);
        Ok(())
    }
}
