from src.api.database import SessionLocal
from src.api.models import CheckResult, Member
from sqlalchemy import func

db = SessionLocal()

try:
    print("Testing API query logic:")
    partial_query = db.query(Member).join(CheckResult).filter(CheckResult.result == "Partial").distinct()
    partial_count = partial_query.count()
    print(f"Partial count (API query): {partial_count}")
    
    # Check if we have orphaned CheckResults
    orphans = db.query(CheckResult).filter(CheckResult.result == "Partial", CheckResult.member_id == None).count()
    print(f"Orphaned Partial results: {orphans}")
    
    # Check if we have CheckResults pointing to non-existent members
    # This is harder to do in one query without a left join and checking for null, but let's try a simple check
    all_partials = db.query(CheckResult).filter(CheckResult.result == "Partial").all()
    print(f"Total Partial results: {len(all_partials)}")
    
    valid_partials = 0
    for res in all_partials:
        if res.member:
            valid_partials += 1
    print(f"Partial results with valid Member relationship: {valid_partials}")

finally:
    db.close()
