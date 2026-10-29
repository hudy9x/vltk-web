use super::*;
impl Game {
    pub(super) fn commit_rewards(&mut self, events: &mut Vec<EventData>, deaths: Vec<Death>) {
        for (map, id, owner) in deaths {
            let room = self.rooms.get_mut(&map).unwrap();
            let m = room.mobs.iter_mut().find(|m| m.id == id).unwrap();
            if let Some(a) = self.actors.get(&owner).filter(|a| a.map == map) {
                // Do not finalize a death until its reward has reached the durable journal.
                if self
                    .outbox
                    .grant(
                        format!("{}-{}-0", m.id, m.life),
                        a.account.clone(),
                        a.slot,
                        m.def.xp,
                        0,
                    )
                    .is_err()
                {
                    continue;
                }
                if room.loot.len() < self.rules.max_loot_per_map {
                    self.next = self.next.wrapping_add(1);
                    room.loot.push(Loot {
                        id: self.next,
                        owner: a.account.clone(),
                        owner_slot: a.slot,
                        x: m.x,
                        y: m.y,
                        gold: m.def.gold,
                        ttl: self.rules.loot_seconds,
                    });
                }
            }
            m.respawn = self.rules.respawn_seconds;
            events.push((map, 3, owner, id, 0, 0.0, 0));
        }
        for (&id, a) in &mut self.actors {
            let room = self.rooms.get_mut(&a.map).unwrap();
            if let Some(index) = room.loot.iter().position(|l| {
                l.id == a.pickup
                    && l.owner == a.account
                    && l.owner_slot == a.slot
                    && distance(a.x, a.y, l.x, l.y) <= self.rules.pickup_range
            }) {
                let drop = &room.loot[index];
                if self
                    .outbox
                    .grant(
                        format!("{}-0-1", drop.id),
                        a.account.clone(),
                        a.slot,
                        0,
                        drop.gold,
                    )
                    .is_ok()
                {
                    events.push((a.map, 4, id, drop.id, 0, drop.gold as f32, 0));
                    room.loot.remove(index);
                    a.pickup = 0;
                }
            }
        }
    }
}
