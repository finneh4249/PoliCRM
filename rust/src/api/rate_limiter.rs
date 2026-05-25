use std::collections::VecDeque;
use std::sync::Arc;
use std::time::Instant;

use parking_lot::Mutex;
use tracing::info;

/// Sliding-window rate limiter with per-hour and per-day limits.
pub struct RateLimiter {
    max_per_hour: usize,
    max_per_day: usize,
    hour_window: Arc<Mutex<VecDeque<Instant>>>,
    day_window: Arc<Mutex<VecDeque<Instant>>>,
}

impl RateLimiter {
    /// Create a new rate limiter with the given hourly and daily limits.
    pub fn new(max_per_hour: usize, max_per_day: usize) -> Self {
        RateLimiter {
            max_per_hour,
            max_per_day,
            hour_window: Arc::new(Mutex::new(VecDeque::new())),
            day_window: Arc::new(Mutex::new(VecDeque::new())),
        }
    }

    /// Check if a request can proceed now.
    /// If yes, records the request and returns `true`.
    /// If no, returns `false` without recording.
    pub fn can_proceed(&self) -> bool {
        let now = Instant::now();

        let mut hour = self.hour_window.lock();
        let mut day = self.day_window.lock();

        // Evict expired entries
        let hour_cutoff = now - std::time::Duration::from_secs(3600);
        while hour.front().map(|t| *t < hour_cutoff).unwrap_or(false) {
            hour.pop_front();
        }

        let day_cutoff = now - std::time::Duration::from_secs(86400);
        while day.front().map(|t| *t < day_cutoff).unwrap_or(false) {
            day.pop_front();
        }

        // Check limits
        if hour.len() >= self.max_per_hour {
            return false;
        }
        if day.len() >= self.max_per_day {
            return false;
        }

        // Record this request
        hour.push_back(now);
        day.push_back(now);

        true
    }

    /// Async-sleep until a request slot is available, then claim it.
    pub async fn wait_until_can_proceed(&self) {
        loop {
            let wait_ms = self.next_wait_ms();
            if wait_ms == 0 {
                return;
            }
            info!(
                "Rate limit reached ({}/hr, {}/day). Waiting {}ms...",
                self.hour_count(),
                self.day_count(),
                wait_ms
            );
            tokio::time::sleep(std::time::Duration::from_millis(wait_ms)).await;
        }
    }

    /// Returns how many milliseconds to sleep before retrying.
    /// Returns 0 if the request can proceed immediately.
    fn next_wait_ms(&self) -> u64 {
        let now = Instant::now();

        let mut hour = self.hour_window.lock();
        let mut day = self.day_window.lock();

        // Evict expired
        let hour_cutoff = now - std::time::Duration::from_secs(3600);
        while hour.front().map(|t| *t < hour_cutoff).unwrap_or(false) {
            hour.pop_front();
        }
        let day_cutoff = now - std::time::Duration::from_secs(86400);
        while day.front().map(|t| *t < day_cutoff).unwrap_or(false) {
            day.pop_front();
        }

        if hour.len() < self.max_per_hour && day.len() < self.max_per_day {
            // Can proceed — record and return 0
            hour.push_back(now);
            day.push_back(now);
            return 0;
        }

        // Calculate how long until the oldest entry expires
        let mut wait_secs = 60u64; // default

        if hour.len() >= self.max_per_hour {
            if let Some(oldest) = hour.front() {
                let age = now.duration_since(*oldest);
                let remaining = std::time::Duration::from_secs(3600).saturating_sub(age);
                wait_secs = wait_secs.min(remaining.as_secs().max(1));
            }
        }

        if day.len() >= self.max_per_day {
            if let Some(oldest) = day.front() {
                let age = now.duration_since(*oldest);
                let remaining = std::time::Duration::from_secs(86400).saturating_sub(age);
                wait_secs = wait_secs.min(remaining.as_secs().max(1));
            }
        }

        wait_secs * 1000
    }

    fn hour_count(&self) -> usize {
        self.hour_window.lock().len()
    }

    fn day_count(&self) -> usize {
        self.day_window.lock().len()
    }
}

impl Clone for RateLimiter {
    fn clone(&self) -> Self {
        RateLimiter {
            max_per_hour: self.max_per_hour,
            max_per_day: self.max_per_day,
            hour_window: Arc::clone(&self.hour_window),
            day_window: Arc::clone(&self.day_window),
        }
    }
}
