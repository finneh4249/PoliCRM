from typing import Dict, Optional, Tuple


def get_given_names(membership_row: Dict[str, Optional[str]]):
    first = membership_row.get("first_name", "")
    middle = membership_row.get("middle_name")
    
    if middle:
        return f"{first} {middle}".strip()
    return first.strip()


def get_address_components(
    row: Dict[str, Optional[str]],
) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
    """
    For a membership row, return the street name, suburb, state, and postcode.
    """
    street_words = []
    for word in row["primary_address1"].split():
        if street_words or len(word.strip("0123456789")) == len(word):
            street_words.append(word)
    street_name = " ".join(street_words)
    return street_name, row["primary_city"], row["primary_state"], row["primary_zip"]
