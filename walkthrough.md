# War Room Optimization Walkthrough

## Changes

### Backend Optimization
I optimized `src/api/routers/analytics.py` to cache the `electorates.json` and `postcode_to_electorate.json` files in memory at the module level. This prevents the API from re-reading these files from disk on every request, significantly improving performance for the War Room dashboard.

```python
# Cache Data in Memory
electorates_path = ...
NAME_MAP = {}
# ... load once ...

@router.get("/electorate-counts")
def get_electorate_counts(...):
    # ... use NAME_MAP ...
```

### Frontend Visuals
I adjusted the color scale for verified members in `frontend/src/pages/WarRoom.tsx`. The previous scale was too high (>500 for max intensity), which made strongholds like Cooper (85 members) appear weak. The new scale is calibrated to the current data reality:

- **> 80**: Darkest Green (Stronghold)
- **> 50**: Dark Green
- **> 30**: Medium Green
- **> 20**: Light Green
- **> 10**: Pale Green
- **> 0**: Yellow-Green
- **0**: Grey

## Verification
- **Performance**: The `/analytics/electorate-counts` endpoint should respond much faster.
- **Visuals**: The War Room map should now show more vibrant green colors for electorates with active members, accurately reflecting the party's current strength.
