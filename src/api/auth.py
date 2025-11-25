import os
import firebase_admin
from firebase_admin import auth, credentials
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from dotenv import load_dotenv
import logging

from .database import get_db
from .models import User

# Load env
load_dotenv()

logger = logging.getLogger(__name__)

# Initialize Firebase Admin
cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
if cred_path and os.path.exists(cred_path):
    try:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Firebase Admin: {e}")
else:
    logger.warning("FIREBASE_CREDENTIALS_PATH not found or invalid. Auth verification will fail.")

security = HTTPBearer()

def verify_firebase_token(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    """
    Verify the Firebase ID token and return the local User object.
    If the user doesn't exist in local DB, they are denied access (RBAC).
    """
    token = credentials.credentials
    try:
        if os.getenv("DEBUG", "false").lower() == "true":
            logger.info(f"Received token: {token[:10]}...")

        # Verify token with Firebase
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token['uid']
        email = decoded_token.get('email')
        
        if os.getenv("DEBUG", "false").lower() == "true":
            logger.info(f"Verifying token for UID: {uid}, Email: {email}")
        
        # Check if user exists in local DB
        user = db.query(User).filter(User.firebase_uid == uid).first()
        
        if not user:
            # Optional: Check if user exists by email (for pre-seeded users) and link UID
            if email:
                # Case-insensitive search
                user_by_email = db.query(User).filter(User.email.ilike(email)).first()
                if user_by_email:
                    logger.info(f"Linking existing user {email} to Firebase UID {uid}")
                    user_by_email.firebase_uid = uid
                    db.commit()
                    db.refresh(user_by_email)
                    return user_by_email
                elif os.getenv("DEBUG", "false").lower() == "true":
                    logger.info(f"No existing user found for email: {email}")
            
            # If still no user, auto-create a new user
            logger.info(f"Creating new user for {email} (UID: {uid})")
            new_user = User(
                email=email,
                firebase_uid=uid,
                role="user",  # Default role
                is_active=True # Auto-activate new users
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            return new_user
            
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive."
            )
            
        return user
        
    except auth.InvalidIdTokenError as e:
        logger.error(f"Invalid ID token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token"
        )
    except auth.ExpiredIdTokenError as e:
        logger.error(f"Expired ID token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token expired"
        )
    except Exception as e:
        logger.error(f"Auth error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )

def get_current_active_user(current_user: User = Depends(verify_firebase_token)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def get_current_admin_user(current_user: User = Depends(get_current_active_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user
