Feature: Training configuration reference data

  Scenario: Fetch available training configurations
    Given the profile API is running
    When I fetch the training configurations
    Then the response status should be 200
    And the training configs should include all training types
    And the training configs should include MET values and load scores
