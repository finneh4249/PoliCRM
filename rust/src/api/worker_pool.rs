use std::collections::HashMap;
use std::sync::Arc;

use anyhow::Result;
use parking_lot::Mutex;
use sqlx::SqlitePool;
use tokio::sync::mpsc;
use tracing::{error, info, warn};

use crate::aec_core::browser::{get_aec_status, get_driver, MAX_RETRIES};
use crate::api::rate_limiter::RateLimiter;
use crate::api::security::Security;

/// A pool of browser workers that consume member IDs and run AEC enrollment checks.
pub struct BrowserPool {
    pool_size: usize,
    headless: bool,
    /// Sender for job channel; None means pool is stopped.
    tx: Arc<Mutex<Option<mpsc::Sender<i64>>>>,
    pub rate_limiter: Arc<RateLimiter>,
}

impl BrowserPool {
    /// Create a new browser pool (not yet started).
    pub fn new(pool_size: usize, headless: bool) -> Self {
        BrowserPool {
            pool_size: pool_size.max(1),
            headless,
            tx: Arc::new(Mutex::new(None)),
            rate_limiter: Arc::new(RateLimiter::new(20, 400)),
        }
    }

    /// Start the worker pool. Spawns `pool_size` async tasks.
    /// Each task creates its own WebDriver instance.
    pub fn start(&self, db_pool: SqlitePool, security: Arc<Security>) {
        let (tx, rx) = mpsc::channel::<i64>(1000);
        {
            let mut guard = self.tx.lock();
            *guard = Some(tx);
        }

        // Wrap rx in Arc<Mutex<>> so it can be shared across tasks
        let rx = Arc::new(tokio::sync::Mutex::new(rx));

        for worker_id in 0..self.pool_size {
            let db = db_pool.clone();
            let sec = Arc::clone(&security);
            let rx_clone = Arc::clone(&rx);
            let headless = self.headless;
            let rate_limiter = Arc::clone(&self.rate_limiter);

            tokio::spawn(async move {
                worker_task(worker_id, db, sec, rx_clone, headless, rate_limiter).await;
            });
        }

        info!("Browser pool started with {} worker(s)", self.pool_size);
    }

    /// Stop the pool by dropping the sender, which causes workers to exit.
    pub fn stop(&self) {
        let mut guard = self.tx.lock();
        *guard = None;
        info!("Browser pool stopped");
    }

    /// Enqueue a member check by member_id.
    pub fn enqueue_check(&self, member_id: i64) -> Result<()> {
        let guard = self.tx.lock();
        if let Some(ref tx) = *guard {
            tx.try_send(member_id).map_err(|e| {
                anyhow::anyhow!("Failed to enqueue check for member {}: {}", member_id, e)
            })?;
            info!("Enqueued check for member {}", member_id);
        } else {
            warn!("Browser pool is stopped — cannot enqueue member {}", member_id);
        }
        Ok(())
    }
}

/// Main loop for a single browser worker.
async fn worker_task(
    worker_id: usize,
    db: SqlitePool,
    security: Arc<Security>,
    rx: Arc<tokio::sync::Mutex<mpsc::Receiver<i64>>>,
    headless: bool,
    rate_limiter: Arc<RateLimiter>,
) {
    // Initialize browser
    let mut driver = match get_driver(headless).await {
        Ok(d) => d,
        Err(e) => {
            error!("Worker {} failed to init browser: {}", worker_id, e);
            return;
        }
    };

    if let Err(e) = driver.goto("https://check.aec.gov.au/").await {
        error!("Worker {} failed initial page load: {}", worker_id, e);
        let _ = driver.quit().await;
        return;
    }

    info!("Worker {} ready", worker_id);

    loop {
        // Receive next member_id
        let member_id = {
            let mut rx_guard = rx.lock().await;
            rx_guard.recv().await
        };

        let member_id = match member_id {
            Some(id) => id,
            None => {
                info!("Worker {} channel closed, exiting.", worker_id);
                break;
            }
        };

        // Enforce rate limits
        rate_limiter.wait_until_can_proceed().await;

        // Check driver is still alive; if not, replace it
        if driver.current_url().await.is_err() {
            warn!("Worker {} driver died, attempting recovery...", worker_id);
            // Clone the session handle so we can still call quit on the old one
            // thirtyfour::WebDriver wraps Arc internally so clone is cheap
            let old_driver = driver.clone();
            let _ = old_driver.quit().await;
            match get_driver(headless).await {
                Ok(d) => {
                    driver = d;
                    if let Err(e) = driver.goto("https://check.aec.gov.au/").await {
                        error!(
                            "Worker {} failed to recover: {}. Dropping job for member {}.",
                            worker_id, e, member_id
                        );
                        continue;
                    }
                }
                Err(e) => {
                    error!(
                        "Worker {} could not reinit browser: {}. Dropping job for member {}.",
                        worker_id, e, member_id
                    );
                    continue;
                }
            }
        }

        // Fetch member from DB
        let member_row = match sqlx::query_as::<_, crate::api::db::MemberRow>(
            "SELECT * FROM members WHERE id = ?",
        )
        .bind(member_id)
        .fetch_optional(&db)
        .await
        {
            Ok(Some(m)) => m,
            Ok(None) => {
                error!("Member {} not found in DB", member_id);
                continue;
            }
            Err(e) => {
                error!("DB error fetching member {}: {}", member_id, e);
                continue;
            }
        };

        // Decrypt PII to build the row map
        let first_name = security.decrypt(&member_row.first_name).unwrap_or_default();
        let middle_name = member_row
            .middle_name
            .as_deref()
            .and_then(|b| security.decrypt(b).ok());
        let last_name = security.decrypt(&member_row.last_name).unwrap_or_default();
        let primary_address1 = security.decrypt(&member_row.primary_address1).unwrap_or_default();
        let primary_city = security.decrypt(&member_row.primary_city).unwrap_or_default();

        let mut row_map: HashMap<String, Option<String>> = HashMap::new();
        row_map.insert("first_name".to_string(), Some(first_name));
        row_map.insert("middle_name".to_string(), middle_name);
        row_map.insert("last_name".to_string(), Some(last_name));
        row_map.insert("nationbuilder_id".to_string(), Some(member_row.nationbuilder_id.to_string()));
        row_map.insert("primary_address1".to_string(), Some(primary_address1));
        row_map.insert("primary_city".to_string(), Some(primary_city));
        row_map.insert("primary_state".to_string(), member_row.primary_state.clone());
        row_map.insert("primary_zip".to_string(), member_row.primary_zip.clone());

        info!(
            "Worker {} checking member {} ({} {})",
            worker_id,
            member_id,
            row_map.get("first_name").and_then(|v| v.as_deref()).unwrap_or("?"),
            row_map.get("last_name").and_then(|v| v.as_deref()).unwrap_or("?")
        );

        // Run the AEC check
        let status = get_aec_status(&driver, &row_map, MAX_RETRIES).await;

        // Persist result
        let result_str = status.result.to_string();
        if let Err(e) = sqlx::query(
            "INSERT INTO check_results (member_id, result, federal_division, state_division, local_government, local_ward) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(member_id)
        .bind(&result_str)
        .bind(&status.federal)
        .bind(&status.state)
        .bind(&status.local_gov)
        .bind(&status.local_ward)
        .execute(&db)
        .await
        {
            error!("Failed to save check result for member {}: {}", member_id, e);
        } else {
            info!(
                "Worker {} — member {}: {} (fed={:?})",
                worker_id, member_id, result_str, status.federal
            );
        }
    }

    let _ = driver.quit().await;
    info!("Worker {} shut down.", worker_id);
}
