use crate::{
    paths, transactions,
    workspace::{WorkspaceState, node},
};
use base64::Engine;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{collections::BTreeSet, fs, path::Path};
use tauri::{State, ipc::Response};
type Result<T> = std::result::Result<T, String>;
#[derive(Debug, Serialize)]
pub struct AudioSnapshot {
    config: Value,
    revision: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioRequest {
    config: Value,
    expected_revision: String,
    assets: Vec<AudioAsset>,
}
#[derive(Deserialize)]
pub struct AudioAsset {
    pub file: String,
    pub data: String,
}
fn config(root: &Path) -> Result<Value> {
    serde_json::from_slice(
        &fs::read(paths::inside(root, &paths::config().sound_config)?)
            .map_err(|e| e.to_string())?,
    )
    .map_err(|e| e.to_string())
}
fn source_path(src: &str) -> String {
    format!("{}/{}", paths::config().public_root, src)
}
fn source_target(root: &Path, src: &str) -> Result<std::path::PathBuf> {
    if !paths::relative(src) {
        return Err("Đường dẫn âm thanh không hợp lệ".into());
    }
    paths::inside(root, &source_path(src))
}
fn snapshot(root: &Path) -> Result<AudioSnapshot> {
    let value = config(root)?;
    let mut bytes =
        fs::read(paths::inside(root, &paths::config().sound_config)?).map_err(|e| e.to_string())?;
    let mut sources = BTreeSet::new();
    for sound in value["sounds"]
        .as_object()
        .ok_or("Thiếu danh mục sounds")?
        .values()
    {
        sources.insert(source_path(sound["src"].as_str().ok_or("Sound thiếu src")?));
    }
    let directory = paths::inside(root, &paths::config().sound_directory)?;
    if directory.exists() {
        for entry in fs::read_dir(directory).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let name = entry.file_name().to_string_lossy().to_string();
            if paths::audio_file(&name) {
                sources.insert(format!("{}/{}", paths::config().sound_directory, name));
            }
        }
    }
    for relative in sources {
        bytes.extend(relative.as_bytes());
        let target = paths::inside(root, &relative)?;
        if target.exists() {
            let size = fs::metadata(&target).map_err(|e| e.to_string())?.len();
            if size > paths::config().max_sound_bytes as u64 {
                return Err("File âm thanh vượt giới hạn dung lượng".into());
            }
            bytes.extend(
                transactions::hash(&fs::read(target).map_err(|e| e.to_string())?).as_bytes(),
            );
        } else {
            bytes.extend(b"missing");
        }
    }
    Ok(AudioSnapshot {
        config: value,
        revision: transactions::hash(&bytes),
    })
}
fn check_audio(file: &str, bytes: &[u8]) -> Result<()> {
    if !paths::audio_file(file) || bytes.is_empty() || bytes.len() > paths::config().max_sound_bytes
    {
        return Err("Chọn WAV/MP3 hợp lệ, tối đa 20 MB".into());
    }
    let lower = file.to_ascii_lowercase();
    let valid = if lower.ends_with(".wav") {
        bytes.len() >= 12 && &bytes[..4] == b"RIFF" && &bytes[8..12] == b"WAVE"
    } else {
        bytes.starts_with(b"ID3") || bytes.len() >= 2 && bytes[0] == 0xff && bytes[1] & 0xe0 == 0xe0
    };
    if !valid {
        return Err("Nội dung file không đúng định dạng WAV/MP3".into());
    }
    Ok(())
}
fn validate(root: &Path, value: &Value, assets: &[AudioAsset]) -> Result<Vec<(String, Vec<u8>)>> {
    if value["version"] != 1 {
        return Err("Config âm thanh không đúng version 1".into());
    }
    let sounds = value["sounds"].as_object().ok_or("Thiếu danh mục sounds")?;
    let skills = value["skills"].as_object().ok_or("Thiếu danh mục skills")?;
    let mut writes = Vec::new();
    let mut pending = BTreeSet::new();
    for asset in assets {
        let bytes = base64::engine::general_purpose::STANDARD
            .decode(&asset.data)
            .map_err(|_| "Dữ liệu upload không hợp lệ")?;
        check_audio(&asset.file, &bytes)?;
        let relative = format!("{}/{}", paths::config().sound_directory, asset.file);
        if !pending.insert(relative.clone()) {
            return Err("Tên file upload bị trùng".into());
        }
        if paths::inside(root, &relative)?.exists() {
            return Err(format!(
                "File đã tồn tại: {}. Hãy dùng tên mới.",
                asset.file
            ));
        }
        if !sounds.values().any(|s| {
            s["src"]
                .as_str()
                .is_some_and(|src| source_path(src) == relative)
        }) {
            return Err("File upload chưa được gắn Sound ID".into());
        }
        writes.push((relative, bytes));
    }
    for (id, sound) in sounds {
        if id.is_empty() || !id.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_') {
            return Err(format!("Sound ID không hợp lệ: {id}"));
        }
        if !matches!(sound["category"].as_str(), Some("voice" | "effect")) {
            return Err(format!("Phân loại không hợp lệ: {id}"));
        }
        if let Some(gender) = sound.get("gender") {
            if !matches!(gender.as_str(), Some("male" | "female")) {
                return Err("Giới tính sound không hợp lệ".into());
            }
        }
        let src = sound["src"].as_str().ok_or("Sound thiếu src")?;
        if !src.to_ascii_lowercase().ends_with(".wav")
            && !src.to_ascii_lowercase().ends_with(".mp3")
        {
            return Err("Chỉ hỗ trợ WAV/MP3".into());
        }
        let target = source_target(root, src)?;
        if !pending.contains(&source_path(src)) && !target.is_file() {
            return Err(format!("Không tìm thấy file của {id}"));
        }
    }
    let check = |id: &Value| -> Result<()> {
        if id.as_str().is_some_and(|id| sounds.contains_key(id)) {
            Ok(())
        } else {
            Err("Mapping tham chiếu Sound ID không tồn tại".into())
        }
    };
    check(&value["defaults"]["male"])?;
    check(&value["defaults"]["female"])?;
    for (id, skill) in skills {
        if id.parse::<u32>().is_err() {
            return Err("Skill ID không hợp lệ".into());
        }
        if skill.get("disabled").is_some_and(|value| !value.is_boolean()) {
            return Err("disabled phải là boolean".into());
        }
        for stage in ["cast", "release", "hit"] {
            if let Some(event) = skill.get(stage) {
                for (field, sound) in event
                    .as_object()
                    .ok_or("Trạng thái âm thanh phải là object")?
                {
                    if !["effect", "male", "female", "maleEffect", "femaleEffect"]
                        .contains(&field.as_str())
                    {
                        return Err("Trường âm thanh không được hỗ trợ".into());
                    }
                    if sound != "" {
                        check(sound)?;
                    }
                }
            }
        }
        if let Some(review) = skill.get("review") {
            for entry in review.as_array().ok_or("review phải là mảng")? {
                check(&entry["sound"])?;
            }
        }
        let mut seen = BTreeSet::new();
        let mut current = id.clone();
        loop {
            if !seen.insert(current.clone()) {
                return Err("Kế thừa skill tạo vòng lặp".into());
            }
            let item = skills.get(&current).ok_or("Skill kế thừa không tồn tại")?;
            let Some(parent) = item.get("inherit") else {
                break;
            };
            current = parent
                .as_u64()
                .ok_or("Skill kế thừa phải là ID số")?
                .to_string();
        }
    }
    writes.push((
        paths::config().sound_config.clone(),
        serde_json::to_vec_pretty(value)
            .map_err(|e| e.to_string())?
            .into_iter()
            .chain([b'\n'])
            .collect(),
    ));
    Ok(writes)
}
fn save(
    root: &Path,
    request: AudioRequest,
    build: impl FnOnce() -> Result<()>,
) -> Result<AudioSnapshot> {
    if snapshot(root)?.revision != request.expected_revision {
        return Err(
            "Âm thanh đã thay đổi bên ngoài tool. Tải lại trước khi lưu; bản nháp vẫn được giữ."
                .into(),
        );
    }
    let writes = validate(root, &request.config, &request.assets)?;
    if snapshot(root)?.revision != request.expected_revision {
        return Err("Âm thanh vừa thay đổi trong lúc kiểm tra".into());
    }
    transactions::commit(root, writes, build)?;
    snapshot(root)
}
#[tauri::command]
pub fn load_audio(state: State<'_, WorkspaceState>) -> Result<AudioSnapshot> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    let root = &guard.as_ref().ok_or("Chưa mở workspace")?.root;
    let result = snapshot(root)?;
    validate(root, &result.config, &[])?;
    Ok(result)
}
#[tauri::command]
pub fn read_audio_asset(
    id: String,
    kind: String,
    state: State<'_, WorkspaceState>,
) -> Result<Response> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    let root = &guard.as_ref().ok_or("Chưa mở workspace")?.root;
    let value = config(root)?;
    // Fixed catalogs only: callers cannot pass an arbitrary file path.
    let artwork = if kind == "faction" && ["shaolin", "tianwang", "tangmen", "wudu", "emei", "cuiyan", "gaibang", "tianren", "wudang", "kunlun"].contains(&id.as_str()) {
        Some(format!("{}/{}.webp", paths::config().faction_portrait_directory, id))
    } else if kind == "element" && ["kim", "moc", "thuy", "hoa", "tho"].contains(&id.as_str()) {
        Some(format!("{}/{}.svg", paths::config().element_icon_directory, id))
    } else { None };
    let src = if kind == "sound" {
        value["sounds"][&id]["src"].as_str()
    } else if kind == "icon" {
        value["skills"][&id]["icon"].as_str()
    } else {
        None
    }
    ;
    let target = if let Some(relative) = artwork { paths::inside(root, &relative)? }
        else { source_target(root, src.ok_or("Asset không có trong config")?)? };
    if fs::metadata(&target).map_err(|e| e.to_string())?.len()
        > paths::config().max_sound_bytes as u64
    {
        return Err("Asset vượt giới hạn dung lượng".into());
    }
    Ok(Response::new(fs::read(target).map_err(|e| e.to_string())?))
}
#[tauri::command]
pub async fn save_audio(
    request: AudioRequest,
    state: State<'_, WorkspaceState>,
) -> Result<AudioSnapshot> {
    let shared = state.0.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let guard = shared.lock().map_err(|e| e.to_string())?;
        let root = &guard.as_ref().ok_or("Chưa mở workspace")?.root;
        let result = save(root, request, || {
            node(root, &["tools/build-app.js"], None).map(|_| ())
        });
        if result.is_err() {
            let _ = node(root, &["tools/build-app.js"], None);
        }
        result
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    struct Fixture(std::path::PathBuf);
    impl Drop for Fixture {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }
    fn fixture() -> Fixture {
        static NEXT: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
        let root = std::env::temp_dir().join(format!(
            "audio-tool-{}-{}-{}",
            std::process::id(),
            NEXT.fetch_add(1, std::sync::atomic::Ordering::Relaxed),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let cfg = paths::config();
        fs::create_dir_all(root.join(&cfg.sound_directory)).unwrap();
        fs::create_dir_all(root.join(&cfg.sound_config).parent().unwrap()).unwrap();
        fs::write(
            root.join(&cfg.sound_directory).join("existing.wav"),
            b"RIFF1234WAVEexisting",
        )
        .unwrap();
        let relative = cfg
            .sound_directory
            .strip_prefix(&format!("{}/", cfg.public_root))
            .unwrap();
        let value = json!({"version":1,"defaults":{"male":"fx_existing","female":"fx_existing"},"sounds":{"fx_existing":{"name":"Existing","category":"effect","src":format!("{relative}/existing.wav")}},"skills":{"14":{"name":"Base","level":80,"faction":"shaolin","icon":"","cast":{"effect":"fx_existing"}},"1055":{"name":"Advanced","level":150,"faction":"shaolin","icon":"","inherit":14}}});
        fs::write(
            root.join(&cfg.sound_config),
            serde_json::to_vec_pretty(&value).unwrap(),
        )
        .unwrap();
        Fixture(root.canonicalize().unwrap())
    }
    fn request(root: &Path) -> AudioRequest {
        let snap = snapshot(root).unwrap();
        AudioRequest {
            config: snap.config,
            expected_revision: snap.revision,
            assets: Vec::new(),
        }
    }
    fn add_file(request: &mut AudioRequest) {
        let relative = paths::config()
            .sound_directory
            .strip_prefix(&format!("{}/", paths::config().public_root))
            .unwrap();
        request.config["sounds"]["fx_new"] =
            json!({"name":"New","category":"effect","src":format!("{relative}/new.wav")});
        request.config["skills"]["14"]["hit"] = json!({"effect":"fx_new"});
        request.assets.push(AudioAsset {
            file: "new.wav".into(),
            data: base64::engine::general_purpose::STANDARD.encode(b"RIFF1234WAVEnew"),
        });
    }
    #[test]
    fn import_mapping_and_revision_are_saved_together() {
        let f = fixture();
        let mut req = request(&f.0);
        let previous = req.expected_revision.clone();
        add_file(&mut req);
        let next = save(&f.0, req, || Ok(())).unwrap();
        assert_ne!(previous, next.revision);
        assert_eq!(next.config["skills"]["14"]["hit"]["effect"], "fx_new");
        assert!(
            f.0.join(&paths::config().sound_directory)
                .join("new.wav")
                .is_file()
        );
    }
    #[test]
    fn failed_build_rolls_back_config_and_imported_file() {
        let f = fixture();
        let mut req = request(&f.0);
        let before = fs::read(f.0.join(&paths::config().sound_config)).unwrap();
        add_file(&mut req);
        assert!(save(&f.0, req, || Err("build failed".into())).is_err());
        assert_eq!(
            fs::read(f.0.join(&paths::config().sound_config)).unwrap(),
            before
        );
        assert!(
            !f.0.join(&paths::config().sound_directory)
                .join("new.wav")
                .exists()
        );
    }
    #[test]
    fn external_audio_edits_and_unreferenced_collisions_are_not_overwritten() {
        let f = fixture();
        let req = request(&f.0);
        fs::write(
            f.0.join(&paths::config().sound_directory)
                .join("existing.wav"),
            b"changed",
        )
        .unwrap();
        assert!(
            save(&f.0, req, || Ok(()))
                .unwrap_err()
                .contains("bên ngoài")
        );
        let mut req = request(&f.0);
        add_file(&mut req);
        fs::write(
            f.0.join(&paths::config().sound_directory).join("new.wav"),
            b"occupied",
        )
        .unwrap();
        assert!(
            validate(&f.0, &req.config, &req.assets)
                .unwrap_err()
                .contains("đã tồn tại")
        );
    }
    #[test]
    fn rejects_traversal_invalid_content_unknown_ids_and_cycles() {
        let f = fixture();
        let mut req = request(&f.0);
        add_file(&mut req);
        req.assets[0].file = "../escape.wav".into();
        assert!(validate(&f.0, &req.config, &req.assets).is_err());
        req.assets[0].file = "new.wav".into();
        req.assets[0].data = base64::engine::general_purpose::STANDARD.encode(b"not audio");
        assert!(validate(&f.0, &req.config, &req.assets).is_err());
        let mut req = request(&f.0);
        req.config["skills"]["14"]["hit"] = json!({"effect":"missing"});
        assert!(validate(&f.0, &req.config, &[]).is_err());
        req.config["skills"]["14"]["hit"] = json!({});
        req.config["skills"]["14"]["inherit"] = json!(1055);
        assert!(
            validate(&f.0, &req.config, &[])
                .unwrap_err()
                .contains("vòng lặp")
        );
    }
    #[cfg(unix)]
    #[test]
    fn refuses_symlinked_audio() {
        let f = fixture();
        let src =
            f.0.join(&paths::config().sound_directory)
                .join("existing.wav");
        fs::remove_file(&src).unwrap();
        std::os::unix::fs::symlink("/etc/hosts", &src).unwrap();
        assert!(snapshot(&f.0).is_err());
    }
    #[test]
    fn validates_current_game_config_without_writing() {
        let repository = Path::new(env!("CARGO_MANIFEST_DIR"))
            .ancestors()
            .nth(3)
            .unwrap();
        let value = config(repository).unwrap();
        assert!(validate(repository, &value, &[]).is_ok());
    }
    #[test]
    fn disabling_and_reenabling_preserves_mapping_and_validates_boolean() {
        let f = fixture();
        let mut req = request(&f.0);
        let cast = req.config["skills"]["14"]["cast"].clone();
        req.config["skills"]["14"]["disabled"] = json!(true);
        let saved = save(&f.0, req, || Ok(())).unwrap();
        assert_eq!(saved.config["skills"]["14"]["disabled"], true);
        assert_eq!(saved.config["skills"]["14"]["cast"], cast);
        let mut req = request(&f.0);
        req.config["skills"]["14"]["disabled"] = json!(false);
        let saved = save(&f.0, req, || Ok(())).unwrap();
        assert_eq!(saved.config["skills"]["14"]["disabled"], false);
        assert_eq!(saved.config["skills"]["14"]["cast"], cast);
        let mut req = request(&f.0);
        req.config["skills"]["14"]["disabled"] = json!("false");
        assert!(validate(&f.0, &req.config, &[]).unwrap_err().contains("boolean"));
    }
}
