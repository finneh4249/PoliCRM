use serde::{Deserialize, Serialize};
use std::fmt;

/// Result of an AEC voter enrollment check
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum AecResult {
    /// Enrollment confirmed with full match
    Pass,
    /// Enrollment found but some fields differ
    Partial,
    /// Generic failure
    Fail,
    /// No matching enrollment record found
    FailNoMatch,
    /// Street address did not match
    FailStreet,
    /// Suburb did not match
    FailSuburb,
    /// CAPTCHA challenge encountered
    Captcha,
}

impl fmt::Display for AecResult {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AecResult::Pass => write!(f, "Pass"),
            AecResult::Partial => write!(f, "Partial"),
            AecResult::Fail => write!(f, "Fail"),
            AecResult::FailNoMatch => write!(f, "Fail_No_Match"),
            AecResult::FailStreet => write!(f, "Fail_Street"),
            AecResult::FailSuburb => write!(f, "Fail_Suburb"),
            AecResult::Captcha => write!(f, "Captcha"),
        }
    }
}

impl AecResult {
    pub fn from_str(s: &str) -> Self {
        match s.trim().to_lowercase().as_str() {
            "pass" => AecResult::Pass,
            "partial" => AecResult::Partial,
            "fail" => AecResult::Fail,
            "fail_no_match" | "failnomatch" | "fail no match" => AecResult::FailNoMatch,
            "fail_street" | "failstreet" | "fail street" => AecResult::FailStreet,
            "fail_suburb" | "failsuburb" | "fail suburb" => AecResult::FailSuburb,
            "captcha" => AecResult::Captcha,
            _ => AecResult::Fail,
        }
    }

    /// Returns true if this result indicates the check should be retried
    pub fn should_retry(&self) -> bool {
        matches!(self, AecResult::Captcha | AecResult::Fail)
    }

    /// Returns true if the person is enrolled
    pub fn is_enrolled(&self) -> bool {
        matches!(self, AecResult::Pass | AecResult::Partial)
    }
}

/// Full AEC enrollment status with electoral division information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AecStatus {
    pub result: AecResult,
    pub federal: Option<String>,
    pub state: Option<String>,
    pub local_gov: Option<String>,
    pub local_ward: Option<String>,
}

impl AecStatus {
    /// Create a failed status (used when check could not complete)
    pub fn failed() -> Self {
        AecStatus {
            result: AecResult::Fail,
            federal: None,
            state: None,
            local_gov: None,
            local_ward: None,
        }
    }

    /// Create a captcha status
    pub fn captcha() -> Self {
        AecStatus {
            result: AecResult::Captcha,
            federal: None,
            state: None,
            local_gov: None,
            local_ward: None,
        }
    }

    /// Create a no-match failure status
    pub fn no_match() -> Self {
        AecStatus {
            result: AecResult::FailNoMatch,
            federal: None,
            state: None,
            local_gov: None,
            local_ward: None,
        }
    }

    /// Create a pass status with division info
    pub fn pass(federal: Option<String>, state: Option<String>, local_gov: Option<String>, local_ward: Option<String>) -> Self {
        AecStatus {
            result: AecResult::Pass,
            federal,
            state,
            local_gov,
            local_ward,
        }
    }

    /// Create a partial pass status
    pub fn partial(federal: Option<String>, state: Option<String>, local_gov: Option<String>, local_ward: Option<String>) -> Self {
        AecStatus {
            result: AecResult::Partial,
            federal,
            state,
            local_gov,
            local_ward,
        }
    }
}

/// Output CSV field names for AEC check results
pub const OUTPUT_FIELDS: &[&str] = &[
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
];

#[cfg(test)]
mod tests {
    use super::*;

    // ── AecResult::Display ────────────────────────────────────────────────────

    #[test]
    fn test_display_pass() {
        assert_eq!(AecResult::Pass.to_string(), "Pass");
    }

    #[test]
    fn test_display_partial() {
        assert_eq!(AecResult::Partial.to_string(), "Partial");
    }

    #[test]
    fn test_display_fail() {
        assert_eq!(AecResult::Fail.to_string(), "Fail");
    }

    #[test]
    fn test_display_fail_no_match() {
        assert_eq!(AecResult::FailNoMatch.to_string(), "Fail_No_Match");
    }

    #[test]
    fn test_display_fail_street() {
        assert_eq!(AecResult::FailStreet.to_string(), "Fail_Street");
    }

    #[test]
    fn test_display_fail_suburb() {
        assert_eq!(AecResult::FailSuburb.to_string(), "Fail_Suburb");
    }

    #[test]
    fn test_display_captcha() {
        assert_eq!(AecResult::Captcha.to_string(), "Captcha");
    }

    // ── AecResult::from_str ───────────────────────────────────────────────────

    #[test]
    fn test_from_str_pass() {
        assert_eq!(AecResult::from_str("pass"), AecResult::Pass);
        assert_eq!(AecResult::from_str("Pass"), AecResult::Pass);
        assert_eq!(AecResult::from_str("PASS"), AecResult::Pass);
    }

    #[test]
    fn test_from_str_partial() {
        assert_eq!(AecResult::from_str("partial"), AecResult::Partial);
        assert_eq!(AecResult::from_str("Partial"), AecResult::Partial);
    }

    #[test]
    fn test_from_str_fail() {
        assert_eq!(AecResult::from_str("fail"), AecResult::Fail);
    }

    #[test]
    fn test_from_str_fail_no_match_variants() {
        assert_eq!(AecResult::from_str("fail_no_match"), AecResult::FailNoMatch);
        assert_eq!(AecResult::from_str("failnomatch"), AecResult::FailNoMatch);
        assert_eq!(AecResult::from_str("fail no match"), AecResult::FailNoMatch);
    }

    #[test]
    fn test_from_str_fail_street_variants() {
        assert_eq!(AecResult::from_str("fail_street"), AecResult::FailStreet);
        assert_eq!(AecResult::from_str("failstreet"), AecResult::FailStreet);
        assert_eq!(AecResult::from_str("fail street"), AecResult::FailStreet);
    }

    #[test]
    fn test_from_str_fail_suburb_variants() {
        assert_eq!(AecResult::from_str("fail_suburb"), AecResult::FailSuburb);
        assert_eq!(AecResult::from_str("failsuburb"), AecResult::FailSuburb);
        assert_eq!(AecResult::from_str("fail suburb"), AecResult::FailSuburb);
    }

    #[test]
    fn test_from_str_captcha() {
        assert_eq!(AecResult::from_str("captcha"), AecResult::Captcha);
        assert_eq!(AecResult::from_str("CAPTCHA"), AecResult::Captcha);
    }

    #[test]
    fn test_from_str_unknown_defaults_to_fail() {
        assert_eq!(AecResult::from_str("unknown_status"), AecResult::Fail);
        assert_eq!(AecResult::from_str(""), AecResult::Fail);
        assert_eq!(AecResult::from_str("   "), AecResult::Fail);
    }

    #[test]
    fn test_from_str_with_whitespace() {
        assert_eq!(AecResult::from_str("  pass  "), AecResult::Pass);
    }

    // ── AecResult::should_retry ───────────────────────────────────────────────

    #[test]
    fn test_should_retry_captcha_returns_true() {
        assert!(AecResult::Captcha.should_retry());
    }

    #[test]
    fn test_should_retry_fail_returns_true() {
        assert!(AecResult::Fail.should_retry());
    }

    #[test]
    fn test_should_retry_pass_returns_false() {
        assert!(!AecResult::Pass.should_retry());
    }

    #[test]
    fn test_should_retry_partial_returns_false() {
        assert!(!AecResult::Partial.should_retry());
    }

    #[test]
    fn test_should_retry_fail_no_match_returns_false() {
        assert!(!AecResult::FailNoMatch.should_retry());
    }

    #[test]
    fn test_should_retry_fail_street_returns_false() {
        assert!(!AecResult::FailStreet.should_retry());
    }

    #[test]
    fn test_should_retry_fail_suburb_returns_false() {
        assert!(!AecResult::FailSuburb.should_retry());
    }

    // ── AecResult::is_enrolled ────────────────────────────────────────────────

    #[test]
    fn test_is_enrolled_pass_returns_true() {
        assert!(AecResult::Pass.is_enrolled());
    }

    #[test]
    fn test_is_enrolled_partial_returns_true() {
        assert!(AecResult::Partial.is_enrolled());
    }

    #[test]
    fn test_is_enrolled_fail_returns_false() {
        assert!(!AecResult::Fail.is_enrolled());
    }

    #[test]
    fn test_is_enrolled_fail_no_match_returns_false() {
        assert!(!AecResult::FailNoMatch.is_enrolled());
    }

    #[test]
    fn test_is_enrolled_captcha_returns_false() {
        assert!(!AecResult::Captcha.is_enrolled());
    }

    // ── AecStatus factory methods ─────────────────────────────────────────────

    #[test]
    fn test_aec_status_failed() {
        let s = AecStatus::failed();
        assert_eq!(s.result, AecResult::Fail);
        assert!(s.federal.is_none());
        assert!(s.state.is_none());
        assert!(s.local_gov.is_none());
        assert!(s.local_ward.is_none());
    }

    #[test]
    fn test_aec_status_captcha() {
        let s = AecStatus::captcha();
        assert_eq!(s.result, AecResult::Captcha);
        assert!(s.federal.is_none());
    }

    #[test]
    fn test_aec_status_no_match() {
        let s = AecStatus::no_match();
        assert_eq!(s.result, AecResult::FailNoMatch);
        assert!(s.federal.is_none());
    }

    #[test]
    fn test_aec_status_pass_with_divisions() {
        let s = AecStatus::pass(
            Some("Kooyong".to_string()),
            Some("Hawthorn".to_string()),
            Some("Boroondara".to_string()),
            Some("Glenferrie".to_string()),
        );
        assert_eq!(s.result, AecResult::Pass);
        assert_eq!(s.federal.as_deref(), Some("Kooyong"));
        assert_eq!(s.state.as_deref(), Some("Hawthorn"));
        assert_eq!(s.local_gov.as_deref(), Some("Boroondara"));
        assert_eq!(s.local_ward.as_deref(), Some("Glenferrie"));
    }

    #[test]
    fn test_aec_status_pass_with_none_divisions() {
        let s = AecStatus::pass(None, None, None, None);
        assert_eq!(s.result, AecResult::Pass);
        assert!(s.federal.is_none());
        assert!(s.state.is_none());
        assert!(s.local_gov.is_none());
        assert!(s.local_ward.is_none());
    }

    #[test]
    fn test_aec_status_partial() {
        let s = AecStatus::partial(
            Some("Wentworth".to_string()),
            None,
            None,
            None,
        );
        assert_eq!(s.result, AecResult::Partial);
        assert_eq!(s.federal.as_deref(), Some("Wentworth"));
    }

    // ── Serialization round-trip ──────────────────────────────────────────────

    #[test]
    fn test_aec_result_serialization() {
        let result = AecResult::Pass;
        let json = serde_json::to_string(&result).unwrap();
        let deserialized: AecResult = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized, AecResult::Pass);
    }

    #[test]
    fn test_aec_status_serialization() {
        let status = AecStatus::pass(
            Some("Melbourne".to_string()),
            None,
            None,
            None,
        );
        let json = serde_json::to_string(&status).unwrap();
        assert!(json.contains("Pass"));
        assert!(json.contains("Melbourne"));
    }

    // ── OUTPUT_FIELDS constant ────────────────────────────────────────────────

    #[test]
    fn test_output_fields_contains_required() {
        assert!(OUTPUT_FIELDS.contains(&"first_name"));
        assert!(OUTPUT_FIELDS.contains(&"last_name"));
        assert!(OUTPUT_FIELDS.contains(&"AEC_result"));
        assert!(OUTPUT_FIELDS.contains(&"federal_division"));
        assert!(OUTPUT_FIELDS.contains(&"nationbuilder_id"));
    }

    #[test]
    fn test_output_fields_length() {
        assert_eq!(OUTPUT_FIELDS.len(), 10);
    }
}
