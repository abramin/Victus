Feature: Nutrition plan management

  # =============================================================================
  # PLAN CREATION
  # =============================================================================

  Scenario: Create nutrition plan with safe weight loss
    Given the plan API is running
    And a valid profile exists
    And no active plan exists
    When I create a plan with safe weight loss parameters
    Then the response status should be 201
    And the plan response should include weekly targets
    And the plan status should be active

  Scenario: Create nutrition plan with safe weight gain
    Given the plan API is running
    And a valid profile exists
    And no active plan exists
    When I create a plan with safe weight gain parameters
    Then the response status should be 201
    And the plan response should include weekly targets
    And the required weekly change should be positive

  Scenario: Reject plan with aggressive deficit
    Given the plan API is running
    And a valid profile exists
    And no active plan exists
    When I create a plan with aggressive weight loss
    Then the response status should be 400
    And the error response should include "validation_error"

  Scenario: Reject plan with aggressive surplus
    Given the plan API is running
    And a valid profile exists
    And no active plan exists
    When I create a plan with aggressive weight gain
    Then the response status should be 400
    And the error response should include "validation_error"

  Scenario: Reject plan without profile
    Given the plan API is running
    And no profile exists
    When I create a plan with safe weight loss parameters
    Then the response status should be 400
    And the error response should include "profile_required"

  Scenario: Reject creating second active plan
    Given the plan API is running
    And a valid profile exists
    And an active plan exists
    When I create a plan with safe weight loss parameters
    Then the response status should be 409
    And the error response should include "active_plan_exists"

  # =============================================================================
  # PLAN RETRIEVAL
  # =============================================================================

  Scenario: Fetch active nutrition plan
    Given the plan API is running
    And a valid profile exists
    And an active plan exists
    When I fetch the active plan
    Then the response status should be 200
    And the plan response should include weekly targets
    And the plan status should be active

  Scenario: Fetch active plan when none exists
    Given the plan API is running
    And a valid profile exists
    And no active plan exists
    When I fetch the active plan
    Then the response status should be 404
    And the error response should include "not_found"

  Scenario: Fetch plan by ID
    Given the plan API is running
    And a valid profile exists
    And an active plan exists
    When I fetch the plan by its ID
    Then the response status should be 200
    And the plan response should include the plan ID

  Scenario: Fetch non-existent plan by ID
    Given the plan API is running
    When I fetch a plan with ID 99999
    Then the response status should be 404
    And the error response should include "not_found"

  Scenario: List all plans
    Given the plan API is running
    And a valid profile exists
    And an active plan exists
    When I list all plans
    Then the response status should be 200
    And the response should be a list of plans

  # =============================================================================
  # PLAN LIFECYCLE
  # =============================================================================

  Scenario: Complete a nutrition plan
    Given the plan API is running
    And a valid profile exists
    And an active plan exists
    When I complete the plan
    Then the response status should be 204
    And the plan should no longer be active

  Scenario: Abandon a nutrition plan
    Given the plan API is running
    And a valid profile exists
    And an active plan exists
    When I abandon the plan
    Then the response status should be 204
    And the plan should no longer be active

  Scenario: Delete a nutrition plan
    Given the plan API is running
    And a valid profile exists
    And an active plan exists
    When I delete the plan
    Then the response status should be 204
    And the plan should not exist

  Scenario: Complete non-existent plan
    Given the plan API is running
    When I complete a plan with ID 99999
    Then the response status should be 404
    And the error response should include "not_found"

  # =============================================================================
  # CURRENT WEEK TARGETS
  # =============================================================================

  Scenario: Get current week target
    Given the plan API is running
    And a valid profile exists
    And an active plan exists starting today
    When I fetch the current week target
    Then the response status should be 200
    And the response should include week number 1

  Scenario: Get current week target when no active plan
    Given the plan API is running
    And a valid profile exists
    And no active plan exists
    When I fetch the current week target
    Then the response status should be 404
    And the error response should include "not_found"

  # =============================================================================
  # VALIDATION BOUNDARIES
  # =============================================================================

  Scenario: Create plan with minimum duration
    Given the plan API is running
    And a valid profile exists
    And no active plan exists
    When I create a plan with 4 weeks duration
    Then the response status should be 201
    And the plan duration should be 4 weeks

  Scenario: Create plan with maximum duration
    Given the plan API is running
    And a valid profile exists
    And no active plan exists
    When I create a plan with 104 weeks duration
    Then the response status should be 201
    And the plan duration should be 104 weeks

  Scenario: Reject plan with duration below minimum
    Given the plan API is running
    And a valid profile exists
    And no active plan exists
    When I create a plan with 3 weeks duration
    Then the response status should be 400
    And the error response should include "validation_error"

  Scenario: Reject plan with duration above maximum
    Given the plan API is running
    And a valid profile exists
    And no active plan exists
    When I create a plan with 105 weeks duration
    Then the response status should be 400
    And the error response should include "validation_error"

  Scenario: Reject plan with invalid start date format
    Given the plan API is running
    And a valid profile exists
    And no active plan exists
    When I create a plan with invalid start date
    Then the response status should be 400
    And the error response should include "validation_error"
