use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;
use uuid::Uuid;

use crate::crypto::{blind_index, decrypt_opt, encrypt, encrypt_opt};
use crate::models::Person;

// ─── Public API response shape (decrypted) ───────────────────────────────────

#[derive(Serialize)]
pub struct PersonResponse {
    pub id: String,
    pub first_name: String,
    pub middle_name: Option<String>,
    pub last_name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub mobile: Option<String>,
    pub primary_address1: String,
    pub primary_address2: Option<String>,
    pub primary_address3: Option<String>,
    pub primary_city: String,
    pub primary_state: String,
    pub primary_zip: String,
    pub primary_country_code: String,
    pub created_at: String,
    pub updated_at: String,
    pub deleted_at: Option<String>,
}

fn decrypt_person(p: Person) -> Result<PersonResponse, String> {
    Ok(PersonResponse {
        id: p.id.to_string(),
        first_name: p.first_name.as_deref().map(|v| crate::crypto::decrypt(v)).transpose()?.unwrap_or_default(),
        middle_name: decrypt_opt(p.middle_name.as_deref())?,
        last_name: p.last_name.as_deref().map(|v| crate::crypto::decrypt(v)).transpose()?.unwrap_or_default(),
        email: decrypt_opt(p.email.as_deref())?,
        phone: decrypt_opt(p.phone.as_deref())?,
        mobile: decrypt_opt(p.mobile.as_deref())?,
        primary_address1: p.primary_address1.as_deref().map(|v| crate::crypto::decrypt(v)).transpose()?.unwrap_or_default(),
        primary_address2: decrypt_opt(p.primary_address2.as_deref())?,
        primary_address3: decrypt_opt(p.primary_address3.as_deref())?,
        primary_city: p.primary_city.as_deref().map(|v| crate::crypto::decrypt(v)).transpose()?.unwrap_or_default(),
        primary_state: p.primary_state,
        primary_zip: p.primary_zip,
        primary_country_code: p.primary_country_code,
        created_at: p.created_at.to_rfc3339(),
        updated_at: p.updated_at.to_rfc3339(),
        deleted_at: p.deleted_at.map(|d| d.to_rfc3339()),
    })
}

// ─── Input payloads ──────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct CreatePersonPayload {
    pub first_name: String,
    pub middle_name: Option<String>,
    pub last_name: String,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub mobile: Option<String>,
    pub primary_address1: String,
    pub primary_address2: Option<String>,
    pub primary_address3: Option<String>,
    pub primary_city: String,
    pub primary_state: String,
    pub primary_zip: String,
    pub primary_country_code: Option<String>,
}

// ─── Router ──────────────────────────────────────────────────────────────────

pub fn router() -> Router<SqlitePool> {
    Router::new()
        .route("/persons", post(create_person).get(list_persons))
        .route("/persons/{id}", get(get_person))
        .route("/import/nationbuilder", post(import_nationbuilder))
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async fn create_person(
    State(pool): State<SqlitePool>,
    Json(payload): Json<CreatePersonPayload>,
) -> Result<impl IntoResponse, StatusCode> {
    let id = Uuid::new_v4();
    let country_code = payload.primary_country_code.unwrap_or_else(|| "AU".to_string());

    // Encrypt all PII fields
    let enc_first_name = encrypt(&payload.first_name).map_err(|e| { eprintln!("Encryption error: {}", e); StatusCode::INTERNAL_SERVER_ERROR })?;
    let enc_middle_name = encrypt_opt(payload.middle_name.as_deref()).map_err(|e| { eprintln!("Encryption error: {}", e); StatusCode::INTERNAL_SERVER_ERROR })?;
    let enc_last_name = encrypt(&payload.last_name).map_err(|e| { eprintln!("Encryption error: {}", e); StatusCode::INTERNAL_SERVER_ERROR })?;
    let enc_email = encrypt_opt(payload.email.as_deref()).map_err(|e| { eprintln!("Encryption error: {}", e); StatusCode::INTERNAL_SERVER_ERROR })?;
    let email_idx = payload.email.as_deref().filter(|e| !e.is_empty()).map(blind_index);
    let enc_phone = encrypt_opt(payload.phone.as_deref()).map_err(|e| { eprintln!("Encryption error: {}", e); StatusCode::INTERNAL_SERVER_ERROR })?;
    let enc_mobile = encrypt_opt(payload.mobile.as_deref()).map_err(|e| { eprintln!("Encryption error: {}", e); StatusCode::INTERNAL_SERVER_ERROR })?;
    let enc_address1 = encrypt(&payload.primary_address1).map_err(|e| { eprintln!("Encryption error: {}", e); StatusCode::INTERNAL_SERVER_ERROR })?;
    let enc_address2 = encrypt_opt(payload.primary_address2.as_deref()).map_err(|e| { eprintln!("Encryption error: {}", e); StatusCode::INTERNAL_SERVER_ERROR })?;
    let enc_address3 = encrypt_opt(payload.primary_address3.as_deref()).map_err(|e| { eprintln!("Encryption error: {}", e); StatusCode::INTERNAL_SERVER_ERROR })?;
    let enc_city = encrypt(&payload.primary_city).map_err(|e| { eprintln!("Encryption error: {}", e); StatusCode::INTERNAL_SERVER_ERROR })?;

    let result = sqlx::query(
        r#"
        INSERT INTO persons (id, first_name, middle_name, last_name, email, email_blind_index,
                             phone, mobile, primary_address1, primary_address2, primary_address3,
                             primary_city, primary_state, primary_zip, primary_country_code)
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
        "#,
    )
    .bind(id)
    .bind(enc_first_name)
    .bind(enc_middle_name)
    .bind(enc_last_name)
    .bind(enc_email)
    .bind(email_idx)
    .bind(enc_phone)
    .bind(enc_mobile)
    .bind(enc_address1)
    .bind(enc_address2)
    .bind(enc_address3)
    .bind(enc_city)
    .bind(&payload.primary_state)   // NOT encrypted — used for geo filtering
    .bind(&payload.primary_zip)     // NOT encrypted — low sensitivity, used for filtering
    .bind(&country_code)
    .execute(&pool)
    .await;

    match result {
        Ok(_) => Ok((StatusCode::CREATED, Json(serde_json::json!({"id": id})))),
        Err(e) => {
            eprintln!("Database error: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

async fn get_person(
    State(pool): State<SqlitePool>,
    Path(id): Path<Uuid>,
) -> Result<Json<PersonResponse>, StatusCode> {
    let person = sqlx::query_as::<_, Person>("SELECT * FROM persons WHERE id = ?1 AND deleted_at IS NULL")
        .bind(id)
        .fetch_optional(&pool)
        .await
        .map_err(|e| {
            eprintln!("Database error: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    match person {
        Some(p) => {
            let resp = decrypt_person(p).map_err(|e| {
                eprintln!("Decryption error: {}", e);
                StatusCode::INTERNAL_SERVER_ERROR
            })?;
            Ok(Json(resp))
        }
        None => Err(StatusCode::NOT_FOUND),
    }
}

async fn list_persons(
    State(pool): State<SqlitePool>,
) -> Result<Json<Vec<PersonResponse>>, StatusCode> {
    let persons = sqlx::query_as::<_, Person>("SELECT * FROM persons WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 50")
        .fetch_all(&pool)
        .await
        .map_err(|e| {
            eprintln!("Database error: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let decrypted: Result<Vec<_>, _> = persons.into_iter().map(decrypt_person).collect();
    let decrypted = decrypted.map_err(|e| {
        eprintln!("Decryption error: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(decrypted))
}

// ─── NationBuilder Import ─────────────────────────────────────────────────────

#[derive(Deserialize, Debug)]
pub struct NBPeopleResponse {
    pub results: Vec<NBPerson>,
}

#[derive(Deserialize, Debug)]
pub struct NBPerson {
    pub id: i64,
    pub first_name: Option<String>,
    pub middle_name: Option<String>,
    pub last_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub mobile: Option<String>,
    pub primary_address: Option<NBAddress>,
}

#[derive(Deserialize, Debug)]
pub struct NBAddress {
    pub address1: Option<String>,
    pub address2: Option<String>,
    pub address3: Option<String>,
    pub city: Option<String>,
    pub state: Option<String>,
    pub zip: Option<String>,
    pub country_code: Option<String>,
}

async fn import_nationbuilder(
    State(pool): State<SqlitePool>,
) -> Result<impl IntoResponse, StatusCode> {
    let api_key = std::env::var("NATIONBUILDER_API_KEY").map_err(|_| {
        eprintln!("Missing NATIONBUILDER_API_KEY in environment");
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let slug = std::env::var("NATIONBUILDER_SLUG").unwrap_or_else(|_| "futureparty".to_string());
    let url = format!("https://{}.nationbuilder.com/api/v1/people?limit=100", slug);

    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| {
            eprintln!("Failed to send request to NationBuilder: {}", e);
            StatusCode::BAD_GATEWAY
        })?;

    if !response.status().is_success() {
        eprintln!("NationBuilder API returned status: {}", response.status());
        return Err(StatusCode::BAD_GATEWAY);
    }

    let payload: NBPeopleResponse = response.json().await.map_err(|e| {
        eprintln!("Failed to parse NationBuilder response: {}", e);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let mut imported_count = 0;
    let mut skipped_count = 0;

    for nb_person in payload.results {
        let provider_id = nb_person.id.to_string();

        // Check if already imported
        let existing = sqlx::query_scalar::<_, String>(
            "SELECT person_id FROM external_identities WHERE provider = 'nationbuilder' AND provider_id = ?1"
        )
        .bind(&provider_id)
        .fetch_optional(&pool)
        .await;

        match existing {
            Ok(Some(_)) => {
                skipped_count += 1;
                continue;
            }
            Err(e) => {
                eprintln!("Database error checking existence: {}", e);
                continue;
            }
            Ok(None) => {}
        }

        let first_name = nb_person.first_name.unwrap_or_else(|| "Unknown".to_string());
        let last_name = nb_person.last_name.unwrap_or_else(|| "Unknown".to_string());

        let addr = nb_person.primary_address.unwrap_or(NBAddress {
            address1: None, address2: None, address3: None,
            city: None, state: None, zip: None, country_code: None,
        });

        // Encrypt PII
        let enc_first_name = match encrypt(&first_name) { Ok(v) => v, Err(e) => { eprintln!("Encrypt error: {}", e); continue; } };
        let enc_middle_name = match encrypt_opt(nb_person.middle_name.as_deref()) { Ok(v) => v, Err(_) => None };
        let enc_last_name = match encrypt(&last_name) { Ok(v) => v, Err(e) => { eprintln!("Encrypt error: {}", e); continue; } };
        let enc_email = match encrypt_opt(nb_person.email.as_deref()) { Ok(v) => v, Err(_) => None };
        let email_idx = nb_person.email.as_deref().filter(|e| !e.is_empty()).map(blind_index);
        let enc_phone = match encrypt_opt(nb_person.phone.as_deref()) { Ok(v) => v, Err(_) => None };
        let enc_mobile = match encrypt_opt(nb_person.mobile.as_deref()) { Ok(v) => v, Err(_) => None };
        let enc_address1 = match encrypt(&addr.address1.clone().unwrap_or_default()) { Ok(v) => v, Err(_) => String::new() };
        let enc_address2 = match encrypt_opt(addr.address2.as_deref()) { Ok(v) => v, Err(_) => None };
        let enc_address3 = match encrypt_opt(addr.address3.as_deref()) { Ok(v) => v, Err(_) => None };
        let enc_city = match encrypt(&addr.city.clone().unwrap_or_default()) { Ok(v) => v, Err(_) => String::new() };
        let primary_state = addr.state.unwrap_or_default();
        let primary_zip = addr.zip.unwrap_or_default();
        let country_code = addr.country_code.unwrap_or_else(|| "AU".to_string());

        let person_id = Uuid::new_v4();
        let mut tx = pool.begin().await.map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        let person_res = sqlx::query(
            r#"
            INSERT INTO persons (id, first_name, middle_name, last_name, email, email_blind_index,
                                 phone, mobile, primary_address1, primary_address2, primary_address3,
                                 primary_city, primary_state, primary_zip, primary_country_code)
            VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)
            "#
        )
        .bind(person_id)
        .bind(enc_first_name)
        .bind(enc_middle_name)
        .bind(enc_last_name)
        .bind(enc_email)
        .bind(email_idx)
        .bind(enc_phone)
        .bind(enc_mobile)
        .bind(enc_address1)
        .bind(enc_address2)
        .bind(enc_address3)
        .bind(enc_city)
        .bind(primary_state)
        .bind(primary_zip)
        .bind(country_code)
        .execute(&mut *tx)
        .await;

        if let Err(e) = person_res {
            eprintln!("Failed to insert person: {}", e);
            let _ = tx.rollback().await;
            continue;
        }

        let identity_id = Uuid::new_v4();
        let identity_res = sqlx::query(
            r#"
            INSERT INTO external_identities (id, person_id, provider, provider_id)
            VALUES (?1, ?2, 'nationbuilder', ?3)
            "#
        )
        .bind(identity_id)
        .bind(person_id)
        .bind(provider_id)
        .execute(&mut *tx)
        .await;

        if let Err(e) = identity_res {
            eprintln!("Failed to insert external identity: {}", e);
            let _ = tx.rollback().await;
            continue;
        }

        if tx.commit().await.is_ok() {
            imported_count += 1;
        }
    }

    Ok((
        StatusCode::OK,
        Json(serde_json::json!({
            "status": "success",
            "imported": imported_count,
            "skipped": skipped_count
        })),
    ))
}
