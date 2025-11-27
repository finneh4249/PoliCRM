import threading
import time
import logging
from sqlalchemy import func
from ..database import SessionLocal
from ..models import Member, CheckResult
from ..dependencies import browser_pool

logger = logging.getLogger(__name__)

auto_check_daemon_running = False
auto_check_thread = None

def auto_check_daemon():
    """Background daemon that automatically queues unchecked, failed, and captcha members."""
    global auto_check_daemon_running
    logger.info("Auto-check daemon started")
    
    retry_interval_minutes = 60
    last_retry_check = time.time()
    
    while auto_check_daemon_running:
        try:
            db = SessionLocal()
            current_time = time.time()
            
            # 1. Find all members that have never been checked
            # Use explicit select() to avoid SAWarning about coercing subquery
            stmt = db.query(CheckResult.member_id).distinct()
            unchecked_members = db.query(Member).filter(
                ~Member.id.in_(stmt)
            ).all()
            
            if unchecked_members:
                logger.info(f"Auto-check daemon found {len(unchecked_members)} unchecked members")
                for member in unchecked_members:
                    try:
                        browser_pool.enqueue_check(member.id)
                        logger.debug(f"Auto-queued unchecked member {member.id}")
                    except Exception as e:
                        logger.error(f"Failed to auto-queue member {member.id}: {e}")
            
            # 2. Continuously retry failed, partial, and captcha members
            # We rely on browser_pool.queued_items to prevent duplicate queuing
            logger.debug("Auto-check daemon checking for failed/partial/captcha members to retry")
            
            # Subquery to get the latest check result for each member
            latest_checks = db.query(
                CheckResult.member_id,
                func.max(CheckResult.timestamp).label('max_timestamp')
            ).group_by(CheckResult.member_id).subquery()
            
            # Get members whose latest check was Captcha, Fail, Partial, or Pass without electorate details
            retry_results = db.query(CheckResult).join(
                latest_checks,
                (CheckResult.member_id == latest_checks.c.member_id) &
                (CheckResult.timestamp == latest_checks.c.max_timestamp)
            ).filter(
                (CheckResult.result.in_(['Captcha', 'Fail', 'Fail_Suburb', 'Fail_Street', 'Fail_No_Match', 'Partial'])) |
                ((CheckResult.result == 'Pass') & ((CheckResult.federal_division == None) | (CheckResult.federal_division == '')))
            ).all()
            
            if retry_results:
                logger.info(f"Auto-check daemon found {len(retry_results)} members to retry")
                for result in retry_results:
                    try:
                        member = db.query(Member).filter(Member.id == result.member_id).first()
                        if member:
                            browser_pool.enqueue_check(member.id)
                    except Exception as e:
                        logger.error(f"Failed to auto-queue retry for member {result.member_id}: {e}")
            
            db.close()
            time.sleep(30)
            
        except Exception as e:
            logger.error(f"Auto-check daemon error: {e}")
            time.sleep(60)
    
    logger.info("Auto-check daemon stopped")

def start_daemon():
    global auto_check_daemon_running, auto_check_thread
    if not auto_check_daemon_running:
        auto_check_daemon_running = True
        auto_check_thread = threading.Thread(target=auto_check_daemon, daemon=True)
        auto_check_thread.start()
        logger.info("Auto-check daemon thread started")

def stop_daemon():
    global auto_check_daemon_running
    auto_check_daemon_running = False
    if auto_check_thread:
        auto_check_thread.join(timeout=5)
