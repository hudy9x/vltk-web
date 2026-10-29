//! Straight piercing strips, independent of sprites and the chosen target's life.
use super::{definitions::LinearProjectile, navigation::Navigation};
pub(super) struct Body {
    pub id: u32,
    pub life: u32,
    pub x: f32,
    pub y: f32,
}
use std::collections::BTreeSet;

pub(super) struct Flight {
    origin: (f32, f32),
    direction: (f32, f32),
    traveled: f32,
    hits: BTreeSet<(u32, u32)>,
}
impl Flight {
    pub(super) fn new(origin: (f32, f32), aim: (f32, f32)) -> Self {
        let dx = aim.0 - origin.0;
        let dy = (aim.1 - origin.1) * 2.0;
        let length = dx.hypot(dy);
        Self {
            origin,
            direction: if length > 0.001 {
                (dx / length, dy / length)
            } else {
                (1.0, 0.0)
            },
            traveled: 0.0,
            hits: BTreeSet::new(),
        }
    }
    fn point(&self, distance: f32) -> (f32, f32) {
        (
            self.origin.0 + self.direction.0 * distance,
            self.origin.1 + self.direction.1 * distance / 2.0,
        )
    }
    /// Sweep the whole distance advanced this tick, so fast rays cannot skip mobs.
    pub(super) fn advance_bodies(
        &mut self,
        geometry: &LinearProjectile,
        nav: &Navigation,
        bodies: &[Body],
        dt: f32,
    ) -> (bool, Vec<u32>) {
        let from = self.traveled;
        let mut to = (from + geometry.speed * dt).min(geometry.range);
        let end = self.point(to);
        let blocked =
            !geometry.ignore_terrain && !nav.clear(self.origin.0, self.origin.1, end.0, end.1);
        if blocked {
            let mut lo = from;
            let mut hi = to;
            for _ in 0..10 {
                let mid = (lo + hi) / 2.0;
                let p = self.point(mid);
                if nav.clear(self.origin.0, self.origin.1, p.0, p.1) {
                    lo = mid;
                } else {
                    hi = mid;
                }
            }
            to = lo;
        }
        let mut contacts: Vec<_> = bodies
            .iter()
            .enumerate()
            .filter_map(|(index, mob)| {
                if self.hits.contains(&(mob.id, mob.life)) {
                    return None;
                }
                let dx = mob.x - self.origin.0;
                let dy = (mob.y - self.origin.1) * 2.0;
                let along = dx * self.direction.0 + dy * self.direction.1;
                let across = (dx * self.direction.1 - dy * self.direction.0).abs();
                let body = 17.0; // Same normal-monster hitbox as client us.normal.r.
                let side_gap = (across - geometry.width / 2.0).max(0.0);
                let end_gap = (from - along).max(along - to).max(0.0);
                if side_gap.hypot(end_gap) > body {
                    return None;
                }
                if !geometry.ignore_terrain
                    && !nav.clear(self.origin.0, self.origin.1, mob.x, mob.y)
                {
                    return None;
                }
                Some((index, along, mob.id, mob.life))
            })
            .collect();
        contacts.sort_by(|a, b| a.1.total_cmp(&b.1).then(a.2.cmp(&b.2)));
        for &(_, _, id, life) in &contacts {
            self.hits.insert((id, life));
        }
        self.traveled = to;
        (
            !blocked && to < geometry.range,
            contacts.into_iter().map(|c| c.2).collect(),
        )
    }
}
