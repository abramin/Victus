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
