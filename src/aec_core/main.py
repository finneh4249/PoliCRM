import io
import os
import csv
import argparse
import time
import logging
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn, TimeRemainingColumn

from .models import EXPECTED_FIELDS, OUTPUT_FIELDS
from .browser import get_driver, getAECStatus


def count_rows(filename):
    with open(filename, "r", encoding="utf-8") as f:
        return sum(1 for _ in f) - 1  # Subtract header


def check_rows(
    input_filename,
    output_filename,
    skip: int,
    nationbuilder_base="https://futureparty.nationbuilder.com/admin/signups/",
):
    total_rows = count_rows(input_filename)
    
    # If we are skipping, adjust the total for the progress bar
    total_to_process = total_rows - skip

    with get_driver() as driver:
        driver.get("https://check.aec.gov.au/")
        with io.open(input_filename) as csvfile:
            reader = csv.DictReader(csvfile, delimiter=",")
            if not EXPECTED_FIELDS.issubset(reader.fieldnames):
                raise ValueError(
                    f"Some fields are missing from this file: one of {', '.join(EXPECTED_FIELDS)}"
                )
            
            row_count = 0
            existing_output = os.path.exists(output_filename)
            
            with io.open(
                output_filename,
                "a",
                newline="",
            ) as output_file:
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
                    
                    # Advance progress for skipped rows
                    if skip > 0:
                        progress.advance(task, advance=skip)

                    for membership_row in reader:
                        row_count += 1
                        
                        if row_count <= skip:
                            continue

                        output_row = {k: membership_row.get(k) for k in OUTPUT_FIELDS}
                        output_row["nationbuilder_link"] = nationbuilder_base + str(
                            membership_row["nationbuilder_id"]
                        )

                        if not membership_row["first_name"]:
                            # A member needs a name
                            progress.advance(task)
                            continue

                        time.sleep(0.1)
                        
                        # Update description to show who we are checking
                        name = f"{membership_row['first_name']} {membership_row['last_name']}"
                        progress.update(task, description=f"[cyan]Verifying {name}...")
                        
                        status = getAECStatus(driver, membership_row)
                        
                        # Log result (will appear above progress bar if using RichHandler)
                        logging.info(
                            f"Result for {name} ({membership_row['nationbuilder_id']}): {status[0]}"
                        )
                        
                        output_row.update(
                            {
                                "AEC_result": status[0],
                                "federal_division": status[1],
                                "state_division": status[2],
                                "local_government": status[3],
                                "local_ward": status[4],
                            }
                        )
                        writer.writerow(output_row)
                        output_file.flush() # Ensure data is written in case of crash
                        
                        progress.advance(task)


def main():
    try:
        from rich.logging import RichHandler
        logging.basicConfig(
            level=logging.INFO,
            format="%(message)s",
            datefmt="[%X]",
            handlers=[RichHandler(rich_tracebacks=True)]
        )
    except ImportError:
        logging.basicConfig(
            level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
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
    args = parser.parse_args()
    check_rows(args.infile, args.outfile, args.skip)


if __name__ == "__main__":
    main()
