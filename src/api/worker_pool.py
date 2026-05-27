import threading
import queue
import time
import random
import logging
from typing import Optional, Dict, Any, Set
from sqlalchemy.orm import Session
from sqlalchemy import func
from .database import SessionLocal, retry_on_lock
from .models import Member, CheckResult
from aec_core.browser import get_driver, getAECStatus, AECResult
from .rate_limiter import RateLimiter
from .era_models import ERARecord, ERAUpload
from .services.era import match_member_to_era, save_era_match, MATCH_THRESHOLD

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# State code mapping (ERA uses single letter codes)
STATE_CODE_MAP = {
    'VIC': 'V', 'V': 'V',
    'NSW': 'N', 'N': 'N',
    'QLD': 'Q', 'Q': 'Q',
    'SA': 'S', 'S': 'S',
    'WA': 'W', 'W': 'W',
    'TAS': 'T', 'T': 'T',
    'NT': 'D', 'D': 'D',
    'ACT': 'A', 'A': 'A',
}

def get_era_available_states(db: Session) -> Set[str]:
    """Get set of state codes that have ERA data loaded."""
    states = db.query(ERARecord.enrolment_state).distinct().all()
    # Return both single-letter and three-letter versions
    result = set()
    for (state,) in states:
        if state:
            result.add(state)
            # Add reverse mapping
            for full, code in STATE_CODE_MAP.items():
                if code == state:
                    result.add(full)
    return result


class BrowserPool:
    """
    Verification pool with split architecture:
    - N ERA workers: Fast, parallel database lookups
    - 1 Browser worker: Slow, rate-limited browser fallback with anti-CAPTCHA measures
    """
    
    def __init__(self, era_workers: int = 4, headless: bool = False):
        self.era_worker_count = era_workers
        self.headless = headless
        
        # Queues
        self.era_queue = queue.Queue()  # Main queue for ERA lookups
        self.browser_queue = queue.Queue()  # Fallback queue for browser checks
        
        # Workers
        self.era_threads = []
        self.browser_thread = None
        self.driver = None
        
        self.running = False
        self.driver_lock = threading.Lock()
        
        # Rate limiter for browser (reduced to avoid CAPTCHA)
        self.rate_limiter = RateLimiter(max_per_hour=40, max_per_day=500)
        
        # Tracking
        self.queued_items = set()
        self.worker_status = {}
        self.worker_last_activity = {}
        self.watchdog_thread = None
        
        # Anti-CAPTCHA settings
        self.min_delay = 8  # Minimum seconds between browser checks
        self.max_delay = 20  # Maximum seconds between browser checks
        self.checks_before_refresh = 10  # Refresh browser after N checks

    # Keep pool_size for backwards compatibility with status calls
    @property
    def pool_size(self):
        return self.era_worker_count + 1  # ERA workers + 1 browser worker

    def start(self):
        """Start the worker threads."""
        self.running = True
        
        # Start ERA workers (fast, parallel)
        for i in range(self.era_worker_count):
            t = threading.Thread(target=self._era_worker_loop, args=(i,), daemon=True)
            t.start()
            self.era_threads.append(t)
            logger.info(f"ERA Worker {i} started")
        
        # Start single browser worker (slow, rate-limited)
        self.browser_thread = threading.Thread(target=self._browser_worker_loop, daemon=True)
        self.browser_thread.start()
        logger.info("Browser Worker started (single, rate-limited)")
        
        # Start watchdog
        self.watchdog_thread = threading.Thread(target=self._watchdog_loop, daemon=True)
        self.watchdog_thread.start()
        
        logger.info(f"Verification pool started: {self.era_worker_count} ERA workers + 1 browser worker")

    def stop(self):
        """Stop the worker threads and close drivers."""
        self.running = False
        
        # Unblock ERA queues
        for _ in range(self.era_worker_count):
            self.era_queue.put(None)
        
        # Unblock browser queue
        self.browser_queue.put(None)
        
        for t in self.era_threads:
            t.join(timeout=2)
            
        if self.browser_thread:
            self.browser_thread.join(timeout=5)
            
        if self.watchdog_thread:
            self.watchdog_thread.join(timeout=2)
        
        with self.driver_lock:
            if self.driver:
                try:
                    self.driver.quit()
                except Exception:
                    pass
                self.driver = None
        
        logger.info("Verification pool stopped")

    def enqueue_check(self, member_id: int):
        """Add a check job to the ERA queue."""
        if member_id in self.queued_items:
            return
            
        self.queued_items.add(member_id)
        self.era_queue.put(member_id)
        logger.debug(f"Enqueued check for member {member_id}")

    def _init_driver(self):
        """Initialize a browser driver with anti-detection measures."""
        try:
            driver = get_driver(headless=self.headless)
            driver.get("https://check.aec.gov.au/")
            time.sleep(2)  # Let page load fully
            return driver
        except Exception as e:
            logger.error(f"Failed to initialize driver: {e}")
            return None

    def _era_worker_loop(self, worker_id: int):
        """Fast ERA-only worker loop."""
        worker_name = f"era_{worker_id}"
        self.worker_status[worker_name] = {"status": "idle", "member_id": None, "member_name": None, "type": "era"}
        self.worker_last_activity[worker_name] = time.time()
        
        while self.running:
            try:
                member_id = self.era_queue.get(timeout=1)
                if member_id is None:
                    break
            except queue.Empty:
                continue

            db = None
            try:
                db = SessionLocal()
                member = db.query(Member).filter(Member.id == member_id).first()
                
                if not member:
                    logger.error(f"ERA Worker {worker_id}: Member {member_id} not found")
                    continue

                self.worker_status[worker_name] = {
                    "status": "checking",
                    "member_id": member.id,
                    "member_name": f"{member.first_name} {member.last_name}",
                    "type": "era"
                }
                self.worker_last_activity[worker_name] = time.time()

                # Check if ERA data is available for this member's state
                member_state = (member.primary_state or "").upper()
                era_states = get_era_available_states(db)
                use_era = member_state in era_states
                
                if use_era:
                    # ERA matching
                    era_result = match_member_to_era(db, member, threshold=MATCH_THRESHOLD)
                    
                    if era_result and era_result.overall_score >= MATCH_THRESHOLD:
                        # ERA match found - save it
                        save_era_match(db, member.id, era_result)
                        
                        # Create CheckResult from ERA data
                        result_status = "Pass" if era_result.overall_score >= 90 else "Partial"
                        result = CheckResult(
                            member_id=member.id,
                            result=result_status,
                            federal_division=era_result.federal_division,
                            state_division=era_result.state_district,
                            local_government=era_result.local_government_area,
                            verification_method='era'
                        )
                        self._save_result(db, result)
                        logger.info(f"ERA Worker {worker_id}: Match for member {member_id}: {era_result.overall_score}% -> {result_status}")
                        self.worker_status[worker_name] = {"status": "idle", "member_id": None, "member_name": None, "type": "era"}
                        self.worker_last_activity[worker_name] = time.time()
                        continue  # Done with this member
                
                # No ERA match or no ERA data - fall back to browser
                logger.info(f"ERA Worker {worker_id}: No ERA match for member {member_id}, routing to browser queue")
                self.browser_queue.put(member_id)
                # Don't remove from queued_items yet - browser will handle that
                self.worker_status[worker_name] = {"status": "idle", "member_id": None, "member_name": None, "type": "era"}
                self.worker_last_activity[worker_name] = time.time()

            except Exception as e:
                logger.error(f"ERA Worker {worker_id} error: {e}")
                # Put back in queue for retry
                self.era_queue.put(member_id)
            finally:
                if db:
                    db.close()
                self.era_queue.task_done()
        
        if worker_name in self.worker_status:
            del self.worker_status[worker_name]

    def _browser_worker_loop(self):
        """Single browser worker with anti-CAPTCHA measures."""
        worker_name = "browser_0"
        self.worker_status[worker_name] = {"status": "idle", "member_id": None, "member_name": None, "type": "browser"}
        self.worker_last_activity[worker_name] = time.time()
        
        driver = self._init_driver()
        if driver:
            with self.driver_lock:
                self.driver = driver
        
        logger.info("Browser Worker ready")
        checks_since_refresh = 0
        
        while self.running:
            try:
                member_id = self.browser_queue.get(timeout=1)
                if member_id is None:
                    break
            except queue.Empty:
                continue

            # Rate limit
            self.rate_limiter.wait_until_can_proceed()
            
            # Anti-CAPTCHA: Random delay before each check
            delay = random.uniform(self.min_delay, self.max_delay)
            logger.debug(f"Browser Worker: Waiting {delay:.1f}s before check (anti-CAPTCHA)")
            time.sleep(delay)

            db = None
            try:
                db = SessionLocal()
                member = db.query(Member).filter(Member.id == member_id).first()
                
                if not member:
                    logger.error(f"Browser Worker: Member {member_id} not found")
                    continue

                logger.info(f"Browser Worker: Checking {member.first_name} {member.last_name}")
                self.worker_status[worker_name] = {
                    "status": "checking",
                    "member_id": member.id,
                    "member_name": f"{member.first_name} {member.last_name}",
                    "type": "browser"
                }
                self.worker_last_activity[worker_name] = time.time()

                # Check if driver is alive
                try:
                    driver.current_url
                except Exception:
                    logger.warning("Browser Worker: Driver died, restarting...")
                    try:
                        driver.quit()
                    except:
                        pass
                    driver = self._init_driver()
                    if not driver:
                        logger.error("Browser Worker: Failed to restart driver")
                        self.browser_queue.put(member_id)  # Re-queue
                        time.sleep(10)
                        continue
                    with self.driver_lock:
                        self.driver = driver
                    checks_since_refresh = 0

                # Prepare data for getAECStatus
                member_dict = {
                    "first_name": member.first_name,
                    "middle_name": member.middle_name,
                    "last_name": member.last_name,
                    "nationbuilder_id": str(member.nationbuilder_id),
                    "primary_address1": member.primary_address1,
                    "primary_address2": member.primary_address2,
                    "primary_address3": member.primary_address3,
                    "primary_city": member.primary_city,
                    "primary_state": member.primary_state,
                    "primary_zip": member.primary_zip,
                }

                # Run the browser check
                status = getAECStatus(driver, member_dict)
                checks_since_refresh += 1
                
                # Save result
                result = CheckResult(
                    member_id=member.id,
                    result=status.result.value,
                    federal_division=status.federal,
                    state_division=status.state,
                    local_government=status.local_gov,
                    local_ward=status.local_ward,
                    verification_method='browser'
                )

                self._save_result(db, result)
                logger.info(f"Browser Worker: Check completed for member {member_id}: {status.result}")
                self.worker_status[worker_name] = {"status": "idle", "member_id": None, "member_name": None, "type": "browser"}
                self.worker_last_activity[worker_name] = time.time()
                
                # Anti-CAPTCHA: Periodic session refresh
                if checks_since_refresh >= self.checks_before_refresh:
                    logger.info("Browser Worker: Refreshing session (anti-CAPTCHA)")
                    try:
                        driver.quit()
                    except:
                        pass
                    time.sleep(random.uniform(5, 10))
                    driver = self._init_driver()
                    if driver:
                        with self.driver_lock:
                            self.driver = driver
                    checks_since_refresh = 0

            except Exception as e:
                logger.error(f"Browser Worker error: {e}")
            finally:
                if db:
                    db.close()
                self.queued_items.discard(member_id)
                self.browser_queue.task_done()
        
        # Cleanup
        if driver:
            try:
                driver.quit()
            except:
                pass
        
        if worker_name in self.worker_status:
            del self.worker_status[worker_name]

    def get_status(self):
        """Get the current status of the pool."""
        return {
            "era_queue_size": self.era_queue.qsize(),
            "browser_queue_size": self.browser_queue.qsize(),
            "queued_items": list(self.queued_items),
            "workers": self.worker_status,
            "pool_size": self.pool_size,
            "era_workers": self.era_worker_count,
            "browser_workers": 1
        }

    def _watchdog_loop(self):
        """Monitor workers and restart stuck ones."""
        logger.info("Watchdog started")
        while self.running:
            try:
                current_time = time.time()
                for worker_name in list(self.worker_status.keys()):
                    last_active = self.worker_last_activity.get(worker_name, current_time)
                    status = self.worker_status.get(worker_name, {}).get("status")
                    worker_type = self.worker_status.get(worker_name, {}).get("type")
                    
                    # Different timeout for different worker types
                    timeout = 300 if worker_type == "era" else 600  # ERA: 5 min, Browser: 10 min
                    
                    if status == "checking" and (current_time - last_active) > timeout:
                        logger.warning(f"Worker {worker_name} stuck for > {timeout}s")
                        
                        if worker_type == "browser":
                            # Kill browser driver
                            with self.driver_lock:
                                if self.driver:
                                    try:
                                        self.driver.quit()
                                    except Exception:
                                        pass
                        
            except Exception as e:
                logger.error(f"Watchdog error: {e}")
            
            time.sleep(60)

    @retry_on_lock()
    def _save_result(self, db: Session, result: CheckResult):
        """Save result to database with retry logic."""
        db.add(result)
        db.commit()


