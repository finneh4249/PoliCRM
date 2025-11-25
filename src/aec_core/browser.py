import time
import logging
import ssl
import random
import selenium.common.exceptions
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.select import Select
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException, TimeoutException, WebDriverException
from selenium.webdriver.firefox.service import Service as FirefoxService
from webdriver_manager.firefox import GeckoDriverManager
from typing import Dict, Optional, Tuple
import re

from .models import AECResult, AECStatus
from .utils import get_given_names, get_address_components

from selenium.webdriver.firefox.options import Options

# New IDs based on 2025 AEC website
GIVEN_NAME_ID = "textGivenName"
SURNAME_ID = "textSurname"
POSTCODE_ID = "textPostCode"
SUBURB_ID = "DropdownSuburb"
STREET_ID = "textStreetName"
VERIFY_BUTTON_ID = "buttonVerify"

# Configuration for retry and rate limiting
MAX_RETRIES = 3
BASE_RETRY_DELAY = 2  # seconds
RATE_LIMIT_DELAY = (1.5, 3.0)  # Random delay range between requests
REQUEST_TIMEOUT = 15  # seconds

# Bypass SSL certificate verification to fix the URLError on macOS.
ssl._create_default_https_context = ssl._create_unverified_context


def get_driver(executable_path=None, headless=False):
    """Create a Firefox WebDriver instance with appropriate options."""
    if executable_path is None:
        executable_path = GeckoDriverManager().install()
    service = FirefoxService(executable_path)
    options = Options()
    if headless:
        options.add_argument("--headless")
    
    # Add options to reduce detection as bot
    options.set_preference("dom.webdriver.enabled", False)
    options.set_preference("useAutomationExtension", False)
    
    # Set a realistic user agent
    options.set_preference("general.useragent.override", 
                          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    
    driver = webdriver.Firefox(service=service, options=options)
    # Set page load timeout
    driver.set_page_load_timeout(30)
    return driver


def extract_electoral_info(page_source: str) -> Tuple[str, str, str, str]:
    """Extract electoral division information from AEC results page."""
    federal_division = ""
    state_district = ""
    local_gov = ""
    local_ward = ""
    
    # Try to extract federal division
    fed_match = re.search(r'Federal Division[:\s]*([A-Za-z\s]+)', page_source)
    if fed_match:
        federal_division = fed_match.group(1).strip()
    
    # Try to extract state district
    state_match = re.search(r'State District[:\s]*([A-Za-z\s]+)', page_source)
    if state_match:
        state_district = state_match.group(1).strip()
    
    # Try to extract local government
    lg_match = re.search(r'Local Government Area[:\s]*([A-Za-z\s]+)', page_source)
    if lg_match:
        local_gov = lg_match.group(1).strip()
    
    # Try to extract local ward
    ward_match = re.search(r'Local Ward[:\s]*([A-Za-z\s]+)', page_source)
    if ward_match:
        local_ward = ward_match.group(1).strip()
    
    return federal_division, state_district, local_gov, local_ward


def validate_membership_data(membership_row: Dict[str, Optional[str]]) -> Tuple[bool, str]:
    """Validate that membership row has required fields.
    Returns (is_valid, error_message)
    """
    required_fields = ['first_name', 'last_name', 'nationbuilder_id']
    for field in required_fields:
        if not membership_row.get(field):
            return False, f"Missing required field: {field}"
    
    given_names = get_given_names(membership_row)
    street, suburb, state, postcode = get_address_components(membership_row)
    
    if not postcode:
        return False, "Missing postcode"
    
    if not postcode.isnumeric():
        return False, f"Invalid postcode: {postcode}"
    
    if not suburb:
        return False, "Missing suburb/city"
    
    if not state:
        return False, "Missing state"
    
    if not street:
        return False, "Missing or invalid street address"
    
    return True, ""


def getAECStatus(
    driver: webdriver, membership_row: Dict[str, Optional[str]], max_retries: int = MAX_RETRIES
) -> AECStatus:
    """Check AEC enrollment status with retry logic and better error handling."""
    given_names = get_given_names(membership_row)
    
    # Validate input data first
    is_valid, error_msg = validate_membership_data(membership_row)
    if not is_valid:
        logging.warning(
            f"{given_names} {membership_row.get('last_name', '')} - {error_msg}"
        )
        return AECStatus(AECResult.FAIL, None, None, None, None)
    
    street, suburb, state, postcode = get_address_components(membership_row)
    
    logging.info(
        f"Checking {given_names} {membership_row['last_name']} "
        f"({membership_row['nationbuilder_id']})"
    )
    
    # Add random delay to avoid rate limiting
    delay = random.uniform(*RATE_LIMIT_DELAY)
    time.sleep(delay)

    for attempt in range(max_retries):
        try:
            # Fill Name
            wait = WebDriverWait(driver, REQUEST_TIMEOUT)
            
            given_name_field = wait.until(EC.presence_of_element_located((By.ID, GIVEN_NAME_ID)))
            given_name_field.clear()
            given_name_field.send_keys(given_names)

            surname_field = driver.find_element(By.ID, SURNAME_ID)
            surname_field.clear()
            surname_field.send_keys(membership_row["last_name"])

            # Fill Postcode
            postcode_field = driver.find_element(By.ID, POSTCODE_ID)
            postcode_field.clear()
            postcode_field.send_keys(postcode)

            # Wait for suburb dropdown to populate (triggered by postcode input)
            time.sleep(1.5)

            # Select Suburb
            suburb_state = f"{str.upper(suburb)} ({state})"
            suburb_dropdown = wait.until(EC.presence_of_element_located((By.ID, SUBURB_ID)))
            suburb_select = Select(suburb_dropdown)

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
                logging.warning(f"Suburb {suburb_state} not found in dropdown")
                if attempt < max_retries - 1:
                    logging.info(f"Retrying (attempt {attempt + 2}/{max_retries})...")
                    driver.get("https://check.aec.gov.au/")
                    time.sleep(BASE_RETRY_DELAY * (attempt + 1))
                    continue
                return AECStatus(AECResult.FAIL_SUBURB, "", "", "", "")

            # Wait for street dropdown to populate (triggered by suburb selection)
            time.sleep(1.5)

            # Select Street
            # The street dropdown is a Select2 widget with autocomplete.
            # We must interact with the Select2 container and search box.
            try:
                # Wait for the Select2 container to be clickable
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

            except (TimeoutException, NoSuchElementException) as e:
                logging.warning(f"Failed to select street '{street}' using Select2: {e}")
                if attempt < max_retries - 1:
                    logging.info(f"Retrying (attempt {attempt + 2}/{max_retries})...")
                    driver.get("https://check.aec.gov.au/")
                    time.sleep(BASE_RETRY_DELAY * (attempt + 1))
                    continue
                return AECStatus(AECResult.FAIL_STREET, "", "", "", "")

            # Click Verify
            # Use JavaScript click to avoid interception by any lingering overlays
            verify_btn = wait.until(EC.element_to_be_clickable((By.ID, VERIFY_BUTTON_ID)))
            driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", verify_btn)
            time.sleep(0.5)
            driver.execute_script("arguments[0].click();", verify_btn)

            # Wait for result page to load
            time.sleep(3)

            # Check for success
            page_source = driver.page_source

            if "Federal Division" in page_source or "federal division" in page_source:
                # Success! Extract actual electoral information
                federal_division, state_district, local_gov, local_ward = extract_electoral_info(page_source)
                
                # Reset form for next iteration
                driver.get("https://check.aec.gov.au/")
                
                logging.info(f"✓ Successfully verified {given_names} {membership_row['last_name']}")
                return AECStatus(
                    AECResult.PASS, federal_division, state_district, local_gov, local_ward
                )

            elif "partial" in page_source.lower():
                driver.get("https://check.aec.gov.au/")
                logging.warning(f"Partial match for {given_names} {membership_row['last_name']}")
                return AECStatus(AECResult.PARTIAL, "", "", "", "")
            
            elif "Your current electoral enrolment could not be confirmed" in page_source:
                driver.get("https://check.aec.gov.au/")
                logging.warning(f"No match found for {given_names} {membership_row['last_name']}")
                return AECStatus(AECResult.FAIL_NO_MATCH, "", "", "", "")
            
            elif "captcha" in page_source.lower() or "verify you are human" in page_source.lower():
                logging.error(f"CAPTCHA detected - may need manual intervention or longer delays")
                if attempt < max_retries - 1:
                    # Wait longer before retrying after CAPTCHA
                    retry_delay = BASE_RETRY_DELAY * (2 ** attempt)  # Exponential backoff
                    logging.info(f"Waiting {retry_delay}s before retry (attempt {attempt + 2}/{max_retries})...")
                    time.sleep(retry_delay)
                    driver.get("https://check.aec.gov.au/")
                    continue
                driver.get("https://check.aec.gov.au/")
                return AECStatus(AECResult.FAIL, "", "", "", "")
            
            else:
                # Unknown failure - might be form validation error
                logging.warning(f"Unknown result for {given_names} {membership_row['last_name']}")
                if attempt < max_retries - 1:
                    logging.info(f"Retrying (attempt {attempt + 2}/{max_retries})...")
                    driver.get("https://check.aec.gov.au/")
                    time.sleep(BASE_RETRY_DELAY * (attempt + 1))
                    continue
                driver.get("https://check.aec.gov.au/")
                return AECStatus(AECResult.FAIL, "", "", "", "")
            
            # Success - break out of retry loop
            break
            
        except (TimeoutException, WebDriverException) as e:
            logging.error(f"WebDriver error processing {given_names}: {e}")
            if attempt < max_retries - 1:
                retry_delay = BASE_RETRY_DELAY * (attempt + 1)
                logging.info(f"Retrying after {retry_delay}s (attempt {attempt + 2}/{max_retries})...")
                time.sleep(retry_delay)
                try:
                    driver.get("https://check.aec.gov.au/")
                except Exception:
                    logging.error("Failed to reset page, driver may be unstable")
                    raise
                continue
            else:
                # Final attempt failed
                try:
                    driver.get("https://check.aec.gov.au/")
                except Exception:
                    pass
                return AECStatus(AECResult.FAIL, "", "", "", "")
        
        except Exception as e:
            logging.error(f"Unexpected error processing {given_names}: {e}")
            if attempt < max_retries - 1:
                retry_delay = BASE_RETRY_DELAY * (attempt + 1)
                logging.info(f"Retrying after {retry_delay}s (attempt {attempt + 2}/{max_retries})...")
                time.sleep(retry_delay)
                try:
                    driver.get("https://check.aec.gov.au/")
                except Exception:
                    pass
                continue
            else:
                try:
                    driver.get("https://check.aec.gov.au/")
                except Exception:
                    pass
                return AECStatus(AECResult.FAIL, "", "", "", "")
    
    # Should not reach here, but safety return
    return AECStatus(AECResult.FAIL, "", "", "", "")
