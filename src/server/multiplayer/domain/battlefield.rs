//! One authoritative public Tống Kim room. Private simulator matches never join it.
use super::*;
use serde::{Deserialize,Serialize};
#[derive(Clone,Debug,Deserialize,Serialize)]
#[serde(rename_all="camelCase")]
pub struct Supplies {pub match_id:u32,pub starts:f64,pub bought:[BTreeMap<u16,u32>;2],pub selected:[u16;2]}
pub const MAP: u32 = 9003;
pub const WAIT_MAP: u32 = 9004;
pub const DURATION: f64 = 1200.0;
// Deaths 1..: 5, 7, 10, 13, 15, 17, 20, 23, ... seconds.
fn respawn_delay(deaths:u32)->f64 {
    let index=deaths.saturating_sub(1);
    [5.0,7.0,10.0,13.0][(index%4) as usize]+10.0*(index/4) as f64
}
fn patrol_random(rng:&mut u64)->f64 {
    chance(rng,0.0);(*rng%1_000_000) as f64/1_000_000.0
}
pub fn now() -> f64 { std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs_f64() }
#[derive(Clone, Copy, Debug)]
pub struct Membership { pub prefer_players:bool, pub team:u8, pub match_id:u32, pub ready:bool, pub kind:u8, pub points:u32 }
#[derive(Clone,Debug,Deserialize,Serialize)]
#[serde(rename_all="camelCase")]
pub struct SimAppearance {pub sx:String,pub rows:BTreeMap<String,i32>,pub ride:u8,pub mg:bool}
#[derive(Clone,Debug,Deserialize)]
pub struct Template {#[serde(default)] pub appearance:Option<SimAppearance>,pub faction:String,pub name:String,pub sex:u8,pub skills:Vec<u16>,pub profile:Profile}
#[derive(Clone,Debug,Deserialize)]
#[serde(rename_all="camelCase")]
pub struct Soldier {pub damage:f32,pub defense:f32,pub speed:f32,pub team:String,pub rank:String,pub name:String,pub skin:u32,pub x:f32,pub y:f32,pub hp:f32,pub respawn_seconds:f64,pub patrol_radius:f32,pub leash_radius:f32}
#[derive(Clone,Debug,Deserialize)]
#[serde(rename_all="camelCase")]
pub struct Definition {#[serde(default)] pub potions:Vec<WarPotion>,#[serde(default)] pub sim_support:Vec<SupportSkill>,pub templates:Vec<Template>,pub soldiers:Vec<Soldier>,pub camps:BTreeMap<String,Point>,pub army_spawns:BTreeMap<String,Vec<Point>>,pub marshals:BTreeMap<String,Point>}
#[derive(Clone,Debug,Deserialize)]
pub struct WarPotion {pub level:u16,pub hp:f32,pub mp:f32}
#[derive(Clone)]
pub struct ReturnState {pub map:u32,pub x:f32,pub y:f32,pub hp:f32,pub mp:f32,pub potions:Vec<Potion>}
#[derive(Clone)]
pub struct Unit {
    pub appearance:Option<SimAppearance>,pub key:String,pub id:u32,pub name:String,pub faction:String,pub sex:u8,pub skin:u32,
    pub team:u8,pub kind:u8,pub tier:u32,pub points:u32,pub kills:u32,pub player_kills:u32,pub deaths:u32,
    pub home:(f32,f32),pub x:f32,pub y:f32,pub hp:f32,pub mp:f32,
    pub ready_at:f64,pub respawn_at:f64,pub respawn_seconds:f64,pub counted:bool,
    pub return_to:Option<ReturnState>,pub skills:Vec<u16>,pub patrol:f32,pub leash:f32,pub patrol_at:f64,pub patrolling:bool,
    pub bought:[BTreeMap<u16,u32>;2],pub spent:[BTreeMap<u16,u32>;2],pub selected:[u16;2],pub potions:[u32;2],pub potion_at:[f64;2],pub last_hit:f64,pub last_source:u32,
}
#[derive(Default)]
pub struct Battlefield {pub definition:Option<Definition>,pub id:u32,pub starts:f64,pub ends:f64,pub clock:f64,pub finished:bool,pub spawned:bool,pub marshals:bool,pub score:[u32;2],pub units:BTreeMap<u32,Unit>}
pub fn rank(points:u32)->u32 { [3000,9000,18000,30000].iter().filter(|&&p|points>=p).count() as u32 }
pub fn apply_profile(a:&mut Actor) {
    let Some(w)=a.war.filter(|w|w.kind<2) else{return;};
    let bonus=1.0+rank(w.points) as f32*0.05;
    for r in &mut a.profile.res {if *r>0.0 {*r*=bonus;}}
    for s in &mut a.profile.skills {s.parts[0]*=bonus;if let Some(p)=s.attack_percent.as_mut(){*p*=bonus;}}
}
impl Game {
    pub fn battlefield_join(&mut self,id:u32,team:u8)->Result<()> {
        ensure!(team<2 && self.battlefield.definition.is_some() && self.rooms.contains_key(&MAP) && self.rooms.contains_key(&WAIT_MAP),"battlefield unavailable");
        let a=self.actors.get(&id).ok_or_else(||anyhow::anyhow!("unknown actor"))?;
        if a.war.is_some(){return Ok(());}
        ensure!(a.hp>0.0,"cannot join while dead");
        let clock=now();
        if self.battlefield.id==0 || self.battlefield.finished {
            // Keep a completed result until everyone has acknowledged/left it.
            ensure!(!self.actors.values().any(|a|a.war.is_some_and(|w|w.kind==0)),"previous battlefield awaiting departure");
            self.clear_battlefield();
            self.battlefield.id=self.id();self.battlefield.starts=clock+5.0;self.battlefield.ends=clock+5.0+DURATION;
            self.battlefield.clock=clock;
            self.battlefield.finished=false;self.battlefield.spawned=false;self.battlefield.marshals=false;
        }
        ensure!(clock+5.0<self.battlefield.ends,"battlefield ending");
        let a=&self.actors[&id];let key=format!("{}:{}",a.account,a.slot);
        let old=self.battlefield.units.iter().find(|(_,u)|u.kind==0&&u.key==key).map(|(&id,_)|id);
        ensure!(old.is_some()||self.battlefield.units.values().filter(|u|u.kind==0).count()<64,"battlefield registration full");
        let reserved_team=old.map(|old|self.battlefield.units[&old].team).unwrap_or(team);
        ensure!(self.actors.values().filter(|a|a.war.is_some_and(|w|w.kind==0&&w.team==reserved_team)).count()<16,"battlefield team full");
        let unit=if let Some(old)=old {let mut u=self.battlefield.units.remove(&old).unwrap();u.id=id;u.ready_at=clock+5.0;u} else {
            let home=self.battlefield_camp(team);let a=&self.actors[&id];
            Unit {appearance:None,key,id,name:a.name.clone(),faction:String::new(),sex:0,skin:0,team,kind:0,tier:0,points:0,kills:0,player_kills:0,deaths:0,
                home,x:home.0,y:home.1,hp:a.profile.hp,mp:a.profile.mp,ready_at:clock+5.0,respawn_at:0.0,respawn_seconds:5.0,counted:false,
                return_to:Some(ReturnState{map:a.map,x:a.x,y:a.y,hp:a.hp,mp:a.mp,potions:a.profile.potions.clone()}),skills:vec![],patrol:0.0,leash:f32::INFINITY,patrol_at:0.0,patrolling:false,
                bought:Default::default(),spent:Default::default(),selected:[0,0],potions:[0,0],potion_at:[0.0;2],last_hit:0.0,last_source:0}
        };
        let room=&self.rooms[&WAIT_MAP];
        let waiting=room.nav.nearest(room.definition.entry.x,room.definition.entry.y);
        let a=self.actors.get_mut(&id).unwrap();
        a.map=WAIT_MAP;(a.x,a.y)=waiting;a.life=a.life.wrapping_add(1);
        a.pvp=Default::default();a.dead=0.0;a.cold=0.0;a.stun=0.0;
        a.war=Some(Membership{prefer_players:true,team:unit.team,match_id:self.battlefield.id,ready:false,kind:0,points:unit.points});
        a.target=0;a.secondary=None;a.path.clear();a.move_goal=None;a.farming=false;a.pickup=0;
        self.battlefield.units.insert(id,unit);
        self.pending.retain(|p|p.source!=id&&p.target!=id);
        Ok(())
    }
    pub fn battlefield_leave(&mut self,id:u32) {
        if self.actors.get(&id).is_none_or(|a|a.war.is_none()){return;}
        let Some(unit)=self.battlefield.units.get(&id) else{return;};
        let Some(back)=unit.return_to.clone() else{return;};
        if let Some(a)=self.actors.get_mut(&id) {
            let unit=self.battlefield.units.get_mut(&id).unwrap();
            if a.map==MAP{unit.hp=a.hp;unit.mp=a.mp;unit.x=a.x;unit.y=a.y;}
            a.war=None;a.map=back.map;a.x=back.x;a.y=back.y;a.hp=back.hp;a.mp=back.mp;
            a.profile.potions=back.potions;a.support=Default::default();support::initialize(a);
            a.hp=back.hp.min(a.profile.hp);a.mp=back.mp.min(a.profile.mp);
            a.life=a.life.wrapping_add(1);a.death_notice=None;a.pvp=Default::default();a.dead=0.0;a.cold=0.0;a.stun=0.0;
            a.target=0;a.secondary=None;a.path.clear();a.move_goal=None;a.farming=false;a.pickup=0;a.cooldowns.clear();
        }
        self.pending.retain(|p|p.source!=id&&p.target!=id);
    }
    pub fn battlefield_disconnect(&mut self,id:u32) {
        if let (Some(a),Some(u))=(self.actors.get(&id),self.battlefield.units.get_mut(&id)) {
            if a.map==MAP{u.hp=a.hp;u.mp=a.mp;u.x=a.x;u.y=a.y;}
        }
    }
    pub(super) fn battlefield_camp(&self,team:u8)->(f32,f32) {
        let p=&self.battlefield.definition.as_ref().unwrap().camps[if team==0{"song"}else{"jin"}];(p.x,p.y)
    }
    fn battlefield_spawn(&mut self,team:u8)->(f32,f32) {
        let center=self.battlefield_camp(team);
        for _ in 0..64 {
            chance(&mut self.rng,0.0);let angle=(self.rng%1_000_000) as f32/1_000_000.0*std::f32::consts::TAU;
            chance(&mut self.rng,0.0);let radius=((self.rng%1_000_000) as f32/1_000_000.0).sqrt()*1000.0;
            let point=(center.0+radius*angle.cos(),center.1+radius*angle.sin());let nav=&self.rooms[&MAP].nav;
            if nav.stand(point.0,point.1)&&!nav.path(center.0,center.1,point.0,point.1).is_empty(){return point;}
        }
        self.rooms[&MAP].nav.nearest(center.0,center.1)
    }
    fn clear_battlefield(&mut self) {
        self.actors.retain(|_,a|a.war.is_none_or(|w|w.kind==0));
        self.pending.retain(|p|p.map!=MAP);self.contacts.retain(|_,g|g.map()!=MAP);self.events.retain(|e|e.map!=MAP);
        self.battlefield.units.clear();self.battlefield.score=[0,0];
    }
    fn spawn_battlefield(&mut self,marshals:bool) {
        let definition=self.battlefield.definition.clone().unwrap();
        let mut plans=Vec::new();
        if !marshals {
            for team in 0..2 {for (i,t) in definition.templates.iter().take(10).enumerate() {
                let points=&definition.army_spawns[if team==0{"song"}else{"jin"}];let p=&points[i%points.len()];
                plans.push((team,1,0,t.name.clone(),t.faction.clone(),t.sex,0,(p.x,p.y),t.profile.clone(),t.skills.clone(),5.0,0.0,f32::INFINITY));
            }}
            for s in definition.soldiers {
                let tier=match s.rank.as_str(){"captain"=>1,"commander"=>2,"general"=>3,"grandGeneral"=>4,_=>0};
                let mut profile=definition.templates[0].profile.clone();profile.level=120;profile.hp=s.hp;profile.mp=0.0;profile.regen=0.0;profile.mana_regen=0.0;profile.speed=s.speed*(1.15+tier as f32*0.08);profile.timing=None;
                profile.support=None;profile.ally_scaling=None;profile.protection=Default::default();profile.res=[35.0;5];profile.defense=s.defense;
                profile.skills.truncate(1);let skill=&mut profile.skills[0];skill.id=0;skill.parts=[s.damage,0.0,0.0,0.0,0.0];skill.pve=None;skill.cost=0.0;skill.range=55.0;skill.radius=0.0;skill.targets=1;skill.projectile=None;skill.attack_percent=None;skill.cooldown=(1.5*(0.85-tier as f32*0.1)).max(0.25);skill.crit=0.0;skill.leech=0.0;skill.mana_leech=0.0;skill.stun=0.0;skill.cold=0.0;skill.poison=0.0;skill.travel=0.0;
                plans.push((u8::from(s.team=="jin"),2,tier,s.name,String::new(),0,s.skin,(s.x,s.y),profile,vec![0],s.respawn_seconds,s.patrol_radius,s.leash_radius));
            }
        } else {
            for team in 0..2 {
                let p=&definition.marshals[if team==0{"song"}else{"jin"}];let mut profile=definition.templates[if team==0{6}else{4}].profile.clone();profile.hp=200_000.0;profile.regen=0.0;profile.support=None;profile.speed=0.0;profile.timing=None;
                let skills=profile.skills.iter().filter(|s|s.id!=0).map(|s|s.id).collect();
                plans.push((team,3,5,"Nguyên soái".into(),String::new(),0,if team==0{144}else{566},(p.x,p.y),profile,skills,0.0,0.0,650.0));
            }
        }
        for (team,kind,tier,name,faction,sex,skin,home,profile,skills,respawn_seconds,patrol,leash) in plans {
            let id=self.id();let home=self.rooms[&MAP].nav.nearest(home.0,home.1);
            let position=if kind==1{self.battlefield_spawn(team)}else{home};
            let mut a=Actor::new(format!("sim:{id}"),0,profile,MAP,position);
            let patrol_at=self.battlefield.clock+0.4+patrol_random(&mut self.rng)*4.0;
            a.name=name.clone();a.war=Some(Membership{prefer_players:true,team,match_id:self.battlefield.id,ready:true,kind,points:0});support::initialize(&mut a);
            self.battlefield.units.insert(id,Unit{appearance:if kind==1{definition.templates.iter().find(|t|t.faction==faction).and_then(|t|t.appearance.clone())}else{None},key:format!("sim:{id}"),id,name,faction,sex,skin,team,kind,tier,points:0,kills:0,player_kills:0,deaths:0,home,x:a.x,y:a.y,hp:a.hp,mp:a.mp,ready_at:self.battlefield.starts,respawn_at:0.0,respawn_seconds,counted:false,return_to:None,skills,patrol,leash,patrol_at,patrolling:false,bought:Default::default(),spent:Default::default(),selected:[0,0],potions:[0,0],potion_at:[0.0;2],last_hit:0.0,last_source:0});
            self.actors.insert(id,a);
        }
    }
    pub(super) fn advance_battlefield(&mut self,clock:f64) {
        if self.battlefield.id==0{return;}
        self.battlefield.clock=clock;
        for (&id,u) in &mut self.battlefield.units {
            if u.kind!=0{continue;}
            let Some(bag)=self.actors.get(&id).and_then(|a|a.base_profile.war_supplies.as_ref()).filter(|b|b.match_id==self.battlefield.id&&b.starts==self.battlefield.starts)else{continue;};
            u.bought=bag.bought.clone();u.selected=bag.selected;
            for slot in 0..2{u.potions[slot]=u.bought[slot].iter().map(|(id,bought)|bought.saturating_sub(*u.spent[slot].get(id).unwrap_or(&0))).sum();}
        }
        if clock>=self.battlefield.ends {
            if clock>=self.battlefield.ends+60.0 {let ids:Vec<_>=self.actors.iter().filter(|(_,a)|a.war.is_some_and(|w|w.kind==0)).map(|(&id,_)|id).collect();for id in ids{self.battlefield_leave(id);}}
            self.battlefield.finished=true;self.pending.retain(|p|p.map!=MAP);
            for a in self.actors.values_mut().filter(|a|a.war.is_some()) {a.war.as_mut().unwrap().ready=false;a.target=0;a.secondary=None;a.path.clear();a.move_goal=None;a.farming=false;}
            return;
        }
        if clock<self.battlefield.starts{return;}
        if !self.battlefield.spawned {self.battlefield.spawned=true;self.spawn_battlefield(false);}
        if clock>=self.battlefield.starts+600.0&&!self.battlefield.marshals {self.battlefield.marshals=true;self.spawn_battlefield(true);}
        let ids:Vec<_>=self.battlefield.units.keys().copied().collect();
        for id in ids {
            let placement={let u=&self.battlefield.units[&id];self.actors.get(&id).filter(|a|a.war.is_some()&&clock>=u.ready_at&&u.kind<2&&((a.map!=MAP&&u.hp>0.0)||(u.counted&&u.respawn_at>0.0&&clock>=u.respawn_at))).map(|_|u.team)};
            let position=placement.map(|team|self.battlefield_spawn(team));
            let u=&self.battlefield.units[&id];let Some(a)=self.actors.get_mut(&id).filter(|a|a.war.is_some()) else{continue;};
            if clock<u.ready_at{continue;}
            if a.map!=MAP {a.map=MAP;(a.x,a.y)=position.unwrap_or_else(||self.rooms[&MAP].nav.nearest(u.x,u.y));a.hp=u.hp.min(a.profile.hp);a.mp=u.mp.min(a.profile.mp);a.life=a.life.wrapping_add(1);}
            a.war.as_mut().unwrap().ready=true;a.pvp.enabled=true;
            if u.counted&&u.respawn_at>0.0&&clock>=u.respawn_at {
                if let Some(position)=position{(a.x,a.y)=position;}
                a.path.clear();a.move_goal=None;a.secondary=None;
                a.pvp=Default::default();a.support=Default::default();support::initialize(a);a.hp=a.profile.hp;a.mp=a.profile.mp;
                a.life=a.life.wrapping_add(1);a.cold=0.0;a.stun=0.0;a.cooldowns.clear();a.target=0;
                let u=self.battlefield.units.get_mut(&id).unwrap();u.x=a.x;u.y=a.y;u.counted=false;u.respawn_at=0.0;u.last_source=0;u.last_hit=0.0;u.patrolling=false;u.patrol_at=clock+0.4+patrol_random(&mut self.rng)*4.0;
            }
        }
        self.refresh_shared_support();
        self.battlefield_ai();
    }
    // Each guard finishes its current leg, rests, then chooses a fresh 2D destination.
    fn battlefield_patrol(&mut self,id:u32) {
        let clock=self.battlefield.clock;
        let u=self.battlefield.units.get_mut(&id).unwrap();
        let a=self.actors.get_mut(&id).unwrap();
        if a.target!=0||(u.patrolling&&a.path.is_empty()) {
            a.path.clear();u.patrolling=false;u.patrol_at=clock+0.8+patrol_random(&mut self.rng)*3.2;
        }
        if u.patrolling||clock<u.patrol_at||u.patrol<=0.0{return;}
        // Retry later if terrain prevents a route; never snap a guard through obstacles.
        u.patrol_at=clock+0.8+patrol_random(&mut self.rng)*3.2;
        let nav=&self.rooms[&MAP].nav;
        for _ in 0..12 {
            let angle=patrol_random(&mut self.rng) as f32*std::f32::consts::TAU;
            let radius=(0.2+0.8*patrol_random(&mut self.rng) as f32).sqrt()*u.patrol;
            let goal=(u.home.0+angle.cos()*radius,u.home.1+angle.sin()*radius);
            if distance(a.x,a.y,goal.0,goal.1)<24.0||!nav.stand(goal.0,goal.1){continue;}
            let path=nav.path(a.x,a.y,goal.0,goal.1);
            if !path.is_empty(){a.path=path;u.patrolling=true;break;}
        }
    }
    fn battlefield_ai(&mut self) {
        let clock=self.battlefield.clock;
        let peers=pvp::peers(self);
        let ids:Vec<_>=self.battlefield.units.values().filter(|u|u.kind>0).map(|u|u.id).collect();
        for id in ids {
            let u=self.battlefield.units[&id].clone();let Some(a)=self.actors.get(&id) else{continue;};if a.hp<=0.0{continue;}
            let enemy=peers.iter().filter(|p|pvp::hostile(id,a,p,false)&&distance(u.home.0,u.home.1,p.x,p.y)<=u.leash)
                .min_by(|p,q|distance(a.x,a.y,p.x,p.y).total_cmp(&distance(a.x,a.y,q.x,q.y))).copied();
            let fallback=self.battlefield_camp(1-u.team);
            if enemy.is_none()&&u.kind==2{self.battlefield_patrol(id);}
            let a=self.actors.get_mut(&id).unwrap();
            let selected=u.skills.iter().filter_map(|id|a.profile.skills.iter().find(|s|s.id==*id&&s.cost<=a.mp&&a.cooldowns.get(id).is_none_or(|v|*v<=0.0))).collect::<Vec<_>>();
            if !selected.is_empty(){a.skill=selected[(self.tick as usize/10)%selected.len()].id;}else if let Some(s)=a.profile.skills.first(){a.skill=s.id;}
            if let Some(p)=enemy {a.target=p.id;a.farming=false;}
            else {a.target=0;if self.tick.is_multiple_of(20)&&u.kind==1 {
                a.path=self.rooms[&MAP].nav.path(a.x,a.y,fallback.0,fallback.1);
            }}
            let recovery=self.battlefield.definition.as_ref().map(|d|&d.potions);
            for kind in 0..2 {let amount=recovery.into_iter().flatten().filter(|p|p.level<=a.profile.level).map(|p|if kind==0{p.hp}else{p.mp}).fold(0.0_f32,f32::max);if amount>0.0&&u.kind==1&&clock>=u.potion_at[kind]&&u.potions[kind]>0&&(if kind==0{a.hp<a.profile.hp*0.5}else{a.mp<a.profile.mp*0.5}) {
                if kind==0{a.hp=(a.hp+amount).min(a.profile.hp);}else{a.mp=(a.mp+amount).min(a.profile.mp);}
                let u=self.battlefield.units.get_mut(&id).unwrap();u.potions[kind]-=1;u.potion_at[kind]=clock+0.3;
            }}
        }
    }
    pub(super) fn battlefield_deaths(&mut self) {
        if self.battlefield.id==0||self.battlefield.finished{return;}
        let clock=self.battlefield.clock;
        let dead:Vec<_>=self.battlefield.units.values().filter(|u|!u.counted&&self.actors.get(&u.id).is_some_and(|a|a.war.is_some()&&a.hp<=0.0)).map(|u|u.id).collect();
        for id in dead {
            let victim=&self.battlefield.units[&id];
            let source=victim.last_source;
            let tier=if victim.kind>=2{victim.tier}else{rank(victim.points)};
            let points=if victim.kind==3{1000}else if victim.kind==2{50*(tier+1)}else{150*(tier+1)};
            let eligible=clock-victim.last_hit<=15.0&&self.battlefield.units.get(&source).is_some_and(|u|u.team!=victim.team&&u.kind<2);
            let soldier=victim.kind==2;let human=victim.kind==0;
            if eligible {
                let scorer=&self.battlefield.units[&source];
                if scorer.kind==0 {
                    if let Some((account,slot))=scorer.key.rsplit_once(':') {
                        let life=self.actors[&id].life;
                        if self.outbox.credit_merit(format!("{}-{id}-{life}-4",self.battlefield.id),account.into(),slot.parse().unwrap_or(0),points).is_err(){continue;}
                    }
                }
                let u=self.battlefield.units.get_mut(&source).unwrap();let old=rank(u.points);u.points=u.points.saturating_add(points);u.kills+=u32::from(soldier);u.player_kills+=u32::from(human);self.battlefield.score[u.team as usize]=self.battlefield.score[u.team as usize].saturating_add(points);
                if let Some(a)=self.actors.get_mut(&source).filter(|a|a.war.is_some()){a.war.as_mut().unwrap().points=u.points;if rank(u.points)!=old{support::resolve(a);}}
            }
            let victim=&self.battlefield.units[&id];
            let rally=if victim.kind<2{let camp=self.battlefield_camp(victim.team);self.rooms[&MAP].nav.nearest(camp.0,camp.1)}else{victim.home};
            let u=self.battlefield.units.get_mut(&id).unwrap();u.counted=true;u.deaths+=1;
            u.respawn_at=if u.kind==3{0.0}else{clock+if u.kind<2{respawn_delay(u.deaths)}else{u.respawn_seconds}};
            let a=self.actors.get_mut(&id).unwrap();(a.x,a.y)=rally;a.target=0;a.secondary=None;a.path.clear();a.move_goal=None;a.farming=false;
            self.pending.retain(|p|p.source!=id);
        }
        for (&id,u) in &mut self.battlefield.units {if let Some(a)=self.actors.get(&id).filter(|a|a.war.is_some()) {if a.map==MAP{u.hp=a.hp;u.mp=a.mp;u.x=a.x;u.y=a.y;}}}
    }
    pub(super) fn battlefield_potion(&mut self,id:u32,kind:usize)->bool {
        let clock=self.battlefield.clock;
        if kind>1{return false;}
        let Some(u)=self.battlefield.units.get(&id)else{return false;};
        let selected=u.selected[kind];let available=u.bought[kind].get(&selected).copied().unwrap_or(0).saturating_sub(*u.spent[kind].get(&selected).unwrap_or(&0));
        if available==0{return false;}
        let Some(potion)=self.actors.get(&id).and_then(|a|a.profile.potions.iter().find(|p|p.id==selected&&p.level<=a.profile.level)).cloned()else{return false;};
        let Some(a)=self.actors.get_mut(&id).filter(|a|a.hp>0.0&&a.war.is_some_and(|w|w.ready)&&!self.battlefield.finished) else{return false;};
        let Some(u)=self.battlefield.units.get_mut(&id) else{return false;};
        if kind>1||u.potions[kind]==0||clock<u.potion_at[kind]{return false;}
        if (potion.hp<=0.0||a.hp>=a.profile.hp)&&(potion.mp<=0.0||a.mp>=a.profile.mp){return false;}
        a.hp=(a.hp+potion.hp).min(a.profile.hp);a.mp=(a.mp+potion.mp).min(a.profile.mp);
        *u.spent[kind].entry(selected).or_default()+=1;u.potions[kind]-=1;u.potion_at[kind]=clock+0.3;true
    }

    pub fn battlefield_snapshot(&self,id:u32)->Option<serde_json::Value> {
        let a=self.actors.get(&id)?;let w=a.war?;let own=self.battlefield.units.get(&id)?;let clock=self.battlefield.clock;
        Some(serde_json::json!({"id":w.match_id,"starts":self.battlefield.starts,"ends":self.battlefield.ends,"now":clock,"phase":if self.battlefield.finished{"finished"}else if clock<self.battlefield.starts{"waiting"}else{"running"},"score":self.battlefield.score,"team":w.team,"entryRemaining":(own.ready_at-clock).max(0.0),"respawnRemaining":(own.respawn_at-clock).max(0.0),"deaths":own.deaths,"potions":own.potions,"selected":own.selected,"inventory":(0..2).flat_map(|slot|own.bought[slot].iter().map(move |(&id,&bought)|serde_json::json!({"slot":slot,"id":id,"count":bought.saturating_sub(*own.spent[slot].get(&id).unwrap_or(&0))}))).collect::<Vec<_>>(),
            "units":self.battlefield.units.values().filter(|u|u.kind<2||self.actors.contains_key(&u.id)).map(|u|serde_json::json!({"id":u.id,"name":u.name,"faction":u.faction,"sex":u.sex,"skin":u.skin,"appearance":u.appearance,"team":u.team,"kind":u.kind,"tier":u.tier,"points":u.points,"kills":u.kills,"playerKills":u.player_kills,"online":self.actors.get(&u.id).is_some_and(|a|a.war.is_some()),"ready":self.actors.get(&u.id).is_some_and(|a|a.war.is_some_and(|w|w.ready)),"moving":self.actors.get(&u.id).is_some_and(|a|!a.path.is_empty()),"level":if u.kind==2{120}else{200}})).collect::<Vec<_>>() }))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn fixture()->Game {
        let file=std::env::temp_dir().join(format!("public-war-{}-{}.jsonl",std::process::id(),std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()));
        let mut g=Game::new(file).unwrap();
        let skill=|id|serde_json::json!({"id":id,"cost":0,"cooldown":0.15,"range":250,"radius":0,"shape":"single","targets":1,"parts":[100,0,0,0,0],"crit":0,"stun":0,"cold":0,"poison":0,"travel":0});
        let p=serde_json::json!({"level":200,"hp":1000,"mp":1000,"regen":0,"manaRegen":0,"speed":150,"defense":0,"res":[0,0,0,0,0],"skills":[skill(0),skill(80),skill(150)]});
        let templates:Vec<_>=(0..10).map(|i|serde_json::json!({"name":format!("SIM {i}"),"faction":format!("faction{i}"),"sex":0,"skills":[80,150],"profile":p})).collect();
        let map=|id,town|serde_json::json!({"id":id,"level":1,"town":town,"width":1000,"height":1000,"entry":{"x":100,"y":100},"grid":{"kind":"open"},"monsters":[]});
        let def=serde_json::json!({"templates":templates,"soldiers":[],"camps":{"song":{"x":100,"y":100},"jin":{"x":800,"y":800}},"armySpawns":{"song":[{"x":120,"y":100}],"jin":[{"x":780,"y":800}]},"marshals":{"song":{"x":100,"y":100},"jin":{"x":800,"y":800}}});
        g.install(serde_json::from_value(serde_json::json!({"version":1,"town":1,"maps":[map(1,true),map(MAP,false),map(WAIT_MAP,false)],"battlefield":def})).unwrap()).unwrap();
        let profile:Profile=serde_json::from_value(p).unwrap();g.join(1,"account-a".into(),0,profile.clone()).unwrap();g.join(2,"account-b".into(),0,profile).unwrap();g
    }
    fn start(g:&mut Game) {
        g.battlefield_join(1,0).unwrap();g.battlefield_join(2,1).unwrap();
        let clock=now();g.battlefield.starts=clock-1.0;g.battlefield.ends=clock+DURATION;
        for u in g.battlefield.units.values_mut(){u.ready_at=clock-1.0;}
        g.advance_battlefield(clock);
    }
    #[test]
    fn guards_patrol_independently_finish_legs_and_pause_between_them() {
        let mut g=fixture();start(&mut g);
        let clock=g.battlefield.clock;
        let ids:Vec<_>=g.battlefield.units.values().filter(|u|u.kind==1).take(8).map(|u|u.id).collect();
        // Remove opponents so the test observes patrol, not combat pursuit.
        for a in g.actors.values_mut(){if let Some(w)=a.war.as_mut(){w.team=0;}}
        for u in g.battlefield.units.values_mut(){u.team=0;}
        for &id in &ids {
            let u=g.battlefield.units.get_mut(&id).unwrap();u.kind=2;u.home=(500.0,500.0);u.patrol=100.0;u.leash=200.0;
            let a=g.actors.get_mut(&id).unwrap();a.x=500.0;a.y=500.0;a.path.clear();a.target=0;a.war.as_mut().unwrap().kind=2;
        }
        assert!(ids.windows(2).any(|p|g.battlefield.units[&p[0]].patrol_at!=g.battlefield.units[&p[1]].patrol_at));
        g.battlefield.clock=clock+0.1;g.battlefield_ai();assert!(ids.iter().all(|id|g.actors[id].path.is_empty()));
        g.battlefield.clock=clock+5.0;g.battlefield_ai();
        let paths:Vec<_>=ids.iter().map(|id|g.actors[id].path.clone()).collect();
        assert!(paths.iter().all(|p|!p.is_empty()));
        assert!(paths.windows(2).any(|p|p[0]!=p[1]));
        for path in &paths{let &(x,y)=path.last().unwrap();assert!(distance(500.0,500.0,x,y)<=100.01);assert!((y-500.0).abs()>0.01);assert!(g.rooms[&MAP].nav.stand(x,y));}
        g.tick=100;g.battlefield.clock+=1.0;g.battlefield_ai();
        for (i,id) in ids.iter().enumerate(){assert_eq!(g.actors[id].path,paths[i],"global tick must not reverse a walking guard");}
        let id=ids[0];let goal=*g.actors[&id].path.last().unwrap();
        let a=g.actors.get_mut(&id).unwrap();a.path.clear();(a.x,a.y)=goal;
        g.battlefield_ai();assert!(!g.battlefield.units[&id].patrolling);assert!(g.actors[&id].path.is_empty());
        let due=g.battlefield.units[&id].patrol_at;assert!(due>g.battlefield.clock);
        g.battlefield.clock=due-0.01;g.battlefield_ai();assert!(g.actors[&id].path.is_empty());
        g.battlefield.clock=due+0.01;g.battlefield_ai();assert!(!g.actors[&id].path.is_empty());
        g.actors.get_mut(&id).unwrap().target=2;g.battlefield_patrol(id);
        assert!(g.actors[&id].path.is_empty(),"rest before patrolling again after combat");
    }
    #[test]
    fn one_room_waits_five_seconds_and_late_entry_keeps_the_deadline() {
        let mut g=fixture();g.battlefield_join(1,0).unwrap();let id=g.battlefield.id;let starts=g.battlefield.starts;let ends=g.battlefield.ends;
        g.battlefield_join(2,1).unwrap();assert_eq!(g.battlefield.id,id);assert_eq!(g.battlefield.starts,starts);assert_eq!(g.battlefield.ends,ends);assert_eq!(g.actors[&1].map,WAIT_MAP);assert!(!g.actors[&1].war.unwrap().ready);
        g.advance_battlefield(starts+0.1);assert_eq!(g.actors[&1].map,MAP);assert_eq!(g.battlefield.units.values().filter(|u|u.kind==1&&u.team==0).count(),10);assert_eq!(g.battlefield.units.values().filter(|u|u.kind==1&&u.team==1).count(),10);
        g.battlefield_leave(2);g.battlefield.starts=now()-420.0;g.battlefield.ends=g.battlefield.starts+DURATION;
        g.battlefield_join(2,1).unwrap();let due=g.battlefield.units[&2].ready_at;assert!((g.battlefield.ends-due-775.0).abs()<0.1);g.advance_battlefield(due-0.1);assert_eq!(g.actors[&2].map,WAIT_MAP);g.advance_battlefield(due+0.1);assert_eq!(g.actors[&2].map,MAP);
        assert!(g.actors.values().filter(|a|a.war.is_some_and(|w|w.kind==1)).all(|a|a.profile.level==200));
    }
    #[test]
    fn waiting_room_blocks_combat_and_leaving_preserves_battle_resources() {
        let mut g=fixture();g.actors.get_mut(&1).unwrap().hp=400.0;
        g.battlefield_join(1,0).unwrap();g.battlefield_join(2,1).unwrap();
        assert_eq!(g.actors[&1].map,WAIT_MAP);assert!(!pvp::can_hit(&g,1,2));
        let hp=g.battlefield.units[&1].hp;assert_eq!(hp,1000.0);
        g.battlefield_deaths();g.battlefield_disconnect(1);assert_eq!(g.battlefield.units[&1].hp,hp);
        g.battlefield_leave(1);assert_eq!(g.actors[&1].map,1);assert_eq!(g.actors[&1].hp,400.0);
        assert_eq!(g.battlefield.units[&1].hp,hp);
        g.battlefield_join(1,0).unwrap();let due=g.battlefield.units[&1].ready_at;
        g.advance_battlefield(due+0.1);assert_eq!(g.actors[&1].map,MAP);assert_eq!(g.actors[&1].hp,hp);
    }
    #[test]
    fn humans_and_sims_respawn_on_increasing_server_deadlines() {
        let mut g=fixture();start(&mut g);
        let sim=g.battlefield.units.values().find(|u|u.kind==1).unwrap().id;
        for id in [1,sim] {
            for delay in [5.0,7.0,10.0,13.0,15.0,17.0,20.0,23.0,25.0,27.0,30.0] {
                let clock=g.battlefield.clock;
                g.actors.get_mut(&id).unwrap().hp=0.0;g.battlefield_deaths();
                let due=g.battlefield.units[&id].respawn_at;assert_eq!(due,clock+delay);
                g.battlefield_deaths();assert_eq!(g.battlefield.units[&id].respawn_at,due);
                g.advance_battlefield(due-0.01);assert_eq!(g.actors[&id].hp,0.0);
                g.advance_battlefield(due);assert!(g.actors[&id].hp>0.0);assert!(!g.battlefield.units[&id].counted);
            }
        }
        assert_eq!(g.battlefield.units[&1].deaths,11);assert_eq!(g.battlefield.units[&sim].deaths,11);
    }
    #[test]
    fn auto_prioritizes_people_and_sims_until_the_preference_is_disabled() {
        let mut g=fixture();start(&mut g);
        let soldier=g.battlefield.units.values().find(|u|u.team==1&&u.kind==1).unwrap().id;
        for a in g.actors.values_mut(){a.x=950.0;a.y=950.0;}
        {let a=g.actors.get_mut(&1).unwrap();a.x=100.0;a.y=100.0;a.farming=true;}
        {let a=g.actors.get_mut(&2).unwrap();a.x=300.0;a.y=100.0;}
        {let a=g.actors.get_mut(&soldier).unwrap();a.x=120.0;a.y=100.0;a.war.as_mut().unwrap().kind=2;}
        assert!(g.actors[&1].war.unwrap().prefer_players);
        g.advance_players(&mut vec![]);assert_eq!(g.actors[&1].target,2);
        g.command(1,Command{seq:1,kind:9,map:MAP,target:0,skill:0,x:0.0,y:0.0}).unwrap();
        assert!(!g.actors[&1].war.unwrap().prefer_players);g.advance_players(&mut vec![]);assert_eq!(g.actors[&1].target,soldier);
        g.actors.get_mut(&2).unwrap().hp=0.0;
        g.command(1,Command{seq:2,kind:9,map:MAP,target:1,skill:0,x:0.0,y:0.0}).unwrap();
        g.advance_players(&mut vec![]);assert_eq!(g.actors[&1].target,soldier);
    }
    #[test]
    fn public_supplies_start_empty_purchase_refresh_does_not_refill_consumed_bottles() {
        let mut g=fixture();start(&mut g);assert_eq!(g.battlefield.units[&1].potions,[0,0]);assert!(!g.battlefield_potion(1,0));
        let clock=g.battlefield.clock;
        let bag=Supplies{match_id:g.battlefield.id,starts:g.battlefield.starts,bought:[BTreeMap::from([(1,20)]),BTreeMap::new()],selected:[1,0]};
        let a=g.actors.get_mut(&1).unwrap();a.base_profile.war_supplies=Some(bag);a.profile.potions.push(Potion{id:1,kind:"life".into(),tier:1,level:1,hp:250.0,mp:0.0,count:0,spent:0});a.base_profile.potions=a.profile.potions.clone();a.hp=100.0;
        g.advance_battlefield(clock);assert_eq!(g.battlefield.units[&1].potions,[20,0]);assert!(g.battlefield_potion(1,0));assert_eq!(g.actors[&1].hp,350.0);
        assert_eq!(g.battlefield.units[&1].potions,[19,0]);g.advance_battlefield(clock+0.1);assert_eq!(g.battlefield.units[&1].potions,[19,0]);assert!(!g.battlefield_potion(1,0));
        g.actors.get_mut(&1).unwrap().base_profile.war_supplies.as_mut().unwrap().bought[0].insert(1,40);g.advance_battlefield(clock+0.4);assert_eq!(g.battlefield.units[&1].potions,[39,0]);
    }
    #[test]
    fn explicit_walk_preserves_auto_and_it_resumes_only_after_the_walk() {
        let mut g=fixture();start(&mut g);
        // Isolate the intended opponent: randomly spawned SIMs may otherwise be closer.
        g.actors.retain(|id,_|*id<=2);g.battlefield.units.retain(|id,_|*id<=2);
        {let a=g.actors.get_mut(&1).unwrap();a.x=100.0;a.y=100.0;a.farming=true;}
        g.command(1,Command{seq:1,kind:2,map:MAP,target:0,skill:0,x:300.0,y:100.0}).unwrap();assert!(g.actors[&1].farming);
        g.advance_players(&mut vec![]);assert!(g.actors[&1].farming);assert_eq!(g.actors[&1].target,0);assert!(g.actors[&1].x>100.0);
        g.actors.get_mut(&2).unwrap().x=350.0;g.actors.get_mut(&2).unwrap().y=100.0;
        for _ in 0..60{g.advance_players(&mut vec![]);}
        assert!(g.actors[&1].farming);assert!(g.actors[&1].move_goal.is_none());assert_eq!(g.actors[&1].target,2);
    }
    #[test]
    fn people_and_sims_enter_and_respawn_on_walkable_points_in_their_camp_radius() {
        let mut g=fixture();start(&mut g);
        let ids:Vec<_>=g.battlefield.units.values().filter(|u|u.kind<2).map(|u|u.id).collect();
        for &id in &ids {
            let a=&g.actors[&id];let center=g.battlefield_camp(g.battlefield.units[&id].team);
            assert!(distance(center.0,center.1,a.x,a.y)<=1000.01);assert!(g.rooms[&MAP].nav.stand(a.x,a.y));
            assert!(!g.rooms[&MAP].nav.path(center.0,center.1,a.x,a.y).is_empty());
        }
        let sim=ids.iter().copied().find(|id|g.battlefield.units[id].kind==1).unwrap();let clock=g.battlefield.clock;
        for id in [1,2,sim]{let a=g.actors.get_mut(&id).unwrap();a.x=500.0;a.y=500.0;a.hp=0.0;a.path=vec![(600.0,600.0)];a.farming=true;}
        g.battlefield_deaths();
        for id in [1,2,sim]{
            let a=&g.actors[&id];let camp=g.battlefield_camp(g.battlefield.units[&id].team);
            assert_eq!((a.x,a.y),g.rooms[&MAP].nav.nearest(camp.0,camp.1));
            assert_eq!(a.hp,0.0);assert!(a.path.is_empty());assert!(!a.farming);
            assert_eq!((g.battlefield.units[&id].x,g.battlefield.units[&id].y),(a.x,a.y));
        }
        g.advance_battlefield(clock+4.99);
        for id in [1,2,sim]{let a=&g.actors[&id];assert_eq!(a.hp,0.0);let camp=g.battlefield_camp(g.battlefield.units[&id].team);assert_eq!((a.x,a.y),g.rooms[&MAP].nav.nearest(camp.0,camp.1));}
        assert!(g.battlefield_snapshot(1).unwrap()["respawnRemaining"].as_f64().unwrap()>0.0);
        g.advance_battlefield(clock+5.01);
        for id in [1,2,sim]{let a=&g.actors[&id];let center=g.battlefield_camp(g.battlefield.units[&id].team);assert!(a.hp>0.0);assert!(distance(center.0,center.1,a.x,a.y)<=1000.01);assert!(g.rooms[&MAP].nav.stand(a.x,a.y));assert_ne!((a.x,a.y),(500.0,500.0));}
    }
    #[test]
    fn camps_override_alignment_pk_and_friendly_fire() {
        let mut g=fixture();start(&mut g);assert!(pvp::can_hit(&g,1,2));
        let ally=g.battlefield.units.values().find(|u|u.team==0&&u.kind==1).unwrap().id;
        g.actors.get_mut(&ally).unwrap().profile.alignment=3;assert!(!pvp::can_hit(&g,1,ally));
        g.actors.get_mut(&2).unwrap().war.as_mut().unwrap().ready=false;assert!(!pvp::can_hit(&g,1,2));
    }
    #[test]
    fn server_resolves_bot_hits_without_any_client_confirmation() {
        let mut g=fixture();start(&mut g);
        let bot=g.battlefield.units.values().find(|u|u.kind==1&&u.team==0).unwrap().id;
        for a in g.actors.values_mut(){a.x=950.0;a.y=950.0;}
        {let a=g.actors.get_mut(&bot).unwrap();a.x=100.0;a.y=100.0;a.target=2;a.skill=80;}
        {let a=g.actors.get_mut(&2).unwrap();a.x=150.0;a.y=100.0;}
        let mut events=vec![];g.advance_players(&mut events);for (m,k,s,t,sk,v,h) in events.drain(..){g.event(m,k,s,t,sk,v,h);}
        for _ in 0..4{g.advance_attacks(&mut events);}
        assert!(g.actors[&2].hp<1000.0);assert!(g.contacts.is_empty());
    }
    #[test]
    fn deaths_score_once_reconnect_keeps_team_points_penalty_and_supplies() {
        let mut g=fixture();start(&mut g);let clock=g.battlefield.clock;
        {let u=g.battlefield.units.get_mut(&2).unwrap();u.last_source=1;u.last_hit=clock;u.deaths=4;}
        g.actors.get_mut(&2).unwrap().hp=0.0;g.battlefield_deaths();g.battlefield_deaths();
        assert_eq!(g.battlefield.score,[150,0]);assert_eq!(g.battlefield.units[&1].player_kills,1);assert_eq!(g.battlefield.units[&1].kills,0);assert_eq!(g.battlefield.units[&2].deaths,5);assert_eq!(g.battlefield.units[&2].respawn_at,clock+15.0);
        g.battlefield.units.get_mut(&1).unwrap().potions=[4,9];g.battlefield.units.get_mut(&1).unwrap().deaths=7;g.battlefield_disconnect(1);let profile=g.actors.remove(&1).unwrap().base_profile;
        g.join(3,"account-a".into(),0,profile).unwrap();g.battlefield_join(3,1).unwrap();
        assert_eq!(g.battlefield.units[&3].team,0);assert_eq!(g.battlefield.units[&3].points,150);assert_eq!(g.battlefield.units[&3].potions,[4,9]);assert_eq!(g.battlefield.units[&3].deaths,7);
        let due=g.battlefield.units[&3].ready_at;g.advance_battlefield(due);g.actors.get_mut(&3).unwrap().hp=0.0;g.battlefield_deaths();assert_eq!(g.battlefield.units[&3].respawn_at,due+23.0);
        assert!(g.battlefield_snapshot(3).unwrap()["units"].as_array().unwrap().iter().any(|u|u["id"]==3&&u["points"]==150));
        assert_eq!(g.outbox.pending.values().map(|g|g.merit).sum::<u32>(),150);assert!(g.outbox.pending.values().all(|g|g.death.is_none()&&g.xp==0&&g.gold==0));
    }
    #[test]
    fn deadline_freezes_combat_and_marshals_spawn_only_once() {
        let mut g=fixture();start(&mut g);let clock=g.battlefield.starts+600.0;
        g.advance_battlefield(clock);g.advance_battlefield(clock+1.0);assert_eq!(g.battlefield.units.values().filter(|u|u.kind==3).count(),2);
        g.advance_battlefield(g.battlefield.ends);assert!(g.battlefield.finished);assert!(!pvp::can_hit(&g,1,2));assert!(g.pending.is_empty());
        g.battlefield_leave(1);assert_eq!(g.actors[&1].map,1);assert!(g.actors[&1].war.is_none());assert_eq!(g.actors[&1].hp,1000.0);
    }
    #[test]
    fn restart_restores_prewar_position_instead_of_stranding_a_player() {
        let mut g=fixture();start(&mut g);g.actors.get_mut(&1).unwrap().hp=0.0;g.battlefield_deaths();g.finalize_deaths();assert!(g.outbox.pending.is_empty());
        g.checkpoint().unwrap();let path=g.outbox.path_for_test();let profile=g.actors[&1].base_profile.clone();
        drop(g);let mut restored=Game::new(path).unwrap();
        let map:MapDefinition=serde_json::from_value(serde_json::json!({"id":1,"level":1,"town":true,"width":1000,"height":1000,"entry":{"x":100,"y":100},"grid":{"kind":"open"},"monsters":[]})).unwrap();
        restored.install(Definitions{battlefield:None,version:1,town:1,maps:vec![map]}).unwrap();restored.join(1,"account-a".into(),0,profile).unwrap();assert_eq!(restored.actors[&1].map,1);assert_eq!(restored.actors[&1].hp,1000.0);assert_eq!(restored.battlefield.id,0);
    }
}
