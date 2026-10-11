use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error(transparent)]
    Sqlx(#[from] sqlx::Error),

    #[error(transparent)]
    Migrate(#[from] sqlx::migrate::MigrateError),

    #[error(transparent)]
    Io(#[from] std::io::Error),

    #[error("excel: {0}")]
    Excel(String),

    #[error("{0}")]
    Message(String),
}

impl From<calamine::Error> for AppError {
    fn from(value: calamine::Error) -> Self {
        AppError::Excel(value.to_string())
    }
}

impl From<calamine::XlsxError> for AppError {
    fn from(value: calamine::XlsxError) -> Self {
        AppError::Excel(value.to_string())
    }
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
