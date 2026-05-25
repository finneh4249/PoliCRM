CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firebase_uid TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name BLOB NOT NULL,
    middle_name BLOB,
    last_name BLOB NOT NULL,
    email_hash TEXT,
    nationbuilder_id INTEGER UNIQUE NOT NULL,
    email BLOB,
    phone BLOB,
    mobile BLOB,
    primary_address1 BLOB NOT NULL,
    primary_address2 BLOB,
    primary_address3 BLOB,
    primary_city BLOB NOT NULL,
    primary_state TEXT,
    primary_zip TEXT,
    primary_country_code TEXT DEFAULT 'AU',
    membership_status TEXT DEFAULT 'active',
    join_date TEXT,
    renewal_date TEXT,
    membership_type TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    is_duplicate INTEGER NOT NULL DEFAULT 0,
    duplicate_of_id INTEGER REFERENCES members(id)
);

CREATE INDEX IF NOT EXISTS idx_members_nationbuilder_id ON members(nationbuilder_id);
CREATE INDEX IF NOT EXISTS idx_members_email_hash ON members(email_hash);
CREATE INDEX IF NOT EXISTS idx_members_state ON members(primary_state);

CREATE TABLE IF NOT EXISTS check_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    result TEXT NOT NULL,
    federal_division TEXT,
    state_division TEXT,
    local_government TEXT,
    local_ward TEXT,
    timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_check_results_member_id ON check_results(member_id);

CREATE TABLE IF NOT EXISTS member_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    color TEXT NOT NULL DEFAULT '#3B82F6',
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS member_tags (
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (member_id, tag_id)
);
