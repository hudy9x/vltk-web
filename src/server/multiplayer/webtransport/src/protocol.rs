use anyhow::{Result, ensure};

pub const VERSION: u8 = 1;
pub const MAX_PLAYERS: usize = 32;
#[derive(Clone, Debug, PartialEq)]
pub struct Appearance {
    pub faction: u8,
    pub sex: u8,
    pub body_sex: u8,
    pub ride: u8,
    pub parts: [i16; 4],
    pub name: String,
}
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Position {
    pub seq: u32,
    pub map: u32,
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
        bytes.len() == 20 && bytes[..2] == [VERSION, 2],
        "invalid position packet"
    );
    let value = Position {
        seq: u32_at(bytes, 2),
        map: u32_at(bytes, 6),
        x: f32::from_le_bytes(bytes[10..14].try_into()?),
        y: f32::from_le_bytes(bytes[14..18].try_into()?),
        dir: bytes[18],
        moving: bytes[19],
    };
    ensure!(
        value.x.is_finite()
            && value.y.is_finite()
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
        bytes.len() >= 16 && bytes[0] == VERSION && bytes[1] == if hello { 1 } else { 3 },
        "invalid appearance"
    );
    let length = u16::from_le_bytes(bytes[14..16].try_into()?) as usize;
    ensure!(
        (1..=96).contains(&length) && bytes.len() == 16 + length + if hello { 69 } else { 0 },
        "invalid identity size"
    );
    ensure!(
        bytes[2] <= 31 && bytes[3] <= 1 && bytes[4] <= 1 && bytes[5] <= 1,
        "invalid appearance flags"
    );
    let name = std::str::from_utf8(&bytes[16..16 + length])?.to_string();
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
        },
        &bytes[16 + length..],
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
            1, 2, 4, 3, 2, 1, 42, 0, 0, 0, 0, 0, 246, 66, 0, 0, 8, 195, 7, 1,
        ];
        let point = position(&bytes).unwrap();
        assert_eq!(
            point,
            Position {
                seq: 0x01020304,
                map: 42,
                x: 123.0,
                y: -136.0,
                dir: 7,
                moving: 1
            }
        );
        let packet = snapshot(1, 9, 42, &[(9, point)]);
        assert_eq!(packet.len(), 34);
        assert_eq!(&packet[24..32], &bytes[10..18]);
        assert!(position(&bytes[..19]).is_err());
        let mut invalid = bytes;
        invalid[10..14].copy_from_slice(&f32::NAN.to_le_bytes());
        assert!(position(&invalid).is_err());
        assert!(newer(0, u32::MAX));
        assert!(!newer(u32::MAX, 0));
    }
    #[test]
    fn snapshot_fits_quic_datagram() {
        let p = Position {
            seq: 1,
            map: 0,
            x: 0.0,
            y: 0.0,
            dir: 0,
            moving: 0,
        };
        assert_eq!(snapshot(1, 1, 0, &vec![(1, p); MAX_PLAYERS]).len(), 592);
    }
}
