use anyhow::{Result, ensure};

pub const VERSION: u8 = 7;
pub const MAX_PLAYERS: usize = 32;
#[derive(Clone, Debug, PartialEq)]
pub struct Appearance {
    pub faction: u8,
    pub sex: u8,
    pub body_sex: u8,
    pub ride: u8,
    pub parts: [i16; 4],
    pub name: String,
    pub rebirth: u8,
    pub effects: Vec<u16>,
}
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Position {
    pub seq: u32,
    pub map: u32,
    pub timestamp: u32,
    pub effect_time: f32,
    pub x: f32,
    pub y: f32,
    pub dir: u8,
    pub moving: u8,
}
pub fn u32_at(bytes: &[u8], offset: usize) -> u32 {
    u32::from_le_bytes(bytes[offset..offset + 4].try_into().unwrap())
}
pub fn newer(a: u32, b: u32) -> bool {
    (a.wrapping_sub(b) as i32) > 0
}
pub fn position(bytes: &[u8]) -> Result<Position> {
    ensure!(
        bytes.len() == 28 && bytes[..2] == [VERSION, 2],
        "invalid position packet"
    );
    let value = Position {
        seq: u32_at(bytes, 2),
        map: u32_at(bytes, 6),
        timestamp: u32_at(bytes, 10),
        effect_time: f32::from_le_bytes(bytes[14..18].try_into()?),
        x: f32::from_le_bytes(bytes[18..22].try_into()?),
        y: f32::from_le_bytes(bytes[22..26].try_into()?),
        dir: bytes[26],
        moving: bytes[27],
    };
    ensure!(
        value.x.is_finite()
            && value.y.is_finite()
            && value.effect_time.is_finite()
            && (0.0..=1_000_000_000.0).contains(&value.effect_time)
            && value.x.abs() <= 1_000_000.0
            && value.y.abs() <= 1_000_000.0
            && value.dir <= 7
            && value.moving <= 1,
        "invalid position values"
    );
    Ok(value)
}
pub fn appearance(bytes: &[u8], hello: bool) -> Result<(Appearance, &[u8])> {
    ensure!(
        bytes.len() >= 18 && bytes[0] == VERSION && bytes[1] == if hello { 1 } else { 3 },
        "invalid appearance"
    );
    let length = u16::from_le_bytes(bytes[14..16].try_into()?) as usize;
    let count = bytes[17] as usize;
    let start = 18 + count * 2;
    ensure!(
        bytes[16] <= 5
            && count <= 12
            && (1..=96).contains(&length)
            && bytes.len() == start + length + if hello { 69 } else { 0 },
        "invalid identity size"
    );
    ensure!(
        bytes[2] <= 31 && bytes[3] <= 1 && bytes[4] <= 1 && bytes[5] <= 1,
        "invalid appearance flags"
    );
    let mut effects = Vec::with_capacity(count);
    for chunk in bytes[18..start].chunks_exact(2) {
        let id = u16::from_le_bytes(chunk.try_into()?);
        ensure!(id > 0 && !effects.contains(&id), "invalid effects");
        effects.push(id);
    }
    let name = std::str::from_utf8(&bytes[start..start + length])?.to_string();
    ensure!(
        !name.trim().is_empty() && !name.chars().any(char::is_control),
        "invalid name"
    );
    let mut parts = [0; 4];
    for (i, part) in parts.iter_mut().enumerate() {
        *part = i16::from_le_bytes(bytes[6 + i * 2..8 + i * 2].try_into()?);
        ensure!((-1..=8192).contains(part), "invalid equipment row");
    }
    Ok((
        Appearance {
            faction: bytes[2],
            sex: bytes[3],
            body_sex: bytes[4],
            ride: bytes[5],
            parts,
            name,
            rebirth: bytes[16],
            effects,
        },
        &bytes[start + length..],
    ))
}
pub fn snapshot(tick: u32, self_id: u32, map: u32, players: &[(u32, Position)]) -> Vec<u8> {
    let mut out = vec![VERSION, 4];
    out.extend(tick.to_le_bytes());
    out.extend(self_id.to_le_bytes());
    out.extend(map.to_le_bytes());
    out.extend((players.len() as u16).to_le_bytes());
    for (id, position) in players {
        out.extend(id.to_le_bytes());
        out.extend(position.seq.to_le_bytes());
        out.extend(position.timestamp.to_le_bytes());
        out.extend(position.effect_time.to_le_bytes());
        out.extend(position.x.to_le_bytes());
        out.extend(position.y.to_le_bytes());
        out.extend([position.dir, position.moving]);
    }
    out
}
pub fn roster(revision: u32, map: u32, players: &[(u32, Appearance)]) -> Vec<u8> {
    let mut out = vec![VERSION, 5];
    out.extend(revision.to_le_bytes());
    out.extend(map.to_le_bytes());
    out.extend((players.len() as u16).to_le_bytes());
    for (id, appearance) in players {
        out.extend(id.to_le_bytes());
        out.extend([
            appearance.faction,
            appearance.sex,
            appearance.body_sex,
            appearance.ride,
        ]);
        for part in appearance.parts {
            out.extend(part.to_le_bytes());
        }
        out.extend((appearance.name.len() as u16).to_le_bytes());
        out.extend([appearance.rebirth, appearance.effects.len() as u8]);
        for effect in &appearance.effects {
            out.extend(effect.to_le_bytes());
        }
        out.extend(appearance.name.as_bytes());
    }
    out
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn binary_golden_and_bounds() {
        let bytes = [
            7, 2, 4, 3, 2, 1, 42, 0, 0, 0, 250, 0, 0, 0, 0, 0, 32, 64, 0, 0, 246, 66, 0, 0, 8, 195,
            7, 1,
        ];
        let point = position(&bytes).unwrap();
        assert_eq!(
            point,
            Position {
                seq: 0x01020304,
                map: 42,
                timestamp: 250,
                effect_time: 2.5,
                x: 123.0,
                y: -136.0,
                dir: 7,
                moving: 1
            }
        );
        let packet = snapshot(1, 9, 42, &[(9, point)]);
        assert_eq!(packet.len(), 42);
        assert_eq!(&packet[24..40], &bytes[10..26]);
        assert!(position(&bytes[..27]).is_err());
        let mut invalid = bytes;
        invalid[18..22].copy_from_slice(&f32::NAN.to_le_bytes());
        assert!(position(&invalid).is_err());
        assert!(newer(0, u32::MAX));
        assert!(!newer(u32::MAX, 0));
    }
    #[test]
    fn snapshot_fits_quic_datagram() {
        let p = Position {
            seq: 1,
            map: 0,
            timestamp: 0,
            effect_time: 0.0,
            x: 0.0,
            y: 0.0,
            dir: 0,
            moving: 0,
        };
        assert_eq!(snapshot(1, 1, 0, &vec![(1, p); MAX_PLAYERS]).len(), 848);
    }
}
