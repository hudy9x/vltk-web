use super::*;

#[derive(serde::Deserialize)]
#[serde(rename_all="camelCase")]
struct HealingRules { delay_frames:f32, frames_per_second:f32, radius:f32, y_scale:f32 }
fn rules()->&'static HealingRules {
    static RULES:std::sync::OnceLock<HealingRules>=std::sync::OnceLock::new();
    RULES.get_or_init(||serde_json::from_str(include_str!("../../../shared/emei-healing.json")).unwrap())
}
impl Game {
    pub(super) fn queue_emei_healing(&mut self,parent:&Pending,amount:f32,dt:f32) {
        if parent.skill.level<10 || !amount.is_finite() || amount<=0.0 {return;}
        // Match the fixed target anchor used by the 1114 visual at release.
        let Some(center)=parent.aim.or_else(||self.actors.get(&parent.target).map(|a|(a.x,a.y))) else{return;};
        let mut skill=parent.skill.clone();
        skill.id=1115;skill.healing=Some(amount);skill.parts=[0.0;5];skill.projectile=None;skill.followups.clear();
        self.pending.push(Pending {cast_id:0,source:parent.source,map:parent.map,target:parent.target,
            skill,remaining:(rules().delay_frames/rules().frames_per_second-dt).max(0.0),
            origin:center,aim:Some(center),flight:None});
    }
    pub(super) fn resolve_emei_healing(&mut self,p:&Pending,events:&mut Vec<EventData>) {
        let Some(source)=self.actors.get(&p.source).filter(|a|a.hp>0.0&&a.map==p.map) else{return;};
        let (war,alignment)=(source.war,source.party_alignment.unwrap_or(source.profile.alignment));
        if war.is_some_and(|w|!w.ready) {return;}
        let Some(amount)=p.skill.healing.filter(|x|x.is_finite()&&*x>0.0) else{return;};
        for (&id,a) in &mut self.actors {
            let allied=if war.is_some()||a.war.is_some(){war.zip(a.war).is_some_and(|(x,y)|
                x.match_id==y.match_id&&x.team==y.team&&x.ready&&y.ready&&y.kind<3)
            }else{alignment==a.party_alignment.unwrap_or(a.profile.alignment)};
            if !allied||a.map!=p.map||a.hp<=0.0
                ||(a.x-p.origin.0).hypot((a.y-p.origin.1)*rules().y_scale)>rules().radius {continue;}
            let before=a.hp;a.hp=(a.hp+amount).min(a.profile.hp);
            if a.hp>before {events.push((p.map,6,p.source,id,1115,a.hp-before,0));}
        }
    }
}
