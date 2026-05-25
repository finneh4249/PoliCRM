from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import csv
import io
import logging

from ..database import get_db
from ..models import Member, MemberNote, Tag, User, CheckResult, Party, AuditLog
from ..schemas import (
    MemberCreate, MemberResponse, MemberUpdate,
    MemberNoteCreate, MemberNoteResponse
)
from ..dependencies import browser_pool, get_current_active_user, get_current_admin_user
from ..services.audit import log_action

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("", response_model=MemberResponse)
def create_member(member: MemberCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    # ... (rest of create_member) ...
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

from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_


def apply_filters(query, status, state, search, tags, tag_operator):
    # Apply filters
    if status and "all" not in status:
        # We need to outerjoin to handle both checked and unchecked members in one query
        query = query.outerjoin(Member.check_results)
        
        status_filters = []
        # Handle single string case if passed as string
        if isinstance(status, str):
            status = [status]
            
        for s in status:
            if s == "Verified":
                status_filters.append(CheckResult.result == "Pass")
            elif s == "Partial":
                status_filters.append(CheckResult.result == "Partial")
            elif s == "Captcha":
                status_filters.append(CheckResult.result == "Captcha")
            elif s == "Duplicate":
                status_filters.append(Member.is_duplicate == True)
            elif s == "Fail":
                status_filters.append(or_(
                    CheckResult.result == "Fail",
                    CheckResult.result == "Fail_Suburb",
                    CheckResult.result == "Fail_Street",
                    CheckResult.result == "Fail_No_Match"
                ))
            elif s == "Unchecked":
                status_filters.append(CheckResult.id == None)
                
        if status_filters:
            query = query.filter(or_(*status_filters))
        
    if state != "all":
        query = query.filter(Member.primary_state == state)
        
    if search:
        search = search.lower()
        if search.isdigit():
            query = query.filter(Member.nationbuilder_id == int(search))
        else:
            query = query.filter(
                or_(
                    Member.primary_state.ilike(f"%{search}%"),
                    Member.primary_zip.ilike(f"%{search}%")
                )
            )

    # Tag Filtering
    if tags:
        if tag_operator == "AND":
            # Must have ALL tags
            for tag_id in tags:
                query = query.filter(Member.tags.any(Tag.id == tag_id))
        else:
            # Must have ANY tag
            query = query.filter(Member.tags.any(Tag.id.in_(tags)))
            
    return query

@router.get("/export")
def export_members(
    status: Optional[List[str]] = Query(None),
    state: str = "all",
    search: Optional[str] = None,
    columns: Optional[List[str]] = Query(None),
    tags: Optional[List[int]] = Query(None),
    tag_operator: str = "AND",
    format: str = "csv",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Member)
    query = apply_filters(query, status, state, search, tags, tag_operator)

    def iter_csv(query):
        # Define available columns
        # Map frontend column names to data extraction logic
        
        # Standard CSV Columns
        standard_cols = {
            "first_name": ("First Name", lambda m: m.first_name),
            "last_name": ("Last Name", lambda m: m.last_name),
            "nationbuilder_id": ("NB ID", lambda m: str(m.nationbuilder_id)),
            "email": ("Email", lambda m: m.email or ""),
            "phone": ("Phone", lambda m: m.phone or ""),
            "address": ("Address", lambda m: f"{m.primary_address1}, {m.primary_city}, {m.primary_state} {m.primary_zip}"),
            "status": ("Status", lambda m: get_status(m)),
            "electorate": ("Electorate", lambda m: get_electorate(m)),
            "party": ("Party", lambda m: m.party.name if m.party else "")
        }
        
        # VEC Specific Columns (Example)
        vec_cols = {
            "Surname": lambda m: m.last_name,
            "Given Names": lambda m: f"{m.first_name} {m.middle_name or ''}".strip(),
            "Address": lambda m: f"{m.primary_address1} {m.primary_address2 or ''}".strip(),
            "Suburb": lambda m: m.primary_city,
            "Postcode": lambda m: m.primary_zip,
            "Date of Birth": lambda m: "", # Placeholder
            "Phone": lambda m: m.phone or m.mobile or ""
        }
        
        # AEC Specific Columns (Example)
        aec_cols = {
            "MemberID": lambda m: str(m.nationbuilder_id),
            "FirstName": lambda m: m.first_name,
            "MiddleName": lambda m: m.middle_name or "",
            "Surname": lambda m: m.last_name,
            "AddressLine1": lambda m: m.primary_address1,
            "AddressLine2": lambda m: m.primary_address2 or "",
            "Locality": lambda m: m.primary_city,
            "State": lambda m: m.primary_state,
            "Postcode": lambda m: m.primary_zip
        }

        # Select columns based on format
        if format == "vec":
            final_cols = vec_cols
            header = list(vec_cols.keys())
        elif format == "aec":
            final_cols = aec_cols
            header = list(aec_cols.keys())
        else:
            # Standard CSV
            # Determine which columns to export
            selected_keys = columns if columns else standard_cols.keys()
            # Filter out invalid keys
            selected_keys = [k for k in selected_keys if k in standard_cols]
            
            final_cols = {k: standard_cols[k][1] for k in selected_keys}
            header = [standard_cols[k][0] for k in selected_keys]
        
        # Header
        yield ",".join(header) + "\n"
        
        # Helper functions
        def get_status(member):
            if not member.check_results: return "Unchecked"
            res = member.check_results[-1].result
            return "Verified" if res == "Pass" else res

        def get_electorate(member):
            if not member.check_results: return ""
            res = member.check_results[-1]
            if res.result == "Pass":
                return f"{res.federal_division or ''} / {res.state_division or ''}"
            return ""

        # Batch fetch
        limit = 1000
        offset = 0
        while True:
            batch = query.offset(offset).limit(limit).all()
            if not batch:
                break
                
            for member in batch:
                row = []
                if format == "vec" or format == "aec":
                     for col_name, extractor in final_cols.items():
                        val = extractor(member)
                        val = str(val).replace('"', '""')
                        row.append(f'"{val}"')
                else:
                    for k in selected_keys:
                        val = standard_cols[k][1](member)
                        # Escape quotes
                        val = str(val).replace('"', '""')
                        row.append(f'"{val}"')
                yield ",".join(row) + "\n"
            
            offset += limit
            
    filename = f"aec_crm_export_{format}.csv"
    response = StreamingResponse(iter_csv(query), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    return response

@router.get("/parties")
def get_parties(db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    return db.query(Party).all()

@router.get("", response_model=List[MemberResponse])
def read_members(
    skip: int = 0, 
    limit: int = 10000, 
    status: Optional[List[str]] = Query(None),
    state: str = "all",
    search: Optional[str] = None,
    tags: Optional[List[int]] = Query(None),
    tag_operator: str = "AND",
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_active_user)
):
    query = db.query(Member)
    query = apply_filters(query, status, state, search, tags, tag_operator)
    members = query.offset(skip).limit(limit).all()
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
    
    # Track changes for audit log
    changes = {}
    for key, value in update_data.items():
        old_value = getattr(member, key)
        if old_value != value:
            changes[key] = {"old": str(old_value), "new": str(value)}
            setattr(member, key, value)
    
    if changes:
        db.commit()
        db.refresh(member)
        
        # Log action
        log_action(
            db,
            user_id=current_user.id,
            action="MEMBER_UPDATE",
            target_type="MEMBER",
            target_id=member.id,
            details=changes,
            ip_address="127.0.0.1" # TODO: Get real IP
        )
        
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
    
    # Handle duplicate headers (e.g. middle_name appearing twice)
    stream = io.StringIO(decoded)
    reader = csv.reader(stream)
    try:
        headers = next(reader)
    except StopIteration:
        return {"message": "Empty CSV file", "errors": 1}
        
    # Deduplicate headers
    seen_headers = {}
    unique_headers = []
    for h in headers:
        if h in seen_headers:
            seen_headers[h] += 1
            unique_headers.append(f"{h}_{seen_headers[h]}")
        else:
            seen_headers[h] = 1
            unique_headers.append(h)
            
    csv_reader = csv.DictReader(stream, fieldnames=unique_headers)
    
    count = 0
    errors = 0
    skipped = 0
    queued = 0
    new_member_ids = []
    
    updated = 0
    
    for row in csv_reader:
        try:
            nb_id = int(row.get("nationbuilder_id", 0))
            if not nb_id:
                skipped += 1
                continue
                
            # Check if member exists
            existing_member = db.query(Member).filter(Member.nationbuilder_id == nb_id).first()
            
            if existing_member:
                # Update existing member
                # We only update fields if they are present in the CSV and not empty
                # Special focus on middle_name as requested
                
                changed = False
                
                # Middle Name
                middle_name = row.get("middle_name")
                
                if middle_name and existing_member.middle_name != middle_name:
                    existing_member.middle_name = middle_name
                    changed = True
                    
                # Update other key fields if they are missing in DB or different
                # Note: Be careful not to overwrite valid data with empty strings if CSV has gaps
                
                fields_to_update = [
                    "first_name", "last_name", "email", "phone", "mobile",
                    "primary_address1", "primary_address2", "primary_address3",
                    "primary_city", "primary_state", "primary_zip", "primary_country_code",
                    "membership_status"
                ]
                
                for field in fields_to_update:
                    val = row.get(field)
                    if val: # Only update if CSV has a value
                        current_val = getattr(existing_member, field)
                        if current_val != val:
                            setattr(existing_member, field, val)
                            changed = True
                
                if changed:
                    updated += 1
                    # If we updated the member, we might want to re-queue a check
                    # especially if name/address changed
                    if existing_member.id not in new_member_ids:
                        new_member_ids.append(existing_member.id)
                else:
                    skipped += 1
                    
            else:
                # Create new member
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
                    primary_state=row.get("primary_state", "").upper(),
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
        "message": f"Import complete: {count} new, {updated} updated", 
        "errors": errors,
        "skipped": skipped,
        "queued": queued
    }



@router.post("/detect-duplicates")
def detect_duplicates(background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_user: User = Depends(get_current_active_user)):
    """
    Background task to detect duplicates based on Name + Address.
    """
    background_tasks.add_task(run_duplicate_detection, db)
    return {"message": "Duplicate detection started in background"}

def run_duplicate_detection(db: Session):
    logger.info("Starting duplicate detection...")
    try:
        # Reset current duplicates
        db.query(Member).update({Member.is_duplicate: False, Member.duplicate_of_id: None})
        db.commit()
        
        # Fetch all members (this might be heavy for 8k, but manageable)
        # For 8k members, we can fetch all ID, Name, Address
        members = db.query(Member).all()
        
        # Group by key
        seen = {}
        duplicates_count = 0
        
        for member in members:
            # Create a normalization key
            # Note: These fields are encrypted types in the model, but when accessed via ORM they are decrypted.
            # So we can use them for comparison.
            key = (
                (member.first_name or "").lower().strip(),
                (member.last_name or "").lower().strip(),
                (member.primary_address1 or "").lower().strip(),
                (member.primary_zip or "").strip()
            )
            
            if key in seen:
                # Found a duplicate
                original_id = seen[key]
                member.is_duplicate = True
                member.duplicate_of_id = original_id
                duplicates_count += 1
            else:
                seen[key] = member.id
        
        db.commit()
        logger.info(f"Duplicate detection complete. Found {duplicates_count} duplicates.")
        
    except Exception as e:
        logger.error(f"Error in duplicate detection: {e}")

