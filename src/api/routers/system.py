from fastapi import APIRouter, Depends
from ..models import User
from ..dependencies import get_current_active_user, browser_pool

router = APIRouter()

@router.get("/queue")
def get_queue_status(current_user: User = Depends(get_current_active_user)):
    """
    Get the current status of the background worker queue.
    """
    return browser_pool.get_status()
