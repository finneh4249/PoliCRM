#!python3

import csv
import re
import argparse
import sys
import logging

#                               cruft       name    whatever
revAddressSplitter = re.compile(r"^[^A-Z]*([A-Z \-]+)( .+)?$")
stateAbs = {
    "AUSTRALIAN CAPITAL TERRITORY": "ACT",
    "NEW SOUTH WALES": "NSW",
    "NORTHERN TERRITORY": "NT",
    "QUEENSLAND": "QLD",
    "SOUTH AUSTRALIA": "SA",
    "TASMANIA": "TAS",
    "VICTORIA": "VIC",
    "WESTERN AUSTRALIA": "WA",
}
streetTypes = {
    "ROAD": "RD",
    "STREET": "ST",
    "AVENUE": "AVE",
    "COURT": "CT",
    "CIRCUIT": "CRCT",
    "CCT": "CRCT",
    "PLACE": "PL",
    "DRIVE": "DR",
    "PARADE": "PDE",
    "CLOSE": "CL",
    "ESPLANADE": "ESP",
    "BOULEVARD": "BLVD",
    "SQUARE": "SQ",
    "TERRACE": "TCE",
    "CRESCENT": "CRES",
    "GROVE": "GR",
    "HIGHWAY": "HWY",
    "LANE": "LANE",
    "GARDENS": "GDNS",
    "WAY": "WAY",
    "LOOP": "LOOP",
    "MEWS": "MEWS",
}
stateShorts = set(stateAbs.values())
streetShorts = set(streetTypes.values())


def convert_address(state, origAddress):
    """Normalises states to abbreviation, and
    extracts normalised street names from addresses.
    Returns (state, street_address)
    May raise IndexError, AttributeError, TypeError, KeyError"""

    street = ""
    streetName = ""
    streetType = ""

    rev = (origAddress[::-1]).upper()
    rev = re.sub(r"[,']", "", rev)

    matchme = revAddressSplitter.match(rev)
    street = (((matchme.group(1))[::-1]).strip()).split(" ")

    streetName = " ".join(street[:-1])
    streetType = street[-1]

    state = convert_state(state)

    try:
        if streetType not in streetShorts:
            streetType = streetTypes[streetType]
    except Exception as e:
        for k, v in streetTypes.items():
            if streetType.startswith(v) or k.startswith(streetType):
                streetType = v
                break
        else:
            logging.error(e)
            raise KeyError
    return (state, streetName + " " + streetType)


def convert_state(state):
    """Normalises states to abbreviation"""
    state_upper = state.upper().strip()
    if state_upper in stateShorts:
        return state_upper
    if len(state) > 3 or state not in stateShorts:
        state = stateAbs[state_upper]
    return state


def process_csv(infile, outfile):
    rdr = csv.DictReader(infile)
    fieldnames = rdr.fieldnames + ["origAddress"]
    wtr = csv.DictWriter(outfile, fieldnames=fieldnames)
    wtr.writeheader()

    stderr_yet = False

    for row in rdr:
        # Try to find the address and state from available columns
        raw_address = row.get("primary_address1")
        if not raw_address:
            raw_address = row.get("registered_address1")
            # If registered_address1 is also empty, try registered_street_name etc?
            # For now, stick to these two.

        raw_state = row.get("primary_state")
        if not raw_state:
            raw_state = row.get("registered_state")
        if not raw_state:
            raw_state = row.get("address_state")
        if not raw_state:
            raw_state = row.get("mailing_state")

        if not raw_address:
            # No address found, write as is
            wtr.writerow(row)
            continue

        og = raw_address
        try:
            # Ensure we have a string for state
            state_input = raw_state if raw_state else ""
            (state, streetName) = convert_address(state_input, raw_address)

            # Update the row with the cleaned data
            # We update primary_* fields so aec_checker can use them
            row["primary_address1"] = streetName
            row["primary_state"] = state

            # Fill in other primary fields if missing, from registered
            if not row.get("primary_city") and row.get("registered_city"):
                row["primary_city"] = row.get("registered_city")
            if not row.get("primary_zip") and row.get("registered_zip"):
                row["primary_zip"] = row.get("registered_zip")

            row["origAddress"] = og
            wtr.writerow(row)

        except (IndexError, AttributeError, TypeError, KeyError) as e:
            if not stderr_yet:
                logging.warning(
                    "\nThe following entries are anomalous and will need to be manually considered:"
                    "\n%s",
                    e,
                )
                stderr_yet = True

            logging.warning(f"Failed to convert: {og} ({e})")
            row["origAddress"] = og
            wtr.writerow(row)
            continue


def main():
    logging.basicConfig(level=logging.INFO, format="%(message)s", stream=sys.stderr)
    parser = argparse.ArgumentParser(
        description="Try and fix street names in addresses for aec_checker.py"
    )
    parser.add_argument(
        "infile", nargs="?", type=argparse.FileType("r"), default=sys.stdin
    )
    parser.add_argument(
        "outfile", nargs="?", type=argparse.FileType("w"), default=sys.stdout
    )
    args = parser.parse_args()

    process_csv(args.infile, args.outfile)


if __name__ == "__main__":
    main()
