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
