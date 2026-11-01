//! GM-created entities execute ordinary online combat, navigation and recovery.
use super::*;
use serde::Deserialize;
#[derive(Clone)]
pub struct Unit {pub attack_players:bool,pub attack_monsters:bool,pub owner:u32,pub faction:String,pub sex:u8,pub name:String,pub appearance:Option<battlefield::SimAppearance>,pub skill:u16}
#[derive(Default)]
pub struct Training {pub owners:BTreeMap<u32,(String,u8)>,pub units:BTreeMap<u32,Unit>,pub pinned:BTreeMap<u32,u32>,pub mobs:BTreeMap<u32,(u32,bool)>}
fn default_farm()->bool{true}
#[derive(Deserialize)]
#[serde(rename_all="camelCase")]
pub struct Request {#[serde(default)]pub attack_players:bool,#[serde(default="default_farm")]pub attack_monsters:bool,pub account:String,pub slot:u8,pub action:String,#[serde(default)]pub profile:Option<Profile>,#[serde(default)]pub monster:Option<MonsterDefinition>,#[serde(default)]pub faction:String,#[serde(default)]pub sex:u8,#[serde(default)]pub name:String,#[serde(default)]pub appearance:Option<battlefield::SimAppearance>,#[serde(default)]pub skill:u16}
impl Game {
 pub fn training_command(&mut self,r:Request)->Result<u32>{
  let owner=*self.actors.iter().find(|(_,a)|a.account==r.account&&a.slot==r.slot&&a.test_owner.is_none()).map(|(id,_)|id).ok_or_else(||anyhow::anyhow!("Hãy kết nối online trước."))?;
  self.training.owners.insert(owner,(r.account.clone(),r.slot));
  if r.action=="clearSims"{let ids:Vec<_>=self.training.units.iter().filter(|(_,u)|u.owner==owner).map(|(&id,_)|id).collect();for id in ids{self.actors.remove(&id);self.training.units.remove(&id);self.pending.retain(|p|p.source!=id);}return Ok(owner);}
  if r.action=="simMode"{
   let ids:Vec<_>=self.training.units.iter().filter(|(_,u)|u.owner==owner).map(|(&id,_)|id).collect();
   for id in ids{let u=self.training.units.get_mut(&id).unwrap();u.attack_players=r.attack_players;u.attack_monsters=r.attack_monsters;
    if let Some(a)=self.actors.get_mut(&id){a.pvp.enabled=r.attack_players;a.farming=r.attack_monsters;a.target=0;a.path.clear();a.move_goal=None;a.secondary=None;a.pickup=0;}
    self.pending.retain(|p|p.source!=id);
   }return Ok(owner);
  }
  if r.action=="finish"{self.training.pinned.remove(&owner);return Ok(owner);}
  let a=&self.actors[&owner];ensure!(a.war.is_none()&&a.hp>0.0,"Không dùng trong Tống Kim hoặc khi chết.");let map=a.map;
  ensure!(!self.rooms[&map].definition.town,"Hãy ra bãi luyện công trước.");
  if r.action=="pin"{self.training.pinned.insert(owner,map);return Ok(owner);}
  let origin=self.rooms[&map].nav.nearest(a.x+90.0,a.y+45.0);
  if r.action=="sim"{
   ensure!(self.actors.values().filter(|a|a.map==map&&a.test_owner!=Some(owner)).count()<280,"Map đã đủ nhân vật.");
   let profile=r.profile.ok_or_else(||anyhow::anyhow!("Missing SIM profile"))?;
   let old:Vec<_>=self.training.units.iter().filter(|(_,u)|u.owner==owner).map(|(&id,_)|id).collect();
   for id in old{self.actors.remove(&id);self.training.units.remove(&id);self.pending.retain(|p|p.source!=id);}
   let id=self.id();
   let mut a=Actor::new(format!("test-sim:{owner}:{id}"),0,profile,map,origin);a.test_owner=Some(owner);a.name=r.name.clone();a.skill=r.skill;a.farming=r.attack_monsters;a.pvp.enabled=r.attack_players;support::initialize(&mut a);
   self.training.pinned.insert(owner,map);
   self.actors.insert(id,a);self.training.units.insert(id,Unit{attack_players:r.attack_players,attack_monsters:r.attack_monsters,owner,faction:r.faction,sex:r.sex,name:r.name,appearance:r.appearance,skill:r.skill});return Ok(id);
  }
  ensure!(r.action=="monster"||r.action=="dummy","Unknown training action");
  let def=r.monster.ok_or_else(||anyhow::anyhow!("Missing monster"))?;
  let dummy=r.action=="dummy";ensure!(def.id==if dummy{999001}else{602},"Wrong monster");
  let old:Vec<_>=self.training.mobs.iter().filter(|(_,v)|!dummy&&v.0==owner&&!v.1).map(|(&id,_)|id).collect();
  for id in old{for room in self.rooms.values_mut(){room.mobs.retain(|m|m.id!=id);}self.training.mobs.remove(&id);}
  ensure!(self.rooms[&map].mobs.len()<64,"Map đã đủ mục tiêu test.");
  let origin=if dummy{let a=&self.actors[&owner];(a.x,a.y)}else{origin};
  let id=self.id();let hp=def.hp;
  self.rooms.get_mut(&map).unwrap().mobs.push(Mob{curses:BTreeMap::new(),life:1,id,def,x:origin.0,y:origin.1,home:origin,hp,cold:0.0,stun:0.0,poison:0.0,cold_power:0.0,hurt:0.0,poison_elapsed:0.0,poison_pending:0.0,target:0,dir:0,moving:false,killer:0,respawn:0.0,cd:1.0,poison_damage:0.0,poison_owner:0,path:vec![]});
  self.training.mobs.insert(id,(owner,dummy));self.training.pinned.insert(owner,map);Ok(id)
 }
 pub(super) fn advance_training(&mut self){
  let offline:Vec<_>=self.training.units.iter().filter(|(_,u)|!self.actors.contains_key(&u.owner)).map(|(&id,_)|id).collect();
  for id in offline{if let Some(a)=self.actors.get_mut(&id){a.farming=false;a.pvp.enabled=false;a.target=0;a.path.clear();a.move_goal=None;}self.pending.retain(|p|p.source!=id);}
  let potions:Vec<_>=self.training.units.iter().filter_map(|(&id,u)|{
   let a=self.actors.get(&id)?;if !self.actors.contains_key(&u.owner)||a.hp<=0.0||a.mp>=a.profile.mp*0.5{return None;}
   a.profile.potions.iter().filter(|p|p.mp>0.0&&p.hp==0.0&&p.count>0&&p.level<=a.profile.level).max_by(|p,q|p.mp.total_cmp(&q.mp)).map(|p|(id,p.id))
  }).collect();
  for (id,potion) in potions{let _=self.consume_potion(id,potion);}
  let peers=pvp::peers(self);
  for (&id,u) in &self.training.units {if !self.actors.contains_key(&u.owner){continue;}if let Some(a)=self.actors.get_mut(&id){
   a.skill=if a.profile.skills.iter().any(|s|s.id==u.skill&&s.cost<=a.mp){u.skill}else{0};
   a.pvp.enabled=u.attack_players;
   let human=if u.attack_players{peers.iter().filter(|p|pvp::hostile(id,a,p,false)&&distance(a.x,a.y,p.x,p.y)<self.rules.leash_range).min_by(|x,y|distance(a.x,a.y,x.x,x.y).total_cmp(&distance(a.x,a.y,y.x,y.y))).map(|p|p.id)}else{None};
   if let Some(target)=human {if a.target!=target{a.path.clear();}a.target=target;a.farming=false;}
   else if u.attack_monsters {if peers.iter().any(|p|p.id==a.target){a.target=0;a.path.clear();}a.farming=true;}
   else {a.farming=false;a.target=0;a.path.clear();a.move_goal=None;a.secondary=None;a.pickup=0;}
  }}
 }
 pub(super) fn reconnect_training(&mut self,id:u32){
  let Some(a)=self.actors.get(&id) else{return;};let identity=(a.account.clone(),a.slot);
  let old:Vec<_>=self.training.owners.iter().filter(|(old,v)|**old!=id&&**v==identity).map(|(&id,_)|id).collect();
  for previous in old{
   if let Some(map)=self.training.pinned.remove(&previous){self.training.pinned.insert(id,map);}
   for (&sim,u) in &mut self.training.units{if u.owner==previous{u.owner=id;if let Some(a)=self.actors.get_mut(&sim){a.test_owner=Some(id);}}}
   for v in self.training.mobs.values_mut(){if v.0==previous{v.0=id;}}
   self.training.owners.remove(&previous);self.training.owners.insert(id,identity.clone());
  }
 }
 pub fn training_snapshot(&self,id:u32)->Option<serde_json::Value>{let a=self.actors.get(&id)?;
  let units:Vec<_>=self.training.units.iter().filter_map(|(&id,u)|{let p=self.actors.get(&id)?;if p.map!=a.map{return None;}Some(serde_json::json!({"id":id,"owner":u.owner,"attackPlayers":u.attack_players,"attackMonsters":u.attack_monsters,"name":u.name,"faction":u.faction,"sex":u.sex,"appearance":u.appearance,"kind":1,"team":1,"points":0,"ready":true,"online":true,"moving":!p.path.is_empty(),"training":true}))}).collect();
  if units.is_empty()&&!self.training.pinned.contains_key(&id){None}else{Some(serde_json::json!({"units":units,"pinned":self.training.pinned.contains_key(&id)}))}
 }
 pub(super) fn training_respawn(&mut self){for (&id,a) in &mut self.actors{if a.hp<=0.0&&(self.training.pinned.contains_key(&id)||a.test_owner.is_some()){
  a.hp=a.profile.hp;a.mp=a.profile.mp;a.life=a.life.wrapping_add(1);a.dead=0.0;a.death_notice=None;a.cold=0.0;a.stun=0.0;a.pvp=pvp::PvpState::default();a.support.curses.clear();a.path.clear();a.target=0;a.move_goal=None;a.cooldowns.clear();a.secondary=None;
 }}}
}
