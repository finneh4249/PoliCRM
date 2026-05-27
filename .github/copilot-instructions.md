> AEC Checker automates AEC enrolment verification. Keep agents focused on existing flows; avoid aspirational patterns.

## Architecture & Responsibilities
- Pipeline: CSV (NationBuilder schema) → `aec_checker.py` CLI/TUI → `src/aec_core/browser.py` Selenium automation → results CSV with divisions.
- FastAPI CRM (`src/api/main.py`) fronts the same logic: seeds admin users/parties, serves built React assets from `src/api/static/dist`, and mounts routers for members/tags/stats/search/analytics/websocket/ERA.
- BrowserPool (`src/api/worker_pool.py`) is the API-side worker queue: per-thread Firefox drivers, RateLimiter (100/hr, 2000/day), watchdog for stuck workers, ERA short-circuit before hitting AEC.
- Address normalization lives in `src/utils/convert_addresses.py` (streetTypes/stateAbs maps ~220 entries) and must precede browser checks; PO Boxes stay untouched.

## Critical Workflows
- CLI verification: `python aec_checker.py --infile members.csv --outfile verified.csv --threads 2 --headless --max-retries 5 --delay-min 2.0 --delay-max 4.0`. Use `--dry-run` for validation only and keep threads ≤2 to avoid CAPTCHA.
- Data prep: `python src/utils/convert_addresses.py <input.csv> <output.csv>` to normalize addresses; expected columns: first/middle/last/nationbuilder_id/primary_address1/primary_city/primary_state/primary_zip.
- CRM stack: `./run_crm.sh` builds Vite frontend, spins Postgres via Docker if present (else SQLite), then `uvicorn src.api.main:app --reload` on :8000. API docs at /docs, dashboard at /.
- Tests: `python -m pytest tests/ -v`; targeted `python -m unittest tests/test_aec_checker.py`.

## Selenium/AEC Interaction
- Only suburb dropdown uses native `Select`; street uses Select2 search box (see `Select2` flow in `browser.py`).
- Humanization: random user-agents, private browsing, window size randomization, human_type/human_click, base retry delay 3s, rate-limit delay 12-20s between requests, page timeout 20s.
- Result parsing: `extract_electoral_info()` scrapes federal/state/local/ward labels; statuses include PASS, PARTIAL, FAIL_SUBURB, FAIL_STREET, FAIL_NO_MATCH, CAPTCHA.

## Threading & Safety
- `src/aec_core/main.py` worker: never share WebDriver across threads; installs geckodriver once; `MAX_CONSECUTIVE_FAILURES=5` triggers driver reinit; output guarded by `output_lock` and flushed every row.
- BrowserPool mirrors this with per-worker drivers and requeues on driver death; watchdog restarts workers idle >5m.

## Logging & Diagnostics
- Rich console + file logging to `aec_checker.log`; check for CAPTCHA, suburb/street misses, and driver crashes. API uses RichHandler and global exception handlers.
- Validation first: `validate_membership_data()` ensures required names, numeric postcode, and address pieces before browser work; skip empty first_name rows.

## Conventions When Editing
- Add new CLI args in both `argparse` (aec_checker.py) and any TUI prompts. Keep street normalization changes inside `streetTypes`/`stateAbs`, not ad hoc.
- If AEC HTML shifts, update regex in `extract_electoral_info()` and Select2 selectors/IDs (GIVEN_NAME_ID etc.).
- Frontend is Vite/React in `/frontend`; built assets live under `src/api/static/dist`. Avoid breaking static mount paths.

## Common Pitfalls
- Reducing delays/raising thread count causes CAPTCHA floods; prefer delay-min 3.0 / delay-max 5.0 under pressure.
- Missing geckodriver: local copy in `src/aec_core/bin/geckodriver` or fall back to webdriver-manager.
- ERA integration: only short-circuits when state data is loaded; otherwise falls back to browser. Keep `STATE_CODE_MAP` in sync with ERA uploads.
