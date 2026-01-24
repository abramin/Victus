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

  Scenario: Profile with BMR equation selection
    Given the profile API is running
    When I upsert a profile with Katch-McArdle BMR equation
    Then the response status should be 200
    And the profile response should include the selected BMR equation
  # =============================================================================
  # SEX VARIATIONS
  # =============================================================================

  Scenario: Create profile with male sex
    Given the profile API is running
    When I upsert a male profile
    Then the response status should be 200
    And the profile sex should be male

  Scenario: Create profile with female sex
    Given the profile API is running
    When I upsert a female profile
    Then the response status should be 200
    And the profile sex should be female
  # =============================================================================
  # GOAL VARIATIONS
  # =============================================================================

  Scenario: Create profile with lose weight goal
    Given the profile API is running
    When I upsert a lose weight profile
    Then the response status should be 200
    And the profile goal should be lose weight
    And the weekly change should be negative

  Scenario: Create profile with maintain weight goal
    Given the profile API is running
    When I upsert a maintain weight profile
    Then the response status should be 200
    And the profile goal should be maintain
    And the weekly change should be zero

  Scenario: Create profile with gain weight goal
    Given the profile API is running
    When I upsert a gain weight profile
    Then the response status should be 200
    And the profile goal should be gain weight
    And the weekly change should be positive
  # =============================================================================
  # BMR EQUATION VARIATIONS
  # =============================================================================

  Scenario: Create profile with Mifflin-St Jeor BMR
    Given the profile API is running
    When I upsert a profile with Mifflin-St Jeor BMR
    Then the response status should be 200
    And the profile BMR equation should be mifflin_st_jeor

  Scenario: Create profile with Oxford-Henry BMR
    Given the profile API is running
    When I upsert a profile with Oxford-Henry BMR
    Then the response status should be 200
    And the profile BMR equation should be oxford_henry

  Scenario: Create profile with Harris-Benedict BMR
    Given the profile API is running
    When I upsert a profile with Harris-Benedict BMR
    Then the response status should be 200
    And the profile BMR equation should be harris_benedict

  Scenario: Katch-McArdle requires body fat percentage
    Given the profile API is running
    When I upsert a profile with Katch-McArdle but no body fat
    Then the response status should be 400
    And the error response should include "validation_error"
  # =============================================================================
  # TDEE SOURCE VARIATIONS
  # =============================================================================

  Scenario: Create profile with formula TDEE source
    Given the profile API is running
    When I upsert a profile with formula TDEE
    Then the response status should be 200
    And the profile TDEE source should be formula

  Scenario: Create profile with manual TDEE source
    Given the profile API is running
    When I upsert a profile with manual TDEE
    Then the response status should be 200
    And the profile TDEE source should be manual
    And the profile should include manual TDEE value

  Scenario: Create profile with adaptive TDEE source
    Given the profile API is running
    When I upsert a profile with adaptive TDEE
    Then the response status should be 200
    And the profile TDEE source should be adaptive

  Scenario: Manual TDEE source requires TDEE value
    Given the profile API is running
    When I upsert a profile with manual TDEE but no value
    Then the response status should be 400
    And the error response should include "validation_error"
  # =============================================================================
  # BOUNDARY CONDITIONS
  # =============================================================================

  Scenario: Create profile with minimum height
    Given the profile API is running
    When I upsert a profile with minimum height
    Then the response status should be 200

  Scenario: Create profile with maximum height
    Given the profile API is running
    When I upsert a profile with maximum height
    Then the response status should be 200

  Scenario: Reject profile with height below minimum
    Given the profile API is running
    When I upsert a profile with height below minimum
    Then the response status should be 400
    And the error response should include "validation_error"

  Scenario: Reject profile with height above maximum
    Given the profile API is running
    When I upsert a profile with height above maximum
    Then the response status should be 400
    And the error response should include "validation_error"

  Scenario: Create profile with minimum body fat
    Given the profile API is running
    When I upsert a profile with minimum body fat
    Then the response status should be 200

  Scenario: Create profile with maximum body fat
    Given the profile API is running
    When I upsert a profile with maximum body fat
    Then the response status should be 200

  Scenario: Reject profile with body fat below minimum
    Given the profile API is running
    When I upsert a profile with body fat below minimum
    Then the response status should be 400
    And the error response should include "validation_error"

  Scenario: Create profile with aggressive weight loss goal
    Given the profile API is running
    When I upsert a profile with aggressive weight loss
    Then the response status should be 200
    And the profile should flag aggressive goal

  Scenario: Create profile with aggressive weight gain goal
    Given the profile API is running
    When I upsert a profile with aggressive weight gain
    Then the response status should be 200
    And the profile should flag aggressive goal

  Scenario: Create profile with minimum TDEE
    Given the profile API is running
    When I upsert a profile with minimum TDEE
    Then the response status should be 200

  Scenario: Create profile with maximum TDEE
    Given the profile API is running
    When I upsert a profile with maximum TDEE
    Then the response status should be 200
  # =============================================================================
  # UI TESTS
  # =============================================================================

  Scenario: Profile form shows existing data
    Given the backend is running
    And a valid profile exists
    When I visit the home page
    And I click on the profile nav item
    Then I should see the profile settings form
    And the form should be pre-populated with existing data

  Scenario: Profile form shows aggressive goal warning
    Given the backend is running
    And a valid profile exists
    When I visit the home page
    And I click on the profile nav item
    And I set an aggressive weight loss rate
    Then I should see an aggressive goal warning

  Scenario: Body fat field visible for Katch-McArdle
    Given the backend is running
    And a valid profile exists
    When I visit the home page
    And I click on the profile nav item
    And I select Katch-McArdle BMR equation
    Then the body fat field should be visible

  Scenario: Manual TDEE field visible when manual source selected
    Given the backend is running
    And a valid profile exists
    When I visit the home page
    And I click on the profile nav item
    And I select manual TDEE source
    Then the manual TDEE field should be visible

  Scenario: Save profile changes via UI
    Given the backend is running
    And a valid profile exists
    When I visit the home page
    And I click on the profile nav item
    And I update the height field
    And I submit the form
    Then I should see a success message
    And the profile should reflect updated height

  Scenario: Profile save shows backend error and keeps inputs
    Given the backend is running
    And a valid profile exists
    When I visit the home page
    And I click on the profile nav item
    And I select Katch-McArdle BMR equation
    And I submit the form
    Then I should see the profile save error
    And the BMR equation should remain "katch_mcardle"
  # =============================================================================
  # SAVE/UPDATE FLOWS
  # =============================================================================

  Scenario: Update existing profile preserves other fields
    Given the profile API is running
    And I have upserted a valid user profile
    When I update only the height field via API
    Then the response status should be 200
    And the other profile fields should be preserved

  Scenario: Change goal updates weekly change direction
    Given the profile API is running
    And I have upserted a lose weight profile
    When I update the profile to gain weight goal
    Then the response status should be 200
    And the weekly change should be positive

  Scenario: Change BMR equation recalculates targets
    Given the profile API is running
    And I have upserted a valid user profile
    And I have created a valid daily log for today
    When I update the profile BMR equation
    And I fetch today's daily log
    Then the calculated targets should differ from original
  # =============================================================================
  # EDGE CASES
  # =============================================================================

  Scenario: Macro ratios must sum to 100%
    Given the profile API is running
    When I upsert a profile with invalid macro ratios
    Then the response status should be 400
    And the error response should include "validation_error"

  Scenario: Meal ratios must sum to 100%
    Given the profile API is running
    When I upsert a profile with invalid meal ratios
    Then the response status should be 400
    And the error response should include "validation_error"
