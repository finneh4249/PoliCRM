import unittest
import sys
import os

# Add the parent directory to sys.path to import the module
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src"))

from utils.convert_addresses import convert_state, convert_address  # noqa: E402


class TestConvertAddresses(unittest.TestCase):

    def test_convert_state(self):
        self.assertEqual(convert_state("Victoria"), "VIC")
        self.assertEqual(convert_state("New South Wales"), "NSW")
        self.assertEqual(convert_state("QLD"), "QLD")
        self.assertEqual(convert_state("western australia"), "WA")

        # Test that unknown states might raise KeyError or return as is depending on implementation
        # The current implementation looks up in stateAbs if len > 3 or not in stateShorts.
        # If it's not in stateAbs, it will raise a KeyError.
        with self.assertRaises(KeyError):
            convert_state("Unknown State")

    def test_convert_address_simple(self):
        # "123 Fake Street" -> "Fake ST"
        # The regex expects: ^[^A-Z]*([A-Z \-]+)( .+)?$
        # It reverses the string first.
        # Let's look at the logic in convert_addresses.py again.
        # rev = (origAddress[::-1]).upper()
        # matchme = revAddressSplitter.match(rev)
        # street = (((matchme.group(1))[::-1]).strip()).split(" ")

        # Example: "123 MAIN STREET"
        # rev: "TEERTS NIAM 321"
        # match: group(1) should capture "TEERTS NIAM" (letters and spaces)
        # reversed back: "MAIN STREET"
        # split: ["MAIN", "STREET"]
        # streetName: "MAIN"
        # streetType: "STREET" -> "ST"

        state, address = convert_address("Victoria", "123 Main Street")
        self.assertEqual(state, "VIC")
        self.assertEqual(address, "MAIN ST")

    def test_convert_address_with_unit(self):
        # "Unit 4 123 Main Street"
        state, address = convert_address("VIC", "Unit 4 123 Main Street")
        self.assertEqual(address, "MAIN ST")

    def test_convert_address_types(self):
        self.assertEqual(convert_address("VIC", "1 Road")[1], " RD")
        self.assertEqual(convert_address("VIC", "1 Avenue")[1], " AVE")
        self.assertEqual(convert_address("VIC", "1 Court")[1], " CT")

    def test_convert_address_case_insensitive(self):
        state, address = convert_address("vic", "123 main street")
        self.assertEqual(state, "VIC")
        self.assertEqual(address, "MAIN ST")


if __name__ == "__main__":
    unittest.main()
