use super::*;
impl Game {
    pub(super) fn advance_players(&mut self, events: &mut Vec<EventData>) {
        let dt = self.rules.tick_seconds;
        let peers = pvp::peers(self);
        for (&id, a) in &mut self.actors {
            let Some(room) = self.rooms.get_mut(&a.map) else {
                continue;
            };
            a.cold = (a.cold - dt).max(0.0);
            a.stun = (a.stun - dt).max(0.0);
            for cd in a.cooldowns.values_mut() {
                *cd = if *cd <= dt + 0.000001 { 0.0 } else { *cd - dt };
            }
            if a.hp <= 0.0 {
                a.secondary=None;
                continue;
            }
            a.hp = (a.hp + a.profile.regen * dt).min(a.profile.hp);
            a.mp = (a.mp + a.profile.mana_regen * dt).min(a.profile.mp);
            if a.pickup != 0 && !room.loot.iter().any(|l| l.id == a.pickup) {
                a.pickup = 0;
                a.path.clear();
            }
            if a.farming && a.secondary.is_none()
                && !a.pvp.enabled
                && a.target == 0
                && a.pickup == 0
                && let Some(drop) = room
                    .loot
                    .iter()
                    .filter(|l| {
                        (l.public || l.knb > 0 || l.owner == a.account
                            && l.owner_slot == a.slot
                        )
                            && distance(a.x, a.y, l.x, l.y) < self.rules.leash_range
                    })
                    .min_by(|x, y| {
                        distance(a.x, a.y, x.x, x.y).total_cmp(&distance(a.x, a.y, y.x, y.y))
                    })
            {
                a.pickup = drop.id;
                a.path = room.nav.path(a.x, a.y, drop.x, drop.y);
            }
            if a.farming && a.secondary.is_none() && a.pvp.enabled && a.target == 0 {
                a.target = peers
                    .iter()
                    .filter(|p| {
                        pvp::hostile(id, a, p, room.definition.town)
                            && distance(a.x, a.y, p.x, p.y) < self.rules.leash_range
                    })
                    .min_by(|x, y| {
                        distance(a.x, a.y, x.x, x.y).total_cmp(&distance(a.x, a.y, y.x, y.y))
                    })
                    .map_or(0, |p| p.id);
            }
            if a.farming && a.secondary.is_none() && !a.pvp.enabled && a.target == 0 && a.pickup == 0 {
                a.target = room
                    .mobs
                    .iter()
                    .filter(|m| m.hp > 0.0 && distance(a.x, a.y, m.x, m.y) < self.rules.leash_range)
                    .min_by(|a1, b| {
                        distance(a.x, a.y, a1.x, a1.y).total_cmp(&distance(a.x, a.y, b.x, b.y))
                    })
                    .map_or(0, |m| m.id);
            }
            if a.stun > 0.0 || a.support.lock > 0.0 || a.pvp.hurt > 0.0 {
                continue;
            }
            if a.secondary.is_some_and(|(_,id)|a.profile.skills.iter().find(|s|s.id==id).is_none_or(|s|a.mp<s.cost)){
                a.secondary=None;
            }
            let (selected_target,selected_skill)=a.secondary.unwrap_or((a.target,a.skill));
            if selected_target != 0 {
                let target = room
                    .mobs
                    .iter()
                    .find(|m| m.id == selected_target && m.hp > 0.0)
                    .map(|m| (m.id, m.x, m.y))
                    .or_else(|| {
                        peers
                            .iter()
                            .find(|p| {
                                p.id == selected_target && pvp::hostile(id, a, p, room.definition.town)
                            })
                            .map(|p| (p.id, p.x, p.y))
                    });
                if let Some((target_id, target_x, target_y)) = target {
                    if let Some(skill) = a.profile.skills.iter().find(|s| s.id == selected_skill) {
                        let reaches = skill.projectile.as_ref().is_none_or(|p| {
                            (target_x - a.x).hypot((target_y - a.y) * 2.0) <= p.range + 17.0
                        });
                        if reaches
                            && distance(a.x, a.y, target_x, target_y) <= skill.range + 12.0
                            && room.nav.clear(a.x, a.y, target_x, target_y)
                        {
                            a.path.clear();
                            if *a.cooldowns.get(&ATTACK_COOLDOWN).unwrap_or(&0.0) <= 0.0
                                && *a.cooldowns.get(&skill.id).unwrap_or(&0.0) <= 0.0
                                && a.mp >= skill.cost
                            {
                                a.mp -= skill.cost;
                                let (cycle,interval)=speed::attack(a,skill);
                                a.cooldowns.insert(skill.id, interval);
                                a.cooldowns.insert(ATTACK_COOLDOWN, interval);
                                a.secondary=None;
                                if self.pending.len() < 4096 {
                                    self.pending.push(Pending {
                                        cast_id: 0,
                                        source: id,
                                        map: a.map,
                                        target: target_id,
                                        remaining: 0.12 + skill.travel,
                                        origin: (a.x, a.y),
                                        flight: skill.projectile.as_ref().map(|_| {
                                            projectiles::Flight::new(
                                                (a.x, a.y),
                                                (target_x, target_y),
                                            )
                                        }),
                                        skill: skill.clone(),
                                    });
                                }
                                events.push((a.map, 1, id, target_id, skill.id, cycle, 0));
                            }
                        } else if self.tick.is_multiple_of(10) || a.path.is_empty() {
                            a.path = room.nav.path(a.x, a.y, target_x, target_y);
                        }
                    }
                } else {
                    if a.secondary.take().is_none(){a.target = 0;}
                }
            }
            let speed = speed::movement(a) * dt;
            room.nav.step(&mut a.x, &mut a.y, &mut a.path, speed);
        }
    }
}
