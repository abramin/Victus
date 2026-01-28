Feature: Training program management

  # =============================================================================
  # PROGRAM CREATION
  # =============================================================================

  Scenario: Create multi-week training program with periodization
    Given the backend is running
    And a valid profile exists
    When I create a training program with 8 weeks duration
    And I add a mesocycle with strength focus
    And I add a mesocycle with hypertrophy focus
    And I save the training program
    Then the response status should be 201
    And the program should have 2 mesocycles
    And the program duration should be 8 weeks

  Scenario: Create program with waveform periodization
    Given the backend is running
    And a valid profile exists
    When I create a training program with waveform periodization
    And I set load progression as linear
    And I save the training program
    Then the response status should be 201
    And the program should include waveform data

  Scenario: Reject program with invalid duration
    Given the backend is running
    And a valid profile exists
    When I create a training program with 1 week duration
    Then the response status should be 400
    And the error response should include "validation_error"

  Scenario: Reject program without profile
    Given the backend is running
    And no profile exists
    When I create a training program with 8 weeks duration
    Then the response status should be 400
    And the error response should include "profile_required"

  # =============================================================================
  # PROGRAM RETRIEVAL
  # =============================================================================

  Scenario: List all training programs
    Given the backend is running
    And a valid profile exists
    And I have created 3 training programs
    When I fetch all training programs
    Then the response status should be 200
    And the response should include 3 programs

  Scenario: Get program by ID
    Given the backend is running
    And a valid profile exists
    And I have created a training program
    When I fetch the program by its ID
    Then the response status should be 200
    And the program details should include mesocycles

  Scenario: Get program waveform visualization
    Given the backend is running
    And a valid profile exists
    And I have created a training program with waveform
    When I fetch the program waveform
    Then the response status should be 200
    And the waveform should include load data points
    And the waveform should show periodization waves

  # =============================================================================
  # PROGRAM INSTALLATION
  # =============================================================================

  Scenario: Install program to calendar
    Given the backend is running
    And a valid profile exists
    And I have created a training program
    When I install the program starting today
    Then the response status should be 201
    And the installation should be active
    And scheduled sessions should appear on calendar

  Scenario: Cannot install program when another is active
    Given the backend is running
    And a valid profile exists
    And I have an active program installation
    When I attempt to install another program
    Then the response status should be 409
    And the error response should include "active_installation_exists"

  Scenario: Get active program installation
    Given the backend is running
    And a valid profile exists
    And I have an active program installation
    When I fetch the active installation
    Then the response status should be 200
    And the installation should include scheduled sessions

  Scenario: Get scheduled sessions for installation
    Given the backend is running
    And a valid profile exists
    And I have an active program installation
    When I fetch the scheduled sessions
    Then the response status should be 200
    And the sessions should include training types and durations

  # =============================================================================
  # PROGRAM LIFECYCLE
  # =============================================================================

  Scenario: Abandon active program installation
    Given the backend is running
    And a valid profile exists
    And I have an active program installation
    When I abandon the installation
    Then the response status should be 204
    And the installation should no longer be active
    And I should be able to install a new program

  Scenario: Delete training program
    Given the backend is running
    And a valid profile exists
    And I have created a training program
    When I delete the program
    Then the response status should be 204
    And the program should not exist

  Scenario: Cannot delete program with active installation
    Given the backend is running
    And a valid profile exists
    And I have an active program installation
    When I attempt to delete the installed program
    Then the response status should be 409
    And the error response should include "program_in_use"

  # =============================================================================
  # UI TESTS
  # =============================================================================

  Scenario: Programs page shows list of created programs
    Given the backend is running
    And a valid profile exists
    And I have created 2 training programs
    When I visit the training programs page
    Then I should see 2 programs in the list
    And each program should show name and duration

  Scenario: Create program button shows creation form
    Given the backend is running
    And a valid profile exists
    When I visit the training programs page
    And I click the create program button
    Then I should see the program creation form
    And the form should have mesocycle configuration

  Scenario: Waveform visualization displays load progression
    Given the backend is running
    And a valid profile exists
    And I have created a training program with waveform
    When I visit the program details page
    Then I should see the waveform visualization
    And the chart should show weekly load progression
    And peaks and valleys should indicate periodization

  Scenario: Install button on program card starts installation
    Given the backend is running
    And a valid profile exists
    And I have created a training program
    And no program is currently installed
    When I visit the training programs page
    And I click install on a program card
    Then I should see installation confirmation
    And the calendar should populate with scheduled sessions

  Scenario: Active installation badge shows on program card
    Given the backend is running
    And a valid profile exists
    And I have an active program installation
    When I visit the training programs page
    Then the installed program should show "Active" badge
    And other programs should show "Install" button

  # =============================================================================
  # VALIDATION
  # =============================================================================

  Scenario: Program name is required
    Given the backend is running
    And a valid profile exists
    When I create a training program without a name
    Then the response status should be 400
    And the error response should include "validation_error"

  Scenario: Mesocycle duration must be at least 1 week
    Given the backend is running
    And a valid profile exists
    When I create a program with 0-week mesocycle
    Then the response status should be 400
    And the error response should include "validation_error"

  Scenario: Program must have at least one mesocycle
    Given the backend is running
    And a valid profile exists
    When I create a program without mesocycles
    Then the response status should be 400
    And the error response should include "validation_error"
