//! Harmful support uses the same server release + client contact gate as attacks.
use super::*;
#[derive(Clone)]
pub struct Active {
    pub level: u16,
    pub remaining: f32,
    pub effects: BTreeMap<String, f32>,
}
pub(super) fn value(active: &BTreeMap<u16, Active>, key: &str) -> f32 {
    active
        .values()
        .map(|c| c.effects.get(key).copied().unwrap_or(0.0))
        .sum()
}
pub(super) fn resistances(base: &[f32; 5], active: &BTreeMap<u16, Active>) -> [f32; 5] {
    let keys = [
        "physicsres_p",
        "poisonres_p",
        "coldres_p",
        "fireres_p",
        "lightingres_p",
    ];
    std::array::from_fn(|i| base[i] + value(active, "allres_p") + value(active, keys[i]))
}
pub(super) fn poison_multiplier(active: &BTreeMap<u16, Active>) -> f32 {
    (1.0 - value(active, "poisontimereduce_p") / 100.0).max(0.0)
}
pub(super) fn apply_profile(a: &mut Actor) {
    a.profile.res = resistances(&a.profile.res, &a.support.curses);
}

impl Game {
    pub(super) fn cast_curse(
        &mut self,
        id: u32,
        skill_id: u16,
        target: u32,
        automatic: bool,
    ) -> bool {
        let Some(a) = self.actors.get(&id) else {
            return false;
        };
        let Some(room) = self.rooms.get(&a.map) else {
            return false;
        };
        let Some(skill) = a
            .profile
            .skills
            .iter()
            .find(|s| s.id == skill_id && s.curse.is_some())
            .cloned()
        else {
            return false;
        };
        let ability = a
            .base_profile
            .support
            .as_ref()
            .and_then(|c| c.skills.iter().find(|s| s.id == skill_id));
        if room.definition.town
            || a.hp <= 0.0
            || a.stun > 0.0
            || a.pvp.hurt > 0.0
            || a.support.lock > 0.0
            || !a.path.is_empty()
            || a.support.cooldowns.get(&skill_id).is_some_and(|t| *t > 0.0)
            || automatic && ability.is_none_or(|s| !s.enabled)
        {
            return false;
        }
        let life_cost = ability.is_some_and(|s| s.life_cost);
        if if life_cost {
            a.hp < skill.cost + a.profile.hp * if automatic { 0.3 } else { 0.25 }
        } else {
            a.mp < skill.cost + if automatic { a.profile.mp * 0.15 } else { 0.0 }
        } {
            return false;
        }
        let fresh =
            |c: &BTreeMap<u16, Active>| c.get(&skill_id).is_none_or(|c| c.level < skill.level);
        let destination = room
            .mobs
            .iter()
            .find(|m| m.id == target && m.hp > 0.0 && fresh(&m.curses))
            .map(|m| (m.x, m.y))
            .or_else(|| {
                self.actors
                    .get(&target)
                    .filter(|b| pvp::can_hit(self, id, target) && fresh(&b.support.curses))
                    .map(|b| (b.x, b.y))
            });
        let Some((x, y)) = destination else {
            return false;
        };
        if distance(a.x, a.y, x, y) > 420.0 || !room.nav.clear(a.x, a.y, x, y) {
            return false;
        }
        let map = a.map;
        let origin = (a.x, a.y);
        let a = self.actors.get_mut(&id).unwrap();
        if life_cost {
            a.hp = (a.hp - skill.cost).max(1.0);
        } else {
            a.mp -= skill.cost;
        }
        a.support
            .cooldowns
            .insert(skill_id, skill.cooldown.max(5.0));
        a.support.lock = 0.5;
        self.pending.push(Pending {
            cast_id: 0,
            source: id,
            map,
            target,
            remaining: skill.travel,
            origin,
            flight: None,
            skill,
        });
        self.event(map, 1, id, target, skill_id, 0.5, 0);
        true
    }
    pub(super) fn advance_curses(&mut self, _events: &mut Vec<EventData>) {
        let dt = self.rules.tick_seconds;
        for a in self.actors.values_mut() {
            let before = a.support.curses.len();
            a.support.curses.retain(|_, c| {
                c.remaining -= dt;
                c.remaining > 0.0 && a.hp > 0.0
            });
            if before != a.support.curses.len() {
                support::resolve(a);
            }
        }
        for room in self.rooms.values_mut() {
            for m in &mut room.mobs {
                m.curses.retain(|_, c| {
                    c.remaining -= dt;
                    c.remaining > 0.0 && m.hp > 0.0
                });
            }
        }
        let mut casts = vec![];
        for (&id, a) in &self.actors {
            let Some(room) = self.rooms.get(&a.map) else {
                continue;
            };
            for skill in a.profile.skills.iter().filter(|s| s.curse.is_some()) {
                let fresh = |c: &BTreeMap<u16, Active>| {
                    c.get(&skill.id).is_none_or(|c| c.level < skill.level)
                };
                let mobs = room
                    .mobs
                    .iter()
                    .filter(|m| m.hp > 0.0 && fresh(&m.curses))
                    .map(|m| (m.id, m.x, m.y));
                let peers = self
                    .actors
                    .iter()
                    .filter(|(target, b)| {
                        pvp::can_hit(self, id, **target) && fresh(&b.support.curses)
                    })
                    .map(|(&id, b)| (id, b.x, b.y));
                if let Some((target, _, _)) = mobs
                    .chain(peers)
                    .filter(|(_, x, y)| distance(a.x, a.y, *x, *y) <= 420.0)
                    .min_by(|a1, b| {
                        distance(a.x, a.y, a1.1, a1.2).total_cmp(&distance(a.x, a.y, b.1, b.2))
                    })
                {
                    casts.push((id, skill.id, target));
                }
            }
        }
        for (id, skill, target) in casts {
            self.cast_curse(id, skill, target, true);
        }
    }
    pub(super) fn apply_curse(&mut self, p: &Pending, target: u32) -> bool {
        let Some(curse) = &p.skill.curse else {
            return false;
        };
        if self.actors.contains_key(&target) {
            if !pvp::can_hit(self, p.source, target) {
                return true;
            }
            let a = self.actors.get_mut(&target).unwrap();
            if a.support
                .curses
                .get(&p.skill.id)
                .is_none_or(|c| c.level <= p.skill.level)
            {
                a.support.curses.insert(
                    p.skill.id,
                    Active {
                        level: p.skill.level,
                        remaining: curse.duration,
                        effects: curse.effects.clone(),
                    },
                );
                support::resolve(a);
            }
        } else if let Some(m) = self
            .rooms
            .get_mut(&p.map)
            .and_then(|r| r.mobs.iter_mut().find(|m| m.id == target && m.hp > 0.0))
        {
            if m.curses
                .get(&p.skill.id)
                .is_none_or(|c| c.level <= p.skill.level)
            {
                m.curses.insert(
                    p.skill.id,
                    Active {
                        level: p.skill.level,
                        remaining: curse.duration,
                        effects: curse.effects.clone(),
                    },
                );
            }
        }
        true
    }
}
