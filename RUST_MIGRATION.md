# PoliCRM — Rust Migration Guide

This document describes the Rust port of the PoliCRM application and how to build, configure, and run it.

---

## What Was Migrated

The Rust rewrite is a complete port of the Python application located in `src/`. It covers:

| Python module | Rust equivalent |
|---|---|
| `src/aec_core/browser.py` | `rust/src/aec_core/browser.rs` |
| `src/aec_core/main.py` | `rust/src/aec_core/checker.rs` |
| `src/aec_core/models.py` | `rust/src/aec_core/models.rs` |
| `src/aec_core/utils.py` | `rust/src/aec_core/utils.rs` |
| `src/api/main.py` | `rust/src/api/app.rs` |
| `src/api/auth.py` | `rust/src/api/auth.rs` |
| `src/api/database.py` + `models.py` | `rust/src/api/db.rs` |
| `src/api/security.py` | `rust/src/api/security.rs` |
| `src/api/rate_limiter.py` | `rust/src/api/rate_limiter.rs` |
| `src/api/worker_pool.py` | `rust/src/api/worker_pool.rs` |
| `src/api/services/daemon.py` | `rust/src/api/daemon.rs` |
| `src/api/routers/members.py` | `rust/src/api/routes/members.rs` |
| `src/api/routers/tags.py` | `rust/src/api/routes/tags.rs` |
| `src/api/routers/users.py` | `rust/src/api/routes/users.rs` |
| `src/api/routers/stats.py` | `rust/src/api/routes/stats.rs` |
| `src/api/routers/views.py` | `rust/src/api/routes/views.rs` |
| `src/utils/convert_addresses.py` | `rust/src/utils/address.rs` |

### Key design choices

- **Axum 0.7** replaces FastAPI. Routes mirror the Python router structure 1:1.
- **sqlx 0.7 + SQLite** replaces SQLAlchemy. The schema is identical; the same `crm.db` file is usable.
- **fernet 0.2** is used for Fernet encryption, maintaining byte-for-byte compatibility with Python's `cryptography.fernet`. Existing encrypted data in `crm.db` can be read by the Rust binary using the same `ENCRYPTION_KEY`.
- **thirtyfour 0.31** is used for Selenium/WebDriver browser automation (Firefox/geckodriver).
- **jsonwebtoken 9** with Google JWKS is used for Firebase JWT verification.
- **indicatif** is used for CLI progress bars in the batch checker.
- **tokio** async runtime throughout — the batch checker uses multiple async tasks, one per browser instance.
- **parking_lot::Mutex** is used for synchronous shared state (rate limiter, browser pool sender).

---

## Prerequisites

- Rust toolchain (stable, edition 2021): https://rustup.rs/
- **geckodriver** must be on your `PATH` and running before executing any `check` commands or starting the server with the browser pool active.
  - Download from: https://github.com/mozilla/geckodriver/releases
  - Start before running: `geckodriver --port 4444 &`
  - The Rust code always connects to `http://localhost:4444`.
- Firefox browser installed (used by geckodriver).
- SQLite (no separate server needed — embedded via libsqlite3).

---

## Building

```bash
cd rust
cargo build --release
```

The compiled binary will be at `rust/target/release/policrm`.

For a debug build (faster to compile, slower at runtime):
```bash
cd rust
cargo build
```

---

## Environment Variables

Create a `.env` file in your working directory (the same directory you run `policrm` from):

```env
# SQLite database path
DATABASE_URL=sqlite:crm.db

# Fernet encryption key (URL-safe base64-encoded 32 bytes)
# MUST match the key used to encrypt data in crm.db
# If not set, a new key is auto-generated and saved to .env
ENCRYPTION_KEY=<your-fernet-key>

# Secret key (used for session tokens etc.)
SECRET_KEY=<your-secret-key>

# Firebase project ID for JWT verification
# If not set, token verification is skipped (dev mode)
FIREBASE_PROJECT_ID=your-firebase-project-id

# Path to Firebase service account JSON (only used by Python version)
FIREBASE_CREDENTIALS_PATH=/path/to/serviceAccountKey.json

# Web server port (default: 8000)
PORT=8000

# Number of browser workers in the pool (default: 2)
BROWSER_POOL_SIZE=2

# Run browsers in headless mode (default: true)
BROWSER_HEADLESS=true

# Static files directory (default: src/api/static)
STATIC_DIR=src/api/static

# HTML templates directory (default: src/api/templates)
TEMPLATES_DIR=src/api/templates
```

**Important:** If you are migrating from the Python version, copy the same `ENCRYPTION_KEY` from your existing `.env` so member PII in `crm.db` can be decrypted correctly.

---

## Running the Web Server

```bash
# Start geckodriver first
geckodriver --port 4444 &

# Then start the CRM server
./target/release/policrm serve
```

The server listens on `http://0.0.0.0:8000` by default.

Alternatively, run from the project root without building a release binary:

```bash
cd rust
cargo run -- serve
```

---

## Running the Batch AEC Checker

```bash
# Basic usage
./target/release/policrm check --infile input.csv --outfile output.csv

# With options
./target/release/policrm check \
  --infile members.csv \
  --outfile results.csv \
  --skip 100 \
  --threads 3 \
  --headless

# Validate input file without running checks
./target/release/policrm check --infile members.csv --outfile out.csv --dry-run
```

**Options:**

| Option | Default | Description |
|---|---|---|
| `--infile` | `input.csv` | NationBuilder export CSV |
| `--outfile` | `output.csv` | Output CSV with AEC results |
| `--skip N` | `0` | Skip first N data rows |
| `--threads N` | `1` | Number of parallel browser instances |
| `--headless` | false | Run browsers without a visible window |
| `--dry-run` | false | Validate input only, no AEC checks |
| `--nationbuilder-base` | `https://app.nationbuilder.com` | NationBuilder base URL for member links |

**Note:** Each thread launches its own geckodriver-managed Firefox browser. Ensure geckodriver is running at `http://localhost:4444` before starting.

---

## Address Conversion Utility

Convert NationBuilder CSV addresses to AEC-compatible format:

```bash
./target/release/policrm convert-addresses \
  --infile raw_export.csv \
  --outfile normalized.csv
```

This normalizes state names (e.g., "Victoria" → "VIC") and street types (e.g., "Street" → "ST") to match the AEC website's expected format.

---

## Database Compatibility

The Rust binary uses the **same SQLite schema** and **same Fernet encryption** as the Python version. This means:

- You can use your existing `crm.db` file directly. No data migration is needed.
- The Rust binary reads and writes the encrypted blobs in exactly the same format as Python's `cryptography.fernet`.
- Blind indexes (email hash for member search) use the same SHA-256 + key pepper algorithm.
- Set `DATABASE_URL=sqlite:crm.db` and `ENCRYPTION_KEY=<same-key-as-python>` in `.env`.

If you run migrations (`run_migrations` is called automatically on startup), the `CREATE TABLE IF NOT EXISTS` statements are idempotent — they will not alter or drop any existing data.

---

## API Endpoints

The Rust API is a 1:1 replacement. All endpoints are identical:

| Method | Path | Description |
|---|---|---|
| GET | `/` | Dashboard (HTML) |
| GET | `/login` | Login page (HTML) |
| GET | `/members` | List members |
| POST | `/members` | Create member |
| GET | `/members/:id` | Get member |
| PUT | `/members/:id` | Update member |
| DELETE | `/members/:id` | Delete member (admin) |
| POST | `/members/:id/notes` | Add note |
| POST | `/members/:id/tags/:tag_id` | Add tag |
| DELETE | `/members/:id/tags/:tag_id` | Remove tag |
| POST | `/members/:id/check` | Queue AEC check |
| POST | `/members/upload` | Bulk CSV import |
| GET | `/tags` | List tags |
| POST | `/tags` | Create tag |
| DELETE | `/tags/:id` | Delete tag |
| GET | `/users` | List users (admin) |
| POST | `/users` | Create user (admin) |
| PUT | `/users/:id` | Update user (admin) |
| GET | `/stats/dashboard` | Dashboard statistics |
| GET | `/stats/electorates` | Electorate distribution |

All API endpoints (except HTML views) require `Authorization: Bearer <firebase-token>` header.

---

## Development Tips

- Run with `RUST_LOG=debug` for verbose logging:
  ```bash
  RUST_LOG=debug ./target/release/policrm serve
  ```
- To disable browser pool during development (no geckodriver needed):
  ```bash
  BROWSER_POOL_SIZE=0 cargo run -- serve
  ```
  Note: AEC checks will fail to enqueue, but the REST API will work.
- Tests:
  ```bash
  cd rust && cargo test
  ```
