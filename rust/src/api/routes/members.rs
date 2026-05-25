use axum::{
    extract::{Multipart, Path, Query, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use tracing::error;

use crate::api::app::AppState;
use crate::api::auth::{AdminUser, AuthUser};
use crate::api::db::{
    CheckResultRow, MemberCreate, MemberNoteCreate, MemberNoteRow, MemberRow, MemberUpdate,
    TagRow,
};

// ─────────────────────────────────────────────────────────────────────────────
// Query params
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct PaginationQuery {
    #[serde(default)]
    pub skip: i64,
    #[serde(default = "default_limit")]
    pub limit: i64,
}

fn default_limit() -> i64 {
    10000
}

// ─────────────────────────────────────────────────────────────────────────────
// Response type
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct MemberFullResponse {
    pub id: i64,
    pub first_name: String,
    pub middle_name: Option<String>,
    pub last_name: String,
    pub email_hash: Option<String>,
    pub nationbuilder_id: i64,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub mobile: Option<String>,
    pub primary_address1: String,
    pub primary_address2: Option<String>,
    pub primary_address3: Option<String>,
    pub primary_city: String,
    pub primary_state: Option<String>,
    pub primary_zip: Option<String>,
    pub primary_country_code: String,
    pub membership_status: String,
    pub join_date: Option<String>,
    pub renewal_date: Option<String>,
    pub membership_type: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub is_duplicate: bool,
    pub duplicate_of_id: Option<i64>,
    pub check_results: Vec<CheckResultRow>,
    pub notes: Vec<MemberNoteRow>,
    pub tags: Vec<TagRow>,
}

fn api_error(status: StatusCode, msg: &str) -> impl IntoResponse {
    (status, Json(serde_json::json!({"error": msg})))
}

async fn build_full_response(
    member: MemberRow,
    state: &AppState,
) -> anyhow::Result<MemberFullResponse> {
    let dec = member.decrypt(&state.security)?;

    let check_results: Vec<CheckResultRow> =
        sqlx::query_as("SELECT * FROM check_results WHERE member_id = ? ORDER BY timestamp DESC")
            .bind(dec.id)
            .fetch_all(&state.db)
            .await?;

    let notes: Vec<MemberNoteRow> =
        sqlx::query_as("SELECT * FROM member_notes WHERE member_id = ? ORDER BY created_at DESC")
            .bind(dec.id)
            .fetch_all(&state.db)
            .await?;

    let tags: Vec<TagRow> = sqlx::query_as(
        "SELECT t.* FROM tags t JOIN member_tags mt ON t.id = mt.tag_id WHERE mt.member_id = ?",
    )
    .bind(dec.id)
    .fetch_all(&state.db)
    .await?;

    Ok(MemberFullResponse {
        id: dec.id,
        first_name: dec.first_name,
        middle_name: dec.middle_name,
        last_name: dec.last_name,
        email_hash: dec.email_hash,
        nationbuilder_id: dec.nationbuilder_id,
        email: dec.email,
        phone: dec.phone,
        mobile: dec.mobile,
        primary_address1: dec.primary_address1,
        primary_address2: dec.primary_address2,
        primary_address3: dec.primary_address3,
        primary_city: dec.primary_city,
        primary_state: dec.primary_state,
        primary_zip: dec.primary_zip,
        primary_country_code: dec.primary_country_code,
        membership_status: dec.membership_status,
        join_date: dec.join_date,
        renewal_date: dec.renewal_date,
        membership_type: dec.membership_type,
        created_at: dec.created_at,
        updated_at: dec.updated_at,
        is_duplicate: dec.is_duplicate,
        duplicate_of_id: dec.duplicate_of_id,
        check_results,
        notes,
        tags,
    })
}

// ─────────────────────────────────────────────────────────────────────────────
// Handlers
// ─────────────────────────────────────────────────────────────────────────────

/// POST / — create a member
async fn create_member(
    State(state): State<AppState>,
    _auth: AuthUser,
    Json(payload): Json<MemberCreate>,
) -> impl IntoResponse {
    let existing: Option<(i64,)> =
        sqlx::query_as("SELECT id FROM members WHERE nationbuilder_id = ?")
            .bind(payload.nationbuilder_id)
            .fetch_optional(&state.db)
            .await
            .unwrap_or(None);

    if existing.is_some() {
        return api_error(StatusCode::BAD_REQUEST, "Member already registered").into_response();
    }

    let enc_first = state.security.encrypt(&payload.first_name);
    let enc_middle = payload.middle_name.as_deref().map(|v| state.security.encrypt(v));
    let enc_last = state.security.encrypt(&payload.last_name);
    let enc_email = payload.email.as_deref().map(|v| state.security.encrypt(v));
    let enc_phone = payload.phone.as_deref().map(|v| state.security.encrypt(v));
    let enc_mobile = payload.mobile.as_deref().map(|v| state.security.encrypt(v));
    let enc_addr1 = state.security.encrypt(&payload.primary_address1);
    let enc_addr2 = payload.primary_address2.as_deref().map(|v| state.security.encrypt(v));
    let enc_addr3 = payload.primary_address3.as_deref().map(|v| state.security.encrypt(v));
    let enc_city = state.security.encrypt(&payload.primary_city);
    let email_hash = payload
        .email
        .as_deref()
        .filter(|e| !e.is_empty())
        .map(|e| state.security.get_blind_index(e));

    let result = sqlx::query(
        r#"INSERT INTO members
           (first_name, middle_name, last_name, email_hash, nationbuilder_id,
            email, phone, mobile,
            primary_address1, primary_address2, primary_address3,
            primary_city, primary_state, primary_zip, primary_country_code,
            membership_status, membership_type, join_date, renewal_date)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"#,
    )
    .bind(&enc_first)
    .bind(&enc_middle)
    .bind(&enc_last)
    .bind(&email_hash)
    .bind(payload.nationbuilder_id)
    .bind(&enc_email)
    .bind(&enc_phone)
    .bind(&enc_mobile)
    .bind(&enc_addr1)
    .bind(&enc_addr2)
    .bind(&enc_addr3)
    .bind(&enc_city)
    .bind(&payload.primary_state)
    .bind(&payload.primary_zip)
    .bind(payload.primary_country_code.as_deref().unwrap_or("AU"))
    .bind(payload.membership_status.as_deref().unwrap_or("active"))
    .bind(&payload.membership_type)
    .bind(&payload.join_date)
    .bind(&payload.renewal_date)
    .execute(&state.db)
    .await;

    match result {
        Ok(res) => {
            let member_id = res.last_insert_rowid();
            if let Err(e) = state.browser_pool.enqueue_check(member_id) {
                error!("Failed to auto-queue check for member {}: {}", member_id, e);
            }
            match sqlx::query_as::<_, MemberRow>("SELECT * FROM members WHERE id = ?")
                .bind(member_id)
                .fetch_one(&state.db)
                .await
            {
                Ok(row) => match build_full_response(row, &state).await {
                    Ok(resp) => (StatusCode::CREATED, Json(resp)).into_response(),
                    Err(e) => api_error(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string())
                        .into_response(),
                },
                Err(e) => api_error(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string())
                    .into_response(),
            }
        }
        Err(e) => {
            error!("Failed to create member: {}", e);
            api_error(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()).into_response()
        }
    }
}

/// GET / — list members
async fn list_members(
    State(state): State<AppState>,
    _auth: AuthUser,
    Query(pagination): Query<PaginationQuery>,
) -> impl IntoResponse {
    let rows: Result<Vec<MemberRow>, _> =
        sqlx::query_as("SELECT * FROM members ORDER BY id LIMIT ? OFFSET ?")
            .bind(pagination.limit)
            .bind(pagination.skip)
            .fetch_all(&state.db)
            .await;

    match rows {
        Ok(members) => {
            let mut results = Vec::new();
            for member in members {
                match build_full_response(member, &state).await {
                    Ok(r) => results.push(r),
                    Err(e) => error!("Failed to decrypt member: {}", e),
                }
            }
            Json(results).into_response()
        }
        Err(e) => api_error(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()).into_response(),
    }
}

/// GET /:id — get a single member
async fn get_member(
    State(state): State<AppState>,
    _auth: AuthUser,
    Path(member_id): Path<i64>,
) -> impl IntoResponse {
    match sqlx::query_as::<_, MemberRow>("SELECT * FROM members WHERE id = ?")
        .bind(member_id)
        .fetch_optional(&state.db)
        .await
    {
        Ok(Some(row)) => match build_full_response(row, &state).await {
            Ok(resp) => Json(resp).into_response(),
            Err(e) => api_error(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()).into_response(),
        },
        Ok(None) => api_error(StatusCode::NOT_FOUND, "Member not found").into_response(),
        Err(e) => api_error(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()).into_response(),
    }
}

/// PUT /:id — update a member
async fn update_member(
    State(state): State<AppState>,
    _auth: AuthUser,
    Path(member_id): Path<i64>,
    Json(payload): Json<MemberUpdate>,
) -> impl IntoResponse {
    // Verify member exists
    let exists: Option<(i64,)> = sqlx::query_as("SELECT id FROM members WHERE id = ?")
        .bind(member_id)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(None);

    if exists.is_none() {
        return api_error(StatusCode::NOT_FOUND, "Member not found").into_response();
    }

    // Update each encrypted field individually if present
    macro_rules! update_enc {
        ($field:expr, $value:expr) => {
            if let Some(ref v) = $value {
                let enc = state.security.encrypt(v);
                if let Err(e) =
                    sqlx::query(&format!("UPDATE members SET {} = ? WHERE id = ?", $field))
                        .bind(&enc)
                        .bind(member_id)
                        .execute(&state.db)
                        .await
                {
                    return api_error(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string())
                        .into_response();
                }
            }
        };
    }

    macro_rules! update_plain {
        ($field:expr, $value:expr) => {
            if let Some(ref v) = $value {
                if let Err(e) =
                    sqlx::query(&format!("UPDATE members SET {} = ? WHERE id = ?", $field))
                        .bind(v)
                        .bind(member_id)
                        .execute(&state.db)
                        .await
                {
                    return api_error(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string())
                        .into_response();
                }
            }
        };
    }

    update_enc!("first_name", payload.first_name);
    update_enc!("middle_name", payload.middle_name);
    update_enc!("last_name", payload.last_name);
    update_enc!("email", payload.email);
    update_enc!("phone", payload.phone);
    update_enc!("mobile", payload.mobile);
    update_enc!("primary_address1", payload.primary_address1);
    update_enc!("primary_city", payload.primary_city);
    update_plain!("primary_state", payload.primary_state);
    update_plain!("primary_zip", payload.primary_zip);
    update_plain!("membership_status", payload.membership_status);
    update_plain!("membership_type", payload.membership_type);
    update_plain!("renewal_date", payload.renewal_date);

    // Update email blind index if email changed
    if let Some(ref email) = payload.email {
        let hash = state.security.get_blind_index(email);
        let _ = sqlx::query("UPDATE members SET email_hash = ? WHERE id = ?")
            .bind(&hash)
            .bind(member_id)
            .execute(&state.db)
            .await;
    }

    // Touch updated_at
    let _ = sqlx::query("UPDATE members SET updated_at = datetime('now') WHERE id = ?")
        .bind(member_id)
        .execute(&state.db)
        .await;

    match sqlx::query_as::<_, MemberRow>("SELECT * FROM members WHERE id = ?")
        .bind(member_id)
        .fetch_one(&state.db)
        .await
    {
        Ok(row) => match build_full_response(row, &state).await {
            Ok(resp) => Json(resp).into_response(),
            Err(e) => api_error(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()).into_response(),
        },
        Err(e) => api_error(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()).into_response(),
    }
}

/// DELETE /:id — delete a member (admin only)
async fn delete_member(
    State(state): State<AppState>,
    _admin: AdminUser,
    Path(member_id): Path<i64>,
) -> impl IntoResponse {
    match sqlx::query("DELETE FROM members WHERE id = ?")
        .bind(member_id)
        .execute(&state.db)
        .await
    {
        Ok(res) if res.rows_affected() > 0 => {
            Json(serde_json::json!({"message": "Member deleted successfully"})).into_response()
        }
        Ok(_) => api_error(StatusCode::NOT_FOUND, "Member not found").into_response(),
        Err(e) => api_error(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()).into_response(),
    }
}

/// POST /:id/notes — add a note
async fn add_note(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(member_id): Path<i64>,
    Json(payload): Json<MemberNoteCreate>,
) -> impl IntoResponse {
    let exists: Option<(i64,)> = sqlx::query_as("SELECT id FROM members WHERE id = ?")
        .bind(member_id)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(None);

    if exists.is_none() {
        return api_error(StatusCode::NOT_FOUND, "Member not found").into_response();
    }

    let creator = payload
        .created_by
        .as_deref()
        .unwrap_or_else(|| auth.0.email.as_str())
        .to_string();

    let result =
        sqlx::query("INSERT INTO member_notes (member_id, note, created_by) VALUES (?, ?, ?)")
            .bind(member_id)
            .bind(&payload.note)
            .bind(&creator)
            .execute(&state.db)
            .await;

    match result {
        Ok(res) => {
            let note_id = res.last_insert_rowid();
            match sqlx::query_as::<_, MemberNoteRow>("SELECT * FROM member_notes WHERE id = ?")
                .bind(note_id)
                .fetch_one(&state.db)
                .await
            {
                Ok(note) => (StatusCode::CREATED, Json(note)).into_response(),
                Err(e) => api_error(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string())
                    .into_response(),
            }
        }
        Err(e) => api_error(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()).into_response(),
    }
}

/// POST /:id/tags/:tag_id — add a tag
async fn add_tag(
    State(state): State<AppState>,
    _auth: AuthUser,
    Path((member_id, tag_id)): Path<(i64, i64)>,
) -> impl IntoResponse {
    let m: Option<(i64,)> = sqlx::query_as("SELECT id FROM members WHERE id = ?")
        .bind(member_id)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(None);
    let t: Option<(i64,)> = sqlx::query_as("SELECT id FROM tags WHERE id = ?")
        .bind(tag_id)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(None);

    if m.is_none() || t.is_none() {
        return api_error(StatusCode::NOT_FOUND, "Member or tag not found").into_response();
    }

    let _ =
        sqlx::query("INSERT OR IGNORE INTO member_tags (member_id, tag_id) VALUES (?, ?)")
            .bind(member_id)
            .bind(tag_id)
            .execute(&state.db)
            .await;

    Json(serde_json::json!({"message": "Tag added to member"})).into_response()
}

/// DELETE /:id/tags/:tag_id — remove a tag
async fn remove_tag(
    State(state): State<AppState>,
    _auth: AuthUser,
    Path((member_id, tag_id)): Path<(i64, i64)>,
) -> impl IntoResponse {
    let _ = sqlx::query("DELETE FROM member_tags WHERE member_id = ? AND tag_id = ?")
        .bind(member_id)
        .bind(tag_id)
        .execute(&state.db)
        .await;

    Json(serde_json::json!({"message": "Tag removed from member"})).into_response()
}

/// POST /:id/check — queue AEC check
async fn queue_check(
    State(state): State<AppState>,
    _auth: AuthUser,
    Path(member_id): Path<i64>,
) -> impl IntoResponse {
    let exists: Option<(i64,)> = sqlx::query_as("SELECT id FROM members WHERE id = ?")
        .bind(member_id)
        .fetch_optional(&state.db)
        .await
        .unwrap_or(None);

    if exists.is_none() {
        return api_error(StatusCode::NOT_FOUND, "Member not found").into_response();
    }

    match state.browser_pool.enqueue_check(member_id) {
        Ok(()) => Json(serde_json::json!({
            "status": "queued",
            "message": format!("Check queued for member {}", member_id)
        }))
        .into_response(),
        Err(e) => api_error(StatusCode::INTERNAL_SERVER_ERROR, &e.to_string()).into_response(),
    }
}

/// POST /upload — bulk CSV import via multipart
async fn upload_members(
    State(state): State<AppState>,
    _auth: AuthUser,
    mut multipart: Multipart,
) -> impl IntoResponse {
    let mut csv_bytes: Option<bytes::Bytes> = None;

    while let Ok(Some(field)) = multipart.next_field().await {
        if csv_bytes.is_none() {
            match field.bytes().await {
                Ok(b) => csv_bytes = Some(b),
                Err(e) => {
                    return api_error(
                        StatusCode::BAD_REQUEST,
                        &format!("Upload error: {}", e),
                    )
                    .into_response()
                }
            }
        }
    }

    let csv_bytes = match csv_bytes {
        Some(b) => b,
        None => return api_error(StatusCode::BAD_REQUEST, "No file uploaded").into_response(),
    };

    let csv_str = match std::str::from_utf8(&csv_bytes) {
        Ok(s) => s.to_string(),
        Err(_) => {
            return api_error(StatusCode::BAD_REQUEST, "File is not valid UTF-8").into_response()
        }
    };

    let mut rdr = csv::Reader::from_reader(csv_str.as_bytes());
    let headers = match rdr.headers() {
        Ok(h) => h.clone(),
        Err(e) => {
            return api_error(
                StatusCode::BAD_REQUEST,
                &format!("Invalid CSV: {}", e),
            )
            .into_response()
        }
    };

    let mut count = 0usize;
    let mut errors = 0usize;
    let mut skipped = 0usize;
    let mut queued = 0usize;

    for result in rdr.records() {
        let record = match result {
            Ok(r) => r,
            Err(_) => {
                errors += 1;
                continue;
            }
        };

        let row: std::collections::HashMap<String, String> = headers
            .iter()
            .zip(record.iter())
            .map(|(h, v)| (h.to_string(), v.to_string()))
            .collect();

        let nb_id_str = row.get("nationbuilder_id").map(|s| s.as_str()).unwrap_or("0");
        let nb_id: i64 = match nb_id_str.trim().parse() {
            Ok(n) if n > 0 => n,
            _ => {
                skipped += 1;
                continue;
            }
        };

        let exists: Option<(i64,)> =
            sqlx::query_as("SELECT id FROM members WHERE nationbuilder_id = ?")
                .bind(nb_id)
                .fetch_optional(&state.db)
                .await
                .unwrap_or(None);

        if exists.is_some() {
            skipped += 1;
            continue;
        }

        let get_opt = |field: &str| -> Option<String> {
            let v = row.get(field).map(|s| s.as_str()).unwrap_or("").trim().to_string();
            if v.is_empty() { None } else { Some(v) }
        };

        let first_name = match get_opt("first_name") {
            Some(v) => v,
            None => { skipped += 1; continue; }
        };
        let last_name = match get_opt("last_name") {
            Some(v) => v,
            None => { skipped += 1; continue; }
        };
        let primary_address1 = get_opt("primary_address1").unwrap_or_default();
        let primary_city = get_opt("primary_city").unwrap_or_default();

        let enc_first = state.security.encrypt(&first_name);
        let enc_middle = get_opt("middle_name").map(|v| state.security.encrypt(&v));
        let enc_last = state.security.encrypt(&last_name);
        let enc_email = get_opt("email").map(|v| state.security.encrypt(&v));
        let enc_phone = get_opt("phone").map(|v| state.security.encrypt(&v));
        let enc_mobile = get_opt("mobile").map(|v| state.security.encrypt(&v));
        let enc_addr1 = state.security.encrypt(&primary_address1);
        let enc_addr2 = get_opt("primary_address2").map(|v| state.security.encrypt(&v));
        let enc_addr3 = get_opt("primary_address3").map(|v| state.security.encrypt(&v));
        let enc_city = state.security.encrypt(&primary_city);
        let email_hash = get_opt("email").map(|e| state.security.get_blind_index(&e));

        let insert_result = sqlx::query(
            r#"INSERT INTO members
               (first_name, middle_name, last_name, email_hash, nationbuilder_id,
                email, phone, mobile,
                primary_address1, primary_address2, primary_address3,
                primary_city, primary_state, primary_zip, primary_country_code,
                membership_status)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"#,
        )
        .bind(&enc_first)
        .bind(&enc_middle)
        .bind(&enc_last)
        .bind(&email_hash)
        .bind(nb_id)
        .bind(&enc_email)
        .bind(&enc_phone)
        .bind(&enc_mobile)
        .bind(&enc_addr1)
        .bind(&enc_addr2)
        .bind(&enc_addr3)
        .bind(&enc_city)
        .bind(get_opt("primary_state"))
        .bind(get_opt("primary_zip"))
        .bind(get_opt("primary_country_code").unwrap_or_else(|| "AU".to_string()))
        .bind(get_opt("membership_status").unwrap_or_else(|| "active".to_string()))
        .execute(&state.db)
        .await;

        match insert_result {
            Ok(res) => {
                count += 1;
                let member_id = res.last_insert_rowid();
                if state.browser_pool.enqueue_check(member_id).is_ok() {
                    queued += 1;
                }
            }
            Err(e) => {
                error!("Error importing nb_id {}: {}", nb_id, e);
                errors += 1;
            }
        }
    }

    Json(serde_json::json!({
        "message": format!("Successfully imported {} members", count),
        "errors": errors,
        "skipped": skipped,
        "queued": queued,
    }))
    .into_response()
}

// ─────────────────────────────────────────────────────────────────────────────
// Router
// ─────────────────────────────────────────────────────────────────────────────

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", post(create_member).get(list_members))
        .route("/upload", post(upload_members))
        .route("/:id", get(get_member).put(update_member).delete(delete_member))
        .route("/:id/notes", post(add_note))
        .route("/:id/tags/:tag_id", post(add_tag).delete(remove_tag))
        .route("/:id/check", post(queue_check))
}
