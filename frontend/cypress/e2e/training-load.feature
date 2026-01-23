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
