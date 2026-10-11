mod commands;
mod db;
mod error;
mod import_drg;

use db::{init_pool, AppState};
use tauri::Manager;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let pool = tauri::async_runtime::block_on(init_pool(app.handle()))?;
            app.manage(AppState { pool });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::get_active_rule_summary,
            commands::seed_bundled_rules_if_empty,
            commands::import_rules_from_path,
            commands::fetch_rule_pack
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
