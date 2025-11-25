import time
import logging
import ssl
import selenium.common.exceptions
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.select import Select
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException
from selenium.webdriver.firefox.service import Service as FirefoxService
from webdriver_manager.firefox import GeckoDriverManager
from typing import Dict, Optional

from .models import AECResult, AECStatus
from .utils import get_given_names, get_address_components

# New IDs based on 2025 AEC website
GIVEN_NAME_ID = "textGivenName"
SURNAME_ID = "textSurname"
POSTCODE_ID = "textPostCode"
SUBURB_ID = "DropdownSuburb"
STREET_ID = "textStreetName"
VERIFY_BUTTON_ID = "buttonVerify"

# Bypass SSL certificate verification to fix the URLError on macOS.
ssl._create_default_https_context = ssl._create_unverified_context


def get_driver():
    service = FirefoxService(GeckoDriverManager().install())
    driver = webdriver.Firefox(service=service)
    return driver


def getAECStatus(
    driver: webdriver, membership_row: Dict[str, Optional[str]]
) -> AECStatus:
    given_names = get_given_names(membership_row)
    street, suburb, state, postcode = get_address_components(membership_row)
    if not postcode or not postcode.isnumeric():
        logging.warning(
            f"{given_names} lacks a postcode, so we lack valid details for them"
        )
        return AECStatus(AECResult.FAIL, None, None, None, None)

    logging.info(
        f"Considering {given_names} {membership_row['last_name']} "
        f"({membership_row['nationbuilder_id']})"
    )

    try:
        # Fill Name
        driver.find_element(By.ID, GIVEN_NAME_ID).clear()
        driver.find_element(By.ID, GIVEN_NAME_ID).send_keys(given_names)

        driver.find_element(By.ID, SURNAME_ID).clear()
        driver.find_element(By.ID, SURNAME_ID).send_keys(membership_row["last_name"])

        # Fill Postcode
        driver.find_element(By.ID, POSTCODE_ID).clear()
        driver.find_element(By.ID, POSTCODE_ID).send_keys(postcode)

        # Wait for suburb dropdown to populate (triggered by postcode input)
        time.sleep(1.5)

        # Select Suburb
        suburb_state = f"{str.upper(suburb)} ({state})"
        suburb_select = Select(driver.find_element(By.ID, SUBURB_ID))

        found_suburb = False
        # Try exact match first
        try:
            suburb_select.select_by_value(suburb_state)
            found_suburb = True
        except Exception:
            # Try visible text match
            for option in suburb_select.options:
                if suburb_state in option.text.upper():
                    suburb_select.select_by_visible_text(option.text)
                    found_suburb = True
                    break

        if not found_suburb:
            logging.error(f"Suburb {suburb_state} not found in dropdown")
            return AECStatus(AECResult.FAIL_SUBURB, "", "", "", "")

        # Wait for street dropdown to populate (triggered by suburb selection)
        time.sleep(1.5)

        # Select Street
        # The street dropdown is a Select2 widget with autocomplete.
        # We must interact with the Select2 container and search box.
        try:
            wait = WebDriverWait(driver, 10)
            
            # Wait for the Select2 container to be clickable
            # The ID select2-textStreetName-container is on the rendered text span.
            # Sometimes clicking this works, sometimes we need the parent.
            # We use the aria-labelledby attribute which points to the rendered text container ID
            selection_selector = (By.CSS_SELECTOR, f"span[aria-labelledby='select2-{STREET_ID}-container']")
            
            container_span = wait.until(EC.element_to_be_clickable(selection_selector))
            # Scroll into view to ensure it's not covered
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", container_span)
            time.sleep(0.5)
            container_span.click()
            
            # Wait for search box
            search_box = wait.until(EC.visibility_of_element_located((By.CLASS_NAME, "select2-search__field")))
            search_box.send_keys(street)
            
            # Wait for results. The results are in a UL with id="select2-textStreetName-results"
            results_id = f"select2-{STREET_ID}-results"
            wait.until(EC.presence_of_element_located((By.ID, results_id)))
            
            # Find the highlighted option and click it to ensure selection
            highlighted_option = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, ".select2-results__option--highlighted")))
            highlighted_option.click()
            
            # Wait for the dropdown to close
            wait.until(EC.invisibility_of_element_located((By.ID, results_id)))

        except Exception as e:
            logging.warning(f"Failed to select street '{street}' using Select2: {e}")
            return AECStatus(AECResult.FAIL_STREET, "", "", "", "")

        # Click Verify
        # Use JavaScript click to avoid interception by any lingering overlays
        verify_btn = driver.find_element(By.ID, VERIFY_BUTTON_ID)
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", verify_btn)
        time.sleep(0.5)
        driver.execute_script("arguments[0].click();", verify_btn)

        # Wait for result
        time.sleep(2)

        # Check for success
        page_source = driver.page_source

        federal_division = ""
        state_district = ""
        local_gov = ""
        local_ward = ""

        if "Federal Division" in page_source:
            # Success!
            federal_division = "Found"  # Placeholder
            
            # Try to go back or reset form for next iteration
            # If the URL changed, we can go back.
            # If it's the same URL, we might need to click a "Check another" button or reload.
            # For safety, let's reload the page in the main loop or here.
            # But check_rows calls getAECStatus inside a loop using the same driver.
            # So we need to reset the state.
            driver.get("https://check.aec.gov.au/")
            
            return AECStatus(
                AECResult.PASS, federal_division, state_district, local_gov, local_ward
            )

        else:
            # Failure
            if "partial" in page_source.lower():
                driver.get("https://check.aec.gov.au/")
                return AECStatus(AECResult.PARTIAL, "", "", "", "")
            
            # If we are still on the form page, it might be a captcha issue or validation error.
            driver.get("https://check.aec.gov.au/")
            return AECStatus(AECResult.FAIL, "", "", "", "")

    except Exception as e:
        logging.error(f"Error processing {given_names}: {e}")
        # Ensure we reset for the next person
        try:
            driver.get("https://check.aec.gov.au/")
        except Exception:
            pass
        return AECStatus(AECResult.FAIL, "", "", "", "")
