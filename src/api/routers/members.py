from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import csv
import io
import logging

from ..database import get_db
from ..models import Member, MemberNote, Tag, User
from ..schemas import (
    MemberCreate, MemberResponse, MemberUpdate,
    MemberNoteCreate, MemberNoteResponse
)
from ..dependencies import browser_pool, get_current_active_user, get_current_admin_user

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("", response_model=MemberResponse)
def create_member(member: MemberCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    db_member = db.query(Member).filter(Member.nationbuilder_id == member.nationbuilder_id).first()
    if db_member:
        raise HTTPException(status_code=400, detail="Member already registered")
    
    new_member = Member(**member.dict())
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    
    try:
        browser_pool.enqueue_check(new_member.id)
    except Exception as e:
        logger.error(f"Failed to auto-queue check: {e}")
    
    return new_member

@router.get("", response_model=List[MemberResponse])
def read_members(skip: int = 0, limit: int = 10000, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    members = db.query(Member).offset(skip).limit(limit).all()
    return members

@router.get("/{member_id}", response_model=MemberResponse)
def read_member(member_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    member = db.query(Member).filter(Member.id == member_id).first()
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")
    return member

@router.put("/{member_id}", response_model=MemberResponse)
def update_member(member_id: int, member_update: MemberUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    member = db.query(Member).filter(Member.id == member_id).first()
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")
    
    update_data = member_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(member, key, value)
    
    db.commit()
    db.refresh(member)
    return member

@router.delete("/{member_id}")
def delete_member(member_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_admin_user)):
    # Only admins can delete
    member = db.query(Member).filter(Member.id == member_id).first()
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")
    
    db.delete(member)
    db.commit()
    return {"message": "Member deleted successfully"}

@router.post("/{member_id}/notes", response_model=MemberNoteResponse)
def add_member_note(member_id: int, note: MemberNoteCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    member = db.query(Member).filter(Member.id == member_id).first()
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")
    
    # Use current user's email/name as creator
    creator = current_user.email or "Unknown"
    
    new_note = MemberNote(member_id=member_id, note=note.note, created_by=creator)
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return new_note

@router.post("/{member_id}/tags/{tag_id}")
def add_tag_to_member(member_id: int, tag_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    member = db.query(Member).filter(Member.id == member_id).first()
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    
    if not member or not tag:
        raise HTTPException(status_code=404, detail="Member or tag not found")
    
    if tag not in member.tags:
        member.tags.append(tag)
        db.commit()
    
    return {"message": "Tag added to member"}

@router.delete("/{member_id}/tags/{tag_id}")
def remove_tag_from_member(member_id: int, tag_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    member = db.query(Member).filter(Member.id == member_id).first()
    tag = db.query(Tag).filter(Tag.id == tag_id).first()
    
    if not member or not tag:
        raise HTTPException(status_code=404, detail="Member or tag not found")
    
    if tag in member.tags:
        member.tags.remove(tag)
        db.commit()
    
    return {"message": "Tag removed from member"}

@router.post("/{member_id}/check")
def check_member(member_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    member = db.query(Member).filter(Member.id == member_id).first()
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")
    
    browser_pool.enqueue_check(member_id)
    return {"status": "queued", "message": f"Check queued for member {member_id}"}

@router.post("/upload")
async def upload_members(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    contents = await file.read()
    decoded = contents.decode('utf-8')
    csv_reader = csv.DictReader(io.StringIO(decoded))
    
    count = 0
    errors = 0
    skipped = 0
    queued = 0
    new_member_ids = []
    
    for row in csv_reader:
        try:
            nb_id = int(row.get("nationbuilder_id", 0))
            if not nb_id:
                skipped += 1
                continue
                
            if db.query(Member).filter(Member.nationbuilder_id == nb_id).first():
                skipped += 1
                continue
            
            member = Member(
                first_name=row.get("first_name", ""),
                middle_name=row.get("middle_name"),
                last_name=row.get("last_name", ""),
                nationbuilder_id=nb_id,
                email=row.get("email"),
                phone=row.get("phone"),
                mobile=row.get("mobile"),
                primary_address1=row.get("primary_address1", ""),
                primary_address2=row.get("primary_address2"),
                primary_address3=row.get("primary_address3"),
                primary_city=row.get("primary_city", ""),
                primary_state=row.get("primary_state", ""),
                primary_zip=row.get("primary_zip", ""),
                primary_country_code=row.get("primary_country_code", "AU"),
                membership_status=row.get("membership_status", "active")
            )
            db.add(member)
            db.flush()
            new_member_ids.append(member.id)
            count += 1
        except Exception as e:
            errors += 1
            logger.error(f"Error importing row: {e}")
            
    db.commit()
    
    for member_id in new_member_ids:
        try:
            browser_pool.enqueue_check(member_id)
            queued += 1
        except Exception as e:
            logger.error(f"Error queuing check for member {member_id}: {e}")
    
    return {
        "message": f"Successfully imported {count} members", 
        "errors": errors,
        "skipped": skipped,
        "queued": queued
    }
