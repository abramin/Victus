Feature: Weekly debrief (Mission Report)

  # =============================================================================
  # DEBRIEF RETRIEVAL
  # =============================================================================

  Scenario: Get current week debrief
    Given the backend is running
    And a valid profile exists
    And I have daily logs for the current week
    When I fetch the current week debrief
    Then the response status should be 200
    And the debrief should include training compliance
    And the debrief should include nutrition adherence
    And the debrief should include weight trend summary
    And the debrief should include AI-generated insights

  Scenario: Get debrief for specific week
    Given the backend is running
    And a valid profile exists
    And I have daily logs for the week of 2026-01-13
    When I fetch the debrief for 2026-01-13
    Then the response status should be 200
    And the debrief should be for week starting 2026-01-13
    And the debrief should span 7 days

  Scenario: Get weekly debrief without date (defaults to current)
    Given the backend is running
    And a valid profile exists
    And I have daily logs for the current week
    When I fetch the weekly debrief without specifying a date
    Then the response status should be 200
    And the debrief should be for the current week

  Scenario: Debrief with incomplete week data
    Given the backend is running
    And a valid profile exists
    And I have only 3 daily logs for the current week
    When I fetch the current week debrief
    Then the response status should be 200
    And the debrief should indicate partial data
    And metrics should be calculated from available days

  Scenario: No debrief available for future week
    Given the backend is running
    And a valid profile exists
    When I fetch the debrief for next week
    Then the response status should be 404
    And the error response should include "not_found"

  # =============================================================================
  # TRAINING COMPLIANCE
  # =============================================================================

  Scenario: Debrief shows high training compliance
    Given the backend is running
    And a valid profile exists
    And I completed all planned sessions this week
    When I fetch the current week debrief
    Then the training compliance should be 100%
    And the compliance badge should show "Excellent"

  Scenario: Debrief shows moderate training compliance
    Given the backend is running
    And a valid profile exists
    And I completed 4 out of 6 planned sessions
    When I fetch the current week debrief
    Then the training compliance should be approximately 67%
    And the compliance badge should show "Good"

  Scenario: Debrief shows low training compliance
    Given the backend is running
    And a valid profile exists
    And I completed 1 out of 6 planned sessions
    When I fetch the current week debrief
    Then the training compliance should be approximately 17%
    And the compliance badge should show "Needs Improvement"

  Scenario: Rest week shows as compliant
    Given the backend is running
    And a valid profile exists
    And I planned rest all week and rested
    When I fetch the current week debrief
    Then the training compliance should be 100%

  # =============================================================================
  # NUTRITION ADHERENCE
  # =============================================================================

  Scenario: Debrief shows calorie adherence
    Given the backend is running
    And a valid profile exists
    And I tracked macros all week within 5% of targets
    When I fetch the current week debrief
    Then the nutrition adherence should be high
    And the calorie variance should be within acceptable range

  Scenario: Debrief shows macro distribution
    Given the backend is running
    And a valid profile exists
    And I have tracked macros for 7 days
    When I fetch the current week debrief
    Then the debrief should show average carb intake
    And the debrief should show average protein intake
    And the debrief should show average fat intake
    And the debrief should compare to weekly targets

  Scenario: Debrief handles days without tracking
    Given the backend is running
    And a valid profile exists
    And I tracked macros for 4 out of 7 days
    When I fetch the current week debrief
    Then the adherence should be calculated from tracked days only
    And the debrief should indicate tracking compliance

  # =============================================================================
  # WEIGHT TRENDS
  # =============================================================================

  Scenario: Debrief shows weight loss trend
    Given the backend is running
    And a valid profile with lose_weight goal exists
    And my weight decreased by 0.5 kg this week
    When I fetch the current week debrief
    Then the weight trend should show -0.5 kg change
    And the trend should be marked as "On Track"

  Scenario: Debrief shows weight maintenance
    Given the backend is running
    And a valid profile with maintain goal exists
    And my weight fluctuated within 0.2 kg this week
    When I fetch the current week debrief
    Then the weight trend should show maintenance
    And the trend should be marked as "On Track"

  Scenario: Debrief shows deviation from goal
    Given the backend is running
    And a valid profile with lose_weight goal exists
    And my weight increased by 0.3 kg this week
    When I fetch the current week debrief
    Then the weight trend should show +0.3 kg change
    And the trend should be marked as "Off Track"
    And the AI insights should suggest course correction

  # =============================================================================
  # AI INSIGHTS
  # =============================================================================

  Scenario: Debrief includes AI-generated narrative
    Given the backend is running
    And a valid profile exists
    And I have complete week data
    When I fetch the current week debrief
    Then the debrief should include an AI narrative
    And the narrative should summarize performance
    And the narrative should provide recommendations

  Scenario: Narrative adapts to user performance
    Given the backend is running
    And a valid profile exists
    And I had excellent compliance this week
    When I fetch the current week debrief
    Then the AI narrative should acknowledge strong performance
    And the narrative should encourage continued progress

  Scenario: Narrative provides corrective guidance
    Given the backend is running
    And a valid profile exists
    And I had poor compliance this week
    When I fetch the current week debrief
    Then the AI narrative should identify areas for improvement
    And the narrative should suggest actionable changes

  # =============================================================================
  # UI TESTS
  # =============================================================================

  Scenario: Weekly debrief page displays comprehensive report
    Given the backend is running
    And a valid profile exists
    And I have complete week data
    When I visit the weekly debrief page
    Then I should see the mission report header
    And I should see training compliance metrics
    And I should see nutrition adherence metrics
    And I should see weight trend visualization
    And I should see AI insights panel

  Scenario: Navigate to previous week debrief
    Given the backend is running
    And a valid profile exists
    And I have data for last 2 weeks
    When I visit the weekly debrief page
    And I click the previous week button
    Then I should see the debrief for last week
    And the date range should update

  Scenario: Navigate to next week debrief (if available)
    Given the backend is running
    And a valid profile exists
    And I am viewing last week's debrief
    When I click the next week button
    Then I should see the debrief for current week

  Scenario: Debrief shows empty state for week without data
    Given the backend is running
    And a valid profile exists
    And no logs exist for a specific week
    When I navigate to that week's debrief
    Then I should see an empty state message
    And the message should prompt to log daily data

  Scenario: Training compliance chart shows daily breakdown
    Given the backend is running
    And a valid profile exists
    And I have mixed compliance this week
    When I visit the weekly debrief page
    Then the training chart should show each day's status
    And completed days should be highlighted green
    And missed days should be highlighted red

  Scenario: Nutrition chart shows macro distribution
    Given the backend is running
    And a valid profile exists
    And I have tracked macros all week
    When I visit the weekly debrief page
    Then I should see a macro distribution chart
    And the chart should compare actual vs target
    And carbs, protein, and fat should be color-coded

  # =============================================================================
  # EDGE CASES
  # =============================================================================

  Scenario: Debrief for week spanning month boundary
    Given the backend is running
    And a valid profile exists
    And I have logs for a week spanning January-February
    When I fetch that week's debrief
    Then the debrief should include all 7 days
    And the date range should span both months

  Scenario: First week of tracking (incomplete history)
    Given the backend is running
    And a valid profile exists
    And this is my first week of logging
    When I fetch the current week debrief
    Then the debrief should acknowledge new user
    And baselines should be established where possible
