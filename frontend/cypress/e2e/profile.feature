Feature: User profile management

  Scenario: Create or update a user profile with defaults
    Given the profile API is running
    When I upsert a valid user profile
    Then the response status should be 200
    And the profile response should include the submitted profile data
    And the profile response should include default ratios and targets

  Scenario: Fetch the current profile
    Given the profile API is running
    And I have upserted a valid user profile
    When I fetch the user profile
    Then the response status should be 200
    And the profile response should include the submitted profile data

  Scenario: Reject invalid profile input
    Given the profile API is running
    When I upsert an invalid user profile
    Then the response status should be 400
    And the error response should include "validation_error"
