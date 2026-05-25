from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime
from ..database import get_db
from ..models import Member, User
from ..services.nationbuilder import NationBuilderClient
from ..dependencies import get_current_active_user

router = APIRouter()
nb_client = NationBuilderClient()

def sync_nationbuilder_people(db: Session):
    """
    Background task to sync people from NationBuilder.
    For MVP, this just fetches the first 100 people.
    """
    # TODO: Implement full pagination and robust sync logic
    response = nb_client.get_people(limit=100)
    results = response.get("results", [])
    
    synced_count = 0
    for person in results:
        nb_id = person.get("id")
        if not nb_id:
            continue
            
        # Check if member exists
        member = db.query(Member).filter(Member.nationbuilder_id == nb_id).first()
        
        if not member:
            member = Member(nationbuilder_id=nb_id)
            db.add(member)
        
        # Update fields
        member.first_name = person.get("first_name")
        member.last_name = person.get("last_name")
        member.email = person.get("email")
        member.phone = person.get("phone") or person.get("mobile")
        
        # Address
        address = person.get("primary_address", {})
        member.primary_address1 = address.get("address1")
        member.primary_city = address.get("city")
        member.primary_state = address.get("state")
        member.primary_zip = address.get("zip")
        
        member.last_synced_at = datetime.utcnow()
        synced_count += 1
    
    db.commit()
    print(f"Synced {synced_count} members from NationBuilder")

@router.post("/nationbuilder/sync")
async def trigger_sync(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    background_tasks.add_task(sync_nationbuilder_people, db)
    return {"status": "Sync started"}

@router.get("/nationbuilder/status")
async def get_sync_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    # Just return the count of synced members for now
    count = db.query(Member).filter(Member.last_synced_at != None).count()
    return {"synced_members": count}
