pub mod members;
pub mod stats;
pub mod tags;
pub mod users;
pub mod views;

use axum::Router;

use crate::api::app::AppState;

/// Assemble all API and view routes.
pub fn create_router() -> Router<AppState> {
    Router::new()
        .nest("/members", members::router())
        .nest("/tags", tags::router())
        .nest("/stats", stats::router())
        .nest("/users", users::router())
        .merge(views::router())
}
