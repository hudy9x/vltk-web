use super::*;
impl Game {
    pub(super) fn advance_monsters(&mut self, events: &mut Vec<EventData>) -> Vec<Death> {
        let dt = self.rules.tick_seconds;
        let mut deaths = vec![];
        for (&map, room) in &mut self.rooms {
            room.loot.retain_mut(|l| {
                l.ttl -= dt;
                l.ttl > 0.0
            });
            for m in &mut room.mobs {
                m.moving = false;
                if m.hp <= 0.0 {
                    if m.respawn > 0.0 {
                        m.respawn -= dt;
                        if m.respawn <= 0.0 {
                            m.life = m.life.wrapping_add(1);
                            m.hp = m.def.hp;
                            (m.x, m.y) = m.home;
                            m.target = 0;
                            m.poison = 0.0;
                            m.cold = 0.0;
                            m.stun = 0.0;
                            m.cold_power = 0.0;
                            m.hurt = 0.0;
                            m.poison_damage = 0.0;
                            m.poison_pending = 0.0;
                            m.poison_elapsed = 0.0;
                            m.poison_owner = 0;
                            m.killer = 0;
                            m.cd = 1.0;
                            m.dir = 0;
                            m.path.clear();
                        }
                    } else {
                        deaths.push((map, m.id, m.killer));
                    }
                    continue;
                }
                // Cold slows both locomotion and the attack recovery clock.
                let speed_factor = status::cold_factor(m);
                m.cd = (m.cd - dt * speed_factor).max(0.0);
                m.hurt = (m.hurt - dt).max(0.0);
                m.stun = (m.stun - dt).max(0.0);
                m.cold = (m.cold - dt).max(0.0);
                if m.cold <= 0.0 {
                    m.cold_power = 0.0;
                }
                if let Some(amount) = status::advance_poison(m, dt) {
                    events.push((map, 2, m.poison_owner, m.id, 0, amount, status::POISON_TICK));
                }
                if m.hp <= 0.0 {
                    m.killer = m.poison_owner;
                    deaths.push((map, m.id, m.killer));
                    continue;
                }
                if m.stun > 0.0 || m.hurt > 0.0 {
                    continue;
                }
                if !self.actors.get(&m.target).is_some_and(|a| {
                    a.map == map
                        && a.hp > 0.0
                        && distance(m.home.0, m.home.1, a.x, a.y) < self.rules.leash_range
                }) {
                    m.target = 0;
                }
                if m.target == 0 {
                    m.target = self
                        .actors
                        .iter()
                        .filter(|(_, a)| {
                            a.map == map
                                && a.hp > 0.0
                                && distance(m.x, m.y, a.x, a.y) < self.rules.aggro_range
                        })
                        .min_by(|(_, a), (_, b)| {
                            distance(m.x, m.y, a.x, a.y).total_cmp(&distance(m.x, m.y, b.x, b.y))
                        })
                        .map_or(0, |(id, _)| *id);
                }
                let destination = if let Some(a) = self.actors.get_mut(&m.target) {
                    if distance(m.x, m.y, a.x, a.y) < 45.0 && room.nav.clear(m.x, m.y, a.x, a.y) {
                        if m.cd <= 0.0 {
                            let amount = combat::damage(
                                &[m.def.damage, 0.0, 0.0, 0.0, 0.0],
                                a.profile.defense,
                                &a.profile.res,
                            );
                            let (amount,reflected)=support::receive_hit(a,amount);
                            if amount>0.0 {a.last_attacker=m.id;a.last_attacker_name=m.def._name.clone();a.last_attacker_player=false;}
                            if reflected>0.0{
                                let lost=reflected.min(m.hp);m.hp=(m.hp-reflected).max(0.0);m.killer=m.target;
                                events.push((map,2,m.target,m.id,0,lost,0));
                                if m.hp<=0.0{deaths.push((map,m.id,m.target));}
                            }
                            m.cd = 1.5;
                            events.push((map, 2, m.id, m.target, 0, amount, 0));
                            if a.hp <= 0.0 {
                                a.move_goal = None;
                                a.dead = self.rules.player_respawn_seconds;
                                a.farming = false;
                                a.target = 0;
                                a.path.clear();
                            }
                        }
                        None
                    } else {
                        Some((a.x, a.y))
                    }
                } else if distance(m.x, m.y, m.home.0, m.home.1) > 5.0 {
                    Some(m.home)
                } else {
                    None
                };
                if let Some((tx, ty)) = destination {
                    if self.tick.is_multiple_of(10) || m.path.is_empty() {
                        m.path = room.nav.path(m.x, m.y, tx, ty);
                    }
                    let old = (m.x, m.y);
                    let speed = m.def.speed * status::cold_factor(m);
                    room.nav.step(&mut m.x, &mut m.y, &mut m.path, speed * dt);
                    m.moving = distance(old.0, old.1, m.x, m.y) > 0.01;
                    m.dir = direction(m.x - old.0, m.y - old.1);
                }
            }
        }
        deaths
    }
}
