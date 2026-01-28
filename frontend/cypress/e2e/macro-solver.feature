Feature: Macro Tetris Solver

  # =============================================================================
  # BASIC SOLVING
  # =============================================================================

  Scenario: Solve macro puzzle with exact match
    Given the backend is running
    And a valid profile exists
    And I have daily log with targets: 200g carbs, 150g protein, 60g fat
    When I request solver to find food combinations
    Then the response status should be 200
    And the solution should match target macros within 5% tolerance
    And the solution should include food items with quantities

  Scenario: Solve with specific meal preference
    Given the backend is running
    And a valid profile exists
    And I have macro targets for lunch
    When I request solver for lunch foods only
    Then the response status should be 200
    And the solution should prioritize lunch-appropriate foods
    And breakfast foods should be excluded

  Scenario: Solve with dietary constraints
    Given the backend is running
    And a valid profile exists
    And I specify "vegetarian" constraint
    When I request solver to find combinations
    Then the response status should be 200
    And the solution should exclude meat and fish
    And plant-based proteins should be included

  Scenario: Solver cannot find exact solution
    Given the backend is running
    And a valid profile exists
    And I have unrealistic macro targets
    When I request solver to find combinations
    Then the response status should be 200
    And the solver should return the closest approximation
    And the response should indicate variance from target

  # =============================================================================
  # FOOD LIBRARY INTEGRATION
  # =============================================================================

  Scenario: Solver uses food reference library
    Given the backend is running
    And a valid profile exists
    And the food library has 50+ items
    When I request solver to find combinations
    Then the solver should consider all available foods
    And the solution should use library macro data

  Scenario: Exclude specific foods from solution
    Given the backend is running
    And a valid profile exists
    When I request solver excluding "chicken, rice"
    Then the response status should be 200
    And the solution should not include chicken
    And the solution should not include rice

  Scenario: Prefer specific foods in solution
    Given the backend is running
    And a valid profile exists
    When I request solver preferring "eggs, oats"
    Then the response status should be 200
    And the solution should prioritize eggs and oats if they fit

  # =============================================================================
  # AI-GENERATED RECIPE NAMES
  # =============================================================================

  Scenario: Solver generates creative recipe name
    Given the backend is running
    And a valid profile exists
    And Ollama is available
    When I solve for macro combination
    Then the response should include a creative recipe name
    And the name should reflect the food combination
    And the name should be appetizing and descriptive

  Scenario: Recipe name adapts to meal type
    Given the backend is running
    And a valid profile exists
    When I solve for breakfast macros
    Then the recipe name should be breakfast-appropriate
    And the name should not suggest dinner foods

  Scenario: Fallback when AI unavailable
    Given the backend is running
    And a valid profile exists
    And Ollama is not available
    When I solve for macro combination
    Then the response should still include food list
    And a generic name should be provided as fallback

  # =============================================================================
  # QUANTITY OPTIMIZATION
  # =============================================================================

  Scenario: Solver suggests realistic portion sizes
    Given the backend is running
    And a valid profile exists
    When I request solver for 200g protein target
    Then the solution should distribute across multiple foods
    And no single food should exceed realistic serving size
    And quantities should be in practical units (grams, pieces)

  Scenario: Solver minimizes number of foods
    Given the backend is running
    And a valid profile exists
    When I request solver with "simple" preference
    Then the solution should use 3-5 foods maximum
    And the solution should avoid overly complex combinations

  Scenario: Solver allows complex combinations
    Given the backend is running
    And a valid profile exists
    When I request solver with "variety" preference
    Then the solution can include 5-8 different foods
    And the solution should maximize food diversity

  # =============================================================================
  # MACRO TOLERANCE
  # =============================================================================

  Scenario: Solver respects tight tolerance
    Given the backend is running
    And a valid profile exists
    When I request solver with 2% tolerance
    Then the solution should be within 2% of targets
    Or the solver should indicate no solution within tolerance

  Scenario: Solver with loose tolerance
    Given the backend is running
    And a valid profile exists
    When I request solver with 10% tolerance
    Then the solution should be within 10% of targets
    And more food combinations should be viable

  Scenario: Prioritize protein accuracy
    Given the backend is running
    And a valid profile exists
    When I request solver with protein priority
    Then protein should be closest to target
    And carbs/fat can have larger variance

  # =============================================================================
  # UI TESTS
  # =============================================================================

  Scenario: Solver page shows macro target input
    Given the backend is running
    And a valid profile exists
    When I visit the macro solver page
    Then I should see input fields for carbs, protein, fat
    And I should see a solve button
    And I should see constraint options

  Scenario: Auto-populate targets from today's log
    Given the backend is running
    And a valid profile exists
    And I have a daily log for today
    When I visit the macro solver page
    Then the target fields should pre-populate from today
    And I should be able to adjust targets

  Scenario: Display solution with food list
    Given the backend is running
    And a valid profile exists
    When I solve for macro targets
    Then I should see a solution panel
    And the panel should list foods with quantities
    And the panel should show total macros
    And the panel should show variance from target

  Scenario: Solution shows recipe name as title
    Given the backend is running
    And a valid profile exists
    When I solve for macro targets successfully
    Then the solution should have an AI-generated recipe name
    And the name should be displayed prominently
    And the name should be creative and descriptive

  Scenario: Add solution to food library
    Given the backend is running
    And a valid profile exists
    And I have a solved macro combination
    When I click "Save to Library"
    Then the combination should be saved as a new food item
    And the recipe name should be used as the food name
    And I should be able to reuse it later

  Scenario: Regenerate solution for same targets
    Given the backend is running
    And a valid profile exists
    And I have solved for specific targets
    When I click "Generate New Solution"
    Then the solver should provide a different combination
    And the macros should still match targets
    And the recipe name should be different

  Scenario: Solver shows loading state during computation
    Given the backend is running
    And a valid profile exists
    When I click solve with macro targets
    Then I should see a loading indicator
    And the solve button should be disabled
    And a "Solving..." message should display

  Scenario: Solver error shows helpful message
    Given the backend is running
    And a valid profile exists
    When solver cannot find any viable solution
    Then I should see an error message
    And the message should suggest adjusting constraints
    And the message should show what was attempted

  # =============================================================================
  # CONSTRAINTS AND PREFERENCES
  # =============================================================================

  Scenario: Exclude allergens from solution
    Given the backend is running
    And a valid profile exists
    When I mark "dairy" as allergen
    And I request solver to find combinations
    Then the solution should exclude all dairy products
    And the solution should still meet macro targets

  Scenario: Budget-conscious solving
    Given the backend is running
    And a valid profile exists
    And food items have cost data
    When I enable "budget mode"
    Then the solver should prefer cheaper foods
    And the total solution cost should be minimized

  # =============================================================================
  # EDGE CASES
  # =============================================================================

  Scenario: Solve with extreme protein target
    Given the backend is running
    And a valid profile exists
    When I request solver for 300g protein target
    Then the solver should attempt to find solution
    And the solution may require protein supplements
    And the solver should warn if unrealistic

  Scenario: Solve with very low calorie target
    Given the backend is running
    And a valid profile exists
    When I request solver for 800 calorie target
    Then the solver should find low-calorie foods
    And the solver should prioritize nutrient density

  Scenario: Solve with zero carbs (keto)
    Given the backend is running
    And a valid profile exists
    When I request solver for 0g carbs target
    Then the solution should be pure protein and fat
    And carb sources should be completely excluded
