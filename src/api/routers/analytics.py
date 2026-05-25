from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ..database import get_db
from ..models import CheckResult, Member
import os
import json

# Cache Data in Memory
electorates_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "electorates.json")
NAME_MAP = {}
if os.path.exists(electorates_path):
    with open(electorates_path, 'r') as f:
        electorates_data = json.load(f)
        # Create map of UPPERCASE -> Canonical Name
        for electorate in electorates_data:
            if "Name" in electorate:
                NAME_MAP[electorate["Name"].upper()] = electorate["Name"]

postcode_data_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "postcode_to_electorate.json")
POSTCODE_MAP = {}
if os.path.exists(postcode_data_path):
    with open(postcode_data_path, 'r') as f:
        POSTCODE_MAP = json.load(f)

router = APIRouter()

@router.get("/electorate-counts")
def get_electorate_counts(db: Session = Depends(get_db)):
    """
    Get the count of verified and projected members per federal division.
    """
    # 1. Verified Counts (Existing Logic)
    verified_results = db.query(
        CheckResult.federal_division, 
        func.count(CheckResult.id)
    ).filter(
        CheckResult.result == 'Pass'
    ).group_by(
        CheckResult.federal_division
    ).all()
    
    verified_counts = {}
    for row in verified_results:
        if row[0]:
            # Normalize name if possible
            name = row[0]
            if name.upper() in NAME_MAP:
                name = NAME_MAP[name.upper()]
            verified_counts[name] = row[1]

    # 2. Projected Counts (Crystal Ball Logic)
    projected_counts = {}
    
    # Query "Pending" members: Active members who are NOT verified
    verified_member_ids = db.query(CheckResult.member_id).filter(CheckResult.result == 'Pass').scalar_subquery()
    
    pending_members = db.query(Member.primary_zip).filter(
        Member.membership_status == 'active',
        ~Member.id.in_(verified_member_ids)
    ).all()
    
    for member in pending_members:
        postcode = member.primary_zip
        if postcode and postcode in POSTCODE_MAP:
            electorates = POSTCODE_MAP[postcode]
            
            # Handle if it's a list or string
            target_electorate = None
            if isinstance(electorates, list):
                if electorates:
                    target_electorate = electorates[0] # Pick first
            elif isinstance(electorates, str):
                target_electorate = electorates
                
            if target_electorate:
                projected_counts[target_electorate] = projected_counts.get(target_electorate, 0) + 1

    return {
        "verified": verified_counts,
        "projected": projected_counts,
        "metadata": {
            "verified_max": max(verified_counts.values()) if verified_counts else 0,
            "projected_max": max(projected_counts.values()) if projected_counts else 0
        }
    }

@router.get("/growth")
def get_growth_metrics(db: Session = Depends(get_db)):
    """
    Get member growth over time (new members per month).
    """
    # Group by month of join_date
    # SQLite specific date truncation
    # For PostgreSQL use: func.date_trunc('month', Member.join_date)
    
    # Assuming SQLite for now based on file structure, but let's try to be generic or use python processing if volume is low.
    # Given 8k members, python processing is fine.
    
    members = db.query(Member.join_date).filter(Member.join_date != None).all()
    
    growth = {}
    for m in members:
        if m.join_date:
            month_key = m.join_date.strftime("%Y-%m")
            growth[month_key] = growth.get(month_key, 0) + 1
            
    # Sort by date
    sorted_growth = dict(sorted(growth.items()))
    
    return sorted_growth

@router.get("/geographic")
def get_geographic_distribution(db: Session = Depends(get_db)):
    """
    Get member distribution by State and Division.
    """
    # State distribution
    state_counts = db.query(
        Member.primary_state, 
        func.count(Member.id)
    ).group_by(
        Member.primary_state
    ).all()
    
    # Division distribution (Verified only)
    division_counts = db.query(
        CheckResult.federal_division,
        func.count(CheckResult.id)
    ).filter(
        CheckResult.result == 'Pass'
    ).group_by(
        CheckResult.federal_division
    ).all()
    
    return {
        "by_state": {row[0]: row[1] for row in state_counts if row[0]},
        "by_division": {row[0]: row[1] for row in division_counts if row[0]}
    }
