from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import json
from datetime import datetime

from ..database import get_db
from ..models import SavedSearch, User
from ..dependencies import get_current_active_user

router = APIRouter()

class SavedSearchCreate(BaseModel):
    name: str
    filters: dict

class SavedSearchResponse(BaseModel):
    id: int
    name: str
    filters: dict
    created_at: datetime
    
    class Config:
        orm_mode = True

@router.post("", response_model=SavedSearchResponse)
def create_saved_search(
    search: SavedSearchCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    # Serialize filters to JSON
    filters_json = json.dumps(search.filters)
    
    new_search = SavedSearch(
        name=search.name,
        filters=filters_json,
        created_by=current_user.id
    )
    db.add(new_search)
    db.commit()
    db.refresh(new_search)
    
    # Deserialize for response
    response = SavedSearchResponse(
        id=new_search.id,
        name=new_search.name,
        filters=json.loads(new_search.filters),
        created_at=new_search.created_at
    )
    return response

@router.get("", response_model=List[SavedSearchResponse])
def get_saved_searches(
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    searches = db.query(SavedSearch).filter(SavedSearch.created_by == current_user.id).all()
    
    results = []
    for s in searches:
        results.append(SavedSearchResponse(
            id=s.id,
            name=s.name,
            filters=json.loads(s.filters) if s.filters else {},
            created_at=s.created_at
        ))
    return results

@router.delete("/{search_id}")
def delete_saved_search(
    search_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    search = db.query(SavedSearch).filter(
        SavedSearch.id == search_id,
        SavedSearch.created_by == current_user.id
    ).first()
    
    if not search:
        raise HTTPException(status_code=404, detail="Saved search not found")
        
    db.delete(search)
    db.commit()
    return {"message": "Saved search deleted"}
