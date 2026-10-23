use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    fs,
    io::Write,
    path::{Component, Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

type Result<T> = std::result::Result<T, String>;
pub fn hash(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}
pub fn allowed(path: &str) -> bool {
    if path.contains('\\')
        || Path::new(path)
            .components()
            .any(|p| !matches!(p, Component::Normal(_)))
    {
        return false;
    }
    if matches!(
        path,
        "src/client/gameplay/encounters/catalog.json" | "src/client/maps/progression.json"
    ) {
        return true;
    }
    let public_image = path.starts_with("public/app/maps/content/");
    let Some(rest) = path.strip_prefix("src/client/maps/content/")
        .or_else(|| path.strip_prefix("public/app/maps/content/")) else {
        return false;
    };
    let Some((id, file)) = rest.split_once('/') else {
        return false;
    };
    if id.parse::<u32>().ok().filter(|id| *id > 0).is_none() {
        return false;
    }
    // Accept old image journal paths so interrupted pre-migration saves can recover.
    if public_image { image_path(file) } else { matches!(file, "map.json" | "project.json") || image_path(file) }
}
pub fn image_path(path: &str) -> bool {
    let lower = path.to_ascii_lowercase();
    [".png", ".jpg", ".jpeg", ".webp"]
        .iter()
        .any(|extension| lower.ends_with(extension))
        && path
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b"_/.-".contains(&b))
        && path
            .split('/')
            .all(|part| !part.is_empty() && !part.starts_with('.'))
}
pub fn safe_target(root: &Path, relative: &str) -> Result<PathBuf> {
    if !allowed(relative) {
        return Err(format!("Đường dẫn ghi không được phép: {relative}"));
    }
    let target = root.join(relative);
    // A link to a sibling map is inside the workspace but still crosses ownership.
    let mut component_path = root.to_path_buf();
    for component in Path::new(relative).components() {
        component_path.push(component);
        if component_path.symlink_metadata().is_ok_and(|meta| meta.file_type().is_symlink()) {
            return Err("Không ghi qua symbolic link".into());
        }
    }
    let mut ancestor = target.as_path();
    while !ancestor.exists() {
        ancestor = ancestor.parent().ok_or("Đường dẫn không hợp lệ")?;
    }
    if !ancestor
        .canonicalize()
        .map_err(|e| e.to_string())?
        .starts_with(root)
    {
        return Err("Đường dẫn đi ra ngoài workspace".into());
    }
    if target
        .symlink_metadata()
        .is_ok_and(|meta| meta.file_type().is_symlink())
    {
        return Err("Không ghi qua symbolic link".into());
    }
    Ok(target)
}
fn durable_write(path: &Path, bytes: &[u8]) -> Result<()> {
    let mut file = fs::File::create(path).map_err(|e| e.to_string())?;
    file.write_all(bytes)
        .and_then(|_| file.sync_all())
        .map_err(|e| e.to_string())
}
#[derive(Serialize, Deserialize)]
struct Entry {
    path: String,
    old_hash: Option<String>,
    new_hash: Option<String>,
}
#[derive(Serialize, Deserialize)]
struct Journal {
    entries: Vec<Entry>,
}
fn rollback(root: &Path, directory: &Path, journal: &Journal) -> Result<()> {
    for (index, entry) in journal.entries.iter().enumerate().rev() {
        let target = safe_target(root, &entry.path)?;
        let current = fs::read(&target).ok().map(|bytes| hash(&bytes));
        if current == entry.old_hash {
            continue;
        }
        if current.as_deref() != entry.new_hash.as_deref() {
            return Err(format!(
                "File đã bị sửa ngoài tool; cần phục hồi thủ công: {}",
                entry.path
            ));
        }
        if entry.old_hash.is_some() {
            let bytes =
                fs::read(directory.join(format!("old-{index}"))).map_err(|e| e.to_string())?;
            let temporary = directory.join(format!("restore-{index}"));
            durable_write(&temporary, &bytes)?;
            fs::rename(temporary, target).map_err(|e| e.to_string())?;
        } else {
            fs::remove_file(target).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}
pub fn recover(root: &Path) -> Result<()> {
    let directory = root.join(".map-tool/transactions");
    if !directory.exists() {
        return Ok(());
    }
    for entry in fs::read_dir(directory).map_err(|e| e.to_string())? {
        let folder = entry.map_err(|e| e.to_string())?.path();
        if folder.is_symlink() || !folder.is_dir() {
            return Err("Thư mục transaction không hợp lệ".into());
        }
        let journal_path = folder.join("journal.json");
        if journal_path.exists() && !folder.join("committed").exists() {
            let journal: Journal =
                serde_json::from_slice(&fs::read(journal_path).map_err(|e| e.to_string())?)
                    .map_err(|e| e.to_string())?;
            rollback(root, &folder, &journal)?;
        }
        fs::remove_dir_all(folder).map_err(|e| e.to_string())?;
    }
    Ok(())
}
/// Backups + durable journal allow rollback on an error and recovery after an interrupted save.
pub fn commit(
    root: &Path,
    writes: Vec<(String, Vec<u8>)>,
    after_write: impl FnOnce() -> Result<()>,
) -> Result<()> {
    commit_changes(root, writes, Vec::new(), after_write)
}
pub fn commit_changes(
    root: &Path,
    writes: Vec<(String, Vec<u8>)>,
    removals: Vec<String>,
    after_write: impl FnOnce() -> Result<()>,
) -> Result<()> {
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_nanos();
    let directory = root.join(format!(
        ".map-tool/transactions/{}-{stamp}",
        std::process::id()
    ));
    fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
    let mut journal = Journal {
        entries: Vec::new(),
    };
    for (index, (relative, bytes)) in writes.iter().enumerate() {
        let target = safe_target(root, relative)?;
        let old = if target.exists() {
            Some(fs::read(&target).map_err(|e| e.to_string())?)
        } else {
            None
        };
        if let Some(data) = &old {
            durable_write(&directory.join(format!("old-{index}")), data)?;
        }
        durable_write(&directory.join(format!("new-{index}")), bytes)?;
        journal.entries.push(Entry {
            path: relative.clone(),
            old_hash: old.as_ref().map(|bytes| hash(bytes)),
            new_hash: Some(hash(bytes)),
        });
    }
    for relative in removals {
        if journal.entries.iter().any(|entry| entry.path == relative) {
            return Err(format!("Đường dẫn transaction bị trùng: {relative}"));
        }
        let target = safe_target(root, &relative)?;
        if !target.exists() {
            continue;
        }
        let old = fs::read(&target).map_err(|e| e.to_string())?;
        durable_write(
            &directory.join(format!("old-{}", journal.entries.len())),
            &old,
        )?;
        journal.entries.push(Entry {
            path: relative,
            old_hash: Some(hash(&old)),
            new_hash: None,
        });
    }
    durable_write(
        &directory.join("journal.json"),
        &serde_json::to_vec(&journal).map_err(|e| e.to_string())?,
    )?;
    let result = (|| {
        for (index, entry) in journal.entries.iter().enumerate() {
            let target = safe_target(root, &entry.path)?;
            fs::create_dir_all(target.parent().ok_or("Thiếu thư mục cha")?)
                .map_err(|e| e.to_string())?;
            if entry.new_hash.is_some() {
                fs::rename(directory.join(format!("new-{index}")), target)
                    .map_err(|e| e.to_string())?;
            } else {
                fs::remove_file(target).map_err(|e| e.to_string())?;
            }
        }
        after_write()?;
        durable_write(&directory.join("committed"), b"ok")?;
        Ok(())
    })();
    if let Err(error) = result {
        rollback(root, &directory, &journal)
            .map_err(|recovery| format!("{error}. Phục hồi chưa hoàn tất: {recovery}"))?;
        fs::remove_dir_all(directory).map_err(|e| e.to_string())?;
        return Err(error);
    }
    fs::remove_dir_all(directory).map_err(|e| e.to_string())?;
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    fn fixture() -> PathBuf {
        let path = std::env::temp_dir().join(format!(
            "vltk-map-save-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir_all(path.join("src/client/maps/content/2")).unwrap();
        path.canonicalize().unwrap()
    }
    #[test]
    fn denies_escaping_paths() {
        for path in [
            "../secret",
            "src/client/maps/content/2/../../secret.png",
            "/src/client/maps/content/2/map.json",
            "src/client/maps/content/0/map.json",
            "src/client/maps/content/2/.secret.png",
        ] {
            assert!(!allowed(path), "{path}");
        }
        assert!(allowed("public/app/maps/content/2/assets/tree.png"));
        assert!(!allowed("public/app/maps/content/2/map.json"));
        assert!(allowed("src/client/maps/content/2/assets/tree.png"));
    }
    #[test]
    fn rolls_back_all_files_after_build_failure() {
        let root = fixture();
        fs::write(root.join("src/client/maps/content/2/map.json"), b"old").unwrap();
        let result = commit(
            &root,
            vec![
                ("src/client/maps/content/2/map.json".into(), b"new".to_vec()),
                (
                    "src/client/maps/content/2/project.json".into(),
                    b"project".to_vec(),
                ),
            ],
            || Err("build failed".into()),
        );
        assert!(result.is_err());
        assert_eq!(
            fs::read(root.join("src/client/maps/content/2/map.json")).unwrap(),
            b"old"
        );
        assert!(!root.join("src/client/maps/content/2/project.json").exists());
        fs::remove_dir_all(root).unwrap();
    }
    #[test]
    fn commits_multiple_files() {
        let root = fixture();
        commit(
            &root,
            vec![("src/client/maps/content/2/map.json".into(), b"new".to_vec())],
            || Ok(()),
        )
        .unwrap();
        assert_eq!(
            fs::read(root.join("src/client/maps/content/2/map.json")).unwrap(),
            b"new"
        );
        recover(&root).unwrap();
        fs::remove_dir_all(root).unwrap();
    }
}

#[cfg(test)]
mod recovery_tests {
    use super::*;
    fn fixture() -> PathBuf {
        let root = std::env::temp_dir().join(format!(
            "map-tool-recovery-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir_all(root.join("src/client/maps/content/2")).unwrap();
        root.canonicalize().unwrap()
    }
    #[test]
    fn recovers_interrupted_save_and_preserves_external_edits() {
        let root = fixture();
        let folder = root.join(".map-tool/transactions/interrupted");
        fs::create_dir_all(&folder).unwrap();
        let target = root.join("src/client/maps/content/2/map.json");
        fs::write(&target, b"new").unwrap();
        fs::write(folder.join("old-0"), b"old").unwrap();
        let journal = Journal {
            entries: vec![Entry {
                path: "src/client/maps/content/2/map.json".into(),
                old_hash: Some(hash(b"old")),
                new_hash: Some(hash(b"new")),
            }],
        };
        fs::write(
            folder.join("journal.json"),
            serde_json::to_vec(&journal).unwrap(),
        )
        .unwrap();
        recover(&root).unwrap();
        assert_eq!(fs::read(&target).unwrap(), b"old");
        assert!(!folder.exists());
        fs::create_dir_all(&folder).unwrap();
        fs::write(folder.join("old-0"), b"old").unwrap();
        fs::write(
            folder.join("journal.json"),
            serde_json::to_vec(&journal).unwrap(),
        )
        .unwrap();
        fs::write(&target, b"external").unwrap();
        assert!(recover(&root).is_err());
        assert_eq!(fs::read(&target).unwrap(), b"external");
        assert!(folder.exists());
        fs::remove_dir_all(root).unwrap();
    }
    #[cfg(unix)]
    #[test]
    fn rejects_writing_through_asset_symlinks() {
        let root = fixture();
        let outside = fixture();
        std::os::unix::fs::symlink(&outside, root.join("src/client/maps/content/2/assets"))
            .unwrap();
        assert!(safe_target(&root, "src/client/maps/content/2/assets/tree.png").is_err());
        fs::remove_file(root.join("src/client/maps/content/2/assets")).unwrap();
        fs::create_dir_all(root.join("public/app/maps/content/3/assets")).unwrap();
        fs::create_dir_all(root.join("public/app/maps/content/2")).unwrap();
        std::os::unix::fs::symlink(root.join("public/app/maps/content/3/assets"), root.join("public/app/maps/content/2/assets")).unwrap();
        assert!(safe_target(&root, "public/app/maps/content/2/assets/tree.png").is_err(), "links into another map inside the same workspace must also be rejected");
        fs::remove_dir_all(root).unwrap();
        fs::remove_dir_all(outside).unwrap();
    }
}

#[cfg(test)]
mod removal_recovery_tests {
    use super::*;
    #[test]
    fn restores_deleted_image_after_interrupted_transaction() {
        let root = std::env::temp_dir().join(format!(
            "map-delete-recover-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        let directory = root.join(".map-tool/transactions/interrupted");
        fs::create_dir_all(&directory).unwrap();
        fs::create_dir_all(root.join("src/client/maps/content/2/assets")).unwrap();
        fs::write(directory.join("old-0"), b"old-image").unwrap();
        let journal = Journal {
            entries: vec![Entry {
                path: "src/client/maps/content/2/assets/ground.png".into(),
                old_hash: Some(hash(b"old-image")),
                new_hash: None,
            }],
        };
        fs::write(
            directory.join("journal.json"),
            serde_json::to_vec(&journal).unwrap(),
        )
        .unwrap();
        recover(&root.canonicalize().unwrap()).unwrap();
        assert_eq!(
            fs::read(root.join("src/client/maps/content/2/assets/ground.png")).unwrap(),
            b"old-image"
        );
        fs::remove_dir_all(root).unwrap();
    }
}
