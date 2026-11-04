use super::*;
impl Game {
    fn experience_recipients(&self, killer:u32, map:u32, position:(f32,f32), xp:u32) -> Vec<(String,u8,u32)> {
        let Some(source)=self.actors.get(&killer).filter(|a|a.map==map) else{return vec![];};
        let leader=self.parties.leader(killer);
        // Preserve solo rewards; party range/life eligibility applies only to shared XP.
        if leader==0 {
            return if source.test_owner.is_none() && xp>0 {vec![(source.account.clone(),source.slot,xp)]} else {vec![]};
        }
        // SIMs contribute only through their actual party, never implicitly through ownership.
        let members=self.parties.groups[&leader].as_slice();
        let eligible:Vec<_>=members.iter().filter_map(|id|self.actors.get(id))
            .filter(|a|a.test_owner.is_none() && a.hp>0.0 && a.map==map
                && distance(a.x,a.y,position.0,position.1)<=party::EXPERIENCE_RANGE).collect();
        let count=eligible.len() as u32;
        if count==0 || xp==0{return vec![];}
        // Preserve total XP exactly; ordered party membership breaks remainder ties.
        eligible.into_iter().enumerate().filter_map(|(i,a)|{
            let share=xp/count+u32::from((i as u32)<xp%count);
            (share>0).then(||(a.account.clone(),a.slot,share))
        }).collect()
    }
    pub(super) fn commit_rewards(&mut self, events: &mut Vec<EventData>, deaths: Vec<Death>) {
        for (map, id, owner) in deaths {
            let m = self.rooms[&map].mobs.iter().find(|m|m.id==id).unwrap();
            let recipients = self.experience_recipients(owner,map,(m.x,m.y),m.def.xp);
            let room = self.rooms.get_mut(&map).unwrap();
            let m = room.mobs.iter_mut().find(|m| m.id == id).unwrap();
            if self.training.mobs.contains_key(&id){m.respawn=2.0;events.push((map,3,owner,id,0,0.0,0));continue;}
            // Finalize only after every recipient's share is in the same durable record.
            if self.outbox.grant_experience(format!("{}-{}",m.id,m.life),recipients).is_err(){continue;}
            if let Some(a) = self.actors.get(&owner).filter(|a| a.map == map && a.test_owner.is_none()) {
                if room.loot.len() < self.rules.max_loot_per_map {
                    self.next = self.next.wrapping_add(1);
                    room.loot.push(Loot {
                        public: false,
                        knb: 0,
                        grant_id: None,
                        id: self.next,
                        owner: a.account.clone(),
                        owner_slot: a.slot,
                        x: m.x,
                        y: m.y,
                        gold: roll_gold(
                            &mut self.rng,
                            m.def.gold_min.unwrap_or(m.def.gold),
                            m.def.gold,
                        ),
                        ttl: self.rules.loot_seconds,
                    });
                }
            }
            m.respawn = m.def.respawn_seconds.unwrap_or(self.rules.respawn_seconds);
            events.push((map, 3, owner, id, 0, 0.0, 0));
        }
        let mut picked_knb = false;
        for (&id, a) in &mut self.actors {
            if a.hp <= 0.0 {
                continue;
            }
            let room = self.rooms.get_mut(&a.map).unwrap();
            if let Some(index) = room.loot.iter().position(|l| {
                l.id == a.pickup
                    && (l.public || l.knb > 0 || l.owner == a.account && l.owner_slot == a.slot)
                    && distance(a.x, a.y, l.x, l.y) <= self.rules.pickup_range
            }) {
                let drop = &room.loot[index];
                let delivery = if drop.knb > 0 {
                    self.outbox.credit_knb(
                        drop.grant_id.clone().expect("KNB ledger identity"),
                        a.account.clone(),
                        a.slot,
                        drop.knb,
                    )
                } else if let Some(key)=&drop.grant_id {
                    self.outbox.credit_gold(key.clone(),a.account.clone(),a.slot,drop.gold)
                } else {
                    self.outbox.grant(
                        format!("{}-0-1", drop.id),
                        a.account.clone(),
                        a.slot,
                        0,
                        drop.gold,
                    )
                };
                if delivery.is_ok() {
                    picked_knb |= drop.knb > 0 || drop.public;
                    events.push((
                        a.map,
                        if drop.knb > 0 { 7 } else { 4 },
                        id,
                        drop.id,
                        0,
                        if drop.knb > 0 { drop.knb } else { drop.gold } as f32,
                        0,
                    ));
                    room.loot.remove(index);
                    a.pickup = 0;
                }
            }
        }
        if picked_knb {
            if let Err(error) = self.checkpoint() {
                eprintln!("KNB pickup checkpoint: {error}");
            }
        }
    }
}

// Roll once when creating the drop; pickup persists this exact amount.
fn roll_gold(rng: &mut u64, min: u32, max: u32) -> u32 {
    let min = min.min(max);
    if min == max {
        return max;
    }
    *rng ^= *rng << 13;
    *rng ^= *rng >> 7;
    *rng ^= *rng << 17;
    min + (*rng % (u64::from(max) - u64::from(min) + 1)) as u32
}

#[cfg(test)]
mod tests {
    use super::roll_gold;

    #[test]
    fn gold_rolls_stay_in_range_and_vary_between_deaths() {
        let mut rng = 1;
        let mut amounts = std::collections::BTreeSet::new();
        for _ in 0..10000 {
            let gold = roll_gold(&mut rng, 16000, 20000);
            assert!((16000..=20000).contains(&gold));
            amounts.insert(gold);
        }
        assert!(amounts.len() > 3000);
        assert!(amounts.contains(&16000));
        assert!(amounts.contains(&20000));
        assert_eq!(roll_gold(&mut rng, 1, 1), 1);
        assert_eq!(roll_gold(&mut rng, 2, 2), 2);
    }
}
