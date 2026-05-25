-- 0002_pii_encryption.sql
-- Adds email_blind_index for searchable encrypted email lookups
-- PII columns are already TEXT in SQLite, but we now document them as encrypted

ALTER TABLE persons ADD COLUMN email_blind_index TEXT;
ALTER TABLE persons ADD COLUMN first_name_encrypted TEXT;
ALTER TABLE persons ADD COLUMN last_name_encrypted TEXT;
