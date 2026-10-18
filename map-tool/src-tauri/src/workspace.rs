use crate::transactions::{self, hash};
use base64::Engine;
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
            if parent.join("app/maps/content").is_dir()
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
    if !root.join("app/maps/content").is_dir() || !root.join("tools/maps/editor-data.ts").is_file()
    {
        return Err("Đây không phải workspace game đã có map runtime/editor bridge.".into());
    }
    transactions::recover(&root)?;
    Ok(root)
}
fn snapshot(workspace: &Workspace) -> Result<Snapshot> {
    let mut folders: Vec<_> = fs::read_dir(workspace.root.join("app/maps/content"))
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
            let relative = format!("app/maps/content/{id}/{name}");
            let target = transactions::safe_target(&workspace.root, &relative)?;
            if target.exists() {
                let data = fs::read(target).map_err(|e| e.to_string())?;
                bytes.extend(relative.as_bytes());
                bytes.extend(&data);
                let value =
                    serde_json::from_slice(&data).map_err(|e| format!("{relative}: {e}"))?;
                if name == "map.json" {
                    maps.push(value)
                } else {
                    projects.insert(id.clone(), value);
                }
            }
        }
    }
    let encounters = read_json(&workspace.root.join("app/gameplay/encounters/catalog.json"))?;
    let progression = read_json(&workspace.root.join("app/maps/progression.json"))?;
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
        let workspace = Workspace { root, monsters };
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
    // Shared monster previews are explicitly catalogued; map images cannot use img/.
    let monster_asset = workspace.monsters.as_array().is_some_and(|monsters| {
        monsters
            .iter()
            .any(|monster| monster["image"].as_str() == Some(path))
    });
    if !transactions::image_path(&path) || (!map_asset && !monster_asset) {
        return Err("Ảnh map phải nằm trong app/maps/content".into());
    }
    let target = workspace
        .root
        .join(path)
        .canonicalize()
        .map_err(|_| format!("Không tìm thấy ảnh: {path}"))?;
    let allowed_root = if map_asset {
        workspace.root.join("app/maps/content")
    } else {
        workspace.root.clone()
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
    let prefix = format!("app/maps/content/{id}");
    if request.is_new && workspace.root.join(format!("{prefix}/map.json")).exists() {
        return Err("Map ID đã tồn tại".into());
    }
    let mut writes = Vec::new();
    let mut asset_paths = Vec::new();
    if let Some(assets) = request.document["assets"].as_array() {
        for asset in assets {
            let relative = asset["path"].as_str().ok_or("Thiếu đường dẫn asset")?;
            let path = format!(
                "{prefix}/{}",
                relative
                    .strip_prefix("./")
                    .ok_or("Asset mới phải nằm trong map")?
            );
            let target = transactions::safe_target(&workspace.root, &path)?;
            if target.exists() || asset_paths.contains(&path) {
                return Err(format!("Asset đã tồn tại: {relative}"));
            }
            let bytes = base64::engine::general_purpose::STANDARD
                .decode(asset["data"].as_str().ok_or("Thiếu dữ liệu ảnh")?)
                .map_err(|e| e.to_string())?;
            if bytes.len() > 50 * 1024 * 1024
                || !(bytes.starts_with(b"\x89PNG\r\n\x1a\n")
                    || bytes.starts_with(b"\xff\xd8")
                    || (bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP")))
            {
                return Err("Asset không phải PNG/JPEG/WebP hợp lệ hoặc vượt quá 50 MB".into());
            }
            asset_paths.push(path.clone());
            writes.push((path, bytes));
        }
    }
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
        ("app/gameplay/encounters/catalog.json".into(), "encounters"),
        ("app/maps/progression.json".into(), "progression"),
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
    let result = transactions::commit(&workspace.root, writes, || {
        node(&workspace.root, &["tools/build-app.js"], None).map(|_| ())
    });
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
    fn reads_map_local_artwork_and_catalogued_monsters_only() {
        let root = std::env::temp_dir().join(format!("map-assets-{}", std::process::id()));
        fs::create_dir_all(root.join("app/maps/content/2/assets")).unwrap();
        fs::create_dir_all(root.join("img/z")).unwrap();
        fs::write(root.join("app/maps/content/2/assets/ground.jpg"), b"image").unwrap();
        fs::write(root.join("img/monster.png"), b"monster").unwrap();
        fs::write(root.join("img/z/2.jpg"), b"legacy").unwrap();
        let workspace = Workspace {
            root: root.canonicalize().unwrap(),
            monsters: json!([{ "image": "img/monster.png" }]),
        };
        assert!(asset_target(&workspace, "app/maps/content/2/assets/ground.jpg").is_ok());
        assert!(asset_target(&workspace, "img/monster.png").is_ok());
        assert!(asset_target(&workspace, "img/z/2.jpg").is_err());
        assert!(asset_target(&workspace, "app/maps/content/2/../../../../img/z/2.jpg").is_err());
        #[cfg(unix)]
        {
            std::os::unix::fs::symlink(
                root.join("img/z/2.jpg"),
                root.join("app/maps/content/2/assets/outside.jpg"),
            )
            .unwrap();
            assert!(asset_target(&workspace, "app/maps/content/2/assets/outside.jpg").is_err());
        }
        fs::remove_dir_all(root).unwrap();
    }
}
