use super::definitions::MapDefinition;
use anyhow::{Result, ensure};
use base64::Engine;
use std::{cmp::Reverse, collections::BinaryHeap};
#[derive(Clone)]
pub struct Navigation {
    pub width: f32,
    pub height: f32,
    cw: f32,
    ch: f32,
    columns: usize,
    rows: usize,
    blocked: Vec<u8>,
}
impl Navigation {
    pub fn new(map: &MapDefinition) -> Result<Self> {
        ensure!(
            map.width.is_finite()
                && map.height.is_finite()
                && map.width > 100.0
                && map.width <= 32768.0
                && map.height > 100.0
                && map.height <= 32768.0,
            "invalid map size"
        );
        let (columns, rows, cw, ch, blocked) = if map.grid.kind == "grid" {
            let size = map
                .grid
                .cell_size
                .as_ref()
                .ok_or_else(|| anyhow::anyhow!("missing cell size"))?;
            ensure!(
                map.grid.columns > 0
                    && map.grid.rows > 0
                    && map.grid.columns.saturating_mul(map.grid.rows) <= 262144
                    && size.width > 0.0
                    && size.height > 0.0,
                "invalid grid"
            );
            let mut data =
                base64::engine::general_purpose::STANDARD.decode(&map.grid.blocked_base64)?;
            ensure!(
                data.len() == (map.grid.columns * map.grid.rows).div_ceil(8),
                "truncated grid"
            );
            // Match the client: only the largest connected walkable region is enabled.
            let columns = map.grid.columns;
            let rows = map.grid.rows;
            let count = columns * rows;
            let mut labels = vec![usize::MAX; count];
            let mut largest = vec![];
            for start in 0..count {
                if labels[start] != usize::MAX || data[start / 8] & (1 << (start % 8)) != 0 {
                    continue;
                }
                let mut component = vec![start];
                labels[start] = start;
                let mut head = 0;
                while head < component.len() {
                    let i = component[head];
                    head += 1;
                    let x = i % columns;
                    let y = i / columns;
                    for (dx, dy) in [
                        (1isize, 0),
                        (-1, 0),
                        (0, 1),
                        (0, -1),
                        (1, 1),
                        (1, -1),
                        (-1, 1),
                        (-1, -1),
                    ] {
                        let nx = x as isize + dx;
                        let ny = y as isize + dy;
                        if nx < 0 || ny < 0 || nx >= columns as isize || ny >= rows as isize {
                            continue;
                        }
                        let n = ny as usize * columns + nx as usize;
                        let free = |j: usize| data[j / 8] & (1 << (j % 8)) == 0;
                        if labels[n] != usize::MAX
                            || !free(n)
                            || (dx != 0
                                && dy != 0
                                && (!free(y * columns + nx as usize)
                                    || !free(ny as usize * columns + x)))
                        {
                            continue;
                        }
                        labels[n] = start;
                        component.push(n);
                    }
                }
                if component.len() > largest.len() {
                    largest = component;
                }
            }
            ensure!(!largest.is_empty(), "empty navigation");
            data.fill(255);
            for i in largest {
                data[i / 8] &= !(1 << (i % 8));
            }
            (
                map.grid.columns,
                map.grid.rows,
                size.width,
                size.height,
                data,
            )
        } else {
            (1, 1, map.width, map.height, vec![0])
        };
        Ok(Self {
            width: map.width,
            height: map.height,
            cw,
            ch,
            columns,
            rows,
            blocked,
        })
    }
    fn cell(&self, x: f32, y: f32) -> Option<usize> {
        if !x.is_finite()
            || !y.is_finite()
            || x < 0.0
            || y < 0.0
            || x >= self.width
            || y >= self.height
        {
            return None;
        }
        let col = (x / self.cw) as usize;
        let row = (y / self.ch) as usize;
        if col >= self.columns || row >= self.rows {
            return None;
        }
        Some(row * self.columns + col)
    }
    fn free(&self, i: usize) -> bool {
        self.blocked
            .get(i / 8)
            .is_none_or(|byte| byte & (1 << (i % 8)) == 0)
    }
    pub fn stand(&self, x: f32, y: f32) -> bool {
        if x < 20.0 || y < 50.0 || x > self.width - 20.0 || y > self.height - 20.0 {
            return false;
        }
        [x - 9.0, x, x + 9.0]
            .iter()
            .all(|px| self.cell(*px, y).is_some_and(|i| self.free(i)))
    }
    pub fn clear(&self, x: f32, y: f32, tx: f32, ty: f32) -> bool {
        let steps = (distance(x, y, tx, ty) / self.cw.min(self.ch).max(4.0) * 2.0).ceil() as usize;
        (0..=steps).all(|i| {
            let t = i as f32 / steps.max(1) as f32;
            self.stand(x + (tx - x) * t, y + (ty - y) * t)
        })
    }
    pub fn nearest(&self, x: f32, y: f32) -> (f32, f32) {
        if self.stand(x, y) {
            return (x, y);
        }
        let mut best = (self.width / 2.0, self.height / 2.0);
        let mut score = f32::MAX;
        for i in 0..self.columns * self.rows {
            if !self.free(i) {
                continue;
            }
            let p = self.center(i);
            let d = distance(x, y, p.0, p.1);
            if d < score && self.stand(p.0, p.1) {
                best = p;
                score = d;
            }
        }
        best
    }
    fn center(&self, i: usize) -> (f32, f32) {
        (
            (i % self.columns) as f32 * self.cw + self.cw / 2.0,
            (i / self.columns) as f32 * self.ch + self.ch / 2.0,
        )
    }
    pub fn path(&self, x: f32, y: f32, tx: f32, ty: f32) -> Vec<(f32, f32)> {
        if !self.stand(tx, ty) {
            return vec![];
        }
        if self.clear(x, y, tx, ty) {
            return vec![(tx, ty)];
        }
        let (Some(start), Some(goal)) = (self.cell(x, y), self.cell(tx, ty)) else {
            return vec![];
        };
        let len = self.columns * self.rows;
        let mut cost = vec![usize::MAX; len];
        let mut from = vec![usize::MAX; len];
        let mut open = BinaryHeap::new();
        cost[start] = 0;
        open.push(Reverse((0, start)));
        let mut budget = 8192;
        while let Some(Reverse((_, i))) = open.pop() {
            if i == goal {
                break;
            }
            if budget == 0 {
                return vec![];
            }
            budget -= 1;
            let col = i % self.columns;
            let row = i / self.columns;
            for (dx, dy) in [
                (1isize, 0),
                (-1, 0),
                (0, 1),
                (0, -1),
                (1, 1),
                (1, -1),
                (-1, 1),
                (-1, -1),
            ] {
                let nx = col as isize + dx;
                let ny = row as isize + dy;
                if nx < 0 || ny < 0 || nx >= self.columns as isize || ny >= self.rows as isize {
                    continue;
                }
                let next = ny as usize * self.columns + nx as usize;
                if !self.free(next) || !self.stand(self.center(next).0, self.center(next).1) {
                    continue;
                }
                if dx != 0
                    && dy != 0
                    && (!self.free(row * self.columns + nx as usize)
                        || !self.free(ny as usize * self.columns + col))
                {
                    continue;
                }
                let value = cost[i] + if dx != 0 && dy != 0 { 14 } else { 10 };
                if value >= cost[next] {
                    continue;
                }
                cost[next] = value;
                from[next] = i;
                let hx = (nx - goal as isize % self.columns as isize).unsigned_abs();
                let hy = (ny - goal as isize / self.columns as isize).unsigned_abs();
                let h = hx.max(hy) * 10 + hx.min(hy) * 4;
                open.push(Reverse((value + h, next)));
            }
        }
        if from[goal] == usize::MAX {
            return vec![];
        }
        let mut result = vec![(tx, ty)];
        let mut at = goal;
        while at != start {
            let previous = from[at];
            if previous == usize::MAX {
                return vec![];
            }
            at = previous;
            if at != start {
                result.push(self.center(at));
            }
        }
        result.reverse();
        result
    }
    pub fn step(&self, x: &mut f32, y: &mut f32, path: &mut Vec<(f32, f32)>, mut amount: f32) {
        while amount > 0.0 && !path.is_empty() {
            let (tx, ty) = path[0];
            let d = distance(*x, *y, tx, ty);
            if d <= amount {
                *x = tx;
                *y = ty;
                amount -= d;
                path.remove(0);
            } else {
                let nx = *x + (tx - *x) / d * amount;
                let ny = *y + (ty - *y) / d * amount;
                if self.stand(nx, ny) {
                    *x = nx;
                    *y = ny;
                } else {
                    path.clear();
                }
                break;
            }
        }
    }
}
pub fn distance(x: f32, y: f32, tx: f32, ty: f32) -> f32 {
    ((tx - x).powi(2) + (ty - y).powi(2)).sqrt()
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn paths_detour_without_crossing_walls_and_keep_actor_clearance() {
        let mut blocked = vec![0u8; 13];
        for row in 0..10 {
            if row != 7 {
                let i = row * 10 + 5;
                blocked[i / 8] |= 1 << (i % 8);
            }
        }
        let map:MapDefinition=serde_json::from_value(serde_json::json!({"id":1,"level":1,"town":false,"width":200,"height":200,"entry":{"x":50,"y":70},"grid":{"kind":"grid","columns":10,"rows":10,"cellSize":{"width":20,"height":20},"blockedBase64":base64::engine::general_purpose::STANDARD.encode(blocked)},"monsters":[]})).unwrap();
        let nav = Navigation::new(&map).unwrap();
        assert!(!nav.clear(50.0, 70.0, 150.0, 70.0));
        assert!(!nav.stand(101.0, 70.0));
        assert!(nav.stand(20.0, 70.0));
        let mut path = nav.path(50.0, 70.0, 150.0, 70.0);
        assert!(path.iter().any(|p| p.1 >= 150.0));
        let (mut x, mut y) = (50.0, 70.0);
        for _ in 0..200 {
            nav.step(&mut x, &mut y, &mut path, 4.0);
            assert!(nav.stand(x, y));
            if path.is_empty() {
                break;
            }
        }
        assert!((x - 150.0).abs() < 0.01 && (y - 70.0).abs() < 0.01);
    }
}
