use std::sync::Arc;
use std::time::{Duration, Instant};

use sqlx::SqlitePool;
use tokio::sync::Mutex;
use tracing::{error, info};

use crate::api::worker_pool::BrowserPool;

/// Interval between unchecked-member sweeps.
const SWEEP_INTERVAL: Duration = Duration::from_secs(30);

/// Interval between retries of failed/captcha members.
const RETRY_INTERVAL: Duration = Duration::from_secs(3600); // 1 hour

/// Background daemon that automatically queues unchecked members for AEC verification
/// and periodically retries failed or captcha-blocked members.
pub struct AutoCheckDaemon {
    pool: SqlitePool,
    browser_pool: Arc<BrowserPool>,
    running: Arc<Mutex<bool>>,
}

impl AutoCheckDaemon {
    pub fn new(pool: SqlitePool, browser_pool: Arc<BrowserPool>) -> Self {
        AutoCheckDaemon {
            pool,
            browser_pool,
            running: Arc::new(Mutex::new(false)),
        }
    }

    /// Start the daemon in a background tokio task.
    pub fn start(self: Arc<Self>) {
        let daemon = Arc::clone(&self);
        tokio::spawn(async move {
            daemon.run().await;
        });
    }

    /// Signal the daemon to stop.
    pub async fn stop(&self) {
        let mut running = self.running.lock().await;
        *running = false;
        info!("AutoCheckDaemon stop signal sent.");
    }

    async fn run(&self) {
        {
            let mut running = self.running.lock().await;
            *running = true;
        }
        info!("AutoCheckDaemon started");

        let mut last_retry = Instant::now();

        loop {
            // Check if we should keep running
            {
                let running = self.running.lock().await;
                if !*running {
                    break;
                }
            }

            // 1. Find and queue unchecked members
            if let Err(e) = self.queue_unchecked_members().await {
                error!("Daemon error queuing unchecked members: {}", e);
            }

            // 2. Periodically retry failed/captcha/incomplete members
            if last_retry.elapsed() >= RETRY_INTERVAL {
                if let Err(e) = self.queue_retry_members().await {
                    error!("Daemon error queuing retry members: {}", e);
                }
                last_retry = Instant::now();
            }

            tokio::time::sleep(SWEEP_INTERVAL).await;
        }

        info!("AutoCheckDaemon stopped.");
    }

    /// Queue all members that have never had a check result.
    async fn queue_unchecked_members(&self) -> anyhow::Result<()> {
        let unchecked: Vec<(i64,)> = sqlx::query_as(
            "SELECT id FROM members WHERE id NOT IN (SELECT DISTINCT member_id FROM check_results)",
        )
        .fetch_all(&self.pool)
        .await?;

        if !unchecked.is_empty() {
            info!("Daemon found {} unchecked member(s)", unchecked.len());
            for (member_id,) in unchecked {
                if let Err(e) = self.browser_pool.enqueue_check(member_id) {
                    error!("Daemon failed to enqueue member {}: {}", member_id, e);
                }
            }
        }

        Ok(())
    }

    /// Queue members whose latest check result is Captcha, Fail variant,
    /// or a Pass with missing electorate information.
    async fn queue_retry_members(&self) -> anyhow::Result<()> {
        info!("Daemon performing periodic retry sweep...");

        // Get latest check result per member using a subquery
        let retry_rows: Vec<(i64,)> = sqlx::query_as(
            r#"
            SELECT cr.member_id
            FROM check_results cr
            INNER JOIN (
                SELECT member_id, MAX(timestamp) AS max_ts
                FROM check_results
                GROUP BY member_id
            ) latest ON cr.member_id = latest.member_id AND cr.timestamp = latest.max_ts
            WHERE cr.result IN ('Captcha', 'Fail', 'Fail_Suburb', 'Fail_Street', 'Fail_No_Match')
               OR (cr.result = 'Pass' AND (cr.federal_division IS NULL OR cr.federal_division = ''))
            "#,
        )
        .fetch_all(&self.pool)
        .await?;

        if !retry_rows.is_empty() {
            info!("Daemon retrying {} failed/captcha/incomplete member(s)", retry_rows.len());
            for (member_id,) in retry_rows {
                if let Err(e) = self.browser_pool.enqueue_check(member_id) {
                    error!("Daemon failed to enqueue retry for member {}: {}", member_id, e);
                }
            }
        }

        Ok(())
    }
}
