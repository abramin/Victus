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
  # =============================================================================
  # ALL RANGE OPTIONS
  # =============================================================================

  Scenario: Fetch weight trend for 30 days
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created daily logs for the last 7 days
    When I fetch the weight trend for "30d"
    Then the response status should be 200
    And the weight trend response should include points

  Scenario: Fetch weight trend for 90 days
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created daily logs for the last 7 days
    When I fetch the weight trend for "90d"
    Then the response status should be 200
    And the weight trend response should include points

  Scenario: Fetch weight trend for all time
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created daily logs for the last 7 days
    When I fetch the weight trend for "all"
    Then the response status should be 200
    And the weight trend response should include points
  # =============================================================================
  # EDGE CASES - DATA POINTS
  # =============================================================================

  Scenario: Handle empty weight trend data
    Given the profile API is running
    And I have upserted a valid user profile
    And no daily logs exist
    When I fetch the weight trend for "7d"
    Then the response status should be 200
    And the weight trend response should have empty points
    And the trend summary should be null

  Scenario: Handle single data point
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created only one daily log
    When I fetch the weight trend for "7d"
    Then the response status should be 200
    And the weight trend response should have exactly 1 point
    And the trend summary should handle single point

  Scenario: Handle maximum data points over time
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created daily logs for the last 30 days
    When I fetch the weight trend for "all"
    Then the response status should be 200
    And the weight trend response should include all 30 points
  # =============================================================================
  # TREND DIRECTION TESTS
  # =============================================================================

  Scenario: Detect weight loss trend
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created weight loss trend logs
    When I fetch the weight trend for "7d"
    Then the response status should be 200
    And the trend should indicate weight loss
    And the weekly change should be negative

  Scenario: Detect weight gain trend
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created weight gain trend logs
    When I fetch the weight trend for "7d"
    Then the response status should be 200
    And the trend should indicate weight gain
    And the weekly change should be positive

  Scenario: Detect weight maintenance trend
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created weight maintenance trend logs
    When I fetch the weight trend for "7d"
    Then the response status should be 200
    And the trend should indicate maintenance
    And the weekly change should be near zero
  # =============================================================================
  # TREND CALCULATION VALIDATION
  # =============================================================================

  Scenario: Trend summary includes r-squared value
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created daily logs for the last 7 days
    When I fetch the weight trend for "7d"
    Then the response status should be 200
    And the trend summary should include r-squared value
    And the r-squared should be between 0 and 1

  Scenario: Trend summary includes start and end weights
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created daily logs for the last 7 days
    When I fetch the weight trend for "7d"
    Then the response status should be 200
    And the trend summary should include start weight
    And the trend summary should include end weight
  # =============================================================================
  # UI TESTS
  # =============================================================================

  Scenario: Weight history chart renders with data
    Given the backend is running
    And a valid profile exists
    And I have created daily logs for the last 3 days
    When I visit the home page
    And I click on the history nav item
    Then I should see the weight history
    And I should see the weight chart
    And the chart should display data points

  Scenario: Weight history shows range selector
    Given the backend is running
    And a valid profile exists
    When I visit the home page
    And I click on the history nav item
    Then I should see the weight history
    And I should see the range selector
    And the range selector should have all options

  Scenario: Changing range updates chart
    Given the backend is running
    And a valid profile exists
    And I have created daily logs for the last 7 days
    When I visit the home page
    And I click on the history nav item
    And I select the 30 day range
    Then the chart should update with new data

  Scenario: Weight history shows empty state without data
    Given the backend is running
    And a valid profile exists
    And no daily logs exist
    When I visit the home page
    And I click on the history nav item
    Then I should see the weight history
    And I should see an empty state message

  Scenario: Weight history shows trend line
    Given the backend is running
    And a valid profile exists
    And I have created daily logs for the last 7 days
    When I visit the home page
    And I click on the history nav item
    Then I should see the weight history
    And I should see a trend line on the chart

  Scenario: Weight history displays trend statistics
    Given the backend is running
    And a valid profile exists
    And I have created daily logs for the last 7 days
    When I visit the home page
    And I click on the history nav item
    Then I should see the weight history
    And I should see the weekly change statistic
    And I should see the total change statistic
