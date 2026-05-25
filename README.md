# AEC Checker

This program automates the verification of voter enrollment details by iterating through a CSV file of members and submitting their details to the [AEC website](https://check.aec.gov.au/).

## Prerequisites

- **Python 3.x**: Ensure you have Python installed.
- **Firefox Browser**: This tool uses Selenium with Firefox. Please ensure Firefox is installed on your system.

## Installation

1.  Clone the repository:

    ```bash
    git clone <repository-url>
    cd AEC_Checker
    ```

2.  Create and activate a virtual environment (recommended):

    ```bash
    python3 -m venv .venv
    source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
    ```

3.  Install the required Python packages:
    ```bash
    pip install -r requirements.txt
    ```

## Usage

### Interactive Mode (Recommended)

Simply run the script without arguments to launch the interactive Text User Interface (TUI):

```bash
python aec_checker.py
```

This will guide you through:

1.  Selecting an input CSV file.
2.  Optionally normalizing addresses (using `convert_addresses.py`).
3.  Choosing validation mode (dry-run) to check data without performing AEC checks.
4.  Configuring advanced options (retry attempts, delays between requests).
5.  Running the AEC verification with progress tracking.
6.  Creating filtered output files based on results.

### Web CRM (Fusion Pilot)

For a full graphical interface with member management, dashboard, and bulk tools:

```bash
./run_crm.sh
```

This will start the web server and open the dashboard at `http://localhost:8000`.

**Features:**

- **Dashboard**: Real-time stats on verification progress.
- **Member Management**: Add, edit, tag, and annotate members.
- **Import**: Drag-and-drop CSV import with auto-verification.
- **AEC Verification**: Automated background checks.

### Command Line Interface

You can run the tools with command-line arguments for automation:

```bash
python aec_checker.py --infile input.csv --outfile output.csv --threads 2 --headless
```

#### Enhanced Arguments

- `--infile`: Path to the input CSV file (default: `input.csv`).
- `--outfile`: Path to the output CSV file (default: `output.csv`).
- `--skip`: Number of entries to skip (useful for resuming interrupted runs).
- `--threads`: Number of concurrent browser threads (default: 1, recommend 2-3 max).
- `--headless`: Run browsers in headless mode (no visible windows).
- `--dry-run`: Validate input data without performing AEC checks.
- `--max-retries`: Maximum retry attempts per record (default: 3).
- `--delay-min`: Minimum delay between requests in seconds (default: 1.5).
- `--delay-max`: Maximum delay between requests in seconds (default: 3.0).

### Example Workflows

#### Validate Data Quality

```bash
python aec_checker.py --infile members.csv --dry-run
```

#### Production Run with Retries

```bash
python aec_checker.py --infile members.csv --outfile verified.csv \
  --threads 2 --headless --max-retries 5 --delay-min 2.0 --delay-max 4.0
```

#### Resume Interrupted Job

```bash
python aec_checker.py --infile members.csv --outfile verified.csv --skip 150
```

#### 1. Prepare your Data (Optional)

Raw data often contains inconsistent address formats (e.g., "Street" vs "St", "Victoria" vs "VIC"). The `convert_addresses.py` utility helps normalize these to match AEC expectations.

```bash
python src/utils/convert_addresses.py <input.csv> <output.csv>
```

- **Input**: A CSV file (e.g., exported from NationBuilder).
- **Output**: A new CSV file with normalized `primary_address1` and `primary_state` columns. The original address is preserved in an `origAddress` column.

### 2. Run the Checker

Run the main script to verify enrollments:

```bash
python aec_checker.py --infile <input_file.csv> --outfile <output_file.csv>
```

#### Arguments

- `--infile`: Path to the input CSV file (default: `input.csv`).
- `--outfile`: Path to the output CSV file (default: `output.csv`).
- `--skip`: Number of entries to skip (useful for resuming interrupted runs).

#### Input CSV Format

The input CSV file is expected to have the following columns (standard NationBuilder export format):

- `first_name`
- `middle_name`
- `last_name`
- `nationbuilder_id`
- `primary_address1` (Street address)
- `primary_address2` (Optional)
- `primary_address3` (Optional)
- `primary_city` (Suburb)
- `primary_state` (State abbreviation, e.g., VIC, NSW)
- `primary_zip` (Postcode)
- `primary_country_code`

#### Output CSV Format

The output file will contain the original member details plus:

- `nationbuilder_link`: Link to the member's profile.
- `AEC_result`: Result of the check (`Pass`, `Partial`, `Fail`, `Fail_Street`, `Fail_Suburb`).
- `federal_division`: The federal electorate found.
- `state_division`: The state electorate found.
- `local_government`: The local government area.
- `local_ward`: The local ward.

## Troubleshooting

### "Unable to validate, if you are using VPN software..."

The AEC website has strict anti-bot protections. If you see this error or if the script fails to verify valid details:

1.  **Disable VPNs**: Ensure you are not connected to a VPN.
2.  **Browser**: The script is configured to use Firefox to better mimic human behavior. Ensure Firefox is up to date.
3.  **Rate Limiting**: If you run the script too fast or for too many records, you might be temporarily blocked.
    - Use `--delay-min 2.0 --delay-max 4.0` for more conservative timing
    - Reduce thread count to 1-2 with `--threads 2`
    - The script includes automatic retry logic to handle transient issues

### CAPTCHA Challenges

If you encounter CAPTCHA challenges:

1.  **Increase delays**: Use longer delays between requests (e.g., `--delay-min 3.0 --delay-max 5.0`)
2.  **Reduce threads**: Use `--threads 1` to minimize detection
3.  **Monitor logs**: Check `aec_checker.log` for CAPTCHA warnings
4.  **Manual intervention**: The script will detect CAPTCHAs and pause with longer delays

### Browser Crashes

The script now includes automatic browser recovery:

- If a browser crashes, the thread will automatically restart it
- Progress is saved after each record, so no work is lost
- Check logs for repeated crash patterns which may indicate system issues

### "Element click intercepted" or Selection Errors

The script interacts with complex dropdowns on the AEC site. If it fails to select a street or suburb:

- Use the address normalization feature: `--normalize` or select it in TUI
- Check the `convert_addresses.py` output to ensure the address format matches AEC expectations
- The script now includes retry logic to handle transient UI issues
- Review `aec_checker.log` for specific error details

### Invalid Input Data

Use validation mode to check data quality before running:

```bash
python aec_checker.py --infile members.csv --dry-run
```

This will report:

- Missing required fields
- Invalid postcodes
- Missing addresses
- Other data quality issues

## New Features

See `IMPROVEMENTS.md` for detailed documentation of recent enhancements:

- Retry logic with exponential backoff
- Configurable rate limiting
- Input validation and dry-run mode
- Enhanced result extraction (actual electoral divisions)
- Browser crash recovery
- CAPTCHA detection
- Improved logging and error handling

## Project Structure

- `aec_checker.py`: Entry point for the checker.
- `src/`: Source code.
  - `aec_core/`: Core logic package.
    - `browser.py`: Selenium automation logic.
    - `models.py`: Data models and constants.
    - `utils.py`: Helper functions.
  - `utils/`: Utility scripts.
    - `convert_addresses.py`: Address normalization logic.
