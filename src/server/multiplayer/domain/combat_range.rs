use super::Skill;

// Native units are scaled into world coordinates; the projected Y axis is shorter.
pub(super) fn can_cast(skill:&Skill, origin:(f32,f32), target:(f32,f32))->bool {
    let dx=target.0-origin.0; let dy=target.1-origin.1;
    match &skill.geometry {
        Some(g)=>dx.hypot(dy/g.cast_y_ratio.max(0.01))<=skill.range*g.scale+17.0,
        None=>dx.hypot(dy)<=skill.range+12.0,
    }
}
pub(super) fn contains_impact(skill:&Skill, center:(f32,f32), target:(f32,f32))->bool {
    let dx=target.0-center.0;let dy=target.1-center.1;
    match &skill.geometry {
        Some(g)=>dx.hypot((dy-g.impact_offset_y.unwrap_or(0.0))*g.impact_y_scale)<=skill.radius+17.0,
        None=>dx.hypot(dy)<=skill.radius,
    }
}
pub(super) fn ignores_terrain(skill:&Skill)->bool {
    skill.geometry.as_ref().is_some_and(|g|g.ignore_terrain)
}
