mod image_assets;
mod paths;
mod audio;
mod transactions;
mod workspace;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(workspace::WorkspaceState::default())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            workspace::open_workspace,
            workspace::read_asset,
            workspace::save_map,
            audio::load_audio,
            audio::read_audio_asset,
            audio::save_audio
        ])
        .run(tauri::generate_context!())
        .expect("error while running map editor");
}
