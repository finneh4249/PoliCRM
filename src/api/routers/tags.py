from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..models import Tag, User
from ..schemas import TagCreate, TagResponse
from ..dependencies import get_current_active_user

router = APIRouter()

@router.get("", response_model=List[TagResponse])
def get_tags(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return db.query(Tag).all()

@router.post("", response_model=TagResponse)
def create_tag(tag: TagCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    existing = db.query(Tag).filter(Tag.name == tag.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Tag already exists")
    
    new_tag = Tag(**tag.dict())
    db.add(new_tag)
    db.commit()
    db.refresh(new_tag)
    return new_tag

@router.delete("/{tag_id}")
def delete_tag(tag_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    
    db.delete(tag)
    db.commit()
    return {"message": "Tag deleted"}
