/// Pure combat math; transport and presentation never choose damage.
pub fn damage(parts: &[f32; 5], defense: f32, resistance: &[f32; 5]) -> f32 {
    resolved_parts(parts, defense, resistance)
        .iter()
        .sum::<f32>()
        .max(1.0)
}
pub fn resolved_parts(parts: &[f32; 5], defense: f32, resistance: &[f32; 5]) -> [f32; 5] {
    std::array::from_fn(|i| {
        let armor = if i == 0 {
            100.0 / (100.0 + defense.max(0.0))
        } else {
            1.0
        };
        parts[i].max(0.0) * armor * (1.0 - resistance[i].clamp(-50.0, 90.0) / 100.0)
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn elemental_armor_and_resistance() {
        assert_eq!(damage(&[100.0, 0.0, 0.0, 0.0, 0.0], 100.0, &[0.0; 5]), 50.0);
        assert_eq!(
            damage(
                &[0.0, 0.0, 100.0, 0.0, 0.0],
                100.0,
                &[0.0, 0.0, 50.0, 0.0, 0.0]
            ),
            50.0
        );
    }
}

pub struct SkillDamage {
    pub parts: [f32; 5],
    pub direct: f32,
}
fn overcomes(from: i8, to: i8) -> bool {
    (0..5).contains(&from) && (0..5).contains(&to) && [1, 4, 3, 0, 2][from as usize] == to
}
/// Native ja/hs rules on a resolved hit. Defense is an accuracy input, never
/// a second physical damage divisor. Rolls are per-element 0.85..1.15.
pub fn skill_damage(
    skill: &super::definitions::Skill,
    resistance: &[f32; 5],
    target_series: i8,
    rolls: [f32; 5],
    critical: bool,
    fatal: bool,
) -> SkillDamage {
    let p = skill.pve.as_ref();
    let advantage = p.is_some_and(|p| overcomes(p.series, target_series));
    let disadvantage = p.is_some_and(|p| overcomes(target_series, p.series));
    let cap = p.map_or(75.0, |p| p.resistance_cap);
    let maximum = p.map_or(95.0, |p| p.maximum_resistance);
    let mut parts = std::array::from_fn(|i| {
        let mut res = resistance[i] - p.map_or(0.0, |p| p.anti[i]);
        if advantage {
            res -= p.unwrap().series_resistance;
        }
        if disadvantage {
            res += p.unwrap().series_resistance;
        }
        skill.parts[i].max(0.0) * rolls[i] * (1.0 - res.clamp(-cap, cap.min(maximum)) / 100.0)
    });
    if critical {
        parts[0] *= p.map_or(2.0, |p| p.critical_multiplier);
    }
    let mut direct = parts[0] + parts[2] + parts[3] + parts[4];
    if advantage {
        direct += p.unwrap().flat_series;
    }
    if fatal {
        direct *= 1.5;
    }
    if advantage {
        direct *= 1.0 + p.unwrap().advantage_bonus;
    }
    if disadvantage {
        direct *= 1.0 - p.unwrap().advantage_bonus;
    }
    if let Some(p) = p {
        if (0..5).contains(&target_series) {
            direct *= 1.0 + p.versus[target_series as usize] / 100.0;
        }
    }
    SkillDamage { parts, direct }
}

#[cfg(test)]
mod native_parity {
    #[derive(serde::Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct Case {
        name: String,
        skill: crate::domain::definitions::Skill,
        resistance: [f32; 5],
        target_series: i8,
        rolls: [f32; 5],
        critical: bool,
        fatal: bool,
        expected: Expected,
    }
    #[derive(serde::Deserialize)]
    struct Expected {
        parts: [f32; 5],
        direct: f32,
    }
    #[test]
    fn resolved_hits_match_native_resistance_and_damage_modifiers() {
        let cases: Vec<Case> = serde_json::from_str(include_str!(
            "../../../../test/fixtures/multiplayer-damage.json"
        ))
        .unwrap();
        for c in cases {
            let actual = super::skill_damage(
                &c.skill,
                &c.resistance,
                c.target_series,
                c.rolls,
                c.critical,
                c.fatal,
            );
            assert!(
                (actual.direct - c.expected.direct).abs() < 0.01,
                "{}: {} vs {}",
                c.name,
                actual.direct,
                c.expected.direct
            );
            for i in 0..5 {
                assert!(
                    (actual.parts[i] - c.expected.parts[i]).abs() < 0.01,
                    "{} part {}",
                    c.name,
                    i
                );
            }
        }
    }
}
