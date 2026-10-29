use super::*;
impl Game {
    pub(super) fn advance_attacks(&mut self, events: &mut Vec<EventData>) {
        let dt = self.rules.tick_seconds;
        let pending = std::mem::take(&mut self.pending);
        for mut p in pending {
            p.remaining -= dt;
            if !self
                .actors
                .get(&p.source)
                .is_some_and(|a| a.map == p.map && a.hp > 0.0)
            {
                continue;
            }
            if let (Some(flight), Some(geometry)) = (&mut p.flight, &p.skill.projectile) {
                let step = (p.skill.travel - p.remaining).clamp(0.0, dt);
                if step <= 0.0 {
                    self.pending.push(p);
                    continue;
                }
                let Some(room) = self.rooms.get(&p.map) else {
                    continue;
                };
                let mut bodies: Vec<_> = room
                    .mobs
                    .iter()
                    .filter(|m| m.hp > 0.0)
                    .map(|m| projectiles::Body {
                        id: m.id,
                        life: m.life,
                        x: m.x,
                        y: m.y,
                    })
                    .collect();
                bodies.extend(
                    self.actors
                        .iter()
                        .filter(|(id, _)| pvp::can_hit(self, p.source, **id))
                        .map(|(&id, a)| projectiles::Body {
                            id,
                            life: a.life,
                            x: a.x,
                            y: a.y,
                        }),
                );
                let (alive, contacts) = flight.advance_bodies(geometry, &room.nav, &bodies, step);
                for id in contacts {
                    self.contact(&p, id, events);
                }
                if alive {
                    self.pending.push(p);
                }
                continue;
            }
            if p.remaining > 0.0 {
                self.pending.push(p);
                continue;
            }
            let Some(room) = self.rooms.get(&p.map) else {
                continue;
            };
            let center = room
                .mobs
                .iter()
                .find(|m| m.id == p.target && m.hp > 0.0)
                .map(|m| (m.x, m.y))
                .or_else(|| {
                    self.actors
                        .get(&p.target)
                        .filter(|_| pvp::can_hit(self, p.source, p.target))
                        .map(|a| (a.x, a.y))
                });
            let Some(center) = center else {
                continue;
            };
            if distance(p.origin.0, p.origin.1, center.0, center.1) > p.skill.range * 1.5 + 50.0
                || !room.nav.clear(p.origin.0, p.origin.1, center.0, center.1)
            {
                continue;
            }
            let nearby = |id, x, y| {
                room.nav.clear(center.0, center.1, x, y)
                    && (id == p.target
                        || p.skill.radius > 0.0
                            && distance(center.0, center.1, x, y) <= p.skill.radius)
            };
            let mut targets: Vec<_> = room
                .mobs
                .iter()
                .filter(|m| m.hp > 0.0 && nearby(m.id, m.x, m.y))
                .map(|m| m.id)
                .collect();
            targets.extend(
                self.actors
                    .iter()
                    .filter(|(id, a)| pvp::can_hit(self, p.source, **id) && nearby(**id, a.x, a.y))
                    .map(|(&id, _)| id),
            );
            targets.sort_by_key(|id| (*id != p.target, *id));
            for id in targets.into_iter().take(p.skill.targets) {
                self.contact(&p, id, events);
            }
        }
    }
    fn contact(&mut self, p: &Pending, target: u32, events: &mut Vec<EventData>) {
        if !self
            .actors
            .get(&p.source)
            .is_some_and(|a| a.map == p.map && a.hp > 0.0)
        {
            return;
        }
        if self.actors.contains_key(&target) {
            pvp::hit(self, p.source, target, &p.skill, events);
            return;
        }
        let Some(m) = self
            .rooms
            .get_mut(&p.map)
            .and_then(|r| r.mobs.iter_mut().find(|m| m.id == target && m.hp > 0.0))
        else {
            return;
        };
        let amount = hit_mob(p.map, p.source, &p.skill, m, &mut self.rng, events);
        if let Some(actor) = self.actors.get_mut(&p.source) {
            recovery::leech(actor, &p.skill, amount);
        }
    }
}
fn hit_mob(
    map: u32,
    source: u32,
    skill: &Skill,
    m: &mut Mob,
    rng: &mut u64,
    events: &mut Vec<EventData>,
) -> f32 {
    let hit = status::apply_hit(skill, m, source, rng);
    if hit.amount > 0.0 {
        events.push((map, 2, source, m.id, skill.id, hit.amount, hit.flags));
    }
    hit.amount
}
