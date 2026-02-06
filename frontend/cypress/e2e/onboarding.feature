Feature: Onboarding wizard

  Background:
    Given the backend is running
    And no profile exists

  Scenario: Complete onboarding wizard creates profile and shows first-day state
    When I visit the home page
    Then I should see the onboarding wizard
    When I complete the basic info step with valid data
    And I click the next button
    Then I should see the activity goals step
    When I select my activity level and goal
    And I click the next button
    Then I should see the nutrition targets step
    When I set my nutrition targets
    And I click the complete button
    Then I should see the main dashboard
    And the profile should be saved
    And I should see the first-day command center state

  Scenario: Onboarding shows validation on empty fields
    When I visit the home page
    Then I should see the onboarding wizard
    When I clear the weight field
    And I click the next button
    Then I should still see the basic info step

  Scenario: Onboarding navigation allows going back
    When I visit the home page
    Then I should see the onboarding wizard
    When I complete the basic info step with valid data
    And I click the next button
    Then I should see the activity goals step
    When I click the previous button
    Then I should see the basic info step
  # =============================================================================
  # ACTIVITY LEVEL VARIATIONS
  # =============================================================================

  Scenario: Complete onboarding with sedentary activity level
    When I visit the home page
    Then I should see the onboarding wizard
    When I complete the basic info step with valid data
    And I click the next button
    And I select sedentary activity level
    And I click the next button
    And I click the complete button
    Then I should see the main dashboard
    And the profile should have sedentary activity level

  Scenario: Complete onboarding with light activity level
    When I visit the home page
    Then I should see the onboarding wizard
    When I complete the basic info step with valid data
    And I click the next button
    And I select light activity level
    And I click the next button
    And I click the complete button
    Then I should see the main dashboard
    And the profile should have light activity level

  Scenario: Complete onboarding with active activity level
    When I visit the home page
    Then I should see the onboarding wizard
    When I complete the basic info step with valid data
    And I click the next button
    And I select active activity level
    And I click the next button
    And I click the complete button
    Then I should see the main dashboard
    And the profile should have active activity level

  Scenario: Complete onboarding with very active activity level
    When I visit the home page
    Then I should see the onboarding wizard
    When I complete the basic info step with valid data
    And I click the next button
    And I select very active activity level
    And I click the next button
    And I click the complete button
    Then I should see the main dashboard
    And the profile should have very active activity level
  # =============================================================================
  # GOAL VARIATIONS
  # =============================================================================

  Scenario: Complete onboarding with lose weight goal
    When I visit the home page
    Then I should see the onboarding wizard
    When I complete the basic info step with valid data
    And I click the next button
    And I select lose weight goal
    And I click the next button
    And I click the complete button
    Then I should see the main dashboard
    And the profile should have lose weight goal

  Scenario: Complete onboarding with maintain weight goal
    When I visit the home page
    Then I should see the onboarding wizard
    When I complete the basic info step with valid data
    And I click the next button
    And I select maintain weight goal
    And I click the next button
    And I click the complete button
    Then I should see the main dashboard
    And the profile should have maintain goal

  Scenario: Complete onboarding with gain weight goal
    When I visit the home page
    Then I should see the onboarding wizard
    When I complete the basic info step with valid data
    And I click the next button
    And I select gain weight goal
    And I click the next button
    And I click the complete button
    Then I should see the main dashboard
    And the profile should have gain weight goal
  # =============================================================================
  # BOUNDARY CONDITIONS
  # =============================================================================

  Scenario: Onboarding with minimum weight boundary
    When I visit the home page
    Then I should see the onboarding wizard
    When I enter minimum weight in basic info
    And I complete rest of basic info
    And I click the next button
    Then I should see the activity goals step

  Scenario: Onboarding with maximum weight boundary
    When I visit the home page
    Then I should see the onboarding wizard
    When I enter maximum weight in basic info
    And I complete rest of basic info
    And I click the next button
    Then I should see the activity goals step

  Scenario: Onboarding rejects weight below minimum
    When I visit the home page
    Then I should see the onboarding wizard
    When I enter weight below minimum in basic info
    And I complete rest of basic info
    And I click the next button
    Then I should still see the basic info step

  Scenario: Onboarding with minimum height boundary
    When I visit the home page
    Then I should see the onboarding wizard
    When I enter minimum height in basic info
    And I complete rest of basic info except height
    And I click the next button
    Then I should see the activity goals step

  Scenario: Onboarding with maximum height boundary
    When I visit the home page
    Then I should see the onboarding wizard
    When I enter maximum height in basic info
    And I complete rest of basic info except height
    And I click the next button
    Then I should see the activity goals step
  # =============================================================================
  # ERROR STATES
  # =============================================================================

  Scenario: Show error when profile save fails
    Given the API will return an error on profile save
    When I visit the home page
    Then I should see the onboarding wizard
    When I complete the basic info step with valid data
    And I click the next button
    And I select my activity level and goal
    And I click the next button
    And I click the complete button
    Then I should see an error message

  Scenario: Onboarding shows saving indicator
    When I visit the home page
    Then I should see the onboarding wizard
    When I complete the basic info step with valid data
    And I click the next button
    And I select my activity level and goal
    And I click the next button
    And I click the complete button
    Then I should briefly see a saving indicator
  # =============================================================================
  # EDGE CASES
  # =============================================================================

  Scenario: Redirect to dashboard if profile already exists
    Given a valid profile exists
    When I visit the home page
    Then I should see the main dashboard
    And I should not see the onboarding wizard

  Scenario: Can modify values before final submission
    When I visit the home page
    Then I should see the onboarding wizard
    When I complete the basic info step with valid data
    And I click the next button
    Then I should see the activity goals step
    When I click the previous button
    And I modify the weight value
    And I click the next button
    Then I should see the activity goals step
    When I click the next button
    And I click the complete button
    Then the profile should reflect the modified weight
