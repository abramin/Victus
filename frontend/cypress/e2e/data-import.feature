Feature: Garmin data import

  # =============================================================================
  # FILE UPLOAD
  # =============================================================================

  Scenario: Upload valid Garmin data file
    Given the backend is running
    And a valid profile exists
    When I upload a valid Garmin FIT file
    Then the response status should be 200
    And the import should process successfully
    And the response should show number of sessions imported

  Scenario: Upload Garmin CSV export
    Given the backend is running
    And a valid profile exists
    When I upload a Garmin CSV export file
    Then the response status should be 200
    And the import should parse CSV data
    And training sessions should be extracted

  Scenario: Reject invalid file format
    Given the backend is running
    And a valid profile exists
    When I upload a text file as Garmin data
    Then the response status should be 400
    And the error response should include "invalid_format"

  Scenario: Reject empty file
    Given the backend is running
    And a valid profile exists
    When I upload an empty file
    Then the response status should be 400
    And the error response should include "empty_file"

  Scenario: Reject file exceeding size limit
    Given the backend is running
    And a valid profile exists
    When I upload a file larger than 10MB
    Then the response status should be 413
    And the error response should include "file_too_large"

  # =============================================================================
  # SESSION BACKFILL
  # =============================================================================

  Scenario: Import backfills historical training sessions
    Given the backend is running
    And a valid profile exists
    And I have daily logs without training sessions
    When I upload Garmin data with training sessions
    Then historical daily logs should be updated
    And actual training sessions should be populated
    And training load should recalculate

  Scenario: Import creates new daily logs if needed
    Given the backend is running
    And a valid profile exists
    And imported data contains dates without logs
    When I upload Garmin data
    Then new daily logs should be created for those dates
    And the logs should include imported training data

  Scenario: Import does not overwrite existing actual sessions
    Given the backend is running
    And a valid profile exists
    And I have manually logged actual training for 2026-01-20
    When I upload Garmin data including 2026-01-20
    Then the manual entry should be preserved
    And the Garmin data should be skipped for that date

  Scenario: Import merges with partial data
    Given the backend is running
    And a valid profile exists
    And I have daily logs with weight but no training
    When I upload Garmin training data
    Then the logs should retain weight data
    And training sessions should be added
    And calculated targets should update

  # =============================================================================
  # DATA MAPPING
  # =============================================================================

  Scenario: Map Garmin activity types to Victus training types
    Given the backend is running
    And a valid profile exists
    When I upload Garmin data with "Running" activity
    Then the activity should map to "run" training type
    And the duration should be preserved

  Scenario: Map Garmin strength training
    Given the backend is running
    And a valid profile exists
    When I upload Garmin data with "Strength Training" activity
    Then the activity should map to "strength" training type

  Scenario: Map Garmin cycling activities
    Given the backend is running
    And a valid profile exists
    When I upload Garmin data with "Cycling" activity
    Then the activity should map to "cycle" training type

  Scenario: Handle unmapped Garmin activity type
    Given the backend is running
    And a valid profile exists
    When I upload Garmin data with "Golf" activity
    Then the activity should map to "mixed" or "rest"
    And the import should log unmapped type

  # =============================================================================
  # MONTHLY SUMMARIES
  # =============================================================================

  Scenario: Import updates monthly training summaries
    Given the backend is running
    And a valid profile exists
    When I upload Garmin data spanning 3 months
    Then monthly summaries should be recalculated
    And total training volume should reflect imported data
    And compliance metrics should update

  Scenario: Import creates monthly summaries if missing
    Given the backend is running
    And a valid profile exists
    And no monthly summaries exist
    When I upload Garmin historical data
    Then monthly summaries should be created
    And each month should aggregate training data

  # =============================================================================
  # VALIDATION
  # =============================================================================

  Scenario: Import validates activity dates
    Given the backend is running
    And a valid profile exists
    When I upload Garmin data with future dates
    Then the response status should be 400
    And the error should indicate invalid dates
    And no data should be imported

  Scenario: Import validates activity durations
    Given the backend is running
    And a valid profile exists
    When I upload Garmin data with negative duration
    Then the response status should be 400
    And the error should indicate invalid duration

  Scenario: Import handles duplicate sessions gracefully
    Given the backend is running
    And a valid profile exists
    When I upload the same Garmin file twice
    Then the second import should detect duplicates
    And duplicate sessions should be skipped
    And the response should indicate what was skipped

  # =============================================================================
  # UI TESTS
  # =============================================================================

  Scenario: Import page shows file upload area
    Given the backend is running
    And a valid profile exists
    When I visit the data import page
    Then I should see a file upload dropzone
    And the page should show supported file formats
    And the page should show size limits

  Scenario: Drag and drop file to upload
    Given the backend is running
    And a valid profile exists
    When I visit the data import page
    And I drag a Garmin file onto the dropzone
    Then the file should be selected
    And I should see a preview of the file
    And an upload button should be enabled

  Scenario: Upload progress indicator
    Given the backend is running
    And a valid profile exists
    When I upload a Garmin file
    Then I should see an upload progress bar
    And the progress should show percentage complete
    And the upload button should be disabled during upload

  Scenario: Import success shows summary
    Given the backend is running
    And a valid profile exists
    When I successfully import Garmin data
    Then I should see a success message
    And the message should show number of sessions imported
    And the message should show date range of imported data
    And a "View Updated Logs" button should appear

  Scenario: Import error shows specific message
    Given the backend is running
    And a valid profile exists
    When I upload an invalid Garmin file
    Then I should see an error message
    And the message should explain what went wrong
    And suggestions for fixing should be provided

  Scenario: Import history log
    Given the backend is running
    And a valid profile exists
    And I have imported Garmin data 3 times
    When I visit the data import page
    Then I should see import history
    And the history should show dates of imports
    And the history should show number of sessions per import

  # =============================================================================
  # ADVANCED FEATURES
  # =============================================================================

  Scenario: Import includes heart rate data if available
    Given the backend is running
    And a valid profile exists
    When I upload Garmin data with heart rate zones
    Then the heart rate data should be stored
    And average HR should be associated with sessions

  Scenario: Import includes GPS data for outdoor activities
    Given the backend is running
    And a valid profile exists
    When I upload Garmin data with GPS tracks
    Then distance and elevation data should be extracted
    And the data should enhance training metrics

  Scenario: Partial import on errors
    Given the backend is running
    And a valid profile exists
    When I upload Garmin data with some invalid entries
    Then valid entries should be imported
    And invalid entries should be skipped
    And the response should list what was skipped and why

  # =============================================================================
  # EDGE CASES
  # =============================================================================

  Scenario: Import very old historical data
    Given the backend is running
    And a valid profile exists
    When I upload Garmin data from 2 years ago
    Then the data should be imported
    And historical logs should be created
    And the system should handle old date ranges

  Scenario: Import with timezone differences
    Given the backend is running
    And a valid profile exists
    When I upload Garmin data with different timezone
    Then timestamps should be normalized to local time
    And dates should align with profile timezone

  Scenario: Import while plan is active
    Given the backend is running
    And a valid profile exists
    And an active nutrition plan exists
    When I upload Garmin data affecting plan dates
    Then the plan analysis should update
    And compliance metrics should recalculate
