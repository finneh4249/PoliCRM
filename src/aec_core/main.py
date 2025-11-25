import io
import os
import csv
import argparse
import time
import logging
import threading
import queue
from collections import Counter
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn, TimeRemainingColumn
from rich.console import Console
from rich.table import Table
from webdriver_manager.firefox import GeckoDriverManager

from .models import EXPECTED_FIELDS, OUTPUT_FIELDS
from .browser import get_driver, getAECStatus, validate_membership_data


def validate_input_file(input_filename):
    """Validate input CSV file and report issues without performing AEC checks."""
    console = Console()
    validation_errors = []
    warning_count = 0
    valid_count = 0
    
    with io.open(input_filename, "r", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile, delimiter=",")
        
        # Check for required fields
        if not EXPECTED_FIELDS.issubset(reader.fieldnames):
            missing = EXPECTED_FIELDS - set(reader.fieldnames)
            console.print(f"[red]ERROR: Missing required fields: {', '.join(missing)}[/red]")
            return
        
        console.print("[cyan]Validating input data...[/cyan]")
        
        for idx, row in enumerate(reader, start=2):  # Start at 2 to account for header
            if not row["first_name"]:
                validation_errors.append(f"Row {idx}: Missing first_name")
                continue
            
            is_valid, error_msg = validate_membership_data(row)
            if not is_valid:
                validation_errors.append(f"Row {idx} ({row.get('first_name', '')} {row.get('last_name', '')}): {error_msg}")
                warning_count += 1
            else:
                valid_count += 1
    
    # Print summary
    table = Table(title="Validation Summary")
    table.add_column("Status", style="cyan")
    table.add_column("Count", style="magenta")
    
    table.add_row("Valid Records", str(valid_count))
    table.add_row("Invalid Records", str(warning_count))
    
    console.print(table)
    
    if validation_errors:
        console.print(f"\n[yellow]Found {len(validation_errors)} validation issues:[/yellow]")
        for error in validation_errors[:20]:  # Show first 20 errors
            console.print(f"  - {error}")
        if len(validation_errors) > 20:
            console.print(f"  ... and {len(validation_errors) - 20} more")
    else:
        console.print("\n[green]All records passed validation![/green]")


def count_rows(filename):
    with open(filename, "r", encoding="utf-8") as f:
        return sum(1 for _ in f) - 1  # Subtract header


def worker(input_queue, output_lock, writer, output_file, progress, task, stats, nationbuilder_base, driver_path, headless):
    """Worker thread with automatic browser recovery on crashes."""
    driver = None
    consecutive_failures = 0
    MAX_CONSECUTIVE_FAILURES = 5
    
    def init_driver():
        """Initialize or reinitialize the browser driver."""
        nonlocal driver
        try:
            if driver:
                try:
                    driver.quit()
                except Exception:
                    pass
            driver = get_driver(driver_path, headless=headless)
            driver.get("https://check.aec.gov.au/")
            return True
        except Exception as e:
            logging.error(f"Failed to initialize driver: {e}")
            return False
    
    # Initial driver setup
    if not init_driver():
        logging.error("Worker thread terminating - could not initialize browser")
        return

    while True:
        try:
            membership_row = input_queue.get_nowait()
        except queue.Empty:
            break
            
        try:
            name = f"{membership_row['first_name']} {membership_row['last_name']}"
            
            # Check if driver is still alive
            try:
                driver.current_url
            except Exception:
                logging.warning("Browser crashed, attempting recovery...")
                if not init_driver():
                    logging.error("Failed to recover browser, skipping record")
                    stats["BROWSER_ERROR"] += 1
                    input_queue.task_done()
                    continue
            
            status = getAECStatus(driver, membership_row)
            
            # Reset consecutive failures on success
            if status[0] == "Pass":
                consecutive_failures = 0
            elif consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
                logging.warning(f"Too many consecutive failures ({consecutive_failures}), reinitializing browser...")
                if init_driver():
                    consecutive_failures = 0
                else:
                    logging.error("Failed to reinitialize browser after failures")
            else:
                consecutive_failures += 1
            
            output_row = {k: membership_row.get(k) for k in OUTPUT_FIELDS}
            output_row["nationbuilder_link"] = nationbuilder_base + str(membership_row["nationbuilder_id"])
            output_row.update({
                "AEC_result": status[0],
                "federal_division": status[1],
                "state_division": status[2],
                "local_government": status[3],
                "local_ward": status[4],
            })
            
            with output_lock:
                writer.writerow(output_row)
                output_file.flush()
                stats[status[0]] += 1
                progress.advance(task)
                logging.info(f"Result for {name} ({membership_row['nationbuilder_id']}): {status[0]}")

        except Exception as e:
            logging.error(f"Error processing row: {e}")
            consecutive_failures += 1
        finally:
            input_queue.task_done()
    
    # Cleanup
    if driver:
        try:
            driver.quit()
        except Exception:
            pass


def check_rows(
    input_filename,
    output_filename,
    skip: int,
    threads: int = 1,
    headless: bool = False,
    nationbuilder_base="https://futureparty.nationbuilder.com/admin/signups/",
):
    total_rows = count_rows(input_filename)
    stats = Counter()
    
    # Read all rows first
    rows_to_process = []
    with io.open(input_filename, "r", encoding="utf-8") as csvfile:
        reader = csv.DictReader(csvfile, delimiter=",")
        if not EXPECTED_FIELDS.issubset(reader.fieldnames):
            raise ValueError(
                f"Some fields are missing from this file: one of {', '.join(EXPECTED_FIELDS)}"
            )
        
        row_count = 0
        for row in reader:
            row_count += 1
            if row_count <= skip:
                continue
            if not row["first_name"]:
                continue
            rows_to_process.append(row)

    input_queue = queue.Queue()
    for row in rows_to_process:
        input_queue.put(row)

    # Install driver once to avoid race conditions
    driver_path = GeckoDriverManager().install()

    existing_output = os.path.exists(output_filename)
    output_lock = threading.Lock()

    with io.open(output_filename, "a", newline="", encoding="utf-8") as output_file:
        writer = csv.DictWriter(output_file, fieldnames=OUTPUT_FIELDS)
        if not existing_output:
            writer.writeheader()

        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            BarColumn(),
            TaskProgressColumn(),
            TimeRemainingColumn(),
        ) as progress:
            task = progress.add_task("[cyan]Verifying...", total=total_rows)
            
            if skip > 0:
                progress.advance(task, advance=skip)
            
            # Advance for rows that were skipped due to empty name
            skipped_empty_names = total_rows - skip - len(rows_to_process)
            if skipped_empty_names > 0:
                progress.advance(task, advance=skipped_empty_names)

            thread_list = []
            for _ in range(threads):
                t = threading.Thread(
                    target=worker,
                    args=(input_queue, output_lock, writer, output_file, progress, task, stats, nationbuilder_base, driver_path, headless)
                )
                t.daemon = True
                t.start()
                thread_list.append(t)
            
            # Wait for queue to be empty
            input_queue.join()
            
            # Wait for threads to finish
            for t in thread_list:
                t.join()

        console = Console()
        table = Table(title="Verification Statistics")
        table.add_column("Result", style="cyan")
        table.add_column("Count", style="magenta")

        for result, count in stats.items():
            table.add_row(str(result), str(count))

        console.print(table)


def main():
    # Configure logging to file as well
    file_handler = logging.FileHandler("aec_checker.log")
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))

    try:
        from rich.logging import RichHandler
        logging.basicConfig(
            level=logging.INFO,
            format="%(message)s",
            datefmt="[%X]",
            handlers=[RichHandler(rich_tracebacks=True), file_handler]
        )
    except ImportError:
        logging.basicConfig(
            level=logging.INFO, 
            format="%(asctime)s - %(levelname)s - %(message)s",
            handlers=[logging.StreamHandler(), file_handler]
        )

    parser = argparse.ArgumentParser(
        description="This program will iterate through a CSV file of members, "
        "and submit their details into the AEC website, to confirm their enrollment details."
    )
    parser.add_argument(
        "--skip", type=int, default=0, help="skip entries you've already seen"
    )
    parser.add_argument(
        "--infile",
        default="input.csv",
        help="This file is presumed to be exported from NationBuilder, "
        "with fields such as 'first_name' and 'primary_address1'",
    )
    parser.add_argument("--outfile", default="output.csv")
    parser.add_argument("--threads", type=int, default=1, help="Number of threads to use")
    parser.add_argument("--headless", action="store_true", help="Run in headless mode")
    parser.add_argument("--dry-run", action="store_true", help="Validate input data without performing AEC checks")
    parser.add_argument("--max-retries", type=int, default=3, help="Maximum retries per record (default: 3)")
    parser.add_argument("--delay-min", type=float, default=1.5, help="Minimum delay between requests in seconds")
    parser.add_argument("--delay-max", type=float, default=3.0, help="Maximum delay between requests in seconds")
    args = parser.parse_args()
    
    if args.dry_run:
        logging.info("Running in DRY-RUN mode - validating input data only")
        validate_input_file(args.infile)
        return
    
    check_rows(args.infile, args.outfile, args.skip, args.threads, args.headless)


if __name__ == "__main__":
    main()
