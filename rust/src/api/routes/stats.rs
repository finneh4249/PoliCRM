use axum::{
    extract::State,
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use serde_json::json;

use crate::api::app::AppState;
use crate::api::auth::AuthUser;

/// GET /stats/dashboard — summary statistics for the dashboard
async fn dashboard_stats(
    State(state): State<AppState>,
    _user: AuthUser,
) -> impl IntoResponse {
    let db = &state.db;

    let total: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM members")
        .fetch_one(db).await.unwrap_or((0,));

    let active: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM members WHERE membership_status = 'active'"
    ).fetch_one(db).await.unwrap_or((0,));

    let lapsed: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM members WHERE membership_status = 'lapsed'"
    ).fetch_one(db).await.unwrap_or((0,));

    let verified: (i64,) = sqlx::query_as(
        "SELECT COUNT(DISTINCT member_id) FROM check_results WHERE result = 'Pass'"
    ).fetch_one(db).await.unwrap_or((0,));

    let failed: (i64,) = sqlx::query_as(
        "SELECT COUNT(DISTINCT member_id) FROM check_results WHERE result IN ('Fail','Fail_Suburb','Fail_Street','Fail_No_Match')"
    ).fetch_one(db).await.unwrap_or((0,));

    let captcha: (i64,) = sqlx::query_as(
        "SELECT COUNT(DISTINCT member_id) FROM check_results WHERE result = 'Captcha'"
    ).fetch_one(db).await.unwrap_or((0,));

    let unchecked: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM members WHERE id NOT IN (SELECT DISTINCT member_id FROM check_results)"
    ).fetch_one(db).await.unwrap_or((0,));

    let thirty_days_ago = chrono::Utc::now() - chrono::Duration::days(30);
    let thirty_days_str = thirty_days_ago.format("%Y-%m-%d %H:%M:%S").to_string();
    let new_30d: (i64,) = sqlx::query_as(
        "SELECT COUNT(*) FROM members WHERE created_at >= ?"
    )
    .bind(&thirty_days_str)
    .fetch_one(db).await.unwrap_or((0,));

    // State distribution
    let state_rows: Vec<(Option<String>, i64)> = sqlx::query_as(
        "SELECT primary_state, COUNT(*) as cnt FROM members GROUP BY primary_state"
    )
    .fetch_all(db).await.unwrap_or_default();

    let by_state: serde_json::Map<String, serde_json::Value> = state_rows
        .into_iter()
        .filter_map(|(st, cnt)| st.map(|s| (s, json!(cnt))))
        .collect();

    Json(json!({
        "total_members": total.0,
        "active_members": active.0,
        "lapsed_members": lapsed.0,
        "verified_count": verified.0,
        "failed_count": failed.0,
        "captcha_count": captcha.0,
        "unchecked_count": unchecked.0,
        "new_members_30d": new_30d.0,
        "by_state": by_state,
    })).into_response()
}

/// GET /stats/electorates — federal division distribution
async fn electorate_stats(
    State(state): State<AppState>,
    _user: AuthUser,
) -> impl IntoResponse {
    let rows: Vec<(Option<String>, i64)> = sqlx::query_as(
        r#"SELECT federal_division, COUNT(DISTINCT member_id) as cnt
           FROM check_results
           WHERE federal_division IS NOT NULL AND federal_division != ''
           GROUP BY federal_division
           ORDER BY cnt DESC"#
    )
    .fetch_all(&state.db)
    .await
    .unwrap_or_default();

    let result: Vec<serde_json::Value> = rows
        .into_iter()
        .map(|(div, cnt)| json!({
            "federal_division": div.unwrap_or_default(),
            "count": cnt
        }))
        .collect();

    Json(result).into_response()
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/dashboard", get(dashboard_stats))
        .route("/electorates", get(electorate_stats))
}
