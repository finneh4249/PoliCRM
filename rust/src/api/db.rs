use anyhow::Result;
use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};
use std::fs;

/// Initialize the SQLite connection pool.
pub async fn create_pool(database_url: &str) -> Result<SqlitePool> {
    // Ensure the database file exists
    if database_url.starts_with("sqlite:") {
        let path = database_url.trim_start_matches("sqlite:");
        if path != ":memory:" && !std::path::Path::new(path).exists() {
            // Create the file
            fs::write(path, &[]).ok();
        }
    }

    let pool = SqlitePoolOptions::new()
        .max_connections(10)
        .connect(database_url)
        .await?;

    Ok(pool)
}

/// Run the initial database migration from the embedded SQL file.
pub async fn run_migrations(pool: &SqlitePool) -> Result<()> {
    let migration_sql = include_str!("../../migrations/001_initial.sql");
    sqlx::query(migration_sql).execute(pool).await?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Row structs (raw DB rows with encrypted fields as Vec<u8>)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct UserRow {
    pub id: i64,
    pub firebase_uid: Option<String>,
    pub email: String,
    pub role: String,
    pub is_active: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, sqlx::FromRow)]
pub struct MemberRow {
    pub id: i64,
    pub first_name: Vec<u8>,
    pub middle_name: Option<Vec<u8>>,
    pub last_name: Vec<u8>,
    pub email_hash: Option<String>,
    pub nationbuilder_id: i64,
    pub email: Option<Vec<u8>>,
    pub phone: Option<Vec<u8>>,
    pub mobile: Option<Vec<u8>>,
    pub primary_address1: Vec<u8>,
    pub primary_address2: Option<Vec<u8>>,
    pub primary_address3: Option<Vec<u8>>,
    pub primary_city: Vec<u8>,
    pub primary_state: Option<String>,
    pub primary_zip: Option<String>,
    pub primary_country_code: Option<String>,
    pub membership_status: Option<String>,
    pub join_date: Option<String>,
    pub renewal_date: Option<String>,
    pub membership_type: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub is_duplicate: i64,
    pub duplicate_of_id: Option<i64>,
}

#[derive(Debug, Clone, sqlx::FromRow, Serialize, Deserialize)]
pub struct CheckResultRow {
    pub id: i64,
    pub member_id: i64,
    pub result: String,
    pub federal_division: Option<String>,
    pub state_division: Option<String>,
    pub local_government: Option<String>,
    pub local_ward: Option<String>,
    pub timestamp: String,
}

#[derive(Debug, Clone, sqlx::FromRow, Serialize, Deserialize)]
pub struct MemberNoteRow {
    pub id: i64,
    pub member_id: i64,
    pub note: String,
    pub created_by: String,
    pub created_at: String,
}

#[derive(Debug, Clone, sqlx::FromRow, Serialize, Deserialize)]
pub struct TagRow {
    pub id: i64,
    pub name: String,
    pub color: String,
    pub description: Option<String>,
    pub created_at: String,
}

// ---------------------------------------------------------------------------
// API response structs (decrypted, ready to serialize to JSON)
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemberResponse {
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

impl MemberRow {
    /// Decrypt all PII fields to produce a MemberResponse.
    pub fn decrypt(
        &self,
        security: &crate::api::security::Security,
    ) -> Result<MemberDecrypted> {
        Ok(MemberDecrypted {
            id: self.id,
            first_name: security.decrypt(&self.first_name)?,
            middle_name: self
                .middle_name
                .as_deref()
                .map(|b| security.decrypt(b))
                .transpose()?,
            last_name: security.decrypt(&self.last_name)?,
            email_hash: self.email_hash.clone(),
            nationbuilder_id: self.nationbuilder_id,
            email: self
                .email
                .as_deref()
                .map(|b| security.decrypt(b))
                .transpose()?,
            phone: self
                .phone
                .as_deref()
                .map(|b| security.decrypt(b))
                .transpose()?,
            mobile: self
                .mobile
                .as_deref()
                .map(|b| security.decrypt(b))
                .transpose()?,
            primary_address1: security.decrypt(&self.primary_address1)?,
            primary_address2: self
                .primary_address2
                .as_deref()
                .map(|b| security.decrypt(b))
                .transpose()?,
            primary_address3: self
                .primary_address3
                .as_deref()
                .map(|b| security.decrypt(b))
                .transpose()?,
            primary_city: security.decrypt(&self.primary_city)?,
            primary_state: self.primary_state.clone(),
            primary_zip: self.primary_zip.clone(),
            primary_country_code: self
                .primary_country_code
                .clone()
                .unwrap_or_else(|| "AU".to_string()),
            membership_status: self
                .membership_status
                .clone()
                .unwrap_or_else(|| "active".to_string()),
            join_date: self.join_date.clone(),
            renewal_date: self.renewal_date.clone(),
            membership_type: self.membership_type.clone(),
            created_at: self.created_at.clone(),
            updated_at: self.updated_at.clone(),
            is_duplicate: self.is_duplicate != 0,
            duplicate_of_id: self.duplicate_of_id,
        })
    }
}

/// Decrypted member data (no encrypted fields)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemberDecrypted {
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
}

// ---------------------------------------------------------------------------
// Request input structs
// ---------------------------------------------------------------------------

#[derive(Debug, Deserialize)]
pub struct MemberCreate {
    pub first_name: String,
    pub middle_name: Option<String>,
    pub last_name: String,
    pub nationbuilder_id: i64,
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
    pub membership_status: Option<String>,
    pub membership_type: Option<String>,
    pub join_date: Option<String>,
    pub renewal_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MemberUpdate {
    pub first_name: Option<String>,
    pub middle_name: Option<String>,
    pub last_name: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    pub mobile: Option<String>,
    pub primary_address1: Option<String>,
    pub primary_city: Option<String>,
    pub primary_state: Option<String>,
    pub primary_zip: Option<String>,
    pub membership_status: Option<String>,
    pub membership_type: Option<String>,
    pub renewal_date: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MemberNoteCreate {
    pub note: String,
    pub created_by: Option<String>,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct TagCreate {
    pub name: String,
    pub color: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UserCreate {
    pub email: String,
    pub role: Option<String>,
    pub is_active: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct UserUpdate {
    pub role: Option<String>,
    pub is_active: Option<bool>,
}
