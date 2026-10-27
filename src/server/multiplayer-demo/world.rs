use serde::{Deserialize, Serialize};
use std::{
    collections::BTreeMap,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};
use tokio::sync::watch;

pub const WIDTH: f32 = 1200.0;
pub const HEIGHT: f32 = 760.0;
pub const MARGIN: f32 = 28.0;
pub const SPEED: f32 = 220.0;
pub const TICK_HZ: u32 = 20;
// Keeps the complete, rounded JSON snapshot below a conservative QUIC payload.
pub const MAX_PLAYERS: usize = 8;
pub const MAX_INPUT: usize = 512;
pub const IDLE_TIMEOUT: Duration = Duration::from_secs(15);

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case", deny_unknown_fields)]
pub enum Command {
    Move { seq: u32, x: f32, y: f32 },
    Ping { nonce: u64 },
}

pub fn decode(bytes: &[u8]) -> Option<Command> {
    (bytes.len() <= MAX_INPUT)
        .then(|| serde_json::from_slice(bytes).ok())
        .flatten()
}

#[derive(Clone, Debug, Serialize)]
pub struct Player {
    pub id: u32,
    pub x: f32,
    pub y: f32,
    pub tx: f32,
    pub ty: f32,
    pub ack: u32,
}

#[derive(Default)]
pub struct World {
    pub players: BTreeMap<u32, Player>,
    next_id: u32,
    tick: u64,
}

impl World {
    pub fn join(&mut self) -> Option<u32> {
        if self.players.len() >= MAX_PLAYERS {
            return None;
        }
        self.next_id = self.next_id.checked_add(1)?;
        let id = self.next_id;
        let slot = (0..MAX_PLAYERS)
            .find(|slot| {
                !self.players.values().any(|p| {
                    (p.x - (WIDTH / 2.0 + (*slot as f32 - 3.5) * 65.0)).abs() < 30.0
                        && (p.y - HEIGHT / 2.0).abs() < 30.0
                })
            })
            .unwrap_or(0);
        let x = WIDTH / 2.0 + (slot as f32 - 3.5) * 65.0;
        self.players.insert(
            id,
            Player {
                id,
                x,
                y: HEIGHT / 2.0,
                tx: x,
                ty: HEIGHT / 2.0,
                ack: 0,
            },
        );
        Some(id)
    }

    pub fn move_to(&mut self, id: u32, seq: u32, x: f32, y: f32) {
        if !x.is_finite() || !y.is_finite() {
            return;
        }
        if let Some(p) = self.players.get_mut(&id) {
            if seq <= p.ack {
                return;
            }
            p.ack = seq;
            p.tx = x.clamp(MARGIN, WIDTH - MARGIN);
            p.ty = y.clamp(MARGIN, HEIGHT - MARGIN);
        }
    }

    pub fn step(&mut self) {
        self.tick += 1;
        for p in self.players.values_mut() {
            let (dx, dy) = (p.tx - p.x, p.ty - p.y);
            let distance = dx.hypot(dy);
            let step = SPEED / TICK_HZ as f32;
            if distance <= step {
                p.x = p.tx;
                p.y = p.ty;
            } else {
                p.x += dx / distance * step;
                p.y += dy / distance * step;
            }
        }
    }

    pub fn snapshot(&self) -> String {
        let players: Vec<_> = self
            .players
            .values()
            .map(|p| Player {
                x: round(p.x),
                y: round(p.y),
                tx: round(p.tx),
                ty: round(p.ty),
                ..p.clone()
            })
            .collect();
        serde_json::json!({ "type": "snapshot", "tick": self.tick, "players": players }).to_string()
    }
}

fn round(n: f32) -> f32 {
    (n * 10.0).round() / 10.0
}

#[derive(Clone)]
pub struct Shared {
    pub world: Arc<Mutex<World>>,
    pub snapshots: watch::Sender<String>,
}

impl Default for Shared {
    fn default() -> Self {
        let world = World::default();
        let (snapshots, _) = watch::channel(world.snapshot());
        Self {
            world: Arc::new(Mutex::new(world)),
            snapshots,
        }
    }
}

impl Shared {
    pub async fn run(self) {
        let mut clock = tokio::time::interval(Duration::from_millis(1000 / TICK_HZ as u64));
        clock.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);
        loop {
            clock.tick().await;
            let snapshot = {
                let mut world = self.world.lock().unwrap();
                world.step();
                world.snapshot()
            };
            // One latest state per client; a slow receiver never grows a snapshot queue.
            self.snapshots.send_replace(snapshot);
        }
    }

    pub fn join(&self) -> Option<u32> {
        self.world.lock().unwrap().join()
    }
    pub fn leave(&self, id: u32) {
        self.world.lock().unwrap().players.remove(&id);
    }

    pub fn welcome(&self, id: u32) -> String {
        serde_json::json!({ "type": "welcome", "id": id, "width": WIDTH, "height": HEIGHT,
            "speed": SPEED, "tickHz": TICK_HZ, "maxPlayers": MAX_PLAYERS })
        .to_string()
    }

    pub fn command(&self, id: u32, bytes: &[u8]) -> Option<String> {
        match decode(bytes)? {
            Command::Move { seq, x, y } => {
                self.world.lock().unwrap().move_to(id, seq, x, y);
                None
            }
            Command::Ping { nonce } => {
                Some(serde_json::json!({ "type": "pong", "nonce": nonce }).to_string())
            }
        }
    }
}

pub struct Budget {
    start: Instant,
    count: u32,
}
impl Default for Budget {
    fn default() -> Self {
        Self {
            start: Instant::now(),
            count: 0,
        }
    }
}
impl Budget {
    pub fn allow(&mut self) -> bool {
        if self.start.elapsed() >= Duration::from_secs(1) {
            self.start = Instant::now();
            self.count = 0;
        }
        self.count += 1;
        self.count <= 60
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn movement_is_server_timed_and_stops_at_destination() {
        let mut w = World::default();
        let id = w.join().unwrap();
        let start = w.players[&id].clone();
        w.move_to(id, 1, start.x + 220.0, start.y);
        assert_eq!(w.players[&id].x, start.x, "a command cannot teleport");
        for _ in 0..20 {
            w.step();
        }
        assert!((w.players[&id].x - start.x - 220.0).abs() < 0.01);
        for _ in 0..20 {
            w.step();
        }
        assert_eq!(w.players[&id].x, w.players[&id].tx);
    }

    #[test]
    fn diagonal_speed_is_normalized_and_stale_commands_cannot_rewind_target() {
        let mut w = World::default();
        let id = w.join().unwrap();
        let start = w.players[&id].clone();
        w.move_to(id, 3, start.x + 200.0, start.y + 200.0);
        w.move_to(id, 2, 0.0, 0.0);
        w.move_to(id, 3, 0.0, 0.0);
        w.step();
        let p = &w.players[&id];
        assert_eq!(p.ack, 3);
        assert_eq!(p.tx, start.x + 200.0);
        assert!(((p.x - start.x).hypot(p.y - start.y) - SPEED / TICK_HZ as f32).abs() < 0.001);
    }

    #[test]
    fn boundaries_invalid_payloads_capacity_and_disconnect() {
        let shared = Shared::default();
        let id = shared.join().unwrap();
        shared.command(id, br#"{"type":"move","seq":1,"x":-9999,"y":99999}"#);
        let w = shared.world.lock().unwrap();
        assert_eq!(
            (w.players[&id].tx, w.players[&id].ty),
            (MARGIN, HEIGHT - MARGIN)
        );
        drop(w);
        assert!(decode(br#"{"type":"move","seq":2,"x":null,"y":0}"#).is_none());
        assert!(decode(br#"{"type":"move","seq":2,"x":0,"y":0,"id":999}"#).is_none());
        assert!(decode(&[b' '; MAX_INPUT + 1]).is_none());
        for _ in 1..MAX_PLAYERS {
            assert!(shared.join().is_some());
        }
        assert!(shared.join().is_none());
        shared.leave(id);
        assert!(shared.join().is_some());
    }

    #[test]
    fn full_snapshot_fits_datagram_even_with_large_counters() {
        let mut w = World {
            next_id: u32::MAX - 10,
            tick: u64::MAX,
            ..World::default()
        };
        for _ in 0..MAX_PLAYERS {
            let id = w.join().unwrap();
            w.move_to(id, u32::MAX, 1171.9, 731.9);
        }
        for p in w.players.values_mut() {
            p.x = 1111.1;
            p.y = 711.1;
        }
        assert!(w.snapshot().len() <= 1100, "{} bytes", w.snapshot().len());
    }
}
