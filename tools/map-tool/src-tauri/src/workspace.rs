use crate::image_assets::plan_assets;
use crate::transactions::{self, hash};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::{
    collections::BTreeMap,
    fs,
    io::Write,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::{Arc, Mutex},
};
use tauri::{State, ipc::Response};

type Result<T> = std::result::Result<T, String>;
#[derive(Default)]
pub struct WorkspaceState(pub Arc<Mutex<Option<Workspace>>>);
pub struct Workspace {
    root: PathBuf,
    monsters: Value,
    image_revisions: Mutex<BTreeMap<PathBuf, ImageRevision>>,
}
struct ImageRevision {
    size: u64,
    modified: std::time::SystemTime,
    created: Option<std::time::SystemTime>,
    hash: String,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    root: String,
    maps: Vec<Value>,
    projects: BTreeMap<String, Value>,
    encounters: Value,
    progression: Value,
    monsters: Value,
    revision: String,
}
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveRequest {
    document: Value,
    expected_revision: String,
    is_new: bool,
}
fn read_json(path: &Path) -> Result<Value> {
    serde_json::from_slice(&fs::read(path).map_err(|e| format!("{}: {e}", path.display()))?)
        .map_err(|e| format!("{}: {e}", path.display()))
}
fn node(root: &Path, args: &[&str], input: Option<&[u8]>) -> Result<Vec<u8>> {
    let mut candidates = vec![
        PathBuf::from("node"),
        PathBuf::from("/opt/homebrew/bin/node"),
        PathBuf::from("/usr/local/bin/node"),
    ];
    if let Some(home) = std::env::var_os("HOME") {
        if let Ok(entries) = fs::read_dir(PathBuf::from(home).join(".nvm/versions/node")) {
            let mut versions: Vec<_> = entries
                .flatten()
                .map(|entry| entry.path().join("bin/node"))
                .collect();
            versions.sort();
            versions.reverse();
            candidates.extend(versions);
        }
    }
    for executable in candidates {
        let spawned = Command::new(&executable)
            .args(args)
            .current_dir(root)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn();
        match spawned {
            Ok(mut child) => {
                if let Some(bytes) = input {
                    child
                        .stdin
                        .take()
                        .ok_or("Không mở được stdin")?
                        .write_all(bytes)
                        .map_err(|e| e.to_string())?;
                } else {
                    drop(child.stdin.take());
                }
                let output = child.wait_with_output().map_err(|e| e.to_string())?;
                if !output.status.success() {
                    return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
                }
                return Ok(output.stdout);
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => continue,
            Err(error) => return Err(error.to_string()),
        }
    }
    Err("Không tìm thấy Node.js. Cần Node >= 24 để validate và build game.".into())
}
fn discover(root: Option<String>) -> Result<PathBuf> {
    if let Some(root) = root {
        return check_root(PathBuf::from(root));
    }
    let candidates = [
        std::env::current_dir().ok(),
        Some(PathBuf::from(env!("CARGO_MANIFEST_DIR"))),
    ];
    for candidate in candidates.into_iter().flatten() {
        for parent in candidate.ancestors() {
            if parent.join("src/client/maps/content").is_dir()
                && parent.join("tools/build-app.js").is_file()
            {
                return check_root(parent.to_path_buf());
            }
        }
    }
    Err("Chọn thư mục repository Võ Lâm Idle để bắt đầu.".into())
}
fn check_root(root: PathBuf) -> Result<PathBuf> {
    let root = root.canonicalize().map_err(|e| e.to_string())?;
    if !root.join("src/client/maps/content").is_dir()
        || !root.join("tools/maps/editor-data.ts").is_file()
    {
        return Err("Đây không phải workspace game đã có map runtime/editor bridge.".into());
    }
    transactions::recover(&root)?;
    Ok(root)
}
fn snapshot(workspace: &Workspace) -> Result<Snapshot> {
    let mut folders: Vec<_> = fs::read_dir(workspace.root.join("src/client/maps/content"))
        .map_err(|e| e.to_string())?
        .flatten()
        .filter(|entry| entry.file_name().to_string_lossy().parse::<u32>().is_ok())
        .collect();
    folders.sort_by_key(|entry| {
        entry
            .file_name()
            .to_string_lossy()
            .parse::<u32>()
            .unwrap_or(0)
    });
    let mut maps = Vec::new();
    let mut projects = BTreeMap::new();
    let mut bytes = Vec::new();
    for entry in folders {
        let id = entry.file_name().to_string_lossy().to_string();
        for name in ["map.json", "project.json"] {
            let relative = format!("src/client/maps/content/{id}/{name}");
            let target = transactions::safe_target(&workspace.root, &relative)?;
            if target.exists() {
                let data = fs::read(target).map_err(|e| e.to_string())?;
                bytes.extend(relative.as_bytes());
                bytes.extend(&data);
                let value =
                    serde_json::from_slice(&data).map_err(|e| format!("{relative}: {e}"))?;
                track_image_revisions(workspace, &id, &value, &mut bytes)?;
                if name == "map.json" {
                    maps.push(value)
                } else {
                    projects.insert(id.clone(), value);
                }
            }
        }
    }
    let encounters = read_json(
        &workspace
            .root
            .join("src/client/gameplay/encounters/catalog.json"),
    )?;
    let progression = read_json(&workspace.root.join("src/client/maps/progression.json"))?;
    bytes.extend(serde_json::to_vec(&encounters).map_err(|e| e.to_string())?);
    bytes.extend(serde_json::to_vec(&progression).map_err(|e| e.to_string())?);
    Ok(Snapshot {
        root: workspace.root.to_string_lossy().into_owned(),
        maps,
        projects,
        encounters,
        progression,
        monsters: workspace.monsters.clone(),
        revision: hash(&bytes),
    })
}

// Content hashes also stay stable when a failed Save restores the same image bytes.
// Missing Test-map images participate, so importing/deleting them changes revision.
fn track_image_revisions(workspace: &Workspace, id: &str, value: &Value, bytes: &mut Vec<u8>) -> Result<()> {
    let mut images = Vec::new();
    if let Some(layers) = value["layers"].as_array() {
        for layer in layers {
            if let Some(image) = layer["image"].as_str() { images.push(image); }
            if let Some(objects) = layer["objects"].as_array() {
                for object in objects {
                    if let Some(image) = object["image"].as_str() { images.push(image); }
                }
            }
        }
    }
    if let Some(originals) = value["originalImages"].as_object() {
        images.extend(originals.values().filter_map(Value::as_str));
    }
    images.sort();
    images.dedup();
    for image in images {
        let local = image.strip_prefix("./").ok_or("Ảnh phải nằm trong map")?;
        let relative = format!("public/app/maps/content/{id}/{local}");
        let target = transactions::safe_target(&workspace.root, &relative)?;
        let mut cache = workspace.image_revisions.lock().map_err(|e| e.to_string())?;
        let stamp = match fs::metadata(&target) {
            Ok(meta) if meta.is_file() => {
                let modified = meta.modified().map_err(|e| e.to_string())?;
                let created = meta.created().ok();
                if !cache.get(&target).is_some_and(|entry| entry.size == meta.len() && entry.modified == modified && entry.created == created) {
                    let fingerprint = hash(&fs::read(&target).map_err(|e| e.to_string())?);
                    cache.insert(target.clone(), ImageRevision { size:meta.len(), modified, created, hash:fingerprint });
                }
                Some(cache[&target].hash.clone())
            }
            Ok(_) => return Err(format!("Ảnh không phải file: {relative}")),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => { cache.remove(&target); None }
            Err(error) => return Err(error.to_string()),
        };
        bytes.extend(serde_json::to_vec(&(relative, stamp)).map_err(|e| e.to_string())?);
    }
    Ok(())
}
#[tauri::command]
pub async fn open_workspace(
    root: Option<String>,
    state: State<'_, WorkspaceState>,
) -> Result<Snapshot> {
    let shared = state.0.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let root = discover(root)?;
        let monsters = serde_json::from_slice(&node(
            &root,
            &["tools/maps/editor-data.ts", "inspect"],
            None,
        )?)
        .map_err(|e| e.to_string())?;
        let workspace = Workspace { root, monsters, image_revisions:Mutex::default() };
        let result = snapshot(&workspace)?;
        *shared.lock().map_err(|e| e.to_string())? = Some(workspace);
        Ok(result)
    })
    .await
    .map_err(|e| e.to_string())?
}
#[tauri::command]
pub fn read_asset(path: String, state: State<'_, WorkspaceState>) -> Result<Response> {
    let guard = state.0.lock().map_err(|e| e.to_string())?;
    let workspace = guard.as_ref().ok_or("Chưa mở workspace")?;
    let target = asset_target(workspace, &path)?;
    Ok(Response::new(fs::read(target).map_err(|e| e.to_string())?))
}
fn asset_target(workspace: &Workspace, path: &str) -> Result<PathBuf> {
    let map_asset = path.starts_with("app/maps/content/");
    // Only idle sprites explicitly listed in the shared NPC catalog are readable.
    let npc_catalog = workspace.root.join("src/client/npcs/catalog.json");
    let npc_asset = path.starts_with("app/npcs/assets/") && fs::read(npc_catalog).ok()
        .and_then(|data| serde_json::from_slice::<Value>(&data).ok())
        .and_then(|catalog| catalog.as_array().map(|items| items.iter().any(|npc| npc["image"].as_str() == Some(path))))
        .unwrap_or(false);
    // Shared monster previews are explicitly catalogued; map images cannot use img/.
    let monster_asset = workspace.monsters.as_array().is_some_and(|monsters| {
        monsters
            .iter()
            .any(|monster| monster["image"].as_str() == Some(path))
    });
    if !transactions::image_path(&path) || (!map_asset && !monster_asset && !npc_asset) {
        return Err("Ảnh map phải nằm trong public/app/maps/content".into());
    }
    let relative = if npc_asset {
        format!("src/client/{}", &path[4..])
    } else {
        format!("public/{path}")
    };
    if map_asset { transactions::safe_target(&workspace.root, &relative)?; }
    let target = workspace
        .root
        .join(relative)
        .canonicalize()
        .map_err(|_| format!("Không tìm thấy ảnh: {path}"))?;
    let allowed_root = if npc_asset {
        workspace.root.join("src/client/npcs/assets")
    } else if map_asset {
        workspace.root.join("public/app/maps/content")
    } else {
        workspace.root.join("public")
    };
    let allowed_root = allowed_root.canonicalize().map_err(|e| e.to_string())?;
    if !target.starts_with(&allowed_root) {
        return Err("Ảnh nằm ngoài thư mục được phép".into());
    }
    if fs::metadata(&target).map_err(|e| e.to_string())?.len() > 50 * 1024 * 1024 {
        return Err("Ảnh vượt quá 50 MB".into());
    }
    Ok(target)
}

fn save(request: SaveRequest, workspace: &Workspace) -> Result<Snapshot> {
    if snapshot(workspace)?.revision != request.expected_revision {
        return Err("Workspace đã thay đổi bên ngoài tool. Hãy tải lại trước khi Save; bản đang sửa vẫn được giữ.".into());
    }
    let id = request.document["map"]["id"]
        .as_u64()
        .filter(|id| *id > 0 && *id <= u32::MAX as u64)
        .ok_or("Map ID không hợp lệ")?;
    let prefix = format!("src/client/maps/content/{id}");
    if request.is_new && workspace.root.join(format!("{prefix}/map.json")).exists() {
        return Err("Map ID đã tồn tại".into());
    }
    let (mut writes, removals, asset_paths) = plan_assets(&workspace.root, id, &request.document)?;
    let input =
        serde_json::to_vec(&json!({"document":request.document,"availableAssets":asset_paths}))
            .map_err(|e| e.to_string())?;
    node(
        &workspace.root,
        &["tools/maps/editor-data.ts", "validate"],
        Some(&input),
    )?;
    for (relative, key) in [
        (format!("{prefix}/map.json"), "map"),
        (format!("{prefix}/project.json"), "project"),
        (
            "src/client/gameplay/encounters/catalog.json".into(),
            "encounters",
        ),
        ("src/client/maps/progression.json".into(), "progression"),
    ] {
        let target = transactions::safe_target(&workspace.root, &relative)?;
        if target.exists() && read_json(&target)? == request.document[key] {
            continue;
        }
        let mut bytes =
            serde_json::to_vec_pretty(&request.document[key]).map_err(|e| e.to_string())?;
        bytes.push(b'\n');
        writes.push((relative, bytes));
    }
    // Recheck after validation so edits during the Node validation cannot be overwritten.
    if snapshot(workspace)?.revision != request.expected_revision {
        return Err("Workspace vừa thay đổi trong lúc validate. Hãy tải lại.".into());
    }
    let build = || node(&workspace.root, &["tools/build-app.js"], None).map(|_| ());
    let result = if removals.is_empty() {
        transactions::commit(&workspace.root, writes, build)
    } else {
        transactions::commit_changes(&workspace.root, writes, removals, build)
    };
    if let Err(error) = result {
        let _ = node(&workspace.root, &["tools/build-app.js"], None);
        return Err(format!(
            "Save không thành công, dữ liệu đã được rollback: {error}"
        ));
    }
    snapshot(workspace)
}
#[tauri::command]
pub async fn save_map(request: SaveRequest, state: State<'_, WorkspaceState>) -> Result<Snapshot> {
    let shared = state.0.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let guard = shared.lock().map_err(|e| e.to_string())?;
        save(request, guard.as_ref().ok_or("Chưa mở workspace")?)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod asset_tests {
    use super::*;
    #[test]
    fn reads_only_catalogued_npc_sheets_and_rejects_symlink_escape() {
        let root = std::env::temp_dir().join(format!("npc-assets-{}", std::process::id()));
        fs::create_dir_all(root.join("src/client/npcs/assets")).unwrap();
        fs::write(root.join("src/client/npcs/catalog.json"), br#"[{"image":"app/npcs/assets/horse.webp"}]"#).unwrap();
        fs::write(root.join("src/client/npcs/assets/horse.webp"), b"sprite").unwrap();
        fs::write(root.join("src/client/npcs/assets/unlisted.webp"), b"unlisted").unwrap();
        let workspace = Workspace { root: root.canonicalize().unwrap(), monsters: json!([]), image_revisions:Mutex::default() };
        assert!(asset_target(&workspace, "app/npcs/assets/horse.webp").is_ok());
        assert!(asset_target(&workspace, "app/npcs/assets/unlisted.webp").is_err());
        assert!(asset_target(&workspace, "app/npcs/assets/../catalog.json").is_err());
        #[cfg(unix)] {
            fs::write(root.join("outside.webp"), b"outside").unwrap();
            fs::remove_file(root.join("src/client/npcs/assets/horse.webp")).unwrap();
            std::os::unix::fs::symlink(root.join("outside.webp"), root.join("src/client/npcs/assets/horse.webp")).unwrap();
            assert!(asset_target(&workspace, "app/npcs/assets/horse.webp").is_err());
        }
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn reads_map_local_artwork_and_catalogued_monsters_only() {
        let root = std::env::temp_dir().join(format!("map-assets-{}", std::process::id()));
        fs::create_dir_all(root.join("public/app/maps/content/2/assets")).unwrap();
        fs::create_dir_all(root.join("public/img/z")).unwrap();
        fs::write(
            root.join("public/app/maps/content/2/assets/ground.jpg"),
            b"image",
        )
        .unwrap();
        fs::write(root.join("public/img/monster.png"), b"monster").unwrap();
        fs::write(root.join("public/img/z/2.jpg"), b"legacy").unwrap();
        let workspace = Workspace {
            root: root.canonicalize().unwrap(),
            monsters: json!([{ "image": "img/monster.png" }]),
            image_revisions:Mutex::default(),
        };
        assert!(asset_target(&workspace, "app/maps/content/2/assets/ground.jpg").is_ok());
        assert!(asset_target(&workspace, "img/monster.png").is_ok());
        assert!(asset_target(&workspace, "img/z/2.jpg").is_err());
        assert!(asset_target(&workspace, "app/maps/content/2/../../../../img/z/2.jpg").is_err());
        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(
                root.join("public/img/z/2.jpg"),
                root.join("public/app/maps/content/2/assets/outside.jpg"),
            )
            .unwrap();
            assert!(asset_target(&workspace, "app/maps/content/2/assets/outside.jpg").is_err());
        }
        fs::remove_dir_all(root).unwrap();
    }
}

#[cfg(test)]
mod save_integration_tests {
    use super::*;
    use base64::Engine;

    struct Fixture(Workspace);
    impl Drop for Fixture {
        fn drop(&mut self) { let _ = fs::remove_dir_all(&self.0.root); }
    }
    fn copy_tree(from: &Path, to: &Path) {
        fs::create_dir_all(to).unwrap();
        for entry in fs::read_dir(from).unwrap().map(|entry| entry.unwrap()) {
            let destination = to.join(entry.file_name());
            if entry.file_type().unwrap().is_dir() { copy_tree(&entry.path(), &destination); }
            else { fs::copy(entry.path(), destination).unwrap(); }
        }
    }
    fn fixture() -> Fixture {
        let repository = Path::new(env!("CARGO_MANIFEST_DIR")).ancestors().nth(3).unwrap();
        let root = std::env::temp_dir().join(format!("map-tool-integration-{}-{}", std::process::id(),
            std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_nanos()));
        for directory in ["src/client", "tools/maps", "tools/map-tool/src/lib"] {
            copy_tree(&repository.join(directory), &root.join(directory));
        }
        for file in ["tools/build-app.js", "tsconfig.json"] {
            fs::copy(repository.join(file), root.join(file)).unwrap();
        }
        #[cfg(unix)]
        std::os::unix::fs::symlink(repository.join("node_modules"), root.join("node_modules")).unwrap();
        #[cfg(windows)]
        std::os::windows::fs::symlink_dir(repository.join("node_modules"), root.join("node_modules")).unwrap();
        Fixture(Workspace { root: root.canonicalize().unwrap(), monsters: json!([]), image_revisions:Mutex::default() })
    }
    fn png() -> Vec<u8> {
        base64::engine::general_purpose::STANDARD.decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN2kAAAAASUVORK5CYII=").unwrap()
    }
    fn asset(path: &str, bytes: &[u8]) -> Value {
        json!({"path":path,"data":base64::engine::general_purpose::STANDARD.encode(bytes)})
    }
    fn document(workspace: &Workspace, id: u64) -> Value {
        let current = snapshot(workspace).unwrap();
        let mut encounters = current.encounters;
        let mut profile = encounters[0].clone();
        profile["id"] = json!(format!("map-{id}")); profile["mapId"] = json!(id);
        profile.as_object_mut().unwrap().remove("alternate");
        encounters.as_array_mut().unwrap().push(profile);
        let mut progression = current.progression;
        progression.as_array_mut().unwrap().push(json!({"mapId":id,"alternateMapIds":[]}));
        json!({"map":{"schemaVersion":1,"id":id,"name":"Integration map","status":"available",
            "size":{"width":256,"height":128},"entry":{"x":128,"y":64},
            "layers":[{"id":"ground","type":"ground","image":"./assets/default.png"},
                {"id":"world","type":"world","objects":[]}],"navigation":{"kind":"open"},"spawns":[]},
            "project":{"schemaVersion":1,"mapId":id,"paintedNavigation":{"kind":"open"},"colliders":{},
                "originalImages":{"ground":"./assets/default.png"}},"encounters":encounters,"progression":progression,
            "assets":[asset("./assets/default.png", &png())]})
    }
    fn request(document: &Value, current: &Snapshot, is_new: bool) -> SaveRequest {
        SaveRequest { document:document.clone(), expected_revision:current.revision.clone(), is_new }
    }

    #[test]
    fn opens_current_repository_with_public_images_without_writing() {
        let root = Path::new(env!("CARGO_MANIFEST_DIR")).ancestors().nth(3).unwrap().canonicalize().unwrap();
        let workspace = Workspace { root, monsters:json!([]), image_revisions:Mutex::default() };
        let current = snapshot(&workspace).unwrap();
        assert!(current.maps.iter().any(|map| map["id"] == 37));
        assert!(!current.revision.is_empty());
        assert!(asset_target(&workspace, "app/maps/content/2/assets/ground.jpg").is_ok());
    }

    #[test]
    fn native_save_create_clone_replace_rollback_and_reopen_use_public_artwork() {
        let fixture = fixture(); let workspace = &fixture.0;
        let id = 999995;
        let mut doc = document(workspace, id);
        let initial = snapshot(workspace).unwrap();
        let mut current = save(request(&doc, &initial, true), workspace).unwrap();
        assert!(workspace.root.join(format!("src/client/maps/content/{id}/map.json")).exists());
        assert!(!workspace.root.join(format!("src/client/maps/content/{id}/assets/default.png")).exists());
        let public = workspace.root.join(format!("public/app/maps/content/{id}/assets"));
        assert_eq!(fs::read(public.join("default.png")).unwrap(), png());
        assert!(asset_target(workspace, &format!("app/maps/content/{id}/assets/default.png")).is_ok());
        assert!(save(request(&doc, &current, true), workspace).err().unwrap().contains("đã tồn tại"));

        doc["map"]["layers"][0]["image"] = json!("./assets/ground.png");
        doc["map"]["layers"][1]["objects"] = json!([{"id":"tree","image":"./assets/tree.png",
            "position":{"x":80,"y":40},"anchor":{"x":1,"y":1},"scale":1,"depthOffsetY":0}]);
        doc["assets"] = json!([asset("./assets/ground.png", &png()), asset("./assets/tree.png", &png())]);
        current = save(request(&doc, &current, false), workspace).unwrap();
        assert_eq!(fs::read(public.join("default.png")).unwrap(), png());
        assert!(public.join("tree.png").exists());

        let mut clone = doc.clone(); let clone_id = 999996;
        clone["map"]["id"] = json!(clone_id); clone["map"]["status"] = json!("test");
        clone["project"]["mapId"] = json!(clone_id);
        clone["assets"] = json!([asset("./assets/default.png", &png()), asset("./assets/ground.png", &png()), asset("./assets/tree.png", &png())]);
        current = save(request(&clone, &current, true), workspace).unwrap();
        assert!(workspace.root.join(format!("public/app/maps/content/{clone_id}/assets/tree.png")).exists());
        assert_eq!(fs::read(public.join("tree.png")).unwrap(), png());

        doc["map"]["layers"][0]["image"] = json!("./assets/ground.webp");
        doc["map"]["layers"].as_array_mut().unwrap().pop(); // Existing world-layer deletion.
        doc["assets"] = json!([asset("./assets/ground.webp", b"RIFF1234WEBPnew")]);
        let build_path = workspace.root.join("tools/build-app.js");
        let build = fs::read(&build_path).unwrap();
        fs::write(&build_path, "throw new Error('integration build failure')").unwrap();
        let error = save(request(&doc, &current, false), workspace).err().unwrap();
        assert!(error.contains("rollback"), "{error}");
        assert!(public.join("ground.png").exists());
        assert!(!public.join("ground.webp").exists());
        assert_eq!(snapshot(workspace).unwrap().revision, current.revision, "rollback preserves the revision so Save can be retried");
        fs::write(build_path, build).unwrap();
        current = save(request(&doc, &current, false), workspace).unwrap();
        assert!(!public.join("ground.png").exists());
        assert!(public.join("ground.webp").exists());
        assert!(public.join("default.png").exists());
        assert!(public.join("tree.png").exists(), "historical object artwork is preserved");
        let reopened = Workspace { root:check_root(workspace.root.clone()).unwrap(), monsters:json!([]), image_revisions:Mutex::default() };
        assert_eq!(snapshot(&reopened).unwrap().revision, current.revision);
        let map = current.maps.iter().find(|map| map["id"] == id).unwrap();
        assert_eq!(map["layers"].as_array().unwrap().len(), 1);
        assert_eq!(map["layers"][0]["image"], "./assets/ground.webp");

        let mut changed = png(); changed[0] ^= 1;
        fs::write(public.join("default.png"), changed).unwrap();
        let error = save(request(&doc, &current, false), workspace).err().unwrap();
        assert!(error.contains("thay đổi bên ngoài"), "{error}");
        assert_eq!(fs::read(public.join("ground.webp")).unwrap(), b"RIFF1234WEBPnew");
    }
}
