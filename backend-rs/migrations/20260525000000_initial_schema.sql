-- 0001_initial_schema.sql
-- Note: PII fields (names, email, phone, address) are stored as AES-256-GCM
-- ciphertext encoded in base64. Only `primary_state`, `primary_zip`, and
-- `email_blind_index` are stored in plaintext for filtering/search purposes.

CREATE TABLE IF NOT EXISTS persons (
    id TEXT PRIMARY KEY,
    first_name TEXT,                    -- encrypted
    middle_name TEXT,                   -- encrypted
    last_name TEXT,                     -- encrypted
    email TEXT,                         -- encrypted
    email_blind_index TEXT,             -- SHA-256(email + pepper), plaintext, searchable
    phone TEXT,                         -- encrypted
    mobile TEXT,                        -- encrypted
    primary_address1 TEXT,              -- encrypted
    primary_address2 TEXT,              -- encrypted
    primary_address3 TEXT,              -- encrypted
    primary_city TEXT,                  -- encrypted
    primary_state TEXT NOT NULL,        -- plaintext — used for geo filtering
    primary_zip TEXT NOT NULL,          -- plaintext — low sensitivity, used for filtering
    primary_country_code TEXT DEFAULT 'AU' NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at DATETIME
);

CREATE TABLE IF NOT EXISTS external_identities (
    id TEXT PRIMARY KEY,
    person_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
    UNIQUE(provider, provider_id)
);

CREATE TABLE IF NOT EXISTS parties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,
    parent_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES parties(id)
);

CREATE TABLE IF NOT EXISTS memberships (
    id TEXT PRIMARY KEY,
    person_id TEXT NOT NULL,
    party_id TEXT NOT NULL,
    status TEXT NOT NULL,
    membership_type TEXT,
    join_date DATETIME,
    renewal_date DATETIME,
    resignation_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at DATETIME,
    FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE,
    FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS interactions (
    id TEXT PRIMARY KEY,
    person_id TEXT NOT NULL,
    interaction_type TEXT NOT NULL,
    metadata JSON,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    user_id TEXT,
    FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
);
