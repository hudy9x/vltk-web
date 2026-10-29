use crate::protocol::{self, Appearance, MAX_PLAYERS, Position};
use anyhow::{Result, ensure};
use std::{
    collections::BTreeMap,
    time::{Duration, Instant},
};

pub struct Player {
    pub account: [u8; 16],
    pub appearance: Appearance,
    pub position: Option<Position>,
    pub seen: Instant,
}
pub struct World {
    pub players: BTreeMap<u32, Player>,
    pub game: crate::domain::Game,
    pub admissions: BTreeMap<String, (crate::domain::definitions::Admission, Instant)>,
    pub revision: u32,
}
impl Default for World {
    fn default() -> Self {
        Self {
            players: BTreeMap::new(),
            admissions: BTreeMap::new(),
            revision: 0,
            game: crate::domain::Game::new(
                if cfg!(test) {
                    std::env::temp_dir()
                        .join(format!("vltk-world-{}.jsonl", std::process::id()))
                        .to_string_lossy()
                        .into_owned()
                } else {
                    std::env::var("PVE_OUTBOX_FILE")
                        .unwrap_or_else(|_| "database/multiplayer-outbox.jsonl".into())
                }
                .into(),
            )
            .expect("open reward journal"),
        }
    }
}
impl World {
    pub fn join(&mut self, account: [u8; 16], appearance: Appearance) -> Result<u32> {
        ensure!(self.players.len() < 128, "server full");
        ensure!(
            !self.players.values().any(|p| p.account == account),
            "account already connected"
        );
        let id = self.game.id();
        self.players.insert(
            id,
            Player {
                account,
                appearance,
                position: None,
                seen: Instant::now(),
            },
        );
        self.revision = self.revision.wrapping_add(1);
        Ok(id)
    }
    pub fn leave(&mut self, id: u32) {
        if let Err(error)=self.game.checkpoint(){eprintln!("disconnect checkpoint: {error}");}
        self.game.party_leave(id);
        self.game.parties.replies.remove(&id);
        self.players.remove(&id);
        self.game.actors.remove(&id);
        self.revision = self.revision.wrapping_add(1);
    }
    pub fn update(&mut self, id: u32, mut position: Position) -> Result<()> {
        if let Some(actor) = self.game.actors.get(&id) {
            position.x = actor.x;
            position.y = actor.y;
            position.map = actor.map;
            position.moving = u8::from(!actor.path.is_empty());
        }
        let player = self
            .players
            .get(&id)
            .ok_or_else(|| anyhow::anyhow!("unknown player"))?;
        if player
            .position
            .is_some_and(|old| !protocol::newer(position.seq, old.seq))
        {
            return Ok(());
        }
        let changed_map = player.position.is_none_or(|old| old.map != position.map);
        if changed_map {
            ensure!(
                self.players
                    .values()
                    .filter(|p| p.position.is_some_and(|v| v.map == position.map))
                    .count()
                    < MAX_PLAYERS,
                "map full"
            );
            self.revision = self.revision.wrapping_add(1);
        }
        let player = self.players.get_mut(&id).unwrap();
        player.position = Some(position);
        player.seen = Instant::now();
        Ok(())
    }
    pub fn packets(
        &self,
        id: u32,
        tick: u32,
        include_roster: bool,
    ) -> Option<(Vec<u8>, Option<Vec<u8>>)> {
        let map = self.players.get(&id)?.position?.map;
        let room: Vec<_> = self
            .players
            .iter()
            .filter(|(_, p)| {
                p.position.is_some_and(|v| v.map == map)
                    && p.seen.elapsed() < Duration::from_secs(3)
            })
            .collect();
        Some((
            protocol::snapshot(
                tick,
                id,
                map,
                &room
                    .iter()
                    .map(|(id, p)| (**id, p.position.unwrap()))
                    .collect::<Vec<_>>(),
            ),
            include_roster.then(|| {
                protocol::roster(
                    self.revision,
                    map,
                    &room
                        .iter()
                        .map(|(id, p)| (**id, p.appearance.clone()))
                        .collect::<Vec<_>>(),
                )
            }),
        ))
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    fn look() -> Appearance {
        Appearance {
            faction: 1,
            sex: 0,
            body_sex: 0,
            ride: 0,
            parts: [-1, 0, 0, -1],
            name: "Người chơi".into(),
            rebirth: 0,
            effects: vec![],
        }
    }
    fn pos(map: u32, seq: u32) -> Position {
        Position {
            seq,
            map,
            timestamp: seq * 50,
            effect_time: 0.0,
            x: 100.0,
            y: 200.0,
            dir: 0,
            moving: 1,
        }
    }
    #[test]
    fn rooms_reordering_and_disconnect() {
        let mut world = World::default();
        let a = world.join([1; 16], look()).unwrap();
        let b = world.join([2; 16], look()).unwrap();
        assert!(world.join([1; 16], look()).is_err());
        world.update(a, pos(1, 2)).unwrap();
        world.update(a, pos(2, 1)).unwrap();
        world.update(b, pos(2, 1)).unwrap();
        assert_eq!(world.packets(a, 1, false).unwrap().0.len(), 42);
        assert!(world.packets(a, 1, false).unwrap().1.is_none());
        assert!(world.packets(a, 1, true).unwrap().1.is_some());
        world.update(b, pos(1, 2)).unwrap();
        assert_eq!(world.packets(a, 2, false).unwrap().0.len(), 68);
        world.leave(b);
        assert_eq!(world.packets(a, 3, false).unwrap().0.len(), 42);
        let path = world.game.outbox.path_for_test();
        drop(world);
        std::fs::remove_file(path).unwrap();
    }
}
