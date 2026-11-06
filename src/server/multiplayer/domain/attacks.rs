use super::*;
pub(super) struct ContactGate {
    source: u32,
    map: u32,
    skill: Skill,
    tick: u32,
    confirmed: std::collections::BTreeSet<u32>,
    victim_confirmed: std::collections::BTreeSet<u32>,
    candidates: std::collections::BTreeMap<u32,u8>,
    applied: std::collections::BTreeMap<u32,u8>,
}
impl ContactGate {
    // Only server-observed contacts count. Client reports confirm the cast/body,
    // never supply a hit count; all other skills retain their existing one-hit gate.
    fn hit_limit(&self)->u8 {match self.skill.id {1073=>2,1074=>3,_=>1}}

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
            let ready: Vec<_> = gate.candidates.iter().filter_map(|(&id,&count)| {
                let applied=gate.applied.get(&id).copied().unwrap_or(0);
                let validated=count.min(gate.hit_limit());
                (validated>applied && gate.confirmed.contains(&id)
                    && (!self.actors.contains_key(&id) || gate.victim_confirmed.contains(&id)))
                    .then_some((id,validated-applied,validated))
            }).collect();
            for (target,remaining,total) in ready {
                gate.applied.insert(target,total);
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
                for _ in 0..remaining {self.contact(&mut p,target,events);}
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
                if [328,1061].contains(&p.skill.id) {
                    for followup in std::mem::take(&mut p.skill.followups) {
                        let mut skill=p.skill.clone();
                        // Damage events must identify the ring, not a primary sword.
                        skill.id=followup.id;
                        skill.parts=followup.parts;skill.projectile=None;skill.shape="self".into();
                        skill.radius=170.0*skill.geometry.as_ref().map_or(0.81,|g|g.scale);
                        skill.range=170.0;skill.targets=256;skill.stun=followup.stun;skill.accuracy=None;
                        skill.crit=followup.crit.unwrap_or(0.0);
                        if let Some(g)=&mut skill.geometry {g.impact_y_scale=1.0/0.6;g.impact_offset_y=None;}
                        self.pending.push(Pending{cast_id:0,source:p.source,map:p.map,target:p.target,
                            skill,remaining:(if p.skill.id==1061 {0.2} else {0.0})-step,
                            origin:p.origin,aim:None,flight:None});
                    }
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
                let aim=bodies.iter().find(|body|body.id==p.target).map(|body|(body.x,body.y));
                if geometry.homing && ![1073,1074].contains(&p.skill.id) {
                    if let Some(target)=aim {flight.steer(target,step);}
                }
                let (alive, contacts) = if [1073,1074].contains(&p.skill.id) {
                    flight.advance_beggar(p.skill.id,geometry,&room.nav,&bodies,step,aim)
                } else if [328,336,1061,1063].contains(&p.skill.id) {
                    flight.advance_swords(p.skill.id,p.skill.missiles,geometry,&room.nav,&bodies,step)
                } else {flight.advance_bodies(geometry, &room.nav, &bodies, step)};
                // The primary blade stops once; stacked bodies still produce one package.
                let hao_hung = if p.skill.id == 1058 && !contacts.is_empty() {
                    Some((flight.impact_position(), flight.angle()))
                } else { None };
                let impacts = flight.take_impacts();
                if let Some((position, angle)) = hao_hung { self.spawn_hao_hung_rays(&p, position, angle); }
                for (position,angle) in impacts {self.spawn_cuiyan_impact(&p,position,angle);}
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
    fn spawn_hao_hung_rays(&mut self, p: &Pending, position: (f32, f32), angle: f32) {
        for offset in [-std::f32::consts::FRAC_PI_8, 0.0, std::f32::consts::FRAC_PI_8] {
            if self.pending.len() >= 4096 { break; }
            let origin = position;
            let angle = angle + offset;
            let mut skill = p.skill.clone();
            skill.id = 1084; skill.accuracy = None; skill.followups.clear(); skill.travel = 0.0;
            skill.parts = skill.parts.map(|part| part * 0.2);
            if let Some(rules) = &mut skill.pve { rules.flat_series *= 0.2; }
            if let Some(projectile) = &mut skill.projectile {
                projectile.range = p.skill.range * skill.geometry.as_ref().map_or(0.81, |g| g.scale) * 0.5;
                projectile.pierce = true; projectile.area = 0.0; projectile.homing = false;
            }
            self.pending.push(Pending { cast_id: 0, source: p.source, map: p.map, target: p.target,
                skill, remaining: 0.0, origin, aim: None,
                flight: Some(projectiles::Flight::new(origin, (origin.0+angle.cos()*100.0, origin.1+angle.sin()*50.0))) });
        }
    }
    // One secondary package per blade impact; it never replaces primary damage.
    fn spawn_cuiyan_impact(&mut self, p:&Pending, position:(f32,f32), angle:f32) {
        if p.skill.id==1063 && p.skill.level>=11 {
            for index in 0..5 {
                if self.pending.len()>=4096 {break;}
                let direction=angle+index as f32*std::f32::consts::TAU/5.0;
                let mut skill=p.skill.clone();skill.id=1064;skill.parts=skill.parts.map(|part|part*0.1);
                skill.accuracy=None;skill.followups.clear();skill.travel=0.0;
                if let Some(rules)=&mut skill.pve {rules.flat_series*=0.1;}
                if let Some(projectile)=&mut skill.projectile {
                    projectile.range=96.0*skill.geometry.as_ref().map_or(0.81,|g|g.scale);
                    projectile.width=16.0;projectile.speed=432.0;projectile.pierce=true;projectile.area=0.0;projectile.homing=false;
                }
                self.pending.push(Pending{cast_id:0,source:p.source,map:p.map,target:p.target,skill,remaining:0.0,origin:position,aim:None,
                    flight:Some(projectiles::Flight::new(position,(position.0+direction.cos()*100.0,position.1+direction.sin()*50.0)))});
            }
        } else if p.skill.id==336 {
            let Some(lotus)=p.skill.followups.iter().find(|event|event.id==382) else {return;};
            if self.pending.len()>=4096 {return;}
            let mut skill=p.skill.clone();skill.id=382;skill.parts=lotus.parts;skill.crit=0.0;skill.accuracy=None;skill.followups.clear();
            skill.projectile=None;skill.shape="spot".into();skill.targets=256;skill.radius=80.0*skill.geometry.as_ref().map_or(0.81,|g|g.scale);
            skill.range=80.0;skill.travel=0.0;skill.stun=lotus.stun;
            self.pending.push(Pending{cast_id:0,source:p.source,map:p.map,target:p.target,skill,remaining:0.0,origin:position,aim:Some(position),flight:None});
        }
    }
    fn contact(&mut self, p: &mut Pending, target: u32, events: &mut Vec<EventData>) {
        if p.cast_id != 0 {
            if let Some(gate) = self.contacts.get_mut(&p.cast_id) {
                let limit=gate.hit_limit();
                let count=gate.candidates.entry(target).or_insert(0);
                *count=count.saturating_add(1).min(limit);
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
        if let Some(position)=position.filter(|_|p.skill.id!=336) {
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
