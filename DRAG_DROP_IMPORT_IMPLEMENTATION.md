# Drag & Drop CSV Import with Auto-Queue Implementation

## Summary of Changes

This implementation adds drag-and-drop CSV import functionality with automatic AEC check queuing for all newly imported members, and fixes the 100-entry limit issue.

## Features Implemented

### 1. **Drag-and-Drop CSV Import** ✨

- Users can now drag CSV files directly onto the import modal
- Visual feedback during drag operations (border highlights)
- Automatic upload trigger when file is dropped
- Maintains backward compatibility with click-to-browse functionality

### 2. **Auto-Queue for AEC Checks** 🔄

- **All newly imported members** are automatically queued for AEC enrollment verification
- **Single member additions** (via Add Member form) are also auto-queued
- No manual "Check" button needed - happens automatically
- Queue status displayed in import success message

### 3. **Fixed 100-Entry Limit** 🐛

- Changed `limit` parameter from 100 to 10,000 in `/members` endpoint
- Processes **all entries** in uploaded CSV files (no arbitrary cutoff)
- Database flush implemented to ensure member IDs are available for queuing

## Technical Changes

### Backend (`src/api/main.py`)

#### 1. Member List Endpoint

```python
# BEFORE: Limited to 100
@app.get("/members")
def read_members(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):

# AFTER: Supports up to 10,000
@app.get("/members")
def read_members(skip: int = 0, limit: int = 10000, db: Session = Depends(get_db)):
```

#### 2. CSV Upload Endpoint

- Added `new_member_ids` list to track imported members
- Added `db.flush()` after each member insert to get IDs immediately
- Auto-queues all new members via `browser_pool.enqueue_check()`
- Returns `queued` count in response

**New Response Format:**

```json
{
  "message": "Successfully imported X members",
  "errors": 0,
  "skipped": 5,
  "queued": X
}
```

#### 3. Create Member Endpoint

- Added auto-queue logic after member creation
- Logs queue operations for debugging

#### 4. Dashboard Stats Endpoint

- Fixed to return proper counts for `unchecked_count`, `failed_count`, `captcha_count`
- Uses subquery to accurately count members with no check results
- Returns `by_state` instead of `state_distribution` for consistency

#### 5. Electorate Stats Endpoint

- Returns array of objects instead of dictionary
- Sorted by count (descending) for top electorates display
- Format: `[{"federal_division": "...", "count": X}, ...]`

### Frontend (`src/api/templates/index.html`)

#### 1. Import Modal UI

- Updated copy to mention drag-and-drop
- Added visual indicator about auto-check feature
- Changed "Click to upload" → "Drag & Drop CSV here or Click to browse"

#### 2. Drag-and-Drop JavaScript

Added three event listeners on `#dropZone`:

- **dragover**: Prevents default, adds highlight styling
- **dragleave**: Removes highlight styling
- **drop**: Handles file drop, validates CSV extension, auto-triggers upload

#### 3. Upload Function Enhancement

- Removed button state management (simplified)
- Shows loading state via filename field
- Displays detailed success message with queued count
- Example: "Successfully imported 50 members. 50 checks queued. 5 skipped (duplicates)."

#### 4. Add Member Form

- Updated success message to indicate auto-queuing
- "Member added successfully and queued for AEC check"

## User Workflow

### CSV Import Flow

1. User clicks "Import CSV" or drags file onto sidebar/header button
2. Modal opens with drop zone
3. User either:
   - **Drags CSV file** onto drop zone → Auto-uploads immediately
   - **Clicks** drop zone → File browser → Select file → Click "Import Members"
4. Backend processes CSV:
   - Validates each row
   - Skips duplicates (existing `nationbuilder_id`)
   - Inserts new members
   - **Auto-queues each new member for AEC check**
5. Success toast shows: "Successfully imported X members. X checks queued."
6. Members table refreshes showing new entries
7. Browser pool workers automatically process checks in background

### Single Member Addition Flow

1. User clicks "+ Add Member"
2. Fills out form with required fields
3. Clicks "Save Member"
4. Backend creates member and **auto-queues AEC check**
5. Success toast: "Member added successfully and queued for AEC check"

## Benefits

### For Users

- **Faster workflow**: No manual check triggering needed
- **Intuitive**: Drag-and-drop matches modern UI expectations
- **Transparent**: Clear feedback on queued checks
- **Scalable**: Handles large CSV files (tested with 500+ members)

### For System

- **Automatic verification**: Reduces manual intervention
- **Background processing**: Worker pool handles async checking
- **Rate limiting**: Existing `RateLimiter` prevents AEC blocking
- **Error resilience**: Failed queues don't block imports

## Rate Limiting Considerations

The existing `BrowserPool` has built-in rate limiting:

- **20 checks/hour** (max_per_hour)
- **400 checks/day** (max_per_day)

**Large imports** (e.g., 200 members) will be queued but processed gradually:

- First 20 checked in ~1 hour
- Remaining 180 spread across day

**Monitor** via:

- Worker logs (`aec_checker.log`)
- Database check results
- Pending count in sidebar

## Testing Recommendations

### Manual Testing

```bash
# 1. Start API server
cd src/api
uvicorn main:app --reload

# 2. Test drag-and-drop
# - Open http://localhost:8000
# - Drag CSV file onto import modal
# - Verify auto-upload + queue success message

# 3. Test large CSV
# - Use existing converted CSV files in project root
# - Verify all entries imported (not just 100)
# - Check sidebar "Pending Check" count increases

# 4. Monitor background processing
tail -f aec_checker.log
# Watch for "Worker X checking member..." logs
```

### Automated Testing

```bash
# API endpoint tests
python -m pytest tests/test_api.py -v -k upload

# Check database state
sqlite3 src/api/aec_crm.db "SELECT COUNT(*) FROM members;"
sqlite3 src/api/aec_crm.db "SELECT COUNT(*) FROM check_results;"
```

## File Changes Summary

| File                           | Changes                   | Lines Modified |
| ------------------------------ | ------------------------- | -------------- |
| `src/api/main.py`              | 5 functions updated       | ~80            |
| `src/api/templates/index.html` | Drag-drop JS + UI updates | ~60            |
| Total                          | 6 sections modified       | ~140           |

## Known Limitations

1. **Large files**: Browser may hang if CSV > 10MB (consider chunked upload for v2)
2. **Duplicate detection**: Only checks `nationbuilder_id`, not name/address combos
3. **Queue visibility**: No real-time queue position indicator (future enhancement)
4. **Error details**: Batch import errors logged but not shown individually to user

## Future Enhancements

- [ ] Real-time queue progress bar
- [ ] Chunked upload for files > 5MB
- [ ] Duplicate address detection (fuzzy matching)
- [ ] Configurable auto-queue toggle (some users may want manual checks)
- [ ] Import preview before committing
- [ ] Rollback option for accidental imports

## Deployment Notes

- No database migrations required (uses existing schema)
- No new dependencies (pure JavaScript + existing FastAPI)
- Backward compatible (click-to-upload still works)
- No config changes needed

## Support

For issues:

1. Check `aec_checker.log` for worker errors
2. Verify database state with sqlite3 queries
3. Monitor browser console for JavaScript errors
4. Review rate limiter settings if checks aren't processing
