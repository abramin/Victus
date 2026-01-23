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
