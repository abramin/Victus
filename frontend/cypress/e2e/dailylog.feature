Feature: Daily log management

  Scenario: Create a daily log with calculated targets
    Given the profile API is running
    And I have upserted a valid user profile
    When I create a valid daily log
    Then the response status should be 201
    And the daily log response should include calculated targets
    And the daily log response should include the submitted log data

  Scenario: Fetch today's log after creation
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created a valid daily log for today
    When I fetch today's daily log
    Then the response status should be 200
    And the daily log response should include calculated targets

  Scenario: Reject daily log creation without profile
    Given the profile API is running
    And the database is clean
    When I create a valid daily log
    Then the response status should be 400
    And the error response should include "profile_required"

  Scenario: Reject invalid training type
    Given the profile API is running
    And I have upserted a valid user profile
    When I create a daily log with invalid training type
    Then the response status should be 400
    And the error response should include "validation_error"

  Scenario: Return 404 when no log exists for today
    Given the profile API is running
    And the database is clean
    When I fetch today's daily log
    Then the response status should be 404
    And the error response should include "not_found"

  Scenario: Reject duplicate daily log for same date
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created a valid daily log for today
    When I create a valid daily log
    Then the response status should be 409
    And the error response should include "already_exists"

  Scenario: Delete today's log
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created a valid daily log for today
    When I delete today's daily log
    Then the response status should be 204

  Scenario: Update actual training sessions
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created a valid daily log for today
    When I update the actual training sessions
    Then the response status should be 200
    And the daily log response should include actual training sessions
    And the training summary should reflect actual sessions

  Scenario: Clear actual training sessions
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created a valid daily log for today
    And I have updated the actual training sessions
    When I clear the actual training sessions
    Then the response status should be 200
    And the daily log response should not include actual training sessions

  Scenario: Daily log with supplement configuration reflects deductions
    Given the profile API is running
    And I have upserted a profile with supplements configured
    When I create a performance day log
    Then the response status should be 201
    And the meal points should reflect supplement deductions

  Scenario: Fatburner day only deducts collagen supplements
    Given the profile API is running
    And I have upserted a profile with supplements configured
    When I create a fatburner day log
    Then the response status should be 201
    And the meal points should not deduct maltodextrin or whey
  # =============================================================================
  # UI STATE TESTS
  # =============================================================================

  Scenario: Daily update form shows empty state for new log
    Given the backend is running
    And a valid profile exists
    And no daily log exists for today
    When I visit the home page
    And I click on the daily update nav item
    Then I should see the daily update form
    And the form should show default values

  Scenario: Daily update form is pre-populated when log exists
    Given the backend is running
    And a valid profile exists
    And I have created a valid daily log for today
    When I visit the home page
    And I click on the daily update nav item
    Then I should see the daily update form
    And the form should be pre-populated with existing data

  Scenario: Show validation error when weight is empty
    Given the backend is running
    And a valid profile exists
    When I visit the home page
    And I click on the daily update nav item
    And I clear the weight field
    And I submit the form
    Then I should see a validation error for "weight"

  Scenario: Show saving indicator during form submission
    Given the backend is running
    And a valid profile exists
    When I visit the home page
    And I click on the daily update nav item
    And I complete the daily update form
    And I submit the form
    Then I should see a saving indicator
  # =============================================================================
  # BOUNDARY CONDITION TESTS
  # =============================================================================

  Scenario: Create log with minimum weight boundary
    Given the profile API is running
    And I have upserted a valid user profile
    When I create a daily log with minimum weight
    Then the response status should be 201
    And the daily log response should include calculated targets

  Scenario: Create log with maximum weight boundary
    Given the profile API is running
    And I have upserted a valid user profile
    When I create a daily log with maximum weight
    Then the response status should be 201
    And the daily log response should include calculated targets

  Scenario: Reject log with weight below minimum
    Given the profile API is running
    And I have upserted a valid user profile
    When I create a daily log with weight below minimum
    Then the response status should be 400
    And the error response should include "validation_error"

  Scenario: Reject log with weight above maximum
    Given the profile API is running
    And I have upserted a valid user profile
    When I create a daily log with weight above maximum
    Then the response status should be 400
    And the error response should include "validation_error"

  Scenario: Create log with minimum sleep quality
    Given the profile API is running
    And I have upserted a valid user profile
    When I create a daily log with minimum sleep quality
    Then the response status should be 201

  Scenario: Create log with maximum sleep quality
    Given the profile API is running
    And I have upserted a valid user profile
    When I create a daily log with maximum sleep quality
    Then the response status should be 201

  Scenario: Reject log with sleep quality below minimum
    Given the profile API is running
    And I have upserted a valid user profile
    When I create a daily log with sleep quality below minimum
    Then the response status should be 400
    And the error response should include "validation_error"

  Scenario: Create log with all optional fields at boundaries
    Given the profile API is running
    And I have upserted a valid user profile
    When I create a daily log with all boundary values
    Then the response status should be 201
    And the daily log response should include all optional fields
  # =============================================================================
  # TRAINING SESSION VARIATIONS
  # =============================================================================

  Scenario: Create rest day log with zero duration
    Given the profile API is running
    And I have upserted a valid user profile
    When I create a rest day log
    Then the response status should be 201
    And the training summary should show rest day

  Scenario: Create log with multiple training sessions
    Given the profile API is running
    And I have upserted a valid user profile
    When I create a daily log with multiple training sessions
    Then the response status should be 201
    And the training summary should reflect multiple sessions

  Scenario: Create log with all different training types
    Given the profile API is running
    And I have upserted a valid user profile
    When I create a daily log with all training types
    Then the response status should be 201
    And the training summary should include all session types

  Scenario: Update actual sessions with minimum RPE
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created a valid daily log for today
    When I update the actual training with minimum RPE
    Then the response status should be 200
    And the actual sessions should have minimum RPE

  Scenario: Update actual sessions with maximum RPE
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created a valid daily log for today
    When I update the actual training with maximum RPE
    Then the response status should be 200
    And the actual sessions should have maximum RPE
  # =============================================================================
  # DAY TYPE VARIATIONS
  # =============================================================================

  Scenario: Create metabolize day log
    Given the profile API is running
    And I have upserted a valid user profile
    When I create a metabolize day log
    Then the response status should be 201
    And the calculated targets should reflect metabolize day

  Scenario: Different day types produce different macro targets
    Given the profile API is running
    And I have upserted a valid user profile
    When I create logs for all day types
    Then the performance day should have highest carbs
    And the fatburner day should have lowest carbs
  # =============================================================================
  # SAVE/UPDATE FLOWS
  # =============================================================================

  Scenario: Update weight on existing log via UI
    Given the backend is running
    And a valid profile exists
    And I have created a valid daily log for today
    When I visit the home page
    And I click on the daily update nav item
    And I update the weight to a new value
    And I submit the form
    Then the weight should be updated in the log

  Scenario: Change day type after initial save
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created a valid daily log for today
    When I update the log to a different day type
    Then the response status should be 200
    And the calculated targets should reflect the new day type

  Scenario: Add training session to existing log
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created a rest day log
    When I update the log with additional training sessions
    Then the response status should be 200
    And the training summary should reflect added sessions

  Scenario: Replace actual training after logging planned
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created a valid daily log for today
    When I update the actual training sessions
    And I fetch today's daily log
    Then the actual sessions should differ from planned
    And the training load should use actual sessions
  # =============================================================================
  # EDGE CASES
  # =============================================================================

  Scenario: Create log for yesterday
    Given the profile API is running
    And I have upserted a valid user profile
    When I create a daily log for yesterday
    Then the response status should be 201

  Scenario: Reject log for future date
    Given the profile API is running
    And I have upserted a valid user profile
    When I create a daily log for tomorrow
    Then the response status should be 400
    And the error response should include "validation_error"

  Scenario: Log with maximum duration training session
    Given the profile API is running
    And I have upserted a valid user profile
    When I create a daily log with maximum duration session
    Then the response status should be 201
    And the training summary should reflect long duration
