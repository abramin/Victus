Feature: Sidebar navigation

  Background:
    Given the backend is running
    And a valid profile exists
    And I visit the home page

  Scenario: Sidebar shows all navigation items
    Then I should see the sidebar navigation
    And I should see the today nav item
    And I should see the kitchen nav item
    And I should see the strategy nav item
    And I should see the schedule nav item
    And I should see the history nav item
    And I should see the profile nav item

  Scenario: Navigate to today view
    When I click on the today nav item
    Then I should see the today dashboard

  Scenario: Navigate to kitchen view
    When I click on the kitchen nav item
    Then I should see the kitchen dashboard

  Scenario: Navigate to strategy view
    When I click on the strategy nav item
    Then I should see the strategy view

  Scenario: Navigate to schedule view
    When I click on the schedule nav item
    Then I should see the schedule calendar

  Scenario: Navigate to history view
    When I click on the history nav item
    Then I should see the weight history

  Scenario: Navigate to profile settings
    When I click on the profile nav item
    Then I should see the profile settings form

  Scenario: Active nav item is highlighted
    When I click on the history nav item
    Then the history nav item should be highlighted
    When I click on the strategy nav item
    Then the strategy nav item should be highlighted
