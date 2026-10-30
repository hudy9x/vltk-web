use super::*;
fn game() -> Game {
    static NEXT_FILE: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
    let file = std::env::temp_dir().join(format!(
        "vltk-domain-{}-{}-{}.jsonl",
        std::process::id(),
        NEXT_FILE.fetch_add(1, std::sync::atomic::Ordering::Relaxed),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ));
    let mut g = Game::new(file).unwrap();
    let map = |id, town| serde_json::json!({"id":id,"level":1,"town":town,"width":1000,"height":1000,"entry":{"x":100,"y":100},"grid":{"kind":"open"},"monsters":[{"id":34,"name":"fixture","level":1,"hp":20,"damage":1,"defense":0,"speed":20,"res":[0,0,0,0,0],"xp":5,"gold":2}]});
    g.install(
        serde_json::from_value(
            serde_json::json!({"version":1,"town":1,"maps":[map(1,true),map(2,false)]}),
        )
        .unwrap(),
    )
    .unwrap();
    let profile:Profile=serde_json::from_value(serde_json::json!({"level":1,"hp":200,"mp":30,"regen":0,"manaRegen":0,"speed":150,"defense":0,"res":[0,0,0,0,0],"skills":[{"id":1,"cost":10,"cooldown":1,"range":200,"radius":0,"shape":"single","targets":1,"parts":[10,0,0,0,0],"crit":0,"stun":100,"cold":2,"poison":0,"travel":0}]})).unwrap();
    g.join(1, "account-a".into(), 0, profile.clone()).unwrap();
    g.join(2, "account-b".into(), 0, profile).unwrap();
    g
}
fn cmd(seq: u32, kind: u8, map: u32, target: u32, skill: u16, x: f32, y: f32) -> Command {
    Command {
        seq,
        kind,
        map,
        target,
        skill,
        x,
        y,
    }
}
fn field(g: &mut Game) {
    g.command(1, cmd(1, 1, 2, 0, 0, 0.0, 0.0)).unwrap();
    g.command(2, cmd(1, 1, 2, 0, 0, 0.0, 0.0)).unwrap();
    let room = g.rooms.get_mut(&2).unwrap();
    room.mobs.truncate(1);
    room.mobs[0].x = 150.0;
    room.mobs[0].y = 100.0;
    room.mobs[0].home = (150.0, 100.0);
}
#[test]
fn shared_hp_cooldown_mana_and_status() {
    let mut g = game();
    g.actors.get_mut(&1).unwrap().profile.skills[0].parts = [9.0, 0.0, 1.0, 0.0, 0.0];
    field(&mut g);
    let mob = g.rooms[&2].mobs[0].id;
    g.command(1, cmd(2, 3, 2, mob, 1, 0.0, 0.0)).unwrap();
    for _ in 0..3 {
        client_step(&mut g);
    }
    assert_eq!(g.rooms[&2].mobs[0].hp, 10.0);
    assert_eq!(g.actors[&1].mp, 20.0);
    assert!(g.rooms[&2].mobs[0].cold > 0.0);
    assert!(g.rooms[&2].mobs[0].stun > 0.0);
    g.command(1, cmd(3, 4, 2, mob, 1, 0.0, 0.0)).unwrap();
    client_step(&mut g);
    assert_eq!(g.rooms[&2].mobs[0].hp, 10.0);
    assert_eq!(g.actors[&1].mp, 20.0);
    assert_eq!(
        crate::pve_protocol::snapshot(&g, 1).unwrap()[43 + 55 * 2 + 16..43 + 55 * 2 + 20],
        crate::pve_protocol::snapshot(&g, 2).unwrap()[43 + 55 * 2 + 16..43 + 55 * 2 + 20]
    );
    for _ in 0..25 {
        client_step(&mut g);
    }
    assert_eq!(g.outbox.pending.len(), 1);
    assert_eq!(g.rooms[&2].loot.len(), 1);
    let file = g.outbox.path_for_test();
    drop(g);
    std::fs::remove_file(file).unwrap();
}

#[test]
fn party_invitation_membership_colors_and_leader_succession() {
    let mut g=game();field(&mut g);
    g.actors.get_mut(&1).unwrap().profile.alignment=0;
    g.actors.get_mut(&2).unwrap().profile.alignment=1;
    g.actors.get_mut(&1).unwrap().pvp.enabled=true;
    assert!(pvp::can_hit(&g,1,2));
    g.command(1,cmd(2,12,2,2,0,0.0,0.0)).unwrap();
    assert_eq!(g.parties.leader(1),0); // Never join before consent.
    let invitation=g.parties.invitations[&2].id;
    g.command(2,cmd(2,13,2,invitation,0,0.0,0.0)).unwrap();
    assert_eq!(g.parties.groups[&1],vec![1,2]);
    assert_eq!(g.actors[&2].party_alignment,Some(0));
    assert!(!pvp::can_hit(&g,1,2));assert!(!pvp::can_hit(&g,2,1));
    let profile=g.actors[&2].profile.clone();
    g.join(3,"third".into(),0,profile).unwrap();g.actors.get_mut(&3).unwrap().map=2;
    g.command(1,cmd(3,12,2,3,0,0.0,0.0)).unwrap();
    let invitation=g.parties.invitations[&3].id;
    g.command(3,cmd(1,13,2,invitation,0,0.0,0.0)).unwrap();
    g.party_leave(1);
    assert_eq!(g.parties.groups[&2],vec![2,3]);
    assert_eq!(g.actors[&1].party_alignment,None);
    assert_eq!(g.actors[&3].party_alignment,Some(1));
    g.command(3,cmd(2,15,2,0,0,0.0,0.0)).unwrap();
    assert!(g.parties.groups.is_empty());assert_eq!(g.actors[&2].party_alignment,None);
}

#[test]
fn party_rejects_stale_remote_replayed_or_unauthorized_invitations() {
    let mut g=game();
    g.command(1,cmd(1,12,1,1,0,0.0,0.0)).unwrap();assert!(g.parties.invitations.is_empty());
    g.command(1,cmd(2,12,1,2,0,0.0,0.0)).unwrap();let invite=g.parties.invitations[&2].id;
    g.command(2,cmd(1,13,1,invite+1,0,0.0,0.0)).unwrap();assert_eq!(g.parties.replies[&2].1,8);
    g.command(2,cmd(2,14,1,invite,0,0.0,0.0)).unwrap();assert!(g.parties.invitations.is_empty());
    g.command(1,cmd(3,12,1,2,0,0.0,0.0)).unwrap();let invite=g.parties.invitations[&2].id;
    g.tick+= (party::INVITE_SECONDS/g.rules.tick_seconds) as u32+1;
    g.command(2,cmd(3,13,1,invite,0,0.0,0.0)).unwrap();assert_eq!(g.parties.leader(2),0);
    g.command(1,cmd(4,12,1,2,0,0.0,0.0)).unwrap();let invite=g.parties.invitations[&2].id;
    g.party_leave(1);g.actors.remove(&1);
    g.command(2,cmd(4,13,1,invite,0,0.0,0.0)).unwrap();assert!(g.parties.groups.is_empty());
}

#[test]
fn party_capacity_map_guards_and_in_flight_friendly_fire() {
    let mut g=game();field(&mut g);
    g.actors.get_mut(&1).unwrap().profile.alignment=0;
    g.actors.get_mut(&2).unwrap().profile.alignment=1;
    g.actors.get_mut(&1).unwrap().pvp.enabled=true;
    let profile=g.actors[&2].profile.clone();
    for id in 3..=10 {g.join(id,format!("account-{id}"),0,profile.clone()).unwrap();g.actors.get_mut(&id).unwrap().map=2;}
    g.command(1,cmd(2,12,1,2,0,0.0,0.0)).unwrap();assert!(g.parties.invitations.is_empty());
    g.actors.get_mut(&2).unwrap().x=2000.0;
    g.command(1,cmd(3,12,2,2,0,0.0,0.0)).unwrap();assert_eq!(g.parties.replies[&1].1,9);
    g.actors.get_mut(&2).unwrap().x=100.0;
    for id in 2..=8 {
        g.command(1,cmd(id+2,12,2,id,0,0.0,0.0)).unwrap();let invite=g.parties.invitations[&id].id;
        g.command(id,cmd(10,13,2,invite,0,0.0,0.0)).unwrap();
    }
    assert_eq!(g.parties.groups[&1].len(),8);
    g.command(1,cmd(20,12,2,9,0,0.0,0.0)).unwrap();assert_eq!(g.parties.replies[&1].1,7);
    g.command(2,cmd(11,12,2,9,0,0.0,0.0)).unwrap();assert_eq!(g.parties.replies[&2].1,6);
    let hp=g.actors[&2].hp;let skill=g.actors[&1].profile.skills[0].clone();
    let mut events=vec![];pvp::hit(&mut g,1,2,&skill,&mut events);
    assert_eq!(g.actors[&2].hp,hp);assert!(events.is_empty());
    let bytes=crate::pve_protocol::snapshot(&g,1).unwrap();assert_eq!(bytes[0],8);
}
#[test]
fn ownership_replay_and_durable_rewards() {
    let mut g = game();
    field(&mut g);
    let mob = g.rooms[&2].mobs[0].id;
    g.command(1, cmd(2, 3, 2, mob, 1, 0.0, 0.0)).unwrap();
    for _ in 0..25 {
        client_step(&mut g);
    }
    let loot = g.rooms[&2].loot[0].id;
    g.command(2, cmd(2, 6, 2, loot, 0, 0.0, 0.0)).unwrap();
    client_step(&mut g);
    assert_eq!(g.rooms[&2].loot.len(), 1);
    g.command(1, cmd(3, 6, 2, loot, 0, 0.0, 0.0)).unwrap();
    client_step(&mut g);
    assert!(g.rooms[&2].loot.is_empty());
    let count = g.outbox.pending.len();
    g.command(1, cmd(3, 6, 2, loot, 0, 0.0, 0.0)).unwrap();
    client_step(&mut g);
    assert_eq!(g.outbox.pending.len(), count);
    let file = g.outbox.path_for_test();
    drop(g);
    let o = Outbox::open(file.clone()).unwrap();
    assert_eq!(o.pending.len(), 2);
    drop(o);
    std::fs::remove_file(file).unwrap();
}
#[test]
fn commands_are_bounded_and_movement_is_simulated() {
    let mut g = game();
    g.command(1, cmd(1, 2, 1, 0, 0, 800.0, 100.0)).unwrap();
    g.step();
    assert!((g.actors[&1].x - 107.5).abs() < 0.01);
    g.command(1, cmd(1, 2, 1, 0, 0, 100.0, 800.0)).unwrap();
    g.step();
    assert_eq!(g.actors[&1].y, 100.0);
    assert!(crate::pve_protocol::command(&[3, 16]).is_err());
    let mut bytes = vec![0; 25];
    bytes[0] = crate::protocol::VERSION;
    bytes[1] = 16;
    bytes[6] = 2;
    bytes[17..21].copy_from_slice(&f32::NAN.to_le_bytes());
    assert!(crate::pve_protocol::command(&bytes).is_err());
    let file = g.outbox.path_for_test();
    drop(g);
    std::fs::remove_file(file).unwrap();
}

#[test]
fn movement_ack_retains_goal_after_arrival_and_reports_effective_speed() {
    let mut g = game();
    g.step();
    let accepted = g.tick;
    g.command(1, cmd(1, 2, 1, 0, 0, 115.0, 100.0)).unwrap();
    g.step();
    g.step();
    let b = crate::pve_protocol::snapshot(&g, 1).unwrap();
    assert_eq!(u32::from_le_bytes(b[26..30].try_into().unwrap()), accepted);
    assert_eq!(f32::from_le_bytes(b[34..38].try_into().unwrap()), 115.0);
    assert_eq!(b[42], 2, "arrival preserves the acknowledged mouse goal");
    g.actors.get_mut(&1).unwrap().cold = 1.0;
    let b = crate::pve_protocol::snapshot(&g, 1).unwrap();
    assert_eq!(f32::from_le_bytes(b[30..34].try_into().unwrap()), 75.0);
    let file = g.outbox.path_for_test();
    drop(g);
    std::fs::remove_file(file).unwrap();
}

#[test]
fn approved_cast_carries_native_visual_metadata_and_fixed_origin() {
    let mut g = game();
    field(&mut g);
    let skill = &mut g.actors.get_mut(&1).unwrap().profile.skills[0];
    skill.level = 25;
    skill.missiles = 7;
    skill.phys = true;
    let mob = g.rooms[&2].mobs[0].id;
    g.command(1, cmd(2, 3, 2, mob, 1, 0.0, 0.0)).unwrap();
    g.step();
    let event = g.events.iter().find(|e| e.kind == 1).unwrap();
    let cast = event.cast.as_ref().unwrap();
    assert_eq!(cast.level, 25);
    assert_eq!(cast.missiles, 7);
    assert_eq!(cast.flags, 2);
    assert_eq!((cast.x, cast.y), (100.0, 100.0));
    let frozen_target = (cast.target_x, cast.target_y);
    g.rooms.get_mut(&2).unwrap().mobs[0].x += 100.0;
    let cast = g
        .events
        .iter()
        .find(|e| e.kind == 1)
        .unwrap()
        .cast
        .as_ref()
        .unwrap();
    assert_eq!((cast.target_x, cast.target_y), frozen_target);
    let b = crate::pve_protocol::snapshot(&g, 1).unwrap();
    let offset = 43 + 2 * 55 + g.rooms[&2].mobs.len() * 48;
    assert_eq!(b[offset + 14], 1);
    assert_eq!(
        u16::from_le_bytes(b[offset + 23..offset + 25].try_into().unwrap()),
        25
    );
    assert_eq!(b[offset + 25], 7);
    assert_eq!(b[offset + 26], 2);
    let file = g.outbox.path_for_test();
    drop(g);
    std::fs::remove_file(file).unwrap();
}

#[test]
fn travel_uses_map_availability_not_monster_level() {
    let mut g = game();
    g.rooms.get_mut(&2).unwrap().definition.level = 170;
    assert_eq!(g.actors[&1].profile.level, 1);
    g.command(1, cmd(1, 1, 2, 0, 0, 0.0, 0.0)).unwrap();
    assert_eq!(g.actors[&1].map, 2);
    g.command(2, cmd(1, 1, 2, 0, 0, 0.0, 0.0)).unwrap();
    assert_eq!(g.actors[&2].map, 2);
    g.command(1, cmd(2, 2, 2, 0, 0, 180.0, 100.0)).unwrap();
    g.step();
    assert!(g.actors[&1].x > 100.0);
    assert!(g.command(1, cmd(3, 1, 999, 0, 0, 0.0, 0.0)).is_err());
    assert_eq!(g.actors[&1].map, 2);
    let file = g.outbox.path_for_test();
    drop(g);
    std::fs::remove_file(file).unwrap();
}

#[test]
fn auto_uses_selected_learned_skill_and_manual_stops_the_actor() {
    let mut g = game();
    field(&mut g);
    let mut other = g.actors[&1].profile.skills[0].clone();
    other.id = 2;
    g.actors.get_mut(&1).unwrap().profile.skills.push(other);
    g.command(1, cmd(2, 5, 2, 1, 2, 0.0, 0.0)).unwrap();
    assert!(g.actors[&1].farming);
    assert_eq!(g.actors[&1].skill, 2);
    g.step();
    assert!(
        g.events
            .iter()
            .any(|e| e.source == 1 && e.kind == 1 && e.skill == 2)
    );
    g.command(1, cmd(3, 5, 2, 1, 999, 0.0, 0.0)).unwrap();
    assert_eq!(g.actors[&1].skill, 2, "unlearned skills are never accepted");
    g.command(1, cmd(4, 5, 2, 0, 2, 0.0, 0.0)).unwrap();
    assert!(!g.actors[&1].farming);
    assert_eq!(g.actors[&1].target, 0);
    assert!(g.actors[&1].path.is_empty());
    let file = g.outbox.path_for_test();
    drop(g);
    std::fs::remove_file(file).unwrap();
}

fn piercing_fixture(points: &[(f32, f32)], speed: f32) -> Game {
    let mut g = game();
    g.command(1, cmd(1, 1, 2, 0, 0, 0.0, 0.0)).unwrap();
    let room = g.rooms.get_mut(&2).unwrap();
    room.mobs.truncate(points.len());
    for (mob, &(x, y)) in room.mobs.iter_mut().zip(points) {
        mob.x = x;
        mob.y = y;
        mob.home = (x, y);
        mob.hp = 100.0;
        mob.def.hp = 100.0;
        mob.stun = 1000.0;
        mob.def.speed = 0.0;
    }
    let mut skill = g.actors[&1].profile.skills[0].clone();
    skill.stun = 0.0;
    skill.cold = 0.0;
    skill.travel = 0.4;
    skill.targets = 1;
    skill.projectile = Some(LinearProjectile {
        range: 300.0,
        width: 24.0,
        speed,
        ignore_terrain: false,
        pierce: true, area: 0.0, homing: false,
    });
    let target = room.mobs[0].id;
    g.pending.push(Pending {
        cast_id: 0,
        source: 1,
        map: 2,
        target,
        skill,
        remaining: 0.52,
        origin: (100.0, 100.0),
        flight: Some(projectiles::Flight::new((100.0, 100.0), points[0])),
    });
    g
}
fn remove_fixture(g: Game) {
    let file = g.outbox.path_for_test();
    drop(g);
    std::fs::remove_file(file).unwrap();
}
#[test]
fn piercing_strip_hits_every_body_along_the_path_once_in_order() {
    // Deliberately not sorted spatially; the old target cap is one.
    let mut g = piercing_fixture(
        &[
            (250.0, 100.0),
            (150.0, 100.0),
            (350.0, 100.0),
            (190.0, 100.0),
            (220.0, 100.0),
            (290.0, 100.0),
            (320.0, 100.0),
            (220.0, 114.4),
            (220.0, 114.6),
            (50.0, 100.0),
            (450.0, 100.0),
        ],
        300.0,
    );
    for _ in 0..30 {
        g.step();
    }
    let room = &g.rooms[&2];
    for index in 0..8 {
        assert_eq!(room.mobs[index].hp, 90.0, "in-strip body {index}");
    }
    for index in 8..11 {
        assert_eq!(room.mobs[index].hp, 100.0, "outside strip {index}");
    }
    assert!(g.pending.is_empty());
    remove_fixture(g);
}
#[test]
fn piercing_hits_follow_flight_time_and_continue_after_primary_death_or_dodge() {
    for dead in [false, true] {
        let mut g = piercing_fixture(&[(150.0, 100.0), (300.0, 100.0)], 200.0);
        // Move or kill the originally selected target after the release direction was fixed.
        g.rooms.get_mut(&2).unwrap().mobs[0].y = 200.0;
        if dead {
            g.rooms.get_mut(&2).unwrap().mobs[0].hp = 0.0;
        }
        for _ in 0..6 {
            g.step();
        }
        assert_eq!(
            g.rooms[&2].mobs[1].hp, 100.0,
            "far body cannot be hit before arrival"
        );
        for _ in 0..28 {
            g.step();
        }
        assert_eq!(
            g.rooms[&2].mobs[1].hp, 90.0,
            "ray keeps its original direction"
        );
        remove_fixture(g);
    }
}
#[test]
fn piercing_sweeps_fast_diagonals_and_applies_status_to_each_contact() {
    let mut g = piercing_fixture(
        &[
            (140.0, 120.0),
            (200.0, 150.0),
            (260.0, 180.0),
            (220.0, 190.0),
        ],
        10000.0,
    );
    g.pending[0].skill.parts = [9.0, 0.0, 1.0, 0.0, 0.0];
    g.pending[0].skill.cold = 2.0;
    g.pending[0].skill.stun = 100.0;
    for _ in 0..3 {
        g.step();
    }
    for m in &g.rooms[&2].mobs[..3] {
        assert_eq!(m.hp, 90.0);
        assert!(m.cold > 0.0);
    }
    assert_eq!(g.rooms[&2].mobs[3].hp, 100.0);
    let hits: Vec<_> = g
        .events
        .iter()
        .filter(|e| e.kind == 2)
        .map(|e| e.target)
        .collect();
    assert_eq!(
        hits,
        g.rooms[&2].mobs[..3]
            .iter()
            .map(|m| m.id)
            .collect::<Vec<_>>()
    );
    remove_fixture(g);
}
#[test]
fn moving_targets_are_hit_only_when_they_overlap_the_current_sweep() {
    let mut g = piercing_fixture(&[(350.0, 100.0), (240.0, 160.0), (130.0, 160.0)], 200.0);
    for _ in 0..10 {
        g.step();
    }
    g.rooms.get_mut(&2).unwrap().mobs[1].y = 100.0;
    g.rooms.get_mut(&2).unwrap().mobs[2].y = 100.0;
    for _ in 0..30 {
        g.step();
    }
    assert_eq!(g.rooms[&2].mobs[1].hp, 90.0, "enters ahead of projectile");
    assert_eq!(g.rooms[&2].mobs[2].hp, 100.0, "enters behind projectile");
    remove_fixture(g);
}

#[test]
fn piercing_stops_at_walls_unless_the_native_skill_ignores_terrain() {
    use base64::Engine;
    for ignores in [false, true] {
        let mut g = piercing_fixture(&[(150.0, 100.0), (350.0, 100.0)], 300.0);
        let room = g.rooms.get_mut(&2).unwrap();
        let mut bits = vec![0u8; 13];
        // Connected around the southern end, but no straight path through the wall.
        for row in 0..9 {
            let cell = row * 10 + 2;
            bits[cell / 8] |= 1 << (cell % 8);
        }
        room.definition.grid = Grid {
            kind: "grid".into(),
            columns: 10,
            rows: 10,
            cell_size: Some(Size {
                width: 100.0,
                height: 100.0,
            }),
            blocked_base64: base64::engine::general_purpose::STANDARD.encode(bits),
        };
        room.nav = Navigation::new(&room.definition).unwrap();
        g.pending[0]
            .skill
            .projectile
            .as_mut()
            .unwrap()
            .ignore_terrain = ignores;
        for _ in 0..35 {
            g.step();
        }
        assert_eq!(g.rooms[&2].mobs[0].hp, 90.0);
        assert_eq!(g.rooms[&2].mobs[1].hp, if ignores { 90.0 } else { 100.0 });
        assert!(g.pending.is_empty());
        remove_fixture(g);
    }
}
#[test]
fn piercing_kills_grant_each_monster_reward_once_and_cannot_cross_rooms() {
    let mut g = piercing_fixture(&[(150.0, 100.0), (250.0, 100.0), (350.0, 100.0)], 10000.0);
    for m in &mut g.rooms.get_mut(&2).unwrap().mobs {
        m.hp = 5.0;
    }
    for _ in 0..10 {
        g.step();
    }
    assert_eq!(g.outbox.pending.len(), 3);
    assert_eq!(g.rooms[&2].loot.len(), 3);
    for _ in 0..10 {
        g.step();
    }
    assert_eq!(
        g.outbox.pending.len(),
        3,
        "old projectile cannot grant twice"
    );
    remove_fixture(g);
    let mut g = piercing_fixture(&[(150.0, 100.0), (250.0, 100.0)], 300.0);
    g.command(1, cmd(2, 1, 1, 0, 0, 0.0, 0.0)).unwrap();
    for _ in 0..35 {
        g.step();
    }
    assert!(g.rooms[&2].mobs.iter().all(|m| m.hp == 100.0));
    assert!(g.pending.is_empty());
    remove_fixture(g);
}

#[test]
fn selecting_a_skill_preserves_movement_and_target_in_both_control_modes() {
    let mut g = game();
    let mut other = g.actors[&1].profile.skills[0].clone();
    other.id = 2;
    g.actors.get_mut(&1).unwrap().profile.skills.push(other);
    g.command(1, cmd(1, 2, 1, 0, 0, 800.0, 100.0)).unwrap();
    g.step();
    let accepted = g.actors[&1].command_tick;
    let path = g.actors[&1].path.clone();
    g.command(1, cmd(2, 4, 1, 0, 2, 0.0, 0.0)).unwrap();
    assert_eq!(g.actors[&1].skill, 2);
    assert_eq!(g.actors[&1].path, path);
    assert_eq!(g.actors[&1].move_goal, Some((800.0, 100.0)));
    assert_eq!(g.actors[&1].command_tick, accepted);
    assert_eq!(g.actors[&1].seq, 2);
    g.command(1, cmd(3, 4, 1, 0, 999, 0.0, 0.0)).unwrap();
    assert_eq!(g.actors[&1].skill, 2);
    g.actors.get_mut(&1).unwrap().farming = true;
    g.actors.get_mut(&1).unwrap().target = 1001;
    g.command(1, cmd(4, 4, 1, 0, 1, 0.0, 0.0)).unwrap();
    assert!(g.actors[&1].farming);
    assert_eq!(g.actors[&1].target, 1001);
    assert_eq!(g.actors[&1].skill, 1);
    remove_fixture(g);
}

#[test]
fn cold_requires_resolved_cold_damage_and_weaker_hits_cannot_extend_it() {
    let mut g = game();
    field(&mut g);
    let mut skill = g.actors[&1].profile.skills[0].clone();
    skill.stun = 0.0;
    skill.parts = [1.0, 0.0, 0.0, 0.0, 0.0];
    let m = &mut g.rooms.get_mut(&2).unwrap().mobs[0];
    m.hp = 10000.0;
    m.def.hp = 10000.0;
    status::apply_hit(&skill, m, 1, &mut g.rng);
    assert_eq!(m.cold, 0.0);
    skill.parts = [0.0, 0.0, 200.0, 0.0, 0.0];
    status::apply_hit(&skill, m, 1, &mut g.rng);
    assert!((m.cold_power - 0.375).abs() < 0.0001);
    assert_eq!(m.cold, 2.0);
    m.cold = 0.6;
    skill.parts[2] = 10.0;
    skill.cold = 10.0;
    status::apply_hit(&skill, m, 1, &mut g.rng);
    assert_eq!(m.cold, 0.6);
    skill.parts[2] = 400.0;
    skill.cold = 3.0;
    status::apply_hit(&skill, m, 1, &mut g.rng);
    assert_eq!(m.cold, 3.0);
    assert_eq!(status::cold_factor(m), 0.5);
    remove_fixture(g);
}
#[test]
fn cold_slows_movement_and_attack_clock_and_expires() {
    let mut normal = game();
    field(&mut normal);
    let mut cold = game();
    field(&mut cold);
    for g in [&mut normal, &mut cold] {
        let m = &mut g.rooms.get_mut(&2).unwrap().mobs[0];
        m.x = 300.0;
        m.home = (300.0, 100.0);
        m.target = 1;
        m.cd = 10.0;
    }
    {
        let m = &mut cold.rooms.get_mut(&2).unwrap().mobs[0];
        m.cold = 1.0;
        m.cold_power = 0.5;
    }
    normal.step();
    cold.step();
    let a = &normal.rooms[&2].mobs[0];
    let b = &cold.rooms[&2].mobs[0];
    assert!((300.0 - a.x - 2.0 * (300.0 - b.x)).abs() < 0.001);
    assert!((10.0 - a.cd - 2.0 * (10.0 - b.cd)).abs() < 0.001);
    for _ in 0..25 {
        cold.step();
    }
    assert_eq!(cold.rooms[&2].mobs[0].cold, 0.0);
    assert_eq!(status::cold_factor(&cold.rooms[&2].mobs[0]), 1.0);
    remove_fixture(normal);
    remove_fixture(cold);
}
#[test]
fn stun_blocks_monster_movement_and_attacks_then_recovers() {
    let mut g = game();
    field(&mut g);
    {
        let m = &mut g.rooms.get_mut(&2).unwrap().mobs[0];
        m.stun = 0.3;
        m.target = 1;
        m.x = 110.0;
        m.cd = 0.0;
    }
    let hp = g.actors[&1].hp;
    for _ in 0..4 {
        g.step();
    }
    assert_eq!(g.actors[&1].hp, hp);
    assert_eq!(g.rooms[&2].mobs[0].x, 110.0);
    for _ in 0..4 {
        g.step();
    }
    assert!(g.actors[&1].hp < hp);
    remove_fixture(g);
}
#[test]
fn poison_is_resisted_deferred_and_does_not_double_count_or_overrun_duration() {
    let mut g = game();
    field(&mut g);
    let mut skill = g.actors[&1].profile.skills[0].clone();
    skill.parts = [0.0, 40.0, 0.0, 0.0, 0.0];
    skill.poison = 2.0;
    skill.stun = 0.0;
    let m = &mut g.rooms.get_mut(&2).unwrap().mobs[0];
    m.def.hp = 100.0;
    m.hp = 100.0;
    m.def.res[1] = 50.0;
    let hit = status::apply_hit(&skill, m, 1, &mut g.rng);
    assert_eq!(hit.amount, 0.0);
    assert_eq!(m.hp, 100.0);
    let mut shown = 0.0;
    for _ in 0..40 {
        shown += status::advance_poison(m, 0.05).unwrap_or(0.0);
    }
    assert!((m.hp - 80.0).abs() < 0.001);
    assert!((shown - 20.0).abs() < 0.001);
    assert!(status::advance_poison(m, 0.05).is_none());
    m.poison = 0.07;
    m.poison_damage = 10.0;
    let before = m.hp;
    status::advance_poison(m, 0.05);
    status::advance_poison(m, 0.05);
    assert!((before - m.hp - 0.7).abs() < 0.001);
    remove_fixture(g);
}
#[test]
fn physical_damage_uses_armor_crit_and_hurt_without_elemental_status() {
    let mut g = game();
    field(&mut g);
    let mut skill = g.actors[&1].profile.skills[0].clone();
    skill.parts = [200.0, 0.0, 0.0, 0.0, 0.0];
    skill.crit = 100.0;
    skill.stun = 0.0;
    skill.poison = 3.0;
    let m = &mut g.rooms.get_mut(&2).unwrap().mobs[0];
    m.hp = 1000.0;
    m.def.hp = 1000.0;
    m.def.defense = 100.0;
    let hit = status::apply_hit(&skill, m, 1, &mut g.rng);
    // Defense affects accuracy, never damage of a hit that already landed.
    assert_eq!(hit.amount, 400.0);
    assert_eq!(hit.flags, status::CRITICAL | status::HURT);
    assert_eq!(m.hurt, 0.5);
    assert_eq!(m.cold, 0.0);
    assert_eq!(m.poison, 0.0);
    remove_fixture(g);
}
#[test]
fn respawn_increments_incarnation_and_clears_old_path_and_status() {
    let mut g = game();
    field(&mut g);
    {
        let m = &mut g.rooms.get_mut(&2).unwrap().mobs[0];
        m.hp = 0.0;
        m.respawn = 0.01;
        m.x = 700.0;
        m.path = vec![(800.0, 800.0)];
        m.poison = 3.0;
        m.cold = 2.0;
        m.stun = 1.0;
        m.hurt = 0.5;
    }
    g.step();
    let m = &g.rooms[&2].mobs[0];
    assert_eq!(m.life, 1);
    assert_eq!((m.x, m.y), m.home);
    assert!(m.path.is_empty());
    assert!(!m.moving);
    assert_eq!((m.poison, m.cold, m.stun, m.hurt), (0.0, 0.0, 0.0, 0.0));
    let packet = crate::pve_protocol::snapshot(&g, 1).unwrap();
    let at = 43 + 55 * 2;
    assert_eq!(
        u32::from_le_bytes(packet[at + 40..at + 44].try_into().unwrap()),
        1
    );
    remove_fixture(g);
}

#[test]
fn poison_death_emits_typed_ticks_and_grants_one_shared_reward() {
    let mut g = game();
    field(&mut g);
    let skill = &mut g.actors.get_mut(&1).unwrap().profile.skills[0];
    skill.parts = [0.0, 40.0, 0.0, 0.0, 0.0];
    skill.poison = 2.0;
    skill.stun = 0.0;
    skill.cooldown = 100.0;
    let mob = g.rooms[&2].mobs[0].id;
    g.command(1, cmd(2, 3, 2, mob, 1, 0.0, 0.0)).unwrap();
    for _ in 0..26 {
        client_step(&mut g);
    }
    assert_eq!(g.rooms[&2].mobs[0].hp, 0.0);
    assert_eq!(g.outbox.pending.len(), 1);
    assert_eq!(g.rooms[&2].loot.len(), 1);
    assert!(
        g.events
            .iter()
            .any(|e| e.kind == 2 && e.hit == status::POISON_TICK)
    );
    let a = crate::pve_protocol::snapshot(&g, 1).unwrap();
    let b = crate::pve_protocol::snapshot(&g, 2).unwrap();
    let monsters = 43 + 55 * 2;
    assert_eq!(&a[monsters..monsters + 48], &b[monsters..monsters + 48]);
    for _ in 0..10 {
        client_step(&mut g);
    }
    assert_eq!(g.outbox.pending.len(), 1);
    remove_fixture(g);
}

#[test]
fn physical_critical_does_not_multiply_cold_damage_or_trigger_hurt_on_cold_hit() {
    let mut g = game();
    field(&mut g);
    let mut skill = g.actors[&1].profile.skills[0].clone();
    skill.parts = [200.0, 0.0, 100.0, 0.0, 0.0];
    skill.crit = 100.0;
    let m = &mut g.rooms.get_mut(&2).unwrap().mobs[0];
    m.def.defense = 100.0;
    m.def.hp = 1000.0;
    m.hp = 1000.0;
    let hit = status::apply_hit(&skill, m, 1, &mut g.rng);
    assert_eq!(hit.amount, 500.0);
    assert_eq!(hit.flags & status::HURT, 0);
    remove_fixture(g);
}

#[test]
fn lethal_hit_displays_resolved_damage_independent_of_monster_remaining_hp() {
    let mut g = game();
    field(&mut g);
    let mut skill = g.actors[&1].profile.skills[0].clone();
    skill.parts = [20000.0, 0.0, 0.0, 0.0, 0.0];
    skill.crit = 0.0;
    let m = &mut g.rooms.get_mut(&2).unwrap().mobs[0];
    m.hp = 1548.0;
    m.def.hp = 1548.0;
    m.def.res = [0.0; 5];
    let hit = status::apply_hit(&skill, m, 1, &mut g.rng);
    assert_eq!(hit.amount, 20000.0);
    assert_eq!(m.hp, 0.0);
    assert_eq!(m.killer, 1);
    remove_fixture(g);
}

#[test]
fn weapon_leech_recovers_on_real_hits_and_is_capped(){
    let mut g=game();field(&mut g);
    let a=g.actors.get_mut(&1).unwrap();
    a.hp=100.0;a.mp=0.0;
    let s=&mut a.profile.skills[0];s.cost=0.0;s.mana_leech=8.0;s.leech=10.0;
    g.command(1,cmd(2,4,2,g.rooms[&2].mobs[0].id,1,0.0,0.0)).unwrap();
    for _ in 0..5 {client_step(&mut g);}
    let damage=g.events.iter().find(|e|e.kind==2&&e.source==1).unwrap().value;
    assert!((g.actors[&1].mp-damage*0.08).abs()<0.001);
    let a=g.actors.get_mut(&1).unwrap();let s=a.profile.skills[0].clone();
    recovery::leech(a,&s,100000.0);
    assert_eq!(a.hp,a.profile.hp);assert_eq!(a.mp,a.profile.mp);
    a.mp=1.0;recovery::leech(a,&s,0.0);assert_eq!(a.mp,1.0);
}

#[test]
fn potions_are_durable_capped_and_do_not_cancel_movement(){
    let mut g=game();
    let potion:Potion=serde_json::from_value(serde_json::json!({"id":201,"kind":"both","tier":1,"level":1,"hp":100,"mp":60,"count":3,"spent":0})).unwrap();
    let a=g.actors.get_mut(&1).unwrap();a.profile.potions=vec![potion];
    let original=a.profile.clone();
    a.hp=50.0;a.mp=0.0;a.move_goal=Some((300.0,100.0));a.farming=true;
    g.command(1,cmd(2,7,1,0,201,0.0,0.0)).unwrap();
    assert_eq!((g.actors[&1].hp,g.actors[&1].mp),(150.0,30.0));
    assert_eq!(g.actors[&1].move_goal,Some((300.0,100.0)));
    assert!(g.actors[&1].farming);assert_eq!(g.outbox.pending.len(),1);
    g.command(1,cmd(2,7,1,0,201,0.0,0.0)).unwrap();
    g.command(1,cmd(3,7,1,0,201,0.0,0.0)).unwrap();
    assert_eq!(g.actors[&1].profile.potions[0].count,2);
    let path=g.outbox.path_for_test();
    let mut replay=original.clone();
    drop(g);
    let outbox=Outbox::open(path.clone()).unwrap();
    recovery::reconcile(&mut replay,&outbox,"account-a",0);
    assert_eq!((replay.potions[0].count,replay.potions[0].spent),(2,1));
    recovery::reconcile(&mut replay,&outbox,"account-a",0);
    assert_eq!(replay.potions[0].count,2,"committed debit awaiting ACK must not subtract twice");
    let mut other=original;recovery::reconcile(&mut other,&outbox,"account-b",0);
    assert_eq!(other.potions[0].count,3);
    drop(outbox);let _=std::fs::remove_file(path);
}

#[test]
fn rejected_potions_do_not_charge_stock(){
    let mut g=game();
    let a=g.actors.get_mut(&1).unwrap();
    a.profile.potions=vec![serde_json::from_value(serde_json::json!({"id":1,"kind":"life","tier":1,"level":1,"hp":100,"mp":0,"count":1,"spent":0})).unwrap()];
    g.command(1,cmd(2,7,1,0,1,0.0,0.0)).unwrap(); // full HP
    g.actors.get_mut(&1).unwrap().hp=0.0;
    g.command(1,cmd(3,7,1,0,1,0.0,0.0)).unwrap(); // dead
    g.actors.get_mut(&1).unwrap().hp=50.0;
    g.command(1,cmd(4,7,2,0,1,0.0,0.0)).unwrap(); // wrong map
    g.command(1,cmd(5,7,1,0,999,0.0,0.0)).unwrap(); // unknown item
    assert!(g.outbox.pending.is_empty());assert_eq!(g.actors[&1].hp,50.0);
    assert_eq!(g.actors[&1].profile.potions[0].count,1);
}

#[test]
fn piercing_leech_counts_each_contact_once(){
    let mut g=piercing_fixture(&[(150.0,100.0),(200.0,100.0),(250.0,100.0)],1000.0);
    g.actors.get_mut(&1).unwrap().mp=0.0;
    g.pending[0].skill.mana_leech=8.0;
    for _ in 0..20{g.step();}
    let damage:f32=g.events.iter().filter(|e|e.kind==2&&e.source==1).map(|e|e.value).sum();
    assert!(damage>0.0);
    assert!((g.actors[&1].mp-damage*0.08).abs()<0.001);
    remove_fixture(g);
}

fn support_fixture(name:&str)->Profile{
    let rows:serde_json::Value=serde_json::from_str(include_str!("../../../../test/fixtures/multiplayer-support.json")).unwrap();
    serde_json::from_value(rows.as_array().unwrap().iter().find(|r|r["name"]==name).unwrap()["resolved"].clone()).unwrap()
}
#[test]
fn all_factions_auto_cast_native_buffs_and_resolve_exact_combinations(){
    for name in ["cuiyan-blade","cuiyan-dual","wudang","kunlun","gaibang","shaolin","emei","tianwang","tianren"]{
        let mut g=game();g.actors.remove(&1);
        g.join(1,"account-a".into(),0,support_fixture(name)).unwrap();field(&mut g);
        for _ in 0..80{g.step();}
        let a=&g.actors[&1];let catalog=a.base_profile.support.as_ref().unwrap();
        for s in catalog.skills.iter().filter(|s|s.enabled&&!s.aura&&!s.curse&&s.duration>=5.0){
            assert!(a.support.active.contains_key(&s.id),"{} skill {} not active, MP {}",name,s.id,a.mp);
        }
        let active:Vec<_>=a.support.active.keys().chain(a.support.auras.iter()).copied().collect::<std::collections::BTreeSet<_>>().into_iter().collect();
        let expected=&catalog.variants.iter().find(|v|v.active==active).unwrap().profile;
        assert_eq!(a.profile.hp,expected.hp,"{} HP",name);
        assert_eq!(a.profile.speed,expected.speed,"{} speed",name);
        assert_eq!(a.profile.res,expected.res,"{} resistance",name);
        assert_eq!(a.profile.skills[0].parts,expected.skills[0].parts,"{} damage",name);
        remove_fixture(g);
    }
}
#[test]
fn buffs_expire_without_stacking_and_clear_on_death(){
    let mut g=game();g.actors.remove(&1);g.join(1,"account-a".into(),0,support_fixture("shaolin")).unwrap();field(&mut g);
    for _ in 0..40{g.step();}
    let a=g.actors.get_mut(&1).unwrap();assert!(a.profile.hp>a.base_profile.hp);
    a.hp=a.profile.hp*0.5;
    for s in &mut a.base_profile.support.as_mut().unwrap().skills{s.enabled=false;}
    for t in a.support.active.values_mut(){*t=0.01;}
    g.step();let a=g.actors.get_mut(&1).unwrap();assert!(a.support.active.is_empty());
    assert_eq!(a.profile.hp,a.base_profile.hp);
    assert!((a.hp/a.profile.hp-0.5).abs()<0.01);
    a.support.active.insert(15,100.0);support::resolve(a);a.hp=0.0;
    g.step();assert!(g.actors[&1].support.active.is_empty());
    remove_fixture(g);
}
#[test]
fn support_gates_movement_town_mana_settings_and_manual_cast(){
    let mut g=game();g.actors.remove(&1);g.join(1,"account-a".into(),0,support_fixture("kunlun")).unwrap();
    for _ in 0..20{g.step();}assert!(g.actors[&1].support.active.is_empty(),"town");
    field(&mut g);g.actors.get_mut(&1).unwrap().mp=0.0;
    for _ in 0..5{g.step();}assert!(g.actors[&1].support.active.is_empty(),"insufficient MP");
    let a=g.actors.get_mut(&1).unwrap();a.mp=a.profile.mp;a.path=vec![(900.0,900.0)];
    g.step();assert!(g.actors[&1].support.active.is_empty(),"moving");
    g.actors.get_mut(&1).unwrap().path.clear();
    g.command(1,cmd(2,9,2,0,171,0.0,0.0)).unwrap();g.command(1,cmd(3,9,2,0,173,0.0,0.0)).unwrap();
    for _ in 0..20{g.step();}assert!(g.actors[&1].support.active.is_empty(),"auto disabled");
    g.command(1,cmd(4,8,2,0,171,0.0,0.0)).unwrap();assert!(g.actors[&1].support.active.contains_key(&171));
    let mp=g.actors[&1].mp;
    g.command(1,cmd(5,8,2,0,171,0.0,0.0)).unwrap();assert_eq!(g.actors[&1].mp,mp,"no duplicate charge");
    remove_fixture(g);
}
#[test]
fn aura_toggle_and_native_mana_shield_reflection_are_authoritative(){
    let mut g=game();g.actors.remove(&1);g.join(1,"account-a".into(),0,support_fixture("shaolin")).unwrap();field(&mut g);
    assert!(g.actors[&1].support.auras.contains(&16));
    g.command(1,cmd(2,8,2,0,16,0.0,0.0)).unwrap();assert!(!g.actors[&1].support.auras.contains(&16));
    g.command(1,cmd(3,8,2,0,16,0.0,0.0)).unwrap();assert!(g.actors[&1].profile.protection.reflect_percent>0.0);
    let a=g.actors.get_mut(&1).unwrap();a.hp=100.0;a.mp=30.0;
    a.profile.protection.mana_shield=90.0;a.profile.protection.reflect_percent=20.0;
    let (lost,reflected)=support::receive_hit(a,100.0);
    assert_eq!((lost,reflected,a.mp,a.hp),(70.0,14.0,0.0,30.0));
    remove_fixture(g);
}

#[test]
fn native_healing_support_has_real_recovery_and_cooldown(){
    let mut g=game();g.actors.remove(&1);g.join(1,"account-a".into(),0,support_fixture("cuiyan-dual")).unwrap();field(&mut g);
    let a=g.actors.get_mut(&1).unwrap();a.hp=a.profile.hp*0.2;
    for s in &mut a.base_profile.support.as_mut().unwrap().skills{if s.id!=269{s.enabled=false;}}
    let before=(a.hp,a.mp);g.step();
    let a=&g.actors[&1];assert!(a.hp>before.0);assert!(a.mp<before.1);
    assert!(a.support.cooldowns[&269]>7.9);assert!(!a.support.active.contains_key(&269));
    assert!(g.events.iter().any(|e|e.kind==6&&e.source==1&&e.skill==269&&e.value>0.0));
    remove_fixture(g);
}
#[test]
fn reflection_kills_reward_once_and_cannot_reflect_recursively(){
    let mut g=game();field(&mut g);
    let a=g.actors.get_mut(&1).unwrap();a.profile.protection.reflect_percent=100.0;
    let m=&mut g.rooms.get_mut(&2).unwrap().mobs[0];m.x=110.0;m.y=100.0;m.target=1;m.hp=0.5;m.cd=0.0;
    g.step();assert_eq!(g.rooms[&2].mobs[0].hp,0.0);
    assert!(g.events.iter().any(|e|e.kind==2&&e.source==1&&e.target==g.rooms[&2].mobs[0].id));
    let grants=g.outbox.pending.len();assert_eq!(grants,1);
    for _ in 0..20{g.step();}assert_eq!(g.outbox.pending.len(),grants);
    remove_fixture(g);
}

fn pvp_fixture()->Game{
    let mut g=game();field(&mut g);g.rooms.get_mut(&2).unwrap().mobs.clear();
    for (&id,a) in &mut g.actors{a.profile.alignment=if id==1{0}else{1};a.profile.series=-1;a.profile.skills[0].cost=0.0;a.profile.skills[0].stun=0.0;a.profile.skills[0].cold=0.0;}
    g.actors.get_mut(&1).unwrap().pvp.enabled=true;g
}
#[test]
fn slaughter_permissions_use_canonical_color_and_safe_maps(){
    let mut g=pvp_fixture();assert!(pvp::can_hit(&g,1,2));assert!(pvp::can_hit(&g,2,1),"victim can fight back");
    assert!(!pvp::can_hit(&g,1,1));g.actors.get_mut(&2).unwrap().profile.alignment=0;assert!(!pvp::can_hit(&g,1,2));
    g.actors.get_mut(&2).unwrap().profile.alignment=1;g.actors.get_mut(&1).unwrap().pvp.enabled=false;assert!(!pvp::can_hit(&g,1,2));
    g.actors.get_mut(&1).unwrap().pvp.enabled=true;g.actors.get_mut(&2).unwrap().map=1;assert!(!pvp::can_hit(&g,1,2));
    g.actors.get_mut(&1).unwrap().map=1;assert!(!pvp::can_hit(&g,1,2),"town is safe even when mode is enabled");
    remove_fixture(g);
}
#[test]
fn slaughter_uses_tong_kim_twenty_percent_before_resistance_and_mana_shield(){
    let mut g=pvp_fixture();let mut skill=g.actors[&1].profile.skills[0].clone();skill.parts=[100.0,0.0,0.0,0.0,0.0];
    let b=g.actors.get_mut(&2).unwrap();b.profile.res[0]=50.0;b.profile.protection.mana_shield=50.0;
    let mut events=vec![];pvp::hit(&mut g,1,2,&skill,&mut events);
    assert_eq!(g.actors[&2].hp,195.0);assert_eq!(g.actors[&2].mp,25.0);
    assert_eq!(events[0].5,5.0);assert_eq!(pvp::scale(),0.2);
    remove_fixture(g);
}
#[test]
fn slaughter_poison_is_scaled_once_and_respects_duration_reduction(){
    let mut g=pvp_fixture();let mut skill=g.actors[&1].profile.skills[0].clone();skill.parts=[0.0,100.0,0.0,0.0,0.0];skill.poison=4.0;skill.mana_leech=8.0;
    g.actors.get_mut(&1).unwrap().mp=0.0;g.actors.get_mut(&2).unwrap().profile.protection.poison_reduction=50.0;
    let mut events=vec![];pvp::hit(&mut g,1,2,&skill,&mut events);assert!(events.is_empty());assert_eq!(g.actors[&2].pvp.poison,2.0);
    for _ in 0..41{g.step();}
    assert!((g.actors[&2].hp-190.0).abs()<0.001);assert_eq!(g.actors[&1].mp,0.0,"DOT does not leech again");
    remove_fixture(g);
}
#[test]
fn slaughter_piercing_hits_other_colors_once_and_never_same_color(){
    let mut g=pvp_fixture();let profile=g.actors[&1].profile.clone();g.join(3,"account-c".into(),0,profile.clone()).unwrap();g.join(4,"account-d".into(),0,profile).unwrap();
    for id in 1..=4{let a=g.actors.get_mut(&id).unwrap();a.map=2;a.x=100.0+(id-1)as f32*50.0;a.y=100.0;}
    g.actors.get_mut(&4).unwrap().profile.alignment=2;
    let mut skill=g.actors[&1].profile.skills[0].clone();skill.parts=[100.0,0.0,0.0,0.0,0.0];skill.travel=0.4;skill.projectile=Some(LinearProjectile{range:300.0,width:24.0,speed:1000.0,ignore_terrain:false,pierce:true,area:0.0,homing:false});
    g.pending.push(Pending{cast_id:0,source:1,map:2,target:2,skill,remaining:0.52,origin:(100.0,100.0),flight:Some(projectiles::Flight::new((100.0,100.0),(150.0,100.0)))});
    for _ in 0..16{g.step();}
    assert_eq!(g.actors[&2].hp,180.0);assert_eq!(g.actors[&3].hp,200.0);assert_eq!(g.actors[&4].hp,180.0);
    assert_eq!(g.events.iter().filter(|e|e.kind==2&&e.source==1).count(),2);
    remove_fixture(g);
}
#[test]
fn slaughter_death_waits_for_town_recovery_and_does_not_grant_pve_rewards(){
    let mut g=pvp_fixture();g.command(1,cmd(2,5,2,1,1,0.0,0.0)).unwrap();g.step();assert_eq!(g.actors[&1].target,2);
    let mut skill=g.actors[&1].profile.skills[0].clone();skill.parts=[10000.0,0.0,0.0,0.0,0.0];
    pvp::hit(&mut g,1,2,&skill,&mut vec![]);assert_eq!(g.actors[&2].hp,0.0);assert!(g.outbox.pending.is_empty());
    g.actors.get_mut(&1).unwrap().farming=false;
    let life=g.actors[&2].life;for _ in 0..122{g.step();}
    assert_eq!(g.actors[&2].hp,0.0);assert_eq!(g.actors[&2].life,life);
    assert!(g.outbox.pending.values().all(|grant|grant.xp==0&&grant.gold==0&&grant.death.is_some()));
    g.command(2,cmd(2,17,2,0,0,0.0,0.0)).unwrap();
    assert!(g.actors[&2].hp>0.0);assert_eq!(g.actors[&2].life,life+1);assert_eq!(g.actors[&2].map,1);
    remove_fixture(g);
}

#[test]
fn slaughter_cancels_unapproved_targets_and_preserves_overkill_labels(){
    let mut g=pvp_fixture();let mut s=g.actors[&1].profile.skills[0].clone();s.parts=[10000.0,0.0,0.0,0.0,0.0];
    let mut events=vec![];g.actors.get_mut(&1).unwrap().pvp.enabled=false;
    pvp::hit(&mut g,1,2,&s,&mut events);assert!(events.is_empty());assert_eq!(g.actors[&2].hp,200.0);
    g.actors.get_mut(&1).unwrap().pvp.enabled=true;
    pvp::hit(&mut g,1,2,&s,&mut events);assert_eq!(g.actors[&2].hp,0.0);assert_eq!(events[0].5,2000.0);
    remove_fixture(g);
}

#[test]
fn slaughter_auto_heal_support_recognizes_player_enemies_without_monsters(){
    let mut g=pvp_fixture();g.actors.remove(&1);g.join(1,"account-a".into(),0,support_fixture("cuiyan-dual")).unwrap();
    let a=g.actors.get_mut(&1).unwrap();a.map=2;a.x=100.0;a.y=100.0;a.pvp.enabled=true;a.hp=a.profile.hp*0.2;
    for s in &mut a.base_profile.support.as_mut().unwrap().skills{if s.id!=269{s.enabled=false;}}
    g.actors.get_mut(&2).unwrap().profile.alignment=0;
    let before=g.actors[&1].hp;g.step();assert!(g.actors[&1].hp>before);
    assert!(g.events.iter().any(|e|e.kind==6&&e.source==1&&e.skill==269));remove_fixture(g);
}

#[test]
fn party_join_blocks_projectiles_already_in_flight_and_clears_enemy_poison() {
    let mut g=pvp_fixture();
    let mut skill=g.actors[&1].profile.skills[0].clone();
    skill.parts=[0.0,100.0,0.0,0.0,0.0];skill.poison=4.0;
    pvp::hit(&mut g,1,2,&skill,&mut vec![]);
    assert!(g.actors[&2].pvp.poison>0.0);
    skill.parts=[100.0,0.0,0.0,0.0,0.0];skill.poison=0.0;skill.travel=0.4;
    skill.projectile=Some(LinearProjectile{range:300.0,width:24.0,speed:1000.0,ignore_terrain:false,pierce:true,area:0.0,homing:false});
    g.pending.push(Pending{cast_id:0,source:1,map:2,target:2,skill,remaining:0.52,origin:(100.0,100.0),flight:Some(projectiles::Flight::new((100.0,100.0),(150.0,100.0)))});
    g.command(1,cmd(2,12,2,2,0,0.0,0.0)).unwrap();let invitation=g.parties.invitations[&2].id;
    g.command(2,cmd(2,13,2,invitation,0,0.0,0.0)).unwrap();
    let hp=g.actors[&2].hp;
    for _ in 0..20 {g.step();}
    assert_eq!(g.actors[&2].hp,hp);assert_eq!(g.actors[&2].pvp.poison,0.0);
    assert!(!g.events.iter().any(|e|e.kind==2&&e.target==2));
    remove_fixture(g);
}

#[test]
fn progression_refresh_same_level_uses_revision_preserves_resources_and_rejects_old_profiles(){
    let mut g=game();
    g.actors.get_mut(&1).unwrap().hp=100.0;
    g.actors.get_mut(&1).unwrap().mp=15.0;
    let mut p=g.actors[&1].base_profile.clone();p.hp=400.0;p.mp=60.0;p.skills[0].parts[0]=500.0;
    g.refresh_profile(1,p.clone(),2);
    assert_eq!(g.actors[&1].profile.level,1);assert_eq!(g.actors[&1].profile.hp,400.0);
    assert_eq!((g.actors[&1].hp,g.actors[&1].mp),(200.0,30.0));assert_eq!(g.actors[&1].profile.skills[0].parts[0],500.0);
    p.hp=100.0;g.refresh_profile(1,p,1);assert_eq!(g.actors[&1].profile.hp,400.0);assert_eq!(g.actors[&1].profile_revision,2);
    remove_fixture(g);
}
#[test]
fn progression_refresh_removes_old_buffs_and_updates_party_colors_on_faction_change(){
    let mut g=game();g.actors.remove(&1);g.join(1,"account-a".into(),0,support_fixture("kunlun")).unwrap();
    let a=g.actors.get_mut(&1).unwrap();a.support.active.insert(171,10.0);support::resolve(a);
    g.command(1,cmd(1,12,1,2,0,0.0,0.0)).unwrap();let invitation=g.parties.invitations[&2].id;
    g.command(2,cmd(1,13,1,invitation,0,0.0,0.0)).unwrap();
    let mut p=g.actors[&2].base_profile.clone();p.alignment=2;p.hp=300.0;
    g.refresh_profile(1,p,1);
    assert!(g.actors[&1].support.active.is_empty());assert_eq!(g.actors[&1].profile.hp,300.0);
    assert_eq!(g.actors[&2].party_alignment,Some(2));assert_eq!(g.actors[&1].party_alignment,Some(2));
    remove_fixture(g);
}
#[test]
fn progression_refresh_preserves_existing_buff_timers_and_does_not_revive_dead_players(){
    let mut g=game();g.actors.remove(&1);g.join(1,"account-a".into(),0,support_fixture("kunlun")).unwrap();
    let a=g.actors.get_mut(&1).unwrap();a.support.active.insert(171,9.0);a.support.cooldowns.insert(171,12.0);support::resolve(a);a.hp=0.0;
    let p=a.base_profile.clone();g.refresh_profile(1,p,1);
    assert_eq!(g.actors[&1].support.active[&171],9.0);assert_eq!(g.actors[&1].support.cooldowns[&171],12.0);assert_eq!(g.actors[&1].hp,0.0);
    remove_fixture(g);
}
#[test]
fn progression_refresh_does_not_reenable_supports_disabled_during_the_session(){
    let mut g=game();g.actors.remove(&1);let original=support_fixture("kunlun");g.join(1,"account-a".into(),0,original.clone()).unwrap();
    g.command(1,cmd(1,9,1,0,171,0.0,0.0)).unwrap();
    g.refresh_profile(1,original,1);
    let ability=g.actors[&1].base_profile.support.as_ref().unwrap().skills.iter().find(|s|s.id==171).unwrap();
    assert!(!ability.enabled);remove_fixture(g);
}

#[test]
fn equipment_refresh_changes_distance_and_snapshot_speed_without_reissuing_mouse_goal() {
    let mut g=game();
    g.command(1,cmd(1,2,1,0,0,900.0,100.0)).unwrap();
    g.step();let before=g.actors[&1].x;
    g.step();let foot=g.actors[&1].x-before;
    let mut profile=g.actors[&1].base_profile.clone();profile.speed=300.0;
    g.refresh_profile(1,profile,1);
    let before=g.actors[&1].x;g.step();let ride=g.actors[&1].x-before;
    assert!((ride-foot*2.0).abs()<0.01);
    assert_eq!(g.actors[&1].move_goal,Some((900.0,100.0)));
    let packet=crate::pve_protocol::snapshot(&g,1).unwrap();
    assert_eq!(f32::from_le_bytes(packet[30..34].try_into().unwrap()),300.0);
    remove_fixture(g);
}

#[test]
fn native_speed_phases_apply_status_before_quantizing_and_keep_skill_cooldowns() {
    let mut g=game();
    let config:speed::Configuration=serde_json::from_str(include_str!("../../../../test/fixtures/native-speed.json")).unwrap();
    let a=g.actors.get_mut(&1).unwrap();
    a.profile.timing=Some(speed::Timing{run_percent:150.0,config});
    a.profile.skills[0].attack_percent=Some(100.0);a.profile.skills[0].cooldown=0.1;
    assert!((speed::attack(a,&a.profile.skills[0]).0-0.8).abs()<0.00001);
    a.profile.skills[0].attack_percent=Some(232.0);
    assert!((speed::attack(a,&a.profile.skills[0]).0-0.4).abs()<0.00001);
    assert!((speed::movement(a)-258.75).abs()<0.001);
    a.cold=1.0;a.pvp.cold_power=0.3;
    assert!((speed::movement(a)-172.5).abs()<0.001,"quantize 105%, not 70% of the 150% phase");
    a.pvp.cold_power=0.5;
    assert!((speed::attack(a,&a.profile.skills[0]).0-0.8).abs()<0.00001);
    a.profile.skills[0].cooldown=2.0;
    assert_eq!(speed::attack(a,&a.profile.skills[0]).1,2.0);
    a.cold=0.0;a.profile.skills[0].attack_percent=Some(1000.0);
    assert!((speed::attack(a,&a.profile.skills[0]).0-20.0/70.0).abs()<0.00001);
    remove_fixture(g);
}

#[test]
fn native_baseline_attacks_repeat_every_sixteen_ticks_without_float_drift() {
    let mut g=game();field(&mut g);
    let config:speed::Configuration=serde_json::from_str(include_str!("../../../../test/fixtures/native-speed.json")).unwrap();
    let a=g.actors.get_mut(&1).unwrap();
    a.profile.timing=Some(speed::Timing{run_percent:100.0,config});
    let s=&mut a.profile.skills[0];s.attack_percent=Some(100.0);s.cooldown=0.8;s.cost=0.0;s.stun=0.0;
    let m=&mut g.rooms.get_mut(&2).unwrap().mobs[0];m.hp=1000000.0;m.x=150.0;m.y=100.0;m.home=(150.0,100.0);let target=m.id;
    g.command(1,cmd(2,3,2,target,1,0.0,0.0)).unwrap();
    let mut casts=Vec::new();
    for _ in 0..50 {g.step();for e in g.events.iter().filter(|e|e.source==1&&e.kind==1&&e.tick==g.tick){casts.push((e.tick,e.value));}}
    assert!(casts.len()>=3);
    for pair in casts.windows(2){assert_eq!(pair[1].0-pair[0].0,16);}
    assert!((casts[0].1-0.8).abs()<0.000001);
    remove_fixture(g);
}

#[test]
fn random_gold_is_rolled_at_death_and_pickup_journals_that_exact_amount_once() {
    let mut g = game();
    field(&mut g);
    g.rng = 1;
    let mob = &mut g.rooms.get_mut(&2).unwrap().mobs[0];
    mob.def.gold_min = Some(16000);
    mob.def.gold = 20000;
    let id = mob.id;
    let mut events = vec![];
    g.commit_rewards(&mut events, vec![(2, id, 1)]);
    let loot = &g.rooms[&2].loot[0];
    let (loot_id, amount) = (loot.id, loot.gold);
    assert!((16000..=20000).contains(&amount));
    g.actors.get_mut(&1).unwrap().pickup = loot_id;
    g.commit_rewards(&mut events, vec![]);
    assert!(g.rooms[&2].loot.is_empty());
    let grants: Vec<_> = g.outbox.pending.values().filter(|grant| grant.gold > 0).collect();
    assert_eq!(grants.len(), 1);
    assert_eq!(grants[0].gold, amount);
    g.actors.get_mut(&1).unwrap().pickup = loot_id;
    g.commit_rewards(&mut events, vec![]);
    assert_eq!(g.outbox.pending.values().filter(|grant| grant.gold > 0).count(), 1);
    let file = g.outbox.path_for_test();
    drop(g);
    let reopened = Outbox::open(file.clone()).unwrap();
    assert_eq!(reopened.pending.values().find(|grant| grant.gold > 0).unwrap().gold, amount);
    drop(reopened);
    std::fs::remove_file(file).unwrap();
}

#[test]
fn ordinary_missiles_wait_for_contact_and_stop_at_the_first_monster() {
    let mut g = piercing_fixture(&[(250.0,100.0),(180.0,100.0)],100.0);
    g.pending[0].skill.projectile.as_mut().unwrap().pierce=false;
    let target=g.rooms[&2].mobs[0].id;
    for _ in 0..10 { g.step(); }
    assert!(g.rooms[&2].mobs.iter().all(|m|m.hp==100.0),"timer expiry cannot cause a remote hit");
    for _ in 0..10 { g.step(); }
    assert_eq!(g.rooms[&2].mobs[0].hp,100.0,"the selected target is shielded by the nearer body");
    assert_eq!(g.rooms[&2].mobs[1].hp,90.0);
    assert!(g.pending.is_empty());
    assert!(!g.events.iter().any(|e|e.kind==2&&e.target==target));
    remove_fixture(g);
}

#[test]
fn ordinary_missiles_allow_monsters_to_dodge_after_cast() {
    let mut g = piercing_fixture(&[(250.0,100.0)],100.0);
    g.pending[0].skill.projectile.as_mut().unwrap().pierce=false;
    for _ in 0..10 { g.step(); }
    g.rooms.get_mut(&2).unwrap().mobs[0].y=200.0;
    for _ in 0..60 { g.step(); }
    assert_eq!(g.rooms[&2].mobs[0].hp,100.0);
    assert!(g.pending.is_empty());
    remove_fixture(g);
}

#[test]
fn ordinary_pvp_missiles_do_not_damage_players_before_arrival_or_after_dodging() {
    for dodge in [false,true] {
        let mut g=pvp_fixture();
        g.rooms.get_mut(&2).unwrap().mobs.clear();
        {let b=g.actors.get_mut(&2).unwrap();b.x=250.0;b.y=100.0;}
        let mut skill=g.actors[&1].profile.skills[0].clone();
        skill.parts=[100.0,0.0,0.0,0.0,0.0];skill.stun=0.0;skill.cold=0.0;skill.travel=0.4;
        skill.projectile=Some(LinearProjectile{range:300.0,width:16.0,speed:100.0,ignore_terrain:false,pierce:false,area:0.0,homing:false});
        g.pending.push(Pending{cast_id:0,source:1,map:2,target:2,skill,remaining:0.52,origin:(100.0,100.0),flight:Some(projectiles::Flight::new((100.0,100.0),(250.0,100.0)))});
        for _ in 0..10 {g.step();}
        assert_eq!(g.actors[&2].hp,200.0,"no damage at the former fixed deadline");
        if dodge {g.actors.get_mut(&2).unwrap().y=200.0;}
        for _ in 0..60 {g.step();}
        assert_eq!(g.actors[&2].hp,if dodge {200.0}else{180.0});
        assert!(g.pending.is_empty());
        remove_fixture(g);
    }
}

// Simulated client acknowledges its rendered casts without consuming test command sequences.
fn client_step(g: &mut Game) {
    let reports: Vec<_> = g.contacts.iter().filter_map(|(&id,_gate)| {
        g.events.iter().find(|e| e.id==id).map(|e|(e.source,e.map,e.target,e.skill))
            .map(|(source,map,target,skill)|(source,cmd(0,16,map,target,skill,(id&65535) as f32,(id>>16) as f32)))
    }).collect();
    for (source,report) in reports {g.confirm_contact(source,&report);}
    g.step();
}
#[test]
fn client_contact_is_required_before_server_updates_hp_and_cannot_be_replayed_or_forged() {
    let mut g=game();field(&mut g);
    let mob=g.rooms[&2].mobs[0].id;
    g.rooms.get_mut(&2).unwrap().mobs[0].stun=1000.0;
    g.actors.get_mut(&1).unwrap().profile.skills[0].cooldown=100.0;
    g.command(1,cmd(2,4,2,mob,1,0.0,0.0)).unwrap();
    for _ in 0..10 {g.step();}
    let cast=g.events.iter().find(|e|e.kind==1&&e.source==1).unwrap().id;
    assert_eq!(g.rooms[&2].mobs[0].hp,20.0,"server contact alone never changes HP");
    let report=|seq,map,target,skill|cmd(seq,16,map,target,skill,(cast&65535) as f32,(cast>>16) as f32);
    g.command(2,report(2,2,mob,1)).unwrap();g.step();
    g.command(1,report(3,1,mob,1)).unwrap();g.step();
    g.command(1,report(4,2,mob,99)).unwrap();g.step();
    g.command(1,report(5,2,mob+1,1)).unwrap();g.step();
    assert_eq!(g.rooms[&2].mobs[0].hp,20.0,"wrong owner, map, skill or body cannot deal damage");
    g.command(1,report(6,2,mob,1)).unwrap();g.step();
    assert_eq!(g.rooms[&2].mobs[0].hp,10.0);
    g.command(1,report(7,2,mob,1)).unwrap();g.step();
    assert_eq!(g.rooms[&2].mobs[0].hp,10.0,"each cast/body applies only once");
    remove_fixture(g);
}

#[test]
fn vo_tuong_tram_pvp_requires_both_physical_contact_and_client_confirmation() {
    for early_report in [false,true] {
        let mut g=pvp_fixture();
        g.actors.get_mut(&2).unwrap().x=250.0;
        let a=g.actors.get_mut(&1).unwrap();let s=&mut a.profile.skills[0];
        s.id=321;s.range=400.0;s.cooldown=100.0;s.parts=[100.0,0.0,0.0,0.0,0.0];s.travel=0.4;
        s.projectile=Some(LinearProjectile{range:400.0,width:16.0,speed:100.0,ignore_terrain:false,pierce:true,area:0.0,homing:false});
        g.command(1,cmd(2,11,2,2,321,0.0,0.0)).unwrap();g.step();
        let cast=g.events.iter().find(|e|e.kind==1&&e.source==1).unwrap().id;
        let report=|seq|cmd(seq,16,2,2,321,(cast&65535) as f32,(cast>>16) as f32);
        if early_report {g.command(1,report(3)).unwrap();}
        for _ in 0..10 {g.step();}
        assert_eq!(g.actors[&2].hp,200.0,"a client report cannot bypass server flight validation");
        for _ in 0..30 {g.step();}
        if !early_report {
            assert_eq!(g.actors[&2].hp,200.0,"server arrival must wait for the client's collision frame");
            g.command(1,report(3)).unwrap();g.step();
        }
        assert_eq!(g.actors[&2].hp,200.0,"PvP also waits for the victim to display the impact");
        g.command(2,report(2)).unwrap();g.step();
        assert_eq!(g.actors[&2].hp,180.0);
        g.command(1,report(4)).unwrap();g.step();assert_eq!(g.actors[&2].hp,180.0);
        remove_fixture(g);
    }
}

#[test]
fn authoritative_position_survives_reconnect_restart_and_character_slot_isolation() {
    let mut g=game();field(&mut g);
    let a=g.actors.get_mut(&1).unwrap();a.x=345.0;a.y=456.0;a.hp=123.0;
    let profile=a.profile.clone();
    let definitions=Definitions{battlefield:None,version:1,town:1,maps:g.rooms.values().map(|r|r.definition.clone()).collect()};
    g.checkpoint().unwrap();
    let file=g.outbox.path_for_test();drop(g);
    let mut g=Game::new(file.clone()).unwrap();g.install(definitions).unwrap();
    g.join(10,"account-a".into(),0,profile.clone()).unwrap();
    let a=&g.actors[&10];assert_eq!((a.map,a.x,a.y,a.hp),(2,345.0,456.0,123.0));
    g.join(11,"account-a".into(),1,profile).unwrap();assert_eq!(g.actors[&11].map,1);
    assert_eq!((g.actors[&11].x,g.actors[&11].y),(100.0,100.0));
    remove_fixture(g);let _=std::fs::remove_file(file.with_extension("state.json"));
}

#[test]
fn player_death_persists_killer_and_waits_for_explicit_town_button_after_reload() {
    let mut g=pvp_fixture();g.actors.get_mut(&1).unwrap().name="Sát Thủ <script>".into();
    let mut s=g.actors[&1].profile.skills[0].clone();s.parts=[10000.0,0.0,0.0,0.0,0.0];
    pvp::hit(&mut g,1,2,&s,&mut vec![]);g.step();
    let a=&g.actors[&2];assert_eq!(a.death_notice.as_ref().unwrap().name,"Sát Thủ <script>");assert!(a.death_notice.as_ref().unwrap().player);
    let profile=a.profile.clone();let life=a.life;
    let request=a.death_notice.as_ref().unwrap().request.clone().unwrap();
    assert_eq!(g.outbox.pending.len(),1);
    g.actors.remove(&2);g.join(20,"account-b".into(),0,profile).unwrap();
    assert_eq!(g.actors[&20].hp,0.0);assert_eq!(g.actors[&20].map,2);
    for _ in 0..140{g.step();}
    assert_eq!(g.actors[&20].hp,0.0);assert_eq!(g.outbox.pending.len(),1,"reload never charges a second death");
    g.command(20,cmd(1,1,1,0,0,0.0,0.0)).unwrap();assert_eq!(g.actors[&20].map,2,"dead players cannot use normal map travel");
    g.command(20,cmd(2,17,2,0,0,0.0,0.0)).unwrap();
    let a=&g.actors[&20];assert_eq!(a.map,1);assert_eq!(a.hp,a.profile.hp);assert_eq!(a.life,life+1);assert!(a.death_notice.is_none());
    // A delayed debit receipt still creates the piles at the place of death.
    assert!(g.accept_death_drop(&request,333,false).unwrap());
    assert_eq!(g.rooms[&2].loot.len(),8);assert!(g.rooms[&1].loot.is_empty());
    assert_eq!(g.rooms[&2].loot.iter().map(|d|d.gold).sum::<u32>(),333);
    assert!(g.accept_death_drop(&request,333,false).unwrap());assert_eq!(g.rooms[&2].loot.len(),8);
    remove_fixture(g);
}

#[test]
fn monster_deaths_have_named_killers_and_zero_knb_receipts_do_not_make_empty_piles() {
    let mut g=game();field(&mut g);let mob=g.rooms[&2].mobs[0].id;
    let a=g.actors.get_mut(&1).unwrap();a.hp=1.0;
    let m=&mut g.rooms.get_mut(&2).unwrap().mobs[0];m.x=100.0;m.y=100.0;m.cd=0.0;m.target=1;m.def.damage=9999.0;
    g.step();let a=&g.actors[&1];assert_eq!(a.hp,0.0);
    let death=a.death_notice.as_ref().unwrap();assert_eq!(death.killer,mob);assert!(!death.player);assert_eq!(death.name,"fixture");
    let request=death.request.clone().unwrap();assert!(g.accept_death_drop(&request,0,false).unwrap());assert!(g.rooms[&2].loot.iter().all(|d|d.gold==0));
    remove_fixture(g);
}

#[test]
fn knb_piles_survive_restart_are_public_and_competing_pickups_credit_once() {
    let mut g=pvp_fixture();g.actors.get_mut(&2).unwrap().hp=0.0;g.actors.get_mut(&2).unwrap().last_attacker=1;g.step();
    let request=g.actors[&2].death_notice.as_ref().unwrap().request.clone().unwrap();
    assert!(g.accept_death_drop(&request,1_000_001,false).is_err());
    assert!(g.accept_death_drop(&request,1_000_000,false).unwrap());
    let profile=g.actors[&1].profile.clone();
    let definitions=Definitions{battlefield:None,version:1,town:1,maps:g.rooms.values().map(|r|r.definition.clone()).collect()};
    let file=g.outbox.path_for_test();drop(g);
    let mut g=Game::new(file.clone()).unwrap();g.install(definitions).unwrap();
    assert_eq!(g.rooms[&2].loot.iter().map(|d|d.gold).sum::<u32>(),1_000_000);
    let drop=g.rooms[&2].loot[0].clone();assert!(drop.owner.is_empty());
    for (id,account) in [(10,"stranger-a"),(11,"stranger-b")] {
        g.join(id,account.into(),0,profile.clone()).unwrap();
        let a=g.actors.get_mut(&id).unwrap();a.map=2;a.x=drop.x;a.y=drop.y;
        g.command(id,cmd(1,6,2,drop.id,0,0.0,0.0)).unwrap();
    }
    g.step();assert!(!g.rooms[&2].loot.iter().any(|d|d.id==drop.id));
    let credits:Vec<_>=g.outbox.pending.values().filter(|g|g.gold>0).collect();assert_eq!(credits.len(),1);assert_eq!(credits[0].gold,drop.gold);
    assert_eq!(g.rooms[&2].loot.iter().map(|d|d.gold).sum::<u32>()+credits[0].gold,1_000_000);
    remove_fixture(g);let _=std::fs::remove_file(file.with_extension("state.json"));
}

#[test]
fn poison_death_keeps_the_killer_name_even_if_the_attacker_disconnected() {
    let mut g=pvp_fixture();g.actors.get_mut(&1).unwrap().name="Độc Sư".into();
    let mut s=g.actors[&1].profile.skills[0].clone();s.parts=[0.0,2000.0,0.0,0.0,0.0];s.poison=2.0;
    pvp::hit(&mut g,1,2,&s,&mut vec![]);g.actors.remove(&1);
    for _ in 0..45 {g.step();}
    let a=&g.actors[&2];assert_eq!(a.hp,0.0);
    let notice=a.death_notice.as_ref().unwrap();assert_eq!(notice.name,"Độc Sư");assert!(notice.player);
    remove_fixture(g);
}

#[test]
fn resume_hint_continues_checkpoint_without_changing_map_life_or_resources() {
    let mut g=game();field(&mut g);g.checkpoint().unwrap();
    let a=&g.actors[&1];let (x,y,map,life,hp,mp)=(a.x,a.y,a.map,a.life,a.hp,a.mp);
    g.resume_position(1,Some(ResumePosition{map,x:x+10.0,y,life}));
    assert_eq!(g.actors[&1].x,x+10.0);assert_eq!((g.actors[&1].hp,g.actors[&1].mp),(hp,mp));
    for p in [ResumePosition{map:1,x,y,life},ResumePosition{map,x:100000.0,y,life},ResumePosition{map,x,y,life:life+1},ResumePosition{map,x:f32::NAN,y,life}] {
        g.resume_position(1,Some(p));assert_eq!(g.actors[&1].x,x+10.0);
    }
    g.actors.get_mut(&1).unwrap().hp=0.0;
    g.resume_position(1,Some(ResumePosition{map,x,y,life}));assert_eq!(g.actors[&1].x,x+10.0);
    remove_fixture(g);
}

#[test]
fn purchased_potions_refresh_live_stock_without_replaying_unacknowledged_debits() {
    let mut g=game();
    let potion:Potion=serde_json::from_value(serde_json::json!({"id":1,"kind":"life","tier":1,"level":1,"hp":100,"mp":0,"count":0,"spent":0})).unwrap();
    let a=g.actors.get_mut(&1).unwrap();a.profile.potions=vec![potion];a.hp=10.0;
    let mut purchased=g.actors[&1].profile.clone();purchased.potions[0].count=1;
    g.refresh_profile(1,purchased.clone(),1);
    assert_eq!(g.actors[&1].profile.potions[0].count,1,"a new bottle must reach the running combat actor");
    g.command(1,cmd(1,7,1,0,1,0.0,0.0)).unwrap();
    assert_eq!(g.actors[&1].hp,110.0);assert_eq!(g.actors[&1].profile.potions[0].count,0);
    g.refresh_profile(1,purchased.clone(),2);
    assert_eq!((g.actors[&1].profile.potions[0].count,g.actors[&1].profile.potions[0].spent),(0,1),"a pending debit wins over a delayed stock snapshot");
    purchased.potions[0].spent=1;
    g.refresh_profile(1,purchased,3);
    assert_eq!((g.actors[&1].profile.potions[0].count,g.actors[&1].profile.potions[0].spent),(1,1),"a genuinely replenished bottle is not charged twice");
    assert_eq!(g.outbox.pending.len(),1);remove_fixture(g);
}

#[test]
fn secondary_attack_casts_once_without_changing_primary_and_obeys_recovery() {
    let mut g=game();field(&mut g);
    let target=g.rooms[&2].mobs[0].id;
    let a=g.actors.get_mut(&1).unwrap();
    let mut alternate=a.profile.skills[0].clone();alternate.id=2;alternate.cost=3.0;alternate.cooldown=2.0;
    let mut third=alternate.clone();third.id=3;
    a.profile.skills.push(alternate);a.profile.skills.push(third);a.x=100.0;a.y=100.0;
    let m=&mut g.rooms.get_mut(&2).unwrap().mobs[0];m.x=110.0;m.y=100.0;m.hp=10000.0;
    g.command(1,cmd(2,18,2,target,2,0.0,0.0)).unwrap();
    g.step();
    assert_eq!(g.actors[&1].skill,1);assert!(g.actors[&1].secondary.is_none());
    assert_eq!(g.actors[&1].mp,27.0);
    assert_eq!(g.events.iter().filter(|e|e.source==1&&e.kind==1&&e.skill==2).count(),1);
    for _ in 0..10{g.step();}
    assert_eq!(g.events.iter().filter(|e|e.source==1&&e.kind==1&&e.skill==2).count(),1);
    let refreshed=g.actors[&1].profile.clone();g.refresh_profile(1,refreshed,1);
    g.command(1,cmd(3,18,2,target,3,0.0,0.0)).unwrap();g.step();
    assert_eq!(g.actors[&1].mp,27.0,"switching skills or refreshing a profile cannot bypass attack recovery");
    g.command(1,cmd(4,2,2,0,0,150.0,150.0)).unwrap();
    assert!(g.actors[&1].secondary.is_none(),"movement cancels the waiting secondary attack");
    g.command(1,cmd(5,18,2,target,999,0.0,0.0)).unwrap();
    assert!(g.actors[&1].secondary.is_none(),"unlearned skills cannot be cast");
    remove_fixture(g);
}

#[test]
fn secondary_pvp_attack_respects_hostility_and_preserves_primary() {
    let mut g=pvp_fixture();
    let a=g.actors.get_mut(&1).unwrap();let mut skill=a.profile.skills[0].clone();skill.id=2;a.profile.skills.push(skill);
    g.actors.get_mut(&2).unwrap().x=110.0;
    g.command(1,cmd(2,18,2,2,2,0.0,0.0)).unwrap();g.step();
    assert_eq!(g.actors[&1].skill,1);
    assert!(g.events.iter().any(|e|e.kind==1&&e.source==1&&e.target==2&&e.skill==2));
    g.actors.get_mut(&1).unwrap().pvp.enabled=false;
    g.command(1,cmd(3,18,2,2,2,0.0,0.0)).unwrap();
    assert!(g.actors[&1].secondary.is_none(),"right click cannot bypass PK permission");
    remove_fixture(g);
}

#[test]
fn allied_support_matches_native_stats_for_every_faction_with_own_buffs_active(){
    let rows:serde_json::Value=serde_json::from_str(include_str!("../../../../test/fixtures/multiplayer-allied-support.json")).unwrap();
    for row in rows.as_array().unwrap(){
        let name=row["name"].as_str().unwrap();
        let mut g=game();g.actors.clear();
        for (id,fixture) in [(1,name),(2,"emei"),(3,"shaolin")]{
            g.join(id,format!("account-{id}"),0,support_fixture(fixture)).unwrap();
            let a=g.actors.get_mut(&id).unwrap();a.party_alignment=Some(0);
            let skills=a.base_profile.support.as_ref().unwrap().skills.clone();
            for s in skills {if !s.aura&&!s.curse&&s.duration>=5.0{a.support.active.insert(s.id,s.duration);}}
            support::resolve(a);
        }
        g.refresh_shared_support();
        let a=&g.actors[&1];let expected:Profile=serde_json::from_value(row["expected"].clone()).unwrap();
        let close=|a:f32,b:f32,field:&str|assert!((a-b).abs()<0.02,"{name} {field}: {a} != {b}");
        close(a.profile.hp,expected.hp,"hp");close(a.profile.mp,expected.mp,"mp");
        close(a.profile.regen,expected.regen,"regen");close(a.profile.mana_regen,expected.mana_regen,"mana regen");
        close(a.profile.defense,expected.defense,"defense");
        close(speed::movement(a),expected.speed,"speed");
        close(a.profile.protection.reflect_percent,expected.protection.reflect_percent,"reflect");
        close(a.profile.protection.cold_reduction,expected.protection.cold_reduction,"cold reduction");
        for (a,b) in a.profile.res.iter().zip(expected.res){close(*a,b,"res");}
        for (a,b) in a.profile.skills.iter().zip(expected.skills){for (a,b) in a.parts.iter().zip(b.parts){close(*a,b,"damage");}}
        assert_eq!(a.support.shared.len(),row["allies"].as_array().unwrap().len());
        remove_fixture(g);
    }
}
#[test]
fn allied_support_requires_same_alignment_alive_same_map_within_410_and_does_not_relay(){
    let mut g=game();g.actors.clear();
    for (id,name) in [(1,"tianwang"),(2,"emei"),(3,"emei")]{
        g.join(id,format!("account-{id}"),0,support_fixture(name)).unwrap();
        g.actors.get_mut(&id).unwrap().party_alignment=Some(0);
    }
    let base=g.actors[&1].profile.hp;
    let x=g.actors[&1].x;let y=g.actors[&1].y;
    g.actors.get_mut(&2).unwrap().x=x+410.0;
    g.actors.get_mut(&3).unwrap().x=x+900.0;
    g.refresh_shared_support();assert_eq!(g.actors[&1].support.shared.len(),5);
    assert!(g.actors[&1].profile.hp>base);
    let hp=g.actors[&1].profile.hp;
    g.actors.get_mut(&3).unwrap().x=x+400.0;
    g.refresh_shared_support();assert_eq!(g.actors[&1].profile.hp,hp,"same skill cannot stack");
    g.actors.get_mut(&3).unwrap().hp=0.0;
    g.actors.get_mut(&2).unwrap().x=x+410.1;
    g.refresh_shared_support();assert!(g.actors[&1].support.shared.is_empty());assert_eq!(g.actors[&1].profile.hp,base);
    g.actors.get_mut(&2).unwrap().x=x;g.actors.get_mut(&2).unwrap().party_alignment=Some(1);
    g.refresh_shared_support();assert!(g.actors[&1].support.shared.is_empty());
    g.actors.get_mut(&2).unwrap().party_alignment=Some(0);g.actors.get_mut(&2).unwrap().map=2;
    g.refresh_shared_support();assert!(g.actors[&1].support.shared.is_empty());
    g.actors.get_mut(&2).unwrap().map=1;g.actors.get_mut(&2).unwrap().hp=0.0;
    g.refresh_shared_support();assert!(g.actors[&1].support.shared.is_empty());
    g.actors.get_mut(&2).unwrap().hp=10.0;g.actors.get_mut(&2).unwrap().support.auras.clear();
    g.refresh_shared_support();assert!(g.actors[&1].support.shared.is_empty());
    g.actors.get_mut(&2).unwrap().support.auras.insert(92);
    g.refresh_shared_support();assert_eq!(g.actors[&1].support.shared.len(),1);
    g.actors.get_mut(&1).unwrap().hp=0.0;g.refresh_shared_support();assert!(g.actors[&1].support.shared.is_empty());
    let _=y;remove_fixture(g);
}

#[test]
fn curses_spend_resources_once_and_wait_for_client_contact_before_affecting_monsters(){
    let mut g=game();g.actors.remove(&1);g.join(1,"account-a".into(),0,support_fixture("wudu")).unwrap();field(&mut g);
    for s in &mut g.actors.get_mut(&1).unwrap().base_profile.support.as_mut().unwrap().skills{s.enabled=false;}
    let mob=g.rooms[&2].mobs[0].id;let mp=g.actors[&1].mp;
    let cost=g.actors[&1].profile.skills.iter().find(|s|s.id==356).unwrap().cost;
    g.command(1,cmd(2,8,2,mob,356,0.0,0.0)).unwrap();
    assert_eq!(g.actors[&1].mp,mp-cost);
    g.command(1,cmd(3,8,2,mob,356,0.0,0.0)).unwrap();assert_eq!(g.actors[&1].mp,mp-cost);
    let event=g.events.iter().find(|e|e.kind==1&&e.skill==356).unwrap().id;
    for _ in 0..20{g.step();}
    assert!(g.rooms[&2].mobs[0].curses.is_empty(),"no debuff before the client contact frame");
    g.command(1,cmd(4,16,2,mob,356,(event&65535) as f32,(event>>16) as f32)).unwrap();g.step();
    let m=&g.rooms[&2].mobs[0];assert!(m.curses.contains_key(&356));assert_eq!(m.hp,m.def.hp,"curse itself deals no damage");
    let resistance=curses::resistances(&m.def.res,&m.curses);assert!(resistance[0]<m.def.res[0]);
    g.rooms.get_mut(&2).unwrap().mobs[0].curses.get_mut(&356).unwrap().remaining=0.01;
    g.step();assert!(g.rooms[&2].mobs[0].curses.is_empty());
    assert_eq!(g.rooms[&2].mobs[0].def.res,[0.0;5],"expiry preserves canonical monster stats");remove_fixture(g);
}
#[test]
fn pvp_curse_requires_enemy_permissions_and_contact_from_both_clients(){
    let mut g=game();g.actors.remove(&1);g.join(1,"account-a".into(),0,support_fixture("wudu")).unwrap();field(&mut g);
    for s in &mut g.actors.get_mut(&1).unwrap().base_profile.support.as_mut().unwrap().skills{s.enabled=false;}
    g.actors.get_mut(&1).unwrap().pvp.enabled=true;
    g.actors.get_mut(&2).unwrap().x=120.0;g.rooms.get_mut(&2).unwrap().mobs.clear();
    g.command(1,cmd(2,8,2,2,67,0.0,0.0)).unwrap();
    let event=g.events.iter().find(|e|e.kind==1&&e.skill==67).unwrap().id;
    g.command(1,cmd(3,16,2,2,67,(event&65535) as f32,(event>>16) as f32)).unwrap();
    for _ in 0..20{g.step();}assert!(g.actors[&2].support.curses.is_empty());
    g.command(2,cmd(2,16,2,2,67,(event&65535) as f32,(event>>16) as f32)).unwrap();g.step();
    assert!(g.actors[&2].support.curses.contains_key(&67));assert!(g.actors[&2].profile.res[4]<0.0);
    g.actors.get_mut(&2).unwrap().support.curses.get_mut(&67).unwrap().remaining=0.01;g.step();assert_eq!(g.actors[&2].profile.res[4],0.0);
    g.actors.get_mut(&2).unwrap().party_alignment=Some(g.actors[&1].profile.alignment);
    let mp=g.actors[&1].mp;assert!(!g.cast_curse(1,70,2,false));assert_eq!(g.actors[&1].mp,mp);
    remove_fixture(g);
}
