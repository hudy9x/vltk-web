use crate::domain::{Command, Game};
use anyhow::{Result, ensure};
pub fn snapshot(game: &Game, id: u32) -> Option<Vec<u8>> {
    let a = game.actors.get(&id)?;
    let room = game.rooms.get(&a.map)?;
    let actors: Vec<_> = game
        .actors
        .iter()
        .filter(|(_, a2)| a2.map == a.map)
        .collect();
    let events: Vec<_> = game
        .events
        .iter()
        .filter(|e| e.map == a.map)
        .rev()
        .take(128)
        .collect();
    let mut b = vec![crate::protocol::VERSION, 17];
    for v in [game.tick, a.map, id, a.seq] {
        b.extend(v.to_le_bytes());
    }
    for n in [actors.len(), room.mobs.len(), room.loot.len(), events.len()] {
        b.extend((n as u16).to_le_bytes());
    }
    b.extend(a.command_tick.to_le_bytes());
    let speed = if a.hp <= 0.0 || a.stun > 0.0 || a.pvp.hurt>0.0 {
        0.0
    } else {
        crate::domain::speed::movement(a)
    };
    b.extend(speed.to_le_bytes());
    let goal = a.move_goal.unwrap_or((a.x, a.y));
    b.extend(goal.0.to_le_bytes());
    b.extend(goal.1.to_le_bytes());
    b.push(if a.move_goal.is_none() || a.hp <= 0.0 {
        0
    } else if a.path.is_empty() {
        2
    } else {
        1
    });
    for (&id, a) in actors {
        b.extend(id.to_le_bytes());
        for v in [
            a.x,
            a.y,
            a.hp,
            a.mp,
            a.profile.hp,
            a.profile.mp,
            a.cold,
            a.stun,
        ] {
            b.extend(v.to_le_bytes());
        }
        b.push(u8::from(a.farming));
        b.push(a.party_alignment.unwrap_or(a.profile.alignment));b.push(u8::from(a.pvp.enabled));b.extend(a.life.to_le_bytes());
        for value in [a.pvp.cold_power,a.pvp.hurt,a.pvp.poison]{b.extend(value.to_le_bytes());}
    }
    for m in &room.mobs {
        for v in [m.id, m.def.id] {
            b.extend(v.to_le_bytes());
        }
        for v in [m.x, m.y, m.hp, m.def.hp, m.cold, m.stun, m.poison] {
            b.extend(v.to_le_bytes());
        }
        b.extend(m.def.level.to_le_bytes());
        b.push(m.dir);
        b.push(u8::from(m.moving));
        b.extend(m.life.to_le_bytes());
        b.extend(m.cold_power.to_le_bytes());
    }
    for l in &room.loot {
        b.extend(l.id.to_le_bytes());
        for v in [l.x, l.y] {
            b.extend(v.to_le_bytes());
        }
        b.extend(if l.knb>0{l.knb}else{l.gold}.to_le_bytes());
        b.push(if l.knb>0{3}else{u8::from(l.public || l.owner == a.account && l.owner_slot == a.slot)});
    }
    for e in events.into_iter().rev() {
        for v in [e.id, e.source, e.target] {
            b.extend(v.to_le_bytes());
        }
        b.extend(e.skill.to_le_bytes());
        b.push(e.kind);
        b.extend(e.value.to_le_bytes());
        b.extend(e.tick.to_le_bytes());
        if e.kind == 2 { b.push(e.hit); }
        if let Some(c) = &e.cast {
            b.extend(c.level.to_le_bytes());
            b.push(c.missiles);
            b.push(c.flags);
            for v in [c.range, c.x, c.y, c.target_x, c.target_y] {
                b.extend(v.to_le_bytes());
            }
        }
    }
    let supports:Vec<_>=game.actors.iter().filter(|(_,actor)|actor.map==a.map).flat_map(|(&id,actor)|{
        actor.base_profile.support.as_ref().into_iter().flat_map(move |catalog|catalog.skills.iter().map(move |skill|(id,actor,skill)))
    }).collect();
    b.extend((supports.len() as u16).to_le_bytes());
    for (id,actor,skill) in supports {
        b.extend(id.to_le_bytes());b.extend(skill.id.to_le_bytes());
        b.extend(actor.support.active.get(&skill.id).copied().unwrap_or(0.0).to_le_bytes());
        b.extend(actor.support.cooldowns.get(&skill.id).copied().unwrap_or(0.0).to_le_bytes());
        let active=actor.hp>0.0&&(actor.support.active.contains_key(&skill.id)||actor.support.auras.contains(&skill.id));
        b.push(u8::from(active)|(u8::from(skill.aura)<<1));
    }
    crate::domain::party::encode(game, id, &mut b);
    if let Some(death)=&a.death_notice {
        b.push(0xd1);b.extend(death.killer.to_le_bytes());b.push(u8::from(death.player));
        let mut name=death.name.clone();while name.len()>96{name.pop();}
        b.push(name.len() as u8);b.extend(name.as_bytes());
    }
    Some(b)
}
pub fn command(bytes: &[u8]) -> Result<Command> {
    ensure!(
        bytes.len() == 25 && bytes[0] == crate::protocol::VERSION && bytes[1] == 16,
        "invalid command"
    );
    let c = Command {
        seq: crate::protocol::u32_at(bytes, 2),
        kind: bytes[6],
        map: crate::protocol::u32_at(bytes, 7),
        target: crate::protocol::u32_at(bytes, 11),
        skill: u16::from_le_bytes(bytes[15..17].try_into()?),
        x: f32::from_le_bytes(bytes[17..21].try_into()?),
        y: f32::from_le_bytes(bytes[21..25].try_into()?),
    };
    ensure!(
        (1..=17).contains(&c.kind) && c.x.is_finite() && c.y.is_finite(),
        "invalid command data"
    );
    Ok(c)
}
