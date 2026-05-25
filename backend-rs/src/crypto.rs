use aes_gcm::{
    aead::{Aead, KeyInit, OsRng},
    Aes256Gcm,
};
use aes_gcm::aead::rand_core::RngCore;
use base64::{engine::general_purpose::STANDARD, Engine as _};
use sha2::{Digest, Sha256};

/// Derives a 32-byte AES-256 key from an arbitrary-length env string using SHA-256.
fn derive_key(raw_key: &str) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(raw_key.as_bytes());
    hasher.finalize().into()
}

/// Encrypts a plaintext string using AES-256-GCM.
/// Returns a base64-encoded string containing the nonce prepended to the ciphertext.
pub fn encrypt(plaintext: &str) -> Result<String, String> {
    let key_str = std::env::var("ENCRYPTION_KEY").map_err(|_| "Missing ENCRYPTION_KEY".to_string())?;
    let key = derive_key(&key_str);
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;

    // Generate a random 12-byte nonce
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = aes_gcm::Nonce::from(nonce_bytes);

    let ciphertext = cipher
        .encrypt(&nonce, plaintext.as_bytes())
        .map_err(|e| e.to_string())?;

    // Prepend nonce to ciphertext, then base64 encode the whole thing
    let mut combined = nonce_bytes.to_vec();
    combined.extend_from_slice(&ciphertext);
    Ok(STANDARD.encode(combined))
}

/// Decrypts a base64-encoded AES-256-GCM ciphertext (with prepended nonce).
pub fn decrypt(encoded: &str) -> Result<String, String> {
    let key_str = std::env::var("ENCRYPTION_KEY").map_err(|_| "Missing ENCRYPTION_KEY".to_string())?;
    let key = derive_key(&key_str);
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;

    let combined = STANDARD.decode(encoded).map_err(|e| e.to_string())?;
    if combined.len() < 12 {
        return Err("Invalid ciphertext: too short".to_string());
    }
    let (nonce_bytes, ciphertext) = combined.split_at(12);
    let nonce_arr: [u8; 12] = nonce_bytes.try_into().map_err(|_| "Invalid nonce".to_string())?;
    let nonce = aes_gcm::Nonce::from(nonce_arr);

    let plaintext = cipher
        .decrypt(&nonce, ciphertext)
        .map_err(|e| e.to_string())?;

    String::from_utf8(plaintext).map_err(|e| e.to_string())
}

/// Generates a deterministic blind index for a searchable PII field.
/// Uses SHA-256 with the ENCRYPTION_KEY as a pepper to prevent rainbow table attacks.
pub fn blind_index(value: &str) -> String {
    let key_str = std::env::var("ENCRYPTION_KEY").unwrap_or_default();
    let mut hasher = Sha256::new();
    hasher.update(value.to_lowercase().trim().as_bytes());
    hasher.update(key_str.as_bytes()); // pepper
    STANDARD.encode(hasher.finalize())
}

/// Encrypts an optional field - returns None if input is None or empty.
pub fn encrypt_opt(value: Option<&str>) -> Result<Option<String>, String> {
    match value {
        Some(v) if !v.is_empty() => Ok(Some(encrypt(v)?)),
        _ => Ok(None),
    }
}

/// Decrypts an optional field - returns None if input is None.
pub fn decrypt_opt(value: Option<&str>) -> Result<Option<String>, String> {
    match value {
        Some(v) => Ok(Some(decrypt(v)?)),
        None => Ok(None),
    }
}
