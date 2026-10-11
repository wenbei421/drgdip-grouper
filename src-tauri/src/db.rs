use std::path::Path;

use sqlx::{
    sqlite::{SqliteConnectOptions, SqlitePoolOptions},
    Pool, Sqlite,
};
use tauri::{AppHandle, Manager};

use crate::error::AppError;

pub struct AppState {
    pub pool: Pool<Sqlite>,
}

pub async fn init_pool(app: &AppHandle) -> Result<Pool<Sqlite>, AppError> {
    let app_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Message(e.to_string()))?;

    std::fs::create_dir_all(&app_dir)?;
    let db_path = app_dir.join("rules.db");
    init_pool_at(&db_path).await
}

pub async fn init_pool_at(db_path: &Path) -> Result<Pool<Sqlite>, AppError> {
    if let Some(parent) = db_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let options = SqliteConnectOptions::new()
        .filename(db_path)
        .create_if_missing(true);

    let pool = SqlitePoolOptions::new().connect_with(options).await?;
    sqlx::migrate!("./migrations").run(&pool).await?;
    Ok(pool)
}
