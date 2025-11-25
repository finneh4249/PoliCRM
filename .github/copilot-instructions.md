# AEC Checker - AI Coding Agent Guide

## Project Overview

AEC Checker automates verification of Australian voter enrollment by submitting member data to the [AEC website](https://check.aec.gov.au/). It's a **web scraping tool** that uses Selenium to interact with the AEC's complex dropdown-based forms, with built-in anti-bot detection evasion and retry logic.

**Architecture:** Multi-threaded Selenium automation → CSV processing → Optional FastAPI backend for CRM integrationAWSZ-highlighted`

**Standard WebDriver `Select()` only works for suburb dropdown** (`DropdownSuburb`), not streets.

### Data Flow & CSV Schema
Input CSV (NationBuilder export format):
```
first_name, middle_name, last_name, nationbuilder_id,
primary_address1, primary_city, primary_state, primary_zip
```

Output adds: `AEC_result`, `federal_division`, `state_division`, `local_government`, `local_ward`

**Address normalization** (`convert_addresses.py`) must run first to convert "123 Smith Street" → "SMITH ST" and "Victoria" → "VIC". See `streetTypes` dict (220+ mappings) and `stateAbs` in `src/utils/convert_addresses.py`.

### Result Types (AECResult Enum)
- `PASS`: Electoral divisions extracted via regex (`extract_electoral_info()`)
- `FAIL_SUBURB`: Suburb not in AEC dropdown (missing postcode or typo)
- `FAIL_STREET`: Street not found (address normalization needed)
- `FAIL_NO_MATCH`: Valid check but person not enrolled
- `CAPTCHA`: Bot detection triggered - exponential backoff required
- `PARTIAL`: Manual review needed

## Development Workflows

### Running Checks
```bash
# Interactive TUI (recommended)
python aec_checker.py

# CLI with all options
python aec_checker.py --infile data.csv --outfile results.csv \
  --threads 2 --headless --max-retries 5 --delay-min 2.0 --delay-max 4.0

# Validate data quality without AEC checks
python aec_checker.py --infile data.csv --dry-run
```

### Testing
```bash
# Run all tests
python -m pytest tests/ -v

# Specific test file
python -m unittest tests/test_aec_checker.py
```

Tests cover: address parsing (`get_address_components`), normalization (`convert_addresses`), and API endpoints.

### API Mode (Experimental)
FastAPI backend in `src/api/` for CRM integration:
```bash
cd src/api
uvicorn main:app --reload
```
Uses SQLAlchemy models + worker pool pattern (`BrowserPool` in `worker_pool.py`) to queue checks.

## Code Patterns & Conventions

### Logging
Use Rich for console + file logging:
```python
from rich.logging import RichHandler
logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    handlers=[RichHandler(rich_tracebacks=True), file_handler]
)
```
All worker threads log to `aec_checker.log` - **always check this file when debugging failures**.

### Browser Recovery
Workers auto-reinitialize crashed browsers:
```python
def init_driver():
    if driver:
        driver.quit()
    driver = get_driver(driver_path, headless=headless)
    driver.get("https://check.aec.gov.au/")
    return True
```
Monitor consecutive failures (`MAX_CONSECUTIVE_FAILURES = 5`) to detect persistent issues.

### Threading Model
`worker()` function in `src/aec_core/main.py`:
- Uses `queue.Queue` for thread-safe task distribution
- Each thread gets its own WebDriver instance (stored locally in `driver` variable)
- Results written with `output_lock` to prevent CSV corruption
- **Never share WebDriver instances between threads**

### Validation Before Processing
Always call `validate_membership_data()` before `getAECStatus()`:
```python
is_valid, error_msg = validate_membership_data(membership_row)
if not is_valid:
    return AECStatus(AECResult.FAIL, None, None, None, None)
```
Checks: required fields, numeric postcode, non-empty address components.

## File Organization

- `aec_checker.py` - Entry point with TUI (questionary) or CLI passthrough
- `src/aec_core/`
  - `browser.py` - Selenium automation, retry logic, CAPTCHA detection
  - `main.py` - Multithreading, CSV I/O, worker pool coordination
  - `models.py` - Data models (`AECStatus`, field constants)
  - `utils.py` - Name/address parsing helpers
- `src/utils/convert_addresses.py` - Standalone address normalization (can run as CLI)
- `src/api/` - FastAPI backend (optional CRM integration)
- `tests/` - Unit tests (pytest/unittest)

## Common Pitfalls

1. **Modifying delays/retries** → CAPTCHA floods. Use `--delay-min 3.0 --delay-max 5.0` if seeing blocks.
2. **Ignoring validation errors** → Runtime failures deep in processing. Always run `--dry-run` on new datasets.
3. **PO Boxes** → Cannot be verified via AEC. `convert_addresses.py` returns them unchanged; expect `FAIL_STREET`.
4. **Thread count > 3** → Higher bot detection risk. Recommend 1-2 for production.
5. **Missing geckodriver** → Use `webdriver-manager` (already in `requirements.txt`) for auto-download.

## When Making Changes

- **Browser interaction**: Test with `--threads 1` first, then scale up
- **Address parsing**: Add new street types to `streetTypes` dict, not inline
- **Result extraction**: Update regex patterns in `extract_electoral_info()` if AEC HTML changes
- **New CLI args**: Add to both `argparse` in `main.py` AND TUI in `aec_checker.py`
- **Error handling**: Log to both console (Rich) and file handler for debugging

## Future Enhancements (see IMPROVEMENTS.md)

Planned but not implemented: config file loading (`config.example.json` exists), Docker support, alternative browsers (Chrome/Edge), batch auto-splitting for large datasets.
