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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_rate_limiter_allows_first_request() {
        let rl = RateLimiter::new(10, 100);
        assert!(rl.can_proceed(), "First request should be allowed");
    }

    #[test]
    fn test_rate_limiter_respects_hourly_limit() {
        let rl = RateLimiter::new(3, 1000);
        assert!(rl.can_proceed()); // 1
        assert!(rl.can_proceed()); // 2
        assert!(rl.can_proceed()); // 3
        assert!(!rl.can_proceed()); // 4 — should be blocked
    }

    #[test]
    fn test_rate_limiter_respects_daily_limit() {
        let rl = RateLimiter::new(1000, 2);
        assert!(rl.can_proceed()); // 1
        assert!(rl.can_proceed()); // 2
        assert!(!rl.can_proceed()); // 3 — daily limit hit
    }

    #[test]
    fn test_rate_limiter_blocked_by_tighter_limit() {
        // hourly=2, daily=10 — hourly is tighter
        let rl = RateLimiter::new(2, 10);
        assert!(rl.can_proceed());
        assert!(rl.can_proceed());
        assert!(!rl.can_proceed()); // blocked by hourly
    }

    #[test]
    fn test_rate_limiter_zero_hourly_limit_always_blocks() {
        let rl = RateLimiter::new(0, 1000);
        assert!(!rl.can_proceed());
    }

    #[test]
    fn test_rate_limiter_zero_daily_limit_always_blocks() {
        let rl = RateLimiter::new(1000, 0);
        assert!(!rl.can_proceed());
    }

    #[test]
    fn test_rate_limiter_clone_shares_state() {
        let rl = RateLimiter::new(3, 100);
        let rl2 = rl.clone();

        // Use up all 3 slots via rl
        assert!(rl.can_proceed());
        assert!(rl.can_proceed());
        assert!(rl.can_proceed());

        // rl2 should see the shared state and be blocked
        assert!(!rl2.can_proceed());
    }

    #[test]
    fn test_rate_limiter_clone_is_same_limits() {
        let rl = RateLimiter::new(5, 50);
        let rl2 = rl.clone();
        assert_eq!(rl2.max_per_hour, 5);
        assert_eq!(rl2.max_per_day, 50);
    }

    #[test]
    fn test_rate_limiter_large_limits_allow_many_requests() {
        let rl = RateLimiter::new(1000, 10000);
        for _ in 0..500 {
            assert!(rl.can_proceed());
        }
    }

    #[test]
    fn test_rate_limiter_blocked_does_not_record() {
        // With limit 1, only the first call should be recorded
        let rl = RateLimiter::new(1, 100);
        assert!(rl.can_proceed());  // recorded
        assert!(!rl.can_proceed()); // blocked — not recorded

        // Count should still be 1 (the blocked call was not recorded)
        assert_eq!(rl.hour_count(), 1);
    }
}
