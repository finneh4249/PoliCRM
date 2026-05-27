# Priority 1 Features - Testing Guide

## 🎯 Overview

All 3 Priority 1 features have been implemented:

1. ✅ Enhanced Member Detail View (with tags, notes, membership status)
2. ✅ Tag Management UI (create, assign, delete tags)
3. ✅ Basic Reporting Dashboard (stats, electorates, state distribution)

## 🚀 Quick Start

### 1. Start the Server

```bash
cd /Users/ethancornwill/Documents/AEC_Checker
source .venv/bin/activate  # If not already activated
python -m uvicorn src.api.main:app --reload
```

### 2. Open the CRM

Navigate to: http://127.0.0.1:8000

## 🧪 Feature Testing Checklist

### Feature 1: Enhanced Member Detail View

#### Test 1.1: View Member Details

- [ ] Click "View" on any member in the table
- [ ] Verify modal opens with gradient header
- [ ] Check personal info section displays correctly
- [ ] Verify address section shows all fields

#### Test 1.2: Tag Display & Assignment

- [ ] In member detail modal, verify "Tags" section exists
- [ ] Click "+ Add Tag" button
- [ ] Verify you can assign a tag (may need to create tags first)
- [ ] Check tag appears with colored badge
- [ ] Click "×" on a tag to remove it
- [ ] Verify tag is removed successfully

#### Test 1.3: Notes System

- [ ] In member detail modal, scroll to "Notes" section
- [ ] Type a note in the text area
- [ ] Click "Add Note" button
- [ ] Verify note appears in the list with timestamp
- [ ] Add multiple notes and verify they stack chronologically

#### Test 1.4: Membership Status Display

- [ ] Check if membership_status field shows in member details
- [ ] Verify status badge colors (green=active, orange=lapsed, gray=other)
- [ ] Test with members of different statuses

#### Test 1.5: AEC Verification History

- [ ] Verify verification history section shows all past checks
- [ ] Check timestamps are formatted correctly
- [ ] Verify electorate data displays when available
- [ ] Click "Recheck" button and verify it queues a new check

#### Test 1.6: Delete Member

- [ ] Click "Delete Member" button (red button)
- [ ] Verify confirmation dialog appears
- [ ] Confirm deletion
- [ ] Check member is removed from table

### Feature 2: Tag Management UI

#### Test 2.1: Open Tag Manager

- [ ] Click "Manage Tags" in the sidebar
- [ ] Verify modal opens with "Tag Management" header
- [ ] Check modal has two sections: Create and Existing Tags

#### Test 2.2: Create New Tag

- [ ] Enter tag name: "Volunteer"
- [ ] Click color picker, choose blue (#3B82F6)
- [ ] Enter description: "Active campaign volunteer"
- [ ] Click "Create Tag" button
- [ ] Verify tag appears in "Existing Tags" list
- [ ] Verify color dot matches selected color

#### Test 2.3: Create Multiple Tags

Create these tags:

- [ ] "Donor" (green #10B981) - "Financial supporter"
- [ ] "Local Rep" (purple #8B5CF6) - "Local representative"
- [ ] "Email List" (yellow #F59E0B) - "Subscribed to emails"
- [ ] "Phone Banking" (pink #EC4899) - "Willing to make calls"

#### Test 2.4: View All Tags

- [ ] Verify all created tags appear in list
- [ ] Check each tag shows name, color, and description
- [ ] Verify tags are sorted (newest first or alphabetically)

#### Test 2.5: Delete Tag

- [ ] Click "Delete" on a tag
- [ ] Verify confirmation dialog
- [ ] Confirm deletion
- [ ] Check tag is removed from list
- [ ] Verify tag is removed from any members who had it assigned

#### Test 2.6: Tag Assignment to Members

- [ ] Close tag manager
- [ ] Open a member detail view
- [ ] Click "+ Add Tag"
- [ ] Assign "Volunteer" tag
- [ ] Verify tag appears on member
- [ ] Assign multiple tags to same member
- [ ] Verify all tags display with correct colors

### Feature 3: Basic Reporting Dashboard

#### Test 3.1: Open Reports Dashboard

- [ ] Click "Reports" in the sidebar
- [ ] Verify modal opens with "📊 Reports & Analytics" header
- [ ] Check modal is large (max-w-6xl)

#### Test 3.2: Dashboard Stats Cards

- [ ] Verify 3 main stat cards display:
  - Total Members (blue gradient)
  - Verified (green gradient)
  - Pending (amber gradient)
- [ ] Check numbers are accurate
- [ ] Verify verification rate percentage shows in Verified card

#### Test 3.3: Status Breakdown

- [ ] Locate "Status Breakdown" panel
- [ ] Verify counts for:
  - Verified (green)
  - Failed (red)
  - Unchecked (gray)
  - Captcha (orange)
- [ ] Check numbers match main table filters

#### Test 3.4: State Distribution

- [ ] Locate "State Distribution" panel
- [ ] Verify all states with members are listed
- [ ] Check counts are accurate
- [ ] Verify states use font-mono for abbreviations

#### Test 3.5: Top Electorates

- [ ] Locate "Top Electorates" section
- [ ] Verify top 10 electorates are shown
- [ ] Check each has:
  - Electorate name
  - Member count
  - Gradient bar (indigo to purple)
- [ ] Verify bars are proportional to counts
- [ ] Check highest count has 100% width bar

#### Test 3.6: Data Accuracy

- [ ] Import sample data (use nationbuilder CSV)
- [ ] Run AEC checks on several members
- [ ] Reopen reports dashboard
- [ ] Verify all stats update correctly
- [ ] Check electorate distribution matches verified members

## 📊 Sample Data for Testing

### Import Sample Members

1. Click "Import Members" in sidebar
2. Upload: `nationbuilder-people-export-3194-2025-11-25.csv`
3. Wait for import to complete
4. Verify members appear in table

### Create Test Tags

```
Tag Name        | Color    | Description
----------------|----------|---------------------------
Volunteer       | #3B82F6  | Active campaign volunteer
Donor           | #10B981  | Financial supporter
Local Rep       | #8B5CF6  | Local representative
Email List      | #F59E0B  | Subscribed to emails
Phone Banking   | #EC4899  | Willing to make calls
Door Knocking   | #EF4444  | Willing to canvas
Social Media    | #06B6D4  | Active on social platforms
Member          | #6366F1  | Paid member
```

### Run AEC Checks

1. Select 5-10 members using checkboxes
2. Click "Check Selected (X)" button
3. Wait for verification to complete (watch sidebar stats update)
4. Check reports dashboard to see verified electorates

## 🐛 Known Issues / Limitations

### Tag Assignment UI

- Currently uses browser `prompt()` for tag selection
- **TODO for production**: Replace with proper dropdown/modal selector
- Workaround: Note tag IDs from tag manager, enter manually

### Database Migration

- If you see errors about missing columns, delete `src/api/aec_crm.db`
- Database will auto-recreate with new schema on next startup

### Browser Pool

- Default 1 worker for AEC checks to avoid bot detection
- Increase in `worker_pool.py` if needed (max 2-3 recommended)

## ✅ Success Criteria

### Enhanced Member Detail View

- [x] Modal opens with full member info
- [x] Tags section displays assigned tags
- [x] Tags can be added/removed inline
- [x] Notes section allows adding notes
- [x] Notes display with timestamp and author
- [x] Delete button removes member
- [x] Membership status displays with color coding

### Tag Management UI

- [x] Tag manager modal accessible from sidebar
- [x] Create tag form with name, color, description
- [x] Color picker for visual customization
- [x] Tags list shows all created tags
- [x] Delete tag functionality
- [x] Tags persist across sessions
- [x] Tags can be assigned to members

### Basic Reporting Dashboard

- [x] Reports modal accessible from sidebar
- [x] Dashboard stats cards (total, verified, pending)
- [x] Status breakdown table
- [x] State distribution chart/table
- [x] Top 10 electorates with bar visualization
- [x] Data updates in real-time
- [x] Accurate counts match filtered views

## 🎯 Next Steps (Post-Testing)

1. **Improve Tag Assignment UX**
   - Replace prompt() with modal dropdown
   - Add tag autocomplete/search
   - Show tag count in sidebar

2. **Enhance Reports**
   - Add date range filters
   - Export reports as PDF/CSV
   - Add growth trend charts
   - Membership renewal tracking

3. **Member Detail Enhancements**
   - Inline edit for contact info
   - Activity timeline
   - Email/SMS quick actions
   - Duplicate detection alerts

4. **Production Prep**
   - Add user authentication
   - Role-based permissions
   - Audit logging for changes
   - Database backups

## 📞 Support

For issues or questions:

- Check `aec_checker.log` for errors
- Review `PHASE1_MVP_PROGRESS.md` for API documentation
- Test API endpoints directly at http://127.0.0.1:8000/docs

## 🎉 Celebration Checklist

When all tests pass:

- [ ] Take screenshots of each feature
- [ ] Update `PHASE1_MVP_PROGRESS.md` with "TESTED ✅"
- [ ] Demo to stakeholders
- [ ] Schedule Fusion Party pilot deployment
