# AEC Checker Improvements

This document outlines the recent improvements made to the AEC Checker script to make it more robust and feature-rich.

## Recent Enhancements

### 1. Retry Logic with Exponential Backoff

- **Problem**: Network issues or temporary AEC website problems could cause valid checks to fail
- **Solution**: Added configurable retry mechanism (default: 3 attempts) with exponential backoff
- **Benefits**:
  - Handles transient network failures automatically
  - Reduces false negatives from temporary issues
  - Exponential backoff prevents hammering the AEC site during outages
- **Configuration**: `--max-retries` CLI argument or advanced TUI options

### 2. Rate Limiting and Delay Configuration

- **Problem**: Running too fast could trigger CAPTCHA or temporary IP blocks
- **Solution**: Random delays between requests (default: 1.5-3.0 seconds)
- **Benefits**:
  - Mimics human behavior to avoid bot detection
  - Prevents rate limiting by AEC
  - Configurable to adjust for different use cases
- **Configuration**: `--delay-min` and `--delay-max` CLI arguments

### 3. Enhanced Input Validation

- **Problem**: Invalid input data would cause runtime failures deep in the process
- **Solution**: Pre-flight validation of all records before processing
- **Benefits**:
  - Catches issues early (missing fields, invalid postcodes, etc.)
  - Provides clear error messages about data quality
  - Dry-run mode to validate without performing checks
- **Usage**: `--dry-run` flag or "validation mode" in TUI

### 4. Improved Result Extraction

- **Problem**: Electoral division information was returned as placeholders
- **Solution**: Regex-based extraction of actual federal/state divisions, LGA, and ward data
- **Benefits**:
  - Provides complete electoral information in output
  - More useful for downstream analysis
  - Better data for reporting
- **Implementation**: `extract_electoral_info()` function in browser.py

### 5. Browser Crash Recovery

- **Problem**: Browser crashes would kill entire thread, losing progress
- **Solution**: Automatic driver recovery and reinitialization
- **Benefits**:
  - Threads continue working after browser crashes
  - Better overall reliability for long-running jobs
  - Automatic detection and recovery from browser issues
- **Implementation**: Worker threads monitor browser health and reinitialize as needed

### 6. Better Error Handling

- **Problem**: Generic exceptions made debugging difficult
- **Solution**: Specific exception handling for different failure types
- **Benefits**:
  - More informative error messages
  - Better logging for troubleshooting
  - Graceful degradation instead of crashes
- **Examples**: FAIL_SUBURB, FAIL_STREET, FAIL_NO_MATCH result types

### 7. CAPTCHA Detection

- **Problem**: Script would continue when CAPTCHA appeared, wasting time
- **Solution**: Detect CAPTCHA challenges and handle appropriately
- **Benefits**:
  - Alerts operator when manual intervention needed
  - Longer delays after CAPTCHA to avoid repeated triggers
  - Better logging of CAPTCHA occurrences
- **Implementation**: Page source scanning for CAPTCHA indicators

### 8. Improved Logging

- **Problem**: Hard to track what was happening during long runs
- **Solution**: Structured logging with better context and levels
- **Benefits**:
  - File logging for audit trail
  - Console logging with Rich formatting
  - Per-record status updates
  - Summary statistics at completion
- **Configuration**: Logged to `aec_checker.log` by default

### 9. Configuration File Support (Future)

- **Status**: Template created (`config.example.json`)
- **Purpose**: Store common settings instead of command-line args
- **Benefits**:
  - Easier to maintain consistent settings
  - Better for scheduled/automated runs
  - Can version control configurations
- **Note**: Requires implementation to read and apply config

### 10. Enhanced TUI Features

- **Dry-run mode**: Validate data without performing checks
- **Advanced options**: Configure retries and delays interactively
- **Better progress display**: Shows configuration before starting
- **Resume information**: Clearer messaging about resuming from existing output

## Configuration Options

### Command Line (CLI)

```bash
python aec_checker.py \
  --infile input.csv \
  --outfile output.csv \
  --threads 2 \
  --headless \
  --max-retries 5 \
  --delay-min 2.0 \
  --delay-max 4.0 \
  --dry-run
```

### Interactive (TUI)

```bash
python aec_checker.py
# Follow prompts, including new options for:
# - Validation mode only
# - Advanced configuration
```

## Best Practices

### For Large Datasets

1. Start with `--dry-run` to validate input data
2. Use `--headless` mode to reduce resource usage
3. Set appropriate delays (2-4 seconds) to avoid rate limiting
4. Use 2-3 threads maximum to balance speed and detection risk
5. Monitor the log file for CAPTCHA warnings

### For Resume After Interruption

1. Don't delete the output file
2. TUI will automatically detect and offer to resume
3. Or use `--skip N` where N is the number of completed records

### For Best Reliability

1. Use lower thread counts (1-2) for sensitive operations
2. Increase delays if you see repeated CAPTCHAs
3. Set max-retries to 3-5 for flaky connections
4. Run in non-headless mode first to visually verify behavior

## Known Limitations

1. **CAPTCHA**: Still requires manual intervention when triggered
2. **PO Boxes**: May not be verifiable through AEC website
3. **Address Normalization**: Depends on street type dictionary completeness
4. **Browser Dependency**: Requires Firefox to be installed
5. **Rate Limiting**: AEC may still block after extended use

## Future Improvements

1. **Config file loading**: Implement reading from config.example.json
2. **Progress checkpointing**: Save state more frequently with checksums
3. **Better CAPTCHA handling**: Integrate CAPTCHA solving services or pause/alert
4. **Multi-browser support**: Support Chrome/Edge as alternatives to Firefox
5. **Batch processing**: Split large files into batches automatically
6. **Result analytics**: Generate detailed reports and visualizations
7. **API mode**: Expose as REST API for integration with other tools
8. **Docker support**: Containerize for easier deployment

## Migration Guide

### Existing Users

- All existing functionality preserved
- Command-line interface unchanged (new args are optional)
- Output format unchanged
- No breaking changes to workflows

### New Features Usage

1. Add `--dry-run` to your existing commands to test validation
2. Gradually introduce `--headless` and threading as needed
3. Adjust delays based on your experience with rate limiting
4. Review `aec_checker.log` for insights into processing

## Testing Recommendations

Before running on full dataset:

1. Test with 10-20 records first
2. Verify output format meets expectations
3. Check log file for errors or warnings
4. Monitor for CAPTCHA occurrences
5. Adjust settings based on results

## Support

For issues or questions:

1. Check `aec_checker.log` for detailed error messages
2. Run with `--dry-run` to validate input data first
3. Review this document for configuration options
4. Check README.md for basic troubleshooting
