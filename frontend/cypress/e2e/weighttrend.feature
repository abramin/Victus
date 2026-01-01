Feature: Weight trend history

  Scenario: Fetch weight trend for the last 7 days
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created daily logs for the last 3 days
    When I fetch the weight trend for "7d"
    Then the response status should be 200
    And the weight trend response should include points for the last 3 days
    And the weight trend response should include a trend summary

  Scenario: Reject invalid trend range
    Given the profile API is running
    When I fetch the weight trend for "invalid"
    Then the response status should be 400
    And the error response should include "invalid_range"

  Scenario: Fetch weight trend with default range
    Given the profile API is running
    When I fetch the weight trend without a range
    Then the response status should be 200
    And the weight trend response should include points
