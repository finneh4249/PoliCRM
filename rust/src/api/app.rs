use std::sync::Arc;

use anyhow::Result;
use axum::Router;
use sqlx::SqlitePool;
use tower_http::{cors::CorsLayer, services::ServeDir, trace::TraceLayer};
use tracing::{info, warn};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::api::auth::FirebaseAuth;
use crate::api::daemon::AutoCheckDaemon;
use crate::api::db::{create_pool, run_migrations};
use crate::api::routes;
use crate::api::security::{generate_fernet_key, get_or_create_key, Security};
use crate::api::worker_pool::BrowserPool;

/// Shared application state injected into Axum handlers via `State<AppState>`.
/// AppState is Clone so axum provides `FromRef<AppState> for AppState` automatically.
#[derive(Clone)]
pub struct AppState {
    pub db: SqlitePool,
    pub security: Arc<Security>,
    pub browser_pool: Arc<BrowserPool>,
    pub firebase_auth: Arc<FirebaseAuth>,
}

/// Start the Axum web server.
pub async fn run_server() -> Result<()> {
    // Load .env if present
    let _ = dotenvy::dotenv();

    // Init tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "policrm=info,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Database
    let database_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "sqlite:crm.db".to_string());
    info!("Connecting to database: {}", database_url);
    let db = create_pool(&database_url).await?;
    run_migrations(&db).await?;
    info!("Database migrations applied");

    // Security (Fernet encryption key)
    let encryption_key = get_or_create_key("ENCRYPTION_KEY", generate_fernet_key);
    let security = Arc::new(Security::new(&encryption_key)?);
    info!("Encryption key loaded");

    // Browser pool (headless by default in server mode)
    let headless = std::env::var("HEADLESS")
        .map(|v| v.to_lowercase() == "true")
        .unwrap_or(true);
    let pool_size: usize = std::env::var("BROWSER_POOL_SIZE")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(2);

    let browser_pool = Arc::new(BrowserPool::new(pool_size, headless));
    browser_pool.start(db.clone(), Arc::clone(&security));
    info!("Browser pool started ({} workers, headless={})", pool_size, headless);

    // Auto-check daemon
    let daemon = Arc::new(AutoCheckDaemon::new(db.clone(), Arc::clone(&browser_pool)));
    daemon.clone().start();
    info!("Auto-check daemon started");

    // Firebase auth
    let project_id = std::env::var("FIREBASE_PROJECT_ID").unwrap_or_default();
    if project_id.is_empty() {
        warn!("FIREBASE_PROJECT_ID not set — running in dev mode (no token verification)");
    }
    let firebase_auth = Arc::new(FirebaseAuth::new(&project_id));

    let state = AppState {
        db: db.clone(),
        security,
        browser_pool: Arc::clone(&browser_pool),
        firebase_auth,
    };

    // Seed initial admin users if DB is empty
    seed_initial_users(&db).await;

    // Static file directory (relative to CWD or from env)
    let static_dir = std::env::var("STATIC_DIR")
        .unwrap_or_else(|_| "src/api/static".to_string());
    let _templates_dir = std::env::var("TEMPLATES_DIR")
        .unwrap_or_else(|_| "src/api/templates".to_string());

    // Build router
    let app = Router::new()
        .nest_service("/static", ServeDir::new(&static_dir))
        .merge(routes::create_router())
        .layer(TraceLayer::new_for_http())
        .layer(
            CorsLayer::new()
                .allow_origin(tower_http::cors::Any)
                .allow_methods(tower_http::cors::Any)
                .allow_headers(tower_http::cors::Any),
        )
        .with_state(state);

    // Bind and serve
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(8000);
    let addr = format!("0.0.0.0:{}", port);
    info!("PoliCRM server listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    // Cleanup on shutdown
    browser_pool.stop();

    Ok(())
}

/// Seed initial admin users if the users table is empty.
async fn seed_initial_users(db: &SqlitePool) {
    let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users")
        .fetch_one(db)
        .await
        .unwrap_or((0,));

    if count.0 == 0 {
        info!("Seeding initial admin users...");
        let initial_users = [
            "miles@fusionparty.org.au",
            "drew@fusionparty.org.au",
            "admin@fusionparty.org.au",
        ];
        for email in &initial_users {
            if let Err(e) = sqlx::query(
                "INSERT OR IGNORE INTO users (email, role, is_active) VALUES (?, 'admin', 1)",
            )
            .bind(email)
            .execute(db)
            .await
            {
                tracing::error!("Failed to seed user {}: {}", email, e);
            } else {
                info!("Seeded admin user: {}", email);
            }
        }
    }
}
