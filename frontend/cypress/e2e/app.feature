Feature: App shell

  Scenario: Load the home page
    Given the app is running
    When I visit the home page
    Then I see the Victus heading

  Scenario: Shows loading spinner while fetching data
    Given the app is running
    When I visit the home page
    Then I should briefly see a loading indicator

  Scenario: Redirects to onboarding without profile
    Given the app is running
    And no user profile exists
    When I visit the home page
    Then I should see the onboarding wizard

  Scenario: Shows main dashboard when profile exists
    Given the app is running
    And a user profile exists
    When I visit the home page
    Then I should see the main app layout
    And I should not see the onboarding wizard

  Scenario: Shows meal points dashboard by default
    Given the app is running
    And a user profile exists
    When I visit the home page
    Then I should see the meal points view
  # =============================================================================
  # ERROR STATE TESTS
  # =============================================================================

  Scenario: Show error state when profile API fails
    Given the app is running
    And the API will timeout
    When I visit the home page
    Then I should see an error message

  Scenario: Show retry button after error
    Given the app is running
    And the API will return an error on profile fetch
    When I visit the home page
    Then I should see an error message
    And I should see a retry button

  Scenario: Retry successfully loads after initial failure
    Given the app is running
    And the API will fail once then succeed
    When I visit the home page
    And I click the retry button
    Then I should see the main app layout
  # =============================================================================
  # SLOW NETWORK TESTS
  # =============================================================================

  Scenario: Show loading state during slow API response
    Given the app is running
    And the API will respond slowly
    And a user profile exists
    When I visit the home page
    Then I should see a loading spinner
    And the loading spinner should disappear
  # =============================================================================
  # SESSION PERSISTENCE TESTS
  # =============================================================================

  Scenario: Page refresh preserves view
    Given the app is running
    And a user profile exists
    When I visit the home page
    And I click on the history nav item
    And I refresh the page
    Then I should see the weight history
  # =============================================================================
  # DEEP LINKING TESTS
  # =============================================================================

  Scenario: Direct navigation to history view
    Given the app is running
    And a user profile exists
    When I visit the history page directly
    Then I should see the weight history
    And I should see the main app layout

  Scenario: Direct navigation to command center
    Given the app is running
    And a user profile exists
    When I visit the command center directly
    Then I should see the command center
    And I should see the main app layout

  Scenario: Direct navigation to profile view
    Given the app is running
    And a user profile exists
    When I visit the profile page directly
    Then I should see the profile settings form
    And I should see the main app layout
  # =============================================================================
  # EDGE CASES
  # =============================================================================

  Scenario: Handle concurrent data loading
    Given the app is running
    And a user profile exists
    And I have created a valid daily log for today
    When I visit the home page
    Then the meal points should load successfully
    And the daily log data should be available
