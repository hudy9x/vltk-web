use crate::transactions;
use base64::Engine;
use serde_json::Value;
#[cfg(test)]
use serde_json::json;
#[cfg(test)]
use std::path::PathBuf;
use std::{collections::BTreeMap, fs, path::Path};

type Result<T> = std::result::Result<T, String>;
fn read_json(path: &Path) -> Result<Value> {
    serde_json::from_slice(&fs::read(path).map_err(|e| e.to_string())?).map_err(|e| e.to_string())
}
fn image_refs(map: &Value) -> Vec<String> {
    let mut paths = Vec::new();
    if let Some(layers) = map["layers"].as_array() {
        for layer in layers {
            if let Some(image) = layer["image"].as_str() {
                paths.push(image.to_owned());
            }
            if let Some(objects) = layer["objects"].as_array() {
                for object in objects {
                    if let Some(image) = object["image"].as_str() {
                        paths.push(image.to_owned());
                    }
                }
            }
        }
    }
    paths
}
fn image_stem(layer: &Value) -> String {
    if layer["type"] == "ground" {
        return "ground".into();
    }
    let hex: String = layer["id"]
        .as_str()
        .unwrap_or("")
        .bytes()
        .map(|byte| format!("{byte:02x}"))
        .collect();
    format!("layer-{hex}")
}
fn image_bytes_valid(bytes: &[u8]) -> bool {
    bytes.len() <= 50 * 1024 * 1024
        && (bytes.starts_with(b"\x89PNG\r\n\x1a\n")
            || bytes.starts_with(b"\xff\xd8")
            || (bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP")))
}
/// Only managed layer slots may be overwritten. Originals remain immutable.
pub(crate) fn plan_assets(
    root: &Path,
    id: u64,
    document: &Value,
) -> Result<(Vec<(String, Vec<u8>)>, Vec<String>, Vec<String>)> {
    let prefix = format!("app/maps/content/{id}");
    let old_map_path = root.join(format!("{prefix}/map.json"));
    let old_project_path = root.join(format!("{prefix}/project.json"));
    let old_map = if old_map_path.exists() {
        read_json(&old_map_path)?
    } else {
        Value::Null
    };
    let old_project = if old_project_path.exists() {
        read_json(&old_project_path)?
    } else {
        Value::Null
    };
    let mut payloads = BTreeMap::new();
    if let Some(assets) = document["assets"].as_array() {
        for asset in assets {
            let relative = asset["path"].as_str().ok_or("Thiếu đường dẫn asset")?;
            let local = relative
                .strip_prefix("./")
                .ok_or("Asset phải nằm trong map")?;
            transactions::safe_target(root, &format!("{prefix}/{local}"))?;
            let bytes = base64::engine::general_purpose::STANDARD
                .decode(asset["data"].as_str().ok_or("Thiếu dữ liệu ảnh")?)
                .map_err(|e| e.to_string())?;
            if !image_bytes_valid(&bytes) {
                return Err("Asset không phải PNG/JPEG/WebP hợp lệ hoặc vượt quá 50 MB".into());
            }
            if payloads.insert(relative.to_owned(), bytes).is_some() {
                return Err(format!("Asset bị trùng: {relative}"));
            }
        }
    }
    let mut refs = image_refs(&document["map"]);
    if let Some(originals) = document["project"]["originalImages"].as_object() {
        for path in originals.values() {
            refs.push(path.as_str().ok_or("Ảnh gốc không hợp lệ")?.to_owned());
        }
    }
    let mut mutable = Vec::new();
    let mut removals = Vec::new();
    if let Some(layers) = document["map"]["layers"].as_array() {
        for layer in layers {
            let Some(layer_id) = layer["id"].as_str() else {
                continue;
            };
            let Some(current) = layer["image"].as_str() else {
                continue;
            };
            let old_original = old_project["originalImages"][layer_id].as_str();
            let original = document["project"]["originalImages"][layer_id].as_str();
            if let Some(previous) = old_original {
                if original != Some(previous) {
                    return Err("Không được thay đổi ảnh gốc đã lưu".into());
                }
            }
            let Some(original) = original else {
                continue;
            };
            let stem = image_stem(layer);
            let original_stem = if layer["type"] == "ground" {
                "default".to_owned()
            } else {
                format!("{stem}-default")
            };
            if !["png", "jpg", "jpeg", "webp"]
                .iter()
                .any(|ext| original == format!("./assets/{original_stem}.{ext}"))
            {
                return Err("Tên ảnh gốc không hợp lệ".into());
            }
            let original_target =
                transactions::safe_target(root, &format!("{prefix}/{}", &original[2..]))?;
            if !original_target.exists() && !payloads.contains_key(original) {
                return Err("Thiếu ảnh gốc".into());
            }
            if old_original.is_none() {
                if let Some(previous) = old_map["layers"]
                    .as_array()
                    .and_then(|layers| layers.iter().find(|item| item["id"] == layer_id))
                    .and_then(|layer| layer["image"].as_str())
                {
                    let previous_path = previous
                        .strip_prefix("./")
                        .ok_or("Ảnh gốc phải nằm trong map")?;
                    let previous_target =
                        transactions::safe_target(root, &format!("{prefix}/{previous_path}"))?;
                    if previous_target.exists() {
                        let original_bytes = payloads
                            .get(original)
                            .cloned()
                            .or_else(|| fs::read(&original_target).ok())
                            .ok_or("Thiếu dữ liệu ảnh gốc")?;
                        if fs::read(&previous_target).map_err(|e| e.to_string())? != original_bytes
                        {
                            return Err("Ảnh gốc phải giữ nguyên dữ liệu trước khi thay ảnh".into());
                        }
                        if !refs.iter().any(|path| path == previous) {
                            removals.push(format!("{prefix}/{previous_path}"));
                        }
                    }
                }
            }
            for ext in ["png", "jpg", "jpeg", "webp"] {
                let path = format!("./assets/{stem}.{ext}");
                if current == path {
                    if refs.iter().filter(|reference| **reference == path).count() == 1 {
                        mutable.push(path.clone());
                    }
                } else if !refs.contains(&path) {
                    removals.push(format!("{prefix}/{}", &path[2..]));
                }
            }
        }
    }
    let mut writes = Vec::new();
    let mut available = Vec::new();
    for (relative, bytes) in payloads {
        if !refs.contains(&relative) {
            continue;
        }
        let path = format!("{prefix}/{}", &relative[2..]);
        let target = transactions::safe_target(root, &path)?;
        if target.exists()
            && fs::read(&target).map_err(|e| e.to_string())? != bytes
            && !mutable.contains(&relative)
        {
            return Err(format!("Không được ghi đè ảnh gốc hoặc object: {relative}"));
        }
        available.push(path.clone());
        writes.push((path, bytes));
    }
    removals.sort();
    removals.dedup();
    removals.retain(|path| !writes.iter().any(|(write, _)| write == path));
    Ok((writes, removals, available))
}

#[cfg(test)]
mod managed_image_tests {
    use super::*;
    fn fixture() -> PathBuf {
        static SERIAL: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
        let serial = SERIAL.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        let root = std::env::temp_dir().join(format!(
            "map-image-policy-{}-{serial}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir_all(root.join("app/maps/content/2/assets")).unwrap();
        root.canonicalize().unwrap()
    }
    fn asset(path: &str, bytes: &[u8]) -> Value {
        json!({"path":path,"data":base64::engine::general_purpose::STANDARD.encode(bytes)})
    }
    fn doc(current: &str, original: &str, assets: Vec<Value>) -> Value {
        json!({"map":{"id":2,"layers":[{"id":"ground","type":"ground","image":current}]},
            "project":{"originalImages":{"ground":original}},"assets":assets})
    }
    fn apply(root: &Path, document: &Value, fail: bool) -> Result<()> {
        let (mut writes, removals, _) = plan_assets(root, 2, document)?;
        for key in ["map", "project"] {
            writes.push((
                format!("app/maps/content/2/{key}.json"),
                serde_json::to_vec(&document[key]).unwrap(),
            ));
        }
        transactions::commit_changes(root, writes, removals, || {
            if fail {
                Err("build failed".into())
            } else {
                Ok(())
            }
        })
    }
    #[test]
    fn archives_once_overwrites_current_and_removes_previous_extension_atomically() {
        let root = fixture();
        let folder = root.join("app/maps/content/2/assets");
        let jpg = b"\xff\xd8original";
        let png1 = b"\x89PNG\r\n\x1a\nfirst";
        let png2 = b"\x89PNG\r\n\x1a\nsecond";
        let webp = b"RIFF1234WEBPthird";
        fs::write(folder.join("legacy.jpg"), jpg).unwrap();
        fs::write(
            root.join("app/maps/content/2/map.json"),
            serde_json::to_vec(
                &json!({"layers":[{"id":"ground","type":"ground","image":"./assets/legacy.jpg"}]}),
            )
            .unwrap(),
        )
        .unwrap();
        let first = doc(
            "./assets/ground.png",
            "./assets/default.jpg",
            vec![
                asset("./assets/default.jpg", jpg),
                asset("./assets/ground.png", png1),
            ],
        );
        assert!(apply(&root, &first, true).is_err());
        assert_eq!(fs::read(folder.join("legacy.jpg")).unwrap(), jpg);
        assert!(!folder.join("default.jpg").exists());
        apply(&root, &first, false).unwrap();
        assert!(!folder.join("legacy.jpg").exists());
        assert_eq!(fs::read_dir(&folder).unwrap().count(), 2);
        let second = doc(
            "./assets/ground.png",
            "./assets/default.jpg",
            vec![asset("./assets/ground.png", png2)],
        );
        apply(&root, &second, false).unwrap();
        assert_eq!(fs::read(folder.join("ground.png")).unwrap(), png2);
        assert_eq!(fs::read(folder.join("default.jpg")).unwrap(), jpg);
        let third = doc(
            "./assets/ground.webp",
            "./assets/default.jpg",
            vec![asset("./assets/ground.webp", webp)],
        );
        assert!(apply(&root, &third, true).is_err());
        assert_eq!(fs::read(folder.join("ground.png")).unwrap(), png2);
        assert!(!folder.join("ground.webp").exists());
        apply(&root, &third, false).unwrap();
        assert_eq!(fs::read_dir(&folder).unwrap().count(), 2);
        assert!(!folder.join("ground.png").exists());
        assert_eq!(fs::read(folder.join("ground.webp")).unwrap(), webp);
        let bad = doc(
            "./assets/default.jpg",
            "./assets/default.jpg",
            vec![asset("./assets/default.jpg", b"\xff\xd8bad")],
        );
        assert!(plan_assets(&root, 2, &bad).is_err());
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn new_map_and_cloned_map_keep_original_and_current_bytes_separate() {
        let root = fixture();
        let original = b"\xff\xd8default";
        let current = b"\x89PNG\r\n\x1a\ncurrent";
        let clone = doc(
            "./assets/ground.png",
            "./assets/default.jpg",
            vec![
                asset("./assets/default.jpg", original),
                asset("./assets/ground.png", current),
            ],
        );
        apply(&root, &clone, false).unwrap();
        let unchanged = doc("./assets/ground.png", "./assets/default.jpg", vec![]);
        assert!(plan_assets(&root, 2, &unchanged).is_ok());
        let modified_original = doc(
            "./assets/ground.png",
            "./assets/default.png",
            vec![asset("./assets/default.png", current)],
        );
        assert!(plan_assets(&root, 2, &modified_original).is_err());
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn refuses_to_overwrite_an_image_shared_with_an_object() {
        let root = fixture();
        let original = b"\xff\xd8default";
        let first = b"\x89PNG\r\n\x1a\nfirst";
        let current = b"\x89PNG\r\n\x1a\nchanged";
        let initial = doc(
            "./assets/ground.png",
            "./assets/default.jpg",
            vec![
                asset("./assets/default.jpg", original),
                asset("./assets/ground.png", first),
            ],
        );
        apply(&root, &initial, false).unwrap();
        let mut shared = doc(
            "./assets/ground.png",
            "./assets/default.jpg",
            vec![asset("./assets/ground.png", current)],
        );
        shared["map"]["layers"]
            .as_array_mut()
            .unwrap()
            .push(json!({"id":"world","type":"world","objects":[{"image":"./assets/ground.png"}]}));
        assert!(plan_assets(&root, 2, &shared).is_err());
        assert_eq!(
            fs::read(root.join("app/maps/content/2/assets/ground.png")).unwrap(),
            first
        );
        fs::remove_dir_all(root).unwrap();
    }
}
