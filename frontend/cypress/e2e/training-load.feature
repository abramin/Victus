Feature: Training load calculation
  Training load tracks acute (7-day) and chronic (28-day) averages to calculate
  the Acute:Chronic Ratio (ACR), helping prevent overtraining.

  Scenario: Training load uses planned sessions when no actual recorded
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created a valid daily log for today
    When I fetch today's daily log
    Then the response status should be 200
    And the training load should reflect planned sessions

  Scenario: ACR defaults to 1.0 with insufficient history
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created a valid daily log for today
    When I fetch today's daily log
    Then the response status should be 200
    And the ACR should be 1.0

  Scenario: Daily load is calculated from actual sessions when present
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created a valid daily log for today
    And I have updated the actual training sessions
    When I fetch today's daily log
    Then the response status should be 200
    And the training load should reflect actual sessions
  # =============================================================================
  # ACR THRESHOLD TESTS
  # =============================================================================

  Scenario: ACR below 0.8 indicates undertraining
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created logs with decreasing training load
    When I fetch today's daily log
    Then the response status should be 200
    And the ACR should indicate undertraining zone

  Scenario: ACR above 1.3 indicates overtraining risk
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created logs with increasing training load
    When I fetch today's daily log
    Then the response status should be 200
    And the ACR should indicate overtraining risk zone

  Scenario: ACR between 0.8 and 1.3 indicates optimal zone
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created logs with consistent training load
    When I fetch today's daily log
    Then the response status should be 200
    And the ACR should be in optimal zone
  # =============================================================================
  # LOAD CALCULATION TESTS
  # =============================================================================

  Scenario: Acute load calculated from 7 days of data
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created daily logs for the last 7 days
    When I fetch today's daily log
    Then the response status should be 200
    And the acute load should reflect 7 day average

  Scenario: Chronic load calculated from 28 days of data
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created daily logs for the last 28 days
    When I fetch today's daily log
    Then the response status should be 200
    And the chronic load should reflect 28 day average

  Scenario: Load calculation handles partial history
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created daily logs for the last 14 days
    When I fetch today's daily log
    Then the response status should be 200
    And the training load should be calculated with available data
  # =============================================================================
  # TRAINING INTENSITY TESTS
  # =============================================================================

  Scenario: High intensity sessions produce higher load
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created a valid daily log for today
    When I update the actual training with maximum RPE
    And I fetch today's daily log
    Then the training load should be higher than planned

  Scenario: Low intensity sessions produce lower load
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created a valid daily log for today
    When I update the actual training with minimum RPE
    And I fetch today's daily log
    Then the training load should be lower than planned
  # =============================================================================
  # RECOVERY SCORE TESTS
  # =============================================================================

  Scenario: Recovery score reflects sleep quality
    Given the profile API is running
    And I have upserted a valid user profile
    When I create a daily log with high sleep quality
    Then the response status should be 201
    And the recovery score should be high

  Scenario: Low sleep quality produces low recovery score
    Given the profile API is running
    And I have upserted a valid user profile
    When I create a daily log with low sleep quality
    Then the response status should be 201
    And the recovery score should be low
  # =============================================================================
  # EDGE CASES
  # =============================================================================

  Scenario: Zero training load for rest day
    Given the profile API is running
    And I have upserted a valid user profile
    When I create a rest day log
    Then the response status should be 201
    And the daily training load should be zero

  Scenario: Multiple sessions combined for daily load
    Given the profile API is running
    And I have upserted a valid user profile
    When I create a daily log with multiple training sessions
    Then the response status should be 201
    And the daily load should sum all sessions

  Scenario: Training type affects load calculation
    Given the profile API is running
    And I have upserted a valid user profile
    When I create a log with high intensity HIIT session
    Then the response status should be 201
    And the load should reflect HIIT intensity factor
