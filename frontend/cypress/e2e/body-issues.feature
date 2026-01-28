Feature: Body issues (Semantic Tagger)

  # =============================================================================
  # ISSUE CREATION
  # =============================================================================

  Scenario: Create body issue with semantic tags
    Given the backend is running
    And a valid profile exists
    When I create a body issue for "left knee"
    And I tag it with severity "moderate"
    And I add description "soreness after squats"
    Then the response status should be 201
    And the issue should include semantic tags
    And the issue should be marked as active

  Scenario: Create issue with multiple body parts
    Given the backend is running
    And a valid profile exists
    When I create a body issue for "right shoulder, neck"
    And I tag it with severity "mild"
    Then the response status should be 201
    And the issue should recognize multiple body parts

  Scenario: Reject issue without body part
    Given the backend is running
    And a valid profile exists
    When I create a body issue without specifying body part
    Then the response status should be 400
    And the error response should include "validation_error"

  Scenario: Create issue with pain type classification
    Given the backend is running
    And a valid profile exists
    When I create a body issue for "lower back"
    And I specify pain type as "sharp"
    Then the response status should be 201
    And the issue should include pain type metadata

  # =============================================================================
  # SEMANTIC VOCABULARY
  # =============================================================================

  Scenario: Get semantic vocabulary for body parts
    Given the backend is running
    When I fetch the semantic vocabulary
    Then the response status should be 200
    And the vocabulary should include body part categories
    And the vocabulary should include severity levels
    And the vocabulary should include pain type descriptors

  Scenario: Vocabulary includes common synonyms
    Given the backend is running
    When I fetch the semantic vocabulary
    Then the vocabulary should map "knee" to lower body
    And the vocabulary should map "shoulder" to upper body
    And the vocabulary should recognize "elbow" variations

  # =============================================================================
  # ACTIVE ISSUES
  # =============================================================================

  Scenario: Get all active body issues
    Given the backend is running
    And a valid profile exists
    And I have created 3 active body issues
    When I fetch active body issues
    Then the response status should be 200
    And the response should include 3 issues
    And each issue should have semantic tags

  Scenario: No active issues returns empty list
    Given the backend is running
    And a valid profile exists
    And no body issues exist
    When I fetch active body issues
    Then the response status should be 200
    And the response should be an empty list

  Scenario: Resolved issues are not included in active list
    Given the backend is running
    And a valid profile exists
    And I have 2 active and 1 resolved issue
    When I fetch active body issues
    Then the response status should be 200
    And the response should include only 2 issues

  # =============================================================================
  # FATIGUE MODIFIERS
  # =============================================================================

  Scenario: Get fatigue modifiers from active issues
    Given the backend is running
    And a valid profile exists
    And I have an active "left knee" issue with moderate severity
    When I fetch fatigue modifiers
    Then the response status should be 200
    And the modifiers should affect lower body training
    And the modifiers should increase fatigue for relevant exercises

  Scenario: Multiple issues stack fatigue modifiers
    Given the backend is running
    And a valid profile exists
    And I have active "knee" and "ankle" issues
    When I fetch fatigue modifiers
    Then the response status should be 200
    And lower body fatigue should be increased by both issues
    And the modifiers should compound appropriately

  Scenario: Upper body issue does not affect lower body
    Given the backend is running
    And a valid profile exists
    And I have an active "right shoulder" issue
    When I fetch fatigue modifiers
    Then the response status should be 200
    And the modifiers should only affect upper body training
    And lower body training should be unaffected

  Scenario: Mild severity applies smaller modifier
    Given the backend is running
    And a valid profile exists
    And I have a "mild" left knee issue
    When I fetch fatigue modifiers
    Then the fatigue increase should be smaller than moderate

  Scenario: Severe issue applies larger modifier
    Given the backend is running
    And a valid profile exists
    And I have a "severe" lower back issue
    When I fetch fatigue modifiers
    Then the fatigue increase should be significant
    And multiple training types should be affected

  # =============================================================================
  # TRAINING TYPE MAPPING
  # =============================================================================

  Scenario: Knee issue affects running and cycling
    Given the backend is running
    And a valid profile exists
    And I have an active "knee" issue
    When I fetch fatigue modifiers
    Then "run" training should show increased fatigue
    And "cycle" training should show increased fatigue
    And "row" training should be minimally affected

  Scenario: Shoulder issue affects strength and calisthenics
    Given the backend is running
    And a valid profile exists
    And I have an active "shoulder" issue
    When I fetch fatigue modifiers
    Then "strength" training should show increased fatigue
    And "calisthenics" training should show increased fatigue
    And "walking" training should be unaffected

  Scenario: Lower back issue affects multiple training types
    Given the backend is running
    And a valid profile exists
    And I have an active "lower back" issue
    When I fetch fatigue modifiers
    Then "strength" should be affected
    And "run" should be affected
    And "cycle" should be affected
    And the modifier should reflect widespread impact

  # =============================================================================
  # UI TESTS
  # =============================================================================

  Scenario: Body issues page shows active issues list
    Given the backend is running
    And a valid profile exists
    And I have 2 active body issues
    When I visit the body issues page
    Then I should see a list of 2 active issues
    And each issue should show body part and severity
    And each issue should have a resolve button

  Scenario: Create issue form with semantic suggestions
    Given the backend is running
    And a valid profile exists
    When I visit the body issues page
    And I click the create issue button
    Then I should see the issue creation form
    And the form should have body part autocomplete
    And the form should suggest severity levels

  Scenario: Autocomplete suggests body parts as I type
    Given the backend is running
    And a valid profile exists
    When I visit the issue creation form
    And I type "kn" in the body part field
    Then autocomplete should suggest "knee"
    And autocomplete should suggest "ankle" if relevant

  Scenario: Issue card shows affected training types
    Given the backend is running
    And a valid profile exists
    And I have an active "shoulder" issue
    When I visit the body issues page
    Then the issue card should list affected training types
    And "strength" should be highlighted as impacted
    And "walking" should show as unaffected

  Scenario: Resolve issue button marks issue as resolved
    Given the backend is running
    And a valid profile exists
    And I have an active body issue
    When I visit the body issues page
    And I click resolve on the issue
    Then the issue should disappear from active list
    And fatigue modifiers should update immediately

  Scenario: Body status panel shows cumulative impact
    Given the backend is running
    And a valid profile exists
    And I have multiple active issues
    When I visit the dashboard body status panel
    Then I should see overall fatigue level
    And the panel should list active issues by severity
    And the panel should show readiness to train

  # =============================================================================
  # SEVERITY ESCALATION
  # =============================================================================

  Scenario: Update issue severity
    Given the backend is running
    And a valid profile exists
    And I have an active "mild" knee issue
    When I update the severity to "moderate"
    Then the response status should be 200
    And the fatigue modifiers should increase accordingly

  Scenario: Add notes to existing issue
    Given the backend is running
    And a valid profile exists
    And I have an active body issue
    When I add notes about "improving with rest"
    Then the response status should be 200
    And the notes should be saved with the issue

  # =============================================================================
  # EDGE CASES
  # =============================================================================

  Scenario: Ambiguous body part is clarified by system
    Given the backend is running
    And a valid profile exists
    When I create an issue for "arm"
    Then the system should prompt for clarification
    And I should be able to specify "upper arm" or "forearm"

  Scenario: Issue with unrecognized body part
    Given the backend is running
    And a valid profile exists
    When I create an issue for "xyz123"
    Then the response status should be 400
    And the error should indicate unrecognized body part

  Scenario: Very old issue still active
    Given the backend is running
    And a valid profile exists
    And I have an issue created 60 days ago
    When I fetch active issues
    Then the old issue should still be included
    And it should show duration since creation
