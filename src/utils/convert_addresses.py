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
    "RISE": "RISE",
    "WALK": "WALK",
    "LINK": "LINK",
    "GLADE": "GLADE",
    "GRANGE": "GRANGE",
    "HEIGHTS": "HTS",
    "COVE": "COVE",
    "POINT": "PT",
    "VIEW": "VW",
    "VIEWS": "VWS",
    "PARKWAY": "PKWY",
    "ALLEY": "ALLY",
    "ARCADE": "ARC",
    "BEND": "BND",
    "BRAE": "BRAE",
    "BRACE": "BR",
    "BREAK": "BRK",
    "BROW": "BROW",
    "BYWAY": "BYWY",
    "CAUSEWAY": "CSWY",
    "CENTRE": "CTR",
    "CENTREWAY": "CNWY",
    "CHASE": "CH",
    "CIRCLE": "CIR",
    "CIRCLET": "CLT",
    "COMMON": "CMMN",
    "CONCOURSE": "CON",
    "COPSE": "CPS",
    "CORNER": "CNR",
    "CORSO": "CSO",
    "CROSS": "CRS",
    "CROSSING": "CRSG",
    "DALE": "DALE",
    "DELL": "DELL",
    "DENE": "DENE",
    "DIVIDE": "DIV",
    "DOMAIN": "DOM",
    "DOWN": "DOWN",
    "DOWNS": "DWNS",
    "DRIVEWAY": "DRWY",
    "EDGE": "EDGE",
    "ELBOW": "ELB",
    "END": "END",
    "ENTRANCE": "ENT",
    "ESTATE": "EST",
    "EXPRESSWAY": "EXP",
    "EXTENSION": "EXT",
    "FAIRWAY": "FAIR",
    "FIRE TRACK": "FTRK",
    "FIRETRAIL": "FITR",
    "FLAT": "FLAT",
    "FOLLOW": "FOLW",
    "FOOTWAY": "FTWY",
    "FORESHORE": "FSHR",
    "FORMATION": "FORM",
    "FREEWAY": "FWY",
    "FRONT": "FRNT",
    "FRONTAGE": "FRTG",
    "GAP": "GAP",
    "GARDEN": "GDN",
    "GATE": "GTE",
    "GATES": "GTES",
    "GATEWAY": "GWY",
    "GLEN": "GLN",
    "GRANGE": "GRA",
    "GREEN": "GRN",
    "GROUND": "GRND",
    "GROVE": "GR",
    "HEIGHTS": "HTS",
    "HIGHROAD": "HIRD",
    "HILL": "HILL",
    "HILLS": "HLLS",
    "HOLLOW": "HLLW",
    "HUB": "HUB",
    "INLET": "INLT",
    "ISLAND": "ID",
    "JUNCTION": "JNC",
    "KEY": "KEY",
    "LANDING": "LDG",
    "LANEWAY": "LNWY",
    "LEES": "LEES",
    "LINE": "LINE",
    "LINK": "LINK",
    "LITTLE": "LT",
    "LOOKOUT": "LKT",
    "LOWER": "LWR",
    "MALL": "MALL",
    "MEANDER": "MNDR",
    "MEWS": "MEWS",
    "MILE": "MILE",
    "MOTORWAY": "MWY",
    "MOUNT": "MT",
    "NOOK": "NOOK",
    "OUTLOOK": "OTLK",
    "PARK": "PARK",
    "PARKLANDS": "PKLD",
    "PARKWAY": "PKWY",
    "PART": "PART",
    "PASS": "PASS",
    "PATH": "PATH",
    "PATHWAY": "PHWY",
    "PIAZZA": "PIAZ",
    "PLACE": "PL",
    "PLATEAU": "PLAT",
    "PLAZA": "PLZA",
    "POCKET": "PKT",
    "POINT": "PT",
    "PORT": "PORT",
    "PROMENADE": "PROM",
    "QUAD": "QUAD",
    "QUADRANT": "QDRT",
    "QUAY": "QY",
    "QUAYS": "QYS",
    "RAMBLE": "RMBL",
    "RAMP": "RAMP",
    "RANGE": "RNGE",
    "REACH": "RCH",
    "RESERVE": "RES",
    "REST": "REST",
    "RETREAT": "RTT",
    "RIDE": "RIDE",
    "RIDGE": "RDGE",
    "RIDGEWAY": "RGWY",
    "RIGHT OF WAY": "ROW",
    "RING": "RING",
    "RISE": "RISE",
    "RIVER": "RVR",
    "RIVERWAY": "RVWY",
    "RIVIERA": "RIV",
    "ROAD": "RD",
    "ROADS": "RDS",
    "ROADSIDE": "RDSD",
    "ROADWAY": "RDWY",
    "RONDE": "RNDE",
    "ROSEBOWL": "RSBL",
    "ROTUNDA": "RTDA",
    "ROUTE": "RTE",
    "ROW": "ROW",
    "RUE": "RUE",
    "RUN": "RUN",
    "SERVICE WAY": "SWY",
    "SIDING": "SDG",
    "SLOPE": "SLPE",
    "SOUND": "SND",
    "SPUR": "SPUR",
    "SQUARE": "SQ",
    "STAIRS": "STRS",
    "STATE HIGHWAY": "SHWY",
    "STEPS": "STPS",
    "STRAND": "STRA",
    "STREET": "ST",
    "STRIP": "STRP",
    "SUBWAY": "SBWY",
    "TARN": "TARN",
    "TERRACE": "TCE",
    "THOROUGHFARE": "THFR",
    "TOLLWAY": "TLWY",
    "TOP": "TOP",
    "TOR": "TOR",
    "TOWERS": "TWRS",
    "TRACK": "TRK",
    "TRAIL": "TRL",
    "TRAILER": "TRLR",
    "TRIANGLE": "TRI",
    "TRUNKWAY": "TKWY",
    "TURN": "TURN",
    "UNDERPASS": "UPAS",
    "UPPER": "UPR",
    "VALE": "VALE",
    "VIADUCT": "VDCT",
    "VIEW": "VW",
    "VILLAS": "VLLS",
    "VISTA": "VSTA",
    "WALK": "WALK",
    "WALKWAY": "WKWY",
    "WAY": "WAY",
    "WHARF": "WHRF",
    "WYND": "WYND",
    "YARD": "YARD",
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
    if not matchme:
        # Regex failed to match, return original
        return (convert_state(state), origAddress)
        
    street = (((matchme.group(1))[::-1]).strip()).split(" ")

    streetName = " ".join(street[:-1])
    streetType = street[-1]

    # Handle PO Boxes and other non-street addresses
    if "PO BOX" in origAddress.upper() or "GPO BOX" in origAddress.upper() or "LOCKED BAG" in origAddress.upper():
        # AEC checker likely can't verify PO Boxes, but we shouldn't crash or mangle them
        # Just return as is or mark as unverified?
        # For now, let's just return the original address as the street name and empty type
        # But the function expects a tuple (state, street_address)
        # The caller expects a street address.
        return (convert_state(state), origAddress)

    state = convert_state(state)

    try:
        if streetType not in streetShorts:
            streetType = streetTypes[streetType]
    except Exception as e:
        # Try to find a match in the keys
        found = False
        for k, v in streetTypes.items():
            if streetType == v: # Already abbreviated
                found = True
                break
            if streetType.startswith(v) or k.startswith(streetType):
                streetType = v
                found = True
                break
        
        if not found:
            # If we can't find the street type, it might be part of the name or a type we don't know.
            # Instead of crashing, let's append it back to the name and assume the user knows what they are doing,
            # or that the AEC checker might handle it (or fail gracefully later).
            # logging.warning(f"Unknown street type '{streetType}' in '{origAddress}'. Preserving original.")
            streetName = streetName + " " + streetType
            streetType = ""
            # raise KeyError # Don't raise, just continue
    
    final_address = (streetName + " " + streetType).strip()
    return (state, final_address)


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
            # This catch block should now be largely unreachable due to changes in convert_address
            # but kept for safety.
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
