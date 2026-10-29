//! Resolved status rules. Inputs come from the trusted catalog; clients only render results.
use super::*;
pub(super) const CRITICAL: u8 = 8;
pub(super) const HURT: u8 = 16;
pub(super) const POISON_TICK: u8 = 1 | 32;
pub(super) struct Hit {
    pub amount: f32,
    pub flags: u8,
}

pub(super) fn cold_factor(m: &Mob) -> f32 {
    if m.cold > 0.0 {
        1.0 - m.cold_power.clamp(0.0, 0.75)
    } else {
        1.0
    }
}

pub(super) fn apply_hit(skill: &Skill, m: &mut Mob, source: u32, rng: &mut u64) -> Hit {
    let critical = chance(rng, skill.crit) && skill.parts[0] > 0.0;
    let fatal = skill
        .pve
        .as_ref()
        .is_some_and(|p| chance(rng, p.heavy_chance));
    let spread = skill.pve.as_ref().map_or(0.0, |p| p.spread);
    let rolls = std::array::from_fn(|i| {
        if skill.parts[i] <= 0.0 || spread == 0.0 {
            return 1.0;
        }
        chance(rng, 0.0);
        1.0 + ((*rng % 10000) as f32 / 10000.0 * 2.0 - 1.0) * spread
    });
    let resolved = combat::skill_damage(skill, &m.def.res, m.def.series, rolls, critical, fatal);
    let parts = resolved.parts;
    let mut kind = 0;
    for i in [2, 3, 4] {
        if parts[i] > parts[kind] {
            kind = i;
        }
    }
    // Poison is a total budget consumed over time, never a second direct hit.
    let direct = resolved.direct;
    let amount = if direct > 0.0 { direct.max(1.0) } else { 0.0 };
    // Native hit labels show the resolved blow, including overkill. HP stays
    // clamped independently so rewards/death logic still sees zero, not negatives.
    m.hp = (m.hp - amount).max(0.0);
    m.target = source;
    if m.hp <= 0.0 {
        m.killer = source;
    }
    let power = 0.75 * parts[2] / (parts[2] + 200.0);
    if parts[2] > 0.0 && skill.cold > 0.0 && (m.cold <= 0.0 || power >= m.cold_power) {
        m.cold = skill.cold;
        m.cold_power = power;
    }
    if chance(rng, skill.stun) {
        m.stun = m.stun.max(skill.stun_seconds);
    }
    if parts[1] > 0.0 && skill.poison > 0.0 {
        let budget = m.poison_damage * m.poison + parts[1];
        m.poison = m.poison.max(skill.poison);
        m.poison_damage = budget / m.poison;
        m.poison_owner = source;
    }
    let hurt = parts[2] <= 0.0 && amount >= m.def.hp * 0.15;
    if hurt {
        m.hurt = 0.5;
    }
    Hit {
        amount,
        flags: kind as u8
            | if critical || fatal { CRITICAL } else { 0 }
            | if hurt { HURT } else { 0 },
    }
}

pub(super) fn advance_poison(m: &mut Mob, dt: f32) -> Option<f32> {
    if m.poison <= 0.0 {
        return None;
    }
    let elapsed = dt.min(m.poison);
    let amount = (m.poison_damage * elapsed).min(m.hp);
    m.poison = (m.poison - elapsed).max(0.0);
    if m.poison < 0.00001 {
        m.poison = 0.0;
    }
    m.hp -= amount;
    m.poison_pending += amount;
    m.poison_elapsed += elapsed;
    // Aggregate display events; HP still advances at the authoritative 20 Hz.
    if m.poison_elapsed + 0.00001 >= 0.5 || m.poison <= 0.00001 || m.hp <= 0.0 {
        m.poison_elapsed = 0.0;
        let displayed = std::mem::take(&mut m.poison_pending);
        return (displayed > 0.0).then_some(displayed);
    }
    None
}
