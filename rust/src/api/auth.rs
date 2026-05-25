use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, SystemTime};

use anyhow::{anyhow, Result};
use axum::{
    async_trait,
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
    Json,
};
use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use jsonwebtoken::{decode, decode_header, Algorithm, DecodingKey, Validation};
use parking_lot::RwLock;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::SqlitePool;
use tracing::{error, info, warn};

use crate::api::db::UserRow;

/// Claims embedded in a Firebase JWT token.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FirebaseClaims {
    /// Firebase UID (subject)
    pub sub: String,
    pub email: Option<String>,
    pub exp: usize,
    pub iat: usize,
    pub aud: String,
    pub iss: String,
}

/// A JWK returned by Google's JWKS endpoint.
#[derive(Debug, Clone, Deserialize)]
struct GoogleJwk {
    kid: String,
    n: String,
    e: String,
    kty: String,
    #[serde(rename = "use")]
    key_use: Option<String>,
    alg: Option<String>,
}

/// Response from Google's JWKS endpoint.
#[derive(Deserialize)]
struct JwksResponse {
    keys: Vec<GoogleJwk>,
}

/// Cached public key set fetched from Google's JWKS endpoint.
struct KeyCache {
    /// kid → (n_bytes, e_bytes) for DecodingKey::from_rsa_raw_components
    keys: HashMap<String, (Vec<u8>, Vec<u8>)>,
    fetched_at: SystemTime,
}

/// Firebase authentication token verifier.
pub struct FirebaseAuth {
    project_id: String,
    http_client: Client,
    key_cache: Arc<RwLock<Option<KeyCache>>>,
}

const GOOGLE_JWKS_URL: &str = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

/// Cache public keys for this long before re-fetching.
const KEY_CACHE_TTL: Duration = Duration::from_secs(3600);

impl FirebaseAuth {
    /// Create a new FirebaseAuth for the given Firebase project.
    pub fn new(project_id: &str) -> Self {
        FirebaseAuth {
            project_id: project_id.to_string(),
            http_client: Client::builder()
                .timeout(Duration::from_secs(10))
                .build()
                .expect("Failed to build HTTP client"),
            key_cache: Arc::new(RwLock::new(None)),
        }
    }

    /// Verify a Firebase ID token and return its claims.
    pub async fn verify_token(&self, token: &str) -> Result<FirebaseClaims> {
        // If no project_id configured, skip verification in dev mode
        if self.project_id.is_empty() || self.project_id == "dev" {
            warn!("Firebase project_id not set — skipping token verification (dev mode)");
            return self.decode_unverified(token);
        }

        // Decode header to get kid
        let header = decode_header(token)
            .map_err(|e| anyhow!("Failed to decode JWT header: {}", e))?;

        let kid = header
            .kid
            .ok_or_else(|| anyhow!("JWT header missing 'kid'"))?;

        // Get decoding key (from cache or fetch)
        let (n, e) = self.get_key_components(&kid).await?;

        let decoding_key = DecodingKey::from_rsa_raw_components(&n, &e);

        let mut validation = Validation::new(Algorithm::RS256);
        validation.set_audience(&[&self.project_id]);
        validation.set_issuer(&[format!(
            "https://securetoken.google.com/{}",
            self.project_id
        )]);

        let token_data = decode::<FirebaseClaims>(token, &decoding_key, &validation)
            .map_err(|e| anyhow!("Token verification failed: {}", e))?;

        Ok(token_data.claims)
    }

    /// Decode token claims without signature verification (dev mode fallback).
    fn decode_unverified(&self, token: &str) -> Result<FirebaseClaims> {
        let parts: Vec<&str> = token.splitn(3, '.').collect();
        if parts.len() < 2 {
            return Err(anyhow!("Malformed JWT token"));
        }

        let decoded = URL_SAFE_NO_PAD
            .decode(parts[1])
            .map_err(|e| anyhow!("Failed to base64-decode JWT payload: {}", e))?;

        let claims: FirebaseClaims = serde_json::from_slice(&decoded)
            .map_err(|e| anyhow!("Failed to parse JWT claims: {}", e))?;

        Ok(claims)
    }

    /// Get RSA key components (modulus n, exponent e) for the given kid.
    async fn get_key_components(&self, kid: &str) -> Result<(Vec<u8>, Vec<u8>)> {
        // Check cache first
        {
            let cache = self.key_cache.read();
            if let Some(ref cached) = *cache {
                if let Ok(elapsed) = cached.fetched_at.elapsed() {
                    if elapsed < KEY_CACHE_TTL {
                        if let Some(pair) = cached.keys.get(kid) {
                            return Ok(pair.clone());
                        }
                    }
                }
            }
        }

        // Fetch fresh JWKS
        info!("Fetching Firebase public keys from Google JWKS...");
        let response = self
            .http_client
            .get(GOOGLE_JWKS_URL)
            .send()
            .await
            .map_err(|e| anyhow!("Failed to fetch Google JWKS: {}", e))?;

        if !response.status().is_success() {
            return Err(anyhow!(
                "Google JWKS endpoint returned {}",
                response.status()
            ));
        }

        let jwks: JwksResponse = response
            .json()
            .await
            .map_err(|e| anyhow!("Failed to parse JWKS response: {}", e))?;

        let mut key_map: HashMap<String, (Vec<u8>, Vec<u8>)> = HashMap::new();
        for jwk in &jwks.keys {
            let n = URL_SAFE_NO_PAD
                .decode(&jwk.n)
                .map_err(|e| anyhow!("Failed to decode JWK modulus: {}", e))?;
            let e = URL_SAFE_NO_PAD
                .decode(&jwk.e)
                .map_err(|e| anyhow!("Failed to decode JWK exponent: {}", e))?;
            key_map.insert(jwk.kid.clone(), (n, e));
        }

        // Update cache
        {
            let mut cache = self.key_cache.write();
            *cache = Some(KeyCache {
                keys: key_map.clone(),
                fetched_at: SystemTime::now(),
            });
        }

        key_map
            .get(kid)
            .cloned()
            .ok_or_else(|| anyhow!("No public key found for kid '{}' in Firebase JWKS", kid))
    }
}

// ---------------------------------------------------------------------------
// Axum request extractors
// ---------------------------------------------------------------------------

/// Authenticated user extracted from the Authorization: Bearer <token> header.
#[derive(Debug, Clone)]
pub struct AuthUser(pub UserRow);

/// Admin-only variant.
#[derive(Debug, Clone)]
pub struct AdminUser(pub UserRow);

#[async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
    crate::api::app::AppState: axum::extract::FromRef<S>,
{
    type Rejection = (StatusCode, Json<Value>);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        use axum::extract::FromRef;
        let app_state = crate::api::app::AppState::from_ref(state);
        extract_auth_user(parts, &app_state)
            .await
            .map(AuthUser)
            .map_err(|e| {
                error!("Auth error: {}", e);
                (
                    StatusCode::UNAUTHORIZED,
                    Json(serde_json::json!({"error": e.to_string()})),
                )
            })
    }
}

#[async_trait]
impl<S> FromRequestParts<S> for AdminUser
where
    S: Send + Sync,
    crate::api::app::AppState: axum::extract::FromRef<S>,
{
    type Rejection = (StatusCode, Json<Value>);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        use axum::extract::FromRef;
        let app_state = crate::api::app::AppState::from_ref(state);
        let user = extract_auth_user(parts, &app_state)
            .await
            .map_err(|e| {
                error!("Auth error: {}", e);
                (
                    StatusCode::UNAUTHORIZED,
                    Json(serde_json::json!({"error": e.to_string()})),
                )
            })?;

        if user.role != "admin" {
            return Err((
                StatusCode::FORBIDDEN,
                Json(serde_json::json!({"error": "Admin role required"})),
            ));
        }
        Ok(AdminUser(user))
    }
}

/// Extract bearer token, verify with Firebase, look up/create the DB user.
async fn extract_auth_user(
    parts: &mut Parts,
    state: &crate::api::app::AppState,
) -> Result<UserRow> {
    let auth_header = parts
        .headers
        .get(axum::http::header::AUTHORIZATION)
        .ok_or_else(|| anyhow!("Missing Authorization header"))?
        .to_str()
        .map_err(|_| anyhow!("Invalid Authorization header encoding"))?;

    let token = auth_header
        .strip_prefix("Bearer ")
        .ok_or_else(|| anyhow!("Authorization header must use Bearer scheme"))?
        .trim();

    if token.is_empty() {
        return Err(anyhow!("Empty bearer token"));
    }

    let claims = state
        .firebase_auth
        .verify_token(token)
        .await
        .map_err(|e| anyhow!("Firebase token verification failed: {}", e))?;

    find_or_create_user(&state.db, &claims.sub, claims.email.as_deref()).await
}

/// Find a user by Firebase UID; if not found, try by email (linking seeded users);
/// if still not found, create a new user.
async fn find_or_create_user(
    db: &SqlitePool,
    firebase_uid: &str,
    email: Option<&str>,
) -> Result<UserRow> {
    // 1. Try by Firebase UID
    if let Some(user) = sqlx::query_as::<_, UserRow>(
        "SELECT id, firebase_uid, email, role, is_active, created_at FROM users WHERE firebase_uid = ?",
    )
    .bind(firebase_uid)
    .fetch_optional(db)
    .await?
    {
        return Ok(user);
    }

    // 2. Try by email (pre-seeded users)
    if let Some(email_str) = email {
        if let Some(user) = sqlx::query_as::<_, UserRow>(
            "SELECT id, firebase_uid, email, role, is_active, created_at FROM users WHERE LOWER(email) = LOWER(?)",
        )
        .bind(email_str)
        .fetch_optional(db)
        .await?
        {
            // Link the UID
            info!("Linking existing user {} to Firebase UID {}", email_str, firebase_uid);
            sqlx::query("UPDATE users SET firebase_uid = ? WHERE id = ?")
                .bind(firebase_uid)
                .bind(user.id)
                .execute(db)
                .await?;
            return Ok(UserRow {
                firebase_uid: Some(firebase_uid.to_string()),
                ..user
            });
        }

        // 3. Auto-create
        info!("Creating new user for {} (UID: {})", email_str, firebase_uid);
        let id = sqlx::query(
            "INSERT INTO users (firebase_uid, email, role, is_active) VALUES (?, ?, 'user', 1)",
        )
        .bind(firebase_uid)
        .bind(email_str)
        .execute(db)
        .await?
        .last_insert_rowid();

        return sqlx::query_as::<_, UserRow>(
            "SELECT id, firebase_uid, email, role, is_active, created_at FROM users WHERE id = ?",
        )
        .bind(id)
        .fetch_one(db)
        .await
        .map_err(|e| anyhow!("Failed to fetch newly created user: {}", e));
    }

    Err(anyhow!("User not found and no email provided for auto-creation"))
}
