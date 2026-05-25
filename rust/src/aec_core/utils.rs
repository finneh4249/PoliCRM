use std::collections::HashMap;

/// Get the given names (first + optional middle) from a CSV row
pub fn get_given_names(row: &HashMap<String, Option<String>>) -> String {
    let first = row
        .get("first_name")
        .and_then(|v| v.as_deref())
        .unwrap_or("")
        .trim()
        .to_string();

    let middle = row
        .get("middle_name")
        .and_then(|v| v.as_deref())
        .unwrap_or("")
        .trim()
        .to_string();

    if middle.is_empty() {
        first
    } else {
        format!("{} {}", first, middle)
    }
}

/// Extract address components from a CSV row.
/// Returns (street_name, suburb, state, postcode).
/// street_name strips leading numeric tokens (house number).
pub fn get_address_components(
    row: &HashMap<String, Option<String>>,
) -> (Option<String>, Option<String>, Option<String>, Option<String>) {
    let raw_street = row
        .get("primary_address1")
        .and_then(|v| v.as_deref())
        .unwrap_or("")
        .trim()
        .to_string();

    let suburb = row
        .get("primary_city")
        .and_then(|v| v.as_deref())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let state = row
        .get("primary_state")
        .and_then(|v| v.as_deref())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    let postcode = row
        .get("primary_zip")
        .and_then(|v| v.as_deref())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());

    // Strip leading numeric tokens (house/unit numbers)
    // e.g. "123 Main Street" → "Main Street"
    // e.g. "1/45 Park Rd" → "Park Rd"  (after stripping "1/45")
    let street_name = if raw_street.is_empty() {
        None
    } else {
        let street = strip_leading_number_tokens(&raw_street);
        if street.is_empty() {
            None
        } else {
            Some(street)
        }
    };

    (street_name, suburb, state, postcode)
}

/// Strip leading number tokens from an address string.
/// Handles plain numbers, unit/flat numbers like "1/45", "U3", "Apt 2", etc.
fn strip_leading_number_tokens(address: &str) -> String {
    let parts: Vec<&str> = address.splitn(2, char::is_whitespace).collect();
    if parts.is_empty() {
        return address.to_string();
    }

    let first = parts[0];
    let rest = if parts.len() > 1 { parts[1].trim() } else { "" };

    // Check if the first token is purely numeric or a unit indicator
    // e.g. "123", "1/45", "1A", "U3"
    let is_number_token = first
        .chars()
        .all(|c| c.is_ascii_digit() || c == '/' || c == '-')
        || (first.len() <= 4
            && first
                .chars()
                .next()
                .map(|c| c.is_ascii_digit() || c.to_ascii_uppercase() == 'U')
                .unwrap_or(false)
            && first.chars().any(|c| c.is_ascii_digit()));

    // Also handle apartment/unit prefixes
    let lower_first = first.to_lowercase();
    let is_prefix = matches!(
        lower_first.as_str(),
        "apt" | "unit" | "flat" | "u" | "level" | "lvl" | "lot"
    );

    if is_prefix && !rest.is_empty() {
        // Skip the prefix and the next token (the number)
        let after_prefix: Vec<&str> = rest.splitn(2, char::is_whitespace).collect();
        if after_prefix.len() > 1 {
            return after_prefix[1].trim().to_string();
        }
        return rest.to_string();
    }

    if is_number_token && !rest.is_empty() {
        // Recursively strip in case there are multiple number tokens
        // e.g. "1/45 Main St" - the "/" already handles combined unit/street
        return rest.to_string();
    }

    address.to_string()
}

/// Validate membership data from a CSV row.
/// Returns Ok(()) if all required fields are present and valid.
pub fn validate_membership_data(
    row: &HashMap<String, Option<String>>,
) -> Result<(), String> {
    let mut errors = Vec::new();

    // Required text fields
    for field in &["first_name", "last_name", "nationbuilder_id"] {
        match row.get(*field) {
            None => errors.push(format!("Missing field: {}", field)),
            Some(None) => errors.push(format!("Empty field: {}", field)),
            Some(Some(v)) if v.trim().is_empty() => {
                errors.push(format!("Empty field: {}", field))
            }
            _ => {}
        }
    }

    // nationbuilder_id must be numeric
    if let Some(Some(nb_id)) = row.get("nationbuilder_id") {
        if !nb_id.trim().is_empty() && nb_id.trim().parse::<u64>().is_err() {
            errors.push(format!(
                "nationbuilder_id must be numeric, got: {}",
                nb_id
            ));
        }
    }

    // Postcode must be numeric if present
    if let Some(Some(postcode)) = row.get("primary_zip") {
        let pc = postcode.trim();
        if !pc.is_empty() && pc.parse::<u32>().is_err() {
            errors.push(format!("primary_zip must be numeric, got: {}", pc));
        }
    }

    // Required address fields
    for field in &["primary_city", "primary_state", "primary_address1"] {
        match row.get(*field) {
            None | Some(None) => errors.push(format!("Missing address field: {}", field)),
            Some(Some(v)) if v.trim().is_empty() => {
                errors.push(format!("Empty address field: {}", field))
            }
            _ => {}
        }
    }

    if errors.is_empty() {
        Ok(())
    } else {
        Err(errors.join("; "))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_row(pairs: &[(&str, &str)]) -> HashMap<String, Option<String>> {
        pairs
            .iter()
            .map(|(k, v)| (k.to_string(), Some(v.to_string())))
            .collect()
    }

    fn make_row_with_none(
        some_pairs: &[(&str, &str)],
        none_keys: &[&str],
    ) -> HashMap<String, Option<String>> {
        let mut row: HashMap<String, Option<String>> = some_pairs
            .iter()
            .map(|(k, v)| (k.to_string(), Some(v.to_string())))
            .collect();
        for key in none_keys {
            row.insert(key.to_string(), None);
        }
        row
    }

    fn valid_row() -> HashMap<String, Option<String>> {
        make_row(&[
            ("first_name", "Alice"),
            ("last_name", "Smith"),
            ("nationbuilder_id", "12345"),
            ("primary_address1", "Main Street"),
            ("primary_city", "Melbourne"),
            ("primary_state", "VIC"),
            ("primary_zip", "3000"),
        ])
    }

    // ── get_given_names ───────────────────────────────────────────────────────

    #[test]
    fn test_get_given_names_first_only() {
        let row = make_row(&[("first_name", "Alice"), ("last_name", "Smith")]);
        assert_eq!(get_given_names(&row), "Alice");
    }

    #[test]
    fn test_get_given_names_with_middle() {
        let row = make_row(&[
            ("first_name", "Alice"),
            ("middle_name", "Jane"),
            ("last_name", "Smith"),
        ]);
        assert_eq!(get_given_names(&row), "Alice Jane");
    }

    #[test]
    fn test_get_given_names_whitespace_middle_ignored() {
        let mut row = make_row(&[("first_name", "Bob")]);
        // A whitespace-only middle name should trim to "" → treated as absent
        row.insert("middle_name".to_string(), Some("   ".to_string()));
        let name = get_given_names(&row);
        // "   ".trim() == "" → only first name returned
        assert_eq!(name, "Bob", "Whitespace-only middle should be ignored; got: {}", name);
    }

    #[test]
    fn test_get_given_names_missing_first_name() {
        let row: HashMap<String, Option<String>> = HashMap::new();
        assert_eq!(get_given_names(&row), "");
    }

    #[test]
    fn test_get_given_names_none_first_name() {
        let mut row: HashMap<String, Option<String>> = HashMap::new();
        row.insert("first_name".to_string(), None);
        assert_eq!(get_given_names(&row), "");
    }

    #[test]
    fn test_get_given_names_trims_whitespace() {
        let row = make_row(&[("first_name", "  Alice  "), ("middle_name", "  Jane  ")]);
        assert_eq!(get_given_names(&row), "Alice Jane");
    }

    // ── strip_leading_number_tokens ───────────────────────────────────────────

    #[test]
    fn test_strip_leading_number() {
        assert_eq!(strip_leading_number_tokens("123 Main Street"), "Main Street");
        assert_eq!(strip_leading_number_tokens("Main Street"), "Main Street");
    }

    #[test]
    fn test_strip_unit_number_with_slash() {
        // "1/45 Park Rd" — the token "1/45" is all digits/slash → strip
        assert_eq!(strip_leading_number_tokens("1/45 Park Rd"), "Park Rd");
    }

    #[test]
    fn test_strip_apt_prefix() {
        // "Apt 2 Main Street" → "Main Street"
        assert_eq!(strip_leading_number_tokens("Apt 2 Main Street"), "Main Street");
    }

    #[test]
    fn test_strip_unit_prefix() {
        assert_eq!(strip_leading_number_tokens("Unit 3 King Street"), "King Street");
    }

    #[test]
    fn test_strip_flat_prefix() {
        assert_eq!(strip_leading_number_tokens("Flat 4B Collins Ave"), "Collins Ave");
    }

    #[test]
    fn test_no_strip_alphabetic_first_token() {
        // First token is alphabetic → keep as-is
        assert_eq!(strip_leading_number_tokens("Main Street"), "Main Street");
    }

    #[test]
    fn test_strip_empty_string() {
        assert_eq!(strip_leading_number_tokens(""), "");
    }

    // ── get_address_components ────────────────────────────────────────────────

    #[test]
    fn test_get_address_components_full() {
        let row = make_row(&[
            ("primary_address1", "123 King Street"),
            ("primary_city", "Melbourne"),
            ("primary_state", "VIC"),
            ("primary_zip", "3000"),
        ]);
        let (street, suburb, state, postcode) = get_address_components(&row);
        // Street should be stripped of leading number
        assert!(street.is_some());
        assert_eq!(suburb.as_deref(), Some("Melbourne"));
        assert_eq!(state.as_deref(), Some("VIC"));
        assert_eq!(postcode.as_deref(), Some("3000"));
    }

    #[test]
    fn test_get_address_components_empty_address() {
        let row = make_row(&[
            ("primary_address1", ""),
            ("primary_city", "Sydney"),
            ("primary_state", "NSW"),
            ("primary_zip", "2000"),
        ]);
        let (street, _, _, _) = get_address_components(&row);
        assert!(street.is_none(), "Empty address should give None street");
    }

    #[test]
    fn test_get_address_components_missing_optional_fields() {
        let row: HashMap<String, Option<String>> = HashMap::new();
        let (street, suburb, state, postcode) = get_address_components(&row);
        assert!(street.is_none());
        assert!(suburb.is_none());
        assert!(state.is_none());
        assert!(postcode.is_none());
    }

    #[test]
    fn test_get_address_components_filters_empty_optional_fields() {
        let row = make_row(&[
            ("primary_address1", "5 Oak Road"),
            ("primary_city", ""),
            ("primary_state", ""),
            ("primary_zip", ""),
        ]);
        let (_street, suburb, state, postcode) = get_address_components(&row);
        assert!(suburb.is_none(), "Empty city should be None");
        assert!(state.is_none(), "Empty state should be None");
        assert!(postcode.is_none(), "Empty zip should be None");
    }

    // ── validate_membership_data ──────────────────────────────────────────────

    #[test]
    fn test_validate_valid_row() {
        assert!(validate_membership_data(&valid_row()).is_ok());
    }

    #[test]
    fn test_validate_missing_required() {
        let row = make_row(&[
            ("last_name", "Smith"),
            ("nationbuilder_id", "12345"),
            ("primary_address1", "Main Street"),
            ("primary_city", "Melbourne"),
            ("primary_state", "VIC"),
        ]);
        assert!(validate_membership_data(&row).is_err());
    }

    #[test]
    fn test_validate_missing_last_name() {
        let mut row = valid_row();
        row.remove("last_name");
        let err = validate_membership_data(&row).unwrap_err();
        assert!(err.contains("last_name"), "Error should mention last_name, got: {}", err);
    }

    #[test]
    fn test_validate_empty_first_name() {
        let row = make_row(&[
            ("first_name", ""),
            ("last_name", "Smith"),
            ("nationbuilder_id", "12345"),
            ("primary_address1", "Main Street"),
            ("primary_city", "Melbourne"),
            ("primary_state", "VIC"),
        ]);
        assert!(validate_membership_data(&row).is_err());
    }

    #[test]
    fn test_validate_non_numeric_nationbuilder_id() {
        let row = make_row(&[
            ("first_name", "Alice"),
            ("last_name", "Smith"),
            ("nationbuilder_id", "abc"),
            ("primary_address1", "Main Street"),
            ("primary_city", "Melbourne"),
            ("primary_state", "VIC"),
        ]);
        let err = validate_membership_data(&row).unwrap_err();
        assert!(err.contains("nationbuilder_id"), "Got: {}", err);
    }

    #[test]
    fn test_validate_non_numeric_postcode() {
        let row = make_row(&[
            ("first_name", "Alice"),
            ("last_name", "Smith"),
            ("nationbuilder_id", "12345"),
            ("primary_address1", "Main Street"),
            ("primary_city", "Melbourne"),
            ("primary_state", "VIC"),
            ("primary_zip", "NOT_A_ZIP"),
        ]);
        let err = validate_membership_data(&row).unwrap_err();
        assert!(err.contains("primary_zip"), "Got: {}", err);
    }

    #[test]
    fn test_validate_numeric_postcode_ok() {
        let row = make_row(&[
            ("first_name", "Alice"),
            ("last_name", "Smith"),
            ("nationbuilder_id", "12345"),
            ("primary_address1", "Main Street"),
            ("primary_city", "Melbourne"),
            ("primary_state", "VIC"),
            ("primary_zip", "3000"),
        ]);
        assert!(validate_membership_data(&row).is_ok());
    }

    #[test]
    fn test_validate_missing_primary_city() {
        let mut row = valid_row();
        row.remove("primary_city");
        assert!(validate_membership_data(&row).is_err());
    }

    #[test]
    fn test_validate_missing_primary_state() {
        let mut row = valid_row();
        row.remove("primary_state");
        assert!(validate_membership_data(&row).is_err());
    }

    #[test]
    fn test_validate_missing_primary_address1() {
        let mut row = valid_row();
        row.remove("primary_address1");
        assert!(validate_membership_data(&row).is_err());
    }

    #[test]
    fn test_validate_none_required_field() {
        let row = make_row_with_none(
            &[
                ("last_name", "Smith"),
                ("nationbuilder_id", "12345"),
                ("primary_address1", "Main Street"),
                ("primary_city", "Melbourne"),
                ("primary_state", "VIC"),
            ],
            &["first_name"],
        );
        assert!(validate_membership_data(&row).is_err());
    }

    #[test]
    fn test_validate_multiple_errors_joined() {
        // Missing both first_name and last_name
        let row: HashMap<String, Option<String>> = HashMap::new();
        let err = validate_membership_data(&row).unwrap_err();
        assert!(err.contains(';'), "Multiple errors should be joined with ';', got: {}", err);
    }

    #[test]
    fn test_validate_empty_nationbuilder_id_field() {
        let row = make_row_with_none(
            &[
                ("first_name", "Alice"),
                ("last_name", "Smith"),
                ("primary_address1", "Main Street"),
                ("primary_city", "Melbourne"),
                ("primary_state", "VIC"),
            ],
            &["nationbuilder_id"],
        );
        assert!(validate_membership_data(&row).is_err());
    }
}
