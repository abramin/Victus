Feature: App shell

  Scenario: Load the home page
    Given the app is running
    When I visit the home page
    Then I see the Victus Stack heading
