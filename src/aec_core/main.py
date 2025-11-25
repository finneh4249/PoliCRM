import io
import os
import csv
import argparse
import time
import logging

from .models import EXPECTED_FIELDS, OUTPUT_FIELDS
from .browser import get_driver, getAECStatus


def check_rows(
    input_filename,
    output_filename,
    skip: int,
    nationbuilder_base="https://futureparty.nationbuilder.com/admin/signups/",
):
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
                for membership_row in reader:
                    row_count += 1
                    output_row = {k: membership_row.get(k) for k in OUTPUT_FIELDS}
                    output_row["nationbuilder_link"] = nationbuilder_base + str(
                        membership_row["nationbuilder_id"]
                    )
                    if row_count <= skip:
                        # Assume that this has already been written as output.
                        continue
                    if not membership_row["first_name"]:
                        # A member needs a  name
                        continue
                    time.sleep(0.1)
                    status = getAECStatus(driver, membership_row)
                    logging.info(
                        f"The result for {membership_row['first_name']} "
                        f"{membership_row['last_name']} "
                        f"({membership_row['nationbuilder_id']}) was {status[0]}"
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
