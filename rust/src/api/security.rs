use anyhow::{anyhow, Result};
use fernet::Fernet;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::Path;

/// Handles Fernet encryption/decryption compatible with Python's cryptography.fernet
pub struct Security {
    fernet: Fernet,
    encryption_key: String,
}

impl Security {
    /// Create a new Security instance with the given Fernet key.
    /// The key must be a valid Fernet key (URL-safe base64-encoded 32 bytes).
    pub fn new(encryption_key: &str) -> Result<Self> {
        let fernet = Fernet::new(encryption_key)
            .ok_or_else(|| anyhow!("Invalid Fernet encryption key"))?;
        Ok(Security {
            fernet,
            encryption_key: encryption_key.to_string(),
        })
    }

    /// Encrypt a plaintext string. Returns the raw Fernet token bytes.
    /// Compatible with Python: cipher_suite.encrypt(value.encode('utf-8'))
    pub fn encrypt(&self, plaintext: &str) -> Vec<u8> {
        let token = self.fernet.encrypt(plaintext.as_bytes());
        token.into_bytes()
    }

    /// Decrypt Fernet token bytes back to a UTF-8 string.
    /// Compatible with Python: cipher_suite.decrypt(value).decode('utf-8')
    pub fn decrypt(&self, ciphertext: &[u8]) -> Result<String> {
        let token_str = std::str::from_utf8(ciphertext)
            .map_err(|e| anyhow!("Ciphertext is not valid UTF-8: {}", e))?;
        let decrypted = self
            .fernet
            .decrypt(token_str)
            .map_err(|_| anyhow!("Fernet decryption failed"))?;
        String::from_utf8(decrypted)
            .map_err(|e| anyhow!("Decrypted value is not valid UTF-8: {}", e))
    }

    /// Decrypt optional bytes, returning None if input is None.
    pub fn decrypt_opt(&self, ciphertext: Option<&[u8]>) -> Result<Option<String>> {
        match ciphertext {
            None => Ok(None),
            Some(bytes) => self.decrypt(bytes).map(Some),
        }
    }

    /// Create a deterministic blind index for searchable encrypted fields.
    /// Uses SHA-256(lowercase(value) + encryption_key) to prevent rainbow tables.
    /// Compatible with Python: hashlib.sha256 + ENCRYPTION_KEY as pepper.
    pub fn get_blind_index(&self, value: &str) -> String {
        if value.is_empty() {
            return String::new();
        }
        let normalized = value.to_lowercase().trim().to_string();
        let mut hasher = Sha256::new();
        hasher.update(normalized.as_bytes());
        hasher.update(self.encryption_key.as_bytes());
        hex::encode(hasher.finalize())
    }
}

/// Get an environment variable or generate and persist it to .env file.
pub fn get_or_create_key(env_var_name: &str, generate: impl Fn() -> String) -> String {
    if let Ok(val) = std::env::var(env_var_name) {
        if !val.is_empty() {
            return val;
        }
    }

    eprintln!("Generating new {}...", env_var_name);
    let value = generate();

    // Update current process environment
    std::env::set_var(env_var_name, &value);

    // Persist to .env file
    let env_path = Path::new(".env");
    let line = format!("\n{}={}\n", env_var_name, value);

    if !env_path.exists() {
        let _ = fs::write(env_path, "# Auto-generated configuration\n");
    }

    let current = fs::read_to_string(env_path).unwrap_or_default();
    let _ = fs::write(env_path, format!("{}{}", current, line));

    value
}

/// Generate a new Fernet key as a string
pub fn generate_fernet_key() -> String {
    Fernet::generate_key()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt_roundtrip() {
        let key = generate_fernet_key();
        let sec = Security::new(&key).unwrap();

        let plaintext = "Hello, World!";
        let encrypted = sec.encrypt(plaintext);
        let decrypted = sec.decrypt(&encrypted).unwrap();

        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_decrypt_opt_none() {
        let key = generate_fernet_key();
        let sec = Security::new(&key).unwrap();
        assert_eq!(sec.decrypt_opt(None).unwrap(), None);
    }

    #[test]
    fn test_blind_index_deterministic() {
        let key = generate_fernet_key();
        let sec = Security::new(&key).unwrap();

        let idx1 = sec.get_blind_index("test@example.com");
        let idx2 = sec.get_blind_index("TEST@EXAMPLE.COM");
        assert_eq!(idx1, idx2);
    }

    // ── Additional edge cases ─────────────────────────────────────────────────

    #[test]
    fn test_invalid_fernet_key_returns_error() {
        let result = Security::new("this-is-not-a-valid-fernet-key");
        assert!(result.is_err(), "Invalid key should return Err");
    }

    #[test]
    fn test_empty_key_returns_error() {
        let result = Security::new("");
        assert!(result.is_err(), "Empty key should return Err");
    }

    #[test]
    fn test_decrypt_with_wrong_key_fails() {
        let key1 = generate_fernet_key();
        let key2 = generate_fernet_key();
        let sec1 = Security::new(&key1).unwrap();
        let sec2 = Security::new(&key2).unwrap();

        let encrypted = sec1.encrypt("secret data");
        let result = sec2.decrypt(&encrypted);
        assert!(result.is_err(), "Decryption with wrong key should fail");
    }

    #[test]
    fn test_encrypt_empty_string() {
        let key = generate_fernet_key();
        let sec = Security::new(&key).unwrap();
        let encrypted = sec.encrypt("");
        let decrypted = sec.decrypt(&encrypted).unwrap();
        assert_eq!(decrypted, "");
    }

    #[test]
    fn test_encrypt_unicode_string() {
        let key = generate_fernet_key();
        let sec = Security::new(&key).unwrap();
        let plaintext = "Ünïcödé téxt with émojis 🎉";
        let encrypted = sec.encrypt(plaintext);
        let decrypted = sec.decrypt(&encrypted).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_encrypt_produces_different_ciphertext_each_time() {
        // Fernet uses a random IV, so each encryption should produce different ciphertext
        let key = generate_fernet_key();
        let sec = Security::new(&key).unwrap();
        let enc1 = sec.encrypt("same plaintext");
        let enc2 = sec.encrypt("same plaintext");
        assert_ne!(enc1, enc2, "Each encryption should produce unique ciphertext (random IV)");
    }

    #[test]
    fn test_decrypt_opt_some_value() {
        let key = generate_fernet_key();
        let sec = Security::new(&key).unwrap();
        let encrypted = sec.encrypt("hello");
        let result = sec.decrypt_opt(Some(&encrypted)).unwrap();
        assert_eq!(result, Some("hello".to_string()));
    }

    #[test]
    fn test_blind_index_empty_string() {
        let key = generate_fernet_key();
        let sec = Security::new(&key).unwrap();
        let idx = sec.get_blind_index("");
        assert_eq!(idx, "", "Empty input should return empty blind index");
    }

    #[test]
    fn test_blind_index_whitespace_trimmed() {
        let key = generate_fernet_key();
        let sec = Security::new(&key).unwrap();
        // Normalization trims and lowercases
        let idx1 = sec.get_blind_index("  Alice@Example.com  ");
        let idx2 = sec.get_blind_index("alice@example.com");
        assert_eq!(idx1, idx2, "Blind index should trim and lowercase");
    }

    #[test]
    fn test_blind_index_is_hex_string() {
        let key = generate_fernet_key();
        let sec = Security::new(&key).unwrap();
        let idx = sec.get_blind_index("test@example.com");
        // SHA-256 produces 32 bytes = 64 hex chars
        assert_eq!(idx.len(), 64);
        assert!(idx.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn test_blind_index_differs_between_keys() {
        let key1 = generate_fernet_key();
        let key2 = generate_fernet_key();
        let sec1 = Security::new(&key1).unwrap();
        let sec2 = Security::new(&key2).unwrap();
        // Different keys act as different peppers
        let idx1 = sec1.get_blind_index("test@example.com");
        let idx2 = sec2.get_blind_index("test@example.com");
        assert_ne!(idx1, idx2, "Different keys should produce different blind indexes");
    }

    #[test]
    fn test_blind_index_differs_for_different_values() {
        let key = generate_fernet_key();
        let sec = Security::new(&key).unwrap();
        let idx1 = sec.get_blind_index("alice@example.com");
        let idx2 = sec.get_blind_index("bob@example.com");
        assert_ne!(idx1, idx2);
    }

    #[test]
    fn test_generate_fernet_key_is_non_empty() {
        let key = generate_fernet_key();
        assert!(!key.is_empty());
    }

    #[test]
    fn test_generate_fernet_key_creates_valid_key() {
        let key = generate_fernet_key();
        // Should be usable as a Fernet key
        assert!(Security::new(&key).is_ok());
    }

    #[test]
    fn test_two_generated_keys_are_different() {
        let key1 = generate_fernet_key();
        let key2 = generate_fernet_key();
        assert_ne!(key1, key2, "Generated keys should be unique");
    }

    #[test]
    fn test_encrypt_long_string() {
        let key = generate_fernet_key();
        let sec = Security::new(&key).unwrap();
        let plaintext = "A".repeat(10000);
        let encrypted = sec.encrypt(&plaintext);
        let decrypted = sec.decrypt(&encrypted).unwrap();
        assert_eq!(decrypted, plaintext);
    }
}
