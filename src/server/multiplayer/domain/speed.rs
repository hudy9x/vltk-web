//! Native speed phases supplied by the trusted stat adapter; no second balance table.
use super::*;
use serde::{Deserialize,Serialize};
#[derive(Clone,Debug,Deserialize,Serialize)]
#[serde(rename_all="camelCase")]
pub struct Timing {pub run_percent:f32,pub config:Configuration}
#[derive(Clone,Debug,Deserialize,Serialize)]
#[serde(rename_all="camelCase")]
pub struct Configuration {pub min_percent:f32,pub max_percent:f32,pub run:Track,pub attack:Track}
#[derive(Clone,Debug,Deserialize,Serialize)]
#[serde(rename_all="camelCase")]
pub struct Track {pub reference_frames:f32,#[serde(default)]pub distance_scale:f32,pub phases:Vec<Phase>}
#[derive(Clone,Debug,Deserialize,Serialize)]
#[serde(rename_all="camelCase")]
pub struct Phase {pub min_percent:f32,pub fps:f32}
fn resolve(raw:f32,track:&Track,c:&Configuration)->Option<(f32,f32)> {
    let raw=if raw.is_nan(){100.0}else{raw};
    let percent=raw.clamp(c.min_percent,c.max_percent);
    let selected=track.phases.iter().filter(|p|p.min_percent<=percent+0.00001).last()?;
    let baseline=track.phases.iter().find(|p|p.min_percent==100.0)?;
    Some((selected.fps/baseline.fps,track.reference_frames/selected.fps))
}
pub(crate) fn movement(a:&Actor)->f32 {
    let factor=pvp::movement_factor(a);
    if let Some(t)=&a.profile.timing {
        if let Some((multiplier,_))=resolve(t.run_percent*factor,&t.config.run,&t.config){
            return 150.0*t.config.run.distance_scale*multiplier;
        }
    }
    a.profile.speed*factor
}
pub(super) fn attack(a:&Actor,s:&Skill)->(f32,f32) {
    if let (Some(t),Some(percent))=(&a.profile.timing,s.attack_percent) {
        if let Some((_,cycle))=resolve(percent*pvp::movement_factor(a),&t.config.attack,&t.config){
            return (cycle,cycle.max(s.cast_cooldown.unwrap_or(s.cooldown)));
        }
    }
    (0.4,s.cooldown.max(0.15))
}
