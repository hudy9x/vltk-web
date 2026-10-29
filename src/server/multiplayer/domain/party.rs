//! Session-scoped parties. Membership, invitations and friendly fire are authoritative.
use super::*;
pub const MAX_MEMBERS: usize = 8;
pub const INVITE_SECONDS: f32 = 60.0;
pub const INVITE_RANGE: f32 = 1600.0;
pub struct Invitation {
    pub id: u32,
    pub from: u32,
    pub created: u32,
}
#[derive(Default)]
pub struct Parties {
    /// Ordered members: index zero owns the party and its name color.
    pub groups: BTreeMap<u32, Vec<u32>>,
    pub invitations: BTreeMap<u32, Invitation>,
    pub replies: BTreeMap<u32, (u32, u8)>,
}
impl Parties {
    pub fn leader(&self, id: u32) -> u32 {
        self.groups.iter().find(|(_, members)| members.contains(&id)).map_or(0, |(&leader, _)| leader)
    }
}
impl Game {
    fn invitation_live(&self, invite: &Invitation) -> bool {
        self.tick.wrapping_sub(invite.created) as f32 * self.rules.tick_seconds < INVITE_SECONDS
    }
    pub(super) fn party_colors(&mut self) {
        for actor in self.actors.values_mut() { actor.party_alignment = None; }
        for (&leader, members) in &self.parties.groups {
            let Some(color) = self.actors.get(&leader).map(|a| a.profile.alignment) else { continue; };
            for id in members {
                if let Some(actor) = self.actors.get_mut(id) { actor.party_alignment = Some(color); }
            }
        }
    }
    pub fn party_leave(&mut self, id: u32) {
        let leader = self.parties.leader(id);
        if let Some(mut members) = self.parties.groups.remove(&leader) {
            members.retain(|&member| member != id);
            if members.len() > 1 { self.parties.groups.insert(members[0], members); }
        }
        // A departed leader's old invitations must never create a new party.
        self.parties.invitations.retain(|&to, invite| to != id && invite.from != id);
        self.party_colors();
    }
    pub(super) fn party_command(&mut self, id: u32, c: &Command) {
        let code = self.apply_party_command(id, c);
        self.parties.replies.insert(id, (c.seq, code));
    }
    fn apply_party_command(&mut self, id: u32, c: &Command) -> u8 {
        if self.actors.get(&id).is_none_or(|a| a.map != c.map) { return 5; }
        let tick = self.tick;
        let dt = self.rules.tick_seconds;
        self.parties.invitations.retain(|_, invite| tick.wrapping_sub(invite.created) as f32 * dt < INVITE_SECONDS);
        match c.kind {
            12 => {
                let (Some(a), Some(b)) = (self.actors.get(&id), self.actors.get(&c.target)) else { return 5; };
                if id == c.target || a.map != b.map || self.parties.leader(c.target) != 0 { return 5; }
                if distance(a.x, a.y, b.x, b.y) > INVITE_RANGE { return 9; }
                let leader = self.parties.leader(id);
                if leader != 0 && leader != id { return 6; }
                if self.parties.groups.get(&leader).is_some_and(|members| members.len() >= MAX_MEMBERS) { return 7; }
                if self.parties.invitations.contains_key(&c.target) { return 10; }
                let invitation = Invitation { id: self.id(), from: id, created: self.tick };
                self.parties.invitations.insert(c.target, invitation);
                1
            }
            13 | 14 => {
                let Some(invite) = self.parties.invitations.get(&id) else { return 8; };
                if invite.id != c.target || !self.invitation_live(invite) { return 8; }
                let from = invite.from;
                self.parties.invitations.remove(&id);
                if c.kind == 14 { return 3; }
                if self.parties.leader(id) != 0 || self.actors.get(&from).is_none_or(|a| a.map != c.map) { return 5; }
                let leader = self.parties.leader(from);
                if leader != 0 && leader != from { return 6; }
                if self.parties.groups.get(&from).is_some_and(|m| m.len() >= MAX_MEMBERS) { return 7; }
                self.parties.groups.entry(from).or_insert_with(|| vec![from]).push(id);
                self.parties.invitations.retain(|_, invite| invite.from != id);
                self.party_colors();
                2
            }
            15 => { self.party_leave(id); 4 }
            _ => 5,
        }
    }
}
fn name(bytes: &mut Vec<u8>, value: &str) {
    // Names were validated at admission; cap at UTF-8 boundaries for test/internal callers.
    let mut end = value.len().min(96);
    while !value.is_char_boundary(end) { end -= 1; }
    bytes.push(end as u8);
    bytes.extend(&value.as_bytes()[..end]);
}
/// v8 trailer, private to the recipient: leader, reply, members, pending invitation.
pub fn encode(game: &Game, id: u32, bytes: &mut Vec<u8>) {
    let leader = game.parties.leader(id);
    let members = game.parties.groups.get(&leader).map(Vec::as_slice).unwrap_or(&[]);
    let invite = game.parties.invitations.get(&id).filter(|i| game.invitation_live(i));
    let (seq, code) = game.parties.replies.get(&id).copied().unwrap_or_default();
    bytes.extend(leader.to_le_bytes()); bytes.extend(seq.to_le_bytes()); bytes.push(code);
    bytes.push(members.len() as u8); bytes.push(u8::from(invite.is_some()));
    for member in members {
        let actor = &game.actors[member];
        bytes.extend(member.to_le_bytes()); bytes.extend(actor.map.to_le_bytes());
        bytes.extend(actor.hp.to_le_bytes()); bytes.extend(actor.profile.hp.to_le_bytes());
        bytes.push(actor.party_alignment.unwrap_or(actor.profile.alignment));
        name(bytes, &actor.name);
    }
    if let Some(invite) = invite {
        bytes.extend(invite.id.to_le_bytes()); bytes.extend(invite.from.to_le_bytes());
        let remaining = INVITE_SECONDS - game.tick.wrapping_sub(invite.created) as f32 * game.rules.tick_seconds;
        bytes.extend(remaining.to_le_bytes()); name(bytes, &game.actors[&invite.from].name);
    }
}
