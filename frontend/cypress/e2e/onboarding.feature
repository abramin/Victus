Feature: Onboarding wizard

  Background:
    Given the backend is running
    And no profile exists

  Scenario: Complete onboarding wizard creates profile
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
