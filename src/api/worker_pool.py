import threading
import queue
import time
import logging
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy.orm import Session
from .database import SessionLocal, retry_on_lock
from .models import Member, CheckResult
from aec_core.browser import get_driver, getAECStatus, AECResult
from .rate_limiter import RateLimiter

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BrowserPool:
    def __init__(self, pool_size: int = 2, headless: bool = False):
        self.pool_size = pool_size
        self.headless = headless
        self.job_queue = queue.Queue()
        self.drivers = []
        self.threads = []
        self.running = False
        self.running = False
        self.driver_lock = threading.Lock()
        # Initialize rate limiter (100/hr, 2000/day)
        self.rate_limiter = RateLimiter(max_per_hour=100, max_per_day=2000)
        self.queued_items = set()
        self.worker_status = {}
        self.worker_last_activity = {}
        self.watchdog_thread = None


    def start(self):
        """Start the worker threads."""
        self.running = True
        for i in range(self.pool_size):
            t = threading.Thread(target=self._worker_loop, args=(i,), daemon=True)
            t.start()
            self.threads.append(t)
        
        # Start watchdog
        self.watchdog_thread = threading.Thread(target=self._watchdog_loop, daemon=True)
        self.watchdog_thread.start()
        
        logger.info(f"Browser pool started with {self.pool_size} workers and watchdog")

    def stop(self):
        """Stop the worker threads and close drivers."""
        self.running = False
        # Unblock queues
        for _ in range(self.pool_size):
            self.job_queue.put(None)
        
        for t in self.threads:
            t.join()
            
        if self.watchdog_thread:
            self.watchdog_thread.join()
        
        with self.driver_lock:
            for driver in self.drivers:
                try:
                    driver.quit()
                except Exception:
                    pass
            self.drivers = []
        logger.info("Browser pool stopped")

    def enqueue_check(self, member_id: int):
        """Add a check job to the queue."""
        if member_id in self.queued_items:
            return
            
        self.queued_items.add(member_id)
        self.job_queue.put(member_id)
        logger.debug(f"Enqueued check for member {member_id}")

    def _init_driver(self):
        """Initialize a single driver."""
        try:
            driver = get_driver(headless=self.headless)
            driver.get("https://check.aec.gov.au/")
            return driver
        except Exception as e:
            logger.error(f"Failed to initialize driver: {e}")
            return None

    def _worker_loop(self, worker_id: int):
        """Main loop for each worker thread."""
        driver = self._init_driver()
        if driver:
            with self.driver_lock:
                self.drivers.append(driver)
        
        logger.info(f"Worker {worker_id} ready")
        self.worker_status[worker_id] = {"status": "idle", "member_id": None, "member_name": None}
        self.worker_last_activity[worker_id] = time.time()

        while self.running:
            try:
                member_id = self.job_queue.get(timeout=1)
                if member_id is None:
                    break
            except queue.Empty:
                continue

            # Wait for rate limit before processing
            self.rate_limiter.wait_until_can_proceed()

            try:
                # Create a new DB session for this job
                db = SessionLocal()
                member = db.query(Member).filter(Member.id == member_id).first()
                
                if not member:
                    logger.error(f"Member {member_id} not found")
                    continue

                logger.info(f"Worker {worker_id} checking member {member.first_name} {member.last_name}")
                self.worker_status[worker_id] = {
                    "status": "checking",
                    "member_id": member.id,
                    "member_name": f"{member.first_name} {member.last_name}"
                }
                self.worker_last_activity[worker_id] = time.time()

                # Prepare data for getAECStatus
                # It expects a dict with specific keys
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

                # Check if driver is alive
                try:
                    driver.current_url
                except Exception:
                    logger.warning(f"Worker {worker_id} driver died, restarting...")
                    try:
                        driver.quit()
                    except:
                        pass
                    driver = self._init_driver()
                    if not driver:
                        logger.error(f"Worker {worker_id} failed to restart driver")
                        self.job_queue.put(member_id) # Re-queue
                        time.sleep(5)
                        continue

                # Run the check
                status = getAECStatus(driver, member_dict)
                
                # Save result
                result = CheckResult(
                    member_id=member.id,
                    result=status.result.value,
                    federal_division=status.federal,
                    state_division=status.state,
                    local_government=status.local_gov,
                    local_ward=status.local_ward
                )

                # Save result with retry logic
                self._save_result(db, result)
                logger.info(f"Worker {worker_id} finished member {member_id}: {status.result}")
                self.worker_status[worker_id] = {"status": "idle", "member_id": None, "member_name": None}
                self.worker_last_activity[worker_id] = time.time()

            except Exception as e:
                logger.error(f"Worker {worker_id} error: {e}")
            finally:
                db.close()
                self.queued_items.discard(member_id)
                self.job_queue.task_done()
        
        # Cleanup this worker's driver
        if driver:
            try:
                driver.quit()
            except:
                pass
        
        if worker_id in self.worker_status:
            del self.worker_status[worker_id]

    def get_status(self):
        """Get the current status of the pool."""
        return {
            "queue_size": self.job_queue.qsize(),
            "queued_items": list(self.queued_items),
            "workers": self.worker_status,
            "pool_size": self.pool_size
        }

    def _watchdog_loop(self):
        """Monitor workers and restart stuck ones."""
        logger.info("Watchdog started")
        while self.running:
            try:
                current_time = time.time()
                for worker_id in list(self.worker_status.keys()):
                    last_active = self.worker_last_activity.get(worker_id, current_time)
                    status = self.worker_status.get(worker_id, {}).get("status")
                    
                    # If worker is checking and hasn't updated activity in 5 minutes
                    if status == "checking" and (current_time - last_active) > 300:
                        logger.warning(f"Worker {worker_id} stuck for > 5 mins. Restarting...")
                        
                        # Attempt to close driver
                        with self.driver_lock:
                            if worker_id < len(self.drivers):
                                try:
                                    self.drivers[worker_id].quit()
                                except Exception:
                                    pass
                                # We don't remove from list here to avoid index issues, 
                                # the worker loop handles its own driver lifecycle mostly,
                                # but we might need a way to signal the thread to die.
                                # Since threads are hard to kill in Python, we'll rely on
                                # the driver.quit() causing an exception in the worker loop
                                # if it's interacting with the driver.
                        
                        # Note: True thread killing is hard. 
                        # Ideally we'd set a flag that the worker checks.
                        # For now, we just log it. A robust solution requires multiprocessing.
                        # However, if the driver is killed, the selenium call should throw 
                        # an exception and the worker loop should catch it and restart.
                        
            except Exception as e:
                logger.error(f"Watchdog error: {e}")
            
            time.sleep(60)

    @retry_on_lock()
    def _save_result(self, db: Session, result: CheckResult):
        """Save result to database with retry logic."""
        db.add(result)
        db.commit()

