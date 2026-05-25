use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, put},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tracing::error;

use crate::api::app::AppState;
use crate::api::auth::AdminUser;
use crate::api::db::{UserCreate, UserRow, UserUpdate};

fn err(status: StatusCode, msg: &str) -> impl IntoResponse {
    (status, Json(json!({"error": msg})))
}

#[derive(Deserialize)]
pub struct PaginationQuery {
    #[serde(default)]
    skip: i64,
    #[serde(default = "default_limit")]
    limit: i64,
}
fn default_limit() -> i64 { 100 }

#[derive(Serialize)]
struct UserResponse {
    id: i64,
    email: String,
    role: String,
    is_active: bool,
    firebase_uid: Option<String>,
    created_at: String,
}

impl From<UserRow> for UserResponse {
    fn from(u: UserRow) -> Self {
        UserResponse {
            id: u.id,
            email: u.email,
            role: u.role,
            is_active: u.is_active,
            firebase_uid: u.firebase_uid,
            created_at: u.created_at,
        }
    }
}

/// GET /users — list users (admin only)
async fn list_users(
    State(state): State<AppState>,
    Query(params): Query<PaginationQuery>,
    _admin: AdminUser,
) -> impl IntoResponse {
    match sqlx::query_as::<_, UserRow>(
        "SELECT id, firebase_uid, email, role, is_active, created_at FROM users ORDER BY id LIMIT ? OFFSET ?",
    )
    .bind(params.limit)
    .bind(params.skip)
    .fetch_all(&state.db)
    .await
    {
        Ok(users) => {
            let resp: Vec<UserResponse> = users.into_iter().map(Into::into).collect();
            Json(resp).into_response()
        }
        Err(e) => {
            error!("Failed to list users: {}", e);
            err(StatusCode::INTERNAL_SERVER_ERROR, "Failed to list users").into_response()
        }
    }
}

/// POST /users — create a user (admin only)
async fn create_user(
    State(state): State<AppState>,
    _admin: AdminUser,
    Json(body): Json<UserCreate>,
) -> impl IntoResponse {
    let email = body.email.to_lowercase().trim().to_string();
    if email.is_empty() {
        return err(StatusCode::BAD_REQUEST, "Email is required").into_response();
    }

    // Check duplicate
    let existing: Option<(i64,)> =
        sqlx::query_as("SELECT id FROM users WHERE LOWER(email) = LOWER(?)")
            .bind(&email)
            .fetch_optional(&state.db)
            .await
            .unwrap_or(None);
    if existing.is_some() {
        return err(StatusCode::BAD_REQUEST, "User with this email already exists").into_response();
    }

    let role = body.role.as_deref().unwrap_or("user");
    let is_active = body.is_active.unwrap_or(true);

    match sqlx::query(
        "INSERT INTO users (email, role, is_active) VALUES (?, ?, ?)",
    )
    .bind(&email)
    .bind(role)
    .bind(is_active)
    .execute(&state.db)
    .await
    {
        Ok(r) => {
            let id = r.last_insert_rowid();
            Json(json!({"message": "User created successfully", "id": id})).into_response()
        }
        Err(e) => {
            error!("Failed to create user: {}", e);
            err(StatusCode::INTERNAL_SERVER_ERROR, "Failed to create user").into_response()
        }
    }
}

/// PUT /users/:id — update a user (admin only)
async fn update_user(
    State(state): State<AppState>,
    Path(user_id): Path<i64>,
    _admin: AdminUser,
    Json(body): Json<UserUpdate>,
) -> impl IntoResponse {
    let exists: Option<(i64,)> = sqlx::query_as("SELECT id FROM users WHERE id = ?")
        .bind(user_id)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(None);
    if exists.is_none() {
        return err(StatusCode::NOT_FOUND, "User not found").into_response();
    }

    if let Some(role) = &body.role {
        if let Err(e) = sqlx::query("UPDATE users SET role = ? WHERE id = ?")
            .bind(role)
            .bind(user_id)
            .execute(&state.db)
            .await
        {
            error!("Failed to update user role: {}", e);
            return err(StatusCode::INTERNAL_SERVER_ERROR, "Failed to update user").into_response();
        }
    }

    if let Some(is_active) = body.is_active {
        if let Err(e) = sqlx::query("UPDATE users SET is_active = ? WHERE id = ?")
            .bind(is_active)
            .bind(user_id)
            .execute(&state.db)
            .await
        {
            error!("Failed to update user is_active: {}", e);
            return err(StatusCode::INTERNAL_SERVER_ERROR, "Failed to update user").into_response();
        }
    }

    Json(json!({"message": "User updated"})).into_response()
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_users).post(create_user))
        .route("/:id", put(update_user))
}
