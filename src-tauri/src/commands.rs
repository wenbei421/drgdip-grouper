use std::path::PathBuf;

use tauri::{AppHandle, Manager, State};

use crate::db::AppState;
use crate::error::AppError;
use crate::import_drg::{
    fetch_rule_pack as fetch_rule_pack_inner, import_drg_xlsx, load_active_summary, RulePackDto,
    RuleVersionSummary,
};

#[tauri::command]
pub async fn get_active_rule_summary(
    state: State<'_, AppState>,
) -> Result<Option<RuleVersionSummary>, AppError> {
    load_active_summary(&state.pool).await
}

#[tauri::command]
pub async fn seed_bundled_rules_if_empty(
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<RuleVersionSummary, AppError> {
    if let Some(summary) = load_active_summary(&state.pool).await? {
        return Ok(summary);
    }

    let resource_dir = app
        .path()
        .resource_dir()
        .map_err(|e| AppError::Message(e.to_string()))?;

    let path = resource_dir
        .join("resources")
        .join("rules")
        .join("chs-drg-3.0.xlsx");

    if !path.exists() {
        return Err(AppError::Message(format!(
            "内置规则文件不存在: {}",
            path.display()
        )));
    }

    import_drg_xlsx(&path, &state.pool).await
}

#[tauri::command]
pub async fn import_rules_from_path(
    path: String,
    state: State<'_, AppState>,
) -> Result<RuleVersionSummary, AppError> {
    let path = PathBuf::from(path);
    if !path.exists() {
        return Err(AppError::Message(format!(
            "规则文件不存在: {}",
            path.display()
        )));
    }
    import_drg_xlsx(&path, &state.pool).await
}

#[tauri::command]
pub async fn fetch_rule_pack(state: State<'_, AppState>) -> Result<RulePackDto, AppError> {
    fetch_rule_pack_inner(&state.pool).await
}
