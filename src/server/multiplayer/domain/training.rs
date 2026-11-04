//! Companion actors share online combat; only explicit test actions pin or revive their owner.
use super::*;
use serde::{Deserialize, Serialize};
pub const MAX_COMPANIONS: usize = 3;
#[derive(Clone, Serialize, Deserialize)]
pub struct Unit {
 pub account:String, pub slot:u8, pub number:u8,
 pub follow_owner:bool, pub auto_accept_party:bool,
 #[serde(skip)] pub following:bool,
 #[serde(skip)] pub owner:u32,
 pub attack_players:bool, pub attack_monsters:bool,
 pub faction:String, pub sex:u8, pub name:String,
 pub appearance:Option<battlefield::SimAppearance>, pub skill:u16,
}
#[derive(Clone, Serialize, Deserialize)]
pub struct SavedCompanion {
 pub unit:Unit, pub profile:Profile, pub map:u32,
 pub x:f32, pub y:f32, pub hp:f32, pub mp:f32, pub life:u32,
}
#[derive(Default)]
pub struct Training {pub owners:BTreeMap<u32,(String,u8)>,pub units:BTreeMap<u32,Unit>,pub pinned:BTreeMap<u32,u32>,pub mobs:BTreeMap<u32,(u32,bool)>}
fn default_farm()->bool{true}
#[derive(Deserialize)]
#[serde(rename_all="camelCase")]
pub struct Request {
 #[serde(default)] pub sim_id:Option<u32>,
 #[serde(default)] pub follow_owner:bool,
 #[serde(default)] pub auto_accept_party:bool,
 #[serde(default)] pub attack_players:bool,
 #[serde(default="default_farm")] pub attack_monsters:bool,
 pub account:String,pub slot:u8,pub action:String,
 #[serde(default)] pub profile:Option<Profile>,
 #[serde(default)] pub monster:Option<MonsterDefinition>,
 #[serde(default)] pub faction:String,#[serde(default)] pub sex:u8,
 #[serde(default)] pub name:String,
 #[serde(default)] pub appearance:Option<battlefield::SimAppearance>,
 #[serde(default)] pub skill:u16,
}
impl Game {
 /// Remove runtime references. Callers checkpoint permanent changes separately.
 fn remove_companion(&mut self,id:u32) {
  self.party_leave(id);
  self.actors.remove(&id);self.training.units.remove(&id);
  self.pending.retain(|p|p.source!=id);
 }
 /// Owner disconnection pauses companions outside combat; their last checkpoint remains durable.
 pub fn suspend_companions(&mut self,owner:u32) {
  let ids:Vec<_>=self.training.units.iter().filter(|(_,u)|u.owner==owner).map(|(&id,_)|id).collect();
  for id in ids {self.remove_companion(id);}
 }
 pub fn companion_list(&self,account:&str,slot:u8)->Vec<serde_json::Value> {
  let mut units:Vec<_>=self.training.units.iter().filter_map(|(&id,u)|{
   if u.account!=account || u.slot!=slot {return None;}
   let a=self.actors.get(&id)?;
   Some(serde_json::json!({"id":id,"number":u.number,"name":u.name,"faction":u.faction,"skill":u.skill,
    "map":a.map,"hp":a.hp,"maxHp":a.profile.hp,"mp":a.mp,"maxMp":a.profile.mp,
    "followOwner":u.follow_owner,"autoAcceptParty":u.auto_accept_party,
    "attackPlayers":u.attack_players,"attackMonsters":u.attack_monsters}))
  }).collect();
  units.sort_by_key(|u|u["number"].as_u64());units
 }
 pub(super) fn restore_companions(&mut self,owner:u32) {
  let a=&self.actors[&owner];let account=a.account.clone();let slot=a.slot;let owner_map=a.map;
  if self.training.units.values().any(|u|u.account==account&&u.slot==slot){return;}
  for saved in self.checkpoints.companions(&account,slot).into_iter().take(MAX_COMPANIONS) {
   if saved.hp<=0.0 {continue;}
   let id=self.id();let map=if self.rooms.contains_key(&saved.map){saved.map}else{owner_map};
   let position=self.rooms[&map].nav.nearest(saved.x,saved.y);
   let mut unit=saved.unit;unit.owner=owner;unit.following=false;
   let mut a=Actor::new(format!("sim:{}:{}:{}",account,slot,unit.number),0,saved.profile,map,position);
   a.test_owner=Some(owner);a.name=unit.name.clone();a.skill=unit.skill;
   a.hp=saved.hp.min(a.profile.hp);a.mp=saved.mp.clamp(0.0,a.profile.mp);a.life=saved.life.max(1);
   a.farming=unit.attack_monsters;a.pvp.enabled=unit.attack_players;support::initialize(&mut a);
   self.actors.insert(id,a);self.training.units.insert(id,unit);
  }
 }
 pub fn training_command(&mut self,r:Request)->Result<u32>{
  let owner=*self.actors.iter().find(|(_,a)|a.account==r.account&&a.slot==r.slot&&a.test_owner.is_none()).map(|(id,_)|id).ok_or_else(||anyhow::anyhow!("Hãy kết nối online trước."))?;
  self.training.owners.insert(owner,(r.account.clone(),r.slot));
  if r.action=="clearSims" || r.action=="removeSim" {
   let ids:Vec<_>=if r.action=="removeSim" {
    let id=r.sim_id.ok_or_else(||anyhow::anyhow!("Hãy chọn SIM cần xóa."))?;
    ensure!(self.training.units.get(&id).is_some_and(|u|u.owner==owner),"SIM không thuộc nhân vật này hoặc đã bị xóa.");vec![id]
   }else{self.training.units.iter().filter(|(_,u)|u.owner==owner).map(|(&id,_)|id).collect()};
   for id in ids {self.remove_companion(id);}
   self.checkpoint()?;return Ok(owner);
  }
  if r.action=="simMode" {
   let id=r.sim_id.ok_or_else(||anyhow::anyhow!("Hãy chọn SIM cần điều chỉnh."))?;
   let u=self.training.units.get_mut(&id).filter(|u|u.owner==owner).ok_or_else(||anyhow::anyhow!("SIM không thuộc nhân vật này hoặc đã bị xóa."))?;
   u.attack_players=r.attack_players;u.attack_monsters=r.attack_monsters;
   u.follow_owner=r.follow_owner;u.auto_accept_party=r.auto_accept_party;u.following=false;
   if let Some(a)=self.actors.get_mut(&id){a.pvp.enabled=r.attack_players;a.farming=r.attack_monsters;a.target=0;a.path.clear();a.move_goal=None;a.secondary=None;a.pickup=0;}
   self.pending.retain(|p|p.source!=id);self.checkpoint()?;return Ok(id);
  }
  if r.action=="finish"{self.training.pinned.remove(&owner);return Ok(owner);}
  let a=&self.actors[&owner];ensure!(a.war.is_none()&&a.hp>0.0,"Không dùng trong Tống Kim hoặc khi chết.");let map=a.map;
  ensure!(!self.rooms[&map].definition.town,"Hãy ra bãi luyện công trước.");
  if r.action=="pin"{self.training.pinned.insert(owner,map);return Ok(owner);}
  let origin=self.rooms[&map].nav.nearest(a.x+90.0,a.y+45.0);
  if r.action=="sim" {
   let numbers:Vec<_>=self.training.units.values().filter(|u|u.owner==owner).map(|u|u.number).collect();
   ensure!(numbers.len()<MAX_COMPANIONS,"Mỗi nhân vật chỉ được có tối đa 3 SIM.");
   ensure!(self.actors.values().filter(|a|a.map==map).count()<280,"Map đã đủ nhân vật.");
   let number=(1..=MAX_COMPANIONS as u8).find(|n|!numbers.contains(n)).unwrap();
   let profile=r.profile.ok_or_else(||anyhow::anyhow!("Missing SIM profile"))?;
   let id=self.id();let name=format!("SIM#{number}");
   let mut a=Actor::new(format!("sim:{}:{}:{}",r.account,r.slot,number),0,profile,map,origin);
   a.test_owner=Some(owner);a.name=name.clone();a.skill=r.skill;a.farming=r.attack_monsters;a.pvp.enabled=r.attack_players;support::initialize(&mut a);
   self.actors.insert(id,a);
   self.training.units.insert(id,Unit {account:r.account,slot:r.slot,number,follow_owner:r.follow_owner,auto_accept_party:r.auto_accept_party,following:false,attack_players:r.attack_players,attack_monsters:r.attack_monsters,owner,faction:r.faction,sex:r.sex,name,appearance:r.appearance,skill:r.skill});
   if let Err(error)=self.checkpoint(){self.remove_companion(id);return Err(error);}
   return Ok(id);
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
  self.accept_training_invitations();
  let offline:Vec<_>=self.training.units.iter().filter(|(_,u)|!self.actors.contains_key(&u.owner)).map(|(&id,_)|id).collect();
  if !offline.is_empty() {
   if let Err(error)=self.checkpoint(){eprintln!("companion disconnect checkpoint: {error}");}
   for id in offline {self.remove_companion(id);}
  }
  let potions:Vec<_>=self.training.units.iter().filter_map(|(&id,u)|{
   let a=self.actors.get(&id)?;if !self.actors.contains_key(&u.owner)||a.hp<=0.0||a.mp>=a.profile.mp*0.5{return None;}
   a.profile.potions.iter().filter(|p|p.mp>0.0&&p.hp==0.0&&p.count>0&&p.level<=a.profile.level).max_by(|p,q|p.mp.total_cmp(&q.mp)).map(|p|(id,p.id))
  }).collect();
  for (id,potion) in potions{let _=self.consume_potion(id,potion);}
  let peers=pvp::peers(self);
  for (&id,u) in &mut self.training.units {
   let Some(owner)=peers.iter().find(|p|p.id==u.owner) else{continue;};
   if let Some(a)=self.actors.get_mut(&id){
   if u.follow_owner && a.map!=owner.map && owner.war.is_none() {
    let nav=&self.rooms[&owner.map].nav;
    a.map=owner.map;(a.x,a.y)=nav.nearest(owner.x+60.0+u.number as f32*20.0,owner.y+30.0);
    a.target=0;a.secondary=None;a.path.clear();a.move_goal=None;a.pickup=0;u.following=false;
    self.pending.retain(|p|p.source!=id);
   }
   if owner.war.is_some() || a.hp<=0.0 {
    a.farming=false;a.target=0;a.secondary=None;a.path.clear();a.move_goal=None;u.following=false;
    self.pending.retain(|p|p.source!=id);continue;
   }
   let gap=distance(a.x,a.y,owner.x,owner.y);
   let following=u.follow_owner && a.map==owner.map && gap>if u.following{72.0}else{180.0};
   if following {
    let nav=&self.rooms[&a.map].nav;
    if !u.following || a.path.is_empty() || self.tick.is_multiple_of(10) {
     let goal=nav.nearest(owner.x+(a.x-owner.x)/gap*60.0,owner.y+(a.y-owner.y)/gap*60.0);
     a.path=nav.path(a.x,a.y,goal.0,goal.1);a.move_goal=Some(goal);
    }
    if a.stun>0.0 || a.support.lock>0.0 || a.pvp.hurt>0.0 {a.path.clear();}
    a.farming=false;a.target=0;a.secondary=None;a.pickup=0;u.following=true;
    self.pending.retain(|p|p.source!=id);continue;
   }
   if u.following {a.path.clear();a.move_goal=None;u.following=false;}

   a.skill=if a.profile.skills.iter().any(|s|s.id==u.skill&&s.cost<=a.mp){u.skill}else{0};
   let town=self.rooms[&a.map].definition.town;
   a.pvp.enabled=u.attack_players&&!town;
   let human=if u.attack_players{peers.iter().filter(|p|pvp::hostile(id,a,p,town)&&distance(a.x,a.y,p.x,p.y)<self.rules.leash_range).min_by(|x,y|distance(a.x,a.y,x.x,x.y).total_cmp(&distance(a.x,a.y,y.x,y.y))).map(|p|p.id)}else{None};
   if let Some(target)=human {if a.target!=target{a.path.clear();}a.target=target;a.farming=false;}
   else if u.attack_monsters && !town {if peers.iter().any(|p|p.id==a.target){a.target=0;a.path.clear();}a.farming=true;}
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
   self.training.owners.remove(&previous);
  }
  self.training.owners.insert(id,identity);
  self.restore_companions(id);
 }
 pub fn training_snapshot(&self,id:u32)->Option<serde_json::Value>{let a=self.actors.get(&id)?;
  let units:Vec<_>=self.training.units.iter().filter_map(|(&id,u)|{let p=self.actors.get(&id)?;if p.map!=a.map{return None;}Some(serde_json::json!({"id":id,"number":u.number,"owner":u.owner,"followOwner":u.follow_owner,"autoAcceptParty":u.auto_accept_party,"attackPlayers":u.attack_players,"attackMonsters":u.attack_monsters,"name":u.name,"faction":u.faction,"sex":u.sex,"appearance":u.appearance,"kind":1,"team":1,"points":0,"ready":true,"online":true,"moving":!p.path.is_empty(),"training":true}))}).collect();
  if units.is_empty()&&!self.training.pinned.contains_key(&id){None}else{Some(serde_json::json!({"units":units,"pinned":self.training.pinned.contains_key(&id)}))}
 }
 pub(super) fn remove_dead_companions(&mut self) {
  let dead:Vec<_>=self.training.units.keys().filter(|id|self.actors.get(id).is_some_and(|a|a.hp<=0.0)).copied().collect();
  if dead.is_empty(){return;}
  for id in dead {self.remove_companion(id);}
  if let Err(error)=self.checkpoint(){eprintln!("companion death checkpoint: {error}");}
 }
 pub(super) fn training_respawn(&mut self){for (&id,a) in &mut self.actors{if a.hp<=0.0&&a.test_owner.is_none()&&self.training.pinned.contains_key(&id){
  a.hp=a.profile.hp;a.mp=a.profile.mp;a.life=a.life.wrapping_add(1);a.dead=0.0;a.death_notice=None;a.cold=0.0;a.stun=0.0;a.pvp=pvp::PvpState::default();a.support.curses.clear();a.path.clear();a.target=0;a.move_goal=None;a.cooldowns.clear();a.secondary=None;
 }}}
}
