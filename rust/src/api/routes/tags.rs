use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{delete, get},
    Json, Router,
};

use crate::api::app::AppState;
use crate::api::auth::AuthUser;
use crate::api::db::{TagCreate, TagRow};

fn api_error(status: StatusCode, msg: &str) -> impl IntoResponse {
    (status, Json(serde_json::json!({"error": msg})))
}

/// GET / — list all tags
async fn list_tags(
    State(state): State<AppState>,
    _auth: AuthUser,
) -> impl IntoResponse {
    let tags: Result<Vec<TagRow>, _> =
        sqlx::query_as("SELECT * FROM tags ORDER BY name").fetch_all(&state.db).await;

    match tags {
        Ok(t) => Json(t).into_response(),
        Err(e) => api_error(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()).into_response(),
    }
}

/// POST / — create a tag
async fn create_tag(
    State(state): State<AppState>,
    _auth: AuthUser,
    Json(payload): Json<TagCreate>,
) -> impl IntoResponse {
    let existing: Option<(i64,)> = sqlx::query_as("SELECT id FROM tags WHERE name = ?")
        .bind(&payload.name)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(None);

    if existing.is_some() {
        return api_error(StatusCode::BAD_REQUEST, "Tag already exists").into_response();
    }

    let color = payload.color.as_deref().unwrap_or("#3B82F6");

    let result = sqlx::query(
        "INSERT INTO tags (name, color, description) VALUES (?, ?, ?)",
    )
    .bind(&payload.name)
    .bind(color)
    .bind(&payload.description)
    .execute(&state.db)
    .await;

    match result {
        Ok(res) => {
            let tag_id = res.last_insert_rowid();
            match sqlx::query_as::<_, TagRow>("SELECT * FROM tags WHERE id = ?")
                .bind(tag_id)
                .fetch_one(&state.db)
                .await
            {
                Ok(tag) => (StatusCode::CREATED, Json(tag)).into_response(),
                Err(e) => api_error(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string())
                    .into_response(),
            }
        }
        Err(e) => api_error(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()).into_response(),
    }
}

/// DELETE /:id — delete a tag
async fn delete_tag(
    State(state): State<AppState>,
    _auth: AuthUser,
    Path(tag_id): Path<i64>,
) -> impl IntoResponse {
    match sqlx::query("DELETE FROM tags WHERE id = ?")
        .bind(tag_id)
        .execute(&state.db)
        .await
    {
        Ok(res) if res.rows_affected() > 0 => {
            Json(serde_json::json!({"message": "Tag deleted"})).into_response()
        }
        Ok(_) => api_error(StatusCode::NOT_FOUND, "Tag not found").into_response(),
        Err(e) => api_error(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()).into_response(),
    }
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_tags).post(create_tag))
        .route("/:id", delete(delete_tag))
}
