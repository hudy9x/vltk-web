//! Native-resolved buff combinations keep combat formulas in one source of truth.
use super::*;
#[derive(Default)]
pub struct SupportState {
    pub war_items:BTreeMap<String,f64>,
    pub active: BTreeMap<u16, f32>,
    pub auras: std::collections::BTreeSet<u16>,
    pub cooldowns: BTreeMap<u16, f32>,
    pub lock: f32,
    pub shared: BTreeMap<u16,SupportSkill>,
    pub curses:BTreeMap<u16,curses::Active>,
}
pub(super) fn resolve(actor: &mut Actor) {
    let catalog = actor.base_profile.support.as_ref();
    let active: Vec<_> = actor
        .support
        .active
        .keys()
        .chain(actor.support.auras.iter())
        .copied()
        .collect::<std::collections::BTreeSet<_>>()
        .into_iter()
        .collect();
    let profile=match catalog {
        Some(catalog)=>{let Some(v)=catalog.variants.iter().find(|v|v.active==active) else{return;};v.profile.clone()},
        None=>actor.base_profile.clone(),
    };
    let hp = actor.hp / actor.profile.hp;
    let mp = if actor.profile.mp>0.0 {actor.mp / actor.profile.mp}else{0.0};
    let potions = std::mem::take(&mut actor.profile.potions);
    actor.profile = profile;
    actor.profile.potions = potions;
    apply_shared(actor);
    curses::apply_profile(actor);
    battlefield::apply_profile(actor);
    war_items::apply(actor);
    actor.hp = (hp * actor.profile.hp).clamp(0.0, actor.profile.hp);
    actor.mp = (mp * actor.profile.mp).clamp(0.0, actor.profile.mp);
}
pub(super) fn cast(
    actor: &mut Actor,
    skill: &SupportSkill,
    automatic: bool,
    enemies: bool,
) -> bool {
    if skill.curse
        || skill.aura
        || actor.hp <= 0.0
        || actor.stun > 0.0
        || actor.pvp.hurt > 0.0
        || actor.support.lock > 0.0
        || actor.support.active.contains_key(&skill.id)
        || actor
            .support
            .cooldowns
            .get(&skill.id)
            .is_some_and(|t| *t > 0.0)
        || skill.duration <= 0.0
    {
        return false;
    }
    if skill.life_cost {
        let reserve = actor.profile.hp * if automatic { 0.3 } else { 0.25 };
        if actor.hp < skill.cost + reserve {
            return false;
        }
    } else if actor.mp
        < skill.cost
            + if automatic {
                actor.profile.mp * 0.15
            } else {
                0.0
            }
    {
        return false;
    }
    if skill.heal > 0.0 {
        if actor.hp >= actor.profile.hp
            || automatic && (!enemies || actor.hp >= actor.profile.hp * 0.6)
        {
            return false;
        }
    } else if skill.duration < 5.0 {
        return false;
    }
    if skill.life_cost {
        actor.hp = (actor.hp - skill.cost).max(1.0);
    } else {
        actor.mp -= skill.cost;
    }
    actor
        .support
        .cooldowns
        .insert(skill.id, skill.cooldown.max(0.0));
    actor.support.lock = 0.5;
    if skill.heal > 0.0 {
        actor.hp = (actor.hp + skill.heal).min(actor.profile.hp);
    } else {
        actor.support.active.insert(skill.id, skill.duration);
        resolve(actor);
    }
    true
}
impl Game {
    pub(super) fn advance_support(&mut self, events: &mut Vec<EventData>) {
        let dt = self.rules.tick_seconds;
        let peers=pvp::peers(self);
        for (&id, a) in &mut self.actors {
            if a.war.is_some_and(|w|!w.ready){continue;}
            a.support.lock = (a.support.lock - dt).max(0.0);
            for t in a.support.cooldowns.values_mut() {
                *t = (*t - dt).max(0.0);
            }
            let before = a.support.active.len();
            if a.hp <= 0.0 {
                a.support.active.clear();
            } else {
                a.support.active.retain(|_, t| {
                    *t -= dt;
                    *t > 0.0
                });
            }
            if before != a.support.active.len() {
                resolve(a);
            }
            let Some(room) = self.rooms.get(&a.map) else {
                continue;
            };
            if a.hp <= 0.0 || room.definition.town || !a.path.is_empty() || a.support.lock > 0.0 {
                continue;
            }
            let skills = a
                .base_profile
                .support
                .as_ref()
                .map(|c| c.skills.clone())
                .unwrap_or_default();
            for skill in skills.iter().filter(|s| s.enabled && !s.aura && !s.curse) {
                let enemies=room.mobs.iter().any(|m|m.hp>0.0)||peers.iter().any(|p|pvp::hostile(id,a,p,room.definition.town));
                if cast(a, skill, true, enemies) {
                    events.push((a.map, 6, id, id, skill.id, skill.heal, 0));
                    if crate::diagnostics::enabled() {
                        crate::diagnostics::log(
                            "support-cast",
                            serde_json::json!({"player":id,"skill":skill.id,"duration":skill.duration,"hp":a.hp,"mp":a.mp,"automatic":true}),
                        );
                    }
                    break;
                }
            }
        }
        self.refresh_shared_support();
    }
    pub(super) fn cast_support(&mut self, id: u32, skill: u16) {
        let Some(a) = self.actors.get_mut(&id) else {
            return;
        };
        let Some(room) = self.rooms.get(&a.map) else {
            return;
        };
        if room.definition.town || !a.path.is_empty() {
            return;
        }
        let ability = a
            .base_profile
            .support
            .as_ref()
            .and_then(|c| c.skills.iter().find(|s| s.id == skill))
            .cloned();
        if let Some(ability) = ability {
            if ability.aura {
                if a.hp <= 0.0 || a.stun > 0.0 {
                    return;
                }
                if !a.support.auras.remove(&skill) {
                    a.support.auras.insert(skill);
                }
                resolve(a);
            } else if cast(a, &ability, false, room.mobs.iter().any(|m| m.hp > 0.0)) {
                let map = a.map;
                self.event(map, 6, id, id, skill, ability.heal, 0);
            }
        }
    }
}
// Incoming monsters currently attack in melee. Reflection uses HP damage after
// mana shielding, as native U9 does; it never recursively generates another hit.
pub(super) fn receive_hit(a: &mut Actor, damage: f32) -> (f32, f32) {
    receive_hit_from(a, damage, -1)
}
pub(super) fn receive_hit_from(a: &mut Actor, damage: f32, series: i8) -> (f32, f32) {
    let hp = a.hp;
    let (damage, reflected) = receive_skill_hit(a, damage, series);
    (damage.min(hp), reflected)
}
pub(super) fn receive_skill_hit(a: &mut Actor, damage: f32, series: i8) -> (f32, f32) {
    let p = &a.profile.protection;
    let mut amount = (damage - damage.min(damage * 0.35).min(p.damage_shield.max(0.0))).max(0.0);
    amount *= 1.0 - p.absorption.clamp(0.0, 60.0) / 100.0;
    if (0..5).contains(&series) {
        amount *= 1.0 - p.from[series as usize].clamp(0.0, 100.0) / 100.0;
    }
    a.mp = (a.mp + amount * p.damage_to_mana.max(0.0) / 100.0).min(a.profile.mp);
    let shield = a.mp.min(amount * p.mana_shield.clamp(0.0, 90.0) / 100.0);
    a.mp -= shield;
    amount -= shield;
    let reflected = p.reflect.max(0.0) + amount * p.reflect_percent.max(0.0) / 100.0;
    a.hp = (a.hp - amount).max(0.0);
    (amount, reflected)
}

pub fn replace_base(actor: &mut Actor, profile: Profile) {
    let hp=actor.hp/actor.profile.hp;
    let mp=if actor.profile.mp>0.0{actor.mp/actor.profile.mp}else{1.0};
    let old_auras=actor.support.auras.clone();
    let old_catalog=actor.base_profile.support.clone();
    let mut profile=profile;
    // Command 9 settings belong to this session; XP refreshes must not re-enable them.
    if let (Some(old),Some(next))=(old_catalog.as_ref(),profile.support.as_mut()){
        for skill in &mut next.skills {
            if let Some(previous)=old.skills.iter().find(|s|s.id==skill.id){skill.enabled=previous.enabled;}
        }
    }
    actor.base_profile = profile;
    if let Some(catalog)=actor.base_profile.support.as_ref(){
        actor.support.active.retain(|id,_|catalog.skills.iter().any(|s|s.id==*id&&!s.aura));
        actor.support.cooldowns.retain(|id,_|catalog.skills.iter().any(|s|s.id==*id));
        actor.support.auras=catalog.skills.iter().filter(|s|s.aura&&s.enabled&&
            (old_auras.contains(&s.id)||!old_catalog.as_ref().is_some_and(|old|old.skills.iter().any(|o|o.id==s.id))))
            .map(|s|s.id).collect();
        resolve(actor);
    }else{
        let potions=std::mem::take(&mut actor.profile.potions);
        actor.profile=actor.base_profile.clone();actor.profile.potions=potions;
        actor.support=SupportState::default();
        actor.hp=(hp*actor.profile.hp).clamp(0.0,actor.profile.hp);
        actor.mp=(mp*actor.profile.mp).clamp(0.0,actor.profile.mp);
    }
}

pub(super) fn initialize(actor: &mut Actor) {
    actor.support.auras = actor
        .base_profile
        .support
        .as_ref()
        .map(|c| {
            c.skills
                .iter()
                .filter(|s| s.aura && s.enabled)
                .map(|s| s.id)
                .collect()
        })
        .unwrap_or_default();
    resolve(actor);
}

// Only source-owned, active support skills may radiate. Received buffs never radiate again.
impl Game {
    pub(super) fn refresh_shared_support(&mut self) {
        let sources:Vec<_>=self.actors.iter().filter(|(_,a)|a.hp>0.0).flat_map(|(&id,a)|{
            a.base_profile.support.as_ref().into_iter().flat_map(move |c|c.skills.iter()
                .filter(|s|s.shared.is_some()&&(a.support.auras.contains(&s.id)||a.support.active.contains_key(&s.id)))
                .map(move |s|(id,a.map,a.x,a.y,a.party_alignment.unwrap_or(a.profile.alignment),a.war,s.clone())))
        }).collect();
        for (&id,a) in &mut self.actors {
            let mut shared=BTreeMap::<u16,SupportSkill>::new();
            if a.hp>0.0&&a.war.is_none_or(|w|w.kind<2) {
                for (source,map,x,y,alignment,war,skill) in &sources {
                    let allied=if war.is_some()||a.war.is_some(){war.zip(a.war).is_some_and(|(x,y)|x.match_id==y.match_id&&x.team==y.team&&x.ready&&y.ready)}else{*alignment==a.party_alignment.unwrap_or(a.profile.alignment)};
                    if *source==id||*map!=a.map||!allied
                        || navigation::distance(a.x,a.y,*x,*y)>410.0
                        || a.support.auras.contains(&skill.id)||a.support.active.contains_key(&skill.id) {continue;}
                    if shared.get(&skill.id).is_none_or(|previous|previous.level<skill.level){shared.insert(skill.id,skill.clone());}
                }
            }
            let key=|m:&BTreeMap<u16,SupportSkill>|m.iter().map(|(&id,s)|(id,s.level)).collect::<Vec<_>>();
            if key(&shared)!=key(&a.support.shared){a.support.shared=shared;resolve(a);}
        }
    }
}
fn apply_shared(actor:&mut Actor) {
    let Some(scale)=actor.profile.ally_scaling.clone() else{return;};
    let mut effects=BTreeMap::<String,f32>::new();
    for skill in actor.support.shared.values(){
        for (key,value) in skill.shared.as_ref().into_iter().flatten(){*effects.entry(key.clone()).or_default()+=value;}
    }
    let get=|key:&str|effects.get(key).copied().unwrap_or(0.0);
    let p=&mut actor.profile;
    let life=p.hp;
    p.hp*=1.0+get("lifemax_p")/(100.0+scale.life_percent);
    p.regen+=get("lifereplenish_v")+(p.hp-life)*scale.regen_life;
    p.mana_regen+=get("manareplenish_v");
    p.defense+=get("adddefense_v")*scale.defense;
    for (i,r) in p.res.iter_mut().enumerate(){*r=(*r+get("allres_p")).min(scale.res_max[i]);}
    if let Some(t)=p.timing.as_mut(){t.run_percent+=get("fastwalkrun_p");}
    p.protection.reflect_percent+=get("meleedamagereturn_p");
    p.protection.ranged_reflect+=get("rangedamagereturn_p");
    p.protection.cold_reduction=(p.protection.cold_reduction+get("freezetimereduce_p")).min(80.0);
    p.protection.stun_reduction=(p.protection.stun_reduction+get("stuntimereduce_p")).min(80.0);
    p.protection.poison_reduction=(p.protection.poison_reduction+get("poisontimereduce_p")).min(80.0);
    for (s,coefficient) in p.skills.iter_mut().zip(&scale.physical){s.parts[0]+=coefficient*get("addphysicsdamage_p");}
}
