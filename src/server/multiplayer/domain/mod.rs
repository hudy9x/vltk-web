pub mod battlefield;
mod attacks;
pub mod lifecycle;
pub mod definitions;
mod loot;
mod monsters;
mod movement;
pub(crate) mod speed;
pub mod navigation;
mod projectiles;
type EventData = (u32, u8, u32, u32, u16, f32, u8);
const ATTACK_COOLDOWN: u16 = 65002;
type Death = (u32, u32, u32);
mod combat;
mod status;
mod recovery;
pub mod pvp;
pub mod party;
mod progression;
pub mod support;
pub mod curses;
#[path = "../persistence/outbox.rs"]
pub mod outbox;
use anyhow::{Result, ensure};
use definitions::*;
use navigation::{Navigation, distance};
use outbox::Outbox;
use std::collections::BTreeMap;
#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Rules {
    pub tick_seconds: f32,
    pub monsters_per_map: usize,
    pub respawn_seconds: f32,
    pub aggro_range: f32,
    pub leash_range: f32,
    pub pickup_range: f32,
    pub loot_seconds: f32,
    pub player_respawn_seconds: f32,
    pub max_maps: usize,
    pub max_players: usize,
    pub max_loot_per_map: usize,
}
pub struct Actor {
    pub war: Option<battlefield::Membership>,
    pub death_notice: Option<lifecycle::DeathNotice>,
    pub last_attacker: u32,
    pub last_attacker_name: String,
    pub last_attacker_player: bool,
    pub profile_revision: u64,
    pub name: String,
    pub party_alignment: Option<u8>,
    pub account: String,
    pub slot: u8,
    pub profile: Profile,
    pub base_profile: Profile,
    pub support: support::SupportState,
    pub pvp:pvp::PvpState,
    pub life:u32,
    pub map: u32,
    pub x: f32,
    pub y: f32,
    pub hp: f32,
    pub mp: f32,
    pub cold: f32,
    pub stun: f32,
    pub command_tick: u32,
    pub move_goal: Option<(f32, f32)>,
    pub seq: u32,
    pub farming: bool,
    pub target: u32,
    pub skill: u16,
    pub secondary: Option<(u32,u16)>,
    pub path: Vec<(f32, f32)>,
    cooldowns: BTreeMap<u16, f32>,
    dead: f32,
    pickup: u32,
}
impl Actor {
    fn new(account:String,slot:u8,profile:Profile,map:u32,position:(f32,f32))->Self {
        let (x,y)=position;let skill=profile.skills.first().map_or(0,|s|s.id);
        Self {
                death_notice: None,
                last_attacker: 0,
                last_attacker_name: String::new(),
                last_attacker_player: false,
                profile_revision: 0,
                name: String::new(),
                party_alignment: None,
                account,
                slot,
                map: map,
                x,
                y,
                war: None,
                hp: profile.hp,
                mp: profile.mp,
                base_profile: profile.clone(),
                support: support::SupportState::default(),
                pvp:pvp::PvpState::default(),
                life:1,
                profile,
                cold: 0.0,
                stun: 0.0,
                command_tick: 0,
                move_goal: None,
                seq: 0,
                farming: false,
                target: 0,
                skill,
                secondary: None,
                path: vec![],
                cooldowns: BTreeMap::new(),
                dead: 0.0,
                pickup: 0,
            }
    }
}
pub struct Mob {
    pub curses:BTreeMap<u16,curses::Active>,
    pub life: u32,
    pub id: u32,
    pub def: MonsterDefinition,
    pub x: f32,
    pub y: f32,
    pub home: (f32, f32),
    pub hp: f32,
    pub cold: f32,
    pub stun: f32,
    pub poison: f32,
    pub cold_power: f32,
    hurt: f32,
    poison_elapsed: f32,
    poison_pending: f32,
    pub target: u32,
    pub dir: u8,
    pub moving: bool,
    killer: u32,
    respawn: f32,
    cd: f32,
    poison_damage: f32,
    poison_owner: u32,
    path: Vec<(f32, f32)>,
}
#[derive(Clone, serde::Serialize, serde::Deserialize)]
pub struct Loot {
    #[serde(default)]
    pub public: bool,
    #[serde(default)]
    pub knb: u32,
    #[serde(default)]
    pub grant_id: Option<String>,
    pub owner_slot: u8,
    pub id: u32,
    pub owner: String,
    pub x: f32,
    pub y: f32,
    pub gold: u32,
    ttl: f32,
}
pub struct Room {
    pub definition: MapDefinition,
    pub nav: Navigation,
    pub mobs: Vec<Mob>,
    pub loot: Vec<Loot>,
}
#[derive(Clone)]
pub struct CastVisual {
    pub level: u16,
    pub missiles: u8,
    pub flags: u8,
    pub range: f32,
    pub x: f32,
    pub y: f32,
    pub target_x: f32,
    pub target_y: f32,
}
#[derive(Clone)]
pub struct Event {
    pub tick: u32,
    pub id: u32,
    pub map: u32,
    pub kind: u8,
    pub source: u32,
    pub target: u32,
    pub skill: u16,
    pub value: f32,
    pub cast: Option<CastVisual>,
    pub hit: u8,
}
struct Pending {
    cast_id: u32,
    source: u32,
    map: u32,
    target: u32,
    skill: Skill,
    remaining: f32,
    origin: (f32, f32),
    flight: Option<projectiles::Flight>,
}
pub struct Game {
    pub battlefield: battlefield::Battlefield,
    checkpoints: lifecycle::Checkpoints,
    contacts: BTreeMap<u32, attacks::ContactGate>,
    pub parties: party::Parties,
    pub actors: BTreeMap<u32, Actor>,
    pub rooms: BTreeMap<u32, Room>,
    pub events: Vec<Event>,
    pub rules: Rules,
    pub outbox: Outbox,
    pub tick: u32,
    next: u32,
    pending: Vec<Pending>,
    rng: u64,
}
#[derive(Debug)]
pub struct Command {
    pub seq: u32,
    pub kind: u8,
    pub map: u32,
    pub target: u32,
    pub skill: u16,
    pub x: f32,
    pub y: f32,
}
impl Game {
    pub fn new(path: std::path::PathBuf) -> Result<Self> {
        let checkpoints=lifecycle::Checkpoints::open(path.with_extension("state.json"))?;
        let next=checkpoints.next();
        Ok(Self {
            battlefield: Default::default(),
            checkpoints,
            contacts: BTreeMap::new(),
            parties: party::Parties::default(),
            actors: BTreeMap::new(),
            rooms: BTreeMap::new(),
            events: vec![],
            rules: serde_json::from_str(include_str!("../../../shared/multiplayer/rules.json"))?,
            outbox: Outbox::open(path)?,
            tick: 0,
            next,
            pending: vec![],
            rng: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)?
                .as_nanos() as u64
                | 1,
        })
    }
    pub(crate) fn id(&mut self) -> u32 {
        self.next = self.next.wrapping_add(1).max(1000);
        self.next
    }
    pub fn install(&mut self, definitions: Definitions) -> Result<()> {
        ensure!(
            definitions.version == 1
                && definitions.maps.len() <= self.rules.max_maps
                && definitions
                    .maps
                    .iter()
                    .any(|m| m.id == definitions.town && m.town),
            "invalid definitions"
        );
        if !self.rooms.is_empty() {
            return Ok(());
        }
        self.battlefield.definition = definitions.battlefield;
        let mut rooms = BTreeMap::new();
        for map in definitions.maps {
            ensure!(map.level > 0, "invalid monster level band");
            let nav = Navigation::new(&map)?;
            let entry = nav.nearest(map.entry.x, map.entry.y);
            ensure!(nav.stand(entry.0, entry.1), "map has no usable spawn");
            let mut mobs = vec![];
            if !map.town && !map.monsters.is_empty() {
                for i in 0..self.rules.monsters_per_map {
                    let angle = i as f32 * 2.399963;
                    let radius = if i < 6 {
                        130.0 + i as f32 * 35.0
                    } else {
                        400.0 + i as f32 * 38.0
                    };
                    let (x, y) = nav.nearest(
                        (map.entry.x + angle.cos() * radius).clamp(24.0, map.width - 24.0),
                        (map.entry.y + angle.sin() * radius).clamp(34.0, map.height - 24.0),
                    );
                    let def = map.monsters[i % map.monsters.len()].clone();
                    mobs.push(Mob {
                        curses:Default::default(),
                        life: 0,
                        id: self.id(),
                        hp: def.hp,
                        def,
                        x,
                        y,
                        home: (x, y),
                        cold: 0.0,
                        stun: 0.0,
                        poison: 0.0,
                        cold_power: 0.0,
                        hurt: 0.0,
                        poison_elapsed: 0.0,
                        poison_pending: 0.0,
                        poison_damage: 0.0,
                        poison_owner: 0,
                        target: 0,
                        dir: 0,
                        moving: false,
                        killer: 0,
                        respawn: 0.0,
                        cd: 1.0,
                        path: vec![],
                    });
                }
            }
            ensure!(
                rooms
                    .insert(
                        map.id,
                        Room {
                            definition: map,
                            nav,
                            mobs,
                            loot: vec![]
                        }
                    )
                    .is_none(),
                "duplicate map"
            );
        }
        self.rooms = rooms;
        self.restore_drops();
        Ok(())
    }
    pub fn join(&mut self, id: u32, account: String, slot: u8, mut profile: Profile) -> Result<()> {
        recovery::reconcile(&mut profile,&self.outbox,&account,slot);
        ensure!(
            self.actors.values().filter(|a|a.war.is_none_or(|w|w.kind==0)).count() < self.rules.max_players
                && (1..=200).contains(&profile.level)
                && profile.hp.is_finite()
                && profile.hp > 0.0
                && profile.speed.is_finite()
                && profile.speed > 0.0,
            "invalid profile"
        );
        let room = self
            .rooms
            .values()
            .find(|r| r.definition.town)
            .ok_or_else(|| anyhow::anyhow!("catalog not ready"))?;
        ensure!(
            self.actors
                .values()
                .filter(|a| a.map == room.definition.id && a.war.is_none_or(|w|w.kind==0))
                .count()
                < 32,
            "town full"
        );
        let (x, y) = room
            .nav
            .nearest(room.definition.entry.x, room.definition.entry.y);
        self.actors.insert(
            id,
            Actor::new(account, slot, profile, room.definition.id, (x,y)),
        );
        support::initialize(self.actors.get_mut(&id).unwrap());
        self.restore_actor(id);
        Ok(())
    }
    pub fn command(&mut self, id: u32, c: Command) -> Result<()> {
        let a = self
            .actors
            .get_mut(&id)
            .ok_or_else(|| anyhow::anyhow!("unknown actor"))?;
        if (c.seq.wrapping_sub(a.seq) as i32) <= 0 {
            return Ok(());
        }
        a.seq = c.seq;
        if c.kind==19 { if c.target>1||c.map!=a.map{return Ok(());}if let Err(error)=self.battlefield_join(id,c.target as u8){eprintln!("battlefield admission: {error}");}return Ok(()); }
        if c.kind==20 {self.battlefield_leave(id);return Ok(());}
        if a.war.is_some() {
            if c.kind==1||c.kind==17||c.kind==10||(12..=15).contains(&c.kind){return Ok(());}
            if self.battlefield.finished||a.war.is_some_and(|w|!w.ready){return Ok(());}
        }
        if c.kind==18 {
            if c.map!=a.map||a.hp<=0.0||!a.profile.skills.iter().any(|s|s.id==c.skill){return Ok(());}
            let room=self.rooms.get(&a.map).unwrap();
            if room.definition.town{return Ok(());}
            let valid=room.mobs.iter().any(|m|m.id==c.target&&m.hp>0.0)||pvp::can_hit(self,id,c.target);
            if valid{let a=self.actors.get_mut(&id).unwrap();a.secondary=Some((c.target,c.skill));a.pickup=0;a.path.clear();a.move_goal=None;}
            return Ok(());
        }
        if c.kind == 17 { return self.return_to_town(id,c.map); }
        if c.kind == 16 {
            self.confirm_contact(id, &c);
            return Ok(());
        }
        if (12..=15).contains(&c.kind) {
            self.party_command(id, &c);
            return Ok(());
        }
        if c.kind==10 {
            if c.map==a.map&&c.target<=1{a.pvp.enabled=c.target==1;a.target=0;a.pickup=0;a.path.clear();a.move_goal=None;}
            return Ok(());
        }
        if c.kind==11 {
            if c.map==a.map&&pvp::can_hit(self,id,c.target){
                let a=self.actors.get_mut(&id).unwrap();
                if !a.profile.skills.iter().any(|s|s.id==c.skill){return Ok(());}
                a.secondary=None;
                a.skill=c.skill;
                a.target=c.target;a.pickup=0;a.path.clear();a.move_goal=None;
            }
            return Ok(());
        }
        if c.kind==9 {
            if c.map==a.map&&c.target<=1&&c.skill==0&&a.war.is_some(){
                a.war.as_mut().unwrap().prefer_players=c.target==1;
                if a.farming{a.target=0;a.secondary=None;a.path.clear();}
                return Ok(());
            }
            if c.map==a.map&&c.target<=1{
                if let Some(catalog)=a.base_profile.support.as_mut(){
                    if let Some(s)=catalog.skills.iter_mut().find(|s|s.id==c.skill&&!s.aura){s.enabled=c.target==1;}
                }
            }
            return Ok(());
        }
        if c.kind == 8 {
            if c.map==a.map{if a.profile.skills.iter().any(|s|s.id==c.skill&&s.curse.is_some()){self.cast_curse(id,c.skill,c.target,false);}else{self.cast_support(id,c.skill);}}
            return Ok(());
        }
        if c.kind == 7 {
            if c.map != a.map { return Ok(()); }
            return self.consume_potion(id,c.skill);
        }
        // CAST with no target selects a learned skill. It must not cancel an
        // existing path, target or Auto, nor reset the movement replay clock.
        if c.kind == 4 && c.target == 0 {
            if c.map == a.map && a.profile.skills.iter().any(|s| s.id == c.skill) {
                a.skill = c.skill;
            }
            return Ok(());
        }
        a.command_tick = self.tick;
        a.move_goal = None;
        if c.kind == 1 {
            if c.map==battlefield::MAP||c.map==battlefield::WAIT_MAP{return Ok(());}
            if a.hp<=0.0 {return Ok(());}
            let room = self
                .rooms
                .get(&c.map)
                .ok_or_else(|| anyhow::anyhow!("unavailable map"))?;
            // Map.level is the monster level band, not an entry requirement.
            // Match the client's travel policy: any available map can be selected.
            if self
                .actors
                .iter()
                .filter(|(other_id, p)| **other_id != id && p.map == c.map)
                .count()
                >= 32
            {
                return Ok(());
            }
            let a = self.actors.get_mut(&id).unwrap();
            a.secondary=None;
            a.map = c.map;
            (a.x, a.y) = room
                .nav
                .nearest(room.definition.entry.x, room.definition.entry.y);
            a.path.clear();
            a.target = 0;
            a.pickup = 0;
            return Ok(());
        }
        if c.map != a.map || a.hp <= 0.0 {
            return Ok(());
        }
        let room = self.rooms.get(&a.map).unwrap();
        match c.kind {
            2 => {
                a.secondary=None;
                a.support.lock=0.0; // Mouse movement interrupts the support cast pose.
                self.pending
                    .retain(|p| p.source != id || p.remaining <= p.skill.travel);
                a.path = room.nav.path(a.x, a.y, c.x, c.y);
                if !a.path.is_empty() || distance(a.x, a.y, c.x, c.y) < 0.1 {
                    a.move_goal = Some((c.x, c.y));
                }
                a.target = 0;
                a.pickup = 0;
            }
            3 | 4 => {
                if c.kind==3{a.secondary=None;}
                if a.profile.skills.iter().any(|s| s.id == c.skill) {
                    a.skill = c.skill;
                }
                a.target = c.target;
                a.pickup = 0;
                a.path.clear();
            }
            5 => {
                if a.profile.skills.iter().any(|s| s.id == c.skill) {
                    a.skill = c.skill;
                }
                a.farming = c.target != 0;
                if !a.farming {
                    a.secondary=None;
                    a.target = 0;
                    a.path.clear();
                }
            }
            6 => {
                if let Some(drop) = room
                    .loot
                    .iter()
                    .find(|l| l.id == c.target && (l.public || l.knb>0 || l.owner == a.account && l.owner_slot == a.slot))
                {
                    a.pickup = drop.id;
                    a.target = 0;
                    a.path = room.nav.path(a.x, a.y, drop.x, drop.y);
                }
            }
            _ => anyhow::bail!("unknown command"),
        }
        Ok(())
    }
    fn event(&mut self, map: u32, kind: u8, source: u32, target: u32, skill: u16, value: f32, hit: u8) {
        let id = self.id();
        if kind == 1 && map != battlefield::MAP {
            if let Some(p) = self.pending.iter_mut().rev().find(|p| p.cast_id == 0 && p.source == source && p.skill.id == skill && p.map == map) {
                p.cast_id = id;
                self.contacts.insert(id, attacks::ContactGate::new(source, map, p.skill.clone(), self.tick));
            }
        }
        let cast = if kind == 1 {
            self.actors.get(&source).and_then(|a| {
                a.profile
                    .skills
                    .iter()
                    .find(|s| s.id == skill)
                    .and_then(|s| {
                        self.rooms.get(&map)?.mobs.iter().find(|m|m.id==target).map(|m|(m.x,m.y))
                            .or_else(||self.actors.get(&target).filter(|p|p.map==map).map(|p|(p.x,p.y)))
                            .map(|(target_x,target_y)| CastVisual {
                                level: s.level,
                                missiles: s.missiles,
                                flags: u8::from(s.melee) | (u8::from(s.phys) << 1),
                                range: s.range,
                                x: a.x,
                                y: a.y,
                                target_x,
                                target_y,
                            })
                    })
            })
        } else {
            None
        };
        if crate::diagnostics::enabled() && (kind==1||kind==2) {
            let actor=self.actors.get(&source);
            let ability=actor.and_then(|a|a.profile.skills.iter().find(|s|s.id==skill));
            crate::diagnostics::log(if kind==1{"cast-generated"}else{"hit-generated"},serde_json::json!({
                "event":id,"tick":self.tick,"map":map,"source":source,"target":target,"skill":skill,"value":value,"hit":hit,
                "cast":cast.as_ref().map(|c|serde_json::json!({"level":c.level,"missiles":c.missiles,"flags":c.flags,"x":c.x,"y":c.y,"targetX":c.target_x,"targetY":c.target_y})),
                "parts":ability.map(|s|s.parts),"mana":actor.map(|a|a.mp),
            }));
        }
        self.events.push(Event {
            tick: self.tick,
            id,
            map,
            kind,
            source,
            target,
            skill,
            value,
            cast,
            hit,
        });
        if self.events.len() > 512 {
            self.events.remove(0);
        }
    }
    pub fn step(&mut self) {
        self.tick = self.tick.wrapping_add(1);
        self.events.retain(|e| self.tick.wrapping_sub(e.tick) < 20);
        self.advance_battlefield(battlefield::now());
        let mut events = vec![];
        self.advance_pvp_status(&mut events);
        self.advance_curses(&mut events);
        self.advance_support(&mut events);
        self.advance_players(&mut events);
        // Freeze CAST anchors before monsters move; the renderer and server ray
        // must use the same release direction, even when the target runs away.
        for (map, kind, source, target, skill, value, hit) in events.drain(..) {
            self.event(map, kind, source, target, skill, value, hit);
        }
        self.advance_attacks(&mut events);
        self.resolve_contacts(&mut events);
        let deaths = self.advance_monsters(&mut events);
        self.battlefield_deaths();
        self.finalize_deaths();
        self.commit_rewards(&mut events, deaths);
        for (map, kind, source, target, skill, value, hit) in events {
            self.event(map, kind, source, target, skill, value, hit);
        }
        if self.tick.is_multiple_of(20) {if let Err(error)=self.checkpoint(){eprintln!("world checkpoint: {error}");}}
    }
}
fn chance(rng: &mut u64, percent: f32) -> bool {
    *rng ^= *rng << 13;
    *rng ^= *rng >> 7;
    *rng ^= *rng << 17;
    ((*rng % 10000) as f32) < percent.clamp(0.0, 100.0) * 100.0
}
pub fn direction(dx: f32, dy: f32) -> u8 {
    let angle = (-dx).atan2(dy);
    ((angle / std::f32::consts::FRAC_PI_4).round() as i32).rem_euclid(8) as u8
}

#[cfg(test)]
mod tests;
