//! Durable item-use receipts are issued by Node after consuming inventory in SQLite.
//! Rust applies each receipt once; only living participants in this match may receive it.
use super::*;
use serde::{Deserialize,Serialize};
pub const RANGE:f32=410.0;
#[derive(Clone,Debug,Deserialize,Serialize)]
pub struct Use {pub seq:u64,pub kind:String,pub at:f64,pub x:f32,pub y:f32}
#[derive(Clone,Serialize)]
pub struct Trap {pub kind:String,pub x:f32,pub y:f32,pub team:u8,pub expires:f64}
#[derive(Default)]
pub struct State {
    seen:BTreeMap<String,u64>,
    buffs:BTreeMap<String,BTreeMap<String,f64>>,
    pub traps:Vec<Trap>,
}
pub(super) fn apply(a:&mut Actor){
    if !a.war.is_some_and(|w|w.kind<2){return;}
    let buffs=&a.support.war_items;
    let has=|key:&str|buffs.contains_key(key);
    if has("drum"){a.profile.hp*=1.3;for res in &mut a.profile.res{*res+=30.0;}}
    if has("resistance"){for res in &mut a.profile.res{*res+=20.0;}}
    for (key,index) in [("physicalRes",0),("poisonRes",1),("coldRes",2),("fireRes",3),("lightRes",4)]{
        if has(key){a.profile.res[index]+=50.0;}
    }
    let attack=if has("haste")||has("command"){1.5}else if has("attack"){1.25}else{1.0};
    let movement=if has("command"){1.3}else if has("movement"){1.25}else if has("sprint"){1.2}else{1.0};
    if has("life"){a.profile.hp+=500.0;}
    if has("evasion"){a.profile.defense+=500.0;}
    if has("horn"){a.profile.protection.reflect*=0.8;a.profile.protection.reflect_percent*=0.8;a.profile.protection.ranged_reflect*=0.8;}
    a.profile.speed*=movement;
    if let Some(t)=a.profile.timing.as_mut(){t.run_percent*=movement;}
    for skill in &mut a.profile.skills{
        if let Some(p)=skill.attack_percent.as_mut(){*p*=attack;}else{skill.cooldown/=attack;}
        if skill.curse.is_some(){continue;}
        if has("accuracy"){if let Some(accuracy)=skill.accuracy.as_mut(){accuracy.rating+=500.0;}}
        if skill.phys{
            if has("external"){skill.parts[0]*=1.5;}
            if has("externalCold"){skill.parts[2]+=100.0;skill.cold=skill.cold.max(1.5);}
        }else{
            for (key,index,value) in [("internal",0,100.0),("internalPoison",1,50.0),("internalCold",2,100.0),("internalFire",3,100.0),("internalLight",4,100.0)]{
                if has(key){skill.parts[index]+=value;if index==1{skill.poison=skill.poison.max(3.0);}if index==2{skill.cold=skill.cold.max(1.5);}}
            }
        }
    }
}
impl Game{
    pub(super) fn advance_war_items(&mut self,clock:f64){
        let mut state=std::mem::take(&mut self.battlefield.items);
        let active=!self.battlefield.finished&&clock<self.battlefield.ends;
        if !active{state.buffs.clear();state.traps.clear();}
        if active{
            let uses:Vec<_>=self.battlefield.units.values().filter(|u|u.kind==0).filter_map(|u|{
                let a=self.actors.get(&u.id)?;
                let bag=a.base_profile.war_supplies.as_ref().filter(|b|b.match_id==self.battlefield.id&&b.starts==self.battlefield.starts)?;
                Some((u.id,u.key.clone(),u.team,bag.item_uses.clone()))
            }).collect();
            for (id,key,team,uses) in uses{
                for item in uses{
                    if item.seq<=*state.seen.get(&key).unwrap_or(&0){continue;}
                    state.seen.insert(key.clone(),item.seq);
                    if item.at+180.0<=clock||item.at>clock+1.0||!self.actors.get(&id).is_some_and(|a|a.hp>0.0&&a.map==battlefield::MAP&&a.war.is_some_and(|w|w.ready)){continue;}
                    if ["freezeTrap","stunTrap","slowTrap"].contains(&item.kind.as_str()){
                        if item.at+30.0>clock&&state.traps.len()<128{state.traps.push(Trap{kind:item.kind,x:item.x,y:item.y,team,expires:item.at+30.0});}
                        continue;
                    }
                    let area=["drum","command","horn"].contains(&item.kind.as_str());
                    for u in self.battlefield.units.values().filter(|u|u.kind<2){
                        let Some(a)=self.actors.get(&u.id).filter(|a|a.hp>0.0&&a.map==battlefield::MAP&&a.war.is_some_and(|w|w.ready))else{continue;};
                        let eligible=if !area{u.id==id}else{(if item.kind=="horn"{u.team!=team}else{u.team==team})&&navigation::distance(a.x,a.y,item.x,item.y)<=RANGE};
                        if eligible{state.buffs.entry(u.key.clone()).or_default().insert(item.kind.clone(),item.at+180.0);}
                    }
                }
            }
            state.traps.retain(|t|t.expires>clock);
            state.traps.retain(|t|{
                let mut triggered=false;
                for a in self.actors.values_mut().filter(|a|a.hp>0.0&&a.map==battlefield::MAP&&a.war.is_some_and(|w|w.ready&&w.team!=t.team)&&navigation::distance(a.x,a.y,t.x,t.y)<=90.0){
                    triggered=true;
                    match t.kind.as_str(){
                        "slowTrap"=>{a.cold=a.cold.max(5.0);a.pvp.cold_power=a.pvp.cold_power.max(0.5);},
                        "freezeTrap"=>{a.stun=a.stun.max(3.0);a.cold=a.cold.max(3.0);a.pvp.cold_power=0.75;},
                        _=>{a.stun=a.stun.max(3.0);}
                    }
                }
                !triggered
            });
        }
        for buffs in state.buffs.values_mut(){buffs.retain(|_,until|*until>clock);}
        state.buffs.retain(|_,buffs|!buffs.is_empty());
        for u in self.battlefield.units.values(){
            let Some(a)=self.actors.get_mut(&u.id).filter(|a|a.war.is_some())else{continue;};
            let buffs=state.buffs.get(&u.key).cloned().unwrap_or_default();
            if a.support.war_items!=buffs{a.support.war_items=buffs;support::resolve(a);}
        }
        self.battlefield.items=state;
    }
}

#[cfg(test)]
mod tests{
    use super::*;
    fn actor()->Actor{
        let profile=serde_json::from_value(serde_json::json!({"level":150,"hp":1000,"mp":1000,"regen":0,"manaRegen":0,"speed":150,"defense":100,"res":[0,0,0,0,0],"protection":{"reflect":100,"reflectPercent":20,"rangedReflect":10},"skills":[{"id":1,"cost":0,"cooldown":1,"castCooldown":0,"attackPercent":100,"accuracy":{"rating":100,"ignore":0},"range":200,"radius":0,"shape":"single","targets":1,"parts":[100,100,100,100,100],"crit":0,"stun":0,"cold":0,"poison":0,"travel":0,"phys":false}]})).unwrap();
        let mut a=Actor::new("test".into(),0,profile,battlefield::MAP,(100.0,100.0));
        a.war=Some(battlefield::Membership{prefer_players:true,team:0,match_id:1,ready:true,kind:0,points:0});a
    }
    #[test]
    fn every_personal_consumable_changes_its_advertised_stat_and_recompute_is_idempotent(){
        let keys=["resistance","attack","movement","drum","command","external","externalCold","internal","internalPoison","internalCold","internalFire","internalLight","life","sprint","evasion","accuracy","haste","horn","poisonRes","coldRes","lightRes","physicalRes","fireRes"];
        for key in keys{
            let mut a=actor();if key.starts_with("external"){a.base_profile.skills[0].phys=true;}
            a.support.war_items.insert(key.into(),180.0);support::resolve(&mut a);
            match key{
                "resistance"=>assert_eq!(a.profile.res,[20.0;5]),
                "drum"=>{assert_eq!(a.profile.hp,1300.0);assert_eq!(a.profile.res,[30.0;5]);},
                "attack"=>assert_eq!(a.profile.skills[0].attack_percent,Some(125.0)),
                "haste"|"command"=>assert_eq!(a.profile.skills[0].attack_percent,Some(150.0)),
                "movement"=>assert_eq!(a.profile.speed,187.5),"sprint"=>assert_eq!(a.profile.speed,180.0),
                "external"=>assert_eq!(a.profile.skills[0].parts[0],150.0),
                "externalCold"|"internalCold"=>assert_eq!(a.profile.skills[0].parts[2],200.0),
                "internal"=>assert_eq!(a.profile.skills[0].parts[0],200.0),
                "internalPoison"=>assert_eq!(a.profile.skills[0].parts[1],150.0),
                "internalFire"=>assert_eq!(a.profile.skills[0].parts[3],200.0),
                "internalLight"=>assert_eq!(a.profile.skills[0].parts[4],200.0),
                "life"=>assert_eq!(a.profile.hp,1500.0),"evasion"=>assert_eq!(a.profile.defense,600.0),
                "accuracy"=>assert_eq!(a.profile.skills[0].accuracy.as_ref().unwrap().rating,600.0),
                "horn"=>{assert_eq!(a.profile.protection.reflect,80.0);assert_eq!(a.profile.protection.reflect_percent,16.0);},
                _=>assert_eq!(a.profile.res.iter().sum::<f32>(),50.0),
            }
            let before=serde_json::to_value(&a.profile).unwrap();support::resolve(&mut a);
            assert_eq!(serde_json::to_value(&a.profile).unwrap(),before,"{key} must not stack on profile refresh");
        }
    }
    #[test]
    fn haste_increases_native_attack_cadence_but_does_not_shorten_a_real_skill_cooldown(){
        let mut a=actor();
        a.base_profile.timing=Some(serde_json::from_value(serde_json::json!({"runPercent":100,"config":{"minPercent":25,"maxPercent":300,"run":{"referenceFrames":10,"distanceScale":1,"phases":[{"minPercent":100,"fps":10},{"minPercent":150,"fps":15}]},"attack":{"referenceFrames":10,"phases":[{"minPercent":100,"fps":10},{"minPercent":150,"fps":15}]}}})).unwrap());
        support::resolve(&mut a);assert_eq!(speed::attack(&a,&a.profile.skills[0]).1,1.0);
        a.support.war_items.insert("haste".into(),180.0);support::resolve(&mut a);
        assert!((speed::attack(&a,&a.profile.skills[0]).1-2.0/3.0).abs()<0.0001);
        a.base_profile.skills[0].cast_cooldown=Some(2.0);support::resolve(&mut a);
        assert_eq!(speed::attack(&a,&a.profile.skills[0]).1,2.0);
    }
}
