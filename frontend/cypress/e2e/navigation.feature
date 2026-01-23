Feature: Sidebar navigation

  Background:
    Given the backend is running
    And a valid profile exists
    And I visit the home page

  Scenario: Sidebar shows all navigation items
    Then I should see the sidebar navigation
    And I should see the meal points nav item
    And I should see the plan nav item
    And I should see the history nav item
    And I should see the daily update nav item
    And I should see the profile nav item

  Scenario: Navigate to meal points view
    When I click on the meal points nav item
    Then I should see the meal points dashboard

  Scenario: Navigate to plan view
    When I click on the plan nav item
    Then I should see the plan calendar

  Scenario: Navigate to history view
    When I click on the history nav item
    Then I should see the weight history

  Scenario: Navigate to daily update view
    When I click on the daily update nav item
    Then I should see the daily update form

  Scenario: Navigate to profile settings
    When I click on the profile nav item
    Then I should see the profile settings form

  Scenario: Active nav item is highlighted
    When I click on the history nav item
    Then the history nav item should be highlighted
    When I click on the plan nav item
    Then the plan nav item should be highlighted
