import unittest
import sys
import os
from unittest.mock import MagicMock

# Mock selenium and webdriver_manager before importing aec_checker
sys.modules["selenium"] = MagicMock()
sys.modules["selenium.webdriver"] = MagicMock()
sys.modules["selenium.common"] = MagicMock()
sys.modules["selenium.common.exceptions"] = MagicMock()
sys.modules["selenium.webdriver.common.by"] = MagicMock()
sys.modules["selenium.webdriver.common.keys"] = MagicMock()
sys.modules["selenium.webdriver.support.select"] = MagicMock()
sys.modules["selenium.webdriver.support.ui"] = MagicMock()
sys.modules["selenium.webdriver.support"] = MagicMock()
sys.modules["selenium.webdriver.firefox.service"] = MagicMock()
sys.modules["selenium.webdriver.firefox.options"] = MagicMock()
sys.modules["webdriver_manager"] = MagicMock()
sys.modules["webdriver_manager.firefox"] = MagicMock()

# Add the parent directory to sys.path
sys.path.append(
    os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src")
)

from aec_core.utils import get_given_names, get_address_components  # noqa: E402


class TestAecChecker(unittest.TestCase):

    def test_get_given_names(self):
        row = {"first_name": "John", "middle_name": "Quincy"}
        self.assertEqual(get_given_names(row), "John Quincy")

        row = {"first_name": "John", "middle_name": ""}
        self.assertEqual(get_given_names(row), "John")

        row = {"first_name": "John", "middle_name": " "}
        self.assertEqual(get_given_names(row), "John")

    def test_get_address_components(self):
        # get_address_components splits primary_address1 to find street name.
        # It looks for words that are not purely digits?
        # Logic:
        # street_words = []
        # for word in row["primary_address1"].split():
        #     if street_words or len(word.strip("0123456789")) == len(word):
        #         street_words.append(word)
        # street_name = " ".join(street_words)

        row = {
            "primary_address1": "123 Main St",
            "primary_city": "Suburbia",
            "primary_state": "VIC",
            "primary_zip": "3000",
        }
        street, city, state, zipcode = get_address_components(row)
        # "123" is stripped of digits -> empty. len("") != len("123"). Skipped.
        # "Main" -> "Main". Added.
        # "St" -> "St". Added.
        self.assertEqual(street, "Main St")
        self.assertEqual(city, "Suburbia")
        self.assertEqual(state, "VIC")
        self.assertEqual(zipcode, "3000")

    def test_get_address_components_unit_number(self):
        row = {
            "primary_address1": "Unit 4 123 Main St",
            "primary_city": "Suburbia",
            "primary_state": "VIC",
            "primary_zip": "3000",
        }
        street, city, state, zipcode = get_address_components(row)
        # "Unit" -> Added.
        # "4" -> Skipped (digits).
        # "123" -> Skipped (digits).
        # "Main" -> Added.
        # "St" -> Added.
        # Result: "Unit Main St" - This seems like a bug or intended behavior?
        # The logic is: if street_words is NOT empty, append.
        # OR if word is not digits.

        # "Unit": not digits. Added. street_words=["Unit"]
        # "4": digits. But street_words is not empty! So it appends "4".
        # "123": digits. street_words not empty. Appends "123".
        # So it returns "Unit 4 123 Main St".

        self.assertEqual(street, "Unit 4 123 Main St")

    def test_get_address_components_simple_number(self):
        row = {
            "primary_address1": "10 Downing Street",
            "primary_city": "London",
            "primary_state": "UK",
            "primary_zip": "SW1A 2AA",
        }
        street, city, state, zipcode = get_address_components(row)
        # "10" -> digits. Skipped.
        # "Downing" -> Added.
        # "Street" -> Added.
        self.assertEqual(street, "Downing Street")


if __name__ == "__main__":
    unittest.main()
