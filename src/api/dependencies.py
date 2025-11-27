from .worker_pool import BrowserPool
from .database import get_db
from .auth import verify_firebase_token, get_current_active_user, get_current_admin_user

# Initialize Worker Pool globally
# This allows it to be shared across routers and the daemon
browser_pool = BrowserPool(pool_size=2, headless=True)
