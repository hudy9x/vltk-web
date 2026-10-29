use serde::{Deserialize, Serialize};
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Skill {
    #[serde(default)]
    pub leech: f32,
    #[serde(default)]
    pub mana_leech: f32,
    #[serde(default = "one_level")]
    pub level: u16,
    #[serde(default = "one_missile")]
    pub missiles: u8,
    #[serde(default)]
    pub melee: bool,
    #[serde(default)]
    pub phys: bool,
    pub id: u16,
    pub cost: f32,
    pub cooldown: f32,
    pub range: f32,
    pub radius: f32,
    pub shape: String,
    pub targets: usize,
    #[serde(default)]
    pub projectile: Option<LinearProjectile>,
    pub parts: [f32; 5],
    #[serde(default)]
    pub pve: Option<PveDamage>,
    pub crit: f32,
    pub stun: f32,
    pub cold: f32,
    #[serde(default = "default_stun_seconds")]
    pub stun_seconds: f32,
    pub poison: f32,
    pub travel: f32,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PveDamage {
    pub series: i8,
    pub series_resistance: f32,
    pub anti: [f32; 5],
    pub resistance_cap: f32,
    pub maximum_resistance: f32,
    pub flat_series: f32,
    pub heavy_chance: f32,
    pub versus: [f32; 5],
    pub spread: f32,
    pub critical_multiplier: f32,
    pub advantage_bonus: f32,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LinearProjectile {
    pub range: f32,
    /// Full strip width in the same X / doubled-Y space as the client.
    pub width: f32,
    pub speed: f32,
    pub ignore_terrain: bool,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    #[serde(default = "neutral_alignment")]
    pub alignment: u8,
    #[serde(default = "no_series")]
    pub series: i8,
    #[serde(default)]
    pub protection: Protection,
    #[serde(default)]
    pub support: Option<Box<SupportCatalog>>,
    #[serde(default)]
    pub potions: Vec<Potion>,
    pub level: u16,
    pub hp: f32,
    pub mp: f32,
    pub regen: f32,
    pub mana_regen: f32,
    pub speed: f32,
    pub defense: f32,
    pub res: [f32; 5],
    pub skills: Vec<Skill>,
}
#[derive(Clone, Debug, Deserialize)]
pub struct Point {
    pub x: f32,
    pub y: f32,
}
#[derive(Clone, Debug, Deserialize)]
pub struct Size {
    pub width: f32,
    pub height: f32,
}
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Grid {
    pub kind: String,
    #[serde(default)]
    pub columns: usize,
    #[serde(default)]
    pub rows: usize,
    pub cell_size: Option<Size>,
    #[serde(default)]
    pub blocked_base64: String,
}
#[derive(Clone, Debug, Deserialize)]
pub struct MonsterDefinition {
    pub id: u32,
    #[serde(rename = "name")]
    pub _name: String,
    pub level: u16,
    pub hp: f32,
    pub damage: f32,
    pub defense: f32,
    pub speed: f32,
    pub res: [f32; 5],
    #[serde(default = "no_series")]
    pub series: i8,
    pub xp: u32,
    pub gold: u32,
}
#[derive(Clone, Debug, Deserialize)]
pub struct MapDefinition {
    pub id: u32,
    pub level: u16,
    pub town: bool,
    pub width: f32,
    pub height: f32,
    pub entry: Point,
    pub grid: Grid,
    pub monsters: Vec<MonsterDefinition>,
}
#[derive(Clone, Debug, Deserialize)]
pub struct Definitions {
    pub version: u32,
    pub town: u32,
    pub maps: Vec<MapDefinition>,
}
#[derive(Clone, Debug, Deserialize)]
pub struct Admission {
    pub nonce: String,
    pub account: String,
    pub slot: u8,
    pub profile: Profile,
}

fn one_level() -> u16 {
    1
}
fn one_missile() -> u8 {
    1
}

fn default_stun_seconds() -> f32 {
    0.8
}

fn no_series() -> i8 {
    -1
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Potion {
    pub id: u16,
    pub kind: String,
    pub tier: u8,
    pub level: u16,
    pub hp: f32,
    pub mp: f32,
    pub count: u32,
    pub spent: u32,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct Protection {
    pub ranged_reflect: f32,
    pub from: [f32; 5],
    pub cold_reduction: f32,
    pub stun_reduction: f32,
    pub poison_reduction: f32,
    pub mana_shield: f32,
    pub reflect: f32,
    pub reflect_percent: f32,
    pub absorption: f32,
    pub damage_shield: f32,
    pub damage_to_mana: f32,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SupportSkill {
    pub id: u16,
    pub level: u16,
    pub aura: bool,
    pub enabled: bool,
    pub duration: f32,
    pub cooldown: f32,
    pub cost: f32,
    pub life_cost: bool,
    pub heal: f32,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct SupportVariant {
    pub active: Vec<u16>,
    pub profile: Profile,
}
#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct SupportCatalog {
    pub skills: Vec<SupportSkill>,
    pub variants: Vec<SupportVariant>,
}

fn neutral_alignment() -> u8 {
    3
}
