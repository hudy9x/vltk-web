//! Authoritative reconnect checkpoints, explicit town recovery and durable death drops.
use super::*;
use serde::{Deserialize, Serialize};
use std::{collections::BTreeSet, fs::File, io::Write, path::PathBuf};
#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct DeathNotice {
    pub killer: u32,
    pub name: String,
    pub player: bool,
    pub request: Option<String>,
}
#[derive(Clone, Serialize, Deserialize)]
struct SavedActor {
    map: u32,
    x: f32,
    y: f32,
    hp: f32,
    mp: f32,
    life: u32,
    death: Option<DeathNotice>,
}
#[derive(Default, Serialize, Deserialize)]
struct SavedWorld {
    actors: BTreeMap<String, SavedActor>,
    drops: BTreeMap<u32, Vec<Loot>>,
    completed: BTreeSet<String>,
    next: u32,
}
pub(super) struct Checkpoints {
    path: PathBuf,
    data: SavedWorld,
}
impl Checkpoints {
    pub(super) fn open(path: PathBuf) -> Result<Self> {
        let data = if path.exists() {
            serde_json::from_slice(&std::fs::read(&path)?)?
        } else {
            SavedWorld::default()
        };
        Ok(Self { path, data })
    }
    pub(super) fn next(&self) -> u32 {
        self.data.next.max(1000)
    }
}
impl Game {
    pub fn resume_position(&mut self, id: u32, position: Option<ResumePosition>) {
        let Some(p) = position else {
            return;
        };
        let Some(a) = self.actors.get_mut(&id) else {
            return;
        };
        // A local preview is a bounded continuation of a known server checkpoint.
        if !self
            .checkpoints
            .data
            .actors
            .contains_key(&format!("{}:{}", a.account, a.slot))
            || a.hp <= 0.0
            || a.map != p.map
            || a.life != p.life
            || !p.x.is_finite()
            || !p.y.is_finite()
        {
            return;
        }
        let Some(room) = self.rooms.get(&a.map) else {
            return;
        };
        let allowance = speed::movement(a) * 2.0 + 24.0;
        if distance(a.x, a.y, p.x, p.y) > allowance
            || !room.nav.stand(p.x, p.y)
            || !room.nav.clear(a.x, a.y, p.x, p.y)
        {
            return;
        }
        a.x = p.x;
        a.y = p.y;
        if let Err(error) = self.checkpoint() {
            eprintln!("resume checkpoint: {error}");
        }
    }
    pub fn checkpoint(&mut self) -> Result<()> {
        for a in self.actors.values().filter(|a|a.war.is_none()) {
            self.checkpoints.data.actors.insert(
                format!("{}:{}", a.account, a.slot),
                SavedActor {
                    map: a.map,
                    x: a.x,
                    y: a.y,
                    hp: a.hp,
                    mp: a.mp,
                    life: a.life,
                    death: a.death_notice.clone(),
                },
            );
        }
        for (&id,a) in self.actors.iter().filter(|(_,a)|a.war.is_some_and(|w|w.kind==0)) {
            if let Some(back)=self.battlefield.units.get(&id).and_then(|u|u.return_to.as_ref()) {
                self.checkpoints.data.actors.insert(format!("{}:{}",a.account,a.slot),SavedActor{map:back.map,x:back.x,y:back.y,hp:back.hp,mp:back.mp,life:a.life,death:None});
            }
        }
        for (&map, room) in &self.rooms {
            self.checkpoints.data.drops.insert(
                map,
                room.loot
                    .iter()
                    .filter(|d| d.knb > 0 || d.public)
                    .cloned()
                    .collect(),
            );
        }
        self.checkpoints
            .data
            .completed
            .retain(|id| self.outbox.pending.contains_key(id));
        self.checkpoints.data.next = self.next;
        let temporary = self.checkpoints.path.with_extension("state.tmp");
        let mut file = File::create(&temporary)?;
        file.write_all(&serde_json::to_vec(&self.checkpoints.data)?)?;
        file.sync_all()?;
        std::fs::rename(&temporary, &self.checkpoints.path)?;
        Ok(())
    }
    pub(super) fn restore_actor(&mut self, id: u32) {
        let a = self.actors.get_mut(&id).unwrap();
        if let Some(s) = self
            .checkpoints
            .data
            .actors
            .get(&format!("{}:{}", a.account, a.slot))
        {
            if let Some(room) = self.rooms.get(&s.map) {
                a.map = s.map;
                (a.x, a.y) = room.nav.nearest(s.x, s.y);
                a.hp = s.hp.clamp(0.0, a.profile.hp);
                a.mp = s.mp.clamp(0.0, a.profile.mp);
                a.life = s.life.max(1);
                a.death_notice = s.death.clone();
                if a.hp <= 0.0 {
                    a.dead = self.rules.player_respawn_seconds;
                }
            }
        }
        // A journaled death may precede the last checkpoint if the process crashed.
        for grant in self
            .outbox
            .pending
            .values()
            .filter(|g| g.account == a.account && g.slot == a.slot)
        {
            if let Some(d) = grant.death.as_ref().filter(|d| d.life >= a.life) {
                if let Some(room) = self.rooms.get(&d.map) {
                    a.map = d.map;
                    (a.x, a.y) = room.nav.nearest(d.x, d.y);
                    a.hp = 0.0;
                    a.life = d.life;
                    let mut notice = d.notice.clone();
                    notice.request = Some(grant.id.clone());
                    a.death_notice = Some(notice);
                }
            }
        }
    }
    pub(super) fn restore_drops(&mut self) {
        for (&map, drops) in &self.checkpoints.data.drops {
            if let Some(room) = self.rooms.get_mut(&map) {
                room.loot = drops.clone();
            }
        }
    }
    pub(super) fn finalize_deaths(&mut self) {
        let ids: Vec<_> = self
            .actors
            .iter()
            .filter(|(_, a)| {
                a.war.is_none() && a.hp <= 0.0 && a.death_notice.as_ref().is_none_or(|d| d.request.is_none())
            })
            .map(|(&id, _)| id)
            .collect();
        let mut changed = false;
        for id in ids {
            let a = &self.actors[&id];
            let killer = a.last_attacker;
            let player = a.last_attacker_player || self.actors.contains_key(&killer);
            let name = if !a.last_attacker_name.is_empty() {
                a.last_attacker_name.clone()
            } else {
                self.actors
                    .get(&killer)
                    .map(|a| a.name.clone())
                    .or_else(|| {
                        self.rooms
                            .get(&a.map)?
                            .mobs
                            .iter()
                            .find(|m| m.id == killer)
                            .map(|m| m.def._name.clone())
                    })
                    .filter(|s| !s.is_empty())
                    .unwrap_or_else(|| "Không rõ".into())
            };
            let mut notice = a.death_notice.clone().unwrap_or(DeathNotice {
                killer,
                name,
                player,
                request: None,
            });
            let request = outbox::DeathRequest {
                map: a.map,
                x: a.x,
                y: a.y,
                life: a.life,
                notice: notice.clone(),
            };
            match self
                .outbox
                .death(id, a.life, a.account.clone(), a.slot, request)
            {
                Ok(key) => notice.request = Some(key),
                Err(error) => eprintln!("death journal: {error}"),
            }
            let a = self.actors.get_mut(&id).unwrap();
            a.death_notice = Some(notice);
            a.farming = false;
            a.path.clear();
            a.move_goal = None;
            a.target = 0;
            a.pickup = 0;
            pvp::death(a, self.rules.player_respawn_seconds);
            changed = true;
        }
        if changed {
            if let Err(error) = self.checkpoint() {
                eprintln!("death checkpoint: {error}");
            }
        }
    }
    pub fn accept_death_drop(&mut self, id: &str, amount: u32, legacy_knb: bool) -> Result<bool> {
        ensure!(amount <= 1_000_000, "invalid death amount");
        let Some(grant) = self.outbox.pending.get(id).cloned() else {
            return Ok(true);
        };
        let Some(death) = grant.death else {
            anyhow::bail!("not a death request")
        };
        if !self.checkpoints.data.completed.contains(id) {
            let room = self
                .rooms
                .get(&death.map)
                .ok_or_else(|| anyhow::anyhow!("death map unavailable"))?;
            let free = self.rules.max_loot_per_map.saturating_sub(room.loot.len());
            if amount > 0 && free == 0 {
                return Ok(false);
            }
            let count = (amount as usize).min(8).min(free);
            for i in 0..count {
                let angle = i as f32 * std::f32::consts::TAU / count as f32;
                let radius = if count == 1 {
                    0.0
                } else {
                    64.0 + count as f32 * 6.0
                };
                let room = self.rooms.get_mut(&death.map).unwrap();
                let (x, y) = room.nav.nearest(
                    death.x + angle.cos() * radius,
                    death.y + angle.sin() * radius / 2.0,
                );
                self.next = self.next.wrapping_add(1).max(1000);
                room.loot.push(Loot {
                    public: true,
                    id: self.next,
                    owner: String::new(),
                    owner_slot: 0,
                    x,
                    y,
                    gold: if legacy_knb {
                        0
                    } else {
                        amount / count as u32 + u32::from((i as u32) < amount % count as u32)
                    },
                    knb: if legacy_knb {
                        amount / count as u32 + u32::from((i as u32) < amount % count as u32)
                    } else {
                        0
                    },
                    grant_id: Some(format!("{id}-{i}")),
                    ttl: self.rules.loot_seconds,
                });
            }
            self.checkpoints.data.completed.insert(id.into());
            let saved = self
                .checkpoints
                .data
                .actors
                .entry(format!("{}:{}", grant.account, grant.slot))
                .or_insert(SavedActor {
                    map: death.map,
                    x: death.x,
                    y: death.y,
                    hp: 0.0,
                    mp: 0.0,
                    life: death.life,
                    death: None,
                });
            if saved.life <= death.life {
                saved.map = death.map;
                saved.x = death.x;
                saved.y = death.y;
                saved.hp = 0.0;
                saved.life = death.life;
                let mut notice = death.notice.clone();
                notice.request = Some(id.into());
                saved.death = Some(notice);
            }
            self.checkpoint()?; // Commit the ground piles before acknowledging the debit.
        }
        self.outbox.ack(&[id.into()])?;
        Ok(true)
    }
    pub(super) fn return_to_town(&mut self, id: u32, map: u32) -> Result<()> {
        let a = &self.actors[&id];
        if a.hp > 0.0 || a.map != map {
            return Ok(());
        }
        let town = self
            .rooms
            .values()
            .find(|r| r.definition.town)
            .ok_or_else(|| anyhow::anyhow!("town unavailable"))?;
        let town_id = town.definition.id;
        if self
            .actors
            .iter()
            .filter(|(other, a)| **other != id && a.map == town_id)
            .count()
            >= 32
        {
            return Ok(());
        }
        let entry = town
            .nav
            .nearest(town.definition.entry.x, town.definition.entry.y);
        let a = self.actors.get_mut(&id).unwrap();
        a.map = town_id;
        (a.x, a.y) = entry;
        a.hp = a.profile.hp;
        a.mp = a.profile.mp;
        a.life = a.life.wrapping_add(1).max(1);
        a.death_notice = None;
        a.last_attacker = 0;
        a.last_attacker_name.clear();
        a.last_attacker_player = false;
        a.dead = 0.0;
        a.cold = 0.0;
        a.stun = 0.0;
        a.farming = false;
        a.target = 0;
        a.pickup = 0;
        a.path.clear();
        a.move_goal = None;
        a.command_tick = self.tick;
        self.checkpoint()
    }
}
