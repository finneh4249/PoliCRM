from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os
import sys
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add src to path so we can import aec_core
sys.path.append(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from .database import engine, Base, SessionLocal
from .models import User
from .dependencies import browser_pool
from .routers import members, tags, stats, users, views
from .services import daemon

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AEC CRM API")

# Mount static files
app.mount("/static", StaticFiles(directory=os.path.join(os.path.dirname(__file__), "static")), name="static")

# Include Routers
app.include_router(views.router)
app.include_router(members.router, prefix="/members", tags=["members"])
app.include_router(tags.router, prefix="/tags", tags=["tags"])
app.include_router(stats.router, prefix="/stats", tags=["stats"])
app.include_router(users.router, prefix="/users", tags=["users"])



@app.on_event("startup")
async def startup_event():
    browser_pool.start()
    daemon.start_daemon()
    
    # Seed Initial Users
    db = SessionLocal()
    try:
        if db.query(User).count() == 0:
            logger.info("Seeding initial admin users...")
            initial_users = [
                User(email="miles@fusionparty.org.au", role="admin", is_active=True),
                User(email="drew@fusionparty.org.au", role="admin", is_active=True),
                User(email="admin@fusionparty.org.au", role="admin", is_active=True)
            ]
            db.add_all(initial_users)
            db.commit()
            logger.info("Seeded users: Miles, Drew, Admin")
    except Exception as e:
        logger.error(f"Failed to seed users: {e}")
    finally:
        db.close()

@app.on_event("shutdown")
async def shutdown_event():
    daemon.stop_daemon()
    browser_pool.stop()

