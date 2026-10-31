//! Shared with the frontend: edit ../paths.json, then rebuild the tool.
use serde::Deserialize;
use std::{
    path::{Component, Path, PathBuf},
    sync::OnceLock,
};
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Paths {
    pub public_root: String,
    pub sound_directory: String,
    pub sound_config: String,
    pub faction_portrait_directory: String,
    pub element_icon_directory: String,
    pub max_sound_bytes: usize,
}
pub fn config() -> &'static Paths {
    static PATHS: OnceLock<Paths> = OnceLock::new();
    PATHS.get_or_init(|| {
        serde_json::from_str(include_str!("../../paths.json")).expect("Invalid map-tool paths.json")
    })
}
pub fn relative(path: &str) -> bool {
    !path.is_empty()
        && !path.contains('\\')
        && !Path::new(path).is_absolute()
        && Path::new(path)
            .components()
            .all(|p| matches!(p, Component::Normal(_)))
}
pub fn audio_file(path: &str) -> bool {
    let lower = path.to_ascii_lowercase();
    (lower.ends_with(".wav") || lower.ends_with(".mp3"))
        && path
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b"_-.".contains(&b))
        && !path.starts_with('.')
}
pub fn sound_target(path: &str) -> bool {
    let paths = config();
    relative(path)
        && (path == paths.sound_config
            || path
                .strip_prefix(&format!("{}/", paths.sound_directory))
                .is_some_and(audio_file))
}
pub fn inside(root: &Path, relative_path: &str) -> Result<PathBuf, String> {
    if !relative(relative_path) {
        return Err("Đường dẫn không hợp lệ".into());
    }
    let mut target = root.to_path_buf();
    for component in Path::new(relative_path).components() {
        target.push(component);
        if target
            .symlink_metadata()
            .is_ok_and(|m| m.file_type().is_symlink())
        {
            return Err("Không đọc/ghi qua symbolic link".into());
        }
    }
    Ok(target)
}
