//! Player combat permissions and Tống Kim damage rules. Never trust appearance colors.
use super::*;
use std::sync::OnceLock;
#[derive(Default)]
pub struct PvpState {
    pub enabled: bool,
    pub cold_power: f32,
    pub hurt: f32,
    pub poison: f32,
    poison_damage: f32,
    poison_owner: u32,
    poison_pending: f32,
    poison_elapsed: f32,
}
#[derive(Clone, Copy)]
pub(super) struct Peer {
    pub id: u32,
    pub map: u32,
    pub x: f32,
    pub y: f32,
    pub hp: f32,
    pub alignment: u8,
    pub enabled: bool,
}
pub(super) fn peers(game: &Game) -> Vec<Peer> {
    game.actors
        .iter()
        .map(|(&id, a)| Peer {
            id,
            map: a.map,
            x: a.x,
            y: a.y,
            hp: a.hp,
            alignment: a.profile.alignment,
            enabled: a.pvp.enabled,
        })
        .collect()
}
pub(super) fn hostile(id: u32, a: &Actor, b: &Peer, town: bool) -> bool {
    !town
        && id != b.id
        && a.hp > 0.0
        && b.hp > 0.0
        && a.map == b.map
        && a.profile.alignment != b.alignment
        && (a.pvp.enabled || b.enabled)
}
pub(super) fn can_hit(game: &Game, source: u32, target: u32) -> bool {
    let (Some(a), Some(b)) = (game.actors.get(&source), game.actors.get(&target)) else {
        return false;
    };
    let town = game.rooms.get(&a.map).is_none_or(|r| r.definition.town);
    hostile(
        source,
        a,
        &Peer {
            id: target,
            map: b.map,
            x: b.x,
            y: b.y,
            hp: b.hp,
            alignment: b.profile.alignment,
            enabled: b.pvp.enabled,
        },
        town,
    )
}
pub(super) fn scale() -> f32 {
    static SCALE: OnceLock<f32> = OnceLock::new();
    *SCALE.get_or_init(|| {
        serde_json::from_str::<serde_json::Value>(include_str!(
            "../../../shared/combat-balance.json"
        ))
        .expect("shared PvP balance")["battlefieldPvpDamage"]
            .as_f64()
            .expect("PvP multiplier") as f32
    })
}
pub(super) fn death(a: &mut Actor, seconds: f32) {
    if a.hp > 0.0 {
        return;
    }
    a.hp = 0.0;
    a.dead = seconds;
    a.move_goal = None;
    a.farming = false;
    a.target = 0;
    a.path.clear();
    a.pickup = 0;
    a.cold = 0.0;
    a.stun = 0.0;
    a.pvp.cold_power = 0.0;
    a.pvp.hurt = 0.0;
    a.pvp.poison = 0.0;
    a.pvp.poison_damage = 0.0;
    a.pvp.poison_pending = 0.0;
    a.pvp.poison_elapsed = 0.0;
}
pub(super) fn hit(
    game: &mut Game,
    source: u32,
    target: u32,
    input: &Skill,
    events: &mut Vec<EventData>,
) {
    if !can_hit(game, source, target) {
        return;
    }
    let mut skill = input.clone();
    let factor = scale();
    for part in &mut skill.parts {
        *part *= factor;
    }
    if let Some(p) = skill.pve.as_mut() {
        p.flat_series *= factor;
    }
    let critical = chance(&mut game.rng, skill.crit) && skill.parts[0] > 0.0;
    let fatal = skill
        .pve
        .as_ref()
        .is_some_and(|p| chance(&mut game.rng, p.heavy_chance));
    let spread = skill.pve.as_ref().map_or(0.0, |p| p.spread);
    let rolls = std::array::from_fn(|i| {
        if skill.parts[i] <= 0.0 || spread == 0.0 {
            1.0
        } else {
            chance(&mut game.rng, 0.0);
            1.0 + ((game.rng % 10000) as f32 / 10000.0 * 2.0 - 1.0) * spread
        }
    });
    let defender = game.actors.get_mut(&target).unwrap();
    let before = (defender.hp, defender.mp);
    let resolved = combat::skill_damage(
        &skill,
        &defender.profile.res,
        defender.profile.series,
        rolls,
        critical,
        fatal,
    );
    let parts = resolved.parts;
    let mut element = 0;
    for i in [2, 3, 4] {
        if parts[i] > parts[element] {
            element = i;
        }
    }
    let (amount, _) = support::receive_skill_hit(
        defender,
        resolved.direct.max(0.0),
        skill.pve.as_ref().map_or(-1, |p| p.series),
    );
    let protection = &defender.profile.protection;
    let reflection = if amount <= 0.0 {
        0.0
    } else if skill.melee {
        protection.reflect + amount * protection.reflect_percent / 100.0
    } else {
        amount * protection.ranged_reflect / 100.0
    };
    let reduction = |p: f32| 1.0 - p.clamp(0.0, 100.0) / 100.0;
    if parts[2] > 0.0 && skill.cold > 0.0 {
        let duration = skill.cold * reduction(protection.cold_reduction);
        let power = 0.75 * parts[2] / (parts[2] + 200.0);
        if duration > 0.0 && (defender.cold <= 0.0 || power >= defender.pvp.cold_power) {
            defender.cold = duration;
            defender.pvp.cold_power = power;
        }
    }
    if chance(&mut game.rng, skill.stun) {
        defender.stun = defender
            .stun
            .max(skill.stun_seconds * reduction(protection.stun_reduction));
    }
    if parts[1] > 0.0 && skill.poison > 0.0 {
        let multiplier = reduction(protection.poison_reduction);
        let duration = skill.poison * multiplier;
        if duration > 0.0 {
            let pool = defender.pvp.poison_damage * defender.pvp.poison + parts[1] * multiplier;
            defender.pvp.poison = defender.pvp.poison.max(duration);
            defender.pvp.poison_damage = pool / defender.pvp.poison;
            defender.pvp.poison_owner = source;
        }
    }
    let hurt = parts[2] <= 0.0 && amount >= defender.profile.hp * 0.15;
    if hurt {
        defender.pvp.hurt = 0.5;
        defender.support.lock = 0.0;
    }
    let map = defender.map;
    if crate::diagnostics::enabled() {
        crate::diagnostics::log(
            "pvp-hit",
            serde_json::json!({"source":source,"target":target,"skill":skill.id,"scale":factor,"resolved":resolved.direct,"damage":amount,"hpBefore":before.0,"hpAfter":defender.hp,"mpBefore":before.1,"mpAfter":defender.mp,"reflected":reflection}),
        );
    }
    if amount > 0.0 {
        events.push((
            map,
            2,
            source,
            target,
            skill.id,
            amount,
            element as u8 | if critical || fatal { 8 } else { 0 } | if hurt { 16 } else { 0 },
        ));
    }
    death(defender, game.rules.player_respawn_seconds);
    let attacker = game.actors.get_mut(&source).unwrap();
    recovery::leech(attacker, input, amount);
    if reflection > 0.0 {
        let lost = reflection.min(attacker.hp);
        attacker.hp = (attacker.hp - reflection).max(0.0);
        if lost >= attacker.profile.hp * 0.15 {
            attacker.pvp.hurt = 0.5;
            attacker.support.lock = 0.0;
        }
        if lost > 0.0 {
            events.push((map, 2, target, source, 0, lost, 0));
        }
        death(attacker, game.rules.player_respawn_seconds);
    }
}
impl Game {
    pub(super) fn advance_pvp_status(&mut self, events: &mut Vec<EventData>) {
        let dt = self.rules.tick_seconds;
        for (&id, a) in &mut self.actors {
            a.pvp.hurt = (a.pvp.hurt - dt).max(0.0);
            if a.cold <= 0.0 {
                a.pvp.cold_power = 0.0;
            }
            if a.hp <= 0.0 {
                continue;
            }
            if self.rooms.get(&a.map).is_none_or(|r| r.definition.town) {
                a.pvp.poison = 0.0;
                a.pvp.poison_damage = 0.0;
                a.pvp.poison_pending = 0.0;
                a.pvp.poison_elapsed = 0.0;
                continue;
            }
            if a.pvp.poison <= 0.0 {
                continue;
            }
            let elapsed = dt.min(a.pvp.poison);
            let lost = (a.pvp.poison_damage * elapsed).min(a.hp);
            a.hp -= lost;
            a.pvp.poison = (a.pvp.poison - elapsed).max(0.0);
            a.pvp.poison_pending += lost;
            a.pvp.poison_elapsed += elapsed;
            if a.pvp.poison_elapsed + 0.00001 >= 0.5 || a.pvp.poison <= 0.00001 || a.hp <= 0.0 {
                let value = std::mem::take(&mut a.pvp.poison_pending);
                a.pvp.poison_elapsed = 0.0;
                if value > 0.0 {
                    events.push((
                        a.map,
                        2,
                        a.pvp.poison_owner,
                        id,
                        0,
                        value,
                        status::POISON_TICK,
                    ));
                }
            }
            death(a, self.rules.player_respawn_seconds);
        }
    }
}

pub(crate) fn movement_factor(a: &Actor) -> f32 {
    if a.cold <= 0.0 {
        1.0
    } else if a.pvp.cold_power > 0.0 {
        1.0 - a.pvp.cold_power
    } else {
        0.5
    }
}
