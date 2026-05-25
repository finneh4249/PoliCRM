import time
from collections import deque
from threading import Lock
import logging

logger = logging.getLogger(__name__)

class RateLimiter:
    def __init__(self, max_per_hour=100, max_per_day=2000):
        self.max_per_hour = max_per_hour
        self.max_per_day = max_per_day
        self.hour_window = deque()
        self.day_window = deque()
        self.lock = Lock()
    
    def can_proceed(self):
        with self.lock:
            now = time.time()
            
            # Clean old entries
            while self.hour_window and now - self.hour_window[0] > 3600:
                self.hour_window.popleft()
            while self.day_window and now - self.day_window[0] > 86400:
                self.day_window.popleft()
            
            # Check limits
            if len(self.hour_window) >= self.max_per_hour:
                return False
            if len(self.day_window) >= self.max_per_day:
                return False
            
            # Record this request
            self.hour_window.append(now)
            self.day_window.append(now)
            return True
    
    def wait_until_can_proceed(self):
        """Blocks until a request can be made."""
        while True:
            if self.can_proceed():
                return
            
            # Calculate wait time
            with self.lock:
                now = time.time()
                wait_time = 60 # Default wait
                
                if len(self.hour_window) >= self.max_per_hour:
                    # Wait until the oldest in hour window expires
                    wait_time = max(1, 3600 - (now - self.hour_window[0]))
                
                logger.info(f"Rate limit reached ({len(self.hour_window)}/hr, {len(self.day_window)}/day). Sleeping {wait_time:.1f}s...")
            
            time.sleep(wait_time)
