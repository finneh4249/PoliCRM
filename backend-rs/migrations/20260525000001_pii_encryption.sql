-- 0002_pii_encryption.sql
-- Adds first_name_encrypted and last_name_encrypted columns.
-- NOTE: email_blind_index already exists in the initial schema migration.

ALTER TABLE persons ADD COLUMN first_name_encrypted TEXT;
ALTER TABLE persons ADD COLUMN last_name_encrypted TEXT;
