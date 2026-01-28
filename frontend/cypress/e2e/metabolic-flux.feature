Feature: Metabolic flux engine

  # =============================================================================
  # METABOLIC CHART DATA
  # =============================================================================

  Scenario: Fetch metabolic rate chart data
    Given the backend is running
    And a valid profile exists
    And I have created daily logs for the last 30 days
    When I fetch the metabolic chart data
    Then the response status should be 200
    And the chart should include daily TDEE estimates
    And the chart should show metabolic trend line

  Scenario: Chart handles sparse data gracefully
    Given the backend is running
    And a valid profile exists
    And I have created only 5 daily logs
    When I fetch the metabolic chart data
    Then the response status should be 200
    And the chart should include available data points
    And the trend should indicate insufficient data if needed

  Scenario: Chart data reflects adaptive TDEE source
    Given the backend is running
    And a valid profile with adaptive TDEE exists
    And I have sufficient history for adaptation
    When I fetch the metabolic chart data
    Then the response status should be 200
    And the TDEE values should show adaptation over time

  # =============================================================================
  # METABOLIC NOTIFICATIONS
  # =============================================================================

  Scenario: Get pending metabolic notification
    Given the backend is running
    And a valid profile exists
    And metabolic drift has been detected
    When I fetch the metabolic notification
    Then the response status should be 200
    And the notification should indicate recalibration needed
    And the notification should include drift magnitude

  Scenario: No notification when metabolism is stable
    Given the backend is running
    And a valid profile exists
    And metabolism is within tolerance
    When I fetch the metabolic notification
    Then the response status should be 200
    And the notification should be null

  Scenario: Dismiss metabolic notification
    Given the backend is running
    And a valid profile exists
    And a metabolic notification exists
    When I dismiss the notification
    Then the response status should be 204
    And subsequent fetches should return null

  Scenario: Notification reappears after continued drift
    Given the backend is running
    And a valid profile exists
    And I have dismissed a metabolic notification
    And metabolic drift continues beyond threshold
    When I fetch the metabolic notification
    Then the response status should be 200
    And a new notification should be present

  # =============================================================================
  # METABOLIC DRIFT DETECTION
  # =============================================================================

  Scenario: Detect metabolic adaptation during deficit
    Given the backend is running
    And a valid profile with lose_weight goal exists
    And I have 4 weeks of consistent deficit logs
    And actual weight loss is slower than expected
    When I fetch the metabolic notification
    Then the notification should suggest TDEE has decreased
    And the recommendation should be recalibrate or increase deficit

  Scenario: Detect metabolic adaptation during surplus
    Given the backend is running
    And a valid profile with gain_weight goal exists
    And I have 4 weeks of consistent surplus logs
    And actual weight gain is slower than expected
    When I fetch the metabolic notification
    Then the notification should suggest TDEE has increased
    And the recommendation should be increase surplus

  Scenario: No false positives with normal variance
    Given the backend is running
    And a valid profile exists
    And weight fluctuates within normal daily variance
    When I fetch the metabolic notification after 2 weeks
    Then the notification should be null
    And no recalibration should be suggested

  # =============================================================================
  # UI TESTS
  # =============================================================================

  Scenario: Metabolic chart renders with data
    Given the backend is running
    And a valid profile exists
    And I have created daily logs for the last 30 days
    When I visit the metabolic flux page
    Then I should see the metabolic rate chart
    And the chart should display TDEE over time
    And the trend line should be visible

  Scenario: Metabolic notification banner appears
    Given the backend is running
    And a valid profile exists
    And metabolic drift has been detected
    When I visit the dashboard
    Then I should see a metabolic notification banner
    And the banner should indicate recalibration needed
    And the banner should have a dismiss button

  Scenario: Notification banner disappears after dismiss
    Given the backend is running
    And a valid profile exists
    And I see a metabolic notification banner
    When I click the dismiss button
    Then the banner should disappear
    And the notification should be marked as dismissed

  Scenario: Chart shows empty state without data
    Given the backend is running
    And a valid profile exists
    And no daily logs exist
    When I visit the metabolic flux page
    Then I should see an empty state message
    And the message should prompt to create daily logs

  Scenario: Chart tooltip shows TDEE details on hover
    Given the backend is running
    And a valid profile exists
    And I have created daily logs for the last 30 days
    When I visit the metabolic flux page
    And I hover over a data point
    Then I should see a tooltip with TDEE value
    And the tooltip should show the date

  # =============================================================================
  # RECALIBRATION TOLERANCE
  # =============================================================================

  Scenario: Tight tolerance triggers notification sooner
    Given the backend is running
    And a valid profile with 0.3 kg tolerance exists
    And weight deviates by 0.35 kg from expected
    When I fetch the metabolic notification
    Then the response status should be 200
    And a notification should be present

  Scenario: Loose tolerance delays notification
    Given the backend is running
    And a valid profile with 0.7 kg tolerance exists
    And weight deviates by 0.5 kg from expected
    When I fetch the metabolic notification
    Then the response status should be 200
    And the notification should be null

  # =============================================================================
  # EDGE CASES
  # =============================================================================

  Scenario: Handle inconsistent logging patterns
    Given the backend is running
    And a valid profile exists
    And I have sporadic daily logs with gaps
    When I fetch the metabolic chart data
    Then the response status should be 200
    And the chart should handle missing dates
    And the trend should indicate data quality

  Scenario: Chart handles extreme TDEE outliers
    Given the backend is running
    And a valid profile exists
    And one day has an extreme TDEE value
    When I fetch the metabolic chart data
    Then the response status should be 200
    And the chart scale should accommodate outliers
    And the trend line should not be skewed
