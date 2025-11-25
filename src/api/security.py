from sqlalchemy.types import TypeDecorator, String, LargeBinary
from cryptography.fernet import Fernet
import os
import hashlib
import base64
import secrets
from dotenv import load_dotenv

# Load existing env vars
load_dotenv()

def get_or_create_key(env_var_name: str, generate_func) -> str:
    """
    Get an environment variable or create it if it doesn't exist.
    Persists the new key to .env file.
    """
    value = os.getenv(env_var_name)
    
    if not value:
        print(f"Generating new {env_var_name}...")
        value = generate_func()
        
        # Update current environment
        os.environ[env_var_name] = value
        
        # Persist to .env
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), '.env')
        
        # Create .env if it doesn't exist
        if not os.path.exists(env_path):
            with open(env_path, 'w') as f:
                f.write(f"# Auto-generated configuration\n")
        
        # Append to .env
        with open(env_path, 'a') as f:
            f.write(f"\n{env_var_name}={value}\n")
            
    return value

# Ensure keys exist
ENCRYPTION_KEY = get_or_create_key("ENCRYPTION_KEY", lambda: Fernet.generate_key().decode())
SECRET_KEY = get_or_create_key("SECRET_KEY", lambda: secrets.token_urlsafe(32))

cipher_suite = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)

class EncryptedType(TypeDecorator):
    """
    SQLAlchemy TypeDecorator that encrypts data before saving to DB
    and decrypts it when loading from DB.
    """
    impl = LargeBinary
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None:
            if isinstance(value, str):
                value = value.encode('utf-8')
            return cipher_suite.encrypt(value)
        return None

    def process_result_value(self, value, dialect):
        if value is not None:
            return cipher_suite.decrypt(value).decode('utf-8')
        return None

def get_blind_index(value: str) -> str:
    """
    Create a deterministic hash of a value for searching.
    We use SHA-256 + a pepper (the encryption key) to prevent rainbow table attacks.
    """
    if not value:
        return None
    
    # Normalize
    value = value.lower().strip()
    
    # Hash
    h = hashlib.sha256()
    h.update(value.encode('utf-8'))
    h.update(ENCRYPTION_KEY.encode('utf-8')) # Use encryption key as pepper
    return h.hexdigest()
