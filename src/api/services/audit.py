from sqlalchemy.orm import Session
from ..models import AuditLog
import json
from datetime import datetime

def log_action(db: Session, user_id: int, action: str, target_type: str, target_id: int = None, details: dict = None, ip_address: str = None):
    """
    Create an audit log entry.
    """
    try:
        log_entry = AuditLog(
            user_id=user_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=json.dumps(details) if details else None,
            ip_address=ip_address,
            timestamp=datetime.utcnow()
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        print(f"Failed to create audit log: {e}")
