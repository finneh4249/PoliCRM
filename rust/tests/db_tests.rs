/// Integration tests for api::db — MemberRow::decrypt and related DB operations.
/// These tests use an in-memory SQLite database.

use policrm::api::db::{create_pool, run_migrations, MemberRow, UserRow};
use policrm::api::security::{generate_fernet_key, Security};

/// Create an in-memory SQLite pool with the schema applied.
async fn test_pool() -> sqlx::SqlitePool {
    let pool = create_pool("sqlite::memory:")
        .await
        .expect("Failed to create in-memory DB");
    run_migrations(&pool)
        .await
        .expect("Failed to run migrations");
    pool
}

/// Helper: build a MemberRow with encrypted fields.
fn make_member_row(sec: &Security) -> MemberRow {
    MemberRow {
        id: 1,
        first_name: sec.encrypt("Alice"),
        middle_name: Some(sec.encrypt("Jane")),
        last_name: sec.encrypt("Smith"),
        email_hash: Some(sec.get_blind_index("alice@example.com")),
        nationbuilder_id: 42,
        email: Some(sec.encrypt("alice@example.com")),
        phone: Some(sec.encrypt("+61 400 000 000")),
        mobile: Some(sec.encrypt("+61 411 000 000")),
        primary_address1: sec.encrypt("Main Street"),
        primary_address2: None,
        primary_address3: None,
        primary_city: sec.encrypt("Melbourne"),
        primary_state: Some("VIC".to_string()),
        primary_zip: Some("3000".to_string()),
        primary_country_code: Some("AU".to_string()),
        membership_status: Some("active".to_string()),
        join_date: Some("2024-01-01".to_string()),
        renewal_date: None,
        membership_type: None,
        created_at: "2024-01-01 00:00:00".to_string(),
        updated_at: "2024-01-01 00:00:00".to_string(),
        is_duplicate: 0,
        duplicate_of_id: None,
    }
}

// ── MemberRow::decrypt ────────────────────────────────────────────────────────

#[test]
fn test_member_row_decrypt_basic_fields() {
    let key = generate_fernet_key();
    let sec = Security::new(&key).unwrap();
    let row = make_member_row(&sec);

    let dec = row.decrypt(&sec).expect("Decrypt should succeed");

    assert_eq!(dec.first_name, "Alice");
    assert_eq!(dec.middle_name.as_deref(), Some("Jane"));
    assert_eq!(dec.last_name, "Smith");
    assert_eq!(dec.email.as_deref(), Some("alice@example.com"));
    assert_eq!(dec.phone.as_deref(), Some("+61 400 000 000"));
    assert_eq!(dec.mobile.as_deref(), Some("+61 411 000 000"));
    assert_eq!(dec.primary_address1, "Main Street");
    assert_eq!(dec.primary_city, "Melbourne");
}

#[test]
fn test_member_row_decrypt_plain_fields_preserved() {
    let key = generate_fernet_key();
    let sec = Security::new(&key).unwrap();
    let row = make_member_row(&sec);

    let dec = row.decrypt(&sec).unwrap();

    assert_eq!(dec.id, 1);
    assert_eq!(dec.nationbuilder_id, 42);
    assert_eq!(dec.primary_state.as_deref(), Some("VIC"));
    assert_eq!(dec.primary_zip.as_deref(), Some("3000"));
    assert_eq!(dec.primary_country_code, "AU");
    assert_eq!(dec.membership_status, "active");
    assert_eq!(dec.join_date.as_deref(), Some("2024-01-01"));
    assert!(!dec.is_duplicate);
    assert!(dec.duplicate_of_id.is_none());
}

#[test]
fn test_member_row_decrypt_no_optional_fields() {
    let key = generate_fernet_key();
    let sec = Security::new(&key).unwrap();

    let row = MemberRow {
        id: 2,
        first_name: sec.encrypt("Bob"),
        middle_name: None,
        last_name: sec.encrypt("Jones"),
        email_hash: None,
        nationbuilder_id: 99,
        email: None,
        phone: None,
        mobile: None,
        primary_address1: sec.encrypt("Oak Avenue"),
        primary_address2: None,
        primary_address3: None,
        primary_city: sec.encrypt("Sydney"),
        primary_state: None,
        primary_zip: None,
        primary_country_code: None,
        membership_status: None,
        join_date: None,
        renewal_date: None,
        membership_type: None,
        created_at: "2024-01-01 00:00:00".to_string(),
        updated_at: "2024-01-01 00:00:00".to_string(),
        is_duplicate: 0,
        duplicate_of_id: None,
    };

    let dec = row.decrypt(&sec).unwrap();

    assert_eq!(dec.first_name, "Bob");
    assert!(dec.middle_name.is_none());
    assert_eq!(dec.last_name, "Jones");
    assert!(dec.email.is_none());
    assert!(dec.phone.is_none());
    assert!(dec.mobile.is_none());
    // Defaults
    assert_eq!(dec.primary_country_code, "AU");
    assert_eq!(dec.membership_status, "active");
}

#[test]
fn test_member_row_decrypt_fails_with_wrong_key() {
    let key1 = generate_fernet_key();
    let key2 = generate_fernet_key();
    let sec1 = Security::new(&key1).unwrap();
    let sec2 = Security::new(&key2).unwrap();

    let row = make_member_row(&sec1);

    // sec2 cannot decrypt data encrypted by sec1
    let result = row.decrypt(&sec2);
    assert!(result.is_err(), "Decrypt with wrong key should fail");
}

#[test]
fn test_member_row_decrypt_is_duplicate_flag() {
    let key = generate_fernet_key();
    let sec = Security::new(&key).unwrap();

    let row = MemberRow {
        id: 3,
        first_name: sec.encrypt("Carol"),
        last_name: sec.encrypt("Davis"),
        middle_name: None,
        email_hash: None,
        nationbuilder_id: 200,
        email: None,
        phone: None,
        mobile: None,
        primary_address1: sec.encrypt("Some Street"),
        primary_address2: None,
        primary_address3: None,
        primary_city: sec.encrypt("Brisbane"),
        primary_state: Some("QLD".to_string()),
        primary_zip: None,
        primary_country_code: Some("AU".to_string()),
        membership_status: Some("active".to_string()),
        join_date: None,
        renewal_date: None,
        membership_type: None,
        created_at: "2024-01-01 00:00:00".to_string(),
        updated_at: "2024-01-01 00:00:00".to_string(),
        is_duplicate: 1,
        duplicate_of_id: Some(100),
    };

    let dec = row.decrypt(&sec).unwrap();
    assert!(dec.is_duplicate, "is_duplicate should be true when is_duplicate=1");
    assert_eq!(dec.duplicate_of_id, Some(100));
}

#[test]
fn test_member_row_decrypt_email_hash_preserved() {
    let key = generate_fernet_key();
    let sec = Security::new(&key).unwrap();

    let hash = sec.get_blind_index("test@example.com");
    let row = MemberRow {
        id: 4,
        first_name: sec.encrypt("Dave"),
        last_name: sec.encrypt("Brown"),
        middle_name: None,
        email_hash: Some(hash.clone()),
        nationbuilder_id: 300,
        email: None,
        phone: None,
        mobile: None,
        primary_address1: sec.encrypt("Test Road"),
        primary_address2: None,
        primary_address3: None,
        primary_city: sec.encrypt("Adelaide"),
        primary_state: Some("SA".to_string()),
        primary_zip: None,
        primary_country_code: Some("AU".to_string()),
        membership_status: Some("active".to_string()),
        join_date: None,
        renewal_date: None,
        membership_type: None,
        created_at: "2024-01-01 00:00:00".to_string(),
        updated_at: "2024-01-01 00:00:00".to_string(),
        is_duplicate: 0,
        duplicate_of_id: None,
    };

    let dec = row.decrypt(&sec).unwrap();
    assert_eq!(dec.email_hash.as_deref(), Some(hash.as_str()));
}

// ── DB schema (migrations) ────────────────────────────────────────────────────

#[tokio::test]
async fn test_migrations_create_users_table() {
    let pool = test_pool().await;
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users")
        .fetch_one(&pool)
        .await
        .expect("users table should exist after migrations");
    assert_eq!(count.0, 0, "New DB should have zero users");
}

#[tokio::test]
async fn test_migrations_create_members_table() {
    let pool = test_pool().await;
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM members")
        .fetch_one(&pool)
        .await
        .expect("members table should exist after migrations");
    assert_eq!(count.0, 0);
}

#[tokio::test]
async fn test_migrations_create_check_results_table() {
    let pool = test_pool().await;
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM check_results")
        .fetch_one(&pool)
        .await
        .expect("check_results table should exist after migrations");
    assert_eq!(count.0, 0);
}

#[tokio::test]
async fn test_migrations_create_tags_table() {
    let pool = test_pool().await;
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM tags")
        .fetch_one(&pool)
        .await
        .expect("tags table should exist after migrations");
    assert_eq!(count.0, 0);
}

#[tokio::test]
async fn test_migrations_idempotent() {
    // Running migrations twice should not fail (CREATE TABLE IF NOT EXISTS)
    let pool = test_pool().await;
    policrm::api::db::run_migrations(&pool)
        .await
        .expect("Second migration run should succeed");
}

#[tokio::test]
async fn test_insert_and_fetch_user() {
    let pool = test_pool().await;

    sqlx::query(
        "INSERT INTO users (firebase_uid, email, role, is_active) VALUES ('uid1', 'user@example.com', 'user', 1)"
    )
    .execute(&pool)
    .await
    .expect("Insert user should succeed");

    let user: UserRow = sqlx::query_as(
        "SELECT id, firebase_uid, email, role, is_active, created_at FROM users WHERE email = ?",
    )
    .bind("user@example.com")
    .fetch_one(&pool)
    .await
    .expect("Fetch user should succeed");

    assert_eq!(user.email, "user@example.com");
    assert_eq!(user.role, "user");
    assert!(user.is_active);
    assert_eq!(user.firebase_uid.as_deref(), Some("uid1"));
}

#[tokio::test]
async fn test_user_unique_email_constraint() {
    let pool = test_pool().await;

    sqlx::query("INSERT INTO users (email, role, is_active) VALUES ('dup@test.com', 'user', 1)")
        .execute(&pool)
        .await
        .expect("First insert should succeed");

    let result =
        sqlx::query("INSERT INTO users (email, role, is_active) VALUES ('dup@test.com', 'user', 1)")
            .execute(&pool)
            .await;

    assert!(result.is_err(), "Duplicate email should violate UNIQUE constraint");
}

#[tokio::test]
async fn test_member_nationbuilder_id_unique_constraint() {
    let pool = test_pool().await;
    let key = generate_fernet_key();
    let sec = Security::new(&key).unwrap();

    let enc_name = sec.encrypt("John");
    let enc_addr = sec.encrypt("1 Test St");
    let enc_city = sec.encrypt("Melbourne");

    // First insert
    sqlx::query(
        "INSERT INTO members (first_name, last_name, nationbuilder_id, primary_address1, primary_city) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(&enc_name)
    .bind(&enc_name)
    .bind(1001i64)
    .bind(&enc_addr)
    .bind(&enc_city)
    .execute(&pool)
    .await
    .expect("First member insert should succeed");

    // Second insert with same nationbuilder_id should fail
    let result = sqlx::query(
        "INSERT INTO members (first_name, last_name, nationbuilder_id, primary_address1, primary_city) VALUES (?, ?, ?, ?, ?)"
    )
    .bind(&enc_name)
    .bind(&enc_name)
    .bind(1001i64)
    .bind(&enc_addr)
    .bind(&enc_city)
    .execute(&pool)
    .await;

    assert!(result.is_err(), "Duplicate nationbuilder_id should violate UNIQUE constraint");
}
