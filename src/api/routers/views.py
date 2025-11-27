from fastapi import APIRouter
from fastapi.responses import FileResponse
import os

router = APIRouter()

# Get the path to the React build
def get_react_app_path():
    return os.path.join(os.path.dirname(os.path.dirname(__file__)), "static", "dist", "index.html")

@router.get("/", response_class=FileResponse)
async def landing_page():
    """Serve the React landing page"""
    return FileResponse(get_react_app_path())

@router.get("/login", response_class=FileResponse)
async def login_page():
    """Serve the React app (handles login route)"""
    return FileResponse(get_react_app_path())

@router.get("/dashboard", response_class=FileResponse)
async def dashboard():
    """Serve the React app (handles dashboard route)"""
    return FileResponse(get_react_app_path())

@router.get("/war-room", response_class=FileResponse)
async def war_room():
    """Serve the React app (handles war-room route)"""
    return FileResponse(get_react_app_path())
