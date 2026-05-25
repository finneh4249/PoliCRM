from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
import os

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), "..", "src"))

from api.main import app, get_db
from api.database import Base
from api.models import Member

# Setup test DB
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def test_create_member():
    response = client.post(
        "/members",
        json={
            "first_name": "Test",
            "last_name": "User",
            "nationbuilder_id": 12345,
            "primary_address1": "123 Fake St",
            "primary_city": "Melbourne",
            "primary_state": "VIC",
            "primary_zip": "3000"
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["first_name"] == "Test"
    assert data["id"] is not None

def test_create_member_no_middle_name():
    response = client.post(
        "/members",
        json={
            "first_name": "NoMiddle",
            "last_name": "User",
            "nationbuilder_id": 99999,
            "primary_address1": "123 Fake St",
            "primary_city": "Melbourne",
            "primary_state": "VIC",
            "primary_zip": "3000"
            # middle_name omitted
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["first_name"] == "NoMiddle"
    assert data["middle_name"] is None

    assert data["first_name"] == "NoMiddle"
    assert data["middle_name"] is None

def test_bulk_import():
    csv_content = """first_name,middle_name,last_name,nationbuilder_id,primary_address1,primary_city,primary_state,primary_zip,primary_country_code
Bulk,Import,User,11111,456 Test Ave,Sydney,NSW,2000,AU
Bulk,NoMiddle,User2,22222,789 Test Rd,Sydney,NSW,2000,AU
"""
    files = {"file": ("test.csv", csv_content, "text/csv")}
    response = client.post("/members/upload", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "Successfully imported 2 members" in data["message"]

    data = response.json()
    assert "Successfully imported 2 members" in data["message"]

def test_captcha_result():
    # Create a member
    response = client.post(
        "/members",
        json={
            "first_name": "Captcha",
            "last_name": "User",
            "nationbuilder_id": 33333,
            "primary_address1": "123 Fake St",
            "primary_city": "Melbourne",
            "primary_state": "VIC",
            "primary_zip": "3000"
        },
    )
    member_id = response.json()["id"]
    
    # Manually insert a Captcha result to verify schema/model support
    # We can't easily force the browser to hit a captcha in this test, 
    # but we can verify the API handles the status correctly if the worker produces it.
    from api.models import CheckResult
    from api.database import SessionLocal
    from api.models import AECResult as AECResultEnum # Need to import the Enum from where it is defined
    # Actually AECResult is in aec_core.models, but we need to insert string "Captcha"
    
    db = SessionLocal()
    result = CheckResult(
        member_id=member_id,
        result="Captcha",
        federal_division="",
        state_division="",
        local_government="",
        local_ward=""
    )
    db.add(result)
    db.commit()
    db.close()
    
    # Fetch member and check result
    response = client.get(f"/members/{member_id}")
    data = response.json()
    assert len(data["check_results"]) == 1
    assert data["check_results"][0]["result"] == "Captcha"

def test_read_members():
    response = client.get("/members")
    assert response.status_code == 200
    assert len(response.json()) > 0

def test_check_member_queue():
    # Get the member ID from the previous test (or create new one)
    # Since tests might run in random order, let's create one
    response = client.post(
        "/members",
        json={
            "first_name": "Check",
            "last_name": "Me",
            "nationbuilder_id": 67890,
            "primary_address1": "123 Fake St",
            "primary_city": "Melbourne",
            "primary_state": "VIC",
            "primary_zip": "3000"
        },
    )
    if response.status_code == 400: # Already exists
        member_id = 1 # Assumption for simplicity in this basic test script
    else:
        member_id = response.json()["id"]

    response = client.post(f"/members/{member_id}/check")
    assert response.status_code == 200
    assert response.json()["status"] == "queued"
