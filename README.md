# AEC Checker

This program automates the verification of voter enrollment details by iterating through a CSV file of members and submitting their details to the [AEC website](https://check.aec.gov.au/).

## Prerequisites

-   **Python 3.x**: Ensure you have Python installed.
-   **Firefox Browser**: This tool uses Selenium with Firefox. Please ensure Firefox is installed on your system.

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
3.  Running the AEC verification.

### Command Line Interface

You can still run the tools individually via the command line.

#### 1. Prepare your Data (Optional)

Raw data often contains inconsistent address formats (e.g., "Street" vs "St", "Victoria" vs "VIC"). The `convert_addresses.py` utility helps normalize these to match AEC expectations.

```bash
python convert_addresses.py <input.csv> <output.csv>
```

-   **Input**: A CSV file (e.g., exported from NationBuilder).
-   **Output**: A new CSV file with normalized `primary_address1` and `primary_state` columns. The original address is preserved in an `origAddress` column.

### 2. Run the Checker

Run the main script to verify enrollments:

```bash
python aec_checker.py --infile <input_file.csv> --outfile <output_file.csv>
```

#### Arguments

-   `--infile`: Path to the input CSV file (default: `input.csv`).
-   `--outfile`: Path to the output CSV file (default: `output.csv`).
-   `--skip`: Number of entries to skip (useful for resuming interrupted runs).

#### Input CSV Format

The input CSV file is expected to have the following columns (standard NationBuilder export format):

-   `first_name`
-   `middle_name`
-   `last_name`
-   `nationbuilder_id`
-   `primary_address1` (Street address)
-   `primary_address2` (Optional)
-   `primary_address3` (Optional)
-   `primary_city` (Suburb)
-   `primary_state` (State abbreviation, e.g., VIC, NSW)
-   `primary_zip` (Postcode)
-   `primary_country_code`

#### Output CSV Format

The output file will contain the original member details plus:

-   `nationbuilder_link`: Link to the member's profile.
-   `AEC_result`: Result of the check (`Pass`, `Partial`, `Fail`, `Fail_Street`, `Fail_Suburb`).
-   `federal_division`: The federal electorate found.
-   `state_division`: The state electorate found.
-   `local_government`: The local government area.
-   `local_ward`: The local ward.

## Troubleshooting

### "Unable to validate, if you are using VPN software..."

The AEC website has strict anti-bot protections. If you see this error or if the script fails to verify valid details:
1.  **Disable VPNs**: Ensure you are not connected to a VPN.
2.  **Browser**: The script is configured to use Firefox to better mimic human behavior. Ensure Firefox is up to date.
3.  **Rate Limiting**: If you run the script too fast or for too many records, you might be temporarily blocked. The script includes delays to mitigate this.

### "Element click intercepted" or Selection Errors

The script interacts with complex dropdowns on the AEC site. If it fails to select a street or suburb that you know is correct:
-   Check the `convert_addresses.py` output to ensure the address format matches what the AEC expects (e.g., "RD" instead of "ROAD").
-   The script attempts to handle the AEC's autocomplete dropdowns, but UI changes on the AEC site can break this.

## Project Structure

-   `aec_checker.py`: Entry point for the checker.
-   `convert_addresses.py`: Utility for address normalization.
-   `src/aec_core/`: Core logic package.
    -   `browser.py`: Selenium automation logic.
    -   `models.py`: Data models and constants.
    -   `utils.py`: Helper functions.
