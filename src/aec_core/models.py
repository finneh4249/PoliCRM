from enum import Enum
import collections


class AECResult(Enum):
    PASS = "Pass"
    PARTIAL = "Partial"
    FAIL = "Fail"
    FAIL_NO_MATCH = "Fail_No_Match"
    FAIL_STREET = "Fail_Street"
    FAIL_SUBURB = "Fail_Suburb"


AECStatus = collections.namedtuple(
    "AECStatus", ["result", "federal", "state", "local_gov", "local_ward"]
)

ADDRESSES = {
    "address1",
    "address2",
    "address3",
    "city",  # Suburb
    "state",
    "zip",  # Postal code
    "country_code",
}

PRIMARY_ADDRESSES = [f"primary_{val}" for val in ADDRESSES]

EXPECTED_FIELDS = {"first_name", "middle_name", "last_name", "nationbuilder_id"}.union(
    PRIMARY_ADDRESSES
)

OUTPUT_FIELDS = [
    "first_name",
    "middle_name",
    "last_name",
    "nationbuilder_id",
    "nationbuilder_link",
    "AEC_result",
    "federal_division",
    "state_division",
    "local_government",
    "local_ward",
]
