use super::*;
pub(super) struct ContactGate {
    source: u32,
    map: u32,
    skill: Skill,
    tick: u32,
    confirmed: std::collections::BTreeSet<u32>,
    victim_confirmed: std::collections::BTreeSet<u32>,
    candidates: std::collections::BTreeSet<u32>,
    applied: std::collections::BTreeSet<u32>,
}
impl ContactGate {
    pub(super) fn map(&self)->u32 {self.map}
    pub(super) fn new(source: u32, map: u32, skill: Skill, tick: u32) -> Self {
        Self {
            source,
            map,
            skill,
            tick,
            confirmed: Default::default(),
            victim_confirmed: Default::default(),
            candidates: Default::default(),
            applied: Default::default(),
        }
    }
}
impl Game {
    pub(super) fn confirm_contact(&mut self, source: u32, command: &Command) {
        if ![command.x, command.y]
            .iter()
            .all(|v| v.is_finite() && *v >= 0.0 && *v <= 65535.0 && v.fract() == 0.0)
        {
            return;
        }
        let cast_id = command.x as u32 | ((command.y as u32) << 16);
        let Some(gate) = self.contacts.get_mut(&cast_id) else {
            return;
        };
        if gate.map != command.map
            || gate.skill.id != command.skill
            || self.tick.wrapping_sub(gate.tick) > 100
            || gate.confirmed.len() >= 256
        {
            return;
        }
        if gate.source == source {
            gate.confirmed.insert(command.target);
        } else if source == command.target
            && self.actors.get(&source).is_some_and(|a| a.map == gate.map)
        {
            gate.victim_confirmed.insert(command.target);
        }
    }
    pub(super) fn resolve_contacts(&mut self, events: &mut Vec<EventData>) {
        let mut gates = std::mem::take(&mut self.contacts);
        for gate in gates.values_mut() {
            if self.tick.wrapping_sub(gate.tick) > 100 {
                continue;
            }
            let ready: Vec<_> = gate
                .candidates
                .intersection(&gate.confirmed)
                .copied()
                .filter(|id| {
                    !gate.applied.contains(id)
                        && (!self.actors.contains_key(id) || gate.victim_confirmed.contains(id))
                })
                .collect();
            for target in ready {
                gate.applied.insert(target);
                let mut p = Pending {
                    cast_id: 0,
                    source: gate.source,
                    map: gate.map,
                    target,
                    skill: gate.skill.clone(),
                    remaining: 0.0,
                    origin: (0.0, 0.0),
                    aim: None, flight: None,
                };
                self.contact(&mut p, target, events);
                gate.skill.followups=p.skill.followups;
            }
        }
        gates.retain(|_, gate| self.tick.wrapping_sub(gate.tick) <= 100);
        self.contacts = gates;
    }
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
                if geometry.homing {
                    if let Some(target) = bodies.iter().find(|b| b.id == p.target) {
                        flight.steer((target.x, target.y), step);
                    }
                }
                let (alive, contacts) = flight.advance_bodies(geometry, &room.nav, &bodies, step);
                for id in contacts {
                    self.contact(&mut p, id, events);
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
            if p.skill.shape=="paired" {
                let position=self.actors.get(&p.target).filter(|_|pvp::can_hit(self,p.source,p.target)).map(|a|(a.x,a.y))
                    .or_else(||self.rooms.get(&p.map)?.mobs.iter().find(|m|m.id==p.target&&m.hp>0.0).map(|m|(m.x,m.y)));
                if position.is_some_and(|(x,y)|distance(x,y,p.origin.0,p.origin.1)<=29.0){let target=p.target;self.contact(&mut p,target,events);}
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
            let center = if p.skill.shape=="self" { Some(p.origin) }
                else if p.skill.radius>0.0 { p.aim.or(center) } else { center };
            let Some(center) = center else { continue; };
            let ignores_terrain=combat_range::ignores_terrain(&p.skill);
            if !combat_range::can_cast(&p.skill,p.origin,center)
                || (!ignores_terrain && !room.nav.clear(p.origin.0,p.origin.1,center.0,center.1)) {
                continue;
            }
            let nearby = |id, x, y| {
                (ignores_terrain || room.nav.clear(center.0,center.1,x,y))
                    && if p.skill.radius>0.0 {
                        combat_range::contains_impact(&p.skill,center,(x,y))
                    } else { id==p.target }
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
                self.contact(&mut p, id, events);
            }
        }
    }
    fn contact(&mut self, p: &mut Pending, target: u32, events: &mut Vec<EventData>) {
        if p.cast_id != 0 {
            if let Some(gate) = self.contacts.get_mut(&p.cast_id) {
                gate.candidates.insert(target);
            }
            return;
        }
        if !self
            .actors
            .get(&p.source)
            .is_some_and(|a| a.map == p.map && a.hp > 0.0)
        {
            return;
        }
        if self.apply_curse(p,target){return;}
        let position=self.actors.get(&target).filter(|_|pvp::can_hit(self,p.source,target)).map(|a|(a.x,a.y))
            .or_else(||self.rooms.get(&p.map)?.mobs.iter().find(|m|m.id==target&&m.hp>0.0).map(|m|(m.x,m.y)));
        if let Some(position)=position {
            let mut children=Vec::new();
            let parent=p.skill.clone();
            for followup in &mut p.skill.followups {
                if followup.targets==0||self.pending.len()+children.len()>=4096{continue;}
                followup.targets-=1;
                let mut skill=parent.clone();
                skill.id=followup.id;skill.parts=followup.parts;skill.stun=followup.stun;
                skill.crit=0.0;skill.accuracy=None;skill.followups.clear();skill.projectile=None;
                skill.targets=1;skill.radius=0.0;skill.shape="paired".into();
                children.push(Pending{cast_id:0,source:p.source,map:p.map,target,skill,remaining:followup.delay,origin:position,aim: None, flight:None});
            }
            self.pending.extend(children);
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
