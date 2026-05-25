use axum::{
    extract::State,
    http::StatusCode,
    response::{Html, IntoResponse, Response},
    routing::get,
    Router,
};
use std::fs;
use std::path::PathBuf;
use tracing::warn;

use crate::api::app::AppState;

fn read_template(name: &str) -> Option<String> {
    // Try env override first, then common paths
    let base = std::env::var("TEMPLATES_DIR")
        .unwrap_or_else(|_| "src/api/templates".to_string());

    let path = PathBuf::from(&base).join(name);
    if path.exists() {
        return fs::read_to_string(path).ok();
    }

    // Also try relative to binary location
    let alt_paths = [
        format!("../src/api/templates/{}", name),
        format!("templates/{}", name),
    ];
    for p in &alt_paths {
        if let Ok(content) = fs::read_to_string(p) {
            return Some(content);
        }
    }

    warn!("Template '{}' not found", name);
    None
}

async fn index_page(_state: State<AppState>) -> Response {
    match read_template("index.html") {
        Some(html) => Html(html).into_response(),
        None => (
            StatusCode::NOT_FOUND,
            "index.html template not found",
        )
            .into_response(),
    }
}

async fn login_page(_state: State<AppState>) -> Response {
    match read_template("login.html") {
        Some(html) => Html(html).into_response(),
        None => (
            StatusCode::NOT_FOUND,
            "login.html template not found",
        )
            .into_response(),
    }
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(index_page))
        .route("/login", get(login_page))
}
